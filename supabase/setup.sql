/*
# Maison Privée - complete database bootstrap v3 (fixed RAISE syntax + message)

Paste this ENTIRE file into Supabase SQL Editor and press Run.
*/

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

-- Private booking details are admin-only and must not be stored in the
-- publicly readable property_settings table.
CREATE TABLE IF NOT EXISTS private_property_details (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  street_address text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private_property_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_read_private_property_details" ON private_property_details;
CREATE POLICY "auth_read_private_property_details" ON private_property_details FOR SELECT
TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_private_property_details" ON private_property_details;
CREATE POLICY "auth_insert_private_property_details" ON private_property_details FOR INSERT
TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_private_property_details" ON private_property_details;
CREATE POLICY "auth_update_private_property_details" ON private_property_details FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_private_property_details" ON private_property_details;
CREATE POLICY "auth_delete_private_property_details" ON private_property_details FOR DELETE
TO authenticated USING (true);
REVOKE ALL ON TABLE private_property_details FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE private_property_details TO authenticated;

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
/*
# Seed Initial Data

Populates the database with:
1. One property (Maison Privée, Kigali)
2. Two houses (House 01 and House 02) with realistic descriptions
3. Amenity master list
4. House-amenity mappings
5. House images (professional photography URLs from Pexels)
6. Property settings (brand, contact, WhatsApp, social, policies)
7. Demo reviews (clearly placeholder)
8. Demo reservations (for admin dashboard and calendar)
9. Demo availability blocks

All data uses realistic placeholder content that the owner can replace.
*/

-- ============================================================================
-- 1. PROPERTY
-- ============================================================================
INSERT INTO properties (id, name, slug, tagline, description, location_label, latitude, longitude)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Maison Privée',
  'maison-privee',
  'Private Stays · Kigali',
  'A quiet compound in Kigali with two independent, fully furnished homes — each with its own entrance, designed for short stays, longer stays, business trips and weekends away.',
  'Kigali, Rwanda',
  -1.9706,
  30.1044
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 2. HOUSES
-- ============================================================================
INSERT INTO houses (id, property_id, name, slug, tagline, description, max_guests, bedrooms, bathrooms, has_living_room, has_kitchen, property_type, base_price, currency, airbnb_listing_url, status, sort_order)
VALUES
(
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'House 01',
  'house-one',
  'Private One-Bedroom Stay',
  'A fully furnished private home with a warm, minimal interior. One bedroom, a comfortable living room, a kitchenette, and a clean modern bathroom. Designed for two — with space to breathe.',
  2, 1, 1, true, true, 'Entire home', 65.00, 'USD', 'https://www.airbnb.com/rooms/PLACEHOLDER_HOUSE_01', 'ACTIVE', 1
),
(
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'House 02',
  'house-two',
  'Garden-Facing One-Bedroom Retreat',
  'A bright, garden-facing home with a relaxed, airy feel. One bedroom with soft natural light, a living area that opens to greenery, a full kitchen, and a contemporary bathroom. Private entrance, quiet setting.',
  2, 1, 1, true, true, 'Entire home', 70.00, 'USD', 'https://www.airbnb.com/rooms/PLACEHOLDER_HOUSE_02', 'ACTIVE', 2
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 3. AMENITIES
-- ============================================================================
INSERT INTO amenities (id, name, category, icon_name, sort_order) VALUES
-- Comfort
('c0000000-0000-0000-0000-000000000001', 'Queen-size bed', 'Comfort', 'BedDouble', 1),
('c0000000-0000-0000-0000-000000000002', 'Fresh linens & towels', 'Comfort', 'Sparkles', 2),
('c0000000-0000-0000-0000-000000000003', 'Sofa lounge area', 'Comfort', 'Sofa', 3),
('c0000000-0000-0000-0000-000000000004', 'Blackout curtains', 'Comfort', 'Blinds', 4),
-- Connectivity
('c0000000-0000-0000-0000-000000000005', 'High-speed Wi-Fi', 'Connectivity', 'Wifi', 1),
('c0000000-0000-0000-0000-000000000006', 'Workspace desk', 'Connectivity', 'Monitor', 2),
('c0000000-0000-0000-0000-000000000007', 'Smart TV', 'Connectivity', 'Tv', 3),
-- Kitchen
('c0000000-0000-0000-0000-000000000008', 'Refrigerator', 'Kitchen', 'Refrigerator', 1),
('c0000000-0000-0000-0000-000000000009', 'Cooking equipment', 'Kitchen', 'CookingPot', 2),
('c0000000-0000-0000-0000-000000000010', 'Dining area', 'Kitchen', 'Utensils', 3),
('c0000000-0000-0000-0000-000000000011', 'Coffee & tea', 'Kitchen', 'Coffee', 4),
-- Safety
('c0000000-0000-0000-0000-000000000012', 'Secure private entrance', 'Safety', 'Lock', 1),
('c0000000-0000-0000-0000-000000000013', 'Outdoor lighting', 'Safety', 'Lightbulb', 2),
('c0000000-0000-0000-0000-000000000014', 'Smoke detector', 'Safety', 'Flame', 3),
('c0000000-0000-0000-0000-000000000015', 'First aid kit', 'Safety', 'BriefcaseMedical', 4),
-- Convenience
('c0000000-0000-0000-0000-000000000016', 'Air conditioning', 'Convenience', 'Wind', 1),
('c0000000-0000-0000-0000-000000000017', 'Hot water', 'Convenience', 'Droplets', 2),
('c0000000-0000-0000-0000-000000000018', 'Washing machine', 'Convenience', 'WashingMachine', 3),
('c0000000-0000-0000-0000-000000000019', 'Free parking', 'Convenience', 'CircleParking', 4),
-- Outdoor
('c0000000-0000-0000-0000-000000000020', 'Private garden access', 'Outdoor', 'Trees', 1),
('c0000000-0000-0000-0000-000000000021', 'Outdoor seating', 'Outdoor', 'Armchair', 2)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. HOUSE_AMENITIES (both houses get the same amenities for now)
-- ============================================================================
INSERT INTO house_amenities (house_id, amenity_id)
SELECT h.id, a.id FROM houses h, amenities a WHERE h.slug IN ('house-one', 'house-two')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. HOUSE_IMAGES
-- Using high-quality Pexels photography
-- ============================================================================
INSERT INTO house_images (house_id, url, alt_text, caption, category, sort_order) VALUES
-- House 01 images
('b0000000-0000-0000-0000-000000000001', 'https://images.pexels.com/photos/8134821/pexels-photo-8134821.jpeg?auto=compress&cs=tinysrgb&w=1600', 'Contemporary two-story home exterior', 'House 01 exterior', 'hero', 0),
('b0000000-0000-0000-0000-000000000001', 'https://images.pexels.com/photos/7031604/pexels-photo-7031604.jpeg?auto=compress&cs=tinysrgb&w=1600', 'House exterior with panoramic windows', 'Exterior view', 'exterior', 1),
('b0000000-0000-0000-0000-000000000001', 'https://images.pexels.com/photos/4153156/pexels-photo-4153156.jpeg?auto=compress&cs=tinysrgb&w=1600', 'Bedroom with white linen bedding', 'Bedroom', 'bedroom', 2),
('b0000000-0000-0000-0000-000000000001', 'https://images.pexels.com/photos/15867424/pexels-photo-15867424.png?auto=compress&cs=tinysrgb&w=1600', 'Minimalist living room with beige sofa', 'Living room', 'living_room', 3),
('b0000000-0000-0000-0000-000000000001', 'https://images.pexels.com/photos/6508341/pexels-photo-6508341.jpeg?auto=compress&cs=tinysrgb&w=1600', 'Modern kitchen with white cabinets and wood details', 'Kitchenette', 'kitchen', 4),
('b0000000-0000-0000-0000-000000000001', 'https://images.pexels.com/photos/7031840/pexels-photo-7031840.jpeg?auto=compress&cs=tinysrgb&w=1600', 'Modern bathroom with glass shower', 'Bathroom', 'bathroom', 5),
('b0000000-0000-0000-0000-000000000001', 'https://images.pexels.com/photos/39743614/pexels-photo-39743614.jpeg?auto=compress&cs=tinysrgb&w=1600', 'Wrought iron gate with greenery', 'Private entrance', 'entrance', 6),
('b0000000-0000-0000-0000-000000000001', 'https://images.pexels.com/photos/39134573/pexels-photo-39134573.jpeg?auto=compress&cs=tinysrgb&w=1600', 'Stylish living room with wood furniture', 'Living room detail', 'detail', 7),

-- House 02 images
('b0000000-0000-0000-0000-000000000002', 'https://images.pexels.com/photos/5563473/pexels-photo-5563473.jpeg?auto=compress&cs=tinysrgb&w=1600', 'Contemporary cottage with large windows and terrace', 'House 02 exterior', 'hero', 0),
('b0000000-0000-0000-0000-000000000002', 'https://images.pexels.com/photos/17174768/pexels-photo-17174768.jpeg?auto=compress&cs=tinysrgb&w=1600', 'Modern villa with lush greenery', 'Exterior with garden', 'exterior', 1),
('b0000000-0000-0000-0000-000000000002', 'https://images.pexels.com/photos/10554480/pexels-photo-10554480.jpeg?auto=compress&cs=tinysrgb&w=1600', 'Serene white bedroom with natural light', 'Bedroom', 'bedroom', 2),
('b0000000-0000-0000-0000-000000000002', 'https://images.pexels.com/photos/5661719/pexels-photo-5661719.jpeg?auto=compress&cs=tinysrgb&w=1600', 'Cozy living room with neutral tones', 'Living room', 'living_room', 3),
('b0000000-0000-0000-0000-000000000002', 'https://images.pexels.com/photos/25565687/pexels-photo-25565687.png?auto=compress&cs=tinysrgb&w=1600', 'Contemporary kitchenette with wooden finishes', 'Full kitchen', 'kitchen', 4),
('b0000000-0000-0000-0000-000000000002', 'https://images.pexels.com/photos/8089092/pexels-photo-8089092.jpeg?auto=compress&cs=tinysrgb&w=1600', 'Sleek modern bathroom with pendant lighting', 'Bathroom', 'bathroom', 5),
('b0000000-0000-0000-0000-000000000002', 'https://images.pexels.com/photos/63743/pexels-photo-63743.jpeg?auto=compress&cs=tinysrgb&w=1600', 'Garden entrance with lush greenery', 'Garden entrance', 'entrance', 6),
('b0000000-0000-0000-0000-000000000002', 'https://images.pexels.com/photos/11295811/pexels-photo-11295811.jpeg?auto=compress&cs=tinysrgb&w=1600', 'Cozy living room with beige sofa and artwork', 'Living room detail', 'detail', 7)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. PROPERTY_SETTINGS
-- ============================================================================
INSERT INTO property_settings (key, value, category, description) VALUES
-- Brand
('brand_name', 'Maison Privée', 'brand', 'Property brand name'),
('brand_tagline', 'Private Stays · Kigali', 'brand', 'Brand tagline'),
('brand_description', 'Two private, fully furnished homes in a quiet Kigali compound. Designed around comfort, privacy, and the quiet pleasure of a place that feels like your own.', 'brand', 'Brand description for SEO and meta'),
-- Contact
('whatsapp_number', '+250700000000', 'contact', 'WhatsApp contact number (replace with actual number)'),
('whatsapp_enabled', 'true', 'contact', 'Enable WhatsApp contact button'),
('contact_email', 'stay@maisonprivee.rw', 'contact', 'Contact email (placeholder)'),
('contact_phone', '+250700000000', 'contact', 'Contact phone (placeholder)'),
('host_name', 'Your Host', 'contact', 'Name of the host (placeholder)'),
-- Social
('airbnb_profile_url', 'https://www.airbnb.com/p/PLACEHOLDER', 'social', 'Airbnb host profile URL (placeholder)'),
('instagram_url', '', 'social', 'Instagram URL (optional)'),
('facebook_url', '', 'social', 'Facebook URL (optional)'),
-- Booking
('booking_primary_channel', 'AIRBNB', 'booking', 'Primary booking channel'),
('direct_booking_enabled', 'false', 'booking', 'Enable direct booking (future feature)'),
('default_min_nights', '1', 'booking', 'Default minimum nights per stay'),
-- Policies
('check_in_time', '14:00', 'policies', 'Standard check-in time'),
('check_out_time', '11:00', 'policies', 'Standard check-out time'),
('cancellation_policy', 'Flexible — free cancellation up to 48 hours before check-in. After that, the first night is non-refundable.', 'policies', 'Cancellation policy text'),
('house_rules', 'No smoking inside. No pets. Respect the quiet of the neighborhood. Maximum guests as listed per house.', 'policies', 'House rules text'),
-- Location
('location_neighborhood', 'Quiet residential area, Kigali', 'location', 'Neighborhood description (approximate, not exact address)'),
('location_airport_distance', '20 minutes from Kigali International Airport', 'location', 'Airport distance description'),
('location_city_center_distance', '15 minutes from the city center', 'location', 'City center distance'),
-- General
('announcement', '', 'general', 'Optional announcement banner text')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 7. REVIEWS (demo content — clearly placeholder)
-- ============================================================================
INSERT INTO reviews (house_id, guest_name, guest_display_name, rating, content, stay_date, source, is_featured, is_published) VALUES
('b0000000-0000-0000-0000-000000000001', 'Emma R.', 'Emma · United Kingdom', 5, 'The space was immaculate and so quiet. Exactly what we needed after long travel days. The bed was genuinely comfortable — we slept deeply. Communication with the host was prompt and warm.', '2025-08-14', 'AIRBNB', true, true),
('b0000000-0000-0000-0000-000000000002', 'David K.', 'David · United States', 5, 'I stayed for two weeks while working in Kigali. The Wi-Fi was reliable, the kitchen had everything I needed, and the garden made mornings feel slow in the best way. I would come back.', '2025-09-02', 'AIRBNB', true, true),
('b0000000-0000-0000-0000-000000000001', 'Amina T.', 'Amina · Kenya', 5, 'Felt private and safe. The little details — the coffee, the linens, the lighting — showed someone actually thought about what a guest needs. Highly recommend.', '2025-07-20', 'AIRBNB', true, true),
('b0000000-0000-0000-0000-000000000002', 'Thomas L.', 'Thomas · Germany', 4, 'A calm, well-kept place to stay. The location was convenient and the neighborhood was peaceful. The host was responsive and check-in was effortless.', '2025-09-18', 'AIRBNB', true, true),
('b0000000-0000-0000-0000-000000000001', 'Sarah M.', 'Sarah · Canada', 5, 'Beautiful, clean, and thoughtfully designed. We loved the privacy of having our own entrance. The Wi-Fi was fast and the shower pressure was great. A hidden gem in Kigali.', '2025-06-25', 'AIRBNB', true, true),
('b0000000-0000-0000-0000-000000000002', 'Jean P.', 'Jean · Rwanda', 5, 'I booked this for my parents visiting from abroad. They were delighted. The place felt like home but better — elegant, comfortable, and so well maintained.', '2025-08-30', 'AIRBNB', true, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. DEMO RESERVATIONS
-- ============================================================================
INSERT INTO guests (id, name, email, phone, country, preferred_communication, notes) VALUES
('d0000000-0000-0000-0000-000000000001', 'Emma Robertson', 'emma.r@email.com', '+447700900001', 'United Kingdom', 'WHATSAPP', 'Prefers ground floor if available'),
('d0000000-0000-0000-0000-000000000002', 'David Kim', 'd.kim@email.com', '+12125550002', 'United States', 'EMAIL', 'Business traveler, needs reliable Wi-Fi'),
('d0000000-0000-0000-0000-000000000003', 'Amina Tariq', 'amina.t@email.com', '+254712345678', 'Kenya', 'WHATSAPP', ''),
('d0000000-0000-0000-0000-000000000004', 'Thomas Lehrer', 'thomas.l@email.com', '+491511234567', 'Germany', 'EMAIL', 'Extended stay guest'),
('d0000000-0000-0000-0000-000000000005', 'Sarah Mitchell', 'sarah.m@email.com', '+14165551234', 'Canada', 'EMAIL', ''),
('d0000000-0000-0000-0000-000000000006', 'Jean Pierre Habimana', 'jp.habimana@email.com', '+250788888888', 'Rwanda', 'WHATSAPP', 'Booking for parents')
ON CONFLICT DO NOTHING;

INSERT INTO reservations (house_id, guest_id, check_in, check_out, num_guests, status, source, external_reference, total_amount, currency, payment_status, notes) VALUES
-- Past stays
('b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '2025-08-14', '2025-08-18', 2, 'CHECKED_OUT', 'AIRBNB', 'AB-1001', 260.00, 'USD', 'PAID', 'Great guests, left the place spotless'),
('b0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', '2025-09-02', '2025-09-16', 1, 'CHECKED_OUT', 'AIRBNB', 'AB-1002', 980.00, 'USD', 'PAID', '14-night stay, business trip'),
('b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', '2025-07-20', '2025-07-24', 2, 'CHECKED_OUT', 'AIRBNB', 'AB-1003', 260.00, 'USD', 'PAID', ''),
('b0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000004', '2025-09-18', '2025-09-22', 2, 'CHECKED_OUT', 'AIRBNB', 'AB-1004', 280.00, 'USD', 'PAID', ''),
('b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005', '2025-06-25', '2025-06-30', 2, 'CHECKED_OUT', 'AIRBNB', 'AB-1005', 325.00, 'USD', 'PAID', ''),
('b0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000006', '2025-08-30', '2025-09-03', 2, 'CHECKED_OUT', 'AIRBNB', 'AB-1006', 280.00, 'USD', 'PAID', 'Parents were delighted'),
-- Current/upcoming stays
('b0000000-0000-0000-0000-000000000001', NULL, CURRENT_DATE + 3, CURRENT_DATE + 7, 2, 'CONFIRMED', 'AIRBNB', 'AB-1007', 260.00, 'USD', 'PAID', 'Upcoming stay'),
('b0000000-0000-0000-0000-000000000002', NULL, CURRENT_DATE + 1, CURRENT_DATE + 5, 1, 'CONFIRMED', 'AIRBNB', 'AB-1008', 280.00, 'USD', 'PAID', 'Business traveler'),
('b0000000-0000-0000-0000-000000000001', NULL, CURRENT_DATE + 10, CURRENT_DATE + 14, 2, 'PENDING', 'AIRBNB', 'AB-1009', 260.00, 'USD', 'PENDING', 'Awaiting confirmation'),
('b0000000-0000-0000-0000-000000000002', NULL, CURRENT_DATE + 14, CURRENT_DATE + 21, 2, 'CONFIRMED', 'DIRECT', NULL, 490.00, 'USD', 'PARTIAL', 'Direct booking, deposit received')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. AVAILABILITY BLOCKS
-- ============================================================================
INSERT INTO availability_blocks (house_id, start_date, end_date, reason, notes) VALUES
('b0000000-0000-0000-0000-000000000001', CURRENT_DATE + 20, CURRENT_DATE + 22, 'MAINTENANCE', 'Deep cleaning and paint touch-up'),
('b0000000-0000-0000-0000-000000000002', CURRENT_DATE + 25, CURRENT_DATE + 27, 'OWNER_USE', 'Family visiting')
ON CONFLICT DO NOTHING;
/*
# Reframe Property as Single House with Two Entrances

The property is a SINGLE house with TWO independent gates/entrances — not two separate houses.
This migration:
1. Updates property description to reflect single house with two entrances
2. Consolidates House 01 into the main house listing
3. Renames House 02 to be the second entrance / wing of the same house
4. Updates house descriptions accordingly
5. Updates property settings to reflect the single-house framing
*/

-- Update property description
UPDATE properties SET
  description = 'A private, fully furnished house in a quiet Kigali compound. With two independent entrances, it offers flexibility for different guest arrangements — whether you are staying alone, as a couple, or hosting colleagues. One home, designed for comfort, privacy, and the quiet pleasure of a place that feels like your own.',
  tagline = 'Private Stay · Kigali'
WHERE slug = 'maison-privee';

-- Update House 01 to be the main house listing
UPDATE houses SET
  name = 'The House',
  slug = 'the-house',
  tagline = 'A Private Furnished Home',
  description = 'A fully furnished private home with two independent entrances. One bedroom, a comfortable living room, a kitchen, and a clean modern bathroom. The two gates give you flexibility — arrive through one, leave through another, or keep one side private. Designed for comfort and simplicity, with space to breathe.',
  max_guests = 2,
  bedrooms = 1,
  bathrooms = 1
WHERE slug = 'house-one';

-- Deactivate the second "house" since it's the same property
UPDATE houses SET
  status = 'INACTIVE',
  name = 'Second Entrance (Same Property)'
WHERE slug = 'house-two';

-- Update property settings
UPDATE property_settings SET value = 'A private, fully furnished house in Kigali with two independent entrances. Designed for comfort, privacy, and the quiet pleasure of a place that feels like your own.' WHERE key = 'brand_description';
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
