import { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useBrand } from '@/contexts/BrandContext';
import { buildWhatsAppUrl, classNames } from '@/lib/utils';

export function WhatsAppButton() {
  const { brand } = useBrand();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!brand.whatsappEnabled) return null;

  const whatsappUrl = buildWhatsAppUrl(
    brand.whatsappNumber,
    `Hello, I'd like to inquire about a stay at ${brand.name}.`
  );

  return (
    <div
      className={classNames(
        'fixed bottom-6 right-6 z-40 transition-all duration-500 ease-out-expo',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
      )}
    >
      <div className="relative">
        {expanded && (
          <div className="absolute bottom-full right-0 mb-3 w-64 bg-white shadow-2xl rounded-sm border border-sand-100 p-5 animate-fade-in-up">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageCircle size={18} className="text-sage-600" />
                <span className="text-sm font-medium text-charcoal-900">Chat with us</span>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="text-charcoal-400 hover:text-charcoal-700 transition-colors"
                aria-label="Close chat popup"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-charcoal-600 leading-relaxed mb-4">
              Questions about availability, check-in, or your stay? Send us a message.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-sage-600 text-white text-xs font-medium uppercase tracking-wider py-3 hover:bg-sage-700 transition-colors"
            >
              <MessageCircle size={16} />
              Start Chat
            </a>
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="group flex items-center justify-center w-14 h-14 bg-sage-600 text-white shadow-xl hover:bg-sage-700 transition-all duration-500 ease-out-expo hover:scale-105"
          aria-label="Open WhatsApp contact"
        >
          <MessageCircle
            size={24}
            className="transition-transform duration-500 group-hover:scale-110"
          />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-sage-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-sage-500" />
          </span>
        </button>
      </div>
    </div>
  );
}
