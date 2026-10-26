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
