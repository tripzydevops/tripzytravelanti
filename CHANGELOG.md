# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-06-16

### Refactoring & Architecture
- **Supabase Service Split**: Decoupled the monolithic 2,841-line `lib/supabaseService.ts` file into 11 specialized domain-specific services under `lib/services/`:
  - `userService.ts` — User profile, authentication, and platform mappings.
  - `dealService.ts` — Deals, categories, and vector sync calls.
  - `walletService.ts` — Saved deals, claims, and limits.
  - `redemptionService.ts` — Redemptions, code generation, and scans.
  - `couponService.ts` — Promo codes and coupon campaign logic.
  - `loyaltyService.ts` — User loyalty ledger and points transactions.
  - `geofenceService.ts` — Geo-fenced zones.
  - `partnerService.ts` — Partner leads and redemption trends.
  - `referralService.ts` — Referral networking and chain calculations.
  - `adminService.ts` — Audit logs, announcements, analytics, and background images.
  - `helpers.ts` — DB deal mapping and model formatting helpers.
- **Backward Compatibility**: Preserved a barrel re-export pattern in `lib/supabaseService.ts` ensuring all existing imports remain intact.

### Testing & Quality Assurance
- **Vitest Setup**: Configured global test environment setup file `src/test/setup.ts` to stub out critical Supabase environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) during test imports, resolving test harness startup crashes.
- **Mock Improvements**:
  - Stabilized Supabase Client and Service mocks in `lib/recommendationLogic.test.ts` and `src/test/deals.test.ts`.
  - Added mocks for Pinecone/Vector sync calls during deal creation to prevent `TypeError` warnings from printing in test stderr.
- **Vite Configuration**: Stabilized Vitest options in `vite.config.ts` (added `globals`, configured `jsdom` environment, set setupFiles, and enabled V8 coverage provider).

### Cleanup
- Purged stale and duplicate `lib/supabaseService.ts.tmp` file.
- Cleaned up loose debug script files in the project root:
  - `check_categories.ts`
  - `verify_db_setup.js`
  - `test_disambiguate.js`
  - `deals_test.csv`
