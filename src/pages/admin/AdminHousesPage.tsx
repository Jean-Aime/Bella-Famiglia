import { useEffect, useRef, useState } from 'react';
import { Save, X, Plus, Trash2, ImagePlus, Star, Pencil, UploadCloud, Link2 } from 'lucide-react';
import {
  fetchAllHousesWithRelations, updateHouse, createHouse, deleteHouse, slugify,
  fetchAllAmenities, createAmenity, deleteAmenity, linkAmenity, unlinkAmenity,
  createHouseImage, deleteHouseImage, updateHouseImage, fetchProperty,
} from '@/services/dataService';
import type {
  HouseWithRelations, HouseStatus, Amenity, AmenityCategory, ImageCategory, HouseImage,
} from '@/types';
import { formatPrice, classNames } from '@/lib/utils';
import { parseImageLink, verifyRemoteImageLoads } from '@/lib/imageUrl';
import { uploadHouseImage, removeHouseImageUpload, rehostImageLink, validateImageFile } from '@/services/imageStorage';

const AMENITY_CATEGORIES: AmenityCategory[] = ['Comfort', 'Connectivity', 'Kitchen', 'Safety', 'Outdoor', 'Convenience'];
const IMAGE_CATEGORIES: ImageCategory[] = ['hero', 'exterior', 'bedroom', 'living_room', 'kitchen', 'bathroom', 'entrance', 'garden', 'detail', 'other'];

export function AdminHousesPage() {
  const [houses, setHouses] = useState<HouseWithRelations[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<HouseWithRelations>>({});
  const [saving, setSaving] = useState(false);
  const [saveFlash, setSaveFlash] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAmenityFor, setNewAmenityFor] = useState<string | null>(null);
  const [removeMode, setRemoveMode] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadData = () => {
    setLoadError(null);
    Promise.all([fetchAllHousesWithRelations({ includeInactive: true }), fetchAllAmenities()])
      .then(([h, a]) => { setHouses(h); setAmenities(a); })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load houses'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const startEdit = (house: HouseWithRelations) => {
    setEditingId(house.id);
    setEditForm({
      name: house.name, tagline: house.tagline, description: house.description,
      base_price: house.base_price, max_guests: house.max_guests,
      bedrooms: house.bedrooms, bathrooms: house.bathrooms,
      airbnb_listing_url: house.airbnb_listing_url, status: house.status,
      has_living_room: house.has_living_room, has_kitchen: house.has_kitchen,
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    if (!editForm.name?.trim()) { alert('House name is required.'); return; }
    if ((editForm.max_guests ?? 0) < 1) { alert('Max guests must be at least 1.'); return; }
    if ((editForm.base_price ?? 0) < 0) { alert('Price cannot be negative.'); return; }
    setSaving(true);
    try {
      await updateHouse(editingId, {
        ...editForm,
        name: editForm.name!.trim(),
        airbnb_listing_url: editForm.airbnb_listing_url?.trim() || null,
      });
      setEditingId(null);
      setSaveFlash(editingId);
      setTimeout(() => setSaveFlash(null), 2000);
      loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update house');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (house: HouseWithRelations) => {
    if (!confirm(
      `Delete "${house.name}"?\n\nThis permanently removes the house, its gallery, amenities and ALL of its reservations. This cannot be undone.`
    )) return;
    try {
      await deleteHouse(house.id);
      setHouses((prev) => prev.filter((h) => h.id !== house.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete house');
    }
  };

  const toggleAmenity = async (house: HouseWithRelations, amenity: Amenity) => {
    const linked = house.amenities.some((a) => a.id === amenity.id);
    setHouses((prev) => prev.map((h) => h.id === house.id
      ? { ...h, amenities: linked ? h.amenities.filter((a) => a.id !== amenity.id) : [...h.amenities, amenity] }
      : h));
    try {
      if (linked) await unlinkAmenity(house.id, amenity.id);
      else await linkAmenity(house.id, amenity.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update amenity');
      loadData();
    }
  };

  const handleAddAmenity = async (name: string, category: AmenityCategory) => {
    try {
      const created = await createAmenity({ name: name.trim(), category, icon_name: 'Check' });
      setAmenities((prev) => [...prev, created].sort((a, b) => a.category.localeCompare(b.category) || (a.sort_order ?? 0) - (b.sort_order ?? 0)));
      return created;
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add amenity');
      return null;
    }
  };

  const handleDeleteAmenity = async (amenity: Amenity) => {
    if (!confirm(`Delete "${amenity.name}" from the amenity library? It will be removed from every house.`)) return;
    try {
      await deleteAmenity(amenity.id);
      setAmenities((prev) => prev.filter((a) => a.id !== amenity.id));
      setHouses((prev) => prev.map((h) => ({ ...h, amenities: h.amenities.filter((a) => a.id !== amenity.id) })));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete amenity');
    }
  };

  /** Add by link: accepts https, Drive, Dropbox, site paths, data: and blob: URLs. */
  const handleAddImage = async (
    house: HouseWithRelations,
    input: { url: string; category: ImageCategory; alt_text: string },
  ): Promise<string | null> => {
    const parsed = parseImageLink(input.url);
    if (!parsed.ok) return parsed.reason;

    try {
      let finalUrl = parsed.url;

      // blob:/data: links only live in this browser session — re-host them
      // as real uploaded files so the gallery keeps working after reload.
      if (parsed.kind === 'blob' || parsed.kind === 'data') {
        try {
          const uploaded = await rehostImageLink(parsed.url, house.id, input.alt_text || 'pasted-image');
          finalUrl = uploaded.url;
        } catch (e) {
          return e instanceof Error ? e.message : 'Could not re-host that image.';
        }
      } else if (parsed.kind !== 'path') {
        // Confirm the link actually renders before saving it. Some hosts block
        // hotlinking, so the probe can be overridden.
        const loads = await verifyRemoteImageLoads(finalUrl);
        if (!loads && !confirm('That link did not load as an image in a quick check — it may be broken or block previews.\n\nSave it anyway?')) {
          return 'Not saved. Paste a direct image link or upload the file instead.';
        }
      }

      const nextSort = house.images.reduce((max, img) => Math.max(max, img.sort_order), -1) + 1;
      const created = await createHouseImage({
        house_id: house.id,
        url: finalUrl,
        category: input.category,
        alt_text: input.alt_text.trim() || house.name,
        sort_order: nextSort,
      });
      setHouses((prev) => prev.map((h) => (h.id === house.id ? { ...h, images: [...h.images, created] } : h)));
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Failed to add image';
    }
  };

  /** Upload one or more files: compresses client-side, then stores in gallery. */
  const handleUploadFiles = async (
    house: HouseWithRelations,
    files: File[],
    category: ImageCategory,
    altText: string,
    onProgress?: (done: number, total: number, name: string) => void,
  ): Promise<string[]> => {
    const errors: string[] = [];
    let done = 0;
    for (const file of files) {
      onProgress?.(done, files.length, file.name);
      try {
        const validation = validateImageFile(file);
        if (validation) throw new Error(validation);
        const uploaded = await uploadHouseImage(house.id, file);
        const created = await createHouseImage({
          house_id: house.id,
          url: uploaded.url,
          category,
          alt_text: altText.trim() || file.name.replace(/\.[^.]+$/, '') || house.name,
          sort_order: house.images.reduce((max, img) => Math.max(max, img.sort_order), -1) + 1 + done,
        });
        setHouses((prev) => prev.map((h) => (h.id === house.id ? { ...h, images: [...h.images, created] } : h)));
      } catch (e) {
        errors.push(`${file.name}: ${e instanceof Error ? e.message : 'upload failed'}`);
      }
      done += 1;
    }
    onProgress?.(done, files.length, '');
    return errors;
  };

  const handleDeleteImage = async (house: HouseWithRelations, image: HouseImage) => {
    if (!confirm('Remove this image from the gallery?')) return;
    try {
      await deleteHouseImage(image.id);
      void removeHouseImageUpload(image.url); // best-effort storage cleanup
      setHouses((prev) => prev.map((h) => (h.id === house.id ? { ...h, images: h.images.filter((i) => i.id !== image.id) } : h)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete image');
    }
  };

  const handleMakeHero = async (house: HouseWithRelations, image: HouseImage) => {
    const others = house.images.filter((i) => i.id !== image.id && i.category === 'hero');
    setHouses((prev) => prev.map((h) => h.id === house.id
      ? { ...h, images: h.images.map((i) => (i.id === image.id ? { ...i, category: 'hero' as ImageCategory } : (i.category === 'hero' ? { ...i, category: 'detail' as ImageCategory } : i))) }
      : h));
    try {
      await updateHouseImage(image.id, { category: 'hero' });
      await Promise.all(others.map((i) => updateHouseImage(i.id, { category: 'detail' })));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update hero image');
      loadData();
    }
  };

  if (loading) return <div className="h-96 skeleton" />;

  return (
    <div className="max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-light text-charcoal-900">Houses</h1>
          <p className="text-sm text-charcoal-400 mt-1">Manage property details, pricing, gallery, amenities, and Airbnb links</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 bg-charcoal-900 text-sand-50 px-5 py-3 text-xs font-medium uppercase tracking-wider hover:bg-charcoal-800 transition-colors"
        >
          <Plus size={16} /> New House
        </button>
      </div>

      {loadError && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 flex items-center justify-between gap-4">
          <span>{loadError}</span>
          <button onClick={loadData} className="underline shrink-0">Retry</button>
        </div>
      )}

      <div className="space-y-6">
        {houses.map((house) => {
          const isEditing = editingId === house.id;
          const heroImg = house.images.find((img) => img.category === 'hero') || house.images[0];
          const isExpanded = expanded === house.id;

          return (
            <div key={house.id} className="bg-white border border-sand-200 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-3">
                <div className="aspect-video md:aspect-auto md:h-full min-h-[180px] bg-charcoal-100">
                  {heroImg ? (
                    <img src={heroImg.url} alt={house.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-charcoal-400 text-xs uppercase tracking-wider">No image</div>
                  )}
                </div>
                <div className="md:col-span-2 p-5 sm:p-6 md:p-8">
                  {!isEditing ? (
                    <>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="min-w-0">
                          <h2 className="text-xl font-display font-normal text-charcoal-900 truncate">{house.name}</h2>
                          <p className="text-sm text-charcoal-400">{house.tagline}</p>
                        </div>
                        <span className={classNames(
                          'text-xs px-2.5 py-1 uppercase tracking-wider shrink-0',
                          house.status === 'ACTIVE' ? 'bg-sage-100 text-sage-700' :
                          house.status === 'MAINTENANCE' ? 'bg-gold-100 text-gold-800' :
                          'bg-charcoal-100 text-charcoal-500'
                        )}>
                          {house.status}
                        </span>
                      </div>
                      <p className="text-sm text-charcoal-600 font-light mb-4 line-clamp-2">{house.description}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                        <div><p className="text-xs text-charcoal-400">Guests</p><p className="text-sm font-medium text-charcoal-900">{house.max_guests}</p></div>
                        <div><p className="text-xs text-charcoal-400">Bedrooms</p><p className="text-sm font-medium text-charcoal-900">{house.bedrooms}</p></div>
                        <div><p className="text-xs text-charcoal-400">Bathrooms</p><p className="text-sm font-medium text-charcoal-900">{house.bathrooms}</p></div>
                        <div><p className="text-xs text-charcoal-400">Price/night</p><p className="text-sm font-medium text-charcoal-900">{formatPrice(house.base_price, house.currency)}</p></div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4">
                        <span className="text-xs text-charcoal-400">{house.amenities.length} amenities</span>
                        <span className="text-xs text-charcoal-400">{house.images.length} photos</span>
                        {house.airbnb_listing_url && (
                          <a href={house.airbnb_listing_url} target="_blank" rel="noreferrer" className="text-xs text-charcoal-500 underline hover:text-charcoal-800 truncate max-w-[240px]">
                            Airbnb listing
                          </a>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <button onClick={() => startEdit(house)} className="inline-flex items-center gap-1.5 text-sm text-charcoal-700 underline hover:text-charcoal-900 transition-colors">
                          <Pencil size={14} /> Edit details
                        </button>
                        <button
                          onClick={() => setExpanded(isExpanded ? null : house.id)}
                          className="text-sm text-charcoal-700 underline hover:text-charcoal-900 transition-colors"
                        >
                          {isExpanded ? 'Hide gallery & amenities' : 'Gallery & amenities'}
                        </button>
                        <button
                          onClick={() => handleDelete(house)}
                          className="ml-auto inline-flex items-center gap-1.5 text-xs text-charcoal-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                      {saveFlash === house.id && (
                        <p className="mt-3 text-xs text-sage-700">Saved.</p>
                      )}
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-1">Name</label>
                          <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full border border-sand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-charcoal-400" />
                        </div>
                        <div>
                          <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-1">Tagline</label>
                          <input type="text" value={editForm.tagline || ''} onChange={(e) => setEditForm({ ...editForm, tagline: e.target.value })} className="w-full border border-sand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-charcoal-400" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-1">Description</label>
                        <textarea rows={3} value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full border border-sand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-charcoal-400 resize-none" />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-1">Guests</label>
                          <input type="number" min={1} value={editForm.max_guests ?? 1} onChange={(e) => setEditForm({ ...editForm, max_guests: parseInt(e.target.value) || 1 })} className="w-full border border-sand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-charcoal-400" />
                        </div>
                        <div>
                          <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-1">Beds</label>
                          <input type="number" min={0} value={editForm.bedrooms ?? 0} onChange={(e) => setEditForm({ ...editForm, bedrooms: parseInt(e.target.value) || 0 })} className="w-full border border-sand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-charcoal-400" />
                        </div>
                        <div>
                          <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-1">Baths</label>
                          <input type="number" min={0} value={editForm.bathrooms ?? 0} onChange={(e) => setEditForm({ ...editForm, bathrooms: parseInt(e.target.value) || 0 })} className="w-full border border-sand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-charcoal-400" />
                        </div>
                        <div>
                          <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-1">Price</label>
                          <input type="number" step="0.01" min={0} value={editForm.base_price ?? 0} onChange={(e) => setEditForm({ ...editForm, base_price: parseFloat(e.target.value) || 0 })} className="w-full border border-sand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-charcoal-400" />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-6">
                        <label className="inline-flex items-center gap-2 text-sm text-charcoal-700">
                          <input type="checkbox" checked={!!editForm.has_living_room} onChange={(e) => setEditForm({ ...editForm, has_living_room: e.target.checked })} />
                          Living room
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-charcoal-700">
                          <input type="checkbox" checked={!!editForm.has_kitchen} onChange={(e) => setEditForm({ ...editForm, has_kitchen: e.target.checked })} />
                          Kitchen
                        </label>
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-1">Airbnb URL</label>
                        <input type="text" value={editForm.airbnb_listing_url || ''} onChange={(e) => setEditForm({ ...editForm, airbnb_listing_url: e.target.value })} className="w-full border border-sand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-charcoal-400" />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-1">Status</label>
                        <select value={editForm.status || 'ACTIVE'} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as HouseStatus })} className="w-full border border-sand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-charcoal-400">
                          <option value="ACTIVE">Active</option>
                          <option value="MAINTENANCE">Maintenance</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button onClick={() => setEditingId(null)} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-charcoal-200 text-xs uppercase tracking-wider text-charcoal-700 hover:bg-charcoal-100 transition-colors">
                          <X size={14} /> Cancel
                        </button>
                        <button onClick={handleSave} disabled={saving} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-charcoal-900 text-sand-50 text-xs uppercase tracking-wider hover:bg-charcoal-800 transition-colors disabled:opacity-50">
                          <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Expandable: gallery + amenities */}
              {isExpanded && (
                <div className="border-t border-sand-200 p-5 sm:p-6 md:p-8 space-y-8 bg-sand-50">
                  {/* Gallery */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <ImagePlus size={16} className="text-charcoal-400" />
                      <h3 className="text-sm font-medium uppercase tracking-wider text-charcoal-400">Gallery ({house.images.length})</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                      {house.images.map((img) => (
                        <div key={img.id} className="group relative border border-sand-200 bg-white overflow-hidden">
                          <img src={img.url} alt={img.alt_text || house.name} className="w-full h-24 object-cover" />
                          <div className="absolute inset-x-0 bottom-0 bg-charcoal-950/70 text-sand-50 text-[10px] uppercase tracking-wider px-2 py-1 flex items-center justify-between gap-2">
                            <span className="truncate">{img.category}</span>
                            {img.category === 'hero' ? (
                              <span className="inline-flex items-center gap-1 text-gold-300 shrink-0"><Star size={10} className="fill-gold-300" /> Hero</span>
                            ) : (
                              <button onClick={() => handleMakeHero(house, img)} className="shrink-0 hover:text-gold-300" title="Make hero image">Make hero</button>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteImage(house, img)}
                            className="absolute top-1.5 right-1.5 bg-white/90 text-charcoal-500 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            aria-label="Delete image"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                      {house.images.length === 0 && (
                        <p className="col-span-full text-sm text-charcoal-400 py-4">No images yet.</p>
                      )}
                    </div>
                    <AddImageForm
                      onAdd={(input) => handleAddImage(house, input)}
                      onUpload={(files, cat, altText, onProgress) => handleUploadFiles(house, files, cat, altText, onProgress)}
                    />
                  </div>

                  {/* Amenities */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <h3 className="text-sm font-medium uppercase tracking-wider text-charcoal-400">Amenities ({house.amenities.length})</h3>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setNewAmenityFor(newAmenityFor === house.id ? null : house.id)}
                          className="text-xs text-charcoal-600 underline hover:text-charcoal-900"
                        >
                          {newAmenityFor === house.id ? 'Cancel' : '+ New amenity'}
                        </button>
                        <button
                          onClick={() => { setRemoveMode(!removeMode); setNewAmenityFor(null); }}
                          className={classNames(
                            'text-xs underline transition-colors',
                            removeMode ? 'text-red-600' : 'text-charcoal-400 hover:text-charcoal-700'
                          )}
                        >
                          {removeMode ? 'Done removing' : 'Remove from library'}
                        </button>
                      </div>
                    </div>

                    {newAmenityFor === house.id && (
                      <NewAmenityForm
                        onCreate={async (name, category) => {
                          const created = await handleAddAmenity(name, category);
                          if (created) {
                            setNewAmenityFor(null);
                            await toggleAmenity(house, created);
                          }
                        }}
                      />
                    )}

                    <div className="space-y-3">
                      {AMENITY_CATEGORIES.map((cat) => {
                        const inCategory = amenities.filter((a) => a.category === cat);
                        if (inCategory.length === 0) return null;
                        return (
                          <div key={cat}>
                            <p className="text-[10px] uppercase tracking-wider text-charcoal-400 mb-1.5">{cat}</p>
                            <div className="flex flex-wrap gap-2">
                              {inCategory.map((a) => {
                                const linked = house.amenities.some((x) => x.id === a.id);
                                if (removeMode) {
                                  return (
                                    <button
                                      key={a.id}
                                      onClick={() => handleDeleteAmenity(a)}
                                      className="text-xs px-3 py-1.5 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                                      title="Remove from amenity library"
                                    >
                                      {a.name} ×
                                    </button>
                                  );
                                }
                                return (
                                  <button
                                    key={a.id}
                                    onClick={() => toggleAmenity(house, a)}
                                    className={classNames(
                                      'text-xs px-3 py-1.5 border transition-colors',
                                      linked
                                        ? 'bg-charcoal-900 text-sand-50 border-charcoal-900'
                                        : 'bg-white text-charcoal-500 border-sand-200 hover:border-charcoal-400'
                                    )}
                                  >
                                    {a.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {houses.length === 0 && !loadError && (
        <div className="py-16 text-center text-sm text-charcoal-400">No houses yet. Create your first one.</div>
      )}

      {showCreateModal && (
        <CreateHouseModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); loadData(); }}
        />
      )}
    </div>
  );
}

function AddImageForm({
  onAdd,
  onUpload,
}: {
  onAdd: (input: { url: string; category: ImageCategory; alt_text: string }) => Promise<string | null>;
  onUpload: (
    files: File[],
    category: ImageCategory,
    altText: string,
    onProgress?: (done: number, total: number, name: string) => void,
  ) => Promise<string[]>;
}) {
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<ImageCategory>('detail');
  const [alt, setAlt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<{ done: number; total: number; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live hint about what kind of link was pasted (Drive → direct, etc.).
  const parsed = url.trim() ? parseImageLink(url) : null;
  const linkHint = parsed && parsed.ok && parsed.label !== 'Image link' ? parsed.label : null;

  const uploadFiles = async (files: File[]) => {
    const images = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (images.length === 0) {
      setError('Drop image files only (JPEG, PNG, WebP, GIF, SVG…).');
      return;
    }
    setError(null);
    setNotice(null);
    setUploading({ done: 0, total: images.length, name: images[0].name });
    try {
      const errors = await onUpload(images, category, alt, (done, total, name) => {
        setUploading(done >= total ? null : { done, total, name });
      });
      const added = images.length - errors.length;
      if (errors.length > 0) {
        setError(errors.join('\n'));
      }
      if (added > 0) {
        setNotice(`Added ${added} photo${added === 1 ? '' : 's'}.`);
      }
    } finally {
      setUploading(null);
    }
  };

  const submitLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSaving(true);
    const result = await onAdd({ url, category, alt_text: alt });
    setSaving(false);
    if (result) {
      setError(result);
    } else {
      setNotice(linkHint ? `Added — ${linkHint.toLowerCase()}.` : 'Photo added.');
      setUrl('');
    }
  };

  return (
    <div className="border border-dashed border-sand-300 bg-white p-4 space-y-4">
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length > 0 && !uploading) void uploadFiles(Array.from(e.dataTransfer.files));
        }}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
        aria-label="Upload photos"
        className={classNames(
          'flex flex-col items-center justify-center gap-1.5 px-4 py-7 border transition-colors cursor-pointer text-center',
          dragging ? 'border-charcoal-800 bg-charcoal-50' : 'border-sand-200 hover:border-charcoal-400',
        )}
      >
        <UploadCloud size={20} className={dragging ? 'text-charcoal-700' : 'text-charcoal-300'} />
        {uploading ? (
          <p className="text-xs text-charcoal-600">
            Uploading {uploading.done + 1} of {uploading.total} — {uploading.name}
          </p>
        ) : (
          <>
            <p className="text-sm text-charcoal-600">
              Drag photos here, or <span className="underline">browse files</span>
            </p>
            <p className="text-xs text-charcoal-400">JPEG · PNG · WebP · GIF · SVG — auto-compressed, multiple files OK</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0 && !uploading) void uploadFiles(Array.from(files));
            e.target.value = '';
          }}
        />
      </div>

      {/* Or add by link */}
      <form onSubmit={submitLink} className="space-y-3">
        <p className="text-xs uppercase tracking-wider text-charcoal-400">Or add by link</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            required
            placeholder="https://… · Drive · Dropbox · /images/photo.jpg · paste from clipboard"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPaste={(e) => {
              // Pasted screenshot / copied image file → treat it as an upload.
              const files = Array.from(e.clipboardData.files || []);
              if (files.length > 0 && !uploading) {
                e.preventDefault();
                void uploadFiles(files);
              }
            }}
            className="flex-1 border border-sand-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-charcoal-400"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ImageCategory)}
            className="border border-sand-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-charcoal-400"
          >
            {IMAGE_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
          <button type="submit" disabled={saving || !!uploading} className="inline-flex items-center justify-center gap-2 bg-charcoal-900 text-sand-50 px-4 py-2.5 text-xs uppercase tracking-wider hover:bg-charcoal-800 transition-colors disabled:opacity-50">
            <Plus size={14} /> {saving ? 'Adding...' : 'Add'}
          </button>
        </div>
        {linkHint && (
          <p className="text-xs text-charcoal-400 flex items-center gap-1.5">
            <Link2 size={11} /> {linkHint}
          </p>
        )}
        <input
          type="text"
          placeholder="Alt text (optional, for accessibility) — applies to the link above and uploaded photos"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          className="w-full border border-sand-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-charcoal-400"
        />
      </form>

      {notice && <p className="text-xs text-sage-700">{notice}</p>}
      {error && <p className="text-xs text-red-600 whitespace-pre-line">{error}</p>}
    </div>
  );
}

function NewAmenityForm({ onCreate }: { onCreate: (name: string, category: AmenityCategory) => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AmenityCategory>('Comfort');

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (name.trim()) onCreate(name.trim(), category); }}
      className="flex flex-col sm:flex-row gap-2 mb-4 border border-dashed border-sand-300 bg-white p-3"
    >
      <input
        type="text"
        required
        placeholder="Amenity name (e.g. Air conditioning)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 border border-sand-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-charcoal-400"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as AmenityCategory)}
        className="border border-sand-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-charcoal-400"
      >
        {AMENITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <button type="submit" className="inline-flex items-center justify-center gap-2 bg-charcoal-900 text-sand-50 px-4 py-2.5 text-xs uppercase tracking-wider hover:bg-charcoal-800 transition-colors">
        <Plus size={14} /> Add
      </button>
    </form>
  );
}

function CreateHouseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [tagline, setTagline] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [maxGuests, setMaxGuests] = useState('2');
  const [bedrooms, setBedrooms] = useState('1');
  const [bathrooms, setBathrooms] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveSlug = slug || slugify(name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('House name is required.'); return; }
    if (!effectiveSlug) { setError('Could not generate a slug from the name.'); return; }
    const price = parseFloat(basePrice);
    if (Number.isNaN(price) || price < 0) { setError('Enter a valid nightly price.'); return; }

    setSaving(true);
    try {
      const property = await fetchProperty();
      if (!property) { setError('No active property found — run setup.sql first.'); return; }
      await createHouse({
        property_id: property.id,
        name: name.trim(),
        slug: effectiveSlug,
        tagline: tagline.trim() || null,
        base_price: price,
        max_guests: parseInt(maxGuests, 10) || 2,
        bedrooms: parseInt(bedrooms, 10) || 1,
        bathrooms: parseInt(bathrooms, 10) || 1,
        status: 'ACTIVE',
      });
      onCreated();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create house';
      setError(msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('slug') ? 'That slug already exists — pick a different name.' : msg);
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = 'w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400';

  return (
    <div className="fixed inset-0 z-[100] bg-charcoal-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-sand-50 w-full max-w-lg p-6 sm:p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-light text-charcoal-900">New House</h2>
          <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-700"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} placeholder="The Garden Suite" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">URL Slug</label>
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className={fieldClass} placeholder={effectiveSlug || 'auto-generated'} />
            <p className="mt-1.5 text-xs text-charcoal-400">Leave blank to generate from the name.</p>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Tagline</label>
            <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} className={fieldClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Price / night (USD)</label>
              <input type="number" step="0.01" min="0" required value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Max guests</label>
              <input type="number" min="1" required value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Bedrooms</label>
              <input type="number" min="0" required value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Bathrooms</label>
              <input type="number" min="0" required value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className={fieldClass} />
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary disabled:opacity-50">
              {saving ? 'Creating...' : 'Create House'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
