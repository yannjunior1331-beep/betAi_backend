import express from 'express';
import cors from 'cors';
// Import ALL controller methods from the new payment controller
import {
  createPayment,
  lygosNotify,
  fapshiNotify,
  verifyFapshiPayment,
  checkPaymentStatus,
  getUserPaymentHistory
} from '../controllers/paymentController.js';

const router = express.Router();
router.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
// router.options('*', cors());
/* ===============================
   PAYMENT CREATION
================================ */

// Create payment (main entry point)
router.post('/create', createPayment);
router.get('/verify/fapshi/:transactionId', verifyFapshiPayment);

/* ===============================
   WEBHOOKS (PUBLIC - NO AUTH)
================================ */

// Lygos webhook
router.post('/webhook/lygos', lygosNotify);

// Fapshi webhook
router.post('/webhook/fapshi', fapshiNotify);

/* ===============================
   PAYMENT STATUS CHECK
================================ */

// Generic payment status (by transactionId)
router.get('/status/:transactionId', checkPaymentStatus);

/* ===============================
   USER PAYMENT HISTORY
================================ */

// Get user payment history
router.get('/history/:userId', getUserPaymentHistory);

/* ===============================
   HEALTH CHECK (Optional but recommended)
================================ */

router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    message: 'Payment API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;