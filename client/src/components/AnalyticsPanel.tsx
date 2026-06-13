// client/src/components/AnalyticsPanel.tsx
import * as React from "react";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Clock,
  AlertTriangle,
  Download,
  CalendarDays,
  RefreshCw,
  Users,
  MapPin,
  BarChart3,
  Percent,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
} from "recharts";

interface BookingSummary {
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  cancellationRate: number;
  avgDuration: number;
  totalRevenue: number;
}

interface DailyTrend {
  date: string;
  bookings: number;
  revenue: number;
  active: number;
  completed: number;
  cancelled: number;
}

interface TopLocation {
  _id: string;
  name: string;
  location: string;
  bookings: number;
  revenue: number;
}

interface BookingsData {
  summary: BookingSummary;
  dailyTrends: DailyTrend[];
  topLocations: TopLocation[];
}

interface RevenueItem {
  date?: string;
  name?: string;
  location?: string;
  revenue: number;
  bookings: number;
}

interface OccupancyRealTime {
  totalCapacity: number;
  totalAvailableSlots: number;
  totalOccupiedSlots: number;
  overallOccupancyRate: number;
  locationsOccupancy: Array<{
    parkingId: string;
    name: string;
    location: string;
    capacity: number;
    availableSlots: number;
    occupiedSlots: number;
    occupancyRate: number;
  }>;
}

interface OccupancyData {
  realTime: OccupancyRealTime;
  weekly: Array<{ day: string; bookings: number }>;
  hourly: Array<{ hour: string; bookings: number }>;
}

interface UserGrowthItem {
  date: string;
  newUsers: number;
  totalUsers: number;
}

export default function AnalyticsPanel() {
  const { token } = useAuth();
  const { theme } = useTheme();

  // State for filters
  const [rangePreset, setRangePreset] = useState<string>("30d");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isCustomDate, setIsCustomDate] = useState<boolean>(false);

  // Data states
  const [bookingsData, setBookingsData] = useState<BookingsData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueItem[]>([]);
  const [occupancyData, setOccupancyData] = useState<OccupancyData | null>(null);
  const [userGrowthData, setUserGrowthData] = useState<UserGrowthItem[]>([]);

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all analytics data
  const fetchAnalytics = async (isUpdate = false) => {
    if (!token) return;
    if (isUpdate) setUpdating(true);
    else setLoading(true);
    setError(null);

    try {
      // Build query string
      let query = "";
      if (isCustomDate && startDate && endDate) {
        query = `?startDate=${startDate}&endDate=${endDate}`;
      } else {
        query = `?range=${rangePreset}`;
      }

      // Fetch all endpoints concurrently
      const [bookingsRes, revenueRes, occupancyRes, usersRes] = await Promise.all([
        fetch(`/api/admin/analytics/bookings${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/admin/analytics/revenue${query}&groupBy=day`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/admin/analytics/occupancy${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/admin/analytics/users${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [bookingsJson, revenueJson, occupancyJson, usersJson] = await Promise.all([
        bookingsRes.json(),
        revenueRes.json(),
        occupancyRes.json(),
        usersRes.json(),
      ]);

      if (!bookingsJson.success) throw new Error(bookingsJson.message || "Failed to fetch bookings analytics");
      if (!revenueJson.success) throw new Error(revenueJson.message || "Failed to fetch revenue analytics");
      if (!occupancyJson.success) throw new Error(occupancyJson.message || "Failed to fetch occupancy analytics");
      if (!usersJson.success) throw new Error(usersJson.message || "Failed to fetch user analytics");

      setBookingsData(bookingsJson.data);
      setRevenueData(revenueJson.data);
      setOccupancyData(occupancyJson.data);
      setUserGrowthData(usersJson.data);
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong while loading dashboard analytics");
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [token, rangePreset]);

  const handleCustomDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError("Please select both start and end dates");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError("Start date cannot be after end date");
      return;
    }
    setIsCustomDate(true);
    fetchAnalytics(true);
  };

  const resetCustomDate = () => {
    setIsCustomDate(false);
    setStartDate("");
    setEndDate("");
    setRangePreset("30d");
  };

  // CSV Export Utility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCSVExport = (data: any[], filename: string, headers: string[]) => {
    if (!data || data.length === 0) return;

    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const val = row[header] !== undefined ? row[header] : "";
            // Handle nested objects if any or stringify
            const strVal = typeof val === "object" ? JSON.stringify(val) : String(val);
            const escaped = strVal.replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Theme support classes
  const isDark = theme === "dark";
  const styles = {
    card: isDark ? "bg-[#191919]/80 border-[#1B42CB]/20 text-[#EEECF6]" : "bg-white border-gray-200 text-gray-900",
    textMuted: isDark ? "text-[#EEECF6]/60" : "text-gray-500",
    textSec: isDark ? "text-[#EEECF6]/80" : "text-gray-700",
    bgSec: isDark ? "bg-[#191919]/50" : "bg-gray-50",
    border: isDark ? "border-[#1B42CB]/20" : "border-gray-200",
    input: isDark
      ? "bg-[#191919]/50 border-[#1B42CB]/30 text-[#EEECF6] focus:border-[#FF2F6C]"
      : "bg-white border-gray-300 text-gray-900 focus:border-blue-500",
    buttonPresetActive: "bg-gradient-to-r from-[#1B42CB] to-[#FF2F6C] text-white shadow-lg shadow-[#FF2F6C]/20",
    buttonPresetInactive: isDark
      ? "bg-[#191919]/60 hover:bg-[#1B42CB]/10 border-[#1B42CB]/20 text-[#EEECF6]/80"
      : "bg-white border-gray-300 hover:bg-gray-100 text-gray-700",
  };

  // Pie chart colors
  const statusColors = {
    active: "#10B981", // Emerald
    completed: "#3B82F6", // Blue
    cancelled: "#EF4444", // Red
  };

  // Skeletons
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Skeletons Filter */}
        <div className={`h-16 rounded-2xl ${styles.card} border p-4 flex items-center justify-between`}>
          <div className="w-1/3 h-8 bg-gray-400/20 rounded-lg"></div>
          <div className="w-1/4 h-8 bg-gray-400/20 rounded-lg"></div>
        </div>
        {/* Skeletons KPI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className={`h-32 rounded-2xl ${styles.card} border p-6 space-y-4`}>
              <div className="w-1/2 h-4 bg-gray-400/20 rounded-md"></div>
              <div className="w-3/4 h-8 bg-gray-400/20 rounded-md"></div>
            </div>
          ))}
        </div>
        {/* Skeletons Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`h-96 rounded-2xl ${styles.card} border p-6`}></div>
          <div className={`h-96 rounded-2xl ${styles.card} border p-6`}></div>
        </div>
      </div>
    );
  }

  // Summary Metrics
  const summary = bookingsData?.summary || {
    totalBookings: 0,
    activeBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    cancellationRate: 0,
    avgDuration: 0,
    totalRevenue: 0,
  };

  // Format booking status data for Donut Chart
  const bookingStatusPieData = [
    { name: "Active", value: summary.activeBookings, color: statusColors.active },
    { name: "Completed", value: summary.completedBookings, color: statusColors.completed },
    { name: "Cancelled", value: summary.cancelledBookings, color: statusColors.cancelled },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-8 relative">
      {/* Updating overlay spinner */}
      {updating && (
        <div className="absolute inset-0 bg-black/10 backdrop-blur-xs z-50 rounded-2xl flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 bg-slate-900/90 text-white px-6 py-4 rounded-xl shadow-2xl">
            <RefreshCw className="w-6 h-6 animate-spin text-[#FF2F6C]" />
            <span className="text-sm font-medium">Refreshing analytics...</span>
          </div>
        </div>
      )}

      {/* Date Filter & Control Dashboard Header */}
      <div className={`backdrop-blur-xl border ${styles.card} rounded-2xl p-6 shadow-xl`}>
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
              <BarChart3 className="w-5 h-5 text-[#FF2F6C]" />
              Analytics & Insights Dashboard
            </h2>
            <p className={`text-xs ${styles.textMuted}`}>
              Analyze bookings, revenue growth, occupancy stats, and user registrations
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* Range Presets */}
            <div className={`flex rounded-xl p-1 border ${styles.border} ${styles.bgSec} self-start`}>
              {["7d", "30d", "90d"].map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setIsCustomDate(false);
                    setRangePreset(preset);
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                    !isCustomDate && rangePreset === preset ? styles.buttonPresetActive : styles.buttonPresetInactive
                  }`}
                >
                  {preset === "7d" ? "7 Days" : preset === "30d" ? "30 Days" : "90 Days"}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className={`hidden sm:block w-[1px] h-8 ${styles.border}`}></div>

            {/* Custom Date Picker Form */}
            <form onSubmit={handleCustomDateSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`pl-3 pr-2 py-2 text-xs rounded-xl border ${styles.input} focus:outline-none focus:ring-1 focus:ring-[#FF2F6C]/30`}
                />
              </div>
              <span className={`text-center text-xs ${styles.textMuted}`}>to</span>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`pl-3 pr-2 py-2 text-xs rounded-xl border ${styles.input} focus:outline-none focus:ring-1 focus:ring-[#FF2F6C]/30`}
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-[#1B42CB] to-[#1B42CB]/80 text-white font-semibold text-xs rounded-xl hover:shadow-md transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Apply
              </button>

              {isCustomDate && (
                <button
                  type="button"
                  onClick={resetCustomDate}
                  className="px-3 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold text-xs rounded-xl transition-all duration-300"
                >
                  Clear Custom
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3 text-red-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs underline font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Card */}
        <div className={`backdrop-blur-xl border ${styles.card} rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-[#FF2F6C]/30 transition-all duration-300`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-xs font-semibold ${styles.textMuted} uppercase tracking-wider mb-1`}>Total Revenue</p>
              <h3 className="text-3xl font-extrabold tracking-tight">₹{summary.totalRevenue.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-green-500 font-semibold">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>Completed & active bookings</span>
          </div>
        </div>

        {/* Active Bookings Card */}
        <div className={`backdrop-blur-xl border ${styles.card} rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-[#FF2F6C]/30 transition-all duration-300`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-xs font-semibold ${styles.textMuted} uppercase tracking-wider mb-1`}>Active Bookings</p>
              <h3 className="text-3xl font-extrabold tracking-tight">{summary.activeBookings}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-blue-500 font-semibold">
            <span>Current slot bookings active</span>
          </div>
        </div>

        {/* Cancellation Rate Card */}
        <div className={`backdrop-blur-xl border ${styles.card} rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-[#FF2F6C]/30 transition-all duration-300`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-xs font-semibold ${styles.textMuted} uppercase tracking-wider mb-1`}>Cancellation Rate</p>
              <h3 className="text-3xl font-extrabold tracking-tight">{summary.cancellationRate}%</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Percent className="w-5 h-5 text-red-500" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
              <div
                className="bg-red-500 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, summary.cancellationRate)}%` }}
              ></div>
            </div>
            <p className={`text-[10px] ${styles.textMuted}`}>
              {summary.cancelledBookings} cancelled out of {summary.totalBookings} total
            </p>
          </div>
        </div>

        {/* Avg Duration Card */}
        <div className={`backdrop-blur-xl border ${styles.card} rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-[#FF2F6C]/30 transition-all duration-300`}>
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-xs font-semibold ${styles.textMuted} uppercase tracking-wider mb-1`}>Avg. Duration</p>
              <h3 className="text-3xl font-extrabold tracking-tight">{summary.avgDuration} hrs</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6 text-purple-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-purple-500 font-semibold">
            <span>Average hours parked per booking</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row 1: User Growth Area Chart & Booking Status Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Growth (Area Chart) */}
        <div className={`backdrop-blur-xl border ${styles.card} rounded-2xl p-6 shadow-xl lg:col-span-2 space-y-4`}>
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-md font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-[#1B42CB]" />
                User Registrations Growth
              </h4>
              <p className={`text-xs ${styles.textMuted}`}>Tracking registrations and cumulative audience growth</p>
            </div>
            <button
              onClick={() => handleCSVExport(userGrowthData, "user_registrations_growth.csv", ["date", "newUsers", "totalUsers"])}
              className={`px-3 py-1.5 border ${styles.border} ${styles.bgSec} hover:${styles.bgSec}/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer`}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={userGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1B42CB" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#1B42CB" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF2F6C" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#FF2F6C" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#ffffff10" : "#00000010"} />
                <XAxis dataKey="date" stroke={isDark ? "#EEECF680" : "#4B5563"} fontSize={10} tickLine={false} />
                <YAxis stroke={isDark ? "#EEECF680" : "#4B5563"} fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "#1c1c1e" : "#ffffff",
                    borderColor: isDark ? "#2c2c2e" : "#e5e7eb",
                    borderRadius: "12px",
                    color: isDark ? "#ffffff" : "#000000",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Area
                  type="monotone"
                  name="Cumulative Registered Users"
                  dataKey="totalUsers"
                  stroke="#1B42CB"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                />
                <Area
                  type="monotone"
                  name="Daily New Registrations"
                  dataKey="newUsers"
                  stroke="#FF2F6C"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorNew)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Booking Status Distribution (Donut Chart) */}
        <div className={`backdrop-blur-xl border ${styles.card} rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4`}>
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-md font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#FF2F6C]" />
                Booking Status
              </h4>
              <p className={`text-xs ${styles.textMuted}`}>Distribution of all bookings</p>
            </div>
          </div>

          <div className="h-56 relative flex items-center justify-center">
            {bookingStatusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bookingStatusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {bookingStatusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#1c1c1e" : "#ffffff",
                      borderColor: isDark ? "#2c2c2e" : "#e5e7eb",
                      borderRadius: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className={`text-sm ${styles.textMuted}`}>No booking data available</p>
            )}
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black">{summary.totalBookings}</span>
              <span className={`text-[10px] ${styles.textMuted} font-bold uppercase`}>Bookings</span>
            </div>
          </div>

          {/* Legend Items */}
          <div className="grid grid-cols-3 gap-2 text-center pt-2">
            {bookingStatusPieData.map((item) => (
              <div key={item.name} className={`p-2 rounded-xl ${styles.bgSec} border ${styles.border}`}>
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-bold">{item.name}</span>
                </div>
                <span className="text-sm font-extrabold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Charts Row 2: Revenue Trend Line Chart & Top Booked Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Over Time */}
        <div className={`backdrop-blur-xl border ${styles.card} rounded-2xl p-6 shadow-xl space-y-4`}>
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-md font-bold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                Revenue Trend Over Time
              </h4>
              <p className={`text-xs ${styles.textMuted}`}>Daily tracking of successful booking revenue</p>
            </div>
            <button
              onClick={() => handleCSVExport(revenueData, "revenue_daily_trend.csv", ["date", "revenue", "bookings"])}
              className={`px-3 py-1.5 border ${styles.border} ${styles.bgSec} hover:${styles.bgSec}/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer`}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#ffffff10" : "#00000010"} />
                <XAxis dataKey="date" stroke={isDark ? "#EEECF680" : "#4B5563"} fontSize={10} tickLine={false} />
                <YAxis stroke={isDark ? "#EEECF680" : "#4B5563"} fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "#1c1c1e" : "#ffffff",
                    borderColor: isDark ? "#2c2c2e" : "#e5e7eb",
                    borderRadius: "12px",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Line
                  type="monotone"
                  name="Revenue (₹)"
                  dataKey="revenue"
                  stroke="#10B981"
                  strokeWidth={3}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Locations Ranking list */}
        <div className={`backdrop-blur-xl border ${styles.card} rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4`}>
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-md font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#FF2F6C]" />
                Top 5 Parking Areas
              </h4>
              <p className={`text-xs ${styles.textMuted}`}>Ranked by booking volume and revenue generated</p>
            </div>
            <button
              onClick={() => handleCSVExport(bookingsData?.topLocations || [], "top_booked_locations.csv", ["name", "location", "bookings", "revenue"])}
              className={`px-3 py-1.5 border ${styles.border} ${styles.bgSec} hover:${styles.bgSec}/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer`}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto">
            {bookingsData?.topLocations && bookingsData.topLocations.length > 0 ? (
              bookingsData.topLocations.slice(0, 5).map((loc, idx) => {
                const maxBookings = Math.max(...bookingsData.topLocations.map((l) => l.bookings), 1);
                const percentage = Math.round((loc.bookings / maxBookings) * 100);

                return (
                  <div key={loc._id || idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <div>
                        <span className="font-extrabold mr-2">#{idx + 1}</span>
                        <span className="font-bold">{loc.name}</span>
                        <span className={`block text-[10px] ${styles.textMuted}`}>{loc.location}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold block">{loc.bookings} bookings</span>
                        <span className={`text-[10px] text-green-500 font-bold`}>₹{loc.revenue.toLocaleString()}</span>
                      </div>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-[#1B42CB] to-[#FF2F6C] h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className={`text-sm ${styles.textMuted}`}>No location data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Charts Row 3: Occupancy & Peak Hours / Peak Days */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Peak Hours (Bar Chart) */}
        <div className={`backdrop-blur-xl border ${styles.card} rounded-2xl p-6 shadow-xl lg:col-span-2 space-y-4`}>
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-md font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" />
                Peak Booking Start Hours
              </h4>
              <p className={`text-xs ${styles.textMuted}`}>Booking start times across hours of the day (00:00 - 23:00)</p>
            </div>
            <button
              onClick={() => handleCSVExport(occupancyData?.hourly || [], "peak_hours_distribution.csv", ["hour", "bookings"])}
              className={`px-3 py-1.5 border ${styles.border} ${styles.bgSec} hover:${styles.bgSec}/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer`}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          <div className="h-72">
            {occupancyData?.hourly ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={occupancyData.hourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#ffffff10" : "#00000010"} />
                  <XAxis dataKey="hour" stroke={isDark ? "#EEECF680" : "#4B5563"} fontSize={9} tickLine={false} />
                  <YAxis stroke={isDark ? "#EEECF680" : "#4B5563"} fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#1c1c1e" : "#ffffff",
                      borderColor: isDark ? "#2c2c2e" : "#e5e7eb",
                      borderRadius: "12px",
                    }}
                  />
                  <Bar dataKey="bookings" name="Bookings Start count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className={`text-sm ${styles.textMuted}`}>No hourly occupancy data</p>
              </div>
            )}
          </div>
        </div>

        {/* Peak Days of Week (Bar Chart) */}
        <div className={`backdrop-blur-xl border ${styles.card} rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4`}>
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-md font-bold flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-500" />
                Peak Booking Days
              </h4>
              <p className={`text-xs ${styles.textMuted}`}>Booking frequency compared across the week</p>
            </div>
            <button
              onClick={() => handleCSVExport(occupancyData?.weekly || [], "peak_days_distribution.csv", ["day", "bookings"])}
              className={`px-3 py-1.5 border ${styles.border} ${styles.bgSec} hover:${styles.bgSec}/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer`}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          <div className="h-64 flex-1">
            {occupancyData?.weekly ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={occupancyData.weekly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#ffffff10" : "#00000010"} />
                  <XAxis dataKey="day" stroke={isDark ? "#EEECF680" : "#4B5563"} fontSize={9} tickLine={false} />
                  <YAxis stroke={isDark ? "#EEECF680" : "#4B5563"} fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#1c1c1e" : "#ffffff",
                      borderColor: isDark ? "#2c2c2e" : "#e5e7eb",
                      borderRadius: "12px",
                    }}
                  />
                  <Bar dataKey="bookings" name="Bookings" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className={`text-sm ${styles.textMuted}`}>No weekly occupancy data</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Lot Occupancy Rates table */}
      <div className={`backdrop-blur-xl border ${styles.card} rounded-2xl p-6 shadow-xl space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h4 className="text-md font-bold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#1B42CB]" />
              Real-time Parking Lots Occupancy Status
            </h4>
            <p className={`text-xs ${styles.textMuted}`}>
              Current occupancy rate and slots availability across all listed parking lots
            </p>
          </div>
          <button
            onClick={() =>
              handleCSVExport(
                occupancyData?.realTime?.locationsOccupancy || [],
                "realtime_parking_occupancy.csv",
                ["name", "location", "capacity", "availableSlots", "occupiedSlots", "occupancyRate"]
              )
            }
            className={`px-3 py-1.5 border ${styles.border} ${styles.bgSec} hover:${styles.bgSec}/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start sm:self-center`}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>

        {/* Responsive Table Wrapper */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full border-collapse text-left text-xs">
            <thead className={`bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider`}>
              <tr>
                <th className="p-4">Parking Facility Name</th>
                <th className="p-4">Location</th>
                <th className="p-4 text-center">Total Capacity</th>
                <th className="p-4 text-center">Available Slots</th>
                <th className="p-4 text-center">Occupied Slots</th>
                <th className="p-4 text-center">Occupancy Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {occupancyData?.realTime?.locationsOccupancy && occupancyData.realTime.locationsOccupancy.length > 0 ? (
                occupancyData.realTime.locationsOccupancy.map((lot) => (
                  <tr key={lot.parkingId} className="hover:bg-gray-50 dark:hover:bg-[#1B42CB]/5 transition-colors">
                    <td className="p-4 font-bold">{lot.name}</td>
                    <td className={`p-4 ${styles.textMuted}`}>{lot.location}</td>
                    <td className="p-4 text-center font-semibold">{lot.capacity}</td>
                    <td className="p-4 text-center font-semibold text-green-500">{lot.availableSlots}</td>
                    <td className="p-4 text-center font-semibold text-red-500">{lot.occupiedSlots}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Circle Rate Indicator */}
                        <div
                          className={`w-3.5 h-3.5 rounded-full ${
                            lot.occupancyRate >= 90
                              ? "bg-red-500"
                              : lot.occupancyRate >= 60
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                        />
                        <span className="font-extrabold">{lot.occupancyRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 font-medium">
                    No active parking facilities found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
