// src/routes/betslip.routes.js
import express from "express";
import { saveBetslip, generateBetslips } from "../controllers/betslips.controller.js";
import { verifyToken } from "../middleware/authMiddleware.js"; // Import auth middleware

const router = express.Router();
// ,verifyToken
// Generate AI betslips (public route)
router.post("/generate",verifyToken, generateBetslips);


router.post("/save", verifyToken, saveBetslip); // Add verifyToken middleware here

export default router;