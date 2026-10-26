import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Home, Users, TrendingUp,
  ArrowRight, Clock, LogIn, LogOut,
} from 'lucide-react';
import { fetchAllReservations, fetchAllHousesWithRelations, fetchAllGuests } from '@/services/dataService';
import type { Reservation, HouseWithRelations, Guest } from '@/types';
import { formatDateShort, getStatusColor, getSourceLabel, formatPrice, classNames } from '@/lib/utils';

export function AdminDashboardPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [houses, setHouses] = useState<HouseWithRelations[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchAllReservations(), fetchAllHousesWithRelations({ includeInactive: true }), fetchAllGuests()])
      .then(([r, h, g]) => { setReservations(r); setHouses(h); setGuests(g); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const arrivals = reservations.filter((r) => r.check_in === today && r.status === 'CONFIRMED');
  const departures = reservations.filter((r) => r.check_out === today && r.status === 'CHECKED_IN');
  const currentGuests = reservations.filter((r) => r.status === 'CHECKED_IN');
  const occupiedHouses = new Set(currentGuests.map((r) => r.house_id)).size;
  const totalHouses = houses.length;

  const upcoming = reservations
    .filter((r) => new Date(r.check_in) >= new Date() && r.status !== 'CANCELLED' && r.status !== 'CHECKED_OUT')
    .sort((a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime())
    .slice(0, 6);

  const completedStays = reservations.filter((r) => r.status === 'CHECKED_OUT');
  const totalRevenue = completedStays.reduce((sum, r) => sum + (r.total_amount || 0), 0);
  const totalBookings = reservations.filter((r) => r.status !== 'CANCELLED' && r.status !== 'BLOCKED').length;

  const occupancyRate = totalHouses > 0
    ? Math.round((occupiedHouses / totalHouses) * 100)
    : 0;

  const avgNightlyRate = houses.length > 0
    ? houses.reduce((sum, h) => sum + h.base_price, 0) / houses.length
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 skeleton" />)}
        </div>
        <div className="h-96 skeleton" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-display font-light text-charcoal-900">Today's Overview</h1>
        <p className="text-sm text-charcoal-400 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
        {[
          { label: 'Arrivals Today', value: arrivals.length, icon: LogIn, color: 'text-sage-600' },
          { label: 'Departures Today', value: departures.length, icon: LogOut, color: 'text-clay-600' },
          { label: 'Current Guests', value: currentGuests.length, icon: Users, color: 'text-charcoal-700' },
          { label: 'Occupancy', value: `${occupancyRate}%`, icon: Home, color: 'text-gold-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-sand-200 p-5 md:p-6">
            <div className="flex items-start justify-between mb-3">
              <stat.icon size={20} className={stat.color} strokeWidth={1.5} />
            </div>
            <p className="text-2xl md:text-3xl font-display font-light text-charcoal-900">{stat.value}</p>
            <p className="text-xs uppercase tracking-wider text-charcoal-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="bg-white border border-sand-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-charcoal-400" strokeWidth={1.5} />
            <h2 className="text-sm font-medium uppercase tracking-wider text-charcoal-400">Performance</h2>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-baseline border-b border-sand-100 pb-3">
              <span className="text-sm text-charcoal-500">Total Revenue</span>
              <span className="text-lg font-display font-light text-charcoal-900">{formatPrice(totalRevenue)}</span>
            </div>
            <div className="flex justify-between items-baseline border-b border-sand-100 pb-3">
              <span className="text-sm text-charcoal-500">Total Bookings</span>
              <span className="text-lg font-display font-light text-charcoal-900">{totalBookings}</span>
            </div>
            <div className="flex justify-between items-baseline border-b border-sand-100 pb-3">
              <span className="text-sm text-charcoal-500">Avg. Nightly Rate</span>
              <span className="text-lg font-display font-light text-charcoal-900">{formatPrice(avgNightlyRate)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-charcoal-500">Total Guests</span>
              <span className="text-lg font-display font-light text-charcoal-900">{guests.length}</span>
            </div>
          </div>
        </div>

        {/* Arrivals/Departures today */}
        <div className="lg:col-span-2 bg-white border border-sand-200 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-charcoal-400 mb-4">Today's Activity</h2>
          {arrivals.length === 0 && departures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock size={32} className="text-sand-300 mb-3" strokeWidth={1} />
              <p className="text-sm text-charcoal-400">No arrivals or departures scheduled for today.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {arrivals.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-sage-50 border border-sage-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <LogIn size={16} className="text-sage-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-charcoal-900 truncate">{r.guest?.name || 'Guest'}</p>
                      <p className="text-xs text-charcoal-400 truncate">{r.house?.name} · {formatDateShort(r.check_in)} to {formatDateShort(r.check_out)}</p>
                    </div>
                  </div>
                  <span className="text-xs text-sage-700 uppercase tracking-wider shrink-0">Arriving</span>
                </div>
              ))}
              {departures.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-clay-50 border border-clay-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <LogOut size={16} className="text-clay-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-charcoal-900 truncate">{r.guest?.name || 'Guest'}</p>
                      <p className="text-xs text-charcoal-400 truncate">{r.house?.name}</p>
                    </div>
                  </div>
                  <span className="text-xs text-clay-700 uppercase tracking-wider shrink-0">Departing</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming reservations */}
      <div className="bg-white border border-sand-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-charcoal-400">Upcoming Reservations</h2>
          <Link to="/admin/reservations" className="text-xs text-charcoal-500 hover:text-charcoal-900 inline-flex items-center gap-1 transition-colors">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-charcoal-400 py-6 text-center">No upcoming reservations.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="border-b border-sand-200">
                  <th className="text-left text-xs uppercase tracking-wider text-charcoal-400 py-3 pr-4">Guest</th>
                  <th className="text-left text-xs uppercase tracking-wider text-charcoal-400 py-3 pr-4">House</th>
                  <th className="text-left text-xs uppercase tracking-wider text-charcoal-400 py-3 pr-4">Check-in</th>
                  <th className="text-left text-xs uppercase tracking-wider text-charcoal-400 py-3 pr-4">Check-out</th>
                  <th className="text-left text-xs uppercase tracking-wider text-charcoal-400 py-3 pr-4">Source</th>
                  <th className="text-left text-xs uppercase tracking-wider text-charcoal-400 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((r) => {
                  const statusColors = getStatusColor(r.status);
                  return (
                    <tr key={r.id} className="border-b border-sand-100 hover:bg-sand-50 transition-colors">
                      <td className="py-3 pr-4 text-charcoal-900">{r.guest?.name || '—'}</td>
                      <td className="py-3 pr-4 text-charcoal-600">{r.house?.name || '—'}</td>
                      <td className="py-3 pr-4 text-charcoal-600">{formatDateShort(r.check_in)}</td>
                      <td className="py-3 pr-4 text-charcoal-600">{formatDateShort(r.check_out)}</td>
                      <td className="py-3 pr-4 text-charcoal-600">{getSourceLabel(r.source)}</td>
                      <td className="py-3">
                        <span className={classNames('inline-block px-2.5 py-1 text-xs font-medium', statusColors.bg, statusColors.text)}>
                          {statusColors.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
