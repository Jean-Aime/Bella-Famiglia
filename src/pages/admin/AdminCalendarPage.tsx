import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Pencil } from 'lucide-react';
import {
  fetchAllReservations, fetchAllAvailabilityBlocks, createAvailabilityBlock,
  updateAvailabilityBlock, deleteAvailabilityBlock, fetchAllHousesWithRelations,
  findConflictingReservation,
} from '@/services/dataService';
import type { Reservation, AvailabilityBlock, HouseWithRelations } from '@/types';
import { formatMonthYear, formatDateISO, formatDateShort, classNames } from '@/lib/utils';

export function AdminCalendarPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [houses, setHouses] = useState<HouseWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState<AvailabilityBlock | null>(null);
  const [blockHouseId, setBlockHouseId] = useState('');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('MAINTENANCE');
  const [blockError, setBlockError] = useState<string | null>(null);
  const [savingBlock, setSavingBlock] = useState(false);

  const loadData = () => {
    setLoadError(null);
    Promise.all([fetchAllReservations(), fetchAllAvailabilityBlocks(), fetchAllHousesWithRelations({ includeInactive: true })])
      .then(([r, b, h]) => { setReservations(r); setBlocks(b); setHouses(h); })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load calendar'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay();

  const days: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));

  const getReservationForDate = (houseId: string, date: Date): Reservation | undefined => {
    const dateStr = formatDateISO(date);
    return reservations.find((r) =>
      r.house_id === houseId &&
      r.status !== 'CANCELLED' &&
      new Date(r.check_in) <= new Date(dateStr) &&
      new Date(r.check_out) > new Date(dateStr)
    );
  };

  const getBlockForDate = (houseId: string, date: Date): AvailabilityBlock | undefined => {
    const dateStr = formatDateISO(date);
    return blocks.find((b) =>
      b.house_id === houseId &&
      new Date(b.start_date) <= new Date(dateStr) &&
      new Date(b.end_date) >= new Date(dateStr)
    );
  };

  const handlePrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlockError(null);
    if (blockEnd < blockStart) {
      setBlockError('End date must be on or after the start date.');
      return;
    }
    setSavingBlock(true);
    try {
      const conflict = await findConflictingReservation(blockHouseId, blockStart, blockEnd, editingBlock?.id);
      if (conflict) {
        setBlockError(
          `Those dates already have a booking (${conflict.guest?.name || conflict.external_reference || 'another guest'} · ` +
          `${formatDateShort(conflict.check_in)} → ${formatDateShort(conflict.check_out)}). ` +
          `Cancel or move the reservation first.`
        );
        return;
      }
      if (editingBlock) {
        await updateAvailabilityBlock(editingBlock.id, {
          house_id: blockHouseId,
          start_date: blockStart,
          end_date: blockEnd,
          reason: blockReason,
        });
      } else {
        await createAvailabilityBlock({
          house_id: blockHouseId,
          start_date: blockStart,
          end_date: blockEnd,
          reason: blockReason,
        });
      }
      closeBlockModal();
      loadData();
    } catch (e) {
      setBlockError(e instanceof Error && e.message ? e.message : 'Failed to save block');
    } finally {
      setSavingBlock(false);
    }
  };

  const openCreateBlock = () => {
    setEditingBlock(null);
    setBlockHouseId(houses[0]?.id || '');
    setBlockStart('');
    setBlockEnd('');
    setBlockReason('MAINTENANCE');
    setBlockError(null);
    setShowBlockModal(true);
  };

  const openEditBlock = (block: AvailabilityBlock) => {
    setEditingBlock(block);
    setBlockHouseId(block.house_id);
    setBlockStart(block.start_date);
    setBlockEnd(block.end_date);
    setBlockReason(block.reason);
    setBlockError(null);
    setShowBlockModal(true);
  };

  const closeBlockModal = () => {
    setShowBlockModal(false);
    setEditingBlock(null);
    setBlockError(null);
  };

  const handleDeleteBlock = async (id: string) => {
    if (!confirm('Remove this availability block?')) return;
    try {
      await deleteAvailabilityBlock(id);
      setBlocks((prev) => prev.filter((b) => b.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete block');
    }
  };

  if (loading) return <div className="h-96 skeleton" />;

  return (
    <div className="max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-light text-charcoal-900">Calendar</h1>
          <p className="text-sm text-charcoal-400 mt-1">View and manage availability for the house</p>
        </div>
        <button
          onClick={openCreateBlock}
          className="inline-flex items-center justify-center gap-2 bg-charcoal-900 text-sand-50 px-5 py-3 text-xs font-medium uppercase tracking-wider hover:bg-charcoal-800 transition-colors"
        >
          <Plus size={16} /> Block Dates
        </button>
      </div>

      {loadError && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 flex items-center justify-between gap-4">
          <span>{loadError}</span>
          <button onClick={loadData} className="underline shrink-0">Retry</button>
        </div>
      )}

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={handlePrevMonth} className="p-2 text-charcoal-400 hover:text-charcoal-900 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-lg font-display font-normal text-charcoal-900">{formatMonthYear(currentMonth)}</h2>
        <button onClick={handleNextMonth} className="p-2 text-charcoal-400 hover:text-charcoal-900 transition-colors">
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="space-y-6">
        {houses.map((house) => (
          <div key={house.id} className="bg-white border border-sand-200 p-4 md:p-6">
            <h3 className="text-sm font-medium text-charcoal-900 mb-4">{house.name}</h3>
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-[10px] uppercase tracking-wider text-charcoal-400 py-2">
                  {day}
                </div>
              ))}
              {days.map((date, i) => {
                if (!date) return <div key={i} />;
                const reservation = getReservationForDate(house.id, date);
                const block = getBlockForDate(house.id, date);
                const today = formatDateISO(new Date()) === formatDateISO(date);
                const isPast = date < new Date();

                return (
                  <div
                    key={i}
                    className={classNames(
                      'aspect-square text-xs p-1 md:p-2 border transition-colors',
                      today ? 'border-charcoal-900' : 'border-sand-100',
                      isPast && !reservation && !block ? 'bg-sand-50 text-charcoal-300' : 'bg-white',
                      reservation ? 'bg-sage-50 border-sage-200' : '',
                      block ? 'bg-charcoal-100 border-charcoal-300' : ''
                    )}
                  >
                    <span className={classNames(
                      'block text-center',
                      isPast && !reservation && !block ? 'text-charcoal-300' : 'text-charcoal-700'
                    )}>
                      {date.getDate()}
                    </span>
                    {reservation && (
                      <p className="text-[8px] md:text-[10px] text-sage-700 text-center mt-1 hidden md:block truncate">
                        {reservation.guest?.name?.split(' ')[0] || 'Booked'}
                      </p>
                    )}
                    {block && (
                      <p className="text-[8px] md:text-[10px] text-charcoal-500 text-center mt-1 hidden md:block truncate">
                        {block.reason.toLowerCase()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-charcoal-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-sage-50 border border-sage-200" /> Booked
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-charcoal-100 border border-charcoal-300" /> Blocked
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white border border-charcoal-900" /> Today
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-sand-50 border border-sand-100" /> Past / Available
        </div>
      </div>

      {/* Active blocks */}
      {blocks.length > 0 && (
        <div className="mt-8 bg-white border border-sand-200 p-6">
          <h3 className="text-sm font-medium uppercase tracking-wider text-charcoal-400 mb-4">Active Blocks</h3>
          <div className="space-y-2">
            {blocks.map((block) => (
              <div key={block.id} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-charcoal-50 border border-charcoal-100">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
                  <span className="text-sm text-charcoal-700">
                    {houses.find((h) => h.id === block.house_id)?.name || 'Unknown'}
                  </span>
                  <span className="text-xs text-charcoal-500">
                    {block.start_date} → {block.end_date}
                  </span>
                  <span className="text-xs text-charcoal-400 uppercase tracking-wider">{block.reason}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => openEditBlock(block)}
                    className="text-charcoal-300 hover:text-charcoal-700 transition-colors"
                    aria-label="Edit block"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteBlock(block.id)}
                    className="text-charcoal-300 hover:text-red-600 transition-colors"
                    aria-label="Delete block"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Block modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-[100] bg-charcoal-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeBlockModal}>
          <div className="bg-sand-50 w-full max-w-md p-6 sm:p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-light text-charcoal-900">{editingBlock ? 'Edit Block' : 'Block Dates'}</h2>
              <button onClick={closeBlockModal} className="text-charcoal-400 hover:text-charcoal-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateBlock} className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">House</label>
                <select required value={blockHouseId} onChange={(e) => setBlockHouseId(e.target.value)} className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400">
                  <option value="">Select house</option>
                  {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Start Date</label>
                  <input type="date" required value={blockStart} onChange={(e) => setBlockStart(e.target.value)} className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">End Date</label>
                  <input type="date" required value={blockEnd} min={blockStart} onChange={(e) => setBlockEnd(e.target.value)} className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Reason</label>
                <select value={blockReason} onChange={(e) => setBlockReason(e.target.value)} className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400">
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="OWNER_USE">Owner Use</option>
                  <option value="CLEANING">Cleaning</option>
                  <option value="HOLIDAY">Holiday</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              {blockError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{blockError}</div>}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button type="button" onClick={closeBlockModal} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" disabled={savingBlock} className="flex-1 btn-primary disabled:opacity-50">
                  {savingBlock ? 'Saving...' : editingBlock ? 'Save Changes' : 'Block Dates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
