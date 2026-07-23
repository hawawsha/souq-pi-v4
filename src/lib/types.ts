export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  description: string;
  category: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  paymentId: string;
  createdAt: string;
  txid?: string;
}

export interface PaymentRecord {
  paymentId: string;
  userId: string;
  amount: number;
  memo: string;
  status: string;
  createdAt: string;
}
