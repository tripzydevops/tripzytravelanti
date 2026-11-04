import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SignalCollector, signalCollector } from '../../lib/signalCollector';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null })
    })
  }
}));

describe('SignalCollector Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signalCollector.clearBuffer();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    signalCollector.clearBuffer();
  });

  it('should maintain a singleton instance and create a valid session ID', () => {
    const instanceA = SignalCollector.getInstance();
    const instanceB = SignalCollector.getInstance();
    expect(instanceA).toBe(instanceB);
    expect(instanceA.getSessionId()).toBeTruthy();
    expect(instanceA.getSessionId().startsWith('sess_')).toBe(true);
  });

  it('should buffer impression and click signals', () => {
    signalCollector.recordImpression('deal-101', 'food');
    signalCollector.recordClick('deal-101', 'food');
    expect(signalCollector.getBufferedCount()).toBe(2);
  });

  it('should ignore dwell signals less than 2 seconds but record >= 2 seconds', () => {
    signalCollector.recordDwell('deal-102', 1.5, 'cafe');
    expect(signalCollector.getBufferedCount()).toBe(0);

    signalCollector.recordDwell('deal-102', 4, 'cafe');
    expect(signalCollector.getBufferedCount()).toBe(1);
  });

  it('should record vibe selection and update cold-start preferences', () => {
    signalCollector.recordVibe('vibe-coffee', 'Gurme & Kahve', 'food');
    expect(signalCollector.getBufferedCount()).toBe(1);

    const activeVibe = signalCollector.getActiveVibe();
    expect(activeVibe).not.toBeNull();
    expect(activeVibe?.vibeName).toBe('Gurme & Kahve');
    expect(activeVibe?.category).toBe('food');

    // Verify weights updated in localStorage
    const weightsRaw = localStorage.getItem('tripzy_category_weights');
    expect(weightsRaw).toBeTruthy();
    const weights = JSON.parse(weightsRaw || '{}');
    expect(weights.food).toBeGreaterThan(0);
  });

  it('should batch flush buffered signals to Supabase', async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(supabase.from).mockReturnValue({
      insert: insertMock
    } as any);

    signalCollector.recordClick('deal-200', 'hotel');
    signalCollector.recordImpression('deal-201', 'activity');

    await signalCollector.flush();

    expect(signalCollector.getBufferedCount()).toBe(0);
    expect(supabase.from).toHaveBeenCalledWith('user_signals');
    expect(insertMock).toHaveBeenCalledTimes(1);

    const callArgs = insertMock.mock.calls[0][0];
    expect(callArgs).toHaveLength(2);
    expect(callArgs[0].target_id).toBe('deal-200');
    expect(callArgs[0].signal_type).toBe('click');
    expect(callArgs[1].target_id).toBe('deal-201');
    expect(callArgs[1].signal_type).toBe('view');
  });
});
