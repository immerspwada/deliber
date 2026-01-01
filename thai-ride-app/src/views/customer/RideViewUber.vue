<script setup lang="ts">
/**
 * Feature: F02 - Simple Ride Booking (Grab/Bolt Style)
 * UX: Super Simple - 2 taps to book
 * Flow: 1.เลือกจุดหมาย → 2.กดจอง → 3.ติดตาม
 */
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import { useRideStore } from "../../stores/ride";
import { useServices } from "../../composables/useServices";
import { useLocation, type GeoLocation } from "../../composables/useLocation";
import { useWallet } from "../../composables/useWallet";
import { supabase } from "../../lib/supabase";

const router = useRouter();
const authStore = useAuthStore();
const rideStore = useRideStore();
const { calculateDistance, calculateTravelTime } = useLocation();
const { savedPlaces, recentPlaces, fetchSavedPlaces, fetchRecentPlaces } =
  useServices();
const { balance, fetchBalance } = useWallet();

// ========== SIMPLE STATE ==========
const currentStep = ref<"select" | "searching" | "tracking" | "rating">(
  "select"
);
const pickup = ref<GeoLocation | null>(null);
const destination = ref<GeoLocation | null>(null);
const searchQuery = ref("");
const isSearchFocused = ref(false);
const searchResults = ref<
  Array<{ id: string; name: string; address: string; lat: number; lng: number }>
>([]);
const selectedVehicle = ref<"bike" | "car" | "premium">("car");
const isBooking = ref(false);
const isGettingLocation = ref(false);
const searchingSeconds = ref(0);
let searchingInterval: ReturnType<typeof setInterval> | null = null;

// Nearby places
interface NearbyPlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: string;
  icon: string;
}
const nearbyPlaces = ref<NearbyPlace[]>([]);
const isLoadingNearby = ref(false);

// Fare & Trip
const estimatedFare = ref(0);
const estimatedTime = ref(0);
const estimatedDistance = ref(0);

// Active ride
const activeRide = ref<any>(null);
const matchedDriver = ref<any>(null);
const driverETA = ref(0);
let realtimeChannel: any = null;

// Rating
const userRating = ref(0);
const isSubmittingRating = ref(false);

// Vehicle options - loaded from database or fallback defaults
interface VehicleOption {
  id: string;
  name: string;
  multiplier: number;
  eta: string;
  icon: string;
}

const vehicles = ref<VehicleOption[]>([]);
const isLoadingVehicles = ref(false);

// Fetch vehicle types from database
async function fetchVehicleTypes() {
  isLoadingVehicles.value = true;
  try {
    const { data, error } = await supabase
      .from("vehicle_types")
      .select("id, name, price_multiplier, estimated_eta_minutes, icon")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    if (data && data.length > 0) {
      vehicles.value = data.map((v) => ({
        id: v.id,
        name: v.name,
        multiplier: v.price_multiplier || 1.0,
        eta: `${v.estimated_eta_minutes || 5} นาที`,
        icon: v.icon || "car",
      }));
    } else {
      // Fallback defaults if no data in DB
      vehicles.value = [
        {
          id: "bike",
          name: "มอเตอร์ไซค์",
          multiplier: 0.7,
          eta: "3 นาที",
          icon: "bike",
        },
        {
          id: "car",
          name: "รถยนต์",
          multiplier: 1.0,
          eta: "5 นาที",
          icon: "car",
        },
        {
          id: "premium",
          name: "พรีเมียม",
          multiplier: 1.5,
          eta: "7 นาที",
          icon: "premium",
        },
      ];
    }
  } catch (err) {
    console.error("[fetchVehicleTypes] Error:", err);
    // Use fallback on error
    vehicles.value = [
      {
        id: "bike",
        name: "มอเตอร์ไซค์",
        multiplier: 0.7,
        eta: "3 นาที",
        icon: "bike",
      },
      {
        id: "car",
        name: "รถยนต์",
        multiplier: 1.0,
        eta: "5 นาที",
        icon: "car",
      },
      {
        id: "premium",
        name: "พรีเมียม",
        multiplier: 1.5,
        eta: "7 นาที",
        icon: "premium",
      },
    ];
  } finally {
    isLoadingVehicles.value = false;
  }
}

// ========== COMPUTED ==========
const canBook = computed(
  () =>
    pickup.value &&
    destination.value &&
    !isBooking.value &&
    hasEnoughBalance.value
);
const selectedVehicleInfo = computed(() =>
  vehicles.value.find((v) => v.id === selectedVehicle.value)
);
const finalFare = computed(() =>
  Math.round(estimatedFare.value * (selectedVehicleInfo.value?.multiplier || 1))
);
const hasEnoughBalance = computed(
  () => (balance.value?.balance ?? 0) >= finalFare.value
);
const currentBalance = computed(() => balance.value?.balance ?? 0);

const statusText = computed(() => {
  if (!activeRide.value) return "";
  const s = activeRide.value.status;
  if (s === "pending") return "กำลังหาคนขับ...";
  if (s === "matched") return `คนขับมาถึงใน ${driverETA.value} นาที`;
  if (s === "arriving") return "คนขับใกล้ถึงแล้ว";
  if (s === "picked_up") return "กำลังเดินทาง";
  if (s === "in_progress") return "กำลังเดินทาง";
  if (s === "completed") return "ถึงแล้ว!";
  return s;
});

// ========== LIFECYCLE ==========
onMounted(async () => {
  getCurrentLocation();
  await fetchVehicleTypes();
  if (authStore.user?.id) {
    await Promise.all([
      fetchSavedPlaces(),
      fetchRecentPlaces(5),
      fetchBalance(),
    ]);
    await checkActiveRide();
  }
});

onUnmounted(() => {
  rideStore.unsubscribeAll();
  if (searchingInterval) clearInterval(searchingInterval);
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
});

watch(
  () => activeRide.value?.status,
  (newStatus) => {
    if (newStatus === "matched" || newStatus === "arriving") {
      driverETA.value = 5;
    }
    if (newStatus === "completed") {
      currentStep.value = "rating";
    }
  }
);

// ========== METHODS ==========
async function getCurrentLocation() {
  if (!navigator.geolocation) return;
  isGettingLocation.value = true;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      pickup.value = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        address: "ตำแหน่งปัจจุบัน",
      };
      isGettingLocation.value = false;
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`,
          {
            headers: {
              Accept: "application/json",
              "User-Agent": "ThaiRideApp/1.0",
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.display_name) {
            pickup.value!.address = data.display_name
              .split(",")
              .slice(0, 2)
              .join(", ");
          }
        }
        // Fetch nearby places after getting location
        fetchNearbyPlaces(pos.coords.latitude, pos.coords.longitude);
      } catch {
        /* ignore */
      }
    },
    () => {
      isGettingLocation.value = false;
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// Cache for nearby places (key: lat_lng rounded to 2 decimals)
const nearbyPlacesCache = new Map<string, NearbyPlace[]>();

// Fetch nearby important places using Nominatim with rate limiting
async function fetchNearbyPlaces(lat: number, lng: number) {
  // Check cache first (round to 2 decimals for ~1km precision)
  const cacheKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
  const cached = nearbyPlacesCache.get(cacheKey);
  if (cached) {
    nearbyPlaces.value = cached;
    return;
  }

  isLoadingNearby.value = true;
  nearbyPlaces.value = [];

  // Categories to search for
  const categories = [
    { type: "mall", query: "shopping mall", icon: "shopping" },
    { type: "hospital", query: "hospital", icon: "hospital" },
    { type: "station", query: "train station", icon: "train" },
    { type: "airport", query: "airport", icon: "plane" },
    { type: "university", query: "university", icon: "school" },
    { type: "temple", query: "temple", icon: "temple" },
  ];

  // Helper: delay function for rate limiting
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  try {
    const allPlaces: NearbyPlace[] = [];

    // Sequential requests with 1.1s delay to respect Nominatim rate limit (1 req/sec)
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];

      // Add delay between requests (skip first)
      if (i > 0) {
        await delay(1100);
      }

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            cat.query
          )}&format=json&limit=2&viewbox=${lng - 0.05},${lat + 0.05},${
            lng + 0.05
          },${lat - 0.05}&bounded=1`,
          {
            headers: {
              Accept: "application/json",
              "User-Agent": "ThaiRideApp/1.0 (contact@thairide.app)",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const places = data.map((place: any) => ({
            id: place.place_id?.toString() || `${cat.type}-${Math.random()}`,
            name: place.display_name?.split(",")[0] || cat.query,
            address:
              place.display_name?.split(",").slice(1, 3).join(",").trim() || "",
            lat: parseFloat(place.lat),
            lng: parseFloat(place.lon),
            type: cat.type,
            icon: cat.icon,
          }));
          allPlaces.push(...places);

          // Update UI progressively
          nearbyPlaces.value = allPlaces
            .map((place) => ({
              ...place,
              distance: calculateDistance(lat, lng, place.lat, place.lng),
            }))
            .sort((a, b) => (a.distance || 0) - (b.distance || 0))
            .slice(0, 8);
        }
      } catch {
        // Continue with next category on error
      }
    }

    // Final sort and limit
    const sortedPlaces = allPlaces
      .map((place) => ({
        ...place,
        distance: calculateDistance(lat, lng, place.lat, place.lng),
      }))
      .sort((a, b) => (a.distance || 0) - (b.distance || 0))
      .slice(0, 8);

    nearbyPlaces.value = sortedPlaces;

    // Cache results
    nearbyPlacesCache.set(cacheKey, sortedPlaces);
  } catch (err) {
    console.error("[fetchNearbyPlaces] Error:", err);
  } finally {
    isLoadingNearby.value = false;
  }
}

async function checkActiveRide() {
  if (!authStore.user?.id) return;
  const { data, error } = await supabase
    .from("ride_requests")
    .select(
      `
      *,
      provider:provider_id (
        id,
        user_id,
        vehicle_type,
        vehicle_plate,
        vehicle_color,
        rating,
        total_trips,
        current_lat,
        current_lng,
        users:user_id (
          name,
          phone,
          avatar_url
        )
      )
    `
    )
    .eq("user_id", authStore.user.id)
    .in("status", [
      "pending",
      "matched",
      "arriving",
      "picked_up",
      "in_progress",
    ])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[checkActiveRide] Error:", error.message);
    return;
  }

  if (data) {
    activeRide.value = data;
    // Map provider data to matchedDriver format
    const provider = (data as any).provider;
    if (provider) {
      const user = provider.users;
      matchedDriver.value = {
        id: provider.id,
        name: user?.name || "คนขับ",
        phone: user?.phone || "",
        rating: provider.rating || 4.8,
        vehicle_type: provider.vehicle_type || "รถยนต์",
        vehicle_color: provider.vehicle_color || "สีดำ",
        vehicle_plate: provider.vehicle_plate || "",
        avatar_url: user?.avatar_url,
        current_lat: provider.current_lat,
        current_lng: provider.current_lng,
      };
    }
    currentStep.value = data.status === "pending" ? "searching" : "tracking";
    setupRealtimeTracking(data.id);
  }
}

function setupRealtimeTracking(rideId: string) {
  // Validate rideId before subscribing
  if (!rideId || rideId === "undefined" || rideId === "null") {
    console.warn("[setupRealtimeTracking] Invalid rideId:", rideId);
    return;
  }

  realtimeChannel = supabase
    .channel(`ride-${rideId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "ride_requests",
        filter: `id=eq.${rideId}`,
      },
      (payload) => {
        activeRide.value = { ...activeRide.value, ...payload.new };
        if (payload.new.status === "completed") {
          currentStep.value = "rating";
        } else if (payload.new.status === "cancelled") {
          resetAll();
        } else if (payload.new.status !== "pending") {
          currentStep.value = "tracking";
        }
      }
    )
    .subscribe();
}

function searchPlaces() {
  if (searchQuery.value.length < 2) {
    searchResults.value = [];
    return;
  }
  const query = searchQuery.value.toLowerCase();
  const allPlaces = [
    ...(savedPlaces.value || []),
    ...(recentPlaces.value || []),
  ];
  searchResults.value = allPlaces
    .filter(
      (p) =>
        p.name?.toLowerCase().includes(query) ||
        p.address?.toLowerCase().includes(query)
    )
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
    }));
}

function selectDestination(place: {
  name: string;
  address: string;
  lat: number;
  lng: number;
}) {
  destination.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.name || place.address,
  };
  searchQuery.value = place.name || place.address;
  searchResults.value = [];
  isSearchFocused.value = false;
  calculateFare();
}

function calculateFare() {
  if (!pickup.value || !destination.value) return;
  const dist = calculateDistance(
    pickup.value.lat,
    pickup.value.lng,
    destination.value.lat,
    destination.value.lng
  );
  estimatedDistance.value = dist;
  estimatedTime.value = calculateTravelTime(dist);
  estimatedFare.value = Math.round(35 + dist * 12);
}

async function bookRide() {
  if (!pickup.value || !destination.value || !authStore.user) return;

  // ตรวจสอบยอดเงินก่อนจอง
  if (!hasEnoughBalance.value) {
    alert(
      `ยอดเงินไม่เพียงพอ\n\nค่าโดยสาร: ฿${finalFare.value}\nยอดคงเหลือ: ฿${currentBalance.value}\n\nกรุณาเติมเงินก่อนจอง`
    );
    router.push("/customer/wallet");
    return;
  }

  isBooking.value = true;
  currentStep.value = "searching";
  searchingSeconds.value = 0;
  searchingInterval = setInterval(() => {
    searchingSeconds.value++;
  }, 1000);

  try {
    const ride = await rideStore.createRideRequest(
      authStore.user.id,
      pickup.value,
      destination.value,
      selectedVehicle.value,
      1
    );
    if (ride) {
      activeRide.value = rideStore.currentRide;
      setupRealtimeTracking(ride.rideId);
      // Don't await - let it search in background while timer runs
      rideStore.findAndMatchDriver().then((driver) => {
        if (driver) {
          // Stop timer when driver found
          if (searchingInterval) {
            clearInterval(searchingInterval);
            searchingInterval = null;
          }
          matchedDriver.value = driver;
          currentStep.value = "tracking";
        }
        // If no driver found, stay in searching mode with timer running
      });
    } else {
      // Failed to create ride - stop timer and go back
      if (searchingInterval) {
        clearInterval(searchingInterval);
        searchingInterval = null;
      }
      currentStep.value = "select";
    }
  } catch (err) {
    console.error("Booking error:", err);
    alert("ไม่สามารถจองได้ กรุณาลองใหม่");
    if (searchingInterval) {
      clearInterval(searchingInterval);
      searchingInterval = null;
    }
    currentStep.value = "select";
  } finally {
    isBooking.value = false;
    // Don't stop timer here - let it run until driver found or cancelled
  }
}

async function cancelRide() {
  // Stop timer first
  if (searchingInterval) {
    clearInterval(searchingInterval);
    searchingInterval = null;
  }

  if (activeRide.value) {
    if (!confirm("ยกเลิกการเดินทาง?")) {
      // User cancelled the confirm - restart timer if still searching
      if (currentStep.value === "searching") {
        searchingInterval = setInterval(() => {
          searchingSeconds.value++;
        }, 1000);
      }
      return;
    }
    const success = await rideStore.cancelRide(activeRide.value.id);
    if (success) resetAll();
  } else {
    // No active ride yet, just go back
    resetAll();
  }
}

function resetAll() {
  activeRide.value = null;
  matchedDriver.value = null;
  currentStep.value = "select";
  destination.value = null;
  searchQuery.value = "";
  userRating.value = 0;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function submitRating() {
  if (!activeRide.value || userRating.value === 0) return;
  isSubmittingRating.value = true;
  try {
    // Use rideStore's atomic submitRating function
    const success = await rideStore.submitRating(userRating.value, 0);
    if (success) {
      resetAll();
    } else {
      console.error("Rating submission failed");
    }
  } catch (err) {
    console.error("Rating error:", err);
  } finally {
    isSubmittingRating.value = false;
  }
}

function skipRating() {
  resetAll();
}
function callDriver() {
  if (matchedDriver.value?.phone_number)
    window.location.href = `tel:${matchedDriver.value.phone_number}`;
}
function callEmergency() {
  if (confirm("โทร 191?")) window.location.href = "tel:191";
}

function handleSearchBlur() {
  window.setTimeout(() => {
    isSearchFocused.value = false;
  }, 200);
}
</script>

<template>
  <div class="ride-page">
    <!-- STEP 1: SELECT DESTINATION -->
    <div v-if="currentStep === 'select'" class="select-view">
      <!-- Header with pickup -->
      <div class="header-section">
        <button class="back-btn" @click="router.push('/customer')">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div class="pickup-display">
          <div class="pickup-dot"></div>
          <div class="pickup-info">
            <span class="pickup-label">จุดรับ</span>
            <span class="pickup-address">{{
              pickup?.address || "กำลังหาตำแหน่ง..."
            }}</span>
          </div>
          <button v-if="isGettingLocation" class="refresh-btn" disabled>
            <svg
              class="spin"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
          </button>
          <button v-else class="refresh-btn" @click="getCurrentLocation">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Search destination -->
      <div class="search-section">
        <div class="search-box" :class="{ focused: isSearchFocused }">
          <svg
            class="search-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ไปไหนดี?"
            class="search-input"
            @focus="isSearchFocused = true"
            @blur="handleSearchBlur"
            @input="searchPlaces"
          />
          <button
            v-if="searchQuery"
            class="clear-btn"
            @click="
              searchQuery = '';
              searchResults = [];
            "
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Search results -->
        <div v-if="searchResults.length > 0" class="search-results">
          <button
            v-for="place in searchResults"
            :key="place.id"
            class="result-item"
            @click="selectDestination(place)"
          >
            <svg
              class="result-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <div class="result-text">
              <span class="result-name">{{ place.name }}</span>
              <span class="result-address">{{ place.address }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Quick places -->
      <div v-if="!isSearchFocused && !destination" class="quick-places">
        <h3 class="section-title">สถานที่บันทึก</h3>
        <div v-if="savedPlaces && savedPlaces.length > 0" class="places-list">
          <button
            v-for="place in savedPlaces.slice(0, 4)"
            :key="place.id"
            class="place-chip"
            @click="selectDestination(place)"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
            <span>{{ place.name }}</span>
          </button>
        </div>
        <div v-else class="empty-state">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#999"
            stroke-width="1.5"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
          <p>ยังไม่มีสถานที่บันทึก</p>
        </div>

        <h3 class="section-title">ล่าสุด</h3>
        <div v-if="recentPlaces && recentPlaces.length > 0" class="recent-list">
          <button
            v-for="place in recentPlaces.slice(0, 3)"
            :key="place.id"
            class="recent-item"
            @click="selectDestination(place)"
          >
            <svg
              class="recent-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
            <div class="recent-text">
              <span class="recent-name">{{ place.name }}</span>
              <span class="recent-addr">{{ place.address }}</span>
            </div>
          </button>
        </div>
        <div v-else class="empty-state">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#999"
            stroke-width="1.5"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
          <p>ยังไม่มีประวัติการเดินทาง</p>
        </div>

        <!-- Nearby Places -->
        <h3 class="section-title">สถานที่ใกล้เคียง</h3>
        <div v-if="isLoadingNearby" class="nearby-loading">
          <div class="skeleton-nearby"></div>
          <div class="skeleton-nearby"></div>
          <div class="skeleton-nearby"></div>
        </div>
        <div v-else-if="nearbyPlaces.length > 0" class="nearby-list">
          <button
            v-for="place in nearbyPlaces"
            :key="place.id"
            class="nearby-item"
            @click="selectDestination(place)"
          >
            <div class="nearby-icon" :class="place.type">
              <!-- Shopping -->
              <svg
                v-if="place.icon === 'shopping'"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              <!-- Hospital -->
              <svg
                v-else-if="place.icon === 'hospital'"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M3 3h18v18H3z" />
                <path d="M12 8v8M8 12h8" />
              </svg>
              <!-- Train -->
              <svg
                v-else-if="place.icon === 'train'"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="4" y="3" width="16" height="16" rx="2" />
                <path d="M4 11h16" />
                <path d="M12 3v8" />
                <circle cx="8" cy="15" r="1" />
                <circle cx="16" cy="15" r="1" />
                <path d="M8 19l-2 3M16 19l2 3" />
              </svg>
              <!-- Plane -->
              <svg
                v-else-if="place.icon === 'plane'"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"
                />
              </svg>
              <!-- School -->
              <svg
                v-else-if="place.icon === 'school'"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
              </svg>
              <!-- Temple -->
              <svg
                v-else-if="place.icon === 'temple'"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M12 2L2 7h20L12 2z" />
                <path d="M4 7v10h16V7" />
                <path d="M4 17l8 5 8-5" />
                <path d="M9 7v10M15 7v10" />
              </svg>
              <!-- Default location -->
              <svg
                v-else
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div class="nearby-text">
              <span class="nearby-name">{{ place.name }}</span>
              <span class="nearby-addr">{{ place.address }}</span>
            </div>
          </button>
        </div>
        <div v-else class="empty-state">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#999"
            stroke-width="1.5"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <p>ไม่พบสถานที่ใกล้เคียง</p>
        </div>
      </div>

      <!-- Vehicle selection (shows when destination selected) -->
      <div v-if="destination" class="booking-section">
        <div class="trip-summary">
          <div class="trip-route">
            <div class="route-line">
              <div class="dot green"></div>
              <div class="line"></div>
              <div class="dot red"></div>
            </div>
            <div class="route-info">
              <span class="route-from">{{ pickup?.address }}</span>
              <span class="route-to">{{ destination?.address }}</span>
            </div>
          </div>
          <div class="trip-meta">
            <span>{{ estimatedDistance.toFixed(1) }} กม.</span>
            <span>~{{ estimatedTime }} นาที</span>
          </div>
        </div>

        <div class="vehicle-options">
          <div v-if="isLoadingVehicles" class="vehicles-loading">
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
          </div>
          <template v-else>
            <button
              v-for="v in vehicles"
              :key="v.id"
              class="vehicle-card"
              :class="{ selected: selectedVehicle === v.id }"
              @click="selectedVehicle = v.id"
            >
              <div class="vehicle-icon">
                <svg
                  v-if="v.icon === 'bike'"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <circle cx="5" cy="17" r="3" />
                  <circle cx="19" cy="17" r="3" />
                  <path d="M12 17V5l4 4M8 8h4" />
                </svg>
                <svg
                  v-else-if="v.icon === 'car'"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path d="M5 17h14v-5l-2-5H7l-2 5v5z" />
                  <circle cx="7" cy="17" r="2" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
                <svg
                  v-else
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path d="M5 17h14v-5l-2-5H7l-2 5v5z" />
                  <circle cx="7" cy="17" r="2" />
                  <circle cx="17" cy="17" r="2" />
                  <path d="M9 7l1-3h4l1 3" />
                </svg>
              </div>
              <span class="vehicle-name">{{ v.name }}</span>
              <span class="vehicle-price"
                >฿{{ Math.round(estimatedFare * v.multiplier) }}</span
              >
              <span class="vehicle-eta">{{ v.eta }}</span>
            </button>
          </template>
        </div>

        <!-- Book button -->
        <button
          class="book-btn"
          :class="{ 'insufficient-balance': !hasEnoughBalance && destination }"
          :disabled="!canBook"
          @click="bookRide"
        >
          <span v-if="isBooking">กำลังจอง...</span>
          <span v-else-if="!hasEnoughBalance && destination">
            เงินไม่พอ • ฿{{ finalFare }}
          </span>
          <span v-else>จองเลย • ฿{{ finalFare }}</span>
        </button>

        <!-- Balance warning with top-up link -->
        <div
          v-if="!hasEnoughBalance && destination"
          class="balance-warning-box"
        >
          <p class="balance-warning">
            ยอดเงินไม่พอ (คงเหลือ ฿{{ currentBalance.toLocaleString() }})
          </p>
          <button class="topup-link" @click="router.push('/customer/wallet')">
            เติมเงินเลย →
          </button>
        </div>
      </div>
    </div>

    <!-- STEP 2: SEARCHING -->
    <div v-else-if="currentStep === 'searching'" class="searching-view">
      <div class="searching-content">
        <div class="pulse-container">
          <div class="pulse-ring"></div>
          <div class="pulse-ring delay"></div>
          <div class="pulse-center">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M5 17h14v-5l-2-5H7l-2 5v5z" />
              <circle cx="7" cy="17" r="2" />
              <circle cx="17" cy="17" r="2" />
            </svg>
          </div>
        </div>
        <h2 class="searching-title">กำลังหาคนขับ</h2>
        <p class="searching-time">{{ formatTime(searchingSeconds) }}</p>
        <p class="searching-hint">โปรดรอสักครู่...</p>
        <button class="cancel-search-btn" @click="cancelRide">ยกเลิก</button>
      </div>
    </div>

    <!-- STEP 3: TRACKING -->
    <div v-else-if="currentStep === 'tracking'" class="tracking-view">
      <!-- Map placeholder -->
      <div class="map-area">
        <div class="map-placeholder">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00A86B"
            stroke-width="1.5"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>แผนที่ติดตาม</span>
        </div>
      </div>

      <!-- Driver card -->
      <div class="driver-card">
        <div class="status-bar">
          <span class="status-text">{{ statusText }}</span>
        </div>

        <div v-if="matchedDriver" class="driver-info">
          <div class="driver-avatar">
            <img
              v-if="matchedDriver.avatar_url"
              :src="matchedDriver.avatar_url"
              alt="Driver"
              class="avatar-img"
            />
            <svg
              v-else
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
            </svg>
          </div>
          <div class="driver-details">
            <span class="driver-name">{{ matchedDriver.name || "คนขับ" }}</span>
            <span class="driver-vehicle"
              >{{ matchedDriver.vehicle_plate || "กข 1234" }} •
              {{ matchedDriver.vehicle_color || "" }}</span
            >
            <span v-if="matchedDriver.rating" class="driver-rating"
              >⭐ {{ matchedDriver.rating.toFixed(1) }}</span
            >
          </div>
          <div class="driver-actions">
            <button class="action-btn" @click="callDriver">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
                />
              </svg>
            </button>
          </div>
        </div>

        <div class="trip-info-card">
          <div class="trip-point">
            <div class="point-dot green"></div>
            <span>{{ pickup?.address }}</span>
          </div>
          <div class="trip-point">
            <div class="point-dot red"></div>
            <span>{{ destination?.address }}</span>
          </div>
        </div>

        <div class="card-actions">
          <button class="sos-btn" @click="callEmergency">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            SOS
          </button>
          <button class="cancel-btn" @click="cancelRide">ยกเลิก</button>
        </div>
      </div>
    </div>

    <!-- STEP 4: RATING -->
    <div v-else-if="currentStep === 'rating'" class="rating-view">
      <div class="rating-content">
        <h2 class="rating-title">ถึงแล้ว!</h2>
        <p class="rating-subtitle">ให้คะแนนคนขับ</p>

        <div class="stars-container">
          <button
            v-for="star in 5"
            :key="star"
            class="star-btn"
            :class="{ active: userRating >= star }"
            @click="userRating = star"
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              :fill="userRating >= star ? '#FFD700' : 'none'"
              :stroke="userRating >= star ? '#FFD700' : '#ccc'"
              stroke-width="2"
            >
              <polygon
                points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              />
            </svg>
          </button>
        </div>

        <div class="rating-actions">
          <button
            class="submit-rating-btn"
            :disabled="userRating === 0 || isSubmittingRating"
            @click="submitRating"
          >
            {{ isSubmittingRating ? "กำลังส่ง..." : "ส่งคะแนน" }}
          </button>
          <button class="skip-btn" @click="skipRating">ข้าม</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ride-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #f5f5f5;
  padding-bottom: env(safe-area-inset-bottom);
}

/* SELECT VIEW */
.select-view {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.header-section {
  background: #00a86b;
  padding: 16px;
  padding-top: calc(16px + env(safe-area-inset-top));
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.back-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.back-btn:active {
  background: rgba(255, 255, 255, 0.3);
}

.pickup-display {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 12px;
}

.pickup-dot {
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  flex-shrink: 0;
}

.pickup-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.pickup-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
}

.pickup-address {
  font-size: 14px;
  color: #fff;
  font-weight: 500;
}

.refresh-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* SEARCH */
.search-section {
  padding: 16px;
  background: #fff;
  position: relative;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f5f5f5;
  border-radius: 12px;
  padding: 12px 16px;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.search-box.focused {
  border-color: #00a86b;
  background: #fff;
}

.search-icon {
  color: #999;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 16px;
  outline: none;
}

.search-input::placeholder {
  color: #999;
}

.clear-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e0e0e0;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 16px;
  right: 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:active {
  background: #f5f5f5;
}

.result-icon {
  color: #00a86b;
  flex-shrink: 0;
}

.result-text {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.result-name {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
}

.result-address {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* QUICK PLACES */
.quick-places {
  padding: 16px;
  flex: 1;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #666;
  margin-bottom: 12px;
}

.places-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
}

.place-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 20px;
  font-size: 14px;
  color: #1a1a1a;
}

.place-chip:active {
  background: #f5f5f5;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  text-align: left;
}

.recent-item:active {
  background: #f5f5f5;
}

.recent-icon {
  color: #999;
  flex-shrink: 0;
}

.recent-text {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.recent-name {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.recent-addr {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* NEARBY PLACES */
.nearby-loading {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.skeleton-nearby {
  height: 60px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 12px;
}

.nearby-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.nearby-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  text-align: left;
  transition: all 0.2s;
}

.nearby-item:active {
  background: #f5f5f5;
  transform: scale(0.98);
}

.nearby-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #f0f0f0;
  color: #666;
}

.nearby-icon.mall,
.nearby-icon.shopping {
  background: #fff3e0;
  color: #f57c00;
}

.nearby-icon.hospital {
  background: #ffebee;
  color: #e53935;
}

.nearby-icon.station,
.nearby-icon.train {
  background: #e3f2fd;
  color: #1976d2;
}

.nearby-icon.airport,
.nearby-icon.plane {
  background: #e8f5e9;
  color: #388e3c;
}

.nearby-icon.university,
.nearby-icon.school {
  background: #f3e5f5;
  color: #7b1fa2;
}

.nearby-icon.temple {
  background: #fff8e1;
  color: #ffa000;
}

.nearby-text {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
}

.nearby-name {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nearby-addr {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* BOOKING SECTION */
.booking-section {
  padding: 16px;
  background: #fff;
  flex: 1;
}

.trip-summary {
  margin-bottom: 20px;
}

.trip-route {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.route-line {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot.green {
  background: #00a86b;
}
.dot.red {
  background: #e53935;
}

.line {
  width: 2px;
  flex: 1;
  min-height: 20px;
  background: #e0e0e0;
}

.route-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.route-from,
.route-to {
  font-size: 14px;
  color: #1a1a1a;
}

.trip-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #666;
}

/* VEHICLE OPTIONS */
.vehicle-options {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.vehicle-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 14px;
  transition: all 0.2s;
}

.vehicle-card.selected {
  background: #e8f5ef;
  border-color: #00a86b;
}

.vehicle-icon {
  color: #666;
}

.vehicle-card.selected .vehicle-icon {
  color: #00a86b;
}

.vehicle-name {
  font-size: 13px;
  font-weight: 500;
  color: #1a1a1a;
}

.vehicle-price {
  font-size: 15px;
  font-weight: 700;
  color: #00a86b;
}

.vehicle-eta {
  font-size: 11px;
  color: #999;
}

/* BOOK BUTTON */
.book-btn {
  width: 100%;
  padding: 16px;
  background: #00a86b;
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 17px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.book-btn:disabled {
  background: #ccc;
  box-shadow: none;
}

.book-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.balance-warning-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 12px;
  background: #ffebee;
  border-radius: 12px;
}

.balance-warning {
  text-align: center;
  font-size: 13px;
  color: #e53935;
  margin: 0;
}

.topup-link {
  background: none;
  border: none;
  color: #00a86b;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
}

.topup-link:hover {
  text-decoration: underline;
}

.book-btn.insufficient-balance {
  background: #ccc;
  box-shadow: none;
}

/* SEARCHING VIEW */
.searching-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.searching-content {
  text-align: center;
  padding: 20px;
}

.pulse-container {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 24px;
}

.pulse-ring {
  position: absolute;
  inset: 0;
  border: 3px solid #00a86b;
  border-radius: 50%;
  animation: pulse-ring 2s ease-out infinite;
}

.pulse-ring.delay {
  animation-delay: 1s;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.5);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.pulse-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f5ef;
  border-radius: 50%;
  color: #00a86b;
}

.searching-title {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.searching-time {
  font-size: 32px;
  font-weight: 700;
  color: #00a86b;
  margin-bottom: 8px;
}

.searching-hint {
  font-size: 14px;
  color: #666;
  margin-bottom: 32px;
}

.cancel-search-btn {
  padding: 12px 32px;
  background: #f5f5f5;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  color: #666;
}

/* TRACKING VIEW */
.tracking-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.map-area {
  flex: 1;
  min-height: 45vh;
  background: #e8f5ef;
}

.map-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #00a86b;
  font-size: 14px;
}

.driver-card {
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 20px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
}

.status-bar {
  text-align: center;
  margin-bottom: 16px;
}

.status-text {
  font-size: 16px;
  font-weight: 600;
  color: #00a86b;
}

.driver-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 12px;
  margin-bottom: 16px;
}

.driver-avatar {
  width: 48px;
  height: 48px;
  background: #e0e0e0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.driver-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.driver-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.driver-vehicle {
  font-size: 13px;
  color: #666;
}

.driver-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #00a86b;
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.trip-info-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 12px;
  margin-bottom: 16px;
}

.trip-point {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #1a1a1a;
}

.point-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.point-dot.green {
  background: #00a86b;
}
.point-dot.red {
  background: #e53935;
}

.card-actions {
  display: flex;
  gap: 12px;
}

.sos-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
  background: #ffebee;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #e53935;
}

.cancel-btn {
  flex: 1;
  padding: 12px;
  background: #f5f5f5;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  color: #666;
}

/* RATING VIEW */
.rating-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.rating-content {
  text-align: center;
  padding: 20px;
}

.rating-title {
  font-size: 28px;
  font-weight: 700;
  color: #00a86b;
  margin-bottom: 8px;
}

.rating-subtitle {
  font-size: 16px;
  color: #666;
  margin-bottom: 32px;
}

.stars-container {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 32px;
}

.star-btn {
  background: transparent;
  border: none;
  padding: 4px;
  transition: transform 0.2s;
}

.star-btn:active {
  transform: scale(1.2);
}

.rating-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.submit-rating-btn {
  width: 100%;
  padding: 16px;
  background: #00a86b;
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
}

.submit-rating-btn:disabled {
  background: #ccc;
}

.skip-btn {
  padding: 12px;
  background: transparent;
  border: none;
  font-size: 14px;
  color: #666;
}

/* EMPTY STATE */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  color: #999;
  font-size: 14px;
}

/* SKELETON LOADING */
.vehicles-loading {
  display: flex;
  gap: 10px;
  width: 100%;
}

.skeleton-card {
  flex: 1;
  height: 120px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 14px;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* DRIVER AVATAR */
.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.driver-rating {
  font-size: 12px;
  color: #666;
}
</style>
