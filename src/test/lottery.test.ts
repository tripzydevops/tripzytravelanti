import { describe, it, expect, beforeEach } from 'vitest';
import {
  lotteryService,
  generateTicketNumber,
  generateCryptographicSeed,
  DEFAULT_LOTTERY_CAMPAIGNS
} from '../../lib/services/lotteryService';

describe('Flash Lottery & Instagram Share Verification Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Ticket & Seed Generation', () => {
    it('should generate properly formatted ticket number (TRPZ-LOT-XXXXX)', () => {
      const ticketNum = generateTicketNumber();
      expect(ticketNum).toMatch(/^TRPZ-LOT-[A-Z]{2}\d{5}$/);
    });

    it('should generate unique cryptographic SHA seed with 0x prefix', () => {
      const seed1 = generateCryptographicSeed('camp-1', Date.now());
      const seed2 = generateCryptographicSeed('camp-2', Date.now() + 100);
      expect(seed1).toMatch(/^0x/);
      expect(seed2).toMatch(/^0x/);
      expect(seed1).not.toBe(seed2);
    });
  });

  describe('Campaigns Management', () => {
    it('should return default pre-seeded Turkish flash lotteries', async () => {
      const campaigns = await lotteryService.getCampaigns();
      expect(campaigns.length).toBeGreaterThanOrEqual(3);
      expect(campaigns[0].title_tr).toContain('Kapadokya');
      expect(campaigns[0].prizeDescription_tr).toBeDefined();
    });

    it('should retrieve single campaign by ID', async () => {
      const camp = await lotteryService.getCampaignById('lottery-cappadocia-balloon-2026');
      expect(camp).not.toBeNull();
      expect(camp?.id).toBe('lottery-cappadocia-balloon-2026');
    });

    it('should allow creating a new merchant flash lottery campaign', async () => {
      const newCamp = await lotteryService.createCampaign({
        title: 'Antalya VIP Yacht Tour',
        title_tr: 'Antalya VIP Yat Turu',
        prizeDescription: 'Full Day Yacht Cruise',
        prizeDescription_tr: 'Tam Gün Yat Turu',
        merchantName: 'Antalya Marina Partners',
        totalWinners: 1
      });

      expect(newCamp.id).toBeDefined();
      expect(newCamp.title_tr).toBe('Antalya VIP Yat Turu');
      expect(newCamp.status).toBe('active');

      const all = await lotteryService.getCampaigns();
      expect(all.some(c => c.id === newCamp.id)).toBe(true);
    });
  });

  describe('Ticket Minting & Verification Pathways', () => {
    it('should mint a ticket via Story Canvas sharing', async () => {
      const res = await lotteryService.claimTicket(
        'lottery-cappadocia-balloon-2026',
        'user-test-123',
        'story_canvas'
      );

      expect(res.success).toBe(true);
      expect(res.ticket).toBeDefined();
      expect(res.ticket?.verificationMethod).toBe('story_canvas');
      expect(res.ticket?.ticketNumber).toMatch(/^TRPZ-LOT-/);
      expect(res.ticket?.isWinner).toBe(false);

      const userTickets = await lotteryService.getUserTickets('user-test-123');
      expect(userTickets.length).toBe(1);
      expect(userTickets[0].id).toBe(res.ticket?.id);
    });

    it('should verify uploaded Instagram story screenshot via AI OCR', async () => {
      const mockImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const res = await lotteryService.verifyStoryOCR(
        mockImageData,
        'lottery-bodrum-yacht-2026',
        'user-test-456'
      );

      expect(res.success).toBe(true);
      expect(res.verified).toBe(true);
      expect(res.confidence).toBeGreaterThan(0.9);
      expect(res.ticket).toBeDefined();
      expect(res.ticket?.verificationMethod).toBe('ocr_screenshot');
    });

    it('should reject invalid or empty OCR image input', async () => {
      const res = await lotteryService.verifyStoryOCR(
        '',
        'lottery-bodrum-yacht-2026',
        'user-test-456'
      );

      expect(res.success).toBe(false);
      expect(res.verified).toBe(false);
    });
  });

  describe('Provably Fair Winner Selection Engine', () => {
    it('should execute provably fair winner selection and update status to drawn', async () => {
      // First mint two tickets
      await lotteryService.claimTicket('lottery-istanbul-michelin-2026', 'user-ist-1', 'story_canvas');
      await lotteryService.claimTicket('lottery-istanbul-michelin-2026', 'user-ist-2', 'referral_click');

      const drawRes = await lotteryService.drawWinner('lottery-istanbul-michelin-2026', 'admin');

      expect(drawRes.success).toBe(true);
      expect(drawRes.winners.length).toBeGreaterThanOrEqual(1);
      expect(drawRes.seed).toMatch(/^0x/);
      expect(drawRes.drawnAt).toBeDefined();

      // Verify campaign status updated to 'drawn'
      const updatedCamp = await lotteryService.getCampaignById('lottery-istanbul-michelin-2026');
      expect(updatedCamp?.status).toBe('drawn');
    });
  });
});
