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
