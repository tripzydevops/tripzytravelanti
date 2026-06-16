// Global test setup for Vitest
// Stubs import.meta.env so supabaseClient.ts doesn't crash during tests
import '@testing-library/jest-dom';

// Ensure Supabase env vars exist for any module that imports supabaseClient
// These are dummy values — all tests should mock supabaseClient anyway
if (typeof import.meta !== 'undefined' && import.meta.env) {
    import.meta.env.VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://test.supabase.co';
    import.meta.env.VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key-1234567890';
}
