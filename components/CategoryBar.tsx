import React from 'react';
import {
    GlobeIcon,
    CustomBriefcaseIcon,
    ClockIcon,
    FireIcon,
    SparklesIcon,
    TicketIcon,
    LocationMarkerIcon
} from './Icons';

interface Category {
    id: string;
    label: string;
    icon: React.FC<{ className?: string }>;
}

interface CategoryBarProps {
    categories: Category[];
    selectedCategoryId: string;
    onSelectCategory: (id: string) => void;
}

const CategoryBar: React.FC<CategoryBarProps> = ({ categories, selectedCategoryId, onSelectCategory }) => {
    return (
        <div className="sticky top-0 z-30 bg-transparent overflow-x-auto no-scrollbar py-2">
            <div className="flex items-center space-x-10 px-4 min-w-max mx-auto max-w-7xl justify-center">
                {categories.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => onSelectCategory(category.id)}
                        className={`flex flex-col items-center space-y-2 group transition-all duration-300 ${selectedCategoryId === category.id
                            ? 'text-brand-primary'
                            : 'text-gray-500 dark:text-brand-text-muted hover:text-gray-900 dark:hover:text-brand-text-light'
                            }`}
                    >
                        <div className={`relative p-2 rounded-xl transition-all duration-300 ${selectedCategoryId === category.id ? 'bg-brand-primary/10 scale-110' : 'group-hover:bg-white/5'
                            }`}>
                            <category.icon className={`w-6 h-6 ${selectedCategoryId === category.id ? 'drop-shadow-[0_0_8px_rgba(var(--color-brand-primary-rgb),0.5)]' : ''
                                }`} />
                        </div>
                        <span className={`text-xs font-medium whitespace-nowrap ${selectedCategoryId === category.id ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
                            }`}>
                            {category.label}
                        </span>
                        <div className={`h-0.5 w-full bg-brand-primary transition-all duration-300 transform origin-center ${selectedCategoryId === category.id ? 'scale-x-100' : 'scale-x-0'
                            }`} />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default CategoryBar;
