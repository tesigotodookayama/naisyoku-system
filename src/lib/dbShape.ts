import type { AppData, Invoice, Staff } from "./types";
import { formatDocNo } from "./business";
import { stripAdminAuth, type DbFile } from "./adminAuthRecord";
import { defaultLoginIdForStaff } from "./portalAuth";

/** Migrate older saved JSON shapes. Does not keep adminAuth. */
export function normalizeAppData(data: AppData): AppData {
  return {
    ...data,
    staff: data.staff.map((s: Staff) => ({
      ...s,
      emergencyTel: s.emergencyTel ?? "",
      loginId:
        typeof s.loginId === "string" ? s.loginId : defaultLoginIdForStaff(s.id),
    })),
    invoices: data.invoices.map((inv: Invoice, i) => ({
      ...inv,
      number: inv.number || formatDocNo(inv.id || `legacy_${i}`),
    })),
  };
}

/** Business payload only. Drops any password hash before it can reach the browser. */
export function toPublicAppData(data: DbFile): AppData {
  return normalizeAppData(stripAdminAuth(data));
}
