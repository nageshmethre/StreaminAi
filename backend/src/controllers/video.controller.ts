import { Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../db/client';
import { AuthRequest } from '../middleware/auth';
import { TranscoderService } from '../services/transcoder';
import { AIService } from '../services/ai';
import { SocketManager } from '../services/socket';

// Configure multer storage for initial temporary raw video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../../uploads/temp');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

export const videoUpload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB video file limit
  fileFilter: (req, file, cb) => {
    const filetypes = /mp4|mkv|avi|mov|webm/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only video files (mp4, mkv, avi, mov, webm) are allowed.'));
  },
});

export class VideoController {
  static async uploadVideo(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized.' });
      }

      const file = req.file;
      const { title, description, category } = req.body;

      if (!file) {
        return res.status(400).json({ message: 'No video file uploaded.' });
      }
      if (!title) {
        return res.status(400).json({ message: 'Title is required.' });
      }

      // Find user channel
      const channel = await prisma.channel.findUnique({
        where: { userId: req.user.id },
      });

      if (!channel) {
        return res.status(404).json({ message: 'Channel not found. Register a channel first.' });
      }

      // Create video DB entry as processing
      const video = await prisma.video.create({
        data: {
          title,
          description: description || '',
          category: category || 'General',
          channelId: channel.id,
          status: 'PROCESSING',
          thumbnailUrl: `https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=400&auto=format&fit=crop`,
        },
      });

      // Run transcoding in background, updating client via WebSockets
      TranscoderService.transcode(video.id, file.path, (progress) => {
        SocketManager.emitUploadProgress(video.id, progress);
      })
        .then(async ({ url, duration }) => {
          // Trigger automated AI transcription in the background once ready
          const trans = await AIService.generateTranscript(title);
          const suggestions = await AIService.suggestMetadata(title, category || 'General');

          await prisma.video.update({
            where: { id: video.id },
            data: {
              transcript: trans,
              aiSummary: suggestions.description,
            },
          });

          // Fetch subscribers to notify them
          const subs = await prisma.subscription.findMany({
            where: { channelId: channel.id },
          });

          // Create notification for every subscriber
          for (const sub of subs) {
            const notif = await prisma.notification.create({
              data: {
                userId: sub.subscriberId,
                senderId: req.user?.id,
                type: 'UPLOAD',
                videoId: video.id,
                message: `New video uploaded by ${channel.name}: "${title}"`,
              },
            });
            SocketManager.emitUploadNotification(sub.subscriberId, notif);
          }
        })
        .catch((err) => {
          console.error('[VideoController] Transcode background error:', err);
        });

      return res.status(202).json({
        message: 'Video upload received and is processing.',
        videoId: video.id,
      });
    } catch (error: any) {
      console.error('[Upload Video] Error:', error);
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }

  static async getVideos(req: AuthRequest, res: Response) {
    try {
      const { search, category, channelId } = req.query;

      const whereClause: any = { status: 'READY' };

      if (category) {
        whereClause.category = category as string;
      }
      if (channelId) {
        whereClause.channelId = channelId as string;
      }
      if (search) {
        whereClause.OR = [
          { title: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const videos = await prisma.video.findMany({
        where: whereClause,
        include: {
          channel: true,
          likes: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({ videos });
    } catch (error: any) {
      return res.status(500).json({ message: 'Failed to fetch videos.', error: error.message });
    }
  }

  static async getVideoById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const video = await prisma.video.findUnique({
        where: { id },
        include: {
          channel: {
            include: {
              subscribers: true,
            },
          },
          likes: true,
        },
      });

      if (!video) {
        return res.status(404).json({ message: 'Video not found.' });
      }

      return res.status(200).json({ video });
    } catch (error: any) {
      return res.status(500).json({ message: 'Failed to fetch video.', error: error.message });
    }
  }

  static async incrementViews(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const video = await prisma.video.update({
        where: { id },
        data: { views: { increment: 1 } },
      });

      // Track metric for analytics
      await prisma.analyticsMetric.create({
        data: {
          videoId: id,
          views: 1,
          watchTimeSeconds: video.duration || 60.0,
        },
      });

      return res.status(200).json({ message: 'Views updated.', views: video.views });
    } catch (error: any) {
      return res.status(500).json({ message: 'Failed to update views.' });
    }
  }

  static async likeVideo(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized.' });
      }
      const { id } = req.params;
      const { isDislike } = req.body; // true if dislike, false if like

      const existingLike = await prisma.like.findUnique({
        where: {
          videoId_userId: { videoId: id, userId: req.user.id },
        },
      });

      if (existingLike) {
        if (existingLike.isDislike === isDislike) {
          // Remove like/dislike if clicked twice
          await prisma.like.delete({
            where: { id: existingLike.id },
          });
          return res.status(200).json({ message: 'Vote removed.' });
        } else {
          // Toggle vote
          const updated = await prisma.like.update({
            where: { id: existingLike.id },
            data: { isDislike },
          });
          return res.status(200).json({ message: 'Vote updated.', vote: updated });
        }
      } else {
        const vote = await prisma.like.create({
          data: {
            videoId: id,
            userId: req.user.id,
            isDislike: !!isDislike,
          },
        });
        return res.status(201).json({ message: 'Vote recorded.', vote });
      }
    } catch (error: any) {
      return res.status(500).json({ message: 'Failed to record vote.' });
    }
  }

  static async chatWithVideo(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { question, history } = req.body;

      if (!question) {
        return res.status(400).json({ message: 'Question is required.' });
      }

      const video = await prisma.video.findUnique({
        where: { id },
      });

      if (!video) {
        return res.status(404).json({ message: 'Video not found.' });
      }

      const transcript = video.transcript || 'No transcripts transcripts available.';
      const reply = await AIService.getVideoChatReply(transcript, question, history || []);

      return res.status(200).json({ reply });
    } catch (error: any) {
      return res.status(500).json({ message: 'AI chat helper error.', error: error.message });
    }
  }

  static async getAISuggestions(req: AuthRequest, res: Response) {
    try {
      const { title, category } = req.body;
      if (!title) {
        return res.status(400).json({ message: 'Title is required for suggestions.' });
      }

      const suggestions = await AIService.suggestMetadata(title, category || 'General');
      return res.status(200).json(suggestions);
    } catch (error: any) {
      return res.status(500).json({ message: 'Suggestions failed.' });
    }
  }
}
export default VideoController;
