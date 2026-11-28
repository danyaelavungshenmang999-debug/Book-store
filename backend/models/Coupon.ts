import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICoupon extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  discountPercentage: number;
  expiryDate: Date;
  isActive: boolean;
  usageLimit: number;
  usedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountPercentage: {
      type: Number,
      required: [true, 'Discount percentage is required'],
      min: [1, 'Discount must be at least 1%'],
      max: [90, 'Discount cannot exceed 90%'],
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageLimit: {
      type: Number,
      min: [1, 'Usage limit must be at least 1'],
      default: 1000,
    },
    usedCount: {
      type: Number,
      min: [0, 'Used count cannot be negative'],
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const CouponModel: Model<ICoupon> =
  mongoose.models.Coupon || mongoose.model<ICoupon>('Coupon', couponSchema);
