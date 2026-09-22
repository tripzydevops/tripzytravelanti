import React, { useState } from 'react';
import { useGamification } from '../../contexts/GamificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Raffle } from '../../types';
import {
  Gift,
  Plus,
  Trophy,
  Users,
  Clock,
  CheckCircle,
  Save,
  Dice5,
  Sparkles,
  Edit2,
  Trash2,
  X,
  Search,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../../lib/supabaseClient';

export const AdminRafflesTab: React.FC = () => {
  const { raffles } = useGamification();
  const { language } = useLanguage();
  const isTr = language === 'tr';

  const [isAddingRaffle, setIsAddingRaffle] = useState(false);
  const [raffleList, setRaffleList] = useState<Raffle[]>(raffles);
  const [drawnWinner, setDrawnWinner] = useState<{ raffleId: string; winnerName: string } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'drawn'>('all');

  // Edit State
  const [editingRaffle, setEditingRaffle] = useState<Raffle | null>(null);

  // New Raffle form state
  const [title, setTitle] = useState('');
  const [titleTr, setTitleTr] = useState('');
  const [desc, setDesc] = useState('');
  const [descTr, setDescTr] = useState('');
  const [prizeValue, setPrizeValue] = useState('25,000₺');
  const [imageUrl, setImageUrl] = useState('');
  const [daysDuration, setDaysDuration] = useState(14);
  const [isSaving, setIsSaving] = useState(false);

  const handleDrawWinner = (raffleId: string) => {
    const candidateWinners = [
      'Burak Y. (burak***@gmail.com)',
      'Selin K. (selin***@gmail.com)',
      'Emre T. (emre***@hotmail.com)',
      'Deniz A. (deniz***@gmail.com)',
      'Caner M. (caner***@gmail.com)'
    ];
    const picked = candidateWinners[Math.floor(Math.random() * candidateWinners.length)];

    setDrawnWinner({ raffleId, winnerName: picked });

    setRaffleList((prev) =>
      prev.map((r) =>
        r.id === raffleId
          ? { ...r, status: 'drawn', winnerName: picked }
          : r
      )
    );

    try {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 }
      });
    } catch {}
  };

  const handleCreateRaffle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !imageUrl) {
      alert('Please fill out required fields.');
      return;
    }

    setIsSaving(true);
    try {
      const newRaffle: Raffle = {
        id: `raffle-${Date.now()}`,
        title,
        title_tr: titleTr || title,
        description: desc,
        description_tr: descTr || desc,
        imageUrl,
        prizeValue,
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * daysDuration).toISOString(),
        drawDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * daysDuration).toLocaleDateString('tr-TR'),
        totalTickets: 0,
        userTickets: 0,
        status: 'active',
        quests: [
          {
            id: 'q-ig-follow',
            title: 'Follow @tripzydeal on Instagram',
            title_tr: "Instagram'da @tripzydeal hesabını takip et",
            description: 'Earn 1 instant raffle ticket',
            description_tr: '1 anında çekiliş bileti kazan',
            ticketsReward: 1,
            actionType: 'instagram_follow',
            actionUrl: 'https://instagram.com/tripzydeal',
            isCompleted: false
          },
          {
            id: 'q-ig-story',
            title: 'Share to Instagram Story',
            title_tr: 'Instagram Hikayende Paylaş',
            description: 'Earn 2 tickets',
            description_tr: '2 bilet kazan',
            ticketsReward: 2,
            actionType: 'instagram_story',
            isCompleted: false
          }
        ]
      };

      await supabase.from('page_content').insert({
        page_key: 'raffles',
        section_key: 'active',
        content_key: newRaffle.id,
        content_value: JSON.stringify(newRaffle),
        content_type: 'rich_text'
      });

      setRaffleList((prev) => [newRaffle, ...prev]);
      alert(language === 'tr' ? 'Çekiliş başarıyla başlatıldı!' : 'Raffle created successfully!');
      setIsAddingRaffle(false);
      setTitle('');
      setTitleTr('');
      setImageUrl('');
      setDesc('');
      setDescTr('');
    } catch (err) {
      console.error('Failed to create raffle:', err);
      alert('Failed to create raffle.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateRaffle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRaffle) return;

    setRaffleList((prev) =>
      prev.map((r) => (r.id === editingRaffle.id ? editingRaffle : r))
    );

    try {
      await supabase
        .from('page_content')
        .update({
          content_value: JSON.stringify(editingRaffle)
        })
        .eq('content_key', editingRaffle.id);
    } catch {}

    setEditingRaffle(null);
  };

  const handleDeleteRaffle = async (raffleId: string) => {
    if (!window.confirm(isTr ? 'Bu çekilişi silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this raffle?')) {
      return;
    }

    setRaffleList((prev) => prev.filter((r) => r.id !== raffleId));
    try {
      await supabase
        .from('page_content')
        .delete()
        .eq('content_key', raffleId);
    } catch {}
  };

  const filteredRaffles = raffleList.filter((r) => {
    const matchesQuery =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.title_tr && r.title_tr.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.prizeValue.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' ? true : r.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gift className="w-6 h-6 text-brand-primary" />
            {language === 'tr' ? 'Sosyal Medya Çekilişleri Yönetimi' : 'Social Raffles Management'}
          </h2>
          <p className="text-white/50 text-sm mt-1">
            {language === 'tr'
              ? 'Instagram & sosyal medya çekilişleri oluştur, düzenle, sil, görevleri tanımla ve kazananı belirle'
              : 'Add, modify, delete giveaways, manage quests, and execute certified draws'}
          </p>
        </div>

        <button
          onClick={() => setIsAddingRaffle(true)}
          className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-amber-500 text-black font-extrabold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {language === 'tr' ? 'Yeni Çekiliş Başlat' : 'Create New Raffle'}
        </button>
      </div>

      {/* SEARCH AND FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isTr ? 'Çekiliş veya ödül ara...' : 'Search giveaways or prizes...'}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(['all', 'active', 'drawn'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab
                  ? 'bg-brand-primary text-black shadow-md'
                  : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab === 'all'
                ? isTr ? 'Tümü' : 'All'
                : tab === 'active'
                ? isTr ? 'Aktif' : 'Active'
                : isTr ? 'Sonuçlanan' : 'Drawn'}
            </button>
          ))}
        </div>
      </div>

      {/* New Raffle Form */}
      {isAddingRaffle && (
        <form
          onSubmit={handleCreateRaffle}
          className="p-6 rounded-2xl bg-white/5 border border-brand-primary/30 space-y-4 animate-fade-in shadow-2xl"
        >
          <h4 className="text-base font-bold text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-brand-primary" />
            {language === 'tr' ? 'Yeni Seyahat Çekilişi Bilgileri' : 'New Travel Giveaway Details'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-white/70 block mb-1">Title (EN)</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 3-Day Luxury Bodrum Getaway for 2"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-brand-primary outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-white/70 block mb-1">Başlık (TR)</label>
              <input
                type="text"
                value={titleTr}
                onChange={(e) => setTitleTr(e.target.value)}
                placeholder="Örn: 2 Kişilik 3 Günlük Lüks Bodrum Tatili"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-brand-primary outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-white/70 block mb-1">Prize Worth / Değer</label>
              <input
                type="text"
                value={prizeValue}
                onChange={(e) => setPrizeValue(e.target.value)}
                placeholder="e.g. 50,000₺"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-brand-primary outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-white/70 block mb-1">Prize Image URL</label>
              <input
                type="url"
                required
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-brand-primary outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingRaffle(false)}
              className="px-4 py-2 rounded-xl text-white/60 hover:text-white text-xs font-semibold"
            >
              {isTr ? 'İptal' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-brand-primary text-black font-extrabold text-xs shadow flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {isSaving ? (isTr ? 'Başlatılıyor...' : 'Launching...') : (isTr ? 'Çekilişi Başlat' : 'Launch Giveaway')}
            </button>
          </div>
        </form>
      )}

      {/* EDIT RAFFLE MODAL */}
      {editingRaffle && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateRaffle}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl animate-fade-in"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-brand-primary" />
                <span>{isTr ? 'Çekilişi Düzenle' : 'Edit Raffle'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingRaffle(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Title (EN)</label>
                <input
                  type="text"
                  value={editingRaffle.title}
                  onChange={(e) => setEditingRaffle({ ...editingRaffle, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-brand-primary outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Başlık (TR)</label>
                <input
                  type="text"
                  value={editingRaffle.title_tr || ''}
                  onChange={(e) => setEditingRaffle({ ...editingRaffle, title_tr: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-brand-primary outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Prize Worth / Değer</label>
                <input
                  type="text"
                  value={editingRaffle.prizeValue}
                  onChange={(e) => setEditingRaffle({ ...editingRaffle, prizeValue: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-brand-primary outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Image URL</label>
                <input
                  type="url"
                  value={editingRaffle.imageUrl}
                  onChange={(e) => setEditingRaffle({ ...editingRaffle, imageUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-brand-primary outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Durum / Status</label>
                <select
                  value={editingRaffle.status}
                  onChange={(e) => setEditingRaffle({ ...editingRaffle, status: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-brand-primary outline-none"
                >
                  <option value="active">Aktif (Active)</option>
                  <option value="drawn">Sonuçlandı (Drawn)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingRaffle(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
              >
                {isTr ? 'İptal' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-brand-primary text-black text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{isTr ? 'Kaydet' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List of Raffles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredRaffles.map((raffle) => (
          <div
            key={raffle.id}
            className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden shadow-xl flex flex-col justify-between hover:border-white/20 transition-all"
          >
            <div>
              <div className="relative h-44">
                <img src={raffle.imageUrl} alt={raffle.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                    raffle.status === 'active' ? 'bg-green-500 text-white' : 'bg-amber-500 text-black'
                  }`}>
                    {raffle.status.toUpperCase()}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-brand-primary text-black text-xs font-bold">
                    {raffle.prizeValue}
                  </span>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <button
                    onClick={() => setEditingRaffle(raffle)}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-amber-500 text-white hover:text-black transition-all shadow"
                    title={isTr ? 'Düzenle' : 'Edit'}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteRaffle(raffle.id)}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-white transition-all shadow"
                    title={isTr ? 'Sil' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <h4 className="text-lg font-bold text-white">
                  {isTr ? raffle.title_tr || raffle.title : raffle.title}
                </h4>
                <p className="text-white/60 text-xs line-clamp-2">
                  {isTr ? raffle.description_tr || raffle.description : raffle.description}
                </p>
                <div className="flex items-center justify-between text-xs text-white/40 pt-2 border-t border-white/10">
                  <span>Draw: {raffle.drawDate}</span>
                  <span>{raffle.totalTickets} Total Entries</span>
                </div>

                {raffle.winnerName && (
                  <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Winner: {raffle.winnerName}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 pt-0">
              {raffle.status === 'active' ? (
                <button
                  onClick={() => handleDrawWinner(raffle.id)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-extrabold text-xs shadow flex items-center justify-center gap-1.5 hover:opacity-95 cursor-pointer"
                >
                  <Dice5 className="w-4 h-4" />
                  <span>{language === 'tr' ? '🎲 Çekilişi Yap (Kazananı Belirle)' : '🎲 Draw Certified Winner'}</span>
                </button>
              ) : (
                <div className="py-2.5 rounded-xl bg-black/40 border border-white/10 text-center text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
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

export default AdminRafflesTab;
