"use client";

import React, { use } from "react";
import PrintShell from "@/components/PrintShell";
import { LoadingBlock } from "@/components/ui";
import { useData } from "@/lib/DataContext";
import { staffPaymentSummary, yen } from "@/lib/business";

export default function PrintPaymentListPage({
  params,
}: {
  params: Promise<{ yearMonth: string }>;
}) {
  const { yearMonth } = use(params);
  const { data, loading } = useData();

  if (loading) return <LoadingBlock />;

  const summary = staffPaymentSummary(data, yearMonth);
  const total = summary.reduce((s, r) => s + r.totalAmount, 0);

  return (
    <PrintShell title="支払一覧表" backHref="/finance?tab=payment">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black tracking-widest">支 払 一 覧 表</h1>
        <p className="mt-2 text-slate-600">{yearMonth}</p>
        <p className="text-sm text-slate-500 mt-1">{data.store.name}</p>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-100">
            <th className="border p-2 text-left">No.</th>
            <th className="border p-2 text-left">内職者名</th>
            <th className="border p-2 text-right">明細件数</th>
            <th className="border p-2 text-right">合計数量</th>
            <th className="border p-2 text-right">報酬額</th>
          </tr>
        </thead>
        <tbody>
          {summary.length === 0 ? (
            <tr>
              <td colSpan={5} className="border p-4 text-center text-slate-400">
                データなし
              </td>
            </tr>
          ) : (
            summary.map((r, i) => (
              <tr key={r.staffId}>
                <td className="border p-2">{i + 1}</td>
                <td className="border p-2 font-bold">{r.name}</td>
                <td className="border p-2 text-right">{r.lineCount}</td>
                <td className="border p-2 text-right">
                  {r.totalQty.toLocaleString()}
                </td>
                <td className="border p-2 text-right">{yen(r.totalAmount)}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="border p-2 text-right font-bold">
              合計
            </td>
            <td className="border p-2 text-right font-bold text-lg">{yen(total)}</td>
          </tr>
        </tfoot>
      </table>
    </PrintShell>
  );
}
