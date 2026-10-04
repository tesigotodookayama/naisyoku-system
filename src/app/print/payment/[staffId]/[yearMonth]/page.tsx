"use client";

import React, { use } from "react";
import PrintShell from "@/components/PrintShell";
import { LoadingBlock } from "@/components/ui";
import { useData } from "@/lib/DataContext";
import {
  jpDate,
  num,
  paymentLines,
  slashDate,
  staffName,
  todayISO,
  workCode,
} from "@/lib/business";

export default function PrintPaymentPage({
  params,
}: {
  params: Promise<{ staffId: string; yearMonth: string }>;
}) {
  const { staffId, yearMonth } = use(params);
  const { data, loading } = useData();

  if (loading) return <LoadingBlock />;

  const staff = data.staff.find((s) => s.id === staffId);
  const lines = paymentLines(data, { staffId, yearMonth });
  const total = lines.reduce((s, l) => s + l.amount, 0);
  const mixed = lines.some((l) => l.staffId !== staffId);
  const store = data.store;
  const issueDate = todayISO();
  const staffLabel = staff?.name ?? staffName(data, staffId);

  return (
    <PrintShell
      title="支払明細書"
      backHref="/finance?tab=individual"
      landscape
    >
      {mixed && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 font-bold print:hidden">
          警告: 他の内職者の明細が混在しています。
        </div>
      )}

      <section className="text-[13px] text-slate-900 leading-relaxed">
        <div className="relative mb-4">
          <h1 className="text-center text-2xl font-bold tracking-[0.35em]">
            支 払 明 細 書
          </h1>
          <p className="absolute right-0 top-1 text-sm">
            発行日　{jpDate(issueDate)}
          </p>
        </div>

        <div className="flex justify-between gap-8 mb-4">
          <div className="flex-1">
            <p className="text-lg font-bold mb-4">{staffLabel}　殿</p>
            <p>ごくろうさまです。</p>
            <p>下記の通り今月作業分の支払通知を致します</p>
          </div>
          <div className="text-sm min-w-[260px]">
            <p className="font-bold text-base">{store.name}</p>
            {store.address && (
              <p className="mt-1">
                <span className="inline-block w-10">住所</span>
                {store.address}
              </p>
            )}
            <p className="mt-1">
              <span className="inline-block w-10">TEL</span>
              {store.tel || "—"}
            </p>
            <p className="mt-1">
              <span className="inline-block w-10">FAX</span>
              {store.fax || ""}
            </p>
          </div>
        </div>

        <p className="text-sm mb-2 print:hidden text-slate-500">
          対象月: {yearMonth}
        </p>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-500 px-2 py-1.5 whitespace-nowrap font-bold">
                納入日
              </th>
              <th className="border border-slate-500 px-2 py-1.5 whitespace-nowrap font-bold">
                作業コード
              </th>
              <th className="border border-slate-500 px-2 py-1.5 text-left font-bold">
                作業名
              </th>
              <th className="border border-slate-500 px-2 py-1.5 whitespace-nowrap font-bold">
                数量
              </th>
              <th className="border border-slate-500 px-2 py-1.5 whitespace-nowrap font-bold">
                単価
              </th>
              <th className="border border-slate-500 px-2 py-1.5 whitespace-nowrap font-bold">
                金額
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="border border-slate-500 px-2 py-8 text-center text-slate-400"
                >
                  この月の明細はありません
                </td>
              </tr>
            ) : (
              lines.map((l) => (
                <tr key={l.assignmentId}>
                  <td className="border border-slate-500 px-2 py-1 text-center whitespace-nowrap">
                    {slashDate(l.arriveDate)}
                  </td>
                  <td className="border border-slate-500 px-2 py-1 text-center whitespace-nowrap font-mono text-[12px]">
                    {workCode(l.projectId, l.assignmentId)}
                  </td>
                  <td className="border border-slate-500 px-2 py-1">
                    {l.workName}
                  </td>
                  <td className="border border-slate-500 px-2 py-1 text-right whitespace-nowrap">
                    {num(l.arrivedQty)}
                  </td>
                  <td className="border border-slate-500 px-2 py-1 text-right whitespace-nowrap">
                    {num(l.unitPrice)}
                  </td>
                  <td className="border border-slate-500 px-2 py-1 text-right whitespace-nowrap">
                    {num(l.amount)}
                  </td>
                </tr>
              ))
            )}
            {Array.from({ length: Math.max(0, 6 - lines.length) }).map((_, i) => (
              <tr key={`pad-${i}`}>
                {Array.from({ length: 6 }).map((__, j) => (
                  <td key={j} className="border border-slate-500 px-2 py-3">
                    &nbsp;
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td
                colSpan={5}
                className="border border-slate-500 px-2 py-2 text-right font-bold"
              >
                合計
              </td>
              <td className="border border-slate-500 px-2 py-2 text-right font-bold text-base">
                {num(total)}
              </td>
            </tr>
          </tfoot>
        </table>

        {staff && (staff.bankName || staff.bankAccountNumber) && (
          <div className="mt-6 text-sm text-slate-600">
            <p>
              振込先: {staff.bankName} {staff.bankBranch} {staff.bankAccountType}{" "}
              {staff.bankAccountNumber}
              {staff.bankAccountHolder ? `　${staff.bankAccountHolder}` : ""}
            </p>
          </div>
        )}
      </section>
    </PrintShell>
  );
}
