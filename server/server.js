import express from "express";
import parkingApi from "./getData/parkingApi.js";
import connectDB from "./database/db.js";
import bookingRouter from "./routes/bookingRoute.js";
import getbookingdata from "./getData/booking.js";
import authRoutes from "./routes/authRoutes.js";
import adminSlotsRouter from "./routes/slotManage.js";
import userManage from "./routes/userManage.js";
import parkingLogRoute from "./routes/parkingLogRoute.js";
import dashboardRoute from "./routes/dashboardRoute.js";
import predictionRoute from "./routes/predictionRoute.js";
import favoritesRoute from "./routes/favoritesRoute.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

// Validate critical environment variables at startup
const requiredEnvVars = ["JWT_SECRET", "ADMIN_SECRET"];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(
    `❌ FATAL ERROR: Missing required environment variables: ${missingEnvVars.join(", ")}`,
  );
  console.error("   Please set these in your .env file or system environment.");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Authorization"],
  }),
);
// Middleware to parse JSON body (if needed later)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to Database
connectDB();
// use auth route.
app.use("/api/auth", authRoutes);
// get/Use Booking APi data
app.use("/api", getbookingdata);
// get/Use Parking API routes
app.use("/api/parking", parkingApi);
// Use Booking Routes
app.use("/api/bookings", bookingRouter);
// Use slot management route.
app.use("/api/admin/slots", adminSlotsRouter);
// use user management route.
app.use("/api/admin/users", userManage);
// use admin analytics routes.
app.use("/api/admin/analytics", analyticsRoutes);
// use parkingLog --- entry exit of vehicle
app.use("/api", parkingLogRoute);
// use favorites route
app.use("/api/favorites", favoritesRoute);

// use dashboard.js
app.use("/api/dashboard", dashboardRoute);

// use predictions — availability forecast based on historical occupancy
app.use("/api/predictions", predictionRoute);

// Root Route
app.get("/", (req, res) => {
  res.send("Welcome to the Parking Slot API");
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Internal Server Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
