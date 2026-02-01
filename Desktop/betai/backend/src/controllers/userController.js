import User from '../models/user.js';
import jwt from 'jsonwebtoken';

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
        expiresIn: '1d'
    });
};

// REGISTER USER
// REGISTER USER - FIXED VERSION
export const registerUser = async (req, res) => {
    try {
        const { username, email, password, referralCode } = req.body;

        // Check if user exists by email only
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Handle referral if promo code is provided
        let referredBy = null;
        let usedPromoCode = null;
        let referringUser = null;
        
        if (referralCode) {
            // Find the referring user by promo code
            referringUser = await User.findOne({ promoCode: referralCode });
            
            if (!referringUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid referral code'
                });
            }
            
            referredBy = referringUser._id;
            usedPromoCode = referralCode;
            
            // 🔴 CRITICAL FIX: Ensure referring user is marked as affiliate
            if (!referringUser.isAffiliate) {
                referringUser.isAffiliate = true;
                referringUser.affiliateTier = 'basic';
                referringUser.affiliateCommission = 10;
                referringUser.minimumPayout = 50;
                
                // Initialize earnings if not present
                if (!referringUser.affiliateEarnings) {
                    referringUser.affiliateEarnings = {
                        total: 0,
                        pending: 0,
                        paid: 0,
                        available: 0
                    };
                }
                
                if (!referringUser.affiliateStats) {
                    referringUser.affiliateStats = {
                        totalReferrals: 0,
                        activeReferrals: 0,
                        conversionRate: 0,
                        averageCommission: 0,
                        lastPayoutDate: null,
                        nextPayoutDate: null
                    };
                }
                
                console.log(`✅ Marked user ${referringUser._id} as affiliate`);
            }
        }

        // Create new user
        const user = await User.create({
            username,
            email,
            password,
            referredBy,
            usedPromoCode
        });

        // 🔴 CRITICAL FIX: Update referring user's referral stats AFTER user creation
        if (referringUser) {
            // Add the new user to referredUsers array
            if (!referringUser.referredUsers.includes(user._id)) {
                referringUser.referredUsers.push(user._id);
            }
            
            // Update referral count
            referringUser.referralCount = referringUser.referredUsers.length;
            
            // Update affiliate stats
            if (referringUser.affiliateStats) {
                referringUser.affiliateStats.totalReferrals = referringUser.referralCount;
                
                // Calculate active referrals (users with subscriptions)
                const activeReferrals = await User.countDocuments({
                    _id: { $in: referringUser.referredUsers },
                    subscription: { $ne: 'none' }
                });
                
                referringUser.affiliateStats.activeReferrals = activeReferrals;
                referringUser.affiliateStats.conversionRate = 
                    referringUser.referralCount > 0 
                    ? Math.round((activeReferrals / referringUser.referralCount) * 100)
                    : 0;
                    
                referringUser.affiliateStats.averageCommission = 
                    referringUser.referralCount > 0 
                    ? (referringUser.affiliateEarnings?.total || 0) / referringUser.referralCount
                    : 0;
            }
            
            await referringUser.save();
            console.log(`✅ Updated referral stats for user ${referringUser._id}. Total referrals: ${referringUser.referralCount}`);
        }

        // Generate token
        const token = generateToken(user._id);

        // Remove password from response
        const userResponse = {
            _id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            isAdmin: user.isAdmin,
            isAffiliate: user.isAffiliate, // Add this
            promoCode: user.promoCode,
            subscription: user.subscription,
            credits: user.credits,
            betslips: user.betslips,
            referredBy: user.referredBy,
            usedPromoCode: user.usedPromoCode
        };

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: userResponse
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// LOGIN USER
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email only
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check password
        const isPasswordCorrect = await user.comparePassword(password);

        if (!isPasswordCorrect) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate token
        const token = generateToken(user._id);

        // Remove password from response
        const userResponse = {
            _id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            isAdmin: user.isAdmin,
            promoCode: user.promoCode,
            subscription: user.subscription,
            isAffiliate: user.isAffiliate,
            credits: user.credits,
            betslips: user.betslips,
            referredBy: user.referredBy,
            usedPromoCode: user.usedPromoCode
        };

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: userResponse
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// LOGOUT USER
export const logoutUser = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// GET USER PROFILE
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const userResponse = {
            _id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            isAdmin: user.isAdmin,
            promoCode: user.promoCode,
            subscription: user.subscription,
            credits: user.credits,
            betslips: user.betslips,
            referredBy: user.referredBy,
            isAffiliate: user.isAffiliate,
            usedPromoCode: user.usedPromoCode,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        res.status(200).json({
            success: true,
            user: userResponse
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// GENERATE PROMO CODE FOR USER (Manual generation)
export const generateUserPromoCode = async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.promoCode) {
            return res.status(400).json({
                success: false,
                message: 'Promo code already exists for this user'
            });
        }

        const promoCode = await user.generatePromoCode();

        res.status(200).json({
            success: true,
            message: 'Promo code generated successfully',
            promoCode
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// GET REFERRAL STATS
export const getReferralStats = async (req, res) => {
    try {
        const user = await User.findById(req.userId).populate({
            path: 'referredUsers',
            select: 'username email avatar createdAt credits'
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const stats = {
            promoCode: user.promoCode,
            referralCount: user.referralCount,
            referredUsers: user.referredUsers,
            usedPromoCode: user.usedPromoCode,
            totalReferralCredits: user.referredUsers.reduce((sum, refUser) => sum + (refUser.credits || 0), 0)
        };

        res.status(200).json({
            success: true,
            stats
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
// In userController.js - add this function
export const getCurrentUser = async (req, res) => {
  try {
    console.log('🟡 /users/me endpoint called');
    
    // req.userId should be set by your verifyToken middleware
    const userId = req.userId || req.user?._id;
    
    if (!userId) {
      console.log('❌ No user ID in request');
      return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated' 
      });
    }

    console.log('🟡 Looking for user with ID:', userId);
    
    // Import User model at the top of your file if not already
    // Make sure you have: import User from '../models/user.js';
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      console.error('❌ User not found with ID:', userId);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
      if (user.subscription !== 'none' && user.subscriptionEndDate && new Date() > user.subscriptionEndDate) {
        user.subscription = 'none';
        user.subscriptionEndDate = null;
        await user.save();
    }
    console.log('✅ Found user:', user.email);
    
    // Return user data
    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        subscription: user.subscription,
        subscriptionStartDate: user.subscriptionStartDate,
        subscriptionEndDate: user.subscriptionEndDate,
        credits: user.credits || 0,
        isAdmin: user.isAdmin,
        isAffiliate: user.isAffiliate,
        affiliateTier: user.affiliateTier,
        affiliateCommission: user.affiliateCommission,
        affiliateEarnings: user.affiliateEarnings,
        affiliateStats: user.affiliateStats,
        promoCode: user.promoCode,
        usedPromoCode: user.usedPromoCode,
        promoPerkUsed: user.promoPerkUsed,
        betslips: user.betslips || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
    
  } catch (error) {
    console.error('❌ /users/me error:', error);
    console.error('❌ Full error:', error.message);
    
    return res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};