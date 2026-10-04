"use client";

import React, { useState } from "react";
import { Banner, Field, FormInput } from "@/components/ui";
import { useFeedback } from "@/components/Feedback";
import {
  MIN_ADMIN_PASSWORD_LENGTH,
  validatePasswordChange,
} from "@/lib/adminPasswordPolicy";

export default function PasswordForm({ loginId }: { loginId: string }) {
  const { toast } = useFeedback();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const formError = validatePasswordChange({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (formError) {
      setError(formError);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/portal/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
      } | null;
      if (!res.ok || !json?.ok) {
        setError(json?.message || "パスワードを変更できませんでした。もう一度お試しください。");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast(json.message || "パスワードを変更しました。このままマイページを使えます。", "success");
    } catch {
      setError("通信に失敗しました。しばらくしてからもう一度お試しください。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffde7]">
      <header className="bg-primary text-white px-4 py-4 flex justify-between items-center gap-3">
        <div>
          <p className="text-sm opacity-90">てしごと堂 内職者ポータル</p>
          <h1 className="text-xl font-black">パスワード変更</h1>
        </div>
        <a
          href="/portal/my"
          className="min-h-11 px-3 rounded-xl bg-white/20 font-bold inline-flex items-center"
        >
          マイページへ
        </a>
      </header>

      <main className="max-w-xl mx-auto p-4">
        <p className="text-slate-700 mb-4">
          いま使っているパスワードを入れて、新しいパスワードに変えます。変えたあとも、ログアウトせずにマイページを使えます。
        </p>
        <form
          noValidate
          onSubmit={(event) => void handleSubmit(event)}
          className="card-flat card space-y-4"
        >
          <p className="text-sm text-slate-600">
            ログインID: <span className="font-mono font-bold text-slate-900">{loginId}</span>
          </p>
          {error && <Banner tone="error">{error}</Banner>}
          <Field
            label="現在のパスワード"
            htmlFor="portal-current-password"
            required
            hint="いまログインに使っているパスワードです。"
          >
            <FormInput
              id="portal-current-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </Field>
          <Field
            label="新しいパスワード"
            htmlFor="portal-new-password"
            required
            hint={`${MIN_ADMIN_PASSWORD_LENGTH}文字以上にしてください。今のパスワードと同じものは使えません。`}
          >
            <FormInput
              id="portal-new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </Field>
          <Field
            label="新しいパスワード（確認）"
            htmlFor="portal-confirm-password"
            required
            hint="新しいパスワードをもう一度入力してください。"
          >
            <FormInput
              id="portal-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </Field>
          <button type="submit" className="btn btn-primary min-h-12 w-full" disabled={busy}>
            {busy ? "変更しています..." : "パスワードを変更する"}
          </button>
        </form>
      </main>
    </div>
  );
}
