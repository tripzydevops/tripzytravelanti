import React, { useEffect } from 'react';
import HomePage from './HomePage';
import { useSearch } from '../contexts/SearchContext';

const TravelPage: React.FC = () => {
    const { setCategoryFilter } = useSearch();

    useEffect(() => {
        setCategoryFilter('Travel');
        return () => {
            setCategoryFilter('All'); // Reset on unmount
        };
    }, [setCategoryFilter]);

    return <HomePage />;
};

export default TravelPage;
