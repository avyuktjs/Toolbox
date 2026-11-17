"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Hydration-safe "are we on the client yet" without a setState-in-effect. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
