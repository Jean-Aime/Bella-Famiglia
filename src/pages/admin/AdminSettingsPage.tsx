import { useEffect, useMemo, useState } from 'react';
import { Save, Check, Plus, Trash2 } from 'lucide-react';
import {
  fetchSettings, updateSetting, createSetting, deleteSetting,
  fetchPrivatePropertyDetails, savePrivatePropertyDetails,
} from '@/services/dataService';
import { classNames } from '@/lib/utils';
import type { PrivatePropertyDetails } from '@/types';

const settingGroups = [
  {
    category: 'brand',
    label: 'Brand',
    keys: ['brand_name', 'brand_tagline', 'brand_description', 'announcement'],
  },
  {
    category: 'contact',
    label: 'Contact & WhatsApp',
    keys: ['whatsapp_number', 'whatsapp_enabled', 'contact_email', 'contact_phone', 'host_name'],
  },
  {
    category: 'social',
    label: 'Social Links',
    keys: ['airbnb_profile_url', 'instagram_url', 'facebook_url'],
  },
  {
    category: 'policies',
    label: 'Policies',
    keys: [
      'check_in_time', 'check_out_time', 'check_in_window', 'check_out_window',
      'children_policy', 'extra_beds_policy', 'payment_policy', 'smoking_policy',
      'pets_policy', 'age_restriction', 'cancellation_policy', 'house_rules',
    ],
  },
  {
    category: 'location',
    label: 'Location',
    keys: [
      'public_address', 'address_disclosure', 'location_map_url', 'location_neighborhood',
      'location_airport_distance', 'location_city_center_distance', 'nearby_attractions',
    ],
  },
  {
    category: 'booking',
    label: 'Listing Details & Guest Questions',
    keys: [
      'show_public_price', 'property_size', 'bed_description', 'spoken_languages', 'breakfast_info',
      'airport_shuttle_info', 'restaurant_info', 'pool_spa_info', 'bathroom_info',
    ],
  },
];

const CUSTOM_CATEGORIES = ['general', 'brand', 'contact', 'social', 'booking', 'policies', 'location'];
const LONG_TEXT_KEYS = new Set([
  'brand_description', 'cancellation_policy', 'house_rules', 'announcement',
  'children_policy', 'extra_beds_policy', 'payment_policy', 'smoking_policy',
  'pets_policy', 'age_restriction', 'address_disclosure', 'nearby_attractions',
  'breakfast_info', 'airport_shuttle_info', 'restaurant_info', 'pool_spa_info',
  'bathroom_info',
]);
const TIME_KEYS = new Set(['check_in_time', 'check_out_time']);
const BOOLEAN_KEYS = new Set(['whatsapp_enabled', 'show_public_price']);

const labelFor = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [originalSettings, setOriginalSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [privateDetails, setPrivateDetails] = useState<PrivatePropertyDetails>({ street_address: '', contact_phone: '' });
  const [originalPrivateDetails, setOriginalPrivateDetails] = useState<PrivatePropertyDetails>({ street_address: '', contact_phone: '' });

  const loadData = () => {
    setLoadError(null);
    Promise.all([fetchSettings(), fetchPrivatePropertyDetails()])
      .then(([all, privateData]) => {
        const map: Record<string, string> = {};
        const catMap: Record<string, string> = {};
        all.forEach((s) => { map[s.key] = s.value; catMap[s.key] = s.category; });
        setSettings(map);
        setCategories(catMap);
        setOriginalSettings(map);
        setPrivateDetails(privateData);
        setOriginalPrivateDetails(privateData);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load settings'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const knownKeys = useMemo(() => new Set(settingGroups.flatMap((g) => g.keys)), []);
  const customSettings = useMemo(
    () => Object.keys(settings).filter((k) => !knownKeys.has(k)).sort(),
    [settings, knownKeys]
  );

  const handleChange = (key: string, value: string) => {
    setSettings({ ...settings, [key]: value });
    setSaved(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const changedKeys = Object.keys(settings).filter(
        (key) => Object.prototype.hasOwnProperty.call(originalSettings, key) && settings[key] !== originalSettings[key]
      );
      const newKeys = Object.keys(settings).filter(
        (key) => !Object.prototype.hasOwnProperty.call(originalSettings, key) && settings[key] !== ''
      );
      await Promise.all(changedKeys.map((key) => updateSetting(key, settings[key])));
      await Promise.all(newKeys.map((key) => {
        const group = settingGroups.find((g) => g.keys.includes(key));
        return createSetting({ key, value: settings[key], category: group?.category || categories[key] || 'general' });
      }));
      if (
        privateDetails.street_address !== originalPrivateDetails.street_address
        || privateDetails.contact_phone !== originalPrivateDetails.contact_phone
      ) {
        await savePrivatePropertyDetails(privateDetails);
        setOriginalPrivateDetails({ ...privateDetails });
      }
      setOriginalSettings({ ...settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setSaveError(e instanceof Error && e.message ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSetting = async (key: string, value: string, category: string) => {
    const cleanKey = key.trim();
    if (!cleanKey) { setSaveError('Setting key is required.'); return; }
    if (Object.prototype.hasOwnProperty.call(settings, cleanKey)) {
      setSaveError(`"${cleanKey}" already exists — edit it below.`);
      return;
    }
    setSaveError(null);
    try {
      await createSetting({ key: cleanKey, value, category });
      setSettings((prev) => ({ ...prev, [cleanKey]: value }));
      setCategories((prev) => ({ ...prev, [cleanKey]: category }));
      setOriginalSettings((prev) => ({ ...prev, [cleanKey]: value }));
      setShowAddForm(false);
    } catch (e) {
      setSaveError(e instanceof Error && e.message ? e.message : 'Failed to add setting');
    }
  };

  const handleDeleteSetting = async (key: string) => {
    if (!confirm(`Delete the setting "${key}"? Any code reading it will fall back to its default.`)) return;
    try {
      await deleteSetting(key);
      setSettings((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setOriginalSettings((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (e) {
      setSaveError(e instanceof Error && e.message ? e.message : 'Failed to delete setting');
    }
  };

  if (loading) return <div className="h-96 skeleton" />;

  const renderField = (key: string) => {
    const isLongText = LONG_TEXT_KEYS.has(key);
    const isBoolean = BOOLEAN_KEYS.has(key);
    const isTime = TIME_KEYS.has(key);
    const value = settings[key] ?? '';

    if (isBoolean) {
      return (
        <select
          value={value || 'false'}
          onChange={(e) => handleChange(key, e.target.value)}
          className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400"
        >
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </select>
      );
    }
    if (isLongText) {
      return (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => handleChange(key, e.target.value)}
          className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400 resize-none"
        />
      );
    }
    if (isTime) {
      return (
        <input
          type="time"
          value={value}
          onChange={(e) => handleChange(key, e.target.value)}
          className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400"
        />
      );
    }
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(key, e.target.value)}
        className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400"
      />
    );
  };

  return (
    <div className="max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-light text-charcoal-900">Settings</h1>
          <p className="text-sm text-charcoal-400 mt-1">Manage property information and configuration</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 bg-charcoal-900 text-sand-50 px-5 py-3 text-xs font-medium uppercase tracking-wider hover:bg-charcoal-800 transition-colors disabled:opacity-50"
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {loadError && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 flex items-center justify-between gap-4">
          <span>{loadError}</span>
          <button onClick={loadData} className="underline shrink-0">Retry</button>
        </div>
      )}

      {saveError && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{saveError}</div>
      )}

      <div className="space-y-8">
        {settingGroups.map((group) => (
          <div key={group.category} className="bg-white border border-sand-200 p-5 sm:p-6">
            <h2 className="text-sm font-medium uppercase tracking-wider text-charcoal-400 mb-6">{group.label}</h2>
            <div className="space-y-5">
              {group.keys.map((key) => (
                <div key={key}>
                  <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">{labelFor(key)}</label>
                  {renderField(key)}
                  {!Object.prototype.hasOwnProperty.call(originalSettings, key) && (
                    <p className="mt-1 text-[11px] text-gold-700">New setting — will be created when you save.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-white border border-sand-200 p-5 sm:p-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-charcoal-400 mb-2">Private booking contact</h2>
          <p className="text-xs leading-relaxed text-charcoal-400 mb-6">
            This address and phone are restricted to signed-in admins and included in the guest email only after a booking is confirmed.
          </p>
          <div className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Exact property address</label>
              <textarea
                rows={3}
                value={privateDetails.street_address}
                onChange={(e) => setPrivateDetails({ ...privateDetails, street_address: e.target.value })}
                className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400 resize-y"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-2">Guest contact phone</label>
              <input
                type="tel"
                value={privateDetails.contact_phone}
                onChange={(e) => setPrivateDetails({ ...privateDetails, contact_phone: e.target.value })}
                className="w-full border border-sand-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-charcoal-400"
              />
            </div>
            {(!privateDetails.street_address.trim() || !privateDetails.contact_phone.trim()) && (
              <p className="text-xs text-gold-700">
                Enter both details before confirming bookings so the confirmation email can include them.
              </p>
            )}
          </div>
        </div>

        {/* Custom / extra settings stored in the database */}
        <div className="bg-white border border-sand-200 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wider text-charcoal-400">Custom Settings</h2>
              <p className="text-xs text-charcoal-400 mt-1">Keys stored in the database outside the groups above.</p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-charcoal-700 border border-sand-200 px-3 py-2 hover:bg-sand-50 transition-colors"
            >
              <Plus size={14} /> Add Setting
            </button>
          </div>

          {showAddForm && (
            <AddSettingForm onAdd={handleAddSetting} onCancel={() => setShowAddForm(false)} />
          )}

          <div className="space-y-4">
            {customSettings.map((key) => (
              <div key={key} className="border border-sand-100 p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-charcoal-900 truncate">{key}</p>
                    <p className="text-[11px] uppercase tracking-wider text-charcoal-400">
                      {categories[key] || 'general'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteSetting(key)}
                    className="text-charcoal-300 hover:text-red-600 transition-colors shrink-0"
                    aria-label={`Delete ${key}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <input
                  type="text"
                  value={settings[key] ?? ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-full border border-sand-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-charcoal-400"
                />
                {settings[key] !== originalSettings[key] && (
                  <p className="mt-1 text-[11px] text-gold-700">Unsaved change</p>
                )}
              </div>
            ))}
            {customSettings.length === 0 && !showAddForm && (
              <p className="text-sm text-charcoal-400">No custom settings yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddSettingForm({ onAdd, onCancel }: { onAdd: (key: string, value: string, category: string) => void | Promise<void>; onCancel: () => void }) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState('general');
  const [adding, setAdding] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    await onAdd(key, value, category);
    setAdding(false);
  };

  return (
    <form onSubmit={submit} className="border border-dashed border-sand-300 p-4 space-y-3 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-1.5">Key</label>
          <input
            type="text"
            required
            placeholder="e.g. footer_note"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="w-full border border-sand-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-charcoal-400"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-1.5">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-sand-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-charcoal-400"
          >
            {CUSTOM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wider text-charcoal-400 mb-1.5">Value</label>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full border border-sand-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-charcoal-400"
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 border border-charcoal-200 text-xs uppercase tracking-wider text-charcoal-700 hover:bg-charcoal-100 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={adding} className={classNames(
          'px-4 py-2.5 bg-charcoal-900 text-sand-50 text-xs uppercase tracking-wider hover:bg-charcoal-800 transition-colors disabled:opacity-50',
          adding && 'opacity-50'
        )}>
          {adding ? 'Adding...' : 'Add Setting'}
        </button>
      </div>
    </form>
  );
}
