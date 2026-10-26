import { Link } from 'react-router-dom';
import { MapPin, Mail, MessageCircle, ArrowUpRight } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useBrand } from '@/contexts/BrandContext';
import { buildWhatsAppUrl, isPlaceholderUrl } from '@/lib/utils';

export function Footer() {
  const { brand } = useBrand();

  return (
    <footer className="bg-charcoal-950 text-sand-100">
      <div className="container-editorial py-20 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-5">
            <Logo light />
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-sand-300 font-light">
              {brand.description}
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm text-sand-300">
              <MapPin size={16} className="text-sand-400" />
              <span>{brand.locationNeighborhood || 'Musanze, Rwanda'}</span>
            </div>
          </div>

          {/* Explore */}
          <div className="md:col-span-3">
            <h4 className="label-eyebrow-light mb-5">Explore</h4>
            <ul className="space-y-3">
              {[
                { label: 'The Property', to: '/property' },
                { label: 'The House', to: '/the-house' },
                { label: 'Experience', to: '/experience' },
                { label: 'Location', to: '/location' },
                { label: 'About', to: '/about' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-sand-300 hover:text-sand-50 transition-colors duration-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="md:col-span-4">
            <h4 className="label-eyebrow-light mb-5">Contact</h4>
            <div className="space-y-4">
              {brand.whatsappEnabled && (
                <a
                  href={buildWhatsAppUrl(brand.whatsappNumber, `Hello, I'd like to inquire about a stay at ${brand.name}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 text-sm text-sand-300 hover:text-sand-50 transition-colors"
                >
                  <MessageCircle size={18} className="text-sage-400" />
                  <span>Chat on WhatsApp</span>
                  <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              )}
              {brand.contactEmail && (
                <a
                  href={`mailto:${brand.contactEmail}`}
                  className="group flex items-center gap-3 text-sm text-sand-300 hover:text-sand-50 transition-colors"
                >
                  <Mail size={18} className="text-sand-400" />
                  <span>{brand.contactEmail}</span>
                </a>
              )}
              {!isPlaceholderUrl(brand.airbnbProfileUrl) && (
                <a
                  href={brand.airbnbProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 text-sm text-sand-300 hover:text-sand-50 transition-colors"
                >
                  <span>View on Airbnb</span>
                  <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              )}
            </div>

            <div className="mt-8 flex gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center px-6 py-3 border border-sand-100/20 text-xs font-medium uppercase tracking-[0.15em] text-sand-100 hover:bg-sand-50 hover:text-charcoal-900 transition-all duration-500"
              >
                Book Your Stay
              </Link>
            </div>
          </div>
        </div>

        {/* Policies row */}
        <div className="mt-16 pt-8 border-t border-sand-100/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-xs text-sand-400 font-light">
            © {new Date().getFullYear()} {brand.name}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-6 text-xs text-sand-400">
            <Link to="/policies" className="hover:text-sand-200 transition-colors">House Rules</Link>
            <Link to="/policies" className="hover:text-sand-200 transition-colors">Cancellation Policy</Link>
            <Link to="/policies" className="hover:text-sand-200 transition-colors">Privacy</Link>
            <Link to="/admin" className="hover:text-sand-200 transition-colors">Admin</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
