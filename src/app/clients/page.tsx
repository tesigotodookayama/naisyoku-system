"use client";

import React, { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  EmptyState,
  Field,
  FormInput,
  FormTextarea,
  LoadingBlock,
  Modal,
  PageHeader,
  SearchBar,
} from "@/components/ui";
import { useFeedback } from "@/components/Feedback";
import { useData } from "@/lib/DataContext";
import { newId } from "@/lib/business";
import type { Client } from "@/lib/types";

const emptyClient = (): Omit<Client, "id" | "createdAt"> => ({
  name: "",
  contactName: "",
  tel: "",
  fax: "",
  email: "",
  address: "",
  postalCode: "",
  notes: "",
});

export default function ClientsPage() {
  const { data, loading, update } = useData();
  const { toast, confirmAction } = useFeedback();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyClient());
  const [formError, setFormError] = useState<string | null>(null);

  const clients = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.clients.filter(
      (c) =>
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.contactName.toLowerCase().includes(term) ||
        c.tel.includes(term)
    );
  }, [data.clients, q]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyClient());
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({
      name: c.name,
      contactName: c.contactName,
      tel: c.tel,
      fax: c.fax,
      email: c.email,
      address: c.address,
      postalCode: c.postalCode,
      notes: c.notes,
    });
    setFormError(null);
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setFormError("顧客名は必須です");
      return;
    }
    try {
    await update((prev) => {
      if (editing) {
        return {
          ...prev,
          clients: prev.clients.map((c) =>
            c.id === editing.id ? { ...c, ...form } : c
          ),
        };
      }
      const client: Client = {
        ...form,
        id: newId("cli"),
        createdAt: new Date().toISOString(),
      };
      return { ...prev, clients: [...prev.clients, client] };
    });
    setOpen(false);
    toast(editing ? "顧客情報を更新しました" : "顧客を登録しました。次は案件を登録できます。", "success");
    } catch {
      setFormError("保存に失敗しました");
      toast("保存に失敗しました", "error");
    }
  };

  const remove = async (c: Client) => {
    const used = data.projects.some((p) => p.clientId === c.id);
    if (used) {
      toast("この顧客に紐づく案件があるため削除できません", "error");
      return;
    }
    const ok = await confirmAction({
      title: "顧客を削除",
      message: `「${c.name}」を削除します。よろしいですか？`,
      confirmLabel: "削除する",
      danger: true,
    });
    if (!ok) return;
    try {
      await update((prev) => ({
        ...prev,
        clients: prev.clients.filter((x) => x.id !== c.id),
      }));
      toast("顧客を削除しました", "success");
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
          title="発注元（顧客）"
          description="仕事を発注してくれる会社・担当者です。案件・納品・請求はこの顧客に紐づきます。"
          actions={
            <button type="button" className="btn btn-primary" onClick={openNew}>
              新規顧客登録
            </button>
          }
        />

        <SearchBar value={q} onChange={setQ} placeholder="顧客名・担当・電話で検索" />

        {clients.length === 0 ? (
          <section className="card-flat card">
            <EmptyState
              message="顧客がまだありません"
              hint="最初の発注元を登録すると、案件を作成できます。"
              actionLabel="最初の顧客を登録"
              onAction={openNew}
            />
          </section>
        ) : (
          <section className="dashboard-grid">
            {clients.map((client) => {
              const ongoing = data.projects.filter(
                (p) =>
                  p.clientId === client.id &&
                  (p.status === "open" || p.status === "in_progress")
              ).length;
              return (
                <div key={client.id} className="card-flat card group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-primary-light p-3 rounded-xl text-2xl">🏢</div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        ongoing > 0
                          ? "bg-teal-100 text-teal-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {ongoing} 案件稼働中
                    </span>
                  </div>
                  <h2 className="h3 group-hover:text-primary transition-colors">{client.name}</h2>
                  <p className="text-sm text-slate-500 mt-2">担当: {client.contactName || "—"}</p>
                  <p className="text-sm text-slate-500">TEL: {client.tel || "—"}</p>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-1">{client.address}</p>
                  <div className="mt-6 pt-4 border-t flex justify-between gap-3">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => openEdit(client)}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className="text-sm font-bold text-red-600 hover:underline min-h-11 px-3"
                      onClick={() => void remove(client)}
                    >
                      削除
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        <Modal
          open={open}
          title={editing ? "顧客編集" : "新規顧客登録"}
          onClose={() => setOpen(false)}
          wide
        >
          {formError && (
            <p className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 text-red-800 font-bold px-4 py-3">
              {formError}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="顧客名" required>
              <FormInput
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="担当者名">
              <FormInput
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
            </Field>
            <Field label="電話">
              <FormInput
                value={form.tel}
                onChange={(e) => setForm({ ...form, tel: e.target.value })}
              />
            </Field>
            <Field label="FAX">
              <FormInput
                value={form.fax}
                onChange={(e) => setForm({ ...form, fax: e.target.value })}
              />
            </Field>
            <Field label="メール">
              <FormInput
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="郵便番号">
              <FormInput
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="住所">
                <FormInput
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="備考">
                <FormTextarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
