"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** The page origin, empty during server rendering so hydration matches. */
export function useOrigin(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => ""
  );
}
