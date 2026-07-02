import { Response } from 'express';
import { prisma } from '../db/client';
import { AuthRequest } from '../middleware/auth';
import { SocketManager } from '../services/socket';
import { uuid } from 'uuidv4'; // or simple random generation since we are in node

export class LiveController {
  static async startLiveStream(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized.' });
      }

      const { title } = req.body;
      if (!title) {
        return res.status(400).json({ message: 'Stream title is required.' });
      }

      const channel = await prisma.channel.findUnique({
        where: { userId: req.user.id },
      });

      if (!channel) {
        return res.status(404).json({ message: 'Channel not found.' });
      }

      // Generate a mock stream key
      const streamKey = `live_${channel.handle}_${Math.random().toString(36).substring(2, 10)}`;

      const liveStream = await prisma.liveStream.create({
        data: {
          title,
          streamKey,
          isActive: true,
          channelId: channel.id,
        },
      });

      return res.status(201).json({
        message: 'Live stream started.',
        stream: liveStream,
        streamUrl: `rtmp://localhost/live/${streamKey}`,
      });
    } catch (error: any) {
      return res.status(500).json({ message: 'Failed to start live stream.', error: error.message });
    }
  }

  static async endLiveStream(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized.' });
      }

      const { id } = req.params;

      const stream = await prisma.liveStream.findUnique({ where: { id } });
      if (!stream) {
        return res.status(404).json({ message: 'Stream not found.' });
      }

      const channel = await prisma.channel.findUnique({ where: { id: stream.channelId } });
      if (!channel || channel.userId !== req.user.id) {
        return res.status(403).json({ message: 'You do not own this live stream.' });
      }

      const updated = await prisma.liveStream.update({
        where: { id },
        data: { isActive: false },
      });

      return res.status(200).json({ message: 'Live stream ended.', stream: updated });
    } catch (error: any) {
      return res.status(500).json({ message: 'Failed to end live stream.' });
    }
  }

  static async getActiveStreams(req: AuthRequest, res: Response) {
    try {
      const streams = await prisma.liveStream.findMany({
        where: { isActive: true },
        include: {
          channel: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return res.status(200).json({ streams });
    } catch (error: any) {
      return res.status(500).json({ message: 'Failed to retrieve active streams.' });
    }
  }

  static async postChatMessage(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized.' });
      }

      const { streamId } = req.params;
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ message: 'Message content cannot be empty.' });
      }

      const liveStream = await prisma.liveStream.findUnique({ where: { id: streamId } });
      if (!liveStream || !liveStream.isActive) {
        return res.status(404).json({ message: 'Active live stream not found.' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { channel: true },
      });

      const message = await prisma.liveChatMessage.create({
        data: {
          liveStreamId: streamId,
          authorId: req.user.id,
          content,
        },
      });

      const messagePayload = {
        ...message,
        author: {
          id: user?.id,
          name: user?.channel?.name || user?.email,
          avatarUrl: user?.channel?.avatarUrl,
        },
      };

      // Broadcast chat message to socket room
      SocketManager.emitLiveChatMessage(streamId, messagePayload);

      return res.status(201).json({ message: messagePayload });
    } catch (error: any) {
      return res.status(500).json({ message: 'Failed to post message.', error: error.message });
    }
  }
}
export default LiveController;
