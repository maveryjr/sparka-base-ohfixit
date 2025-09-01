'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface Phase2ContextType {
  showPhase2Hub: boolean;
  setShowPhase2Hub: (show: boolean) => void;
  activeFeature: string | null;
  setActiveFeature: (feature: string | null) => void;
}

const Phase2Context = createContext<Phase2ContextType | undefined>(undefined);

export function Phase2Provider({ children }: { children: ReactNode }) {
  const [showPhase2Hub, setShowPhase2Hub] = useState(false);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  return (
    <Phase2Context.Provider value={{
      showPhase2Hub,
      setShowPhase2Hub,
      activeFeature,
      setActiveFeature
    }}>
      {children}
    </Phase2Context.Provider>
  );
}

export function usePhase2() {
  const context = useContext(Phase2Context);
  if (context === undefined) {
    throw new Error('usePhase2 must be used within a Phase2Provider');
  }
  return context;
}
