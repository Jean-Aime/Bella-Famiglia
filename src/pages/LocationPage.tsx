import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Plane, Building2, Utensils, ShoppingBag, Train } from 'lucide-react';
import { Reveal } from '@/components/Reveal';
import { useBrand } from '@/contexts/BrandContext';

export function LocationPage() {
  const { brand } = useBrand();

  const nearby = [
    { icon: Plane, title: 'Closest airports', distance: brand.locationAirportDistance || 'Kisoro Airport 37 km · Goma International Airport 65 km', body: 'Distances are approximate. Please contact the host if you need help planning transport.' },
    { icon: Building2, title: 'Musanze Town Centre', distance: brand.locationCityCenterDistance || '2.5 km from Musanze (Ruhengeri) town centre', body: 'Shops, banks, the village market and everyday conveniences — close at hand but not on your doorstep.' },
    { icon: Utensils, title: 'Restaurants & Cafés', distance: '2.5 - 2.6 km', body: 'Bar Sharama and Auberge Ikaze Bar are about 2.5 km away, Ibisumizi Resto-Bar 2.6 km, with more cafés and restaurants in town.' },
    { icon: ShoppingBag, title: 'Shopping & Market', distance: 'About 10 minutes', body: 'The village market, supermarkets and small boutiques within a short drive. Everything you might need during your stay.' },
    { icon: Train, title: 'Public Transport', distance: 'Main road nearby', body: 'Motorcycle taxis (boda-boda) and car taxis are readily available along the main road into town.' },
  ];

  return (
    <div className="pt-32 md:pt-40">
      {/* Hero */}
      <section className="container-editorial mb-20 md:mb-28">
        <Reveal>
          <p className="label-eyebrow mb-6">The Location</p>
          <h1 className="text-display-lg text-charcoal-900 font-display font-light text-balance max-w-3xl">
            Quiet, green, and
            <span className="italic text-charcoal-400"> well connected.</span>
          </h1>
          <p className="mt-8 text-lg leading-relaxed text-charcoal-600 font-light max-w-xl">
            {brand.locationNeighborhood || 'A quiet spot at the edge of Musanze town.'}
          </p>
        </Reveal>
      </section>

      {/* Map image */}
      <Reveal className="mb-24 md:mb-32">
        <div className="container-wide">
          <div className="relative aspect-[16/9] lg:aspect-[21/9] overflow-hidden">
            <img
              src="https://images.pexels.com/photos/36470605/pexels-photo-36470605.jpeg?auto=compress&cs=tinysrgb&w=1920"
              alt="Aerial view of the Musanze area"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/60 to-transparent" />
            <div className="absolute bottom-8 left-8 md:left-16 text-sand-50">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={18} className="text-sand-300" />
                <span className="text-xs uppercase tracking-[0.2em] text-sand-300">Approximate Area</span>
              </div>
              <p className="font-display text-2xl font-light">Musanze, Rwanda</p>
              <p className="text-sm text-sand-300 mt-1">{brand.addressDisclosure}</p>
              {brand.locationMapUrl.startsWith('https://') && (
                <a href={brand.locationMapUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm underline underline-offset-4 hover:text-white">
                  Show approximate map <MapPin size={14} />
                </a>
              )}
            </div>
          </div>
        </div>
      </Reveal>

      {/* Distances */}
      <section className="container-editorial mb-24 md:mb-32">
        <Reveal className="mb-16">
          <h2 className="text-display-sm text-charcoal-900 font-display font-light">Getting around.</h2>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {nearby.map((item, i) => (
            <Reveal key={item.title} delay={i * 100}>
              <div className="border-t border-sand-200 pt-6">
                <item.icon size={22} className="text-charcoal-400 mb-4" strokeWidth={1.5} />
                <h3 className="text-base font-medium text-charcoal-900 mb-2">{item.title}</h3>
                <p className="text-xs uppercase tracking-wider text-sage-600 mb-3">{item.distance}</p>
                <p className="text-sm leading-relaxed text-charcoal-600 font-light">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {brand.nearbyAttractions && (
        <section className="container-editorial mb-24 md:mb-32">
          <Reveal>
            <p className="label-eyebrow mb-5">Nearby</p>
            <h2 className="text-display-sm text-charcoal-900 font-display font-light mb-6">Places around Bella Famiglia.</h2>
            <p className="max-w-3xl whitespace-pre-line text-base leading-relaxed text-charcoal-600 font-light">{brand.nearbyAttractions}</p>
          </Reveal>
        </section>
      )}

      {/* Musanze section */}
      <section className="bg-charcoal-950 text-sand-50 py-24 md:py-32">
        <div className="container-editorial">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <Reveal className="lg:col-span-5">
              <p className="label-eyebrow-light mb-6">About Musanze</p>
              <h2 className="text-display-md font-display font-light text-balance mb-6">
                A green town at the foot of
                <span className="italic text-sand-400"> the Virunga volcanoes.</span>
              </h2>
              <p className="text-base leading-relaxed text-sand-400 font-light mb-4">
                Musanze (formerly Ruhengeri) sits in a valley surrounded by hills and farmland, known for its cool mountain air, fresh evenings and relaxed pace. Volcanoes National Park is just 3.7 km away, and the famous Musanze caves are close by.
              </p>
              <p className="text-base leading-relaxed text-sand-400 font-light mb-8">
                The village market, INES Ruhengeri, and local cafés and bars are all within reach, and everything is walkable or a short taxi ride away. Gorilla trekking, cave visits and volcano hikes start almost at your doorstep.
              </p>
              <Link to="/the-house" className="inline-flex items-center gap-3 text-sm font-medium uppercase tracking-[0.15em] text-sand-50 link-underline">
                Plan your stay
                <ArrowRight size={16} />
              </Link>
            </Reveal>
            <Reveal className="lg:col-span-7" delay={150}>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="aspect-[3/4] image-zoom">
                  <img src="https://images.pexels.com/photos/31464449/pexels-photo-31464449.jpeg?auto=compress&cs=tinysrgb&w=800" alt="Musanze town" className="h-full w-full object-cover" />
                </div>
                <div className="aspect-[3/4] image-zoom mt-12">
                  <img src="https://images.pexels.com/photos/36470601/pexels-photo-36470601.jpeg?auto=compress&cs=tinysrgb&w=800" alt="Green hills near Musanze" className="h-full w-full object-cover" />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}
