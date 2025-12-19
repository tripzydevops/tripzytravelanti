import React, { useEffect } from 'react';
import HomePage from './HomePage';
import { useSearch } from '../contexts/SearchContext';
import MetaHead from '../components/MetaHead';
import { useLanguage } from '../contexts/LanguageContext';

const TravelPage: React.FC = () => {
    const { setCategoryFilter } = useSearch();
    const { t } = useLanguage();

    useEffect(() => {
        setCategoryFilter('Travel');
        return () => {
            setCategoryFilter('All'); // Reset on unmount
        };
    }, [setCategoryFilter]);

    return (
        <>
            <MetaHead
                title={t('travelPageTitle') || t('categoryTravel')}
                description={t('travelPageDescription') || "Exclusive travel deals and discounts curated by Tripzy."}
                url="https://tripzy.app/travel"
            />
            <HomePage />
        </>
    );
};

export default TravelPage;
