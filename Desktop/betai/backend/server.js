import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './src/lib/db.js';
import betslipRoutes from './src/routes/betslip.routes.js';
import userRoutes from './src/routes/userRoutes.js'; // Import user routes
import footballRoutes from './src/routes/footballRoutes.js';
import affiliateRoutes from './src/routes/affiliateRoutes.js';
import paymentRoutes from "./src/routes/paymentRoute.js";
import cron from 'node-cron';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testScriptPath = path.join(__dirname, 'test.js');

// Schedule test.js every 30 minutes
cron.schedule('*/30 * * * *', () => {
  console.log('🔄 Running test.js at', new Date());

  exec(`node ${testScriptPath}`, (err, stdout, stderr) => {
    if (err) {
      console.error('❌ Error running test.js:', err);
      return;
    }
    if (stdout) console.log('✅ Output:', stdout);
    if (stderr) console.error('⚠️ Error output:', stderr);
  });
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  await connectDB();
});