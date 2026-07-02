import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_sign_key_streamin_ai_2026';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'VIEWER' | 'CREATOR' | 'ADMIN';
    tier: 'FREE' | 'PRO' | 'ENTERPRISE';
  };
}

export const authGuard = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: 'VIEWER' | 'CREATOR' | 'ADMIN';
      tier: 'FREE' | 'PRO' | 'ENTERPRISE';
    };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const optionalAuthGuard = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: 'VIEWER' | 'CREATOR' | 'ADMIN';
      tier: 'FREE' | 'PRO' | 'ENTERPRISE';
    };
    req.user = decoded;
  } catch (error) {
    // Ignore error for optional authentication
  }
  next();
};

export const requireRole = (roles: ('VIEWER' | 'CREATOR' | 'ADMIN')[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
};

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Upload limit reached, please try again in an hour.'
  }
});
