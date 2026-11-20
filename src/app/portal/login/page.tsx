import { loginApiAction } from "@/lib/accessGate";
import PortalLoginForm from "./LoginForm";

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; key?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-amber-300 font-bold">てしごと堂</p>
          <h1 className="text-3xl font-black text-white mt-2">内職者マイページ</h1>
          <p className="text-slate-300 mt-2">作業実績と振込先の確認用です</p>
        </div>

        <div className="rounded-2xl p-6 sm:p-8 bg-white shadow-2xl">
          <PortalLoginForm initialError={sp.error} action={loginApiAction("portal", sp.key)} />
        </div>
      </div>
    </div>
  );
}
