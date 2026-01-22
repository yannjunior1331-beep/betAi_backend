import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true,
        select: false
    },

    avatar: {
        type: String,
        default: function () {
            const randomNum = Math.floor(Math.random() * 100) + 1;
            return `https://avatar.iran.liara.run/public/${randomNum}`;
        }
    },

    isAdmin: {
        type: Boolean,
        default: false
    },

    // ================================
    // AFFILIATE SYSTEM FIELDS
    // ================================
    isAffiliate: {
        type: Boolean,
        default: false
    },

    affiliateTier: {
        type: String,
        enum: ['basic', 'premium', 'elite'],
        default: 'basic'
    },

    affiliateCommission: {
        type: Number,
        default: 10 // percentage
    },

    affiliateEarnings: {
        total: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
        paid: { type: Number, default: 0 },
        available: { type: Number, default: 0 }
    },

    affiliateStats: {
        totalReferrals: { type: Number, default: 0 },
        activeReferrals: { type: Number, default: 0 },
        conversionRate: { type: Number, default: 0 },
        averageCommission: { type: Number, default: 0 },
        lastPayoutDate: { type: Date, default: null },
        nextPayoutDate: { type: Date, default: null }
    },

    payoutMethod: {
        method: { 
            type: String, 
            enum: ['bank', 'paypal', 'skrill', 'crypto', null],
            default: null 
        },
        details: { 
            type: mongoose.Schema.Types.Mixed, 
            default: null 
        }
    },

    payoutHistory: [{
        amount: { type: Number, required: true },
        method: { 
            type: String, 
            enum: ['bank', 'paypal', 'skrill', 'crypto'],
            required: true 
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending'
        },
        requestedAt: { type: Date, default: Date.now },
        processedAt: { type: Date, default: null },
        transactionId: { type: String, default: null },
        notes: { type: String, default: null }
    }],

    minimumPayout: {
        type: Number,
        default: 50 // $50 minimum
    },

    // ================================
    // REFERRAL SYSTEM FIELDS
    // ================================
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    usedPromoCode: {
        type: String,
        default: null
    },

    promoCode: {
        type: String,
        unique: true,
        sparse: true, 
    },

    referredUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    referralCount: {
        type: Number,
        default: 0
    },

    // ================================
    // SUBSCRIPTION FIELDS (UPDATED)
    // ================================
    subscription: {
        type: String,
        enum: ['none', 'daily', 'weekly', 'monthly'],
        default: 'none'
    },

    subscriptionStartDate: {
        type: Date,
        default: null
    },

    subscriptionEndDate: {
        type: Date,
        default: null
    },

    // ================================
    // PROMO PERK TRACKING
    // ================================
    promoPerkUsed: {
        type: Boolean,
        default: false
    },

    // ================================
    // BETSLIPS FIELDS
    // ================================
    betslips: {
        type: [
            {
                title: {
                    type: String,
                    default: 'AI BetSlip'
                },

                matches: {
                    type: [
                        {
                            fixtureId: Number,
                            homeTeam: String,
                            awayTeam: String,
                            pick: String,   // e.g "OVER", "BTTS", "1X2"
                            
                            // ✅ ADD THESE NEW FIELDS:
                            predictionValue: String,    // e.g "2.5", "yes", "1"
                            predictionType: String,     // e.g "OVER", "BTTS", "1X2"
                            fullPrediction: String,     // e.g "Over 2.5", "BTTS Yes", "Home Win"
                            
                            odd: Number,
                            status: {
                                type: String,
                                enum: ['pending', 'won', 'lost'],
                                default: 'pending'
                            },
                            
                            // ✅ Also add these optional fields for better compatibility:
                            team1: String,      // Alternative to homeTeam
                            team2: String,      // Alternative to awayTeam
                            league: String,
                            confidence: Number,
                            matchTime: String,
                            source: {
                                type: String,
                                enum: ['ai', 'manual'],
                                default: 'ai'
                            }
                        }
                    ],
                    default: []
                },
                totalOdds: Number,
                stake: {
                    type: Number,
                    default: 0
                },

                potentialWin: Number,

                status: {
                    type: String,
                    enum: ['pending', 'won', 'lost', 'cashed_out'],
                    default: 'pending'
                },

                source: {
                    type: String,
                    enum: ['ai', 'manual'],
                    default: 'ai'
                },

                createdAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],
        default: []
    },

    credits: {
        type: Number,
        default: 0
    }

}, {
    timestamps: true
});

// ================================
// PRE-SAVE MIDDLEWARE
// ================================
userSchema.pre('save', async function () {
    // Only hash password if modified or this is a new user
    if (this.isModified('password') || this.isNew) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
});

// ================================
// INSTANCE METHODS
// ================================

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        // If password is not selected, fetch it first
        if (!this.password) {
            const userWithPassword = await this.model('User').findById(this._id).select('+password');
            return await bcrypt.compare(candidatePassword, userWithPassword.password);
        }
        
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Password comparison failed: ' + error.message);
    }
};

// Change avatar method
userSchema.methods.changeAvatar = async function () {
    try {
        const randomNum = Math.floor(Math.random() * 100) + 1;
        this.avatar = `https://avatar.iran.liara.run/public/${randomNum}`;
        return await this.save();
    } catch (error) {
        throw new Error('Failed to change avatar: ' + error.message);
    }
};

// Generate affiliate promo code
userSchema.methods.generatePromoCode = async function () {
    try {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code;
        let attempts = 0;
        
        do {
            code = '';
            for (let i = 0; i < 7; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            attempts++;
            
            if (attempts > 10) {
                // Fallback: username + timestamp
                code = this.username.toUpperCase().substring(0, 4) + 
                       Date.now().toString().slice(-4);
                break;
            }
        } while (await this.model('User').findOne({ promoCode: code }));
        
        this.promoCode = code;
        await this.save();
        return code;
    } catch (error) {
        throw new Error('Failed to generate promo code: ' + error.message);
    }
};

// Register as affiliate
userSchema.methods.becomeAffiliate = async function (customPromoCode = null) {
    try {
        if (this.isAffiliate) {
            throw new Error('User is already an affiliate');
        }
        
        let promoCode = customPromoCode;
        
        // Validate or generate promo code
        if (promoCode) {
            // Check if promo code already exists
            const existingUser = await this.model('User').findOne({ 
                promoCode: promoCode.toUpperCase() 
            });
            
            if (existingUser) {
                throw new Error('Promo code already taken');
            }
            
            // Validate format
            if (!/^[A-Z0-9]{4,15}$/.test(promoCode.toUpperCase())) {
                throw new Error('Promo code must be 4-15 uppercase letters/numbers');
            }
            
            promoCode = promoCode.toUpperCase();
        } else {
            // Generate unique promo code
            promoCode = await this.generatePromoCode();
        }
        
        // Update user as affiliate
        this.isAffiliate = true;
        this.promoCode = promoCode;
        this.affiliateTier = 'basic';
        this.affiliateCommission = 25; // 25% commission for new affiliates
        this.minimumPayout = 50;
        
        // Initialize earnings and stats
        this.affiliateEarnings = {
            total: 0,
            pending: 0,
            paid: 0,
            available: 0
        };
        
        this.affiliateStats = {
            totalReferrals: 0,
            activeReferrals: 0,
            conversionRate: 0,
            averageCommission: 0,
            lastPayoutDate: null,
            nextPayoutDate: null
        };
        
        await this.save();
        return this;
    } catch (error) {
        throw new Error('Failed to become affiliate: ' + error.message);
    }
};

// Apply promo code during registration
userSchema.methods.applyPromoCode = async function (promoCode) {
    try {
        // Find the affiliate with this promo code
        const affiliate = await this.model('User').findOne({ 
            promoCode: promoCode.toUpperCase() 
        });
        
        if (!affiliate || !affiliate.isAffiliate) {
            throw new Error('Invalid promo code');
        }
        
        // Store promo code info
        this.usedPromoCode = promoCode.toUpperCase();
        this.referredBy = affiliate._id;
        
        // User is eligible for 10% discount on first subscription
        this.promoPerkUsed = false;
        
        await this.save();
        
        // Add this user as referral to the affiliate
        await affiliate.addReferral(this._id);
        
        return {
            success: true,
            message: 'Promo code applied successfully! You will get 10% off on your first subscription.',
            affiliateUsername: affiliate.username
        };
    } catch (error) {
        throw new Error('Failed to apply promo code: ' + error.message);
    }
};

// Add referral
userSchema.methods.addReferral = async function (referralUserId, subscriptionType = 'none') {
    try {
        // Add to referred users
        if (!this.referredUsers.includes(referralUserId)) {
            this.referredUsers.push(referralUserId);
            this.referralCount = this.referredUsers.length;
            
            // Calculate commission based on subscription
            let commission = 0;
            const subscriptionCommissions = {
                'daily': 5,
                'weekly': 10,
                'monthly': 20
            };
            
            if (subscriptionType !== 'none') {
                commission = subscriptionCommissions[subscriptionType] || 0;
                
                // Update earnings
                this.affiliateEarnings.total += commission;
                this.affiliateEarnings.available += commission;
                
                // Update stats
                this.affiliateStats.activeReferrals = 
                    this.referredUsers.filter(async (id) => {
                        const user = await this.model('User').findById(id);
                        return user?.subscription !== 'none';
                    }).length;
                
                this.affiliateStats.conversionRate = 
                    this.referralCount > 0 
                    ? Math.round((this.affiliateStats.activeReferrals / this.referralCount) * 100)
                    : 0;
                    
                this.affiliateStats.averageCommission = 
                    this.referralCount > 0 
                    ? this.affiliateEarnings.total / this.referralCount
                    : 0;
            }
            
            await this.save();
        }
        
        return this;
    } catch (error) {
        throw new Error('Failed to add referral: ' + error.message);
    }
};

// Request payout
userSchema.methods.requestPayout = async function (amount, method, details = {}) {
    try {
        if (!this.isAffiliate) {
            throw new Error('User is not an affiliate');
        }
        
        if (amount < this.minimumPayout) {
            throw new Error(`Minimum payout amount is $${this.minimumPayout}`);
        }
        
        if (amount > this.affiliateEarnings.available) {
            throw new Error(`Insufficient available funds. Available: $${this.affiliateEarnings.available}`);
        }
        
        // Create payout request
        const payoutRequest = {
            amount,
            method,
            details,
            status: 'pending',
            requestedAt: new Date(),
            estimatedProcessing: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
        };
        
        // Update earnings
        this.affiliateEarnings.available -= amount;
        this.affiliateEarnings.pending += amount;
        
        // Add to payout history
        if (!this.payoutHistory) {
            this.payoutHistory = [];
        }
        this.payoutHistory.push(payoutRequest);
        
        await this.save();
        return payoutRequest;
    } catch (error) {
        throw new Error('Failed to request payout: ' + error.message);
    }
};

// ================================
// STATIC METHODS
// ================================

// Find by promo code
userSchema.statics.findByPromoCode = async function (promoCode) {
    return await this.findOne({ promoCode: promoCode.toUpperCase() });
};

// Get top affiliates
userSchema.statics.getTopAffiliates = async function (limit = 10) {
    return await this.find({ 
        isAffiliate: true,
        'affiliateEarnings.total': { $gt: 0 }
    })
    .select('username email promoCode affiliateTier affiliateEarnings.total affiliateStats')
    .sort({ 'affiliateEarnings.total': -1 })
    .limit(limit);
};

// Validate promo code availability
userSchema.statics.validatePromoCode = async function (promoCode) {
    if (!promoCode || promoCode.trim().length < 4) {
        return { valid: false, message: 'Promo code must be at least 4 characters' };
    }
    
    if (!/^[A-Z0-9]+$/.test(promoCode.toUpperCase())) {
        return { valid: false, message: 'Only uppercase letters and numbers allowed' };
    }
    
    const existingUser = await this.findOne({ 
        promoCode: promoCode.toUpperCase() 
    });
    
    if (existingUser) {
        return { valid: false, message: 'Promo code already taken' };
    }
    
    return { valid: true, message: 'Promo code is available' };
};

const User = mongoose.model('User', userSchema);

export default User;