export type Store = {
  name: string;
  address: string;
  tel: string;
  fax: string;
  email: string;
  invoiceNumber: string;
  bankName: string;
  bankBranch: string;
  bankAccountType: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
};

export type Client = {
  id: string;
  name: string;
  contactName: string;
  tel: string;
  fax: string;
  email: string;
  address: string;
  postalCode: string;
  notes: string;
  createdAt: string;
};

export type Staff = {
  id: string;
  name: string;
  tel: string;
  /** Emergency contact phone (緊急連絡先電話) */
  emergencyTel: string;
  email: string;
  address: string;
  postalCode: string;
  bankName: string;
  bankBranch: string;
  bankAccountType: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  skills: string;
  status: "active" | "inactive";
  notes: string;
  /** Portal login id. Not a secret. Empty until the office sets one. */
  loginId: string;
  createdAt: string;
};

export type ProjectStatus = "open" | "in_progress" | "completed" | "closed";

export type Project = {
  id: string;
  clientId: string;
  name: string;
  description: string;
  orderQty: number;
  unitPrice: number;
  staffUnitPrice: number;
  deadline: string;
  status: ProjectStatus;
  notes: string;
  createdAt: string;
};

export type Assignment = {
  id: string;
  projectId: string;
  staffId: string;
  workName: string;
  qty: number;
  unitPrice: number;
  deadline: string;
  shipDate: string;
  arrivedQty: number | null;
  arriveDate: string | null;
  notes: string;
  createdAt: string;
};

export type Delivery = {
  id: string;
  projectId: string;
  clientId: string;
  qty: number;
  unitPrice: number;
  deliveryDate: string;
  invoiceId: string | null;
  notes: string;
  createdAt: string;
};

export type Invoice = {
  id: string;
  /** Display document number e.g. 00029776 */
  number: string;
  clientId: string;
  yearMonth: string;
  issueDate: string;
  deliveryIds: string[];
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
  createdAt: string;
};

export type AppData = {
  store: Store;
  clients: Client[];
  staff: Staff[];
  projects: Project[];
  assignments: Assignment[];
  deliveries: Delivery[];
  invoices: Invoice[];
};

export type PaymentLine = {
  assignmentId: string;
  staffId: string;
  projectId: string;
  workName: string;
  arrivedQty: number;
  unitPrice: number;
  amount: number;
  arriveDate: string;
  yearMonth: string;
};

export type InvoiceLine = {
  deliveryId: string;
  projectId: string;
  projectName: string;
  qty: number;
  unitPrice: number;
  amount: number;
  deliveryDate: string;
};
