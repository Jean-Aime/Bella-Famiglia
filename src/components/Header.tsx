import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useScrollPosition } from '@/hooks/useScrollReveal';
import { classNames } from '@/lib/utils';

const navLinks = [
  { label: 'Property', to: '/property' },
  { label: 'The House', to: '/the-house' },
  { label: 'Experience', to: '/experience' },
  { label: 'Location', to: '/location' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

export function Header() {
  const scrollY = useScrollPosition();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';
  const scrolled = scrollY > 40;
  const solidHeader = scrolled || !isHome || mobileOpen;

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={classNames(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-out-expo',
          solidHeader
            ? 'bg-sand-50/95 backdrop-blur-md border-b border-sand-200/60 py-4'
            : 'bg-transparent py-6'
        )}
      >
        <div className="container-editorial flex items-center justify-between">
          <Logo light={!solidHeader} />

          <nav className="hidden lg:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={classNames(
                  'link-underline text-sm font-medium tracking-wide transition-colors duration-300',
                  solidHeader ? 'text-charcoal-700 hover:text-charcoal-900' : 'text-sand-100 hover:text-white',
                  location.pathname === link.to && (solidHeader ? 'text-charcoal-900' : 'text-white')
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:block">
            <Link
              to="/the-house"
              className={classNames(
                'inline-flex items-center px-6 py-3 text-xs font-medium uppercase tracking-[0.15em] transition-all duration-500 ease-out-expo',
                solidHeader
                  ? 'bg-charcoal-900 text-sand-50 hover:bg-charcoal-800 hover:tracking-wider'
                  : 'border border-sand-100/40 text-sand-50 hover:bg-sand-50 hover:text-charcoal-900'
              )}
            >
              Book Your Stay
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={classNames(
              'lg:hidden p-2 transition-colors',
              solidHeader ? 'text-charcoal-900' : 'text-sand-50'
            )}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        className={classNames(
          'fixed inset-0 z-40 lg:hidden transition-all duration-500 ease-out-expo',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      >
        <div className="absolute inset-0 bg-charcoal-950" />
        <nav className="relative flex flex-col items-center justify-center min-h-screen gap-8">
          {navLinks.map((link, i) => (
            <Link
              key={link.to}
              to={link.to}
              className={classNames(
                'font-display text-3xl font-light transition-all duration-700 ease-out-expo',
                mobileOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
                'text-sand-50 hover:text-sand-300'
              )}
              style={{ transitionDelay: mobileOpen ? `${i * 80 + 100}ms` : '0ms' }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/the-house"
            className="mt-4 inline-flex items-center px-8 py-4 bg-sand-50 text-charcoal-900 text-sm font-medium uppercase tracking-[0.15em] transition-all duration-300 hover:bg-sand-200"
            style={{
              opacity: mobileOpen ? 1 : 0,
              transform: mobileOpen ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
              transitionDelay: mobileOpen ? `${navLinks.length * 80 + 100}ms` : '0ms',
            }}
          >
            Book Your Stay
          </Link>
        </nav>
      </div>
    </>
  );
}
