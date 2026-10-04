"use client";

import React, { useMemo, useState } from "react";
import { useFontSize } from "@/components/FontSizeProvider";
import { Banner } from "@/components/ui";
import { useFeedback } from "@/components/Feedback";
import { useData } from "@/lib/DataContext";
import type { PortalSession } from "@/lib/portalAuth";
import { activityYearMonth, paymentLines, yen } from "@/lib/business";
import type { Staff } from "@/lib/types";

type Tab = "home" | "history" | "profile";

export default function MyPageClient({ session }: { session: PortalSession }) {
  const { fontSize, setFontSize } = useFontSize();
  const { data, update } = useData();
  const { toast } = useFeedback();
  const [tab, setTab] = useState<Tab>("home");
  const [month, setMonth] = useState("all");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Staff | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const staff = useMemo(
    () => data.staff.find((s) => s.id === session.staffId) ?? null,
    [data.staff, session]
  );

  const lines = useMemo(
    () => (staff ? paymentLines(data, { staffId: staff.id }) : []),
    [data, staff]
  );
  const months = [...new Set(lines.map((l) => l.yearMonth))].sort((a, b) =>
    b.localeCompare(a)
  );
  const filtered = month === "all" ? lines : lines.filter((l) => l.yearMonth === month);
  const activityMonth = activityYearMonth(data);
  const monthTotal = paymentLines(data, {
    staffId: staff?.id,
    yearMonth: activityMonth,
  }).reduce((s, l) => s + l.amount, 0);
  const grandTotal = lines.reduce((s, l) => s + l.amount, 0);
  const pending = data.assignments.filter(
    (a) => a.staffId === staff?.id && a.arrivedQty == null
  );

  const saveProfile = async () => {
    if (!draft || !staff) return;
    if (!draft.name.trim()) {
      setFormError("氏名は必須です");
      return;
    }
    try {
      await update((prev) => ({
        ...prev,
        staff: prev.staff.map((s) => (s.id === staff.id ? { ...s, ...draft } : s)),
      }));
      setEditing(false);
      setFormError(null);
      toast("個人情報を保存しました", "success");
    } catch {
      setFormError("保存に失敗しました");
      toast("保存に失敗しました", "error");
    }
  };

  if (!staff) {
    return (
      <div className="min-h-screen p-6">
        <Banner tone="error">
          内職者データが見つかりません。管理者に連絡するか、もう一度ログインしてください。
        </Banner>
        <a href="/api/portal/logout" className="btn btn-outline mt-4">
          ログインへ戻る
        </a>
      </div>
    );
  }

  const nav: { key: Tab; label: string }[] = [
    { key: "home", label: "ホーム" },
    { key: "history", label: "作業明細" },
    { key: "profile", label: "個人情報" },
  ];

  return (
    <div className="min-h-screen bg-[#fffde7] pb-24">
      <header className="sticky top-0 z-10 bg-primary text-white px-4 py-4 flex justify-between items-center gap-3">
        <div>
          <p className="text-sm opacity-90">てしごと堂 内職者ポータル</p>
          <h1 className="text-xl font-black">{staff.name} 様</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/15 p-1 rounded-xl">
            {(["standard", "large", "extra-large"] as const).map((size, i) => (
              <button
                key={size}
                type="button"
                onClick={() => setFontSize(size)}
                className={`min-h-10 px-2 rounded-lg font-bold text-sm ${
                  fontSize === size ? "bg-white/30" : ""
                }`}
              >
                {["標", "大", "特大"][i]}
              </button>
            ))}
          </div>
          <a href="/api/portal/logout" className="min-h-11 px-3 rounded-xl bg-white/20 font-bold inline-flex items-center">
            ログアウト
          </a>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        {tab === "home" && (
          <>
            <section className="card-flat card text-center">
              <p className="text-sm font-bold text-slate-500">{activityMonth} の報酬</p>
              <p className="h1 text-primary mt-1">{yen(monthTotal)}</p>
              <p className="text-slate-500 mt-2">累計 {yen(grandTotal)}</p>
            </section>

            {pending.length > 0 && (
              <Banner tone="warn">
                出荷済みでまだ入荷検品待ちの作業が {pending.length} 件あります。完了したら店舗へ返送してください。
              </Banner>
            )}

            <section className="card-flat card">
              <h2 className="h3 mb-3">月ごとの合計</h2>
              {months.length === 0 ? (
                <p className="text-slate-500">まだ入荷完了の作業がありません。</p>
              ) : (
                <div className="space-y-2">
                  {months.map((m) => {
                    const total = lines
                      .filter((l) => l.yearMonth === m)
                      .reduce((s, l) => s + l.amount, 0);
                    const qty = lines
                      .filter((l) => l.yearMonth === m)
                      .reduce((s, l) => s + l.arrivedQty, 0);
                    return (
                      <button
                        key={m}
                        type="button"
                        className="w-full min-h-16 flex justify-between items-center px-4 py-3 rounded-xl border-2 bg-white text-left"
                        onClick={() => {
                          setMonth(m);
                          setTab("history");
                        }}
                      >
                        <span>
                          <span className="font-bold block">{m}</span>
                          <span className="text-sm text-slate-500">
                            {qty.toLocaleString()} 個
                          </span>
                        </span>
                        <span className="font-black text-primary">{yen(total)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {tab === "history" && (
          <section className="card-flat card">
            <div className="flex flex-wrap justify-between gap-3 mb-4">
              <h2 className="h3">作業明細</h2>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="min-h-11 rounded-lg border-2 px-3"
              >
                <option value="all">全期間</option>
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            {filtered.length === 0 ? (
              <p className="text-slate-500">この期間の明細はありません。</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-slate-500">
                      <th className="pb-2 pr-3">入荷日</th>
                      <th className="pb-2 pr-3">作業</th>
                      <th className="pb-2 pr-3 text-right">数量</th>
                      <th className="pb-2 text-right">報酬</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map((l) => (
                      <tr key={l.assignmentId}>
                        <td className="py-3 pr-3 whitespace-nowrap">{l.arriveDate}</td>
                        <td className="py-3 pr-3 font-bold">{l.workName}</td>
                        <td className="py-3 pr-3 text-right">{l.arrivedQty.toLocaleString()}</td>
                        <td className="py-3 text-right font-black text-primary">
                          {yen(l.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-50">
                      <td colSpan={3} className="py-3 font-bold text-right pr-3">
                        合計
                      </td>
                      <td className="py-3 text-right font-black text-primary">
                        {yen(filtered.reduce((s, l) => s + l.amount, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            {pending.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold mb-2">未入荷（作業中）</h3>
                <ul className="space-y-2">
                  {pending.map((a) => (
                    <li key={a.id} className="border rounded-xl p-3">
                      <p className="font-bold">{a.workName}</p>
                      <p className="text-sm text-slate-600">
                        出荷 {a.qty.toLocaleString()} / 納期 {a.deadline} / 単価 {yen(a.unitPrice)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {tab === "profile" && (
          <section className="card-flat card space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="h3">個人情報</h2>
              {!editing && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setDraft(staff);
                    setEditing(true);
                  }}
                >
                  編集する
                </button>
              )}
            </div>
            {formError && <Banner tone="error">{formError}</Banner>}
            <Banner tone="info">変更は店舗の名簿にも反映されます。口座番号は正確に入力してください。</Banner>

            <FieldBlock label="ログインID">
              <p className="font-mono bg-slate-100 rounded-lg p-3">{session.loginId}</p>
            </FieldBlock>
            {(
              [
                ["氏名", "name"],
                ["電話", "tel"],
                ["緊急連絡先", "emergencyTel"],
                ["メール", "email"],
                ["郵便番号", "postalCode"],
                ["住所", "address"],
                ["銀行名", "bankName"],
                ["支店名", "bankBranch"],
                ["口座種別", "bankAccountType"],
                ["口座番号", "bankAccountNumber"],
                ["口座名義", "bankAccountHolder"],
              ] as const
            ).map(([label, key]) => (
              <FieldBlock key={key} label={label}>
                {editing ? (
                  <input
                    className="w-full min-h-11 p-3 rounded-lg border-2"
                    value={draft ? draft[key] : staff[key]}
                    onChange={(e) => {
                      if (!draft) return;
                      setDraft({ ...draft, [key]: e.target.value });
                    }}
                  />
                ) : (
                  <p className="bg-white border rounded-lg p-3">
                    {key === "bankAccountNumber" && staff[key]
                      ? `****${staff[key].slice(-3)}`
                      : staff[key] || "—"}
                  </p>
                )}
              </FieldBlock>
            ))}

            {editing && (
              <div className="flex gap-3">
                <button
                  type="button"
                  className="btn btn-outline flex-1"
                  onClick={() => {
                    setDraft(staff);
                    setEditing(false);
                    setFormError(null);
                  }}
                >
                  キャンセル
                </button>
                <button type="button" className="btn btn-primary flex-1" onClick={() => void saveProfile()}>
                  保存する
                </button>
              </div>
            )}
            {!editing && (
              <p className="text-sm text-slate-500">口座番号は下3桁のみ表示しています。</p>
            )}
          </section>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 border-t flex justify-around py-2 print:hidden">
        {nav.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`min-h-14 min-w-20 font-bold ${
              tab === item.key ? "text-primary" : "text-slate-400"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {children}
    </div>
  );
}
