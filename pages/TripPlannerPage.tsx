import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { SparklesIcon } from '../components/Icons';
import { useToast } from '../contexts/ToastContext';
import { generateText } from '../lib/vectorService';

const TripPlannerPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { effectiveTheme } = useTheme();
  const { error: showError, success: showSuccess } = useToast();
  const [destination, setDestination] = useState('');
  const [duration, setDuration] = useState('');
  const [interests, setInterests] = useState<Set<string>>(new Set());
  const [itinerary, setItinerary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInterestChange = (interest: string) => {
    setInterests(prev => {
      const newInterests = new Set(prev);
      if (newInterests.has(interest)) {
        newInterests.delete(interest);
      } else {
        newInterests.add(interest);
      }
      return newInterests;
    });
  };

  const handleGenerateItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination || !duration) {
      showError('Please fill in destination and duration.');
      return;
    }
    setError('');
    setIsLoading(true);
    setItinerary('');

    try {
      const interestsList = Array.from(interests).join(', ');
      const prompt = `Create a detailed travel itinerary for a trip to ${destination} for ${duration} days. The traveler is interested in ${interestsList}. 
      Please provide a day-by-day plan. For each day, suggest specific activities, sights, and food recommendations (including specific restaurant names if possible). 
      Format the output in clear, well-structured markdown. Use headings for each day (e.g., "Day 1: Arrival and Exploration"). Use bullet points for activities.`;

      const text = await generateText(prompt);

      if (!text) throw new Error("Failed to generate itinerary");

      setItinerary(text);
      showSuccess(t('itineraryGenerated') || 'Itinerary generated successfully!');

    } catch (err) {
      console.error(err);
      showError('Failed to generate itinerary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const interestOptions = [
    { key: 'interestArt', label: t('interestArt') },
    { key: 'interestFood', label: t('interestFood') },
    { key: 'interestHistory', label: t('interestHistory') },
    { key: 'interestAdventure', label: t('interestAdventure') },
    { key: 'interestNightlife', label: t('interestNightlife') },
    { key: 'interestShopping', label: t('interestShopping') },
  ];

  return (
    <div className="container mx-auto px-4 pt-6 pb-12">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-brand-text-light mb-2">{t('tripPlannerTitle')}</h1>
        <p className="text-lg text-gray-500 dark:text-brand-text-muted">{t('tripPlannerSubtitle')}</p>
      </header>

      <div className="max-w-2xl mx-auto bg-white dark:bg-brand-surface p-8 rounded-xl shadow-lg">
        {!isLoading && !itinerary && (
          <form onSubmit={handleGenerateItinerary} className="space-y-6">
            <div>
              <label htmlFor="destination" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('destinationLabel')}</label>
              <input
                type="text"
                id="destination"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                required
                className="w-full py-2 px-3 bg-gray-100 dark:bg-[#1F1D2B] border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-brand-text-light placeholder-gray-400 dark:placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-1">{t('durationLabel')}</label>
              <input
                type="number"
                id="duration"
                min="1"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                required
                className="w-full py-2 px-3 bg-gray-100 dark:bg-[#1F1D2B] border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-brand-text-light placeholder-gray-400 dark:placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-brand-text-muted mb-2">{t('interestsLabel')}</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {interestOptions.map(interest => (
                  <label key={interest.key} className={`flex items-center space-x-2 p-3 rounded-lg cursor-pointer transition-colors duration-200 ${interests.has(interest.label) ? 'bg-brand-primary text-white' : 'bg-gray-100 dark:bg-[#1F1D2B]'}`}>
                    <input
                      type="checkbox"
                      checked={interests.has(interest.label)}
                      onChange={() => handleInterestChange(interest.label)}
                      className="h-4 w-4 rounded text-brand-primary bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-brand-primary"
                    />
                    <span className="text-sm font-medium">{interest.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-brand-primary text-white font-semibold rounded-lg hover:bg-opacity-80 transition-colors disabled:bg-gray-500"
            >
              <SparklesIcon className="w-5 h-5" />
              {t('generateItinerary')}
            </button>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          </form>
        )}

        {isLoading && (
          <div className="text-center py-10">
            <div className="animate-pulse flex flex-col items-center">
              <SparklesIcon className="w-12 h-12 text-brand-primary mb-4" />
              <p className="text-lg text-gray-500 dark:text-brand-text-muted">{t('generatingItinerary')}</p>
            </div>
          </div>
        )}

        {itinerary && (
          <div className={`prose ${effectiveTheme === 'dark' ? 'prose-invert' : ''} prose-p:text-gray-600 dark:prose-p:text-brand-text-muted prose-headings:text-gray-900 dark:prose-headings:text-brand-text-light prose-strong:text-brand-primary dark:prose-strong:text-brand-secondary max-w-none`}>
            <h2 className="text-2xl font-bold text-center mb-4">{t('yourItinerary')} {destination}</h2>
            <div className="whitespace-pre-wrap font-mono bg-gray-100 dark:bg-[#1F1D2B] p-4 rounded-md text-sm">
              {itinerary}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripPlannerPage;
