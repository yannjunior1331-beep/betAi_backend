// routes/affiliateRoutes.js
import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  registerAsAffiliate,
  getAffiliateStats,
  requestCashout,
  getReferrals,
  getAnalytics,
  updatePayoutMethod,
  getPayoutHistory,
  getAffiliateLeaderboard,
  validatePromoCode
} from '../controllers/affiliateController.js';

const router = express.Router();

// All routes protected
router.use(verifyToken);

// Register as affiliate
router.post('/become-affiliate', registerAsAffiliate);

// Validate promo code availability
router.get('/validate-promocode/:code', validatePromoCode);

// Get affiliate dashboard stats
router.get('/stats', getAffiliateStats);

// Get referrals list
router.get('/referrals', getReferrals);

// Get analytics
router.get('/analytics', getAnalytics);

// Request cashout
router.post('/cashout', requestCashout);

// Update payout method
router.put('/payout-method', updatePayoutMethod);

// Get payout history
router.get('/payout-history', getPayoutHistory);

// Get leaderboard (top affiliates)
router.get('/leaderboard', getAffiliateLeaderboard);

export default router;