import React, { createContext, useState, useContext, ReactNode } from 'react';

interface LayoutContextType {
  isChatbotVisible: boolean;
  setChatbotVisible: (visible: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const LayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isChatbotVisible, setChatbotVisible] = useState(true);

  return (
    <LayoutContext.Provider value={{ isChatbotVisible, setChatbotVisible }}>
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
