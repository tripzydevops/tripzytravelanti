import React, { useState, useRef, useEffect } from 'react';
import { useChatbot, Message } from '../hooks/useChatbot';
import { useLanguage } from '../contexts/LanguageContext';
import { ChatBubbleOvalLeftIcon, XMarkIcon, PaperAirplaneIcon, SparklesIcon } from './Icons';
import AIBadge from './AIBadge';

const Chatbot: React.FC = () => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const { messages, isLoading, sendMessage, startChat } = useChatbot();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      startChat();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleToggle = () => setIsOpen(!isOpen);

  const handleSend = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSend();
    }
  };

  const ChatMessage: React.FC<{ message: Message }> = ({ message }) => (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${message.role === 'user' ? 'bg-brand-primary text-white rounded-br-lg' : 'bg-gray-200 dark:bg-brand-surface text-gray-800 dark:text-brand-text-light rounded-bl-lg'}`}>
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
      </div>
    </div>
  );

  return (
    <>
      <button 
        onClick={handleToggle}
        className="fixed bottom-40 right-5 bg-brand-primary text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transform hover:scale-110 transition-transform z-40"
        aria-label="Open AI Deal Finder"
      >
        {isOpen ? <XMarkIcon className="w-7 h-7" /> : <SparklesIcon className="w-7 h-7" />}
      </button>

      {isOpen && (
        <div className="fixed bottom-56 right-5 w-[calc(100%-2.5rem)] max-w-sm h-[60vh] max-h-[500px] bg-white dark:bg-brand-bg rounded-2xl shadow-2xl flex flex-col z-40 border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-800 dark:text-brand-text-light">{t('aiDealFinderTitle')}</h2>
              <AIBadge />
            </div>
            <button onClick={handleToggle} className="text-gray-500 hover:text-gray-800 dark:text-brand-text-muted dark:hover:text-brand-text-light" aria-label="Close chat">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </header>

          {/* Messages */}
          <div className="flex-grow p-4 space-y-4 overflow-y-auto">
            {messages.map((msg, index) => <ChatMessage key={index} message={msg} />)}
            {isLoading && (
              <div className="flex justify-start">
                <div className="px-4 py-2 rounded-2xl bg-gray-200 dark:bg-brand-surface rounded-bl-lg">
                  <div className="flex items-center space-x-1">
                    <span className="h-2 w-2 bg-brand-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 bg-brand-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 bg-brand-primary rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('aiChatPlaceholder')}
                disabled={isLoading}
                className="w-full py-2 pl-4 pr-12 bg-gray-100 dark:bg-brand-surface border border-transparent rounded-full text-gray-900 dark:text-brand-text-light placeholder-gray-500 dark:placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !inputValue.trim()}
                className="absolute inset-y-0 right-0 flex items-center justify-center w-10 h-10 text-brand-primary disabled:text-gray-400 dark:disabled:text-gray-600"
                aria-label="Send message"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;