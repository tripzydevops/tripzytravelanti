import { useState } from 'react';
import { useSearch, CategoryFilter } from '../contexts/SearchContext';
import { useLanguage } from '../contexts/LanguageContext';
import { chatWithAI } from '../lib/vectorService';

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export const useChatbot = () => {
  const { t } = useLanguage();
  const { applyFiltersAndNavigate } = useSearch();
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (text: string) => {
    setIsLoading(true);
    const userMessage: Message = { role: 'user', text };
    setMessages(prev => [...prev, userMessage]);

    const systemInstruction = `You are "Tripzy AI", a professional and highly efficient travel discount assistant for the Turkish market. 
    Your goal is to help users find premium travel and lifestyle deals in Turkey and globally.
    
    GUIDELINES:
    1. Tone: Professional, helpful, and sophisticated (Turkish "Beyefendi/Hanımefendi" level of politeness).
    2. Language: If the user speaks Turkish, respond in Turkish. Use formal language (Siz).
    3. Functionality: Use the 'findDeals' function whenever user asks for categories, locations, or types of deals.
    4. Proactivity: Suggest popular categories in Turkey like "İstanbul Otelleri", "Uçak Bileti", or "Restoran İndirimleri".
    5. Constraints: Do not mention the internal function names. Just explain what you are doing (e.g., "Sizin için en uygun otel fırsatlarını listeliyorum...").
    6. Clarification: If the user is vague (e.g., "İndirim var mı?"), ask which category or city they are interested in.`;

    try {
      // 1. Send message to AI via Edge Function
      const data = await chatWithAI(text, history, systemInstruction);

      if (!data) {
        throw new Error("Failed to get response from AI");
      }

      const { text: aiText, functionCalls } = data;

      // Update local history
      const newHistory = [
        ...history,
        { role: 'user', parts: [{ text }] },
        { role: 'model', parts: [{ text: aiText || '' }] }
      ];
      setHistory(newHistory);

      // 2. Handle Function Calls if any
      if (functionCalls && functionCalls.length > 0) {
        const functionCall = functionCalls[0];

        if (functionCall.name === 'findDeals') {
          const { searchQuery, category, minRating } = functionCall.args;

          // Execute the filter logic in frontend
          applyFiltersAndNavigate({
            searchQuery: searchQuery as string,
            category: category as CategoryFilter,
            rating: minRating as number,
          });

          // Optional: Send success feedback back to AI to get a natural confirmation message
          // For now, we'll just show the AI's initial text or a default confirmation
          setMessages(prev => [...prev, { role: 'model', text: aiText || "I've applied those filters for you. Take a look at the results!" }]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'model', text: aiText }]);
      }

    } catch (error) {
      console.error("Chatbot error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startChat = () => {
    setMessages([{ role: 'model', text: t('aiGreeting') }]);
    setHistory([]);
  };

  return { messages, isLoading, sendMessage, startChat };
};