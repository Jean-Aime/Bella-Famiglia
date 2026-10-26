import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowDown, Star, MapPin, Quote } from 'lucide-react';
import { Reveal } from '@/components/Reveal';
import { useBrand } from '@/contexts/BrandContext';
import { fetchAllHousesWithRelations, fetchFeaturedReviews } from '@/services/dataService';
import { usePageMeta } from '@/hooks/usePageMeta';
import type { HouseWithRelations, Review } from '@/types';
import { formatPrice, classNames } from '@/lib/utils';

const heroImages = [
  'https://images.pexels.com/photos/8134821/pexels-photo-8134821.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/6238683/pexels-photo-6238683.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/7031604/pexels-photo-7031604.jpeg?auto=compress&cs=tinysrgb&w=1920',
];

export function HomePage() {
  const { brand } = useBrand();
  const [houses, setHouses] = useState<HouseWithRelations[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  usePageMeta({
    title: `${brand.name} — ${brand.tagline || 'Guest House in Musanze'}`,
    description:
      brand.description ||
      'A private guest house in Musanze with two independent entrances, volcano views and free parking. Book direct or check availability online.',
    image: heroImages[0],
  });

  useEffect(() => {
    Promise.all([fetchAllHousesWithRelations(), fetchFeaturedReviews(4)])
      .then(([h, r]) => {
        setHouses(h);
        setReviews(r);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Visible houses (ACTIVE + MAINTENANCE) — INACTIVE is filtered by the service.
  const visibleHouses = houses;

  return (
    <div className="overflow-hidden">
      {/* ===== HERO ===== */}
      <section className="relative h-screen min-h-[700px] w-full overflow-hidden bg-charcoal-950">
        {heroImages.map((img, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-[2s] ease-out-expo"
            style={{ opacity: i === heroIndex ? 1 : 0 }}
          >
            <img
              src={img}
              alt="Bella Famiglia property"
              className="h-full w-full object-cover"
              style={{
                transform: i === heroIndex ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform 8s ease-out',
              }}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal-950/40 via-charcoal-950/20 to-charcoal-950/70" />

        <div className="relative h-full flex flex-col">
          <div className="flex-1 flex items-end">
            <div className="container-editorial w-full pb-24 md:pb-32">
              <div className="max-w-3xl">
                <p className="label-eyebrow-light mb-6 animate-fade-in-down" style={{ animationDelay: '300ms' }}>
                  {brand.tagline}
                </p>
                <h1
                  className="text-display-xl text-sand-50 font-display font-light text-balance animate-fade-in-up"
                  style={{ animationDelay: '500ms', opacity: 0 }}
                >
                  A private place to stay.
                  <br />
                  <span className="italic font-light text-sand-200">Designed around your comfort.</span>
                </h1>
                <div className="mt-10 flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: '800ms', opacity: 0 }}>
                  <Link
                    to="/the-house"
                    className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-sand-50 text-charcoal-900 text-sm font-medium uppercase tracking-[0.15em] transition-all duration-500 ease-out-expo hover:bg-sand-200 hover:gap-5"
                  >
                    Explore the House
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    to="/contact"
                    className="inline-flex items-center justify-center gap-3 px-8 py-4 border border-sand-100/40 text-sand-50 text-sm font-medium uppercase tracking-[0.15em] transition-all duration-500 ease-out-expo hover:bg-sand-50/10 hover:border-sand-100"
                  >
                    Check Availability
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute top-1/2 right-6 md:right-10 -translate-y-1/2 hidden md:block">
            <div className="flex flex-col items-center gap-3 animate-fade-in" style={{ animationDelay: '1200ms', opacity: 0 }}>
              <div className="w-px h-20 bg-sand-100/30" />
              <MapPin size={16} className="text-sand-200/70" />
              <span className="text-xs uppercase tracking-[0.3em] text-sand-200/70 font-light" style={{ writingMode: 'vertical-rl' }}>
                Musanze, Rwanda
              </span>
              <div className="w-px h-20 bg-sand-100/30" />
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.3em] text-sand-200/50 font-light">Scroll</span>
            <ArrowDown size={14} className="text-sand-200/50 animate-scroll-hint" />
          </div>
        </div>
      </section>

      {/* ===== PROPERTY INTRODUCTION ===== */}
      <section className="py-24 md:py-40 bg-sand-50">
        <div className="container-editorial">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            <Reveal className="lg:col-span-5" delay={0}>
              <p className="label-eyebrow mb-8">The Property</p>
              <h2 className="text-display-md text-charcoal-900 font-display font-light leading-tight text-balance">
                One house.
                <br />
                Two private entrances.
              </h2>
              <p className="mt-8 text-lg leading-relaxed text-charcoal-600 font-light max-w-md">
                A fully furnished guest house at the edge of Musanze town, about 2.5 km from the centre. Two independent gates give you flexibility — arrive through one, keep the other private, or use both for convenience.
              </p>
              <p className="mt-4 text-base leading-relaxed text-charcoal-500 font-light max-w-md">
                Built for short stays, longer stays, business trips and weekends away — without the feeling of being somewhere temporary.
              </p>
              <Link
                to="/property"
                className="mt-10 inline-flex items-center gap-3 text-sm font-medium uppercase tracking-[0.15em] text-charcoal-900 link-underline"
              >
                Read the full story
                <ArrowRight size={16} />
              </Link>
            </Reveal>

            <Reveal className="lg:col-span-7" delay={200}>
              <div className="relative">
                <div className="image-zoom aspect-[4/5] lg:aspect-[5/6]">
                  <img
                    src="https://images.pexels.com/photos/6238683/pexels-photo-6238683.jpeg?auto=compress&cs=tinysrgb&w=1200"
                    alt="Interior of the Bella Famiglia home"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-8 -left-8 hidden md:block bg-sand-50 p-8 max-w-xs">
                  <p className="font-display text-5xl font-light text-charcoal-900">2</p>
                  <p className="mt-2 text-sm text-charcoal-500 leading-relaxed">
                    Private entrances to a single furnished home
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== HOUSE SHOWCASE ===== */}
      <section className="py-24 md:py-40 bg-charcoal-950 text-sand-50">
        <div className="container-editorial">
          <Reveal className="mb-20 md:mb-28">
            <p className="label-eyebrow-light mb-6">{visibleHouses.length > 1 ? 'The Houses' : 'The House'}</p>
            <h2 className="text-display-md font-display font-light text-balance max-w-2xl">
              A home designed for comfort, not just a place to sleep.
            </h2>
          </Reveal>

          {loading ? (
            <div className="aspect-[4/5] max-w-2xl skeleton" />
          ) : (
            visibleHouses.map((h, i) => {
              const heroUrl = h.images.find((img) => img.category === 'hero')?.url || h.images[0]?.url;
              return (
                <Reveal key={h.id} delay={i * 150} className={i > 0 ? 'mt-20 md:mt-32' : ''}>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
                    <div className={classNames('lg:col-span-7', i % 2 === 1 && 'lg:order-2')}>
                      <Link to={`/houses/${h.slug}`} className="block image-zoom aspect-[4/3] lg:aspect-[5/4] relative group bg-charcoal-900">
                        {heroUrl && (
                          <img
                            src={heroUrl}
                            alt={h.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/50 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-700" />
                        <div className="absolute bottom-6 left-6 flex items-center gap-3 text-sand-50">
                          <span className="text-xs uppercase tracking-[0.2em] font-light opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:translate-x-0 -translate-x-4">
                            View the House
                          </span>
                          <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:translate-x-0 -translate-x-4" />
                        </div>
                      </Link>
                    </div>

                    <div className={classNames('lg:col-span-5', i % 2 === 1 && 'lg:order-1')}>
                      <p className="label-eyebrow-light mb-4">{h.tagline}</p>
                      <div className="flex flex-wrap items-center gap-3 mb-6">
                        <h3 className="text-display-sm font-display font-light">{h.name}</h3>
                        {h.status === 'MAINTENANCE' && (
                          <span className="text-[10px] uppercase tracking-[0.2em] bg-gold-100 text-gold-800 px-2.5 py-1 shrink-0">
                            Under maintenance
                          </span>
                        )}
                      </div>
                      <p className="text-base leading-relaxed text-sand-300 font-light mb-8 max-w-md">
                        {h.description}
                      </p>

                      <div className="grid grid-cols-2 gap-y-5 gap-x-8 mb-8">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-sand-400 mb-1">Sleeps</p>
                          <p className="text-lg font-display font-light">{h.max_guests} guests</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-sand-400 mb-1">Bedrooms</p>
                          <p className="text-lg font-display font-light">{h.bedrooms}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-sand-400 mb-1">Bathrooms</p>
                          <p className="text-lg font-display font-light">{h.bathrooms}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-sand-400 mb-1">{brand.showPublicPrice ? 'From' : 'Rates'}</p>
                          <p className="text-lg font-display font-light">
                            {brand.showPublicPrice
                              ? <>{formatPrice(h.base_price, h.currency)}<span className="text-sm text-sand-400"> /night</span></>
                              : 'On request'}
                          </p>
                        </div>
                      </div>

                      <Link
                        to={`/houses/${h.slug}`}
                        className="inline-flex items-center gap-3 text-sm font-medium uppercase tracking-[0.15em] text-sand-50 link-underline"
                      >
                        Explore the House
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </Reveal>
              );
            })
          )}
        </div>
      </section>

      {/* ===== EXPERIENCE SECTION ===== */}
      <section className="py-24 md:py-40 bg-sand-100 relative overflow-hidden">
        <div className="container-editorial">
          <Reveal className="max-w-3xl mb-16 md:mb-24">
            <p className="label-eyebrow mb-6">The Experience</p>
            <h2 className="text-display-md text-charcoal-900 font-display font-light text-balance">
              Everything you need.
              <br />
              <span className="italic text-charcoal-400">Nothing you don't.</span>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
            {[
              {
                title: 'Privacy',
                body: 'Two private entrances, your own space, your own quiet. No shared corridors, no front desk queues — just doors that belong to you during your stay.',
              },
              {
                title: 'Comfort',
                body: 'Real beds with fresh linens. Sofas you actually want to sit on. Lighting that feels considered. A kitchen that works. The details that make a place feel like home.',
              },
              {
                title: 'Simplicity',
                body: 'Check in, settle in, check out. No friction, no complexity. If you need something, we are one message away on WhatsApp.',
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 150}>
                <div className="border-t border-charcoal-200 pt-6">
                  <h3 className="text-xl font-display font-normal text-charcoal-900 mb-4">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-charcoal-600 font-light">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={300} className="mt-16">
            <Link
              to="/experience"
              className="inline-flex items-center gap-3 text-sm font-medium uppercase tracking-[0.15em] text-charcoal-900 link-underline"
            >
              More about the experience
              <ArrowRight size={16} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ===== REVIEWS ===== */}
      {reviews.length > 0 && (
        <section className="py-24 md:py-40 bg-sand-50">
          <div className="container-editorial">
            <Reveal className="text-center mb-16 md:mb-24">
              <p className="label-eyebrow mb-6">Guest Voices</p>
              <h2 className="text-display-md text-charcoal-900 font-display font-light text-balance">
                What guests remember.
              </h2>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
              {reviews.map((review, i) => (
                <Reveal key={review.id} delay={i * 100}>
                  <figure className="bg-white p-8 md:p-10 border border-sand-200 h-full flex flex-col">
                    <Quote size={28} className="text-sand-300 mb-6" />
                    <blockquote className="text-base md:text-lg leading-relaxed text-charcoal-700 font-light italic flex-1">
                      "{review.content}"
                    </blockquote>
                    <figcaption className="mt-8 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-charcoal-900">
                          {review.guest_display_name || review.guest_name}
                        </p>
                        <p className="text-xs text-charcoal-400 mt-1">
                          {review.source} {review.stay_date ? `· ${new Date(review.stay_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: review.rating }).map((_, j) => (
                          <Star key={j} size={14} className="fill-gold-400 text-gold-400" />
                        ))}
                      </div>
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== LOCATION PREVIEW ===== */}
      <section className="relative py-24 md:py-40 bg-charcoal-900 text-sand-50 overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(https://images.pexels.com/photos/36470605/pexels-photo-36470605.jpeg?auto=compress&cs=tinysrgb&w=1920)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal-950 via-charcoal-950/80 to-transparent" />

        <div className="container-editorial relative">
          <div className="max-w-2xl">
            <Reveal>
              <p className="label-eyebrow-light mb-6">The Location</p>
              <h2 className="text-display-md font-display font-light text-balance mb-8">
                Quiet, green, and well connected.
              </h2>
              <p className="text-lg leading-relaxed text-sand-300 font-light mb-4">
                {brand.locationNeighborhood || 'A quiet spot at the edge of Musanze town.'}
              </p>
              <p className="text-base leading-relaxed text-sand-400 font-light mb-10">
                {brand.locationAirportDistance}. {brand.locationCityCenterDistance}. Close to restaurants, cafés, the village market and Volcanoes National Park — without being in the middle of them.
              </p>
              <Link
                to="/location"
                className="inline-flex items-center gap-3 px-8 py-4 border border-sand-100/30 text-sand-50 text-sm font-medium uppercase tracking-[0.15em] transition-all duration-500 ease-out-expo hover:bg-sand-50 hover:text-charcoal-900 hover:border-sand-50"
              >
                Explore the area
                <ArrowRight size={16} />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== CTA / CONTACT ===== */}
      <section className="py-24 md:py-40 bg-sand-50">
        <div className="container-editorial text-center">
          <Reveal>
            <p className="label-eyebrow mb-6">Ready to stay?</p>
            <h2 className="text-display-lg text-charcoal-900 font-display font-light text-balance mb-10">
              Your private place in Musanze
              <br />
              <span className="italic text-charcoal-400">is waiting.</span>
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/the-house" className="btn-primary">
                View the House & Availability
                <ArrowRight size={16} />
              </Link>
              <Link to="/contact" className="btn-secondary">
                Contact the Host
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
