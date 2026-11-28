import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IReview {
  _id?: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId | string;
  name: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface IBook extends Document {
  _id: mongoose.Types.ObjectId;
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
  reviews: IReview[];
  rating: number;
  numReviews: number;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const bookSchema = new Schema<IBook>(
  {
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
      maxlength: [160, 'Title cannot exceed 160 characters'],
    },
    author: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true,
      maxlength: [100, 'Author cannot exceed 100 characters'],
    },
    isbn: {
      type: String,
      required: [true, 'ISBN is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Book description is required'],
      trim: true,
      maxlength: [3000, 'Description cannot exceed 3000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price (MMK) is required'],
      min: [0, 'Price cannot be negative'],
    },
    stockCount: {
      type: Number,
      required: [true, 'Stock count is required'],
      min: [0, 'Stock count cannot be negative'],
      default: 0,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    coverImageUrl: {
      type: String,
      required: [true, 'Cover image URL is required'],
      trim: true,
    },
    publisher: {
      type: String,
      trim: true,
      default: 'BookHaven Editions',
    },
    language: {
      type: String,
      trim: true,
      set: (value: unknown) => {
        const language = String(value ?? '').trim().toLowerCase();
        if (language === 'myanmar' || language.includes('burmese')) return 'myanmar';
        if (language.includes('english') || language.includes('bilingual')) return 'english';
        return 'none';
      },
      default: 'english',
    },
    pages: {
      type: Number,
      min: 1,
      default: 240,
    },
    reviews: {
      type: [reviewSchema],
      default: [],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

bookSchema.index({ title: 'text', author: 'text', isbn: 'text', category: 'text' });

export const BookModel: Model<IBook> =
  mongoose.models.Book || mongoose.model<IBook>('Book', bookSchema);
