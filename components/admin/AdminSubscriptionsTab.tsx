import React, { useState, useEffect } from 'react';
import { getAllSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan } from '../../lib/subscriptionService';

const AdminSubscriptionsTab: React.FC = () => {
    const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
    const [isSubscriptionFormVisible, setIsSubscriptionFormVisible] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any | null>(null);
    const [showTranslations, setShowTranslations] = useState(false);
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
    // Features as text (one per line for easy editing)
    const [featuresText, setFeaturesText] = useState('');
    const [featuresTrText, setFeaturesTrText] = useState('');

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
            const dataToSave = {
                ...planFormData,
                features: featuresText.split('\n').filter(f => f.trim()),
                features_tr: featuresTrText.split('\n').filter(f => f.trim())
            };
            if (editingPlan) {
                await updateSubscriptionPlan(editingPlan.id, dataToSave);
            } else {
                await createSubscriptionPlan(dataToSave);
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
        setFeaturesText(Array.isArray(plan.features) ? plan.features.join('\n') : '');
        setFeaturesTrText(Array.isArray(plan.features_tr) ? plan.features_tr.join('\n') : '');
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

    const resetForm = () => {
        setEditingPlan(null);
        setPlanFormData({ tier: '', name: '', name_tr: '', price: 0, price_tr: 0, redemptions_per_period: 0, features: [], features_tr: [], is_active: true });
        setFeaturesText('');
        setFeaturesTrText('');
        setShowTranslations(false);
        setIsSubscriptionFormVisible(true);
    };

    return (
        <>
            {!isSubscriptionFormVisible && (
                <button onClick={resetForm} className="mb-6 bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors">
                    Add Plan
                </button>
            )}

            {isSubscriptionFormVisible && (
                <section className="bg-white dark:bg-brand-surface p-6 rounded-lg mb-8 shadow-sm">
                    <h2 className="text-2xl font-bold mb-4">{editingPlan ? 'Edit Plan' : 'Add Plan'}</h2>
                    <form onSubmit={handlePlanSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div><label className="block text-sm font-medium mb-1">Tier Key (Unique)</label><input type="text" value={planFormData.tier} onChange={e => setPlanFormData({ ...planFormData, tier: e.target.value })} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required /></div>
                            <div><label className="block text-sm font-medium mb-1">Redemptions/Year</label><input type="number" value={planFormData.redemptions_per_period} onChange={e => setPlanFormData({ ...planFormData, redemptions_per_period: parseInt(e.target.value) })} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required /></div>
                            <div><label className="block text-sm font-medium mb-1">Price (₺ TRY)</label><input type="number" step="0.01" value={planFormData.price_tr} onChange={e => setPlanFormData({ ...planFormData, price_tr: parseFloat(e.target.value) })} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required /></div>
                        </div>

                        <div><label className="block text-sm font-medium mb-1">Plan Name</label><input type="text" value={planFormData.name} onChange={e => setPlanFormData({ ...planFormData, name: e.target.value })} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="e.g. Premium" required /></div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Features (one per line)</label>
                            <textarea value={featuresText} onChange={e => setFeaturesText(e.target.value)} className="w-full p-2 border rounded h-24 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Unlimited deals&#10;Priority support&#10;Early access" />
                        </div>

                        {/* Collapsible Translations */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                            <button type="button" onClick={() => setShowTranslations(!showTranslations)} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 text-left text-sm font-medium text-gray-600 dark:text-gray-400 flex justify-between items-center">
                                <span>📝 {showTranslations ? 'Hide' : 'View/Edit'} Turkish Translations</span>
                                <span className={`transform transition-transform ${showTranslations ? 'rotate-180' : ''}`}>▼</span>
                            </button>
                            {showTranslations && (
                                <div className="p-3 space-y-3 bg-gray-50/50 dark:bg-gray-800/50">
                                    <div><label className="block text-xs font-medium text-gray-500 mb-1">Plan Name (Turkish)</label><input type="text" value={planFormData.name_tr} onChange={e => setPlanFormData({ ...planFormData, name_tr: e.target.value })} className="w-full p-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                                    <div><label className="block text-xs font-medium text-gray-500 mb-1">Features (Turkish - one per line)</label><textarea value={featuresTrText} onChange={e => setFeaturesTrText(e.target.value)} className="w-full p-2 border rounded h-20 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                                    <div><label className="block text-xs font-medium text-gray-500 mb-1">Price ($ USD - for international users)</label><input type="number" step="0.01" value={planFormData.price} onChange={e => setPlanFormData({ ...planFormData, price: parseFloat(e.target.value) })} className="w-full p-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-4 pt-4 border-t">
                            <button type="button" onClick={() => setIsSubscriptionFormVisible(false)} className="px-4 py-2 bg-gray-200 rounded dark:bg-gray-600 dark:text-white">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded">Save Plan</button>
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
                            <tr key={plan.id} className="border-b dark:border-gray-700">
                                <td className="px-6 py-4 font-medium">{plan.tier}</td>
                                <td className="px-6 py-4">{plan.name}</td>
                                <td className="px-6 py-4">₺{plan.price_tr}</td>
                                <td className="px-6 py-4">{plan.redemptions_per_period}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${plan.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                        {plan.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
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

