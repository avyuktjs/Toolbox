"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { HistoryEntry } from "@/types/media";

// one-shot migration from the old key
try {
  if (typeof window !== "undefined") {
    const legacy = window.localStorage.getItem("spool.history.v1");
    if (legacy && !window.localStorage.getItem("toolbox.history.v1")) {
      window.localStorage.setItem("toolbox.history.v1", legacy);
    }
    if (legacy) window.localStorage.removeItem("spool.history.v1");
  }
} catch {
  /* private mode */
}

interface HistoryState {
  entries: HistoryEntry[];
  add: (entry: HistoryEntry) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],
      add: (entry) =>
        set((state) => ({
          entries: [entry, ...state.entries.filter((e) => e.id !== entry.id)].slice(0, 60),
        })),
      remove: (id) => set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: "toolbox.history.v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
