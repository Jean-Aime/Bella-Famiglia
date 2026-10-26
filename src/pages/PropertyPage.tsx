import { Link } from 'react-router-dom';
import { ArrowRight, Home, KeyRound, Wifi, Car, Trees, Sparkles } from 'lucide-react';
import { Reveal } from '@/components/Reveal';

export function PropertyPage() {
  return (
    <div className="pt-32 md:pt-40">
      {/* Hero */}
      <section className="container-editorial mb-24 md:mb-32">
        <Reveal>
          <p className="label-eyebrow mb-6">The Property</p>
          <h1 className="text-display-lg text-charcoal-900 font-display font-light text-balance max-w-4xl">
            A home designed for
            <span className="italic text-charcoal-400"> privacy and ease.</span>
          </h1>
        </Reveal>
      </section>

      {/* Wide image */}
      <Reveal className="mb-24 md:mb-32">
        <div className="container-wide">
          <div className="image-zoom aspect-[16/9] lg:aspect-[21/9]">
            <img
              src="https://images.pexels.com/photos/8134821/pexels-photo-8134821.jpeg?auto=compress&cs=tinysrgb&w=1920"
              alt="Bella Famiglia property exterior"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </Reveal>

      {/* Story */}
      <section className="container-editorial mb-24 md:mb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
          <Reveal className="lg:col-span-4">
            <p className="label-eyebrow mb-4">The Story</p>
          </Reveal>
          <Reveal className="lg:col-span-8" delay={100}>
            <div className="prose-content">
              <p className="text-xl leading-relaxed text-charcoal-700 font-light mb-6">
                Bella Famiglia began with a simple idea: that a short stay should feel like arriving somewhere that belongs to you — not like passing through a generic room.
              </p>
              <p className="text-base leading-relaxed text-charcoal-600 font-light mb-6">
                It is a single, fully furnished guest house at the edge of Musanze town, about 2.5 km from the centre, with views of the volcanoes. What makes it unusual is that it has two independent entrances — two gates that give you flexibility in how you arrive, how you leave, and how you use the space.
              </p>
              <p className="text-base leading-relaxed text-charcoal-600 font-light mb-6">
                The home is complete in itself: one bedroom, two bathrooms, a living room, a kitchen, a terrace and a balcony, and everything you need for a comfortable stay. The two entrances are not two separate units — they are two ways into the same private home, offering convenience and flexibility.
              </p>
              <p className="text-base leading-relaxed text-charcoal-600 font-light mb-6">
                The property is green, safe, and well connected. Close enough to the town centre, the village market, and Volcanoes National Park to be practical. Far enough that the evenings are genuinely quiet.
              </p>
              <p className="text-base leading-relaxed text-charcoal-600 font-light">
                Whether you are here for a few nights, a few weeks, or something in between, the intention is the same: a place that feels considered, comfortable, and completely yours during your stay.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Two entrances section */}
      <section className="bg-charcoal-950 text-sand-50 py-24 md:py-32 mb-24 md:mb-32">
        <div className="container-editorial">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <Reveal className="lg:col-span-6">
              <p className="label-eyebrow-light mb-6">Two Entrances</p>
              <h2 className="text-display-md font-display font-light text-balance mb-6">
                One home, two ways in.
              </h2>
              <p className="text-base leading-relaxed text-sand-400 font-light mb-4">
                The property has two independent gates. This is not two separate apartments — it is a single furnished house with the flexibility of two access points.
              </p>
              <p className="text-base leading-relaxed text-sand-400 font-light mb-4">
                Use one entrance as your main arrival. Keep the other for convenience, privacy, or when you want to come and go without being noticed. Some guests use both equally. The choice is yours.
              </p>
              <p className="text-base leading-relaxed text-sand-400 font-light">
                Both gates are private and secure. The compound is enclosed, well-lit, and calm.
              </p>
            </Reveal>
            <Reveal className="lg:col-span-6" delay={150}>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="aspect-[3/4] image-zoom">
                  <img src="https://images.pexels.com/photos/39743614/pexels-photo-39743614.jpeg?auto=compress&cs=tinysrgb&w=800" alt="First gate entrance" className="h-full w-full object-cover" />
                </div>
                <div className="aspect-[3/4] image-zoom mt-8">
                  <img src="https://images.pexels.com/photos/63743/pexels-photo-63743.jpeg?auto=compress&cs=tinysrgb&w=800" alt="Garden entrance" className="h-full w-full object-cover" />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* What makes it different */}
      <section className="bg-sand-100 py-24 md:py-32 mb-24 md:mb-32">
        <div className="container-editorial">
          <Reveal className="mb-16">
            <h2 className="text-display-sm font-display font-light text-charcoal-900 max-w-2xl">
              What makes this different.
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-sand-200">
            {[
              { icon: Home, title: 'A complete home', body: 'Not a room in a shared house. The entire furnished home is yours — bedroom, living room, kitchen, bathroom, and outdoor space.' },
              { icon: KeyRound, title: 'Two private entrances', body: 'Two independent gates give you flexibility in how you arrive and leave. Both are private, secure, and yours during your stay.' },
              { icon: Trees, title: 'Green and quiet', body: 'A garden, terrace and balcony with volcano views. Mature greenery, outdoor seating, and a neighbourhood that stays quiet after dark.' },
              { icon: Wifi, title: 'Work-ready', body: 'Reliable free Wi-Fi and enough quiet to take calls or focus. Built for business travelers as much as for holidaymakers.' },
              { icon: Car, title: 'Easy access', body: 'Free private parking on site — no reservation needed. About 2.5 km from Musanze town centre, and close to Volcanoes National Park and the Musanze caves.' },
              { icon: Sparkles, title: 'Considered details', body: 'Fresh linens, good lighting, a well-equipped kitchen, coffee and tea on arrival. The small things that turn a stay into an experience.' },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <div className="bg-sand-100 p-8 md:p-10 h-full">
                  <item.icon size={24} className="text-charcoal-600 mb-6" strokeWidth={1.5} />
                  <h3 className="text-lg font-display font-normal text-charcoal-900 mb-3">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-charcoal-600 font-light">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-editorial mb-24 md:mb-32 text-center">
        <Reveal>
          <h2 className="text-display-md text-charcoal-900 font-display font-light text-balance mb-8">
            See the house in detail.
          </h2>
          <Link to="/the-house" className="btn-primary">
            Explore the House
            <ArrowRight size={16} />
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
