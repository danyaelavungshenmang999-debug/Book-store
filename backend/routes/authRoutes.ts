import { Router } from 'express';
import {
  getProfile,
  loginUser,
  registerUser,
  resendOtp,
  toggleWishlist,
  updateProfile,
  verifyOtp,
} from '../controllers/authController.ts';
import { protect } from '../middleware/authMiddleware.ts';
import { createRateLimiter } from '../middleware/rateLimitMiddleware.ts';

const router = Router();

const registerLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'register',
  message: 'Too many registration attempts. Please try again in a few minutes.',
});

const verifyOtpLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'verify-otp',
  message: 'Too many verification attempts. Please wait before trying again.',
});

const resendOtpLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 6,
  keyPrefix: 'resend-otp',
  message: 'Too many code resend requests. Please wait before trying again.',
});

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
  keyPrefix: 'login',
  message: 'Too many sign-in attempts. Please wait before trying again.',
});

router.post('/register', registerLimiter, registerUser);
router.post('/verify-otp', verifyOtpLimiter, verifyOtp);
router.post('/resend-otp', resendOtpLimiter, resendOtp);
router.post('/login', loginLimiter, loginUser);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/wishlist/:bookId', protect, toggleWishlist);

export default router;
