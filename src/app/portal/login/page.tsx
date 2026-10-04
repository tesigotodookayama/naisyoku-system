export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const errorMessage =
    sp.error === "unset"
      ? "パスワードが未設定です。事務所に連絡して、マイページ用パスワードを設定してもらってください。"
      : sp.error === "changed" || sp.error === "1"
          ? "IDまたはパスワードが正しくありません。"
          : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-amber-300 font-bold">てしごと堂</p>
          <h1 className="text-3xl font-black text-white mt-2">内職者マイページ</h1>
          <p className="text-slate-300 mt-2">作業実績と振込先の確認用です</p>
        </div>

        <div className="rounded-2xl p-6 sm:p-8 bg-white shadow-2xl">
          {errorMessage && (
            <div className="mb-5 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl p-4 text-center font-bold">
              {errorMessage}
            </div>
          )}

          <form method="POST" action="/api/portal/login" className="space-y-5">
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
              ログインする
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
