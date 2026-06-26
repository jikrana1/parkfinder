import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  parkingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Parking",
    required: true,
  },
  bookingDate: {
    type: Date,
    default: Date.now,
  },
  duration: {
    type: Number,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  bookingStatus: {
    type: String,
    enum: ["active", "cancelled", "completed"],
    default: "active",
  },
  // Extension tracking
  originalDuration: {
    type: Number,
    default: null,
  },
  extensions: [
    {
      extendedAt: { type: Date, default: Date.now },
      additionalHours: { type: Number, required: true },
      additionalCost: { type: Number, required: true },
      newExpiry: { type: Date, required: true },
    },
  ],
  expiresAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Booking", bookingSchema);