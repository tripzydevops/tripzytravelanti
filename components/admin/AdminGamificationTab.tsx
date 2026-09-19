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
  Image as ImageIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export const AdminGamificationTab: React.FC = () => {
  const { storyGroups, gamificationState, openStoryViewer } = useGamification();
  const { language } = useLanguage();

  const [activeSubTab, setActiveSubTab] = useState<'stories' | 'stamps'>('stories');
  const [isAddingStory, setIsAddingStory] = useState(false);
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
              ? 'Hikayeleri, pasaport damgalarını ve kullanıcı seyahat seviyelerini yönet'
              : 'Manage social stories, passport stamps, and user travel tier levels'}
          </p>
        </div>

        {/* Sub-tab switches */}
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveSubTab('stories')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'stories'
                ? 'bg-brand-primary text-black shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {language === 'tr' ? '📸 Hikayeler (Stories)' : '📸 Stories'}
          </button>
          <button
            onClick={() => setActiveSubTab('stamps')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
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
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              {language === 'tr' ? 'Aktif Hikaye Grupları' : 'Active Story Groups'}
            </h3>
            <button
              onClick={() => setIsAddingStory(true)}
              className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-amber-500 text-black font-extrabold text-xs flex items-center gap-1.5 shadow transition-all"
            >
              <Plus className="w-4 h-4" />
              {language === 'tr' ? 'Yeni Hikaye Ekle' : 'Create New Story'}
            </button>
          </div>

          {/* Add Story Modal/Form */}
          {isAddingStory && (
            <form
              onSubmit={handleSaveNewStory}
              className="p-6 rounded-2xl bg-white/5 border border-brand-primary/30 space-y-4 animate-fade-in"
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-brand-primary text-black font-extrabold text-xs shadow flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Publishing...' : 'Publish Story'}
                </button>
              </div>
            </form>
          )}

          {/* List of Active Stories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {storyGroups.map((group) => (
              <div
                key={group.id}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={group.avatarUrl}
                    alt={group.title}
                    className="w-12 h-12 rounded-full object-cover border-2 border-brand-primary"
                  />
                  <div>
                    <h4 className="text-white font-bold text-sm">{group.title}</h4>
                    <p className="text-white/50 text-xs">{group.slides.length} Slides • {group.category}</p>
                  </div>
                </div>

                <button
                  onClick={() => openStoryViewer(group)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-brand-primary/20 text-white hover:text-brand-primary transition-colors"
                  title="Preview Story"
                >
                  <Eye className="w-4 h-4" />
                </button>
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
