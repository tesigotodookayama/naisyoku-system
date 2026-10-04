"use client";

import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
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
import { useFeedback } from "@/components/Feedback";
import { useData } from "@/lib/DataContext";
import { newId, paymentTotal, yen, activityYearMonth } from "@/lib/business";
import {
  validatePortalLoginId,
  validatePortalPassword,
} from "@/lib/portalPasswordPolicy";
import type { Staff } from "@/lib/types";

const emptyStaff = (): Omit<Staff, "id" | "createdAt"> => ({
  name: "",
  tel: "",
  emergencyTel: "",
  email: "",
  address: "",
  postalCode: "",
  bankName: "",
  bankBranch: "",
  bankAccountType: "普通",
  bankAccountNumber: "",
  bankAccountHolder: "",
  skills: "",
  status: "active",
  notes: "",
  loginId: "",
});

const CONFIRM_MISMATCH = "新しいパスワード（確認）が一致しません。もう一度入力してください。";

export default function StaffPage() {
  const { data, loading, update } = useData();
  const { toast, confirmAction } = useFeedback();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState(emptyStaff());
  const [formError, setFormError] = useState<string | null>(null);
  const [portalPassword, setPortalPassword] = useState("");
  const [portalPasswordConfirm, setPortalPasswordConfirm] = useState("");
  const [passwordSet, setPasswordSet] = useState<Record<string, boolean>>({});
  const [passwordReady, setPasswordReady] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwStaff, setPwStaff] = useState<Staff | null>(null);
  const [pwLoginId, setPwLoginId] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  const loadPasswordStatus = async () => {
    try {
      const res = await fetch("/api/admin/staff-password", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as {
        ok?: boolean;
        items?: { staffId: string; hasPassword: boolean }[];
      };
      if (!json.ok || !json.items) return;
      const next: Record<string, boolean> = {};
      for (const item of json.items) {
        if (item.hasPassword) next[item.staffId] = true;
      }
      setPasswordSet(next);
      setPasswordReady(true);
    } catch {
      // The list still works. Status stays hidden until the next load.
    }
  };

  useEffect(() => {
    void loadPasswordStatus();
  }, []);

  const staffList = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.staff.filter(
      (s) =>
        !term ||
        s.name.toLowerCase().includes(term) ||
        s.skills.toLowerCase().includes(term) ||
        s.tel.includes(term) ||
        s.loginId.toLowerCase().includes(term)
    );
  }, [data.staff, q]);

  const clearPortalFields = () => {
    setPortalPassword("");
    setPortalPasswordConfirm("");
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyStaff());
    clearPortalFields();
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (s: Staff) => {
    setEditing(s);
    setForm({
      name: s.name,
      tel: s.tel,
      emergencyTel: s.emergencyTel ?? "",
      email: s.email,
      address: s.address,
      postalCode: s.postalCode,
      bankName: s.bankName,
      bankBranch: s.bankBranch,
      bankAccountType: s.bankAccountType,
      bankAccountNumber: s.bankAccountNumber,
      bankAccountHolder: s.bankAccountHolder,
      skills: s.skills,
      status: s.status,
      notes: s.notes,
      loginId: s.loginId ?? "",
    });
    clearPortalFields();
    setFormError(null);
    setOpen(true);
  };

  const openPassword = (s: Staff) => {
    setPwStaff(s);
    setPwLoginId(s.loginId ?? "");
    setPwNew("");
    setPwConfirm("");
    setPwError(null);
    setPwOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setFormError("氏名は必須です");
      return;
    }
    const loginId = form.loginId.trim();
    const wantsPassword = portalPassword.length > 0 || portalPasswordConfirm.length > 0;
    if (loginId || wantsPassword) {
      const loginError = validatePortalLoginId(loginId);
      if (loginError) {
        setFormError(loginError);
        return;
      }
    }
    if (wantsPassword) {
      const passwordError = validatePortalPassword(portalPassword);
      if (passwordError) {
        setFormError(passwordError);
        return;
      }
      if (portalPasswordConfirm !== portalPassword) {
        setFormError(CONFIRM_MISMATCH);
        return;
      }
    }
    const duplicate = data.staff.some(
      (s) =>
        s.id !== editing?.id &&
        loginId.length > 0 &&
        s.loginId.trim().toLowerCase() === loginId.toLowerCase()
    );
    if (duplicate) {
      setFormError("このログインIDは別の内職者が使っています。");
      return;
    }

    const staffId = editing?.id ?? newId("stf");
    const nextForm = { ...form, loginId };
    try {
      await update((prev) => {
        if (editing) {
          return {
            ...prev,
            staff: prev.staff.map((s) => (s.id === editing.id ? { ...s, ...nextForm } : s)),
          };
        }
        const staff: Staff = {
          ...nextForm,
          id: staffId,
          createdAt: new Date().toISOString(),
        };
        return { ...prev, staff: [...prev.staff, staff] };
      });
    } catch {
      setFormError("保存に失敗しました");
      toast("保存に失敗しました", "error");
      return;
    }

    if (!wantsPassword) {
      setOpen(false);
      toast(editing ? "内職者情報を更新しました" : "内職者を登録しました", "success");
      return;
    }

    try {
      const res = await fetch("/api/admin/staff-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          loginId,
          password: portalPassword,
          confirmPassword: portalPasswordConfirm,
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !json?.ok) {
        setFormError(json?.message || "パスワードを保存できませんでした。");
        toast(json?.message || "パスワードを保存できませんでした。", "error");
        return;
      }
      setPasswordSet((prev) => ({ ...prev, [staffId]: true }));
      setPasswordReady(true);
      setOpen(false);
      toast(json.message || "マイページのパスワードを設定しました。", "success");
    } catch {
      setFormError("パスワードの保存に失敗しました。もう一度お試しください。");
      toast("パスワードの保存に失敗しました。", "error");
    }
  };

  const savePassword = async () => {
    if (!pwStaff) return;
    const loginId = pwLoginId.trim();
    const loginError = validatePortalLoginId(loginId);
    if (loginError) {
      setPwError(loginError);
      return;
    }
    const passwordError = validatePortalPassword(pwNew);
    if (passwordError) {
      setPwError(passwordError);
      return;
    }
    if (pwConfirm !== pwNew) {
      setPwError(CONFIRM_MISMATCH);
      return;
    }
    const duplicate = data.staff.some(
      (s) => s.id !== pwStaff.id && s.loginId.trim().toLowerCase() === loginId.toLowerCase()
    );
    if (duplicate) {
      setPwError("このログインIDは別の内職者が使っています。");
      return;
    }

    setPwBusy(true);
    setPwError(null);
    try {
      if (pwStaff.loginId !== loginId) {
        await update((prev) => ({
          ...prev,
          staff: prev.staff.map((s) => (s.id === pwStaff.id ? { ...s, loginId } : s)),
        }));
      }
      const res = await fetch("/api/admin/staff-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: pwStaff.id,
          loginId,
          password: pwNew,
          confirmPassword: pwConfirm,
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !json?.ok) {
        setPwError(json?.message || "パスワードを保存できませんでした。");
        return;
      }
      setPasswordSet((prev) => ({ ...prev, [pwStaff.id]: true }));
      setPasswordReady(true);
      setPwOpen(false);
      toast(json.message || "マイページのパスワードを設定しました。", "success");
    } catch {
      setPwError("パスワードの保存に失敗しました。もう一度お試しください。");
    } finally {
      setPwBusy(false);
    }
  };

  const remove = async (s: Staff) => {
    const used = data.assignments.some((a) => a.staffId === s.id);
    if (used) {
      toast("出荷履歴があるため削除できません。状態を「停止」にしてください。", "error");
      return;
    }
    const ok = await confirmAction({
      title: "内職者を削除",
      message: `「${s.name}」を削除します。よろしいですか？`,
      confirmLabel: "削除する",
      danger: true,
    });
    if (!ok) return;
    try {
      await update((prev) => ({
        ...prev,
        staff: prev.staff.filter((x) => x.id !== s.id),
      }));
      await fetch(`/api/admin/staff-password?staffId=${encodeURIComponent(s.id)}`, {
        method: "DELETE",
      }).catch(() => undefined);
      setPasswordSet((prev) => {
        const next = { ...prev };
        delete next[s.id];
        return next;
      });
      toast("内職者を削除しました", "success");
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
          title="内職者管理"
          description="在宅で作業する方の連絡先・口座と、マイページ用のパスワードを管理します。出荷・入荷・支払はこの名簿に紐づきます。"
          actions={
            <button type="button" className="btn btn-primary" onClick={openNew}>
              新規内職者登録
            </button>
          }
        />

        <SearchBar value={q} onChange={setQ} placeholder="氏名・スキル・電話・ログインIDで検索" />

        {staffList.length === 0 ? (
          <section className="card-flat card">
            <EmptyState
              message="内職者がまだいません"
              hint="先に内職者を登録すると、案件への出荷割り当てができます。"
              actionLabel="最初の内職者を登録"
              onAction={openNew}
            />
          </section>
        ) : (
          <section className="card-flat card overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-slate-400 text-sm">
                  <th className="pb-3 px-2 font-semibold">氏名</th>
                  <th className="pb-3 px-2 font-semibold">連絡先</th>
                  <th className="pb-3 px-2 font-semibold">スキル</th>
                  <th className="pb-3 px-2 font-semibold">状態</th>
                  <th className="pb-3 px-2 font-semibold">マイページ</th>
                  <th className="pb-3 px-2 font-semibold text-right">対象月の報酬</th>
                  <th className="pb-3 px-2 font-semibold text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {staffList.map((s) => {
                  const ym = activityYearMonth(data);
                  const reward = paymentTotal(data, { staffId: s.id, yearMonth: ym });
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-4 px-2 font-bold">{s.name}</td>
                      <td className="py-4 px-2 text-sm">
                        <div>電話: {s.tel || "—"}</div>
                        <div className="text-slate-500">
                          緊急: {s.emergencyTel || "—"}
                        </div>
                        <div className="text-slate-400">{s.email}</div>
                      </td>
                      <td className="py-4 px-2 text-sm">{s.skills || "—"}</td>
                      <td className="py-4 px-2">
                        <StatusBadge
                          label={s.status === "active" ? "稼働中" : "停止"}
                          tone={s.status === "active" ? "emerald" : "slate"}
                        />
                      </td>
                      <td className="py-4 px-2 text-sm">
                        <div className="font-mono">{s.loginId.trim() || "ID未設定"}</div>
                        <div className="mt-1">
                          {passwordReady ? (
                            <StatusBadge
                              label={passwordSet[s.id] ? "設定済み" : "未設定"}
                              tone={passwordSet[s.id] ? "emerald" : "slate"}
                            />
                          ) : (
                            <span className="text-slate-400">確認中</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-2 text-right font-bold text-primary">
                        {yen(reward)}
                      </td>
                      <td className="py-4 px-2 text-right space-x-3">
                        <button
                          type="button"
                          className="text-sm font-bold text-primary hover:underline min-h-11"
                          onClick={() => openPassword(s)}
                        >
                          パスワード設定
                        </button>
                        <button
                          type="button"
                          className="text-sm font-bold text-primary hover:underline min-h-11"
                          onClick={() => openEdit(s)}
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          className="text-sm font-bold text-red-600 hover:underline min-h-11"
                          onClick={() => void remove(s)}
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        <Modal
          open={open}
          title={editing ? "内職者編集" : "新規内職者登録"}
          onClose={() => setOpen(false)}
          wide
        >
          {formError && (
            <p className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 text-red-800 font-bold px-4 py-3">
              {formError}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="氏名" required>
              <FormInput
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="状態">
              <FormSelect
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as Staff["status"] })
                }
              >
                <option value="active">稼働中</option>
                <option value="inactive">停止</option>
              </FormSelect>
            </Field>
            <div className="md:col-span-2 rounded-xl border-2 border-amber-200 bg-amber-50 p-4 space-y-4">
              <div>
                <p className="font-bold text-amber-950">マイページ</p>
                <p className="text-sm text-amber-900 mt-1">
                  内職者さんが自分の画面に入るためのIDとパスワードです。パスワードは保存したあと、画面には出ません。編集のとき、パスワードを空欄のまま保存すると、今のパスワードのままです。
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="マイページ用ログインID"
                  htmlFor="staff-login-id"
                  hint="英数字4〜32文字。例: sato001"
                >
                  <FormInput
                    id="staff-login-id"
                    value={form.loginId}
                    autoComplete="off"
                    onChange={(e) => setForm({ ...form, loginId: e.target.value })}
                  />
                </Field>
                <Field
                  label="マイページ用パスワード"
                  htmlFor="staff-portal-password"
                  hint="8文字以上。空欄なら今のパスワードのままです。"
                >
                  <FormInput
                    id="staff-portal-password"
                    type="password"
                    autoComplete="new-password"
                    value={portalPassword}
                    onChange={(e) => setPortalPassword(e.target.value)}
                  />
                </Field>
                <Field
                  label="マイページ用パスワード（確認）"
                  htmlFor="staff-portal-password-confirm"
                  hint="パスワードを入れるときだけ、もう一度同じものを入れてください。"
                >
                  <FormInput
                    id="staff-portal-password-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={portalPasswordConfirm}
                    onChange={(e) => setPortalPasswordConfirm(e.target.value)}
                  />
                </Field>
              </div>
            </div>
            <Field label="電話">
              <FormInput
                value={form.tel}
                onChange={(e) => setForm({ ...form, tel: e.target.value })}
              />
            </Field>
            <Field label="緊急連絡先電話">
              <FormInput
                value={form.emergencyTel}
                onChange={(e) => setForm({ ...form, emergencyTel: e.target.value })}
                placeholder="緊急時の連絡先"
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
            <Field label="スキル">
              <FormInput
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
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
            <Field label="銀行名">
              <FormInput
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              />
            </Field>
            <Field label="支店名">
              <FormInput
                value={form.bankBranch}
                onChange={(e) => setForm({ ...form, bankBranch: e.target.value })}
              />
            </Field>
            <Field label="口座種別">
              <FormInput
                value={form.bankAccountType}
                onChange={(e) => setForm({ ...form, bankAccountType: e.target.value })}
              />
            </Field>
            <Field label="口座番号">
              <FormInput
                value={form.bankAccountNumber}
                onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="口座名義">
                <FormInput
                  value={form.bankAccountHolder}
                  onChange={(e) => setForm({ ...form, bankAccountHolder: e.target.value })}
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

        <Modal
          open={pwOpen}
          title="パスワード設定"
          onClose={() => setPwOpen(false)}
        >
          <p className="text-sm text-slate-600 mb-4">
            {pwStaff ? `${pwStaff.name} さんのマイページ用パスワードを設定します。` : ""}
            いまのパスワードは表示しません。新しいパスワードは8文字以上にしてください。
          </p>
          {pwError && (
            <p className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 text-red-800 font-bold px-4 py-3">
              {pwError}
            </p>
          )}
          <div className="space-y-4">
            <Field label="マイページ用ログインID" htmlFor="pw-login-id" required hint="英数字4〜32文字">
              <FormInput
                id="pw-login-id"
                value={pwLoginId}
                autoComplete="off"
                onChange={(e) => setPwLoginId(e.target.value)}
              />
            </Field>
            <Field label="新しいパスワード" htmlFor="pw-new" required hint="8文字以上">
              <FormInput
                id="pw-new"
                type="password"
                autoComplete="new-password"
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
              />
            </Field>
            <Field label="新しいパスワード（確認）" htmlFor="pw-confirm" required>
              <FormInput
                id="pw-confirm"
                type="password"
                autoComplete="new-password"
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
              />
            </Field>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" className="btn btn-outline" onClick={() => setPwOpen(false)}>
              キャンセル
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={pwBusy}
              onClick={() => void savePassword()}
            >
              {pwBusy ? "保存しています..." : "パスワードを保存"}
            </button>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
