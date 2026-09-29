import React, { useState, useEffect } from 'react';
import {
  Ticket,
  X,
  Search,
  Sparkles,
  CheckCircle2,
  Users,
  AlertCircle,
  Check,
  Gift
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LotteryCampaign, User, LotteryTicket } from '../../types';
import { lotteryService } from '../../lib/services/lotteryService';
import { getAllUsers } from '../../lib/services/userService';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';

interface AdminGrantTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedUser?: User | null;
  preselectedCampaign?: LotteryCampaign | null;
  onSuccess?: () => void;
}

export const AdminGrantTicketModal: React.FC<AdminGrantTicketModalProps> = ({
  isOpen,
  onClose,
  preselectedUser = null,
  preselectedCampaign = null,
  onSuccess
}) => {
  const { language } = useLanguage();
  const isTr = language === 'tr';
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const [campaigns, setCampaigns] = useState<LotteryCampaign[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);

  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [ticketCount, setTicketCount] = useState<number>(1);
  const [adminNote, setAdminNote] = useState<string>('Admin Özel Tanımlama / Admin Grant');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mintedResult, setMintedResult] = useState<LotteryTicket[] | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setMintedResult(null);
      setIsSubmitting(false);
      return;
    }

    const loadData = async () => {
      setLoadingInitial(true);
      try {
        const [loadedCampaigns, loadedUsers] = await Promise.all([
          lotteryService.getCampaigns(),
          getAllUsers()
        ]);
        setCampaigns(loadedCampaigns);
        setUsers(loadedUsers);

        if (preselectedCampaign) {
          setSelectedCampaignId(preselectedCampaign.id);
        } else if (loadedCampaigns.length > 0) {
          setSelectedCampaignId(loadedCampaigns[0].id);
        }

        if (preselectedUser) {
          setSelectedUserId(preselectedUser.id);
        } else if (loadedUsers.length > 0) {
          setSelectedUserId(loadedUsers[0].id);
        }
      } catch (err) {
        console.error('Failed to load campaigns or users for grant modal:', err);
      } finally {
        setLoadingInitial(false);
      }
    };

    loadData();
  }, [isOpen, preselectedUser, preselectedCampaign]);

  if (!isOpen) return null;

  const filteredUsers = users.filter(u => {
    const q = userSearchQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.mobile && u.mobile.includes(q))
    );
  });

  const selectedUser = users.find(u => u.id === selectedUserId) || preselectedUser;
  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId) || preselectedCampaign;

  const handlePresetCount = (count: number) => {
    setTicketCount(count);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignId) {
      showErrorToast(isTr ? 'Lütfen bir çekiliş seçin.' : 'Please select a lottery campaign.');
      return;
    }
    if (!selectedUserId) {
      showErrorToast(isTr ? 'Lütfen bir kullanıcı seçin.' : 'Please select a user.');
      return;
    }
    if (!ticketCount || ticketCount < 1) {
      showErrorToast(isTr ? 'Bilet sayısı en az 1 olmalıdır.' : 'Ticket count must be at least 1.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await lotteryService.grantAdminTickets(
        selectedCampaignId,
        selectedUserId,
        Number(ticketCount),
        adminNote || 'Admin Issued'
      );

      if (res.success) {
        setMintedResult(res.tickets);
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 }
        });
        showSuccessToast(
          isTr
            ? `${ticketCount} adet bilet başarıyla ${selectedUser?.name || 'kullanıcı'} için tanımlandı!`
            : `Successfully granted ${ticketCount} tickets to ${selectedUser?.name || 'user'}!`
        );
        if (onSuccess) {
          onSuccess();
        }
      } else {
        showErrorToast(res.error || (isTr ? 'Bilet tanımlama hatası.' : 'Failed to grant tickets.'));
      }
    } catch (err: any) {
      console.error('Error granting tickets:', err);
      showErrorToast(err?.message || (isTr ? 'Beklenmedik bir hata oluştu.' : 'An error occurred.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto overscroll-contain bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 pt-safe pb-safe">
      <div className="min-h-full flex items-center justify-center py-4 sm:py-8">
        <div className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="relative bg-gradient-to-r from-rose-950/80 via-slate-900 to-indigo-950/80 p-5 sm:p-6 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    {isTr ? 'Çekiliş Bileti Tanımla' : 'Grant Lottery Tickets'}
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase tracking-wider">
                      Admin
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isTr
                      ? 'Herhangi bir kullanıcıya, dilediğiniz çekiliş için sınırsız sayıda bilet ekleyin.'
                      : 'Issue any number of tickets to any user for any lottery campaign.'}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          {mintedResult ? (
            /* SUCCESS VIEW */
            <div className="p-6 space-y-5 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-bold text-white">
                  {isTr ? 'Biletler Başarıyla Tanımlandı!' : 'Tickets Granted Successfully!'}
                </h4>
                <p className="text-xs text-slate-400">
                  {isTr
                    ? `${selectedUser?.name || 'Kullanıcı'} adına toplam ${mintedResult.length} bilet üretildi.`
                    : `Generated ${mintedResult.length} tickets for ${selectedUser?.name || 'User'}.`}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 max-h-48 overflow-y-auto space-y-1.5 text-left font-mono text-xs">
                {mintedResult.map((t, idx) => (
                  <div
                    key={t.id || idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 text-slate-300"
                  >
                    <span className="font-bold text-rose-400">{t.ticketNumber}</span>
                    <span className="text-[10px] text-emerald-400 font-sans font-semibold">
                      {isTr ? 'Doğrulandı (Admin)' : 'Verified (Admin)'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMintedResult(null);
                    setTicketCount(1);
                  }}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  {isTr ? 'Yeni Bilet Tanımla' : 'Grant More Tickets'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs transition-colors cursor-pointer shadow-lg"
                >
                  {isTr ? 'Kapat ve Tamamla' : 'Close & Done'}
                </button>
              </div>
            </div>
          ) : (
            /* FORM VIEW */
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              {/* 1. SELECT LOTTERY CAMPAIGN */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>{isTr ? '1. Çekiliş Kampanyası Seçin' : '1. Select Lottery Campaign'}</span>
                  {selectedCampaign && (
                    <span className="text-[10px] text-rose-400 font-normal">
                      {isTr ? 'Toplam Bilet:' : 'Total Tickets:'} {selectedCampaign.totalTicketsMinted || 0}
                    </span>
                  )}
                </label>
                
                <div className="relative">
                  <select
                    value={selectedCampaignId}
                    onChange={e => setSelectedCampaignId(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:border-rose-500 outline-none appearance-none cursor-pointer"
                    required
                  >
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>
                        {isTr ? c.title_tr : c.title} ({c.status === 'active' ? (isTr ? 'Aktif' : 'Active') : c.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. SELECT USER */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>{isTr ? '2. Hedef Kullanıcı' : '2. Target User'}</span>
                  {selectedUser && (
                    <span className="text-[10px] text-indigo-400 font-normal truncate max-w-[200px]">
                      {selectedUser.email}
                    </span>
                  )}
                </label>

                {preselectedUser ? (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center">
                        {selectedUser?.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{selectedUser?.name || 'User'}</div>
                        <div className="text-[10px] text-slate-400">{selectedUser?.email}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                      {selectedUser?.tier || 'FREE'}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={userSearchQuery}
                        onChange={e => setUserSearchQuery(e.target.value)}
                        placeholder={isTr ? 'Kullanıcı adı, e-posta veya telefon ile filtrele...' : 'Filter users by name, email, or mobile...'}
                        className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-rose-500 outline-none"
                      />
                    </div>

                    <select
                      value={selectedUserId}
                      onChange={e => setSelectedUserId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-medium focus:border-rose-500 outline-none appearance-none cursor-pointer max-h-32"
                      required
                    >
                      {filteredUsers.length === 0 ? (
                        <option value="" disabled>
                          {isTr ? 'Kullanıcı bulunamadı' : 'No users found'}
                        </option>
                      ) : (
                        filteredUsers.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name || 'İsimsiz'} — {u.email} ({u.tier})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}
              </div>

              {/* 3. TICKET COUNT & PRESETS */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>{isTr ? '3. Tanımlanacak Bilet Sayısı' : '3. Number of Tickets to Grant'}</span>
                  <span className="text-[10px] text-amber-400 font-bold">
                    🎟️ {ticketCount} {isTr ? 'Adet Bilet' : 'Tickets'}
                  </span>
                </label>

                {/* Preset Buttons */}
                <div className="grid grid-cols-6 gap-1.5">
                  {[1, 5, 10, 25, 50, 100].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => handlePresetCount(cnt)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        ticketCount === cnt
                          ? 'bg-rose-500 text-white shadow-md'
                          : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      +{cnt}
                    </button>
                  ))}
                </div>

                {/* Custom Number Input */}
                <div className="relative pt-1">
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    value={ticketCount}
                    onChange={e => setTicketCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:border-rose-500 outline-none"
                    placeholder={isTr ? 'Özel bilet sayısı girin...' : 'Enter custom ticket amount...'}
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">
                    {isTr ? 'bilet' : 'tickets'}
                  </span>
                </div>
              </div>

              {/* 4. OPTIONAL NOTE */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  {isTr ? '4. Özel Yönetici Notu (İsteğe Bağlı)' : '4. Admin Note (Optional)'}
                </label>
                <input
                  type="text"
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  placeholder={isTr ? 'Örn: VIP Sadakat Bonusu, Özel Kampanya Hediyesi' : 'e.g. VIP Bonus, Loyalty Gift'}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-rose-500 outline-none"
                />
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  {isTr ? 'İptal' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !selectedCampaignId || !selectedUserId}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 hover:opacity-95 text-white text-xs font-extrabold shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>{isTr ? 'Biletler Üretiliyor...' : 'Minting Tickets...'}</span>
                  ) : (
                    <>
                      <Gift className="w-4 h-4" />
                      <span>
                        {isTr
                          ? `${ticketCount} Bileti Hesaba Tanımla`
                          : `Grant ${ticketCount} Tickets`}
                      </span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
};
