import express from 'express';
const router = express.Router();

// Import controller functions
import {
    registerUser,
    loginUser,
    logoutUser,
    getUserProfile,
    getCurrentUser 
} from '../controllers/userController.js';

// Import middleware
import { verifyToken } from '../middleware/authMiddleware.js';

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);

// Protected route
router.get('/profile', verifyToken, getUserProfile);

// Add this to your backend users controller
router.get('/me', verifyToken, getCurrentUser);  // ✅ Add this route

export default router;