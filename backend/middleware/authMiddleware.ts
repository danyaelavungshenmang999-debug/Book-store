import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { isMongoConnected } from '../config/db.ts';
import { loadStore } from '../config/store.ts';
import { UserModel } from '../models/User.ts';

export interface AuthUserPayload {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'staff' | 'admin';
  isVerified: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export function getJwtSecret(): string {
  return process.env.JWT_SECRET?.trim() || 'bookhaven_dev_jwt_secret_key_change_in_prod';
}

export function signAuthToken(user: AuthUserPayload): string {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

export async function protect(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required. Please sign in.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string; role: string; email: string };

    if (isMongoConnected()) {
      const user = await UserModel.findById(decoded.id).select('-password -otp -otpExpires');
      if (!user) {
        res.status(401).json({ message: 'User account no longer exists.' });
        return;
      }
      if (!user.isVerified) {
        res.status(403).json({ message: 'Please verify your email OTP before continuing.' });
        return;
      }
      if (user.accountStatus === 'suspended') {
        res.status(403).json({ message: 'This account has been suspended.' });
        return;
      }
      req.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      };
      next();
      return;
    }

    const db = loadStore();
    const user = db.users.find((u) => u._id === decoded.id);
    if (!user) {
      res.status(401).json({ message: 'User account no longer exists.' });
      return;
    }
    if (!user.isVerified) {
      res.status(403).json({ message: 'Please verify your email OTP before continuing.' });
      return;
    }
    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    };
    next();
  } catch {
    res.status(401).json({ message: 'Session expired or invalid token. Please sign in again.' });
  }
}

export function adminOnly(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || !['admin', 'staff'].includes(req.user.role)) {
    res.status(403).json({ message: 'Staff or administrator access required.' });
    return;
  }
  next();
}
