"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useOnlineStatus } from "./use-online-status";
import { fullSync } from "@/lib/db/sync";
import { getPendingCount } from "@/lib/db/offline-queue";

interface SyncState {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
  error: string | null;
}

export function useSync(autoSyncInterval = 30000) {
  const isOnline = useOnlineStatus();
  const [state, setState] = useState<SyncState>({
    isSyncing: false,
    lastSyncedAt: null,
    pendingCount: 0,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setState((s) => ({ ...s, pendingCount: count }));
  }, []);

  const sync = useCallback(async () => {
    if (!isOnline || state.isSyncing) return;

    setState((s) => ({ ...s, isSyncing: true, error: null }));

    try {
      await fullSync();
      const count = await getPendingCount();
      setState({
        isSyncing: false,
        lastSyncedAt: new Date().toISOString(),
        pendingCount: count,
        error: null,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        isSyncing: false,
        error: err instanceof Error ? err.message : "Sync failed",
      }));
    }
  }, [isOnline, state.isSyncing]);

  // Sync on reconnect
  useEffect(() => {
    if (isOnline) {
      sync();
    }
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-sync interval
  useEffect(() => {
    if (isOnline && autoSyncInterval > 0) {
      intervalRef.current = setInterval(sync, autoSyncInterval);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [isOnline, autoSyncInterval, sync]);

  // Refresh pending count periodically
  useEffect(() => {
    refreshPendingCount();
    const id = setInterval(refreshPendingCount, 5000);
    return () => clearInterval(id);
  }, [refreshPendingCount]);

  return {
    ...state,
    isOnline,
    sync,
    refreshPendingCount,
  };
}
