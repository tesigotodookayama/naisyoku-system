"use client";

import { useState } from "react";

const WRONG_PASSWORD = "IDまたはパスワードが正しくありません。";
const UNSET_PASSWORD =
  "パスワードが未設定です。事務所に連絡して、マイページ用パスワードを設定してもらってください。";

function messageForError(code: string | undefined): string | null {
  if (code === "unset") return UNSET_PASSWORD;
  if (code === "changed" || code === "1") return WRONG_PASSWORD;
  return null;
}

export default function PortalLoginForm({ initialError }: { initialError?: string }) {
  const [error, setError] = useState<string | null>(messageForError(initialError));
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        body: new FormData(event.currentTarget),
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      const htmlOk =
        res.ok && (res.headers.get("content-type") ?? "").includes("text/html");
      if (res.ok && (json?.ok || htmlOk)) {
        location.replace("/portal/my");
        return;
      }
      const message = messageForError(json?.error) ?? WRONG_PASSWORD;
      setError(message);
    } catch {
      location.replace("/portal/login?error=1");
      return;
    }
    setBusy(false);
  }

  return (
    <>
      {error && (
        <div className="mb-5 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl p-4 text-center font-bold">
          {error}
        </div>
      )}

      <form
        method="POST"
        action="/api/portal/login"
        className="space-y-5"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div className="space-y-2">
          <label className="font-bold block text-slate-800" htmlFor="portal-id">
            ログインID
          </label>
          <input
            id="portal-id"
            name="id"
            type="text"
            required
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="ログインID"
            className="w-full min-h-12 py-3 px-4 text-lg rounded-xl border-2"
          />
        </div>
        <div className="space-y-2">
          <label className="font-bold block text-slate-800" htmlFor="portal-pass">
            パスワード
          </label>
          <input
            id="portal-pass"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="パスワード"
            className="w-full min-h-12 py-3 px-4 text-lg rounded-xl border-2"
          />
        </div>
        <button type="submit" className="btn btn-primary w-full py-4 text-lg" disabled={busy}>
          {busy ? "確認中…" : "ログインする"}
        </button>
      </form>
    </>
  );
}
