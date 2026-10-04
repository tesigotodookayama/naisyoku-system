import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PORTAL_COOKIE } from "@/lib/portalAuth";
import { resolvePortalSession } from "@/lib/portalSession";
import PasswordForm from "./PasswordForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PortalPasswordPage() {
  const jar = await cookies();
  const session = await resolvePortalSession(jar.get(PORTAL_COOKIE)?.value);
  if (!session) {
    redirect("/portal/login");
  }
  return <PasswordForm loginId={session.loginId} />;
}
