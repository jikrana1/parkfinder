// models/Booking.js
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  //  Parking ID ko REFERENCE banana padega
  parkingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Parking", //  YEH CHANGE KARNA HAI
    required: true,
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  //  Duration aur price
  duration: {
    type: Number,
    required: true,
    min: 1,
  },

  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },

  //  Status
  bookingStatus: {
    type: String,
    enum: ["active", "cancelled", "completed"],
    default: "active",
  },

  //  Dates
  bookingDate: {
    type: Date,
    default: Date.now,
  },

  startTime: {
    type: Date,
    default: Date.now,
  },

  endTime: {
    type: Date,
  },

  //  Additional info for convenience
  parkingName: String,
  parkingLocation: String,

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save hook for endTime calculation
bookingSchema.pre("save", function (next) {
  if (this.duration && this.startTime) {
    const end = new Date(this.startTime);
    end.setHours(end.getHours() + this.duration);
    this.endTime = end;
  }
  next();
});

module.exports = mongoose.model("Booking", bookingSchema);
