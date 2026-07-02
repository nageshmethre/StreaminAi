import request from 'supertest';
import { app, server } from '../index';
import { prisma } from '../db/client';

describe('Auth & Core API Integration Tests', () => {
  // Close the server and database connections after running tests
  afterAll(async () => {
    server.close();
    await prisma.$disconnect();
  });

  describe('GET /health', () => {
    it('should return 200 OK and express health checks', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body.status).toBe('healthy');
    });
  });

  describe('POST /api/auth/register - Validation checks', () => {
    it('should reject registrations with missing email/password fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Failing Test', handle: 'failhandle' });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('All fields are required.');
    });
  });

  describe('GET /api/videos - Fetch public uploads list', () => {
    it('should fetch public ready videos correctly', async () => {
      const res = await request(app).get('/api/videos');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('videos');
      expect(Array.isArray(res.body.videos)).toBe(true);
    });
  });
});
