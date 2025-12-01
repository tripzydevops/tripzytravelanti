import React, { useState, useEffect } from 'react';
import { getAllSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan } from '../../lib/subscriptionService';

const AdminSubscriptionsTab: React.FC = () => {
    const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
    const [isSubscriptionFormVisible, setIsSubscriptionFormVisible] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any | null>(null);
    const [planFormData, setPlanFormData] = useState<any>({
        tier: '',
        name: '',
        name_tr: '',
        price: 0,
        price_tr: 0,
        redemptions_per_period: 0,
        features: [],
        features_tr: [],
        is_active: true
    });

    useEffect(() => {
        loadSubscriptionPlans();
    }, []);

    const loadSubscriptionPlans = async () => {
        try {
            const plans = await getAllSubscriptionPlans();
            setSubscriptionPlans(plans);
        } catch (error) {
            console.error('Error loading plans:', error);
        }
    };

    const handlePlanSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingPlan) {
                await updateSubscriptionPlan(editingPlan.id, planFormData);
            } else {
                await createSubscriptionPlan(planFormData);
            }
            setIsSubscriptionFormVisible(false);
            setEditingPlan(null);
            loadSubscriptionPlans();
        } catch (error) {
            console.error('Error saving plan:', error);
        }
    };

    const handleEditPlanClick = (plan: any) => {
        setEditingPlan(plan);
        setPlanFormData(plan);
        setIsSubscriptionFormVisible(true);
    };

    const handleDeletePlanClick = async (planId: string) => {
        if (window.confirm('Are you sure you want to deactivate this plan?')) {
            try {
                await deleteSubscriptionPlan(planId);
                loadSubscriptionPlans();
            } catch (error) {
                console.error('Error deleting plan:', error);
            }
        }
    };

    return (
        <>
            {!isSubscriptionFormVisible && (
                <button onClick={() => { setEditingPlan(null); setPlanFormData({ tier: '', name: '', name_tr: '', price: 0, price_tr: 0, redemptions_per_period: 0, features: [], features_tr: [], is_active: true }); setIsSubscriptionFormVisible(true); }} className="mb-6 bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors">
                    Add Plan
                </button>
            )}

            {isSubscriptionFormVisible && (
                <section className="bg-white dark:bg-brand-surface p-6 rounded-lg mb-8 shadow-sm">
                    <h2 className="text-2xl font-bold mb-4">{editingPlan ? 'Edit Plan' : 'Add Plan'}</h2>
                    <form onSubmit={handlePlanSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium mb-1">Tier Key (Unique)</label><input type="text" value={planFormData.tier} onChange={e => setPlanFormData({ ...planFormData, tier: e.target.value })} className="w-full p-2 border rounded" required /></div>
                            <div><label className="block text-sm font-medium mb-1">Redemptions/Year</label><input type="number" value={planFormData.redemptions_per_period} onChange={e => setPlanFormData({ ...planFormData, redemptions_per_period: parseInt(e.target.value) })} className="w-full p-2 border rounded" required /></div>
                            <div><label className="block text-sm font-medium mb-1">Name (EN)</label><input type="text" value={planFormData.name} onChange={e => setPlanFormData({ ...planFormData, name: e.target.value })} className="w-full p-2 border rounded" required /></div>
                            <div><label className="block text-sm font-medium mb-1">Name (TR)</label><input type="text" value={planFormData.name_tr} onChange={e => setPlanFormData({ ...planFormData, name_tr: e.target.value })} className="w-full p-2 border rounded" required /></div>
                            <div><label className="block text-sm font-medium mb-1">Price (USD)</label><input type="number" step="0.01" value={planFormData.price} onChange={e => setPlanFormData({ ...planFormData, price: parseFloat(e.target.value) })} className="w-full p-2 border rounded" required /></div>
                            <div><label className="block text-sm font-medium mb-1">Price (TL)</label><input type="number" step="0.01" value={planFormData.price_tr} onChange={e => setPlanFormData({ ...planFormData, price_tr: parseFloat(e.target.value) })} className="w-full p-2 border rounded" required /></div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium mb-1">Features (EN) - JSON Array</label>
                                <textarea value={JSON.stringify(planFormData.features)} onChange={e => { try { setPlanFormData({ ...planFormData, features: JSON.parse(e.target.value) }); } catch (err) { } }} className="w-full p-2 border rounded h-24" />
                                <p className="text-xs text-gray-500">Enter as valid JSON array, e.g. ["Feature 1", "Feature 2"]</p>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium mb-1">Features (TR) - JSON Array</label>
                                <textarea value={JSON.stringify(planFormData.features_tr)} onChange={e => { try { setPlanFormData({ ...planFormData, features_tr: JSON.parse(e.target.value) }); } catch (err) { } }} className="w-full p-2 border rounded h-24" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-4">
                            <button type="button" onClick={() => setIsSubscriptionFormVisible(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded">Save</button>
                        </div>
                    </form>
                </section>
            )}

            <div className="bg-white dark:bg-brand-surface rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-brand-bg">
                        <tr>
                            <th className="px-6 py-3">Tier</th>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Price</th>
                            <th className="px-6 py-3">Redemptions</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {subscriptionPlans.map(plan => (
                            <tr key={plan.id} className="border-b">
                                <td className="px-6 py-4">{plan.tier}</td>
                                <td className="px-6 py-4">{plan.name} / {plan.name_tr}</td>
                                <td className="px-6 py-4">${plan.price} / ₺{plan.price_tr}</td>
                                <td className="px-6 py-4">{plan.redemptions_per_period}</td>
                                <td className="px-6 py-4">{plan.is_active ? 'Active' : 'Inactive'}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => handleEditPlanClick(plan)} className="text-blue-500 hover:underline">Edit</button>
                                    {plan.is_active && <button onClick={() => handleDeletePlanClick(plan.id)} className="text-red-500 hover:underline">Deactivate</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
};

export default AdminSubscriptionsTab;
