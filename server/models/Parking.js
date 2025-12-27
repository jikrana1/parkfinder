import mongoose from "mongoose";

const parkingSchema = new mongoose.Schema({
  name: String,
  location: String,
  pricePerHour: Number,
  status: String,
  distance: String,
  capacity: Number,
  availableSlots: Number,
  isCovered: Boolean,
  securityLevel: String,
  rating: Number,
  openingTime: String,
  closingTime: String,
});

export default mongoose.model("Parking", parkingSchema);
