import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Users, BedDouble, Bath, Sofa, ChefHat,
  Home, Calendar, ExternalLink, Check, ChevronLeft, ChevronRight, X, Star, MapPin,
} from 'lucide-react';
import { Reveal } from '@/components/Reveal';
import { fetchHouseWithRelations, fetchHouses, checkAvailability, createBooking, fetchPublishedReviews } from '@/services/dataService';
import { useBrand } from '@/contexts/BrandContext';
import type { House, HouseWithRelations } from '@/types';
import { formatPrice, calculateNights, formatDateISO, classNames, isPlaceholderUrl } from '@/lib/utils';
import { usePageMeta } from '@/hooks/usePageMeta';

export function HouseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand } = useBrand();
  const [house, setHouse] = useState<HouseWithRelations | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviewScore, setReviewScore] = useState<number | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [availability, setAvailability] = useState<{ available: boolean; reason?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [guestForm, setGuestForm] = useState({ name: '', email: '', phone: '', guests: 1, notes: '' });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [otherHouses, setOtherHouses] = useState<House[]>([]);

  // All visible houses — powers the switcher so every house stays reachable
  // from any detail page (visible even when landing on /the-house directly).
  useEffect(() => {
    fetchHouses()
      .then(setOtherHouses)
      .catch(() => setOtherHouses([]));
  }, []);

  const houseId = house?.id;

  useEffect(() => {
    if (!houseId) return;
    setReviewsLoading(true);
    setReviewsError(false);
    fetchPublishedReviews()
      .then((reviews) => {
        const relevant = reviews.filter((review) => !review.house_id || review.house_id === houseId);
        setReviewCount(relevant.length);
        setReviewScore(relevant.length
          ? relevant.reduce((sum, review) => sum + review.rating, 0) / relevant.length
          : null);
        setReviewsError(false);
      })
      .catch(() => {
        setReviewCount(0);
        setReviewScore(null);
        setReviewsError(true);
      })
      .finally(() => setReviewsLoading(false));
  }, [houseId]);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setHouse(null);
    setAvailability(null);
    setBookingError(null);
    setBookingSuccess(null);
    if (slug) {
      fetchHouseWithRelations(slug)
        .then((h) => {
          if (!h) setNotFound(true);
          else setHouse(h);
        })
        .catch(() => setNotFound(true))
        .finally(() => setLoading(false));
    } else {
      // No slug (/the-house): prefer ACTIVE, fall back to first visible house.
      fetchHouses()
        .then(async (houses) => {
          const preferred = houses.find((h) => h.status === 'ACTIVE') ?? houses[0];
          if (!preferred) {
            setNotFound(true);
            return;
          }
          const full = await fetchHouseWithRelations(preferred.slug);
          if (!full) setNotFound(true);
          else setHouse(full);
        })
        .catch(() => setNotFound(true))
        .finally(() => setLoading(false));
    }
  }, [slug]);

  usePageMeta({
    title: house ? `${house.name} — ${house.tagline || 'Bella Famiglia'}` : 'Bella Famiglia — Guest House in Musanze, Rwanda',
    description: house?.description ?? undefined,
    image: house?.images.find((img) => img.category === 'hero')?.url || house?.images[0]?.url,
  });

  const openGallery = (index: number) => {
    setGalleryIndex(index);
    setGalleryOpen(true);
  };

  const nextImage = () => {
    if (!house) return;
    setGalleryIndex((prev) => (prev + 1) % house.images.length);
  };

  const prevImage = () => {
    if (!house) return;
    setGalleryIndex((prev) => (prev - 1 + house.images.length) % house.images.length);
  };

  const handleCheckAvailability = async () => {
    if (!house || !checkIn || !checkOut) return;
    setChecking(true);
    setAvailability(null);
    setBookingError(null);
    setBookingSuccess(null);
    try {
      const result = await checkAvailability(house.id, checkIn, checkOut);
      setAvailability(result);
    } catch {
      setAvailability({ available: false, reason: 'Unable to check availability. Please try again or contact us directly.' });
    } finally {
      setChecking(false);
    }
  };

  const handleBookingRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!house || !checkIn || !checkOut) return;
    setBookingSubmitting(true);
    setBookingError(null);
    try {
      const result = await createBooking({
        houseId: house.id,
        checkIn,
        checkOut,
        numGuests: guestForm.guests,
        guestName: guestForm.name,
        guestEmail: guestForm.email,
        guestPhone: guestForm.phone || undefined,
        notes: guestForm.notes || undefined,
      });
      setBookingSuccess(result.message);
      setAvailability(null);
      setGuestForm({ name: '', email: '', phone: '', guests: 1, notes: '' });
    } catch (err) {
      setBookingError(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to submit your request. Please try again or contact us directly.'
      );
      // The dates may have just been taken — refresh availability quietly
      try {
        setAvailability(await checkAvailability(house.id, checkIn, checkOut));
      } catch {
        // keep the error message already shown
      }
    } finally {
      setBookingSubmitting(false);
    }
  };

  const nights = checkIn && checkOut ? calculateNights(checkIn, checkOut) : 0;

  if (loading) {
    return (
      <div className="pt-32 md:pt-40 container-editorial">
        <div className="aspect-[16/9] skeleton mb-12" />
        <div className="h-12 w-64 skeleton mb-6" />
        <div className="h-32 w-full max-w-xl skeleton" />
      </div>
    );
  }

  if (notFound || !house) {
    return (
      <div className="pt-40 md:pt-48 container-editorial text-center min-h-[60vh] flex flex-col items-center justify-center">
        <h1 className="text-display-md text-charcoal-900 font-display font-light mb-6">House not found</h1>
        <p className="text-charcoal-500 mb-8">The house you're looking for doesn't exist or has been removed.</p>
        <Link to="/the-house" className="btn-secondary">
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </div>
    );
  }

  const heroImg = house.images.find((img) => img.category === 'hero') || house.images[0];
  const isMaintenance = house.status === 'MAINTENANCE';
  const amenityCategories = house.amenities.reduce((acc, amenity) => {
    if (!acc[amenity.category]) acc[amenity.category] = [];
    acc[amenity.category].push(amenity);
    return acc;
  }, {} as Record<string, typeof house.amenities>);

  const categoryOrder = ['Comfort', 'Connectivity', 'Kitchen', 'Safety', 'Convenience', 'Outdoor'];
  const highlights = [
    'The entire place is yours',
    `${house.bedrooms} bedroom${house.bedrooms === 1 ? '' : 's'}`,
    brand.bedDescription,
    `${house.bathrooms} bathrooms`,
    brand.sizeLabel,
    ...house.amenities
      .filter((amenity) => /wifi|parking|balcony|garden view|terrace|kitchen/i.test(amenity.name))
      .map((amenity) => amenity.name),
  ].filter(Boolean);
  const faqs = [
    ['Do they serve breakfast?', brand.breakfastInfo],
    ['Is there an airport shuttle?', brand.airportShuttleInfo],
    ['Is there a restaurant?', brand.restaurantInfo],
    ['Can I park there?', 'Yes. Free private parking is available on site; a reservation is not needed.'],
    ['Is there a swimming pool or spa?', brand.poolSpaInfo],
    ['What is nearby?', brand.nearbyAttractions || brand.locationNeighborhood],
    ['What are the check-in and check-out times?', `Check-in: ${brand.checkInWindow}. Check-out: ${brand.checkOutWindow}. Please tell the property your arrival time in advance.`],
    ['Are there rooms with a private bathroom?', brand.bathroomInfo],
    ['Are there rooms with a balcony?', house.amenities.some((amenity) => /balcony/i.test(amenity.name))
      ? 'Yes. A balcony is listed among the property facilities.'
      : 'Please contact the host to confirm balcony availability.'],
  ].filter((faq): faq is [string, string] => Boolean(faq[1]));

  return (
    <div className="pt-32 md:pt-40">
      {/* Breadcrumb + house switcher */}
      <div className="container-editorial mb-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-charcoal-400 hover:text-charcoal-700 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        {otherHouses.length > 1 && (
          <nav aria-label="Houses" className="mt-5 flex flex-wrap gap-2">
            {otherHouses.map((h) => {
              const active = h.slug === (house?.slug ?? slug);
              return (
                <Link
                  key={h.id}
                  to={`/houses/${h.slug}`}
                  aria-current={active ? 'page' : undefined}
                  className={classNames(
                    'inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.15em] border transition-colors',
                    active
                      ? 'bg-charcoal-900 text-sand-50 border-charcoal-900'
                      : 'bg-white text-charcoal-600 border-sand-200 hover:border-charcoal-400 hover:text-charcoal-900',
                  )}
                >
                  {h.name}
                  {h.status === 'MAINTENANCE' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-400" aria-label="Under maintenance" />
                  )}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {/* Title */}
      <section className="container-editorial mb-12">
        <Reveal>
          <p className="label-eyebrow mb-4">{house.tagline}</p>
          <h1 className="text-display-lg text-charcoal-900 font-display font-light text-balance">{house.name}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-charcoal-500">
            <span className="inline-flex items-center gap-2"><MapPin size={15} />{brand.publicAddress}</span>
            {reviewsLoading ? (
              <span>Loading reviews…</span>
            ) : reviewsError ? (
              <span>Reviews are temporarily unavailable.</span>
            ) : reviewScore === null ? (
              <span>No review score yet · {reviewCount} reviews</span>
            ) : (
              <span className="inline-flex items-center gap-1.5"><Star size={15} className="fill-gold-400 text-gold-400" />{reviewScore.toFixed(1)} · {reviewCount} reviews</span>
            )}
            {brand.locationMapUrl.startsWith('https://') && (
              <a href={brand.locationMapUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-charcoal-900">Show on map</a>
            )}
          </div>
          {!reviewsLoading && !reviewsError && reviewCount === 0 && (
            <p className="mt-2 max-w-2xl text-sm text-charcoal-400">
              We need at least one published review before we can calculate a review score. If you stay and review Bella Famiglia, you can help future guests.
            </p>
          )}
          {isMaintenance && (
            <p className="mt-4 inline-flex items-center gap-2 bg-gold-100 text-gold-800 text-xs font-medium uppercase tracking-[0.2em] px-4 py-2">
              Under maintenance — booking paused
            </p>
          )}
        </Reveal>
      </section>

      {/* Hero image */}
      <Reveal className="mb-12">
        <div className="container-wide">
          <div
            className="image-zoom aspect-[16/10] lg:aspect-[21/9] cursor-pointer relative group"
            onClick={() => openGallery(0)}
          >
            <img src={heroImg?.url} alt={heroImg?.alt_text || house.name} className="h-full w-full object-cover" />
            <div className="absolute bottom-6 right-6 bg-charcoal-950/70 backdrop-blur-sm text-sand-50 px-4 py-2 text-xs uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              View Gallery
            </div>
          </div>
        </div>
      </Reveal>

      {/* Listing highlights */}
      <section className="container-editorial mb-16">
        <Reveal>
          <p className="label-eyebrow mb-5">Property highlights</p>
          <div className="flex flex-wrap gap-3">
            {highlights.map((highlight) => (
              <span key={highlight} className="border border-sand-200 bg-white px-4 py-3 text-sm text-charcoal-700">
                {highlight}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-charcoal-400">{brand.addressDisclosure}</p>
        </Reveal>
      </section>

      {/* Key info bar */}
      <section className="container-editorial mb-20">
        <Reveal>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-8 border-y border-sand-200 py-8">
            <div className="flex items-center gap-3">
              <Users size={20} className="text-charcoal-400" strokeWidth={1.5} />
              <div>
                <p className="text-xs uppercase tracking-wider text-charcoal-400">Guests</p>
                <p className="text-sm font-medium text-charcoal-900">{house.max_guests}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <BedDouble size={20} className="text-charcoal-400" strokeWidth={1.5} />
              <div>
                <p className="text-xs uppercase tracking-wider text-charcoal-400">Bedrooms</p>
                <p className="text-sm font-medium text-charcoal-900">{house.bedrooms}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Bath size={20} className="text-charcoal-400" strokeWidth={1.5} />
              <div>
                <p className="text-xs uppercase tracking-wider text-charcoal-400">Bathrooms</p>
                <p className="text-sm font-medium text-charcoal-900">{house.bathrooms}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Home size={20} className="text-charcoal-400" strokeWidth={1.5} />
              <div>
                <p className="text-xs uppercase tracking-wider text-charcoal-400">Type</p>
                <p className="text-sm font-medium text-charcoal-900">{house.property_type}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {brand.showPublicPrice ? (
                <>
                  <div className="text-charcoal-400">
                    <span className="text-lg font-display font-light">{formatPrice(house.base_price, house.currency)}</span>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-charcoal-400">From</p>
                    <p className="text-sm font-medium text-charcoal-900">/ night</p>
                  </div>
                </>
              ) : (
                <p className="text-sm font-medium text-charcoal-900">Price on request</p>
              )}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Description + Gallery grid */}
      <section className="container-editorial mb-24 md:mb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <Reveal className="lg:col-span-5">
            <p className="label-eyebrow mb-6">About this home</p>
            <p className="text-lg leading-relaxed text-charcoal-700 font-light mb-6">{house.description}</p>
            <div className="space-y-3 mt-8">
              {house.has_living_room && (
                <div className="flex items-center gap-3 text-sm text-charcoal-600">
                  <Sofa size={18} className="text-charcoal-400" strokeWidth={1.5} />
                  <span>Living room</span>
                </div>
              )}
              {house.has_kitchen && (
                <div className="flex items-center gap-3 text-sm text-charcoal-600">
                  <ChefHat size={18} className="text-charcoal-400" strokeWidth={1.5} />
                  <span>Kitchen</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm text-charcoal-600">
                <Home size={18} className="text-charcoal-400" strokeWidth={1.5} />
                <span>Two private entrances</span>
              </div>
            </div>
          </Reveal>

          <Reveal className="lg:col-span-7" delay={150}>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {house.images.filter((img) => img.category !== 'hero').slice(0, 4).map((img, i) => (
                <div
                  key={img.id}
                  className={classNames(
                    'image-zoom cursor-pointer relative group',
                    i === 0 ? 'col-span-2 aspect-[16/9]' : 'aspect-[4/3]'
                  )}
                  onClick={() => openGallery(house.images.findIndex((im) => im.id === img.id))}
                >
                  <img src={img.url} alt={img.alt_text || house.name} className="h-full w-full object-cover" />
                  <div className="absolute bottom-3 left-3 text-xs text-sand-50 bg-charcoal-950/50 px-2 py-1 backdrop-blur-sm">
                    {img.caption || img.category.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Amenities */}
      <section className="bg-sand-100 py-24 md:py-32 mb-24 md:mb-32">
        <div className="container-editorial">
          <Reveal className="mb-16">
            <p className="label-eyebrow mb-6">Amenities</p>
            <h2 className="text-display-md text-charcoal-900 font-display font-light text-balance">
              What's included.
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-16">
            {categoryOrder.map((category) => {
              const items = amenityCategories[category];
              if (!items || items.length === 0) return null;
              return (
                <Reveal key={category}>
                  <div>
                    <h3 className="text-sm font-medium uppercase tracking-wider text-charcoal-400 mb-6">{category}</h3>
                    <ul className="space-y-4">
                      {items.map((amenity) => (
                        <li key={amenity.id} className="flex items-center gap-3">
                          <Check size={16} className="text-sage-600 flex-shrink-0" />
                          <span className="text-sm text-charcoal-700 font-light">{amenity.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Guest questions */}
      <section className="container-editorial mb-24 md:mb-32">
        <Reveal className="mb-10">
          <p className="label-eyebrow mb-5">Good to know</p>
          <h2 className="text-display-md text-charcoal-900 font-display font-light">Frequently asked questions.</h2>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
          {faqs.map(([question, answer]) => (
            <Reveal key={question}>
              <div className="border-t border-sand-200 py-6">
                <h3 className="text-base font-medium text-charcoal-900 mb-2">{question}</h3>
                <p className="text-sm leading-relaxed text-charcoal-600 font-light whitespace-pre-line">{answer}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Availability checker */}
      <section className="container-editorial mb-24 md:mb-32">
        <Reveal>
          <div className="bg-charcoal-950 text-sand-50 p-8 md:p-12 lg:p-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-5">
                <p className="label-eyebrow-light mb-4">Check Availability</p>
                <h2 className="text-display-sm font-display font-light mb-4">
                  {isMaintenance ? 'Temporarily unavailable' : 'Is it free for your dates?'}
                </h2>
                <p className="text-sm text-sand-400 font-light leading-relaxed">
                  {isMaintenance
                    ? `${house.name} is currently under maintenance, so new bookings are paused. Browse the rest of the site, or send us a message — we'll let you know the moment it's ready again.`
                    : `Select your check-in and check-out dates to see if ${house.name} is available, then request to book directly — we confirm within 24 hours.${isPlaceholderUrl(house.airbnb_listing_url) ? '' : ' You can also book instantly on Airbnb.'}`}
                </p>
              </div>

              <div className="lg:col-span-7">{!isMaintenance && (<>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-sand-400 mb-2">Check-in</label>
                    <input
                      type="date"
                      value={checkIn}
                      min={formatDateISO(new Date())}
                      onChange={(e) => { setCheckIn(e.target.value); setAvailability(null); }}
                      className="w-full bg-charcoal-900 border border-sand-100/20 text-sand-50 px-4 py-3 text-sm focus:outline-none focus:border-sand-100/50 transition-colors [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-sand-400 mb-2">Check-out</label>
                    <input
                      type="date"
                      value={checkOut}
                      min={checkIn || formatDateISO(new Date())}
                      onChange={(e) => { setCheckOut(e.target.value); setAvailability(null); }}
                      className="w-full bg-charcoal-900 border border-sand-100/20 text-sand-50 px-4 py-3 text-sm focus:outline-none focus:border-sand-100/50 transition-colors [color-scheme:dark]"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCheckAvailability}
                  disabled={!checkIn || !checkOut || checkOut <= checkIn || checking}
                  className="w-full bg-sand-50 text-charcoal-900 text-sm font-medium uppercase tracking-[0.15em] py-4 transition-all duration-500 ease-out-expo hover:bg-sand-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {checking ? 'Checking...' : 'Check Availability'}
                </button>

                {availability && (
                  <div className={classNames(
                    'mt-4 p-4 text-sm',
                    availability.available ? 'bg-sage-900/40 text-sage-200' : 'bg-clay-900/40 text-clay-200'
                  )}>
                    {availability.available ? (
                      <div>
                        <p className="font-medium mb-2">{house.name} is available for your dates.</p>
                        {nights > 0 && (
                          <p className="text-xs text-sand-400 mb-3">
                            {nights} night{nights > 1 ? 's' : ''}
                            {brand.showPublicPrice ? ` · approx. ${formatPrice(house.base_price * nights, house.currency)}` : ''}
                          </p>
                        )}
                        {!isPlaceholderUrl(house.airbnb_listing_url) && (
                          <a
                            href={house.airbnb_listing_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-sand-50 link-underline"
                          >
                            Book on Airbnb <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    ) : (
                      <p>{availability.reason}</p>
                    )}
                  </div>
                )}

                {bookingError && !bookingSuccess && (
                  <div className="mt-4 p-4 text-sm bg-clay-900/40 text-clay-200">{bookingError}</div>
                )}

                {bookingSuccess && (
                  <div className="mt-4 p-4 text-sm bg-sage-900/40 text-sage-200">
                    <p className="font-medium mb-1">{bookingSuccess}</p>
                    <p className="text-xs text-sand-400">
                      Keep an eye on your email — we'll confirm your stay within 24 hours.
                    </p>
                    <button
                      type="button"
                      onClick={() => setBookingSuccess(null)}
                      className="mt-3 text-xs uppercase tracking-wider text-sand-50 link-underline"
                    >
                      Request different dates
                    </button>
                  </div>
                )}

                {availability?.available && !bookingSuccess && (
                  <form onSubmit={handleBookingRequest} id="booking-form" className="mt-4 border-t border-sand-100/15 pt-6 space-y-4">
                    <p className="text-xs uppercase tracking-wider text-sand-400">
                      Request to book — no payment needed now
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="booking-name" className="block text-xs uppercase tracking-wider text-sand-400 mb-2">Full name</label>
                        <input
                          id="booking-name"
                          type="text"
                          required
                          minLength={2}
                          value={guestForm.name}
                          onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })}
                          className="w-full bg-charcoal-900 border border-sand-100/20 text-sand-50 px-4 py-3 text-sm focus:outline-none focus:border-sand-100/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label htmlFor="booking-email" className="block text-xs uppercase tracking-wider text-sand-400 mb-2">Email</label>
                        <input
                          id="booking-email"
                          type="email"
                          required
                          value={guestForm.email}
                          onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
                          className="w-full bg-charcoal-900 border border-sand-100/20 text-sand-50 px-4 py-3 text-sm focus:outline-none focus:border-sand-100/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label htmlFor="booking-phone" className="block text-xs uppercase tracking-wider text-sand-400 mb-2">Phone (optional)</label>
                        <input
                          id="booking-phone"
                          type="tel"
                          value={guestForm.phone}
                          onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })}
                          className="w-full bg-charcoal-900 border border-sand-100/20 text-sand-50 px-4 py-3 text-sm focus:outline-none focus:border-sand-100/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label htmlFor="booking-guests" className="block text-xs uppercase tracking-wider text-sand-400 mb-2">Guests</label>
                        <input
                          id="booking-guests"
                          type="number"
                          min={1}
                          max={house.max_guests}
                          required
                          value={guestForm.guests}
                          onChange={(e) => setGuestForm({ ...guestForm, guests: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-full bg-charcoal-900 border border-sand-100/20 text-sand-50 px-4 py-3 text-sm focus:outline-none focus:border-sand-100/50 transition-colors [color-scheme:dark]"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="booking-notes" className="block text-xs uppercase tracking-wider text-sand-400 mb-2">Notes (optional)</label>
                      <textarea
                        id="booking-notes"
                        rows={2}
                        value={guestForm.notes}
                        onChange={(e) => setGuestForm({ ...guestForm, notes: e.target.value })}
                        placeholder="Approximate arrival time, special requests…"
                        className="w-full bg-charcoal-900 border border-sand-100/20 text-sand-50 px-4 py-3 text-sm focus:outline-none focus:border-sand-100/50 transition-colors"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={bookingSubmitting}
                      className="w-full bg-sand-50 text-charcoal-900 text-sm font-medium uppercase tracking-[0.15em] py-4 transition-all duration-500 ease-out-expo hover:bg-sand-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {bookingSubmitting
                        ? 'Sending request...'
                        : nights > 0
                          ? `Request to Book · ${nights} night${nights > 1 ? 's' : ''}${brand.showPublicPrice ? ` · ${formatPrice(house.base_price * nights, house.currency)}` : ''}`
                          : 'Request to Book'}
                    </button>
                  </form>
                )}
                </>
              )}
              {isMaintenance && (
                <div className="p-6 bg-charcoal-900/60 border border-sand-100/10 text-sm text-sand-300 font-light leading-relaxed">
                  New bookings are paused while we prepare {house.name}. Send us a message on WhatsApp or through the{' '}
                  <Link to="/contact" className="text-sand-50 underline underline-offset-4 hover:text-white">contact page</Link>{' '}
                  and we'll notify you the moment it reopens.
                </div>
              )}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Booking CTA */}
      <section className="container-editorial mb-24 md:mb-32 text-center">
        <Reveal>
          <h2 className="text-display-md text-charcoal-900 font-display font-light text-balance mb-8">
            {isMaintenance ? `Interested in ${house.name}?` : `Ready to book ${house.name}?`}
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!isPlaceholderUrl(house.airbnb_listing_url) && !isMaintenance && (
              <a
                href={house.airbnb_listing_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Book on Airbnb
                <ExternalLink size={16} />
              </a>
            )}
            <Link to="/contact" className="btn-secondary">
              <Calendar size={16} />
              Ask a Question
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Gallery lightbox */}
      {galleryOpen && house.images.length > 0 && (
        <div
          className="fixed inset-0 z-[100] bg-charcoal-950/95 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setGalleryOpen(false)}
        >
          <button
            className="absolute top-6 right-6 text-sand-50 hover:text-sand-300 transition-colors"
            onClick={() => setGalleryOpen(false)}
            aria-label="Close gallery"
          >
            <X size={28} />
          </button>
          <button
            className="absolute left-6 text-sand-50 hover:text-sand-300 transition-colors"
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
            aria-label="Previous image"
          >
            <ChevronLeft size={40} />
          </button>
          <img
            src={house.images[galleryIndex]?.url}
            alt={house.images[galleryIndex]?.alt_text || house.name}
            className="max-h-[85vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute right-6 text-sand-50 hover:text-sand-300 transition-colors"
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
            aria-label="Next image"
          >
            <ChevronRight size={40} />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sand-300 text-sm">
            {galleryIndex + 1} / {house.images.length}
          </div>
        </div>
      )}
    </div>
  );
}
