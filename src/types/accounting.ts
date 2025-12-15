export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  account: string;
  status: 'pending' | 'completed' | 'cancelled';
  reference?: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
  currency: string;
  isActive: boolean;
}

export interface ClientTransaction {
  id: string;
  date: string;
  productId?: string; // Link to inventory product if exists
  productName: string; // Manual entry or from inventory
  quantity: number;
  unitPrice: number;
  total: number;
  type: 'sale' | 'return';
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company?: string;
  totalRevenue: number;
  outstandingBalance: number;
  status: 'active' | 'inactive';
  createdAt: string;
  transactions?: ClientTransaction[]; // Purchase history
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: string;
  dueDate: string;
  paidDate?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Report {
  id: string;
  name: string;
  type: 'income-statement' | 'balance-sheet' | 'cash-flow' | 'custom';
  period: string;
  generatedAt: string;
  data: Record<string, unknown>;
}

export interface CompanySettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  taxId: string;
  currency: string;
  fiscalYearStart: string;
  logo?: string;
  timezone: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  accountsReceivable: number;
  accountsPayable: number;
  cashBalance: number;
  revenueChange: number;
  expenseChange: number;
}

export type UserRole = 'admin' | 'staff' | 'viewer';

export interface AppUser {
  id: string;
  username: string;
  password: string; // Hashed with per-user salt
  salt?: string; // Unique salt for password hashing
  role: UserRole;
  name: string;
  email?: string;
  createdAt: string;
  isActive: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: AppUser | null;
  sessionToken?: string;
}

export const CURRENCIES = [
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
] as const;

export const TIMEZONES = [
  { value: 'Asia/Karachi', label: 'Pakistan (PKT, UTC+5)' },
  { value: 'America/New_York', label: 'New York (EST, UTC-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST, UTC-8)' },
  { value: 'Europe/London', label: 'London (GMT, UTC+0)' },
  { value: 'Europe/Paris', label: 'Paris (CET, UTC+1)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST, UTC+4)' },
  { value: 'Asia/Kolkata', label: 'India (IST, UTC+5:30)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST, UTC+9)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT, UTC+11)' },
] as const;
