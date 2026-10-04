"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useData } from "@/lib/DataContext";
import { Banner } from "@/components/ui";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { error } = useData();

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-40 print:hidden">
        <Sidebar />
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 print:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="メニューを閉じる"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full w-64 max-w-[85vw]">
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="flex-1 lg:ml-64 bg-background min-w-0 print:ml-0">
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b px-4 py-3 flex items-center gap-3 print:hidden mobile-topbar">
          <button
            type="button"
            className="min-w-11 min-h-11 rounded-xl border-2 border-primary text-primary font-black"
            onClick={() => setOpen(true)}
            aria-label="メニューを開く"
          >
            ☰
          </button>
          <div>
            <p className="text-xs text-primary font-bold">てしごと堂</p>
            <p className="font-black text-slate-800">内職管理システム</p>
          </div>
        </div>
        <div className="p-4 sm:p-8 print:p-0">
          <div className="max-w-7xl mx-auto space-y-4">
            {error && (
              <Banner tone="error">
                データの読み込みに失敗しました（{error}）。画面を再読み込みしてください。シードデータで続行できます。
              </Banner>
            )}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
