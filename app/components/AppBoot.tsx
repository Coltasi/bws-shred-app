"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { hydrate, installFlushHooks, allKeys, subscribe } from "../lib/store";
import { bootstrapData } from "../lib/data";
import { initialSync, syncConfigured } from "../lib/sync";
import { applyTheme, getTheme } from "../lib/theme";

/**
 * Boots the storage layer before the tabs render data.
 *
 * Order matters: hydrate IndexedDB (and migrate any legacy localStorage keys)
 * first, then seed/migrate domain data, then reach for the network. Nothing
 * below the network step is allowed to block the UI — the app has to work in a
 * basement gym with no signal.
 */

interface BootValue { ready: boolean; revision: number }
const BootContext = createContext<BootValue>({ ready: false, revision: 0 });

export const useStoreReady = () => useContext(BootContext);

/** Re-renders the caller whenever the store changes. */
export function useStoreRevision(): number {
  const { revision } = useContext(BootContext);
  return revision;
}

export default function AppBoot({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await hydrate();
      if (cancelled) return;
      applyTheme(getTheme());
      bootstrapData(allKeys());
      setReady(true);
      if (syncConfigured) void initialSync();
    })();

    const unsubscribe = subscribe(() => setRevision(r => r + 1));
    const removeFlushHooks = installFlushHooks();

    return () => { cancelled = true; unsubscribe(); removeFlushHooks(); };
  }, []);

  // Register the service worker separately so a SW failure can't block boot.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not fatal — the app works without offline caching.
    });
  }, []);

  return (
    <BootContext.Provider value={{ ready, revision }}>
      {children}
    </BootContext.Provider>
  );
}
