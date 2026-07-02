import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import dotenv from 'dotenv';
import router from './routes';
import { SocketManager } from './services/socket';
import { TranscoderService } from './services/transcoder';

// Load environmental variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Security and middleware setup
app.use(helmet({
  crossOriginResourcePolicy: false, // Required to serve static local videos correctly to frontend
}));
app.use(cors({
  origin: '*', // Allow development origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded videos and transcoding playlists
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// Mount standard routes
app.use('/api', router);

// Default status probe route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Initialize directories and Socket.io manager
TranscoderService.init();
SocketManager.initialize(server);

// Global Error Handler Middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled Exception Error]:', err.stack);
  res.status(500).json({
    message: 'An unexpected error occurred on the server.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Bootstrap server
server.listen(PORT, () => {
  console.log(`[StreaminAi API Server] Running on http://localhost:${PORT}`);
  console.log(`[Uploads Directory] Serving files from: ${uploadsPath}`);
});

export { app, server };
