import React, { useState } from 'react';
import { StarIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';

interface StarRatingInputProps {
    currentRating?: number;
    onRate: (rating: number) => void;
    disabled?: boolean;
}

const StarRatingInput: React.FC<StarRatingInputProps> = ({ currentRating = 0, onRate, disabled = false }) => {
    const [hoverRating, setHoverRating] = useState<number>(0);
    const { t } = useLanguage();

    const handleMouseEnter = (rating: number) => {
        if (!disabled) {
            setHoverRating(rating);
        }
    };

    const handleMouseLeave = () => {
        if (!disabled) {
            setHoverRating(0);
        }
    };

    const handleClick = (rating: number) => {
        if (!disabled) {
            onRate(rating);
        }
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="flex items-center space-x-1" onMouseLeave={handleMouseLeave}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        className={`transition-transform duration-200 ${disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110'
                            }`}
                        onMouseEnter={() => handleMouseEnter(star)}
                        onClick={() => handleClick(star)}
                        disabled={disabled}
                        aria-label={`Rate ${star} stars`}
                    >
                        <StarIcon
                            className={`w-8 h-8 ${(hoverRating || currentRating) >= star
                                    ? 'text-yellow-400'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}
                            fill={(hoverRating || currentRating) >= star ? 'currentColor' : 'none'}
                        />
                    </button>
                ))}
            </div>
            {!disabled && (
                <p className="text-sm text-brand-text-muted font-medium">
                    {hoverRating > 0 ? `${hoverRating} / 5` : t('rateThisDeal')}
                </p>
            )}
        </div>
    );
};

export default StarRatingInput;
