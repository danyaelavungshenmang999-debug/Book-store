import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IShippingAddress {
  fullName: string;
  phone: string;
  streetAddress: string;
  township: string;
  city: string;
  postalCode: string;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'customer' | 'staff' | 'admin';
  isVerified: boolean;
  accountStatus: 'active' | 'suspended';
  otpHash: string | null;
  otpExpires: Date | null;
  otpLastSentAt: Date | null;
  otpAttempts: number;
  otpLockedUntil: Date | null;
  wishlist: mongoose.Types.ObjectId[];
  shippingAddress?: IShippingAddress;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    fullName: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    streetAddress: { type: String, trim: true, default: '' },
    township: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: 'Yangon' },
    postalCode: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['customer', 'staff', 'admin'],
      default: 'customer',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
    otpHash: {
      type: String,
      default: null,
      select: false,
    },
    otpExpires: {
      type: Date,
      default: null,
      select: false,
    },
    otpLastSentAt: {
      type: Date,
      default: null,
      select: false,
    },
    otpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    otpLockedUntil: {
      type: Date,
      default: null,
      select: false,
    },
    wishlist: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Book',
      },
    ],
    shippingAddress: {
      type: shippingAddressSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', userSchema);
