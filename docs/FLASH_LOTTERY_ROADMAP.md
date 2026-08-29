# 🎟️ Tripzy.travel Flash Lottery & Instagram Share Verification Engine
> **Status:** Documented for Future Phase Implementation  
> **Target Release:** Growth & Gamification Phase  

---

## 📌 Executive Feature Overview
The **Flash Lottery Engine (Flaş Çekiliş Sistemi)** is a viral user-acquisition feature for Tripzy.travel. It allows merchants and platform admins to launch time-limited raffle campaigns where users earn **Lottery Tickets** by sharing merchant deals or coupons on Instagram (Stories, Posts, or Referral Links). 

When the flash countdown timer expires (e.g. 24 hours), a provably fair algorithm draws a winning ticket, depositing a 100% FREE verified digital voucher stub ([`RedeemedVoucherCard`](file:///c:/Users/elif/Documents/antigravity/happy-hopper/components/RedeemedVoucherCard.tsx#L12)) directly into the winner's wallet.

---

## 🔍 3-Tier Instagram Share Verification Architecture

Due to Meta API privacy constraints on consumer Instagram accounts, verification uses a 3-tier hybrid mechanism:

```
                  ┌────────────────────────────────────────────────────────┐
                  │          USER TAPS "SHARE TO INSTAGRAM TO WIN"         │
                  └───────────────────────────┬────────────────────────────┘
                                              │
         ┌────────────────────────────────────┼────────────────────────────────────┐
         │                                    │                                    │
         ▼                                    ▼                                    ▼
┌──────────────────┐               ┌──────────────────┐               ┌──────────────────┐
│ METHOD 1: TAG    │               │ METHOD 2: REFER  │               │ METHOD 3: AI OCR │
│ @tripzy.travel   │               │ Unique QR / Link │               │ Upload Screenshot│
│ Webhook Event    │               │ Friends Click    │               │ Vision OCR Check │
└────────┬─────────┘               └────────┬─────────┘               └────────┬─────────┘
         │                                    │                                    │
         └────────────────────────────────────┼────────────────────────────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────────┐
                              │  MINT LOTTERY TICKET IN DB    │
                              │  (#TRPZ-LOT-89210)            │
                              └───────────────────────────────┘
```

1. **Method 1 - Meta Webhook Integration:** 
   Tripzy listens to Instagram Graph API Webhook events whenever `@tripzy.travel` is tagged in a user's story or post, automatically awarding a ticket.
2. **Method 2 - Viral Deep-Link / QR Sticker:** 
   A custom Instagram Story Canvas is generated with a unique referral link/QR code. Every friend who taps or scans the link awards **+1 Bonus Ticket** to the user.
3. **Method 3 - AI Vision OCR Fallback:** 
   User uploads a quick story screenshot; Tripzy's Vision OCR verifies the tag text in <2 seconds.

---

## 🗄️ Database Schemas (Supabase PostgreSQL)

### 1. `public.lottery_campaigns`
```sql
CREATE TABLE IF NOT EXISTS public.lottery_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
    merchant_id UUID REFERENCES public.profiles(id),
    title VARCHAR(255) NOT NULL,
    title_tr VARCHAR(255),
    description TEXT,
    description_tr TEXT,
    prize_description TEXT NOT NULL,
    total_winners INT DEFAULT 1,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'drawn', 'cancelled'
    winning_ticket_ids UUID[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. `public.lottery_tickets`
```sql
CREATE TABLE IF NOT EXISTS public.lottery_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.lottery_campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    ticket_number VARCHAR(50) NOT NULL UNIQUE, -- e.g. TRPZ-LOT-89210
    verification_method VARCHAR(50) NOT NULL, -- 'webhook_tag', 'referral_click', 'ocr_screenshot'
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    is_winner BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. `public.lottery_draws`
```sql
CREATE TABLE IF NOT EXISTS public.lottery_draws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.lottery_campaigns(id),
    winning_ticket_id UUID REFERENCES public.lottery_tickets(id),
    winning_user_id UUID REFERENCES public.profiles(id),
    draw_seed VARCHAR(255) NOT NULL, -- Cryptographic seed for fair winner selection
    drawn_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 Implementation Phase Roadmap

- [ ] **Phase 1: DB & Merchant Creation UI**
  - Run SQL migrations for `lottery_campaigns`, `lottery_tickets`, and `lottery_draws`.
  - Add "Create Flash Lottery" option to [`pages/partner/PartnerDashboard.tsx`](file:///c:/Users/elif/Documents/antigravity/happy-hopper/pages/partner/PartnerDashboard.tsx).
- [ ] **Phase 2: Consumer UX & Ticket Minting**
  - Add "Share to Win Ticket" button on [`components/DealDetailView.tsx`](file:///c:/Users/elif/Documents/antigravity/happy-hopper/components/DealDetailView.tsx).
  - Add Flash Lottery Ticket Hub to [`pages/WalletPage.tsx`](file:///c:/Users/elif/Documents/antigravity/happy-hopper/pages/WalletPage.tsx).
- [ ] **Phase 3: Winner Selection Engine**
  - Build automated background job / Supabase Edge Function to select fair winners upon countdown expiration.
