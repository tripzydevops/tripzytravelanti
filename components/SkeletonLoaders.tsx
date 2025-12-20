import React from 'react';

export const SkeletonBase: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`bg-white/10 animate-pulse rounded ${className}`} />
);

export const ProfileSkeleton: React.FC = () => (
    <div className="max-w-4xl mx-auto p-4 space-y-8 animate-fade-in">
        {/* Header Skeleton */}
        <div className="flex items-center space-x-4">
            <SkeletonBase className="w-20 h-20 rounded-full" />
            <div className="space-y-2">
                <SkeletonBase className="w-48 h-6" />
                <SkeletonBase className="w-32 h-4" />
            </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
                <SkeletonBase key={i} className="h-24 rounded-2xl" />
            ))}
        </div>

        {/* Sections Skeleton */}
        <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-3">
                    <SkeletonBase className="w-32 h-5" />
                    <SkeletonBase className="w-full h-12 rounded-xl" />
                    <SkeletonBase className="w-full h-12 rounded-xl" />
                </div>
            ))}
        </div>
    </div>
);

export const AnalyticCardSkeleton: React.FC = () => (
    <SkeletonBase className="h-32 w-full rounded-2xl" />
);

export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 4 }) => (
    <div className="flex items-center space-x-4 py-4 px-6 border-b border-white/5">
        {[...Array(cols)].map((_, i) => (
            <SkeletonBase key={i} className="flex-1 h-4" />
        ))}
    </div>
);

export const DealCardSkeleton: React.FC = () => (
    <div className="bg-white/5 rounded-3xl overflow-hidden border border-white/10 animate-pulse">
        <div className="aspect-[4/3] bg-white/10" />
        <div className="p-5 space-y-3">
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <SkeletonBase className="w-32 h-6" />
                    <SkeletonBase className="w-24 h-4" />
                </div>
                <SkeletonBase className="w-16 h-8 rounded-full" />
            </div>
            <div className="space-y-1">
                <SkeletonBase className="w-full h-3" />
                <SkeletonBase className="w-5/6 h-3" />
            </div>
            <div className="pt-4 flex justify-between items-center">
                <SkeletonBase className="w-20 h-5" />
                <SkeletonBase className="w-24 h-10 rounded-xl" />
            </div>
        </div>
    </div>
);
