"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Banner,
  EmptyState,
  Field,
  FormInput,
  FormSelect,
  FormTextarea,
  LoadingBlock,
  Modal,
  PageHeader,
  SearchBar,
  StatusBadge,
} from "@/components/ui";
import WorkflowGuide from "@/components/WorkflowGuide";
import { useFeedback } from "@/components/Feedback";
import { useData } from "@/lib/DataContext";
import {
  clientName,
  deliveredQty,
  newId,
  parseDecimal,
  projectStatusLabel,
  remainingShipQty,
  shippedQty,
  yen,
} from "@/lib/business";
import type { Project, ProjectStatus } from "@/lib/types";

const emptyProject = (clientId = "") => ({
  clientId,
  name: "",
  description: "",
  orderQty: 0,
  unitPrice: 0,
  staffUnitPrice: 0,
  deadline: "",
  status: "open" as ProjectStatus,
  notes: "",
});

export default function ProjectsPage() {
  const { data, loading, update } = useData();
  const { toast, confirmAction } = useFeedback();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState(emptyProject());
  const [formError, setFormError] = useState<string | null>(null);

  const projects = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.projects.filter((p) => {
      const cname = clientName(data, p.clientId).toLowerCase();
      return (
        !term ||
        p.name.toLowerCase().includes(term) ||
        cname.includes(term)
      );
    });
  }, [data, q]);

  const openNew = () => {
    if (data.clients.length === 0) {
      toast("先に発注元（顧客）を登録してください", "error");
      return;
    }
    setEditing(null);
    setForm(emptyProject(data.clients[0]?.id ?? ""));
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditing(p);
    setForm({
      clientId: p.clientId,
      name: p.name,
      description: p.description,
      orderQty: p.orderQty,
      unitPrice: p.unitPrice,
      staffUnitPrice: p.staffUnitPrice,
      deadline: p.deadline,
      status: p.status,
      notes: p.notes,
    });
    setFormError(null);
    setOpen(true);
  };

  const save = async () => {
    if (!form.clientId) {
      setFormError("顧客を選択してください");
      return;
    }
    if (!form.name.trim()) {
      setFormError("作業品名称は必須です");
      return;
    }
    if (form.orderQty <= 0) {
      setFormError("受注数量を入力してください");
      return;
    }
    try {
    await update((prev) => {
      if (editing) {
        return {
          ...prev,
          projects: prev.projects.map((p) =>
            p.id === editing.id ? { ...p, ...form } : p
          ),
        };
      }
      const project: Project = {
        ...form,
        id: newId("prj"),
        createdAt: new Date().toISOString(),
      };
      return { ...prev, projects: [...prev.projects, project] };
    });
    setOpen(false);
    toast(editing ? "案件を更新しました" : "案件を登録しました。次は内職者へ出荷してください。", "success");
    } catch {
      setFormError("保存に失敗しました");
      toast("保存に失敗しました", "error");
    }
  };

  const remove = async (p: Project) => {
    const used =
      data.assignments.some((a) => a.projectId === p.id) ||
      data.deliveries.some((d) => d.projectId === p.id);
    if (used) {
      toast("出荷または納品が紐づいているため削除できません", "error");
      return;
    }
    const ok = await confirmAction({
      title: "案件を削除",
      message: `「${p.name}」を削除します。よろしいですか？`,
      confirmLabel: "削除する",
      danger: true,
    });
    if (!ok) return;
    try {
      await update((prev) => ({
        ...prev,
        projects: prev.projects.filter((x) => x.id !== p.id),
      }));
      toast("案件を削除しました", "success");
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

  const statusTone = (s: ProjectStatus) => {
    if (s === "in_progress") return "blue" as const;
    if (s === "open") return "amber" as const;
    if (s === "completed") return "emerald" as const;
    return "slate" as const;
  };

  return (
    <DashboardLayout>
      <div className="fade-in">
        <PageHeader
          title="案件管理"
          description="発注元からの受注を登録します。登録後は「出荷登録」で内職者に割り振ってください。"
          actions={
            <button type="button" className="btn btn-primary" onClick={openNew}>
              案件登録
            </button>
          }
        />

        <WorkflowGuide compact />

        <SearchBar value={q} onChange={setQ} placeholder="案件名・顧客名で検索" />

        {projects.length === 0 ? (
          <section className="card-flat card">
            <EmptyState
              message="案件がまだありません"
              hint={
                data.clients.length === 0
                  ? "先に発注元（顧客）を1件登録すると、案件を作れます。"
                  : "「案件登録」から受注数量・顧客単価・内職単価を入力してください。"
              }
              actionLabel={data.clients.length === 0 ? "発注元を登録" : "最初の案件を登録"}
              actionHref={data.clients.length === 0 ? "/clients" : undefined}
              onAction={data.clients.length === 0 ? undefined : openNew}
            />
          </section>
        ) : (
          <div className="space-y-4">
            {projects.map((p) => {
              const shipped = shippedQty(data, p.id);
              const delivered = deliveredQty(data, p.id);
              const remain = remainingShipQty(data, p.id);
              return (
                <section key={p.id} className="card-flat card">
                  <div className="flex flex-wrap justify-between gap-4 items-start">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="h3">{p.name}</h2>
                        <StatusBadge
                          label={projectStatusLabel(p.status)}
                          tone={statusTone(p.status)}
                        />
                      </div>
                      <p className="text-sm text-slate-500">
                        顧客: <strong>{clientName(data, p.clientId)}</strong>
                      </p>
                      {p.description && (
                        <p className="text-sm text-slate-500 mt-1">{p.description}</p>
                      )}
                    </div>
                    <div className="text-right text-sm space-y-1">
                      <p>
                        受注: <strong>{p.orderQty.toLocaleString()}</strong> / 顧客単価{" "}
                        {yen(p.unitPrice)}
                      </p>
                      <p>
                        内職単価: {yen(p.staffUnitPrice)} / 納期: {p.deadline || "—"}
                      </p>
                      <p className="text-slate-500">
                        出荷済 {shipped.toLocaleString()} / 納品済 {delivered.toLocaleString()} /
                        出荷残 {remain.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t flex flex-wrap gap-3">
                    <Link
                      href={`/logistics/assign?projectId=${p.id}`}
                      className="btn btn-primary"
                    >
                      内職者へ出荷
                    </Link>
                    <Link
                      href={`/deliveries?projectId=${p.id}`}
                      className="btn btn-outline"
                    >
                      顧客へ納品
                    </Link>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => openEdit(p)}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className="text-sm font-bold text-red-600 hover:underline px-3 min-h-11"
                      onClick={() => void remove(p)}
                    >
                      削除
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <Modal
          open={open}
          title={editing ? "案件編集" : "案件登録"}
          onClose={() => setOpen(false)}
          wide
        >
          {formError && (
            <Banner tone="error">{formError}</Banner>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Field label="顧客" required>
              <FormSelect
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              >
                <option value="">選択してください</option>
                {data.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </FormSelect>
            </Field>
            <Field label="状態">
              <FormSelect
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as ProjectStatus })
                }
              >
                <option value="open">未着手</option>
                <option value="in_progress">作業中</option>
                <option value="completed">完了</option>
                <option value="closed">終了</option>
              </FormSelect>
            </Field>
            <div className="md:col-span-2">
              <Field label="作業品名称" required>
                <FormInput
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
            </div>
            <Field label="受注数量" required>
              <FormInput
                type="number"
                min={1}
                value={form.orderQty || ""}
                onChange={(e) =>
                  setForm({ ...form, orderQty: Number(e.target.value) || 0 })
                }
              />
            </Field>
            <Field label="納期">
              <FormInput
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </Field>
            <Field label="顧客単価（円）" required>
              <FormInput
                type="number"
                min={0}
                step="any"
                value={form.unitPrice === 0 ? "" : form.unitPrice}
                onChange={(e) =>
                  setForm({ ...form, unitPrice: parseDecimal(e.target.value) })
                }
                placeholder="例: 0.9"
              />
            </Field>
            <Field label="内職者単価（円）" required>
              <FormInput
                type="number"
                min={0}
                step="any"
                value={form.staffUnitPrice === 0 ? "" : form.staffUnitPrice}
                onChange={(e) =>
                  setForm({
                    ...form,
                    staffUnitPrice: parseDecimal(e.target.value),
                  })
                }
                placeholder="例: 0.3"
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="作業内容・詳細">
                <FormTextarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>
              キャンセル
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void save()}>
              保存
            </button>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
