import { supabase } from '@/lib/supabase';
import { isPlaceholderContact } from '@/lib/utils';
import type {
  House, HouseImage, Amenity, Review, PropertySetting, BrandConfig,
  Reservation, Guest, AvailabilityBlock, HouseWithRelations, Property,
  BookingNotificationLog, NotificationKind, PrivatePropertyDetails,
} from '@/types';

// ============================================================
// Property
// ============================================================
export async function fetchProperty(): Promise<Property | null> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('created_at')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Property | null;
}

// ============================================================
// Houses
// ============================================================
export async function fetchHouses(options?: { includeInactive?: boolean }): Promise<House[]> {
  let query = supabase
    .from('houses')
    .select('*')
    .order('sort_order');
  if (!options?.includeInactive) query = query.neq('status', 'INACTIVE');
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as House[];
}

export async function fetchHouseBySlug(slug: string): Promise<House | null> {
  const { data, error } = await supabase
    .from('houses')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data as House | null;
}

export async function fetchHouseImages(houseId: string): Promise<HouseImage[]> {
  const { data, error } = await supabase
    .from('house_images')
    .select('*')
    .eq('house_id', houseId)
    .order('sort_order');
  if (error) throw error;
  return (data || []) as HouseImage[];
}

export async function fetchHouseAmenities(houseId: string): Promise<Amenity[]> {
  const { data, error } = await supabase
    .from('house_amenities')
    .select('amenity:amenities(*)')
    .eq('house_id', houseId);
  if (error) throw error;
  const amenities = ((data ?? []) as unknown as Array<{ amenity: Amenity }>).map((row) => row.amenity);
  amenities.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return amenities;
}

export async function fetchHouseWithRelations(slug: string): Promise<HouseWithRelations | null> {
  const house = await fetchHouseBySlug(slug);
  // INACTIVE houses are hidden from the public site entirely — even by direct URL.
  if (!house || house.status === 'INACTIVE') return null;
  const [images, amenities] = await Promise.all([
    fetchHouseImages(house.id),
    fetchHouseAmenities(house.id),
  ]);
  return { ...house, images, amenities };
}

export async function fetchAllHousesWithRelations(options?: { includeInactive?: boolean }): Promise<HouseWithRelations[]> {
  const houses = await fetchHouses(options);
  const results = await Promise.all(
    houses.map(async (h) => {
      const [images, amenities] = await Promise.all([
        fetchHouseImages(h.id),
        fetchHouseAmenities(h.id),
      ]);
      return { ...h, images, amenities };
    })
  );
  return results;
}

// ============================================================
// Reviews
// ============================================================
export async function fetchPublishedReviews(limit?: number): Promise<Review[]> {
  let query = supabase
    .from('reviews')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Review[];
}

export async function fetchFeaturedReviews(limit?: number): Promise<Review[]> {
  let query = supabase
    .from('reviews')
    .select('*')
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Review[];
}

// ============================================================
// Brand / Settings
// ============================================================
export async function fetchSettings(): Promise<PropertySetting[]> {
  const { data, error } = await supabase
    .from('property_settings')
    .select('*');
  if (error) throw error;
  return (data || []) as PropertySetting[];
}

export async function fetchPrivatePropertyDetails(): Promise<PrivatePropertyDetails> {
  const { data, error } = await supabase
    .from('private_property_details')
    .select('street_address, contact_phone')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return data ?? { street_address: '', contact_phone: '' };
}

export async function savePrivatePropertyDetails(details: PrivatePropertyDetails): Promise<void> {
  const { error } = await supabase
    .from('private_property_details')
    .upsert({
      id: 1,
      street_address: details.street_address.trim(),
      contact_phone: details.contact_phone.trim(),
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
}

export async function fetchBrandConfig(): Promise<BrandConfig> {
  const settings = await fetchSettings();
  const map: Record<string, string> = {};
  settings.forEach((s) => { map[s.key] = s.value; });

  return {
    name: map['brand_name'] || 'Bella Famiglia',
    tagline: map['brand_tagline'] || 'Guest House · Musanze, Rwanda',
    description: map['brand_description'] || '',
    whatsappNumber: isPlaceholderContact(map['whatsapp_number']) ? '' : map['whatsapp_number'],
    whatsappEnabled: map['whatsapp_enabled'] === 'true' && !isPlaceholderContact(map['whatsapp_number']),
    contactEmail: isPlaceholderContact(map['contact_email']) ? '' : map['contact_email'],
    contactPhone: isPlaceholderContact(map['contact_phone']) ? '' : map['contact_phone'],
    hostName: map['host_name'] || 'Niyomizero',
    airbnbProfileUrl: map['airbnb_profile_url'] || '',
    instagramUrl: map['instagram_url'] || '',
    facebookUrl: map['facebook_url'] || '',
    checkInTime: map['check_in_time'] || '15:00',
    checkOutTime: map['check_out_time'] || '08:00',
    cancellationPolicy: map['cancellation_policy'] || '',
    houseRules: map['house_rules'] || '',
    locationNeighborhood: map['location_neighborhood'] || '',
    locationAirportDistance: map['location_airport_distance'] || '',
    locationCityCenterDistance: map['location_city_center_distance'] || '',
    publicAddress: map['public_address'] || 'Musanze (Ruhengeri), Rwanda',
    addressDisclosure: map['address_disclosure'] || 'The exact address and telephone number are provided after your booking is confirmed.',
    locationMapUrl: map['location_map_url'] || 'https://www.openstreetmap.org/?mlat=-1.4998&mlon=29.6345#map=14/-1.4998/29.6345',
    showPublicPrice: map['show_public_price'] === 'true',
    sizeLabel: map['property_size'] || '12 m²',
    bedDescription: map['bed_description'] || 'Bed',
    checkInWindow: map['check_in_window'] || 'From 3:00 PM to 6:00 PM',
    checkOutWindow: map['check_out_window'] || 'From 8:00 AM to 11:00 AM',
    childrenPolicy: map['children_policy'] || 'Children of all ages are welcome. Guests aged 18 and above are charged as adults.',
    extraBedsPolicy: map['extra_beds_policy'] || 'Cribs and extra beds are not available.',
    paymentPolicy: map['payment_policy'] || 'Cash only.',
    smokingPolicy: map['smoking_policy'] || 'Smoking is not allowed.',
    petsPolicy: map['pets_policy'] || 'Pets are not allowed.',
    ageRestriction: map['age_restriction'] || 'There is no age requirement for check-in.',
    spokenLanguages: map['spoken_languages'] || 'English and French',
    breakfastInfo: map['breakfast_info'] || 'Breakfast service is not listed. Please contact the host to confirm arrangements.',
    airportShuttleInfo: map['airport_shuttle_info'] || 'An airport shuttle is not listed. Please contact the host to ask about transport.',
    restaurantInfo: map['restaurant_info'] || 'There is no on-site restaurant listed. Nearby cafes and restaurants are in Musanze town.',
    poolSpaInfo: map['pool_spa_info'] || 'A swimming pool and spa are not listed among the property facilities.',
    bathroomInfo: map['bathroom_info'] || 'The apartment has two bathrooms. The listing does not specify whether they are private en-suite bathrooms.',
    nearbyAttractions: map['nearby_attractions'] || 'Volcanoes National Park — 3.7 km\nBar Sharama — 2.5 km\nAuberge Ikaze Bar — 2.5 km\nIbisumizi Resto-Bar — 2.6 km\nMusanze town centre — 2.5 km\nKisoro Airport — 37 km\nGoma International Airport — 65 km',
    announcement: map['announcement'] || '',
  };
}

// ============================================================
// Availability
// ============================================================
export async function fetchReservationsForHouse(
  houseId: string,
  startDate: string,
  endDate: string
): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('house_id', houseId)
    .neq('status', 'CANCELLED')
    .lt('check_in', endDate)
    .gt('check_out', startDate);
  if (error) throw error;
  return (data || []) as Reservation[];
}

export async function fetchAvailabilityBlocks(
  houseId: string,
  startDate: string,
  endDate: string
): Promise<AvailabilityBlock[]> {
  const { data, error } = await supabase
    .from('availability_blocks')
    .select('*')
    .eq('house_id', houseId)
    .lt('start_date', endDate)
    .gte('end_date', startDate);
  if (error) throw error;
  return (data || []) as AvailabilityBlock[];
}

export async function checkAvailability(
  houseId: string,
  checkIn: string,
  checkOut: string
): Promise<{ available: boolean; reason?: string }> {
  // SECURITY DEFINER Postgres function: anonymous visitors get real results
  // without ever being able to read reservations/availability_blocks directly.
  const { data, error } = await supabase.rpc('check_availability', {
    p_house_id: houseId,
    p_check_in: checkIn,
    p_check_out: checkOut,
  });
  if (error) throw error;
  const result = data as { available: boolean; reason?: string | null };
  return {
    available: !!result?.available,
    reason: result?.reason ?? undefined,
  };
}

// ============================================================
// Public: direct booking request
// ============================================================
export interface BookingRequest {
  houseId: string;
  checkIn: string;
  checkOut: string;
  numGuests: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  notes?: string;
}

export interface BookingResult {
  reservationId: string;
  status: string;
  message: string;
}

export async function createBooking(request: BookingRequest): Promise<BookingResult> {
  // SECURITY DEFINER Postgres function: validates dates, capacity and
  // availability inside a transaction, then creates a PENDING/DIRECT
  // reservation the admin can confirm from the admin panel.
  const { data, error } = await supabase.rpc('create_booking', {
    p_house_id: request.houseId,
    p_check_in: request.checkIn,
    p_check_out: request.checkOut,
    p_num_guests: request.numGuests,
    p_guest_name: request.guestName,
    p_guest_email: request.guestEmail,
    p_guest_phone: request.guestPhone ?? null,
    p_notes: request.notes ?? null,
  });
  if (error) throw error;
  const result = data as { reservation_id: string; status: string; message: string };
  return {
    reservationId: result.reservation_id,
    status: result.status,
    message: result.message,
  };
}

// ============================================================
// Admin: Reservations
// ============================================================
export async function fetchAllReservations(): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, house:houses(*), guest:guests(*)')
    .order('check_in', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as Reservation[];
}

export async function fetchReservationById(id: string): Promise<Reservation | null> {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, house:houses(*), guest:guests(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Reservation | null;
}

export async function createReservation(input: Partial<Reservation>): Promise<Reservation> {
  const { data, error } = await supabase
    .from('reservations')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as Reservation;
}

export async function updateReservation(id: string, updates: Partial<Reservation>): Promise<Reservation> {
  const { data, error } = await supabase
    .from('reservations')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Reservation;
}

export async function deleteReservation(id: string): Promise<void> {
  const { error } = await supabase.from('reservations').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// Admin: Booking email delivery history + manual resend
// ============================================================

/** Delivery history for one reservation, newest first. */
export async function fetchNotificationsForReservation(
  reservationId: string,
  limit = 25
): Promise<BookingNotificationLog[]> {
  const { data, error } = await supabase
    .from('booking_notification_log')
    .select('*')
    .eq('reservation_id', reservationId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as BookingNotificationLog[];
}

/**
 * Latest delivery row per reservation, for the status dots in the list.
 * Bounded to the most recent rows so it stays a single cheap query.
 */
export async function fetchLatestNotificationStatuses(
  limit = 400
): Promise<Record<string, BookingNotificationLog>> {
  const { data, error } = await supabase
    .from('booking_notification_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  const byReservation: Record<string, BookingNotificationLog> = {};
  for (const row of (data || []) as BookingNotificationLog[]) {
    if (row.reservation_id && !byReservation[row.reservation_id]) {
      byReservation[row.reservation_id] = row;
    }
  }
  return byReservation;
}

export interface ResendResult {
  status: 'sent' | 'failed' | 'skipped';
  detail: string;
  recipient: string | null;
}

/** Re-sends one booking email through the admin-only Edge Function. */
export async function resendBookingNotification(
  reservationId: string,
  kind: NotificationKind
): Promise<ResendResult> {
  const { data, error } = await supabase.functions.invoke('resend-booking-notification', {
    body: { reservationId, kind },
  });
  if (error) throw error;
  const result = data as { error?: string; status?: string; detail?: string; recipient?: string | null };
  if (result?.error) throw new Error(result.error);
  return {
    status: (result?.status as ResendResult['status']) ?? 'failed',
    detail: result?.detail ?? '',
    recipient: result?.recipient ?? null,
  };
}

// ============================================================
// Admin: Guests
// ============================================================
export async function fetchAllGuests(): Promise<Guest[]> {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Guest[];
}

export async function createGuest(input: Partial<Guest>): Promise<Guest> {
  const { data, error } = await supabase
    .from('guests')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as Guest;
}

export async function updateGuest(id: string, updates: Partial<Guest>): Promise<Guest> {
  const { data, error } = await supabase
    .from('guests')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Guest;
}

export async function deleteGuest(id: string): Promise<void> {
  const { error } = await supabase.from('guests').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// Admin: Availability Blocks
// ============================================================
export async function fetchAllAvailabilityBlocks(): Promise<AvailabilityBlock[]> {
  const { data, error } = await supabase
    .from('availability_blocks')
    .select('*, house:houses(*)')
    .order('start_date', { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as AvailabilityBlock[];
}

export async function createAvailabilityBlock(input: Partial<AvailabilityBlock>): Promise<AvailabilityBlock> {
  const { data, error } = await supabase
    .from('availability_blocks')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as AvailabilityBlock;
}

export async function updateAvailabilityBlock(id: string, updates: Partial<AvailabilityBlock>): Promise<AvailabilityBlock> {
  const { data, error } = await supabase
    .from('availability_blocks')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as AvailabilityBlock;
}

export async function deleteAvailabilityBlock(id: string): Promise<void> {
  const { error } = await supabase.from('availability_blocks').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// Admin: All Reviews
// ============================================================
export async function fetchAllReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Review[];
}

export async function createReview(input: Partial<Review>): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as Review;
}

export async function updateReview(id: string, updates: Partial<Review>): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Review;
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await supabase.from('reviews').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// Admin: Houses CRUD
// ============================================================
export async function updateHouse(id: string, updates: Partial<House>): Promise<House> {
  const { data, error } = await supabase
    .from('houses')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as House;
}

export async function createHouse(input: Partial<House> & { property_id: string; name: string; slug: string }): Promise<House> {
  const { data, error } = await supabase
    .from('houses')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as House;
}

export async function deleteHouse(id: string): Promise<void> {
  const { error } = await supabase.from('houses').delete().eq('id', id);
  if (error) throw error;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================================
// Admin: House images
// ============================================================
export async function createHouseImage(input: Partial<HouseImage>): Promise<HouseImage> {
  const { data, error } = await supabase
    .from('house_images')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as HouseImage;
}

export async function updateHouseImage(id: string, updates: Partial<HouseImage>): Promise<HouseImage> {
  const { data, error } = await supabase
    .from('house_images')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as HouseImage;
}

export async function deleteHouseImage(id: string): Promise<void> {
  const { error } = await supabase.from('house_images').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// Admin: Amenity library + house links
// ============================================================
export async function fetchAllAmenities(): Promise<Amenity[]> {
  const { data, error } = await supabase
    .from('amenities')
    .select('*')
    .order('category')
    .order('sort_order');
  if (error) throw error;
  return (data || []) as Amenity[];
}

export async function createAmenity(input: Partial<Amenity>): Promise<Amenity> {
  const { data, error } = await supabase
    .from('amenities')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data as Amenity;
}

export async function deleteAmenity(id: string): Promise<void> {
  const { error } = await supabase.from('amenities').delete().eq('id', id);
  if (error) throw error;
}

export async function linkAmenity(houseId: string, amenityId: string): Promise<void> {
  const { error } = await supabase
    .from('house_amenities')
    .insert({ house_id: houseId, amenity_id: amenityId });
  if (error) throw error;
}

export async function unlinkAmenity(houseId: string, amenityId: string): Promise<void> {
  const { error } = await supabase
    .from('house_amenities')
    .delete()
    .eq('house_id', houseId)
    .eq('amenity_id', amenityId);
  if (error) throw error;
}

// ============================================================
// Admin: Settings
// ============================================================
export async function updateSetting(key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from('property_settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key);
  if (error) throw error;
}

export async function createSetting(input: { key: string; value: string; category: string; description?: string | null }): Promise<PropertySetting> {
  const { data, error } = await supabase
    .from('property_settings')
    .insert({
      key: input.key.trim(),
      value: input.value,
      category: input.category,
      description: input.description ?? null,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as PropertySetting;
}

export async function deleteSetting(key: string): Promise<void> {
  const { error } = await supabase.from('property_settings').delete().eq('key', key);
  if (error) throw error;
}

// ============================================================
// Admin: conflict check (used by reservation create/edit)
// ============================================================
export async function findConflictingReservation(
  houseId: string,
  checkIn: string,
  checkOut: string,
  excludeReservationId?: string
): Promise<Reservation | null> {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, guest:guests(*)')
    .eq('house_id', houseId)
    .neq('status', 'CANCELLED')
    .lt('check_in', checkOut)
    .gt('check_out', checkIn);
  if (error) throw error;
  const rows = (data || []) as unknown as Reservation[];
  return rows.find((r) => r.id !== excludeReservationId) || null;
}

export async function findConflictingBlock(
  houseId: string,
  checkIn: string,
  checkOut: string,
  excludeBlockId?: string
): Promise<AvailabilityBlock | null> {
  const { data, error } = await supabase
    .from('availability_blocks')
    .select('*')
    .eq('house_id', houseId)
    .lt('start_date', checkOut)
    .gte('end_date', checkIn);
  if (error) throw error;
  const rows = (data || []) as AvailabilityBlock[];
  return rows.find((b) => b.id !== excludeBlockId) || null;
}
