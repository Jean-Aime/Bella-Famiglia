/* ============================================================================
# Harden Row Level Security (CRITICAL — run before going live)

WHY THIS FILE EXISTS
--------------------
The live database currently does NOT enforce the policies defined in
`migrations/20261008102414_create_property_management_schema.sql`. Verified by
probing the live project with the public anon key:

  * anon could SELECT `guests`        -> guest names + email addresses leaked
  * anon could SELECT `reservations`  -> every stay, note and date leaked
  * anon could UPDATE `reservations`, `guests`, `houses`, `reviews`
  * anon INSERT into `reservations` got past the policy check (it only failed
    on a foreign key), i.e. anonymous write access existed

That means anyone who finds the Supabase URL could read guest PII, tamper with
bookings, or write junk rows. This migration fixes that.

WHAT IT DOES (all idempotent — safe to re-run)
----------------------------------------------
  1. Enables RLS on every public table.
  2. Drops EVERY existing policy in the public schema, so any leftover
     permissive policy added outside these files is removed too.
  3. Recreates the intended policy set:
       - public (anon) SELECT only where the public website needs it
         (properties, houses, house_images, amenities, house_amenities,
          published reviews, property_settings)
       - authenticated (admin) full CRUD everywhere
       - private_property_details: authenticated admins only; never anon
       - guests / reservations / availability_blocks / price_rules: NO anon
         access at all. Public availability + booking go through the
         SECURITY DEFINER functions check_availability() / create_booking().
  4. Revokes INSERT/UPDATE/DELETE table privileges from `anon` (defence in
     depth on top of RLS) and keeps SELECT only on the public-read tables.
  5. Recreates the `house-images` storage policies (public read, admin-only
     write).
  6. Finishes with verification SELECTs — check the output.

IMPORTANT: no `FORCE ROW LEVEL SECURITY`
----------------------------------------
`create_booking()` is SECURITY DEFINER and runs as the table owner. FORCE would
apply RLS to the owner as well and break public booking. Do not add FORCE.

HOW TO RUN
----------
Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
Then scroll to the bottom of the Results panel and check the two verification
queries (all tables `rowsecurity = true`, and only the expected policies).
*/


-- ============================================================================
-- 1. Enable RLS everywhere (no FORCE — see note above)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.private_property_details (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  street_address text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.properties          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.houses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_amenities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_images        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_rules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_property_details ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 2. Drop every existing policy in `public` (removes unknown leftovers)
-- ============================================================================
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;


-- ============================================================================
-- 3. PUBLIC (anon) read policies — only what the website needs
-- ============================================================================
DROP POLICY IF EXISTS "public_read_properties" ON public.properties;
CREATE POLICY "public_read_properties" ON public.properties
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_read_houses" ON public.houses;
CREATE POLICY "public_read_houses" ON public.houses
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_read_house_images" ON public.house_images;
CREATE POLICY "public_read_house_images" ON public.house_images
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_read_amenities" ON public.amenities;
CREATE POLICY "public_read_amenities" ON public.amenities
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_read_house_amenities" ON public.house_amenities;
CREATE POLICY "public_read_house_amenities" ON public.house_amenities
  FOR SELECT TO anon, authenticated USING (true);

-- Only published reviews are public; admins see everything via auth_read_reviews.
DROP POLICY IF EXISTS "public_read_reviews" ON public.reviews;
CREATE POLICY "public_read_reviews" ON public.reviews
  FOR SELECT TO anon, authenticated USING (is_published = true);

-- Brand / contact / policy settings are public site content.
DROP POLICY IF EXISTS "public_read_property_settings" ON public.property_settings;
CREATE POLICY "public_read_property_settings" ON public.property_settings
  FOR SELECT TO anon, authenticated USING (true);


-- ============================================================================
-- 4. AUTHENTICATED (admin) full CRUD
-- ============================================================================
-- properties -----------------------------------------------------------------
DROP POLICY IF EXISTS "auth_insert_properties" ON public.properties;
CREATE POLICY "auth_insert_properties" ON public.properties
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_properties" ON public.properties;
CREATE POLICY "auth_update_properties" ON public.properties
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_properties" ON public.properties;
CREATE POLICY "auth_delete_properties" ON public.properties
  FOR DELETE TO authenticated USING (true);

-- houses ---------------------------------------------------------------------
DROP POLICY IF EXISTS "auth_insert_houses" ON public.houses;
CREATE POLICY "auth_insert_houses" ON public.houses
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_houses" ON public.houses;
CREATE POLICY "auth_update_houses" ON public.houses
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_houses" ON public.houses;
CREATE POLICY "auth_delete_houses" ON public.houses
  FOR DELETE TO authenticated USING (true);

-- amenities ------------------------------------------------------------------
DROP POLICY IF EXISTS "auth_insert_amenities" ON public.amenities;
CREATE POLICY "auth_insert_amenities" ON public.amenities
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_amenities" ON public.amenities;
CREATE POLICY "auth_update_amenities" ON public.amenities
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_amenities" ON public.amenities;
CREATE POLICY "auth_delete_amenities" ON public.amenities
  FOR DELETE TO authenticated USING (true);

-- house_amenities ------------------------------------------------------------
DROP POLICY IF EXISTS "auth_insert_house_amenities" ON public.house_amenities;
CREATE POLICY "auth_insert_house_amenities" ON public.house_amenities
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_house_amenities" ON public.house_amenities;
CREATE POLICY "auth_update_house_amenities" ON public.house_amenities
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_house_amenities" ON public.house_amenities;
CREATE POLICY "auth_delete_house_amenities" ON public.house_amenities
  FOR DELETE TO authenticated USING (true);

-- house_images ---------------------------------------------------------------
DROP POLICY IF EXISTS "auth_insert_house_images" ON public.house_images;
CREATE POLICY "auth_insert_house_images" ON public.house_images
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_house_images" ON public.house_images;
CREATE POLICY "auth_update_house_images" ON public.house_images
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_house_images" ON public.house_images;
CREATE POLICY "auth_delete_house_images" ON public.house_images
  FOR DELETE TO authenticated USING (true);

-- guests (PII — authenticated only, never anon) ------------------------------
DROP POLICY IF EXISTS "auth_read_guests" ON public.guests;
CREATE POLICY "auth_read_guests" ON public.guests
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_guests" ON public.guests;
CREATE POLICY "auth_insert_guests" ON public.guests
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_guests" ON public.guests;
CREATE POLICY "auth_update_guests" ON public.guests
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_guests" ON public.guests;
CREATE POLICY "auth_delete_guests" ON public.guests
  FOR DELETE TO authenticated USING (true);

-- reservations (authenticated only) ------------------------------------------
DROP POLICY IF EXISTS "auth_read_reservations" ON public.reservations;
CREATE POLICY "auth_read_reservations" ON public.reservations
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_reservations" ON public.reservations;
CREATE POLICY "auth_insert_reservations" ON public.reservations
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_reservations" ON public.reservations;
CREATE POLICY "auth_update_reservations" ON public.reservations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_reservations" ON public.reservations;
CREATE POLICY "auth_delete_reservations" ON public.reservations
  FOR DELETE TO authenticated USING (true);

-- availability_blocks (authenticated only) -----------------------------------
DROP POLICY IF EXISTS "auth_read_availability_blocks" ON public.availability_blocks;
CREATE POLICY "auth_read_availability_blocks" ON public.availability_blocks
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_availability_blocks" ON public.availability_blocks;
CREATE POLICY "auth_insert_availability_blocks" ON public.availability_blocks
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_availability_blocks" ON public.availability_blocks;
CREATE POLICY "auth_update_availability_blocks" ON public.availability_blocks
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_availability_blocks" ON public.availability_blocks;
CREATE POLICY "auth_delete_availability_blocks" ON public.availability_blocks
  FOR DELETE TO authenticated USING (true);

-- reviews (admins need to read drafts too) -----------------------------------
DROP POLICY IF EXISTS "auth_read_reviews" ON public.reviews;
CREATE POLICY "auth_read_reviews" ON public.reviews
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_reviews" ON public.reviews;
CREATE POLICY "auth_insert_reviews" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_reviews" ON public.reviews;
CREATE POLICY "auth_update_reviews" ON public.reviews
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_reviews" ON public.reviews;
CREATE POLICY "auth_delete_reviews" ON public.reviews
  FOR DELETE TO authenticated USING (true);

-- property_settings ----------------------------------------------------------
DROP POLICY IF EXISTS "auth_insert_property_settings" ON public.property_settings;
CREATE POLICY "auth_insert_property_settings" ON public.property_settings
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_property_settings" ON public.property_settings;
CREATE POLICY "auth_update_property_settings" ON public.property_settings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_property_settings" ON public.property_settings;
CREATE POLICY "auth_delete_property_settings" ON public.property_settings
  FOR DELETE TO authenticated USING (true);

-- Private address and phone are never available to the anonymous website role.
DROP POLICY IF EXISTS "auth_read_private_property_details" ON public.private_property_details;
CREATE POLICY "auth_read_private_property_details" ON public.private_property_details
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_private_property_details" ON public.private_property_details;
CREATE POLICY "auth_insert_private_property_details" ON public.private_property_details
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_private_property_details" ON public.private_property_details;
CREATE POLICY "auth_update_private_property_details" ON public.private_property_details
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_private_property_details" ON public.private_property_details;
CREATE POLICY "auth_delete_private_property_details" ON public.private_property_details
  FOR DELETE TO authenticated USING (true);

-- price_rules (authenticated only) -------------------------------------------
DROP POLICY IF EXISTS "auth_read_price_rules" ON public.price_rules;
CREATE POLICY "auth_read_price_rules" ON public.price_rules
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_price_rules" ON public.price_rules;
CREATE POLICY "auth_insert_price_rules" ON public.price_rules
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_price_rules" ON public.price_rules;
CREATE POLICY "auth_update_price_rules" ON public.price_rules
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_price_rules" ON public.price_rules;
CREATE POLICY "auth_delete_price_rules" ON public.price_rules
  FOR DELETE TO authenticated USING (true);


-- ============================================================================
-- 5. Table privileges (defence in depth on top of RLS)
-- ============================================================================
-- Start from zero for the anonymous role: drop EVERY table privilege, including
-- the SELECT grants Supabase adds by default. That way a table added later
-- (or one not enumerated above) cannot silently stay world-readable.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Public read only where the website needs it (RLS still applies on top).
GRANT SELECT ON public.properties, public.houses, public.house_images,
                public.amenities, public.house_amenities, public.reviews,
                public.property_settings
  TO anon, authenticated;

-- Admins keep full access (policies still restrict to the authenticated role).
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- Public API functions stay callable by visitors.
GRANT EXECUTE ON FUNCTION public.check_availability(uuid, date, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, date, date, integer, text, text, text, text) TO anon, authenticated;


-- ============================================================================
-- 6. Storage: house-images (public read, admin-only write)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'house-images', 'house-images', true, 26214400,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "public_read_house_images_objects" ON storage.objects;
CREATE POLICY "public_read_house_images_objects" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'house-images');

DROP POLICY IF EXISTS "auth_insert_house_images_objects" ON storage.objects;
CREATE POLICY "auth_insert_house_images_objects" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'house-images');

DROP POLICY IF EXISTS "auth_update_house_images_objects" ON storage.objects;
CREATE POLICY "auth_update_house_images_objects" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'house-images')
  WITH CHECK (bucket_id = 'house-images');

DROP POLICY IF EXISTS "auth_delete_house_images_objects" ON storage.objects;
CREATE POLICY "auth_delete_house_images_objects" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'house-images');


-- ============================================================================
-- 6b. Optional table: booking_notification_log
-- ============================================================================
-- Section 2 above drops EVERY policy in `public`, so if this table exists (it
-- is created by 20261010140000_booking_notification_log.sql) its policies must
-- be rebuilt here too — otherwise re-running this file would silently leave the
-- delivery log unreadable to admins. Guarded so this file still runs on a
-- database where that migration has not been applied yet.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'booking_notification_log'
  ) THEN
    EXECUTE 'ALTER TABLE public.booking_notification_log ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON public.booking_notification_log FROM anon';
    EXECUTE 'DROP POLICY IF EXISTS "auth_read_booking_notification_log" ON public.booking_notification_log';
    EXECUTE 'CREATE POLICY "auth_read_booking_notification_log" ON public.booking_notification_log FOR SELECT TO authenticated USING (true)';
    EXECUTE 'DROP POLICY IF EXISTS "auth_delete_booking_notification_log" ON public.booking_notification_log';
    EXECUTE 'CREATE POLICY "auth_delete_booking_notification_log" ON public.booking_notification_log FOR DELETE TO authenticated USING (true)';
    EXECUTE 'GRANT SELECT, DELETE ON public.booking_notification_log TO authenticated';
  END IF;
END $$;


-- ============================================================================
-- 7. VERIFICATION — inspect these two result sets after running
-- ============================================================================
-- (a) Every row must show rowsecurity = true.
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- (b) Expected policy list only (public_read_* for anon, auth_* for
--     authenticated). If you see any extra permissive policy, tell me.
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
