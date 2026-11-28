import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { isMongoConnected } from '../config/db.ts';
import { generateObjectId, loadStore, runStoreTransaction, StoreOrder } from '../config/store.ts';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { BookModel } from '../models/Book.ts';
import { CouponModel } from '../models/Coupon.ts';
import { OrderModel, OrderStatus, PaymentMethod } from '../models/Order.ts';

function calculateDeliveryFee(subtotalAfterDiscount: number, city: string): number {
  if (subtotalAfterDiscount >= 35000) return 0;
  return city.trim().toLowerCase() === 'yangon' ? 2500 : 4500;
}

function makeOrderNumber(): string {
  const num = Math.floor(1050 + Math.random() * 8900);
  return `BH-2026-${num}`;
}

export async function validateCoupon(req: Request, res: Response): Promise<void> {
  try {
    const { code } = req.body as { code?: string };
    if (!code || !code.trim()) {
      res.status(400).json({ message: 'Please enter a promo code.' });
      return;
    }
    const normalized = code.trim().toUpperCase();

    if (isMongoConnected()) {
      const coupon = await CouponModel.findOne({ code: normalized });
      if (!coupon || !coupon.isActive) {
        res.status(404).json({ message: 'Promo code is invalid or inactive.' });
        return;
      }
      if (coupon.expiryDate.getTime() < Date.now()) {
        res.status(400).json({ message: 'This promo code has expired.' });
        return;
      }
      if (coupon.usedCount >= coupon.usageLimit) {
        res.status(400).json({ message: 'This promo code has reached its usage limit.' });
        return;
      }
      res.json({
        code: coupon.code,
        discountPercentage: coupon.discountPercentage,
      });
      return;
    }

    const db = loadStore();
    const coupon = db.coupons.find((c) => c.code === normalized);
    if (!coupon || !coupon.isActive) {
      res.status(404).json({ message: 'Promo code is invalid or inactive.' });
      return;
    }
    if (new Date(coupon.expiryDate).getTime() < Date.now()) {
      res.status(400).json({ message: 'This promo code has expired.' });
      return;
    }
    if (coupon.usedCount >= coupon.usageLimit) {
      res.status(400).json({ message: 'This promo code has reached its usage limit.' });
      return;
    }

    res.json({
      code: coupon.code,
      discountPercentage: coupon.discountPercentage,
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message || 'Coupon validation failed.' });
  }
}

export async function createOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    const rawItems = typeof req.body.orderItems === 'string'
      ? JSON.parse(req.body.orderItems)
      : req.body.orderItems;
    const rawShipping = typeof req.body.shippingAddress === 'string'
      ? JSON.parse(req.body.shippingAddress)
      : req.body.shippingAddress;

    const paymentMethod = req.body.paymentMethod as PaymentMethod;
    const transactionId = (req.body.transactionId as string | undefined)?.trim() || '';
    const couponCode = (req.body.couponCode as string | undefined)?.trim().toUpperCase() || '';

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      res.status(400).json({ message: 'Your shopping bag is empty.' });
      return;
    }

    if (
      !rawShipping ||
      !rawShipping.fullName?.trim() ||
      !rawShipping.phone?.trim() ||
      !rawShipping.streetAddress?.trim() ||
      !rawShipping.township?.trim() ||
      !rawShipping.city?.trim()
    ) {
      res.status(400).json({ message: 'Complete Myanmar shipping address (Name, Phone, Street, Township, City) is required.' });
      return;
    }

    if (!['KBZPay', 'WaveMoney', 'AYAPay', 'CashOnDelivery'].includes(paymentMethod)) {
      res.status(400).json({ message: 'Please select a valid payment method.' });
      return;
    }

    const isDigitalWallet =
      paymentMethod === 'KBZPay' || paymentMethod === 'WaveMoney' || paymentMethod === 'AYAPay';
    const walletLabel =
      paymentMethod === 'KBZPay'
        ? 'KBZPay'
        : paymentMethod === 'WaveMoney'
        ? 'Wave Money'
        : 'AYA Pay';
    if (isDigitalWallet) {
      if (transactionId.length < 6) {
        res.status(400).json({
          message: `Please enter a valid ${walletLabel} Transaction ID (minimum 6 characters).`,
        });
        return;
      }
      if (!req.file) {
        res.status(400).json({
          message: `Please upload your ${walletLabel} payment slip screenshot.`,
        });
        return;
      }
    }

    const paymentSlipUrl = req.file ? `/uploads/slips/${req.file.filename}` : undefined;

    if (isMongoConnected()) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        let subtotal = 0;
        const verifiedItems = [];

        for (const item of rawItems as Array<{ bookId: string; qty: number }>) {
          const qty = Math.max(1, Number(item.qty));
          const book = await BookModel.findById(item.bookId).session(session);
          if (!book) {
            throw Object.assign(new Error('One of the books in your bag is no longer available.'), { status: 404 });
          }
          if (book.stockCount < qty) {
            throw Object.assign(
              new Error(`Insufficient stock for "${book.title}". Only ${book.stockCount} copy/copies remaining.`),
              { status: 409 }
            );
          }

          book.stockCount -= qty;
          await book.save({ session });

          subtotal += book.price * qty;
          verifiedItems.push({
            book: book._id,
            title: book.title,
            author: book.author,
            coverImageUrl: book.coverImageUrl,
            qty,
            price: book.price,
          });
        }

        let discountAmount = 0;
        let appliedCoupon: string | undefined;
        if (couponCode) {
          const coupon = await CouponModel.findOne({ code: couponCode }).session(session);
          if (
            coupon &&
            coupon.isActive &&
            coupon.expiryDate.getTime() >= Date.now() &&
            coupon.usedCount < coupon.usageLimit
          ) {
            discountAmount = Math.round((subtotal * coupon.discountPercentage) / 100);
            appliedCoupon = coupon.code;
          }
        }

        const afterDiscount = Math.max(0, subtotal - discountAmount);
        const deliveryFee = calculateDeliveryFee(afterDiscount, rawShipping.city);
        const totalPrice = afterDiscount + deliveryFee;

        const [order] = await OrderModel.create(
          [
            {
              orderNumber: makeOrderNumber(),
              user: req.user.id,
              customerName: req.user.name,
              customerEmail: req.user.email,
              orderItems: verifiedItems,
              shippingAddress: {
                fullName: rawShipping.fullName.trim(),
                phone: rawShipping.phone.trim(),
                streetAddress: rawShipping.streetAddress.trim(),
                township: rawShipping.township.trim(),
                city: rawShipping.city.trim(),
                postalCode: rawShipping.postalCode?.trim() || '11181',
              },
              paymentMethod,
              paymentDetails: {
                transactionId: isDigitalWallet ? transactionId : undefined,
                paymentSlipUrl: isDigitalWallet ? paymentSlipUrl : undefined,
                verificationStatus: isDigitalWallet ? 'Pending' : 'NotRequired',
              },
              couponCode: appliedCoupon,
              discountAmount,
              subtotal,
              deliveryFee,
              totalPrice,
              orderStatus: isDigitalWallet ? 'Pending Verification' : 'Processing',
              isPaid: false,
            },
          ],
          { session }
        );

        if (appliedCoupon) {
          await CouponModel.updateOne(
            { code: appliedCoupon, $expr: { $lt: ['$usedCount', '$usageLimit'] } },
            { $inc: { usedCount: 1 } },
            { session }
          );
        }

        await session.commitTransaction();
        session.endSession();
        res.status(201).json({ order });
        return;
      } catch (txErr) {
        await session.abortTransaction();
        session.endSession();
        throw txErr;
      }
    }

    // Atomic transactional local store execution (mirrors Mongoose session rollback)
    const createdOrder = await runStoreTransaction((db) => {
      let subtotal = 0;
      const verifiedItems: StoreOrder['orderItems'] = [];

      for (const item of rawItems as Array<{ bookId: string; qty: number }>) {
        const qty = Math.max(1, Number(item.qty));
        const book = db.books.find((b) => b._id === item.bookId);
        if (!book) {
          throw Object.assign(new Error('One of the books in your bag is no longer available.'), { status: 404 });
        }
        if (book.stockCount < qty) {
          throw Object.assign(
            new Error(`Insufficient stock for "${book.title}". Only ${book.stockCount} remaining.`),
            { status: 409 }
          );
        }

        book.stockCount -= qty;
        book.updatedAt = new Date().toISOString();

        subtotal += book.price * qty;
        verifiedItems.push({
          book: book._id,
          title: book.title,
          author: book.author,
          coverImageUrl: book.coverImageUrl,
          qty,
          price: book.price,
        });
      }

      let discountAmount = 0;
      let appliedCoupon: string | undefined;
      if (couponCode) {
        const coupon = db.coupons.find((c) => c.code === couponCode);
        if (coupon && coupon.isActive && new Date(coupon.expiryDate).getTime() >= Date.now()) {
          discountAmount = Math.round((subtotal * coupon.discountPercentage) / 100);
          appliedCoupon = coupon.code;
          coupon.usedCount += 1;
          coupon.updatedAt = new Date().toISOString();
        }
      }

      const afterDiscount = Math.max(0, subtotal - discountAmount);
      const deliveryFee = calculateDeliveryFee(afterDiscount, rawShipping.city);
      const totalPrice = afterDiscount + deliveryFee;
      const nowIso = new Date().toISOString();

      const newOrder: StoreOrder = {
        _id: generateObjectId(),
        orderNumber: makeOrderNumber(),
        user: req.user!.id,
        customerName: req.user!.name,
        customerEmail: req.user!.email,
        orderItems: verifiedItems,
        shippingAddress: {
          fullName: rawShipping.fullName.trim(),
          phone: rawShipping.phone.trim(),
          streetAddress: rawShipping.streetAddress.trim(),
          township: rawShipping.township.trim(),
          city: rawShipping.city.trim(),
          postalCode: rawShipping.postalCode?.trim() || '11181',
        },
        paymentMethod,
        paymentDetails: {
          transactionId: isDigitalWallet ? transactionId : undefined,
          paymentSlipUrl: isDigitalWallet ? paymentSlipUrl : undefined,
          verificationStatus: isDigitalWallet ? 'Pending' : 'NotRequired',
        },
        couponCode: appliedCoupon,
        discountAmount,
        subtotal,
        deliveryFee,
        totalPrice,
        orderStatus: isDigitalWallet ? 'Pending Verification' : 'Processing',
        isPaid: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      db.orders.unshift(newOrder);
      return newOrder;
    });

    res.status(201).json({ order: createdOrder });
  } catch (err) {
    const error = err as Error & { status?: number };
    res.status(error.status || 500).json({ message: error.message || 'Checkout failed.' });
  }
}

export async function getMyOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized.' });
      return;
    }

    if (isMongoConnected()) {
      const orders = await OrderModel.find({ user: req.user.id }).sort({ createdAt: -1 });
      res.json({ orders });
      return;
    }

    const db = loadStore();
    const orders = db.orders
      .filter((o) => o.user === req.user!.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message || 'Failed to load orders.' });
  }
}

export async function cancelOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized.' });
      return;
    }
    const { id } = req.params;

    if (isMongoConnected()) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const order = await OrderModel.findById(id).session(session);
        if (!order) {
          throw Object.assign(new Error('Order not found.'), { status: 404 });
        }
        if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
          throw Object.assign(new Error('You cannot cancel another customer’s order.'), { status: 403 });
        }
        if (!['Pending Verification', 'Processing'].includes(order.orderStatus)) {
          throw Object.assign(
            new Error(`Orders in "${order.orderStatus}" status can no longer be cancelled.`),
            { status: 400 }
          );
        }

        // Restore stock atomically
        for (const item of order.orderItems) {
          await BookModel.findByIdAndUpdate(
            item.book,
            { $inc: { stockCount: item.qty } },
            { session }
          );
        }

        order.orderStatus = 'Cancelled';
        await order.save({ session });
        await session.commitTransaction();
        session.endSession();

        res.json({ order });
        return;
      } catch (txErr) {
        await session.abortTransaction();
        session.endSession();
        throw txErr;
      }
    }

    const updatedOrder = await runStoreTransaction((db) => {
      const order = db.orders.find((o) => o._id === id);
      if (!order) {
        throw Object.assign(new Error('Order not found.'), { status: 404 });
      }
      if (order.user !== req.user!.id && req.user!.role !== 'admin') {
        throw Object.assign(new Error('You cannot cancel another customer’s order.'), { status: 403 });
      }
      if (!['Pending Verification', 'Processing'].includes(order.orderStatus)) {
        throw Object.assign(
          new Error(`Orders in "${order.orderStatus}" status can no longer be cancelled.`),
          { status: 400 }
        );
      }

      for (const item of order.orderItems) {
        const book = db.books.find((b) => b._id === item.book);
        if (book) {
          book.stockCount += item.qty;
          book.updatedAt = new Date().toISOString();
        }
      }

      order.orderStatus = 'Cancelled';
      order.updatedAt = new Date().toISOString();
      return order;
    });

    res.json({ order: updatedOrder });
  } catch (err) {
    const error = err as Error & { status?: number };
    res.status(error.status || 500).json({ message: error.message || 'Could not cancel order.' });
  }
}

export async function getAllOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const statusFilter = (req.query.status as string | undefined)?.trim() || '';

    if (isMongoConnected()) {
      const filter: Record<string, unknown> = {};
      if (statusFilter && statusFilter !== 'All') {
        filter.orderStatus = statusFilter;
      }
      const orders = await OrderModel.find(filter).sort({ createdAt: -1 });
      res.json({ orders });
      return;
    }

    const db = loadStore();
    let orders = [...db.orders];
    if (statusFilter && statusFilter !== 'All') {
      orders = orders.filter((o) => o.orderStatus === statusFilter);
    }
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message || 'Failed to fetch orders.' });
  }
}

export async function verifyPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ message: 'Admin privileges required.' });
      return;
    }

    const { id } = req.params;
    const { action, rejectionReason } = req.body as {
      action?: 'approve' | 'reject';
      rejectionReason?: string;
    };

    if (!action || !['approve', 'reject'].includes(action)) {
      res.status(400).json({ message: 'Action must be either "approve" or "reject".' });
      return;
    }

    if (action === 'reject' && (!rejectionReason || rejectionReason.trim().length < 4)) {
      res.status(400).json({ message: 'Please provide a clear rejection reason for the customer.' });
      return;
    }

    if (isMongoConnected()) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const order = await OrderModel.findById(id).session(session);
        if (!order) {
          throw Object.assign(new Error('Order not found.'), { status: 404 });
        }
        if (order.paymentDetails.verificationStatus !== 'Pending') {
          throw Object.assign(
            new Error('This payment has already been reviewed.'),
            { status: 400 }
          );
        }

        if (action === 'approve') {
          order.paymentDetails.verificationStatus = 'Approved';
          order.paymentDetails.verifiedAt = new Date();
          order.paymentDetails.verifiedBy = req.user.name;
          order.isPaid = true;
          order.paidAt = new Date();
          order.orderStatus = 'Processing';
        } else {
          // Atomic stock restoration on payment rejection
          for (const item of order.orderItems) {
            await BookModel.findByIdAndUpdate(
              item.book,
              { $inc: { stockCount: item.qty } },
              { session }
            );
          }
          order.paymentDetails.verificationStatus = 'Rejected';
          order.paymentDetails.rejectionReason = rejectionReason!.trim();
          order.paymentDetails.verifiedAt = new Date();
          order.paymentDetails.verifiedBy = req.user.name;
          order.isPaid = false;
          order.orderStatus = 'Cancelled';
        }

        await order.save({ session });
        await session.commitTransaction();
        session.endSession();
        res.json({ order });
        return;
      } catch (txErr) {
        await session.abortTransaction();
        session.endSession();
        throw txErr;
      }
    }

    const updatedOrder = await runStoreTransaction((db) => {
      const order = db.orders.find((o) => o._id === id);
      if (!order) {
        throw Object.assign(new Error('Order not found.'), { status: 404 });
      }
      if (order.paymentDetails.verificationStatus !== 'Pending') {
        throw Object.assign(new Error('This payment has already been reviewed.'), { status: 400 });
      }

      const nowIso = new Date().toISOString();
      if (action === 'approve') {
        order.paymentDetails.verificationStatus = 'Approved';
        order.paymentDetails.verifiedAt = nowIso;
        order.paymentDetails.verifiedBy = req.user!.name;
        order.isPaid = true;
        order.paidAt = nowIso;
        order.orderStatus = 'Processing';
      } else {
        for (const item of order.orderItems) {
          const book = db.books.find((b) => b._id === item.book);
          if (book) {
            book.stockCount += item.qty;
            book.updatedAt = nowIso;
          }
        }
        order.paymentDetails.verificationStatus = 'Rejected';
        order.paymentDetails.rejectionReason = rejectionReason!.trim();
        order.paymentDetails.verifiedAt = nowIso;
        order.paymentDetails.verifiedBy = req.user!.name;
        order.isPaid = false;
        order.orderStatus = 'Cancelled';
      }

      order.updatedAt = nowIso;
      return order;
    });

    res.json({ order: updatedOrder });
  } catch (err) {
    const error = err as Error & { status?: number };
    res.status(error.status || 500).json({ message: error.message || 'Verification action failed.' });
  }
}

export async function updateOrderStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { orderStatus, trackingNumber, carrier } = req.body as { orderStatus?: OrderStatus; trackingNumber?: string; carrier?: string };
    const allowed: OrderStatus[] = ['Processing', 'Shipped', 'Delivered'];
    if (!orderStatus || !allowed.includes(orderStatus)) {
      res.status(400).json({ message: 'Status must be Processing, Shipped, or Delivered.' });
      return;
    }

    if (isMongoConnected()) {
      const order = await OrderModel.findById(id);
      if (!order) {
        res.status(404).json({ message: 'Order not found.' });
        return;
      }
      if (order.orderStatus === 'Cancelled') {
        res.status(400).json({ message: 'Cancelled orders cannot be re-opened.' });
        return;
      }
      if (order.paymentMethod !== 'CashOnDelivery' && !order.isPaid && orderStatus !== 'Processing') {
        res.status(400).json({ message: 'Digital-wallet orders must be payment-approved before shipping or delivery.' });
        return;
      }
      const validTransition =
        (order.orderStatus === 'Pending Verification' && orderStatus === 'Processing') ||
        (order.orderStatus === 'Processing' && (orderStatus === 'Shipped' || orderStatus === 'Delivered')) ||
        (order.orderStatus === 'Shipped' && orderStatus === 'Delivered');
      if (!validTransition) {
        res.status(400).json({ message: `Invalid status transition from "${order.orderStatus}" to "${orderStatus}".` });
        return;
      }
      if (orderStatus === 'Shipped' && (!trackingNumber?.trim() && !order.trackingNumber)) {
        res.status(400).json({ message: 'Tracking number is required when marking an order as shipped.' });
        return;
      }
      order.orderStatus = orderStatus;
      if (trackingNumber !== undefined) order.trackingNumber = trackingNumber.trim();
      if (carrier !== undefined) order.carrier = carrier.trim();
      order.statusHistory.push({ status: orderStatus, changedAt: new Date(), changedBy: req.user?.name, note: 'Admin status update' });
      if (orderStatus === 'Delivered' && order.paymentMethod === 'CashOnDelivery') {
        order.isPaid = true;
        order.paidAt = new Date();
      }
      await order.save();
      res.json({ order });
      return;
    }

    const updated = await runStoreTransaction((db) => {
      const order = db.orders.find((o) => o._id === id);
      if (!order) {
        throw Object.assign(new Error('Order not found.'), { status: 404 });
      }
      if (order.orderStatus === 'Cancelled') {
        throw Object.assign(new Error('Cancelled orders cannot be re-opened.'), { status: 400 });
      }
      const nowIso = new Date().toISOString();
      order.orderStatus = orderStatus;
      if (orderStatus === 'Delivered' && order.paymentMethod === 'CashOnDelivery') {
        order.isPaid = true;
        order.paidAt = nowIso;
      }
      order.updatedAt = nowIso;
      return order;
    });

    res.json({ order: updated });
  } catch (err) {
    const error = err as Error & { status?: number };
    res.status(error.status || 500).json({ message: error.message || 'Failed to update order status.' });
  }
}

export async function requestOrderReturn(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: 'Not authorized.' });
    return;
  }
  const { id } = req.params;
  const { reason } = req.body as { reason?: string };
  if (!reason || reason.trim().length < 4) {
    res.status(400).json({ message: 'Return reason must be at least 4 characters.' });
    return;
  }

  if (isMongoConnected()) {
    const order = await OrderModel.findById(id);
    if (!order) { res.status(404).json({ message: 'Order not found.' }); return; }
    if (order.user.toString() !== req.user.id) { res.status(403).json({ message: 'You cannot request a return for another customer.' }); return; }
    if (order.orderStatus !== 'Delivered') { res.status(400).json({ message: 'Only delivered orders can request a return.' }); return; }
    if (order.returnRequest?.requested) { res.status(400).json({ message: 'A return request already exists.' }); return; }
    order.returnRequest = { requested: true, reason: reason.trim(), status: 'Requested', requestedAt: new Date() };
    await order.save();
    res.json({ order });
    return;
  }

  const updated = await runStoreTransaction((db) => {
    const order = db.orders.find((o) => o._id === id);
    if (!order) throw Object.assign(new Error('Order not found.'), { status: 404 });
    if (order.user !== req.user!.id) throw Object.assign(new Error('You cannot request a return for another customer.'), { status: 403 });
    if (order.orderStatus !== 'Delivered') throw Object.assign(new Error('Only delivered orders can request a return.'), { status: 400 });
    const local = order as typeof order & { returnRequest?: { requested: boolean; reason?: string; status: 'Requested'; requestedAt: string } };
    if (local.returnRequest?.requested) throw Object.assign(new Error('A return request already exists.'), { status: 400 });
    local.returnRequest = { requested: true, reason: reason.trim(), status: 'Requested', requestedAt: new Date().toISOString() };
    return order;
  });
  res.json({ order: updated });
}

export async function resolveOrderReturn(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user || req.user.role === 'customer') { res.status(403).json({ message: 'Staff or administrator access required.' }); return; }
  const { id } = req.params;
  const { action, reason } = req.body as { action?: 'approve' | 'reject'; reason?: string };
  if (!action || !['approve', 'reject'].includes(action)) { res.status(400).json({ message: 'Action must be approve or reject.' }); return; }

  if (isMongoConnected()) {
    const order = await OrderModel.findById(id);
    if (!order) { res.status(404).json({ message: 'Order not found.' }); return; }
    if (!order.returnRequest?.requested) { res.status(400).json({ message: 'No return request exists.' }); return; }
    order.returnRequest.status = action === 'approve' ? 'Approved' : 'Rejected';
    order.returnRequest.reason = reason?.trim() || order.returnRequest.reason;
    order.returnRequest.resolvedAt = new Date();
    await order.save();
    res.json({ order });
    return;
  }

  const updated = await runStoreTransaction((db) => {
    const order = db.orders.find((o) => o._id === id);
    if (!order) throw Object.assign(new Error('Order not found.'), { status: 404 });
    const local = order as typeof order & { returnRequest?: { requested: boolean; reason?: string; status: 'Requested' | 'Approved' | 'Rejected'; resolvedAt?: string } };
    if (!local.returnRequest?.requested) throw Object.assign(new Error('No return request exists.'), { status: 400 });
    local.returnRequest.status = action === 'approve' ? 'Approved' : 'Rejected';
    local.returnRequest.reason = reason?.trim() || local.returnRequest.reason;
    local.returnRequest.resolvedAt = new Date().toISOString();
    return order;
  });
  res.json({ order: updated });
}
