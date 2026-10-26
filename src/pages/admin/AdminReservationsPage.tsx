import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, X, Trash2, Pencil, Mail, Send, Loader2 } from 'lucide-react';
import {
  fetchAllReservations, updateReservation, deleteReservation,
  fetchAllHousesWithRelations, fetchAllGuests, createReservation, createGuest,
  findConflictingReservation, findConflictingBlock,
  fetchLatestNotificationStatuses, fetchNotificationsForReservation, resendBookingNotification,
} from '@/services/dataService';
import type {
  Reservation, HouseWithRelations, Guest, ReservationStatus, BookingSource, PaymentStatus,
  BookingNotificationLog, NotificationKind, NotificationDeliveryStatus,
} from '@/types';
import {
  formatDateShort, getStatusColor, getSourceLabel, formatPrice, classNames,
  calculateNights, formatDateISO, formatDate,
} from '@/lib/utils';

const STATUS_OPTIONS: ReservationStatus[] = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'BLOCKED'];

export function AdminReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [houses, setHouses] = useState<HouseWithRelations[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [notificationsFor, setNotificationsFor] = useState<Reservation | null>(null);
  const [latestNotification, setLatestNotification] = useState<Record<string, BookingNotificationLog>>({});

  const loadData = () => {
    setLoadError(null);
    Promise.all([
      fetchAllReservations(),
      fetchAllHousesWithRelations({ includeInactive: true }),
      fetchAllGuests(),
      // Delivery history is a nice-to-have: never let it hide the reservations.
      fetchLatestNotificationStatuses().catch(() => ({})),
    ])
      .then(([r, h, g, n]) => { setReservations(r); setHouses(h); setGuests(g); setLatestNotification(n); })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load reservations'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const filtered = reservations.filter((r) => {
    const matchesSearch = !search ||
      r.guest?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.guest?.email?.toLowerCase().includes(search.toLowerCase()) ||
      r.house?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.external_reference?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (id: string, status: ReservationStatus) => {
    try {
      await updateReservation(id, { status });
      setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update reservation');
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this reservation? This cannot be undone.')) return;
    try {
      await deleteReservation(id);
      setReservations((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete reservation');
    }
  };

  if (loading) {
    return <div className="h-96 skeleton" />;
  }

  return (
    <div className="max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-light text-charcoal-900">Reservations</h1>
          <p className="text-sm text-charcoal-400 mt-1">{reservations.length} total</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="inline-flex items-center justify-center gap-2 bg-charcoal-900 text-sand-50 px-5 py-3 text-xs font-medium uppercase tracking-wider hover:bg-charcoal-800 transition-colors"
        >
          <Plus size={16} /> New Reservation
        </button>
      </div>

      {loadError && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 flex items-center justify-between gap-4">
          <span>{loadError}</span>
          <button onClick={loadData} className="underline shrink-0">Retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400" />
          <input
            type="text"
            placeholder="Search by guest, email, house, or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-sand-200 text-sm focus:outline-none focus:border-charcoal-400 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto px-4 py-3 bg-white border border-sand-200 text-sm focus:outline-none focus:border-charcoal-400 transition-colors"
        >
          <option value="ALL">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-sand-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-sand-200">
              <th className="text-left text-xs uppercase tracking-wider text-charcoal-400 py-3 px-4">Guest</th>
              <th className="text-left text-xs uppercase tracking-wider text-charcoal-400 py-3 px-4">House</th>
              <th className="text-left text-xs uppercase tracking-wider text-charcoal-400 py-3 px-4">Dates</th>
              <th className="text-left text-xs uppercase tracking-wider text-charcoal-400 py-3 px-4">Nights</th>
              <th className="text-left text-xs uppercase tracking-wider text-charcoal-400 py-3 px-4">Source</th>
              <th className="text-left text-xs uppercase tracking-wider text-charcoal-400 py-3 px-4">Amount</th>
              <th className="text-left text-xs uppercase tracking-wider text-charcoal-400 py-3 px-4">Status</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const nights = calculateNights(r.check_in, r.check_out);
              const statusColors = getStatusColor(r.status);
              const mail = latestNotification[r.id];
              return (
                <tr key={r.id} className="border-b border-sand-100 hover:bg-sand-50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-medium text-charcoal-900">{r.guest?.name || '—'}</p>
                    <p className="text-xs text-charcoal-400">{r.guest?.email || r.external_reference || ''}</p>
                  </td>
                  <td className="py-3 px-4 text-charcoal-600">{r.house?.name || '—'}</td>
                  <td className="py-3 px-4 text-charcoal-600 whitespace-nowrap">
                    {formatDateShort(r.check_in)} → {formatDateShort(r.check_out)}
                  </td>
                  <td className="py-3 px-4 text-charcoal-600">{nights}</td>
                  <td className="py-3 px-4 text-charcoal-600">{getSourceLabel(r.source)}</td>
                  <td className="py-3 px-4 text-charcoal-600">{r.total_amount ? formatPrice(r.total_amount, r.currency) : '—'}</td>
                  <td className="py-3 px-4">
                    <select
                      value={r.status}
                      onChange={(e) => handleStatusChange(r.id, e.target.value as ReservationStatus)}
                      className={classNames(
                        'text-xs font-medium px-2.5 py-1.5 border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-charcoal-300',
                        statusColors.bg, statusColors.text
                      )}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setNotificationsFor(r)}
                        className="relative text-charcoal-300 hover:text-charcoal-700 transition-colors"
                        aria-label="Email history and resend"
                        title={
                          mail
                            ? `Last email ${mail.status} · ${formatDate(mail.created_at)}`
                            : 'No emails sent yet'
                        }
                      >
                        <Mail size={16} />
                        {mail && <NotificationDot status={mail.status} />}
                      </button>
                      <button
                        onClick={() => { setEditing(r); setShowModal(true); }}
                        className="text-charcoal-300 hover:text-charcoal-700 transition-colors"
                        aria-label="Edit reservation"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-charcoal-300 hover:text-red-600 transition-colors"
                        aria-label="Delete reservation"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-charcoal-400">
            {reservations.length === 0 ? 'No reservations yet.' : 'No reservations found.'}
          </div>
        )}
      </div>

      {showModal && (
        <ReservationModal
          houses={houses}
          guests={guests}
          reservation={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadData(); }}
        />
      )}

      {notificationsFor && (
        <NotificationsModal
          reservation={notificationsFor}
          onClose={() => setNotificationsFor(null)}
          onChanged={() => {
            // Refresh the row dots after a resend, without disturbing the modal.
            fetchLatestNotificationStatuses().then(setLatestNotification).catch(() => {});
          }}
        />
      )}
    </div>
  );
}

const DOT_COLORS: Record<NotificationDeliveryStatus, string> = {
  sent: 'bg-green-500',
  failed: 'bg-red-500',
  skipped: 'bg-amber-400',
};

function NotificationDot({ status }: { status: NotificationDeliveryStatus }) {
  return (
    <span
      className={classNames(
        'absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white',
        DOT_COLORS[status]
      )}
    />
  );
}

const KIND_LABELS: Record<NotificationKind, string> = {
  host_alert: 'Host alert',
  guest_acknowledgement: 'Guest: request received',
  guest_confirmation: 'Guest: confirmed',
};

const STATUS_STYLES: Record<NotificationDeliveryStatus, string> = {
  sent: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  skipped: 'bg-amber-50 text-amber-700 border-amber-200',
};

function NotificationsModal({
  reservation, onClose, onChanged,
}: {
  reservation: Reservation;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [log, setLog] = useState<BookingNotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState<NotificationKind | null>(null);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);

  const loadLog = useCallback(() => {
    setLoading(true);
    fetchNotificationsForReservation(reservation.id)
      .then(setLog)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load email history'))
      .finally(() => setLoading(false));
  }, [reservation.id]);

  useEffect(() => { loadLog(); }, [loadLog]);

  const handleResend = async (kind: NotificationKind) => {
    setResending(kind);
    setNotice(null);
    setError(null);
    try {
      const result = await resendBookingNotification(reservation.id, kind);
      setNotice({
        text:
          result.status === 'sent'
            ? `Sent — ${KIND_LABELS[kind]} delivered to ${result.recipient ?? 'recipient'}.`
            : `${result.status === 'skipped' ? 'Not sent' : 'Failed'} — ${result.detail}`,
        ok: result.status === 'sent',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resend failed');
    } finally {
      setResending(null);
      loadLog();
      onChanged();
    }
  };

  const hasGuestEmail = !!reservation.guest?.email;

  return (
    <div
      className="fixed inset-0 z-[100] bg-charcoal-950/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-sand-50 w-full max-w-xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-display font-light text-charcoal-900">Booking emails</h2>
          <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-700 transition-colors" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-charcoal-400 mb-6">
          {reservation.guest?.name || 'Guest'} · {formatDateShort(reservation.check_in)} → {formatDateShort(reservation.check_out)}
        </p>

        {/* Resend actions */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wider text-charcoal-400 mb-3">Send again</p>
          <div className="flex flex-col sm:flex-row gap-2">
            {(Object.keys(KIND_LABELS) as NotificationKind[]).map((kind) => {
              const needsGuest = kind !== 'host_alert';
              const disabled = resending !== null || (needsGuest && !hasGuestEmail);
              return (
                <button
                  key={kind}
                  onClick={() => handleResend(kind)}
                  disabled={disabled}
                  title={needsGuest && !hasGuestEmail ? 'This reservation has no guest email on record' : undefined}
                  className={classNames(
                    'flex-1 inline-flex items-center justify-center gap-2 border px-3 py-2.5 text-xs font-medium transition-colors',
                    disabled
                      ? 'border-sand-200 text-charcoal-300 cursor-not-allowed'
                      : 'border-sand-300 text-charcoal-700 hover:bg-white'
                  )}
                >
                  {resending === kind ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {KIND_LABELS[kind]}
                </button>
              );
            })}
          </div>
          {!hasGuestEmail && (
            <p className="mt-2 text-xs text-charcoal-400">
              No guest email on record — only the host alert can be sent.
            </p>
          )}
        </div>

        {notice && (
          <div
            className={classNames(
              'mb-6 text-sm px-4 py-3 border',
              notice.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-800'
            )}
          >
            {notice.text}
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
        )}

        {/* History */}
        <div>
          <p className="text-xs uppercase tracking-wider text-charcoal-400 mb-3">Delivery history</p>
          {loading ? (
            <div className="h-24 skeleton" />
          ) : log.length === 0 ? (
            <p className="text-sm text-charcoal-400 py-4">
              No emails recorded yet. They appear here as soon as a booking request or confirmation fires.
            </p>
          ) : (
            <ul className="divide-y divide-sand-200 border border-sand-200 bg-white">
              {log.map((entry) => (
                <li key={entry.id} className="px-4 py-3 flex items-start gap-3">
                  <span
                    className={classNames(
                      'mt-0.5 shrink-0 text-[10px] uppercase tracking-wider px-2 py-0.5 border',
                      STATUS_STYLES[entry.status]
                    )}
                  >
                    {entry.status}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-charcoal-800">
                      {KIND_LABELS[entry.kind]}
                      <span className="text-charcoal-400"> · {entry.event.toLowerCase()}</span>
                    </p>
                    <p className="text-xs text-charcoal-400 truncate">
                      {entry.recipient || 'no recipient'} · {formatDate(entry.created_at, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                    {entry.detail && entry.status !== 'sent' && (
                      <p className="mt-1 text-xs text-charcoal-500 break-words">{entry.detail}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ReservationModal({
  houses, guests, reservation, onClose, onSaved,
}: {
  houses: HouseWithRelations[];
  guests: Guest[];
  reservation: Reservation | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!reservation;
  const [houseId, setHouseId] = useState(reservation?.house_id || '');
  const [guestId, setGuestId] = useState(reservation?.guest_id || '');
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestEmail, setNewGuestEmail] = useState('');
  const [newGuestPhone, setNewGuestPhone] = useState('');
  const [checkIn, setCheckIn] = useState(reservation?.check_in || '');
  const [checkOut, setCheckOut] = useState(reservation?.check_out || '');
  const [numGuests, setNumGuests] = useState(String(reservation?.num_guests || 1));
  const [source, setSource] = useState<BookingSource>(reservation?.source || 'MANUAL');
  const [status, setStatus] = useState<ReservationStatus>(reservation?.status || 'CONFIRMED');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(reservation?.payment_status || 'PENDING');
  const [totalAmount, setTotalAmount] = useState(reservation?.total_amount != null ? String(reservation.total_amount) : '');
  const [externalRef, setExternalRef] = useState(reservation?.external_reference || '');
  const [notes, setNotes] = useState(reservation?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedHouse = houses.find((h) => h.id === houseId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // ---- client-side validation -------------------------------------------
    if (!houseId) { setError('Please select a house.'); return; }
    if (!checkIn || !checkOut) { setError('Please select check-in and check-out dates.'); return; }
    if (checkOut <= checkIn) { setError('Check-out must be after check-in.'); return; }

    const guests_count = parseInt(numGuests, 10);
    if (Number.isNaN(guests_count) || guests_count < 1) {
      setError('Number of guests must be at least 1.');
      return;
    }
    if (selectedHouse && guests_count > selectedHouse.max_guests) {
      setError(`${selectedHouse.name} accommodates up to ${selectedHouse.max_guests} guest(s).`);
      return;
    }

    let finalGuestId: string | null = guestId || null;
    if (!finalGuestId) {
      if (!newGuestName.trim()) {
        setError('Select an existing guest or enter a new guest name.');
        return;
      }
      if (newGuestEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newGuestEmail.trim())) {
        setError('Please provide a valid guest email address (or leave it empty).');
        return;
      }
    }

    // ---- double-booking guard ---------------------------------------------
    try {
      const conflict = await findConflictingReservation(houseId, checkIn, checkOut, reservation?.id);
      if (conflict) {
        setError(
          `Those dates already have a booking: ${conflict.guest?.name || conflict.external_reference || 'another guest'} · ` +
          `${formatDateShort(conflict.check_in)} → ${formatDateShort(conflict.check_out)} ` +
          `(${conflict.status.toLowerCase().replace('_', ' ')}).`
        );
        return;
      }
      const block = await findConflictingBlock(houseId, checkIn, checkOut);
      if (block) {
        setError(`Those dates are blocked (${block.reason.toLowerCase().replace('_', ' ')} · ${block.start_date} → ${block.end_date}).`);
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not verify availability.');
      return;
    }

    // ---- save ---------------------------------------------------------------
    setSaving(true);
    try {
      const payload: Partial<Reservation> = {
        house_id: houseId,
        guest_id: finalGuestId,
        check_in: checkIn,
        check_out: checkOut,
        num_guests: guests_count,
        source,
        status,
        payment_status: paymentStatus,
        total_amount: totalAmount ? parseFloat(totalAmount) : null,
        external_reference: externalRef.trim() || null,
        notes: notes.trim() || null,
      };

      if (isEdit) {
        await updateReservation(reservation.id, payload);
      } else {
        if (!finalGuestId) {
          const newGuest = await createGuest({
            name: newGuestName.trim(),
            email: newGuestEmail.trim() || null,
            phone: newGuestPhone.trim() || null,
            preferred_communication: newGuestEmail.trim() ? 'EMAIL' : 'WHATSAPP',
          });
          finalGuestId = newGuest.id;
        }
        await createReservation({ ...payload, guest_id: finalGuestId });
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Failed to save reservation');
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = 'w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400';

  return (
    <div className="fixed inset-0 z-[100] bg-charcoal-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-sand-50 w-full max-w-lg p-6 sm:p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-light text-charcoal-900">
            {isEdit ? 'Edit Reservation' : 'New Reservation'}
          </h2>
          <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">House</label>
            <select required value={houseId} onChange={(e) => setHouseId(e.target.value)} className={fieldClass}>
              <option value="">Select house</option>
              {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            {selectedHouse && (
              <p className="mt-1.5 text-xs text-charcoal-400">
                Max {selectedHouse.max_guests} guest(s) · {formatPrice(selectedHouse.base_price, selectedHouse.currency)}/night
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Check-in</label>
              <input type="date" required value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Check-out</label>
              <input type="date" required value={checkOut} min={checkIn || undefined} onChange={(e) => setCheckOut(e.target.value)} className={fieldClass} />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Guest</label>
            <select value={guestId} onChange={(e) => setGuestId(e.target.value)} className={fieldClass}>
              <option value="">{isEdit ? 'No guest linked' : 'Select existing guest'}</option>
              {guests.map((g) => <option key={g.id} value={g.id}>{g.name}{g.email ? ` · ${g.email}` : ''}</option>)}
            </select>
            {!guestId && (
              <div className="mt-2 space-y-2">
                <input
                  type="text"
                  placeholder="New guest name (required)"
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  className={fieldClass}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="email"
                    placeholder="Guest email (optional)"
                    value={newGuestEmail}
                    onChange={(e) => setNewGuestEmail(e.target.value)}
                    className={fieldClass}
                  />
                  <input
                    type="text"
                    placeholder="Guest phone (optional)"
                    value={newGuestPhone}
                    onChange={(e) => setNewGuestPhone(e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Number of Guests</label>
              <input
                type="number"
                min={1}
                required
                value={numGuests}
                onChange={(e) => setNumGuests(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Total Amount (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder={selectedHouse ? String(Math.max(0, calculateNights(checkIn || formatDateISO(new Date()), checkOut || formatDateISO(new Date())) * selectedHouse.base_price)) : ''}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value as BookingSource)} className={fieldClass}>
                <option value="MANUAL">Manual</option>
                <option value="DIRECT">Direct</option>
                <option value="AIRBNB">Airbnb</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ReservationStatus)} className={fieldClass}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Payment</label>
              <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)} className={fieldClass}>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="PARTIAL">Partial</option>
                <option value="REFUNDED">Refunded</option>
                <option value="N/A">N/A</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Reference (Airbnb ID, etc.)</label>
            <input type="text" value={externalRef} onChange={(e) => setExternalRef(e.target.value)} className={fieldClass} />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Notes</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${fieldClass} resize-none`} />
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary disabled:opacity-50">
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
