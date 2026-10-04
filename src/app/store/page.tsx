"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Banner, Field, FormInput, LoadingBlock, PageHeader } from "@/components/ui";
import { useFeedback } from "@/components/Feedback";
import { useData } from "@/lib/DataContext";
import type { Store } from "@/lib/types";

export default function StorePage() {
  const { data, loading, update, reset } = useData();
  const { toast, confirmAction } = useFeedback();
  const [edited, setEdited] = useState<Store | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const form = edited ?? data.store;

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingBlock />
      </DashboardLayout>
    );
  }

  const set = (key: keyof Store, value: string) =>
    setEdited({ ...form, [key]: value });

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast("店舗名称は必須です", "error");
      return;
    }
    setSaving(true);
    try {
      await update((prev) => ({ ...prev, store: form }));
      setEdited(null);
      setSaved(true);
      toast("店舗情報を保存しました。請求書・納品書に反映されます。", "success");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast("保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const ok = await confirmAction({
      title: "見本データに戻す",
      message:
        "いまの登録内容をすべて消し、最初の見本データに戻します。この操作は取り消せません。",
      confirmLabel: "見本データに戻す",
      danger: true,
    });
    if (!ok) return;
    try {
      await reset();
      setEdited(null);
      toast("見本データに戻しました", "success");
    } catch {
      toast("リセットに失敗しました", "error");
    }
  };

  return (
    <DashboardLayout>
      <div className="fade-in">
        <PageHeader
          title="店舗情報"
          description="自店の名称・住所・口座です。請求書・納品書・支払明細書に印字されます。"
          actions={
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn btn-outline" onClick={() => void handleReset()}>
                見本データに戻す
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "保存中..." : saved ? "保存しました" : "保存する"}
              </button>
            </div>
          }
        />

        <Banner tone="info">
          Google スプレッドシート未設定でも、この画面の内容と見本データだけで運用デモができます。
        </Banner>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <section className="card-flat card space-y-4">
            <h2 className="h3 mb-2">基本情報</h2>
            <Field label="店舗名称" required>
              <FormInput value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="住所">
              <FormInput value={form.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="電話">
                <FormInput value={form.tel} onChange={(e) => set("tel", e.target.value)} />
              </Field>
              <Field label="FAX">
                <FormInput value={form.fax} onChange={(e) => set("fax", e.target.value)} />
              </Field>
            </div>
            <Field label="メール">
              <FormInput
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
            <Field label="インボイス登録番号">
              <FormInput
                value={form.invoiceNumber}
                onChange={(e) => set("invoiceNumber", e.target.value)}
                placeholder="T1234567890123"
              />
            </Field>
          </section>

          <section className="card-flat card space-y-4">
            <h2 className="h3 mb-2">振込口座</h2>
            <Field label="銀行名">
              <FormInput value={form.bankName} onChange={(e) => set("bankName", e.target.value)} />
            </Field>
            <Field label="支店名">
              <FormInput
                value={form.bankBranch}
                onChange={(e) => set("bankBranch", e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="口座種別">
                <FormInput
                  value={form.bankAccountType}
                  onChange={(e) => set("bankAccountType", e.target.value)}
                  placeholder="普通"
                />
              </Field>
              <Field label="口座番号">
                <FormInput
                  value={form.bankAccountNumber}
                  onChange={(e) => set("bankAccountNumber", e.target.value)}
                />
              </Field>
            </div>
            <Field label="口座名義">
              <FormInput
                value={form.bankAccountHolder}
                onChange={(e) => set("bankAccountHolder", e.target.value)}
              />
            </Field>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
