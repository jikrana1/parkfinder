import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import PredictionPanel from "./PredictionPanel";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import { useRouteNavigation } from "../hooks/useRouteNavigation";
import { getUserLocation } from "../utils/geolocation";
import { THEME_CONFIG } from "../config/ThemeConfig";

// Fix for default Leaflet icons
delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom parking icon
const createParkingIcon = (status: string) => {
  const statusLower = (status || "unknown").toLowerCase();
  return new L.Icon({
    iconUrl:
      statusLower === "available"
        ? "https://cdn-icons-png.flaticon.com/512/3178/3178283.png" // Green parking icon
        : "https://cdn-icons-png.flaticon.com/512/3178/3178295.png", // Red parking icon
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    className: "parking-marker",
  });
};

// User location icon
const userIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

interface FitBoundsProps {
  coords: [number, number][];
}

const FitBounds: React.FC<FitBoundsProps> = ({ coords }: FitBoundsProps) => {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 1) {
      map.fitBounds(coords, { padding: [50, 50] });
    }
  }, [coords, map]);
  return null;
};

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
  /** Whether this parking location has an EV charging station */
  isEVChargingStation: boolean;
  /** Type of EV charger available at this location */
  chargerType: "Type 1" | "Type 2" | "CCS" | "CHAdeMO" | "None";
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

/** Matches the response shape from GET /api/admin/slots */
interface ApiResponse {
  success: boolean;
  count: number;
  message?: string;
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
}: {
  images: string[];
  name: string;
}) => {
  const [current, setCurrent] = React.useState<number>(0);
  const [loaded, setLoaded] = React.useState<boolean>(false);

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
    setCurrent((c: number) => (c - 1 + images.length) % images.length);
  };
  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoaded(false);
    setCurrent((c: number) => (c + 1) % images.length);
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
            {images.map((_: string, i: number) => (
              <button
                key={i}
                onClick={(e: React.MouseEvent) => {
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
  /** When true, only EV-charging-enabled slots are fetched from the API */
  const [evFilter, setEvFilter] = useState<boolean>(false);
  const vehicleTypes = ["All", "Car", "Bike", "EV"];
  const [vehicleFilter, setVehicleFilter] = useState<string>("All");
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

  const [vehicleFilter, setVehicleFilter] = useState<string>("All");
  const vehicleTypes = ["All", "Car", "Bike", "SUV", "EV"];

  // Navigation & routing hook usage
  const {
    routeCoords,
    loading: routingLoading,
    error: routingError,
    calculateRoute,
    clearRoute,
  } = useRouteNavigation();
  const [geoError, setGeoError] = useState<string | null>(null);

  const handleNavigate = (slot: ParkingSlot) => {
    if (
      !slot.coordinates ||
      typeof slot.coordinates.lat !== "number" ||
      typeof slot.coordinates.lng !== "number"
    ) {
      alert("Error: Parking slot coordinates are missing or invalid.");
      return;
    }

    const destLat = slot.coordinates.lat;
    const destLng = slot.coordinates.lng;

    setGeoError(null);

    getUserLocation()
      .then((loc) => {
        setUserLocation(loc);
        calculateRoute(loc.lat, loc.lng, destLat, destLng).then((res) => {
          if (res) {
            setViewMode("map");
            setSelectedMapSlot(slot);
          }
        });
      })
      .catch((err) => {
        console.warn("Geolocation failed for route:", err);
        setGeoError(err.message);
        alert(`❌ Location Error: ${err.message}`);
      });
  };

  const handleClearRoute = () => {
    clearRoute();
    setGeoError(null);
  };

  const { token, user } = useAuth();

  // Prediction panel state
  const [predictionSlot, setPredictionSlot] = useState<ParkingSlot | null>(
    null,
  );

  // Detect system theme
  const { theme } = useTheme();

  // Use the pre-computed static map to prevent unnecessary re-allocations during render
  const themeClasses =
    THEME_CONFIG[theme as keyof typeof THEME_CONFIG] || THEME_CONFIG.light;

  /**
   * Fetches parking slots from GET /api/admin/slots.
   * Passes `isEV=true` as a query param when the EV filter is active,
   * which the backend's getParkingSlots controller handles natively.
   */
  const fetchParkingSlots = async (isEV: boolean = false) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (isEV) params.set("isEV", "true");

      const response = await fetch(`/api/admin/slots?${params.toString()}`);
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
        setError(result.message ?? "Failed to load slots");
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
    getUserLocation()
      .then((loc) => {
        setUserLocation(loc);
      })
      .catch((error) => {
        console.warn(
          "Initial user location fetch failed, using fallback Delhi coordinates:",
          error,
        );
        setUserLocation({ lat: 28.6139, lng: 77.209 });
      });

    fetchParkingSlots(false);
  }, []);

  // Re-fetch whenever the EV filter toggle changes
  useEffect(() => {
    fetchParkingSlots(evFilter);
  }, [evFilter]);

  // Fetch favorites separately to ensure it runs when token is available
  useEffect(() => {
    if (token) {
      fetchFavorites();
    }
  }, [token]);

  // Handle Toggle Favorite Button Click
  // const handleToggleFavorite = async (
  //   e: React.MouseEvent,
  //   locationId: string,
  // ) => {
  //   e.stopPropagation(); // Prevents map markers from triggering if nested
  //
  //   if (!token || !user) {
  //     alert("Please login to save favorite locations");
  //     navigate("/login");
  //     return;
  //   }
  //
  //   try {
  //     // Optimistically update UI
  //     setFavorites((prev) =>
  //       prev.includes(locationId)
  //         ? prev.filter((id) => id !== locationId)
  //         : [...prev, locationId],
  //     );
  //
  //     const res = await fetch(`/api/favorites/${locationId}`, {
  //       method: "POST",
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //         "Content-Type": "application/json",
  //       },
  //     });
  //
  //     const data = await res.json();
  //     if (!data.success) {
  //       // Revert on failure
  //       fetchFavorites();
  //       console.error("Failed to toggle favorite:", data.message);
  //     }
  //   } catch (err) {
  //     console.error("Error toggling favorite:", err);
  //     fetchFavorites(); // Revert on failure
  //   }
  // };

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
  // const getDirectionsUrl = (slot: ParkingSlot) => {
  //   if (!slot.coordinates) return "#";
  //   return `https://www.google.com/maps/dir/?api=1&destination=${slot.coordinates.lat},${slot.coordinates.lng}`;
  // };

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

    if (vehicleFilter && vehicleFilter !== "All") {
      filtered = filtered.filter((slot) => {
        if (!slot.supportedVehicles || slot.supportedVehicles.length === 0) {
          return vehicleFilter !== "EV";
        }
        return slot.supportedVehicles.includes(vehicleFilter);
      });
    }

    // Client-side guard: if evFilter is on but server somehow returned non-EV slots,
    // ensure we only show EV slots in the list
    if (evFilter) {
      filtered = filtered.filter((slot) => slot.isEVChargingStation === true);
    }

    if (vehicleFilter && vehicleFilter !== "All") {
      filtered = filtered.filter((slot) => {
        if (vehicleFilter === "EV") {
          return slot.isEVChargingStation || (slot.supportedVehicles && slot.supportedVehicles.includes("EV"));
        }
        return slot.supportedVehicles && slot.supportedVehicles.includes(vehicleFilter);
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
  }, [parkingSlots, searchTerm, statusFilter, sortBy, userLocation, evFilter, vehicleFilter]);

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
          <div className="h-[500px] relative z-10">
            {/* Routing overlays */}
            {routingLoading && (
              <div className="absolute inset-0 bg-black/60 z-[1000] flex items-center justify-center gap-2 text-[#EEECF6] text-sm font-semibold">
                <Icons.Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                Generating route...
              </div>
            )}

            {(geoError || routingError) && (
              <div className="absolute inset-x-0 top-0 bg-red-600/90 text-white px-3 py-2 text-xs font-semibold z-[1000] flex justify-between items-center">
                <span className="truncate pr-2">
                  Error: {geoError || routingError}
                </span>
                <button
                  onClick={handleClearRoute}
                  className="hover:opacity-80 shrink-0"
                >
                  <Icons.X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {routeCoords.length > 0 && (
              <button
                onClick={handleClearRoute}
                className="absolute bottom-2 left-2 bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded text-xs font-bold z-[1000] flex items-center gap-1 shadow-md transition-colors"
              >
                <Icons.X className="w-3 h-3" />
                Clear Route
              </button>
            )}

            <MapContainer
              center={
                userLocation
                  ? [userLocation.lat, userLocation.lng]
                  : [28.6139, 77.209]
              }
              zoom={13}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* User location marker */}
              {userLocation && (
                <Marker
                  position={[userLocation.lat, userLocation.lng]}
                  icon={userIcon}
                >
                  <Popup>
                    <div className="font-semibold text-gray-800">
                      Your Location
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Parking slots markers */}
              {filteredAndSortedSlots.map((slot: ParkingSlot) => {
                if (!slot.coordinates) return null;
                const status = slot.status || "unknown";

                return (
                  <Marker
                    {...{
                      key: slot._id,
                      position: [slot.coordinates.lat, slot.coordinates.lng],
                      icon: createParkingIcon(status),
                      eventHandlers: {
                        click: () => {
                          setSelectedMapSlot(slot);
                        },
                      }
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } as any}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px] text-gray-800">
                        <h3 className="font-bold text-base text-gray-900 mb-1">
                          {slot.name}
                        </h3>
                        <p className="text-xs text-gray-600 mb-2">
                          {slot.location}
                        </p>
                        <div className="flex justify-between items-center text-xs font-semibold mb-2">
                          <span>₹{slot.pricePerHour}/hr</span>
                          <span
                            className={`px-1.5 py-0.5 rounded-full ${
                              slot.status === "available"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {slot.status}
                          </span>
                        </div>
                        <button
                          onClick={() => handleNavigate(slot)}
                          disabled={routingLoading}
                          className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Navigate to this parking spot"
                        >
                          <Icons.Navigation className="w-3 h-3" />
                          Navigate
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Route line drawing */}
              {routeCoords.length > 0 && (
                <>
                  <Polyline
                    {...{
                      positions: routeCoords,
                      pathOptions: { color: "#1B42CB", weight: 5 },
                      color: "#1B42CB",
                      weight: 5
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } as any}
                  />
                  <FitBounds coords={routeCoords} />
                </>
              )}
            </MapContainer>

            {/* Map Legend */}
            <div
              className={`absolute bottom-4 right-4 backdrop-blur-xl ${themeClasses.cardBgSecondary} ${themeClasses.cardBorder} border rounded-xl p-4 z-[1000] pointer-events-none`}
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
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleToggleFavorite(e, selectedMapSlot._id)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    favorites.includes(selectedMapSlot._id)
                      ? "text-[#FF2F6C]"
                      : `${themeClasses.textMuted} hover:text-[#FF2F6C]`
                  }`}
                  title={
                    favorites.includes(selectedMapSlot._id)
                      ? "Remove from favorites"
                      : "Save to favorites"
                  }
                >
                  <Icons.Heart
                    className="w-5 h-5"
                    fill={
                      favorites.includes(selectedMapSlot._id)
                        ? "currentColor"
                        : "none"
                    }
                  />
                </button>
                <button
                  onClick={() => setSelectedMapSlot(null)}
                  className={`w-8 h-8 rounded-lg ${themeClasses.cardBgSecondary} border ${themeClasses.border} flex items-center justify-center ${themeClasses.text} ${themeClasses.hover} transition-colors`}
                >
                  <Icons.X className="w-4 h-4" />
                </button>
              </div>
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
              <button
                onClick={() => handleNavigate(selectedMapSlot)}
                disabled={routingLoading}
                className={`flex-1 px-6 py-3 ${themeClasses.cardBgSecondary} border ${themeClasses.border} ${themeClasses.text} font-semibold rounded-xl ${themeClasses.hover} transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Navigate to this parking spot"
              >
                <Icons.Navigation className="w-4 h-4" />
                Navigate
              </button>
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
        {filteredAndSortedSlots.map((slot: ParkingSlot) => {
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
                    {/* EV Charging Station Indicator Badge */}
                    {slot.isEVChargingStation && (
                      <span
                        title={`EV Charger: ${slot.chargerType}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse-subtle"
                      >
                        <Icons.Zap className="w-3 h-3 fill-current" />
                        EV
                      </span>
                    )}
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
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={(e) => handleToggleFavorite(e, slot._id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        favorites.includes(slot._id)
                          ? "text-[#FF2F6C]"
                          : `${themeClasses.textMuted} hover:text-[#FF2F6C]`
                      }`}
                      title={
                        favorites.includes(slot._id)
                          ? "Remove from favorites"
                          : "Save to favorites"
                      }
                    >
                      <Icons.Heart
                        className="w-5 h-5"
                        fill={
                          favorites.includes(slot._id) ? "currentColor" : "none"
                        }
                      />
                    </button>
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
                      {slot.supportedVehicles.map((v: string) => (
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

                {/* EV Charging Info Panel */}
                {slot.isEVChargingStation && (
                  <div className="mb-4 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Icons.Zap className="w-5 h-5 text-emerald-400 fill-current" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                        EV Charging Available
                      </div>
                      {slot.chargerType && slot.chargerType !== "None" && (
                        <div
                          className={`text-xs ${themeClasses.textSecondary} mt-0.5`}
                        >
                          Charger type:{" "}
                          <span className="font-semibold text-emerald-300">
                            {slot.chargerType}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

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
                  <button
                    onClick={() => handleNavigate(slot)}
                    disabled={routingLoading}
                    className={`flex-1 px-4 py-3 ${themeClasses.cardBgSecondary} border ${themeClasses.border} ${themeClasses.text} rounded-lg ${themeClasses.hover} transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                    title="Navigate to this parking spot"
                  >
                    <Icons.Navigation className="w-4 h-4" />
                    Navigate
                  </button>
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
                      {parkingSlots.length > 0
                        ? `₹${Math.min(...parkingSlots.map((s) => s.pricePerHour))}`
                        : "N/A"}
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

              <div className="flex items-center gap-3 flex-wrap">
                {/* ─── EV Charging Toggle ─── */}
                <button
                  id="ev-filter-toggle"
                  role="switch"
                  aria-checked={evFilter}
                  onClick={() => setEvFilter((prev) => !prev)}
                  title={
                    evFilter
                      ? "Showing EV-only slots"
                      : "Show EV charging slots only"
                  }
                  className={`relative inline-flex items-center gap-2.5 px-4 py-3 rounded-xl border font-semibold text-sm transition-all duration-300 select-none ${
                    evFilter
                      ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-lg shadow-emerald-500/20"
                      : `${themeClasses.cardBgSecondary} ${themeClasses.border} ${themeClasses.textSecondary} hover:border-emerald-500/40 hover:text-emerald-400`
                  }`}
                >
                  <Icons.Zap
                    className={`w-4 h-4 transition-colors duration-300 ${
                      evFilter ? "text-emerald-400 fill-current" : ""
                    }`}
                  />
                  <span>EV Only</span>
                  {/* Pill toggle visual */}
                  <span
                    className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-300 ${
                      evFilter ? "bg-emerald-500" : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${
                        evFilter ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </span>
                </button>
                {/* ────────────────────────── */}

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

            {/* Active filter pill summary */}
            {evFilter && (
              <div className="mt-4 flex items-center gap-2">
                <span className={`text-xs ${themeClasses.textSecondary}`}>
                  Active filters:
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                  <Icons.Zap className="w-3 h-3 fill-current" />
                  EV Charging Only
                  <button
                    onClick={() => setEvFilter(false)}
                    className="ml-1 hover:text-white transition-colors"
                    aria-label="Remove EV filter"
                  >
                    <Icons.X className="w-3 h-3" />
                  </button>
                </span>
              </div>
            )}
          </div>

          {filteredAndSortedSlots.length === 0 ? (
            <div
              className={`backdrop-blur-xl ${themeClasses.cardBg} ${themeClasses.cardBorder} border rounded-2xl p-12 text-center`}
            >
              <div
                className={`w-24 h-24 bg-gradient-to-br ${themeClasses.gradient.accent}/20 rounded-full flex items-center justify-center mx-auto mb-6 border ${themeClasses.border}`}
              >
                {evFilter ? (
                  <Icons.Zap className="w-8 h-8 text-emerald-400" />
                ) : (
                  <Icons.Car className="w-8 h-8 text-[#1B42CB]" />
                )}
              </div>
              <h3 className={`text-2xl font-bold ${themeClasses.text} mb-3`}>
                {evFilter
                  ? "No EV Charging Slots Found"
                  : "No Parking Slots Found"}
              </h3>
              <p className={`${themeClasses.textSecondary} mb-6`}>
                {searchTerm || statusFilter || evFilter
                  ? "Try adjusting your filters"
                  : "Check back later for available spots"}
              </p>
              {(searchTerm || statusFilter || evFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("");
                    setSortBy("");
                    setEvFilter(false);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-[#1B42CB] to-[#1B42CB]/80 text-white font-semibold rounded-xl hover:from-[#1B42CB]/90 hover:to-[#1B42CB]/70 transition-all duration-300"
                >
                  Clear All Filters
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
                        (s: ParkingSlot) => s.status === "available",
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
                    {filteredAndSortedSlots.length > 0
                      ? Math.round(
                          (filteredAndSortedSlots.reduce(
                            (sum: number, s: ParkingSlot) => sum + s.availableSlots / s.capacity,
                            0,
                          ) /
                            filteredAndSortedSlots.length) *
                            100,
                        )
                      : 0}
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
                    {filteredAndSortedSlots.length > 0
                      ? Math.round(
                          filteredAndSortedSlots.reduce(
                            (sum: number, s: ParkingSlot) => sum + s.pricePerHour,
                            0,
                          ) / filteredAndSortedSlots.length,
                        )
                      : 0}
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
};;

export default ParkingSlotPage;
