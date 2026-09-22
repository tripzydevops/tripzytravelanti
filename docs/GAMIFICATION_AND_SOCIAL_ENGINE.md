# Tripzy.travel — Instagram Gamification & Social Raffles Engine

## 1. Overview & Architecture
Tripzy.travel incorporates a viral, high-conversion **Social Media & Instagram-Style Gamification Engine** specifically tailored for the Turkish and global travel discount market.

This system directly solves the **"Cold Start" problem** (Layer 1 $\rightarrow$ Layer 2 $\rightarrow$ Layer 3) by capturing rich implicit and explicit behavioral signals (double taps, story viewing time, quest interactions, raffle entries, streak consistency) and funneling them into the recommendation engine.

```
┌─────────────────────────────────────────────────────────────────────────┐
│              LAYER 1: USER INTERFACE & VIRAL SIGNALS                     │
│  • Instagram Stories Bar & Fullscreen Gesture Viewer                   │
│  • Double-Tap Deal Image Heart Burst (Implicit Like)                    │
│  • Daily Exploration Streak & Mystery Scratch Canvas Cards              │
│  • Digital Tripzy Travel Passport (City & Category Stamps)              │
│  • Social Media Giveaways & Raffles (Instagram / Story / Referral)      │
│  • Live Turkish Savings Ticker & Weekly City Leaderboards               │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ User Signal Collection Module (Buffered)
┌────────────────────────────────────▼────────────────────────────────────┐
│              LAYER 2: AUTONOMOUS RECOMMENDATION ENGINE                  │
│  • Ingests Gamification Signals (`deal_double_tap_like`, `story_deal_`) │
│  • Updates dynamic user profile weights (category affinity, urgency)    │
│  • Cross-domain lifestyle transfer for zero-history users                │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│              LAYER 3: SUPABASE DATA & STATE MANAGEMENT                  │
│  • LocalStorage / Supabase user gamification state synchronization      │
│  • Realtime dynamic stories & raffle giveaway catalog                   │
│  • Admin full control over stories, stamps, and raffle drawings         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Features & User Experience

### 2.1 Instagram Stories (`StoriesBar.tsx` & `StoryViewerModal.tsx`)
- **Visual Design:** Circular avatar trays with glowing Turkish gradient rings (`from-amber-400 via-rose-500 to-indigo-600`), live flash sale badges, and viewed/unviewed state indicators.
- **Interactive Gestures:** Full-screen modal with segment progress bars (5s per slide), touch-and-hold to pause, left/right tap to navigate slides, and direct "Fırsatı Yakala / Claim Deal" CTA linking straight to discounted bookings.
- **Signal Tracking:** Emits `story_view` and `story_deal_claim` events to enrich the user's category affinity.

### 2.2 Double-Tap Heart Burst (`DealCard.tsx`)
- **Behavior:** Double-tapping any deal card image creates a bouncing particle heart (`animate-heart-burst`) with mobile vibration haptics.
- **Functionality:** Instantly toggles the deal into the user's saved wishlist and awards +10 XP while emitting a high-confidence implicit interest signal (`deal_double_tap_like`) to the recommendation engine.

### 2.3 Daily Exploration Streak (`DailyStreakWidget.tsx`)
- **Mechanics:** Tracks consecutive login days with flame indicators (`🔥 3 Günlük Seri!`).
- **Rewards:** Daily XP and point claims (+25 XP & +15 Puan/day, scaling up on 7-day milestones).
- **Mystery Scratch Unlock:** Completing streaks unlocks the interactive Scratch Card foil.

### 2.4 Interactive Mystery Scratch Cards (`MysteryScratchModal.tsx`)
- **Experience:** Uses HTML5 Canvas for real-time touch and mouse scratch detection. When $>45\%$ of the metallic overlay is scratched away, the reward uncovers with confetti particles.
- **Prizes:** Instant discount vouchers, bonus raffle tickets, and travel points.

### 2.5 Digital Travel Passport (`TripzyPassport.tsx`)
- **Stamps & Levels:** Gamified travel booklet with rank tiers (*Çaylak Gezgin, Şehir Kaşifi, Rota Ustası, Seyahat Efsanesi*).
- **Turkish City Badges:** Collect stamps for Istanbul, Cappadocia, Antalya, Bodrum, and category achievements (Specialty Coffee Lover, Master Saver).

### 2.6 Social Media Raffles & Giveaways (`SocialRafflesCard.tsx`)
- **Viral Quests:** Users complete viral actions to earn raffle tickets:
  1. **Instagram Follow:** Follow `@tripzydeal` (+1 bilet).
  2. **Instagram Story Share:** Share deal to story and tag `@tripzydeal` (+2 bilet).
  3. **Friend Referral:** Invite travel buddies (+3 bilet per friend).
  4. **Points Exchange:** Redeem 50 Tripzy Points for +1 raffle ticket.
- **Verified Winner Drawings:** Provably fair random winner selection with countdown timers and certified transparency.

### 2.7 Live Social Proof & Leaderboards (`LiveSocialTicker.tsx` & `CityLeaderboard.tsx`)
- **Live Ticker:** Real-time Turkish notifications ("*Ahmet K. İstanbul'da ₺450 tasarruf etti*", "*Zeynep B. Kapadokya Balon Turu biletini kaptı*").
- **Weekly Leaderboards:** Top savers ranked by XP and city, fostering community competition.

---

## 3. Admin Management Hub (`/admin`)

The Admin Panel includes dedicated tabs for complete operational control:

1. **Stories & Badges Tab (`AdminGamificationTab.tsx`):**
   - Create and edit live Instagram stories with title, badge tag, image URL, action button text, and destination link.
   - Activate/deactivate story slides and preview them before publishing.
   - Inspect passport stamp unlock statistics.

2. **Social Raffles Tab (`AdminRafflesTab.tsx`):**
   - Create new travel giveaways (e.g., *Kapadokya 2 Gece Konaklama + Balon Turu*, *₺5.000 Uçak Bileti Kuponu*).
   - Configure total prize pool, end date, banner imagery, and quest requirements.
   - Trigger **"Kazananı Çek / Draw Random Winner"** with cryptographic fairness and instant winner announcement.

---

## 4. Verification & Testing

### Automated Test Suite
- **Unit Tests:** `npm test` runs Vitest across all gamification models, services, and streak calculations.
- **Coverage:** Verified streak calculations, XP progression thresholds, passport stamp validations, and raffle ticket balance operations.
- **Production Build:** `npm run build` generates clean PWA assets with zero TypeScript or bundling errors.
