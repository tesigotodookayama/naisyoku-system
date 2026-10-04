function safeRedirect(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (raw.startsWith("/admin/login") || raw.startsWith("/api")) return "/";
  return raw;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const redirectTo = safeRedirect(sp.redirect);
  const hasError = sp.error === "1" || sp.error === "changed";
  const errorMessage = "IDまたはパスワードが正しくありません。";

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="w-full max-w-md relative">
        <div className="text-center mb-10">
          <div
            className="w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto mb-6 border-4 border-white shadow-xl"
            style={{
              background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
            }}
          >
            🔐
          </div>
          <h1 className="text-4xl font-black text-slate-900">てしごと堂</h1>
          <div className="mt-3 inline-block px-4 py-1 bg-white border-2 border-primary rounded-full">
            <p className="text-primary font-black text-sm">内職管理システム（管理者）</p>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border-4 border-primary-light relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-primary" />

          {hasError && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-black">
              {errorMessage}
            </div>
          )}

          <form method="POST" action="/api/admin/login" className="space-y-6">
            <input type="hidden" name="redirect" value={redirectTo} />
            <div className="space-y-2">
              <label htmlFor="admin-id" className="text-slate-900 font-black text-sm ml-1">
                管理者ID
              </label>
              <input
                id="admin-id"
                name="id"
                type="text"
                required
                autoComplete="username"
                defaultValue=""
                placeholder="IDを入力"
                className="w-full min-h-12 py-4 px-5 rounded-2xl font-bold bg-slate-50 border-2 border-primary-light text-lg"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="admin-password" className="text-slate-900 font-black text-sm ml-1">
                パスワード
              </label>
              <input
                id="admin-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                defaultValue=""
                placeholder="パスワード"
                className="w-full min-h-12 py-4 px-5 rounded-2xl font-bold bg-slate-50 border-2 border-primary-light text-lg"
              />
            </div>
            <button type="submit" className="btn btn-primary w-full min-h-14 py-4 text-lg">
              管理者としてログイン
            </button>
          </form>

          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-slate-500 text-sm font-bold">
              内職者の方は{" "}
              <a href="/portal/login" className="text-primary underline">
                内職者ポータルへ
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
