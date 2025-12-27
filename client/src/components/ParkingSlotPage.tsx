import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Navigation,
  List,
  Map,
  Search,
  Filter,
  Shield,
  Zap,
  TrendingUp,
  DollarSign,
  Users,
  Car,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Coordinates {
  lat: number;
  lng: number;
}

interface ParkingSlot {
  _id: string;
  name: string;
  location: string;
  pricePerHour: number;
  status: "available" | "occupied" | "maintenance" | string;
  capacity: number;
  availableSlots: number;
  rating: number;
  coordinates: Coordinates;
  addressDetails?: {
    street?: string;
    area?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  features?: string[];
  openingTime: string;
  closingTime: string;
  securityLevel: string;
  isCovered: boolean;
  distance?: number;
  distanceInKm?: string;
}

interface LocationSearchResult {
  lat: number;
  lng: number;
  name: string;
  address?: string;
  formattedAddress?: string;
  addressComponents?: {
    city?: string;
    state?: string;
    country?: string;
  };
}

const ParkingSlotPage: React.FC = () => {
  const navigate = useNavigate();
  const [parkingSlots, setParkingSlots] = useState<ParkingSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ParkingSlot | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedMapSlot, setSelectedMapSlot] = useState<ParkingSlot | null>(
    null
  );
  const [duration, setDuration] = useState(1);
  const { token, user } = useAuth();
  const API = import.meta.env.VITE_API_URL;

  // New states for location search
  const [locationSearch, setLocationSearch] = useState("");
  const [searchedLocation, setSearchedLocation] =
    useState<LocationSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [radius, setRadius] = useState(5); // in km
  const [showGraphs, setShowGraphs] = useState(false);

  // Fetch parking slots with location
  const fetchParkingSlots = async (lat?: number, lng?: number) => {
    try {
      setLoading(true);
      let url = `${API}/api/parking`;

      if (lat && lng) {
        url = `${API}/api/parking/nearby?lat=${lat}&lng=${lng}&radius=${
          radius * 1000
        }`;
      }

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setParkingSlots(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle location search
  const handleLocationSearch = async () => {
    if (!locationSearch.trim()) return;

    try {
      setIsSearching(true);
      const res = await fetch(
        `${API}/api/geocode/forward?query=${encodeURIComponent(locationSearch)}`
      );
      const data = await res.json();

      if (data.success) {
        const location = data.data;
        const searchResult: LocationSearchResult = {
          lat: location.coordinates.lat,
          lng: location.coordinates.lng,
          name: location.formattedAddress,
          formattedAddress: location.formattedAddress,
          addressComponents: location.addressComponents,
        };

        setSearchedLocation(searchResult);
        fetchParkingSlots(location.coordinates.lat, location.coordinates.lng);
        setShowGraphs(true);
      }
    } catch (error) {
      console.error("Location search error:", error);
      setError("Failed to search location. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Auto-detect user location
  useEffect(() => {
    const detectUserLocation = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const userLoc = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };

            // Get address from coordinates
            try {
              const res = await fetch(
                `${API}/api/geocode/reverse?lat=${userLoc.lat}&lng=${userLoc.lng}`
              );
              const data = await res.json();

              if (data.success) {
                setSearchedLocation({
                  lat: userLoc.lat,
                  lng: userLoc.lng,
                  name: data.data.display_name,
                  formattedAddress: data.data.display_name,
                });
                fetchParkingSlots(userLoc.lat, userLoc.lng);
              }
            } catch (error) {
              console.error("Reverse geocode error:", error);
              fetchParkingSlots(); // Fallback to all slots
            }
          },
          (error) => {
            console.warn("Geolocation error:", error);
            fetchParkingSlots(); // Fallback to all slots
          }
        );
      } else {
        fetchParkingSlots(); // Fallback to all slots
      }
    };

    detectUserLocation();
  }, []);

  // Calculate distance between coordinates
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)} m`;
    }
    return `${distance.toFixed(1)} km`;
  };

  const getDirectionsUrl = (slot: ParkingSlot) => {
    if (!slot.coordinates) return "#";
    return `https://www.google.com/maps/dir/?api=1&destination=${slot.coordinates.lat},${slot.coordinates.lng}`;
  };

  // Handle booking
  const handleBookNow = (slot: ParkingSlot) => {
    if (!token || !user) {
      alert("Please login to book a parking slot");
      navigate("/login");
      return;
    }

    setSelectedSlot(slot);
    setPaymentAmount(slot.pricePerHour * 1);
    setDuration(1);

    const modal = document.getElementById("booking-modal");
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !token) return;

    try {
      const totalPrice = selectedSlot.pricePerHour * duration;

      const res = await fetch(`${API}/api/bookings/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          parkingId: selectedSlot._id,
          duration: duration,
          totalPrice: totalPrice,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("✅ Booking successful!");
        closeModal();
        fetchParkingSlots(searchedLocation?.lat, searchedLocation?.lng);
        navigate("/bookings");
      } else {
        alert(`❌ ${data.message || "Booking failed"}`);
      }
    } catch (err) {
      console.error("Booking error:", err);
      alert("❌ Failed to book slot. Please try again.");
    }
  };

  const handleDurationChange = (hours: number) => {
    setDuration(hours);
    if (selectedSlot) {
      setPaymentAmount(selectedSlot.pricePerHour * hours);
    }
  };

  const closeModal = () => {
    const modal = document.getElementById("booking-modal");
    if (modal) {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
    setSelectedSlot(null);
  };

  // Filter and sort slots
  const filteredAndSortedSlots = useMemo(() => {
    let filtered = [...parkingSlots];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (slot) =>
          slot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          slot.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (slot.addressDetails?.city?.toLowerCase() || "").includes(
            searchTerm.toLowerCase()
          )
      );
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(
        (slot) => slot.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Apply sorting
    if (sortBy) {
      switch (sortBy) {
        case "price-low":
          filtered.sort((a, b) => a.pricePerHour - b.pricePerHour);
          break;
        case "price-high":
          filtered.sort((a, b) => b.pricePerHour - a.pricePerHour);
          break;
        case "distance":
          if (searchedLocation) {
            filtered.sort((a, b) => {
              const distA =
                a.distance ||
                calculateDistance(
                  searchedLocation.lat,
                  searchedLocation.lng,
                  a.coordinates.lat,
                  a.coordinates.lng
                );
              const distB =
                b.distance ||
                calculateDistance(
                  searchedLocation.lat,
                  searchedLocation.lng,
                  b.coordinates.lat,
                  b.coordinates.lng
                );
              return distA - distB;
            });
          }
          break;
        case "rating":
          filtered.sort((a, b) => b.rating - a.rating);
          break;
        case "availability":
          filtered.sort((a, b) => {
            const availA = (a.availableSlots / a.capacity) * 100;
            const availB = (b.availableSlots / b.capacity) * 100;
            return availB - availA;
          });
          break;
      }
    }

    return filtered;
  }, [parkingSlots, searchTerm, statusFilter, sortBy, searchedLocation]);

  // Data for graphs
  const priceDistributionData = useMemo(() => {
    if (filteredAndSortedSlots.length === 0) return [];

    const ranges = [
      { range: "0-50", min: 0, max: 50, count: 0 },
      { range: "51-100", min: 51, max: 100, count: 0 },
      { range: "101-150", min: 101, max: 150, count: 0 },
      { range: "151-200", min: 151, max: 200, count: 0 },
      { range: "200+", min: 201, max: Infinity, count: 0 },
    ];

    filteredAndSortedSlots.forEach((slot) => {
      const price = slot.pricePerHour;
      for (const range of ranges) {
        if (price >= range.min && price <= range.max) {
          range.count++;
          break;
        }
      }
    });

    return ranges.map((range) => ({
      name: range.range,
      slots: range.count,
      percentage: (range.count / filteredAndSortedSlots.length) * 100,
    }));
  }, [filteredAndSortedSlots]);

  // Line 416-428 mein yeh changes karein:
  const statusDistributionData = useMemo(() => {
    const statusCounts = {
      available: 0,
      occupied: 0,
      maintenance: 0,
      unknown: 0, // Add unknown category
    };

    filteredAndSortedSlots.forEach((slot) => {
      const status = (slot.status || "unknown").toLowerCase();
      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts]++;
      } else {
        statusCounts.unknown++; // Handle undefined/null status
      }
    });

    return Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      percentage: (value / filteredAndSortedSlots.length) * 100,
    }));
  }, [filteredAndSortedSlots]);

  const availabilityData = useMemo(() => {
    return filteredAndSortedSlots.slice(0, 10).map((slot) => ({
      name: slot.name,
      available: slot.availableSlots,
      total: slot.capacity,
      percentage: (slot.availableSlots / slot.capacity) * 100,
    }));
  }, [filteredAndSortedSlots]);

  const topCitiesData = useMemo(() => {
    const cityMap: Record<string, number> = {};

    filteredAndSortedSlots.forEach((slot) => {
      const city = slot.addressDetails?.city || "Unknown";
      cityMap[city] = (cityMap[city] || 0) + 1;
    });

    return Object.entries(cityMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [filteredAndSortedSlots]);

  // Helper functions
  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case "available":
        return "bg-green-500/20 text-green-300 border-l-4 border-green-500";
      case "occupied":
        return "bg-red-500/20 text-red-300 border-l-4 border-red-500";
      case "maintenance":
        return "bg-yellow-500/20 text-yellow-300 border-l-4 border-yellow-500";
      default:
        return "bg-gray-500/20 text-gray-300 border-l-4 border-gray-500";
    }
  };

  const getStatusBadge = (status: string): string => {
    switch (status?.toLowerCase()) {
      case "available":
        return "Available";
      case "occupied":
        return "Occupied";
      case "maintenance":
        return "Maintenance";
      default:
        return status;
    }
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 4.5) return "text-green-400";
    if (rating >= 4.0) return "text-yellow-400";
    if (rating >= 3.0) return "text-orange-400";
    return "text-red-400";
  };

  const getAvailabilityPercentage = (
    availableSlots: number,
    capacity: number
  ): number => {
    return Math.round((availableSlots / capacity) * 100);
  };

  const getAvailabilityText = (percentage: number): string => {
    if (percentage >= 70) return "High";
    if (percentage >= 40) return "Moderate";
    if (percentage > 0) return "Limited";
    return "Full";
  };

  const getAvailabilityColor = (percentage: number): string => {
    if (percentage >= 70) return "text-green-400";
    if (percentage >= 40) return "text-yellow-400";
    if (percentage > 0) return "text-orange-400";
    return "text-red-400";
  };

  // Render Map View
  const renderMapView = () => {
    if (!searchedLocation) {
      return (
        <div className="backdrop-blur-xl bg-[#191919]/60 border border-[#1B42CB]/20 rounded-2xl p-12 text-center">
          <div className="w-24 h-24 bg-linear-to-br from-[#1B42CB]/20 to-[#FF2F6C]/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#1B42CB]/30">
            <Map className="w-12 h-12 text-[#1B42CB]" />
          </div>
          <h3 className="text-2xl font-bold text-[#EEECF6] mb-3">
            Search a Location
          </h3>
          <p className="text-[#EEECF6]/60 mb-6">
            Enter a location in the search bar to view parking slots on the map
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Map Container */}
        <div className="backdrop-blur-xl bg-[#191919]/60 border border-[#1B42CB]/20 rounded-2xl overflow-hidden shadow-xl">
          <div className="h-[500px] relative">
            {/* Mock Map Background */}
            <div
              className="absolute inset-0 bg-linear-to-br from-[#1B42CB]/20 to-[#FF2F6C]/20"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 20% 30%, #1B42CB 2px, transparent 2px),
                  radial-gradient(circle at 50% 50%, #FF2F6C 3px, transparent 3px),
                  radial-gradient(circle at 80% 70%, #1B42CB 2px, transparent 2px)
                `,
                backgroundSize: "100px 100px",
              }}
            >
              {/* Searched Location Marker */}
              <div
                className="absolute w-8 h-8 transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: "50%",
                  top: "50%",
                }}
              >
                <div className="w-full h-full rounded-full bg-linear-to-br from-blue-500 to-cyan-400 border-2 border-white shadow-lg animate-pulse"></div>
                <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-30"></div>
              </div>

              {/* Parking Slot Markers */}
              {filteredAndSortedSlots.map((slot, index) => {
                if (!slot.coordinates) return null;

                const distance =
                  slot.distance ||
                  calculateDistance(
                    searchedLocation.lat,
                    searchedLocation.lng,
                    slot.coordinates.lat,
                    slot.coordinates.lng
                  );

                // Calculate relative position (simplified)
                const angle =
                  (index / filteredAndSortedSlots.length) * Math.PI * 2;
                const radius = 40;
                const left = 50 + Math.cos(angle) * radius;
                const top = 50 + Math.sin(angle) * radius;

                return (
                  <div
                    key={slot._id}
                    className={`absolute w-10 h-10 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-125 ${
                      selectedMapSlot?._id === slot._id ? "z-10 scale-125" : ""
                    }`}
                    style={{
                      left: `${Math.max(10, Math.min(90, left))}%`,
                      top: `${Math.max(10, Math.min(90, top))}%`,
                    }}
                    onClick={() => setSelectedMapSlot(slot)}
                  >
                    <div
                      className={`
                      w-full h-full rounded-full flex items-center justify-center
                      ${
                        slot.status === "available"
                          ? "bg-linear-to-br from-green-500 to-emerald-400"
                          : slot.status === "occupied"
                          ? "bg-linear-to-br from-red-500 to-pink-400"
                          : "bg-linear-to-br from-yellow-500 to-orange-400"
                      }
                      border-2 border-white shadow-lg
                    `}
                    >
                      <span className="text-white text-xs font-bold">
                        ₹{slot.pricePerHour}
                      </span>
                    </div>
                    {selectedMapSlot?._id === slot._id && (
                      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
                        <div className="bg-[#191919] border border-[#1B42CB]/30 rounded-xl p-3 shadow-xl min-w-[200px]">
                          <div className="font-bold text-[#EEECF6] text-sm mb-1">
                            {slot.name}
                          </div>
                          <div className="text-xs text-[#EEECF6]/60 mb-2">
                            {formatDistance(distance)} away
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[#EEECF6] font-bold">
                              ₹{slot.pricePerHour}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                slot.status === "available"
                                  ? "bg-green-500/20 text-green-300"
                                  : slot.status === "occupied"
                                  ? "bg-red-500/20 text-red-300"
                                  : "bg-yellow-500/20 text-yellow-300"
                              }`}
                            >
                              {getStatusBadge(slot.status)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render List View
  const renderListView = () => {
    if (filteredAndSortedSlots.length === 0) {
      return (
        <div className="backdrop-blur-xl bg-[#191919]/60 border border-[#1B42CB]/20 rounded-2xl p-12 text-center">
          <div className="w-24 h-24 bg-linear-to-br from-[#1B42CB]/20 to-[#FF2F6C]/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#1B42CB]/30">
            <Car className="w-12 h-12 text-[#1B42CB]" />
          </div>
          <h3 className="text-2xl font-bold text-[#EEECF6] mb-3">
            No Parking Slots Found
          </h3>
          <p className="text-[#EEECF6]/60 mb-6">
            {searchTerm || statusFilter
              ? "Try adjusting your search or filters"
              : searchedLocation
              ? "No parking slots found in this area"
              : "Search for a location to find parking slots"}
          </p>
          {(searchTerm || statusFilter) && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("");
                setSortBy("");
              }}
              className="px-6 py-3 bg-linear-to-r from-[#1B42CB] to-[#1B42CB]/80 text-white font-semibold rounded-xl hover:from-[#1B42CB]/90 hover:to-[#1B42CB]/70 transition-all duration-300"
            >
              Clear Filters
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedSlots.map((slot) => {
          const availabilityPercentage = getAvailabilityPercentage(
            slot.availableSlots,
            slot.capacity
          );
          const availabilityText = getAvailabilityText(availabilityPercentage);
          const availabilityColor = getAvailabilityColor(
            availabilityPercentage
          );

          const distance =
            slot.distance ||
            (searchedLocation
              ? calculateDistance(
                  searchedLocation.lat,
                  searchedLocation.lng,
                  slot.coordinates.lat,
                  slot.coordinates.lng
                )
              : 0);

          return (
            <div
              key={slot._id}
              className="group backdrop-blur-xl bg-[#191919]/60 border border-[#1B42CB]/20 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-[#1B42CB]/10 hover:border-[#1B42CB]/40 transition-all duration-500 transform hover:-translate-y-1"
            >
              {/* Status Header */}
              <div className={`px-6 py-4 ${getStatusColor(slot.status)}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-current"></div>
                    <span className="font-bold text-sm">
                      {getStatusBadge(slot.status)}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${availabilityColor} bg-black/20`}
                  >
                    {availabilityText}
                  </span>
                </div>
              </div>

              {/* Slot Content */}
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-[#EEECF6] mb-1">
                      {slot.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <div
                        className={`text-lg font-bold ${getRatingColor(
                          slot.rating
                        )}`}
                      >
                        {slot?.rating ? slot.rating.toFixed(1) : "0.0"}
                      </div>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={`text-sm ${
                              i < Math.floor(slot.rating)
                                ? "text-[#FF2F6C]"
                                : "text-[#EEECF6]/30"
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold bg-linear-to-r from-[#1B42CB] to-[#FF2F6C] bg-clip-text text-transparent">
                      ₹{Number(slot.pricePerHour || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-[#EEECF6]/60">per hour</div>
                  </div>
                </div>

                {/* Location & Distance */}
                <div className="mb-6 space-y-3">
                  <div className="p-4 bg-[#1B42CB]/10 rounded-xl border border-[#1B42CB]/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-linear-to-br from-[#1B42CB] to-[#1B42CB]/80 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="text-[#EEECF6] font-medium truncate block">
                          {slot.addressDetails?.area || slot.location}
                        </span>
                        <span className="text-sm text-[#EEECF6]/60">
                          {slot.addressDetails?.city || "Unknown City"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {searchedLocation && distance > 0 && (
                    <div className="flex items-center justify-between px-2">
                      <span className="text-sm text-[#EEECF6]/60">
                        Distance
                      </span>
                      <span className="font-bold text-[#EEECF6]">
                        {formatDistance(distance)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-[#191919]/50 border border-[#1B42CB]/10 rounded-xl p-3 text-center">
                    <div className="text-sm text-[#EEECF6]/60 mb-1">
                      Available
                    </div>
                    <div className="text-lg font-bold text-[#EEECF6]">
                      {slot.availableSlots}
                      <span className="text-sm text-[#EEECF6]/60 ml-1">
                        /{slot.capacity}
                      </span>
                    </div>
                  </div>
                  <div className="bg-[#191919]/50 border border-[#1B42CB]/10 rounded-xl p-3 text-center">
                    <div className="text-sm text-[#EEECF6]/60 mb-1">Fill %</div>
                    <div className={`text-lg font-bold ${availabilityColor}`}>
                      {availabilityPercentage}%
                    </div>
                  </div>
                  <div className="bg-[#191919]/50 border border-[#1B42CB]/10 rounded-xl p-3 text-center">
                    <div className="text-sm text-[#EEECF6]/60 mb-1">
                      Security
                    </div>
                    <div className="text-lg font-bold text-[#EEECF6] flex items-center justify-center">
                      <Shield className="w-4 h-4 mr-1" />
                      {slot.securityLevel}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[#EEECF6]/60">Capacity Usage</span>
                    <span className="font-semibold text-[#EEECF6]">
                      {availabilityPercentage}% available
                    </span>
                  </div>
                  <div className="h-2 bg-[#191919] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-[#1B42CB] via-[#FF2F6C] to-[#1B42CB]"
                      style={{ width: `${availabilityPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Features */}
                {slot.features && slot.features.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {slot.features.slice(0, 3).map((feature, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-[#1B42CB]/20 text-[#1B42CB] text-xs rounded-lg capitalize"
                        >
                          {feature.replace("-", " ")}
                        </span>
                      ))}
                      {slot.features.length > 3 && (
                        <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-lg">
                          +{slot.features.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <a
                    href={getDirectionsUrl(slot)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-3 bg-[#191919] border border-[#1B42CB]/30 text-[#EEECF6] rounded-lg hover:bg-[#1B42CB]/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    Directions
                  </a>
                  <button
                    onClick={() => handleBookNow(slot)}
                    disabled={
                      slot.status?.toLowerCase() !== "available" ||
                      slot.availableSlots === 0
                    }
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                      slot.status?.toLowerCase() === "available" &&
                      slot.availableSlots > 0
                        ? "bg-linear-to-r from-[#1B42CB] to-[#FF2F6C] text-white hover:shadow-lg hover:shadow-[#FF2F6C]/20"
                        : "bg-[#191919] text-[#EEECF6]/40 border border-[#1B42CB]/20 cursor-not-allowed"
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    {slot.status?.toLowerCase() === "available" &&
                    slot.availableSlots > 0
                      ? "Book Now"
                      : slot.availableSlots === 0
                      ? "Fully Booked"
                      : getStatusBadge(slot.status)}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Graphs Section
  const renderGraphsSection = () => {
    if (!showGraphs || filteredAndSortedSlots.length === 0) return null;

    const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

    return (
      <div className="mt-8 backdrop-blur-xl bg-[#191919]/60 border border-[#1B42CB]/20 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-[#EEECF6] flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Parking Analytics
            </h3>
            <p className="text-[#EEECF6]/60">
              Insights for{" "}
              {searchedLocation?.formattedAddress?.split(",")[0] ||
                "selected area"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#EEECF6]/60">Radius:</span>
            <select
              value={radius}
              onChange={(e) => {
                const newRadius = parseInt(e.target.value);
                setRadius(newRadius);
                if (searchedLocation) {
                  fetchParkingSlots(searchedLocation.lat, searchedLocation.lng);
                }
              }}
              className="px-3 py-2 bg-[#191919]/50 border border-[#1B42CB]/30 rounded-lg text-[#EEECF6] text-sm"
            >
              <option value="2">2 km</option>
              <option value="5">5 km</option>
              <option value="10">10 km</option>
              <option value="20">20 km</option>
            </select>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1B42CB]/10 border border-[#1B42CB]/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#1B42CB]/20 flex items-center justify-center">
                <Car className="w-5 h-5 text-[#1B42CB]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {filteredAndSortedSlots.length}
                </div>
                <div className="text-sm text-[#EEECF6]/60">Total Slots</div>
              </div>
            </div>
          </div>

          <div className="bg-[#FF2F6C]/10 border border-[#FF2F6C]/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF2F6C]/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#FF2F6C]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {
                    filteredAndSortedSlots.filter(
                      (s) => s.status === "available"
                    ).length
                  }
                </div>
                <div className="text-sm text-[#EEECF6]/60">Available</div>
              </div>
            </div>
          </div>

          <div className="bg-[#1B42CB]/10 border border-[#1B42CB]/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#1B42CB]/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#1B42CB]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  ₹
                  {Math.round(
                    filteredAndSortedSlots.reduce(
                      (sum, s) => sum + s.pricePerHour,
                      0
                    ) / filteredAndSortedSlots.length
                  )}
                </div>
                <div className="text-sm text-[#EEECF6]/60">Avg. Price</div>
              </div>
            </div>
          </div>

          <div className="bg-[#FF2F6C]/10 border border-[#FF2F6C]/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF2F6C]/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#FF2F6C]" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {Math.round(
                    (filteredAndSortedSlots.reduce(
                      (sum, s) => sum + s.availableSlots / s.capacity,
                      0
                    ) /
                      filteredAndSortedSlots.length) *
                      100
                  )}
                  %
                </div>
                <div className="text-sm text-[#EEECF6]/60">Avg. Fill</div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Price Distribution */}
          <div className="bg-[#191919]/50 border border-[#1B42CB]/20 rounded-xl p-4">
            <h4 className="text-lg font-semibold text-[#EEECF6] mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Price Distribution (₹/hour)
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priceDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      borderColor: "#1B42CB",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="slots" name="Number of Slots" fill="#1B42CB" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-[#191919]/50 border border-[#1B42CB]/20 rounded-xl p-4">
            <h4 className="text-lg font-semibold text-[#EEECF6] mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Status Distribution
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => {
                      const total = statusDistributionData.reduce(
                        (sum, item) => sum + item.value,
                        0
                      );
                      const percentage = ((value / total) * 100).toFixed(1);
                      return `${name}: ${percentage}%`;
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistributionData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} slots`, name]}
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      borderColor: "#1B42CB",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Cities */}
          <div className="bg-[#191919]/50 border border-[#1B42CB]/20 rounded-xl p-4">
            <h4 className="text-lg font-semibold text-[#EEECF6] mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Top Cities with Parking
            </h4>
            <div className="space-y-3">
              {topCitiesData.map((city) => (
                <div key={city.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#EEECF6]">{city.name}</span>
                    <span className="text-[#EEECF6]/60">
                      {city.value} slots
                    </span>
                  </div>
                  <div className="h-2 bg-[#191919] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-[#1B42CB] to-[#FF2F6C]"
                      style={{
                        width: `${
                          (city.value /
                            Math.max(...topCitiesData.map((c) => c.value))) *
                          100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Availability Chart */}
          <div className="bg-[#191919]/50 border border-[#1B42CB]/20 rounded-xl p-4">
            <h4 className="text-lg font-semibold text-[#EEECF6] mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top 10 Slots Availability
            </h4>
            <div className="space-y-4">
              {availabilityData.map((slot) => (
                <div key={slot.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#EEECF6] truncate max-w-[150px]">
                      {slot.name}
                    </span>
                    <span className="text-[#EEECF6]/60">
                      {slot.available}/{slot.total} slots
                    </span>
                  </div>
                  <div className="h-2 bg-[#191919] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        slot.percentage > 70
                          ? "bg-green-500"
                          : slot.percentage > 30
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${slot.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-linear-to-r from-[#1B42CB]/10 to-[#FF2F6C]/10 rounded-xl border border-[#1B42CB]/20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-white mb-1">
                ₹
                {Math.min(...filteredAndSortedSlots.map((s) => s.pricePerHour))}
              </div>
              <div className="text-sm text-[#EEECF6]/60">Lowest Price</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white mb-1">
                ₹
                {Math.max(...filteredAndSortedSlots.map((s) => s.pricePerHour))}
              </div>
              <div className="text-sm text-[#EEECF6]/60">Highest Price</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white mb-1">
                {filteredAndSortedSlots.reduce((sum, s) => sum + s.capacity, 0)}
              </div>
              <div className="text-sm text-[#EEECF6]/60">Total Capacity</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white mb-1">
                {Math.round(
                  (filteredAndSortedSlots.reduce(
                    (sum, s) => sum + s.rating,
                    0
                  ) /
                    filteredAndSortedSlots.length) *
                    10
                ) / 10}
                /5
              </div>
              <div className="text-sm text-[#EEECF6]/60">Avg. Rating</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#191919] via-[#0f0f0f] to-[#191919] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-linear-to-r from-[#1B42CB] to-[#FF2F6C] animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-[#191919]"></div>
            </div>
          </div>
          <p className="mt-6 text-[#EEECF6] text-lg font-semibold">
            Loading parking slots...
          </p>
          <p className="text-[#EEECF6]/60 mt-2">Fetching latest availability</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#191919] via-[#0f0f0f] to-[#191919] flex items-center justify-center p-4">
        <div className="backdrop-blur-xl bg-[#1B42CB]/10 border border-[#1B42CB]/30 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-[#1B42CB]/10">
          <div className="text-center">
            <div className="w-20 h-20 bg-linear-to-br from-[#FF2F6C]/20 to-[#1B42CB]/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#FF2F6C]/30">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-[#EEECF6] mb-3">
              Connection Error
            </h2>
            <p className="text-[#EEECF6]/70 mb-6">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-6 py-3 bg-linear-to-r from-[#1B42CB] to-[#1B42CB]/80 text-white font-semibold rounded-xl hover:from-[#1B42CB]/90 hover:to-[#1B42CB]/70 transition-all duration-300 hover:shadow-lg hover:shadow-[#1B42CB]/20"
              >
                Retry
              </button>
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-3 bg-[#191919] border border-[#1B42CB]/30 text-[#EEECF6] font-semibold rounded-xl hover:bg-[#1B42CB]/10 transition-all duration-300"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-linear-to-br from-[#191919] via-[#0f0f0f] to-[#191919] p-4 md:p-6">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#1B42CB]/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#FF2F6C]/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#1B42CB]/5 rounded-full blur-3xl"></div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Header Section */}
          <header className="mb-8 md:mb-12">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="backdrop-blur-xl bg-[#1B42CB]/10 border border-[#1B42CB]/20 rounded-2xl p-6 md:p-8 shadow-2xl shadow-[#1B42CB]/10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#1B42CB] to-[#FF2F6C] flex items-center justify-center">
                    <span className="text-xl">🚗</span>
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-[#EEECF6] to-[#1B42CB] bg-clip-text text-transparent">
                      SmartPark
                    </h1>
                    <p className="text-[#EEECF6]/60">
                      Intelligent Parking Solutions
                    </p>
                  </div>
                </div>
                <p className="text-[#EEECF6]/80 max-w-2xl">
                  Find, book, and manage parking slots with real-time
                  availability and smart recommendations.
                </p>
              </div>

              <div className="backdrop-blur-xl bg-[#191919]/80 border border-[#EEECF6]/10 rounded-2xl p-6 shadow-xl">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">
                      {parkingSlots.reduce(
                        (sum, slot) => sum + slot.availableSlots,
                        0
                      )}
                    </div>
                    <div className="text-sm text-[#EEECF6]/60">
                      Available Slots
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">
                      {parkingSlots.length}
                    </div>
                    <div className="text-sm text-[#EEECF6]/60">Locations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">
                      ₹{Math.min(...parkingSlots.map((s) => s.pricePerHour))}
                    </div>
                    <div className="text-sm text-[#EEECF6]/60">
                      Starting Price
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">
                      {parkingSlots.reduce(
                        (sum, slot) => sum + slot.capacity,
                        0
                      )}
                    </div>
                    <div className="text-sm text-[#EEECF6]/60">
                      Total Capacity
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Location Search Bar */}
          <div className="mb-8 backdrop-blur-xl bg-[#191919]/60 border border-[#1B42CB]/20 rounded-2xl p-6 shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="w-6 h-6 text-[#1B42CB]" />
                <h2 className="text-xl font-bold text-[#EEECF6]">
                  Search Parking by Location
                </h2>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <Search className="w-5 h-5 text-[#1B42CB]" />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter city, area, or landmark (e.g., Connaught Place, Delhi)"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleLocationSearch()
                    }
                    className="w-full pl-12 pr-4 py-4 bg-[#191919]/50 border border-[#1B42CB]/30 rounded-xl text-[#EEECF6] placeholder-[#EEECF6]/40 focus:outline-none focus:border-[#1B42CB] focus:ring-2 focus:ring-[#1B42CB]/20 transition-all duration-300"
                  />
                </div>
                <button
                  onClick={handleLocationSearch}
                  disabled={isSearching || !locationSearch.trim()}
                  className="px-8 py-4 bg-linear-to-r from-[#1B42CB] to-[#FF2F6C] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#FF2F6C]/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSearching ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Find Parking
                    </>
                  )}
                </button>
              </div>

              {searchedLocation && (
                <div className="mt-4 p-4 bg-[#1B42CB]/10 rounded-xl border border-[#1B42CB]/20">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="text-sm text-[#EEECF6]/60 mb-1">
                        Showing results for
                      </div>
                      <div className="font-bold text-[#EEECF6]">
                        {searchedLocation.formattedAddress ||
                          searchedLocation.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#EEECF6]/60">Radius:</span>
                      <div className="flex bg-[#191919]/50 rounded-lg overflow-hidden">
                        {[2, 5, 10, 20].map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              setRadius(r);
                              fetchParkingSlots(
                                searchedLocation.lat,
                                searchedLocation.lng
                              );
                            }}
                            className={`px-3 py-1 text-sm ${
                              radius === r
                                ? "bg-[#1B42CB] text-white"
                                : "text-[#EEECF6]/70 hover:text-[#EEECF6] hover:bg-[#1B42CB]/10"
                            }`}
                          >
                            {r} km
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filter/Search Section with View Toggle */}
          <div className="mb-8 backdrop-blur-xl bg-[#191919]/60 border border-[#1B42CB]/20 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <Filter className="w-5 h-5 text-[#1B42CB]" />
                </div>
                <input
                  type="text"
                  placeholder="Filter by name, location, or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-[#191919]/50 border border-[#1B42CB]/30 rounded-xl text-[#EEECF6] placeholder-[#EEECF6]/40 focus:outline-none focus:border-[#1B42CB] focus:ring-2 focus:ring-[#1B42CB]/20 transition-all duration-300"
                />
              </div>

              {/* View Toggle & Filters */}
              <div className="flex items-center gap-3">
                <div className="flex bg-[#191919]/50 border border-[#1B42CB]/30 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`px-4 py-3 flex items-center gap-2 transition-all duration-300 ${
                      viewMode === "list"
                        ? "bg-linear-to-r from-[#1B42CB] to-[#FF2F6C] text-white"
                        : "text-[#EEECF6]/70 hover:text-[#EEECF6] hover:bg-[#1B42CB]/10"
                    }`}
                  >
                    <List className="w-4 h-4" />
                    List
                  </button>
                  <button
                    onClick={() => setViewMode("map")}
                    className={`px-4 py-3 flex items-center gap-2 transition-all duration-300 ${
                      viewMode === "map"
                        ? "bg-linear-to-r from-[#1B42CB] to-[#FF2F6C] text-white"
                        : "text-[#EEECF6]/70 hover:text-[#EEECF6] hover:bg-[#1B42CB]/10"
                    }`}
                  >
                    <Map className="w-4 h-4" />
                    Map
                  </button>
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-4 bg-[#191919]/50 border border-[#1B42CB]/30 rounded-xl text-[#EEECF6] focus:outline-none focus:border-[#1B42CB] focus:ring-2 focus:ring-[#1B42CB]/20 transition-all duration-300"
                >
                  <option value="">All Status</option>
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-4 bg-[#191919]/50 border border-[#1B42CB]/30 rounded-xl text-[#EEECF6] focus:outline-none focus:border-[#1B42CB] focus:ring-2 focus:ring-[#1B42CB]/20 transition-all duration-300"
                >
                  <option value="">Sort by</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="distance">Distance</option>
                  <option value="rating">Rating</option>
                  <option value="availability">Availability</option>
                </select>
              </div>
            </div>
          </div>

          {/* View Content */}
          {viewMode === "map" ? renderMapView() : renderListView()}

          {/* Graphs Section */}
          {renderGraphsSection()}

          {/* Selected Map Slot Details */}
          {selectedMapSlot && viewMode === "map" && (
            <div className="mt-6 backdrop-blur-xl bg-[#191919]/60 border border-[#1B42CB]/20 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[#EEECF6]">
                    {selectedMapSlot.name}
                  </h3>
                  <p className="text-[#EEECF6]/60">
                    {selectedMapSlot.location}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMapSlot(null)}
                  className="w-8 h-8 rounded-lg bg-[#191919] border border-[#1B42CB]/30 flex items-center justify-center text-[#EEECF6] hover:bg-[#FF2F6C]/10 transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-[#191919]/50 rounded-xl">
                  <div className="text-sm text-[#EEECF6]/60 mb-1">Price</div>
                  <div className="text-2xl font-bold text-[#EEECF6]">
                    ₹{selectedMapSlot.pricePerHour}
                    <span className="text-sm text-[#EEECF6]/60">/hour</span>
                  </div>
                </div>
                <div className="p-4 bg-[#191919]/50 rounded-xl">
                  <div className="text-sm text-[#EEECF6]/60 mb-1">
                    Availability
                  </div>
                  <div className="text-2xl font-bold text-[#EEECF6]">
                    {selectedMapSlot.availableSlots}
                    <span className="text-sm text-[#EEECF6]/60">
                      /{selectedMapSlot.capacity} slots
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-[#191919]/50 rounded-xl">
                  <div className="text-sm text-[#EEECF6]/60 mb-1">Distance</div>
                  <div className="text-2xl font-bold text-[#EEECF6]">
                    {searchedLocation && selectedMapSlot.distance
                      ? formatDistance(selectedMapSlot.distance)
                      : "N/A"}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href={getDirectionsUrl(selectedMapSlot)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-6 py-3 bg-[#191919] border border-[#1B42CB]/30 text-[#EEECF6] font-semibold rounded-xl hover:bg-[#1B42CB]/10 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </a>
                <button
                  onClick={() => handleBookNow(selectedMapSlot)}
                  disabled={
                    selectedMapSlot.status !== "available" ||
                    selectedMapSlot.availableSlots === 0
                  }
                  className="flex-1 px-6 py-3 bg-linear-to-r from-[#1B42CB] to-[#FF2F6C] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#FF2F6C]/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Book Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      <div
        id="booking-modal"
        className="hidden fixed inset-0 bg-black/80 backdrop-blur-sm items-center justify-center z-50 p-4"
      >
        <div className="backdrop-blur-xl bg-[#191919]/90 border border-[#1B42CB]/30 rounded-2xl w-full max-w-md shadow-2xl shadow-[#1B42CB]/10 animate-scale-in">
          {/* Modal Header */}
          <div className="p-6 border-b border-[#1B42CB]/20">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold bg-linear-to-r from-[#EEECF6] to-[#1B42CB] bg-clip-text text-transparent">
                Confirm Booking
              </h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg bg-[#191919] border border-[#1B42CB]/30 flex items-center justify-center text-[#EEECF6] hover:bg-[#FF2F6C]/10 hover:border-[#FF2F6C]/30 transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-6">
            {/* Slot Info */}
            {selectedSlot && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#1B42CB]/10 rounded-xl">
                    <div>
                      <div className="text-sm text-[#EEECF6]/60">
                        Parking Slot
                      </div>
                      <div className="font-bold text-[#EEECF6]">
                        {selectedSlot.name}
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-linear-to-br from-[#1B42CB] to-[#FF2F6C] flex items-center justify-center">
                      <span className="text-xl">🚗</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-[#191919]/50 rounded-lg">
                      <div className="text-sm text-[#EEECF6]/60">Location</div>
                      <div className="font-medium text-[#EEECF6] truncate">
                        {selectedSlot.location}
                      </div>
                    </div>
                    <div className="p-3 bg-[#191919]/50 rounded-lg">
                      <div className="text-sm text-[#EEECF6]/60">
                        Price/Hour
                      </div>
                      <div className="font-medium text-[#EEECF6]">
                        ₹{selectedSlot.pricePerHour}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Duration Selector */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Select Duration
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 6, 8, 12, 24].map((hour) => (
                      <button
                        key={hour}
                        onClick={() => handleDurationChange(hour)}
                        className={`py-2 rounded-lg font-medium transition-all ${
                          duration === hour
                            ? "bg-blue-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        {hour}h
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Summary */}
                <div className="bg-gray-900/50 rounded-xl p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Price per hour</span>
                      <span className="text-white">
                        ₹{selectedSlot.pricePerHour}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Duration</span>
                      <span className="text-white">
                        {duration} hour{duration !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="border-t border-gray-700 pt-3 flex justify-between">
                      <span className="text-lg font-semibold text-white">
                        Total Amount
                      </span>
                      <span className="text-2xl font-bold text-white">
                        ₹{selectedSlot.pricePerHour * duration}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">
                    Payment Method
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg">
                      <input
                        type="radio"
                        id="upi"
                        name="payment"
                        defaultChecked
                        className="w-5 h-5"
                      />
                      <label htmlFor="upi" className="flex-1 text-white">
                        UPI / QR Code
                      </label>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg">
                      <input
                        type="radio"
                        id="card"
                        name="payment"
                        className="w-5 h-5"
                      />
                      <label htmlFor="card" className="flex-1 text-white">
                        Credit/Debit Card
                      </label>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className="flex-1 px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmBooking}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    Pay ₹{paymentAmount}
                    <span>→</span>
                  </button>
                </div>

                {/* Security Note */}
                <div className="text-center pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Secure payment • Instant confirmation</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ParkingSlotPage;
