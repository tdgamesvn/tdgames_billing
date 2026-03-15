
export interface ServiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface BankingInfo {
  alias?: string; // Tên nhận biết (Vd: "Tài khoản chính", "MB Bank Toàn")
  accountName: string;
  accountNumber: string;
  bankName: string;
  branchName: string;
  bankAddress: string;
  citadCode: string;
  swiftCode: string;
}

export interface ClientInfo {
  clientType?: 'individual' | 'company';
  name: string;
  address: string;
  contactPerson: string;
  email: string;
  taxCode?: string;
}

/** A client saved in NocoDB */
export interface ClientRecord extends ClientInfo {
  id: string;
}

export interface StudioInfo {
  name: string;
  address: string;
  email: string;
  taxCode: string;
}

/** A studio profile saved in NocoDB */
export interface StudioRecord extends StudioInfo {
  id: string;
  isDefault: boolean;
}

export interface InvoiceData {
  id?: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: 'USD' | 'VND';
  taxRate: number;
  discountType: 'percentage' | 'amount';
  discountValue: number;
  theme: 'dark' | 'light';
  status: 'pending' | 'paid' | 'cancelled';
  paidDate?: string;
  studioInfo: StudioInfo;
  clientInfo: ClientInfo;
  bankingInfo: BankingInfo;
  items: ServiceItem[];
  createdAt?: any;
  payment_method?: 'TM' | 'CK' | 'TM/CK' | 'KHAC';
  einvoice_status?: 'none' | 'draft' | 'issued' | 'failed';
  einvoice_reference_code?: string;
  einvoice_tracking_code?: string;
  einvoice_pdf_url?: string;
  einvoice_invoice_number?: string;
  amount_received?: number;
  transfer_fee?: number;
}

export interface AccountUser {
  id: string;
  username: string;
  role: 'admin' | 'member';
}

// ── Expense Module Types ──────────────────────────────────────
export interface ExpenseCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface ExpenseRecord {
  id?: string;
  title: string;
  amount: number;
  currency: 'USD' | 'VND';
  expense_date: string;
  category_id: string | null;
  category?: ExpenseCategory;
  project: string;
  client_name: string;
  vendor: string;
  payment_method: string;
  status: 'pending' | 'approved' | 'paid';
  notes: string;
  receipt_url: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface RecurringExpense {
  id?: string;
  title: string;
  amount: number;
  currency: 'USD' | 'VND';
  category_id: string | null;
  category?: ExpenseCategory;
  project: string;
  vendor: string;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  next_run: string;
  is_active: boolean;
  created_at?: string;
}

// ── Workforce Module Types ────────────────────────────────────
export interface Worker {
  id?: string;
  full_name: string;
  email: string;
  phone: string;
  type: 'freelancer' | 'inhouse';
  bank_name: string;
  bank_account: string;
  tax_code: string;
  notes: string;
  is_active: boolean;
  created_at?: string;
}

export interface WorkerContract {
  id?: string;
  worker_id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  rate_type: 'per_task' | 'monthly' | 'hourly';
  rate_amount: number;
  currency: string;
  status: 'active' | 'completed' | 'terminated';
  notes: string;
  created_at?: string;
}

export interface WorkforceTask {
  id?: string;
  worker_id: string | null;
  worker?: Worker;
  project: string;
  client_name: string;
  title: string;
  clickup_task_id: string | null;
  clickup_list_id: string | null;
  clickup_status: string | null;
  clickup_space_name: string | null;
  clickup_folder_name: string | null;
  clickup_list_name: string | null;
  status: 'in_progress' | 'completed' | 'approved' | 'rejected';
  price: number;
  currency: string;
  exchange_rate: number;
  bonus: number;
  bonus_note: string;
  start_date: string | null;
  closed_date: string | null;
  completed_at: string | null;
  approved_at: string | null;
  payment_status: 'unpaid' | 'paid';
  notes: string;
  synced_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Settlement {
  id?: string;
  worker_id: string;
  worker?: Worker;
  period: string;
  total_tasks: number;
  total_amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'accepted' | 'paid';
  expense_id: string | null;
  notes: string;
  created_at?: string;
  tasks?: WorkforceTask[];
}

export interface SettlementTask {
  id?: string;
  settlement_id: string;
  task_id: string;
}

// ── CRM ──────────────────────────────────────────────────────
export interface CrmContact {
  id: string;
  client_id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  is_primary: boolean;
  notes: string;
  created_at: string;
}

export interface CrmClient {
  id: string;
  name: string;
  client_type: 'company' | 'individual';
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  tax_code: string;
  website: string;
  industry: string;
  status: 'lead' | 'contacted' | 'no_response' | 'responding' | 'negotiating' | 'contracting' | 'active' | 'paused' | 'completed' | 'lost';
  lead_source: string;
  lead_direction: string;
  lead_source_detail: string;
  notes: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  contacts?: CrmContact[];
}

export interface CrmDocument {
  id: string;
  client_id: string;
  doc_type: 'contract' | 'nda' | 'invoice' | 'proposal' | 'other';
  title: string;
  file_url: string;
  file_name: string;
  file_size: number;
  notes: string;
  created_at: string;
}

export interface CrmProject {
  id: string;
  client_id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  start_date: string;
  end_date: string;
  budget: number;
  currency: string;
  notes: string;
  created_at: string;
  updated_at: string;
  files?: CrmProjectFile[];
}

export interface CrmProjectFile {
  id: string;
  project_id: string;
  title: string;
  file_url: string;
  file_type: 'document' | 'image' | 'link' | 'other';
  file_name: string;
  file_size: number;
  notes: string;
  created_at: string;
}
