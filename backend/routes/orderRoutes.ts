import { Router } from 'express';
import {
  cancelOrder,
  createOrder,
  getAllOrders,
  getMyOrders,
  updateOrderStatus,
  validateCoupon,
  verifyPayment,
  requestOrderReturn,
  resolveOrderReturn,
} from '../controllers/orderController.ts';
import { adminOnly, protect } from '../middleware/authMiddleware.ts';
import { uploadPaymentSlip } from '../middleware/uploadMiddleware.ts';

const router = Router();

router.post('/validate-coupon', validateCoupon);
router.post('/', protect, uploadPaymentSlip.single('paymentSlip'), createOrder);
router.get('/my', protect, getMyOrders);
router.put('/:id/cancel', protect, cancelOrder);
router.get('/', protect, adminOnly, getAllOrders);
router.put('/:id/verify-payment', protect, adminOnly, verifyPayment);
router.put('/:id/status', protect, adminOnly, updateOrderStatus);
router.put('/:id/return-request', protect, requestOrderReturn);
router.put('/:id/return-resolution', protect, adminOnly, resolveOrderReturn);

export default router;
