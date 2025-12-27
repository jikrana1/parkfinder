import express from "express";
import Parking from "../models/Parking.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const data = await Parking.find();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
