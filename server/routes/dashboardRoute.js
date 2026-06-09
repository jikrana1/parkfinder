// dashboardRoutes.js
import express from "express";

import { authMiddleware } from "../middleware/auth.js";
import { userStats, getActiveBooking } from "../controllers/dashboard.controller.js";

const router = express.Router();

// User Dashboard Stats
router.get("/user-stats", authMiddleware, userStats);

// Parked Vehicle Location Reminder — active booking details
router.get("/active-booking", authMiddleware, getActiveBooking);

export default router;