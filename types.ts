
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
  status: 'in_progress' | 'completed' | 'approved' | 'rejected';
  price: number;
  currency: string;
  completed_at: string | null;
  approved_at: string | null;
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
