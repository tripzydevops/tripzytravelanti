import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { useUserActivity } from "../contexts/UserActivityContext";
import { useDeals } from "../contexts/DealContext";
import {
  CustomBriefcaseIcon,
  SparklesIcon,
  ClockIcon,
  CheckCircle,
  XCircle,
  ArrowRightIcon,
  CustomHeartIcon,
} from "../components/Icons";
import { supabase } from "../lib/supabaseClient";
import DealCard from "../components/DealCard";
import DealCardSkeleton from "../components/DealCardSkeleton";
import PullToRefresh from "../components/PullToRefresh";
import { Deal, SubscriptionTier } from "../types";
import {
  getWalletLimit,
  getWalletUsagePercent,
  isWalletNearCapacity,
  isWalletFull,
  formatWalletLimit,
} from "../lib/walletUtils";

interface WalletDeal extends Deal {
  walletStatus: "active" | "redeemed" | "expired";
  acquiredAt: string;
}

type MainTabType = "active" | "wishlist" | "history";
type FilterType = "all" | "active" | "redeemed" | "expired";
type SortType = "recent" | "expiring" | "value";

const WalletPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { savedDeals: savedDealIds } = useUserActivity();
  const { deals: allDeals } = useDeals();

  const [walletDeals, setWalletDeals] = useState<WalletDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState<MainTabType>("active");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("recent");

  const fetchWalletDeals = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data: userDeals, error } = await supabase
        .from("wallet_items")
        .select("deal_id, status, created_at, redemption_code")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (userDeals && userDeals.length > 0) {
        const dealIds = userDeals.map((ud) => ud.deal_id);
        const { data: dealsData, error: dealsError } = await supabase
          .from("deals")
          .select("*")
          .in("id", dealIds);

        if (dealsError) throw dealsError;

        const statusMap = new Map(
          userDeals.map((ud) => [
            ud.deal_id,
            {
              status: ud.status,
              acquiredAt: ud.created_at,
              redemptionCode: ud.redemption_code,
            },
          ])
        );

        const mappedDeals: WalletDeal[] =
          dealsData?.map((dbDeal: any) => {
            const userDealInfo = statusMap.get(dbDeal.id);
            return {
              ...dbDeal,
              id: dbDeal.id,
              title: dbDeal.title,
              title_tr: dbDeal.title_tr,
              description: dbDeal.description,
              description_tr: dbDeal.description_tr,
              imageUrl: dbDeal.image_url,
              category: dbDeal.category,
              category_tr: dbDeal.category_tr,
              originalPrice: dbDeal.original_price,
              discountedPrice: dbDeal.discounted_price,
              discountPercentage: dbDeal.discount_percentage,
              requiredTier: dbDeal.required_tier,
              vendor: dbDeal.vendor,
              expiresAt: dbDeal.expires_at,
              rating: dbDeal.rating || 0,
              ratingCount: dbDeal.rating_count || 0,
              companyLogoUrl: dbDeal.company_logo_url,
              createdAt: dbDeal.created_at,
              walletStatus: userDealInfo?.status || "active",
              acquiredAt: userDealInfo?.acquiredAt || "",
              redemptionCode:
                userDealInfo?.redemptionCode || dbDeal.redemption_code,
            };
          }) || [];

        setWalletDeals(mappedDeals);
      } else {
        setWalletDeals([]);
      }
    } catch (err) {
      console.error("Error fetching wallet deals:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWalletDeals();
  }, [fetchWalletDeals]);

  // Wishlist deals from context
  const wishlistDeals = useMemo(() => {
    return allDeals.filter((deal) => savedDealIds.includes(deal.id));
  }, [allDeals, savedDealIds]);

  // Calculate total savings
  const totalSavings = useMemo(() => {
    return walletDeals.reduce((sum, deal) => {
      if (deal.originalPrice && deal.discountedPrice) {
        return sum + (deal.originalPrice - deal.discountedPrice);
      }
      return sum;
    }, 0);
  }, [walletDeals]);

  // Main logic for current display
  const currentDisplayDeals = useMemo(() => {
    if (activeMainTab === "wishlist") return wishlistDeals;

    let filtered = [...walletDeals];
    if (activeMainTab === "active") {
      filtered = filtered.filter((d) => d.walletStatus === "active");
    } else if (activeMainTab === "history") {
      filtered = filtered.filter(
        (d) => d.walletStatus === "redeemed" || d.walletStatus === "expired"
      );
    }

    // Apply sort
    switch (sortBy) {
      case "expiring":
        filtered.sort(
          (a, b) =>
            new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
        );
        break;
      case "value":
        filtered.sort((a, b) => {
          const aValue = (a.originalPrice || 0) - (a.discountedPrice || 0);
          const bValue = (b.originalPrice || 0) - (b.discountedPrice || 0);
          return bValue - aValue;
        });
        break;
      case "recent":
      default:
        filtered.sort(
          (a, b) =>
            new Date(b.acquiredAt || b.createdAt).getTime() -
            new Date(a.acquiredAt || a.createdAt).getTime()
        );
        break;
    }

    return filtered;
  }, [walletDeals, wishlistDeals, activeMainTab, sortBy]);

  // Count by status
  const counts = useMemo(
    () => ({
      active: walletDeals.filter((d) => d.walletStatus === "active").length,
      wishlist: wishlistDeals.length,
      history: walletDeals.filter(
        (d) => d.walletStatus === "redeemed" || d.walletStatus === "expired"
      ).length,
    }),
    [walletDeals, wishlistDeals]
  );

  // Check if deal expires soon (within 48 hours)
  const getExpiryWarning = (expiresAt: string): "today" | "soon" | null => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const hoursLeft = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursLeft <= 0) return null;
    if (hoursLeft <= 24) return "today";
    if (hoursLeft <= 48) return "soon";
    return null;
  };

  // Status badge component
  const StatusBadge: React.FC<{ status: WalletDeal["walletStatus"] }> = ({
    status,
  }) => {
    const config = {
      active: {
        bg: "bg-emerald-500/80",
        border: "border-emerald-400/30",
        text: t("walletStatusActive"),
        icon: <CheckCircle className="w-3 h-3" />,
        glow: "shadow-[0_0_15px_rgba(16,185,129,0.3)]",
      },
      redeemed: {
        bg: "bg-blue-500/80",
        border: "border-blue-400/30",
        text: t("walletStatusRedeemed"),
        icon: <CheckCircle className="w-3 h-3" />,
        glow: "shadow-[0_0_15px_rgba(59,130,246,0.3)]",
      },
      expired: {
        bg: "bg-gray-500/80",
        border: "border-gray-400/30",
        text: t("walletStatusExpired"),
        icon: <XCircle className="w-3 h-3" />,
        glow: "shadow-[0_0_15px_rgba(107,114,128,0.3)]",
      },
    };
    const { bg, border, text, icon, glow } = config[status];

    return (
      <div
        className={`absolute top-3 right-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider text-white uppercase backdrop-blur-md border ${border} ${bg} ${glow} transition-all duration-300 group-hover:scale-105`}
      >
        <span className="opacity-90">{icon}</span>
        {text}
      </div>
    );
  };

  // Main tabs config
  const mainTabs: {
    key: MainTabType;
    labelKey: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { key: "active", labelKey: "walletTabActive", icon: CustomBriefcaseIcon },
    { key: "wishlist", labelKey: "bottomNavWishlist", icon: CustomHeartIcon }, // Reuse wishlist key
    { key: "history", labelKey: "walletTabHistory", icon: ClockIcon },
  ];

  return (
    <PullToRefresh onRefresh={fetchWalletDeals} className="min-h-screen">
      <div className="container mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-white mb-2">
            {t("collectionHubTitle") || "Collection"}
          </h1>
          <p className="text-lg text-white/60">
            {t("collectionHubSubtitle") ||
              "Your personal hub for active deals and wishlist"}
          </p>
        </header>

        {/* Main Collection Tabs */}
        <div className="flex p-1.5 bg-white/5 border border-white/10 rounded-2xl mb-8 max-w-2xl mx-auto shadow-inner">
          {mainTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveMainTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 ${
                activeMainTab === tab.key
                  ? "bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-lg"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
              }`}
            >
              <tab.icon
                className={`w-5 h-5 ${
                  activeMainTab === tab.key ? "text-white" : "text-current"
                }`}
              />
              <span className="font-bold text-sm">
                {t(tab.labelKey)}
                <span
                  className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] ${
                    activeMainTab === tab.key ? "bg-white/20" : "bg-white/10"
                  }`}
                >
                  {counts[tab.key]}
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Savings Summary (Only for Active/History) */}
        {activeMainTab !== "wishlist" &&
          walletDeals.length > 0 &&
          totalSavings > 0 && (
            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-gold-500/20 via-gold-400/10 to-gold-500/20 border border-gold-500/30 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gold-500/20 border border-gold-500/30">
                    <SparklesIcon className="w-6 h-6 text-gold-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gold-400/80 font-medium">
                      {t("walletSavingsSummary") || "You've saved"}
                    </p>
                    <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-gold-500">
                      ₺{totalSavings.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/40 uppercase tracking-wider">
                    {t("walletTotalSavings")}
                  </p>
                  <p className="text-lg font-semibold text-white/80">
                    {walletDeals.length}{" "}
                    {language === "tr" ? "fırsat" : "deals"}
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* Wallet Capacity Progress Bar */}
        {user &&
          (() => {
            const userTier = user.tier || SubscriptionTier.FREE;
            const limit = getWalletLimit(userTier, user.walletLimit);
            const usagePercent = getWalletUsagePercent(
              counts.active,
              userTier,
              user.walletLimit
            );
            const nearCapacity = isWalletNearCapacity(
              counts.active,
              userTier,
              user.walletLimit
            );
            const isFull = isWalletFull(
              counts.active,
              userTier,
              user.walletLimit
            );
            const isUnlimited = limit >= 999999;

            return (
              <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CustomBriefcaseIcon className="w-5 h-5 text-gold-400" />
                    <span className="text-sm font-medium text-white/80">
                      {t("walletCapacity")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isFull && !isUnlimited && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                        {t("walletCapacityFull")}
                      </span>
                    )}
                    {nearCapacity && !isFull && !isUnlimited && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        {t("walletCapacityNearFull")}
                      </span>
                    )}
                    <span className="text-sm font-bold text-white">
                      {isUnlimited ? (
                        <span className="text-gold-400">
                          ∞ {t("walletCapacityUnlimited")}
                        </span>
                      ) : (
                        <span>
                          {counts.active} / {limit}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Premium Progress Bar */}
                {!isUnlimited && (
                  <div className="relative h-4 rounded-full overflow-hidden bg-white/5 border border-white/10 shadow-inner">
                    {/* Background track glow */}
                    <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-gold-500/0 via-gold-500/10 to-gold-500/0"></div>

                    {/* Progress fill */}
                    <div
                      className={`relative h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(212,175,55,0.3)] ${
                        isFull
                          ? "bg-gradient-to-r from-red-600 via-red-400 to-red-600"
                          : nearCapacity
                          ? "bg-gradient-to-r from-orange-600 via-gold-400 to-orange-600"
                          : "bg-gradient-to-r from-gold-600 via-gold-400 to-gold-600"
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    >
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer skew-x-12"></div>

                      {/* Top shine */}
                      <div className="absolute inset-x-0 top-0 h-[40%] bg-white/20 rounded-t-full"></div>

                      {/* Subtle pulse for near capacity */}
                      {(nearCapacity || isFull) && (
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Upgrade prompt when near/at capacity */}
                {(nearCapacity || isFull) && !isUnlimited && (
                  <Link
                    to="/subscriptions"
                    className="mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-gold-500/20 to-gold-600/20 border border-gold-500/30 text-gold-400 text-sm font-medium hover:from-gold-500/30 hover:to-gold-600/30 transition-all group"
                  >
                    <SparklesIcon className="w-4 h-4" />
                    {t("walletUpgradePrompt")}
                    <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                )}
              </div>
            );
          })()}

        {/* Sort Options */}
        {currentDisplayDeals.length > 1 && (
          <div className="flex items-center gap-2 mb-6">
            <span className="text-sm text-white/40">
              {language === "tr" ? "Sırala:" : "Sort:"}
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gold-500/50"
            >
              <option value="recent">{t("walletSortRecent")}</option>
              <option value="expiring">{t("walletSortExpiring")}</option>
              <option value="value">{t("walletSortValue")}</option>
            </select>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
            <DealCardSkeleton count={6} />
          </div>
        ) : currentDisplayDeals.length > 0 ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6 items-stretch animate-fade-in-up">
            {currentDisplayDeals.map((deal, index) => {
              // Check if deal is from wallet (has walletStatus) or from wishlist
              const isWalletDeal = "walletStatus" in deal;
              const walletStatus = isWalletDeal
                ? (deal as WalletDeal).walletStatus
                : null;
              const expiryWarning =
                walletStatus === "active"
                  ? getExpiryWarning(deal.expiresAt)
                  : null;

              return (
                <div
                  key={deal.id}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className="relative group h-full animate-fade-in-up"
                >
                  {/* Status Badge */}
                  {isWalletDeal && (
                    <StatusBadge
                      status={walletStatus as WalletDeal["walletStatus"]}
                    />
                  )}

                  {/* Expiry Warning Overlay */}
                  {expiryWarning && (
                    <div
                      className={`absolute top-12 right-3 z-30 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-white ${
                        expiryWarning === "today"
                          ? "bg-gradient-to-r from-red-500 to-red-600 animate-pulse"
                          : "bg-gradient-to-r from-orange-500 to-orange-600"
                      } shadow-lg border border-white/20`}
                    >
                      <ClockIcon className="w-3 h-3" />
                      {expiryWarning === "today"
                        ? t("walletExpiresToday")
                        : t("walletExpiresSoon")}
                    </div>
                  )}

                  <DealCard deal={deal} />

                  {/* Quick Use Button for Active Deals */}
                  {walletStatus === "active" && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(`/deals/${deal.id}`);
                      }}
                      className="absolute bottom-4 left-4 right-4 z-30 py-2 px-4 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-white font-bold text-sm shadow-lg hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0"
                    >
                      {t("walletUseNow") || "Use Now"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/5 backdrop-blur-md rounded-[2.5rem] border border-white/5 mx-auto max-w-lg shadow-2xl relative overflow-hidden group">
            {/* Background Decorative Elements */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-gold-500/10 rounded-full blur-[50px] group-hover:bg-gold-500/20 transition-all duration-700"></div>
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-purple-500/10 rounded-full blur-[50px] group-hover:bg-purple-500/20 transition-all duration-700"></div>

            <div className="relative z-10 flex flex-col items-center px-6">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                <CustomBriefcaseIcon className="w-12 h-12 text-white/20 group-hover:text-gold-400/50 transition-colors" />
              </div>

              <h3 className="text-2xl font-bold text-white mb-3">
                {activeMainTab === "wishlist"
                  ? t("emptyWishlist") || "Your wishlist is empty"
                  : t("emptyWallet") || "Your collection is empty"}
              </h3>

              <p className="text-white/40 mb-10 max-w-xs leading-relaxed">
                {activeMainTab === "wishlist"
                  ? "Save deals you love to keep track of them and never miss a price drop."
                  : "Start claiming deals to see them here. Your saved and redeemed deals will appear in this hub."}
              </p>

              <Link
                to="/"
                className="px-10 py-4 rounded-full bg-gradient-to-r from-gold-500 to-gold-600 text-white font-bold shadow-lg hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest"
              >
                {t("browseDeals") || "Discover Deals"}
              </Link>
            </div>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
};

export default WalletPage;
