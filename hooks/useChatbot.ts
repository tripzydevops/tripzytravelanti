import { useState, useMemo } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type, Chat } from "@google/genai";
import { useSearch, CategoryFilter } from '../contexts/SearchContext';
import { useLanguage } from '../contexts/LanguageContext';

export interface Message {
  role: 'user' | 'model';
  text: string;
}

const findDealsFunctionDeclaration: FunctionDeclaration = {
  name: 'findDeals',
  parameters: {
    type: Type.OBJECT,
    description: 'Applies filters to find travel and lifestyle deals based on user criteria.',
    properties: {
      searchQuery: {
        type: Type.STRING,
        description: 'A search term to filter deals by. For example, "dinner", "spa", "Cappadocia".',
      },
      category: {
        type: Type.STRING,
        description: 'The category to filter deals by. Must be one of: "Dining", "Wellness", "Travel".',
      },
      minRating: {
        type: Type.NUMBER,
        description: 'The minimum user rating for the deals, from 1 to 5. For example, a value of 4 means "4 stars or higher".',
      },
    },
  },
};

export const useChatbot = () => {
  const { t } = useLanguage();
  const { applyFiltersAndNavigate } = useSearch();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY }), []);

  const chat = useMemo(() => {
    return ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        tools: [{ functionDeclarations: [findDealsFunctionDeclaration] }],
      },
      systemInstruction: "You are a helpful and friendly assistant for the TRİPZY deals app. Your goal is to help users find the best travel and lifestyle deals by using the `findDeals` function. Be conversational and proactive. Don't mention the function's name to the user; just say you are applying filters. If a parameter is missing, ask a clarifying question. For instance, if they ask for 'top-rated deals', ask what category they're interested in."
    });
  }, [ai]);

  const sendMessage = async (text: string) => {
    setIsLoading(true);
    const userMessage: Message = { role: 'user', text };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await chat.sendMessage({ message: text });
      
      if (response.functionCalls && response.functionCalls.length > 0) {
        const functionCall = response.functionCalls[0];
        
        if (functionCall.name === 'findDeals') {
          const { searchQuery, category, minRating } = functionCall.args;
          
          // Execute the function
          applyFiltersAndNavigate({
            searchQuery: searchQuery as string,
            category: category as CategoryFilter,
            rating: minRating as number,
          });

          // Send response back to the model
          const functionResponse = await chat.sendMessage({
            message: '', // The message can be empty when sending a function response.
            functionResponses: {
                id: functionCall.id,
                name: functionCall.name,
                response: { result: "Successfully applied the filters. The user can now see the results." }
            }
          });
          
          setMessages(prev => [...prev, { role: 'model', text: functionResponse.text }]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'model', text: response.text }]);
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
  };

  return { messages, isLoading, sendMessage, startChat };
};