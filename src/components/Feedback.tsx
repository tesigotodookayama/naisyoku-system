"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type FeedbackValue = {
  toast: (message: string, tone?: ToastTone) => void;
  confirmAction: (opts: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackValue | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirm, setConfirm] = useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null);

  const toast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const confirmAction = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirm({ ...opts, resolve });
    });
  }, []);

  const value = useMemo(() => ({ toast, confirmAction }), [toast, confirmAction]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-[min(36rem,calc(100%-2rem))] print:hidden"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl px-4 py-3 font-bold shadow-lg border-2 text-center ${
              t.tone === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                : t.tone === "error"
                  ? "bg-red-50 border-red-300 text-red-800"
                  : "bg-white border-primary text-slate-800"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
      {confirm && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 print:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="キャンセル"
            onClick={() => {
              confirm.resolve(false);
              setConfirm(null);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="relative bg-white rounded-2xl shadow-2xl border-2 border-amber-200 w-full max-w-md p-6"
          >
            <h2 id="confirm-title" className="h3 mb-3">
              {confirm.title}
            </h2>
            <p className="text-slate-600 whitespace-pre-wrap mb-6">{confirm.message}</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  confirm.resolve(false);
                  setConfirm(null);
                }}
              >
                {confirm.cancelLabel ?? "キャンセル"}
              </button>
              <button
                type="button"
                className={`btn ${confirm.danger ? "btn-danger" : "btn-primary"}`}
                onClick={() => {
                  confirm.resolve(true);
                  setConfirm(null);
                }}
              >
                {confirm.confirmLabel ?? "実行する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback must be used within FeedbackProvider");
  return ctx;
}
