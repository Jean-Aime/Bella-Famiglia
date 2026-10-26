/* ============================================================================
# Rebrand the content to the real property: Bella Famiglia (Musanze, Rwanda)

Replaces the demo seed content ("Maison Privée · Kigali") with the real listing
information supplied by the owner, so the public site shows the actual guest
house.

SOURCE OF TRUTH: the owner's live Booking.com listing for Bella Famiglia,
Ruhengeri (pasted in full). Every value below is taken from that listing.

IMPORTANT FRAMING: this is ONE house with TWO independent entrances. The two
entrances are the same property (on Booking.com they appear as listings with
identical content), so the public site shows a single listing; the second
"house" row is kept INACTIVE purely as an internal marker.

WHAT THIS CHANGES
-----------------
  1. properties            name, tagline, description, location label, coordinates
  2. active house          name, tagline, description, bathrooms, property type
  3. second house          forced INACTIVE (hidden from the public site)
  4. property_settings     brand, host, check-in/out, house rules, location
  5. amenities             adds facilities the listing has but the seed lacked,
                           links them to the active house, and removes the
                           8 facilities the listing never mentions

WHAT THIS DELIBERATELY DOES NOT CHANGE (owner must supply these)
----------------------------------------------------------------
  * contact_email / contact_phone / whatsapp_number — still the Kigali
    placeholders (+250700000000, stay@maisonprivee.rw). Edit them in
    Admin -> Settings, or tell me the values and I will add them here.
  * cancellation_policy — the demo text is still there; set your real policy.
  * base_price / currency — the nightly rate is still the demo 65 USD.
  * airbnb_listing_url — still PLACEHOLDER, so "Book on Airbnb" stays hidden
    (by design) until you paste a real listing URL.
  * house photos — still the stock Pexels images. Upload the real 12 photos in
    Admin -> Houses -> Gallery & amenities.
  * Frontend copy — the React pages have been rebranded to Bella Famiglia in
    code (separate change, already applied); this file only controls the
    database-driven text.

SAFE TO RE-RUN: every statement is idempotent (re-running produces the same
result, no duplicates).

HOW TO RUN
----------
Supabase Dashboard -> SQL Editor -> New query -> paste this file -> Run.
Run section 0 alone first if you want to see the current values before changing
them. The whole change is wrapped in a transaction, so a failure rolls back.

VERIFY AT THE END: the final queries should show Bella Famiglia everywhere.
=========================================================================== */


-- ============================================================================
-- 0. PREVIEW — what is about to change (run this alone first if you like)
-- ============================================================================
SELECT 'property' AS what, name, tagline, location_label FROM public.properties;
SELECT 'houses'   AS what, name, slug, tagline, bedrooms, bathrooms, status
  FROM public.houses ORDER BY sort_order;
SELECT 'settings' AS what, key, value FROM public.property_settings
 WHERE key IN ('brand_name','brand_tagline','host_name','check_in_time',
               'check_out_time','location_neighborhood','property_size',
               'public_address','nearby_attractions')
 ORDER BY key;


-- ============================================================================
-- All changes below run in one transaction
-- ============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. PROPERTY — Bella Famiglia, Musanze (Ruhengeri)
--    Coordinates are approximate town-centre values; nothing on the site uses
--    them yet, so they can be refined later from Google Maps.
-- ---------------------------------------------------------------------------
UPDATE public.properties SET
  name           = 'Bella Famiglia',
  tagline        = 'Guest House with Volcano Views · Musanze',
  description    = 'Bella Famiglia is near INES Ruhengeri, Volcanoes National Park and very close to Musanze caves, at the edge of Musanze town about 2.5 km from the city centre. You''ll fall in love with our place because of the gorgeous views of the volcanoes, the nice garden, fresh air and stunning evening views. It is one house with two independent entrances, so each side has its own private way in. Our place is good for couples, solo adventurers, business travellers and families with children.',
  location_label = 'Musanze (Ruhengeri), Rwanda',
  latitude       = -1.4998,
  longitude      = 29.6345
WHERE id = 'a0000000-0000-0000-0000-000000000001'
   OR slug = 'maison-privee';

-- ---------------------------------------------------------------------------
-- 2. ACTIVE HOUSE — the listing itself
--    Matched by id (stable) or by either slug, so it works whether or not the
--    "single house" reframe migration has been run. Slug is intentionally left
--    untouched: the public route is /the-house and the site reads it from here.
-- ---------------------------------------------------------------------------
UPDATE public.houses SET
  name          = 'Bella Famiglia',
  tagline       = 'Private Apartment · Balcony, Garden & Volcano Views',
  description   = 'The entire place is yours: a comfortable, spacious apartment in Musanze with one bedroom and two bathrooms, a terrace, balcony and garden views. Guests enjoy free WiFi, a fully equipped kitchen and a kitchenette, plus a dressing room, sofa and wardrobe. Free on-site private parking (no reservation needed), smoke-free, with a safety deposit box and heating. Languages spoken: English and French.',
  bedrooms      = 1,
  bathrooms     = 2,
  property_type = 'Entire apartment',
  status        = 'ACTIVE'
WHERE id = 'b0000000-0000-0000-0000-000000000001'
   OR slug IN ('house-one', 'the-house');

-- ---------------------------------------------------------------------------
-- 3. SECOND HOUSE — stays hidden (single property, as decided)
-- ---------------------------------------------------------------------------
UPDATE public.houses SET status = 'INACTIVE'
WHERE id = 'b0000000-0000-0000-0000-000000000002'
   OR slug = 'house-two';

-- ---------------------------------------------------------------------------
-- 4. SETTINGS — brand, host, rules, location
--    check_in_time / check_out_time must stay in HH:MM format (the admin
--    panel edits them as time inputs); the ranges live in house_rules.
--    NOTE: contact / cancellation / Airbnb keys are intentionally untouched.
-- ---------------------------------------------------------------------------
UPDATE public.property_settings SET
  value       = CASE key
    WHEN 'brand_name'                  THEN 'Bella Famiglia'
    WHEN 'brand_tagline'               THEN 'Guest House · Musanze, Rwanda'
    WHEN 'brand_description'           THEN 'Bella Famiglia in Musanze offers a spacious apartment with one bedroom and two bathrooms, with a terrace, balcony and garden views. Guests enjoy free WiFi, a fully equipped kitchen and a kitchenette, plus free on-site private parking — 2.5 km from the town centre and minutes from Volcanoes National Park and Musanze caves.'
    WHEN 'host_name'                   THEN 'Niyomizero'
    WHEN 'check_in_time'               THEN '15:00'
    WHEN 'check_out_time'              THEN '08:00'
    WHEN 'house_rules'                 THEN 'Check-in: 15:00 – 18:00 (please tell us your arrival time in advance). Check-out: 08:00 – 11:00. Cash only. No smoking. No pets. Children of all ages are welcome — guests 18 and above are charged as adults. Cribs and extra beds are not available. No age restriction for check-in. Languages spoken: English and French.'
    WHEN 'location_neighborhood'       THEN 'Edge of Musanze town, about 2.5 km from the city centre — near INES Ruhengeri, Musanze caves, the village market and Volcanoes National Park (3.7 km), with volcano and garden views. Nearby: Bar Sharama 2.5 km, Auberge Ikaze Bar 2.5 km, Ibisumizi Resto-Bar 2.6 km.'
    WHEN 'location_city_center_distance' THEN '2.5 km from Musanze (Ruhengeri) town centre'
    WHEN 'location_airport_distance'   THEN 'Kisoro Airport 37 km · Goma International Airport 65 km'
    ELSE value
  END,
  updated_at  = now()
WHERE key IN ('brand_name', 'brand_tagline', 'brand_description', 'host_name',
              'check_in_time', 'check_out_time', 'house_rules',
              'location_neighborhood', 'location_city_center_distance',
              'location_airport_distance');

-- Listing details and guest questions. Exact street-level directions are not
-- stored here because property_settings is publicly readable under RLS.
INSERT INTO public.property_settings (key, value, category, description)
VALUES
  ('public_address', 'Musanze (Ruhengeri), Rwanda', 'location', 'Public location label; exact address is shared after booking'),
  ('address_disclosure', 'The exact address and telephone number are provided after your booking is confirmed.', 'location', 'Public address privacy note'),
  ('location_map_url', 'https://www.openstreetmap.org/?mlat=-1.4998&mlon=29.6345#map=14/-1.4998/29.6345', 'location', 'Approximate town map link, not the exact property pin'),
  ('show_public_price', 'false', 'booking', 'Show nightly price publicly only after the actual rate is entered in Admin → Houses'),
  ('property_size', '12 m²', 'booking', 'Property size as shown on the listing'),
  ('bed_description', 'Bed', 'booking', 'Bed description using the supplied listing wording'),
  ('check_in_window', 'From 3:00 PM to 6:00 PM', 'policies', 'Arrival window; guest should advise arrival time'),
  ('check_out_window', 'From 8:00 AM to 11:00 AM', 'policies', 'Departure window'),
  ('children_policy', 'Children of all ages are welcome. Guests aged 18 and above are charged as adults.', 'policies', 'Children policy'),
  ('extra_beds_policy', 'Cribs and extra beds are not available.', 'policies', 'Crib and extra-bed availability'),
  ('payment_policy', 'Cash only.', 'policies', 'Accepted payment method'),
  ('smoking_policy', 'Smoking is not allowed.', 'policies', 'Smoking policy'),
  ('pets_policy', 'Pets are not allowed.', 'policies', 'Pet policy'),
  ('age_restriction', 'There is no age requirement for check-in.', 'policies', 'Minimum age policy'),
  ('spoken_languages', 'English and French', 'booking', 'Languages spoken by reception staff'),
  ('breakfast_info', 'Breakfast service is not listed. Please contact the host to confirm arrangements.', 'booking', 'Guest FAQ: breakfast'),
  ('airport_shuttle_info', 'An airport shuttle is not listed. Please contact the host to ask about transport.', 'booking', 'Guest FAQ: airport shuttle'),
  ('restaurant_info', 'There is no on-site restaurant listed. Nearby cafes and restaurants are in Musanze town.', 'booking', 'Guest FAQ: restaurant'),
  ('pool_spa_info', 'A swimming pool and spa are not listed among the property facilities.', 'booking', 'Guest FAQ: pool and spa'),
  ('bathroom_info', 'The apartment has two bathrooms. The listing does not specify whether they are private en-suite bathrooms.', 'booking', 'Guest FAQ: bathroom type'),
  ('nearby_attractions', 'Volcanoes National Park — 3.7 km\nBar Sharama — 2.5 km\nAuberge Ikaze Bar — 2.5 km\nIbisumizi Resto-Bar — 2.6 km\nMusanze town centre — 2.5 km\nKisoro Airport — 37 km\nGoma International Airport — 65 km', 'location', 'Nearby places and approximate distances')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  updated_at = now();

-- Safety net: if any of those keys is missing as a row, create it.
-- (category values must match the table's CHECK constraint.)
INSERT INTO public.property_settings (key, value, category, description)
SELECT v.key, v.value, v.category, v.description
  FROM (VALUES
    ('brand_name',                    'Bella Famiglia',        'brand',    'Property brand name'),
    ('brand_tagline',                 'Guest House · Musanze, Rwanda', 'brand', 'Brand tagline'),
    ('host_name',                     'Niyomizero',            'contact',  'Name of the host'),
    ('check_in_time',                 '15:00',                 'policies', 'Standard check-in time'),
    ('check_out_time',                '08:00',                 'policies', 'Standard check-out time'),
    ('location_neighborhood',         'Edge of Musanze town, about 2.5 km from the city centre — near INES Ruhengeri, Musanze caves, the village market and Volcanoes National Park (3.7 km), with volcano and garden views. Nearby: Bar Sharama 2.5 km, Auberge Ikaze Bar 2.5 km, Ibisumizi Resto-Bar 2.6 km.', 'location', 'Neighborhood description (approximate, not exact address)')
  ) AS v(key, value, category, description)
WHERE NOT EXISTS (SELECT 1 FROM public.property_settings s WHERE s.key = v.key);

-- ---------------------------------------------------------------------------
-- 5. AMENITIES — the listing has facilities the seed did not.
--    Only the six categories below are rendered on the public site, so every
--    new row uses one of them. Idempotent: no duplicates on re-run.
-- ---------------------------------------------------------------------------
INSERT INTO public.amenities (name, category, icon_name, sort_order)
SELECT v.name, v.category, v.icon_name, v.sort_order
  FROM (VALUES
    ('Balcony',                 'Outdoor',      'Sun',         5),
    ('Terrace',                 'Outdoor',      'Armchair',    6),
    ('Garden view',             'Outdoor',      'Trees',       7),
    ('Kitchenette',             'Kitchen',      'CookingPot',  5),
    ('Fully equipped kitchen',  'Kitchen',      'CookingPot',  4),
    ('Wardrobe or closet',      'Comfort',      'Closet',      5),
    ('Dressing room',           'Comfort',      'Closet',      6),
    ('Sofa',                    'Comfort',      'Sofa',        7),
    ('Carpeted',                'Comfort',      'Layers',      8),
    ('Safety deposit box',      'Safety',       'Lock',        5),
    ('Iron',                    'Convenience',  'Shirt',       5),
    ('Heating',                 'Convenience',  'Thermometer', 6),
    ('Free Wi-Fi (some rooms)', 'Connectivity','Wifi',        5),
    ('Free private parking on site', 'Convenience', 'Car',     7),
    ('Private entrance',        'Convenience',  'KeyRound',    8)
  ) AS v(name, category, icon_name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.amenities a WHERE a.name = v.name);

-- Link every Bella Famiglia facility to the active house.
INSERT INTO public.house_amenities (house_id, amenity_id)
SELECT h.id, a.id
  FROM public.houses h
  JOIN public.amenities a ON true
 WHERE (h.id = 'b0000000-0000-0000-0000-000000000001'
        OR h.slug IN ('house-one', 'the-house'))
   AND a.name IN (
     'Balcony', 'Terrace', 'Garden view', 'Kitchenette',
     'Fully equipped kitchen', 'Wardrobe or closet', 'Dressing room',
     'Sofa', 'Carpeted', 'Safety deposit box', 'Iron', 'Heating',
     'Free Wi-Fi (some rooms)', 'Free private parking on site',
     'Private entrance'
   )
ON CONFLICT DO NOTHING;

COMMIT;


-- ============================================================================
-- Remove seeded facilities not confirmed by the provided listing. Keeping only
-- facilities explicitly named there avoids presenting demo/assumed amenities.
-- ============================================================================
DELETE FROM public.house_amenities ha USING public.amenities a
 WHERE ha.amenity_id = a.id
   AND (ha.house_id = 'b0000000-0000-0000-0000-000000000001'
        OR ha.house_id IN (SELECT id FROM public.houses WHERE slug = 'the-house'))
   AND a.name NOT IN (
     'Balcony', 'Terrace', 'Garden view', 'Kitchenette',
     'Fully equipped kitchen', 'Wardrobe or closet', 'Dressing room',
     'Sofa', 'Carpeted', 'Safety deposit box', 'Iron', 'Heating',
     'Free Wi-Fi (some rooms)', 'Free private parking on site',
     'Private entrance'
   );


-- ============================================================================
-- VERIFICATION — should show Bella Famiglia everywhere, second house inactive
-- ============================================================================
SELECT name, slug, tagline, bedrooms, bathrooms, property_type, status
  FROM public.houses ORDER BY sort_order;

SELECT key, value
  FROM public.property_settings
 WHERE key IN ('brand_name','brand_tagline','host_name','check_in_time',
               'check_out_time','house_rules','location_neighborhood',
               'location_city_center_distance','location_airport_distance',
               'contact_email','whatsapp_number','cancellation_policy',
               'public_address','address_disclosure','property_size',
               'show_public_price','check_in_window','check_out_window',
               'nearby_attractions','spoken_languages')
 ORDER BY key;

SELECT a.category, a.name
  FROM public.house_amenities ha
  JOIN public.amenities a ON a.id = ha.amenity_id
 WHERE ha.house_id = 'b0000000-0000-0000-0000-000000000001'
 ORDER BY a.category, a.name;

-- Must return 0 rows: no unconfirmed seed facilities remain linked.
SELECT a.name
  FROM public.house_amenities ha
  JOIN public.amenities a ON a.id = ha.amenity_id
 WHERE (ha.house_id = 'b0000000-0000-0000-0000-000000000001'
        OR ha.house_id IN (SELECT id FROM public.houses WHERE slug = 'the-house'))
   AND a.name NOT IN (
     'Balcony', 'Terrace', 'Garden view', 'Kitchenette',
     'Fully equipped kitchen', 'Wardrobe or closet', 'Dressing room',
     'Sofa', 'Carpeted', 'Safety deposit box', 'Iron', 'Heating',
     'Free Wi-Fi (some rooms)', 'Free private parking on site',
     'Private entrance'
   );
