import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './src/lib/db.js';
import betslipRoutes from './src/routes/betslip.routes.js';
import userRoutes from './src/routes/userRoutes.js'; // Import user routes
import footballRoutes from './src/routes/footballRoutes.js';
import affiliateRoutes from './src/routes/affiliateRoutes.js';
import paymentRoutes from "./src/routes/paymentRoute.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({ origin: '*', credentials: true }));

// Routes
app.use('/api/betslips', betslipRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/football', footballRoutes);
app.use('/api/affiliate', affiliateRoutes);
app.use("/api/payments", paymentRoutes);
// Test route
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to the API!' });
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  await connectDB();
});