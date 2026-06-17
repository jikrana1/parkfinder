import express from "express";
import crypto from "node:crypto";
import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../middleware/auth.js";
import { sendPasswordResetEmail } from "../utils/email.js";
import { signup,login,verify, forgotPassword, resetPassword } from "../controllers/auth.controller.js";


const router = express.Router();

// Signup
router.post("/signup",signup);

// Login (User)
router.post("/login",login);

// Forgot password
router.post("/forgot-password", forgotPassword);

// Reset password
router.post("/reset-password",resetPassword);

// verify
router.get("/verify", authMiddleware,verify);

export default router;
