/**
 * Layer 1: Client-Side User Signal Collection Module
 * Buffers and batches implicit & explicit user interaction signals
 * before flushing to Layer 2 Brain API or Supabase.
 * Reduces database write amplification by up to 80% at 100k scale.
 */

import { supabase } from './supabaseClient';
import { getBackendApiUrl } from './apiConfig';

export type SignalType = 
  | 'view' 
  | 'click' 
  | 'dwell' 
  | 'search' 
  | 'favorite' 
  | 'save' 
  | 'claim' 
  | 'redeem' 
  | 'vibe_select'
  | 'category_select';

export interface UserSignal {
  signalType: SignalType;
  targetId: string;
  category?: string;
  timeSpentSeconds?: number;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}

const SESSION_STORAGE_KEY = 'tripzy_session_id';
const LOCAL_PROFILE_KEY = 'tripzy_cold_start_vibe';
const FLUSH_INTERVAL_MS = 15000; // 15 seconds
const MAX_BUFFER_SIZE = 20;

export class SignalCollector {
  private static instance: SignalCollector;
  private buffer: UserSignal[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private currentUserId: string | null = null;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.initLifecycleListeners();
  }

  public static getInstance(): SignalCollector {
    if (!SignalCollector.instance) {
      SignalCollector.instance = new SignalCollector();
    }
    return SignalCollector.instance;
  }

  public setUserId(userId: string | null): void {
    if (this.currentUserId !== userId) {
      this.currentUserId = userId;
      // Flush any queued anonymous signals under previous session if needed
      if (this.buffer.length > 0) {
        this.flush();
      }
    }
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'server-session';
    try {
      let id = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!id) {
        id = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem(SESSION_STORAGE_KEY, id);
      }
      return id;
    } catch {
      return `sess_${Date.now()}_fallback`;
    }
  }

  private initLifecycleListeners(): void {
    if (typeof window === 'undefined') return;

    // Flush when user leaves or switches tab
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });

    window.addEventListener('beforeunload', () => {
      this.flush(true);
    });
  }

  /**
   * Record a generic interaction signal
   */
  public recordSignal(signal: UserSignal): void {
    const enrichedSignal: UserSignal = {
      ...signal,
      timestamp: signal.timestamp || Date.now()
    };

    this.buffer.push(enrichedSignal);
    this.updateLocalColdStartProfile(enrichedSignal);

    if (this.buffer.length >= MAX_BUFFER_SIZE) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), FLUSH_INTERVAL_MS);
    }
  }

  /**
   * Convenience helpers for specific interaction types
   */
  public recordImpression(dealId: string, category?: string): void {
    this.recordSignal({ signalType: 'view', targetId: dealId, category });
  }

  public recordClick(dealId: string, category?: string): void {
    this.recordSignal({ signalType: 'click', targetId: dealId, category });
  }

  public recordDwell(dealId: string, seconds: number, category?: string): void {
    if (seconds >= 2) {
      this.recordSignal({ signalType: 'dwell', targetId: dealId, category, timeSpentSeconds: Math.round(seconds) });
    }
  }

  public recordVibe(vibeId: string, vibeName: string, category?: string): void {
    this.recordSignal({
      signalType: 'vibe_select',
      targetId: vibeId,
      category,
      metadata: { vibeName }
    });
    // Immediately persist in local cold start memory
    try {
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify({ vibeId, vibeName, category, timestamp: Date.now() }));
    } catch {
      // Ignore storage errors
    }
  }

  public getActiveVibe(): { vibeId: string; vibeName: string; category?: string } | null {
    try {
      const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Internal local preference weighting for zero-latency cold-start ranking
   */
  private updateLocalColdStartProfile(signal: UserSignal): void {
    if (!signal.category) return;
    try {
      const weightsKey = 'tripzy_category_weights';
      const raw = localStorage.getItem(weightsKey);
      const weights: Record<string, number> = raw ? JSON.parse(raw) : {};
      
      const boost = signal.signalType === 'click' ? 3 : signal.signalType === 'vibe_select' ? 5 : 1;
      weights[signal.category] = (weights[signal.category] || 0) + boost;
      
      localStorage.setItem(weightsKey, JSON.stringify(weights));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Flushes the buffer to FastAPI batch endpoint or Supabase
   */
  public async flush(isUnload = false): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.buffer.length === 0) return;

    const signalsToFlush = [...this.buffer];
    this.buffer = [];

    const payload = {
      user_id: this.currentUserId,
      session_id: this.sessionId,
      signals: signalsToFlush.map(s => ({
        signal_type: s.signalType,
        target_id: s.targetId,
        category: s.category,
        time_spent_seconds: s.timeSpentSeconds,
        metadata: s.metadata,
        created_at: new Date(s.timestamp || Date.now()).toISOString()
      }))
    };

    // 1. Try FastAPI Layer 2 Brain if URL is configured
    const apiUrl = getBackendApiUrl();
    if (apiUrl && !isUnload) {
      try {
        const response = await fetch(`${apiUrl}/api/v1/signals/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (response.ok) return;
      } catch (err) {
        console.warn('[SignalCollector] FastAPI flush failed, attempting Supabase fallback:', err);
      }
    }

    // 2. Fallback directly to Supabase multi-row batch insert
    try {
      const dbRows = signalsToFlush.map(s => ({
        user_id: this.currentUserId,
        session_id: this.sessionId,
        signal_type: s.signalType,
        target_id: s.targetId,
        category: s.category || null,
        time_spent_seconds: s.timeSpentSeconds || null,
        metadata: s.metadata || {}
      }));

      await supabase.from('user_signals').insert(dbRows);
    } catch (err) {
      console.warn('[SignalCollector] Supabase batch insert error:', err);
      // In case of network error, re-queue up to half buffer to prevent unbounded growth
      if (this.buffer.length < MAX_BUFFER_SIZE) {
        this.buffer.unshift(...signalsToFlush.slice(0, 10));
      }
    }
  }

  public getBufferedCount(): number {
    return this.buffer.length;
  }

  public clearBuffer(): void {
    this.buffer = [];
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

export const signalCollector = SignalCollector.getInstance();
