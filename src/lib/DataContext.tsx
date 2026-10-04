"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AppData } from "./types";
import { createSeedData } from "./seed";

type DataContextValue = {
  data: AppData;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  save: (next: AppData) => Promise<void>;
  update: (updater: (prev: AppData) => AppData) => Promise<void>;
  reset: () => Promise<void>;
};

const DataContext = createContext<DataContextValue | null>(null);

const FETCH_MS = 8000;

async function fetchJson(input: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    return await window.fetch(input, {
      ...init,
      signal: ctrl.signal,
      cache: "no-store",
      credentials: "same-origin",
    });
  } finally {
    window.clearTimeout(timer);
  }
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(createSeedData);
  // Seed is already in memory — never block the whole app on /api/db.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchJson("/api/db");
      if (!res.ok) throw new Error("データの読み込みに失敗しました");
      const json = (await res.json()) as AppData;
      if (!json?.store || !Array.isArray(json.clients)) {
        throw new Error("データの形式が正しくありません");
      }
      setData(json);
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === "AbortError";
      setError(
        aborted
          ? "データの読み込みが時間切れです。見本データで表示しています。"
          : e instanceof Error
            ? e.message
            : "読み込みエラー"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (next: AppData) => {
    setData(next);
    const res = await fetchJson("/api/db", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!res.ok) {
      throw new Error("保存に失敗しました");
    }
  }, []);

  const update = useCallback(
    async (updater: (prev: AppData) => AppData) => {
      let next: AppData | null = null;
      setData((prev) => {
        next = updater(prev);
        return next;
      });
      if (!next) return;
      const res = await fetchJson("/api/db", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        await refresh();
        throw new Error("保存に失敗しました");
      }
    },
    [refresh]
  );

  const reset = useCallback(async () => {
    const res = await fetchJson("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    if (!res.ok) throw new Error("リセットに失敗しました");
    const json = (await res.json()) as AppData;
    setData(json);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ data, loading, error, refresh, save, update, reset }),
    [data, loading, error, refresh, save, update, reset]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
