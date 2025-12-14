import React from 'react';

interface DealCardSkeletonProps {
    count?: number;
}

const DealCardSkeleton: React.FC<DealCardSkeletonProps> = ({ count = 1 }) => {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className="relative flex flex-col rounded-2xl overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 animate-pulse"
                >
                    {/* Image skeleton */}
                    <div className="relative overflow-hidden">
                        <div className="w-full h-56 bg-white/10" />
                        {/* Discount badge skeleton */}
                        <div className="absolute top-3 left-3 w-16 h-6 bg-white/10 rounded-lg" />
                    </div>

                    {/* Content skeleton */}
                    <div className="p-5 flex flex-col flex-grow">
                        {/* Vendor row */}
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-white/10" />
                                <div className="w-20 h-4 bg-white/10 rounded" />
                            </div>
                        </div>

                        {/* Title skeleton */}
                        <div className="w-3/4 h-5 bg-white/10 rounded mb-2" />

                        {/* Description skeleton */}
                        <div className="space-y-2 mb-4">
                            <div className="w-full h-3 bg-white/10 rounded" />
                            <div className="w-2/3 h-3 bg-white/10 rounded" />
                        </div>

                        {/* Footer skeleton */}
                        <div className="mt-auto pt-4 border-t border-white/10">
                            {/* Rating row */}
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="w-4 h-4 bg-white/10 rounded" />
                                    ))}
                                </div>
                            </div>

                            {/* Price row */}
                            <div className="flex justify-between items-end">
                                <div className="flex flex-col gap-1">
                                    <div className="w-12 h-3 bg-white/10 rounded" />
                                    <div className="w-16 h-6 bg-white/10 rounded" />
                                </div>
                                <div className="w-20 h-6 bg-white/10 rounded" />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
};

export default DealCardSkeleton;
