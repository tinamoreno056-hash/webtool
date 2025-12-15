export interface SupplierTransaction {
  id: string;
  date: string;
  productId?: string; // Link to inventory product if exists
  productName: string; // Manual entry or from inventory
  quantity: number;
  unitPrice: number;
  total: number;
  type: 'purchase' | 'return';
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company?: string;
  contactPerson?: string;
  totalPurchases: number;
  outstandingBalance: number;
  status: 'active' | 'inactive';
  createdAt: string;
  notes?: string;
  transactions?: SupplierTransaction[]; // Purchase history
}
