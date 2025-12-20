import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Globe } from 'lucide-react';

// Common countries for travel deals - expandable later
const AVAILABLE_COUNTRIES = [
    { code: 'TR', name: 'Turkey', name_tr: 'Türkiye' },
    { code: 'GLOBAL', name: 'Global (Worldwide)', name_tr: 'Global (Dünya Geneli)' },
    { code: 'US', name: 'United States', name_tr: 'Amerika Birleşik Devletleri' },
    { code: 'GB', name: 'United Kingdom', name_tr: 'Birleşik Krallık' },
    { code: 'DE', name: 'Germany', name_tr: 'Almanya' },
    { code: 'FR', name: 'France', name_tr: 'Fransa' },
    { code: 'IT', name: 'Italy', name_tr: 'İtalya' },
    { code: 'ES', name: 'Spain', name_tr: 'İspanya' },
    { code: 'GR', name: 'Greece', name_tr: 'Yunanistan' },
    { code: 'AE', name: 'United Arab Emirates', name_tr: 'Birleşik Arap Emirlikleri' },
];

interface CountrySelectorProps {
    selectedCountries: string[];
    onChange: (countries: string[]) => void;
    language?: 'en' | 'tr';
}

const CountrySelector: React.FC<CountrySelectorProps> = ({
    selectedCountries,
    onChange,
    language = 'en'
}) => {
    // Automatically select Turkey if nothing is selected
    useEffect(() => {
        if (selectedCountries.length === 0) {
            onChange(['TR']);
        }
    }, []);

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleCountry = (code: string) => {
        if (selectedCountries.includes(code)) {
            onChange(selectedCountries.filter(c => c !== code));
        } else {
            onChange([...selectedCountries, code]);
        }
    };

    const removeCountry = (code: string) => {
        onChange(selectedCountries.filter(c => c !== code));
    };

    const getCountryName = (code: string) => {
        const country = AVAILABLE_COUNTRIES.find(c => c.code === code);
        return language === 'tr' ? country?.name_tr : country?.name;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                <Globe className="w-4 h-4 inline mr-1" />
                {language === 'tr' ? 'Ülkeler (Opsiyonel)' : 'Countries (Optional)'}
            </label>

            {/* Selected Tags */}
            <div
                className="min-h-[42px] w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 cursor-pointer flex flex-wrap gap-2 items-center"
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedCountries.length === 0 ? (
                    <span className="text-gray-400 text-sm">
                        {language === 'tr' ? 'Ülke seçin...' : 'Select countries...'}
                    </span>
                ) : (
                    selectedCountries.map(code => (
                        <span
                            key={code}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-xs font-medium"
                        >
                            {getCountryName(code)}
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeCountry(code); }}
                                className="hover:bg-brand-primary/20 rounded-full p-0.5"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))
                )}
                <ChevronDown className={`w-4 h-4 ml-auto text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {AVAILABLE_COUNTRIES.map(country => (
                        <label
                            key={country.code}
                            className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                        >
                            <input
                                type="checkbox"
                                checked={selectedCountries.includes(country.code)}
                                onChange={() => toggleCountry(country.code)}
                                className="h-4 w-4 rounded text-brand-primary mr-3"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                {language === 'tr' ? country.name_tr : country.name}
                            </span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CountrySelector;
