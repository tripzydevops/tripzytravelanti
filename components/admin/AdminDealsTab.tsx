import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import { useDeals } from "../../contexts/DealContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { Deal, SubscriptionTier } from "../../types";

import { SpinnerIcon, EyeIcon } from "../Icons";
import { Save } from "lucide-react";
import ImageUpload from "../ImageUpload";
import StoreLocationFields from "../StoreLocationFields";
import { useToast } from "../../contexts/ToastContext";
import CountrySelector from "../CountrySelector";
import {
  getDealsPaginated,
  createDeal,
  updateDeal,
  deleteDeal,
  getAllDeals,
  logAdminAction,
} from "../../lib/supabaseService";
import {
  upsertDealVector,
  isVectorServiceConfigured,
  getVectorServiceConfigError,
  generateText,
} from "../../lib/vectorService";
import DealDetailView from "../DealDetailView";
import Modal from "../Modal";
import {
  getCategoryOptions,
  getDiscountTypeOptions,
  getTimeTypeOptions,
  getDiscountTypeConfig,
  getTimeTypeConfig,
  DealDiscountType,
  DealTimeType,
  DEFAULT_DEAL_VALUES,
} from "../../shared/dealTypes";
import { generateRedemptionCode } from "../../lib/codeGenerator";

const EMPTY_DEAL: Omit<Deal, "expiresAt"> = {
  id: "",
  title: "",
  title_tr: "",
  description: "",
  description_tr: "",
  imageUrl: "",
  category: "Dining",
  category_tr: "Yemek",
  dealTypeKey: DEFAULT_DEAL_VALUES.discountType,
  timeType: DEFAULT_DEAL_VALUES.timeType,
  originalPrice: 0,
  discountedPrice: 0,
  discountPercentage: 0,
  requiredTier: SubscriptionTier.FREE,
  isExternal: false,
  vendor: "",
  rating: 0,
  ratingCount: 0,
  usageLimit: "",
  usageLimit_tr: "",
  validity: DEFAULT_DEAL_VALUES.validity,
  validity_tr: DEFAULT_DEAL_VALUES.validity_tr,
  termsUrl: "",
  redemptionCode: "",
  publishAt: undefined,
  redemptionStyle: [],
  storeLocations: [],
  countries: [],
  is_flash_deal: false,
  flash_end_time: undefined,
  maxRedemptionsTotal: null,
  isTeasable: true,
};

const getExpiryDate = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const getFarFutureDate = (): string => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 100);
  return date.toISOString();
};

const isFarFuture = (dateString: string): boolean => {
  const expiry = new Date(dateString);
  const now = new Date();
  return expiry.getFullYear() > now.getFullYear() + 50;
};

const AdminDealsTab: React.FC = () => {
  const { t, language } = useLanguage();
  const { addDeal, updateDeal, deleteDeal, categories, categoriesLoading } =
    useDeals();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  // Local State
  const [adminDeals, setAdminDeals] = useState<Deal[]>([]);
  const [adminPage, setAdminPage] = useState(1);
  const [adminTotal, setAdminTotal] = useState(0);
  const ADMIN_DEALS_PER_PAGE = 20;

  const [isDealFormVisible, setIsDealFormVisible] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [dealFormData, setDealFormData] =
    useState<Omit<Deal, "expiresAt">>(EMPTY_DEAL);
  const [expiresInDays, setExpiresInDays] = useState<number | string>("");
  const [neverExpires, setNeverExpires] = useState(false);
  const [isTranslating, setIsTranslating] = useState({
    title: false,
    description: false,
    usageLimit: false,
    validity: false,
  });
  const [lastEditedField, setLastEditedField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDeal, setPreviewDeal] = useState<Deal | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

  const [searchQuery, setSearchQuery] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [activeTab, setActiveTab] = useState<"active" | "expired" | "sold_out">(
    "active"
  );
  const [formTab, setFormTab] = useState("Deal Details");
  const [showTranslations, setShowTranslations] = useState(false);

  // Selection State
  const [selectedDealIds, setSelectedDealIds] = useState<string[]>([]);

  const dealTypeConfig = getDiscountTypeConfig(
    dealFormData.dealTypeKey || "percentage_off"
  );
  const timeTypeConfig = getTimeTypeConfig(dealFormData.timeType || "standard");

  const loadAdminDeals = useCallback(
    async (page: number) => {
      try {
        const { deals, total } = await getDealsPaginated(
          page,
          ADMIN_DEALS_PER_PAGE,
          {
            includeExpired: true,
            includeAllStatus: true, // Crucial: Fetch sold-out deals too
            search: searchQuery,
            category: categoryFilter,
          }
        );
        setAdminDeals(deals);
        setAdminTotal(total);
        setAdminPage(page);
      } catch (error) {
        console.error("Failed to load deals for admin:", error);
      }
    },
    [searchQuery, categoryFilter]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadAdminDeals(1);
    }, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [loadAdminDeals]);

  useEffect(() => {
    setSelectedDealIds([]); // Clear selection when filters change
  }, [searchQuery, categoryFilter, activeTab]);

  const filteredDeals = useMemo(() => {
    const now = new Date();
    return adminDeals.filter((deal) => {
      if (activeTab === "sold_out") {
        return deal.isSoldOut;
      }

      const expiryDate = new Date(deal.expiresAt);
      if (activeTab === "active") {
        return expiryDate >= now && !deal.isSoldOut; // Active = Not Expired AND Not Sold Out
      } else {
        return expiryDate < now;
      }
    });
  }, [adminDeals, activeTab]);

  const handleAdminPageChange = (newPage: number) => {
    loadAdminDeals(newPage);
  };

  const sortedDeals = useMemo(() => {
    return [...adminDeals].sort((a, b) => Number(b.id) - Number(a.id));
  }, [adminDeals]);

  const handleSyncAllDeals = async () => {
    if (!isVectorServiceConfigured()) {
      const error = getVectorServiceConfigError();
      showErrorToast(
        t("pineconeNotConfigured") || `Pinecone is not configured: ${error}`
      );
      return;
    }

    if (
      !window.confirm(
        t("confirmSyncPinecone") ||
          "This will re-index ALL deals in Pinecone. Continue?"
      )
    )
      return;

    setIsSyncing(true);
    try {
      const allDeals = await getAllDeals(true);
      setSyncProgress({ current: 0, total: allDeals.length });

      for (let i = 0; i < allDeals.length; i++) {
        await upsertDealVector(allDeals[i]);
        setSyncProgress((prev) => ({ ...prev, current: i + 1 }));
      }

      showSuccessToast(t("syncComplete") || "Sync complete!");
    } catch (error) {
      showErrorToast(
        t("syncFailed") || "Sync failed. Check console for details."
      );
    } finally {
      setIsSyncing(false);
      setSyncProgress({ current: 0, total: 0 });
    }
  };

  // Translation Logic
  const debouncedTitle = useDebounce(dealFormData.title, 800);
  const debouncedTitleTr = useDebounce(dealFormData.title_tr, 800);
  const debouncedDescription = useDebounce(dealFormData.description, 800);
  const debouncedDescriptionTr = useDebounce(dealFormData.description_tr, 800);
  const debouncedUsageLimit = useDebounce(dealFormData.usageLimit, 800);
  const debouncedUsageLimitTr = useDebounce(dealFormData.usageLimit_tr, 800);
  const debouncedValidity = useDebounce(dealFormData.validity, 800);
  const debouncedValidityTr = useDebounce(dealFormData.validity_tr, 800);

  const translateText = useCallback(
    async (
      text: string,
      targetLanguage: "English" | "Turkish"
    ): Promise<string> => {
      if (!text.trim()) return "";

      // 1. Try Google Gemini API via Secure Edge Function
      try {
        const prompt = `Translate the following text to ${targetLanguage}. Only return the translated text, without any introductory phrases:\n\n"${text}"`;
        const generatedText = await generateText(prompt);
        if (generatedText) return generatedText.trim();
      } catch (error) {
        console.warn(
          "Gemini translation failed, falling back to free API:",
          error
        );
      }

      // 2. Fallback: MyMemory Translation API (Free, no key needed for small usage)
      try {
        const langPair = targetLanguage === "Turkish" ? "en|tr" : "tr|en";
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
          text
        )}&langpair=${langPair}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.responseStatus === 200) {
          return data.responseData.translatedText;
        }
      } catch (err) {
        console.error("All translation methods failed:", err);
      }

      return "";
    },
    []
  );

  useEffect(() => {
    if (debouncedTitle && lastEditedField === "title") {
      (async () => {
        setIsTranslating((p) => ({ ...p, title: true }));
        const tr = await translateText(debouncedTitle, "Turkish");
        if (tr) setDealFormData((p) => ({ ...p, title_tr: tr }));
        setIsTranslating((p) => ({ ...p, title: false }));
      })();
    }
  }, [debouncedTitle, lastEditedField, translateText]);

  useEffect(() => {
    if (debouncedTitleTr && lastEditedField === "title_tr") {
      (async () => {
        setIsTranslating((p) => ({ ...p, title: true }));
        const tr = await translateText(debouncedTitleTr, "English");
        if (tr) setDealFormData((p) => ({ ...p, title: tr }));
        setIsTranslating((p) => ({ ...p, title: false }));
      })();
    }
  }, [debouncedTitleTr, lastEditedField, translateText]);

  useEffect(() => {
    if (debouncedDescription && lastEditedField === "description") {
      (async () => {
        setIsTranslating((p) => ({ ...p, description: true }));
        const tr = await translateText(debouncedDescription, "Turkish");
        if (tr) setDealFormData((p) => ({ ...p, description_tr: tr }));
        setIsTranslating((p) => ({ ...p, description: false }));
      })();
    }
  }, [debouncedDescription, lastEditedField, translateText]);

  useEffect(() => {
    if (debouncedDescriptionTr && lastEditedField === "description_tr") {
      (async () => {
        setIsTranslating((p) => ({ ...p, description: true }));
        const tr = await translateText(debouncedDescriptionTr, "English");
        if (tr) setDealFormData((p) => ({ ...p, description: tr }));
        setIsTranslating((p) => ({ ...p, description: false }));
      })();
    }
  }, [debouncedDescriptionTr, lastEditedField, translateText]);

  useEffect(() => {
    if (debouncedUsageLimit && lastEditedField === "usageLimit") {
      (async () => {
        setIsTranslating((p) => ({ ...p, usageLimit: true }));
        const tr = await translateText(debouncedUsageLimit, "Turkish");
        if (tr) setDealFormData((p) => ({ ...p, usageLimit_tr: tr }));
        setIsTranslating((p) => ({ ...p, usageLimit: false }));
      })();
    }
  }, [debouncedUsageLimit, lastEditedField, translateText]);

  useEffect(() => {
    if (debouncedUsageLimitTr && lastEditedField === "usageLimit_tr") {
      (async () => {
        setIsTranslating((p) => ({ ...p, usageLimit: true }));
        const tr = await translateText(debouncedUsageLimitTr, "English");
        if (tr) setDealFormData((p) => ({ ...p, usageLimit: tr }));
        setIsTranslating((p) => ({ ...p, usageLimit: false }));
      })();
    }
  }, [debouncedUsageLimitTr, lastEditedField, translateText]);

  useEffect(() => {
    if (debouncedValidity && lastEditedField === "validity") {
      (async () => {
        setIsTranslating((p) => ({ ...p, validity: true }));
        const tr = await translateText(debouncedValidity, "Turkish");
        if (tr) setDealFormData((p) => ({ ...p, validity_tr: tr }));
        setIsTranslating((p) => ({ ...p, validity: false }));
      })();
    }
  }, [debouncedValidity, lastEditedField, translateText]);

  useEffect(() => {
    if (debouncedValidityTr && lastEditedField === "validity_tr") {
      (async () => {
        setIsTranslating((p) => ({ ...p, validity: true }));
        const tr = await translateText(debouncedValidityTr, "English");
        if (tr) setDealFormData((p) => ({ ...p, validity: tr }));
        setIsTranslating((p) => ({ ...p, validity: false }));
      })();
    }
  }, [debouncedValidityTr, lastEditedField, translateText]);

  const handleDealInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    if (
      [
        "title",
        "title_tr",
        "description",
        "description_tr",
        "usageLimit",
        "usageLimit_tr",
        "validity",
        "validity_tr",
      ].includes(name)
    )
      setLastEditedField(name);

    let newValue: any =
      type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : type === "number"
        ? value === ""
          ? null
          : Math.max(0, parseFloat(value)) // Ensure non-negative
        : value;
    if (name === "isTeasable")
      newValue = (e.target as HTMLInputElement).checked;

    setDealFormData((prev) => {
      const updated = { ...prev, [name]: newValue };

      // Handle Time Type Change
      if (name === "timeType") {
        const newTimeConfig = getTimeTypeConfig(value as DealTimeType);
        if (newTimeConfig) {
          if (newTimeConfig.key === "flash") {
            updated.is_flash_deal = true;
          } else {
            updated.is_flash_deal = false;
          }

          if (newTimeConfig.defaultValidity) {
            updated.validity = newTimeConfig.defaultValidity;
            updated.validity_tr =
              newTimeConfig.defaultValidity_tr || updated.validity;
          }
        }
      }

      // Handle Category Change
      if (name === "category") {
        const selectedCat = categories.find((c) => c.name === value);
        if (selectedCat) {
          updated.category_tr = selectedCat.name_tr || value;
          updated.category_id = selectedCat.id;
        }
      }

      if (name === "discountPercentage" && updated.originalPrice > 0) {
        const discount = parseFloat(value);
        if (!isNaN(discount)) {
          updated.discountedPrice = Number(
            (updated.originalPrice * (1 - discount / 100)).toFixed(2)
          );
        }
      } else if (name === "originalPrice" && updated.discountPercentage) {
        const price = parseFloat(value);
        const discount = updated.discountPercentage;
        if (!isNaN(price) && !isNaN(discount)) {
          updated.discountedPrice = Number(
            (price * (1 - discount / 100)).toFixed(2)
          );
        }
      }
      return updated;
    });
  };

  const handleEditDealClick = (deal: Deal) => {
    setEditingDeal(deal);
    setDealFormData(deal);
    if (isFarFuture(deal.expiresAt)) {
      setNeverExpires(true);
      setExpiresInDays(7);
    } else {
      setNeverExpires(false);
      const diffDays = Math.ceil(
        (new Date(deal.expiresAt).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );
      setExpiresInDays(diffDays > 0 ? diffDays : "");
    }
    if (
      !deal.discountPercentage &&
      deal.originalPrice > 0 &&
      deal.discountedPrice < deal.originalPrice
    ) {
      const discount =
        ((deal.originalPrice - deal.discountedPrice) / deal.originalPrice) *
        100;
      setDealFormData((prev) => ({
        ...prev,
        discountPercentage: Math.round(discount),
      }));
    }
    if (deal.title_tr || deal.description_tr) {
      setShowTranslations(true);
    } else {
      setShowTranslations(false);
    }
    setIsDealFormVisible(true);
    window.scrollTo(0, 0);
  };

  const handleDeleteDealClick = async (dealId: string) => {
    if (window.confirm(t("deleteConfirmation"))) {
      const dealToDelete = adminDeals.find((d) => d.id === dealId);
      await deleteDeal(dealId);
      await logAdminAction({
        action_type: "DELETE",
        table_name: "deals",
        record_id: dealId,
        old_data: dealToDelete,
      });
      showSuccessToast(t("dealDeletedSuccess"));
      loadAdminDeals(adminPage);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDealIds.length === 0) return;
    if (
      window.confirm(
        t("bulkDeleteConfirm").replace(
          "{count}",
          selectedDealIds.length.toString()
        ) || `Are you sure you want to delete ${selectedDealIds.length} deals?`
      )
    ) {
      setIsSaving(true);
      for (const id of selectedDealIds) {
        await deleteDeal(id);
      }
      setSelectedDealIds([]);
      loadAdminDeals(adminPage);
      showSuccessToast(t("adminSuccessTitle"));
      setIsSaving(false);
    }
  };

  const handleBulkExpire = async () => {
    if (selectedDealIds.length === 0) return;
    if (
      window.confirm(
        t("bulkExpireConfirm").replace(
          "{count}",
          selectedDealIds.length.toString()
        ) || `Set ${selectedDealIds.length} deals to expired?`
      )
    ) {
      setIsSaving(true);
      const now = new Date().toISOString();
      for (const id of selectedDealIds) {
        const deal = adminDeals.find((d) => d.id === id);
        if (deal) {
          await updateDeal({ ...deal, expiresAt: now });
        }
      }
      setSelectedDealIds([]);
      loadAdminDeals(adminPage);
      showSuccessToast(t("adminSuccessTitle"));
      setIsSaving(false);
    }
  };

  const handleCloneDealClick = (deal: Deal) => {
    const clonedDeal = { ...deal };
    setDealFormData({
      ...clonedDeal,
      title: `${clonedDeal.title} (Copy)`,
      title_tr: `${clonedDeal.title_tr} (Kopya)`,
      redemptionCode: `${clonedDeal.redemptionCode}-COPY`,
    });
    setEditingDeal(null); // Treat as new deal

    // Reset expiry to default 30 days for clones, unless it was 'never expires'
    if (isFarFuture(deal.expiresAt)) {
      setNeverExpires(true);
      setExpiresInDays(7);
    } else {
      setNeverExpires(false);
      setExpiresInDays(30);
    }

    setIsDealFormVisible(true);
    window.scrollTo(0, 0);
  };

  const handlePreviewClick = () => {
    // Create a temporary deal object from form data for preview
    const tempDeal: Deal = {
      ...dealFormData,
      id: "preview",
      expiresAt: neverExpires
        ? getFarFutureDate()
        : getExpiryDate(
            typeof expiresInDays === "number"
              ? expiresInDays
              : parseInt(expiresInDays as string) || 7
          ),
      category_tr:
        dealFormData.category === "Dining"
          ? "Yemek"
          : dealFormData.category === "Wellness"
          ? "Sağlık"
          : "Seyahat",
    };
    setPreviewDeal(tempDeal);
    setIsPreviewOpen(true);
  };

  const handleImportDeals = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n");
      const headers = lines[0].split(",").map((h) => h.trim());

      let successCount = 0;
      let errorCount = 0;
      setIsSaving(true);

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(",").map((v) => v.trim());
        const dealData: any = {};

        headers.forEach((header, index) => {
          dealData[header] = values[index];
        });

        try {
          const newDeal: Omit<Deal, "id"> = {
            title: dealData.title || "Untitled",
            title_tr: dealData.title_tr || dealData.title || "Untitled",
            description: dealData.description || "",
            description_tr:
              dealData.description_tr || dealData.description || "",
            imageUrl: dealData.imageUrl || "",
            category: dealData.category || "Dining",
            category_tr: dealData.category_tr || "Yemek",
            originalPrice: parseFloat(dealData.originalPrice) || 0,
            discountedPrice: parseFloat(dealData.discountedPrice) || 0,
            requiredTier:
              (dealData.requiredTier as SubscriptionTier) ||
              SubscriptionTier.FREE,
            isExternal: dealData.isExternal === "true",
            vendor: dealData.vendor || "",
            expiresAt: getExpiryDate(30),
            rating: 0,
            ratingCount: 0,
            usageLimit: dealData.usageLimit || "Unlimited",
            usageLimit_tr: dealData.usageLimit_tr || "Sınırsız",
            validity: dealData.validity || "Valid until expiration",
            validity_tr:
              dealData.validity_tr || "Son kullanma tarihine kadar geçerli",
            termsUrl: dealData.termsUrl || "",
            redemptionCode: dealData.redemptionCode || "CODE",
            status: "pending",
            isTeasable: dealData.isTeasable !== "false", // Default to true
          };

          await createDeal(newDeal);
          successCount++;
        } catch (error) {
          console.error("Error importing deal:", error);
          errorCount++;
        }
      }

      setIsSaving(false);
      showSuccessToast(
        t("importComplete")
          .replace("{success}", successCount.toString())
          .replace("{errorCount}", errorCount.toString()) ||
          `Import complete. Success: ${successCount}, Failed: ${errorCount}`
      );
      loadAdminDeals(1);
    };
    reader.readAsText(file);
  };

  const resetDealForm = () => {
    setEditingDeal(null);
    setDealFormData(EMPTY_DEAL);
    setExpiresInDays("");
    setNeverExpires(false);
    setIsDealFormVisible(false);
    setLastEditedField(null);
  };

  const handleDealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Language Validation
    const hasEnglish =
      dealFormData.title?.trim() && dealFormData.description?.trim();
    const hasTurkish =
      dealFormData.title_tr?.trim() && dealFormData.description_tr?.trim();

    if (!hasEnglish && !hasTurkish) {
      showErrorToast(
        t("provideTitleDesc") ||
          "Please provide a Title and Description in at least one language."
      );
      setIsSaving(false);
      return;
    }

    // Price Validation: Allow 0 for generic discounts (e.g. 20% off bill), but strictly disallow negative numbers.
    if (
      (dealFormData.originalPrice || 0) < 0 ||
      (dealFormData.discountedPrice || 0) < 0 ||
      (dealFormData.discountPercentage || 0) < 0
    ) {
      showErrorToast(
        t("negativeValueError") || "Prices and percentages cannot be negative."
      );
      setIsSaving(false);
      return;
    }

    if (
      dealFormData.maxRedemptionsTotal !== null &&
      dealFormData.maxRedemptionsTotal < 0
    ) {
      showErrorToast("Max Redemptions cannot be negative.");
      setIsSaving(false);
      return;
    }

    // URL Validation
    if (dealFormData.termsUrl) {
      try {
        new URL(dealFormData.termsUrl);
      } catch (e) {
        showErrorToast(t("invalidUrlError") || "Please enter a valid URL.");
        setIsSaving(false);
        return;
      }
    }

    // Only enforce logic if both prices are positive (standard product discount)
    if (
      dealFormData.originalPrice > 0 &&
      dealFormData.discountedPrice >= dealFormData.originalPrice
    ) {
      showErrorToast(
        t("discountPriceError") ||
          "Discounted Price must be lower than the Original Price."
      );
      setIsSaving(false);
      return;
    }

    if (!dealFormData.category) {
      showErrorToast(t("selectCategoryError") || "Please select a Category.");
      setIsSaving(false);
      return;
    }

    // Strict Validation for Usage Limit & Validity
    if (
      !dealFormData.usageLimit?.trim() ||
      !dealFormData.usageLimit_tr?.trim()
    ) {
      showErrorToast(
        t("usageLimitError") ||
          "Please provide Usage Limit in both English and Turkish."
      );
      setIsSaving(false);
      return;
    }

    if (!dealFormData.validity?.trim() || !dealFormData.validity_tr?.trim()) {
      showErrorToast(
        t("validityError") ||
          "Please provide Validity in both English and Turkish."
      );
      setIsSaving(false);
      return;
    }

    let finalImageUrl = dealFormData.imageUrl;

    if (!finalImageUrl) {
      setIsGeneratingImage(true);

      // Use Unsplash with category-based search for relevant images
      console.log("Using Unsplash fallback image");
      const categoryImages: Record<string, string> = {
        Dining:
          "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop",
        "Food & Dining":
          "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop",
        Travel:
          "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop",
        Wellness:
          "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&h=600&fit=crop",
        Shopping:
          "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop",
        Entertainment:
          "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop",
        General:
          "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&h=600&fit=crop",
      };
      finalImageUrl =
        categoryImages[dealFormData.category] || categoryImages["General"];

      // Artificial delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsGeneratingImage(false);
    }

    try {
      const dealData = {
        ...dealFormData,
        originalPrice: isNaN(Number(dealFormData.originalPrice))
          ? null
          : dealFormData.originalPrice,
        discountedPrice: isNaN(Number(dealFormData.discountedPrice))
          ? null
          : dealFormData.discountedPrice,
        discountPercentage: isNaN(Number(dealFormData.discountPercentage))
          ? null
          : dealFormData.discountPercentage,
        imageUrl: finalImageUrl,
        expiresAt: neverExpires
          ? getFarFutureDate()
          : getExpiryDate(
              typeof expiresInDays === "number"
                ? expiresInDays
                : parseInt(expiresInDays as string) || 7
            ),
        storeLocations: (dealFormData.storeLocations || []).filter(
          (loc) => loc.name?.trim() || loc.address?.trim()
        ),
      };
      if (editingDeal) {
        await updateDeal(dealData);
        await logAdminAction({
          action_type: "UPDATE",
          table_name: "deals",
          record_id: editingDeal.id,
          old_data: editingDeal,
          new_data: dealData,
        });
      } else {
        const result = await addDeal({
          ...dealData,
          id: Date.now().toString(),
        });
        await logAdminAction({
          action_type: "CREATE",
          table_name: "deals",
          record_id: (result as any)?.id?.toString() || "new",
          new_data: dealData,
        });
      }
      await loadAdminDeals(adminPage);
      showSuccessToast(t("adminSuccessTitle"));
      resetDealForm();
    } catch (error) {
      showErrorToast(
        t("saveDealError") || "Failed to save deal. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {!isDealFormVisible && (
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{t("manageDeals")}</h2>
          <div className="flex gap-2">
            <button
              onClick={handleSyncAllDeals}
              disabled={isSyncing}
              className="bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              {isSyncing ? (
                <>
                  <SpinnerIcon className="w-4 h-4" /> Syncing (
                  {syncProgress.current}/{syncProgress.total})...
                </>
              ) : (
                "Sync to Pinecone"
              )}
            </button>
            <label className="bg-green-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors cursor-pointer flex items-center">
              Import CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleImportDeals}
                className="hidden"
              />
            </label>
            <button
              onClick={() => {
                setEditingDeal(null);
                setDealFormData(EMPTY_DEAL);
                setExpiresInDays("");
                setNeverExpires(false);
                setIsDealFormVisible(true);
              }}
              className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors"
            >
              {t("addDeal")}
            </button>
          </div>
        </div>
      )}

      {isDealFormVisible && (
        <section className="bg-white dark:bg-brand-surface p-6 rounded-lg mb-8 shadow-sm">
          <h2 className="text-2xl font-bold mb-4">
            {editingDeal ? t("editDeal") : t("addDeal")}
          </h2>

          {/* Form Tabs */}
          <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 mb-6 scrollbar-hide">
            {[
              "General",
              "Pricing",
              "Usage & Validity",
              "Redemption & Location",
            ].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFormTab(tab)}
                className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                  formTab === tab
                    ? "border-brand-primary text-brand-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {t(tab.toLowerCase().replace(/ & /g, "_").replace(/ /g, "_")) ||
                  tab}
              </button>
            ))}
          </div>

          <form onSubmit={handleDealSubmit}>
            <div className="grid grid-cols-1 gap-6">
              {/* Tab 1: General */}
              {formTab === "General" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">
                        Title <span className="text-red-500">*</span>{" "}
                        {isTranslating.title && (
                          <SpinnerIcon className="inline w-4 h-4 ml-1 text-brand-primary" />
                        )}
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={dealFormData.title}
                        onChange={handleDealInputChange}
                        required
                        className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                        placeholder="Enter title (auto-translates)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">
                        {t("vendorLabel")}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="vendor"
                        value={dealFormData.vendor}
                        onChange={handleDealInputChange}
                        required
                        className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">
                      Description <span className="text-red-500">*</span>{" "}
                      {isTranslating.description && (
                        <SpinnerIcon className="inline w-4 h-4 ml-1 text-brand-primary" />
                      )}
                    </label>
                    <textarea
                      name="description"
                      value={dealFormData.description}
                      onChange={handleDealInputChange}
                      required
                      className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 h-20"
                      placeholder="Enter description (auto-translates)"
                    />
                  </div>

                  {/* Translations Override */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowTranslations(!showTranslations)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 text-left text-sm font-medium text-gray-600 dark:text-gray-400 flex justify-between items-center"
                    >
                      <span>
                        📝 {showTranslations ? "Hide" : "View/Edit"}{" "}
                        Translations (Turkish)
                      </span>
                      <span
                        className={`transform transition-transform ${
                          showTranslations ? "rotate-180" : ""
                        }`}
                      >
                        ▼
                      </span>
                    </button>
                    {showTranslations && (
                      <div className="p-3 space-y-3 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              Title (Turkish)
                            </label>
                            <input
                              type="text"
                              name="title_tr"
                              value={dealFormData.title_tr}
                              onChange={handleDealInputChange}
                              className="w-full bg-white dark:bg-gray-700 rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              Description (Turkish)
                            </label>
                            <textarea
                              name="description_tr"
                              value={dealFormData.description_tr}
                              onChange={handleDealInputChange}
                              className="w-full bg-white dark:bg-gray-700 rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 h-10 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">
                        {t("categoryLabel")}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="category"
                        value={dealFormData.category}
                        onChange={handleDealInputChange}
                        required
                        className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                      >
                        <option value="">Select a Category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {language === "tr" ? cat.name_tr : cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <CountrySelector
                        selectedCountries={dealFormData.countries || []}
                        onChange={(countries) =>
                          setDealFormData((prev) => ({ ...prev, countries }))
                        }
                        language={language === "tr" ? "tr" : "en"}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">
                        {t("imageUrlLabel")}
                      </label>
                      <ImageUpload
                        value={dealFormData.imageUrl}
                        onChange={(url) =>
                          setDealFormData((prev) => ({
                            ...prev,
                            imageUrl: url,
                          }))
                        }
                        placeholder={
                          t("imageUrlOptionalHint") || "Upload Deal Image"
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">
                        Company Logo (Optional)
                      </label>
                      <ImageUpload
                        value={dealFormData.companyLogoUrl || ""}
                        onChange={(url) =>
                          setDealFormData((prev) => ({
                            ...prev,
                            companyLogoUrl: url,
                          }))
                        }
                        placeholder="Upload Company Logo"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Pricing */}
              {formTab === "Pricing" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">
                        {t("dealTypeLabel")}
                      </label>
                      <select
                        name="dealTypeKey"
                        value={dealFormData.dealTypeKey}
                        onChange={handleDealInputChange}
                        className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                      >
                        {getDiscountTypeOptions(language, true).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">
                        {t("requiredTierLabel")}
                      </label>
                      <select
                        name="requiredTier"
                        value={dealFormData.requiredTier}
                        onChange={handleDealInputChange}
                        className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                      >
                        {Object.values(SubscriptionTier)
                          .filter((t) => t !== SubscriptionTier.NONE)
                          .map((tier) => (
                            <option key={tier} value={tier}>
                              {tier}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {!dealTypeConfig?.hiddenFields.includes(
                      "originalPrice"
                    ) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">
                          {t("originalPriceLabel")}{" "}
                          {dealTypeConfig?.requiredFields.includes(
                            "originalPrice"
                          ) && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="number"
                          name="originalPrice"
                          value={dealFormData.originalPrice}
                          onChange={handleDealInputChange}
                          required={dealTypeConfig?.requiredFields.includes(
                            "originalPrice"
                          )}
                          min="0"
                          step="0.01"
                          className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                        />
                      </div>
                    )}
                    {!dealTypeConfig?.hiddenFields.includes(
                      "discountPercentage"
                    ) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">
                          {t("discountPercentageLabel")}{" "}
                          {dealTypeConfig?.requiredFields.includes(
                            "discountPercentage"
                          ) && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="number"
                          name="discountPercentage"
                          value={dealFormData.discountPercentage || ""}
                          onChange={handleDealInputChange}
                          required={dealTypeConfig?.requiredFields.includes(
                            "discountPercentage"
                          )}
                          min="0"
                          max="100"
                          className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                          placeholder="e.g. 20"
                        />
                      </div>
                    )}
                    {!dealTypeConfig?.hiddenFields.includes(
                      "discountedPrice"
                    ) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">
                          {t("discountedPriceLabel")}{" "}
                          {dealTypeConfig?.requiredFields.includes(
                            "discountedPrice"
                          ) && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="number"
                          name="discountedPrice"
                          value={dealFormData.discountedPrice}
                          onChange={handleDealInputChange}
                          required={dealTypeConfig?.requiredFields.includes(
                            "discountedPrice"
                          )}
                          min="0"
                          step="0.01"
                          className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isTeasable"
                      name="isTeasable"
                      checked={dealFormData.isTeasable}
                      onChange={handleDealInputChange}
                      className="h-5 w-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                    />
                    <label
                      htmlFor="isTeasable"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Teasable (Visible but locked for lower tiers)
                    </label>
                  </div>
                </div>
              )}

              {/* Tab 3: Usage & Validity */}
              {formTab === "Usage & Validity" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">
                        {t("usageLimitLabel")}{" "}
                        <span className="text-red-500">*</span>{" "}
                        {isTranslating.usageLimit && (
                          <SpinnerIcon className="inline w-4 h-4 ml-1 text-brand-primary" />
                        )}
                      </label>
                      <input
                        type="text"
                        name="usageLimit"
                        value={dealFormData.usageLimit}
                        onChange={handleDealInputChange}
                        required
                        placeholder="e.g. One per person"
                        className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">
                        {t("usageLimitTrLabel")}
                      </label>
                      <input
                        type="text"
                        name="usageLimit_tr"
                        value={dealFormData.usageLimit_tr}
                        onChange={handleDealInputChange}
                        required
                        placeholder="e.g. Kişi başı bir adet"
                        className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">
                        {t("validityLabel")}{" "}
                        <span className="text-red-500">*</span>{" "}
                        {isTranslating.validity && (
                          <SpinnerIcon className="inline w-4 h-4 ml-1 text-brand-primary" />
                        )}
                      </label>
                      <input
                        type="text"
                        name="validity"
                        value={dealFormData.validity}
                        onChange={handleDealInputChange}
                        required
                        placeholder="e.g. valid on weekdays"
                        className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">
                        {t("validityTrLabel")}
                      </label>
                      <input
                        type="text"
                        name="validity_tr"
                        value={dealFormData.validity_tr}
                        onChange={handleDealInputChange}
                        required
                        placeholder="e.g. hafta içi geçerlidir"
                        className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">
                      {t("termsUrlLabel")}
                    </label>
                    <input
                      type="url"
                      name="termsUrl"
                      value={dealFormData.termsUrl}
                      onChange={handleDealInputChange}
                      placeholder="https://..."
                      className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                    />
                  </div>

                  {/* Expiry logic */}
                  <div className="p-4 bg-gray-50 dark:bg-brand-bg rounded-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold mb-3">
                      Expiry Settings
                    </h4>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="neverExpires"
                          checked={neverExpires}
                          onChange={(e) => setNeverExpires(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-brand-primary"
                        />
                        <label
                          htmlFor="neverExpires"
                          className="text-sm font-medium"
                        >
                          No Expiry Date
                        </label>
                      </div>
                      {!neverExpires && (
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium">
                            Expires in
                          </label>
                          <input
                            type="number"
                            value={expiresInDays}
                            onChange={(e) => setExpiresInDays(e.target.value)}
                            className="w-20 bg-white dark:bg-gray-700 rounded-md p-1 border border-gray-300 dark:border-gray-600 text-sm"
                            min="1"
                          />
                          <span className="text-sm">days</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Redemption & Location */}
              {formTab === "Redemption & Location" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">
                        {t("redemptionCodeLabel")}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          name="redemptionCode"
                          value={dealFormData.redemptionCode}
                          onChange={handleDealInputChange}
                          required
                          className="flex-1 bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 font-mono"
                          placeholder="CODE-123"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const code = generateRedemptionCode(
                              dealFormData.category,
                              dealFormData.vendor
                            );
                            setDealFormData((prev) => ({
                              ...prev,
                              redemptionCode: code,
                            }));
                          }}
                          className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-1"
                        >
                          <Save className="w-4 h-4" />
                          Generate
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">
                        Global Redemption Limit (Total Supply)
                      </label>
                      <input
                        type="number"
                        name="maxRedemptionsTotal"
                        value={dealFormData.maxRedemptionsTotal ?? ""}
                        onChange={(e) => {
                          const val =
                            e.target.value === ""
                              ? null
                              : parseInt(e.target.value);
                          setDealFormData((prev) => ({
                            ...prev,
                            maxRedemptionsTotal: val,
                          }));
                        }}
                        placeholder="Infinite supply"
                        className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-2">
                      Redemption Style
                    </label>
                    <div className="flex gap-6">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dealFormData.redemptionStyle?.includes(
                            "online"
                          )}
                          onChange={(e) => {
                            const current = dealFormData.redemptionStyle || [];
                            const updated = e.target.checked
                              ? [...current, "online"]
                              : current.filter((s) => s !== "online");
                            setDealFormData((prev) => ({
                              ...prev,
                              redemptionStyle: updated as (
                                | "online"
                                | "in_store"
                              )[],
                            }));
                          }}
                          className="h-4 w-4 rounded text-brand-primary"
                        />
                        <span className="text-sm">Online</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dealFormData.redemptionStyle?.includes(
                            "in_store"
                          )}
                          onChange={(e) => {
                            const current = dealFormData.redemptionStyle || [];
                            const updated = e.target.checked
                              ? [...current, "in_store"]
                              : current.filter((s) => s !== "in_store");
                            setDealFormData((prev) => ({
                              ...prev,
                              redemptionStyle: updated as (
                                | "online"
                                | "in_store"
                              )[],
                            }));
                          }}
                          className="h-4 w-4 rounded text-brand-primary"
                        />
                        <span className="text-sm">In Store</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <StoreLocationFields
                      redemptionStyle={dealFormData.redemptionStyle || []}
                      storeLocations={dealFormData.storeLocations || []}
                      onChange={(locations) =>
                        setDealFormData((prev) => ({
                          ...prev,
                          storeLocations: locations,
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={resetDealForm}
                className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors flex items-center justify-center disabled:bg-gray-500 w-44"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <SpinnerIcon className="w-5 h-5 mr-2" />
                    <span>
                      {isGeneratingImage ? t("generatingImage") : t("saving")}
                    </span>
                  </>
                ) : editingDeal ? (
                  t("updateDeal")
                ) : (
                  t("saveDeal")
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Deal Preview"
        maxWidth="max-w-4xl"
      >
        <div className="max-h-[80vh] overflow-y-auto">
          {previewDeal && (
            <DealDetailView deal={previewDeal} isPreview={true} />
          )}
        </div>
      </Modal>

      <section>
        <h2 className="text-2xl font-bold mb-4">{t("allDeals")}</h2>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "active"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            onClick={() => setActiveTab("active")}
          >
            Active Deals
          </button>
          <button
            className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "sold_out"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            onClick={() => setActiveTab("sold_out")}
          >
            Sold Out
          </button>
          <button
            className={`py-2 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "expired"
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            onClick={() => setActiveTab("expired")}
          >
            Expired Deals
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-grow">
            <input
              type="text"
              name="search"
              id="admin-deals-search"
              aria-label="Search deals by title"
              placeholder="Search by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-brand-surface border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
          </div>
          <div className="w-full md:w-48">
            <select
              name="category"
              id="admin-deals-category"
              aria-label="Filter deals by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-white dark:bg-brand-surface border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            >
              <option value="All">{t("categoryAll")}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.icon} {language === "tr" ? cat.name_tr : cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedDealIds.length > 0 && (
          <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-lg p-3 mb-4 flex items-center justify-between animate-slide-up">
            <span className="text-sm font-medium text-brand-primary">
              {selectedDealIds.length} deals selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkExpire}
                className="px-3 py-1.5 transition-all duration-200 bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow-md active:scale-95 flex items-center gap-1"
              >
                Expire All
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 transition-all duration-200 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow-md active:scale-95 flex items-center gap-1"
              >
                Delete All
              </button>
              <button
                onClick={() => setSelectedDealIds([])}
                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-brand-surface rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-brand-text-muted">
              <thead className="text-xs text-gray-700 dark:text-brand-text-light uppercase bg-gray-50 dark:bg-brand-bg">
                <tr>
                  <th scope="col" className="px-6 py-3">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 dark:border-gray-600 text-brand-primary focus:ring-brand-primary"
                      checked={
                        filteredDeals.length > 0 &&
                        selectedDealIds.length === filteredDeals.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDealIds(filteredDeals.map((d) => d.id));
                        } else {
                          setSelectedDealIds([]);
                        }
                      }}
                    />
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Title
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Discount
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Redemptions
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Expires
                  </th>
                  <th scope="col" className="px-6 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((deal) => (
                  <tr
                    key={deal.id}
                    className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      selectedDealIds.includes(deal.id)
                        ? "bg-brand-primary/5"
                        : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 dark:border-gray-600 text-brand-primary focus:ring-brand-primary"
                        checked={selectedDealIds.includes(deal.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDealIds((prev) => [...prev, deal.id]);
                          } else {
                            setSelectedDealIds((prev) =>
                              prev.filter((id) => id !== deal.id)
                            );
                          }
                        }}
                      />
                    </td>
                    <th
                      scope="row"
                      className="px-6 py-4 font-medium text-gray-900 dark:text-brand-text-light whitespace-nowrap"
                    >
                      {deal.title}
                    </th>
                    <td className="px-6 py-4">{deal.category}</td>
                    <td className="px-6 py-4">${deal.discountedPrice}</td>
                    <td className="px-6 py-4">
                      {deal.discountPercentage
                        ? `${deal.discountPercentage}%`
                        : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-semibold">
                        {deal.redemptionsCount || 0} /{" "}
                        {deal.maxRedemptionsTotal
                          ? deal.maxRedemptionsTotal
                          : "∞"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          deal.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : deal.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {deal.status || "pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {new Date(deal.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() =>
                          updateDeal({
                            ...deal,
                            status:
                              deal.status === "approved"
                                ? "pending"
                                : "approved",
                          }).then(() => loadAdminDeals(adminPage))
                        }
                        className={`font-medium hover:underline ${
                          deal.status === "approved"
                            ? "text-yellow-600"
                            : "text-green-600"
                        }`}
                      >
                        {deal.status === "approved" ? "Suspend" : "Approve"}
                      </button>
                      <button
                        onClick={() => handleCloneDealClick(deal)}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        Clone
                      </button>
                      <button
                        onClick={() => handleEditDealClick(deal)}
                        className="font-medium text-brand-secondary hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteDealClick(deal.id)}
                        className="font-medium text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          <div className="flex justify-between items-center px-6 py-4 bg-gray-50 dark:bg-brand-bg border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-700 dark:text-brand-text-muted">
              Showing {(adminPage - 1) * ADMIN_DEALS_PER_PAGE + 1} to{" "}
              {Math.min(adminPage * ADMIN_DEALS_PER_PAGE, adminTotal)} of{" "}
              {adminTotal} deals
            </span>
            <div className="space-x-2">
              <button
                onClick={() => handleAdminPageChange(adminPage - 1)}
                disabled={adminPage === 1}
                className="px-4 py-2 bg-white dark:bg-brand-surface border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-brand-text-light hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handleAdminPageChange(adminPage + 1)}
                disabled={adminPage * ADMIN_DEALS_PER_PAGE >= adminTotal}
                className="px-4 py-2 bg-white dark:bg-brand-surface border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-brand-text-light hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default AdminDealsTab;
