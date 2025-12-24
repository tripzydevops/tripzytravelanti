/**
 * Utility functions for handling images, specifically for optimizing Supabase Storage URLs.
 */

interface ImageOptimizationOptions {
    width?: number;
    height?: number;
    quality?: number; // 0-100
    format?: 'origin' | 'webp' | 'avif';
    resize?: 'cover' | 'contain' | 'fill';
}

/**
 * Transformations a Supabase Storage URL into an optimized URL using Supabase's image transformation features.
 * Supports replacing the Supabase origin with a custom CDN URL (e.g., Cloudflare) via VITE_CDN_URL.
 * 
 * @param url The original image URL (e.g., from Supabase Storage)
 * @param options Optimization options (width, height, quality, format)
 * @param category Optional category to provide a more relevant placeholder
 * @returns The optimized URL
 */
export const getOptimizedImageUrl = (url: string | undefined | null, options: ImageOptimizationOptions = {}, category?: string): string => {
    if (!url || url === 'burger' || url === 'default' || !url.startsWith('http')) {
        // Category-based premium placeholders
        const placeholders: Record<string, string> = {
            'food': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
            'drink': 'https://images.unsplash.com/photo-1544145945-f904253d0c7b?auto=format&fit=crop&w=1200&q=80',
            'travel': 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
            'hotel': 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
            'experience': 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80',
            'spa': 'https://images.unsplash.com/photo-1544161515-4af6b1d4b1b2?auto=format&fit=crop&w=1200&q=80'
        };

        const key = category?.toLowerCase();
        if (key && placeholders[key]) return placeholders[key];
        if (key?.includes('rest')) return placeholders['food'];
        if (key?.includes('ot')) return placeholders['hotel'];
        if (key?.includes('ka')) return placeholders['experience']; // Activities/Experiences
        
        // Final fallback
        return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80'; // Travel landscape
    }

    // 1. Handle Unsplash URLs
    if (url.includes('unsplash.com')) {
        try {
            const urlObj = new URL(url);
            if (options.width) urlObj.searchParams.set('w', options.width.toString());
            if (options.height) urlObj.searchParams.set('h', options.height.toString());
            urlObj.searchParams.set('q', (options.quality || 80).toString());
            urlObj.searchParams.set('fit', options.resize === 'cover' ? 'crop' : 'contain');
            urlObj.searchParams.set('auto', 'format');
            return urlObj.toString();
        } catch (e) {
            return url;
        }
    }

    // 2. Handle Supabase Storage URLs (Only if it's not already transformed)
    if (!url.includes('supabase.co/storage/v1/object/public')) {
        return url;
    }

    // Supabase Image Transformations are done via the /render/image/ endpoint
    // Standard URL: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
    // Optimized URL: https://[project].supabase.co/storage/v1/render/image/public/[bucket]/[path]?width=...

    // Replace /object/ with /render/image/
    // Requirement for Turkey launch performance with high user volume
    let optimizedUrl = url.replace('/object/public/', '/render/image/public/');

    const params = new URLSearchParams();

    if (options.width) params.append('width', options.width.toString());
    if (options.height) params.append('height', options.height.toString());
    if (options.quality) params.append('quality', options.quality.toString());
    if (options.format) params.append('format', options.format);
    if (options.resize) params.append('resize', options.resize);

    // Default to webp if not specified, as it's smaller and widely supported
    if (!options.format) params.append('format', 'origin');

    const queryString = params.toString();
    let finalUrl = queryString ? `${optimizedUrl}?${queryString}` : optimizedUrl;

    // CDN Domain Replacement (The "Pro" Trick)
    // If VITE_CDN_URL is set (e.g., "https://cdn.tripzy.com"), replace the Supabase origin.
    // This allows Cloudflare to cache the images, saving Supabase bandwidth.
    const cdnUrl = import.meta.env.VITE_CDN_URL;
    if (cdnUrl && finalUrl.includes('supabase.co')) {
        try {
            const urlObj = new URL(finalUrl);
            // Replace protocol and host, keep pathname and search
            // Remove trailing slash from cdnUrl if present
            const cleanCdnUrl = cdnUrl.replace(/\/$/, '');
            // We construct the new URL using the CDN domain but keeping the path and query params
            // Note: The CDN must be configured to proxy requests to the Supabase domain
            finalUrl = `${cleanCdnUrl}${urlObj.pathname}${urlObj.search}`;
        } catch (e) {
            console.warn('Failed to construct CDN URL:', e);
        }
    }

    return finalUrl;
};

/**
 * Helper for standard thumbnail size
 */
export const getThumbnailUrl = (url: string | undefined | null, category?: string) => {
    return getOptimizedImageUrl(url, { width: 400, height: 300, resize: 'cover', quality: 80, format: 'webp' }, category);
};

/**
 * Helper for standard hero image size
 */
export const getHeroImageUrl = (url: string | undefined | null, category?: string) => {
    return getOptimizedImageUrl(url, { width: 1200, quality: 90, format: 'webp' }, category);
};
