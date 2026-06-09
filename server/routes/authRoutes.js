import express from "express";
import crypto from "node:crypto";
import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../middleware/auth.js";
import { sendPasswordResetEmail } from "../utils/email.js";
import { signup, login, verify } from "../controllers/auth.controller.js"; 

const router = express.Router();

// Signup
router.post("/signup",signup);

// Login (User)
router.post("/login",login);

// Forgot password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "No account found with that email" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 30 * 60 * 1000;
    await user.save();

    const resetLink = await sendPasswordResetEmail({
      to: user.email,
      resetToken,
    });

    res.json({
      success: true,
      message: "Password reset link sent to your email.",
      resetLink,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Failed to send password reset email",
    });
  }
});

// Reset password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Token and password are required" });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset token" });
    }

    user.password = password;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: err.message || "Failed to reset password",
      });
  }
});

// verify
router.get("/verify", authMiddleware,verify);

export default router;
