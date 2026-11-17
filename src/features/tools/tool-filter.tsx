"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const ToolFilterContext = createContext<{
  query: string;
  setQuery: (query: string) => void;
} | null>(null);

/**
 * One filter for the toolbox, shared between the tools panel and the
 * nav's mobile filter field so they stay in sync.
 */
export function ToolFilterProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  return (
    <ToolFilterContext.Provider value={{ query, setQuery }}>
      {children}
    </ToolFilterContext.Provider>
  );
}

export function useToolFilter() {
  const value = useContext(ToolFilterContext);
  if (!value) {
    throw new Error("useToolFilter must be used inside <ToolFilterProvider>");
  }
  return value;
}
