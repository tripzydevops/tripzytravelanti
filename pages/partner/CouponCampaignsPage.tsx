import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { 
    createCouponCampaign, 
    getCouponCampaigns, 
    generateCouponCodes 
} from '../../lib/supabaseService';
import { 
    Ticket, Plus, CheckCircle, XCircle, Clock, Copy, Download, 
    Tag, Eye, RefreshCw, AlertCircle, X, Check, Calendar
} from 'lucide-react';
import { CouponCampaign, CouponCode } from '../../types';

const CouponCampaignsPage: React.FC = () => {
    const { user } = useAuth();
    const [campaigns, setCampaigns] = useState<CouponCampaign[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [myDeals, setMyDeals] = useState<any[]>([]);

    // Modals & Selection States
    const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
    const [selectedCampaign, setSelectedCampaign] = useState<CouponCampaign | null>(null);
    const [campaignCodes, setCampaignCodes] = useState<CouponCode[]>([]);
    const [loadingCodes, setLoadingCodes] = useState<boolean>(false);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    // Form States
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount'>('percentage');
    const [discountValue, setDiscountValue] = useState<number>(10);
    const [maxDiscountAmount, setMaxDiscountAmount] = useState<string>('');
    const [minSubtotal, setMinSubtotal] = useState<number>(0);
    const [usageLimit, setUsageLimit] = useState<number>(50);
    const [maxPerUser, setMaxPerUser] = useState<number>(1);
    const [startsAt, setStartsAt] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [dealId, setDealId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const list = await getCouponCampaigns(user.id);
            setCampaigns(list);

            // Fetch partner's deals for dropdown
            const { data: deals } = await supabase
                .from('deals')
                .select('id, title')
                .eq('partner_id', user.id)
                .eq('status', 'approved');
            
            setMyDeals(deals || []);
        } catch (err) {
            console.error('Failed to load campaigns:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user]);

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSubmitting(true);
        setFormError(null);

        try {
            if (!title.trim()) throw new Error('Campaign Title is required');
            if (discountValue <= 0) throw new Error('Discount Value must be positive');
            if (usageLimit <= 0) throw new Error('Usage limit must be at least 1');

            const campaignPayload = {
                partnerId: user.id,
                dealId: dealId || undefined,
                title: title.trim(),
                description: description.trim() || undefined,
                discountType,
                discountValue,
                maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : undefined,
                minSubtotal,
                usageLimit,
                maxPerUser,
                startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
                expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
                isActive: true
            };

            // 1. Create Campaign
            const newCampaign = await createCouponCampaign(campaignPayload);
            
            // 2. Generate Bulk Codes
            await generateCouponCodes(newCampaign.id, usageLimit);

            // Reset form
            setTitle('');
            setDescription('');
            setDiscountType('percentage');
            setDiscountValue(10);
            setMaxDiscountAmount('');
            setMinSubtotal(0);
            setUsageLimit(50);
            setMaxPerUser(1);
            setStartsAt('');
            setExpiresAt('');
            setDealId('');
            setShowCreateModal(false);

            // Refresh Campaign list
            await loadData();
        } catch (err: any) {
            console.error('Create campaign failed:', err);
            setFormError(err.message || 'Server error creating campaign');
        } finally {
            setSubmitting(false);
        }
    };

    const handleViewCodes = async (campaign: CouponCampaign) => {
        setSelectedCampaign(campaign);
        setLoadingCodes(true);
        setCampaignCodes([]);
        try {
            const { data: codes, error } = await supabase
                .from('coupon_codes')
                .select('*')
                .eq('campaign_id', campaign.id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setCampaignCodes(codes || []);
        } catch (err) {
            console.error('Failed to load campaign codes:', err);
        } finally {
            setLoadingCodes(false);
        }
    };

    const handleCopyCode = (codeText: string) => {
        navigator.clipboard.writeText(codeText);
        setCopiedCode(codeText);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const handleExportCSV = () => {
        if (!selectedCampaign || campaignCodes.length === 0) return;
        const csvContent = "data:text/csv;charset=utf-8," 
            + ["ID,Campaign,Code,Status,Claimed By,Redeemed By,Redeemed At"].join(",") + "\n"
            + campaignCodes.map(c => [
                c.id,
                selectedCampaign.title.replace(/,/g, ''),
                c.code,
                c.status,
                c.assignedTo || '',
                c.redeemedBy || '',
                c.redeemedAt || ''
            ].join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `coupon_codes_${selectedCampaign.id.substring(0,8)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const toggleCampaignStatus = async (campaign: CouponCampaign) => {
        try {
            const { error } = await supabase
                .from('coupon_campaigns')
                .update({ is_active: !campaign.isActive })
                .eq('id', campaign.id);

            if (error) throw error;
            
            // Local state update
            setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, isActive: !c.isActive } : c));
            if (selectedCampaign?.id === campaign.id) {
                setSelectedCampaign(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
            }
        } catch (err) {
            console.error('Failed to toggle campaign status:', err);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
                        <Ticket className="w-8 h-8 mr-2 text-brand-primary" />
                        Coupon Campaigns
                    </h1>
                    <p className="text-brand-text-muted mt-1">Generate and manage discount coupon batches for your deals</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-brand-primary hover:bg-brand-secondary text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.5)] flex items-center group"
                >
                    <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
                    New Campaign
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <RefreshCw className="animate-spin text-brand-primary w-10 h-10" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Campaigns Table */}
                    <div className="lg:col-span-2 glass-premium rounded-2xl overflow-hidden shadow-2xl h-fit">
                        <div className="p-6 border-b border-white/10 bg-white/5">
                            <h2 className="text-lg font-bold text-white">Your Campaigns</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Campaign</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Discount</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Redemption</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {campaigns.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                No coupon campaigns found. Create one to get started!
                                            </td>
                                        </tr>
                                    ) : (
                                        campaigns.map((camp) => (
                                            <tr key={camp.id} className={`hover:bg-white/5 transition-colors duration-200 cursor-pointer ${selectedCampaign?.id === camp.id ? 'bg-white/5 border-l-4 border-brand-primary' : ''}`} onClick={() => handleViewCodes(camp)}>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-white truncate max-w-[150px]">{camp.title}</div>
                                                    <div className="text-[10px] text-brand-text-muted mt-0.5">ID: {camp.id.substring(0,8)}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                                                        <Tag className="w-3 h-3 mr-1" />
                                                        {camp.discountType === 'percentage' ? `${camp.discountValue}% Off` : `$${camp.discountValue} Off`}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-white font-medium">{camp.usageCount} / {camp.usageLimit || '∞'}</div>
                                                    <div className="w-24 bg-white/10 rounded-full h-1.5 mt-1 overflow-hidden">
                                                        <div 
                                                            className="bg-brand-primary h-1.5 rounded-full" 
                                                            style={{ width: `${camp.usageLimit ? Math.min(100, (camp.usageCount / camp.usageLimit) * 100) : 0}%` }}
                                                        ></div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border
                                                        ${camp.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                        {camp.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                                                        <button 
                                                            onClick={() => handleViewCodes(camp)}
                                                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-brand-text-light transition-colors"
                                                            title="View Codes"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => toggleCampaignStatus(camp)}
                                                            className={`p-1.5 rounded-lg border transition-colors ${camp.isActive ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20' : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/20'}`}
                                                            title={camp.isActive ? 'Deactivate' : 'Activate'}
                                                        >
                                                            {camp.isActive ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Codes Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        {selectedCampaign ? (
                            <div className="glass-premium p-6 rounded-2xl shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-brand-primary/5 rounded-full blur-2xl pointer-events-none"></div>
                                
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-white truncate max-w-[180px]">{selectedCampaign.title}</h3>
                                        <p className="text-xs text-brand-text-muted mt-1">
                                            {selectedCampaign.discountType === 'percentage' ? `${selectedCampaign.discountValue}%` : `$${selectedCampaign.discountValue}`} discount coupon batch
                                        </p>
                                    </div>
                                    <button 
                                        onClick={handleExportCSV}
                                        className="p-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary rounded-xl border border-brand-primary/20 transition-all flex items-center gap-1.5 text-xs font-semibold"
                                        title="Export CSV"
                                    >
                                        <Download className="w-4 h-4" />
                                        CSV
                                    </button>
                                </div>

                                {loadingCodes ? (
                                    <div className="flex items-center justify-center py-12">
                                        <RefreshCw className="animate-spin text-brand-primary w-6 h-6" />
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                                        {campaignCodes.map((c) => (
                                            <div 
                                                key={c.id} 
                                                className="flex justify-between items-center bg-white/5 border border-white/10 rounded-xl p-3.5 hover:bg-white/10 transition-colors"
                                            >
                                                <div>
                                                    <span className="font-mono text-base font-bold tracking-wider text-white">{c.code}</span>
                                                    <div className="flex gap-2 mt-1 items-center">
                                                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-semibold
                                                            ${c.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                                                              c.status === 'redeemed' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                                                              'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                                            {c.status.toUpperCase()}
                                                        </span>
                                                        {c.redeemedAt && (
                                                            <span className="text-[9px] text-brand-text-muted flex items-center">
                                                                <Calendar className="w-3 h-3 mr-1" />
                                                                {new Date(c.redeemedAt).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleCopyCode(c.code)}
                                                    className="p-1.5 hover:bg-white/15 rounded-lg text-brand-text-muted hover:text-white transition-colors relative"
                                                >
                                                    {copiedCode === c.code ? (
                                                        <Check className="w-4 h-4 text-emerald-400" />
                                                    ) : (
                                                        <Copy className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="glass-premium p-8 rounded-2xl text-center text-brand-text-muted flex flex-col items-center justify-center min-h-[300px]">
                                <Ticket className="w-12 h-12 mb-3 text-white/20 animate-pulse" />
                                <h3 className="text-base font-bold text-white mb-1">No Campaign Selected</h3>
                                <p className="text-xs">Click "View Codes" on a campaign to manage generated coupon codes.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Create Campaign Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="glass-premium border border-white/10 w-full max-w-lg rounded-2xl overflow-hidden relative shadow-2xl">
                        <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5">
                            <h3 className="text-xl font-bold text-white flex items-center">
                                <Plus className="w-5 h-5 mr-1.5 text-brand-primary" />
                                Create Coupon Campaign
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateCampaign} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            {formError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <span>{formError}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-1">Campaign Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Summer Special 20% Discount"
                                    className="w-full px-4 py-2.5 border border-white/10 bg-white/5 text-white placeholder-brand-text-muted rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-1">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g. Limited coupon codes valid for dining deals"
                                    rows={2}
                                    className="w-full px-4 py-2.5 border border-white/10 bg-white/5 text-white placeholder-brand-text-muted rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all text-sm resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-1">Discount Type</label>
                                    <select
                                        value={discountType}
                                        onChange={(e) => setDiscountType(e.target.value as any)}
                                        className="w-full px-4 py-2.5 border border-white/10 bg-gray-900 text-white rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all text-sm"
                                    >
                                        <option value="percentage">Percentage Off (%)</option>
                                        <option value="fixed_amount">Fixed Amount ($)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-1">Value *</label>
                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        value={discountValue}
                                        onChange={(e) => setDiscountValue(parseInt(e.target.value))}
                                        className="w-full px-4 py-2.5 border border-white/10 bg-white/5 text-white rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-1">Max Discount Amount ($)</label>
                                    <input
                                        type="number"
                                        placeholder="No cap"
                                        value={maxDiscountAmount}
                                        onChange={(e) => setMaxDiscountAmount(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-white/10 bg-white/5 text-white placeholder-brand-text-muted rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-1">Min Order Subtotal ($)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={minSubtotal}
                                        onChange={(e) => setMinSubtotal(parseInt(e.target.value))}
                                        className="w-full px-4 py-2.5 border border-white/10 bg-white/5 text-white rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-1">Codes to Generate *</label>
                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        max={500}
                                        value={usageLimit}
                                        onChange={(e) => setUsageLimit(parseInt(e.target.value))}
                                        className="w-full px-4 py-2.5 border border-white/10 bg-white/5 text-white rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-1">Max Uses Per User</label>
                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        value={maxPerUser}
                                        onChange={(e) => setMaxPerUser(parseInt(e.target.value))}
                                        className="w-full px-4 py-2.5 border border-white/10 bg-white/5 text-white rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-1">Starts At</label>
                                    <input
                                        type="datetime-local"
                                        value={startsAt}
                                        onChange={(e) => setStartsAt(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-white/10 bg-white/5 text-white rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-1">Expires At</label>
                                    <input
                                        type="datetime-local"
                                        value={expiresAt}
                                        onChange={(e) => setExpiresAt(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-white/10 bg-white/5 text-white rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-brand-text-muted uppercase tracking-wider mb-1">Assign to Deal (Optional)</label>
                                <select
                                    value={dealId}
                                    onChange={(e) => setDealId(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-white/10 bg-gray-900 text-white rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all text-sm"
                                >
                                    <option value="">Platform-Wide Campaign (All approved deals)</option>
                                    {myDeals.map(d => (
                                        <option key={d.id} value={d.id}>{d.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-white/5 text-white rounded-xl border border-white/10 hover:bg-white/10 font-semibold transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2.5 bg-brand-primary text-white hover:bg-brand-secondary rounded-xl font-semibold transition-all shadow-[0_4px_15px_rgba(212,175,55,0.25)] hover:shadow-[0_4px_20px_rgba(212,175,55,0.4)] disabled:opacity-50 text-sm flex items-center justify-center gap-1.5"
                                >
                                    {submitting ? 'Creating...' : 'Create Campaign'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CouponCampaignsPage;
