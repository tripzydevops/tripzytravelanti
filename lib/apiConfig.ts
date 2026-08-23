/**
 * API Configuration Helper for Tripzy Platform
 * Safely resolves the backend FastAPI URL for local dev vs production environments.
 */

export function getBackendApiUrl(): string | null {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl && envUrl.trim() !== '') {
        return envUrl.replace(/\/$/, '');
    }

    // Default to localhost:8000 only when running on local development host
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:8000';
    }

    // In production without explicit VITE_API_URL, return null to use client/Supabase fallback
    return null;
}
