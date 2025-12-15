export interface Product {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  category: string | null;
  quantity: number;
  unit: string;
  cost_price: number;
  selling_price: number;
  reorder_point: number;
  low_stock_threshold: number;
  supplier: string | null;
  location: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockHistory {
  id: string;
  product_id: string;
  user_id: string;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  movement_type: 'in' | 'out' | 'adjustment' | 'return';
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface StockAlert {
  product: Product;
  alertType: 'low_stock' | 'reorder_point' | 'out_of_stock';
  message: string;
}

export const PRODUCT_CATEGORIES = [
  'Electronics',
  'Clothing',
  'Food & Beverages',
  'Office Supplies',
  'Raw Materials',
  'Finished Goods',
  'Packaging',
  'Machinery',
  'Tools',
  'Other',
] as const;

export const UNITS = [
  { value: 'pcs', label: 'Pieces' },
  { value: 'kg', label: 'Kilograms' },
  { value: 'g', label: 'Grams' },
  { value: 'l', label: 'Liters' },
  { value: 'ml', label: 'Milliliters' },
  { value: 'm', label: 'Meters' },
  { value: 'cm', label: 'Centimeters' },
  { value: 'box', label: 'Boxes' },
  { value: 'pack', label: 'Packs' },
  { value: 'dozen', label: 'Dozen' },
] as const;

export const MOVEMENT_TYPES = [
  { value: 'in', label: 'Stock In', color: 'text-green-600' },
  { value: 'out', label: 'Stock Out', color: 'text-red-600' },
  { value: 'adjustment', label: 'Adjustment', color: 'text-yellow-600' },
  { value: 'return', label: 'Return', color: 'text-blue-600' },
] as const;
