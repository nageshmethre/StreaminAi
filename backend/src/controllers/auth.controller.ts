import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/client';
import { AuthRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_sign_key_streamin_ai_2026';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, name, handle } = req.body;

      if (!email || !password || !name || !handle) {
        return res.status(400).json({ message: 'All fields are required.' });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists.' });
      }

      // Check handle uniqueness
      const existingHandle = await prisma.channel.findUnique({ where: { handle } });
      if (existingHandle) {
        return res.status(400).json({ message: 'Handle is already taken.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user and channel atomically
      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            role: 'CREATOR', // Default to creator role to simplify testing
          },
        });

        await tx.channel.create({
          data: {
            name,
            handle: handle.toLowerCase(),
            userId: newUser.id,
            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(handle)}`,
          },
        });

        return newUser;
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, tier: user.tier },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        token,
        user: { id: user.id, email: user.email, role: user.role, tier: user.tier },
      });
    } catch (error: any) {
      console.error('[Auth Register] Error:', error);
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: { channel: true },
      });

      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, tier: user.tier },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tier: user.tier,
          channel: user.channel,
        },
      });
    } catch (error: any) {
      console.error('[Auth Login] Error:', error);
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }

  static async googleLoginMock(req: Request, res: Response) {
    try {
      const { email, name, avatarUrl } = req.body;
      if (!email || !name) {
        return res.status(400).json({ message: 'Email and name are required.' });
      }

      let user = await prisma.user.findUnique({
        where: { email },
        include: { channel: true },
      });

      if (!user) {
        // Sign up automatically
        const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
        const handle = name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 100);

        user = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              email,
              password: randomPassword,
              role: 'CREATOR',
            },
          });

          await tx.channel.create({
            data: {
              name,
              handle,
              userId: newUser.id,
              avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(handle)}`,
            },
          });

          return tx.user.findUnique({
            where: { id: newUser.id },
            include: { channel: true },
          }) as any;
        });
      }

      if (!user) throw new Error('User creation failed');

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, tier: user.tier },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tier: user.tier,
          channel: user.channel,
        },
      });
    } catch (error: any) {
      console.error('[Auth Google Mock] Error:', error);
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }

  static async getCurrentUser(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { channel: true },
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      return res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          tier: user.tier,
          channel: user.channel,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}
export default AuthController;
