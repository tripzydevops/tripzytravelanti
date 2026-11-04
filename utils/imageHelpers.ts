export const resizeImage = (file: File, maxWidth: number = 1200, maxHeight: number = 1200): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const resizedFile = new File([blob], file.name, {
                            type: file.type,
                            lastModified: Date.now(),
                        });
                        resolve(resizedFile);
                    } else {
                        reject(new Error('Canvas to Blob conversion failed'));
                    }
                }, file.type, 0.8); // 0.8 quality
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

export interface ImageOptimizationOptions {
    width?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'origin';
}

/**
 * Optimizes image URLs for fast mobile delivery and reduced bandwidth at 100k scale.
 * Works seamlessly with Supabase Storage and CDN providers (Unsplash, Cloudinary).
 */
export const getOptimizedImageUrl = (
    url: string | null | undefined,
    options: ImageOptimizationOptions = { width: 450, quality: 75, format: 'webp' }
): string => {
    if (!url) {
        return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=450&q=75';
    }

    const { width = 450, quality = 75 } = options;

    try {
        // 1. Supabase Storage transformation support
        if (url.includes('/storage/v1/object/public/')) {
            const transformedUrl = url.replace(
                '/storage/v1/object/public/',
                '/storage/v1/render/image/public/'
            );
            const separator = transformedUrl.includes('?') ? '&' : '?';
            return `${transformedUrl}${separator}width=${width}&quality=${quality}&resize=contain`;
        }

        // 2. Unsplash URLs
        if (url.includes('images.unsplash.com')) {
            const cleanUrl = url.split('?')[0];
            return `${cleanUrl}?auto=format&fit=crop&w=${width}&q=${quality}`;
        }

        return url;
    } catch {
        return url;
    }
};

