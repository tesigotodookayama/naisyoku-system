"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Banner, Field, FormInput, PageHeader } from "@/components/ui";
import { useFeedback } from "@/components/Feedback";
import {
  MIN_ADMIN_PASSWORD_LENGTH,
  validatePasswordChange,
} from "@/lib/adminPasswordPolicy";

type PasswordStatus = {
  loginId: string;
  passwordChanged: boolean;
  storage?: "postgres" | "file";
  persistent: boolean;
  minLength: number;
};

export default function AccountPage() {
  const { toast } = useFeedback();
  const [status, setStatus] = useState<PasswordStatus | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/password", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as PasswordStatus;
        if (!cancelled) setStatus(json);
      } catch {
        // The form still works; the server checks the password.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      const res = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        persistent?: boolean;
        storage?: "postgres" | "file";
      } | null;
      if (!res.ok || !json?.ok) {
        setError(json?.message || "パスワードを変更できませんでした。もう一度お試しください。");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              passwordChanged: true,
              persistent: json.persistent ?? prev.persistent,
              storage: json.storage ?? prev.storage,
            }
          : prev
      );
      toast(json.message || "パスワードを変更しました。このまま作業を続けられます。", "success");
    } catch {
      setError("通信に失敗しました。しばらくしてからもう一度お試しください。");
    } finally {
      setBusy(false);
    }
  };

  const minLength = status?.minLength ?? MIN_ADMIN_PASSWORD_LENGTH;

  return (
    <DashboardLayout>
      <div className="fade-in max-w-xl space-y-4">
        <PageHeader
          title="パスワード変更"
          description="管理者としてログインするときのパスワードを変えます。ログインIDはそのままです。変えたあとも、ログアウトせずにこの画面のまま使えます。"
        />

        {status?.storage === "postgres" && (
          <Banner tone="info">
            パスワードは暗号化してデータベースに保存します。変更すると、見本のパスワードでは入れなくなります。
          </Banner>
        )}
        {status && status.storage !== "postgres" && status.persistent && (
          <Banner tone="info">
            パスワードは暗号化してこのパソコンのファイルに保存します。変更すると、見本のパスワードでは入れなくなります。
          </Banner>
        )}
        {status && status.storage !== "postgres" && !status.persistent && (
          <Banner tone="warn">
            ここでは変更したパスワードが消えることがあります。消えてもログインできなくなることはありません。見本のパスワード、または環境変数のパスワードで入れます。
          </Banner>
        )}

        <form
          noValidate
          onSubmit={(event) => void handleSubmit(event)}
          className="card-flat card space-y-4"
        >
          {status?.loginId && (
            <p className="text-sm text-slate-600">
              ログインID: <span className="font-mono font-bold text-slate-900">{status.loginId}</span>
            </p>
          )}
          {status?.passwordChanged && (
            <p className="text-sm text-slate-600">
              すでにパスワードは変更済みです。「現在のパスワード」には、いま使っているパスワードを入れてください。
            </p>
          )}
          {error && <Banner tone="error">{error}</Banner>}

          <Field
            label="現在のパスワード"
            htmlFor="current-password"
            required
            hint="いまログインに使っているパスワードです。"
          >
            <FormInput
              id="current-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </Field>
          <Field
            label="新しいパスワード"
            htmlFor="new-password"
            required
            hint={`${minLength}文字以上にしてください。今のパスワードと同じものは使えません。`}
          >
            <FormInput
              id="new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </Field>
          <Field
            label="新しいパスワード（確認）"
            htmlFor="confirm-password"
            required
            hint="新しいパスワードをもう一度入力してください。"
          >
            <FormInput
              id="confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </Field>

          <button type="submit" className="btn btn-primary min-h-12" disabled={busy}>
            {busy ? "変更しています..." : "パスワードを変更する"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
