import { Response } from 'express';
import { prisma } from '../db/client';
import { AuthRequest } from '../middleware/auth';

export class BillingController {
  static async createCheckoutSession(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized.' });
      }

      const { tier } = req.body;
      if (!tier || !['PRO', 'ENTERPRISE'].includes(tier)) {
        return res.status(400).json({ message: 'Invalid or missing tier.' });
      }

      // Simulate a Stripe Checkout URL
      // In production, you would run stripe.checkout.sessions.create({...})
      const mockCheckoutUrl = `http://localhost:3000/billing/success?tier=${tier}&session_id=mock_session_${Date.now()}`;

      return res.status(200).json({
        url: mockCheckoutUrl,
      });
    } catch (error: any) {
      return res.status(500).json({ message: 'Failed to create checkout session.' });
    }
  }

  static async handleWebhook(req: AuthRequest, res: Response) {
    try {
      // In production, verify signatures using stripe.webhooks.constructEvent(...)
      const { type, data } = req.body;

      if (type === 'checkout.session.completed') {
        const email = data.object.customer_details.email;
        const tier = data.object.metadata.tier;

        if (email && tier) {
          await prisma.user.update({
            where: { email },
            data: { tier: tier as 'PRO' | 'ENTERPRISE' },
          });

          console.log(`[Stripe Webhook] Successfully upgraded ${email} to ${tier}`);
        }
      }

      return res.status(200).json({ received: true });
    } catch (error: any) {
      return res.status(500).json({ message: 'Webhook processing failed.' });
    }
  }

  /**
   * Simple mock endpoint to simulate a direct tier upgrade for testing
   */
  static async upgradeTierDirect(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized.' });
      }

      const { tier } = req.body;
      if (!tier || !['FREE', 'PRO', 'ENTERPRISE'].includes(tier)) {
        return res.status(400).json({ message: 'Invalid subscription tier.' });
      }

      await prisma.user.update({
        where: { id: req.user.id },
        data: { tier },
      });

      return res.status(200).json({ message: `Successfully upgraded to ${tier}`, tier });
    } catch (error: any) {
      return res.status(500).json({ message: 'Upgrade failed.' });
    }
  }
}
export default BillingController;
