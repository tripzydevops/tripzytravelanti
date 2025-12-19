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
 * Transforms a Supabase Storage URL into an optimized URL using Supabase's image transformation features.
 * Supports replacing the Supabase origin with a custom CDN URL (e.g., Cloudflare) via VITE_CDN_URL.
 * 
 * @param url The original image URL (e.g., from Supabase Storage)
 * @param options Optimization options (width, height, quality, format)
 * @returns The optimized URL
 */
export const getOptimizedImageUrl = (url: string | undefined | null, options: ImageOptimizationOptions = {}): string => {
    if (!url) return '';

    // If it's not a Supabase URL, return as is
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
export const getThumbnailUrl = (url: string | undefined | null) => {
    return getOptimizedImageUrl(url, { width: 400, height: 300, resize: 'cover', quality: 80, format: 'webp' });
};

/**
 * Helper for standard hero image size
 */
export const getHeroImageUrl = (url: string | undefined | null) => {
    return getOptimizedImageUrl(url, { width: 1200, quality: 90, format: 'webp' });
};
