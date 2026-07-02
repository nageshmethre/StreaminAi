import { Response } from 'express';
import { prisma } from '../db/client';
import { AuthRequest } from '../middleware/auth';

export class AnalyticsController {
  static async getStudioAnalytics(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized.' });
      }

      // Fetch user's channel
      const channel = await prisma.channel.findUnique({
        where: { userId: req.user.id },
      });

      if (!channel) {
        return res.status(404).json({ message: 'Channel not found.' });
      }

      // Total Videos
      const totalVideos = await prisma.video.count({
        where: { channelId: channel.id },
      });

      // Total Subscribers
      const totalSubscribers = await prisma.subscription.count({
        where: { channelId: channel.id },
      });

      // Total Views across all videos
      const videos = await prisma.video.findMany({
        where: { channelId: channel.id },
        select: { id: true, title: true, views: true, duration: true, createdAt: true },
      });

      const totalViews = videos.reduce((acc, v) => acc + v.views, 0);

      // Total Watch Time (Simulated aggregate)
      const totalWatchTime = videos.reduce((acc, v) => acc + (v.views * v.duration * 0.6), 0); // assume 60% completion rate average

      // Views by Video List (for comparisons)
      const videoPerformanceList = videos.map((v) => ({
        id: v.id,
        title: v.title,
        views: v.views,
        createdAt: v.createdAt,
      }));

      // Aggregates for charting (past 7 days simulated views)
      const chartData = [
        { label: 'Mon', views: Math.round(totalViews * 0.1) },
        { label: 'Tue', views: Math.round(totalViews * 0.12) },
        { label: 'Wed', views: Math.round(totalViews * 0.15) },
        { label: 'Thu', views: Math.round(totalViews * 0.11) },
        { label: 'Fri', views: Math.round(totalViews * 0.18) },
        { label: 'Sat', views: Math.round(totalViews * 0.22) },
        { label: 'Sun', views: Math.round(totalViews * 0.12) },
      ];

      return res.status(200).json({
        summary: {
          totalVideos,
          totalSubscribers,
          totalViews,
          totalWatchTimeMinutes: Math.round(totalWatchTime / 60),
        },
        videos: videoPerformanceList,
        chartData,
      });
    } catch (error: any) {
      return res.status(500).json({ message: 'Failed to fetch studio analytics.', error: error.message });
    }
  }
}
export default AnalyticsController;
