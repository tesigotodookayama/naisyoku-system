"use client";

import React, { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Field, FormSelect, LoadingBlock, PageHeader } from "@/components/ui";
import { useData } from "@/lib/DataContext";
import { monthlyReport, yen, yearMonthOf } from "@/lib/business";

export default function ReportsPage() {
  const { data, loading } = useData();
  const [yearMonth, setYearMonth] = useState("");

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    data.deliveries.forEach((d) => set.add(yearMonthOf(d.deliveryDate)));
    data.assignments.forEach((a) => {
      if (a.arriveDate) set.add(yearMonthOf(a.arriveDate));
    });
    set.add(new Date().toISOString().slice(0, 7));
    return [...set].sort().reverse();
  }, [data]);

  const selectedMonth = yearMonth || monthOptions[0] || "";
  const report = useMemo(
    () => (selectedMonth ? monthlyReport(data, selectedMonth) : null),
    [data, selectedMonth]
  );

  if (loading || !report) {
    return (
      <DashboardLayout>
        <LoadingBlock />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="fade-in">
        <PageHeader
          title="月報"
          description="月ごとの納品売上・内職報酬・粗利です。請求書の発行件数も確認できます。印刷が必要なら請求・支払の帳票をご利用ください。"
          actions={
            <Field label="対象月">
              <FormSelect
                value={selectedMonth}
                onChange={(e) => setYearMonth(e.target.value)}
              >
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </FormSelect>
            </Field>
          }
        />

        <div className="dashboard-grid mb-8">
          <div className="card-flat card border-l-4 border-l-indigo-500">
            <p className="text-sm font-bold text-slate-500">納品売上</p>
            <h2 className="h1 mt-2">{yen(report.revenue)}</h2>
            <p className="text-xs text-slate-400 mt-1">{report.deliveryCount} 件の納品</p>
          </div>
          <div className="card-flat card border-l-4 border-l-amber-500">
            <p className="text-sm font-bold text-slate-500">内職報酬</p>
            <h2 className="h1 mt-2">{yen(report.staffCost)}</h2>
            <p className="text-xs text-slate-400 mt-1">{report.arrivalCount} 件の入荷</p>
          </div>
          <div className="card-flat card border-l-4 border-l-teal-500">
            <p className="text-sm font-bold text-slate-500">粗利</p>
            <h2 className="h1 mt-2">{yen(report.profit)}</h2>
            <p className="text-xs text-slate-400 mt-1">請求書 {report.invoiceCount} 件</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="card-flat card">
            <h2 className="h3 mb-4">顧客別売上</h2>
            {report.clientBreakdown.length === 0 ? (
              <p className="text-slate-400 italic">データなし</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-slate-400 text-sm">
                    <th className="pb-2 font-semibold">顧客</th>
                    <th className="pb-2 font-semibold text-right">金額</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.clientBreakdown.map((r) => (
                    <tr key={r.clientId}>
                      <td className="py-3 font-bold">{r.name}</td>
                      <td className="py-3 text-right text-primary font-bold">
                        {yen(r.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="card-flat card">
            <h2 className="h3 mb-4">内職者別報酬</h2>
            {report.staffBreakdown.length === 0 ? (
              <p className="text-slate-400 italic">データなし</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-slate-400 text-sm">
                    <th className="pb-2 font-semibold">内職者</th>
                    <th className="pb-2 font-semibold text-right">金額</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.staffBreakdown.map((r) => (
                    <tr key={r.staffId}>
                      <td className="py-3 font-bold">{r.name}</td>
                      <td className="py-3 text-right text-primary font-bold">
                        {yen(r.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
