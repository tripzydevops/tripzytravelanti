# Task Plan: Staging, Committing, and Implementing Tests for Tripzy Loyalty, Coupon, and Geofence System

## Goal
Stage and commit the Phase 1–6 implementations of the Tripzy Travel Coupon, Loyalty, Geofencing, and Scan validation systems, and implement Playwright and Pytest suites to verify frontend and backend correctness.

## Current Phase
Phase 1: Git Staging & Committing

## Phases

### Phase 1: Git Staging & Committing
- [x] Create plan files (`task_plan.md`, `findings.md`, `progress.md`)
- [x] Run `git add` for all modified/untracked files in `C:\Users\elif\.gemini\antigravity\scratch\tripzy`
- [x] Commit changes with clear, descriptive messages
- [x] Push changes to `origin/main` on GitHub
- **Status:** complete

### Phase 2: Requirements Analysis for Testing
- [ ] Inspect existing test harness configurations in the Tripzy repository
- [ ] Draft mock scenarios for scan validation and loyalty point expiration
- [ ] Document research in `findings.md`
- **Status:** in_progress

### Phase 3: Implementing Pytest (Backend & RPCs)
- [ ] Write pytest test files for `secure_earn_points()`, `secure_burn_points()`, and `expire_loyalty_points()` RPCs
- [ ] Write mock tests for `validate-qr-token` and `generate-qr-token` Edge Functions
- [ ] Verify execution passes locally
- **Status:** pending

### Phase 4: Implementing Playwright (Frontend Flows)
- [ ] Add Playwright test scripts for `PartnerScanPage.tsx` and `GeofencePage.tsx`
- [ ] Add Playwright test scripts for `CouponCampaignsPage.tsx` and guest deal detail views
- [ ] Verify tests pass cleanly on mobile-first emulated layout
- **Status:** pending

### Phase 5: Verification & Delivery
- [ ] Settle database schemas and verify RLS policies are active on production Supabase
- [ ] Perform manual validation of geofence enforcement configurations (`off`, `soft_warning`, `hard_block`)
- [ ] Generate final walkthrough report
- **Status:** pending

## Key Questions
1. Do we need to run any local mock server (like Supabase CLI local stack) for the backend/frontend tests?
2. Should we stage and commit everything in a single commit or break it down into clean thematic commits (e.g. database migrations, edge functions, UI pages)?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Initialize planning-with-files | Restores system state tracking, logs errors, and maintains research traces for the TÜBİTAK/R&D candidacy |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| None  | 1       |            |

## Notes
- Keep tasks small and focused
- Update phase status as work progresses
- Log all commands and errors immediately
