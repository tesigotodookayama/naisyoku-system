import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parsePortalCookie, PORTAL_COOKIE } from "@/lib/portalAuth";
import MyPageClient from "./MyPageClient";

export default async function PortalMyPage() {
  const jar = await cookies();
  const session = parsePortalCookie(jar.get(PORTAL_COOKIE)?.value);
  if (!session) {
    redirect("/portal/login");
  }
  return <MyPageClient session={session} />;
}
