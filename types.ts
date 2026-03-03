
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
}
