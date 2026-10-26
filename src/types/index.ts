export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'BLOCKED';
export type BookingSource = 'AIRBNB' | 'DIRECT' | 'MANUAL' | 'BLOCKED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'REFUNDED' | 'N/A';
export type AmenityCategory = 'Comfort' | 'Connectivity' | 'Kitchen' | 'Safety' | 'Outdoor' | 'Convenience';
export type ImageCategory = 'hero' | 'exterior' | 'bedroom' | 'living_room' | 'kitchen' | 'bathroom' | 'entrance' | 'garden' | 'detail' | 'other';
export type HouseStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export type PriceRuleType = 'WEEKEND' | 'SEASONAL' | 'SPECIAL' | 'LONG_STAY';
export type CommunicationPreference = 'WHATSAPP' | 'EMAIL' | 'PHONE' | 'SMS';

export interface Property {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface House {
  id: string;
  property_id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  has_living_room: boolean;
  has_kitchen: boolean;
  property_type: string;
  base_price: number;
  currency: string;
  airbnb_listing_url: string | null;
  airbnb_listing_id: string | null;
  status: HouseStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Amenity {
  id: string;
  name: string;
  category: AmenityCategory;
  icon_name: string;
  sort_order: number;
}

export interface HouseAmenity {
  id: string;
  house_id: string;
  amenity_id: string;
  amenity?: Amenity;
}

export interface HouseImage {
  id: string;
  house_id: string;
  url: string;
  alt_text: string | null;
  caption: string | null;
  category: ImageCategory;
  sort_order: number;
  created_at: string;
}

export interface Guest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  preferred_communication: CommunicationPreference;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  house_id: string;
  guest_id: string | null;
  check_in: string;
  check_out: string;
  num_guests: number;
  status: ReservationStatus;
  source: BookingSource;
  external_reference: string | null;
  total_amount: number | null;
  currency: string;
  payment_status: PaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  house?: House;
  guest?: Guest | null;
}

export interface AvailabilityBlock {
  id: string;
  house_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  notes: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  house_id: string | null;
  guest_name: string;
  guest_display_name: string | null;
  rating: number;
  content: string;
  stay_date: string | null;
  source: BookingSource | 'GOOGLE' | 'OTHER';
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
}

export interface PropertySetting {
  id: string;
  key: string;
  value: string;
  category: string;
  description: string | null;
  updated_at: string;
}

export interface PrivatePropertyDetails {
  street_address: string;
  contact_phone: string;
}

export interface PriceRule {
  id: string;
  house_id: string | null;
  rule_type: PriceRuleType;
  start_date: string | null;
  end_date: string | null;
  price_override: number | null;
  adjustment_type: 'FIXED' | 'PERCENTAGE';
  adjustment_value: number | null;
  min_nights: number | null;
  label: string | null;
  is_active: boolean;
  created_at: string;
}

export type NotificationKind = 'host_alert' | 'guest_acknowledgement' | 'guest_confirmation';
export type NotificationEvent = 'INSERT' | 'UPDATE' | 'MANUAL';
export type NotificationDeliveryStatus = 'sent' | 'failed' | 'skipped';

/** One row of booking-email delivery history (written by the Edge Functions). */
export interface BookingNotificationLog {
  id: string;
  reservation_id: string | null;
  event: NotificationEvent;
  kind: NotificationKind;
  recipient: string | null;
  status: NotificationDeliveryStatus;
  detail: string | null;
  created_at: string;
}

export interface HouseWithRelations extends House {
  images: HouseImage[];
  amenities: Amenity[];
}

export interface BrandConfig {
  name: string;
  tagline: string;
  description: string;
  whatsappNumber: string;
  whatsappEnabled: boolean;
  contactEmail: string;
  contactPhone: string;
  hostName: string;
  airbnbProfileUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: string;
  houseRules: string;
  locationNeighborhood: string;
  locationAirportDistance: string;
  locationCityCenterDistance: string;
  publicAddress: string;
  addressDisclosure: string;
  locationMapUrl: string;
  showPublicPrice: boolean;
  sizeLabel: string;
  bedDescription: string;
  checkInWindow: string;
  checkOutWindow: string;
  childrenPolicy: string;
  extraBedsPolicy: string;
  paymentPolicy: string;
  smokingPolicy: string;
  petsPolicy: string;
  ageRestriction: string;
  spokenLanguages: string;
  breakfastInfo: string;
  airportShuttleInfo: string;
  restaurantInfo: string;
  poolSpaInfo: string;
  bathroomInfo: string;
  nearbyAttractions: string;
  announcement: string;
}
