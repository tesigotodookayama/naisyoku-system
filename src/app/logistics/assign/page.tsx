"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Banner,
  EmptyState,
  Field,
  FormInput,
  FormSelect,
  LoadingBlock,
  PageHeader,
} from "@/components/ui";
import { useFeedback } from "@/components/Feedback";
import { useData } from "@/lib/DataContext";
import {
  clientName,
  newId,
  parseDecimal,
  remainingShipQty,
  todayISO,
  validateShipQty,
  yen,
} from "@/lib/business";
import type { Assignment } from "@/lib/types";

type DraftRow = {
  key: string;
  staffId: string;
  qty: number;
  unitPrice: number;
  deadline: string;
};

export default function AssignInputPage() {
  const { data, loading, update } = useData();
  const { toast } = useFeedback();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projectId, setProjectId] = useState(searchParams.get("projectId") ?? "");
  const [shipDate, setShipDate] = useState(todayISO());
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [staffId, setStaffId] = useState("");
  const [qty, setQty] = useState(0);
  const [unitPrice, setUnitPrice] = useState<number | null>(null);
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  const project = useMemo(
    () => data.projects.find((p) => p.id === projectId),
    [data.projects, projectId]
  );

  const remain = project ? remainingShipQty(data, project.id) : 0;
  const draftTotal = rows.reduce((s, r) => s + r.qty, 0);
  const effectiveUnitPrice = unitPrice ?? project?.staffUnitPrice ?? 0;
  const effectiveDeadline = deadline || project?.deadline || "";

  const addRow = () => {
    if (!project) {
      toast("先に案件を選んでください", "error");
      return;
    }
    if (!staffId || qty <= 0 || !effectiveDeadline) {
      toast("内職者・出荷数・納期を入力してください", "error");
      return;
    }
    const err = validateShipQty(data, project.id, draftTotal + qty);
    if (err) {
      toast(err, "error");
      return;
    }
    setRows((prev) => [
      ...prev,
      {
        key: newId("tmp"),
        staffId,
        qty,
        unitPrice: effectiveUnitPrice,
        deadline: effectiveDeadline,
      },
    ]);
    setStaffId("");
    setQty(0);
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const submit = async () => {
    if (!project) {
      toast("案件を選択してください", "error");
      return;
    }
    if (rows.length === 0) {
      toast("内職者を1名以上、リストに追加してください", "error");
      return;
    }
    const err = validateShipQty(data, project.id, draftTotal);
    if (err) {
      toast(err, "error");
      return;
    }
    setSaving(true);
    try {
      const assignments: Assignment[] = rows.map((r) => ({
        id: newId("asn"),
        projectId: project.id,
        staffId: r.staffId,
        workName: project.name,
        qty: r.qty,
        unitPrice: r.unitPrice,
        deadline: r.deadline,
        shipDate,
        arrivedQty: null,
        arriveDate: null,
        notes: "",
        createdAt: new Date().toISOString(),
      }));
      await update((prev) => ({
        ...prev,
        assignments: [...prev.assignments, ...assignments],
        projects: prev.projects.map((p) =>
          p.id === project.id && p.status === "open"
            ? { ...p, status: "in_progress" }
            : p
        ),
      }));
      toast("出荷を登録しました。戻ってきたら入荷検品へ進んでください。", "success");
      router.push("/logistics?tab=arrival");
    } catch {
      toast("登録に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingBlock />
      </DashboardLayout>
    );
  }

  const activeStaff = data.staff.filter((s) => s.status === "active");

  return (
    <DashboardLayout>
      <div className="fade-in">
        <PageHeader
          title="出荷登録（内職者割当）"
          description="案件を選び、内職者ごとに出す数量をリストへ追加してから登録します。受注数を超える出荷はできません。"
          actions={
            <Link href="/logistics" className="btn btn-outline">
              一覧へ戻る
            </Link>
          }
        />

        {data.projects.filter((p) => p.status !== "closed").length === 0 && (
          <Banner tone="warn">
            登録できる案件がありません。{" "}
            <Link href="/projects" className="font-bold underline">
              案件管理
            </Link>
            から受注を登録してください。
          </Banner>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <section className="card-flat card">
              <h2 className="h3 mb-6">1. 案件の選択</h2>
              <Field label="案件" required>
                <FormSelect
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    setRows([]);
                    setUnitPrice(null);
                    setDeadline("");
                  }}
                >
                  <option value="">選択してください</option>
                  {data.projects
                    .filter((p) => p.status !== "closed")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}（{clientName(data, p.clientId)}）
                      </option>
                    ))}
                </FormSelect>
              </Field>
              {project && (
                <div className="mt-4 p-4 bg-primary-light rounded-lg border border-primary/20">
                  <p className="text-xs font-bold text-primary uppercase mb-1">選択中の案件</p>
                  <p className="font-bold text-primary-dark">
                    {project.name}（{clientName(data, project.clientId)}）
                  </p>
                  <p className="text-xs text-primary/70 mt-1">
                    受注数: {project.orderQty.toLocaleString()} | 出荷残:{" "}
                  {remain.toLocaleString()} | 内職単価: {yen(project.staffUnitPrice)}
                  </p>
                </div>
              )}
            </section>

            <section className="card-flat card">
              <h2 className="h3 mb-6">2. 内職者の割り当て</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Field label="内職者" required>
                  <FormSelect
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    disabled={!project}
                  >
                    <option value="">選択してください</option>
                    {activeStaff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </FormSelect>
                </Field>
                <Field label="出荷数" required>
                  <FormInput
                    type="number"
                    min={1}
                    value={qty || ""}
                    onChange={(e) => setQty(Number(e.target.value) || 0)}
                    disabled={!project}
                  />
                </Field>
                <Field label="単価（円）" required>
                  <FormInput
                    type="number"
                    min={0}
                    step="any"
                    value={effectiveUnitPrice === 0 ? "" : effectiveUnitPrice}
                    onChange={(e) => setUnitPrice(parseDecimal(e.target.value))}
                    disabled={!project}
                    placeholder="例: 0.3"
                  />
                </Field>
                <Field label="納期" required>
                  <FormInput
                    type="date"
                    value={effectiveDeadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    disabled={!project}
                  />
                </Field>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addRow}
                  className="btn btn-outline"
                  disabled={!project}
                >
                  ➕ リストに追加
                </button>
              </div>
            </section>

            <section className="card-flat card">
              <h2 className="h3 mb-6">登録プレビュー（{rows.length}名）</h2>
              {rows.length === 0 ? (
                <EmptyState
                  message="まだリストに内職者がいません"
                  hint="上で内職者と数量を入力し「リストに追加」を押してください。"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b text-slate-400 text-sm">
                        <th className="pb-3 px-2 font-semibold">内職者</th>
                        <th className="pb-3 px-2 font-semibold">出荷数</th>
                        <th className="pb-3 px-2 font-semibold">単価</th>
                        <th className="pb-3 px-2 font-semibold">納期</th>
                        <th className="pb-3 px-2 font-semibold text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rows.map((r) => {
                        const staff = data.staff.find((s) => s.id === r.staffId);
                        return (
                          <tr key={r.key}>
                            <td className="py-4 px-2 font-medium">{staff?.name}</td>
                            <td className="py-4 px-2">{r.qty.toLocaleString()}</td>
                            <td className="py-4 px-2">{yen(r.unitPrice)}</td>
                            <td className="py-4 px-2">{r.deadline}</td>
                            <td className="py-4 px-2 text-right">
                              <button
                                type="button"
                                onClick={() => removeRow(r.key)}
                                className="text-red-600 hover:underline font-bold min-h-11"
                              >
                                削除
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="card-flat card">
              <h2 className="h3 mb-4">出荷確認</h2>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">合計出荷数</span>
                  <span className="font-bold">{draftTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">出荷残</span>
                  <span className="font-bold">{remain.toLocaleString()}</span>
                </div>
                <Field label="出荷日">
                  <FormInput
                    type="date"
                    value={shipDate}
                    onChange={(e) => setShipDate(e.target.value)}
                  />
                </Field>
              </div>
              <button
                type="button"
                className="btn btn-primary w-full py-4 text-lg"
                onClick={() => void submit()}
                disabled={saving || !project || rows.length === 0}
              >
                {saving ? "登録中..." : "この内容で登録する"}
              </button>
            </section>

            <Banner tone="warn">
              出荷残を超えた数量は割り当てできません。登録後は「入荷検品」で戻ってきた数を入力すると、支払に反映されます。
            </Banner>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
