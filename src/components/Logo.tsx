import { Link } from 'react-router-dom';

export function Logo({ light = false, className = '' }: { light?: boolean; className?: string }) {
  return (
    <Link
      to="/"
      className={`group inline-flex items-baseline gap-2 ${className}`}
      aria-label="Bella Famiglia — home"
    >
      <span
        className={`font-display text-2xl font-medium tracking-tight transition-all duration-500 ease-out-expo group-hover:tracking-normal ${
          light ? 'text-sand-50' : 'text-charcoal-900'
        }`}
      >
        Bella
      </span>
      <span
        className={`font-display text-2xl italic font-light tracking-tight ${
          light ? 'text-sand-300' : 'text-charcoal-400'
        }`}
      >
        Famiglia
      </span>
    </Link>
  );
}
