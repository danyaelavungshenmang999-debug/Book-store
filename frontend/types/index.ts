export type UserRole = 'customer' | 'admin';

export interface ShippingAddress {
  fullName: string;
  phone: string;
  streetAddress: string;
  township: string;
  city: string;
  postalCode: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  wishlist: string[];
  shippingAddress?: ShippingAddress;
}

export interface Review {
  _id?: string;
  user: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Book {
  _id: string;
  title: string;
  author: string;
  isbn: string;
  description: string;
  price: number;
  stockCount: number;
  category: string;
  coverImageUrl: string;
  publisher: string;
  language: string;
  pages: number;
  reviews: Review[];
  rating: number;
  numReviews: number;
  createdAt: string;
}

export interface CartItem {
  book: Book;
  qty: number;
}

export type PaymentMethod = 'KBZPay' | 'WaveMoney' | 'AYAPay' | 'CashOnDelivery';
export type VerificationStatus = 'NotRequired' | 'Pending' | 'Approved' | 'Rejected';
export type OrderStatus =
  | 'Pending Verification'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export interface OrderItem {
  book: string;
  title: string;
  author: string;
  coverImageUrl: string;
  qty: number;
  price: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  user: string;
  customerName: string;
  customerEmail: string;
  orderItems: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  paymentDetails: {
    transactionId?: string;
    paymentSlipUrl?: string;
    verificationStatus: VerificationStatus;
    rejectionReason?: string;
    verifiedAt?: string;
    verifiedBy?: string;
  };
  couponCode?: string;
  discountAmount: number;
  subtotal: number;
  deliveryFee: number;
  totalPrice: number;
  orderStatus: OrderStatus;
  isPaid: boolean;
  paidAt?: string;
  createdAt: string;
  trackingNumber?: string;
  carrier?: string;
  statusHistory?: Array<{ status: OrderStatus; changedAt: string; changedBy?: string; note?: string }>;
  returnRequest?: {
    requested: boolean;
    reason?: string;
    status: 'None' | 'Requested' | 'Approved' | 'Rejected' | 'Refunded';
    requestedAt?: string;
    resolvedAt?: string;
  };
  refund?: {
    status: 'None' | 'Requested' | 'Processing' | 'Refunded' | 'Rejected';
    amount: number;
    reason?: string;
    processedAt?: string;
  };
}

export interface Coupon {
  _id: string;
  code: string;
  discountPercentage: number;
  expiryDate: string;
  isActive: boolean;
}

export interface AdminAnalytics {
  totalRevenue: number;
  totalOrders: number;
  pendingVerificationCount: number;
  lowStockBooks: Book[];
  recentOrders: Order[];
  paymentBreakdown: Array<{
    _id: PaymentMethod;
    count: number;
    volume: number;
  }>;
}
