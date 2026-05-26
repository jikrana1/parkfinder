// DashboardPage.tsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";
import { Pie, Bar, Line } from "react-chartjs-2";
import * as Icons from "lucide-react";

// Register ChartJS components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  Filler,
);

interface DashboardStats {
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalSpent: number;
  averageSpentPerBooking: number;
  totalParkingHours: number;
  favoriteParking: {
    name: string;
    count: number;
  } | null;
  recentActivity: {
    date: string;
    count: number;
  }[];
  bookingTrends: {
    month: string;
    bookings: number;
    spent: number;
  }[];
  parkingTypeDistribution: {
    type: string;
    count: number;
  }[];
  hourlyDistribution: {
    hour: string;
    bookings: number;
  }[];
  durationAnalysis: {
    range: string;
    count: number;
  }[];
  monthlyComparison: {
    month: string;
    currentYear: number;
    lastYear: number;
  }[];
}

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">(
    "month",
  );
  const { token } = useAuth();

  const API = import.meta.env.VITE_API_URL;

  // Detect system theme
  const { theme } = useTheme();

  useEffect(() => {
    fetchDashboardData();
  }, [timeframe]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API}/api/dashboard/user-stats?timeframe=${timeframe}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();

      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch dashboard data",
      );
    } finally {
      setLoading(false);
    }
  };

  // Theme-based classes
  const getThemeClasses = () => {
    return theme === 'light' 
      ? {
          bg: 'bg-gray-50',
          text: 'text-gray-900',
          textSecondary: 'text-gray-600',
          textMuted: 'text-gray-500',
          border: 'border-gray-200',
          cardBg: 'bg-white',
          cardBgSecondary: 'bg-gray-50',
          cardBorder: 'border-gray-200',
          overlay: 'bg-black/5',
          chartGrid: 'rgba(0, 0, 0, 0.1)',
          chartText: '#4B5563',
          gradient: {
            primary: 'from-blue-600 to-blue-500',
            secondary: 'from-pink-600 to-pink-500',
            accent: 'from-blue-600 to-pink-600'
          }
        }
      : {
          bg: 'bg-[#191919]',
          text: 'text-[#EEECF6]',
          textSecondary: 'text-[#EEECF6]/70',
          textMuted: 'text-[#EEECF6]/40',
          border: 'border-[#1B42CB]/20',
          cardBg: 'bg-[#191919]/60',
          cardBgSecondary: 'bg-[#191919]/80',
          cardBorder: 'border-[#1B42CB]/20',
          overlay: 'bg-black/40',
          chartGrid: 'rgba(238, 236, 246, 0.1)',
          chartText: '#EEECF6',
          gradient: {
            primary: 'from-[#1B42CB] to-[#1B42CB]/80',
            secondary: 'from-[#FF2F6C] to-[#FF2F6C]/80',
            accent: 'from-[#1B42CB] to-[#FF2F6C]'
          }
        };
  };

  const themeClasses = getThemeClasses();

  // Chart configurations with theme support
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: themeClasses.chartText,
          font: {
            size: 12,
          },
        },
      },
    },
    scales: {
      y: {
        grid: {
          color: themeClasses.chartGrid,
        },
        ticks: {
          color: themeClasses.chartText,
        },
      },
      x: {
        grid: {
          color: themeClasses.chartGrid,
        },
        ticks: {
          color: themeClasses.chartText,
        },
      },
    },
  };

  const pieChartData = {
    labels: ["Active", "Completed", "Cancelled"],
    datasets: [
      {
        data: [
          stats?.activeBookings || 0,
          stats?.completedBookings || 0,
          stats?.cancelledBookings || 0,
        ],
        backgroundColor: [
          "rgba(27, 66, 203, 0.8)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(255, 47, 108, 0.8)",
        ],
        borderColor: [
          "rgba(27, 66, 203, 1)",
          "rgba(34, 197, 94, 1)",
          "rgba(255, 47, 108, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const barChartData = {
    labels: stats?.bookingTrends?.map((item) => item.month) || [],
    datasets: [
      {
        label: "Bookings",
        data: stats?.bookingTrends?.map((item) => item.bookings) || [],
        backgroundColor: "rgba(27, 66, 203, 0.8)",
        borderColor: "rgba(27, 66, 203, 1)",
        borderWidth: 1,
      },
      {
        label: "Amount Spent (₹)",
        data: stats?.bookingTrends?.map((item) => item.spent) || [],
        backgroundColor: "rgba(255, 47, 108, 0.8)",
        borderColor: "rgba(255, 47, 108, 1)",
        borderWidth: 1,
      },
    ],
  };

  const hourlyChartData = {
    labels: stats?.hourlyDistribution?.map((item) => item.hour) || [],
    datasets: [
      {
        label: "Bookings",
        data: stats?.hourlyDistribution?.map((item) => item.bookings) || [],
        backgroundColor: "rgba(27, 66, 203, 0.6)",
        borderColor: "rgba(27, 66, 203, 1)",
        borderWidth: 2,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const durationChartData = {
    labels: stats?.durationAnalysis?.map((item) => item.range) || [],
    datasets: [
      {
        label: "Number of Bookings",
        data: stats?.durationAnalysis?.map((item) => item.count) || [],
        backgroundColor: "rgba(255, 47, 108, 0.6)",
        borderColor: "rgba(255, 47, 108, 1)",
        borderWidth: 2,
      },
    ],
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${themeClasses.bg} flex items-center justify-center p-4 transition-colors duration-300`}>
        <div className="text-center">
          <div className="relative">
            <div className={`w-24 h-24 rounded-full bg-gradient-to-r ${themeClasses.gradient.accent} animate-spin`}></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-20 h-20 rounded-full ${theme === 'light' ? 'bg-white' : 'bg-[#191919]'}`}></div>
            </div>
          </div>
          <p className={`mt-6 ${themeClasses.text} text-lg font-semibold`}>
            Loading your dashboard...
          </p>
          <p className={themeClasses.textSecondary}>Analyzing your parking data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${themeClasses.bg} flex items-center justify-center p-4 transition-colors duration-300`}>
        <div className={`backdrop-blur-xl ${themeClasses.cardBgSecondary} border ${themeClasses.border} rounded-3xl p-8 max-w-md w-full shadow-2xl`}>
          <div className="text-center">
            <div className={`w-20 h-20 bg-gradient-to-br from-[#FF2F6C]/20 to-[#1B42CB]/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#FF2F6C]/30`}>
              <Icons.AlertTriangle className="w-8 h-8 text-[#FF2F6C]" />
            </div>
            <h2 className={`text-2xl font-bold ${themeClasses.text} mb-3`}>
              Dashboard Error
            </h2>
            <p className={themeClasses.textSecondary}>{error}</p>
            <button
              onClick={() => fetchDashboardData()}
              className={`mt-6 px-6 py-3 bg-gradient-to-r from-[#1B42CB] to-[#1B42CB]/80 text-white font-semibold rounded-xl hover:from-[#1B42CB]/90 hover:to-[#1B42CB]/70 transition-all duration-300 hover:shadow-lg hover:shadow-[#1B42CB]/20`}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeClasses.bg} p-4 md:p-6 transition-colors duration-300`}>
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#1B42CB]/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#FF2F6C]/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className={`backdrop-blur-xl ${themeClasses.cardBgSecondary} border ${themeClasses.border} rounded-2xl p-6 md:p-8 shadow-2xl`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${themeClasses.gradient.accent} flex items-center justify-center`}>
                    <Icons.BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r from-[${theme === 'light' ? '#1B42CB' : '#EEECF6'}] to-[#1B42CB] bg-clip-text text-transparent`}>
                      Analytics Dashboard
                    </h1>
                    <p className={themeClasses.textSecondary}>
                      Track your parking habits and spending
                    </p>
                  </div>
                </div>
              </div>

              {/* Time Filter */}
              <div className={`flex gap-2 ${themeClasses.cardBgSecondary} border ${themeClasses.border} rounded-xl p-1`}>
                {["week", "month", "year"].map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimeframe(period as any)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                      timeframe === period
                        ? `bg-gradient-to-r ${themeClasses.gradient.accent} text-white`
                        : `${themeClasses.textSecondary} hover:${themeClasses.text} hover:bg-white/5`
                    }`}
                  >
                    {period === 'week' && <Icons.CalendarDays className="w-4 h-4" />}
                    {period === 'month' && <Icons.Calendar className="w-4 h-4" />}
                    {period === 'year' && <Icons.CalendarRange className="w-4 h-4" />}
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`backdrop-blur-xl ${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:shadow-[#1B42CB]/10 transition-all duration-300`}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#1B42CB]/20 flex items-center justify-center">
                <Icons.CalendarCheck className="w-6 h-6 text-[#1B42CB]" />
              </div>
              <span className={`text-3xl font-bold ${themeClasses.text}`}>
                {stats?.totalBookings || 0}
              </span>
            </div>
            <h3 className={themeClasses.textSecondary}>Total Bookings</h3>
          </div>

          <div className={`backdrop-blur-xl ${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:shadow-[#1B42CB]/10 transition-all duration-300`}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Icons.CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <span className={`text-3xl font-bold ${themeClasses.text}`}>
                {stats?.completedBookings || 0}
              </span>
            </div>
            <h3 className={themeClasses.textSecondary}>Completed</h3>
          </div>

          <div className={`backdrop-blur-xl ${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:shadow-[#1B42CB]/10 transition-all duration-300`}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#FF2F6C]/20 flex items-center justify-center">
                <Icons.IndianRupee className="w-6 h-6 text-[#FF2F6C]" />
              </div>
              <span className={`text-3xl font-bold ${themeClasses.text}`}>
                ₹{stats?.totalSpent || 0}
              </span>
            </div>
            <h3 className={themeClasses.textSecondary}>Total Spent</h3>
          </div>

          <div className={`backdrop-blur-xl ${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:shadow-[#1B42CB]/10 transition-all duration-300`}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Icons.Clock className="w-6 h-6 text-purple-500" />
              </div>
              <span className={`text-3xl font-bold ${themeClasses.text}`}>
                {stats?.totalParkingHours || 0}h
              </span>
            </div>
            <h3 className={themeClasses.textSecondary}>Total Hours</h3>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Booking Status Distribution */}
          <div className={`backdrop-blur-xl ${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-6 shadow-xl`}>
            <h3 className={`text-xl font-bold ${themeClasses.text} mb-6`}>
              Booking Status Distribution
            </h3>
            <div className="h-64">
              <Pie data={pieChartData} options={chartOptions} />
            </div>
          </div>

          {/* Favorite Parking */}
          <div className={`backdrop-blur-xl ${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-6 shadow-xl`}>
            <h3 className={`text-xl font-bold ${themeClasses.text} mb-6`}>
              Favorite Parking Location
            </h3>
            {stats?.favoriteParking ? (
              <div className="text-center">
                <div className={`w-24 h-24 mx-auto mb-4 rounded-xl bg-gradient-to-br ${themeClasses.gradient.accent} flex items-center justify-center`}>
                  <Icons.Trophy className="w-8 h-8 text-white" />
                </div>
                <h4 className={`text-2xl font-bold ${themeClasses.text} mb-2`}>
                  {stats.favoriteParking.name}
                </h4>
                <p className={themeClasses.textSecondary}>
                  Booked {stats.favoriteParking.count} times
                </p>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-[#EEECF6]/40">
                No data available
              </div>
            )}
          </div>

          {/* Booking Trends */}
          <div className={`backdrop-blur-xl ${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-6 shadow-xl lg:col-span-2`}>
            <h3 className={`text-xl font-bold ${themeClasses.text} mb-6`}>
              Booking & Spending Trends
            </h3>
            <div className="h-80">
              <Bar data={barChartData} options={chartOptions} />
            </div>
          </div>

          {/* Hourly Distribution */}
          <div className={`backdrop-blur-xl ${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-6 shadow-xl`}>
            <h3 className={`text-xl font-bold ${themeClasses.text} mb-6`}>
              Peak Booking Hours
            </h3>
            <div className="h-64">
              <Line data={hourlyChartData} options={chartOptions} />
            </div>
          </div>

          {/* Duration Analysis */}
          <div className={`backdrop-blur-xl ${themeClasses.cardBg} border ${themeClasses.border} rounded-2xl p-6 shadow-xl`}>
            <h3 className={`text-xl font-bold ${themeClasses.text} mb-6`}>
              Parking Duration Analysis
            </h3>
            <div className="h-64">
              <Bar data={durationChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Additional Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`backdrop-blur-xl bg-gradient-to-br from-[#1B42CB]/10 to-transparent border ${themeClasses.border} rounded-2xl p-6`}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#1B42CB]/20 flex items-center justify-center">
                <Icons.TrendingUp className="w-5 h-5 text-[#1B42CB]" />
              </div>
              <h4 className={`text-lg font-semibold ${themeClasses.text}`}>
                Average per Booking
              </h4>
            </div>
            <p className={`text-3xl font-bold ${themeClasses.text}`}>
              ₹{stats?.averageSpentPerBooking || 0}
            </p>
            <p className={themeClasses.textMuted}>
              Per booking average
            </p>
          </div>

          <div className={`backdrop-blur-xl bg-gradient-to-br from-[#FF2F6C]/10 to-transparent border ${themeClasses.border} rounded-2xl p-6`}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#FF2F6C]/20 flex items-center justify-center">
                <Icons.Activity className="w-5 h-5 text-[#FF2F6C]" />
              </div>
              <h4 className={`text-lg font-semibold ${themeClasses.text}`}>
                Active Bookings
              </h4>
            </div>
            <p className={`text-3xl font-bold ${themeClasses.text}`}>
              {stats?.activeBookings || 0}
            </p>
            <p className={themeClasses.textMuted}>Currently active</p>
          </div>

          <div className={`backdrop-blur-xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 rounded-2xl p-6`}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Icons.Percent className="w-5 h-5 text-green-500" />
              </div>
              <h4 className={`text-lg font-semibold ${themeClasses.text}`}>
                Completion Rate
              </h4>
            </div>
            <p className={`text-3xl font-bold ${themeClasses.text}`}>
              {stats?.totalBookings
                ? Math.round(
                    (stats.completedBookings / stats.totalBookings) * 100,
                  )
                : 0}
              %
            </p>
            <p className={themeClasses.textMuted}>Of total bookings</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;