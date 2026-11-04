# Task Plan: Tripzy Production & Architecture Improvements

## Goal
Implement the 5 architectural & product improvements for Tripzy.travel (Turkey launch, 100k scale efficiency, cold-start optimization, offline resilience, and full admin control), thoroughly test them, and document the changes.

## Current Phase
Phase 6: Complete & Verified

## Phases

### Phase 1: Client-Side User Signal Collection Module (Layer 1)
- [x] Create `lib/signalCollector.ts` (buffers card impressions, dwell times, category clicks, deal bookmarks; flushes to backend `/api/v1/signals/batch` or Supabase batch insert with 15s debounce and unload handler)
- [x] Wire `signalCollector` into `components/DealCard.tsx`, `contexts/UserActivityContext.tsx`, and `pages/HomePage.tsx`
- [x] Add unit test suite `src/test/signalCollector.test.ts` (5/5 passed)
- **Status:** completed

### Phase 2: Turkey-First 5-Second Vibe Picker (Cold-Start Solution)
- [x] Create `components/home/VibePicker.tsx` (Turkish vibes: ☕ Gurme & Kahve, 🏖️ Ege & Akdeniz, 🎈 Kapadokya & Macera, 🏛️ Tarih & Kültür, 💆 Spa & Termal, 🛍️ Çarşı & Alışveriş)
- [x] Connect Vibe selection directly to `signalCollector` and dynamically re-rank local deals in `HomePage.tsx`
- [x] Add localization keys in `localization.ts` (TR/EN)
- **Status:** completed

### Phase 3: Feed Query & Image Bandwidth Optimization (100k Monthly Scale)
- [x] Add image URL optimization helper in `utils/imageHelpers.ts` for Supabase Storage transform parameters (`width=450&quality=75&format=webp`)
- [x] Optimize image delivery across feed cards and modals
- **Status:** completed

### Phase 4: Offline Wallet QR Guarantee & Low-Connectivity Fallback
- [x] Enhance `lib/offlineStorage.ts` to pre-cache wallet items with dynamic QR payloads and 6-digit redemption codes
- [x] Add offline status banner and cached redemption code view in `pages/WalletPage.tsx`
- [x] Verify offline caching and fallback
- **Status:** completed

### Phase 5: Admin Live Controls (Geofence Slider, $P \ge 0.85$ Match Threshold, & Deal Kill-Switch)
- [x] Enhance Admin UI in `components/admin/AdminFraudSignalsTab.tsx` with live geofence radius adjustment slider and recommendation match score threshold ($P \ge 0.85$)
- [x] Verified deal status toggle (pause/unpublish/kill-switch) in `AdminDealsTab.tsx`
- [x] Added TRY (₺) / USD toggle for revenue & admin analytics
- **Status:** completed

### Phase 6: Testing, Build Verification & Documentation
- [x] Run full Vitest unit test suite (`npm test` - 8/8 test files, 44/44 tests passed)
- [x] Run Python backend test suite (`py -m pytest api/tests` - 20/20 tests passed)
- [x] Verify production build (`npm run build` - succeeded in 1m 15s)
- [x] Create detailed documentation artifact and update repository guides
- **Status:** completed
