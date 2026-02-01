import mongoose from "mongoose";
import connectDB from "./src/lib/db.js";
import User from "./src/models/user.js";

// Connect to the database
await connectDB();

async function updateSubscriptionEndDate() {
  try {
    const user = await User.findOne({ email: "cedrick@gmail.com" });

    if (!user) {
      console.log("❌ User not found");
      return;
    }

    // 📅 Set end date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    user.subscription = "daily";
    user.subscriptionEndDate = tomorrow;

    await user.save();

    console.log("✅ Subscription updated successfully!");
    console.log({
      email: user.email,
      subscription: user.subscription,
      subscriptionEndDate: user.subscriptionEndDate,
    });

  } catch (error) {
    console.error("❌ Error updating subscription:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

updateSubscriptionEndDate();
