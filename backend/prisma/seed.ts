import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting database seeding...');

  // Clean existing tables
  await prisma.auditLog.deleteMany({});
  await prisma.analyticsMetric.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.liveChatMessage.deleteMany({});
  await prisma.liveStream.deleteMany({});
  await prisma.like.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.video.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.channel.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 10);

  // Create Users
  const techCreator = await prisma.user.create({
    data: {
      email: 'creator@streamin.ai',
      password: passwordHash,
      role: 'CREATOR',
      tier: 'PRO',
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      email: 'viewer@streamin.ai',
      password: passwordHash,
      role: 'VIEWER',
      tier: 'FREE',
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@streamin.ai',
      password: passwordHash,
      role: 'ADMIN',
      tier: 'ENTERPRISE',
    },
  });

  // Create Channels
  const techChannel = await prisma.channel.create({
    data: {
      name: 'ByteTech Tutorials',
      handle: 'bytetech',
      description: 'Diving deep into modern AI architectures, coding tips, and engineering breakdowns.',
      userId: techCreator.id,
      avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop',
    },
  });

  const viewerChannel = await prisma.channel.create({
    data: {
      name: 'Alex Developer',
      handle: 'alexdev',
      description: 'My code journals and stream logs.',
      userId: viewerUser.id,
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop',
    },
  });

  // Create Subscriptions
  await prisma.subscription.create({
    data: {
      channelId: techChannel.id,
      subscriberId: viewerUser.id,
    },
  });

  // Create Videos
  const v1 = await prisma.video.create({
    data: {
      title: 'Building a Fullstack Next.js Application in 2026',
      description: 'A comprehensive step-by-step breakdown of designing Next.js layouts, structuring APIs, and compiling code. Like and subscribe for more developer content!',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', // Fallback standard MP4 streaming source
      thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop',
      views: 1250,
      duration: 596.0,
      category: 'Education',
      status: 'READY',
      channelId: techChannel.id,
      transcript: `[00:01] Hello everyone! Today we are building a production-ready application.
[00:30] We will cover routing parameters and state variables.
[02:15] Next, we configure Tailwind rules and glassmorphism.
[05:40] Finally, we set up Docker and compose setups. Enjoy!`,
      aiSummary: 'A complete step-by-step tutorial on Next.js, covering Tailwind, state management, and containerization.',
    },
  });

  const v2 = await prisma.video.create({
    data: {
      title: 'AI Whisper & Chat Companion Integrations Explained',
      description: 'Understanding how OpenAI Whisper transcribes video files and feeds chat loops with contextual transcriptions in real time.',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=600&auto=format&fit=crop',
      views: 740,
      duration: 653.0,
      category: 'AI & Machine Learning',
      status: 'READY',
      channelId: techChannel.id,
      transcript: `[00:01] Welcome! Let's talk about AI integrations.
[01:00] First, Whisper processes the audio file returning line items.
[03:40] Then we parse transcripts and contextually query GPT models.
[06:00] We will see token streaming responses.`,
      aiSummary: 'A technical analysis of transcribing media and running companion bots alongside video components.',
    },
  });

  // Create Comments
  const c1 = await prisma.comment.create({
    data: {
      content: 'This tutorial is incredibly helpful! Thanks for the deep dive.',
      videoId: v1.id,
      authorId: viewerUser.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Glad you liked it! Next week we are doing database clustering.',
      videoId: v1.id,
      authorId: techCreator.id,
      parentId: c1.id,
    },
  });

  // Create Likes
  await prisma.like.create({
    data: {
      videoId: v1.id,
      userId: viewerUser.id,
      isDislike: false,
    },
  });

  // Create Analytics Metrics
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const metricDate = new Date();
    metricDate.setDate(now.getDate() - i);
    await prisma.analyticsMetric.create({
      data: {
        videoId: v1.id,
        views: Math.round(150 + Math.random() * 200),
        watchTimeSeconds: Math.random() * 24000,
        date: metricDate,
      },
    });
  }

  // Create Livestream
  await prisma.liveStream.create({
    data: {
      title: 'Live Coding: Transcoder Dashboard and Websockets',
      streamKey: 'live_bytetech_xyz123',
      isActive: true,
      viewerCount: 42,
      channelId: techChannel.id,
    },
  });

  console.log('[Seed] Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
