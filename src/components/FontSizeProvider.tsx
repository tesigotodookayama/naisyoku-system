'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type FontSize = 'standard' | 'large' | 'extra-large';

interface FontSizeContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

function readSavedSize(): FontSize {
  if (typeof window === "undefined") return "standard";
  const saved = localStorage.getItem("naisyoku-font-size");
  if (saved === "large" || saved === "extra-large" || saved === "standard") {
    return saved;
  }
  return "standard";
}

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>("standard");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = readSavedSize();
    // Hydrate from localStorage after mount (client-only).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is not available during SSR
    setFontSizeState(saved);
    if (saved === "standard") {
      document.documentElement.removeAttribute("data-font-size");
    } else {
      document.documentElement.setAttribute("data-font-size", saved);
    }
    setReady(true);
  }, []);

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    localStorage.setItem("naisyoku-font-size", size);
    if (size === "standard") {
      document.documentElement.removeAttribute("data-font-size");
    } else {
      document.documentElement.setAttribute("data-font-size", size);
    }
  };

  return (
    <FontSizeContext.Provider value={{ fontSize: ready ? fontSize : "standard", setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (context === undefined) {
    throw new Error("useFontSize must be used within a FontSizeProvider");
  }
  return context;
}
