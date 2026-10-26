export function formatPrice(amount: number, currency: string = 'USD'): string {
  if (currency === 'USD') return `$${amount.toFixed(0)}`;
  if (currency === 'RWF') return `${amount.toLocaleString()} RWF`;
  return `${amount.toFixed(0)} ${currency}`;
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', options || { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function calculateNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * True when a configured URL is missing or is a known placeholder (for example
 * the seed data's "PLACEHOLDER_HOUSE_01" Airbnb links). Used to avoid shipping
 * buttons that send guests to a dead page.
 */
export function isPlaceholderUrl(url?: string | null): boolean {
  const value = (url || '').trim().toLowerCase();
  if (!value) return true;
  if (!value.startsWith('http')) return true;
  return /placeholder|example\.com|your-?domain|change-?me|replace-?me|^#/.test(value);
}

export function isPlaceholderContact(value?: string | null): boolean {
  const contact = (value || '').trim();
  if (!contact) return true;
  const digits = contact.replace(/\D/g, '');
  return /placeholder|example\.|your-?domain|change-?me|replace-?me|maisonprivee/i.test(contact)
    || /0{6,}/.test(digits);
}

export function isToday(date: string): boolean {
  const today = new Date();
  const d = new Date(date);
  return d.toDateString() === today.toDateString();
}

export function isPast(date: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

export function isFuture(date: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d > today;
}

export function datesOverlap(
  startA: string, endA: string,
  startB: string, endB: string
): boolean {
  return new Date(startA) < new Date(endB) && new Date(endA) > new Date(startB);
}

export function buildWhatsAppUrl(number: string, message: string): string {
  const cleanNumber = number.replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}

export function classNames(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getStatusColor(status: string): { bg: string; text: string; label: string } {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    PENDING: { bg: 'bg-gold-100', text: 'text-gold-800', label: 'Pending' },
    CONFIRMED: { bg: 'bg-sage-100', text: 'text-sage-700', label: 'Confirmed' },
    CHECKED_IN: { bg: 'bg-clay-100', text: 'text-clay-700', label: 'Checked In' },
    CHECKED_OUT: { bg: 'bg-charcoal-100', text: 'text-charcoal-600', label: 'Checked Out' },
    CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
    BLOCKED: { bg: 'bg-charcoal-200', text: 'text-charcoal-700', label: 'Blocked' },
    PAID: { bg: 'bg-sage-100', text: 'text-sage-700', label: 'Paid' },
    PARTIAL: { bg: 'bg-gold-100', text: 'text-gold-800', label: 'Partial' },
    REFUNDED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Refunded' },
    'N/A': { bg: 'bg-charcoal-100', text: 'text-charcoal-500', label: 'N/A' },
  };
  return map[status] || { bg: 'bg-charcoal-100', text: 'text-charcoal-600', label: status };
}

export function getSourceLabel(source: string): string {
  const map: Record<string, string> = {
    AIRBNB: 'Airbnb',
    DIRECT: 'Direct',
    MANUAL: 'Manual',
    BLOCKED: 'Blocked',
  };
  return map[source] || source;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
