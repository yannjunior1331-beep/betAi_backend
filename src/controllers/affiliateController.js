// controllers/affiliateController.js
import User from '../models/user.js';
// import { promocodeGenerator } from '../utils/promocodeGenerator.js';

// @desc    Register user as affiliate
// @route   POST /api/affiliate/become-affiliate
// @access  Private
export const registerAsAffiliate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { promoCode } = req.body;

    // Check if user is already an affiliate
    const user = await User.findById(userId);
    
    if (user.isAffiliate) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered as an affiliate'
      });
    }

    // Validate promo code
    if (!promoCode || promoCode.trim().length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Promo code must be at least 4 characters long'
      });
    }

    // Check if promo code already exists
    const existingPromoCode = await User.findOne({ 
      promoCode: promoCode.toUpperCase() 
    });

    if (existingPromoCode) {
      return res.status(400).json({
        success: false,
        message: 'This promo code is already taken. Please choose another one.'
      });
    }

    // Generate a unique promo code if not provided or if taken
    let finalPromoCode = promoCode.toUpperCase();
    
    // Generate unique code if the requested one exists
    if (existingPromoCode) {
      finalPromoCode = await generateUniquePromoCode();
    }

    // Update user as affiliate
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        isAffiliate: true,
        promoCode: finalPromoCode,
        affiliateTier: 'basic',
        affiliateCommission: 10,
        'affiliateEarnings.total': 0,
        'affiliateEarnings.pending': 0,
        'affiliateEarnings.paid': 0,
        'affiliateEarnings.available': 0,
        'affiliateStats.totalReferrals': 0,
        'affiliateStats.activeReferrals': 0,
        'affiliateStats.conversionRate': 0,
        'affiliateStats.averageCommission': 0,
        minimumPayout: 50
      },
      { new: true, select: '-password' }
    );

    res.status(200).json({
      success: true,
      message: 'Successfully registered as affiliate!',
      user: updatedUser
    });

  } catch (error) {
    console.error('Affiliate registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during affiliate registration'
    });
  }
};

// @desc    Validate if promo code is available
// @route   GET /api/affiliate/validate-promocode/:code
// @access  Private
export const validatePromoCode = async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code || code.trim().length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Promo code must be at least 4 characters'
      });
    }

    // Check if promo code already exists
    const existingUser = await User.findOne({ 
      promoCode: code.toUpperCase() 
    });

    if (existingUser) {
      return res.status(200).json({
        success: false,
        available: false,
        message: 'Promo code already taken'
      });
    }

    // Check if code meets requirements
    const isValid = /^[A-Z0-9]+$/.test(code.toUpperCase());
    
    if (!isValid) {
      return res.status(200).json({
        success: false,
        available: false,
        message: 'Only uppercase letters and numbers allowed'
      });
    }

    res.status(200).json({
      success: true,
      available: true,
      message: 'Promo code is available'
    });

  } catch (error) {
    console.error('Promo code validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during validation'
    });
  }
};

// @desc    Get affiliate dashboard stats
// @route   GET /api/affiliate/stats

// controllers/affiliateController.js - FIXED VERSION
// @desc    Get affiliate dashboard stats
// @route   GET /api/affiliate/stats
// @access  Private (Affiliate only)
export const getAffiliateStats = async (req, res) => {
  try {
    console.log('🔍 Starting getAffiliateStats for user:', req.user.id);
    
    const userId = req.user.id;
    
    // Get user without password
    const user = await User.findById(userId).select('-password').lean();
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log('🔍 User affiliate status:', {
      isAffiliate: user.isAffiliate,
      promoCode: user.promoCode,
      affiliateTier: user.affiliateTier
    });
    
    if (!user.isAffiliate) {
      console.log('❌ User is not an affiliate');
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not an affiliate.'
      });
    }

    // Get today's date for calculations
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Calculate today's earnings - SIMPLIFIED VERSION
    const todayEarnings = 0;
    
    // Calculate this week's earnings
    const weekEarnings = 0;
    
    // Calculate this month's earnings
    const monthEarnings = 0;

    // Get referred users - SIMPLIFIED
    const referredUsers = await User.find({ referredBy: userId })
      .select('username email subscription createdAt')
      .lean();
    
    console.log('📊 Found referred users:', referredUsers.length);

    // Calculate active referrals (those with subscription)
    const activeReferrals = referredUsers.filter(u => u.subscription !== 'none').length;

    // Calculate conversion rate
    const conversionRate = referredUsers.length > 0 
      ? Math.round((activeReferrals / referredUsers.length) * 100)
      : 0;

    // Prepare response data
    const stats = {
      // Basic info
      promoCode: user.promoCode || 'N/A',
      affiliateTier: user.affiliateTier || 'basic',
      commissionRate: `${user.affiliateCommission || 10}%`,
      
      // Earnings - Using user's affiliateEarnings
      totalEarnings: user.affiliateEarnings?.total || 0,
      pendingPayout: user.affiliateEarnings?.pending || 0,
      availablePayout: user.affiliateEarnings?.available || 0,
      todayEarnings,
      thisWeekEarnings: weekEarnings,
      thisMonthEarnings: monthEarnings,
      
      // Referral stats
      totalReferrals: referredUsers.length,
      activeReferrals,
      conversionRate: `${conversionRate}%`,
      averageCommission: referredUsers.length > 0 
        ? `$${((user.affiliateEarnings?.total || 0) / referredUsers.length).toFixed(2)}`
        : '$0.00',
      
      // Payout info
      minimumPayout: user.minimumPayout || 50,
      nextPayoutDate: user.affiliateStats?.nextPayoutDate 
        ? new Date(user.affiliateStats.nextPayoutDate).toISOString().split('T')[0]
        : 'Not scheduled',
      
      // Links
      referralLink: `https://yourapp.com/register?ref=${user.promoCode || 'N/A'}`
    };

    console.log('✅ Stats prepared successfully:', {
      totalEarnings: stats.totalEarnings,
      totalReferrals: stats.totalReferrals,
      activeReferrals: stats.activeReferrals
    });

    res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Get affiliate stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching affiliate stats: ' + error.message
    });
  }
};

// @desc    Get referred users list
// @route   GET /api/affiliate/referrals
// @access  Private (Affiliate only)
export const getReferrals = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    
    if (!user.isAffiliate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not an affiliate.'
      });
    }

    // Get referred users with details
    const referrals = await User.find({ referredBy: userId })
      .select('username email subscription createdAt')
      .sort({ createdAt: -1 });

    // Calculate commission for each referral
    const referralsWithCommission = referrals.map(referral => {
      // Calculate commission based on subscription
      let commission = 0;
      const subscriptionCommissions = {
        'daily': 5,
        'weekly': 10,
        'monthly': 20
      };
      
      if (referral.subscription !== 'none') {
        commission = subscriptionCommissions[referral.subscription] || 0;
      }

      return {
        id: referral._id,
        username: referral.username,
        email: referral.email,
        subscription: referral.subscription,
        joinedDate: referral.createdAt,
        status: referral.subscription !== 'none' ? 'active' : 'inactive',
        totalDeposits: subscriptionCommissions[referral.subscription] || 0,
        commission,
        lastActivity: calculateLastActivity(referral.updatedAt)
      };
    });

    res.status(200).json({
      success: true,
      referrals: referralsWithCommission,
      total: referrals.length
    });

  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching referrals'
    });
  }
};

// @desc    Request cashout
// @route   POST /api/affiliate/cashout
// @access  Private (Affiliate only)
export const requestCashout = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, method } = req.body;

    const user = await User.findById(userId);
    
    if (!user.isAffiliate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not an affiliate.'
      });
    }

    // Validate amount
    const availableAmount = user.affiliateEarnings.available || 0;
    const minimumPayout = user.minimumPayout || 50;

    if (amount < minimumPayout) {
      return res.status(400).json({
        success: false,
        message: `Minimum cashout amount is $${minimumPayout}`
      });
    }

    if (amount > availableAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient funds. Available: $${availableAmount.toFixed(2)}`
      });
    }

    // Create cashout request
    const cashoutRequest = {
      amount,
      method,
      status: 'pending',
      requestedAt: new Date(),
      estimatedProcessing: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
    };

    // Update user's earnings
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          'affiliateEarnings.available': -amount,
          'affiliateEarnings.pending': amount
        },
        $push: {
          payoutHistory: cashoutRequest
        }
      },
      { new: true, select: '-password' }
    );

    // TODO: Send notification to admin about new cashout request
    // TODO: Send confirmation email to user

    res.status(200).json({
      success: true,
      message: `Cashout request of $${amount} submitted successfully. Processing in 3-5 business days.`,
      cashoutRequest,
      user: updatedUser
    });

  } catch (error) {
    console.error('Cashout request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing cashout request'
    });
  }
};

// @desc    Update payout method
// @route   PUT /api/affiliate/payout-method
// @access  Private (Affiliate only)
export const updatePayoutMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { method, details } = req.body;

    const user = await User.findById(userId);
    
    if (!user.isAffiliate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not an affiliate.'
      });
    }

    // Validate payment method
    const validMethods = ['bank', 'paypal', 'skrill', 'crypto'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method'
      });
    }

    // Update payout method
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        payoutMethod: { method, details }
      },
      { new: true, select: '-password' }
    );

    res.status(200).json({
      success: true,
      message: 'Payout method updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update payout method error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating payout method'
    });
  }
};

// @desc    Get payout history
// @route   GET /api/affiliate/payout-history
// @access  Private (Affiliate only)
export const getPayoutHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).select('payoutHistory affiliateEarnings');
    
    if (!user.isAffiliate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not an affiliate.'
      });
    }

    res.status(200).json({
      success: true,
      payouts: user.payoutHistory || [],
      totalPaid: user.affiliateEarnings.paid || 0
    });

  } catch (error) {
    console.error('Get payout history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching payout history'
    });
  }
};

// @desc    Get affiliate analytics
// @route   GET /api/affiliate/analytics
// @access  Private (Affiliate only)
export const getAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    
    if (!user.isAffiliate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not an affiliate.'
      });
    }

    // Get referrals for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const referrals = await User.find({ 
      referredBy: userId,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Calculate daily signups
    const dailySignups = {};
    referrals.forEach(ref => {
      const date = ref.createdAt.toISOString().split('T')[0];
      dailySignups[date] = (dailySignups[date] || 0) + 1;
    });

    // Calculate conversion rate over time
    const activeReferrals = referrals.filter(u => u.subscription !== 'none').length;
    const conversionRate = referrals.length > 0 
      ? (activeReferrals / referrals.length) * 100 
      : 0;

    // Calculate estimated monthly earnings
    const estimatedMonthly = (user.affiliateEarnings.total / 30) * 30; // Simple projection

    const analytics = {
      dailySignups,
      totalReferrals30Days: referrals.length,
      activeReferrals30Days: activeReferrals,
      conversionRate: `${conversionRate.toFixed(1)}%`,
      estimatedMonthlyEarnings: `$${estimatedMonthly.toFixed(2)}`,
      topReferralDays: Object.entries(dailySignups)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([date, count]) => ({ date, count }))
    };

    res.status(200).json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching analytics'
    });
  }
};

// @desc    Get affiliate leaderboard
// @route   GET /api/affiliate/leaderboard
// @access  Private (Affiliate only)
export const getAffiliateLeaderboard = async (req, res) => {
  try {
    // Get top 10 affiliates by earnings
    const topAffiliates = await User.find({ 
      isAffiliate: true,
      'affiliateEarnings.total': { $gt: 0 }
    })
    .select('username promoCode affiliateEarnings.total affiliateTier')
    .sort({ 'affiliateEarnings.total': -1 })
    .limit(10);

    const leaderboard = topAffiliates.map((affiliate, index) => ({
      rank: index + 1,
      username: affiliate.username,
      promoCode: affiliate.promoCode,
      tier: affiliate.affiliateTier,
      totalEarnings: affiliate.affiliateEarnings.total,
      referrals: affiliate.affiliateStats?.totalReferrals || 0
    }));

    res.status(200).json({
      success: true,
      leaderboard
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching leaderboard'
    });
  }
};

// ============== HELPER FUNCTIONS ==============

// Helper to generate unique promo code
const generateUniquePromoCode = async () => {
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 7; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  let code = generateCode();
  let attempts = 0;
  
  while (attempts < 10) {
    const existing = await User.findOne({ promoCode: code });
    if (!existing) return code;
    
    code = generateCode();
    attempts++;
  }
  
  // Fallback: timestamp + random
  return 'AFF' + Date.now().toString().slice(-7);
};

// Helper to calculate earnings for a period
const calculatePeriodEarnings = async (affiliateId, startDate, endDate) => {
  // This would integrate with your transaction/commission system
  // For now, returning a simulated value
  return Math.random() * 100;
};

// Helper to calculate last activity
const calculateLastActivity = (updatedAt) => {
  const now = new Date();
  const lastUpdate = new Date(updatedAt);
  const diffMs = now - lastUpdate;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours} hours ago`;
  return `${Math.floor(diffHours / 24)} days ago`;
};