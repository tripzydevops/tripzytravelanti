import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { createDeal, getDealById, updateDeal } from "../../lib/supabaseService";
import { SubscriptionTier, Deal } from "../../types";
import { ArrowLeft, Save, Info, Settings, ChevronDown, ChevronUp } from "lucide-react";
import ImageUpload from "../../components/ImageUpload";
import StoreLocationFields from "../../components/StoreLocationFields";
import CountrySelector from "../../components/CountrySelector";
import { useLanguage } from "../../contexts/LanguageContext";
import { useDeals } from "../../contexts/DealContext";
import {
  getDiscountTypeOptions,
  getTimeTypeOptions,
  getDiscountTypeConfig,
  getTimeTypeConfig,
  DealDiscountType,
  DealTimeType,
  DEFAULT_DEAL_VALUES,
} from "../../shared/dealTypes";
import { generateRedemptionCode } from "../../lib/codeGenerator";
import useDebounce from "../../hooks/useDebounce";
import { generateText } from "../../lib/vectorService";

const CreateDealPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { categories, categoriesLoading } = useDeals();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [neverExpires, setNeverExpires] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTranslations, setShowTranslations] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    title_tr: "",
    description: "",
    description_tr: "",
    imageUrl: "",
    companyLogoUrl: "",
    category: "Dining",
    category_tr: "Yemek",
    dealTypeKey: DEFAULT_DEAL_VALUES.discountType,
    timeType: DEFAULT_DEAL_VALUES.timeType,
    originalPrice: "",
    discountedPrice: "",
    discountPercentage: "",
    requiredTier: SubscriptionTier.FREE,
    isExternal: false,
    vendor: user?.name || "",
    expiresAt: "",
    usageLimit: DEFAULT_DEAL_VALUES.usageLimit,
    usageLimit_tr: DEFAULT_DEAL_VALUES.usageLimit_tr,
    validity: DEFAULT_DEAL_VALUES.validity,
    validity_tr: DEFAULT_DEAL_VALUES.validity_tr,
    termsUrl: "",
    redemptionCode: "",
    redemptionStyle: [] as ("online" | "in_store")[],
    storeLocations: [] as { name: string; address: string; city?: string }[],
    countries: [] as string[],
    is_flash_deal: false,
    flash_end_time: "",
    maxRedemptionsTotal: "" as string | number,
    maxRedemptionsUser: "" as string | number,
  });

  const debouncedTitle = useDebounce(formData.title, 800);
  const debouncedDescription = useDebounce(formData.description, 800);

  // Auto-translate Title
  useEffect(() => {
    const translate = async () => {
      if (debouncedTitle && !isEditing && !formData.title_tr) {
        try {
          const tr = await generateText(`Translate this short title to Turkish. Return ONLY the translated string: ${debouncedTitle}`);
          setFormData((prev) => ({ ...prev, title_tr: tr.replace(/^["']|["']$/g, '') }));
        } catch (err) {
          console.error("Translation error:", err);
        }
      }
    };
    translate();
  }, [debouncedTitle, isEditing]);

  // Auto-translate Description
  useEffect(() => {
    const translate = async () => {
      if (debouncedDescription && !isEditing && !formData.description_tr) {
        try {
          const tr = await generateText(`Translate this description to Turkish. Return ONLY the translated string: ${debouncedDescription}`);
          setFormData((prev) => ({ ...prev, description_tr: tr.replace(/^["']|["']$/g, '') }));
        } catch (err) {
          console.error("Translation error:", err);
        }
      }
    };
    translate();
  }, [debouncedDescription, isEditing]);

  const dealTypeConfig = getDiscountTypeConfig(formData.dealTypeKey);
  const timeTypeConfig = getTimeTypeConfig(formData.timeType);

  useEffect(() => {
    const fetchDeal = async () => {
      if (id) {
        try {
          setLoading(true);
          const deal = await getDealById(id);
          if (deal) {
            setFormData({
              title: deal.title,
              title_tr: deal.title_tr,
              description: deal.description,
              description_tr: deal.description_tr,
              imageUrl: deal.imageUrl,
              companyLogoUrl: deal.companyLogoUrl || "",
              category: deal.category,
              category_tr: deal.category_tr,
              dealTypeKey: deal.dealTypeKey || "percentage_off",
              timeType: deal.timeType || "standard",
              originalPrice: deal.originalPrice ? deal.originalPrice.toString() : "",
              discountedPrice: deal.discountedPrice ? deal.discountedPrice.toString() : "",
              discountPercentage: deal.discountPercentage ? deal.discountPercentage.toString() : "",
              requiredTier: deal.requiredTier,
              isExternal: deal.isExternal,
              vendor: deal.vendor,
              expiresAt: deal.expiresAt
                ? new Date(deal.expiresAt).toISOString().split("T")[0]
                : "",
              usageLimit: deal.usageLimit,
              usageLimit_tr: deal.usageLimit_tr,
              validity: deal.validity,
              validity_tr: deal.validity_tr,
              termsUrl: deal.termsUrl,
              redemptionCode: deal.redemptionCode,
              redemptionStyle: deal.redemptionStyle || [],
              storeLocations: deal.storeLocations || [],
              countries: deal.countries || [],
              is_flash_deal: deal.is_flash_deal || false,
              flash_end_time: deal.flash_end_time || "",
              maxRedemptionsTotal: deal.maxRedemptionsTotal || "",
              maxRedemptionsUser: deal.maxRedemptionsUser || "",
            });

            if (deal.expiresAt) {
              const expiryDate = new Date(deal.expiresAt);
              const now = new Date();
              if (expiryDate.getFullYear() > now.getFullYear() + 50) {
                setNeverExpires(true);
              }
            }
          }
        } catch (err) {
          console.error("Error fetching deal:", err);
          setError("Failed to load deal details.");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchDeal();
  }, [id]);

  useEffect(() => {
    const errors: string[] = [];
    const original = parseFloat(formData.originalPrice);
    const discounted = parseFloat(formData.discountedPrice);
    const percentage = parseFloat(formData.discountPercentage);

    if (formData.dealTypeKey === "custom") {
      setValidationErrors([]);
      return;
    }

    if (!isNaN(original) && original < 0) {
      errors.push("Original price cannot be negative");
    }
    if (!isNaN(discounted) && discounted < 0) {
      errors.push("Discounted price cannot be negative");
    }
    if (!isNaN(original) && !isNaN(discounted) && original > 0 && discounted >= original) {
      errors.push("Discounted price must be lower than original price");
    }
    if (!isNaN(percentage) && percentage > 100) {
      errors.push("Discount cannot exceed 100%");
    }
    if (!isNaN(percentage) && percentage < 0) {
      errors.push("Discount cannot be negative");
    }

    setValidationErrors(errors);
  }, [
    formData.originalPrice,
    formData.discountedPrice,
    formData.discountPercentage,
    formData.dealTypeKey,
  ]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => {
        const updated = { ...prev, [name]: value };

        if (name === "dealTypeKey") {
          const newType = value as DealDiscountType;
          if (newType === "percentage_off" && !updated.originalPrice) {
            updated.originalPrice = "100";
            updated.discountPercentage = "20";
            updated.discountedPrice = "80";
          } else if (newType === "bogo") {
            updated.discountPercentage = "50";
          } else if (newType === "fixed_price") {
            updated.originalPrice = "";
            updated.discountPercentage = "";
          }
        }

        if (name === "timeType") {
          const newTimeConfig = getTimeTypeConfig(value as DealTimeType);
          if (newTimeConfig) {
            updated.is_flash_deal = newTimeConfig.key === "flash";
            if (newTimeConfig.defaultValidity) {
              updated.validity = newTimeConfig.defaultValidity;
              updated.validity_tr = newTimeConfig.defaultValidity_tr || updated.validity;
            }
          }
        }

        if (name === "category") {
          const selectedCat = categories.find((c) => c.name === value);
          if (selectedCat) {
            updated.category_tr = selectedCat.name_tr || value;
          }
        }

        if (name === "originalPrice") {
          const original = parseFloat(value);
          const discount = parseFloat(updated.discountPercentage);
          const discounted = parseFloat(updated.discountedPrice);

          if (!isNaN(original)) {
            if (!isNaN(discount) && discount > 0) {
              updated.discountedPrice = (original * (1 - discount / 100)).toFixed(2);
            } else if (!isNaN(discounted)) {
              updated.discountPercentage = (((original - discounted) / original) * 100).toFixed(0);
            }
          }
        } else if (name === "discountedPrice") {
          const discounted = parseFloat(value);
          const original = parseFloat(updated.originalPrice);
          if (!isNaN(discounted) && !isNaN(original) && original > 0) {
            updated.discountPercentage = (((original - discounted) / original) * 100).toFixed(0);
          }
        } else if (name === "discountPercentage") {
          const discount = parseFloat(value);
          const original = parseFloat(updated.originalPrice);
          if (!isNaN(discount) && !isNaN(original) && original > 0) {
            updated.discountedPrice = (original * (1 - discount / 100)).toFixed(2);
          }
        }

        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    const original = parseFloat(formData.originalPrice);
    const discounted = parseFloat(formData.discountedPrice);
    const percentage = parseFloat(formData.discountPercentage);

    const hasPrice = !isNaN(original) && !isNaN(discounted) && original > 0;
    const hasPercentage = !isNaN(percentage) && percentage > 0;

    if (!hasPrice && !hasPercentage && formData.dealTypeKey !== "custom") {
      setError("Please enter either a Price (Original & Discounted) OR a Discount Percentage.");
      setLoading(false);
      return;
    }

    const hasEnglish = formData.title?.trim() && formData.description?.trim();
    const hasTurkish = formData.title_tr?.trim() && formData.description_tr?.trim();

    if (!hasEnglish && !hasTurkish) {
      setError("Please provide a Title and Description in at least one language (English or Turkish).");
      setLoading(false);
      return;
    }

    let finalRedemptionCode = formData.redemptionCode;
    if (!finalRedemptionCode.trim()) {
      finalRedemptionCode = generateRedemptionCode(formData.category, formData.vendor);
    }

    try {
      const finalExpiresAt = neverExpires
        ? new Date(new Date().setFullYear(new Date().getFullYear() + 100)).toISOString()
        : formData.expiresAt;

      const dealData: Partial<Deal> = {
        ...formData,
        redemptionCode: finalRedemptionCode,
        originalPrice: hasPrice ? original : null,
        discountedPrice: hasPrice ? discounted : null,
        discountPercentage: isNaN(percentage) ? null : percentage,
        partnerId: user.id,
        status: (user.isAdmin ? "approved" : isEditing ? formData.status : "pending") as any,
        expiresAt: finalExpiresAt,
        rating: 0,
        ratingCount: 0,
        storeLocations: formData.storeLocations.filter((loc) => loc.name || loc.address),
        is_flash_deal: formData.is_flash_deal,
        flash_end_time: formData.flash_end_time ? new Date(formData.flash_end_time).toISOString() : undefined,
        dealTypeKey: formData.dealTypeKey,
        timeType: formData.timeType,
        maxRedemptionsTotal: formData.maxRedemptionsTotal ? parseInt(formData.maxRedemptionsTotal.toString()) : null,
        maxRedemptionsUser: formData.maxRedemptionsUser ? parseInt(formData.maxRedemptionsUser.toString()) : null,
      };

      if (isEditing && id) {
        await updateDeal(id, dealData);
      } else {
        await createDeal(dealData as any);
      }

      navigate("/partner/dashboard");
    } catch (err) {
      console.error("Error saving deal:", err);
      setError("Failed to save deal. Please try again. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <button
        onClick={() => navigate("/partner/dashboard")}
        className="flex items-center text-brand-text-muted hover:text-white mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </button>

      <div className="glass-premium p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none"></div>
        <h1 className="text-3xl font-bold text-white mb-8 tracking-tight relative z-10">
          {isEditing ? "Edit Deal" : "Create New Deal"}
        </h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          
          {/* PRIMARY FIELDS */}
          
          <div>
            <label className="text-sm font-medium text-brand-text-light mb-2 block">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-brand-text-muted focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all outline-none"
              placeholder="Enter title (auto-translates)"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-brand-text-light mb-2 block">Description</label>
            <textarea
              name="description"
              rows={2}
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-brand-text-muted focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all outline-none"
              placeholder="Enter description (auto-translates)"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-brand-text-light mb-2 block">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-brand-text-muted focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all outline-none"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.icon} {language === "tr" ? cat.name_tr : cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-brand-text-light mb-2 block">Discount Percentage (%)</label>
              <input
                type="number"
                name="discountPercentage"
                min="0"
                max="100"
                value={formData.discountPercentage}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-brand-text-muted focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all outline-none"
                placeholder="e.g. 20"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-brand-text-light mb-2 block">Original Price (Optional)</label>
              <input
                type="number"
                name="originalPrice"
                min="0"
                step="0.01"
                value={formData.originalPrice}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-brand-text-muted focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all outline-none"
                placeholder="e.g. 100"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-brand-text-light mb-2 block">Expiration Date</label>
            <input
              type="date"
              name="expiresAt"
              required={!neverExpires}
              disabled={neverExpires}
              value={formData.expiresAt}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-brand-text-muted focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all outline-none disabled:opacity-50"
            />
            <label className="flex items-center mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={neverExpires}
                onChange={(e) => setNeverExpires(e.target.checked)}
                className="h-4 w-4 text-brand-primary bg-white/5 border-white/10 rounded mr-2"
              />
              <span className="text-sm text-brand-text-light">Never Expires</span>
            </label>
          </div>

          {validationErrors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 space-y-1">
              {validationErrors.map((err, idx) => (
                <p key={idx} className="text-red-400 text-sm flex items-center gap-2">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  {err}
                </p>
              ))}
            </div>
          )}

          {/* ADVANCED SETTINGS COLLAPSIBLE */}
          
          <div className="border border-white/10 rounded-xl overflow-hidden mt-8">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-6 py-4 bg-white/5 hover:bg-white/10 text-left text-brand-text-light font-medium flex justify-between items-center transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                <span>Advanced Settings</span>
              </div>
              {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            {showAdvanced && (
              <div className="p-6 space-y-6 bg-black/20">
                
                {/* Translations */}
                <div className="border border-white/10 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowTranslations(!showTranslations)}
                    className="w-full px-4 py-3 bg-white/5 text-left text-sm font-medium text-brand-text-light flex justify-between items-center"
                  >
                    <span>📝 {showTranslations ? "Hide" : "View/Edit"} Translations (Turkish)</span>
                    <span className={`transform transition-transform ${showTranslations ? "rotate-180" : ""}`}>▼</span>
                  </button>
                  {showTranslations && (
                    <div className="p-4 space-y-4 bg-white/5 border-t border-white/10">
                      <div>
                        <label className="block text-xs font-medium text-brand-text-muted mb-1">Title (Turkish)</label>
                        <input
                          type="text"
                          name="title_tr"
                          value={formData.title_tr}
                          onChange={handleChange}
                          className="w-full px-4 py-2 rounded-lg border border-white/10 bg-black/30 text-white text-sm outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-brand-text-muted mb-1">Description (Turkish)</label>
                        <textarea
                          name="description_tr"
                          rows={2}
                          value={formData.description_tr}
                          onChange={handleChange}
                          className="w-full px-4 py-2 rounded-lg border border-white/10 bg-black/30 text-white text-sm outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-brand-text-light mb-2 block">Company Name (Vendor)</label>
                    <input
                      type="text"
                      name="vendor"
                      required
                      value={formData.vendor}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-brand-text-muted focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-text-light mb-2 block">Deal Type</label>
                    <select
                      name="dealTypeKey"
                      value={formData.dealTypeKey}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-brand-text-muted focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all outline-none"
                    >
                      {getDiscountTypeOptions(language).map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-medium text-brand-text-light mb-2 block">Discounted Price</label>
                    <input
                      type="number"
                      name="discountedPrice"
                      min="0"
                      step="0.01"
                      value={formData.discountedPrice}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-brand-text-muted focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-text-light mb-2 block">Time Type</label>
                    <select
                      name="timeType"
                      value={formData.timeType}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-brand-text-muted focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all outline-none"
                    >
                      {getTimeTypeOptions(language).map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-text-light mb-2 block">Required Tier</label>
                    <select
                      name="requiredTier"
                      value={formData.requiredTier}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-brand-text-muted focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all outline-none"
                    >
                      {Object.values(SubscriptionTier)
                        .filter((t) => t !== SubscriptionTier.NONE)
                        .map((tier) => (
                          <option key={tier} value={tier}>{tier}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-brand-text-light mb-2 block">Main Image</label>
                    <ImageUpload
                      value={formData.imageUrl}
                      onChange={(url) => setFormData((prev) => ({ ...prev, imageUrl: url }))}
                      bucketName="deals"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-text-light mb-2 block">Company Logo (Optional)</label>
                    <ImageUpload
                      value={formData.companyLogoUrl}
                      onChange={(url) => setFormData((prev) => ({ ...prev, companyLogoUrl: url }))}
                      bucketName="deals"
                    />
                  </div>
                </div>

                <CountrySelector
                  selectedCountries={formData.countries}
                  onChange={(countries) => setFormData((prev) => ({ ...prev, countries }))}
                  language={language === "tr" ? "tr" : "en"}
                />

                <div className="pt-4 border-t border-white/10">
                  <label className="text-sm font-medium text-brand-text-light mb-2 block">Redemption Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="redemptionCode"
                      value={formData.redemptionCode}
                      onChange={handleChange}
                      className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-brand-text-muted focus:ring-2 focus:ring-brand-primary outline-none"
                      placeholder="e.g. DIN-L7K9M2 (Auto-generates if empty)"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const code = generateRedemptionCode(formData.category, formData.vendor);
                        setFormData((prev) => ({ ...prev, redemptionCode: code }));
                      }}
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-brand-text-light mb-2 block">Global Redemption Limit</label>
                    <input
                      type="number"
                      name="maxRedemptionsTotal"
                      min="1"
                      value={formData.maxRedemptionsTotal || ""}
                      onChange={handleChange}
                      placeholder="Leave empty for unlimited"
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-brand-text-muted focus:ring-2 focus:ring-brand-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-text-light mb-2 block">User Redemption Limit (Monthly)</label>
                    <input
                      type="number"
                      name="maxRedemptionsUser"
                      min="1"
                      value={formData.maxRedemptionsUser || ""}
                      onChange={handleChange}
                      placeholder="Default: Unlimited"
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-brand-text-muted focus:ring-2 focus:ring-brand-primary outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-brand-text-light mb-2 block">Usage Limit (English)</label>
                    <input
                      type="text"
                      name="usageLimit"
                      value={formData.usageLimit}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-brand-text-muted focus:ring-2 focus:ring-brand-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-text-light mb-2 block">Usage Limit (Turkish)</label>
                    <input
                      type="text"
                      name="usageLimit_tr"
                      value={formData.usageLimit_tr}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-brand-text-muted focus:ring-2 focus:ring-brand-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-text-light mb-2 block">Validity (English)</label>
                    <input
                      type="text"
                      name="validity"
                      value={formData.validity}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-brand-text-muted focus:ring-2 focus:ring-brand-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-text-light mb-2 block">Validity (Turkish)</label>
                    <input
                      type="text"
                      name="validity_tr"
                      value={formData.validity_tr}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-brand-text-muted focus:ring-2 focus:ring-brand-primary outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-text-light mb-2">Redemption Style</label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.redemptionStyle?.includes("online") || false}
                        onChange={(e) => {
                          const current = formData.redemptionStyle || [];
                          const updated = e.target.checked
                            ? [...current, "online"]
                            : current.filter((s) => s !== "online");
                          setFormData((prev) => ({ ...prev, redemptionStyle: updated as ("online" | "in_store")[] }));
                        }}
                        className="h-4 w-4 rounded text-brand-primary bg-white/5 border-white/10"
                      />
                      <span className="text-sm text-brand-text-light">Online</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.redemptionStyle?.includes("in_store") || false}
                        onChange={(e) => {
                          const current = formData.redemptionStyle || [];
                          const updated = e.target.checked
                            ? [...current, "in_store"]
                            : current.filter((s) => s !== "in_store");
                          setFormData((prev) => ({ ...prev, redemptionStyle: updated as ("online" | "in_store")[] }));
                        }}
                        className="h-4 w-4 rounded text-brand-primary bg-white/5 border-white/10"
                      />
                      <span className="text-sm text-brand-text-light">In Store</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <StoreLocationFields
                    redemptionStyle={formData.redemptionStyle}
                    storeLocations={formData.storeLocations}
                    onChange={(locations) => setFormData((prev) => ({ ...prev, storeLocations: locations }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-brand-text-light mb-2 block">Terms URL</label>
                  <input
                    type="text"
                    name="termsUrl"
                    value={formData.termsUrl}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-brand-text-muted focus:ring-2 focus:ring-brand-primary outline-none"
                  />
                </div>

                <label className="flex items-center space-x-2 cursor-pointer pt-2 border-t border-white/10">
                  <input
                    type="checkbox"
                    name="isExternal"
                    checked={formData.isExternal}
                    onChange={handleChange}
                    className="h-4 w-4 rounded text-brand-primary bg-white/5 border-white/10"
                  />
                  <span className="text-sm font-medium text-brand-text-light">Is External Deal?</span>
                </label>

              </div>
            )}
          </div>

          <div className="flex justify-end pt-6 border-t border-white/10 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="bg-brand-primary text-white px-8 py-3 rounded-xl font-semibold hover:bg-brand-primary/90 transition-all flex items-center shadow-lg hover:shadow-brand-primary/20 disabled:opacity-50"
            >
              <Save className="w-5 h-5 mr-2" />
              {loading ? "Saving..." : isEditing ? "Update Deal" : "Submit for Approval"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateDealPage;
