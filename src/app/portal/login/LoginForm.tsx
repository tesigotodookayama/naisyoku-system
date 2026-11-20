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

export default function PortalLoginForm({
  initialError,
  action,
}: {
  initialError?: string;
  action: string;
}) {
  const error = messageForError(initialError);
  const [busy, setBusy] = useState(false);

  return (
    <>
      {error && (
        <div className="mb-5 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl p-4 text-center font-bold">
          {error}
        </div>
      )}

      <form
        method="POST"
        action={action}
        className="space-y-5"
        onSubmit={() => setBusy(true)}
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
        <button type="submit" className="btn btn-primary w-full py-4 text-lg">
          {busy ? "確認中…" : "ログインする"}
        </button>
      </form>
    </>
  );
}
