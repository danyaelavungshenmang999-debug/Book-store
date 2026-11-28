import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDatabase, isMongoConnected } from './backend/config/db.ts';
import { buildSeedData, loadStore } from './backend/config/store.ts';
import { BookModel } from './backend/models/Book.ts';
import { CouponModel } from './backend/models/Coupon.ts';
import { UserModel } from './backend/models/User.ts';
import adminRoutes from './backend/routes/adminRoutes.ts';
import authRoutes from './backend/routes/authRoutes.ts';
import bookRoutes from './backend/routes/bookRoutes.ts';
import orderRoutes from './backend/routes/orderRoutes.ts';

dotenv.config();

async function seedMongoIfEmpty() {
  if (!isMongoConnected()) return;

  const seed = buildSeedData();
  const bookCount = await BookModel.countDocuments();

  try {
    for (const book of seed.books) {
      const existingBook = await BookModel.findOne({ isbn: book.isbn }).lean();
      if (existingBook) continue;

      await BookModel.create({
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        description: book.description,
        price: book.price,
        stockCount: book.stockCount,
        category: book.category,
        coverImageUrl: book.coverImageUrl,
        publisher: book.publisher,
        language: book.language,
        pages: book.pages,
      });
    }
  } catch (err) {
    const writeError = err as Error & { code?: number; writeErrors?: unknown[] };
    if (writeError.code !== 11000 && !writeError.writeErrors) {
      throw err;
    }
  }

  if (bookCount === 0) {
    await UserModel.insertMany(
      seed.users.map((u) => ({
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        isVerified: u.isVerified,
        shippingAddress: u.shippingAddress,
      }))
    );
    await CouponModel.insertMany(
      seed.coupons.map((c) => ({
        code: c.code,
        discountPercentage: c.discountPercentage,
        expiryDate: new Date(c.expiryDate),
        isActive: c.isActive,
      }))
    );
  }

  console.log('[BookHaven DB] Seeded missing MongoDB books.');
}

export async function createApp() {
  const app = express();

  await connectDatabase();
  if (isMongoConnected()) {
    await seedMongoIfEmpty();
  } else {
    loadStore();
  }

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Serve uploaded KBZPay / Wave Money payment slips
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // Serve frontend assets through the existing /src/assets URLs.
  app.use('/src/assets', express.static(path.resolve(process.cwd(), 'frontend/assets')));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      database: isMongoConnected() ? 'mongodb' : 'transactional-local',
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/books', bookRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/admin', adminRoutes);

  // Express error handler (including Multer file upload validation errors)
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    const status = (err as Error & { status?: number }).status || 400;
    res.status(status).json({ message: err.message || 'Server error occurred.' });
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  return app;
}


const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  createApp()
    .then((app) => {
      const server = app.listen(PORT, HOST, () => {
        console.log(`[BookHaven Server] Running on http://localhost:${PORT}`);
      });

      server.on('error', (err) => {
        console.error('[BookHaven Server] Listen error:', err);
        process.exit(1);
      });
    })
    .catch((err) => {
      console.error('[BookHaven Server] Fatal startup error:', err);
      process.exit(1);
    });
}


export default createApp;
