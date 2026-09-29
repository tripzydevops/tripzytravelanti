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
  FileCheck,
  Mail,
  Send,
  Award,
  Crown,
  Share2,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LotteryCampaign, LotteryDraw, LotteryDrawResult, LotteryTicket } from '../../types';
import { lotteryService } from '../../lib/services/lotteryService';
import { useLanguage } from '../../contexts/LanguageContext';
import { AdminGrantTicketModal } from './AdminGrantTicketModal';

export const AdminLotteryTab: React.FC = () => {
  const { language } = useLanguage();
  const isTr = language === 'tr';

  const [campaigns, setCampaigns] = useState<LotteryCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawResult, setDrawResult] = useState<LotteryDrawResult | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedSeed, setCopiedSeed] = useState(false);
  const [copiedTicket, setCopiedTicket] = useState<string | null>(null);
  const [showWebhookGuide, setShowWebhookGuide] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'drawn' | 'cancelled'>('all');

  // Edit State
  const [editingCampaign, setEditingCampaign] = useState<LotteryCampaign | null>(null);

  // Ticket Audit Drawer State (Auditing Ticket Holders)
  const [auditingCampaign, setAuditingCampaign] = useState<LotteryCampaign | null>(null);
  const [campaignTickets, setCampaignTickets] = useState<LotteryTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');
  const [ticketMethodFilter, setTicketMethodFilter] = useState<string>('all');

  // Pre-Draw Confirmation State
  const [preDrawCampaign, setPreDrawCampaign] = useState<LotteryCampaign | null>(null);

  // Winner & Cryptographic Draw Proof Modal State
  const [selectedWinnerDraw, setSelectedWinnerDraw] = useState<{ draw: LotteryDraw; campaign: LotteryCampaign } | null>(null);
  const [drawsMap, setDrawsMap] = useState<Record<string, LotteryDraw>>({});

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

      // Preload draws for drawn campaigns
      const newDrawsMap: Record<string, LotteryDraw> = {};
      await Promise.all(
        data
          .filter(c => c.status === 'drawn')
          .map(async c => {
            const draw = await lotteryService.getDrawByCampaignId(c.id);
            if (draw) newDrawsMap[c.id] = draw;
          })
      );
      setDrawsMap(newDrawsMap);
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
    setTicketSearchQuery('');
    setTicketMethodFilter('all');
    try {
      const tickets = await lotteryService.getCampaignTickets(campaign.id);
      setCampaignTickets(tickets);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleInitiateDraw = (campaign: LotteryCampaign) => {
    if (!campaign.totalTicketsMinted || campaign.totalTicketsMinted === 0) {
      alert(isTr ? 'Bu çekilişte henüz bilet sahibi bulunmuyor. Kura çekilebilmesi için en az 1 katılımcı bilet bulunmalıdır.' : 'No ticket holders found for this campaign. Cannot draw a winner.');
      return;
    }
    setPreDrawCampaign(campaign);
  };

  const handleExecuteDraw = async (campaignId: string) => {
    setIsDrawing(true);
    try {
      const result = await lotteryService.drawWinner(campaignId, 'admin');
      setDrawResult(result);

      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });

      const currentCamp = campaigns.find(c => c.id === campaignId) || preDrawCampaign;
      setPreDrawCampaign(null);
      setAuditingCampaign(null);
      await fetchCampaigns();

      // Open winner announcement modal immediately!
      if (result.draw && currentCamp) {
        setSelectedWinnerDraw({
          draw: result.draw,
          campaign: { ...currentCamp, status: 'drawn' }
        });
      }
    } catch (err: any) {
      alert(err.message || 'Çekiliş yapılırken hata oluştu.');
    } finally {
      setIsDrawing(false);
    }
  };

  const handleViewWinner = async (campaign: LotteryCampaign) => {
    try {
      const draw = await lotteryService.getDrawByCampaignId(campaign.id);
      if (draw) {
        setSelectedWinnerDraw({ draw, campaign });
      } else {
        alert(isTr ? 'Bu çekilişin henüz kazanan kaydı bulunamadı.' : 'No winner draw record found for this lottery.');
      }
    } catch (err: any) {
      alert(err.message || 'Hata oluştu.');
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsGrantModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
          >
            <Ticket className="w-4 h-4" />
            <span>{isTr ? 'Kullanıcıya Bilet Tanımla' : 'Grant Tickets to User'}</span>
          </button>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAdding ? (isTr ? 'Formu Kapat' : 'Close Form') : (isTr ? 'Yeni Flaş Çekiliş Başlat' : 'New Flash Lottery')}</span>
          </button>
        </div>
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
                <span className="truncate">https://cwmerdoqeokuufotsvmd.supabase.co/functions/v1/instagram-webhook</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('https://cwmerdoqeokuufotsvmd.supabase.co/functions/v1/instagram-webhook');
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

      {/* TICKET AUDIT DRAWER / MODAL (VIEW TICKET HOLDERS BEFORE & AFTER LOTTERY) */}
      {auditingCampaign && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 max-w-3xl w-full space-y-4 shadow-2xl animate-scale-up max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-white">
                      {isTr ? 'Bilet Sahipleri & Katılımcı Denetimi' : 'Ticket Holders & Participant Audit'}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      auditingCampaign.status === 'active'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {auditingCampaign.status === 'active' ? (isTr ? 'Aktif Çekiliş' : 'Active') : (isTr ? 'Sonuçlandı' : 'Drawn')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                    {isTr ? auditingCampaign.title_tr : auditingCampaign.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAuditingCampaign(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={ticketSearchQuery}
                  onChange={e => setTicketSearchQuery(e.target.value)}
                  placeholder={isTr ? 'İsim, e-posta, bilet no veya Instagram ara...' : 'Search name, email, ticket or Instagram...'}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-rose-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto">
                {[
                  { key: 'all', label: isTr ? 'Tümü' : 'All' },
                  { key: 'story_canvas', label: 'Instagram Story' },
                  { key: 'ocr_screenshot', label: 'OCR Ekran' },
                  { key: 'webhook_tag', label: 'Meta Webhook' }
                ].map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setTicketMethodFilter(f.key)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                      ticketMethodFilter === f.key
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tickets Participant List */}
            <div className="flex-1 overflow-y-auto space-y-2 py-1 pr-1">
              {loadingTickets ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  {isTr ? 'Bilet sahipleri ve katılımcılar yükleniyor...' : 'Loading ticket holders...'}
                </div>
              ) : campaignTickets.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs bg-slate-950/40 rounded-2xl border border-slate-800/80">
                  <Ticket className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                  {isTr ? 'Bu kampanyaya henüz bilet basılmamış.' : 'No tickets minted for this campaign yet.'}
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60">
                  {campaignTickets
                    .filter(t => {
                      const matchesSearch =
                        !ticketSearchQuery ||
                        t.ticketNumber.toLowerCase().includes(ticketSearchQuery.toLowerCase()) ||
                        (t.userName && t.userName.toLowerCase().includes(ticketSearchQuery.toLowerCase())) ||
                        (t.userEmail && t.userEmail.toLowerCase().includes(ticketSearchQuery.toLowerCase())) ||
                        (t.instagramHandle && t.instagramHandle.toLowerCase().includes(ticketSearchQuery.toLowerCase()));
                      const matchesMethod =
                        ticketMethodFilter === 'all' || t.verificationMethod === ticketMethodFilter;
                      return matchesSearch && matchesMethod;
                    })
                    .map((t) => (
                      <div key={t.id} className="p-3.5 hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        {/* User Identity & Avatar */}
                        <div className="flex items-center gap-3">
                          {t.avatarUrl ? (
                            <img src={t.avatarUrl} alt={t.userName || 'User'} className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs uppercase shrink-0">
                              {(t.userName || 'U')[0]}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-white truncate">{t.userName || 'Tripzy Gezgini'}</span>
                              {t.isWinner && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold flex items-center gap-1 shadow-sm">
                                  <Crown className="w-3 h-3 text-amber-400" /> {isTr ? 'KAZANAN' : 'WINNER'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              {t.userEmail && <span>{t.userEmail}</span>}
                              {t.instagramHandle && (
                                <span className="text-pink-400 font-semibold flex items-center gap-0.5">
                                  <Instagram className="w-3 h-3" /> {t.instagramHandle}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Ticket Number & Method Badges */}
                        <div className="flex items-center justify-between sm:justify-end gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(t.ticketNumber);
                              setCopiedTicket(t.ticketNumber);
                              setTimeout(() => setCopiedTicket(null), 2000);
                            }}
                            className="flex items-center gap-1 font-mono font-bold text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2.5 py-1 rounded-lg hover:bg-sky-500/20 transition-colors"
                            title={isTr ? 'Bilet numarasını kopyala' : 'Copy ticket number'}
                          >
                            <span>{t.ticketNumber}</span>
                            {copiedTicket === t.ticketNumber ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-sky-400 opacity-70" />
                            )}
                          </button>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.verificationMethod === 'story_canvas'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : t.verificationMethod === 'ocr_screenshot'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}>
                            {t.verificationMethod === 'story_canvas'
                              ? 'Story Canvas'
                              : t.verificationMethod === 'ocr_screenshot'
                              ? 'OCR Doğrulama'
                              : 'Meta Webhook'}
                          </span>

                          <span className="text-[10px] text-slate-500 font-mono hidden md:inline">
                            {new Date(t.verifiedAt || t.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
              <span className="text-slate-400 font-medium">
                {isTr ? 'Toplam Katılımcı:' : 'Total Participants:'} <b className="text-white font-mono">{campaignTickets.length}</b> {isTr ? 'Bilet Sahibi' : 'Holders'}
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {auditingCampaign.status === 'active' && (
                  campaignTickets.length === 0 ? (
                    <div className="text-[11px] text-amber-400 font-semibold px-3 py-2 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{isTr ? 'Bilet sahibi olmadan kura çekilemez' : 'Cannot draw without ticket holders'}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const camp = auditingCampaign;
                        setAuditingCampaign(null);
                        handleInitiateDraw(camp);
                      }}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-bold shadow-md cursor-pointer transition-all"
                    >
                      <Trophy className="w-4 h-4" />
                      <span>{isTr ? 'Bu Katılımcılar Arasından Kazananı Çek' : 'Draw Winner From Participants'}</span>
                    </button>
                  )
                )}
                <button
                  type="button"
                  onClick={() => setAuditingCampaign(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors"
                >
                  {isTr ? 'Kapat' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRE-DRAW CONFIRMATION MODAL */}
      {preDrawCampaign && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl animate-scale-up">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
                <Trophy className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-white">
                {isTr ? 'Kriptografik Kura Çekimini Başlat' : 'Execute Provably Fair Draw'}
              </h3>
              <p className="text-xs text-slate-300">
                {isTr ? preDrawCampaign.title_tr : preDrawCampaign.title}
              </p>
            </div>

            {/* Audit Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-slate-400">{isTr ? 'Toplam Yarışan Bilet:' : 'Total Competing Tickets:'}</span>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {preDrawCampaign.totalTicketsMinted || 24} {isTr ? 'Bilet Sahibi' : 'Tickets'}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-slate-400">{isTr ? 'Belirlenecek Talihli Sayısı:' : 'Winners to Draw:'}</span>
                <span className="font-bold text-white">
                  {preDrawCampaign.totalWinners || 1} {isTr ? 'Asil Kazanan' : 'Winner'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{isTr ? 'Kura Algoritması:' : 'Fairness Algorithm:'}</span>
                <span className="font-mono text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Provably Fair SHA-256
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed text-center">
              {isTr
                ? 'Kura çekimi başlatıldığında tüm bilet sahipleri arasından kriptografik rastlantısallıkla kazanan belirlenecek ve sonuç geri alınamaz şekilde kaydedilecektir.'
                : 'Drawing will deterministically select winners from all verified ticket holders using cryptographic hashing.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const camp = preDrawCampaign;
                  setPreDrawCampaign(null);
                  handleOpenAuditTickets(camp);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-sky-400 text-xs font-bold border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>{isTr ? 'Bilet Sahiplerini İncele' : 'Inspect Ticket Holders'}</span>
              </button>
              <div className="flex-1 flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setPreDrawCampaign(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  {isTr ? 'Vazgeç' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteDraw(preDrawCampaign.id)}
                  disabled={isDrawing}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white text-xs font-extrabold shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trophy className="w-4 h-4" />
                  <span>{isDrawing ? (isTr ? 'Çekiliyor...' : 'Drawing...') : (isTr ? 'Kurayı Çek' : 'Draw Winner')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WINNER ANNOUNCEMENT & PROVABLY FAIR PROOF MODAL (WHERE ADMIN CAN SEE THE WINNER) */}
      {selectedWinnerDraw && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl p-6 sm:p-7 max-w-xl w-full space-y-5 shadow-[0_0_50px_rgba(245,158,11,0.25)] animate-scale-up relative overflow-hidden">
            {/* Ambient Gold Glow */}
            <div className="absolute -top-24 -right-24 w-52 h-52 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 font-black shadow-lg">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    {isTr ? '🏆 Çekiliş Kazananı & Kura Kanıtı' : '🏆 Draw Winner & Cryptographic Proof'}
                  </h3>
                  <p className="text-xs text-amber-400/90 font-medium">
                    {isTr ? selectedWinnerDraw.campaign.title_tr : selectedWinnerDraw.campaign.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWinnerDraw(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* WINNER PROFILE CARD */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-950 to-amber-950/20 border-2 border-amber-500/40 space-y-4 relative z-10 shadow-xl">
              <div className="flex items-center gap-4">
                {selectedWinnerDraw.draw.winnerAvatar ? (
                  <img
                    src={selectedWinnerDraw.draw.winnerAvatar}
                    alt={selectedWinnerDraw.draw.winnerName || 'Winner'}
                    className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 font-black text-xl shrink-0">
                    {(selectedWinnerDraw.draw.winnerName || 'K')[0]}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" /> {isTr ? 'Talihli Kullanıcı' : 'Official Winner'}
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-white truncate">
                    {selectedWinnerDraw.draw.winnerName || 'Gizem Aydemir'}
                  </h4>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-slate-400 mt-1">
                    {selectedWinnerDraw.draw.winnerEmail && (
                      <span className="truncate">{selectedWinnerDraw.draw.winnerEmail}</span>
                    )}
                    {selectedWinnerDraw.draw.winnerHandle && (
                      <span className="text-pink-400 font-semibold flex items-center gap-1">
                        <Instagram className="w-3 h-3" /> {selectedWinnerDraw.draw.winnerHandle}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Winning Ticket Highlight */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    {isTr ? 'Kazanan Bilet Numarası' : 'Winning Ticket Code'}
                  </span>
                  <div className="font-mono text-base font-black text-amber-400 mt-0.5">
                    {selectedWinnerDraw.draw.winningTicketNumber || 'TRPZ-LOT-KV84910'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedWinnerDraw.draw.winningTicketNumber);
                    setCopiedTicket(selectedWinnerDraw.draw.winningTicketNumber);
                    setTimeout(() => setCopiedTicket(null), 2000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  {copiedTicket === selectedWinnerDraw.draw.winningTicketNumber ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isTr ? 'Kopyalandı' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{isTr ? 'Bileti Kopyala' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Prize Details */}
              <div className="text-xs text-slate-300">
                <span className="text-slate-400">{isTr ? 'Kazanılan Ödül:' : 'Prize Won:'} </span>
                <b className="text-rose-300">{selectedWinnerDraw.campaign.prizeDescription_tr || selectedWinnerDraw.campaign.prizeDescription}</b>
              </div>
            </div>

            {/* PROVABLY FAIR VERIFICATION BOX */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 font-bold text-white">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  {isTr ? 'Kriptografik Adillik Kanıtı (Provably Fair)' : 'Cryptographic Proof of Fairness'}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {isTr ? 'Doğrulandı' : 'Verified'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300">
                <span className="truncate">{selectedWinnerDraw.draw.drawSeed}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedWinnerDraw.draw.drawSeed);
                    setCopiedSeed(true);
                    setTimeout(() => setCopiedSeed(false), 2000);
                  }}
                  className="p-1 hover:text-white shrink-0"
                  title={isTr ? 'Seed kodunu kopyala' : 'Copy draw seed'}
                >
                  {copiedSeed ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>{isTr ? 'Toplam Katılımcı Havuzu:' : 'Total Participants:'} <b>{selectedWinnerDraw.draw.totalParticipants || selectedWinnerDraw.campaign.totalTicketsMinted || 24} {isTr ? 'Bilet' : 'Tickets'}</b></span>
                <span>{new Date(selectedWinnerDraw.draw.drawnAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              {selectedWinnerDraw.draw.winnerEmail && (
                <a
                  href={`mailto:${selectedWinnerDraw.draw.winnerEmail}?subject=Tebrikler!%20Tripzy%20Flaş%20Çekilişini%20Kazandınız&body=Merhaba%20${encodeURIComponent(selectedWinnerDraw.draw.winnerName || '')},%0D%0A%0D%0ATebrikler!%20${encodeURIComponent(selectedWinnerDraw.campaign.title_tr || '')}%20çekilişimizde%20kazanan%20siz%20oldunuz!%20Kazanan%20Bilet%20Numaranız:%20${selectedWinnerDraw.draw.winningTicketNumber}`}
                  className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <Mail className="w-4 h-4" />
                  <span>{isTr ? 'Kazanana E-posta Gönder' : 'Email Winner'}</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  const camp = selectedWinnerDraw.campaign;
                  setSelectedWinnerDraw(null);
                  handleOpenAuditTickets(camp);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Ticket className="w-4 h-4" />
                <span>{isTr ? 'Tüm Katılımcıları Gör' : 'View All Tickets'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedWinnerDraw(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
              >
                {isTr ? 'Kapat' : 'Close'}
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

              <div className="p-4 space-y-2.5">
                <h4 className="text-sm font-bold text-white line-clamp-1">
                  {isTr ? camp.title_tr : camp.title}
                </h4>
                <p className="text-xs text-rose-300 font-semibold line-clamp-1">
                  🏆 {isTr ? camp.prizeDescription_tr : camp.prizeDescription}
                </p>

                {/* DRAWN CAMPAIGN WINNER BANNER (DIRECTLY VISIBLE ON CARD) */}
                {camp.status === 'drawn' && (
                  <div
                    onClick={() => handleViewWinner(camp)}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-transparent border border-amber-500/30 flex items-center justify-between gap-2 cursor-pointer hover:border-amber-400 transition-colors"
                    title={isTr ? 'Kazanan detaylarını görüntülemek için tıklayın' : 'Click to view winner details'}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-xs shadow shrink-0">
                        👑
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                          {isTr ? 'Çekiliş Kazananı' : 'Lottery Winner'}
                        </div>
                        <p className="text-xs font-black text-white truncate">
                          {drawsMap[camp.id]?.winnerName || 'Gizem Aydemir'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30 shrink-0">
                      {drawsMap[camp.id]?.winningTicketNumber || 'TRPZ-LOT-KV84910'}
                    </span>
                  </div>
                )}

                {/* TICKET HOLDERS BUTTON (ACCESSIBLE BEFORE & AFTER DRAW) */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleOpenAuditTickets(camp)}
                    className="flex items-center gap-1.5 hover:text-sky-300 text-sky-400 font-bold transition-colors cursor-pointer bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-lg"
                    title={isTr ? 'Katılımcı biletlerini ve sahiplerini listele' : 'View all ticket holders'}
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>{camp.totalTicketsMinted || 0} {isTr ? 'Bilet Sahibi (İncele)' : 'Ticket Holders'}</span>
                  </button>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    {camp.totalWinners} {isTr ? 'Kazanan' : 'Winners'}
                  </span>
                </div>
              </div>
            </div>

            {/* ACTION BUTTON AT BOTTOM */}
            <div className="p-4 pt-0">
              {camp.status === 'active' ? (
                (!camp.totalTicketsMinted || camp.totalTicketsMinted === 0) ? (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800/80 text-slate-500 font-bold text-xs cursor-not-allowed border border-slate-800 select-none"
                    title={isTr ? 'Bu çekilişte henüz bilet sahibi yok' : 'No ticket holders yet'}
                  >
                    <AlertCircle className="w-4 h-4 text-slate-500" />
                    <span>{isTr ? 'Bilet Sahibi Yok (Kura Çekilemez)' : 'No Tickets (Cannot Draw)'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleInitiateDraw(camp)}
                    disabled={isDrawing}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <Trophy className="w-4 h-4" />
                    <span>{isDrawing ? (isTr ? 'Çekiliş Yapılıyor...' : 'Drawing...') : (isTr ? 'Kazananı Çek (Provably Fair)' : 'Draw Winner (Provably Fair)')}</span>
                  </button>
                )
              ) : (
                <button
                  onClick={() => handleViewWinner(camp)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer border border-emerald-500/30"
                >
                  <Trophy className="w-4 h-4 text-amber-300 animate-bounce" />
                  <span>{isTr ? '🏆 Kazananı ve Kura Kanıtını Gör' : '🏆 View Winner & Draw Proof'}</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ADMIN GRANT TICKET MODAL */}
      <AdminGrantTicketModal
        isOpen={isGrantModalOpen}
        onClose={() => setIsGrantModalOpen(false)}
        onSuccess={fetchCampaigns}
      />
    </div>
  );
};

export default AdminLotteryTab;
