import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const signup =  async (req, res) => {
  try {
    const { name, email, password, role, adminSecret } = req.body;

    const exists = await User.findOne({ email });
    if (exists)
      return res.json({ success: false, message: "Email already exists" });

    // Prevent random users from creating admin
    if (role === "admin") {
      if (adminSecret !== process.env.ADMIN_SECRET) {
        return res.json({
          success: false,
          message: "Invalid Admin Secret Key",
        });
      }
    }

    const user = new User({
      name,
      email,
      password,
      role: role || "user",
    });

    await user.save();

    res.json({
      success: true,
      message: `${role} signup successful`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.json({ success: false, message: "Incorrect password" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export const verify = async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
}