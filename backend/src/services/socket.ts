import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';

export class SocketManager {
  private static io: SocketServer | null = null;

  static initialize(server: HttpServer): SocketServer {
    this.io = new SocketServer(server, {
      cors: {
        origin: '*', // Allow all origins in local dev
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`[Socket] User connected: ${socket.id}`);

      // Join a live stream chat room
      socket.on('join_stream', (streamId: string) => {
        socket.join(`stream_${streamId}`);
        console.log(`[Socket] User ${socket.id} joined live room: ${streamId}`);
      });

      // Leave a live stream room
      socket.on('leave_stream', (streamId: string) => {
        socket.leave(`stream_${streamId}`);
        console.log(`[Socket] User ${socket.id} left live room: ${streamId}`);
      });

      // Join individual upload progress room
      socket.on('join_upload', (videoId: string) => {
        socket.join(`upload_${videoId}`);
        console.log(`[Socket] User joined upload track: ${videoId}`);
      });

      socket.on('disconnect', () => {
        console.log(`[Socket] User disconnected: ${socket.id}`);
      });
    });

    return this.io;
  }

  static getIO(): SocketServer {
    if (!this.io) {
      throw new Error('Socket.io has not been initialized yet.');
    }
    return this.io;
  }

  /**
   * Emit progress updates for video uploads.
   */
  static emitUploadProgress(videoId: string, progress: number) {
    if (this.io) {
      this.io.to(`upload_${videoId}`).emit('upload_progress', { videoId, progress });
    }
  }

  /**
   * Emit comments or reactions dynamically.
   */
  static emitNewComment(videoId: string, comment: any) {
    if (this.io) {
      this.io.emit(`video_comment_${videoId}`, comment);
    }
  }

  /**
   * Send live stream messages in real-time.
   */
  static emitLiveChatMessage(streamId: string, message: any) {
    if (this.io) {
      this.io.to(`stream_${streamId}`).emit('new_chat_message', message);
    }
  }

  /**
   * Broadcast subscriber upload notification.
   */
  static emitUploadNotification(subscriberId: string, notification: any) {
    if (this.io) {
      this.io.emit(`notifications_${subscriberId}`, notification);
    }
  }
}

export default SocketManager;
