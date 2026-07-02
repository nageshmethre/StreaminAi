import { Response } from 'express';
import { prisma } from '../db/client';
import { AuthRequest } from '../middleware/auth';

export class ChannelController {
  static async getChannelByHandle(req: AuthRequest, res: Response) {
    try {
      const { handle } = req.params;

      const channel = await prisma.channel.findUnique({
        where: { handle: handle.toLowerCase() },
        include: {
          subscribers: true,
          videos: {
            where: { status: 'READY' },
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: { subscribers: true, videos: true },
          },
        },
      });

      if (!channel) {
        return res.status(404).json({ message: 'Channel not found.' });
      }

      // Check if current user is subscribed
      let isSubscribed = false;
      if (req.user) {
        const sub = await prisma.subscription.findUnique({
          where: {
            channelId_subscriberId: {
              channelId: channel.id,
              subscriberId: req.user.id,
            },
          },
        });
        isSubscribed = !!sub;
      }

      return res.status(200).json({ channel, isSubscribed });
    } catch (error: any) {
      return res.status(500).json({ message: 'Failed to fetch channel.', error: error.message });
    }
  }

  static async subscribe(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized.' });
      }

      const { channelId } = req.body;
      if (!channelId) {
        return res.status(400).json({ message: 'ChannelId is required.' });
      }

      const channel = await prisma.channel.findUnique({ where: { id: channelId } });
      if (!channel) {
        return res.status(404).json({ message: 'Channel not found.' });
      }

      if (channel.userId === req.user.id) {
        return res.status(400).json({ message: 'You cannot subscribe to your own channel.' });
      }

      const existingSub = await prisma.subscription.findUnique({
        where: {
          channelId_subscriberId: {
            channelId,
            subscriberId: req.user.id,
          },
        },
      });

      if (existingSub) {
        await prisma.subscription.delete({
          where: { id: existingSub.id },
        });
        return res.status(200).json({ message: 'Unsubscribed.', subscribed: false });
      } else {
        const sub = await prisma.subscription.create({
          data: {
            channelId,
            subscriberId: req.user.id,
          },
        });

        // Trigger subscription alert notification
        await prisma.notification.create({
          data: {
            userId: channel.userId,
            senderId: req.user.id,
            type: 'SUBSCRIBE',
            message: `A new user subscribed to your channel!`,
          },
        });

        return res.status(201).json({ message: 'Subscribed.', subscribed: true, sub });
      }
    } catch (error: any) {
      return res.status(500).json({ message: 'Failed to subscribe.', error: error.message });
    }
  }

  static async updateChannel(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized.' });
      }

      const { name, description, avatarUrl, bannerUrl } = req.body;

      const channel = await prisma.channel.findUnique({
        where: { userId: req.user.id },
      });

      if (!channel) {
        return res.status(404).json({ message: 'Channel not found.' });
      }

      const updated = await prisma.channel.update({
        where: { id: channel.id },
        data: {
          name: name || channel.name,
          description: description !== undefined ? description : channel.description,
          avatarUrl: avatarUrl || channel.avatarUrl,
          bannerUrl: bannerUrl || channel.bannerUrl,
        },
      });

      return res.status(200).json({ message: 'Channel updated.', channel: updated });
    } catch (error: any) {
      return res.status(500).json({ message: 'Failed to update channel.', error: error.message });
    }
  }
}
export default ChannelController;
