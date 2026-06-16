export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PICKING_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'MOMO' | 'VNPAY' | 'BANK_TRANSFER';

export interface CreateOrderPayload {
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  distance?: number;
  note?: string;
  subtotal: number;
  discount?: number;
  paymentMethod: PaymentMethod;
  items: { name: string; quantity: number; weight?: number; note?: string }[];
}

export interface Order {
  id: string;
  status: OrderStatus;
  pickupAddress: string;
  deliveryAddress: string;
  total: number;
  deliveryFee: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
}
