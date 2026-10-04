import type {
  AppData,
  Assignment,
  Client,
  Delivery,
  Invoice,
  InvoiceLine,
  PaymentLine,
  Project,
  Staff,
} from "./types";

/** Format yen without rounding (keeps decimals such as 0.3 / 0.9). */
export function yen(n: number): string {
  if (!Number.isFinite(n)) return "¥0";
  return `¥${n.toLocaleString("ja-JP", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  })}`;
}

/** Format number for tables (no ¥ symbol), no rounding. */
export function num(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("ja-JP", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  });
}

/** qty × unitPrice without Math.round / Math.floor. */
export function lineAmount(qty: number, unitPrice: number): number {
  return qty * unitPrice;
}

/** Stable 8-digit document number derived from an id. */
export function formatDocNo(id: string, width = 8): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) >>> 0;
  }
  const mod = 10 ** width;
  return String(h % mod).padStart(width, "0");
}

/** Stable work code like 00137200-0-00589990 (project-assignment). */
export function workCode(projectId: string, assignmentId: string): string {
  return `${formatDocNo(projectId)}-0-${formatDocNo(assignmentId)}`;
}

/** 2026-04-17 → 2026/04/17 */
export function slashDate(iso: string): string {
  return iso.replace(/-/g, "/");
}

/** 2026-07-19 → 2026年07月19日 */
export function jpDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y}年${m}月${d}日`;
}

export function nextInvoiceNumber(data: AppData): string {
  let max = 0;
  for (const inv of data.invoices) {
    const n = parseInt(inv.number || "", 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return String(max + 1).padStart(8, "0");
}

/** Parse decimal input; empty → 0. Does not round. */
export function parseDecimal(raw: string): number {
  if (raw.trim() === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function yearMonthOf(date: string): string {
  return date.slice(0, 7);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function clientById(data: AppData, id: string): Client | undefined {
  return data.clients.find((c) => c.id === id);
}

export function staffById(data: AppData, id: string): Staff | undefined {
  return data.staff.find((s) => s.id === id);
}

export function projectById(data: AppData, id: string): Project | undefined {
  return data.projects.find((p) => p.id === id);
}

export function projectName(data: AppData, projectId: string): string {
  return projectById(data, projectId)?.name ?? "(不明な案件)";
}

export function clientName(data: AppData, clientId: string): string {
  return clientById(data, clientId)?.name ?? "(不明な顧客)";
}

export function staffName(data: AppData, staffId: string): string {
  return staffById(data, staffId)?.name ?? "(不明な内職者)";
}

/** Shipped qty for a project (assignments). */
export function shippedQty(data: AppData, projectId: string): number {
  return data.assignments
    .filter((a) => a.projectId === projectId)
    .reduce((sum, a) => sum + a.qty, 0);
}

/** Arrived qty for a project. */
export function arrivedQtyForProject(data: AppData, projectId: string): number {
  return data.assignments
    .filter((a) => a.projectId === projectId && a.arrivedQty != null)
    .reduce((sum, a) => sum + (a.arrivedQty ?? 0), 0);
}

/** Delivered qty to client for a project. */
export function deliveredQty(data: AppData, projectId: string): number {
  return data.deliveries
    .filter((d) => d.projectId === projectId)
    .reduce((sum, d) => sum + d.qty, 0);
}

export function remainingShipQty(data: AppData, projectId: string): number {
  const project = projectById(data, projectId);
  if (!project) return 0;
  return Math.max(0, project.orderQty - shippedQty(data, projectId));
}

/** Remaining ship qty when editing an existing assignment (exclude its own qty). */
export function remainingShipQtyExcluding(
  data: AppData,
  projectId: string,
  excludeAssignmentId: string
): number {
  const project = projectById(data, projectId);
  if (!project) return 0;
  const shipped = data.assignments
    .filter((a) => a.projectId === projectId && a.id !== excludeAssignmentId)
    .reduce((sum, a) => sum + a.qty, 0);
  return Math.max(0, project.orderQty - shipped);
}

export function remainingDeliverQty(data: AppData, projectId: string): number {
  const project = projectById(data, projectId);
  if (!project) return 0;
  return Math.max(0, project.orderQty - deliveredQty(data, projectId));
}

export function assignmentStatus(a: Assignment): string {
  if (a.arrivedQty != null) return "入荷完了";
  return "出荷済み";
}

export function projectStatusLabel(status: Project["status"]): string {
  switch (status) {
    case "open":
      return "未着手";
    case "in_progress":
      return "作業中";
    case "completed":
      return "完了";
    case "closed":
      return "終了";
  }
}

/** Payment lines strictly filtered by staffId and optional yearMonth (arriveDate). */
export function paymentLines(
  data: AppData,
  opts?: { staffId?: string; yearMonth?: string }
): PaymentLine[] {
  return data.assignments
    .filter((a) => a.arrivedQty != null && a.arriveDate)
    .filter((a) => (opts?.staffId ? a.staffId === opts.staffId : true))
    .filter((a) =>
      opts?.yearMonth ? yearMonthOf(a.arriveDate!) === opts.yearMonth : true
    )
    .map((a) => {
      const qty = a.arrivedQty ?? 0;
      return {
        assignmentId: a.id,
        staffId: a.staffId,
        projectId: a.projectId,
        workName: a.workName,
        arrivedQty: qty,
        unitPrice: a.unitPrice,
        amount: lineAmount(qty, a.unitPrice),
        arriveDate: a.arriveDate!,
        yearMonth: yearMonthOf(a.arriveDate!),
      };
    })
    .sort((a, b) => a.arriveDate.localeCompare(b.arriveDate));
}

export function paymentTotal(
  data: AppData,
  opts?: { staffId?: string; yearMonth?: string }
): number {
  return paymentLines(data, opts).reduce((s, l) => s + l.amount, 0);
}

/** Staff payment summary for a month — one row per staff, no mixing. */
export function staffPaymentSummary(data: AppData, yearMonth: string) {
  return data.staff
    .filter((s) => s.status === "active")
    .map((s) => {
      const lines = paymentLines(data, { staffId: s.id, yearMonth });
      return {
        staffId: s.id,
        name: s.name,
        lineCount: lines.length,
        totalQty: lines.reduce((n, l) => n + l.arrivedQty, 0),
        totalAmount: lines.reduce((n, l) => n + l.amount, 0),
        lines,
      };
    })
    .filter((r) => r.totalAmount > 0 || r.lineCount > 0);
}

/** Unbilled deliveries for a client (and optional month). Strict clientId filter. */
export function unbilledDeliveries(
  data: AppData,
  opts?: { clientId?: string; yearMonth?: string }
): Delivery[] {
  return data.deliveries
    .filter((d) => d.invoiceId == null)
    .filter((d) => (opts?.clientId ? d.clientId === opts.clientId : true))
    .filter((d) =>
      opts?.yearMonth ? yearMonthOf(d.deliveryDate) === opts.yearMonth : true
    )
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
}

export function invoiceLinesForDeliveries(
  data: AppData,
  deliveries: Delivery[]
): InvoiceLine[] {
  return deliveries.map((d) => ({
    deliveryId: d.id,
    projectId: d.projectId,
    projectName: projectName(data, d.projectId),
    qty: d.qty,
    unitPrice: d.unitPrice,
    amount: lineAmount(d.qty, d.unitPrice),
    deliveryDate: d.deliveryDate,
  }));
}

/** Tax without 四捨五入 (切り捨て). */
export function calcTax(subtotal: number, rate = 0.1): number {
  return Math.floor(subtotal * rate);
}

/** Issue invoice for one client + month. Only that client's unbilled deliveries. */
export function issueInvoice(
  data: AppData,
  clientId: string,
  yearMonth: string,
  issueDate = todayISO()
): { data: AppData; invoice: Invoice } | { error: string } {
  const client = clientById(data, clientId);
  if (!client) return { error: "顧客が見つかりません" };

  const existing = data.invoices.find(
    (i) => i.clientId === clientId && i.yearMonth === yearMonth
  );
  if (existing) return { error: `${client.name} の ${yearMonth} 請求書は既に発行済みです` };

  const targets = unbilledDeliveries(data, { clientId, yearMonth });
  if (targets.length === 0) {
    return { error: "対象の未請求納品がありません" };
  }

  // Safety: every delivery must belong to this client
  if (targets.some((d) => d.clientId !== clientId)) {
    return { error: "顧客の混同を検出しました。請求書を発行できません" };
  }

  const lines = invoiceLinesForDeliveries(data, targets);
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const tax = calcTax(subtotal);
  const invoice: Invoice = {
    id: newId("inv"),
    number: nextInvoiceNumber(data),
    clientId,
    yearMonth,
    issueDate,
    deliveryIds: targets.map((d) => d.id),
    subtotal,
    tax,
    total: subtotal + tax,
    notes: "",
    createdAt: new Date().toISOString(),
  };

  const deliveryIds = new Set(invoice.deliveryIds);
  const deliveries = data.deliveries.map((d) =>
    deliveryIds.has(d.id) ? { ...d, invoiceId: invoice.id } : d
  );

  return {
    data: { ...data, deliveries, invoices: [...data.invoices, invoice] },
    invoice,
  };
}

export function invoiceDetail(data: AppData, invoiceId: string) {
  const invoice = data.invoices.find((i) => i.id === invoiceId);
  if (!invoice) return null;
  const deliveries = data.deliveries.filter((d) => d.invoiceId === invoice.id);
  // Safety check: all deliveries must match invoice.clientId
  const mixed = deliveries.filter((d) => d.clientId !== invoice.clientId);
  const lines = invoiceLinesForDeliveries(data, deliveries);
  return {
    invoice,
    client: clientById(data, invoice.clientId),
    lines,
    mixedClientError: mixed.length > 0,
  };
}

export type MonthlyReport = {
  yearMonth: string;
  revenue: number;
  staffCost: number;
  profit: number;
  deliveryCount: number;
  arrivalCount: number;
  invoiceCount: number;
  clientBreakdown: { clientId: string; name: string; amount: number }[];
  staffBreakdown: { staffId: string; name: string; amount: number }[];
};

export function monthlyReport(data: AppData, yearMonth: string): MonthlyReport {
  const deliveries = data.deliveries.filter(
    (d) => yearMonthOf(d.deliveryDate) === yearMonth
  );
  const revenue = deliveries.reduce((s, d) => s + d.qty * d.unitPrice, 0);
  const payLines = paymentLines(data, { yearMonth });
  const staffCost = payLines.reduce((s, l) => s + l.amount, 0);

  const clientMap = new Map<string, number>();
  for (const d of deliveries) {
    clientMap.set(d.clientId, (clientMap.get(d.clientId) ?? 0) + d.qty * d.unitPrice);
  }
  const staffMap = new Map<string, number>();
  for (const l of payLines) {
    staffMap.set(l.staffId, (staffMap.get(l.staffId) ?? 0) + l.amount);
  }

  return {
    yearMonth,
    revenue,
    staffCost,
    profit: revenue - staffCost,
    deliveryCount: deliveries.length,
    arrivalCount: payLines.length,
    invoiceCount: data.invoices.filter((i) => i.yearMonth === yearMonth).length,
    clientBreakdown: [...clientMap.entries()].map(([clientId, amount]) => ({
      clientId,
      name: clientName(data, clientId),
      amount,
    })),
    staffBreakdown: [...staffMap.entries()].map(([staffId, amount]) => ({
      staffId,
      name: staffName(data, staffId),
      amount,
    })),
  };
}

/** Latest year-month that has deliveries, arrivals, or invoices (falls back to calendar month). */
export function activityYearMonth(data: AppData): string {
  const set = new Set<string>();
  data.deliveries.forEach((d) => set.add(yearMonthOf(d.deliveryDate)));
  data.assignments.forEach((a) => {
    if (a.arriveDate) set.add(yearMonthOf(a.arriveDate));
  });
  data.invoices.forEach((i) => set.add(i.yearMonth));
  const months = [...set].filter(Boolean).sort();
  return months[months.length - 1] || todayISO().slice(0, 7);
}

export function dashboardStats(data: AppData) {
  const activeProjects = data.projects.filter(
    (p) => p.status === "open" || p.status === "in_progress"
  ).length;
  const pendingArrivals = data.assignments.filter((a) => a.arrivedQty == null).length;
  const ym = activityYearMonth(data);
  const monthlyRevenue = data.deliveries
    .filter((d) => yearMonthOf(d.deliveryDate) === ym)
    .reduce((s, d) => s + d.qty * d.unitPrice, 0);
  const homeworkerCount = data.staff.filter((s) => s.status === "active").length;
  const unbilledCount = unbilledDeliveries(data).length;
  return {
    activeProjects,
    pendingArrivals,
    monthlyRevenue,
    homeworkerCount,
    activityMonth: ym,
    unbilledCount,
  };
}

/** Readable error if qty would exceed remaining ship capacity. */
export function validateShipQty(
  data: AppData,
  projectId: string,
  qty: number,
  excludeAssignmentId?: string
): string | null {
  if (!Number.isFinite(qty) || qty <= 0) {
    return "出荷数は1以上で入力してください";
  }
  const remain = excludeAssignmentId
    ? remainingShipQtyExcluding(data, projectId, excludeAssignmentId)
    : remainingShipQty(data, projectId);
  if (qty > remain) {
    return `出荷残（${remain.toLocaleString()}）を超えています。受注数を超える出荷は登録できません。`;
  }
  return null;
}

export function remainingDeliverQtyExcluding(
  data: AppData,
  projectId: string,
  excludeDeliveryId: string
): number {
  const project = projectById(data, projectId);
  if (!project) return 0;
  const delivered = data.deliveries
    .filter((d) => d.projectId === projectId && d.id !== excludeDeliveryId)
    .reduce((sum, d) => sum + d.qty, 0);
  return Math.max(0, project.orderQty - delivered);
}

/** Readable error if qty would exceed remaining deliver capacity. */
export function validateDeliverQty(
  data: AppData,
  projectId: string,
  qty: number,
  excludeDeliveryId?: string
): string | null {
  if (!Number.isFinite(qty) || qty <= 0) {
    return "納品数量は1以上で入力してください";
  }
  const remain = excludeDeliveryId
    ? remainingDeliverQtyExcluding(data, projectId, excludeDeliveryId)
    : remainingDeliverQty(data, projectId);
  if (qty > remain) {
    return `納品残（${remain.toLocaleString()}）を超えています。受注数を超える納品は登録できません。`;
  }
  return null;
}

/** Readable error for arrival inspection qty. */
export function validateArriveQty(
  assignment: Assignment,
  arrivedQty: number
): string | null {
  if (!Number.isFinite(arrivedQty) || arrivedQty < 0) {
    return "入荷数量が不正です";
  }
  if (arrivedQty > assignment.qty) {
    return `入荷数量が出荷数（${assignment.qty.toLocaleString()}）を超えています。検品数量を確認してください。`;
  }
  return null;
}

export type OperatorAction = {
  label: string;
  href: string;
  detail: string;
  tone: "amber" | "teal" | "indigo" | "slate";
};

/** Next steps for the operator, based on current data. */
export function nextOperatorActions(data: AppData): OperatorAction[] {
  const actions: OperatorAction[] = [];
  const pendingArrivals = data.assignments.filter((a) => a.arrivedQty == null);
  if (pendingArrivals.length > 0) {
    actions.push({
      label: "入荷検品",
      href: "/logistics?tab=arrival",
      detail: `入荷待ちが ${pendingArrivals.length} 件あります`,
      tone: "amber",
    });
  }

  const unbilled = unbilledDeliveries(data);
  if (unbilled.length > 0) {
    actions.push({
      label: "請求書発行",
      href: "/finance?tab=billing",
      detail: `未請求の納品が ${unbilled.length} 件あります`,
      tone: "indigo",
    });
  }

  const openProjects = data.projects.filter(
    (p) => p.status === "open" || p.status === "in_progress"
  );
  const withRemain = openProjects.filter((p) => remainingShipQty(data, p.id) > 0);
  if (withRemain.length > 0) {
    actions.push({
      label: "内職者へ出荷",
      href: "/logistics/assign",
      detail: `出荷残がある案件が ${withRemain.length} 件あります`,
      tone: "teal",
    });
  }

  const arrivedNotDelivered = openProjects.filter((p) => {
    const arrived = arrivedQtyForProject(data, p.id);
    const delivered = deliveredQty(data, p.id);
    return arrived > delivered;
  });
  if (arrivedNotDelivered.length > 0) {
    actions.push({
      label: "顧客へ納品",
      href: "/deliveries",
      detail: `入荷済みで未納品の案件が ${arrivedNotDelivered.length} 件あります`,
      tone: "teal",
    });
  }

  if (actions.length === 0) {
    actions.push({
      label: "案件を登録",
      href: "/projects",
      detail: "新しい受注があれば案件から登録してください",
      tone: "slate",
    });
  }

  return actions.slice(0, 4);
}

export const WORKFLOW_STEPS = [
  { href: "/projects", label: "案件登録", hint: "顧客の受注を登録" },
  { href: "/logistics/assign", label: "内職者割当", hint: "誰に何個出すか" },
  { href: "/logistics", label: "出荷", hint: "出荷一覧の確認" },
  { href: "/logistics?tab=arrival", label: "入荷検品", hint: "戻ってきた数量" },
  { href: "/deliveries", label: "顧客へ納品", hint: "納品書の記録" },
  { href: "/finance?tab=billing", label: "請求書", hint: "顧客別・月別" },
  { href: "/finance?tab=payment", label: "内職者支払", hint: "入荷完了分のみ" },
  { href: "/reports", label: "月報", hint: "売上と報酬の確認" },
] as const;

export function recentProjects(data: AppData, limit = 5) {
  return [...data.projects]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((p) => ({
      id: p.id,
      client: clientName(data, p.clientId),
      project: p.name,
      deadline: p.deadline,
      status: projectStatusLabel(p.status),
    }));
}
