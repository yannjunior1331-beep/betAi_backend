import mongoose from "mongoose";
import connectDB from "./src/lib/db.js";
import User from "./src/models/user.js";

// Connect to the database
await connectDB();

async function resetAffiliateEarningsOnly() {
    try {
        const userId = "6951e37102454af8fae08274"; // Your user ID
        
        // Find the user
        const user = await User.findById(userId);
        
        if (!user) {
            console.log("User not found!");
            return;
        }
        
        console.log(`Resetting affiliate earnings for user: ${user.username}`);
        console.log(`Before reset - Earnings:`, user.affiliateEarnings);
        
        // Update only the monetary fields using MongoDB update
        const result = await User.updateOne(
            { _id: userId },
            {
                $set: {
                    "affiliateEarnings.total": 0,
                    "affiliateEarnings.pending": 0,
                    "affiliateEarnings.paid": 0,
                    "affiliateEarnings.available": 0,
                    "affiliateStats.conversionRate": 0,
                    "affiliateStats.averageCommission": 0,
                    "payoutHistory": [] // Clear payout history
                }
            }
        );
        
        console.log(`✅ ${result.modifiedCount} document(s) updated`);
        
        // Fetch and display updated user
        const updatedUser = await User.findById(userId);
        console.log(`After reset - Earnings:`, updatedUser.affiliateEarnings);
        console.log(`PromoCode preserved: ${updatedUser.promoCode}`);
        console.log(`isAffiliate preserved: ${updatedUser.isAffiliate}`);
        
    } catch (error) {
        console.error("❌ Error resetting affiliate earnings:", error);
    } finally {
        // Close the database connection
        await mongoose.disconnect();
        console.log("\nDatabase connection closed.");
        process.exit(0);
    }
}

// Run the function
resetAffiliateEarningsOnly();