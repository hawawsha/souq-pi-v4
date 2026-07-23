import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem, Order } from '../lib/types';

interface StoreState {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  isAdmin: boolean;
  currentUser: string | null;
  addToCart: (product: Product) => void;
  removeFromCart: (id: number) => void;
  updateCartQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status'], txid?: string) => void;
  setAdmin: (status: boolean) => void;
  setCurrentUser: (user: string | null) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: number, updates: Partial<Product>) => void;
  deleteProduct: (id: number) => void;
}

const initialProducts: Product[] = [
  { id: 1, name: "Premium Wireless Headphones", price: 89, image: "/images/headphones.jpg", description: "Studio quality noise cancelling", category: "Audio" },
  { id: 2, name: "Smartwatch Pro", price: 149, image: "/images/smartwatch.jpg", description: "Advanced health & fitness tracking", category: "Wearables" },
  { id: 3, name: "True Wireless Earbuds", price: 59, image: "/images/earbuds.jpg", description: "Crystal clear audio with ANC", category: "Audio" },
  { id: 4, name: "Ultra Premium Laptop", price: 999, image: "/images/laptop.jpg", description: "Professional grade performance", category: "Computing" },
];

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      products: initialProducts,
      cart: [],
      orders: [],
      isAdmin: false,
      currentUser: null,

      addToCart: (product) =>
        set((state) => {
          const existing = state.cart.find((item) => item.id === product.id);
          if (existing) {
            return {
              cart: state.cart.map((item) =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
              ),
            };
          }
          return { cart: [...state.cart, { ...product, quantity: 1 }] };
        }),

      removeFromCart: (id) =>
        set((state) => ({ cart: state.cart.filter((item) => item.id !== id) })),

      updateCartQuantity: (id, quantity) =>
        set((state) => ({
          cart: state.cart.map((item) =>
            item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
          ),
        })),

      clearCart: () => set({ cart: [] }),

      addOrder: (order) =>
        set((state) => ({ orders: [order, ...state.orders] })),

      updateOrderStatus: (orderId, status, txid) =>
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId ? { ...order, status, ...(txid && { txid }) } : order
          ),
        })),

      setAdmin: (status) => set({ isAdmin: status }),
      setCurrentUser: (user) => set({ currentUser: user }),

      addProduct: (product) =>
        set((state) => ({
          products: [...state.products, { ...product, id: Math.max(0, ...state.products.map(p => p.id)) + 1 }],
        })),

      updateProduct: (id, updates) =>
        set((state) => ({
          products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      deleteProduct: (id) =>
        set((state) => ({ products: state.products.filter((p) => p.id !== id) })),
    }),
    { name: 'pistore-storage' }
  )
);
