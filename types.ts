
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
