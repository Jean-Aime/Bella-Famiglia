/* ============================================================================
# Remove demo / seed data before going live

The database was seeded with demo content so the admin dashboard and calendar
had something to show. That data now blocks real bookings:

  * seeded reservations occupy real calendar dates (guests cannot book them)
  * a couple of "QA test" bookings were created while developing
  * the 6 reviews are placeholder people ("Emma R.", "David K.", ...)
  * two demo availability blocks (maintenance + owner use) block dates

This script deletes ONLY the known seed/test rows. It does not touch houses,
amenities, images, or settings.

HOW TO RUN
----------
Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
Careful: this DELETES rows. Run section 0 first if you want to see exactly
what will be removed (line counts), then run the rest.

Review your real bookings first: if you have already taken a genuine booking
through the site, its guest email will NOT match the demo patterns below, so it
is safe — but check the preview counts to be sure.
*/


-- ============================================================================
-- 0. PREVIEW — what is about to be deleted (run this alone first if you like)
-- ============================================================================
SELECT 'demo/QA reservations'  AS what, count(*) FROM public.reservations
WHERE external_reference IN ('AB-1001','AB-1002','AB-1003','AB-1004','AB-1005','AB-1006','AB-1007','AB-1008','AB-1009')
   OR notes IN ('Upcoming stay', 'Business traveler', 'Awaiting confirmation', 'Direct booking, deposit received')
   OR notes ILIKE '%QA test%'
   OR notes ILIKE '%UI Test%'
   OR guest_id IN (
     'd0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002',
     'd0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000004',
     'd0000000-0000-0000-0000-000000000005','d0000000-0000-0000-0000-000000000006')
UNION ALL
SELECT 'demo/QA guests', count(*) FROM public.guests
WHERE id IN (
     'd0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002',
     'd0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000004',
     'd0000000-0000-0000-0000-000000000005','d0000000-0000-0000-0000-000000000006')
   OR lower(email) IN ('qa-test@example.com','ui-test@example.com')
   OR email LIKE '%@email.com'
UNION ALL
SELECT 'demo reviews', count(*) FROM public.reviews
WHERE guest_name IN ('Emma R.','David K.','Amina T.','Thomas L.','Sarah M.','Jean P.')
UNION ALL
SELECT 'demo availability blocks', count(*) FROM public.availability_blocks
WHERE notes IN ('Deep cleaning and paint touch-up','Family visiting');


-- ============================================================================
-- 1. Delete demo + QA reservations
-- ============================================================================
BEGIN;

DELETE FROM public.reservations
WHERE external_reference IN ('AB-1001','AB-1002','AB-1003','AB-1004','AB-1005','AB-1006','AB-1007','AB-1008','AB-1009')
   OR notes IN ('Upcoming stay', 'Business traveler', 'Awaiting confirmation', 'Direct booking, deposit received')
   OR notes ILIKE '%QA test%'
   OR notes ILIKE '%UI Test%'
   OR guest_id IN (
     'd0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002',
     'd0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000004',
     'd0000000-0000-0000-0000-000000000005','d0000000-0000-0000-0000-000000000006');

-- ============================================================================
-- 2. Delete demo + QA guests (PII that should never have been public)
-- ============================================================================
DELETE FROM public.guests
WHERE id IN (
     'd0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002',
     'd0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000004',
     'd0000000-0000-0000-0000-000000000005','d0000000-0000-0000-0000-000000000006')
   OR lower(email) IN ('qa-test@example.com','ui-test@example.com')
   OR email LIKE '%@email.com';

-- ============================================================================
-- 3. Delete placeholder reviews
--    (add your real guest reviews in Admin -> Reviews, or import them from
--     Airbnb; the home page hides the section while there are none)
-- ============================================================================
DELETE FROM public.reviews
WHERE guest_name IN ('Emma R.','David K.','Amina T.','Thomas L.','Sarah M.','Jean P.');

-- ============================================================================
-- 4. Delete demo availability blocks
--    (re-create real ones in Admin -> Calendar, e.g. your own maintenance days)
-- ============================================================================
DELETE FROM public.availability_blocks
WHERE notes IN ('Deep cleaning and paint touch-up','Family visiting');

COMMIT;


-- ============================================================================
-- 5. Verify — should show only your real data (likely zeros right now)
-- ============================================================================
SELECT 'reservations left'     AS table_name, count(*) FROM public.reservations
UNION ALL
SELECT 'guests left',           count(*) FROM public.guests
UNION ALL
SELECT 'reviews left',          count(*) FROM public.reviews
UNION ALL
SELECT 'availability blocks left', count(*) FROM public.availability_blocks;

-- Optional: list what remains, so nothing unexpected is left behind.
SELECT id, check_in, check_out, status, source, notes
FROM public.reservations
ORDER BY check_in DESC;
