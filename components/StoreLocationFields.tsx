import React from "react";
import { Plus, Trash2, MapPin, Globe } from "lucide-react";

interface StoreLocation {
  name: string;
  address: string;
  city?: string;
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
  const isOnlineOnly =
    redemptionStyle.includes("online") && !redemptionStyle.includes("in_store");
  const isInStore = redemptionStyle.includes("in_store");
  const isBoth =
    redemptionStyle.includes("online") && redemptionStyle.includes("in_store");

  // Online Only - Show badge
  if (isOnlineOnly) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
          <Globe className="w-5 h-5" />
          <span className="font-medium">Online Only</span>
        </div>
        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
          This deal can be redeemed online. No physical location needed.
        </p>
      </div>
    );
  }

  // No redemption style selected
  if (!isInStore && !isOnlineOnly) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
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
    value: string
  ) => {
    const updated = locations.map((loc, i) =>
      i === index ? { ...loc, [field]: value } : loc
    );
    onChange(updated);
  };

  // Ensure at least one empty location exists for in-store deals
  const locations =
    storeLocations.length > 0
      ? storeLocations
      : [{ name: "", address: "", city: "" }];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Store Locations
          </span>
        </div>
        {isBoth && (
          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
            Also available online
          </span>
        )}
      </div>

      {locations.map((location, index) => (
        <div
          key={index}
          className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Location {index + 1}
            </span>
            {locations.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveLocation(index)}
                className="text-red-500 hover:text-red-600 p-1"
                title="Remove location"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Store Name *
              </label>
              <input
                type="text"
                value={location.name}
                onChange={(e) =>
                  handleLocationChange(index, "name", e.target.value)
                }
                placeholder="e.g., Luna Cafe"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Address *
              </label>
              <input
                type="text"
                value={location.address}
                onChange={(e) =>
                  handleLocationChange(index, "address", e.target.value)
                }
                placeholder="e.g., 123 Main St"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                City
              </label>
              <input
                type="text"
                value={location.city || ""}
                onChange={(e) =>
                  handleLocationChange(index, "city", e.target.value)
                }
                placeholder="e.g., Istanbul"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={handleAddLocation}
        className="flex items-center gap-2 text-sm text-brand-primary hover:text-brand-primary/80 font-medium"
      >
        <Plus className="w-4 h-4" />
        Add Another Location
      </button>
    </div>
  );
};

export default StoreLocationFields;
