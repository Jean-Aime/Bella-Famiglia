import { useState } from 'react';
import { MessageCircle, Mail, MapPin, Clock, Check, Send } from 'lucide-react';
import { Reveal } from '@/components/Reveal';
import { useBrand } from '@/contexts/BrandContext';
import { buildWhatsAppUrl } from '@/lib/utils';

export function ContactPage() {
  const { brand } = useBrand();
  const [form, setForm] = useState({ name: '', email: '', message: '', house: '' });
  const [submitted, setSubmitted] = useState(false);

  const whatsappUrl = buildWhatsAppUrl(
    brand.whatsappNumber,
    `Hello, I'd like to inquire about a stay at ${brand.name}.${form.house ? ` Interested in ${form.house}.` : ''} ${form.message}`
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Open WhatsApp with pre-filled message
    window.open(whatsappUrl, '_blank');
    setSubmitted(true);
  };

  return (
    <div className="pt-32 md:pt-40">
      {/* Hero */}
      <section className="container-editorial mb-20 md:mb-28">
        <Reveal>
          <p className="label-eyebrow mb-6">Contact</p>
          <h1 className="text-display-lg text-charcoal-900 font-display font-light text-balance max-w-3xl">
            Let's talk about
            <span className="italic text-charcoal-400"> your stay.</span>
          </h1>
          <p className="mt-8 text-lg leading-relaxed text-charcoal-600 font-light max-w-xl">
            Ask about availability, arrival arrangements, or anything you need to know before your stay.
          </p>
        </Reveal>
      </section>

      {/* Contact methods + form */}
      <section className="container-editorial mb-24 md:mb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Contact methods */}
          <Reveal className="lg:col-span-4">
            <div className="space-y-8">
              {brand.whatsappEnabled && (
                <a
                  href={buildWhatsAppUrl(brand.whatsappNumber, `Hello, I'd like to inquire about a stay at ${brand.name}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <div className="flex items-start gap-4 p-6 bg-sage-50 border border-sage-200 transition-all duration-500 group-hover:bg-sage-100">
                    <MessageCircle size={24} className="text-sage-600 flex-shrink-0 mt-1" strokeWidth={1.5} />
                    <div>
                      <p className="text-sm font-medium text-charcoal-900 mb-1">WhatsApp</p>
                      <p className="text-sm text-charcoal-500 font-light">{brand.whatsappNumber}</p>
                      <p className="text-xs text-sage-600 mt-2 group-hover:text-sage-700 transition-colors">Tap to chat →</p>
                    </div>
                  </div>
                </a>
              )}

              {brand.contactEmail && (
                <a href={`mailto:${brand.contactEmail}`} className="block group">
                  <div className="flex items-start gap-4 p-6 border border-sand-200 transition-all duration-500 group-hover:bg-sand-100">
                    <Mail size={24} className="text-charcoal-400 flex-shrink-0 mt-1" strokeWidth={1.5} />
                    <div>
                      <p className="text-sm font-medium text-charcoal-900 mb-1">Email</p>
                      <p className="text-sm text-charcoal-500 font-light">{brand.contactEmail}</p>
                    </div>
                  </div>
                </a>
              )}

              <div className="flex items-start gap-4 p-6 border border-sand-200">
                <MapPin size={24} className="text-charcoal-400 flex-shrink-0 mt-1" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-medium text-charcoal-900 mb-1">Location</p>
                  <p className="text-sm text-charcoal-500 font-light">{brand.locationNeighborhood || 'Musanze, Rwanda'}</p>
                  <p className="text-xs text-charcoal-400 mt-2">{brand.addressDisclosure}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 border border-sand-200">
                <Clock size={24} className="text-charcoal-400 flex-shrink-0 mt-1" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-medium text-charcoal-900 mb-1">Check-in / Check-out</p>
                  <p className="text-sm text-charcoal-500 font-light">{brand.checkInWindow} · Check-out {brand.checkOutWindow}</p>
                  <p className="text-xs text-charcoal-400 mt-2">Please tell the property your arrival time in advance.</p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Form */}
          <Reveal className="lg:col-span-8" delay={150}>
            {submitted ? (
              <div className="bg-sage-50 border border-sage-200 p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-sage-600 text-white rounded-full mb-6">
                  <Check size={28} />
                </div>
                <h3 className="text-display-sm font-display font-light text-charcoal-900 mb-4">Message ready!</h3>
                <p className="text-charcoal-600 font-light mb-8 max-w-md mx-auto">
                  We've opened WhatsApp with your message pre-filled. Just press send and we'll get back to you shortly.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: '', email: '', message: '', house: '' }); }}
                  className="btn-secondary"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white border border-sand-200 p-8 md:p-12">
                <h3 className="text-xl font-display font-normal text-charcoal-900 mb-8">Send an inquiry</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Your name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full border border-sand-200 bg-sand-50 px-4 py-3 text-sm text-charcoal-900 focus:outline-none focus:border-charcoal-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Email</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full border border-sand-200 bg-sand-50 px-4 py-3 text-sm text-charcoal-900 focus:outline-none focus:border-charcoal-400 transition-colors"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Which house?</label>
                  <select
                    value={form.house}
                    onChange={(e) => setForm({ ...form, house: e.target.value })}
                    className="w-full border border-sand-200 bg-sand-50 px-4 py-3 text-sm text-charcoal-900 focus:outline-none focus:border-charcoal-400 transition-colors"
                  >
                    <option value="">No preference</option>
                    <option value="The house">The house</option>
                    <option value="The whole house">The whole house</option>
                  </select>
                </div>

                <div className="mb-8">
                  <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Your message</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us your dates, number of guests, and any questions..."
                    className="w-full border border-sand-200 bg-sand-50 px-4 py-3 text-sm text-charcoal-900 focus:outline-none focus:border-charcoal-400 transition-colors resize-none"
                  />
                </div>

                <button type="submit" className="w-full btn-primary">
                  Send via WhatsApp
                  <Send size={16} />
                </button>

                <p className="mt-4 text-xs text-charcoal-400 text-center">
                  This will open WhatsApp with your message ready to send. We typically respond within minutes.
                </p>
              </form>
            )}
          </Reveal>
        </div>
      </section>
    </div>
  );
}
