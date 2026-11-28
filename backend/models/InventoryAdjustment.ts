import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IInventoryAdjustment extends Document {
  book: mongoose.Types.ObjectId;
  previousStock: number;
  adjustment: number;
  resultingStock: number;
  reason: 'Restock' | 'Sale' | 'Cancellation' | 'PaymentRejection' | 'Damage' | 'Return' | 'AdminCorrection';
  performedBy?: mongoose.Types.ObjectId | string;
  note?: string;
  createdAt: Date;
}

const schema = new Schema<IInventoryAdjustment>(
  {
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    previousStock: { type: Number, required: true, min: 0 },
    adjustment: { type: Number, required: true },
    resultingStock: { type: Number, required: true, min: 0 },
    reason: { type: String, enum: ['Restock', 'Sale', 'Cancellation', 'PaymentRejection', 'Damage', 'Return', 'AdminCorrection'], required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const InventoryAdjustmentModel: Model<IInventoryAdjustment> =
  mongoose.models.InventoryAdjustment || mongoose.model<IInventoryAdjustment>('InventoryAdjustment', schema);
