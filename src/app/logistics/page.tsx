"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import {
  EmptyState,
  Field,
  FormInput,
  FormSelect,
  LoadingBlock,
  Modal,
  PageHeader,
  SearchBar,
  StatusBadge,
  Tabs,
} from "@/components/ui";
import WorkflowGuide from "@/components/WorkflowGuide";
import { useFeedback } from "@/components/Feedback";
import { useData } from "@/lib/DataContext";
import {
  assignmentStatus,
  clientName,
  lineAmount,
  parseDecimal,
  projectName,
  remainingShipQtyExcluding,
  staffName,
  todayISO,
  validateArriveQty,
  validateShipQty,
  yen,
} from "@/lib/business";
import type { Assignment } from "@/lib/types";

type Tab = "assign" | "arrival";

type EditForm = {
  staffId: string;
  workName: string;
  qty: number;
  unitPrice: number;
  deadline: string;
  shipDate: string;
  notes: string;
};

export default function LogisticsPage() {
  const { data, loading, update } = useData();
  const { toast, confirmAction } = useFeedback();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get("tab") === "arrival" ? "arrival" : "assign";

  // Arrival register / edit
  const [arriveTarget, setArriveTarget] = useState<Assignment | null>(null);
  const [arriveMode, setArriveMode] = useState<"create" | "edit">("create");
  const [arrivedQty, setArrivedQty] = useState(0);
  const [arriveDate, setArriveDate] = useState(todayISO());

  // Shipment edit
  const [editTarget, setEditTarget] = useState<Assignment | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  const [q, setQ] = useState("");

  const filteredAssigns = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.assignments
      .filter((a) => {
        const text = [
          a.workName,
          staffName(data, a.staffId),
          projectName(data, a.projectId),
          clientName(
            data,
            data.projects.find((p) => p.id === a.projectId)?.clientId ?? ""
          ),
        ]
          .join(" ")
          .toLowerCase();
        return !term || text.includes(term);
      })
      .sort((a, b) => b.shipDate.localeCompare(a.shipDate));
  }, [data, q]);

  const pendingArrivals = useMemo(
    () => filteredAssigns.filter((a) => a.arrivedQty == null),
    [filteredAssigns]
  );
  const completedArrivals = useMemo(
    () => filteredAssigns.filter((a) => a.arrivedQty != null),
    [filteredAssigns]
  );

  const activeStaff = data.staff.filter((s) => s.status === "active");

  const openArrive = (a: Assignment, mode: "create" | "edit" = "create") => {
    setArriveMode(mode);
    setArriveTarget(a);
    setArrivedQty(a.arrivedQty != null ? a.arrivedQty : a.qty);
    setArriveDate(a.arriveDate || todayISO());
  };

  const saveArrive = async () => {
    if (!arriveTarget) return;
    const qtyError = validateArriveQty(arriveTarget, arrivedQty);
    if (qtyError) {
      toast(qtyError, "error");
      return;
    }
    if (!arriveDate) {
      toast("入荷日を入力してください", "error");
      return;
    }
    try {
      await update((prev) => ({
        ...prev,
        assignments: prev.assignments.map((a) =>
          a.id === arriveTarget.id ? { ...a, arrivedQty, arriveDate } : a
        ),
      }));
      setArriveTarget(null);
      toast("入荷を登録しました。次は顧客への納品、または支払確認ができます。", "success");
    } catch {
      toast("保存に失敗しました", "error");
    }
  };

  const clearArrive = async (a: Assignment) => {
    const ok = await confirmAction({
      title: "入荷を取り消す",
      message: `「${a.workName}」/ ${staffName(data, a.staffId)} の入荷情報を取り消します。出荷データは残ります。支払明細からも外れます。`,
      confirmLabel: "入荷を取り消す",
      danger: true,
    });
    if (!ok) return;
    try {
      await update((prev) => ({
        ...prev,
        assignments: prev.assignments.map((x) =>
          x.id === a.id ? { ...x, arrivedQty: null, arriveDate: null } : x
        ),
      }));
      toast("入荷を取り消しました", "success");
    } catch {
      toast("取り消しに失敗しました", "error");
    }
  };

  const openEdit = (a: Assignment) => {
    setEditTarget(a);
    setEditForm({
      staffId: a.staffId,
      workName: a.workName,
      qty: a.qty,
      unitPrice: a.unitPrice,
      deadline: a.deadline,
      shipDate: a.shipDate,
      notes: a.notes || "",
    });
  };

  const saveEdit = async () => {
    if (!editTarget || !editForm) return;
    if (!editForm.staffId) {
      toast("内職者を選択してください", "error");
      return;
    }
    if (!editForm.workName.trim()) {
      toast("作業名を入力してください", "error");
      return;
    }
    const qtyError = validateShipQty(
      data,
      editTarget.projectId,
      editForm.qty,
      editTarget.id
    );
    if (qtyError) {
      toast(qtyError, "error");
      return;
    }
    if (!editForm.deadline || !editForm.shipDate) {
      toast("納期・出荷日を入力してください", "error");
      return;
    }

    if (
      editTarget.arrivedQty != null &&
      editForm.qty < editTarget.arrivedQty
    ) {
      const ok = await confirmAction({
        title: "出荷数が入荷数より少なくなります",
        message: `出荷数（${editForm.qty}）が入荷数（${editTarget.arrivedQty}）より少なくなります。このまま保存しますか？`,
        confirmLabel: "保存する",
      });
      if (!ok) return;
    }

    try {
    await update((prev) => ({
      ...prev,
      assignments: prev.assignments.map((a) =>
        a.id === editTarget.id
          ? {
              ...a,
              staffId: editForm.staffId,
              workName: editForm.workName.trim(),
              qty: editForm.qty,
              unitPrice: editForm.unitPrice,
              deadline: editForm.deadline,
              shipDate: editForm.shipDate,
              notes: editForm.notes,
            }
          : a
      ),
    }));
    setEditTarget(null);
    setEditForm(null);
    toast("出荷内容を更新しました", "success");
    } catch {
      toast("保存に失敗しました", "error");
    }
  };

  const deleteAssignment = async (a: Assignment) => {
    const hasArrive = a.arrivedQty != null;
    const ok = await confirmAction({
      title: "出荷を削除",
      message: hasArrive
        ? `「${a.workName}」/ ${staffName(data, a.staffId)} を削除します。入荷情報と支払明細の対象からも外れます。`
        : `「${a.workName}」/ ${staffName(data, a.staffId)} の出荷を削除します。`,
      confirmLabel: "削除する",
      danger: true,
    });
    if (!ok) return;

    try {
      await update((prev) => ({
        ...prev,
        assignments: prev.assignments.filter((x) => x.id !== a.id),
      }));
      toast("出荷を削除しました", "success");
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

  const ActionButtons = ({ a }: { a: Assignment }) => (
    <div className="flex flex-wrap justify-end gap-2">
      {a.arrivedQty == null ? (
        <button
          type="button"
          className="text-teal-700 font-bold text-sm hover:underline"
          onClick={() => openArrive(a, "create")}
        >
          入荷登録
        </button>
      ) : (
        <button
          type="button"
          className="text-teal-700 font-bold text-sm hover:underline"
          onClick={() => openArrive(a, "edit")}
        >
          入荷修正
        </button>
      )}
      <button
        type="button"
        className="text-primary font-bold text-sm hover:underline"
        onClick={() => openEdit(a)}
      >
        出荷修正
      </button>
      {a.arrivedQty != null && (
        <button
          type="button"
          className="text-amber-700 font-bold text-sm hover:underline"
          onClick={() => void clearArrive(a)}
        >
          入荷取消
        </button>
      )}
      <button
        type="button"
        className="text-red-600 font-bold text-sm hover:underline"
        onClick={() => void deleteAssignment(a)}
      >
        削除
      </button>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="fade-in">
        <PageHeader
          title="出荷・入荷管理"
          description="内職者へ材料・作業を送り（出荷）、戻ってきた数量を検品します（入荷）。入荷数量×単価が報酬になります。"
          actions={
            <Link href="/logistics/assign" className="btn btn-primary">
              新規出荷登録
            </Link>
          }
        />

        <WorkflowGuide compact />

        <Tabs
          tabs={[
            { key: "assign", label: "📦 出荷一覧" },
            { key: "arrival", label: "📥 入荷一覧" },
          ]}
          value={tab}
          onChange={(v) => {
            const qs = new URLSearchParams(searchParams.toString());
            qs.set("tab", v);
            router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
          }}
        />

        <SearchBar value={q} onChange={setQ} placeholder="作業名・内職者・顧客で検索" />

        {tab === "assign" && (
          <section className="card-flat card">
            <h2 className="h3 mb-6">出荷一覧</h2>
            {filteredAssigns.length === 0 ? (
              <EmptyState
                message="出荷データがありません"
                hint="案件を選んで内職者に数量を割り当てると、ここに表示されます。"
                actionLabel="出荷を登録"
                actionHref="/logistics/assign"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b text-slate-400 text-sm">
                      <th className="pb-3 px-2 font-semibold">作業名</th>
                      <th className="pb-3 px-2 font-semibold">内職者</th>
                      <th className="pb-3 px-2 font-semibold">出荷数</th>
                      <th className="pb-3 px-2 font-semibold">単価</th>
                      <th className="pb-3 px-2 font-semibold">納期</th>
                      <th className="pb-3 px-2 font-semibold">出荷日</th>
                      <th className="pb-3 px-2 font-semibold">状態</th>
                      <th className="pb-3 px-2 font-semibold text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAssigns.map((a) => {
                      const project = data.projects.find((p) => p.id === a.projectId);
                      const status = assignmentStatus(a);
                      return (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="py-4 px-2">
                            <p className="font-bold">{a.workName}</p>
                            <p className="text-xs text-slate-400">
                              {project ? clientName(data, project.clientId) : ""}
                            </p>
                          </td>
                          <td className="py-4 px-2 font-medium">
                            {staffName(data, a.staffId)}
                          </td>
                          <td className="py-4 px-2">{a.qty.toLocaleString()}</td>
                          <td className="py-4 px-2">{yen(a.unitPrice)}</td>
                          <td className="py-4 px-2 text-sm">{a.deadline}</td>
                          <td className="py-4 px-2 text-sm">{a.shipDate}</td>
                          <td className="py-4 px-2">
                            <StatusBadge
                              label={status}
                              tone={status === "入荷完了" ? "emerald" : "blue"}
                            />
                          </td>
                          <td className="py-4 px-2 text-right">
                            <ActionButtons a={a} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === "arrival" && (
          <div className="space-y-6">
            <section className="card-flat card">
              <h2 className="h3 mb-2">入荷待ち</h2>
              <p className="text-sm text-slate-600 mb-6">
                戻ってきた数量を登録します。この数量 × 単価が内職者への報酬になります。
              </p>
              {pendingArrivals.length === 0 ? (
                <EmptyState
                  message="入荷待ちはありません"
                  hint="出荷するとここに並びます。完了した作業は下の「入荷完了」で確認できます。"
                  actionLabel="出荷を登録"
                  actionHref="/logistics/assign"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b text-slate-400 text-sm">
                        <th className="pb-3 px-2 font-semibold">作業名</th>
                        <th className="pb-3 px-2 font-semibold">内職者</th>
                        <th className="pb-3 px-2 font-semibold">出荷数</th>
                        <th className="pb-3 px-2 font-semibold">納期</th>
                        <th className="pb-3 px-2 font-semibold text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {pendingArrivals.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="py-4 px-2 font-bold">{a.workName}</td>
                          <td className="py-4 px-2">{staffName(data, a.staffId)}</td>
                          <td className="py-4 px-2">{a.qty.toLocaleString()}</td>
                          <td className="py-4 px-2">{a.deadline}</td>
                          <td className="py-4 px-2 text-right">
                            <ActionButtons a={a} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="card-flat card">
              <h2 className="h3 mb-6">入荷完了一覧</h2>
              {completedArrivals.length === 0 ? (
                <EmptyState message="入荷完了データがありません。入荷待ちから検品登録してください。" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b text-slate-400 text-sm">
                        <th className="pb-3 px-2 font-semibold">作業名</th>
                        <th className="pb-3 px-2 font-semibold">内職者</th>
                        <th className="pb-3 px-2 font-semibold">出荷数</th>
                        <th className="pb-3 px-2 font-semibold">入荷数</th>
                        <th className="pb-3 px-2 font-semibold">単価</th>
                        <th className="pb-3 px-2 font-semibold">報酬</th>
                        <th className="pb-3 px-2 font-semibold">入荷日</th>
                        <th className="pb-3 px-2 font-semibold text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {completedArrivals.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="py-4 px-2 font-bold">{a.workName}</td>
                          <td className="py-4 px-2">{staffName(data, a.staffId)}</td>
                          <td className="py-4 px-2">{a.qty.toLocaleString()}</td>
                          <td className="py-4 px-2 font-bold text-teal-600">
                            {(a.arrivedQty ?? 0).toLocaleString()}
                          </td>
                          <td className="py-4 px-2">{yen(a.unitPrice)}</td>
                          <td className="py-4 px-2 font-bold text-primary">
                            {yen(lineAmount(a.arrivedQty ?? 0, a.unitPrice))}
                          </td>
                          <td className="py-4 px-2">{a.arriveDate}</td>
                          <td className="py-4 px-2 text-right">
                            <ActionButtons a={a} />
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

        {/* Arrival modal */}
        <Modal
          open={!!arriveTarget}
          title={arriveMode === "edit" ? "入荷修正" : "入荷登録"}
          onClose={() => setArriveTarget(null)}
        >
          {arriveTarget && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                <strong>{arriveTarget.workName}</strong> /{" "}
                {staffName(data, arriveTarget.staffId)}
              </p>
              <p className="text-sm text-slate-500">
                出荷数: {arriveTarget.qty.toLocaleString()} / 単価:{" "}
                {yen(arriveTarget.unitPrice)}
              </p>
              <Field label="入荷数量" required>
                <FormInput
                  type="number"
                  min={0}
                  value={arrivedQty}
                  onChange={(e) => setArrivedQty(Number(e.target.value) || 0)}
                />
              </Field>
              <Field label="入荷日" required>
                <FormInput
                  type="date"
                  value={arriveDate}
                  onChange={(e) => setArriveDate(e.target.value)}
                />
              </Field>
              <p className="text-sm font-bold text-primary">
                報酬見込み: {yen(lineAmount(arrivedQty, arriveTarget.unitPrice))}
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setArriveTarget(null)}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void saveArrive()}
                >
                  {arriveMode === "edit" ? "修正を保存" : "登録する"}
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Shipment edit modal */}
        <Modal
          open={!!editTarget && !!editForm}
          title="出荷修正"
          onClose={() => {
            setEditTarget(null);
            setEditForm(null);
          }}
          wide
        >
          {editTarget && editForm && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                案件: <strong>{projectName(data, editTarget.projectId)}</strong>
                （案件との紐づけは維持されます）
              </p>
              <p className="text-xs text-slate-400">
                出荷可能な最大数:{" "}
                {remainingShipQtyExcluding(
                  data,
                  editTarget.projectId,
                  editTarget.id
                ).toLocaleString()}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="内職者" required>
                  <FormSelect
                    value={editForm.staffId}
                    onChange={(e) =>
                      setEditForm({ ...editForm, staffId: e.target.value })
                    }
                  >
                    {activeStaff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                    {/* keep current staff even if inactive */}
                    {!activeStaff.some((s) => s.id === editForm.staffId) && (
                      <option value={editForm.staffId}>
                        {staffName(data, editForm.staffId)}（停止中）
                      </option>
                    )}
                  </FormSelect>
                </Field>
                <Field label="作業名" required>
                  <FormInput
                    value={editForm.workName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, workName: e.target.value })
                    }
                  />
                </Field>
                <Field label="出荷数" required>
                  <FormInput
                    type="number"
                    min={1}
                    value={editForm.qty || ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        qty: Number(e.target.value) || 0,
                      })
                    }
                  />
                </Field>
                <Field label="単価（円）" required>
                  <FormInput
                    type="number"
                    min={0}
                    step="any"
                    value={editForm.unitPrice === 0 ? "" : editForm.unitPrice}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        unitPrice: parseDecimal(e.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="納期" required>
                  <FormInput
                    type="date"
                    value={editForm.deadline}
                    onChange={(e) =>
                      setEditForm({ ...editForm, deadline: e.target.value })
                    }
                  />
                </Field>
                <Field label="出荷日" required>
                  <FormInput
                    type="date"
                    value={editForm.shipDate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, shipDate: e.target.value })
                    }
                  />
                </Field>
              </div>
              {editTarget.arrivedQty != null && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  入荷済み（{editTarget.arrivedQty.toLocaleString()} /{" "}
                  {editTarget.arriveDate}）です。出荷内容を変更しても入荷情報は維持されます。
                  入荷だけ直す場合は「入荷修正」を使ってください。
                </p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setEditTarget(null);
                    setEditForm(null);
                  }}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void saveEdit()}
                >
                  修正を保存
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
