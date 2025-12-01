import React, { useState } from 'react';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createDeal } from '../../lib/supabaseService';
import { SubscriptionTier } from '../../types';
import { ArrowLeft, Save } from 'lucide-react';
import ImageUpload from '../../components/ImageUpload';

const CreateDealPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [neverExpires, setNeverExpires] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        title_tr: '',
        description: '',
        description_tr: '',
        imageUrl: '',
        companyLogoUrl: '',
        category: 'Food & Dining',
        category_tr: 'Yeme & İçme',
        originalPrice: '',
        discountedPrice: '',
        discountPercentage: '',
        requiredTier: SubscriptionTier.FREE,
        isExternal: false,
        vendor: user?.name || '',
        expiresAt: '',
        usageLimit: 'Unlimited',
        usageLimit_tr: 'Sınırsız',
        validity: 'Valid all days',
        validity_tr: 'Her gün geçerli',
        termsUrl: '',
        redemptionCode: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => {
                const updated = { ...prev, [name]: value };

                // Smart Pricing Logic
                if (name === 'originalPrice') {
                    const original = parseFloat(value);
                    const discount = parseFloat(updated.discountPercentage);
                    const discounted = parseFloat(updated.discountedPrice);

                    if (!isNaN(original)) {
                        // If we have a percentage, update the discounted price
                        if (!isNaN(discount) && discount > 0) {
                            updated.discountedPrice = (original * (1 - discount / 100)).toFixed(2);
                        }
                        // If we have a discounted price but no percentage (or 0), update percentage
                        else if (!isNaN(discounted)) {
                            updated.discountPercentage = (((original - discounted) / original) * 100).toFixed(0);
                        }
                    }
                } else if (name === 'discountedPrice') {
                    const discounted = parseFloat(value);
                    const original = parseFloat(updated.originalPrice);
                    if (!isNaN(discounted) && !isNaN(original) && original > 0) {
                        updated.discountPercentage = (((original - discounted) / original) * 100).toFixed(0);
                    }
                } else if (name === 'discountPercentage') {
                    const discount = parseFloat(value);
                    const original = parseFloat(updated.originalPrice);
                    // If original price exists, calculate discounted price
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

        // Validation: Either (Original & Discounted) OR (Percentage) must be set
        const original = parseFloat(formData.originalPrice);
        const discounted = parseFloat(formData.discountedPrice);
        const percentage = parseFloat(formData.discountPercentage);

        const hasPrice = !isNaN(original) && !isNaN(discounted) && original > 0;
        const hasPercentage = !isNaN(percentage) && percentage > 0;

        if (!hasPrice && !hasPercentage) {
            setError('Please enter either a Price (Original & Discounted) OR a Discount Percentage.');
            setLoading(false);
            return;
        }

        // Language Validation
        const hasEnglish = formData.title?.trim() && formData.description?.trim();
        const hasTurkish = formData.title_tr?.trim() && formData.description_tr?.trim();

        if (!hasEnglish && !hasTurkish) {
            setError('Please provide a Title and Description in at least one language (English or Turkish).');
            setLoading(false);
            return;
        }

        try {
            // Handle Never Expires
            const finalExpiresAt = neverExpires ?
                new Date(new Date().setFullYear(new Date().getFullYear() + 100)).toISOString() :
                formData.expiresAt;

            await createDeal({
                ...formData,
                originalPrice: hasPrice ? original : 0,
                discountedPrice: hasPrice ? discounted : 0,
                discountPercentage: percentage || 0,
                partnerId: user.id,
                status: 'pending',
                expiresAt: finalExpiresAt,
                rating: 0,
                ratingCount: 0
            });
            navigate('/partner/dashboard');
        } catch (err) {
            console.error('Error creating deal:', err);
            setError('Failed to create deal. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <button
                onClick={() => navigate('/partner/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
            </button>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Deal</h1>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Title (English)
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title (Turkish)</label>
                            <input
                                type="text"
                                name="title_tr"
                                value={formData.title_tr}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Company Name (Vendor)
                        </label>
                        <input
                            type="text"
                            name="vendor"
                            required
                            value={formData.vendor}
                            onChange={handleChange}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description (English)
                        </label>
                        <textarea
                            name="description"
                            rows={3}
                            value={formData.description}
                            onChange={handleChange}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Turkish)</label>
                        <textarea
                            name="description_tr"
                            rows={3}
                            value={formData.description_tr}
                            onChange={handleChange}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    {/* Pricing */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Original Price</label>
                            <input
                                type="number"
                                name="originalPrice"
                                min="0"
                                step="0.01"
                                value={formData.originalPrice}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discounted Price</label>
                            <input
                                type="number"
                                name="discountedPrice"
                                min="0"
                                step="0.01"
                                value={formData.discountedPrice}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discount %</label>
                            <input
                                type="number"
                                name="discountPercentage"
                                min="0"
                                max="100"
                                value={formData.discountPercentage}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 -mt-4">
                        Enter either a specific price (Original & Discounted) OR just a Discount Percentage.
                    </p>

                    {/* Image & Category */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image</label>
                            <ImageUpload
                                value={formData.imageUrl}
                                onChange={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                                bucketName="deals"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Logo (Optional)</label>
                            <ImageUpload
                                value={formData.companyLogoUrl}
                                onChange={(url) => setFormData(prev => ({ ...prev, companyLogoUrl: url }))}
                                bucketName="deals"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="Food & Dining">Food & Dining</option>
                                <option value="Travel">Travel</option>
                                <option value="Entertainment">Entertainment</option>
                                <option value="Shopping">Shopping</option>
                                <option value="Services">Services</option>
                            </select>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Redemption Code</label>
                            <input
                                type="text"
                                name="redemptionCode"
                                required
                                value={formData.redemptionCode}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                This code will be used to generate a QR code for the user.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiration Date</label>
                            <input
                                type="date"
                                name="expiresAt"
                                required={!neverExpires}
                                disabled={neverExpires}
                                value={formData.expiresAt}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <div className="flex items-center mt-2">
                                <input
                                    type="checkbox"
                                    id="neverExpires"
                                    checked={neverExpires}
                                    onChange={(e) => setNeverExpires(e.target.checked)}
                                    className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded"
                                />
                                <label htmlFor="neverExpires" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                                    Never Expires
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-6">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-brand-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-brand-primary/90 transition-colors flex items-center disabled:opacity-50"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {loading ? 'Creating...' : 'Submit for Approval'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateDealPage;
