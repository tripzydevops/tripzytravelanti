import React, { useState, useEffect } from "react";
import { getPendingDeals, updateDealStatus } from "../../lib/supabaseService";
import { useLanguage } from "../../contexts/LanguageContext";
import { Deal } from "../../types";
import Modal from "../Modal";

const AdminPendingApprovalsTab: React.FC = () => {
  const [pendingDeals, setPendingDeals] = useState<Deal[]>([]);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    loadPendingDeals();
  }, []);

  const loadPendingDeals = async () => {
    const deals = await getPendingDeals();
    setPendingDeals(deals);
  };

  const handleApproveDeal = async (dealId: string) => {
    if (window.confirm("Approve this deal?")) {
      await updateDealStatus(dealId, "approved");
      loadPendingDeals();
    }
  };

  const handleRejectDeal = async (dealId: string) => {
    if (window.confirm("Reject this deal?")) {
      await updateDealStatus(dealId, "rejected");
      loadPendingDeals();
    }
  };

  return (
    <section>
      <h2 className="text-2xl font-bold mb-4 text-brand-text-light">
        {t("adminPendingApprovals")}
      </h2>
      <div className="glass-premium rounded-xl overflow-hidden shadow-xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-brand-text-muted">
            <thead className="text-xs text-brand-text-muted uppercase bg-white/5 border-b border-white/10">
              <tr>
                <th scope="col" className="px-6 py-3">
                  {t("titleLabel")}
                </th>
                <th scope="col" className="px-6 py-3">
                  {t("vendorLabel")}
                </th>
                <th scope="col" className="px-6 py-3">
                  {t("categoryLabel")}
                </th>
                <th scope="col" className="px-6 py-3">
                  {t("priceLabel")}
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {pendingDeals.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-brand-text-muted"
                  >
                    {t("noResults")}
                  </td>
                </tr>
              ) : (
                pendingDeals.map((deal) => (
                  <tr
                    key={deal.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <th
                      scope="row"
                      className="px-6 py-4 font-medium text-gray-900 dark:text-brand-text-light whitespace-nowrap"
                    >
                      <div className="flex items-center">
                        {deal.imageUrl && (
                          <img
                            src={deal.imageUrl}
                            alt=""
                            className="w-8 h-8 rounded object-cover mr-2"
                          />
                        )}
                        {deal.title}
                      </div>
                    </th>
                    <td className="px-6 py-4">{deal.vendor}</td>
                    <td className="px-6 py-4">{deal.category}</td>
                    <td className="px-6 py-4 text-brand-text-muted">
                      ${deal.discountedPrice}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button
                        onClick={() => setEditingDeal(deal)}
                        className="px-3 py-1 text-sm font-medium text-brand-primary hover:text-brand-primary-light transition-colors"
                      >
                        {t("viewDetails") || "View Details"}
                      </button>
                      <button
                        onClick={() => handleApproveDeal(deal.id)}
                        className="px-3 py-1 text-sm font-medium text-green-500 hover:text-green-400 transition-colors"
                      >
                        {t("approve") || "Approve"}
                      </button>
                      <button
                        onClick={() => handleRejectDeal(deal.id)}
                        className="px-3 py-1 text-sm font-medium text-red-500 hover:text-red-400 transition-colors"
                      >
                        {t("reject") || "Reject"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deal Details Modal */}
      {editingDeal && (
        <Modal
          isOpen={!!editingDeal}
          onClose={() => setEditingDeal(null)}
          title={t("dealDetails")}
        >
          <div className="space-y-6">
            {editingDeal.imageUrl && (
              <img
                src={editingDeal.imageUrl}
                alt={editingDeal.title}
                className="w-full h-56 object-cover rounded-xl shadow-lg border border-white/10"
              />
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">
                  {t("titleLabel")}
                </h3>
                <p className="text-brand-text-light font-medium">
                  {editingDeal.title}
                </p>
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">
                  {t("titleTrLabel")}
                </h3>
                <p className="text-brand-text-light font-medium">
                  {editingDeal.title_tr || "-"}
                </p>
              </div>
              <div className="space-y-1 col-span-2">
                <h3 className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">
                  {t("descriptionLabel")}
                </h3>
                <p className="text-brand-text-muted text-sm leading-relaxed">
                  {editingDeal.description}
                </p>
              </div>
              <div className="space-y-1 col-span-2">
                <h3 className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">
                  {t("descriptionTrLabel")}
                </h3>
                <p className="text-brand-text-muted text-sm leading-relaxed">
                  {editingDeal.description_tr || "-"}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <h3 className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">
                  {t("originalPrice")}
                </h3>
                <p className="text-xl font-bold text-brand-text-light">
                  ${editingDeal.originalPrice}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-brand-primary/10 border border-brand-primary/20 space-y-1">
                <h3 className="text-xs font-bold text-brand-primary/70 uppercase tracking-wider">
                  {t("discountedPrice")}
                </h3>
                <div className="flex items-baseline space-x-2">
                  <p className="text-2xl font-black text-brand-primary">
                    ${editingDeal.discountedPrice}
                  </p>
                  <span className="text-sm font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                    {editingDeal.discountPercentage}% {t("discountAmount")}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">
                  {t("categoryLabel")}
                </h3>
                <p className="text-brand-text-light">{editingDeal.category}</p>
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">
                  {t("expiresInDaysLabel")}
                </h3>
                <p className="text-brand-text-light">
                  {new Date(editingDeal.expiresAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => {
                  handleRejectDeal(editingDeal.id);
                  setEditingDeal(null);
                }}
                className="px-6 py-2.5 bg-white/5 text-red-500 border border-red-500/30 rounded-xl font-bold hover:bg-red-500/10 transition-all"
              >
                {t("reject") || "Reject"}
              </button>
              <button
                onClick={() => {
                  handleApproveDeal(editingDeal.id);
                  setEditingDeal(null);
                }}
                className="px-6 py-2.5 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary-light transition-all shadow-lg shadow-brand-primary/20"
              >
                {t("approve") || "Approve"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
};

export default AdminPendingApprovalsTab;
