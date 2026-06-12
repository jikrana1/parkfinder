import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import PredictionPanel from "./PredictionPanel";

interface ParkingSlot {
  _id: string;
  name: string;
  location: string;
  pricePerHour: number;
  status: "available" | "occupied" | "maintenance" | string;
  availableSlots: number;
  capacity: number;
  distance: string;
  rating: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
  emergencyContact?: {
    phone: string;
    supportEmail?: string;
    managerName?: string;
  };
  images?: string[];
  supportedVehicles?: string[];
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: ParkingSlot[];
}

// Mock coordinates for demo
const mockCoordinates = [
  { lat: 28.6139, lng: 77.209 }, // Delhi
  { lat: 28.5355, lng: 77.391 }, // Noida
  { lat: 28.4595, lng: 77.0266 }, // Gurgaon
  { lat: 28.7041, lng: 77.1025 }, // North Delhi
  { lat: 28.4089, lng: 77.3178 }, // Faridabad
  { lat: 28.6692, lng: 77.4535 }, // Ghaziabad
];

// Image Carousel Component
const ImageCarousel: React.FC<{ images: string[]; name: string }> = ({
  images,
  name,
}) => {
  const [current, setCurrent] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-48 bg-gradient-to-br from-[#1B42CB]/20 to-[#FF2F6C]/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
            <Icons.Image className="w-6 h-6 text-white/40" />
          </div>
          <span className="text-white/40 text-sm">No photos available</span>
        </div>
      </div>
    );
  }

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoaded(false);
    setCurrent((c) => (c - 1 + images.length) % images.length);
  };
  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoaded(false);
    setCurrent((c) => (c + 1) % images.length);
  };

  return (
    <div className="relative w-full h-48 overflow-hidden bg-[#111] group">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#111]">
          <div className="w-8 h-8 rounded-full border-2 border-[#1B42CB] border-t-transparent animate-spin" />
        </div>
      )}
      <img
        src={images[current]}
        alt={`${name} photo ${current + 1}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      {/* Navigation arrows � only show if more than 1 image */}
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          >
            <Icons.ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          >
            <Icons.ChevronRight className="w-4 h-4" />
          </button>
          {/* Dot indicators */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setLoaded(false);
                  setCurrent(i);
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${i === current ? "bg-white w-3" : "bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
      {/* Photo count badge */}
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/50 text-white text-xs flex items-center gap-1">
        <Icons.Camera className="w-3 h-3" />
        {current + 1}/{images.length}
      </div>
    </div>
  );
};

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
  const [vehicleFilter, setVehicleFilter] = useState<string>("All");
  const vehicleTypes = ["All", "Car", "Bike", "SUV", "EV"];
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedMapSlot, setSelectedMapSlot] = useState<ParkingSlot | null>(
    null,
  );
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [duration, setDuration] = useState(1);

  // State for tracking favorited location IDs
  const [favorites, setFavorites] = useState<string[]>([]);

  const { token, user } = useAuth();

  // Prediction panel state
  const [predictionSlot, setPredictionSlot] = useState<ParkingSlot | null>(
    null,
  );

  // Detect system theme
  const { theme } = useTheme();

  // Theme-based classes
  const getThemeClasses = () => {
    return theme === "light"
      ? {
          bg: "bg-gray-50",
          text: "text-gray-900",
          textSecondary: "text-gray-600",
          textMuted: "text-gray-500",
          border: "border-gray-200",
          cardBg: "bg-white",
          cardBgSecondary: "bg-gray-100",
          cardBorder: "border-gray-200",
          overlay: "bg-black/5",
          hover: "hover:bg-gray-100",
          gradient: {
            primary: "from-blue-600 to-blue-500",
            secondary: "from-pink-600 to-pink-500",
            accent: "from-blue-600 to-pink-600",
          },
          status: {
            available: "bg-green-100 text-green-700 border-green-200",
            occupied: "bg-red-100 text-red-700 border-red-200",
            maintenance: "bg-yellow-100 text-yellow-700 border-yellow-200",
            default: "bg-gray-100 text-gray-700 border-gray-200",
          },
        }
      : {
          bg: "bg-[#191919]",
          text: "text-[#EEECF6]",
          textSecondary: "text-[#EEECF6]/70",
          textMuted: "text-[#EEECF6]/50",
          border: "border-[#1B42CB]/20",
          cardBg: "bg-[#191919]/60",
          cardBgSecondary: "bg-[#191919]/80",
          cardBorder: "border-[#1B42CB]/20",
          overlay: "bg-black/40",
          hover: "hover:bg-[#1B42CB]/10",
          gradient: {
            primary: "from-[#1B42CB] to-[#1B42CB]/80",
            secondary: "from-[#FF2F6C] to-[#FF2F6C]/80",
            accent: "from-[#1B42CB] to-[#FF2F6C]",
          },
          status: {
            available: "bg-green-500/20 text-green-300 border-green-500/30",
            occupied: "bg-red-500/20 text-red-300 border-red-500/30",
            maintenance:
              "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
            default: "bg-gray-500/20 text-gray-300 border-gray-500/30",
          },
        };
  };

  const themeClasses = getThemeClasses();

  // Function to fetch parking slots
  const fetchParkingSlots = async () => {
    try {
      const response = await fetch(`/api/parking`);
      const result: ApiResponse = await response.json();
      if (result.success) {
        const slotsWithCoordinates = result.data.map((slot, index) => ({
          ...slot,
          coordinates: mockCoordinates[index % mockCoordinates.length] || {
            lat: 28.6139,
            lng: 77.209,
          },
        }));
        setParkingSlots(slotsWithCoordinates);
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

  // Fetch user's favorite locations
  const fetchFavorites = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        // Extract just the IDs so it's easy to check `favorites.includes(id)`
        const favoriteIds = data.data.map((fav: any) => fav._id);
        setFavorites(favoriteIds);
      }
    } catch (err) {
      console.error("Failed to fetch favorites:", err);
    }
  };

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn("Geolocation error:", error);
          setUserLocation({ lat: 28.6139, lng: 77.209 });
        },
      );
    } else {
      setUserLocation({ lat: 28.6139, lng: 77.209 });
    }

    fetchParkingSlots();
  }, []);

  // Fetch favorites separately to ensure it runs when token is available
  useEffect(() => {
    if (token) {
      fetchFavorites();
    }
  }, [token]);

  // Handle Toggle Favorite Button Click
  const handleToggleFavorite = async (
    e: React.MouseEvent,
    locationId: string,
  ) => {
    e.stopPropagation(); // Prevents map markers from triggering if nested

    if (!token || !user) {
      alert("Please login to save favorite locations");
      navigate("/login");
      return;
    }

    try {
      // Optimistically update UI
      setFavorites((prev) =>
        prev.includes(locationId)
          ? prev.filter((id) => id !== locationId)
          : [...prev, locationId],
      );

      const res = await fetch(`/api/favorites/${locationId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (!data.success) {
        // Revert on failure
        fetchFavorites();
        console.error("Failed to toggle favorite:", data.message);
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
      fetchFavorites(); // Revert on failure
    }
  };

  // Calculate distance between two coordinates
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): string => {
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
    const distance = R * c;
    return distance < 1
      ? `${(distance * 1000).toFixed(0)} m`
      : `${distance.toFixed(1)} km`;
  };

  // Get directions URL
  const getDirectionsUrl = (slot: ParkingSlot) => {
    if (!slot.coordinates) return "#";
    return `https://www.google.com/maps/dir/?api=1&destination=${slot.coordinates.lat},${slot.coordinates.lng}`;
  };

  const handleBookNow = (slot: ParkingSlot) => {
    if (!token || !user) {
      alert("Please login to book a parking slot");
      navigate("/login");
      return;
    }

    setSelectedSlot(slot);
    setPaymentAmount(slot.pricePerHour * 1);
    setDuration(1);
    document.getElementById("booking-modal")?.classList.remove("hidden");
    document.getElementById("booking-modal")?.classList.add("flex");
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !token) return;

    try {
      const totalPrice = selectedSlot.pricePerHour * duration;

      const res = await fetch(`/api/bookings/book`, {
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
        alert("Booking successful!");
        closeModal();
        fetchParkingSlots();
        navigate("/bookings");
      } else {
        alert(`❌ ${data.message || "Booking failed"}`);
      }
    } catch (err) {
      console.error("Booking error:", err);
      alert("Failed to book slot. Please try again.");
    }
  };

  const handleDurationChange = (hours: number) => {
    setDuration(hours);
    if (selectedSlot) {
      setPaymentAmount(selectedSlot.pricePerHour * hours);
    }
  };

  const closeModal = () => {
    document.getElementById("booking-modal")?.classList.add("hidden");
    document.getElementById("booking-modal")?.classList.remove("flex");
    setSelectedSlot(null);
  };

  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case "available":
        return themeClasses.status.available;
      case "occupied":
        return themeClasses.status.occupied;
      case "maintenance":
        return themeClasses.status.maintenance;
      default:
        return themeClasses.status.default;
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
    capacity: number,
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

  const filteredAndSortedSlots = React.useMemo(() => {
    let filtered = [...parkingSlots];

    if (searchTerm) {
      filtered = filtered.filter(
        (slot) =>
          slot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          slot.location.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(
        (slot) => slot.status.toLowerCase() === statusFilter.toLowerCase(),
      );
    }

    // NEW: Add the Vehicle Type Filter logic
    if (vehicleFilter && vehicleFilter !== "All") {
      filtered = filtered.filter((slot) => {
        // Fallback: If supportedVehicles isn't in DB yet, assume it supports cars/bikes
        if (!slot.supportedVehicles || slot.supportedVehicles.length === 0) {
          return vehicleFilter !== "EV";
        }
        return slot.supportedVehicles.includes(vehicleFilter);
      });
    }

    if (sortBy) {
      switch (sortBy) {
        case "price":
          filtered.sort((a, b) => a.pricePerHour - b.pricePerHour);
          break;
        case "distance":
          if (userLocation) {
            filtered.sort((a, b) => {
              if (!a.coordinates || !b.coordinates) return 0;
              const distA = Math.sqrt(
                Math.pow(a.coordinates.lat - userLocation.lat, 2) +
                  Math.pow(a.coordinates.lng - userLocation.lng, 2),
              );
              const distB = Math.sqrt(
                Math.pow(b.coordinates.lat - userLocation.lat, 2) +
                  Math.pow(b.coordinates.lng - userLocation.lng, 2),
              );
              return distA - distB;
            });
          }
          break;
        case "rating":
          filtered.sort((a, b) => b.rating - a.rating);
          break;
      }
    }

    return filtered;
  }, [
    parkingSlots,
    searchTerm,
    statusFilter,
    sortBy,
    userLocation,
    vehicleFilter,
  ]);

  // Render Map View
  const renderMapView = () => {
    if (!userLocation) {
      return (
        <div
          className={`backdrop-blur-xl ${themeClasses.cardBg} ${themeClasses.cardBorder} border rounded-2xl p-12 text-center`}
        >
          <div
            className={`w-24 h-24 bg-gradient-to-br ${themeClasses.gradient.accent}/20 rounded-full flex items-center justify-center mx-auto mb-6 border ${themeClasses.border}`}
          >
            <Icons.MapPin className={`w-12 h-12 ${themeClasses.text}`} />
          </div>
          <h3 className={`text-2xl font-bold ${themeClasses.text} mb-3`}>
            Loading Map...
          </h3>
          <p className={`${themeClasses.textSecondary} mb-6`}>
            Fetching your location to show nearby parking slots
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Map Container */}
        <div
          className={`backdrop-blur-xl ${themeClasses.cardBg} ${themeClasses.cardBorder} border rounded-2xl overflow-hidden shadow-xl`}
        >
          <div className="h-[500px] relative">
            <div
              className="absolute inset-0 bg-gradient-to-br from-[#1B42CB]/20 to-[#FF2F6C]/20"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 20% 30%, #1B42CB 2px, transparent 2px),
                  radial-gradient(circle at 50% 50%, #FF2F6C 3px, transparent 3px),
                  radial-gradient(circle at 80% 70%, #1B42CB 2px, transparent 2px)
                `,
                backgroundSize: "100px 100px",
              }}
            >
              <div
                className="absolute w-8 h-8 transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: "50%", top: "50%" }}
              >
                <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 border-2 border-white shadow-lg animate-pulse"></div>
                <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-30"></div>
              </div>

              {filteredAndSortedSlots.map((slot, index) => {
                if (!slot.coordinates) return null;
                const latDiff = slot.coordinates.lat - userLocation.lat;
                const lngDiff = slot.coordinates.lng - userLocation.lng;
                const left = 50 + lngDiff * 100;
                const top = 50 - latDiff * 100;

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
                          ? "bg-gradient-to-br from-green-500 to-emerald-400"
                          : slot.status === "occupied"
                            ? "bg-gradient-to-br from-red-500 to-pink-400"
                            : "bg-gradient-to-br from-yellow-500 to-orange-400"
                      }
                      border-2 border-white shadow-lg
                    `}
                    >
                      <span className="text-white text-xs font-bold">
                        P{index + 1}
                      </span>
                    </div>
                    {selectedMapSlot?._id === slot._id && (
                      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
                        <div
                          className={`${themeClasses.cardBgSecondary} ${themeClasses.cardBorder} border rounded-xl p-3 shadow-xl min-w-[200px]`}
                        >
                          <div
                            className={`font-bold ${themeClasses.text} text-sm mb-1`}
                          >
                            {slot.name}
                          </div>
                          <div
                            className={`text-xs ${themeClasses.textSecondary} mb-2`}
                          >
                            {slot.location}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={`${themeClasses.text} font-bold`}>
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

              {/* Map Legend */}
              <div
                className={`absolute bottom-4 right-4 backdrop-blur-xl ${themeClasses.cardBgSecondary} ${themeClasses.cardBorder} border rounded-xl p-4`}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-green-500 to-emerald-400"></div>
                    <span className={`text-xs ${themeClasses.text}`}>
                      Available
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-500 to-pink-400"></div>
                    <span className={`text-xs ${themeClasses.text}`}>
                      Occupied
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-500 to-orange-400"></div>
                    <span className={`text-xs ${themeClasses.text}`}>
                      Maintenance
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400"></div>
                    <span className={`text-xs ${themeClasses.text}`}>
                      Your Location
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {selectedMapSlot && (
          <div
            className={`backdrop-blur-xl ${themeClasses.cardBg} ${themeClasses.cardBorder} border rounded-2xl p-6 shadow-xl`}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className={`text-xl font-bold ${themeClasses.text}`}>
                  {selectedMapSlot.name}
                </h3>
                <p className={themeClasses.textSecondary}>
                  {selectedMapSlot.location}
                </p>
              </div>
              <button
                onClick={() => setSelectedMapSlot(null)}
                className={`w-8 h-8 rounded-lg ${themeClasses.cardBgSecondary} border ${themeClasses.border} flex items-center justify-center ${themeClasses.text} ${themeClasses.hover} transition-colors`}
              >
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className={`p-4 ${themeClasses.cardBgSecondary} rounded-xl`}>
                <div className={`text-sm ${themeClasses.textSecondary} mb-1`}>
                  Price
                </div>
                <div className={`text-2xl font-bold ${themeClasses.text}`}>
                  ₹{selectedMapSlot.pricePerHour}
                  <span className={`text-sm ${themeClasses.textSecondary}`}>
                    /hour
                  </span>
                </div>
              </div>
              <div className={`p-4 ${themeClasses.cardBgSecondary} rounded-xl`}>
                <div className={`text-sm ${themeClasses.textSecondary} mb-1`}>
                  Availability
                </div>
                <div className={`text-2xl font-bold ${themeClasses.text}`}>
                  {selectedMapSlot.availableSlots}
                  <span className={`text-sm ${themeClasses.textSecondary}`}>
                    /{selectedMapSlot.capacity} slots
                  </span>
                </div>
              </div>
              <div className={`p-4 ${themeClasses.cardBgSecondary} rounded-xl`}>
                <div className={`text-sm ${themeClasses.textSecondary} mb-1`}>
                  Distance
                </div>
                <div className={`text-2xl font-bold ${themeClasses.text}`}>
                  {userLocation && selectedMapSlot.coordinates
                    ? calculateDistance(
                        userLocation.lat,
                        userLocation.lng,
                        selectedMapSlot.coordinates.lat,
                        selectedMapSlot.coordinates.lng,
                      )
                    : selectedMapSlot.distance}
                </div>
              </div>
            </div>

            {/* --- NEW EMERGENCY BLOCK FOR MAP VIEW --- */}
            {selectedMapSlot.emergencyContact?.phone && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Icons.AlertTriangle className="w-5 h-5 text-red-500" />
                  <span className={`font-semibold ${themeClasses.text}`}>
                    Emergency Assistance
                  </span>
                </div>
                <div className="flex gap-3">
                  <a
                    href={`tel:${selectedMapSlot.emergencyContact.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-medium"
                  >
                    <Icons.PhoneCall className="w-4 h-4" />
                    Call Support
                  </a>
                  {selectedMapSlot.emergencyContact.supportEmail && (
                    <a
                      href={`mailto:${selectedMapSlot.emergencyContact.supportEmail}`}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 ${themeClasses.cardBgSecondary} border ${themeClasses.border} ${themeClasses.text} rounded-xl ${themeClasses.hover} transition-colors font-medium`}
                    >
                      <Icons.Mail className="w-4 h-4" />
                      Email Support
                    </a>
                  )}
                </div>
              </div>
            )}
            {/* -------------------------------------- */}

            <div className="flex gap-3">
              <a
                href={getDirectionsUrl(selectedMapSlot)}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 px-6 py-3 ${themeClasses.cardBgSecondary} border ${themeClasses.border} ${themeClasses.text} font-semibold rounded-xl ${themeClasses.hover} transition-all duration-300 flex items-center justify-center gap-2`}
              >
                <Icons.Navigation className="w-4 h-4" />
                Get Directions
              </a>
              <button
                onClick={() => setPredictionSlot(selectedMapSlot)}
                className={`px-4 py-3 ${themeClasses.cardBgSecondary} border ${themeClasses.border} ${themeClasses.textSecondary} font-semibold rounded-xl ${themeClasses.hover} transition-all duration-300 flex items-center justify-center gap-2`}
              >
                <Icons.TrendingUp className="w-4 h-4" />
                Forecast
              </button>
              <button
                onClick={() => handleBookNow(selectedMapSlot)}
                disabled={
                  selectedMapSlot.status !== "available" ||
                  selectedMapSlot.availableSlots === 0
                }
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#1B42CB] to-[#FF2F6C] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#FF2F6C]/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Icons.MapPin className="w-4 h-4" />
                Book Now
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render List View
  const renderListView = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedSlots.map((slot) => {
          const availabilityPercentage = getAvailabilityPercentage(
            slot.availableSlots,
            slot.capacity,
          );
          const availabilityText = getAvailabilityText(availabilityPercentage);
          const availabilityColor = getAvailabilityColor(
            availabilityPercentage,
          );

          return (
            <div
              key={slot._id}
              className={`group backdrop-blur-xl ${themeClasses.cardBg} ${themeClasses.cardBorder} border rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-[#1B42CB]/10 hover:border-[#1B42CB]/40 transition-all duration-500 transform hover:-translate-y-1`}
            >
              {/* Status Header */}
              <div
                className={`px-6 py-4 ${getStatusColor(slot.status)} border-b ${themeClasses.border}`}
              >
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

              <ImageCarousel images={slot.images ?? []} name={slot.name} />
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3
                      className={`text-xl font-bold ${themeClasses.text} mb-1`}
                    >
                      {slot.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <div
                        className={`text-lg font-bold ${getRatingColor(
                          slot.rating,
                        )}`}
                      >
                        {slot?.rating ? slot.rating.toFixed(1) : "0.0"}
                      </div>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Icons.Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(slot.rating)
                                ? "text-[#FF2F6C] fill-current"
                                : themeClasses.textMuted
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-2xl font-bold bg-gradient-to-r ${themeClasses.gradient.accent} bg-clip-text text-transparent`}
                    >
                      ₹{Number(slot.pricePerHour || 0).toFixed(2)}
                    </div>
                    <div className={`text-sm ${themeClasses.textSecondary}`}>
                      per hour
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="mb-6 p-4 bg-[#1B42CB]/10 rounded-xl border border-[#1B42CB]/20">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${themeClasses.gradient.primary} flex items-center justify-center`}
                    >
                      <Icons.MapPin className="w-4 h-4 text-white" />
                    </div>
                    <span
                      className={`${themeClasses.text} font-medium truncate`}
                    >
                      {slot.location}
                    </span>
                  </div>
                </div>

                {/* NEW: Supported Vehicles Badges */}
                {slot.supportedVehicles &&
                  slot.supportedVehicles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {slot.supportedVehicles.map((v) => (
                        <span
                          key={v}
                          className={`text-xs px-3 py-1 rounded-full ${themeClasses.cardBgSecondary} border ${themeClasses.border} ${themeClasses.text} font-medium flex items-center gap-1`}
                        >
                          {v === "Car" && <Icons.Car className="w-3 h-3" />}
                          {v === "Bike" && <Icons.Bike className="w-3 h-3" />}
                          {v === "EV" && (
                            <Icons.Zap className="w-3 h-3 text-yellow-500" />
                          )}
                          {v}
                        </span>
                      ))}
                    </div>
                  )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div
                    className={`${themeClasses.cardBgSecondary} border ${themeClasses.border} rounded-xl p-3 text-center`}
                  >
                    <div
                      className={`text-sm ${themeClasses.textSecondary} mb-1`}
                    >
                      Distance
                    </div>
                    <div className={`text-lg font-bold ${themeClasses.text}`}>
                      {userLocation && slot.coordinates
                        ? calculateDistance(
                            userLocation.lat,
                            userLocation.lng,
                            slot.coordinates.lat,
                            slot.coordinates.lng,
                          )
                        : slot.distance}
                    </div>
                  </div>
                  <div
                    className={`${themeClasses.cardBgSecondary} border ${themeClasses.border} rounded-xl p-3 text-center`}
                  >
                    <div
                      className={`text-sm ${themeClasses.textSecondary} mb-1`}
                    >
                      Available
                    </div>
                    <div className={`text-lg font-bold ${themeClasses.text}`}>
                      {slot.availableSlots}
                      <span
                        className={`text-sm ${themeClasses.textSecondary} ml-1`}
                      >
                        /{slot.capacity}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`${themeClasses.cardBgSecondary} border ${themeClasses.border} rounded-xl p-3 text-center`}
                  >
                    <div
                      className={`text-sm ${themeClasses.textSecondary} mb-1`}
                    >
                      Fill %
                    </div>
                    <div className={`text-lg font-bold ${availabilityColor}`}>
                      {availabilityPercentage}%
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className={themeClasses.textSecondary}>
                      Capacity Usage
                    </span>
                    <span className={`font-semibold ${themeClasses.text}`}>
                      {availabilityPercentage}% available
                    </span>
                  </div>
                  <div className="h-2 bg-[#191919] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#1B42CB] via-[#FF2F6C] to-[#1B42CB]"
                      style={{ width: `${availabilityPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* --- NEW EMERGENCY BLOCK FOR LIST VIEW --- */}
                {slot.emergencyContact?.phone && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <Icons.AlertTriangle className="w-4 h-4 text-red-500" />
                      <span
                        className={`text-sm font-semibold ${themeClasses.text}`}
                      >
                        Emergency Assistance
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`tel:${slot.emergencyContact.phone}`}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        <Icons.PhoneCall className="w-4 h-4" />
                        Call
                      </a>
                      {slot.emergencyContact.supportEmail && (
                        <a
                          href={`mailto:${slot.emergencyContact.supportEmail}`}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 ${themeClasses.cardBgSecondary} border ${themeClasses.border} ${themeClasses.text} rounded-lg ${themeClasses.hover} transition-colors text-sm font-medium`}
                        >
                          <Icons.Mail className="w-4 h-4" />
                          Email
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {/* --------------------------------------- */}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {/* Availability Forecast button */}
                  <button
                    onClick={() => setPredictionSlot(slot)}
                    title="View availability forecast"
                    className={`px-3 py-3 rounded-lg border ${themeClasses.cardBgSecondary} ${themeClasses.border} ${themeClasses.textSecondary} ${themeClasses.hover} transition-colors flex items-center justify-center gap-1.5 text-sm`}
                  >
                    <Icons.TrendingUp className="w-4 h-4" />
                    Forecast
                  </button>
                  <a
                    href={getDirectionsUrl(slot)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 px-4 py-3 ${themeClasses.cardBgSecondary} border ${themeClasses.border} ${themeClasses.text} rounded-lg ${themeClasses.hover} transition-colors flex items-center justify-center gap-2`}
                  >
                    <Icons.Navigation className="w-4 h-4" />
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
                        ? "bg-gradient-to-r from-[#1B42CB] to-[#FF2F6C] text-white hover:shadow-lg hover:shadow-[#FF2F6C]/20"
                        : `${themeClasses.cardBgSecondary} ${themeClasses.textSecondary} border ${themeClasses.border} cursor-not-allowed`
                    }`}
                  >
                    <Icons.MapPin className="w-4 h-4" />
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

  if (loading) {
    return (
      <div
        className={`min-h-screen ${themeClasses.bg} transition-colors duration-300 flex items-center justify-center p-4`}
      >
        <div className="text-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#1B42CB] to-[#FF2F6C] animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className={`w-20 h-20 rounded-full ${themeClasses.bg}`}
              ></div>
            </div>
          </div>
          <p className={`mt-6 ${themeClasses.text} text-lg font-semibold`}>
            Loading parking slots...
          </p>
          <p className={themeClasses.textSecondary}>
            Fetching latest availability
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`min-h-screen ${themeClasses.bg} transition-colors duration-300 flex items-center justify-center p-4`}
      >
        <div
          className={`backdrop-blur-xl ${themeClasses.cardBg} ${themeClasses.cardBorder} border rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-[#1B42CB]/10`}
        >
          <div className="text-center">
            <div
              className={`w-20 h-20 bg-gradient-to-br ${themeClasses.gradient.accent}/20 rounded-full flex items-center justify-center mx-auto mb-6 border ${themeClasses.border}`}
            >
              <Icons.AlertCircle className="w-8 h-8 text-[#FF2F6C]" />
            </div>
            <h2 className={`text-2xl font-bold ${themeClasses.text} mb-3`}>
              Connection Error
            </h2>
            <p className={`${themeClasses.textSecondary} mb-6`}>{error}</p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#1B42CB] to-[#1B42CB]/80 text-white font-semibold rounded-xl hover:from-[#1B42CB]/90 hover:to-[#1B42CB]/70 transition-all duration-300 hover:shadow-lg hover:shadow-[#1B42CB]/20"
              >
                Retry
              </button>
              <button
                onClick={() => navigate(-1)}
                className={`px-6 py-3 ${themeClasses.cardBgSecondary} border ${themeClasses.border} ${themeClasses.text} font-semibold rounded-xl ${themeClasses.hover} transition-all duration-300`}
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
      <div
        className={`min-h-screen ${themeClasses.bg} transition-colors duration-300 p-4 md:p-6`}
      >
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#1B42CB]/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#FF2F6C]/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#1B42CB]/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <header className="mb-8 md:mb-12">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div
                className={`backdrop-blur-xl ${themeClasses.cardBg} ${themeClasses.cardBorder} border rounded-2xl p-6 md:p-8 shadow-2xl shadow-[#1B42CB]/10`}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${themeClasses.gradient.accent} flex items-center justify-center`}
                  >
                    <Icons.Car className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1
                      className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${themeClasses.gradient.accent} bg-clip-text text-transparent`}
                    >
                      SmartPark
                    </h1>
                    <p className={themeClasses.textSecondary}>
                      Parking Solutions
                    </p>
                  </div>
                </div>
                <p className={`${themeClasses.textSecondary} max-w-2xl`}>
                  Find, book, and manage parking slots with real-time
                  availability and smart recommendations.
                </p>
              </div>

              <div
                className={`backdrop-blur-xl ${themeClasses.cardBgSecondary} border ${themeClasses.border} rounded-2xl p-6 shadow-xl`}
              >
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div
                      className={`text-3xl font-bold ${themeClasses.text} mb-1`}
                    >
                      {parkingSlots.reduce(
                        (sum, slot) => sum + slot.availableSlots,
                        0,
                      )}
                    </div>
                    <div className={`text-sm ${themeClasses.textSecondary}`}>
                      Available Slots
                    </div>
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-3xl font-bold ${themeClasses.text} mb-1`}
                    >
                      {parkingSlots.length}
                    </div>
                    <div className={`text-sm ${themeClasses.textSecondary}`}>
                      Locations
                    </div>
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-3xl font-bold ${themeClasses.text} mb-1`}
                    >
                      ₹{Math.min(...parkingSlots.map((s) => s.pricePerHour))}
                    </div>
                    <div className={`text-sm ${themeClasses.textSecondary}`}>
                      Starting Price
                    </div>
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-3xl font-bold ${themeClasses.text} mb-1`}
                    >
                      {parkingSlots.reduce(
                        (sum, slot) => sum + slot.capacity,
                        0,
                      )}
                    </div>
                    <div className={`text-sm ${themeClasses.textSecondary}`}>
                      Total Capacity
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Filter/Search Section with View Toggle */}
          <div
            className={`mb-8 backdrop-blur-xl ${themeClasses.cardBg} ${themeClasses.cardBorder} border rounded-2xl p-6 shadow-xl`}
          >
            {/* NEW: Vehicle Type Pills */}
            <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              {vehicleTypes.map((type) => {
                const isActive = vehicleFilter === type;
                return (
                  <button
                    key={type}
                    onClick={() => setVehicleFilter(type)}
                    className={`px-5 py-2 rounded-full font-medium transition-all duration-300 whitespace-nowrap border text-sm flex items-center gap-2 ${
                      isActive
                        ? "bg-gradient-to-r from-[#1B42CB] to-[#FF2F6C] text-white border-transparent shadow-lg shadow-[#1B42CB]/20"
                        : `${themeClasses.cardBgSecondary} ${themeClasses.textSecondary} ${themeClasses.border} ${themeClasses.hover}`
                    }`}
                  >
                    {type === "Car" && <Icons.Car className="w-4 h-4" />}
                    {type === "Bike" && <Icons.Bike className="w-4 h-4" />}
                    {type === "EV" && <Icons.Zap className="w-4 h-4" />}
                    {type}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <Icons.Search className="w-5 h-5 text-[#1B42CB]" />
                </div>
                <input
                  type="text"
                  placeholder="Search location or parking name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-12 pr-4 py-4 ${themeClasses.cardBgSecondary} border ${themeClasses.border} rounded-xl ${themeClasses.text} placeholder-${themeClasses.textMuted} focus:outline-none focus:border-[#1B42CB] focus:ring-2 focus:ring-[#1B42CB]/20 transition-all duration-300`}
                />
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`flex ${themeClasses.cardBgSecondary} border ${themeClasses.border} rounded-xl overflow-hidden`}
                >
                  <button
                    onClick={() => setViewMode("list")}
                    className={`px-4 py-3 flex items-center gap-2 transition-all duration-300 ${
                      viewMode === "list"
                        ? "bg-gradient-to-r from-[#1B42CB] to-[#FF2F6C] text-white"
                        : `${themeClasses.textSecondary} ${themeClasses.hover}`
                    }`}
                  >
                    <Icons.List className="w-4 h-4" />
                    List
                  </button>
                  <button
                    onClick={() => setViewMode("map")}
                    className={`px-4 py-3 flex items-center gap-2 transition-all duration-300 ${
                      viewMode === "map"
                        ? "bg-gradient-to-r from-[#1B42CB] to-[#FF2F6C] text-white"
                        : `${themeClasses.textSecondary} ${themeClasses.hover}`
                    }`}
                  >
                    <Icons.Map className="w-4 h-4" />
                    Map
                  </button>
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`px-4 py-4 ${themeClasses.cardBgSecondary} border ${themeClasses.border} rounded-xl ${themeClasses.text} focus:outline-none focus:border-[#1B42CB] focus:ring-2 focus:ring-[#1B42CB]/20 transition-all duration-300`}
                >
                  <option value="">All Status</option>
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`px-4 py-4 ${themeClasses.cardBgSecondary} border ${themeClasses.border} rounded-xl ${themeClasses.text} focus:outline-none focus:border-[#1B42CB] focus:ring-2 focus:ring-[#1B42CB]/20 transition-all duration-300`}
                >
                  <option value="">Sort by</option>
                  <option value="price">Price: Low to High</option>
                  <option value="distance">Distance</option>
                  <option value="rating">Rating</option>
                </select>
              </div>
            </div>
          </div>

          {filteredAndSortedSlots.length === 0 ? (
            <div
              className={`backdrop-blur-xl ${themeClasses.cardBg} ${themeClasses.cardBorder} border rounded-2xl p-12 text-center`}
            >
              <div
                className={`w-24 h-24 bg-gradient-to-br ${themeClasses.gradient.accent}/20 rounded-full flex items-center justify-center mx-auto mb-6 border ${themeClasses.border}`}
              >
                <Icons.Car className="w-8 h-8 text-[#1B42CB]" />
              </div>
              <h3 className={`text-2xl font-bold ${themeClasses.text} mb-3`}>
                No Parking Slots Found
              </h3>
              <p className={`${themeClasses.textSecondary} mb-6`}>
                {searchTerm || statusFilter
                  ? "Try adjusting your filters"
                  : "Check back later for available spots"}
              </p>
              {(searchTerm || statusFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("");
                    setSortBy("");
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-[#1B42CB] to-[#1B42CB]/80 text-white font-semibold rounded-xl hover:from-[#1B42CB]/90 hover:to-[#1B42CB]/70 transition-all duration-300"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : viewMode === "map" ? (
            renderMapView()
          ) : (
            renderListView()
          )}

          {parkingSlots.length > 0 && (
            <div
              className={`mt-8 backdrop-blur-xl bg-gradient-to-r ${themeClasses.gradient.accent}/10 border ${themeClasses.border} rounded-2xl p-8`}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div
                    className={`text-3xl font-bold ${themeClasses.text} mb-2`}
                  >
                    {
                      filteredAndSortedSlots.filter(
                        (s) => s.status === "available",
                      ).length
                    }
                  </div>
                  <div className={themeClasses.textSecondary}>
                    Available Now
                  </div>
                </div>
                <div className="text-center">
                  <div
                    className={`text-3xl font-bold ${themeClasses.text} mb-2`}
                  >
                    {Math.round(
                      (filteredAndSortedSlots.reduce(
                        (sum, s) => sum + s.availableSlots / s.capacity,
                        0,
                      ) /
                        filteredAndSortedSlots.length) *
                        100,
                    )}
                    %
                  </div>
                  <div className={themeClasses.textSecondary}>
                    Average Availability
                  </div>
                </div>
                <div className="text-center">
                  <div
                    className={`text-3xl font-bold ${themeClasses.text} mb-2`}
                  >
                    ₹
                    {Math.round(
                      filteredAndSortedSlots.reduce(
                        (sum, s) => sum + s.pricePerHour,
                        0,
                      ) / filteredAndSortedSlots.length,
                    )}
                  </div>
                  <div className={themeClasses.textSecondary}>
                    Avg. Price/Hour
                  </div>
                </div>
                <div className="text-center">
                  <div
                    className={`text-3xl font-bold ${themeClasses.text} mb-2`}
                  >
                    {filteredAndSortedSlots.length}
                  </div>
                  <div className={themeClasses.textSecondary}>
                    Showing Slots
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Prediction Panel Modal */}
      {predictionSlot && (
        <PredictionPanel
          parkingId={predictionSlot._id}
          parkingName={predictionSlot.name}
          onClose={() => setPredictionSlot(null)}
        />
      )}

      {/* Booking Modal */}
      <div
        id="booking-modal"
        className="hidden fixed inset-0 bg-black/80 backdrop-blur-sm items-center justify-center z-50 p-4"
      >
        <div
          className={`backdrop-blur-xl ${themeClasses.cardBgSecondary} ${themeClasses.cardBorder} border rounded-2xl w-full max-w-md shadow-2xl shadow-[#1B42CB]/10 animate-scale-in`}
        >
          {/* Modal Header */}
          <div className={`p-6 border-b ${themeClasses.border}`}>
            <div className="flex items-center justify-between">
              <h2
                className={`text-2xl font-bold bg-gradient-to-r ${themeClasses.gradient.accent} bg-clip-text text-transparent`}
              >
                Confirm Booking
              </h2>
              <button
                onClick={closeModal}
                className={`w-8 h-8 rounded-lg ${themeClasses.cardBg} border ${themeClasses.border} flex items-center justify-center ${themeClasses.text} ${themeClasses.hover} transition-colors`}
              >
                <Icons.X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {selectedSlot && (
              <>
                <div className="space-y-4">
                  <div
                    className={`flex items-center justify-between p-4 bg-[#1B42CB]/10 rounded-xl`}
                  >
                    <div>
                      <div className={`text-sm ${themeClasses.textSecondary}`}>
                        Parking Slot
                      </div>
                      <div className={`font-bold ${themeClasses.text}`}>
                        {selectedSlot.name}
                      </div>
                    </div>
                    <div
                      className={`w-12 h-12 rounded-lg bg-gradient-to-br ${themeClasses.gradient.accent} flex items-center justify-center`}
                    >
                      <Icons.Car className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-3 ${themeClasses.cardBg} rounded-lg`}>
                      <div className={`text-sm ${themeClasses.textSecondary}`}>
                        Location
                      </div>
                      <div
                        className={`font-medium ${themeClasses.text} truncate`}
                      >
                        {selectedSlot.location}
                      </div>
                    </div>
                    <div className={`p-3 ${themeClasses.cardBg} rounded-lg`}>
                      <div className={`text-sm ${themeClasses.textSecondary}`}>
                        Price/Hour
                      </div>
                      <div className={`font-medium ${themeClasses.text}`}>
                        ₹{selectedSlot.pricePerHour}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3
                    className={`text-lg font-semibold ${themeClasses.text} mb-3`}
                  >
                    Select Duration
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 6, 8, 12, 24].map((hour) => (
                      <button
                        key={hour}
                        onClick={() => handleDurationChange(hour)}
                        className={`py-2 rounded-lg font-medium transition-all ${
                          duration === hour
                            ? "bg-gradient-to-r from-[#1B42CB] to-[#FF2F6C] text-white"
                            : `${themeClasses.cardBg} ${themeClasses.text} ${themeClasses.hover}`
                        }`}
                      >
                        {hour}h
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`${themeClasses.cardBg} rounded-xl p-4`}>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className={themeClasses.textSecondary}>
                        Price per hour
                      </span>
                      <span className={themeClasses.text}>
                        ₹{selectedSlot.pricePerHour}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={themeClasses.textSecondary}>
                        Duration
                      </span>
                      <span className={themeClasses.text}>
                        {duration} hour{duration !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div
                      className={`border-t ${themeClasses.border} pt-3 flex justify-between`}
                    >
                      <span
                        className={`text-lg font-semibold ${themeClasses.text}`}
                      >
                        Total Amount
                      </span>
                      <span
                        className={`text-2xl font-bold ${themeClasses.text}`}
                      >
                        ₹{selectedSlot.pricePerHour * duration}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className={`text-lg font-semibold ${themeClasses.text}`}>
                    Payment Method
                  </h3>
                  <div className="space-y-2">
                    <div
                      className={`flex items-center gap-3 p-3 ${themeClasses.cardBg} rounded-lg`}
                    >
                      <input
                        type="radio"
                        id="upi"
                        name="payment"
                        defaultChecked
                        className="w-5 h-5"
                      />
                      <label
                        htmlFor="upi"
                        className={`flex-1 ${themeClasses.text}`}
                      >
                        UPI / QR Code
                      </label>
                    </div>
                    <div
                      className={`flex items-center gap-3 p-3 ${themeClasses.cardBg} rounded-lg`}
                    >
                      <input
                        type="radio"
                        id="card"
                        name="payment"
                        className="w-5 h-5"
                      />
                      <label
                        htmlFor="card"
                        className={`flex-1 ${themeClasses.text}`}
                      >
                        Credit/Debit Card
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className={`flex-1 px-6 py-3 ${themeClasses.cardBg} ${themeClasses.text} font-semibold rounded-lg ${themeClasses.hover}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmBooking}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#1B42CB] to-[#FF2F6C] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#FF2F6C]/20 flex items-center justify-center gap-2"
                  >
                    Pay ₹{paymentAmount}
                    <Icons.ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Security Note */}
                <div
                  className={`text-center pt-4 border-t ${themeClasses.border}`}
                >
                  <div
                    className={`flex items-center justify-center gap-2 text-sm ${themeClasses.textSecondary}`}
                  >
                    <Icons.Lock className="w-4 h-4" />
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
