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
  Search
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export const AdminGamificationTab: React.FC = () => {
  const { storyGroups, gamificationState, openStoryViewer } = useGamification();
  const { language } = useLanguage();
  const isTr = language === 'tr';

  const [activeSubTab, setActiveSubTab] = useState<'stories' | 'stamps'>('stories');
  const [isAddingStory, setIsAddingStory] = useState(false);
  const [editingStory, setEditingStory] = useState<StoryGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">
            {language === 'tr' ? 'Aktif Seyahat Pasaport Damgaları' : 'Active Travel Passport Stamps'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gamificationState.stamps.map((stamp) => (
              <div
                key={stamp.id}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-primary/20 text-brand-primary flex items-center justify-center flex-shrink-0">
                  <Compass className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-bold text-sm truncate">{stamp.name}</h4>
                    <span className="text-xs text-amber-400 font-bold">+{stamp.xpReward} XP</span>
                  </div>
                  <p className="text-white/60 text-xs mt-1">{stamp.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-white/40">
                    <span>City: {stamp.city || 'Global'}</span>
                    <span>•</span>
                    <span>Category: {stamp.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGamificationTab;
