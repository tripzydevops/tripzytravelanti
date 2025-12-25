import React, { useState } from "react";
import {
  Plus,
  Trash2,
  MapPin,
  Globe,
  Compass,
  Sparkles,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { geocodeAddress } from "../lib/locationUtils";
import { useToast } from "../contexts/ToastContext";

interface StoreLocation {
  name: string;
  address: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

interface StoreLocationFieldsProps {
  redemptionStyle: ("online" | "in_store")[];
  storeLocations: StoreLocation[];
  onChange: (locations: StoreLocation[]) => void;
}

const StoreLocationFields: React.FC<StoreLocationFieldsProps> = ({
  redemptionStyle,
  storeLocations,
  onChange,
}) => {
  const { success: showSuccess, error: showError } = useToast();
  const [isGeocoding, setIsGeocoding] = useState<number | null>(null);

  const isOnlineOnly =
    redemptionStyle.includes("online") && !redemptionStyle.includes("in_store");
  const isInStore = redemptionStyle.includes("in_store");
  const isBoth =
    redemptionStyle.includes("online") && redemptionStyle.includes("in_store");

  const locations =
    storeLocations.length > 0
      ? storeLocations
      : [{ name: "", address: "", city: "" }];

  if (isOnlineOnly) {
    return (
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-xl group transition-all hover:bg-blue-500/15">
        <div className="flex items-center gap-3 text-blue-400">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-400/30 group-hover:scale-110 transition-transform">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight">
              Online Only
            </span>
            <p className="text-sm text-blue-400/60 mt-0.5">
              This deal can be redeemed online. No physical location needed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isInStore && !isOnlineOnly) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
        <p className="text-white/40 font-medium">
          Select a redemption style above to configure location options.
        </p>
      </div>
    );
  }

  const handleAddLocation = () => {
    onChange([...storeLocations, { name: "", address: "", city: "" }]);
  };

  const handleRemoveLocation = (index: number) => {
    const updated = storeLocations.filter((_, i) => i !== index);
    onChange(
      updated.length > 0 ? updated : [{ name: "", address: "", city: "" }]
    );
  };

  const handleLocationChange = (
    index: number,
    field: keyof StoreLocation,
    value: string | number
  ) => {
    const updated = locations.map((loc, i) =>
      i === index ? { ...loc, [field]: value } : loc
    );
    onChange(updated);
  };

  const handleFetchCoordinates = async (index: number) => {
    const loc = locations[index];
    if (!loc.address) {
      showError("Please enter an address first.");
      return;
    }

    setIsGeocoding(index);
    try {
      const coords = await geocodeAddress(loc.address, loc.city);
      if (coords) {
        const updated = locations.map((l, i) =>
          i === index
            ? { ...l, latitude: coords.lat, longitude: coords.lng }
            : l
        );
        onChange(updated);
        showSuccess("Coordinates fetched successfully!");
      } else {
        showError(
          "Could not find coordinates for this address. Please check the address and try again."
        );
      }
    } catch (err) {
      showError("Failed to fetch coordinates.");
    } finally {
      setIsGeocoding(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold-500/10 flex items-center justify-center border border-gold-500/20">
            <MapPin className="w-5 h-5 text-gold-400" />
          </div>
          <span className="font-bold text-white tracking-tight uppercase text-sm">
            Branch Locations
          </span>
        </div>
        {isBoth && (
          <div className="flex items-center gap-2 bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 text-[10px] font-black tracking-widest uppercase">
            <Globe className="w-3 h-3" />
            Also Online
          </div>
        )}
      </div>

      <div className="space-y-4">
        {locations.map((location, index) => (
          <div
            key={index}
            className="group relative bg-white/[0.03] border border-white/10 rounded-2xl p-6 transition-all hover:bg-white/[0.05] hover:border-white/20"
          >
            {/* Header with Remove Button */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white/30 uppercase tracking-widest">
                  Branch #{index + 1}
                </span>
                {location.latitude && location.longitude && (
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    COORDINATES VERIFIED
                  </div>
                )}
              </div>
              {locations.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveLocation(index)}
                  className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2 ml-1">
                  Store Name *
                </label>
                <input
                  type="text"
                  value={location.name}
                  onChange={(e) =>
                    handleLocationChange(index, "name", e.target.value)
                  }
                  placeholder="e.g., Luna Cafe - Taksim"
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/20 focus:ring-2 focus:ring-gold-500/50 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2 ml-1">
                  City
                </label>
                <input
                  type="text"
                  value={location.city || ""}
                  onChange={(e) =>
                    handleLocationChange(index, "city", e.target.value)
                  }
                  placeholder="e.g., Istanbul"
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/20 focus:ring-2 focus:ring-gold-500/50 outline-none transition-all"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2 ml-1">
                  Full Address *
                </label>
                <input
                  type="text"
                  value={location.address}
                  onChange={(e) =>
                    handleLocationChange(index, "address", e.target.value)
                  }
                  placeholder="e.g., Tomtom Mah. Istiklal Cad. No:1"
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/20 focus:ring-2 focus:ring-gold-500/50 outline-none transition-all"
                />
              </div>

              {/* Coordinate Section */}
              <div className="lg:col-span-3 pt-4 mt-2 border-t border-white/10">
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                  <div className="flex-1 w-full grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 ml-1">
                        Latitude (Auto)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={location.latitude || ""}
                        onChange={(e) =>
                          handleLocationChange(
                            index,
                            "latitude",
                            parseFloat(e.target.value)
                          )
                        }
                        placeholder="41.0082"
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm font-mono placeholder-white/10 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 ml-1">
                        Longitude (Auto)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={location.longitude || ""}
                        onChange={(e) =>
                          handleLocationChange(
                            index,
                            "longitude",
                            parseFloat(e.target.value)
                          )
                        }
                        placeholder="28.9784"
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm font-mono placeholder-white/10 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isGeocoding !== null}
                    onClick={() => handleFetchCoordinates(index)}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gold-500 text-black font-bold text-sm hover:bg-gold-400 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 whitespace-nowrap shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)]"
                  >
                    {isGeocoding === index ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {location.latitude
                      ? "Verify Again"
                      : "Auto-fill Coordinates"}
                  </button>
                </div>
                <p className="mt-3 text-[10px] text-white/30 font-medium italic flex items-center gap-1.5">
                  <Compass className="w-3 h-3" />
                  We use coordinates to show your location on maps and tell
                  users how far away you are.
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAddLocation}
        className="group w-full py-4 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center gap-2 text-white/40 font-bold hover:border-gold-500/50 hover:text-gold-400 hover:bg-gold-500/5 transition-all"
      >
        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
        Add Another Branch Location
      </button>
    </div>
  );
};

export default StoreLocationFields;
