/*
# Public Availability Check + Direct Booking Functions

The admin panel already has full CRUD (it runs as an authenticated user).
What was missing is the PUBLIC side of the backend:

1. `check_availability(house_id, check_in, check_out)`
   - Lets anonymous visitors check real availability.
   - SECURITY DEFINER so it can read `reservations` / `availability_blocks`
     (both are authenticated-only tables — anon previously saw nothing).
   - Returns ONLY a boolean + generic reason, never guest data.

2. `create_booking(house_id, check_in, check_out, num_guests, name, email, phone, notes)`
   - Lets anonymous visitors submit a direct booking request.
   - Validates: dates, past dates, house active, guest capacity, email format.
   - Re-checks availability INSIDE the transaction and takes a row lock on the
     house so two guests can never double-book the same nights.
   - Reuses an existing guest row when the email already exists.
   - Creates the reservation as status='PENDING', source='DIRECT' so it appears
     in the admin panel for confirmation.
   - Simple abuse guard: max 3 open PENDING requests per email.

Both functions are SECURITY DEFINER (owned by postgres) so anon needs no
table grants — public users can never SELECT or INSERT the tables directly.
*/

-- ============================================================================
-- 0. Fix: house_images.category defaulted to 'interior', which the CHECK
--    constraint rejects — inserts without an explicit category would fail.
-- ============================================================================
ALTER TABLE public.house_images ALTER COLUMN category SET DEFAULT 'other';

-- ============================================================================
-- 1. check_availability (public, read-only probe)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_availability(
  p_house_id uuid,
  p_check_in date,
  p_check_out date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_house public.houses%ROWTYPE;
BEGIN
  -- Basic date validation: [check_in, check_out) with check_out > check_in
  IF p_house_id IS NULL OR p_check_in IS NULL OR p_check_out IS NULL THEN
    RETURN jsonb_build_object('available', false, 'reason', 'Please select your dates.');
  END IF;
  IF p_check_out <= p_check_in THEN
    RETURN jsonb_build_object('available', false, 'reason', 'Check-out must be after check-in.');
  END IF;
  IF p_check_in < CURRENT_DATE THEN
    RETURN jsonb_build_object('available', false, 'reason', 'Check-in cannot be in the past.');
  END IF;
  IF p_check_out - p_check_in > 365 THEN
    RETURN jsonb_build_object('available', false, 'reason', 'Stays longer than 365 nights are not supported.');
  END IF;

  SELECT * INTO v_house
  FROM public.houses
  WHERE id = p_house_id AND status = 'ACTIVE';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('available', false, 'reason', 'This house is not available.');
  END IF;

  -- Reservations occupy nights [check_in, check_out) — departure day is free
  IF EXISTS (
    SELECT 1 FROM public.reservations r
    WHERE r.house_id = p_house_id
      AND r.status <> 'CANCELLED'
      AND r.check_in < p_check_out
      AND r.check_out > p_check_in
  ) THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'This house is already booked for the selected dates.'
    );
  END IF;

  -- Availability blocks cover whole days [start_date, end_date] inclusive
  IF EXISTS (
    SELECT 1 FROM public.availability_blocks b
    WHERE b.house_id = p_house_id
      AND b.start_date < p_check_out
      AND b.end_date >= p_check_in
  ) THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'This house is unavailable for the selected dates.'
    );
  END IF;

  RETURN jsonb_build_object('available', true, 'reason', NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.check_availability(uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_availability(uuid, date, date) TO anon, authenticated;

-- ============================================================================
-- 2. create_booking (public booking request)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_booking(
  p_house_id uuid,
  p_check_in date,
  p_check_out date,
  p_num_guests integer,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_house     public.houses%ROWTYPE;
  v_guest_id  uuid;
  v_avail     jsonb;
  v_email     text := NULLIF(lower(btrim(COALESCE(p_guest_email, ''))), '');
  v_name      text := NULLIF(btrim(COALESCE(p_guest_name, '')), '');
  v_phone     text := NULLIF(btrim(COALESCE(p_guest_phone, '')), '');
  v_notes     text := NULLIF(btrim(COALESCE(p_notes, '')), '');
  v_res_id    uuid;
BEGIN
  -- ---- input validation -----------------------------------------------------
  IF v_name IS NULL OR length(v_name) < 2 THEN
    RAISE EXCEPTION 'Please provide your full name.';
  END IF;
  IF v_email IS NULL OR v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'Please provide a valid email address.';
  END IF;
  IF p_check_in IS NULL OR p_check_out IS NULL OR p_check_out <= p_check_in THEN
    RAISE EXCEPTION 'Please select valid check-in and check-out dates.';
  END IF;
  IF p_check_in < CURRENT_DATE THEN
    RAISE EXCEPTION 'Check-in cannot be in the past.';
  END IF;
  IF p_check_out - p_check_in > 365 THEN
    RAISE EXCEPTION 'Stays longer than 365 nights are not supported.';
  END IF;
  IF p_num_guests IS NULL OR p_num_guests < 1 THEN
    RAISE EXCEPTION 'Please provide the number of guests.';
  END IF;

  -- ---- lock the house row so two concurrent requests cannot double-book ----
  SELECT * INTO v_house
  FROM public.houses
  WHERE id = p_house_id AND status = 'ACTIVE'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This house is no longer available.';
  END IF;

  IF p_num_guests > v_house.max_guests THEN
    RAISE EXCEPTION 'This house accommodates up to % guest(s).', v_house.max_guests;
  END IF;

  -- ---- availability re-check inside the transaction ------------------------
  v_avail := public.check_availability(p_house_id, p_check_in, p_check_out);
  IF NOT (v_avail ->> 'available')::boolean THEN
    RAISE EXCEPTION '%', COALESCE(v_avail ->> 'reason', 'Those dates are unavailable.');
  END IF;

  -- ---- abuse guard: max 3 open requests per email --------------------------
  IF (
    SELECT count(*)
    FROM public.reservations r
    JOIN public.guests g ON g.id = r.guest_id
    WHERE lower(g.email) = v_email AND r.status = 'PENDING'
  ) >= 3 THEN
    RAISE EXCEPTION 'Too many pending requests for this email. Please contact us directly.';
  END IF;

  -- ---- upsert guest by email ----------------------------------------------
  SELECT id INTO v_guest_id FROM public.guests WHERE lower(email) = v_email LIMIT 1;

  IF v_guest_id IS NULL THEN
    INSERT INTO public.guests (name, email, phone, preferred_communication)
    VALUES (v_name, v_email, v_phone, 'EMAIL')
    RETURNING id INTO v_guest_id;
  ELSE
    UPDATE public.guests
    SET name = v_name,
        phone = COALESCE(v_phone, phone),
        updated_at = now()
    WHERE id = v_guest_id;
  END IF;

  -- ---- create the pending reservation -------------------------------------
  INSERT INTO public.reservations (
    house_id, guest_id, check_in, check_out, num_guests,
    status, source, currency, payment_status, notes
  )
  VALUES (
    p_house_id, v_guest_id, p_check_in, p_check_out, p_num_guests,
    'PENDING', 'DIRECT', v_house.currency, 'PENDING', v_notes
  )
  RETURNING id INTO v_res_id;

  RETURN jsonb_build_object(
    'reservation_id', v_res_id,
    'status', 'PENDING',
    'message', 'Booking request received! We will confirm your stay within 24 hours.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking(uuid, date, date, integer, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, date, date, integer, text, text, text, text) TO anon, authenticated;
