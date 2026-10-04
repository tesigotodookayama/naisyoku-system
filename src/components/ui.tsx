"use client";

import React from "react";
import Link from "next/link";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="section-header">
      <div>
        <h1 className="h1 text-slate-800">{title}</h1>
        {description && <p className="text-slate-600 mt-1 max-w-3xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}

export function LoadingBlock() {
  return (
    <div className="card-flat card text-center py-16 text-slate-500 font-bold">
      読み込み中...
    </div>
  );
}

export function EmptyState({
  message,
  hint,
  actionLabel,
  actionHref,
  onAction,
}: {
  message: string;
  hint?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="py-12 text-center px-4">
      <p className="text-slate-600 font-bold text-lg">{message}</p>
      {hint && <p className="text-slate-500 mt-2 max-w-xl mx-auto">{hint}</p>}
      {(actionHref || onAction) && actionLabel && (
        <div className="mt-6">
          {actionHref ? (
            <Link href={actionHref} className="btn btn-primary">
              {actionLabel}
            </Link>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onAction}>
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Banner({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "error" | "warn";
  children: React.ReactNode;
}) {
  const map = {
    info: "bg-amber-50 border-amber-200 text-amber-900",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    error: "bg-red-50 border-red-200 text-red-800",
    warn: "bg-orange-50 border-orange-200 text-orange-900",
  };
  return (
    <div className={`rounded-xl border-2 px-4 py-3 font-medium ${map[tone]}`}>
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
  required,
  hint,
  error,
  htmlFor,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
  error?: string;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-sm font-bold text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-1">必須</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-sm font-bold text-red-600">{error}</p>}
    </div>
  );
}

export function FormInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  return (
    <input
      {...props}
      className={`w-full min-h-11 p-3 rounded-lg border bg-white outline-none focus:ring-2 focus:ring-primary ${props.className ?? ""}`}
    />
  );
}

export function FormSelect(
  props: React.SelectHTMLAttributes<HTMLSelectElement>
) {
  return (
    <select
      {...props}
      className={`w-full min-h-11 p-3 rounded-lg border bg-white outline-none focus:ring-2 focus:ring-primary ${props.className ?? ""}`}
    />
  );
}

export function FormTextarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={`w-full p-3 rounded-lg border bg-white outline-none focus:ring-2 focus:ring-primary ${props.className ?? ""}`}
    />
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="閉じる"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative bg-white rounded-2xl shadow-2xl border-2 border-amber-200 max-h-[90vh] overflow-y-auto w-full ${
          wide ? "max-w-3xl" : "max-w-lg"
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <h2 id="modal-title" className="h3">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 font-bold text-2xl min-w-11 min-h-11"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function StatusBadge({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: "slate" | "amber" | "blue" | "emerald" | "indigo" | "orange";
}) {
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-100 text-amber-800",
    blue: "bg-blue-100 text-blue-800",
    emerald: "bg-emerald-100 text-emerald-800",
    indigo: "bg-indigo-100 text-indigo-800",
    orange: "bg-orange-100 text-orange-800",
  };
  return (
    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${map[tone]}`}>
      {label}
    </span>
  );
}

export function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative mb-6">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "検索..."}
        className="w-full min-h-12 p-3 pl-11 rounded-xl border bg-white outline-none focus:ring-2 focus:ring-primary"
      />
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>
        🔍
      </span>
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap bg-white p-1 rounded-xl border w-fit mb-8 gap-0.5">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`min-h-11 px-5 py-2 rounded-lg font-bold text-sm transition-all ${
            value === t.key
              ? "bg-primary text-white shadow"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-left min-w-[40rem]">{children}</table>
    </div>
  );
}
