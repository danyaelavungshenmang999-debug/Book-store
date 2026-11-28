import mongoose, { Document, Model, Schema } from 'mongoose';

export type PaymentMethod = 'KBZPay' | 'WaveMoney' | 'AYAPay' | 'CashOnDelivery';
export type VerificationStatus = 'NotRequired' | 'Pending' | 'Approved' | 'Rejected';
export type OrderStatus =
  | 'Pending Verification'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export interface IOrderItem {
  book: mongoose.Types.ObjectId | string;
  title: string;
  author: string;
  coverImageUrl: string;
  qty: number;
  price: number;
}

export interface IPaymentDetails {
  transactionId?: string;
  paymentSlipUrl?: string;
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  verifiedAt?: Date;
  verifiedBy?: string;
}

export interface IOrderStatusHistory {
  status: OrderStatus;
  changedAt: Date;
  changedBy?: string;
  note?: string;
}

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  user: mongoose.Types.ObjectId | string;
  customerName: string;
  customerEmail: string;
  orderItems: IOrderItem[];
  shippingAddress: {
    fullName: string;
    phone: string;
    streetAddress: string;
    township: string;
    city: string;
    postalCode: string;
  };
  paymentMethod: PaymentMethod;
  paymentDetails: IPaymentDetails;
  couponCode?: string;
  discountAmount: number;
  subtotal: number;
  deliveryFee: number;
  totalPrice: number;
  orderStatus: OrderStatus;
  isPaid: boolean;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  statusHistory: IOrderStatusHistory[];
  trackingNumber?: string;
  carrier?: string;
  returnRequest?: {
    requested: boolean;
    reason?: string;
    status: 'None' | 'Requested' | 'Approved' | 'Rejected' | 'Refunded';
    requestedAt?: Date;
    resolvedAt?: Date;
  };
  refund?: {
    status: 'None' | 'Requested' | 'Processing' | 'Refunded' | 'Rejected';
    amount: number;
    reason?: string;
    processedAt?: Date;
  };
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    title: { type: String, required: true },
    author: { type: String, required: true },
    coverImageUrl: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderStatusHistorySchema = new Schema<IOrderStatusHistory>(
  {
    status: {
      type: String,
      enum: ['Pending Verification', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      required: true,
    },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: String, trim: true },
    note: { type: String, trim: true },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    orderItems: {
      type: [orderItemSchema],
      required: true,
      validate: [(v: IOrderItem[]) => v.length > 0, 'Order must contain at least one item'],
    },
    shippingAddress: {
      fullName: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      streetAddress: { type: String, required: true, trim: true },
      township: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      postalCode: { type: String, trim: true, default: '11181' },
    },
    paymentMethod: {
      type: String,
      enum: ['KBZPay', 'WaveMoney', 'AYAPay', 'CashOnDelivery'],
      required: true,
    },
    paymentDetails: {
      transactionId: { type: String, trim: true },
      paymentSlipUrl: { type: String, trim: true },
      verificationStatus: {
        type: String,
        enum: ['NotRequired', 'Pending', 'Approved', 'Rejected'],
        default: 'Pending',
      },
      rejectionReason: { type: String, trim: true },
      verifiedAt: { type: Date },
      verifiedBy: { type: String },
    },
    couponCode: { type: String, trim: true },
    discountAmount: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    orderStatus: {
      type: String,
      enum: ['Pending Verification', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending Verification',
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    trackingNumber: { type: String, trim: true, default: '' },
    carrier: { type: String, trim: true, default: '' },
    statusHistory: { type: [orderStatusHistorySchema], default: [] },
    returnRequest: {
      requested: { type: Boolean, default: false },
      reason: { type: String, trim: true },
      status: { type: String, enum: ['None', 'Requested', 'Approved', 'Rejected', 'Refunded'], default: 'None' },
      requestedAt: { type: Date },
      resolvedAt: { type: Date },
    },
    refund: {
      status: { type: String, enum: ['None', 'Requested', 'Processing', 'Refunded', 'Rejected'], default: 'None' },
      amount: { type: Number, min: 0, default: 0 },
      reason: { type: String, trim: true },
      processedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

export const OrderModel: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', orderSchema);
