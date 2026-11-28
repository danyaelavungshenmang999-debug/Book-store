import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAdminActivity extends Document {
  actor: mongoose.Types.ObjectId;
  actorName: string;
  action: string;
  entityType: 'Book' | 'Order' | 'Payment' | 'Coupon' | 'Customer' | 'Staff' | 'Inventory' | 'Settings';
  entityId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}

const schema = new Schema<IAdminActivity>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorName: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, enum: ['Book', 'Order', 'Payment', 'Coupon', 'Customer', 'Staff', 'Inventory', 'Settings'], required: true },
    entityId: { type: String, trim: true },
    changes: { type: Schema.Types.Mixed },
    ipAddress: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AdminActivityModel: Model<IAdminActivity> =
  mongoose.models.AdminActivity || mongoose.model<IAdminActivity>('AdminActivity', schema);
