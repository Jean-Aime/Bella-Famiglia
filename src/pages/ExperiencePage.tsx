import { Link } from 'react-router-dom';
import { ArrowRight, KeyRound, Wifi, Coffee, Droplets, Lock, Wind, Car, Trees } from 'lucide-react';
import { Reveal } from '@/components/Reveal';

export function ExperiencePage() {
  const items = [
    { icon: KeyRound, title: 'Private arrival', body: 'Your own gate, your own door. No reception desk, no shared hallways. You arrive like you belong there — because for the duration of your stay, you do.' },
    { icon: Wifi, title: 'Work-ready', body: 'Reliable free Wi-Fi and enough quiet to take calls, join meetings, or simply think. Many of our guests work remotely from here.' },
    { icon: Coffee, title: 'Self-sufficient', body: 'A kitchen with everything you need to cook a meal or make morning coffee. No need to go out for every meal — unless you want to.' },
    { icon: Droplets, title: 'Considered comfort', body: 'Quality mattresses, fresh linens, good water pressure, proper lighting. The unglamorous essentials that actually determine whether you rest well.' },
    { icon: Lock, title: 'Safe and secure', body: 'A private entrance, a smoke-free property, and a safety deposit box inside. The neighbourhood is calm and residential — the kind of place where people walk in the evening.' },
    { icon: Wind, title: 'Climate control', body: 'Heating for the cool mountain evenings. Hot water always available. Windows that open when you want the fresh air.' },
    { icon: Car, title: 'Easy access', body: 'Free private parking on site — no reservation needed. About 2.5 km from Musanze town centre, and minutes from Volcanoes National Park and the Musanze caves.' },
    { icon: Trees, title: 'Green and quiet', body: 'A nice garden, a terrace and a balcony with views of the volcanoes. Outdoor seating where you can read, work, or simply sit. Evenings are genuinely peaceful.' },
  ];

  return (
    <div className="pt-32 md:pt-40">
      {/* Hero */}
      <section className="container-editorial mb-20 md:mb-28">
        <Reveal>
          <p className="label-eyebrow mb-6">The Experience</p>
          <h1 className="text-display-lg text-charcoal-900 font-display font-light text-balance max-w-3xl">
            What staying here
            <span className="italic text-charcoal-400"> actually feels like.</span>
          </h1>
        </Reveal>
      </section>

      {/* Wide image */}
      <Reveal className="mb-24 md:mb-32">
        <div className="container-wide">
          <div className="image-zoom aspect-[16/9] lg:aspect-[21/9]">
            <img
              src="https://images.pexels.com/photos/11296142/pexels-photo-11296142.jpeg?auto=compress&cs=tinysrgb&w=1920"
              alt="Bella Famiglia living room"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </Reveal>

      {/* Intro text */}
      <section className="container-editorial mb-24 md:mb-32">
        <Reveal className="max-w-2xl">
          <p className="text-xl leading-relaxed text-charcoal-700 font-light">
            We don't think of hospitality as a list of amenities. We think of it as a feeling: the feeling of walking into a space that has been prepared with care, where everything works, where nothing is missing, and where you can close the door and genuinely relax.
          </p>
        </Reveal>
      </section>

      {/* Experience grid */}
      <section className="container-editorial mb-24 md:mb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-sand-200">
          {items.map((item, i) => (
            <Reveal key={item.title} delay={(i % 2) * 100}>
              <div className="bg-sand-50 p-8 md:p-10 h-full">
                <item.icon size={24} className="text-charcoal-400 mb-6" strokeWidth={1.5} />
                <h3 className="text-lg font-display font-normal text-charcoal-900 mb-3">{item.title}</h3>
                <p className="text-sm leading-relaxed text-charcoal-600 font-light">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Guest guide preview */}
      <section className="bg-charcoal-950 text-sand-50 py-24 md:py-32">
        <div className="container-editorial">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <Reveal className="lg:col-span-6">
              <p className="label-eyebrow-light mb-6">Digital Guest Guide</p>
              <h2 className="text-display-md font-display font-light text-balance mb-6">
                Everything you need to know,
                <span className="italic text-sand-400"> before and during your stay.</span>
              </h2>
              <p className="text-base leading-relaxed text-sand-400 font-light mb-8 max-w-md">
                After booking, you'll receive access to a digital guide with check-in instructions, Wi-Fi details, house instructions, local recommendations, and emergency contacts. Everything in one place, accessible from your phone.
              </p>
              <Link to="/contact" className="inline-flex items-center gap-3 text-sm font-medium uppercase tracking-[0.15em] text-sand-50 link-underline">
                Ask about your stay
                <ArrowRight size={16} />
              </Link>
            </Reveal>
            <Reveal className="lg:col-span-6" delay={150}>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="aspect-[3/4] image-zoom">
                  <img src="https://images.pexels.com/photos/10554480/pexels-photo-10554480.jpeg?auto=compress&cs=tinysrgb&w=800" alt="Bedroom" className="h-full w-full object-cover" />
                </div>
                <div className="aspect-[3/4] image-zoom mt-8">
                  <img src="https://images.pexels.com/photos/6508341/pexels-photo-6508341.jpeg?auto=compress&cs=tinysrgb&w=800" alt="Kitchen" className="h-full w-full object-cover" />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}
