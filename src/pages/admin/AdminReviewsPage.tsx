import { useEffect, useState } from 'react';
import { Star, Plus, X, Trash2, Eye, EyeOff, Pencil } from 'lucide-react';
import { fetchAllReviews, createReview, updateReview, deleteReview, fetchAllHousesWithRelations } from '@/services/dataService';
import type { Review, HouseWithRelations } from '@/types';
import { formatDateShort, getSourceLabel, classNames } from '@/lib/utils';

export function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [houses, setHouses] = useState<HouseWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);

  const loadData = () => {
    Promise.all([fetchAllReviews(), fetchAllHousesWithRelations({ includeInactive: true })])
      .then(([r, h]) => { setReviews(r); setHouses(h); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleTogglePublished = async (review: Review) => {
    try { await updateReview(review.id, { is_published: !review.is_published }); loadData(); }
    catch { alert('Failed to update review'); }
  };

  const handleToggleFeatured = async (review: Review) => {
    try { await updateReview(review.id, { is_featured: !review.is_featured }); loadData(); }
    catch { alert('Failed to update review'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this review?')) return;
    try {
      await deleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete review');
    }
  };

  if (loading) return <div className="h-96 skeleton" />;

  return (
    <div className="max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-light text-charcoal-900">Reviews</h1>
          <p className="text-sm text-charcoal-400 mt-1">{reviews.length} total · {reviews.filter(r => r.is_published).length} published</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="inline-flex items-center justify-center gap-2 bg-charcoal-900 text-sand-50 px-5 py-3 text-xs font-medium uppercase tracking-wider hover:bg-charcoal-800 transition-colors"
        >
          <Plus size={16} /> Add Review
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviews.map((review) => {
          const houseName = houses.find((h) => h.id === review.house_id)?.name;
          return (
            <div key={review.id} className={classNames('bg-white border p-6', review.is_published ? 'border-sand-200' : 'border-sand-200 opacity-60')}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-medium text-charcoal-900">{review.guest_name}</h3>
                  <p className="text-xs text-charcoal-400">{review.guest_display_name}</p>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <Star key={j} size={14} className="fill-gold-400 text-gold-400" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-charcoal-600 font-light italic mb-4 line-clamp-3">"{review.content}"</p>
              <div className="flex items-center gap-3 text-xs text-charcoal-400 mb-4">
                <span>{houseName || 'General'}</span>
                <span>·</span>
                <span>{getSourceLabel(review.source)}</span>
                {review.stay_date && <><span>·</span><span>{formatDateShort(review.stay_date)}</span></>}
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-sand-100">
                <button
                  onClick={() => handleTogglePublished(review)}
                  className={classNames(
                    'inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 transition-colors',
                    review.is_published ? 'text-sage-700 hover:bg-sage-50' : 'text-charcoal-400 hover:bg-charcoal-50'
                  )}
                >
                  {review.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
                  {review.is_published ? 'Published' : 'Hidden'}
                </button>
                <button
                  onClick={() => handleToggleFeatured(review)}
                  className={classNames(
                    'inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 transition-colors',
                    review.is_featured ? 'text-gold-700 hover:bg-gold-50' : 'text-charcoal-400 hover:bg-charcoal-50'
                  )}
                >
                  <Star size={14} className={review.is_featured ? 'fill-gold-400 text-gold-400' : ''} />
                  {review.is_featured ? 'Featured' : 'Feature'}
                </button>
                <button
                  onClick={() => { setEditing(review); setShowModal(true); }}
                  className="ml-auto text-charcoal-300 hover:text-charcoal-700 transition-colors"
                  aria-label="Edit review"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(review.id)}
                  className="text-charcoal-300 hover:text-red-600 transition-colors"
                  aria-label="Delete review"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {reviews.length === 0 && (
        <div className="py-12 text-center text-sm text-charcoal-400">No reviews yet.</div>
      )}

      {showModal && (
        <ReviewModal
          houses={houses}
          review={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadData(); }}
        />
      )}
    </div>
  );
}

function ReviewModal({ houses, review, onClose, onSaved }: {
  houses: HouseWithRelations[];
  review: Review | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!review;
  const [form, setForm] = useState({
    house_id: review?.house_id || '',
    guest_name: review?.guest_name || '',
    guest_display_name: review?.guest_display_name || '',
    rating: review?.rating || 5,
    content: review?.content || '',
    stay_date: review?.stay_date || '',
    source: (review?.source || 'AIRBNB') as Review['source'],
    is_featured: review?.is_featured || false,
    is_published: review?.is_published ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.guest_name.trim()) { setError('Guest name is required.'); return; }
    if (!form.content.trim()) { setError('Review content is required.'); return; }
    setSaving(true);
    try {
      const payload = {
        house_id: form.house_id || null,
        guest_name: form.guest_name.trim(),
        guest_display_name: form.guest_display_name.trim() || null,
        rating: form.rating,
        content: form.content.trim(),
        stay_date: form.stay_date || null,
        source: form.source,
        is_featured: form.is_featured,
        is_published: form.is_published,
      };
      if (isEdit) {
        await updateReview(review.id, payload);
      } else {
        await createReview(payload);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-charcoal-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-sand-50 w-full max-w-md p-6 sm:p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-light text-charcoal-900">{isEdit ? 'Edit Review' : 'Add Review'}</h2>
          <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-700"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">House</label>
            <select value={form.house_id} onChange={(e) => setForm({ ...form, house_id: e.target.value })} className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400">
              <option value="">General (no specific house)</option>
              {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Guest Name</label>
              <input type="text" required value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Display Name</label>
              <input type="text" value={form.guest_display_name} onChange={(e) => setForm({ ...form, guest_display_name: e.target.value })} placeholder="e.g. Emma · UK" className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Rating</label>
              <select value={form.rating} onChange={(e) => setForm({ ...form, rating: parseInt(e.target.value) })} className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400">
                {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} stars</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Source</label>
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as Review['source'] })} className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400">
                <option value="AIRBNB">Airbnb</option>
                <option value="DIRECT">Direct</option>
                <option value="GOOGLE">Google</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Stay Date</label>
            <input type="date" value={form.stay_date} onChange={(e) => setForm({ ...form, stay_date: e.target.value })} className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Review Content</label>
            <textarea rows={4} required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400 resize-none" />
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary disabled:opacity-50">{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Review'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
