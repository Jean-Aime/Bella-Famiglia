import { useEffect, useState } from 'react';
import { Search, Trash2, Plus, X, MessageCircle, Mail, Phone, Pencil } from 'lucide-react';
import { fetchAllGuests, deleteGuest, createGuest, updateGuest, fetchAllReservations } from '@/services/dataService';
import type { Guest, Reservation, CommunicationPreference } from '@/types';
import { formatDateShort, getInitials } from '@/lib/utils';

export function AdminGuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Guest | null>(null);

  const loadData = () => {
    Promise.all([fetchAllGuests(), fetchAllReservations()])
      .then(([g, r]) => { setGuests(g); setReservations(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const filtered = guests.filter((g) =>
    !search ||
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.email?.toLowerCase().includes(search.toLowerCase()) ||
    g.phone?.includes(search)
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this guest? Their reservations will remain.')) return;
    try {
      await deleteGuest(id);
      setGuests((prev) => prev.filter((g) => g.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete guest');
    }
  };

  const getGuestReservationCount = (guestId: string) =>
    reservations.filter((r) => r.guest_id === guestId).length;

  if (loading) return <div className="h-96 skeleton" />;

  return (
    <div className="max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-light text-charcoal-900">Guests</h1>
          <p className="text-sm text-charcoal-400 mt-1">{guests.length} total</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="inline-flex items-center justify-center gap-2 bg-charcoal-900 text-sand-50 px-5 py-3 text-xs font-medium uppercase tracking-wider hover:bg-charcoal-800 transition-colors"
        >
          <Plus size={16} /> Add Guest
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-sand-200 text-sm focus:outline-none focus:border-charcoal-400 transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((guest) => {
          const resCount = getGuestReservationCount(guest.id);
          return (
            <div key={guest.id} className="bg-white border border-sand-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-charcoal-900 text-sand-50 flex items-center justify-center text-sm font-medium rounded-full">
                    {getInitials(guest.name)}
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-charcoal-900">{guest.name}</h3>
                    <p className="text-xs text-charcoal-400">{guest.country || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setEditing(guest); setShowModal(true); }}
                    className="text-charcoal-300 hover:text-charcoal-700 transition-colors"
                    aria-label="Edit guest"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(guest.id)}
                    className="text-charcoal-300 hover:text-red-600 transition-colors"
                    aria-label="Delete guest"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {guest.email && (
                  <div className="flex items-center gap-2 text-xs text-charcoal-600">
                    <Mail size={14} className="text-charcoal-400" /> {guest.email}
                  </div>
                )}
                {guest.phone && (
                  <div className="flex items-center gap-2 text-xs text-charcoal-600">
                    <Phone size={14} className="text-charcoal-400" /> {guest.phone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-charcoal-500">
                  <MessageCircle size={14} className="text-charcoal-400" /> Prefers: {guest.preferred_communication}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-sand-100 flex items-center justify-between">
                <span className="text-xs text-charcoal-400">{resCount} reservation{resCount !== 1 ? 's' : ''}</span>
                <span className="text-xs text-charcoal-400">Since {formatDateShort(guest.created_at)}</span>
              </div>

              {guest.notes && (
                <p className="mt-3 text-xs text-charcoal-500 italic bg-sand-50 p-2">{guest.notes}</p>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-charcoal-400">No guests found.</div>
      )}

      {showModal && (
        <GuestModal
          guest={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadData(); }}
        />
      )}
    </div>
  );
}

function GuestModal({ guest, onClose, onSaved }: { guest: Guest | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!guest;
  const [form, setForm] = useState({
    name: guest?.name || '',
    email: guest?.email || '',
    phone: guest?.phone || '',
    country: guest?.country || '',
    preferred_communication: (guest?.preferred_communication || 'WHATSAPP') as CommunicationPreference,
    notes: guest?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError('Guest name is required.');
      return;
    }
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      setError('Please provide a valid email address (or leave it empty).');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        country: form.country.trim() || null,
        preferred_communication: form.preferred_communication,
        notes: form.notes.trim() || null,
      };
      if (isEdit) {
        await updateGuest(guest.id, payload);
      } else {
        await createGuest(payload);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Failed to save guest');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-charcoal-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-sand-50 w-full max-w-md p-6 sm:p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-light text-charcoal-900">{isEdit ? 'Edit Guest' : 'Add Guest'}</h2>
          <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-700"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Name</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Phone</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Country</label>
            <input type="text" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Preferred Contact</label>
            <select value={form.preferred_communication} onChange={(e) => setForm({ ...form, preferred_communication: e.target.value as CommunicationPreference })} className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400">
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
              <option value="PHONE">Phone</option>
              <option value="SMS">SMS</option>
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Notes</label>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400 resize-none" />
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary disabled:opacity-50">{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Guest'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
