import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Plus,
  Trophy,
  Clock,
  CheckCircle,
  Save,
  Sparkles,
  ShieldCheck,
  QrCode,
  Users,
  Image as ImageIcon,
  AlertCircle,
  Instagram,
  Copy,
  Check,
  ExternalLink,
  Edit2,
  Trash2,
  Eye,
  X,
  Search,
  Filter,
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LotteryCampaign, LotteryDrawResult, LotteryTicket } from '../../types';
import { lotteryService } from '../../lib/services/lotteryService';
import { useLanguage } from '../../contexts/LanguageContext';

export const AdminLotteryTab: React.FC = () => {
  const { language } = useLanguage();
  const isTr = language === 'tr';

  const [campaigns, setCampaigns] = useState<LotteryCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawResult, setDrawResult] = useState<LotteryDrawResult | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [showWebhookGuide, setShowWebhookGuide] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'drawn' | 'cancelled'>('all');

  // Edit State
  const [editingCampaign, setEditingCampaign] = useState<LotteryCampaign | null>(null);

  // Ticket Audit Drawer State
  const [auditingCampaign, setAuditingCampaign] = useState<LotteryCampaign | null>(null);
  const [campaignTickets, setCampaignTickets] = useState<LotteryTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create Form State
  const [title, setTitle] = useState('');
  const [titleTr, setTitleTr] = useState('');
  const [prizeDesc, setPrizeDesc] = useState('');
  const [prizeDescTr, setPrizeDescTr] = useState('');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1570939274717-7eda259b50ed?auto=format&fit=crop&w=1200&q=80');
  const [merchantName, setMerchantName] = useState('Tripzy Partner');
  const [durationHours, setDurationHours] = useState(48);
  const [totalWinners, setTotalWinners] = useState(1);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const data = await lotteryService.getCampaigns();
      setCampaigns(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !prizeDesc) return;

    const endsAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
    await lotteryService.createCampaign({
      title,
      title_tr: titleTr || title,
      description: 'Share on Instagram Story to enter this flash lottery',
      description_tr: 'Instagram Hikayende paylaş, bu flaş çekilişe anında katıl',
      prizeDescription: prizeDesc,
      prizeDescription_tr: prizeDescTr || prizeDesc,
      imageUrl,
      merchantName,
      totalWinners,
      endsAt
    });

    setIsAdding(false);
    setTitle('');
    setTitleTr('');
    setPrizeDesc('');
    setPrizeDescTr('');
    await fetchCampaigns();
  };

  const handleUpdateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;

    await lotteryService.updateCampaign(editingCampaign.id, {
      title: editingCampaign.title,
      title_tr: editingCampaign.title_tr,
      prizeDescription: editingCampaign.prizeDescription,
      prizeDescription_tr: editingCampaign.prizeDescription_tr,
      imageUrl: editingCampaign.imageUrl,
      totalWinners: editingCampaign.totalWinners,
      status: editingCampaign.status,
      endsAt: editingCampaign.endsAt
    });

    setEditingCampaign(null);
    await fetchCampaigns();
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!window.confirm(isTr ? 'Bu çekilişi silmek istediğinizden emin misiniz? Tüm biletler silinecektir.' : 'Are you sure you want to delete this lottery campaign? All tickets will be removed.')) {
      return;
    }

    await lotteryService.deleteCampaign(campaignId);
    setDeletingId(null);
    await fetchCampaigns();
  };

  const handleOpenAuditTickets = async (campaign: LotteryCampaign) => {
    setAuditingCampaign(campaign);
    setLoadingTickets(true);
    try {
      const tickets = await lotteryService.getCampaignTickets(campaign.id);
      setCampaignTickets(tickets);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleDrawWinner = async (campaignId: string) => {
    setIsDrawing(true);
    try {
      const result = await lotteryService.drawWinner(campaignId, 'admin');
      setDrawResult(result);

      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });

      await fetchCampaigns();
    } catch (err: any) {
      alert(err.message || 'Çekiliş yapılırken hata oluştu.');
    } finally {
      setIsDrawing(false);
    }
  };

  const filteredCampaigns = campaigns.filter(c => {
    const matchesQuery =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.title_tr && c.title_tr.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.merchantName && c.merchantName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' ? true : c.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Ticket className="w-6 h-6 text-rose-500" />
            <h2 className="text-xl font-black text-white">
              {isTr ? 'Flaş Çekiliş ve Viral Bilet Yönetimi' : 'Flash Lottery & Viral Draw Hub'}
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            {isTr
              ? 'Flaş çekilişleri ekleyin, düzenleyin, izleyin, biletlerini denetleyin ve kriptografik kazananları belirleyin.'
              : 'Add, edit, monitor, audit tickets, and execute provably fair cryptographic winner draws.'}
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isAdding ? (isTr ? 'Formu Kapat' : 'Close Form') : (isTr ? 'Yeni Flaş Çekiliş Başlat' : 'New Flash Lottery')}</span>
        </button>
      </div>

      {/* META GRAPH WEBHOOK & INSTAGRAM AUTOMATION SETUP CARD */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/30 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md">
              <Instagram className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                {isTr ? 'Meta Graph API & Instagram Story Webhook' : 'Meta Graph API & Instagram Story Webhook'}
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                  {isTr ? 'Standby / Hazır' : 'Standby / Ready'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {isTr
                  ? 'Kullanıcılar @tripzydeal etiketli Instagram Hikayesi paylaştığında anında bilet tanımlanır.'
                  : 'Automatically mints tickets when users tag @tripzydeal on their Instagram Stories.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowWebhookGuide(!showWebhookGuide)}
            className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <span>{showWebhookGuide ? (isTr ? 'Rehberi Gizle' : 'Hide Guide') : (isTr ? 'Meta Kurulum Rehberi' : 'Meta Setup Guide')}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {showWebhookGuide && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
              <div className="text-slate-400 font-medium">{isTr ? '1. Webhook Callback URL' : '1. Webhook Callback URL'}</div>
              <div className="flex items-center justify-between gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 font-mono text-[11px] text-sky-400">
                <span className="truncate">https://api.tripzy.travel/api/v1/lottery/webhook/instagram-mention</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('https://api.tripzy.travel/api/v1/lottery/webhook/instagram-mention');
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 2000);
                  }}
                  className="p-1 hover:text-white"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
              <div className="text-slate-400 font-medium">{isTr ? '2. Verify Token' : '2. Verify Token'}</div>
              <div className="flex items-center justify-between gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 font-mono text-[11px] text-amber-400">
                <span>tripzy_verify_token_secure</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('tripzy_verify_token_secure');
                    setCopiedToken(true);
                    setTimeout(() => setCopiedToken(false), 2000);
                  }}
                  className="p-1 hover:text-white"
                >
                  {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SEARCH AND STATUS FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isTr ? 'Çekiliş veya işletme adı ara...' : 'Search giveaways or partners...'}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-rose-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(['all', 'active', 'drawn', 'cancelled'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab === 'all'
                ? isTr ? 'Tümü' : 'All'
                : tab === 'active'
                ? isTr ? 'Aktif' : 'Active'
                : tab === 'drawn'
                ? isTr ? 'Sonuçlanan' : 'Drawn'
                : isTr ? 'İptal' : 'Cancelled'}
            </button>
          ))}
        </div>
      </div>

      {/* CREATE NEW LOTTERY FORM */}
      {isAdding && (
        <form
          onSubmit={handleCreateCampaign}
          className="p-6 rounded-2xl bg-slate-900 border border-rose-500/30 space-y-4 animate-fade-in shadow-xl"
        >
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-rose-500" />
            <span>{isTr ? 'Yeni Flaş Çekiliş Kampanyası Oluştur' : 'Create New Flash Lottery Campaign'}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Başlık (TR)</label>
              <input
                type="text"
                value={titleTr}
                onChange={e => setTitleTr(e.target.value)}
                placeholder="Örn: Kapadokya 2 Gece Mağara Otel & Balon Turu"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-rose-500 outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Title (EN)</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Cappadocia 2-Night Cave Hotel & Balloon Flight"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-rose-500 outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Ödül Açıklaması (TR)</label>
              <input
                type="text"
                value={prizeDescTr}
                onChange={e => setPrizeDescTr(e.target.value)}
                placeholder="Örn: 2 Kişilik Lüks Cave Suite + Sıcak Hava Balon Turu (₺34.500)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-rose-500 outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Prize Description (EN)</label>
              <input
                type="text"
                value={prizeDesc}
                onChange={e => setPrizeDesc(e.target.value)}
                placeholder="e.g. 2-Night Luxury Cave Suite for 2 + Balloon Flight"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-rose-500 outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Görsel URL</label>
              <input
                type="text"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-rose-500 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Süre (Saat)</label>
                <input
                  type="number"
                  value={durationHours}
                  onChange={e => setDurationHours(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-rose-500 outline-none"
                  min={1}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Kazanan Sayısı</label>
                <input
                  type="number"
                  value={totalWinners}
                  onChange={e => setTotalWinners(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-rose-500 outline-none"
                  min={1}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
            >
              {isTr ? 'İptal' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white text-xs font-bold hover:from-rose-600 hover:to-amber-600 shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isTr ? 'Kampanyayı Yayınla' : 'Publish Campaign'}</span>
            </button>
          </div>
        </form>
      )}

      {/* EDIT CAMPAIGN MODAL */}
      {editingCampaign && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateCampaign}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl animate-fade-in"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <span>{isTr ? 'Flaş Çekilişi Düzenle' : 'Edit Flash Lottery'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCampaign(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Başlık (TR)</label>
                <input
                  type="text"
                  value={editingCampaign.title_tr || ''}
                  onChange={e => setEditingCampaign({ ...editingCampaign, title_tr: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Title (EN)</label>
                <input
                  type="text"
                  value={editingCampaign.title}
                  onChange={e => setEditingCampaign({ ...editingCampaign, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Ödül Açıklaması (TR)</label>
                <input
                  type="text"
                  value={editingCampaign.prizeDescription_tr || ''}
                  onChange={e => setEditingCampaign({ ...editingCampaign, prizeDescription_tr: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Prize Description (EN)</label>
                <input
                  type="text"
                  value={editingCampaign.prizeDescription}
                  onChange={e => setEditingCampaign({ ...editingCampaign, prizeDescription: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Görsel URL</label>
                <input
                  type="text"
                  value={editingCampaign.imageUrl}
                  onChange={e => setEditingCampaign({ ...editingCampaign, imageUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Durum</label>
                  <select
                    value={editingCampaign.status}
                    onChange={e => setEditingCampaign({ ...editingCampaign, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 outline-none"
                  >
                    <option value="active">Aktif (Active)</option>
                    <option value="drawn">Sonuçlandı (Drawn)</option>
                    <option value="cancelled">İptal Edildi (Cancelled)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Kazanan Sayısı</label>
                  <input
                    type="number"
                    value={editingCampaign.totalWinners || 1}
                    onChange={e => setEditingCampaign({ ...editingCampaign, totalWinners: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 outline-none"
                    min={1}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingCampaign(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
              >
                {isTr ? 'İptal' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>{isTr ? 'Değişiklikleri Kaydet' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TICKET AUDIT DRAWER / MODAL */}
      {auditingCampaign && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl animate-fade-in max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-rose-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isTr ? 'Bilet Denetimi & Katılımcılar' : 'Ticket Audit & Participants'}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-1">
                    {isTr ? auditingCampaign.title_tr : auditingCampaign.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAuditingCampaign(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-2">
              {loadingTickets ? (
                <div className="text-center py-8 text-slate-400 text-xs">Biletler yükleniyor...</div>
              ) : campaignTickets.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  {isTr ? 'Bu kampanyaya henüz bilet basılmamış.' : 'No tickets minted for this campaign yet.'}
                </div>
              ) : (
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden">
                  {campaignTickets.map((t, idx) => (
                    <div key={t.id} className="p-3 bg-slate-950/60 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-sky-400">{t.ticketNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.verificationMethod === 'story_canvas'
                            ? 'bg-rose-500/20 text-rose-300'
                            : t.verificationMethod === 'ocr_screenshot'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-indigo-500/20 text-indigo-300'
                        }`}>
                          {t.verificationMethod}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400">
                          {new Date(t.verifiedAt || t.createdAt).toLocaleDateString()}
                        </span>
                        {t.isWinner && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> Kazanan
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
              <span>Toplam: <b>{campaignTickets.length}</b> Bilet</span>
              <button
                onClick={() => setAuditingCampaign(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAMPAIGNS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCampaigns.map(camp => (
          <div
            key={camp.id}
            className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col justify-between shadow-md hover:border-slate-700 transition-all"
          >
            <div>
              <div className="relative h-36 w-full">
                <img
                  src={camp.imageUrl}
                  alt={camp.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                
                {/* Status Badge */}
                <span
                  className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    camp.status === 'active'
                      ? 'bg-rose-500/90 text-white animate-pulse'
                      : camp.status === 'drawn'
                      ? 'bg-emerald-500/90 text-white'
                      : 'bg-slate-800/90 text-slate-300'
                  }`}
                >
                  {camp.status === 'active'
                    ? isTr ? 'Aktif Çekiliş' : 'Active'
                    : camp.status === 'drawn'
                    ? isTr ? 'Sonuçlandı' : 'Drawn'
                    : isTr ? 'İptal' : 'Cancelled'}
                </span>

                {/* Edit and Delete Action Icons */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <button
                    onClick={() => setEditingCampaign(camp)}
                    className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-amber-500 text-slate-300 hover:text-black transition-all shadow"
                    title={isTr ? 'Düzenle' : 'Edit'}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCampaign(camp.id)}
                    className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-rose-600 text-slate-300 hover:text-white transition-all shadow"
                    title={isTr ? 'Sil' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-2">
                <h4 className="text-sm font-bold text-white line-clamp-1">
                  {isTr ? camp.title_tr : camp.title}
                </h4>
                <p className="text-xs text-rose-300 font-semibold line-clamp-1">
                  🏆 {isTr ? camp.prizeDescription_tr : camp.prizeDescription}
                </p>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleOpenAuditTickets(camp)}
                    className="flex items-center gap-1 hover:text-sky-400 text-rose-400 font-bold transition-colors cursor-pointer"
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>{camp.totalTicketsMinted || 0} {isTr ? 'Bilet (Görüntüle)' : 'Tickets (View)'}</span>
                  </button>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    {camp.totalWinners} {isTr ? 'Kazanan' : 'Winners'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 pt-0">
              {camp.status === 'active' ? (
                <button
                  onClick={() => handleDrawWinner(camp.id)}
                  disabled={isDrawing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Trophy className="w-4 h-4" />
                  <span>{isDrawing ? (isTr ? 'Çekiliş Yapılıyor...' : 'Drawing...') : (isTr ? 'Kazananı Çek (Provably Fair)' : 'Draw Winner (Provably Fair)')}</span>
                </button>
              ) : (
                <div className="py-2 rounded-xl bg-slate-950 text-center text-xs font-bold text-emerald-400 border border-slate-800 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{isTr ? 'Kazanan Belirlendi' : 'Winner Drawn'}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminLotteryTab;
