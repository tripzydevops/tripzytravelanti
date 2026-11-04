import React, { useState } from 'react';
import { useGamification } from '../../contexts/GamificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { StoryGroup, TravelPassportStamp } from '../../types';
import {
  Sparkles,
  Plus,
  Trash2,
  Edit,
  Eye,
  Award,
  Compass,
  Flame,
  CheckCircle,
  Save,
  Image as ImageIcon,
  Edit2,
  X,
  Search,
  Utensils,
  Sun,
  Coffee,
  MapPin,
  Camera,
  Plane
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { savePassportStamp, deletePassportStamp } from '../../lib/services/gamificationService';

export const AdminGamificationTab: React.FC = () => {
  const { storyGroups, gamificationState, openStoryViewer, refreshStamps } = useGamification();
  const { language } = useLanguage();
  const isTr = language === 'tr';

  const [activeSubTab, setActiveSubTab] = useState<'stories' | 'stamps'>('stories');
  const [isAddingStory, setIsAddingStory] = useState(false);
  const [editingStory, setEditingStory] = useState<StoryGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Stamps State
  const [stampSearchQuery, setStampSearchQuery] = useState('');
  const [isAddingStamp, setIsAddingStamp] = useState(false);
  const [editingStamp, setEditingStamp] = useState<TravelPassportStamp | null>(null);
  const [isSavingStamp, setIsSavingStamp] = useState(false);

  // New Stamp Form State
  const [newStampName, setNewStampName] = useState('');
  const [newStampNameTr, setNewStampNameTr] = useState('');
  const [newStampDesc, setNewStampDesc] = useState('');
  const [newStampDescTr, setNewStampDescTr] = useState('');
  const [newStampCity, setNewStampCity] = useState('Istanbul');
  const [newStampCategory, setNewStampCategory] = useState('Food & Dining');
  const [newStampIcon, setNewStampIcon] = useState('Compass');
  const [newStampXp, setNewStampXp] = useState(150);
  const [newStampPoints, setNewStampPoints] = useState(50);
  const [newStampRequiredCount, setNewStampRequiredCount] = useState(3);

  const resetStampForm = () => {
    setNewStampName('');
    setNewStampNameTr('');
    setNewStampDesc('');
    setNewStampDescTr('');
    setNewStampCity('Istanbul');
    setNewStampCategory('Food & Dining');
    setNewStampIcon('Compass');
    setNewStampXp(150);
    setNewStampPoints(50);
    setNewStampRequiredCount(3);
  };

  const handleSaveNewStamp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStampName || !newStampDesc) {
      alert(isTr ? 'Lütfen damga adı ve açıklamasını doldurun.' : 'Please fill in stamp name and description.');
      return;
    }
    setIsSavingStamp(true);
    try {
      const slug = newStampName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const newStamp: TravelPassportStamp = {
        id: `stamp-${Date.now()}`,
        slug: slug || `stamp-${Date.now()}`,
        name: newStampName,
        name_tr: newStampNameTr || newStampName,
        description: newStampDesc,
        description_tr: newStampDescTr || newStampDesc,
        city: newStampCity || 'Global',
        category: newStampCategory || 'Rewards',
        icon: newStampIcon || 'Compass',
        xpReward: Number(newStampXp) || 100,
        pointsReward: Number(newStampPoints) || 50,
        requiredCount: Number(newStampRequiredCount) || 1,
        currentCount: 0,
        isUnlocked: false
      };

      await savePassportStamp(newStamp);
      await refreshStamps();
      alert(isTr ? 'Yeni damga başarıyla eklendi!' : 'New stamp added successfully!');
      setIsAddingStamp(false);
      resetStampForm();
    } catch (err) {
      console.error('Failed to create stamp', err);
      alert(isTr ? 'Damga kaydedilirken bir hata oluştu.' : 'Failed to save stamp.');
    } finally {
      setIsSavingStamp(false);
    }
  };

  const handleUpdateStamp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStamp) return;
    setIsSavingStamp(true);
    try {
      await savePassportStamp(editingStamp);
      await refreshStamps();
      alert(isTr ? 'Damga başarıyla güncellendi!' : 'Stamp updated successfully!');
      setEditingStamp(null);
    } catch (err) {
      console.error('Failed to update stamp', err);
      alert(isTr ? 'Damga güncellenirken hata oluştu.' : 'Failed to update stamp.');
    } finally {
      setIsSavingStamp(false);
    }
  };

  const handleDeleteStamp = async (stampId: string, stampName: string) => {
    if (!window.confirm(isTr ? `"${stampName}" damgasını silmek istediğinize emin misiniz?` : `Are you sure you want to delete "${stampName}" stamp?`)) {
      return;
    }
    try {
      await deletePassportStamp(stampId);
      await refreshStamps();
      alert(isTr ? 'Damga silindi!' : 'Stamp deleted!');
    } catch (err) {
      console.error('Failed to delete stamp', err);
      alert(isTr ? 'Damga silinirken hata oluştu.' : 'Failed to delete stamp.');
    }
  };

  const renderStampIcon = (iconName: string) => {
    switch (iconName) {
      case 'Utensils':
        return <Utensils className="w-5 h-5" />;
      case 'Sun':
        return <Sun className="w-5 h-5" />;
      case 'Coffee':
        return <Coffee className="w-5 h-5" />;
      case 'Award':
        return <Award className="w-5 h-5" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5" />;
      case 'MapPin':
        return <MapPin className="w-5 h-5" />;
      case 'Camera':
        return <Camera className="w-5 h-5" />;
      case 'Plane':
        return <Plane className="w-5 h-5" />;
      case 'Compass':
      default:
        return <Compass className="w-5 h-5" />;
    }
  };

  // Form State
  const [newStoryTitle, setNewStoryTitle] = useState('');
  const [newStoryTitleTr, setNewStoryTitleTr] = useState('');
  const [newStoryAvatar, setNewStoryAvatar] = useState('');
  const [newStoryCategory, setNewStoryCategory] = useState('Trending');
  const [newSlideImage, setNewSlideImage] = useState('');
  const [newSlideTitle, setNewSlideTitle] = useState('');
  const [newSlideTitleTr, setNewSlideTitleTr] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveNewStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoryTitle || !newSlideImage) {
      alert('Please fill out required story fields.');
      return;
    }

    setIsSaving(true);
    try {
      const newGroup: StoryGroup = {
        id: `story-custom-${Date.now()}`,
        title: newStoryTitle,
        title_tr: newStoryTitleTr || newStoryTitle,
        avatarUrl: newStoryAvatar || newSlideImage,
        category: newStoryCategory,
        createdAt: new Date().toISOString(),
        slides: [
          {
            id: `slide-${Date.now()}`,
            title: newSlideTitle || newStoryTitle,
            title_tr: newSlideTitleTr || newStoryTitleTr,
            imageUrl: newSlideImage,
            tag: '🌟 FEATURED',
            location: 'Turkey'
          }
        ]
      };

      await supabase.from('page_content').insert({
        page_key: 'stories',
        section_key: 'groups',
        content_key: newGroup.id,
        content_value: JSON.stringify(newGroup),
        content_type: 'rich_text'
      });

      alert(language === 'tr' ? 'Hikaye başarıyla yayınlandı!' : 'Story published successfully!');
      setIsAddingStory(false);
      window.location.reload();
    } catch (err) {
      console.error('Failed to save story', err);
      alert('Error saving story to database.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStory) return;

    try {
      await supabase
        .from('page_content')
        .update({
          content_value: JSON.stringify(editingStory)
        })
        .eq('content_key', editingStory.id);

      alert(isTr ? 'Hikaye güncellendi!' : 'Story updated!');
      setEditingStory(null);
      window.location.reload();
    } catch (err) {
      console.error('Failed to update story:', err);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!window.confirm(isTr ? 'Bu hikayeyi silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this story?')) {
      return;
    }

    try {
      await supabase
        .from('page_content')
        .delete()
        .eq('content_key', storyId);

      alert(isTr ? 'Hikaye silindi!' : 'Story deleted!');
      window.location.reload();
    } catch (err) {
      console.error('Failed to delete story:', err);
    }
  };

  const filteredStories = storyGroups.filter((g) => {
    const matchesQuery =
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.title_tr && g.title_tr.toLowerCase().includes(searchQuery.toLowerCase())) ||
      g.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-brand-primary" />
            {language === 'tr' ? 'Oyunlaştırma & Instagram Hikayeleri' : 'Gamification & Stories'}
          </h2>
          <p className="text-white/50 text-sm mt-1">
            {language === 'tr'
              ? 'Hikayeleri ekle, düzenle, sil, pasaport damgalarını ve kullanıcı seyahat seviyelerini yönet'
              : 'Add, edit, delete stories, passport stamps, and manage user progression levels'}
          </p>
        </div>

        {/* Sub-tab switches */}
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveSubTab('stories')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'stories'
                ? 'bg-brand-primary text-black shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {language === 'tr' ? '📸 Hikayeler (Stories)' : '📸 Stories'}
          </button>
          <button
            onClick={() => setActiveSubTab('stamps')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'stamps'
                ? 'bg-brand-primary text-black shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {language === 'tr' ? '🎖️ Pasaport Damgaları' : '🎖️ Passport Stamps'}
          </button>
        </div>
      </div>

      {/* Stories Management */}
      {activeSubTab === 'stories' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isTr ? 'Hikaye başlığı veya kategori ara...' : 'Search story title or category...'}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
              />
            </div>

            <button
              onClick={() => setIsAddingStory(true)}
              className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-amber-500 text-black font-extrabold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer whitespace-nowrap w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              {language === 'tr' ? 'Yeni Hikaye Ekle' : 'Create New Story'}
            </button>
          </div>

          {/* Add Story Modal/Form */}
          {isAddingStory && (
            <form
              onSubmit={handleSaveNewStory}
              className="p-6 rounded-2xl bg-white/5 border border-brand-primary/30 space-y-4 animate-fade-in shadow-2xl"
            >
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-primary" />
                {language === 'tr' ? 'Yeni Instagram Tarzı Hikaye Oluştur' : 'Create Instagram-Style Story'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-white/70 block mb-1">Title (EN)</label>
                  <input
                    type="text"
                    required
                    value={newStoryTitle}
                    onChange={(e) => setNewStoryTitle(e.target.value)}
                    placeholder="e.g. Cappadocia Hot Air Balloons"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-brand-primary outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-white/70 block mb-1">Başlık (TR)</label>
                  <input
                    type="text"
                    value={newStoryTitleTr}
                    onChange={(e) => setNewStoryTitleTr(e.target.value)}
                    placeholder="Örn: Kapadokya Balon Turu Fırsatı"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-brand-primary outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-white/70 block mb-1">Avatar / Merchant Logo URL</label>
                  <input
                    type="url"
                    value={newStoryAvatar}
                    onChange={(e) => setNewStoryAvatar(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-brand-primary outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-white/70 block mb-1">Slide Image URL (9:16 vertical)</label>
                  <input
                    type="url"
                    required
                    value={newSlideImage}
                    onChange={(e) => setNewSlideImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-brand-primary outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingStory(false)}
                  className="px-4 py-2 rounded-xl text-white/60 hover:text-white text-xs font-semibold"
                >
                  {isTr ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-brand-primary text-black font-extrabold text-xs shadow flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? (isTr ? 'Yayınlanıyor...' : 'Publishing...') : (isTr ? 'Hikayeyi Yayınla' : 'Publish Story')}
                </button>
              </div>
            </form>
          )}

          {/* EDIT STORY MODAL */}
          {editingStory && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <form
                onSubmit={handleUpdateStory}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-fade-in"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Edit2 className="w-5 h-5 text-brand-primary" />
                    <span>{isTr ? 'Hikayeyi Düzenle' : 'Edit Story Group'}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditingStory(null)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Title (EN)</label>
                    <input
                      type="text"
                      value={editingStory.title}
                      onChange={(e) => setEditingStory({ ...editingStory, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-brand-primary outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Başlık (TR)</label>
                    <input
                      type="text"
                      value={editingStory.title_tr || ''}
                      onChange={(e) => setEditingStory({ ...editingStory, title_tr: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-brand-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Avatar URL</label>
                    <input
                      type="url"
                      value={editingStory.avatarUrl}
                      onChange={(e) => setEditingStory({ ...editingStory, avatarUrl: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-brand-primary outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">Category</label>
                    <input
                      type="text"
                      value={editingStory.category}
                      onChange={(e) => setEditingStory({ ...editingStory, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-brand-primary outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingStory(null)}
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

          {/* List of Active Stories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStories.map((group) => (
              <div
                key={group.id}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4 hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={group.avatarUrl}
                    alt={group.title}
                    className="w-12 h-12 rounded-full object-cover border-2 border-brand-primary flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="text-white font-bold text-sm truncate">
                      {isTr ? group.title_tr || group.title : group.title}
                    </h4>
                    <p className="text-white/50 text-xs">{group.slides.length} Slides • {group.category}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => openStoryViewer(group)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-brand-primary/20 text-white hover:text-brand-primary transition-colors cursor-pointer"
                    title={isTr ? 'Önizle' : 'Preview Story'}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingStory(group)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-amber-500/20 text-white hover:text-amber-400 transition-colors cursor-pointer"
                    title={isTr ? 'Düzenle' : 'Edit Story'}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteStory(group.id)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-rose-600/20 text-white hover:text-rose-400 transition-colors cursor-pointer"
                    title={isTr ? 'Sil' : 'Delete Story'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Passport Stamps Management */}
      {activeSubTab === 'stamps' && (
        <div className="space-y-6">
          {/* Controls: Search and Add New Stamp */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={stampSearchQuery}
                onChange={(e) => setStampSearchQuery(e.target.value)}
                placeholder={isTr ? 'Damga adı, şehir veya kategori ara...' : 'Search stamp name, city, or category...'}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
              />
            </div>

            <button
              onClick={() => {
                resetStampForm();
                setIsAddingStamp(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-amber-500 text-black font-extrabold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer whitespace-nowrap w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              {language === 'tr' ? 'Yeni Damga Ekle' : 'Create New Stamp'}
            </button>
          </div>

          {/* Create Stamp Modal / Drawer Form */}
          {isAddingStamp && (
            <div className="p-6 rounded-2xl bg-zinc-900 border border-brand-primary/40 shadow-xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Compass className="w-5 h-5 text-brand-primary" />
                  {isTr ? 'Yeni Pasaport Damgası Ekle' : 'Create New Passport Stamp'}
                </h3>
                <button
                  onClick={() => setIsAddingStamp(false)}
                  className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveNewStamp} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      {isTr ? 'Damga Adı (İngilizce)' : 'Stamp Name (English)'} *
                    </label>
                    <input
                      type="text"
                      value={newStampName}
                      onChange={(e) => setNewStampName(e.target.value)}
                      placeholder="e.g. Aegean Yacht Sailor"
                      required
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      {isTr ? 'Damga Adı (Türkçe)' : 'Stamp Name (Turkish)'}
                    </label>
                    <input
                      type="text"
                      value={newStampNameTr}
                      onChange={(e) => setNewStampNameTr(e.target.value)}
                      placeholder="Örn: Ege Yat Kaptanı"
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      {isTr ? 'Açıklama (İngilizce)' : 'Description (English)'} *
                    </label>
                    <input
                      type="text"
                      value={newStampDesc}
                      onChange={(e) => setNewStampDesc(e.target.value)}
                      placeholder="e.g. Book 2 boat tours or seaside activities in Bodrum"
                      required
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      {isTr ? 'Açıklama (Türkçe)' : 'Description (Turkish)'}
                    </label>
                    <input
                      type="text"
                      value={newStampDescTr}
                      onChange={(e) => setNewStampDescTr(e.target.value)}
                      placeholder="Örn: Bodrum'da 2 tekne turu veya sahil fırsatı kullan"
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      {isTr ? 'Şehir / Bölge' : 'City / Region'}
                    </label>
                    <input
                      type="text"
                      value={newStampCity}
                      onChange={(e) => setNewStampCity(e.target.value)}
                      placeholder="Istanbul, Antalya, Bodrum, Global..."
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      {isTr ? 'Kategori' : 'Category'}
                    </label>
                    <select
                      value={newStampCategory}
                      onChange={(e) => setNewStampCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
                    >
                      <option value="Food & Dining">Food & Dining</option>
                      <option value="Travel & Hotels">Travel & Hotels</option>
                      <option value="Activities">Activities</option>
                      <option value="Cafes">Cafes</option>
                      <option value="Rewards">Rewards</option>
                      <option value="Nightlife">Nightlife</option>
                      <option value="Culture">Culture</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      {isTr ? 'İkon' : 'Icon'}
                    </label>
                    <select
                      value={newStampIcon}
                      onChange={(e) => setNewStampIcon(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
                    >
                      <option value="Compass">Compass (Pusula)</option>
                      <option value="Utensils">Utensils (Yemek & Restoran)</option>
                      <option value="Sun">Sun (Güneş & Plaj)</option>
                      <option value="Coffee">Coffee (Kahve & Kafe)</option>
                      <option value="Award">Award (Ödül & Başarı)</option>
                      <option value="Sparkles">Sparkles (Yıldız & Özel)</option>
                      <option value="MapPin">MapPin (Konum & Keşif)</option>
                      <option value="Camera">Camera (Fotoğraf & Anı)</option>
                      <option value="Plane">Plane (Uçak & Seyahat)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      {isTr ? 'XP Ödülü' : 'XP Reward'}
                    </label>
                    <input
                      type="number"
                      min="10"
                      step="10"
                      value={newStampXp}
                      onChange={(e) => setNewStampXp(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      {isTr ? 'Sadakat Puanı' : 'Points Reward'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={newStampPoints}
                      onChange={(e) => setNewStampPoints(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      {isTr ? 'Gereken Fırsat Sayısı' : 'Required Redemptions'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newStampRequiredCount}
                      onChange={(e) => setNewStampRequiredCount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsAddingStamp(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                  >
                    {isTr ? 'İptal' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingStamp}
                    className="px-5 py-2 rounded-xl bg-brand-primary text-black text-xs font-bold shadow-md flex items-center gap-1.5 hover:bg-amber-500 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingStamp ? (isTr ? 'Kaydediliyor...' : 'Saving...') : (isTr ? 'Damgayı Kaydet' : 'Save Stamp')}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Stamp Modal Form */}
          {editingStamp && (
            <div className="p-6 rounded-2xl bg-zinc-900 border border-amber-500/50 shadow-xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-amber-400" />
                  {isTr ? `Damgayı Düzenle: ${editingStamp.name}` : `Edit Stamp: ${editingStamp.name}`}
                </h3>
                <button
                  onClick={() => setEditingStamp(null)}
                  className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateStamp} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      {isTr ? 'Damga Adı (İngilizce)' : 'Stamp Name (English)'}
                    </label>
                    <input
                      type="text"
                      value={editingStamp.name}
                      onChange={(e) => setEditingStamp({ ...editingStamp, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      {isTr ? 'Damga Adı (Türkçe)' : 'Stamp Name (Turkish)'}
                    </label>
                    <input
                      type="text"
                      value={editingStamp.name_tr || ''}
                      onChange={(e) => setEditingStamp({ ...editingStamp, name_tr: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      {isTr ? 'Açıklama (İngilizce)' : 'Description (English)'}
                    </label>
                    <input
                      type="text"
                      value={editingStamp.description}
                      onChange={(e) => setEditingStamp({ ...editingStamp, description: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      {isTr ? 'Açıklama (Türkçe)' : 'Description (Turkish)'}
                    </label>
                    <input
                      type="text"
                      value={editingStamp.description_tr || ''}
                      onChange={(e) => setEditingStamp({ ...editingStamp, description_tr: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      {isTr ? 'Şehir / Bölge' : 'City / Region'}
                    </label>
                    <input
                      type="text"
                      value={editingStamp.city || ''}
                      onChange={(e) => setEditingStamp({ ...editingStamp, city: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      {isTr ? 'Kategori' : 'Category'}
                    </label>
                    <select
                      value={editingStamp.category || 'Rewards'}
                      onChange={(e) => setEditingStamp({ ...editingStamp, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
                    >
                      <option value="Food & Dining">Food & Dining</option>
                      <option value="Travel & Hotels">Travel & Hotels</option>
                      <option value="Activities">Activities</option>
                      <option value="Cafes">Cafes</option>
                      <option value="Rewards">Rewards</option>
                      <option value="Nightlife">Nightlife</option>
                      <option value="Culture">Culture</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      {isTr ? 'İkon' : 'Icon'}
                    </label>
                    <select
                      value={editingStamp.icon || 'Compass'}
                      onChange={(e) => setEditingStamp({ ...editingStamp, icon: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
                    >
                      <option value="Compass">Compass (Pusula)</option>
                      <option value="Utensils">Utensils (Yemek & Restoran)</option>
                      <option value="Sun">Sun (Güneş & Plaj)</option>
                      <option value="Coffee">Coffee (Kahve & Kafe)</option>
                      <option value="Award">Award (Ödül & Başarı)</option>
                      <option value="Sparkles">Sparkles (Yıldız & Özel)</option>
                      <option value="MapPin">MapPin (Konum & Keşif)</option>
                      <option value="Camera">Camera (Fotoğraf & Anı)</option>
                      <option value="Plane">Plane (Uçak & Seyahat)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      {isTr ? 'XP Ödülü' : 'XP Reward'}
                    </label>
                    <input
                      type="number"
                      min="10"
                      step="10"
                      value={editingStamp.xpReward}
                      onChange={(e) => setEditingStamp({ ...editingStamp, xpReward: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      {isTr ? 'Sadakat Puanı' : 'Points Reward'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={editingStamp.pointsReward || 0}
                      onChange={(e) => setEditingStamp({ ...editingStamp, pointsReward: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1">
                      {isTr ? 'Gereken Fırsat Sayısı' : 'Required Redemptions'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editingStamp.requiredCount}
                      onChange={(e) => setEditingStamp({ ...editingStamp, requiredCount: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-brand-primary outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingStamp(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                  >
                    {isTr ? 'İptal' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingStamp}
                    className="px-5 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold shadow-md flex items-center gap-1.5 hover:bg-amber-400 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingStamp ? (isTr ? 'Güncelleniyor...' : 'Updating...') : (isTr ? 'Güncellemeyi Kaydet' : 'Save Changes')}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List of Active Passport Stamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(gamificationState.stamps || [])
              .filter((stamp) => {
                const q = stampSearchQuery.toLowerCase();
                return (
                  stamp.name.toLowerCase().includes(q) ||
                  (stamp.name_tr && stamp.name_tr.toLowerCase().includes(q)) ||
                  (stamp.city && stamp.city.toLowerCase().includes(q)) ||
                  (stamp.category && stamp.category.toLowerCase().includes(q))
                );
              })
              .map((stamp) => (
                <div
                  key={stamp.id}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start justify-between gap-3.5 hover:border-white/20 transition-all group"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-xl bg-brand-primary/20 text-brand-primary flex items-center justify-center flex-shrink-0 shadow-inner">
                      {renderStampIcon(stamp.icon)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-white font-bold text-sm truncate">
                          {isTr ? stamp.name_tr || stamp.name : stamp.name}
                        </h4>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs text-amber-400 font-extrabold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                            +{stamp.xpReward} XP
                          </span>
                          {stamp.pointsReward ? (
                            <span className="text-xs text-emerald-400 font-bold bg-emerald-400/10 px-1.5 py-0.5 rounded-full border border-emerald-400/20">
                              +{stamp.pointsReward} Puan
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <p className="text-white/60 text-xs mt-1 line-clamp-2">
                        {isTr ? stamp.description_tr || stamp.description : stamp.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[11px] text-white/50">
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/80 font-medium">
                          📍 {stamp.city || 'Global'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/80 font-medium">
                          🏷️ {stamp.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary border border-brand-primary/20 font-medium">
                          🎯 {stamp.requiredCount || 1} {isTr ? 'Kullanım Şartı' : 'Redemption Req'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 self-center">
                    <button
                      onClick={() => setEditingStamp(stamp)}
                      className="p-2 rounded-xl bg-white/10 hover:bg-amber-500/20 text-white hover:text-amber-400 transition-colors cursor-pointer"
                      title={isTr ? 'Düzenle' : 'Edit Stamp'}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteStamp(stamp.id, stamp.name)}
                      className="p-2 rounded-xl bg-white/10 hover:bg-rose-600/20 text-white hover:text-rose-400 transition-colors cursor-pointer"
                      title={isTr ? 'Sil' : 'Delete Stamp'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {(gamificationState.stamps || []).filter((stamp) => {
            const q = stampSearchQuery.toLowerCase();
            return (
              stamp.name.toLowerCase().includes(q) ||
              (stamp.name_tr && stamp.name_tr.toLowerCase().includes(q)) ||
              (stamp.city && stamp.city.toLowerCase().includes(q)) ||
              (stamp.category && stamp.category.toLowerCase().includes(q))
            );
          }).length === 0 && (
            <div className="p-8 text-center text-white/50 bg-white/5 rounded-2xl border border-white/10">
              {isTr ? 'Eşleşen pasaport damgası bulunamadı.' : 'No matching passport stamps found.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminGamificationTab;
