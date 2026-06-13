// server/test/analytics.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getBookingsAnalytics,
  getRevenueAnalytics,
  getOccupancyAnalytics,
  getUsersAnalytics,
} from "../controllers/analyticsController.js";
import Booking from "../models/Booking.js";
import Parking from "../models/Parking.js";
import User from "../models/User.js";

vi.mock("../models/Booking.js", () => ({
  default: {
    aggregate: vi.fn(),
  },
}));

vi.mock("../models/Parking.js", () => ({
  default: {
    find: vi.fn(),
  },
}));

vi.mock("../models/User.js", () => ({
  default: {
    aggregate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

describe("Analytics Controller Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getBookingsAnalytics", () => {
    it("should return formatted bookings aggregation stats", async () => {
      Booking.aggregate
        .mockResolvedValueOnce([
          {
            totalBookings: 10,
            activeBookings: 3,
            completedBookings: 5,
            cancelledBookings: 2,
            avgDuration: 2.5,
            totalRevenue: 500,
          },
        ]) // for stats
        .mockResolvedValueOnce([
          {
            _id: "2026-06-13",
            count: 2,
            revenue: 100,
            active: 1,
            completed: 1,
            cancelled: 0,
          },
        ]) // for dailyTrends
        .mockResolvedValueOnce([
          {
            _id: "parking-1",
            name: "City Center",
            location: "Sector 18",
            bookings: 5,
            revenue: 250,
          },
        ]); // for topLocations

      const req = { query: { range: "30d" } };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      await getBookingsAnalytics(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          summary: {
            totalBookings: 10,
            activeBookings: 3,
            completedBookings: 5,
            cancelledBookings: 2,
            cancellationRate: 20,
            avgDuration: 2.5,
            totalRevenue: 500,
          },
          dailyTrends: [
            {
              date: "2026-06-13",
              bookings: 2,
              revenue: 100,
              active: 1,
              completed: 1,
              cancelled: 0,
            },
          ],
          topLocations: [
            {
              _id: "parking-1",
              name: "City Center",
              location: "Sector 18",
              bookings: 5,
              revenue: 250,
            },
          ],
        },
      });
    });
  });

  describe("getRevenueAnalytics", () => {
    it("should return daily revenue group-by results", async () => {
      Booking.aggregate.mockResolvedValueOnce([
        {
          date: "2026-06-13",
          revenue: 300,
          bookings: 4,
        },
      ]);

      const req = { query: { range: "30d", groupBy: "day" } };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      await getRevenueAnalytics(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [
          {
            date: "2026-06-13",
            revenue: 300,
            bookings: 4,
          },
        ],
      });
    });
  });

  describe("getOccupancyAnalytics", () => {
    it("should return real-time capacity and distribution breakdown", async () => {
      Parking.find.mockResolvedValueOnce([
        {
          _id: "p1",
          name: "Lot A",
          location: "Location A",
          capacity: 50,
          availableSlots: 20,
        },
      ]);

      Booking.aggregate
        .mockResolvedValueOnce([
          {
            _id: 2, // Monday
            bookings: 5,
          },
        ]) // for weekly
        .mockResolvedValueOnce([
          {
            _id: 14, // 2:00 PM
            bookings: 8,
          },
        ]); // for hourly

      const req = { query: { range: "30d" } };
      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      };

      await getOccupancyAnalytics(req, res);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.realTime.totalCapacity).toBe(50);
      expect(response.data.realTime.totalOccupiedSlots).toBe(30);
      expect(response.data.realTime.overallOccupancyRate).toBe(60);
      expect(response.data.weekly[1].bookings).toBe(5); // Monday is index 1
      expect(response.data.hourly[14].bookings).toBe(8); // Hour 14 is index 14
    });
  });
});
