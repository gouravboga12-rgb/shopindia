import type { Product } from './types';

export type AddressType = 'home' | 'work' | 'other';

export interface Address {
  id: string;
  label: string;
  type: AddressType;
  fullName: string;
  mobile: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
}

export type PaymentMethodType = 'UPI' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'NET_BANKING';

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  label: string;
  upiId?: string;
  last4?: string;
  cardBrand?: string;
  expiry?: string;
  bankName?: string;
  isDefault: boolean;
}

export interface Transaction {
  id: string;
  type: 'payment' | 'refund' | 'cashback';
  method?: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  gatewayRef?: string;
  orderNumber?: string;
  createdAt: string;
}

export interface Reward {
  id: string;
  points: number;
  source: string;
  description: string;
  createdAt: string;
  expiresAt?: string;
}

export type NotificationCategory = 'order' | 'shipping' | 'promotion' | 'coupon' | 'price_drop' | 'stock';

export interface DashboardNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'refunded';

export interface TrackingStep {
  label: string;
  time: string;
  completed: boolean;
}

export interface DashboardOrder {
  id: string;
  orderNumber: string;
  date: string;
  amount: number;
  discount: number;
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded';
  deliveryStatus: string;
  status: string;
  items: { product: Product; quantity: number; price: number }[];
  address: string;
  paymentMethod: string;
  tracking: TrackingStep[];
}

export type CouponState = 'available' | 'used' | 'expired';

export interface Coupon {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minOrderValue: number;
  validUntil: string;
  state: CouponState;
}

export interface Review {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  rating: number;
  title: string;
  body: string;
  images: string[];
  isVerified: boolean;
  createdAt: string;
}

export interface ActivityRecord {
  id: string;
  event: string;
  entityId?: string;
  entityType?: string;
  metadata?: string;
  createdAt: string;
}

export interface CustomerProfile {
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  dob?: string;
  plusMember: boolean;
}
