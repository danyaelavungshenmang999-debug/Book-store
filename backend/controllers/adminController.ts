import { Response } from 'express';
import { isMongoConnected } from '../config/db.ts';
import { generateObjectId, loadStore, runStoreTransaction } from '../config/store.ts';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { BookModel } from '../models/Book.ts';
import { CouponModel } from '../models/Coupon.ts';
import { OrderModel } from '../models/Order.ts';
import { UserModel } from '../models/User.ts';
import { InventoryAdjustmentModel } from '../models/InventoryAdjustment.ts';
import { AdminActivityModel } from '../models/AdminActivity.ts';

export async function getAdminAnalytics(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (isMongoConnected()) {
      const [revenueAgg, totalOrders, pendingVerificationCount, lowStockBooks, recentOrders, methodAgg] =
        await Promise.all([
          OrderModel.aggregate([
            { $match: { isPaid: true, orderStatus: { $ne: 'Cancelled' } } },
            { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
          ]),
          OrderModel.countDocuments(),
          OrderModel.countDocuments({ orderStatus: 'Pending Verification' }),
          BookModel.find({ stockCount: { $lt: 5 } }).sort({ stockCount: 1 }),
          OrderModel.find().sort({ createdAt: -1 }).limit(8),
          OrderModel.aggregate([
            { $match: { orderStatus: { $ne: 'Cancelled' } } },
            {
              $group: {
                _id: '$paymentMethod',
                count: { $sum: 1 },
                volume: { $sum: '$totalPrice' },
              },
            },
          ]),
        ]);

      res.json({
        totalRevenue: revenueAgg[0]?.totalRevenue || 0,
        totalOrders,
        pendingVerificationCount,
        lowStockBooks,
        recentOrders,
        paymentBreakdown: methodAgg,
      });
      return;
    }

    const db = loadStore();
    const totalRevenue = db.orders
      .filter((o) => o.isPaid && o.orderStatus !== 'Cancelled')
      .reduce((sum, o) => sum + o.totalPrice, 0);

    const totalOrders = db.orders.length;
    const pendingVerificationCount = db.orders.filter(
      (o) => o.orderStatus === 'Pending Verification'
    ).length;

    const lowStockBooks = db.books
      .filter((b) => b.stockCount < 5)
      .sort((a, b) => a.stockCount - b.stockCount);

    const recentOrders = [...db.orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);

    const methods = ['KBZPay', 'WaveMoney', 'AYAPay', 'CashOnDelivery'] as const;
    const paymentBreakdown = methods.map((m) => {
      const matching = db.orders.filter((o) => o.paymentMethod === m && o.orderStatus !== 'Cancelled');
      return {
        _id: m,
        count: matching.length,
        volume: matching.reduce((s, o) => s + o.totalPrice, 0),
      };
    });

    res.json({
      totalRevenue,
      totalOrders,
      pendingVerificationCount,
      lowStockBooks,
      recentOrders,
      paymentBreakdown,
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message || 'Failed to compute analytics.' });
  }
}

export async function getCoupons(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (isMongoConnected()) {
      const coupons = await CouponModel.find().sort({ createdAt: -1 });
      res.json({ coupons });
      return;
    }
    const db = loadStore();
    res.json({ coupons: db.coupons });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message || 'Failed to fetch coupons.' });
  }
}

export async function createCoupon(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { code, discountPercentage, expiryDate, usageLimit } = req.body as {
      code?: string;
      discountPercentage?: number;
      expiryDate?: string;
      usageLimit?: number;
    };

    if (!code || !discountPercentage || !expiryDate) {
      res.status(400).json({ message: 'Code, discount percentage, and expiry date are required.' });
      return;
    }

    const normalized = code.trim().toUpperCase();

    if (isMongoConnected()) {
      const coupon = await CouponModel.create({
        code: normalized,
        discountPercentage: Number(discountPercentage),
        expiryDate: new Date(expiryDate),
        isActive: true,
        usageLimit: Math.max(1, Number(usageLimit ?? 1000)),
        usedCount: 0,
      });
      res.status(201).json({ coupon });
      return;
    }

    const coupon = await runStoreTransaction((db) => {
      if (db.coupons.some((c) => c.code === normalized)) {
        throw Object.assign(new Error('A promo code with that name already exists.'), { status: 409 });
      }
      const nowIso = new Date().toISOString();
      const created = {
        _id: generateObjectId(),
        code: normalized,
        discountPercentage: Math.min(90, Math.max(1, Number(discountPercentage))),
        expiryDate: new Date(expiryDate).toISOString(),
        usageLimit: usageLimit ? Math.max(1, Number(usageLimit)) : 1000,
        usedCount: 0,
        isActive: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      db.coupons.unshift(created);
      return created;
    });

    res.status(201).json({ coupon });
  } catch (err) {
    const error = err as Error & { status?: number };
    res.status(error.status || 500).json({ message: error.message || 'Failed to create coupon.' });
  }
}

export async function toggleCoupon(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (isMongoConnected()) {
      const coupon = await CouponModel.findById(id);
      if (!coupon) {
        res.status(404).json({ message: 'Coupon not found.' });
        return;
      }
      coupon.isActive = !coupon.isActive;
      await coupon.save();
      res.json({ coupon });
      return;
    }

    const coupon = await runStoreTransaction((db) => {
      const found = db.coupons.find((c) => c._id === id);
      if (!found) {
        throw Object.assign(new Error('Coupon not found.'), { status: 404 });
      }
      found.isActive = !found.isActive;
      found.updatedAt = new Date().toISOString();
      return found;
    });

    res.json({ coupon });
  } catch (err) {
    const error = err as Error & { status?: number };
    res.status(error.status || 500).json({ message: error.message || 'Failed to toggle coupon.' });
  }
}

export async function getCustomers(_req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!isMongoConnected()) {
    const db = loadStore();
    res.json({ customers: db.users.filter((u) => u.role === 'customer') });
    return;
  }
  const customers = await UserModel.find({ role: 'customer' }).sort({ createdAt: -1 });
  res.json({ customers });
}

export async function updateCustomerStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { accountStatus } = req.body as { accountStatus?: 'active' | 'suspended' };
  if (!accountStatus || !['active', 'suspended'].includes(accountStatus)) {
    res.status(400).json({ message: 'Account status must be active or suspended.' });
    return;
  }
  if (!isMongoConnected()) {
    await runStoreTransaction((db) => {
      const user = db.users.find((u) => u._id === id && u.role === 'customer');
      if (!user) throw Object.assign(new Error('Customer not found.'), { status: 404 });
      (user as typeof user & { accountStatus?: 'active' | 'suspended' }).accountStatus = accountStatus;
      user.updatedAt = new Date().toISOString();
    });
    res.json({ message: 'Customer account status updated.' });
    return;
  }
  const customer = await UserModel.findOneAndUpdate(
    { _id: id, role: 'customer' },
    { $set: { accountStatus } },
    { new: true }
  );
  if (!customer) {
    res.status(404).json({ message: 'Customer not found.' });
    return;
  }
  await AdminActivityModel.create({ actor: req.user!.id, actorName: req.user!.name, action: 'Update customer account status', entityType: 'Customer', entityId: id, changes: { accountStatus } });
  res.json({ customer });
}

export async function getReports(req: AuthenticatedRequest, res: Response): Promise<void> {
  const start = req.query.start ? new Date(String(req.query.start)) : new Date(Date.now() - 30 * 86400000);
  const end = req.query.end ? new Date(String(req.query.end)) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    res.status(400).json({ message: 'Invalid start/end date range.' });
    return;
  }
  if (!isMongoConnected()) {
    const db = loadStore();
    const orders = db.orders.filter((o) => new Date(o.createdAt) >= start && new Date(o.createdAt) <= end);
    const paid = orders.filter((o) => o.isPaid && o.orderStatus !== 'Cancelled');
    res.json({ revenue: paid.reduce((s, o) => s + o.totalPrice, 0), orders: paid.length, salesSeries: [], bestSellingBooks: [] });
    return;
  }
  const [revenue, orders, bestSelling] = await Promise.all([
    OrderModel.aggregate([{ $match: { isPaid: true, orderStatus: { $ne: 'Cancelled' }, createdAt: { $gte: start, $lte: end } } }, { $group: { _id: null, revenue: { $sum: '$totalPrice' }, count: { $sum: 1 } } }]),
    OrderModel.find({ createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 }),
    OrderModel.aggregate([{ $match: { orderStatus: { $ne: 'Cancelled' }, createdAt: { $gte: start, $lte: end } } }, { $unwind: '$orderItems' }, { $group: { _id: '$orderItems.book', title: { $first: '$orderItems.title' }, sold: { $sum: '$orderItems.qty' }, revenue: { $sum: { $multiply: ['$orderItems.qty', '$orderItems.price'] } } } }, { $sort: { sold: -1 } }, { $limit: 10 }]),
  ]);
  const salesSeries = await OrderModel.aggregate([{ $match: { isPaid: true, orderStatus: { $ne: 'Cancelled' }, createdAt: { $gte: start, $lte: end } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$totalPrice' }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  res.json({ revenue: revenue[0]?.revenue || 0, orders: revenue[0]?.count || 0, orderList: orders, salesSeries, bestSellingBooks: bestSelling });
}

export async function getInventoryHistory(_req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!isMongoConnected()) {
    res.json({ adjustments: [] });
    return;
  }
  const adjustments = await InventoryAdjustmentModel.find().sort({ createdAt: -1 }).limit(100).populate('book', 'title isbn');
  res.json({ adjustments });
}

export async function getAdminActivity(_req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!isMongoConnected()) {
    res.json({ activity: [] });
    return;
  }
  const activity = await AdminActivityModel.find().sort({ createdAt: -1 }).limit(200);
  res.json({ activity });
}
