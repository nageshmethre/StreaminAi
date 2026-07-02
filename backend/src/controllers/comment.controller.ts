import { Response } from 'express';
import { prisma } from '../db/client';
import { AuthRequest } from '../middleware/auth';
import { AIService } from '../services/ai';
import { SocketManager } from '../services/socket';

export class CommentController {
  static async createComment(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized.' });
      }

      const { content, videoId, parentId } = req.body;

      if (!content || !videoId) {
        return res.status(400).json({ message: 'Content and videoId are required.' });
      }

      // Run AI Safety and Moderation filters
      const moderation = await AIService.moderateContent(content);
      if (!moderation.safe) {
        return res.status(400).json({
          message: 'Comment rejected by safety filters.',
          reason: moderation.reason,
        });
      }

      const comment = await prisma.comment.create({
        data: {
          content,
          videoId,
          authorId: req.user.id,
          parentId: parentId || null,
        },
        include: {
          author: {
            select: {
              id: true,
              email: true,
              channel: {
                select: {
                  name: true,
                  avatarUrl: true,
                  handle: true,
                },
              },
            },
          },
        },
      });

      // Broadcast comment creation via socket
      SocketManager.emitNewComment(videoId, comment);

      return res.status(201).json({ comment });
    } catch (error: any) {
      console.error('[Create Comment] Error:', error);
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }

  static async getComments(req: AuthRequest, res: Response) {
    try {
      const { videoId } = req.params;

      const comments = await prisma.comment.findMany({
        where: {
          videoId,
          parentId: null, // Get main comments first
        },
        include: {
          author: {
            select: {
              id: true,
              email: true,
              channel: {
                select: {
                  name: true,
                  avatarUrl: true,
                  handle: true,
                },
              },
            },
          },
          replies: {
            include: {
              author: {
                select: {
                  id: true,
                  email: true,
                  channel: {
                    select: {
                      name: true,
                      avatarUrl: true,
                      handle: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({ comments });
    } catch (error: any) {
      return res.status(500).json({ message: 'Failed to retrieve comments.', error: error.message });
    }
  }
}
export default CommentController;
