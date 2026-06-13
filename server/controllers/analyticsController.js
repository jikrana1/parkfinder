// server/controllers/analyticsController.js
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Parking from "../models/Parking.js";
import mongoose from "mongoose";

// Helper to parse date ranges
const getDateRange = (req) => {
  let start, end;
  if (req.query.startDate && req.query.endDate) {
    start = new Date(req.query.startDate);
    end = new Date(req.query.endDate);
    end.setHours(23, 59, 59, 999);
  } else {
    const now = new Date();
    end = now;
    start = new Date();
    const range = req.query.range || "30d";
    if (range === "7d") {
      start.setDate(now.getDate() - 7);
    } else if (range === "90d") {
      start.setDate(now.getDate() - 90);
    } else {
      start.setDate(now.getDate() - 30);
    }
    start.setHours(0, 0, 0, 0);
  }
  return { start, end };
};

// GET /api/admin/analytics/bookings?range=7d|30d|90d
export const getBookingsAnalytics = async (req, res) => {
  try {
    const { start, end } = getDateRange(req);
    const matchStage = {
      bookingDate: { $gte: start, $lte: end },
    };

    // Calculate KPI stats
    const stats = await Booking.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          activeBookings: {
            $sum: { $cond: [{ $eq: ["$bookingStatus", "active"] }, 1, 0] },
          },
          completedBookings: {
            $sum: { $cond: [{ $eq: ["$bookingStatus", "completed"] }, 1, 0] },
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ["$bookingStatus", "cancelled"] }, 1, 0] },
          },
          avgDuration: { $avg: "$duration" },
          totalRevenue: {
            $sum: {
              $cond: [{ $ne: ["$bookingStatus", "cancelled"] }, "$totalPrice", 0],
            },
          },
        },
      },
    ]);

    const summary = stats[0] || {
      totalBookings: 0,
      activeBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      avgDuration: 0,
      totalRevenue: 0,
    };

    const cancellationRate =
      summary.totalBookings > 0
        ? Math.round((summary.cancelledBookings / summary.totalBookings) * 100 * 10) / 10
        : 0;

    // Daily registration trends
    const dailyTrends = await Booking.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$bookingDate" } },
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $ne: ["$bookingStatus", "cancelled"] }, "$totalPrice", 0],
            },
          },
          active: { $sum: { $cond: [{ $eq: ["$bookingStatus", "active"] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ["$bookingStatus", "completed"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$bookingStatus", "cancelled"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Format daily trend data nicely
    const trendsFormatted = dailyTrends.map((t) => ({
      date: t._id,
      bookings: t.count,
      revenue: t.revenue,
      active: t.active,
      completed: t.completed,
      cancelled: t.cancelled,
    }));

    // Top locations
    const topLocations = await Booking.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$parkingId",
          bookingsCount: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $ne: ["$bookingStatus", "cancelled"] }, "$totalPrice", 0],
            },
          },
        },
      },
      {
        $lookup: {
          from: "parkings",
          localField: "_id",
          foreignField: "_id",
          as: "parking",
        },
      },
      { $unwind: "$parking" },
      {
        $project: {
          _id: 1,
          name: "$parking.name",
          location: "$parking.location",
          bookings: "$bookingsCount",
          revenue: 1,
        },
      },
      { $sort: { bookings: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalBookings: summary.totalBookings,
          activeBookings: summary.activeBookings,
          completedBookings: summary.completedBookings,
          cancelledBookings: summary.cancelledBookings,
          cancellationRate,
          avgDuration: summary.avgDuration ? Math.round(summary.avgDuration * 10) / 10 : 0,
          totalRevenue: summary.totalRevenue,
        },
        dailyTrends: trendsFormatted,
        topLocations,
      },
    });
  } catch (error) {
    console.error("Error in getBookingsAnalytics:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/analytics/revenue?groupBy=location|day
export const getRevenueAnalytics = async (req, res) => {
  try {
    const { start, end } = getDateRange(req);
    const groupBy = req.query.groupBy || "day";

    if (groupBy === "location") {
      const data = await Booking.aggregate([
        {
          $match: {
            bookingDate: { $gte: start, $lte: end },
            bookingStatus: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: "$parkingId",
            revenue: { $sum: "$totalPrice" },
            bookings: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "parkings",
            localField: "_id",
            foreignField: "_id",
            as: "parking",
          },
        },
        { $unwind: "$parking" },
        {
          $project: {
            _id: 0,
            parkingId: "$_id",
            name: "$parking.name",
            location: "$parking.location",
            revenue: 1,
            bookings: 1,
          },
        },
        { $sort: { revenue: -1 } },
      ]);

      return res.json({ success: true, data });
    } else {
      const data = await Booking.aggregate([
        {
          $match: {
            bookingDate: { $gte: start, $lte: end },
            bookingStatus: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$bookingDate" } },
            revenue: { $sum: "$totalPrice" },
            bookings: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            date: "$_id",
            revenue: 1,
            bookings: 1,
          },
        },
      ]);

      return res.json({ success: true, data });
    }
  } catch (error) {
    console.error("Error in getRevenueAnalytics:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/analytics/occupancy
export const getOccupancyAnalytics = async (req, res) => {
  try {
    const { start, end } = getDateRange(req);

    // 1. Real-time capacity stats
    const parkingLots = await Parking.find({});
    let totalCapacity = 0;
    let totalAvailableSlots = 0;

    const locationsOccupancy = parkingLots.map((p) => {
      const capacity = p.capacity || 0;
      const available = p.availableSlots || 0;
      const occupied = Math.max(0, capacity - available);
      const rate = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;
      totalCapacity += capacity;
      totalAvailableSlots += available;
      return {
        parkingId: p._id,
        name: p.name,
        location: p.location,
        capacity,
        availableSlots: available,
        occupiedSlots: occupied,
        occupancyRate: rate,
      };
    });

    const totalOccupiedSlots = Math.max(0, totalCapacity - totalAvailableSlots);
    const overallOccupancyRate =
      totalCapacity > 0 ? Math.round((totalOccupiedSlots / totalCapacity) * 100) : 0;

    // 2. Day of Week distribution (bookings start)
    const weeklyData = await Booking.aggregate([
      {
        $match: {
          bookingDate: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: "$bookingDate" },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Map day numbers (1 = Sunday, 7 = Saturday) to names
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const weeklyFormatted = Array.from({ length: 7 }, (_, i) => {
      const dayNum = i + 1;
      const found = weeklyData.find((w) => w._id === dayNum);
      return {
        day: dayNames[i],
        bookings: found ? found.bookings : 0,
      };
    });

    // 3. Hourly distribution (bookings start)
    const hourlyData = await Booking.aggregate([
      {
        $match: {
          bookingDate: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $hour: "$bookingDate" },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const hourlyFormatted = Array.from({ length: 24 }, (_, hour) => {
      const found = hourlyData.find((h) => h._id === hour);
      return {
        hour: `${String(hour).padStart(2, "0")}:00`,
        bookings: found ? found.bookings : 0,
      };
    });

    res.json({
      success: true,
      data: {
        realTime: {
          totalCapacity,
          totalAvailableSlots,
          totalOccupiedSlots,
          overallOccupancyRate,
          locationsOccupancy,
        },
        weekly: weeklyFormatted,
        hourly: hourlyFormatted,
      },
    });
  } catch (error) {
    console.error("Error in getOccupancyAnalytics:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/analytics/users
export const getUsersAnalytics = async (req, res) => {
  try {
    const { start, end } = getDateRange(req);

    // Get daily registration count
    const dailyRegistrations = await User.aggregate([
      {
        $project: {
          registrationDate: { $toDate: "$_id" },
        },
      },
      {
        $match: {
          registrationDate: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$registrationDate" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Count of users registered prior to start date
    let cumulativeUsers = 0;
    try {
      const startHex = Math.floor(start.getTime() / 1000).toString(16).padEnd(24, "0");
      if (mongoose.Types.ObjectId.isValid(startHex)) {
        cumulativeUsers = await User.countDocuments({
          _id: { $lt: new mongoose.Types.ObjectId(startHex) },
        });
      }
    } catch (e) {
      console.error("Error fetching starting user offset:", e);
    }

    // Build day-by-day list within selected date range
    const growthTrends = [];
    const dateCursor = new Date(start);
    while (dateCursor <= end) {
      const dateStr = dateCursor.toISOString().split("T")[0];
      const foundDay = dailyRegistrations.find((r) => r._id === dateStr);
      const newUsers = foundDay ? foundDay.count : 0;
      cumulativeUsers += newUsers;

      growthTrends.push({
        date: dateStr,
        newUsers,
        totalUsers: cumulativeUsers,
      });

      dateCursor.setDate(dateCursor.getDate() + 1);
    }

    res.json({
      success: true,
      data: growthTrends,
    });
  } catch (error) {
    console.error("Error in getUsersAnalytics:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
