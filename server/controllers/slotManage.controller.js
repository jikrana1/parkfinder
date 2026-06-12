import Parking from "../models/Parking.js";

export const allSlots = async (req, res) => {
  try {
    const { vehicleType } = req.query; // Extract filter from URL
    let query = {};

    // If a filter is provided, update the Mongoose query
    if (vehicleType) {
      // If you allow multiple filters at once (e.g., ?vehicleType=Car,EV)
      if (vehicleType.includes(",")) {
        const types = vehicleType.split(",");
        query.supportedVehicles = { $in: types };
      } else {
        // Single filter (e.g., ?vehicleType=Bike)
        query.supportedVehicles = vehicleType;
      }
    }

    // Find slots matching the query (returns all if query is empty)
    const slots = await Parking.find(query);
    res.json({ success: true, data: slots });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
export const newSlot = async (req, res) => {
  try {
    const slot = await Parking.create(req.body);
    res.json({ success: true, data: slot });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
export const updateSlot = async (req, res) => {
  try {
    const updated = await Parking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
export const deleteSlot = async (req, res) => {
  try {
    await Parking.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
