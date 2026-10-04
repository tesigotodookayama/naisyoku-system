"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Banner,
  EmptyState,
  Field,
  FormInput,
  FormSelect,
  LoadingBlock,
  Modal,
  PageHeader,
  SearchBar,
  StatusBadge,
} from "@/components/ui";
import { useFeedback } from "@/components/Feedback";
import { useData } from "@/lib/DataContext";
import {
  clientName,
  lineAmount,
  newId,
  parseDecimal,
  projectName,
  remainingDeliverQty,
  todayISO,
  validateDeliverQty,
  yen,
} from "@/lib/business";
import type { Delivery } from "@/lib/types";

export default function DeliveriesPage() {
  const { data, loading, update } = useData();
  const { toast, confirmAction } = useFeedback();
  const searchParams = useSearchParams();
  const urlPid = searchParams.get("projectId") ?? "";
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(Boolean(urlPid));
  const [projectId, setProjectId] = useState(urlPid);
  const [qty, setQty] = useState(0);
  const [unitPrice, setUnitPrice] = useState<number | null>(null);
  const [deliveryDate, setDeliveryDate] = useState(todayISO());
  const [formError, setFormError] = useState<string | null>(null);
  const [qtyTouched, setQtyTouched] = useState(false);

  const selectedProject = data.projects.find((x) => x.id === projectId);
  const remain = selectedProject ? remainingDeliverQty(data, selectedProject.id) : 0;
  const effectiveQty = qtyTouched ? qty : remain;
  const effectivePrice = unitPrice ?? selectedProject?.unitPrice ?? 0;

  const deliveries = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...data.deliveries]
      .sort((a, b) => b.deliveryDate.localeCompare(a.deliveryDate))
      .filter((d) => {
        const text = [
          projectName(data, d.projectId),
          clientName(data, d.clientId),
        ]
          .join(" ")
          .toLowerCase();
        return !term || text.includes(term);
      });
  }, [data, q]);

  const openNew = () => {
    setProjectId(data.projects[0]?.id ?? "");
    setDeliveryDate(todayISO());
    setFormError(null);
    setQtyTouched(false);
    setUnitPrice(null);
    setOpen(true);
  };

  const save = async () => {
    const project = data.projects.find((p) => p.id === projectId);
    if (!project) {
      setFormError("案件を選択してください");
      return;
    }
    const qtyError = validateDeliverQty(data, project.id, effectiveQty);
    if (qtyError) {
      setFormError(qtyError);
      toast(qtyError, "error");
      return;
    }
    const delivery: Delivery = {
      id: newId("dlv"),
      projectId: project.id,
      clientId: project.clientId,
      qty: effectiveQty,
      unitPrice: effectivePrice,
      deliveryDate,
      invoiceId: null,
      notes: "",
      createdAt: new Date().toISOString(),
    };
    try {
      await update((prev) => {
        const deliveriesNext = [...prev.deliveries, delivery];
        const delivered = deliveriesNext
          .filter((d) => d.projectId === project.id)
          .reduce((s, d) => s + d.qty, 0);
        return {
          ...prev,
          deliveries: deliveriesNext,
          projects: prev.projects.map((p) =>
            p.id === project.id && delivered >= p.orderQty
              ? { ...p, status: "completed" }
              : p
          ),
        };
      });
      setOpen(false);
      toast("納品を登録しました。未請求分は請求・支払から請求書を発行できます。", "success");
    } catch {
      setFormError("保存に失敗しました");
      toast("保存に失敗しました", "error");
    }
  };

  const remove = async (d: Delivery) => {
    if (d.invoiceId) {
      toast("請求済みの納品は削除できません", "error");
      return;
    }
    const ok = await confirmAction({
      title: "納品を削除",
      message: `${clientName(data, d.clientId)} への「${projectName(data, d.projectId)}」 ${d.qty.toLocaleString()} 個の記録を削除します。`,
      confirmLabel: "削除する",
      danger: true,
    });
    if (!ok) return;
    try {
      await update((prev) => ({
        ...prev,
        deliveries: prev.deliveries.filter((x) => x.id !== d.id),
      }));
      toast("納品を削除しました", "success");
    } catch {
      toast("削除に失敗しました", "error");
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
          title="納品管理"
          description="顧客へ渡した数量を記録します。未請求の納品から、請求・支払画面で請求書を発行できます。"
          actions={
            <button type="button" className="btn btn-primary" onClick={openNew}>
              納品登録
            </button>
          }
        />

        <SearchBar value={q} onChange={setQ} placeholder="案件名・顧客名で検索" />

        <section className="card-flat card">
          <h2 className="h3 mb-6">納品一覧</h2>
          {deliveries.length === 0 ? (
            <EmptyState
              message="納品データがありません"
              hint="入荷検品が終わった分を、発注元へ納品として記録します。"
              actionLabel="納品を登録"
              onAction={openNew}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-slate-400 text-sm">
                    <th className="pb-3 px-2 font-semibold">納品日</th>
                    <th className="pb-3 px-2 font-semibold">顧客</th>
                    <th className="pb-3 px-2 font-semibold">作業品</th>
                    <th className="pb-3 px-2 font-semibold">数量</th>
                    <th className="pb-3 px-2 font-semibold">単価</th>
                    <th className="pb-3 px-2 font-semibold">金額</th>
                    <th className="pb-3 px-2 font-semibold">請求</th>
                    <th className="pb-3 px-2 font-semibold text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {deliveries.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="py-4 px-2 text-sm">{d.deliveryDate}</td>
                      <td className="py-4 px-2 font-bold">
                        {clientName(data, d.clientId)}
                      </td>
                      <td className="py-4 px-2">{projectName(data, d.projectId)}</td>
                      <td className="py-4 px-2">{d.qty.toLocaleString()}</td>
                      <td className="py-4 px-2">{yen(d.unitPrice)}</td>
                      <td className="py-4 px-2 font-bold text-primary">
                        {yen(lineAmount(d.qty, d.unitPrice))}
                      </td>
                      <td className="py-4 px-2">
                        <StatusBadge
                          label={d.invoiceId ? "請求済" : "未請求"}
                          tone={d.invoiceId ? "emerald" : "amber"}
                        />
                      </td>
                      <td className="py-4 px-2 text-right space-x-3">
                        <Link
                          href={`/print/delivery/${d.id}`}
                          className="text-sm font-bold text-primary hover:underline"
                          target="_blank"
                        >
                          納品書
                        </Link>
                        {!d.invoiceId && (
                          <button
                            type="button"
                            className="text-sm font-bold text-red-600 hover:underline min-h-11"
                            onClick={() => void remove(d)}
                          >
                            削除
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <Modal open={open} title="納品登録" onClose={() => setOpen(false)}>
          <div className="space-y-4">
            {formError && <Banner tone="error">{formError}</Banner>}
            <Field label="案件" required>
              <FormSelect
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setQtyTouched(false);
                  setUnitPrice(null);
                }}
              >
                <option value="">選択してください</option>
                {data.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}（{clientName(data, p.clientId)}）残
                    {remainingDeliverQty(data, p.id).toLocaleString()}
                  </option>
                ))}
              </FormSelect>
            </Field>
            <Field label="納品数量" required>
              <FormInput
                type="number"
                min={1}
                value={effectiveQty || ""}
                onChange={(e) => {
                  setQtyTouched(true);
                  setQty(Number(e.target.value) || 0);
                }}
              />
            </Field>
            <Field label="単価（円）" required>
              <FormInput
                type="number"
                min={0}
                step="any"
                value={effectivePrice === 0 ? "" : effectivePrice}
                onChange={(e) => setUnitPrice(parseDecimal(e.target.value))}
                placeholder="例: 0.9"
              />
            </Field>
            <Field label="納品日" required>
              <FormInput
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </Field>
            <p className="text-sm font-bold text-primary">
              金額: {yen(lineAmount(effectiveQty, effectivePrice))}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setOpen(false)}
              >
                キャンセル
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void save()}>
                登録
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
