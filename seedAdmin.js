import mongoose from "mongoose";
import connectDB from "./src/lib/db.js";
import User from "./src/models/user.js";

// Connect to the database
await connectDB();

async function createTestUser() {
  try {
    // ❗ Check if user already exists
    const existingUser = await User.findOne({ email: "mike@gmail.com" });

    if (existingUser) {
      console.log("❌ User already exists:", existingUser.email);
      return;
    }

    // 📅 Set subscription end date to 1 week from now
    const oneWeekLater = new Date();
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);

    // 👤 Create new user
    const user = new User({
      username: "mike",
      email: "mike@gmail.com",
      password: "123456", // will be hashed by pre-save middleware
      subscription: "weekly",
      subscriptionStartDate: new Date(),
      subscriptionEndDate: oneWeekLater,
      credits: 5000
    });

    await user.save();

    console.log("✅ User created successfully!");
    console.log({
      username: user.username,
      email: user.email,
      subscription: user.subscription,
      subscriptionEndDate: user.subscriptionEndDate,
      credits: user.credits
    });

  } catch (error) {
    console.error("❌ Error creating user:", error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createTestUser();
