import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/Reveal';
import { useBrand } from '@/contexts/BrandContext';

export function AboutPage() {
  const { brand } = useBrand();

  return (
    <div className="pt-32 md:pt-40">
      {/* Hero */}
      <section className="container-editorial mb-20 md:mb-28">
        <Reveal>
          <p className="label-eyebrow mb-6">About</p>
          <h1 className="text-display-lg text-charcoal-900 font-display font-light text-balance max-w-3xl">
            A small hospitality project,
            <span className="italic text-charcoal-400"> done with care.</span>
          </h1>
        </Reveal>
      </section>

      {/* Image + text */}
      <section className="container-editorial mb-24 md:mb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          <Reveal className="lg:col-span-6">
            <div className="image-zoom aspect-[4/5]">
              <img
                src="https://images.pexels.com/photos/7031406/pexels-photo-7031406.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="Bella Famiglia at dusk"
                className="h-full w-full object-cover"
              />
            </div>
          </Reveal>
          <Reveal className="lg:col-span-6" delay={150}>
            <p className="text-xl leading-relaxed text-charcoal-700 font-light mb-6">
              Bella Famiglia is not a hotel. It's a private, fully furnished guest house with two independent entrances, run by a host who believes that short-term stays can — and should — feel personal.
            </p>
            <p className="text-base leading-relaxed text-charcoal-600 font-light mb-6">
              We started with a simple question: what makes a place feel like yours, even temporarily? The answer wasn't about luxury or grand statements. It was about the small things — a bed that's actually comfortable, a kitchen that actually works, a space that's genuinely quiet, and a host who responds when you need something.
            </p>
            <p className="text-base leading-relaxed text-charcoal-600 font-light mb-6">
              {brand.hostName} manages the property directly. There's no management company, no front desk, no layers between you and the person who actually knows the house, the neighborhood, and the best place to get coffee nearby.
            </p>
            <p className="text-base leading-relaxed text-charcoal-600 font-light">
              We list on Airbnb because it's the easiest way for guests to book with confidence. But we're always available directly — on WhatsApp, by email, or by phone — for anything you need before, during, or after your stay.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Values */}
      <section className="bg-sand-100 py-24 md:py-32">
        <div className="container-editorial">
          <Reveal className="mb-16">
            <p className="label-eyebrow mb-6">What We Believe</p>
            <h2 className="text-display-md text-charcoal-900 font-display font-light text-balance max-w-2xl">
              Hospitality is in the details, not the headlines.
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
            {[
              { title: 'Honesty', body: "We don't oversell. The photos are real, the descriptions are accurate, and if something isn't perfect, we'll tell you. No surprises after you arrive." },
              { title: 'Responsiveness', body: "When you message us, you get a response — usually within minutes. That's not a service promise; it's just how we operate." },
              { title: 'Respect for privacy', body: "Your space is your space. We don't drop by unannounced. If something needs attention, we ask first and schedule it around you." },
              { title: 'Local knowledge', body: "We live here. We can tell you where to eat, what to visit, how to get around, and what to avoid — because we know Musanze, not just the tourist version of it." },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 100}>
                <div className="border-t border-charcoal-200 pt-6">
                  <h3 className="text-lg font-display font-normal text-charcoal-900 mb-3">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-charcoal-600 font-light">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32">
        <div className="container-editorial text-center">
          <Reveal>
            <h2 className="text-display-md text-charcoal-900 font-display font-light text-balance mb-8">
              Come stay with us.
            </h2>
            <Link to="/the-house" className="btn-primary">
              View the House
              <ArrowRight size={16} />
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
