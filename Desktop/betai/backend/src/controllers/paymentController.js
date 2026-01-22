import axios from "axios";
import User from "../models/user.js";
import dotenv from "dotenv";
dotenv.config();

console.log("✅ Payment controller loading...");

// -----------------------------
// 🧩 Environment Variables Validation
// -----------------------------
if (!process.env.FAPSHI_API_KEY || !process.env.FAPSHI_API_USER) {
  console.error("❌ CRITICAL: Fapshi environment variables missing!");
} else {
  console.log("✅ Fapshi environment variables are set");
}

if (!process.env.LYGOS_API_KEY) {
  console.error("⚠️ Lygos environment variables missing!");
} else {
  console.log("✅ Lygos environment variables are set");
}

// -----------------------------
// 🌍 Configurations
// -----------------------------
const FAPSHI_CONFIG = { baseUrl: "https://live.fapshi.com" };
const LYGOS_CONFIG = { baseUrl: "https://api.lygosapp.com/v1" };

// -----------------------------
// 🇨🇲 Country to Gateway Mapping
// -----------------------------
const COUNTRY_GATEWAY_MAPPING = {
  'CM': 'fapshi',    // Cameroon - Fapshi
  'NG': 'lygos',     // Nigeria - Lygos
  'GH': 'lygos',     // Ghana - Lygos
  'KE': 'lygos',     // Kenya - Lygos
  'SN': 'fapshi',    // Senegal - Fapshi
  'CI': 'fapshi',    // Ivory Coast - Fapshi
  'ZA': 'lygos',     // South Africa - Lygos
  'TG': 'fapshi',    // Togo - Fapshi
  'BF': 'fapshi',    // Burkina Faso - Fapshi
  'BJ': 'fapshi',    // Benin - Fapshi
  'ML': 'fapshi',    // Mali - Fapshi
  'NE': 'fapshi',    // Niger - Fapshi
  'RW': 'lygos',     // Rwanda - Lygos
  'TZ': 'lygos',     // Tanzania - Lygos
  'UG': 'lygos',     // Uganda - Lygos
};

// -----------------------------
// 💰 Plan Configuration (UPDATED PRICES)
// -----------------------------
// 💰 Plan Configuration (UPDATED PRICES)
const PLAN_CONFIG = {
  // Coin plans (amount in XAF, coins to award)
  'coins_500': {
    type: 'coins',           // Still 'coins' type
    amount: 500,             // Final price after changes
    originalAmount: 800,     // Original price
    coins: 500,
    name: '500 Coins + 1 Day Access',  // Updated name
    duration: 1  // ✅ Added duration for coins plan
  },
  'coins_1200': {
    type: 'coins',
    amount: 1000,
    originalAmount: 1500,
    coins: 1200,
    name: '1200 Coins + 3 Days Access',  // Updated name
    duration: 3  // ✅ Added duration for coins plan
  },
  // Subscription plans (amount in XAF, duration in days)
  'weekly_unlimited': {
    type: 'subscription',
    amount: 5000,
    originalAmount: 7000,
    duration: 7,
    name: 'Weekly Unlimited'
  },
  'monthly_unlimited': {
    type: 'subscription',
    amount: 15000,
    originalAmount: 20000,
    duration: 30,
    name: 'Monthly Unlimited'
  }
};

// -----------------------------
// 🏆 Affiliate Commission Tiers (UPDATED)
// -----------------------------
const AFFILIATE_COMMISSIONS = {
  'basic': 10,     // 10% commission
  'premium': 15,   // 15% commission
  'elite': 20      // CHANGED from 25% to 20% to match frontend
};

// -----------------------------
// 🔄 Helper Functions
// -----------------------------

/**
 * Calculate final amount after promo discount
 */
const calculateFinalAmount = (baseAmount, hasPromoDiscount, promoPerkUsed) => {
  if (hasPromoDiscount && !promoPerkUsed) {
    return Math.round(baseAmount * 0.9); // 10% discount
  }
  return baseAmount;
};

/**
 * Calculate affiliate commission
 */
const calculateAffiliateCommission = (amount, affiliateTier) => {
  const commissionRate = AFFILIATE_COMMISSIONS[affiliateTier] || AFFILIATE_COMMISSIONS.basic;
  return (amount * commissionRate) / 100;
};

/**
 * Get gateway based on country code
 */
const getGatewayForCountry = (countryCode) => {
  return COUNTRY_GATEWAY_MAPPING[countryCode] || 'fapshi'; // Default to Fapshi
};

/**
 * Update user after successful payment
 */
/**
 * Update user after successful payment
 */
const updateUserAfterPayment = async (userId, planId, transactionId, gateway) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const plan = PLAN_CONFIG[planId];
    if (!plan) throw new Error('Invalid plan ID');

    console.log(`🔄 Updating user ${userId} for plan ${planId}`);

    // Check if already processed to avoid duplicate updates
    if (user.lastPayment && user.lastPayment.transactionId === transactionId) {
      console.log(`ℹ️ Payment already processed for transaction ${transactionId}`);
      return user;
    }

    if (plan.type === 'coins') {
      // ✅ MODIFIED: Give DAILY subscription for both coins plans
      const now = new Date();
      let durationDays = 1; // Default for coins_500
      
      if (planId === 'coins_500') {
        durationDays = 1; // 24 hours
      } else if (planId === 'coins_1200') {
        durationDays = 3; // 72 hours
      }
      
      const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
      
      user.subscription = 'daily'; // ✅ Set to 'daily'
      user.subscriptionStartDate = now;
      user.subscriptionEndDate = endDate;
      user.isSubscriptionActive = true;
      
      // Add the coins
      user.credits = (user.credits || 0) + plan.coins;
      
      console.log(`✅ Added daily subscription for user ${userId} for ${durationDays} day(s) until ${endDate}`);
      console.log(`✅ Added ${plan.coins} coins to user ${userId}. Total: ${user.credits}`);
      
    } else if (plan.type === 'subscription') {
      const now = new Date();
      const endDate = new Date(now.getTime() + plan.duration * 24 * 60 * 60 * 1000);
      
      // Map planId to subscription type
      let subscriptionType = 'none';
      if (planId === 'weekly_unlimited') {
        subscriptionType = 'weekly';
      } else if (planId === 'monthly_unlimited') {
        subscriptionType = 'monthly';
      }
      
      // Update subscription fields
      user.subscription = subscriptionType;
      user.subscriptionStartDate = now;
      user.subscriptionEndDate = endDate;
      user.isSubscriptionActive = true;
      
      console.log(`✅ Updated subscription for user ${userId}: ${subscriptionType} until ${endDate}`);
    }

    // Mark promo perk as used
    if (user.usedPromoCode && !user.promoPerkUsed) {
      user.promoPerkUsed = true;
      console.log(`✅ Marked promo perk as used for user ${userId}`);
    }

    // Store payment info
    user.lastPayment = {
      planId,
      amount: plan.amount,
      originalAmount: plan.originalAmount || plan.amount,
      date: new Date(),
      transactionId,
      gateway
    };

    await user.save();

    // Process affiliate commission - THIS IS CRITICAL!
    if (user.usedPromoCode) {
      await processAffiliateCommission(user, plan.amount, planId);
    }

    return user;
  } catch (error) {
    console.error('❌ Error updating user after payment:', error);
    throw error;
  }
};

/**
 * Process affiliate commission
 */
const processAffiliateCommission = async (user, amount, planId) => {
  try {
    if (!user.usedPromoCode) return;

    console.log(`💰 Checking affiliate commission for promo code: ${user.usedPromoCode}`);
    
    // Find affiliate by promo code
    const affiliate = await User.findOne({ 
      promoCode: user.usedPromoCode,
      isAffiliate: true 
    });

    if (!affiliate) {
      console.log(`ℹ️ No affiliate found for promo code: ${user.usedPromoCode}`);
      return;
    }

    console.log(`💰 Found affiliate: ${affiliate._id}, tier: ${affiliate.affiliateTier}`);
    
    // ✅ STEP 1: Calculate commission in XAF
    let commissionRate = affiliate.affiliateCommission || 10; // Default to 10% from your model
    const commissionAmountXAF = (amount * commissionRate) / 100;
    
    console.log(`💰 Commission in XAF: ${amount} XAF * ${commissionRate}% = ${commissionAmountXAF} XAF`);
    
    // ✅ STEP 2: Convert XAF to USD (1 USD = 500 XAF)
    const commissionAmountUSD = commissionAmountXAF / 500;
    
    console.log(`💰 Commission in USD: ${commissionAmountXAF} XAF / 500 = $${commissionAmountUSD.toFixed(2)}`);
    
    // Initialize earnings if not exists
    if (!affiliate.affiliateEarnings) {
      affiliate.affiliateEarnings = {
        total: 0,
        pending: 0,
        paid: 0,
        available: 0
      };
    }
    
    // ✅ STEP 3: Update earnings in USD
    affiliate.affiliateEarnings.total += commissionAmountUSD;
    affiliate.affiliateEarnings.available += commissionAmountUSD;

    // ✅ STEP 4: Check if available amount meets minimum payout ($50)
    const minimumPayoutUSD = affiliate.minimumPayout || 50; // Already in USD
    
    console.log(`💰 Checking payout threshold: Available $${affiliate.affiliateEarnings.available.toFixed(2)} vs Minimum $${minimumPayoutUSD}`);
    
    // Calculate what would be available after this commission
    const newAvailableAmount = affiliate.affiliateEarnings.available;
    
    // Only move amount to pending if the AFFILIATE'S TOTAL available meets/exceeds $50
    // We move the ENTIRE available amount to pending when threshold is reached
    if (newAvailableAmount >= minimumPayoutUSD && affiliate.affiliateEarnings.available > 0) {
      // Move the entire available amount to pending
      affiliate.affiliateEarnings.pending += affiliate.affiliateEarnings.available;
      console.log(`💰 Moved $${affiliate.affiliateEarnings.available.toFixed(2)} to pending (reached $${minimumPayoutUSD} threshold)`);
      affiliate.affiliateEarnings.available = 0; // Reset available since it's now pending
    }

    // Update affiliate stats
    affiliate.referralCount += 1;
    
    // Initialize stats if not exists
    if (!affiliate.affiliateStats) {
      affiliate.affiliateStats = {
        totalReferrals: 0,
        activeReferrals: 0,
        conversionRate: 0,
        averageCommission: 0,
        lastPayoutDate: null,
        nextPayoutDate: null
      };
    }
    
    affiliate.affiliateStats.totalReferrals += 1;
    
    // If this is a subscription, count as active referral
if (planId.includes('weekly') || planId.includes('monthly') || planId === 'coins_500' || planId === 'coins_1200') {
  affiliate.affiliateStats.activeReferrals += 1;
}

    // Calculate conversion rate
    affiliate.affiliateStats.conversionRate = 
      affiliate.referralCount > 0 
        ? Math.round((affiliate.affiliateStats.activeReferrals / affiliate.referralCount) * 100)
        : 0;

    // Calculate average commission in USD
    affiliate.affiliateStats.averageCommission = 
      affiliate.referralCount > 0 
        ? affiliate.affiliateEarnings.total / affiliate.referralCount
        : 0;

    // Add to referred users if not already there
    if (!affiliate.referredUsers.includes(user._id)) {
      affiliate.referredUsers.push(user._id);
    }

    await affiliate.save();

    console.log(`✅ Commission processed: $${commissionAmountUSD.toFixed(2)} for affiliate ${affiliate._id}`);
    console.log(`📊 Affiliate stats - Total: $${affiliate.affiliateEarnings.total.toFixed(2)}, Available: $${affiliate.affiliateEarnings.available.toFixed(2)}, Pending: $${affiliate.affiliateEarnings.pending.toFixed(2)}`);

  } catch (error) {
    console.error('❌ Error processing affiliate commission:', error);
  }
};

// -----------------------------
// 🚀 CREATE PAYMENT (Main Entry Point)
// -----------------------------
export const createPayment = async (req, res) => {
  console.log("🟢 CREATE PAYMENT ENDPOINT CALLED");
  
  // Log the full request for debugging
  console.log("📦 Request Body:", req.body);
  console.log("📦 Headers:", req.headers);
  console.log("📦 IP:", req.ip);
  
  try {
    const { userId, planId, countryCode } = req.body;

    // 1️⃣ Validate required fields
    if (!userId) {
      console.error("❌ Missing userId");
      return res.status(400).json({ 
        success: false, 
        message: "User ID is required",
        errorCode: "MISSING_USER_ID"
      });
    }

    if (!planId) {
      console.error("❌ Missing planId");
      return res.status(400).json({ 
        success: false, 
        message: "Plan ID is required",
        errorCode: "MISSING_PLAN_ID"
      });
    }

    if (!countryCode) {
      console.error("❌ Missing countryCode");
      return res.status(400).json({ 
        success: false, 
        message: "Country Code is required",
        errorCode: "MISSING_COUNTRY_CODE"
      });
    }

    console.log(`🟡 Creating payment request:`, { 
      userId, 
      planId, 
      countryCode,
      timestamp: new Date().toISOString()
    });

    // 2️⃣ Find user
    const user = await User.findById(userId);
    if (!user) {
      console.error(`❌ User not found: ${userId}`);
      return res.status(404).json({ 
        success: false, 
        message: "User not found. Please log in again.",
        errorCode: "USER_NOT_FOUND"
      });
    }

    console.log(`✅ Found user: ${user.email}`);

    // 3️⃣ Validate plan
    const plan = PLAN_CONFIG[planId];
    if (!plan) {
      console.error(`❌ Invalid plan ID: ${planId}`);
      return res.status(400).json({ 
        success: false, 
        message: "Invalid plan selected. Please try again.",
        errorCode: "INVALID_PLAN"
      });
    }

    console.log(`✅ Plan validated: ${plan.name}`);

    // 4️⃣ Determine gateway based on country
    const gateway = getGatewayForCountry(countryCode);
    
    if (!gateway) {
      console.error(`❌ No gateway found for country: ${countryCode}`);
      return res.status(400).json({ 
        success: false, 
        message: "Payment not available for your country.",
        errorCode: "UNSUPPORTED_COUNTRY"
      });
    }

    console.log(`🌍 Selected gateway for ${countryCode}: ${gateway}`);

    // 5️⃣ Calculate final amount (with promo discount if applicable)
    const hasPromoDiscount = user.usedPromoCode && !user.promoPerkUsed;
    let finalAmount = calculateFinalAmount(plan.amount, hasPromoDiscount, user.promoPerkUsed);

    // ⚡ TEMPORARY FIX: Ensure Lygos amount is > 100 XAF
    // Lygos API says "greater that 100" which means > 100, not >= 100
    if (gateway === 'lygos' && finalAmount <= 100) {
      console.log(`⚠️ TEMPORARY FIX: Lygos amount ${finalAmount} XAF must be > 100. Adjusting to 101 XAF`);
      console.log(`📝 Note: coins_500 plan = 100 XAF, with 10% promo = 90 XAF`);
      console.log(`📝 Both violate Lygos minimum of > 100 XAF`);
      finalAmount = 101;
    }

    console.log(`💰 Amount calculation:`, {
      baseAmount: plan.amount,
      hasPromoDiscount,
      finalAmount,
      gateway,
      discountApplied: hasPromoDiscount && !user.promoPerkUsed ? "10%" : "0%",
      meetsLyogsRequirements: gateway === 'lygos' ? 
        (finalAmount > 100 ? '✅ Yes' : '❌ No') : 'N/A'
    });

    // 6️⃣ Generate transaction ID
    const transactionId = `${gateway}_${userId}_${planId}_${Date.now()}`;
    console.log(`📝 Generated transaction ID: ${transactionId}`);

    let paymentUrl = null;
    let gatewaySpecificId = null;
    let gatewayResponse = null;

    // 7️⃣ Create payment based on gateway
    if (gateway === 'fapshi') {
      try {
        // Validate Fapshi environment variables
        if (!process.env.FAPSHI_API_USER || !process.env.FAPSHI_API_KEY) {
          console.error("❌ Fapshi API credentials missing");
          throw new Error("Fapshi payment gateway is currently unavailable.");
        }

        const paymentData = {
          amount: finalAmount,
          email: user.email, 
          userId: userId,
          externalId: transactionId,
          message: `FootGpt Payment: ${plan.name}`,
          // Webhook URL should be configured in Fapshi dashboard, not passed here
        };

        console.log("🟡 Creating Fapshi payment:", {
          endpoint: `${FAPSHI_CONFIG.baseUrl}/initiate-pay`,
          data: paymentData
        });

        const response = await axios.post(
          `${FAPSHI_CONFIG.baseUrl}/initiate-pay`,
          paymentData,
          {
            headers: {
              "Content-Type": "application/json",
              apiuser: process.env.FAPSHI_API_USER,
              apikey: process.env.FAPSHI_API_KEY,
            },
            timeout: 30000,
          }
        );

        gatewayResponse = response.data;
        console.log("🟡 Fapshi API response:", gatewayResponse);

        // Validate Fapshi response
        if (!gatewayResponse || !gatewayResponse.link) {
          console.error("❌ Invalid Fapshi response:", gatewayResponse);
          throw new Error("Fapshi returned an invalid response");
        }

        paymentUrl = gatewayResponse.link;
        gatewaySpecificId = gatewayResponse.transId;

        // Save Fapshi transaction ID
        user.fapshiTransId = gatewaySpecificId;
        user.customTransactionId = transactionId;
        await user.save();

        console.log(`✅ Fapshi payment created: ${paymentUrl}`);

      } catch (fapshiError) {
        console.error("❌ Fapshi payment creation failed:", {
          message: fapshiError.message,
          response: fapshiError.response?.data,
          status: fapshiError.response?.status
        });
        
        throw new Error(`Fapshi payment failed: ${fapshiError.message}`);
      }

    } else if (gateway === 'lygos') {
      try {
        // Validate Lygos environment variables
        if (!process.env.LYGOS_API_KEY) {
          console.error("❌ Lygos API key missing");
          throw new Error("Lygos payment gateway is currently unavailable.");
        }

        // Add webhook URL for Lygos
        const baseUrl = process.env.BASE_URL || 'https://your-app.com';
        
        const paymentData = {
          amount: finalAmount,
          shop_name: "FootGpt",
          message: `FootGpt Payment: ${plan.name}`,
          success_url: `${process.env.FRONTEND_URL || baseUrl}/payment-success`,
          failure_url: `${process.env.FRONTEND_URL || baseUrl}/payment-failed`,
          order_id: transactionId,
          webhook_url: `${baseUrl}/api/payments/webhook/lygos`,
        };

        console.log("🟡 Creating Lygos payment:", {
          endpoint: `${LYGOS_CONFIG.baseUrl}/gateway`,
          data: paymentData
        });

        const response = await axios.post(
          `${LYGOS_CONFIG.baseUrl}/gateway`,
          paymentData,
          {
            headers: {
              "api-key": process.env.LYGOS_API_KEY,
              "Content-Type": "application/json",
            },
            timeout: 30000,
          }
        );

        gatewayResponse = response.data;
        console.log("🟡 Lygos API response:", gatewayResponse);

        // Lygos might return payment URL in different fields
        paymentUrl = gatewayResponse.link || 
                     gatewayResponse.payment_url || 
                     gatewayResponse.url ||
                     gatewayResponse.checkout_url ||
                     (gatewayResponse.data && gatewayResponse.data.payment_url);
        
        if (!paymentUrl) {
          console.error("❌ No payment URL in Lygos response:", gatewayResponse);
          throw new Error("Lygos did not return a payment URL");
        }

        gatewaySpecificId = gatewayResponse.id || gatewayResponse.payment_id;

        // Save Lygos payment ID
        user.lygosPaymentId = gatewaySpecificId;
        user.customTransactionId = transactionId;
        await user.save();

        console.log(`✅ Lygos payment created: ${paymentUrl}`);

      } catch (lygosError) {
        console.error("❌ Lygos payment creation failed:", {
          message: lygosError.message,
          response: lygosError.response?.data,
          status: lygosError.response?.status
        });
        
        throw new Error(`Lygos payment failed: ${lygosError.message}`);
      }
    }

    // 8️⃣ Validate we have a payment URL
    if (!paymentUrl) {
      console.error("❌ No payment URL generated");
      throw new Error("Failed to generate payment URL");
    }

    // 9️⃣ Prepare success response
    const responseData = {
      success: true,
      paymentUrl: paymentUrl,
      transactionId: transactionId,
      gateway: gateway,
      amount: finalAmount,
      originalAmount: plan.originalAmount || plan.amount,
      currency: 'XAF',
      planDetails: {
        id: planId,
        name: plan.name,
        type: plan.type,
        ...(plan.type === 'coins' && { coins: plan.coins }),
        ...(plan.type === 'subscription' && { duration: plan.duration })
      },
      hasPromoDiscount: hasPromoDiscount && !user.promoPerkUsed,
      discountApplied: hasPromoDiscount && !user.promoPerkUsed ? 10 : 0,
      discountPercentage: hasPromoDiscount && !user.promoPerkUsed ? 10 : Math.round((1 - plan.amount / (plan.originalAmount || plan.amount)) * 100),
      message: `${gateway.toUpperCase()} payment link created successfully`,
      timestamp: new Date().toISOString()
    };

    // Add gateway-specific IDs
    if (gateway === 'fapshi') {
      responseData.fapshiTransId = gatewaySpecificId;
      responseData.gatewayTransactionId = user.fapshiTransId;
    } else {
      responseData.lygosPaymentId = gatewaySpecificId;
      responseData.gatewayTransactionId = user.lygosPaymentId;
    }

    console.log("✅ Payment created successfully:", {
      userId,
      transactionId,
      gateway,
      amount: finalAmount,
      paymentUrl: paymentUrl.substring(0, 50) + "..."
    });

    // 🔟 Send response
    res.status(200).json(responseData);

  } catch (error) {
    console.error("❌ Error in createPayment function:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
      timestamp: new Date().toISOString()
    });
    
    // Determine error type
    let statusCode = 500;
    let errorMessage = "Payment creation failed";
    let errorDetail = error.message;
    
    if (error.message.includes("gateway is currently unavailable")) {
      statusCode = 503;
      errorMessage = "Payment service temporarily unavailable";
    } else if (error.message.includes("User not found")) {
      statusCode = 404;
      errorMessage = "User not found";
    } else if (error.message.includes("Invalid plan")) {
      statusCode = 400;
      errorMessage = "Invalid plan selected";
    } else if (error.message.includes("country")) {
      statusCode = 400;
      errorMessage = "Payment not available for your country";
    } else if (error.message.includes("Network") || error.message.includes("timeout")) {
      statusCode = 503;
      errorMessage = "Payment gateway connection failed";
    } else if (error.response?.status) {
      statusCode = error.response.status;
      errorMessage = `Payment gateway error (${error.response.status})`;
      errorDetail = error.response.data?.message || error.response.statusText;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      detail: process.env.NODE_ENV === 'development' ? errorDetail : undefined,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || Date.now().toString()
    });
  }
};

// -----------------------------
// 🔔 FAPSHI WEBHOOK NOTIFICATION - FIXED VERSION
// -----------------------------
export const fapshiNotify = async (req, res) => {
  try {
    console.log("🟡 Fapshi webhook received:", {
      body: req.body,
      headers: req.headers,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });

    const { status, externalId, transId } = req.body;

    // 1️⃣ Validate required data
    if (!externalId) {
      console.error("❌ Missing externalId in Fapshi webhook:", req.body);
      return res.status(400).json({
        success: false,
        message: "Missing externalId in webhook",
      });
    }

   // 2️⃣ Parse externalId (fixed version)
// Format: fapshi_userId_planId_timestamp
// Where planId can have underscores like "coins_500", "weekly_unlimited"
const parts = externalId.split("_");

// Need at least 4 parts: [fapshi, userId, planId (could be multiple parts), timestamp]
if (parts.length < 4) {
  console.error("❌ Invalid externalId format (minimum 4 parts):", externalId, "Parts:", parts);
  
  // Try to find by transId as fallback
  if (transId) {
    const userByTransId = await User.findOne({ fapshiTransId: transId });
    if (userByTransId) {
      console.log(`✅ Found user by transId: ${userByTransId._id}`);
      // Process with stored data
      return await processFapshiPayment(userByTransId, status, externalId, 'fapshi');
    }
  }
  
  return res.status(400).json({
    success: false,
    message: "Invalid externalId format",
  });
}

const gateway = parts[0]; // fapshi
const userId = parts[1];  // MongoDB user id

// planId might contain underscores (e.g., "coins_500"), so we need to reconstruct it
// Join all parts from index 2 to length-2 for planId
const planIdParts = parts.slice(2, parts.length - 1);
const planId = planIdParts.join('_'); // This gives us "coins_500" instead of just "coins"
const timestamp = parts[parts.length - 1];

console.log(`📝 Parsed webhook: userId=${userId}, planId=${planId}, status=${status}`);
    // 3️⃣ Find user by multiple methods for reliability
    let user = await User.findOne({
      $or: [
        { _id: userId }, // Try by parsed userId first
        { customTransactionId: externalId },
        { fapshiTransId: transId }
      ],
    });

    if (!user) {
      console.error(`❌ User not found: ${userId}`);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log(`✅ Found user: ${user.email}, ID: ${user._id}`);

    // 4️⃣ Process the payment
    return await processFapshiPayment(user, status, externalId, gateway, planId);

  } catch (error) {
    console.error("❌ Fapshi webhook ERROR:", {
      message: error.message,
      stack: error.stack,
      body: req.body
    });
    
    return res.status(500).json({
      success: false,
      message: "Webhook processing failed",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Helper function to process Fapshi payment
 */
const processFapshiPayment = async (user, status, transactionId, gateway, planIdFromWebhook = null) => {
  try {
    // 1️⃣ Check if already processed
    if (user.lastPayment && user.lastPayment.transactionId === transactionId) {
      console.log(`✅ Payment already processed for user ${user._id}`);
      return {
        success: true,
        message: "Payment already processed",
      };
    }

    // 2️⃣ Normalize payment status
    const normalizedStatus = String(status).toLowerCase();
    const isSuccess = normalizedStatus.includes("success") ||
                     normalizedStatus.includes("complete") ||
                     normalizedStatus === "successful" ||
                     normalizedStatus === "paid" ||
                     status === 1 ||
                     status === true;

    if (!isSuccess) {
      console.log(`ℹ️ Non-success status received: ${status} for user ${user._id}`);
      return {
        success: true,
        message: `Webhook received: ${status}`,
      };
    }

    // 3️⃣ Determine planId (from webhook or from user's customTransactionId)
let planId = planIdFromWebhook;
if (!planId && user.customTransactionId) {
  const parts = user.customTransactionId.split("_");
  if (parts.length >= 4) {
    // FIXED: Extract planId correctly from customTransactionId
    planId = parts.slice(2, parts.length - 1).join('_');
    console.log(`📝 Extracted planId from customTransactionId: ${planId}`);
  } else if (parts.length >= 3) {
    // Fallback for old format
    planId = parts[2];
  }
}

    // If still no planId, check lastPayment
    if (!planId && user.lastPayment && user.lastPayment.planId) {
      planId = user.lastPayment.planId;
      console.log(`📝 Using planId from lastPayment: ${planId}`);
    }

    if (!planId) {
      console.error(`❌ Could not determine planId for user ${user._id}`);
      return {
        success: false,
        message: "Could not determine purchase plan",
      };
    }

    // 4️⃣ Validate plan
    const plan = PLAN_CONFIG[planId];
    if (!plan) {
      console.error(`❌ Invalid plan ID: ${planId} for user ${user._id}`);
      return {
        success: false,
        message: "Invalid plan ID",
      };
    }

    // 5️⃣ Update user with purchased plan/coins
    console.log(`💰 Processing successful payment for user ${user._id}, plan: ${planId}`);
    
    await updateUserAfterPayment(user._id, planId, transactionId, gateway);

    // 6️⃣ Send success response
    console.log(`✅ Fapshi payment COMPLETED for user ${user._id}, plan: ${planId}`);
    
    return {
      success: true,
      message: "Payment processed successfully",
      status: "activated",
      userId: user._id,
      planId: planId,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error(`❌ Error processing Fapshi payment for user ${user._id}:`, error);
    throw error;
  }
};

// -----------------------------
// 🔔 LYGOS WEBHOOK NOTIFICATION
// -----------------------------
export const lygosNotify = async (req, res) => {
  try {
    console.log("🟡 Lygos webhook received:", {
      body: req.body,
      headers: req.headers,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    const { status, orderId } = req.body;

    // Validate required fields
    if (!orderId) {
      console.error("❌ Missing orderId in webhook:", req.body);
      return res.status(400).json({ 
        success: false, 
        message: "Missing orderId" 
      });
    }

    // Parse transaction ID
    const parts = orderId.split('_');
    if (parts.length < 3) {
      console.error("❌ Invalid orderId format:", orderId);
      return res.status(400).json({ 
        success: false, 
        message: "Invalid orderId format" 
      });
    }

    const gateway = parts[0];
    const userId = parts[1];
    const planId = parts[2];

    // Find user by orderId or customTransactionId
    let user = await User.findOne({ 
      $or: [
        { customTransactionId: orderId },
        { lygosPaymentId: req.body.payment_id || req.body.id }
      ]
    });

    if (!user) {
      // Fallback: try to find by userId
      user = await User.findById(userId);
      
      if (!user) {
        console.error(`❌ User not found for webhook: ${userId}, orderId: ${orderId}`);
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }
    }

    console.log(`🔄 Processing Lygos payment for user ${user._id}, plan: ${planId}, status: ${status}`);

    // Handle successful payment
    const paymentStatus = status.toLowerCase();
    if (paymentStatus === "deposit_completed" || 
        paymentStatus === "success" || 
        paymentStatus === "accepted" ||
        paymentStatus === "completed") {
      
      // Update user with purchased plan/coins
      await updateUserAfterPayment(user._id, planId, orderId, gateway);
      
      console.log(`✅ Lygos payment processed successfully for user ${user._id}`);
      return res.status(200).json({ 
        success: true, 
        message: "Payment processed successfully",
        status: "activated"
      });
    }

    console.log(`ℹ️ Lygos webhook received status: ${status} for user ${user._id}`);
    return res.status(200).json({ 
      success: true, 
      message: `Webhook received: ${status}` 
    });
    
  } catch (error) {
    console.error("❌ Lygos notify error:", error.message, error.stack);
    return res.status(500).json({ 
      success: false, 
      message: "Webhook processing failed", 
      error: error.message 
    });
  }
};

// -----------------------------
// 🔍 CHECK PAYMENT STATUS
// -----------------------------
export const checkPaymentStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    if (!transactionId) {
      return res.status(400).json({ 
        success: false, 
        message: "Transaction ID is required" 
      });
    }

    // Find user by any transaction ID field
    const user = await User.findOne({
      $or: [
        { fapshiTransId: transactionId },
        { lygosPaymentId: transactionId },
        { customTransactionId: transactionId },
        { 'lastPayment.transactionId': transactionId }
      ],
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Transaction not found" 
      });
    }

    // Check subscription status - USE YOUR MODEL'S FIELD NAMES
    const isSubscriptionActive = user.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date();
    
    // Update isSubscriptionActive field
    user.isSubscriptionActive = isSubscriptionActive;
    await user.save();

    return res.status(200).json({
      success: true,
      status: isSubscriptionActive ? "active" : user.credits > 0 ? "coins" : "inactive",
      subscriptionPlan: user.subscription, // ✅ Use your field name
      subscriptionType: user.subscription, // For compatibility
      isSubscriptionActive,
      credits: user.credits || 0,
      subscriptionEndDate: user.subscriptionEndDate,
      hasPromoPerk: user.usedPromoCode && !user.promoPerkUsed,
      message: isSubscriptionActive 
        ? `Subscription (${user.subscription}) is active` 
        : user.credits > 0 
          ? `User has ${user.credits} coins` 
          : "No active subscription or coins"
    });

  } catch (error) {
    console.error("❌ Error checking payment status:", error.message);
    return res.status(500).json({ 
      success: false, 
      message: "Error checking payment status", 
      error: error.message 
    });
  }
};

// -----------------------------
// 📊 GET USER PAYMENT HISTORY
// -----------------------------
export const getUserPaymentHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('lastPayment credits subscription subscriptionStartDate subscriptionEndDate');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    const history = {
      lastPayment: user.lastPayment || null,
      currentCredits: user.credits || 0,
      subscription: {
        plan: user.subscription,
        startDate: user.subscriptionStartDate,
        endDate: user.subscriptionEndDate,
        isActive: user.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date()
      },
      promoInfo: {
        usedPromoCode: user.usedPromoCode,
        promoPerkUsed: user.promoPerkUsed
      }
    };

    return res.status(200).json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error("❌ Error getting payment history:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Error fetching payment history", 
      error: error.message 
    });
  }
};

// -----------------------------
// 🛠️ MANUAL VERIFICATION (For Testing)
// -----------------------------
export const manualFapshiVerify = async (req, res) => {
  try {
    const { transId } = req.body;
    
    if (!transId) {
      return res.status(400).json({ 
        success: false, 
        message: "Transaction ID is required" 
      });
    }

    // Find user by fapshiTransId
    const user = await User.findOne({ fapshiTransId: transId });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Transaction not found" 
      });
    }

    // Check if user has customTransactionId
    if (!user.customTransactionId) {
      return res.status(400).json({ 
        success: false, 
        message: "No custom transaction ID found" 
      });
    }

    // Parse transaction ID to get planId
    const parts = user.customTransactionId.split('_');
    if (parts.length < 3) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid transaction ID format" 
      });
    }

    const gateway = parts[0];
    const planId = parts[2];

    console.log(`🔄 Manually processing payment for user ${user._id}, plan: ${planId}`);

    // Process the payment
    await updateUserAfterPayment(user._id, planId, user.customTransactionId, gateway);
    
    console.log(`✅ Manual verification successful for user ${user._id}`);
    
    return res.status(200).json({
      success: true,
      message: "Payment manually verified and processed",
      userUpdated: true,
      userId: user._id
    });
    
  } catch (error) {
    console.error("❌ Manual verification error:", error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// -----------------------------
// 🔍 VERIFY FAPSHI PAYMENT (Manual Polling)
// -----------------------------
export const verifyFapshiPayment = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { transId } = req.query;
    
    console.log(`🟡 Verifying Fapshi payment: transactionId=${transactionId}, transId=${transId}`);

    // Option 1: Find by transactionId (your custom ID)
    let user = await User.findOne({
      $or: [
        { customTransactionId: transactionId },
        { fapshiTransId: transactionId },
        { fapshiTransId: transId }
      ]
    });

    if (!user) {
      console.log(`ℹ️ Transaction not found in DB: ${transactionId}`);
      
      // Try to parse transactionId to find user
      if (transactionId && transactionId.includes('_')) {
        const parts = transactionId.split('_');
        if (parts.length >= 3) {
          const userId = parts[1];
          user = await User.findById(userId);
        }
      }
    }

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "Transaction not found" 
      });
    }

    // Use the fapshiTransId to verify with Fapshi API
    const fapshiTransId = user.fapshiTransId || transId;
    
    if (!fapshiTransId) {
      return res.status(400).json({ 
        success: false, 
        message: "No Fapshi transaction ID found" 
      });
    }

    console.log(`🔄 Querying Fapshi API for transaction: ${fapshiTransId}`);

    // Call Fapshi API to verify payment status
    const verifyResponse = await axios.post(
      `${FAPSHI_CONFIG.baseUrl}/payment-status`,
      { transId: fapshiTransId },
      {
        headers: {
          "Content-Type": "application/json",
          apiuser: process.env.FAPSHI_API_USER,
          apikey: process.env.FAPSHI_API_KEY,
        },
        timeout: 10000,
      }
    );

    console.log(`✅ Fapshi API response:`, verifyResponse.data);

    const fapshiStatus = verifyResponse.data?.status?.toLowerCase();
    const isSuccess = fapshiStatus === 'success' || 
                     fapshiStatus === 'completed' || 
                     fapshiStatus === 'paid' ||
                     verifyResponse.data?.paid === true;

    if (isSuccess) {
      console.log(`💰 Payment confirmed by Fapshi for user ${user._id}`);
      
      // Parse planId from customTransactionId
      const customId = user.customTransactionId;
      let planId = null;
      
      if (customId && customId.includes('_')) {
        const parts = customId.split('_');
        if (parts.length >= 3) {
          planId = parts[2]; // Format: fapshi_userId_planId_timestamp
        }
      }
      
      // If we can't parse, try to get from last payment
      if (!planId && user.lastPayment && user.lastPayment.planId) {
        planId = user.lastPayment.planId;
      }
      
      if (planId) {
        // Update user with the purchased plan
        await updateUserAfterPayment(user._id, planId, customId || transactionId, 'fapshi');
        
        console.log(`✅ User ${user._id} updated successfully after manual verification`);
        
        // Fetch updated user
        const updatedUser = await User.findById(user._id);
        
        return res.status(200).json({
          success: true,
          message: "Payment verified and user updated successfully",
          status: "verified",
          fapshiStatus: verifyResponse.data.status,
          user: {
            credits: updatedUser.credits,
            isSubscriptionActive: updatedUser.isSubscriptionActive,
            subscriptionEndDate: updatedUser.subscriptionEndDate,
            lastPayment: updatedUser.lastPayment
          }
        });
      } else {
        console.error(`❌ Could not determine planId for user ${user._id}`);
        return res.status(400).json({
          success: false,
          message: "Could not determine purchase plan"
        });
      }
    } else {
      console.log(`ℹ️ Payment not yet successful on Fapshi. Status: ${fapshiStatus}`);
      return res.status(200).json({
        success: true,
        message: "Payment not yet completed",
        status: "pending",
        fapshiStatus: verifyResponse.data.status,
        paid: verifyResponse.data.paid || false
      });
    }

  } catch (error) {
    console.error("❌ Fapshi verification error:", error.response?.data || error.message);
    
    // If Fapshi API fails, check local DB status as fallback
    try {
      const user = await User.findOne({
        $or: [
          { customTransactionId: req.params.transactionId },
          { fapshiTransId: req.params.transactionId }
        ]
      });

      if (user && user.lastPayment) {
        return res.status(200).json({
          success: true,
          message: "Using local DB status (Fapshi API unreachable)",
          status: "local_check",
          lastPayment: user.lastPayment,
          credits: user.credits
        });
      }
    } catch (dbError) {
      console.error("❌ DB fallback also failed:", dbError);
    }

    return res.status(500).json({
      success: false,
      message: "Error verifying payment",
      error: error.response?.data?.message || error.message
    });
  }
};

// -----------------------------
// 🧪 TEST WEBHOOK ENDPOINT
// -----------------------------
export const testWebhook = async (req, res) => {
  console.log("✅ Webhook test received:", {
    body: req.body,
    headers: req.headers,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  return res.status(200).json({ 
    success: true, 
    message: "Webhook test received successfully",
    timestamp: new Date().toISOString(),
    data: req.body
  });
};