import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Target,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Deal } from '../../types';
import {
  getGeofenceZones,
  saveGeofenceZone,
  deleteGeofenceZone,
  toggleGeofenceZone,
  getDealsByPartnerPaginated,
} from '../../lib/supabaseService';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GeofenceZone {
  id: string;
  partner_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  deal_id?: string | null;
  deal_name?: string | null;
  created_at?: string;
}

interface PartnerDeal {
  id: string;
  title: string;
}

interface CreateFormState {
  name: string;
  latitude: string;
  longitude: string;
  radius_meters: number;
  deal_id: string;
}

const INITIAL_FORM: CreateFormState = {
  name: '',
  latitude: '',
  longitude: '',
  radius_meters: 500,
  deal_id: '',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const GeofencePage: React.FC = () => {
  const { user } = useAuth();
  const partnerId = user?.id ?? '';

  /* ---- local state ---- */
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateFormState>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ---- queries ---- */
  const {
    data: zones = [],
    isLoading: zonesLoading,
    refetch: refetchZones,
  } = useQuery<GeofenceZone[]>({
    queryKey: ['geofence-zones', partnerId],
    queryFn: () => getGeofenceZones(partnerId),
    enabled: !!partnerId,
  });

  const { data: dealsData } = useQuery<{ deals: Deal[]; total: number }>({
    queryKey: ['partner-deals-for-geofence', partnerId],
    queryFn: () => getDealsByPartnerPaginated(partnerId, 1, 100),
    enabled: !!partnerId,
  });

  const deals: PartnerDeal[] = dealsData?.deals ?? [];

  /* ---- helpers ---- */
  const flash = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  }, []);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setShowForm(false);
  };

  /* ---- mutations (manual useState pattern) ---- */
  const handleSave = async () => {
    if (!form.name.trim()) {
      flash('Zone name is required.');
      return;
    }
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      flash('Please enter valid latitude and longitude values.');
      return;
    }

    setSaving(true);
    try {
      await saveGeofenceZone({
        partner_id: partnerId,
        name: form.name.trim(),
        centroid_lat: lat,
        centroid_lng: lng,
        radius_meters: form.radius_meters,
        deal_id: form.deal_id || null,
      });
      resetForm();
      refetchZones();
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : 'Failed to save zone.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteGeofenceZone(id);
      refetchZones();
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : 'Failed to delete zone.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (zone: GeofenceZone) => {
    setTogglingId(zone.id);
    try {
      await toggleGeofenceZone(zone.id, !zone.is_active);
      refetchZones();
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : 'Failed to toggle zone.');
    } finally {
      setTogglingId(null);
    }
  };

  /* ---- render ---- */
  return (
    <div className="min-h-screen bg-brand-bg px-4 py-8 sm:px-6 lg:px-8">
      {/* ---- Toast Error ---- */}
      {error && (
        <div className="fixed top-6 right-6 z-50 max-w-sm rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-300 shadow-lg backdrop-blur-md animate-fade-in">
          {error}
        </div>
      )}

      {/* ---- Header ---- */}
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/20">
            <Target className="h-5 w-5 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Geofence Zones</h1>
            <p className="text-sm text-white/50">
              Define venue boundaries for scan validation
            </p>
          </div>
        </div>

        {/* ---- Info Banner ---- */}
        <div className="glass-premium mb-8 rounded-2xl border border-white/10 px-5 py-4">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-primary" />
            <p className="text-sm leading-relaxed text-white/60">
              Geofence enforcement is configured by the Tripzy admin on a
              per-vendor basis. You can define zones here, but whether scans are
              rejected outside these boundaries is controlled from the admin
              dashboard.
            </p>
          </div>
        </div>

        {/* ---- Actions Bar ---- */}
        <div className="mb-6 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-white/40">
            {zones.length} zone{zones.length !== 1 ? 's' : ''}
          </span>

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 active:scale-[0.97]"
            >
              <Plus className="h-4 w-4" />
              Create Zone
            </button>
          )}
        </div>

        {/* ---- Create Form (inline card) ---- */}
        {showForm && (
          <div className="glass-premium mb-8 rounded-2xl border border-brand-primary/30 p-6 animate-fade-in">
            <h2 className="mb-5 text-lg font-semibold text-white">
              New Geofence Zone
            </h2>

            <div className="grid gap-5 sm:grid-cols-2">
              {/* Zone Name */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-white/50">
                  Zone Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Entrance"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/30"
                />
              </div>

              {/* Deal Selector */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-white/50">
                  Link to Deal{' '}
                  <span className="text-white/30">(optional)</span>
                </label>
                <select
                  value={form.deal_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, deal_id: e.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/30"
                >
                  <option value="" className="bg-brand-bg">
                    — No deal linked —
                  </option>
                  {deals.map((d) => (
                    <option key={d.id} value={d.id} className="bg-brand-bg">
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Latitude */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="41.0082"
                  value={form.latitude}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, latitude: e.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/30"
                />
              </div>

              {/* Longitude */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="28.9784"
                  value={form.longitude}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, longitude: e.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/30"
                />
              </div>

              {/* Coordinate Hint */}
              <p className="text-xs text-white/30 sm:col-span-2">
                Tip: Copy coordinates from your store location settings or use
                the geocoding lookup in the Locations page.
              </p>

              {/* Radius Slider */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-white/50">
                  <span>Radius</span>
                  <span className="text-brand-primary">
                    {form.radius_meters}m
                  </span>
                </label>
                <input
                  type="range"
                  min={100}
                  max={2000}
                  step={50}
                  value={form.radius_meters}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      radius_meters: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-brand-primary"
                />
                <div className="mt-1 flex justify-between text-[10px] text-white/25">
                  <span>100 m</span>
                  <span>2 000 m</span>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
                {saving ? 'Saving…' : 'Save Zone'}
              </button>
              <button
                onClick={resetForm}
                disabled={saving}
                className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ---- Loading State ---- */}
        {zonesLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
          </div>
        )}

        {/* ---- Empty State ---- */}
        {!zonesLoading && zones.length === 0 && !showForm && (
          <div className="glass-premium flex flex-col items-center justify-center rounded-2xl border border-white/10 py-16 text-center">
            <Target className="mb-4 h-10 w-10 text-white/20" />
            <p className="text-sm text-white/40">
              No geofence zones defined yet.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-primary/20 px-4 py-2 text-sm font-medium text-brand-primary transition hover:bg-brand-primary/30"
            >
              <Plus className="h-4 w-4" />
              Create your first zone
            </button>
          </div>
        )}

        {/* ---- Zone Grid ---- */}
        {!zonesLoading && zones.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {zones.map((zone) => {
              const isDeleting = deletingId === zone.id;
              const isToggling = togglingId === zone.id;

              return (
                <div
                  key={zone.id}
                  className="glass-premium group relative rounded-2xl border border-white/10 p-5 transition hover:border-white/20"
                >
                  {/* Zone Name + Status */}
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-brand-primary" />
                      <h3 className="text-sm font-semibold text-white truncate">
                        {zone.name}
                      </h3>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(zone)}
                      disabled={isToggling}
                      title={zone.is_active ? 'Deactivate' : 'Activate'}
                      className="shrink-0 transition hover:opacity-80 disabled:opacity-40"
                    >
                      {isToggling ? (
                        <Loader2 className="h-5 w-5 animate-spin text-white/40" />
                      ) : zone.is_active ? (
                        <ToggleRight className="h-6 w-6 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-white/30" />
                      )}
                    </button>
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 text-xs text-white/50">
                    <div className="flex items-center justify-between">
                      <span>Radius</span>
                      <span className="font-medium text-white/70">
                        {zone.radius_meters}m
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      <span
                        className={`font-medium ${
                          zone.is_active
                            ? 'text-emerald-400'
                            : 'text-white/30'
                        }`}
                      >
                        {zone.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {zone.deal_name && (
                      <div className="flex items-center justify-between">
                        <span>Deal</span>
                        <span className="max-w-[140px] truncate font-medium text-brand-primary/80">
                          {zone.deal_name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Delete */}
                  <div className="mt-4 border-t border-white/5 pt-3">
                    <button
                      onClick={() => handleDelete(zone.id)}
                      disabled={isDeleting}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400/70 transition hover:text-red-400 disabled:opacity-40"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      {isDeleting ? 'Deleting…' : 'Delete zone'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default GeofencePage;
