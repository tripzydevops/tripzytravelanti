import React, { useState, useEffect } from 'react';
import { Deal } from '../../types';
import Modal from '../Modal';
import { getPendingDeals, updateDealStatus } from '../../lib/supabaseService';

const AdminPendingApprovalsTab: React.FC = () => {
    const [pendingDeals, setPendingDeals] = useState<Deal[]>([]);
    const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

    useEffect(() => {
        loadPendingDeals();
    }, []);

    const loadPendingDeals = async () => {
        const deals = await getPendingDeals();
        setPendingDeals(deals);
    };

    const handleApproveDeal = async (dealId: string) => {
        if (window.confirm('Approve this deal?')) {
            await updateDealStatus(dealId, 'approved');
            loadPendingDeals();
        }
    };

    const handleRejectDeal = async (dealId: string) => {
        if (window.confirm('Reject this deal?')) {
            await updateDealStatus(dealId, 'rejected');
            loadPendingDeals();
        }
    };

    return (
        <section>
            <h2 className="text-2xl font-bold mb-4">Pending Approvals</h2>
            <div className="glass-premium rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-white/60 uppercase bg-white/5">
                            <tr>
                                <th scope="col" className="px-6 py-3">Title</th>
                                <th scope="col" className="px-6 py-3">Partner</th>
                                <th scope="col" className="px-6 py-3">Category</th>
                                <th scope="col" className="px-6 py-3">Price</th>
                                <th scope="col" className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {pendingDeals.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-white/50">
                                        No pending deals.
                                    </td>
                                </tr>
                            ) : (
                                pendingDeals.map(deal => (
                                    <tr key={deal.id} className="hover:bg-white/5 transition-colors">
                                        <th scope="row" className="px-6 py-4 font-medium text-white whitespace-nowrap">
                                            <div className="flex items-center">
                                                {deal.imageUrl && <img src={deal.imageUrl} alt="" className="w-8 h-8 rounded object-cover mr-2" />}
                                                {deal.title}
                                            </div>
                                        </th>
                                        <td className="px-6 py-4">{deal.vendor}</td>
                                        <td className="px-6 py-4">{deal.category}</td>
                                        <td className="px-6 py-4">${deal.discountedPrice}</td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => setEditingDeal(deal)} className="font-medium text-blue-400 hover:text-blue-300 hover:underline">View Details</button>
                                            <button onClick={() => handleApproveDeal(deal.id)} className="font-medium text-green-400 hover:text-green-300 hover:underline">Approve</button>
                                            <button onClick={() => handleRejectDeal(deal.id)} className="font-medium text-red-500 hover:text-red-400 hover:underline">Reject</button>
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
                <Modal isOpen={!!editingDeal} onClose={() => setEditingDeal(null)} title="Deal Details">
                    <div className="space-y-4">
                        {editingDeal.imageUrl && (
                            <img src={editingDeal.imageUrl} alt={editingDeal.title} className="w-full h-48 object-cover rounded-lg" />
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500">Title (EN)</h3>
                                <p>{editingDeal.title}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500">Title (TR)</h3>
                                <p>{editingDeal.title_tr || '-'}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500">Description (EN)</h3>
                                <p className="text-sm">{editingDeal.description}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500">Description (TR)</h3>
                                <p className="text-sm">{editingDeal.description_tr || '-'}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500">Original Price</h3>
                                <p>${editingDeal.originalPrice}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500">Discounted Price</h3>
                                <p>${editingDeal.discountedPrice} ({editingDeal.discountPercentage}%)</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500">Category</h3>
                                <p>{editingDeal.category}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500">Expires At</h3>
                                <p>{new Date(editingDeal.expiresAt).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t">
                            <button
                                onClick={() => { handleRejectDeal(editingDeal.id); setEditingDeal(null); }}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                            >
                                Reject
                            </button>
                            <button
                                onClick={() => { handleApproveDeal(editingDeal.id); setEditingDeal(null); }}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Approve
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </section>
    );
};

export default AdminPendingApprovalsTab;
