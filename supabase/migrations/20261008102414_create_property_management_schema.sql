/*
# Create Property Management Schema

This migration creates the complete database schema for a boutique guest-house platform
with two houses in Kigali, Rwanda. The system supports:
- Multi-property architecture (currently 1 property, 2 houses)
- House management with amenities, images, pricing
- Guest management
- Reservation management with multiple booking sources (Airbnb, Direct, Manual, Blocked)
- Availability blocking and calendar
- Reviews from multiple sources
- Property-level configuration settings
- Admin authentication

## Tables Created

1. **properties** — Top-level property container (supports future multi-property)
2. **houses** — Individual accommodation units within a property
3. **amenities** — Master list of amenity items
4. **house_amenities** — Junction table linking houses to amenities
5. **house_images** — Gallery images for each house
6. **guests** — Guest profiles and contact info
7. **reservations** — Booking records with source, status, dates
8. **availability_blocks** — Blocked dates for houses (maintenance, owner use, etc.)
9. **reviews** — Guest reviews from Airbnb or direct
10. **property_settings** — Central configuration (brand, contact, WhatsApp, etc.)
11. **price_rules** — Pricing overrides (seasonal, weekend, special dates)

## Security

- RLS enabled on all tables
- Public tables (properties, houses, amenities, house_amenities, house_images, reviews, property_settings): readable by anon (public website)
- Admin tables (reservations, guests, availability_blocks, price_rules): require authentication
- All tables allow authenticated users full CRUD for admin operations

## Important Notes

1. The app has a sign-in screen for admin, so admin-only tables use `TO authenticated`
2. Public-facing tables (houses, amenities, images, reviews, settings) are readable by anon
3. Write operations on all tables require authentication (admin only)
4. owner_id columns default to auth.uid() for audit trail
*/

-- ============================================================================
-- 1. PROPERTIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  tagline text,
  description text,
  location_label text NOT NULL DEFAULT 'Kigali, Rwanda',
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_properties" ON properties;
CREATE POLICY "public_read_properties" ON properties FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_properties" ON properties;
CREATE POLICY "auth_insert_properties" ON properties FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_properties" ON properties;
CREATE POLICY "auth_update_properties" ON properties FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_properties" ON properties;
CREATE POLICY "auth_delete_properties" ON properties FOR DELETE
TO authenticated USING (true);

-- ============================================================================
-- 2. HOUSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS houses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  tagline text,
  description text,
  max_guests int NOT NULL DEFAULT 2,
  bedrooms int NOT NULL DEFAULT 1,
  bathrooms int NOT NULL DEFAULT 1,
  has_living_room boolean NOT NULL DEFAULT true,
  has_kitchen boolean NOT NULL DEFAULT true,
  property_type text NOT NULL DEFAULT 'Entire home',
  base_price numeric(10, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  airbnb_listing_url text,
  airbnb_listing_id text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_houses_property_id ON houses(property_id);
CREATE INDEX IF NOT EXISTS idx_houses_slug ON houses(slug);
CREATE INDEX IF NOT EXISTS idx_houses_status ON houses(status);

ALTER TABLE houses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_houses" ON houses;
CREATE POLICY "public_read_houses" ON houses FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_houses" ON houses;
CREATE POLICY "auth_insert_houses" ON houses FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_houses" ON houses;
CREATE POLICY "auth_update_houses" ON houses FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_houses" ON houses;
CREATE POLICY "auth_delete_houses" ON houses FOR DELETE
TO authenticated USING (true);

-- ============================================================================
-- 3. AMENITIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Comfort' CHECK (category IN ('Comfort', 'Connectivity', 'Kitchen', 'Safety', 'Outdoor', 'Convenience')),
  icon_name text NOT NULL DEFAULT 'Check',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_amenities" ON amenities;
CREATE POLICY "public_read_amenities" ON amenities FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_amenities" ON amenities;
CREATE POLICY "auth_insert_amenities" ON amenities FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_amenities" ON amenities;
CREATE POLICY "auth_update_amenities" ON amenities FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_amenities" ON amenities;
CREATE POLICY "auth_delete_amenities" ON amenities FOR DELETE
TO authenticated USING (true);

-- ============================================================================
-- 4. HOUSE_AMENITIES (junction)
-- ============================================================================
CREATE TABLE IF NOT EXISTS house_amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  amenity_id uuid NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (house_id, amenity_id)
);

CREATE INDEX IF NOT EXISTS idx_house_amenities_house_id ON house_amenities(house_id);
CREATE INDEX IF NOT EXISTS idx_house_amenities_amenity_id ON house_amenities(amenity_id);

ALTER TABLE house_amenities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_house_amenities" ON house_amenities;
CREATE POLICY "public_read_house_amenities" ON house_amenities FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_house_amenities" ON house_amenities;
CREATE POLICY "auth_insert_house_amenities" ON house_amenities FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_house_amenities" ON house_amenities;
CREATE POLICY "auth_update_house_amenities" ON house_amenities FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_house_amenities" ON house_amenities;
CREATE POLICY "auth_delete_house_amenities" ON house_amenities FOR DELETE
TO authenticated USING (true);

-- ============================================================================
-- 5. HOUSE_IMAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS house_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt_text text,
  caption text,
  category text NOT NULL DEFAULT 'interior' CHECK (category IN ('hero', 'exterior', 'bedroom', 'living_room', 'kitchen', 'bathroom', 'entrance', 'garden', 'detail', 'other')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_house_images_house_id ON house_images(house_id);
CREATE INDEX IF NOT EXISTS idx_house_images_sort ON house_images(house_id, sort_order);

ALTER TABLE house_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_house_images" ON house_images;
CREATE POLICY "public_read_house_images" ON house_images FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_house_images" ON house_images;
CREATE POLICY "auth_insert_house_images" ON house_images FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_house_images" ON house_images;
CREATE POLICY "auth_update_house_images" ON house_images FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_house_images" ON house_images;
CREATE POLICY "auth_delete_house_images" ON house_images FOR DELETE
TO authenticated USING (true);

-- ============================================================================
-- 6. GUESTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  country text,
  preferred_communication text NOT NULL DEFAULT 'WHATSAPP' CHECK (preferred_communication IN ('WHATSAPP', 'EMAIL', 'PHONE', 'SMS')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone);

ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_guests" ON guests;
CREATE POLICY "auth_read_guests" ON guests FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_guests" ON guests;
CREATE POLICY "auth_insert_guests" ON guests FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_guests" ON guests;
CREATE POLICY "auth_update_guests" ON guests FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_guests" ON guests;
CREATE POLICY "auth_delete_guests" ON guests FOR DELETE
TO authenticated USING (true);

-- ============================================================================
-- 7. RESERVATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  guest_id uuid REFERENCES guests(id) ON DELETE SET NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  num_guests int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'BLOCKED')),
  source text NOT NULL DEFAULT 'AIRBNB' CHECK (source IN ('AIRBNB', 'DIRECT', 'MANUAL', 'BLOCKED')),
  external_reference text,
  total_amount numeric(10, 2),
  currency text NOT NULL DEFAULT 'USD',
  payment_status text NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'PARTIAL', 'REFUNDED', 'N/A')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_dates CHECK (check_out > check_in)
);

CREATE INDEX IF NOT EXISTS idx_reservations_house_id ON reservations(house_id);
CREATE INDEX IF NOT EXISTS idx_reservations_check_in ON reservations(check_in);
CREATE INDEX IF NOT EXISTS idx_reservations_check_out ON reservations(check_out);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_source ON reservations(source);
CREATE INDEX IF NOT EXISTS idx_reservations_house_dates ON reservations(house_id, check_in, check_out) WHERE status NOT IN ('CANCELLED');

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_reservations" ON reservations;
CREATE POLICY "auth_read_reservations" ON reservations FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_reservations" ON reservations;
CREATE POLICY "auth_insert_reservations" ON reservations FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_reservations" ON reservations;
CREATE POLICY "auth_update_reservations" ON reservations FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_reservations" ON reservations;
CREATE POLICY "auth_delete_reservations" ON reservations FOR DELETE
TO authenticated USING (true);

-- ============================================================================
-- 8. AVAILABILITY_BLOCKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS availability_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL DEFAULT 'MAINTENANCE' CHECK (reason IN ('MAINTENANCE', 'OWNER_USE', 'CLEANING', 'HOLIDAY', 'OTHER')),
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_block_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_availability_blocks_house_id ON availability_blocks(house_id);
CREATE INDEX IF NOT EXISTS idx_availability_blocks_dates ON availability_blocks(house_id, start_date, end_date);

ALTER TABLE availability_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_availability_blocks" ON availability_blocks;
CREATE POLICY "auth_read_availability_blocks" ON availability_blocks FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_availability_blocks" ON availability_blocks;
CREATE POLICY "auth_insert_availability_blocks" ON availability_blocks FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_availability_blocks" ON availability_blocks;
CREATE POLICY "auth_update_availability_blocks" ON availability_blocks FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_availability_blocks" ON availability_blocks;
CREATE POLICY "auth_delete_availability_blocks" ON availability_blocks FOR DELETE
TO authenticated USING (true);

-- ============================================================================
-- 9. REVIEWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  guest_display_name text,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content text NOT NULL,
  stay_date date,
  source text NOT NULL DEFAULT 'AIRBNB' CHECK (source IN ('AIRBNB', 'DIRECT', 'GOOGLE', 'OTHER')),
  is_featured boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_house_id ON reviews(house_id);
CREATE INDEX IF NOT EXISTS idx_reviews_published ON reviews(is_published);
CREATE INDEX IF NOT EXISTS idx_reviews_featured ON reviews(is_featured);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_reviews" ON reviews;
CREATE POLICY "public_read_reviews" ON reviews FOR SELECT
TO anon, authenticated USING (is_published = true);

DROP POLICY IF EXISTS "auth_insert_reviews" ON reviews;
CREATE POLICY "auth_insert_reviews" ON reviews FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_reviews" ON reviews;
CREATE POLICY "auth_update_reviews" ON reviews FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_reviews" ON reviews;
CREATE POLICY "auth_delete_reviews" ON reviews FOR DELETE
TO authenticated USING (true);

-- ============================================================================
-- 10. PROPERTY_SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS property_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'brand', 'contact', 'social', 'booking', 'policies', 'location')),
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE property_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_property_settings" ON property_settings;
CREATE POLICY "public_read_property_settings" ON property_settings FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_property_settings" ON property_settings;
CREATE POLICY "auth_insert_property_settings" ON property_settings FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_property_settings" ON property_settings;
CREATE POLICY "auth_update_property_settings" ON property_settings FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_property_settings" ON property_settings;
CREATE POLICY "auth_delete_property_settings" ON property_settings FOR DELETE
TO authenticated USING (true);

-- ============================================================================
-- 11. PRICE_RULES
-- ============================================================================
CREATE TABLE IF NOT EXISTS price_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  rule_type text NOT NULL CHECK (rule_type IN ('WEEKEND', 'SEASONAL', 'SPECIAL', 'LONG_STAY')),
  start_date date,
  end_date date,
  price_override numeric(10, 2),
  adjustment_type text NOT NULL DEFAULT 'FIXED' CHECK (adjustment_type IN ('FIXED', 'PERCENTAGE')),
  adjustment_value numeric(10, 2),
  min_nights int,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_rules_house_id ON price_rules(house_id);
CREATE INDEX IF NOT EXISTS idx_price_rules_dates ON price_rules(house_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_price_rules_active ON price_rules(is_active);

ALTER TABLE price_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_price_rules" ON price_rules;
CREATE POLICY "auth_read_price_rules" ON price_rules FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_price_rules" ON price_rules;
CREATE POLICY "auth_insert_price_rules" ON price_rules FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_price_rules" ON price_rules;
CREATE POLICY "auth_update_price_rules" ON price_rules FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_price_rules" ON price_rules;
CREATE POLICY "auth_delete_price_rules" ON price_rules FOR DELETE
TO authenticated USING (true);

-- ============================================================================
-- 12. updated_at trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_properties_updated_at ON properties;
CREATE TRIGGER trigger_properties_updated_at BEFORE UPDATE ON properties
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_houses_updated_at ON houses;
CREATE TRIGGER trigger_houses_updated_at BEFORE UPDATE ON houses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_guests_updated_at ON guests;
CREATE TRIGGER trigger_guests_updated_at BEFORE UPDATE ON guests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_reservations_updated_at ON reservations;
CREATE TRIGGER trigger_reservations_updated_at BEFORE UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_property_settings_updated_at ON property_settings;
CREATE TRIGGER trigger_property_settings_updated_at BEFORE UPDATE ON property_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
