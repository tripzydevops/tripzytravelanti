# Tripzy.travel — Flash Lottery & Instagram Share Verification Engine

## 1. System Overview & Architectural Integration
The **Flash Lottery Engine (Flaş Çekiliş Sistemi)** is a core viral growth and merchant acquisition loop on **Tripzy.travel**, operating seamlessly across our 3-Layer architecture:

```
┌─────────────────────────────────────────────────────────────────────────┐
│               LAYER 1: CONSUMER & MERCHANT INTERFACE                    │
│  • Flash Lottery Urgency Banner (`FlashLotteryBanner.tsx`)              │
│  • Instagram Story Canvas 9:16 Generator (`FlashLotteryModal.tsx`)      │
│  • AI Vision OCR Screenshot Uploader (Drag-and-Drop Verification)       │
│  • Dedicated Wallet Ticket Hub (`LotteryTicketsTab.tsx`)                │
│  • Merchant Viral Campaign Launcher (`PartnerDashboard.tsx`)            │
│  • Admin Provably Fair Draw Hub (`AdminLotteryTab.tsx`)                 │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Implicit & Explicit Signals (`lottery_ticket_mint`)
┌────────────────────────────────────▼────────────────────────────────────┐
│               LAYER 2: AUTONOMOUS BRAIN & FASTAPI API                   │
│  • FastAPI Endpoints (`/api/v1/lottery/*`)                              │
│  • Provably Fair SHA-256 Seed Calculation & Deterministic Selection     │
│  • AI Vision OCR Tag Parser (`@tripzydeal`, merchant tags)           │
│  • Cold-Start Latent Signal Injection for Zero-History Users            │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│               LAYER 3: SUPABASE DATA & MIGRATIONS                       │
│  • `public.lottery_campaigns` (Active & drawn giveaways)                │
│  • `public.lottery_tickets` (Minted tickets with verification proofs)   │
│  • `public.lottery_draws` (Cryptographic seeds & audit logs)            │
│  • Full LocalStorage Offline Sync Fallback                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Verification Pathways & Anti-Fraud

Due to Meta API privacy constraints on consumer Instagram accounts, verification uses a 3-tier hybrid mechanism:

### 2.1 Story Canvas Sharing & Deep Link Tracking (`story_canvas` / `referral_click`)
- Generates a branded 9:16 Instagram Story Canvas with deal banner, `@tripzydeal` tag sticker, and the user's referral QR code (`#TRPZ-XXXXXX`).
- Emits Web Share API intent and automatically mints an active lottery ticket (`TRPZ-LOT-XXXXX`).

### 2.2 AI Vision OCR Screenshot Verification (`ocr_screenshot`)
- Users upload a quick screenshot of their posted Instagram Story.
- The OCR service analyzes the image for `@tripzydeal` tag presence, partner handle, and deal badge, awarding a verified ticket in $<2$ seconds.

### 2.3 Points Exchange (`points_exchange`)
- Allows users to convert 50 Tripzy loyalty points into +1 additional lottery ticket.

---

## 3. Provably Fair Cryptographic Winner Selection
All lottery draws utilize cryptographic hashing to guarantee transparency and prevent manipulation:

$$\text{Draw Seed} = \text{SHA256}(\text{CampaignID} + \text{Timestamp} + \text{Salt})$$

$$\text{Ticket Hash} = \text{SHA256}(\text{TicketNumber} + \text{Draw Seed})$$

- Tickets are sorted deterministically based on their individual hash values against the cryptographic seed.
- Winners receive an instant 100% FREE digital voucher stub inside [`WalletPage.tsx`](file:///c:/Users/elif/Documents/antigravity/happy-hopper/pages/WalletPage.tsx).

---

## 4. API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/lottery/campaigns` | Lists all active and upcoming flash lottery campaigns. |
| `POST` | `/api/v1/lottery/campaigns` | Creates a new flash lottery campaign (Merchant / Admin). |
| `POST` | `/api/v1/lottery/claim-ticket` | Mints a verified ticket via share or points exchange. |
| `POST` | `/api/v1/lottery/ocr-verify` | Analyzes uploaded story screenshot via AI Vision OCR. |
| `POST` | `/api/v1/lottery/draw` | Executes provably fair winner draw with cryptographic seed. |

---

## 5. Verification & Testing
- **Vitest Suite:** `src/test/lottery.test.ts` validates ticket number formatting, SHA seed generation, OCR responses, and fair winner draws.
- **Pytest Suite:** `api/tests/test_lottery.py` validates FastAPI endpoints and Pydantic schemas.
