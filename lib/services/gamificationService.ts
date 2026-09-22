import { supabase } from '../supabaseClient';
import {
  StoryGroup,
  StorySlide,
  TravelPassportStamp,
  UserGamificationState,
  Raffle,
  LeaderboardEntry,
  Deal,
  SubscriptionTier
} from '../../types';

// =====================================================
// DEFAULT PASSPORT STAMP CATALOG
// =====================================================
export const DEFAULT_STAMPS: TravelPassportStamp[] = [
  {
    id: 'stamp-ist-gourmand',
    slug: 'istanbul-gourmand',
    city: 'Istanbul',
    category: 'Food & Dining',
    name: 'Bosphorus Gourmet',
    name_tr: 'Boğaz Lezzet Gurmesi',
    description: 'Redeem 3 dining deals at premier Istanbul eateries',
    description_tr: 'İstanbul restoranlarında 3 ayrı indirim kullan',
    icon: 'Utensils',
    xpReward: 150,
    pointsReward: 50,
    requiredCount: 3,
    currentCount: 0,
    isUnlocked: false
  },
  {
    id: 'stamp-cap-explorer',
    slug: 'cappadocia-explorer',
    city: 'Cappadocia',
    category: 'Activities',
    name: 'Cappadocia Wanderer',
    name_tr: 'Kapadokya Seyyahı',
    description: 'Unlock a Cappadocia tour or hot air balloon experience',
    description_tr: 'Kapadokya balon veya vadi turu fırsatını aktifleştir',
    icon: 'Compass',
    xpReward: 200,
    pointsReward: 75,
    requiredCount: 1,
    currentCount: 0,
    isUnlocked: false
  },
  {
    id: 'stamp-med-sun',
    slug: 'mediterranean-sun',
    city: 'Antalya',
    category: 'Travel & Hotels',
    name: 'Riviera Nomad',
    name_tr: 'Akdeniz Gezgini',
    description: 'Redeem 2 coastal hotel or beach club discounts in Antalya/Bodrum',
    description_tr: 'Antalya veya Bodrum sahillerinde 2 fırsat kullan',
    icon: 'Sun',
    xpReward: 180,
    pointsReward: 60,
    requiredCount: 2,
    currentCount: 0,
    isUnlocked: false
  },
  {
    id: 'stamp-coffee-lover',
    slug: 'turkish-coffee-lover',
    city: 'Global',
    category: 'Cafes',
    name: 'Coffee Aficionado',
    name_tr: 'Kahve Tutkunu',
    description: 'Claim 3 specialty coffee or bakery perks',
    description_tr: '3 özel kahve veya fırın indiriminden yararlan',
    icon: 'Coffee',
    xpReward: 120,
    pointsReward: 40,
    requiredCount: 3,
    currentCount: 0,
    isUnlocked: false
  },
  {
    id: 'stamp-vip-saver',
    slug: 'master-saver',
    city: 'Global',
    category: 'Rewards',
    name: 'Legendary Saver',
    name_tr: 'Tasarruf Ustası',
    description: 'Save over 1,000₺ total using Tripzy vouchers',
    description_tr: 'Tripzy ile toplamda 1.000₺ üzeri tasarruf sağla',
    icon: 'Award',
    xpReward: 300,
    pointsReward: 100,
    requiredCount: 1000,
    currentCount: 0,
    isUnlocked: false
  }
];

// =====================================================
// LEVEL CALCULATION HELPERS
// =====================================================
export function calculateLevelFromXP(xp: number): {
  level: number;
  levelTitle: string;
  levelTitle_tr: string;
  xpForNextLevel: number;
} {
  if (xp >= 1000) {
    return {
      level: 4,
      levelTitle: 'VIP Jetsetter',
      levelTitle_tr: 'VIP Seyyah',
      xpForNextLevel: 2000
    };
  }
  if (xp >= 500) {
    return {
      level: 3,
      levelTitle: 'Gold Explorer',
      levelTitle_tr: 'Altın Kaşif',
      xpForNextLevel: 1000
    };
  }
  if (xp >= 200) {
    return {
      level: 2,
      levelTitle: 'Silver Adventurer',
      levelTitle_tr: 'Gümüş Gezgin',
      xpForNextLevel: 500
    };
  }
  return {
    level: 1,
    levelTitle: 'Bronze Wanderer',
    levelTitle_tr: 'Bronz Gezgin',
    xpForNextLevel: 200
  };
}

// =====================================================
// STORIES SERVICE
// =====================================================
const SEEN_STORIES_KEY = 'tripzy_seen_stories_v1';

export function getSeenStoryIds(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_STORIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markStoryAsSeen(storyGroupId: string): void {
  try {
    const current = getSeenStoryIds();
    if (!current.includes(storyGroupId)) {
      const updated = [...current, storyGroupId];
      localStorage.setItem(SEEN_STORIES_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Failed to mark story as seen', e);
  }
}

export async function fetchStories(deals: Deal[] = []): Promise<StoryGroup[]> {
  try {
    const { data: dbStories, error } = await supabase
      .from('page_content')
      .select('*')
      .eq('page_key', 'stories')
      .eq('content_type', 'rich_text');

    if (!error && dbStories && dbStories.length > 0) {
      const parsed: StoryGroup[] = dbStories.map((item) => {
        try {
          return JSON.parse(item.content_value);
        } catch {
          return null;
        }
      }).filter(Boolean);

      if (parsed.length > 0) {
        const seenIds = getSeenStoryIds();
        return parsed.map((g) => ({ ...g, isSeen: seenIds.includes(g.id) }));
      }
    }
  } catch (err) {
    console.warn('Stories table query fallback:', err);
  }

  // Fallback: Generate dynamic Instagram-style stories from active top deals
  const seenIds = getSeenStoryIds();
  const dynamicGroups: StoryGroup[] = [
    {
      id: 'story-flash-drops',
      title: 'Flash Drops',
      title_tr: 'Flaş Fırsatlar',
      avatarUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=150&auto=format&fit=crop&q=80',
      category: 'Trending',
      isLive: true,
      slides: (deals.slice(0, 3)).map((deal, idx) => ({
        id: `slide-flash-${deal.id || idx}`,
        title: deal.title,
        title_tr: deal.title_tr,
        subtitle: `${deal.discountPercentage || 30}% Instant Discount`,
        subtitle_tr: `%${deal.discountPercentage || 30} Anında İndirim`,
        imageUrl: deal.imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
        dealId: deal.id,
        ctaText: 'Claim Deal',
        ctaText_tr: 'Fırsatı Yakala',
        tag: '🔥 24H FLASH',
        location: deal.storeLocations?.[0]?.city || 'Istanbul'
      }))
    },
    {
      id: 'story-istanbul-eats',
      title: 'Istanbul Eats',
      title_tr: 'İstanbul Lezzetleri',
      avatarUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&auto=format&fit=crop&q=80',
      category: 'Dining',
      slides: [
        {
          id: 'slide-ist-1',
          title: 'Bosphorus Sunset Dining',
          title_tr: 'Boğaz Manzaralı Akşam Yemeği',
          subtitle: 'Exclusive 35% discount for Tripzy members',
          subtitle_tr: 'Tripzy üyelerine özel %35 indirim',
          imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
          ctaText: 'Discover Tables',
          ctaText_tr: 'Masaları Keşfet',
          tag: '🍴 TOP DINING',
          location: 'Bebek, Istanbul'
        },
        {
          id: 'slide-ist-2',
          title: 'Specialty Artisan Cafes',
          title_tr: 'Karaköy Nitelikli Kahvecileri',
          subtitle: 'Buy 1 Get 1 on cold brews & pastries',
          subtitle_tr: 'Kahve & kruvasanlarda 1 Alana 1 Bedava',
          imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80',
          ctaText: 'View Cafes',
          ctaText_tr: 'Mekanları Gör',
          tag: '☕ ARTISAN',
          location: 'Karaköy, Istanbul'
        }
      ]
    },
    {
      id: 'story-cappadocia',
      title: 'Cappadocia',
      title_tr: 'Kapadokya',
      avatarUrl: 'https://images.unsplash.com/photo-1609137144813-7d9921338f24?w=150&auto=format&fit=crop&q=80',
      category: 'Activities',
      slides: [
        {
          id: 'slide-cap-1',
          title: 'Sunrise Hot Air Balloon Flight',
          title_tr: 'Gün Doğumu Sıcak Hava Balonu',
          subtitle: 'Save up to 800₺ per passenger booking',
          subtitle_tr: 'Rezervasyon başına 800₺ tasarruf et',
          imageUrl: 'https://images.unsplash.com/photo-1507034589631-9433cc6bc453?w=800&auto=format&fit=crop&q=80',
          ctaText: 'Book Adventure',
          ctaText_tr: 'Macerayı Başlat',
          tag: '🎈 BUCKET LIST',
          location: 'Göreme, Cappadocia'
        }
      ]
    },
    {
      id: 'story-antalya-coast',
      title: 'Riviera & Sea',
      title_tr: 'Ege & Akdeniz',
      avatarUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=150&auto=format&fit=crop&q=80',
      category: 'Hotels',
      slides: [
        {
          id: 'slide-ant-1',
          title: 'Luxury Beach Resort Day Passes',
          title_tr: 'Beach Club & Otel Günlük Giriş',
          subtitle: 'Complimentary welcome mocktails & cabana discount',
          subtitle_tr: 'Ücretsiz ikram & localarda %25 indirim',
          imageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&auto=format&fit=crop&q=80',
          ctaText: 'Explore Resorts',
          ctaText_tr: 'Otelleri İncele',
          tag: '🏖️ COASTAL ESCAPE',
          location: 'Antalya & Bodrum'
        }
      ]
    }
  ];

  return dynamicGroups.map((g) => ({
    ...g,
    isSeen: seenIds.includes(g.id)
  }));
}

// =====================================================
// USER GAMIFICATION STATE & STREAKS
// =====================================================
const GAMIFICATION_STORAGE_PREFIX = 'tripzy_gamification_';

export function getLocalGamificationState(userId: string): UserGamificationState {
  try {
    const raw = localStorage.getItem(`${GAMIFICATION_STORAGE_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Re-evaluate daily streak eligibility
      const todayStr = new Date().toISOString().split('T')[0];
      const lastClaim = parsed.lastStreakClaimDate;
      const canClaim = lastClaim !== todayStr;
      return {
        ...parsed,
        canClaimDailyStreak: canClaim
      };
    }
  } catch (e) {
    console.error('Failed to load local gamification state', e);
  }

  // Initial state for new user
  const levelData = calculateLevelFromXP(50);
  return {
    level: levelData.level,
    levelTitle: levelData.levelTitle,
    levelTitle_tr: levelData.levelTitle_tr,
    xp: 50,
    xpForNextLevel: levelData.xpForNextLevel,
    streakDays: 1,
    lastStreakClaimDate: null,
    canClaimDailyStreak: true,
    canScratchCard: true,
    stamps: DEFAULT_STAMPS,
    totalSavedAmount: 0
  };
}

export function saveLocalGamificationState(userId: string, state: UserGamificationState): void {
  try {
    localStorage.setItem(`${GAMIFICATION_STORAGE_PREFIX}${userId}`, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save local gamification state', e);
  }
}

export function claimDailyStreakReward(
  userId: string,
  currentState: UserGamificationState
): { updatedState: UserGamificationState; xpEarned: number; pointsEarned: number } {
  const todayStr = new Date().toISOString().split('T')[0];
  const lastClaim = currentState.lastStreakClaimDate;

  let newStreak = currentState.streakDays;
  if (lastClaim) {
    const lastDate = new Date(lastClaim);
    const todayDate = new Date(todayStr);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1; // Broken streak reset
    }
  } else {
    newStreak = 1;
  }

  const xpEarned = 25 + Math.min(newStreak * 5, 50);
  const pointsEarned = 10 + (newStreak % 7 === 0 ? 50 : 0); // 50 bonus points every 7 days!

  const newTotalXP = currentState.xp + xpEarned;
  const levelData = calculateLevelFromXP(newTotalXP);

  const updatedState: UserGamificationState = {
    ...currentState,
    xp: newTotalXP,
    level: levelData.level,
    levelTitle: levelData.levelTitle,
    levelTitle_tr: levelData.levelTitle_tr,
    xpForNextLevel: levelData.xpForNextLevel,
    streakDays: newStreak,
    lastStreakClaimDate: todayStr,
    canClaimDailyStreak: false,
    canScratchCard: true // Unlocks a scratch card upon daily streak claim!
  };

  saveLocalGamificationState(userId, updatedState);
  return { updatedState, xpEarned, pointsEarned };
}

// =====================================================
// SOCIAL MEDIA RAFFLES (ÇEKİLİŞLER)
// =====================================================
export const DEFAULT_RAFFLES: Raffle[] = [
  {
    id: 'raffle-bodrum-getaway',
    title: 'Luxury 3-Day Bodrum Getaway for 2',
    title_tr: '2 Kişilik 3 Günlük Lüks Bodrum Tatili',
    description: 'All-inclusive seaside boutique stay in Bodrum with private cabana and fine dining dinners.',
    description_tr: 'Özel localı, deniz manzaralı butik otelde 2 kişilik her şey dahil rüya tatil!',
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1000&auto=format&fit=crop&q=80',
    prizeValue: '45,000₺',
    sponsorName: 'Bodrum Blue Resort',
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    drawDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toLocaleDateString('tr-TR'),
    totalTickets: 1420,
    userTickets: 2,
    status: 'active',
    quests: [
      {
        id: 'q-ig-follow',
        title: 'Follow @tripzydeal on Instagram',
        title_tr: 'Instagram\'da @tripzydeal hesabını takip et',
        description: 'Earn 1 instant raffle ticket',
        description_tr: '1 anında çekiliş bileti kazan',
        ticketsReward: 1,
        actionType: 'instagram_follow',
        actionUrl: 'https://instagram.com/tripzydeal',
        isCompleted: false
      },
      {
        id: 'q-ig-story',
        title: 'Share your Tripzy Passport to IG Story',
        title_tr: 'Tripzy Pasaportunu Instagram Hikayende Paylaş',
        description: 'Tag @tripzydeal for 2 bonus tickets',
        description_tr: '@tripzydeal etiketleyerek 2 çekiliş hakkı kazan',
        ticketsReward: 2,
        actionType: 'instagram_story',
        isCompleted: false
      },
      {
        id: 'q-refer-friend',
        title: 'Invite a Travel Buddy',
        title_tr: 'Bir Arkadaşını Davet Et',
        description: 'Earn 3 tickets for every joined friend',
        description_tr: 'Kayıt olan her arkadaşın için 3 bilet kazan',
        ticketsReward: 3,
        actionType: 'referral',
        isCompleted: false
      },
      {
        id: 'q-points-exchange',
        title: 'Exchange 50 Tripzy Points',
        title_tr: '50 Tripzy Puanı İle Bilet Al',
        description: 'Exchange loyalty points for extra luck',
        description_tr: 'Puanlarını çekiliş biletine dönüştür',
        ticketsReward: 1,
        pointsCost: 50,
        actionType: 'points_exchange',
        isCompleted: false
      }
    ]
  },
  {
    id: 'raffle-cappadocia-balloon',
    title: 'VIP Cappadocia Balloon & Cave Hotel Experience',
    title_tr: 'VIP Kapadokya Balon Turu & Mağara Otel Konaklaması',
    description: 'Hot air balloon sunrise flight followed by 2 nights in an iconic cave suite.',
    description_tr: 'Gün doğumu balon uçuşu ve 2 gece büyüleyici mağara otel deneyimi!',
    imageUrl: 'https://images.unsplash.com/photo-1507034589631-9433cc6bc453?w=1000&auto=format&fit=crop&q=80',
    prizeValue: '30,000₺',
    sponsorName: 'Göreme Cave Suites',
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    drawDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toLocaleDateString('tr-TR'),
    totalTickets: 890,
    userTickets: 0,
    status: 'active',
    quests: [
      {
        id: 'q-ig-follow-cap',
        title: 'Follow @tripzydeal on Instagram',
        title_tr: 'Instagram\'da @tripzydeal hesabını takip et',
        description: 'Earn 1 instant raffle ticket',
        description_tr: '1 anında çekiliş bileti kazan',
        ticketsReward: 1,
        actionType: 'instagram_follow',
        actionUrl: 'https://instagram.com/tripzydeal',
        isCompleted: false
      },
      {
        id: 'q-redeem-deal',
        title: 'Redeem any Deal in the App',
        title_tr: 'Uygulamadan Herhangi Bir İndirim Kullan',
        description: 'Get 2 tickets upon checkout verification',
        description_tr: 'İndirimini kasada kullandığında 2 bilet kazan',
        ticketsReward: 2,
        actionType: 'redeem_deal',
        isCompleted: false
      }
    ]
  }
];

export async function fetchRaffles(): Promise<Raffle[]> {
  try {
    const { data, error } = await supabase
      .from('page_content')
      .select('*')
      .eq('page_key', 'raffles')
      .eq('content_type', 'rich_text');

    if (!error && data && data.length > 0) {
      const parsed = data.map((item) => {
        try {
          return JSON.parse(item.content_value);
        } catch {
          return null;
        }
      }).filter(Boolean);
      if (parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Raffles table query fallback:', e);
  }
  return DEFAULT_RAFFLES;
}

// =====================================================
// CITY EXPLORER LEADERBOARD
// =====================================================
export async function fetchWeeklyLeaderboard(): Promise<LeaderboardEntry[]> {
  return [
    {
      rank: 1,
      userId: 'user-top-1',
      name: 'Burak Y.',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      city: 'Istanbul',
      totalSaved: 3450,
      stampsUnlocked: 5,
      level: 4,
      tier: SubscriptionTier.VIP
    },
    {
      rank: 2,
      userId: 'user-top-2',
      name: 'Selin K.',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      city: 'Antalya',
      totalSaved: 2890,
      stampsUnlocked: 4,
      level: 3,
      tier: SubscriptionTier.PREMIUM
    },
    {
      rank: 3,
      userId: 'user-top-3',
      name: 'Emre T.',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      city: 'Izmir',
      totalSaved: 2150,
      stampsUnlocked: 4,
      level: 3,
      tier: SubscriptionTier.BASIC
    },
    {
      rank: 4,
      userId: 'user-top-4',
      name: 'Deniz A.',
      city: 'Bodrum',
      totalSaved: 1640,
      stampsUnlocked: 3,
      level: 2,
      tier: SubscriptionTier.BASIC
    },
    {
      rank: 5,
      userId: 'user-top-5',
      name: 'Caner M.',
      city: 'Istanbul',
      totalSaved: 1200,
      stampsUnlocked: 2,
      level: 2,
      tier: SubscriptionTier.FREE
    }
  ];
}
