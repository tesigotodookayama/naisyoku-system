"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import {
  EmptyState,
  Field,
  FormSelect,
  LoadingBlock,
  PageHeader,
  Tabs,
} from "@/components/ui";
import WorkflowGuide from "@/components/WorkflowGuide";
import { useFeedback } from "@/components/Feedback";
import { useData } from "@/lib/DataContext";
import {
  clientName,
  invoiceLinesForDeliveries,
  issueInvoice,
  paymentLines,
  staffName,
  staffPaymentSummary,
  unbilledDeliveries,
  yen,
  yearMonthOf,
} from "@/lib/business";

type Tab = "billing" | "invoices" | "payment" | "individual";

export default function FinancePage() {
  const { data, loading, save } = useData();
  const { toast, confirmAction } = useFeedback();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");
  const tab: Tab =
    urlTab === "billing" || urlTab === "invoices" || urlTab === "payment" || urlTab === "individual"
      ? urlTab
      : "billing";
  const setTab = (next: Tab) => {
    const qs = new URLSearchParams(searchParams.toString());
    qs.set("tab", next);
    router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
  };
  const [billClientId, setBillClientId] = useState("");
  const [billMonth, setBillMonth] = useState("");
  const [payMonth, setPayMonth] = useState("");
  const [staffId, setStaffId] = useState("");
  const [busy, setBusy] = useState(false);

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    data.deliveries.forEach((d) => set.add(yearMonthOf(d.deliveryDate)));
    data.assignments.forEach((a) => {
      if (a.arriveDate) set.add(yearMonthOf(a.arriveDate));
    });
    data.invoices.forEach((i) => set.add(i.yearMonth));
    const now = new Date().toISOString().slice(0, 7);
    set.add(now);
    return [...set].sort().reverse();
  }, [data]);

  const selectedBillMonth = billMonth || monthOptions[0] || "";
  const selectedPayMonth = payMonth || monthOptions[0] || "";
  const selectedClientId = billClientId || data.clients[0]?.id || "";
  const selectedStaffId = staffId || data.staff[0]?.id || "";

  const unbilled = useMemo(
    () =>
      unbilledDeliveries(data, {
        clientId: selectedClientId || undefined,
        yearMonth: selectedBillMonth || undefined,
      }),
    [data, selectedClientId, selectedBillMonth]
  );
  const unbilledLines = invoiceLinesForDeliveries(data, unbilled);
  const unbilledTotal = unbilledLines.reduce((s, l) => s + l.amount, 0);

  const allUnbilled = useMemo(() => unbilledDeliveries(data), [data]);

  const paySummary = useMemo(
    () => (selectedPayMonth ? staffPaymentSummary(data, selectedPayMonth) : []),
    [data, selectedPayMonth]
  );

  const individualLines = useMemo(
    () =>
      paymentLines(data, {
        staffId: selectedStaffId || undefined,
        yearMonth: selectedPayMonth || undefined,
      }),
    [data, selectedStaffId, selectedPayMonth]
  );
  const individualTotal = individualLines.reduce((s, l) => s + l.amount, 0);

  const handleIssue = async () => {
    if (!selectedClientId || !selectedBillMonth) {
      toast("顧客と対象月を選択してください", "error");
      return;
    }
    const ok = await confirmAction({
      title: "請求書を発行",
      message: `${clientName(data, selectedClientId)} の ${selectedBillMonth} 分として、未請求 ${unbilled.length} 件（${yen(unbilledTotal)}）を請求書にします。同じ顧客・同じ月は一度だけ発行できます。`,
      confirmLabel: "発行する",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const result = issueInvoice(data, selectedClientId, selectedBillMonth);
      if ("error" in result) {
        toast(result.error, "error");
        return;
      }
      await save(result.data);
      toast("請求書を発行しました", "success");
      window.open(`/print/invoice/${result.invoice.id}`, "_blank");
    } catch {
      toast("請求書の発行に失敗しました", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
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
          title="請求・支払管理"
          description="顧客への請求書は「顧客×月」の未請求納品だけを集計します。内職者への支払は入荷完了分のみです。混同しないよう、必ず対象を選んでから発行・印刷してください。"
        />

        <WorkflowGuide compact />

        <Tabs
          tabs={[
            { key: "billing", label: "請求書発行" },
            { key: "invoices", label: "請求書一覧" },
            { key: "payment", label: "支払一覧表" },
            { key: "individual", label: "支払明細書" },
          ]}
          value={tab}
          onChange={(v) => {
            const qs = new URLSearchParams(searchParams.toString());
            qs.set("tab", v);
            router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
          }}
        />

        {tab === "billing" && (
          <div className="space-y-6">
            <section className="card-flat card space-y-4">
              <h2 className="h3">顧客別・月別の請求書発行</h2>
              <p className="text-sm text-slate-500">
                選択した顧客の、対象月の未請求納品のみを集計します。他顧客の明細は混ざりません。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="顧客">
                  <FormSelect
                    value={selectedClientId}
                    onChange={(e) => setBillClientId(e.target.value)}
                  >
                    {data.clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </FormSelect>
                </Field>
                <Field label="対象月">
                  <FormSelect
                    value={selectedBillMonth}
                    onChange={(e) => setBillMonth(e.target.value)}
                  >
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </FormSelect>
                </Field>
                <div className="flex items-end">
                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    onClick={() => void handleIssue()}
                    disabled={busy || unbilled.length === 0}
                  >
                    {busy ? "発行中..." : "請求書を発行"}
                  </button>
                </div>
              </div>
            </section>

            <section className="card-flat card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="h3">
                  未請求明細 — {clientName(data, selectedClientId)}（{selectedBillMonth}）
                </h2>
                <p className="text-xl font-bold text-primary">{yen(unbilledTotal)}</p>
              </div>
              {unbilledLines.length === 0 ? (
                <EmptyState
                  message="この条件の未請求納品はありません"
                  hint="別の顧客・月を選ぶか、納品管理から納品を登録してください。"
                  actionLabel="納品管理へ"
                  actionHref="/deliveries"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b text-slate-400 text-sm">
                        {["納品日", "作業品", "数量", "単価", "金額"].map((h) => (
                          <th key={h} className="pb-3 px-2 font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {unbilledLines.map((l) => (
                        <tr key={l.deliveryId}>
                          <td className="py-3 px-2 text-sm">{l.deliveryDate}</td>
                          <td className="py-3 px-2 font-bold">{l.projectName}</td>
                          <td className="py-3 px-2">{l.qty.toLocaleString()}</td>
                          <td className="py-3 px-2">{yen(l.unitPrice)}</td>
                          <td className="py-3 px-2 font-bold text-primary">
                            {yen(l.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="card-flat card">
              <h2 className="h3 mb-4">全顧客の未請求サマリー</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b text-slate-400 text-sm">
                      <th className="pb-3 px-2 font-semibold">顧客</th>
                      <th className="pb-3 px-2 font-semibold">件数</th>
                      <th className="pb-3 px-2 font-semibold text-right">金額</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.clients.map((c) => {
                      const list = allUnbilled.filter((d) => d.clientId === c.id);
                      const amount = list.reduce((s, d) => s + d.qty * d.unitPrice, 0);
                      if (list.length === 0) return null;
                      return (
                        <tr key={c.id}>
                          <td className="py-3 px-2 font-bold">{c.name}</td>
                          <td className="py-3 px-2">{list.length}</td>
                          <td className="py-3 px-2 text-right font-bold text-primary">
                            {yen(amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {tab === "invoices" && (
          <section className="card-flat card">
            <h2 className="h3 mb-6">請求書一覧</h2>
            {data.invoices.length === 0 ? (
              <EmptyState
                message="発行済みの請求書はありません"
                hint="「請求書発行」タブで顧客と月を選ぶと発行できます。"
                actionLabel="発行画面へ"
                onAction={() => setTab("billing")}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b text-slate-400 text-sm">
                      <th className="pb-3 px-2 font-semibold">発行日</th>
                      <th className="pb-3 px-2 font-semibold">対象月</th>
                      <th className="pb-3 px-2 font-semibold">顧客</th>
                      <th className="pb-3 px-2 font-semibold">請求No.</th>
                      <th className="pb-3 px-2 font-semibold text-right">税抜</th>
                      <th className="pb-3 px-2 font-semibold text-right">税込合計</th>
                      <th className="pb-3 px-2 font-semibold text-right">帳票</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[...data.invoices]
                      .sort((a, b) => b.issueDate.localeCompare(a.issueDate))
                      .map((inv) => (
                        <tr key={inv.id}>
                          <td className="py-3 px-2">{inv.issueDate}</td>
                          <td className="py-3 px-2">{inv.yearMonth}</td>
                          <td className="py-3 px-2 font-bold">
                            {clientName(data, inv.clientId)}
                          </td>
                          <td className="py-3 px-2 text-sm text-slate-500">
                            {inv.number || "—"}
                          </td>
                          <td className="py-3 px-2 text-right">{yen(inv.subtotal)}</td>
                          <td className="py-3 px-2 text-right font-bold text-primary">
                            {yen(inv.total)}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <Link
                              href={`/print/invoice/${inv.id}`}
                              target="_blank"
                              className="text-sm font-bold text-primary hover:underline"
                            >
                              表示
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === "payment" && (
          <section className="card-flat card">
            <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
              <div>
                <h2 className="h3">内職者 支払一覧表</h2>
                <p className="text-sm text-slate-500">
                  入荷完了分のみ。内職者ごとに報酬を集計します。
                </p>
              </div>
              <div className="flex gap-3 items-end">
                <Field label="対象月">
                  <FormSelect
                    value={selectedPayMonth}
                    onChange={(e) => setPayMonth(e.target.value)}
                  >
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </FormSelect>
                </Field>
                <Link
                  href={`/print/payment-list/${selectedPayMonth}`}
                  target="_blank"
                  className="btn btn-primary"
                >
                  🖨️ 一覧表を印刷
                </Link>
              </div>
            </div>
            {paySummary.length === 0 ? (
              <EmptyState
                message="この月の支払データはありません"
                hint="入荷検品が完了すると、その入荷日の月に報酬が載ります。"
                actionLabel="入荷検品へ"
                actionHref="/logistics?tab=arrival"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b text-slate-400 text-sm">
                      <th className="pb-3 px-2 font-semibold">内職者</th>
                      <th className="pb-3 px-2 font-semibold">明細件数</th>
                      <th className="pb-3 px-2 font-semibold text-right">合計数量</th>
                      <th className="pb-3 px-2 font-semibold text-right">報酬合計</th>
                      <th className="pb-3 px-2 font-semibold text-right">明細</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paySummary.map((r) => (
                      <tr key={r.staffId}>
                        <td className="py-3 px-2 font-bold">{r.name}</td>
                        <td className="py-3 px-2">{r.lineCount}</td>
                        <td className="py-3 px-2 text-right">
                          {r.totalQty.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-primary">
                          {yen(r.totalAmount)}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Link
                            href={`/print/payment/${r.staffId}/${selectedPayMonth}`}
                            target="_blank"
                            className="text-sm font-bold text-primary hover:underline"
                          >
                            支払明細書
                          </Link>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-bold">
                      <td className="py-3 px-2" colSpan={3}>
                        合計
                      </td>
                      <td className="py-3 px-2 text-right text-lg text-primary">
                        {yen(paySummary.reduce((s, r) => s + r.totalAmount, 0))}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === "individual" && (
          <div className="space-y-6">
            <section className="card p-4 flex flex-wrap gap-6 items-end bg-slate-50">
              <Field label="内職者">
                <FormSelect
                  value={selectedStaffId}
                  onChange={(e) => setStaffId(e.target.value)}
                >
                  {data.staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </FormSelect>
              </Field>
              <Field label="対象月">
                <FormSelect
                  value={selectedPayMonth}
                  onChange={(e) => setPayMonth(e.target.value)}
                >
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </FormSelect>
              </Field>
              <Link
                href={`/print/payment/${selectedStaffId}/${selectedPayMonth}`}
                target="_blank"
                className="btn btn-outline"
              >
                🖨️ 支払明細書を印刷
              </Link>
            </section>

            <section className="card-flat card">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="h3">
                    {staffName(data, selectedStaffId)} 様 — {selectedPayMonth} の作業実績
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    この内職者の入荷完了分のみ表示（他者の明細は含まれません）
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">月合計</p>
                  <p className="text-2xl font-bold text-primary">
                    {yen(individualTotal)}
                  </p>
                </div>
              </div>
              {individualLines.length === 0 ? (
                <EmptyState
                  message="この条件のデータはありません"
                  hint="内職者または対象月を変えてください。未入荷の出荷は支払に含まれません。"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b text-slate-400 text-sm">
                        {["作業名", "数量", "入荷日", "単価", "報酬"].map((h) => (
                          <th key={h} className="pb-3 px-2 font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {individualLines.map((l) => (
                        <tr key={l.assignmentId}>
                          <td className="py-3 px-2 font-bold">{l.workName}</td>
                          <td className="py-3 px-2">{l.arrivedQty.toLocaleString()}</td>
                          <td className="py-3 px-2">{l.arriveDate}</td>
                          <td className="py-3 px-2">{yen(l.unitPrice)}</td>
                          <td className="py-3 px-2 font-bold text-primary">
                            {yen(l.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
