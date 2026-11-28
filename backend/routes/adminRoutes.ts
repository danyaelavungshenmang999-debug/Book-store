import { Router } from 'express';
import {
  createCoupon,
  getAdminAnalytics,
  getCoupons,
  toggleCoupon,
  getCustomers,
  updateCustomerStatus,
  getReports,
  getInventoryHistory,
  getAdminActivity,
} from '../controllers/adminController.ts';
import { adminOnly, protect } from '../middleware/authMiddleware.ts';

const router = Router();

router.get('/analytics', protect, adminOnly, getAdminAnalytics);
router.get('/coupons', protect, adminOnly, getCoupons);
router.post('/coupons', protect, adminOnly, createCoupon);
router.put('/coupons/:id/toggle', protect, adminOnly, toggleCoupon);
router.get('/customers', protect, adminOnly, getCustomers);
router.put('/customers/:id/status', protect, adminOnly, updateCustomerStatus);
router.get('/reports', protect, adminOnly, getReports);
router.get('/inventory/history', protect, adminOnly, getInventoryHistory);
router.get('/activity', protect, adminOnly, getAdminActivity);

export default router;
