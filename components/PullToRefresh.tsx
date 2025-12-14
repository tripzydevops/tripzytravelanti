import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SpinnerIcon } from './Icons';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
    pullThreshold?: number; // Distance in px to trigger refresh
    className?: string;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
    onRefresh,
    children,
    pullThreshold = 80,
    className = ''
}) => {
    const [isPulling, setIsPulling] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const isDragging = useRef(false);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        // Only enable pull-to-refresh when scrolled to top
        if (containerRef.current && containerRef.current.scrollTop === 0) {
            startY.current = e.touches[0].clientY;
            isDragging.current = true;
        }
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!isDragging.current || isRefreshing) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;

        // Only pull down, not up
        if (diff > 0) {
            // Apply resistance to make it feel natural
            const resistance = 0.4;
            const distance = Math.min(diff * resistance, pullThreshold * 1.5);
            setPullDistance(distance);
            setIsPulling(true);

            // Prevent scroll while pulling
            if (distance > 10) {
                e.preventDefault();
            }
        }
    }, [isRefreshing, pullThreshold]);

    const handleTouchEnd = useCallback(async () => {
        if (!isDragging.current) return;
        isDragging.current = false;

        if (pullDistance >= pullThreshold && !isRefreshing) {
            setIsRefreshing(true);
            setPullDistance(pullThreshold); // Hold at threshold during refresh

            try {
                await onRefresh();
            } catch (error) {
                console.error('Refresh failed:', error);
            } finally {
                setIsRefreshing(false);
            }
        }

        // Animate back to 0
        setPullDistance(0);
        setIsPulling(false);
    }, [pullDistance, pullThreshold, isRefreshing, onRefresh]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Use passive: false to allow preventDefault
        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

    const progress = Math.min(pullDistance / pullThreshold, 1);
    const showIndicator = isPulling || isRefreshing;

    return (
        <div
            ref={containerRef}
            className={`relative overflow-auto ${className}`}
            style={{ overscrollBehavior: 'contain' }}
        >
            {/* Pull indicator */}
            <div
                className={`absolute left-0 right-0 flex justify-center items-center transition-opacity duration-200 z-50 ${showIndicator ? 'opacity-100' : 'opacity-0'}`}
                style={{
                    top: -50,
                    height: 50,
                    transform: `translateY(${pullDistance}px)`,
                    transition: isPulling ? 'none' : 'transform 0.3s ease-out'
                }}
            >
                <div
                    className={`p-2 rounded-full bg-[#0f172a]/90 backdrop-blur-md border border-white/20 shadow-lg ${isRefreshing ? 'animate-spin' : ''}`}
                    style={{
                        transform: `rotate(${progress * 360}deg) scale(${0.5 + progress * 0.5})`,
                        opacity: progress
                    }}
                >
                    <SpinnerIcon className="w-6 h-6 text-gold-500" />
                </div>
            </div>

            {/* Content with pull effect */}
            <div
                style={{
                    transform: `translateY(${pullDistance}px)`,
                    transition: isPulling ? 'none' : 'transform 0.3s ease-out'
                }}
            >
                {children}
            </div>
        </div>
    );
};

export default PullToRefresh;
