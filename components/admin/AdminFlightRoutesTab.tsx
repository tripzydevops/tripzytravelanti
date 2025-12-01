import React, { useState, useMemo } from 'react';
import { useDeals } from '../../contexts/DealContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Deal, SubscriptionTier } from '../../types';
import ImageUpload from '../ImageUpload';

const AdminFlightRoutesTab: React.FC = () => {
    const { deals, addDeal, updateDeal, deleteDeal } = useDeals();
    const { t } = useLanguage();
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [editingRoute, setEditingRoute] = useState<Deal | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        origin: '',
        destination: '',
        imageUrl: '',
        departDate: '',
        price: 0,
    });

    const flightRoutes = useMemo(() => deals.filter(d => d.category === 'FlightWidget'), [deals]);

    const handleEditClick = (deal: Deal) => {
        setEditingRoute(deal);
        setFormData({
            title: deal.title,
            origin: deal.vendor, // Vendor stores Origin
            destination: deal.redemptionCode, // Redemption Code stores Destination
            imageUrl: deal.imageUrl,
            departDate: deal.expiresAt, // Expires At stores Departure Date
            price: deal.discountedPrice, // Discounted Price stores Price
        });
        setIsFormVisible(true);
    };

    const handleDeleteClick = (id: string) => {
        if (window.confirm('Are you sure you want to delete this route?')) {
            deleteDeal(id);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const dealData: any = {
            title: formData.title,
            title_tr: formData.title, // Fallback
            description: 'Flight Route',
            description_tr: 'Uçuş Rotası',
            imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074',
            category: 'FlightWidget',
            category_tr: 'Uçuş Widget',
            originalPrice: formData.price,
            discountedPrice: formData.price,
            requiredTier: SubscriptionTier.FREE,
            isExternal: false,
            vendor: formData.origin,
            redemptionCode: formData.destination,
            expiresAt: formData.departDate,
            rating: 5,
            ratingCount: 1,
            usageLimit: '',
            usageLimit_tr: '',
            validity: '',
            validity_tr: '',
            termsUrl: '',
        };

        if (editingRoute) {
            updateDeal({ ...dealData, id: editingRoute.id });
        } else {
            addDeal({ ...dealData, id: Date.now().toString() });
        }
        setIsFormVisible(false);
        setEditingRoute(null);
        setFormData({ title: '', origin: '', destination: '', imageUrl: '', departDate: '', price: 0 });
    };

    return (
        <div className="space-y-6">
            {!isFormVisible && (
                <button onClick={() => setIsFormVisible(true)} className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors">
                    Add Flight Route
                </button>
            )}

            {isFormVisible && (
                <section className="bg-white dark:bg-brand-surface p-6 rounded-lg shadow-sm">
                    <h2 className="text-2xl font-bold mb-4">{editingRoute ? 'Edit Route' : 'Add New Route'}</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">Route Name (e.g. Istanbul to London)</label>
                            <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">Origin Code (e.g. IST)</label>
                            <input type="text" value={formData.origin} onChange={e => setFormData({ ...formData, origin: e.target.value.toUpperCase() })} required maxLength={3} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">Destination Code (e.g. LHR)</label>
                            <input type="text" value={formData.destination} onChange={e => setFormData({ ...formData, destination: e.target.value.toUpperCase() })} required maxLength={3} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">Departure Date</label>
                            <input type="date" value={formData.departDate} onChange={e => setFormData({ ...formData, departDate: e.target.value })} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">Starting Price ($)</label>
                            <input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })} required className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">Image URL</label>
                            <ImageUpload
                                value={formData.imageUrl}
                                onChange={(base64) => setFormData({ ...formData, imageUrl: base64 })}
                                placeholder="Upload Route Image"
                            />
                            <div className="mt-1">
                                <p className="text-xs text-gray-500 mb-1">Or enter URL:</p>
                                <input type="text" value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full bg-gray-100 dark:bg-brand-bg rounded-md p-2 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 text-xs" placeholder="https://..." />
                            </div>
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                            <button type="button" onClick={() => { setIsFormVisible(false); setEditingRoute(null); }} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                            <button type="submit" className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-colors">Save Route</button>
                        </div>
                    </form>
                </section>
            )}

            <div className="bg-white dark:bg-brand-surface rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left text-gray-500 dark:text-brand-text-muted">
                    <thead className="text-xs text-gray-700 dark:text-brand-text-light uppercase bg-gray-50 dark:bg-brand-bg">
                        <tr>
                            <th className="px-6 py-3">Route</th>
                            <th className="px-6 py-3">Origin</th>
                            <th className="px-6 py-3">Dest</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Price</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {flightRoutes.map(route => (
                            <tr key={route.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-brand-text-light">{route.title}</td>
                                <td className="px-6 py-4">{route.vendor}</td>
                                <td className="px-6 py-4">{route.redemptionCode}</td>
                                <td className="px-6 py-4">{route.expiresAt}</td>
                                <td className="px-6 py-4">${route.discountedPrice}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => handleEditClick(route)} className="font-medium text-brand-secondary hover:underline">Edit</button>
                                    <button onClick={() => handleDeleteClick(route.id)} className="font-medium text-red-500 hover:underline">Delete</button>
                                </td>
                            </tr>
                        ))}
                        {flightRoutes.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-brand-text-muted">
                                    No flight routes added yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminFlightRoutesTab;
