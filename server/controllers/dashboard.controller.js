import Booking from "../models/Booking.js";
import ParkingLog from "../models/ParkingLog.js";

// GET /api/dashboard/active-booking
// Returns the user's most recent active booking with full parking details
// Used by the Parked Vehicle Location Reminder widget on the dashboard
export const getActiveBooking = async (req, res) => {
  try {
    const userId = req.user._id;

    const activeBookings = await Booking.find({
      userId,
      bookingStatus: "active",
    })
      .populate("parkingId")
      .sort({ bookingDate: -1 });

    if (!activeBookings.length) {
      return res.json({ success: true, data: [] });
    }

    const data = activeBookings.map((booking) => {
      const bookedAt = new Date(booking.bookingDate);
      const expectedEnd = new Date(
        bookedAt.getTime() + booking.duration * 60 * 60 * 1000
      );
      return {
        bookingId: booking._id,
        bookingDate: booking.bookingDate,
        duration: booking.duration,
        totalPrice: booking.totalPrice,
        expectedEnd,
        parking: {
          id: booking.parkingId?._id,
          name: booking.parkingId?.name,
          location: booking.parkingId?.location,
          floor: booking.parkingId?.floor || "Ground Floor",
          slotNumber: booking.parkingId?.slotNumber || "N/A",
          isCovered: booking.parkingId?.isCovered,
          securityLevel: booking.parkingId?.securityLevel,
        },
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error("Active booking fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active bookings",
    });
  }
};

export const userStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { timeframe = "month" } = req.query;

    // Date range calculation based on timeframe
    const now = new Date();
    let startDate = new Date();
    if (timeframe === "week") {
      startDate.setDate(now.getDate() - 7);
    } else if (timeframe === "month") {
      startDate.setMonth(now.getMonth() - 1);
    } else if (timeframe === "year") {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    // Get all user bookings
    const bookings = await Booking.find({ 
      userId,
      bookingDate: { $gte: startDate }
    }).populate("parkingId");

    // Calculate basic stats
    const totalBookings = bookings.length;
    const activeBookings = bookings.filter(b => b.bookingStatus === "active").length;
    const completedBookings = bookings.filter(b => b.bookingStatus === "completed").length;
    const cancelledBookings = bookings.filter(b => b.bookingStatus === "cancelled").length;
    
    const totalSpent = bookings
      .filter(b => b.bookingStatus === "completed")
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    
    const averageSpentPerBooking = completedBookings > 0 
      ? Math.round(totalSpent / completedBookings) 
      : 0;

    // Calculate total parking hours from logs
    const parkingLogs = await ParkingLog.find({
      bookingId: { $in: bookings.map(b => b._id) },
      status: "completed"
    });
    
    const totalParkingHours = parkingLogs.reduce((sum, log) => {
      if (log.entryTime && log.exitTime) {
        const hours = (log.exitTime - log.entryTime) / (1000 * 60 * 60);
        return sum + hours;
      }
      return sum;
    }, 0);

    // Find favorite parking
    const parkingCount = {};
    bookings.forEach(booking => {
      if (booking.parkingId) {
        const id = booking.parkingId._id.toString();
        if (!parkingCount[id]) {
          parkingCount[id] = {
            name: booking.parkingId.name || "Unknown",
            count: 0
          };
        }
        parkingCount[id].count++;
      }
    });

    let favoriteParking = null;
    let maxCount = 0;
    Object.values(parkingCount).forEach(p => {
      if (p.count > maxCount) {
        maxCount = p.count;
        favoriteParking = p;
      }
    });

    // Monthly trends
    const monthlyTrends = {};
    bookings.forEach(booking => {
      if (booking.bookingDate) {
        const date = new Date(booking.bookingDate);
        const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        
        if (!monthlyTrends[monthYear]) {
          monthlyTrends[monthYear] = { bookings: 0, spent: 0 };
        }
        monthlyTrends[monthYear].bookings++;
        if (booking.bookingStatus === "completed") {
          monthlyTrends[monthYear].spent += booking.totalPrice || 0;
        }
      }
    });

    const bookingTrends = Object.entries(monthlyTrends).map(([month, data]) => ({
      month,
      bookings: data.bookings,
      spent: data.spent
    })).sort((a, b) => {
      // Sort by date
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });

    // Hourly distribution
    const hourlyDistribution = {};
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0') + ':00';
      hourlyDistribution[hour] = 0;
    }
    
    bookings.forEach(booking => {
      if (booking.bookingDate) {
        const hour = new Date(booking.bookingDate).getHours();
        const hourKey = hour.toString().padStart(2, '0') + ':00';
        hourlyDistribution[hourKey] = (hourlyDistribution[hourKey] || 0) + 1;
      }
    });

    // Duration analysis
    const durationRanges = [
      { range: "0-1 hr", min: 0, max: 1, count: 0 },
      { range: "1-2 hrs", min: 1, max: 2, count: 0 },
      { range: "2-3 hrs", min: 2, max: 3, count: 0 },
      { range: "3-4 hrs", min: 3, max: 4, count: 0 },
      { range: "4+ hrs", min: 4, max: Infinity, count: 0 }
    ];

    bookings.forEach(booking => {
      const duration = booking.duration || 0;
      const range = durationRanges.find(r => duration >= r.min && duration < r.max);
      if (range) range.count++;
    });

    res.json({
      success: true,
      data: {
        totalBookings,
        activeBookings,
        completedBookings,
        cancelledBookings,
        totalSpent,
        averageSpentPerBooking,
        totalParkingHours: Math.round(totalParkingHours * 10) / 10,
        favoriteParking,
        bookingTrends,
        hourlyDistribution: Object.entries(hourlyDistribution).map(([hour, count]) => ({
          hour,
          bookings: count
        })),
        durationAnalysis: durationRanges,
      }
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch dashboard statistics" 
    });
  }
}