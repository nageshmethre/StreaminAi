import { Router } from 'express';
import { AuthController } from './controllers/auth.controller';
import { VideoController, videoUpload } from './controllers/video.controller';
import { CommentController } from './controllers/comment.controller';
import { ChannelController } from './controllers/channel.controller';
import { LiveController } from './controllers/live.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { BillingController } from './controllers/billing.controller';
import { authGuard, optionalAuthGuard, requireRole } from './middleware/auth';

const router = Router();

// Authentication Router
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.post('/auth/google', AuthController.googleLoginMock);
router.get('/auth/me', authGuard, AuthController.getCurrentUser);

// Videos Router
router.post('/videos/upload', authGuard, videoUpload.single('video'), VideoController.uploadVideo);
router.get('/videos', optionalAuthGuard, VideoController.getVideos);
router.get('/videos/:id', optionalAuthGuard, VideoController.getVideoById);
router.post('/videos/:id/view', optionalAuthGuard, VideoController.incrementViews);
router.post('/videos/:id/vote', authGuard, VideoController.likeVideo);
router.post('/videos/:id/chat', optionalAuthGuard, VideoController.chatWithVideo);
router.post('/videos/ai-suggestions', authGuard, VideoController.getAISuggestions);

// Comments Router
router.post('/comments', authGuard, CommentController.createComment);
router.get('/comments/video/:videoId', optionalAuthGuard, CommentController.getComments);

// Channel Router
router.get('/channels/:handle', optionalAuthGuard, ChannelController.getChannelByHandle);
router.post('/channels/subscribe', authGuard, ChannelController.subscribe);
router.put('/channels/update', authGuard, ChannelController.updateChannel);

// Livestream Router
router.post('/live/start', authGuard, LiveController.startLiveStream);
router.post('/live/:id/end', authGuard, LiveController.endLiveStream);
router.get('/live/active', optionalAuthGuard, LiveController.getActiveStreams);
router.post('/live/:streamId/chat', authGuard, LiveController.postChatMessage);

// Analytics Router
router.get('/analytics/studio', authGuard, AnalyticsController.getStudioAnalytics);

// Billing & Stripe Router
router.post('/billing/checkout', authGuard, BillingController.createCheckoutSession);
router.post('/billing/webhook', BillingController.handleWebhook);
router.post('/billing/upgrade-direct', authGuard, BillingController.upgradeTierDirect);

export default router;
