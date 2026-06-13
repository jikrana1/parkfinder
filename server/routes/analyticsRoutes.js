// server/routes/analyticsRoutes.js
import express from "express";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import {
  getBookingsAnalytics,
  getRevenueAnalytics,
  getOccupancyAnalytics,
  getUsersAnalytics,
} from "../controllers/analyticsController.js";

const router = express.Router();

// Middleware to ensure admin role check is applied to all analytics routes
router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/bookings", getBookingsAnalytics);
router.get("/revenue", getRevenueAnalytics);
router.get("/occupancy", getOccupancyAnalytics);
router.get("/users", getUsersAnalytics);

export default router;
