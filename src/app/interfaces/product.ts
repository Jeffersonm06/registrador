export interface Product {
  id?: number;
  name: string;
  description?: string;
  category: string;
  price: number;
  quantity: number;
  barcode: string;
  supplier?: string;
  created_at?: string;
  updated_at?: string;
}
