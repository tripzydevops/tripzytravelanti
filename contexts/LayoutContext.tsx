import React, { createContext, useState, useContext, ReactNode } from 'react';

interface LayoutContextType {
  isAdBannerVisible: boolean;
  setAdBannerVisible: (visible: boolean) => void;
  isChatbotVisible: boolean;
  setChatbotVisible: (visible: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAdBannerVisible, setAdBannerVisible] = useState(true);
  const [isChatbotVisible, setChatbotVisible] = useState(true);

  return (
    <LayoutContext.Provider value={{ isAdBannerVisible, setAdBannerVisible, isChatbotVisible, setChatbotVisible }}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = (): LayoutContextType => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};
