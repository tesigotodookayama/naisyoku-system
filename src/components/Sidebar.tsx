"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useFontSize } from "./FontSizeProvider";

const navGroups = [
  {
    title: "日常の流れ",
    items: [
      { href: "/", label: "ダッシュボード", icon: "📊" },
      { href: "/projects", label: "案件管理", icon: "💼" },
      { href: "/logistics", label: "出荷・入荷", icon: "🚚" },
      { href: "/deliveries", label: "納品管理", icon: "📦" },
      { href: "/finance", label: "請求・支払", icon: "💰" },
      { href: "/reports", label: "月報", icon: "📈" },
    ],
  },
  {
    title: "マスタ",
    items: [
      { href: "/store", label: "店舗情報", icon: "🏪" },
      { href: "/clients", label: "発注元（顧客）", icon: "🏢" },
      { href: "/staff", label: "内職者管理", icon: "👥" },
    ],
  },
  {
    title: "アカウント",
    items: [{ href: "/account", label: "パスワード変更", icon: "🔑" }],
  },
];

export default function Sidebar({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { fontSize, setFontSize } = useFontSize();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="h-full w-64 glass border-r flex flex-col shadow-xl print:hidden bg-white">
      <div className="p-5 border-b-4 border-primary-light">
        <p className="text-xs font-bold text-primary tracking-widest">てしごと堂</p>
        <h1 className="h3 font-black text-slate-900 leading-tight mt-1">内職管理システム</h1>
        <div
          className="mt-2 px-3 py-1 rounded-full text-xs font-black inline-flex items-center gap-1"
          style={{ background: "var(--primary)", color: "white" }}
        >
          管理者
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-1 text-[11px] font-black text-slate-400 tracking-widest">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 px-3 py-3 min-h-12 rounded-xl transition-colors ${
                      active
                        ? "bg-primary text-white shadow-md"
                        : "hover:bg-primary-light text-slate-700 font-bold"
                    }`}
                  >
                    <span className="text-xl" aria-hidden>
                      {item.icon}
                    </span>
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 space-y-3 border-t-2 border-primary-light">
        <div className="p-3 rounded-2xl bg-white border-2 border-primary-light">
          <label className="text-[11px] font-black text-primary-dark mb-2 block">
            文字の大きさ
          </label>
          <div className="flex gap-1 bg-primary-light/50 p-1 rounded-xl">
            {(["standard", "large", "extra-large"] as const).map((size, i) => (
              <button
                key={size}
                type="button"
                onClick={() => setFontSize(size)}
                className={`flex-1 min-h-10 py-2 text-xs font-black rounded-lg ${
                  fontSize === size
                    ? "bg-primary text-white shadow-md"
                    : "text-primary-dark hover:bg-white"
                }`}
              >
                {["標準", "大きい", "特大"][i]}
              </button>
            ))}
          </div>
        </div>

        <Link
          href="/portal/login"
          onClick={onNavigate}
          className="block text-center text-sm font-bold text-primary hover:underline py-2"
        >
          内職者ポータル
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 min-h-12 rounded-2xl font-black text-sm border-2 ${
            loggingOut
              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
              : "bg-white text-red-600 border-red-100 hover:bg-red-600 hover:text-white"
          }`}
        >
          {loggingOut ? "ログアウト中" : "ログアウト"}
        </button>
      </div>
    </aside>
  );
}
