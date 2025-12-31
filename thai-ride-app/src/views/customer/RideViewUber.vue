<script setup lang="ts">
/**
 * Feature: F02 - Uber-Style Ride Booking (Enhanced)
 * UI: Clean, Modern, Mobile-First
 * Flow: 1.ไปไหน? → 2.เลือกรถ+จอง → 3.ติดตาม
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

// ========== STATE ==========
const currentStep = ref<"where" | "confirm" | "searching" | "tracking">(
  "where"
);
const pickup = ref<GeoLocation | null>(null);
const destination = ref<GeoLocation | null>(null);
const searchQuery = ref("");
const isSearching = ref(false);
const searchResults = ref<
  Array<{ id: string; name: string; address: string; lat: number; lng: number }>
>([]);
const selectedVehicle = ref<"economy" | "standard" | "premium">("standard");
const isBooking = ref(false);
const isGettingLocation = ref(false);
const showPaymentSheet = ref(false);
const showPromoSheet = ref(false);
const promoCode = ref("");
const promoDiscount = ref(0);
const selectedPayment = ref<"wallet" | "cash">("wallet");
const searchingSeconds = ref(0);
let searchingInterval: ReturnType<typeof setInterval> | null = null;

// Fare calculation
const estimatedFare = ref(0);
const estimatedTime = ref(0);
const estimatedDistance = ref(0);

// Active ride tracking
const activeRide = ref<any>(null);
const matchedDriver = ref<any>(null);
const driverETA = ref(0);
let realtimeChannel: any = null;

// Vehicle options with SVG icons
const vehicles = [
  {
    id: "economy",
    name: "ประหยัด",
    multiplier: 0.7,
    eta: "2-4",
    desc: "มอเตอร์ไซค์",
    seats: 1,
    type: "bike",
  },
  {
    id: "standard",
    name: "สบาย",
    multiplier: 1.0,
    eta: "4-6",
    desc: "รถยนต์ 4 ที่นั่ง",
    seats: 4,
    type: "car",
  },
  {
    id: "premium",
    name: "พรีเมียม",
    multiplier: 1.5,
    eta: "5-8",
    desc: "รถหรู",
    seats: 4,
    type: "premium",
  },
] as const;

// ========== COMPUTED ==========
const canConfirm = computed(() => pickup.value && destination.value);
const selectedVehicleInfo = computed(() =>
  vehicles.find((v) => v.id === selectedVehicle.value)
);
const baseFare = computed(() =>
  Math.round(estimatedFare.value * (selectedVehicleInfo.value?.multiplier || 1))
);
const finalFare = computed(() =>
  Math.max(0, baseFare.value - promoDiscount.value)
);
const hasEnoughBalance = computed(
  () =>
    selectedPayment.value === "cash" || (balance.value ?? 0) >= finalFare.value
);
const statusText = computed(() => {
  if (!activeRide.value) return "";
  const s = activeRide.value.status;
  if (s === "pending") return "กำลังหาคนขับให้คุณ...";
  if (s === "matched") return "พบคนขับแล้ว!";
  if (s === "arriving") return `คนขับกำลังมารับ (${driverETA.value} นาที)`;
  if (s === "picked_up") return "รับผู้โดยสารแล้ว";
  if (s === "in_progress") return "กำลังเดินทาง...";
  return s;
});

// ========== LIFECYCLE ==========
onMounted(async () => {
  getCurrentLocation();
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

// Watch for ride status changes
watch(
  () => activeRide.value?.status,
  (newStatus) => {
    if (newStatus === "matched" || newStatus === "arriving") {
      driverETA.value = 5; // Initial ETA
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
      // Try reverse geocoding
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
        );
        const data = await response.json();
        if (data.display_name) {
          pickup.value!.address = data.display_name
            .split(",")
            .slice(0, 2)
            .join(", ");
        }
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

async function checkActiveRide() {
  if (!authStore.user?.id) return;
  const { data } = await supabase
    .from("ride_requests")
    .select("*, service_providers(*)")
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
    .single();
  if (data) {
    activeRide.value = data;
    matchedDriver.value = data.service_providers;
    currentStep.value = data.status === "pending" ? "searching" : "tracking";
    setupRealtimeTracking(data.id);
  }
}

function setupRealtimeTracking(rideId: string) {
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
        if (
          payload.new.status === "completed" ||
          payload.new.status === "cancelled"
        ) {
          currentStep.value = "where";
          activeRide.value = null;
          matchedDriver.value = null;
        } else if (payload.new.status !== "pending") {
          currentStep.value = "tracking";
        }
      }
    )
    .subscribe();
}

async function searchPlaces() {
  if (searchQuery.value.length < 2) {
    searchResults.value = [];
    return;
  }
  isSearching.value = true;
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
  isSearching.value = false;
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
  searchQuery.value = "";
  searchResults.value = [];
  calculateFare();
  currentStep.value = "confirm";
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
  const base = 35;
  const perKm = 12;
  estimatedFare.value = Math.round(base + dist * perKm);
}

async function applyPromo() {
  if (!promoCode.value.trim()) return;
  // Simulate promo validation
  if (promoCode.value.toUpperCase() === "RIDE50") {
    promoDiscount.value = 50;
  } else if (promoCode.value.toUpperCase() === "FIRST") {
    promoDiscount.value = Math.round(baseFare.value * 0.2);
  } else {
    promoDiscount.value = 0;
    alert("รหัสโปรโมชั่นไม่ถูกต้อง");
    return;
  }
  showPromoSheet.value = false;
}

async function bookRide() {
  if (!pickup.value || !destination.value || !authStore.user) return;
  if (!hasEnoughBalance.value) {
    alert("ยอดเงินในกระเป๋าไม่เพียงพอ");
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
      setupRealtimeTracking(ride.id);
      await rideStore.findAndMatchDriver();
    }
  } catch (err) {
    console.error("Booking error:", err);
    alert("ไม่สามารถจองได้ กรุณาลองใหม่");
    currentStep.value = "confirm";
  } finally {
    isBooking.value = false;
    if (searchingInterval) {
      clearInterval(searchingInterval);
      searchingInterval = null;
    }
  }
}

async function cancelRide() {
  if (!activeRide.value) return;
  if (!confirm("ยกเลิกการเดินทาง?")) return;
  const success = await rideStore.cancelRide(activeRide.value.id);
  if (success) {
    activeRide.value = null;
    matchedDriver.value = null;
    currentStep.value = "where";
    destination.value = null;
  }
}

function goBack() {
  if (currentStep.value === "confirm") {
    currentStep.value = "where";
    destination.value = null;
    promoDiscount.value = 0;
    promoCode.value = "";
  } else if (currentStep.value === "searching") {
    cancelRide();
  } else {
    router.back();
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
</script>

<template>
  <div class="ride-app">
    <!-- ========== SEARCHING STATE ========== -->
    <div v-if="currentStep === 'searching'" class="searching-view">
      <div class="searching-content">
        <div class="pulse-ring">
          <div class="pulse-dot"></div>
        </div>
        <h2>กำลังหาคนขับ...</h2>
        <p class="search-time">{{ formatTime(searchingSeconds) }}</p>
        <div class="search-info">
          <div class="info-row">
            <span class="label">ประเภทรถ</span>
            <span class="value">{{ selectedVehicleInfo?.name }}</span>
          </div>
          <div class="info-row">
            <span class="label">ราคา</span>
            <span class="value price">฿{{ finalFare }}</span>
          </div>
        </div>
        <button class="cancel-search-btn" @click="cancelRide">ยกเลิก</button>
      </div>
    </div>

    <!-- ========== TRACKING STATE ========== -->
    <div v-else-if="currentStep === 'tracking'" class="tracking-view">
      <div class="tracking-header">
        <div class="status-pill" :class="activeRide?.status">
          <div class="status-dot"></div>
          <span>{{ statusText }}</span>
        </div>
      </div>

      <!-- Driver Card -->
      <div v-if="matchedDriver" class="driver-card-enhanced">
        <div class="driver-main">
          <div class="driver-avatar">
            <span>{{ matchedDriver.first_name?.[0] || "?" }}</span>
            <div class="rating-badge">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                />
              </svg>
              <span>4.9</span>
            </div>
          </div>
          <div class="driver-details">
            <h3>
              {{ matchedDriver.first_name }} {{ matchedDriver.last_name?.[0] }}.
            </h3>
            <p class="vehicle-info">
              {{ matchedDriver.vehicle_plate_number || "กข-1234" }}
            </p>
            <p class="vehicle-desc">{{ selectedVehicleInfo?.desc }}</p>
          </div>
        </div>
        <div class="driver-actions">
          <a
            :href="`tel:${matchedDriver.phone_number || '0800000000'}`"
            class="action-btn call"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
              />
            </svg>
          </a>
          <button class="action-btn msg">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Route Summary -->
      <div class="route-card-enhanced">
        <div class="route-visual">
          <div class="route-line-bg"></div>
          <div class="route-stop pickup">
            <div class="stop-marker green"></div>
            <div class="stop-info">
              <span class="stop-label">จุดรับ</span>
              <span class="stop-address">{{
                activeRide?.pickup_address || pickup?.address
              }}</span>
            </div>
          </div>
          <div class="route-stop dest">
            <div class="stop-marker red"></div>
            <div class="stop-info">
              <span class="stop-label">จุดหมาย</span>
              <span class="stop-address">{{
                activeRide?.destination_address || destination?.address
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Trip Info -->
      <div class="trip-summary">
        <div class="summary-item">
          <span class="s-value">{{ estimatedDistance.toFixed(1) }} กม.</span>
          <span class="s-label">ระยะทาง</span>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-item">
          <span class="s-value">{{ estimatedTime }} นาที</span>
          <span class="s-label">เวลาโดยประมาณ</span>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-item">
          <span class="s-value price"
            >฿{{ activeRide?.estimated_fare || finalFare }}</span
          >
          <span class="s-label">ค่าโดยสาร</span>
        </div>
      </div>

      <button class="cancel-ride-btn" @click="cancelRide">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
        ยกเลิกการเดินทาง
      </button>
    </div>

    <!-- ========== BOOKING FLOW ========== -->
    <div v-else class="booking-flow">
      <!-- Header -->
      <header class="app-header">
        <button class="back-btn" @click="goBack" aria-label="กลับ">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1>{{ currentStep === "where" ? "ไปไหนดี?" : "ยืนยันการจอง" }}</h1>
        <div class="header-spacer"></div>
      </header>

      <!-- Step 1: Where to? -->
      <div v-if="currentStep === 'where'" class="step-where">
        <div class="location-inputs">
          <div class="input-row">
            <div class="input-marker green"></div>
            <div class="input-content">
              <span class="input-label">จุดรับ</span>
              <span class="input-value">{{
                pickup?.address || "กำลังหาตำแหน่ง..."
              }}</span>
            </div>
            <div v-if="isGettingLocation" class="input-spinner"></div>
            <button
              v-else
              class="input-action"
              @click="getCurrentLocation"
              aria-label="รีเฟรชตำแหน่ง"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
          <div class="input-connector"></div>
          <div class="input-row dest-row">
            <div class="input-marker red"></div>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="ค้นหาจุดหมายปลายทาง..."
              class="dest-input"
              @input="searchPlaces"
            />
          </div>
        </div>

        <!-- Search Results -->
        <div v-if="searchResults.length" class="search-results">
          <div
            v-for="place in searchResults"
            :key="place.id"
            class="result-item"
            @click="selectDestination(place)"
          >
            <div class="result-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                />
              </svg>
            </div>
            <div class="result-content">
              <span class="result-name">{{ place.name }}</span>
              <span class="result-address">{{ place.address }}</span>
            </div>
            <svg
              class="result-arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>

        <!-- Quick Picks -->
        <div v-else class="quick-section">
          <!-- Saved Places -->
          <div v-if="savedPlaces?.length" class="section-block">
            <h3 class="section-title">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                />
              </svg>
              สถานที่บันทึก
            </h3>
            <div class="saved-grid">
              <button
                v-for="place in savedPlaces.slice(0, 4)"
                :key="place.id"
                class="saved-card"
                @click="selectDestination(place)"
              >
                <div class="saved-icon" :class="place.place_type">
                  <svg
                    v-if="place.place_type === 'home'"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                  </svg>
                  <svg
                    v-else-if="place.place_type === 'work'"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"
                    />
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                    />
                  </svg>
                </div>
                <span class="saved-name">{{ place.name }}</span>
              </button>
            </div>
          </div>

          <!-- Recent Places -->
          <div v-if="recentPlaces?.length" class="section-block">
            <h3 class="section-title">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9z"
                />
              </svg>
              เดินทางล่าสุด
            </h3>
            <div class="recent-list">
              <button
                v-for="place in recentPlaces.slice(0, 3)"
                :key="place.id"
                class="recent-item"
                @click="selectDestination(place)"
              >
                <div class="recent-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                    />
                  </svg>
                </div>
                <div class="recent-content">
                  <span class="recent-name">{{ place.name }}</span>
                  <span class="recent-address">{{ place.address }}</span>
                </div>
                <svg
                  class="recent-arrow"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-if="!savedPlaces?.length && !recentPlaces?.length"
            class="empty-state"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <p>ค้นหาจุดหมายปลายทางด้านบน</p>
          </div>
        </div>
      </div>

      <!-- Step 2: Confirm Booking -->
      <div v-else-if="currentStep === 'confirm'" class="step-confirm">
        <!-- Route Card -->
        <div class="confirm-route-card">
          <div class="route-visual">
            <div class="route-line-bg"></div>
            <div class="route-stop pickup">
              <div class="stop-marker green"></div>
              <div class="stop-info">
                <span class="stop-label">จุดรับ</span>
                <span class="stop-address">{{ pickup?.address }}</span>
              </div>
            </div>
            <div class="route-stop dest">
              <div class="stop-marker red"></div>
              <div class="stop-info">
                <span class="stop-label">จุดหมาย</span>
                <span class="stop-address">{{ destination?.address }}</span>
              </div>
            </div>
          </div>
          <div class="route-meta">
            <span class="meta-item">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                />
              </svg>
              {{ estimatedDistance.toFixed(1) }} กม.
            </span>
            <span class="meta-item">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"
                />
              </svg>
              ~{{ estimatedTime }} นาที
            </span>
          </div>
        </div>

        <!-- Vehicle Selection -->
        <div class="vehicle-section">
          <h3 class="section-title">เลือกประเภทรถ</h3>
          <div class="vehicle-list">
            <button
              v-for="v in vehicles"
              :key="v.id"
              class="vehicle-card"
              :class="{ selected: selectedVehicle === v.id }"
              @click="selectedVehicle = v.id"
            >
              <div class="vehicle-icon" :class="v.type">
                <svg
                  v-if="v.type === 'bike'"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4.48L19 10.35V7zM7 17c-.55 0-1-.45-1-1h2c0 .55-.45 1-1 1z"
                  />
                  <path
                    d="M5 6h5v2H5zm14 7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"
                  />
                </svg>
                <svg
                  v-else-if="v.type === 'car'"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"
                  />
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"
                  />
                  <path d="M12 2l-1 3h2l-1-3z" fill="#FFD700" />
                </svg>
              </div>
              <div class="vehicle-info">
                <span class="vehicle-name">{{ v.name }}</span>
                <span class="vehicle-desc">{{ v.desc }}</span>
                <span class="vehicle-eta">{{ v.eta }} นาที</span>
              </div>
              <div class="vehicle-price">
                <span class="price-value"
                  >฿{{ Math.round(estimatedFare * v.multiplier) }}</span
                >
              </div>
              <div v-if="selectedVehicle === v.id" class="selected-check">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
            </button>
          </div>
        </div>

        <!-- Payment & Promo -->
        <div class="payment-section">
          <button class="payment-row" @click="showPaymentSheet = true">
            <div class="payment-icon" :class="selectedPayment">
              <svg
                v-if="selectedPayment === 'wallet'"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
                />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"
                />
              </svg>
            </div>
            <div class="payment-info">
              <span class="payment-label">ชำระเงิน</span>
              <span class="payment-value">{{
                selectedPayment === "wallet"
                  ? `กระเป๋าเงิน (฿${balance?.toLocaleString() || 0})`
                  : "เงินสด"
              }}</span>
            </div>
            <svg
              class="payment-arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          <button class="promo-row" @click="showPromoSheet = true">
            <div class="promo-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"
                />
              </svg>
            </div>
            <div class="promo-info">
              <span class="promo-label">โปรโมชั่น</span>
              <span
                class="promo-value"
                :class="{ active: promoDiscount > 0 }"
                >{{
                  promoDiscount > 0
                    ? `ลด ฿${promoDiscount}`
                    : "ใส่รหัสโปรโมชั่น"
                }}</span
              >
            </div>
            <svg
              class="promo-arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        <!-- Book Button -->
        <div class="book-footer">
          <div class="fare-summary">
            <span class="fare-label">ค่าโดยสาร</span>
            <div class="fare-amount">
              <span v-if="promoDiscount > 0" class="fare-original"
                >฿{{ baseFare }}</span
              >
              <span class="fare-final">฿{{ finalFare }}</span>
            </div>
          </div>
          <button
            class="book-btn"
            :disabled="isBooking || !hasEnoughBalance"
            @click="bookRide"
          >
            <span v-if="isBooking" class="btn-spinner"></span>
            <span v-else>{{
              hasEnoughBalance ? "จองเลย" : "ยอดเงินไม่พอ"
            }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Payment Sheet -->
    <Teleport to="body">
      <div
        v-if="showPaymentSheet"
        class="sheet-overlay"
        @click="showPaymentSheet = false"
      >
        <div class="sheet-content" @click.stop>
          <div class="sheet-handle"></div>
          <h3 class="sheet-title">เลือกวิธีชำระเงิน</h3>
          <div class="sheet-options">
            <button
              class="sheet-option"
              :class="{ selected: selectedPayment === 'wallet' }"
              @click="
                selectedPayment = 'wallet';
                showPaymentSheet = false;
              "
            >
              <div class="option-icon wallet">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
                  />
                </svg>
              </div>
              <div class="option-info">
                <span class="option-name">กระเป๋าเงิน</span>
                <span class="option-balance"
                  >ยอดคงเหลือ ฿{{ balance?.toLocaleString() || 0 }}</span
                >
              </div>
              <div v-if="selectedPayment === 'wallet'" class="option-check">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
            </button>
            <button
              class="sheet-option"
              :class="{ selected: selectedPayment === 'cash' }"
              @click="
                selectedPayment = 'cash';
                showPaymentSheet = false;
              "
            >
              <div class="option-icon cash">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"
                  />
                </svg>
              </div>
              <div class="option-info">
                <span class="option-name">เงินสด</span>
                <span class="option-desc">ชำระเงินกับคนขับ</span>
              </div>
              <div v-if="selectedPayment === 'cash'" class="option-check">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Promo Sheet -->
    <Teleport to="body">
      <div
        v-if="showPromoSheet"
        class="sheet-overlay"
        @click="showPromoSheet = false"
      >
        <div class="sheet-content" @click.stop>
          <div class="sheet-handle"></div>
          <h3 class="sheet-title">ใส่รหัสโปรโมชั่น</h3>
          <div class="promo-input-group">
            <input
              v-model="promoCode"
              type="text"
              placeholder="รหัสโปรโมชั่น"
              class="promo-input"
            />
            <button class="promo-apply-btn" @click="applyPromo">ใช้งาน</button>
          </div>
          <p class="promo-hint">ลอง: RIDE50 หรือ FIRST</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* ========== BASE ========== */
.ride-app {
  min-height: 100vh;
  min-height: 100dvh;
  background: #f5f5f5;
  padding-bottom: env(safe-area-inset-bottom);
}

/* ========== SEARCHING VIEW ========== */
.searching-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #00a86b 0%, #008f5b 100%);
  padding: 24px;
}
.searching-content {
  text-align: center;
  color: white;
}
.pulse-ring {
  width: 120px;
  height: 120px;
  margin: 0 auto 32px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pulse-ring::before,
.pulse-ring::after {
  content: "";
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.3);
  animation: pulse-ring 2s ease-out infinite;
}
.pulse-ring::after {
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
.pulse-dot {
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 50%;
  animation: pulse-dot 1s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}
.searching-content h2 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
}
.search-time {
  font-size: 48px;
  font-weight: 300;
  margin-bottom: 32px;
  opacity: 0.9;
}
.search-info {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 16px 24px;
  margin-bottom: 32px;
}
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}
.info-row .label {
  opacity: 0.8;
}
.info-row .value {
  font-weight: 600;
}
.info-row .value.price {
  font-size: 20px;
}
.cancel-search-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  padding: 14px 48px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

/* ========== TRACKING VIEW ========== */
.tracking-view {
  padding: 16px;
  padding-top: calc(16px + env(safe-area-inset-top));
}
.tracking-header {
  margin-bottom: 16px;
}
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #e8f5ef;
  color: #00a86b;
  padding: 10px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
}
.status-pill.in_progress {
  background: #fff3e0;
  color: #f5a623;
}
.status-dot {
  width: 8px;
  height: 8px;
  background: currentColor;
  border-radius: 50%;
  animation: pulse-dot 1s infinite;
}
.driver-card-enhanced {
  background: white;
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}
.driver-main {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.driver-avatar {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #00a86b, #008f5b);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  font-weight: 700;
  position: relative;
}
.rating-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: white;
  border-radius: 12px;
  padding: 2px 6px;
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 11px;
  font-weight: 700;
  color: #1a1a1a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
.rating-badge svg {
  width: 12px;
  height: 12px;
  color: #f5a623;
}
.driver-details h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 4px;
}
.vehicle-info {
  font-size: 16px;
  font-weight: 600;
  color: #00a86b;
}
.vehicle-desc {
  font-size: 13px;
  color: #666;
}
.driver-actions {
  display: flex;
  gap: 12px;
}
.action-btn {
  flex: 1;
  height: 48px;
  border-radius: 12px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  text-decoration: none;
}
.action-btn svg {
  width: 24px;
  height: 24px;
}
.action-btn.call {
  background: #00a86b;
  color: white;
}
.action-btn.msg {
  background: #f5f5f5;
  color: #666;
}
.route-card-enhanced {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
}
.route-visual {
  position: relative;
  padding-left: 32px;
}
.route-line-bg {
  position: absolute;
  left: 11px;
  top: 20px;
  bottom: 20px;
  width: 2px;
  background: linear-gradient(180deg, #00a86b 0%, #e53935 100%);
}
.route-stop {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
}
.route-stop.pickup {
  margin-bottom: 16px;
}
.stop-marker {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  position: absolute;
  left: 0;
}
.stop-marker.green {
  background: #00a86b;
}
.stop-marker.red {
  background: #e53935;
}
.stop-info {
  flex: 1;
}
.stop-label {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 2px;
}
.stop-address {
  font-size: 14px;
  color: #1a1a1a;
  font-weight: 500;
}
.trip-summary {
  display: flex;
  background: white;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
}
.summary-item {
  flex: 1;
  text-align: center;
}
.s-value {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}
.s-value.price {
  color: #00a86b;
}
.s-label {
  font-size: 12px;
  color: #999;
}
.summary-divider {
  width: 1px;
  background: #e8e8e8;
  margin: 0 8px;
}
.cancel-ride-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: #fff5f5;
  color: #e53935;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
.cancel-ride-btn svg {
  width: 20px;
  height: 20px;
}

/* ========== BOOKING FLOW ========== */
.booking-flow {
  background: white;
  min-height: 100vh;
}
.app-header {
  display: flex;
  align-items: center;
  padding: 16px;
  padding-top: calc(16px + env(safe-area-inset-top));
  border-bottom: 1px solid #f0f0f0;
}
.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}
.back-btn svg {
  width: 24px;
  height: 24px;
  color: #1a1a1a;
}
.app-header h1 {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}
.header-spacer {
  width: 40px;
}

/* Step Where */
.step-where {
  padding: 16px;
}
.location-inputs {
  background: #f5f5f5;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 24px;
}
.input-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
}
.input-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
.input-marker.green {
  background: #00a86b;
}
.input-marker.red {
  background: #e53935;
}
.input-content {
  flex: 1;
  min-width: 0;
}
.input-label {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 2px;
}
.input-value {
  font-size: 14px;
  color: #1a1a1a;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.input-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e8e8e8;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.input-action {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
}
.input-action svg {
  width: 20px;
  height: 20px;
  color: #00a86b;
}
.input-connector {
  width: 2px;
  height: 16px;
  background: #ddd;
  margin-left: 5px;
}
.dest-row {
  border-top: 1px solid #e8e8e8;
  padding-top: 16px;
}
.dest-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 15px;
  color: #1a1a1a;
  outline: none;
}
.dest-input::placeholder {
  color: #999;
}

/* Search Results */
.search-results {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}
.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}
.result-item:last-child {
  border-bottom: none;
}
.result-item:active {
  background: #f5f5f5;
}
.result-icon {
  width: 40px;
  height: 40px;
  background: #e8f5ef;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.result-icon svg {
  width: 20px;
  height: 20px;
  color: #00a86b;
}
.result-content {
  flex: 1;
  min-width: 0;
}
.result-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}
.result-address {
  font-size: 13px;
  color: #666;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.result-arrow {
  width: 20px;
  height: 20px;
  color: #ccc;
}

/* Quick Section */
.section-block {
  margin-bottom: 24px;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 12px;
}
.section-title svg {
  width: 20px;
  height: 20px;
  color: #00a86b;
}
.saved-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.saved-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: #f5f5f5;
  border: none;
  border-radius: 16px;
  cursor: pointer;
}
.saved-card:active {
  background: #e8e8e8;
}
.saved-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.saved-icon svg {
  width: 24px;
  height: 24px;
}
.saved-icon.home {
  background: #e3f2fd;
  color: #2196f3;
}
.saved-icon.work {
  background: #fff3e0;
  color: #f5a623;
}
.saved-icon:not(.home):not(.work) {
  background: #e8f5ef;
  color: #00a86b;
}
.saved-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
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
  padding: 14px 16px;
  background: #f5f5f5;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
}
.recent-item:active {
  background: #e8e8e8;
}
.recent-icon {
  width: 40px;
  height: 40px;
  background: #e8f5ef;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.recent-icon svg {
  width: 20px;
  height: 20px;
  color: #00a86b;
}
.recent-content {
  flex: 1;
  min-width: 0;
}
.recent-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}
.recent-address {
  font-size: 13px;
  color: #666;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.recent-arrow {
  width: 20px;
  height: 20px;
  color: #ccc;
}
.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: #999;
}
.empty-state svg {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}
.empty-state p {
  font-size: 15px;
}

/* Step Confirm */
.step-confirm {
  padding: 16px;
  padding-bottom: 120px;
}
.confirm-route-card {
  background: #f5f5f5;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
}
.route-meta {
  display: flex;
  gap: 16px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e8e8e8;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #666;
}
.meta-item svg {
  width: 18px;
  height: 18px;
  color: #00a86b;
}
.vehicle-section {
  margin-bottom: 24px;
}
.vehicle-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.vehicle-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 16px;
  cursor: pointer;
  position: relative;
  text-align: left;
}
.vehicle-card.selected {
  border-color: #00a86b;
  background: #e8f5ef;
}
.vehicle-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vehicle-icon svg {
  width: 32px;
  height: 32px;
}
.vehicle-icon.bike {
  background: #e3f2fd;
  color: #2196f3;
}
.vehicle-icon.car {
  background: #e8f5ef;
  color: #00a86b;
}
.vehicle-icon.premium {
  background: #fff3e0;
  color: #f5a623;
}
.vehicle-info {
  flex: 1;
}
.vehicle-name {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
}
.vehicle-desc {
  font-size: 13px;
  color: #666;
}
.vehicle-eta {
  font-size: 12px;
  color: #00a86b;
  font-weight: 600;
}
.vehicle-price {
  text-align: right;
}
.price-value {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}
.selected-check {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  background: #00a86b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.selected-check svg {
  width: 16px;
  height: 16px;
  color: white;
}
.payment-section {
  margin-bottom: 24px;
}
.payment-row,
.promo-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px;
  background: #f5f5f5;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  margin-bottom: 12px;
}
.payment-icon,
.promo-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.payment-icon svg,
.promo-icon svg {
  width: 24px;
  height: 24px;
}
.payment-icon.wallet {
  background: #e8f5ef;
  color: #00a86b;
}
.payment-icon.cash {
  background: #fff3e0;
  color: #f5a623;
}
.promo-icon {
  background: #ffebee;
  color: #e53935;
}
.payment-info,
.promo-info {
  flex: 1;
}
.payment-label,
.promo-label {
  display: block;
  font-size: 12px;
  color: #999;
}
.payment-value,
.promo-value {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}
.promo-value.active {
  color: #00a86b;
}
.payment-arrow,
.promo-arrow {
  width: 20px;
  height: 20px;
  color: #ccc;
}
.book-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  border-top: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 16px;
}
.fare-summary {
  flex: 1;
}
.fare-label {
  font-size: 12px;
  color: #999;
}
.fare-amount {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.fare-original {
  font-size: 14px;
  color: #999;
  text-decoration: line-through;
}
.fare-final {
  font-size: 24px;
  font-weight: 700;
  color: #00a86b;
}
.book-btn {
  flex: 1;
  height: 56px;
  background: #00a86b;
  color: white;
  border: none;
  border-radius: 14px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.book-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
.btn-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Sheets */
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}
.sheet-content {
  width: 100%;
  background: white;
  border-radius: 24px 24px 0 0;
  padding: 16px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
  animation: slideUp 0.3s ease;
}
@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
.sheet-handle {
  width: 40px;
  height: 4px;
  background: #e8e8e8;
  border-radius: 2px;
  margin: 0 auto 16px;
}
.sheet-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 16px;
  text-align: center;
}
.sheet-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sheet-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
}
.sheet-option.selected {
  border-color: #00a86b;
  background: #e8f5ef;
}
.option-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.option-icon svg {
  width: 24px;
  height: 24px;
}
.option-icon.wallet {
  background: #e8f5ef;
  color: #00a86b;
}
.option-icon.cash {
  background: #fff3e0;
  color: #f5a623;
}
.option-info {
  flex: 1;
}
.option-name {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}
.option-balance,
.option-desc {
  font-size: 13px;
  color: #666;
}
.option-check {
  width: 28px;
  height: 28px;
  background: #00a86b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.option-check svg {
  width: 18px;
  height: 18px;
  color: white;
}
.promo-input-group {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}
.promo-input {
  flex: 1;
  padding: 14px 16px;
  border: 2px solid #e8e8e8;
  border-radius: 12px;
  font-size: 16px;
  outline: none;
}
.promo-input:focus {
  border-color: #00a86b;
}
.promo-apply-btn {
  padding: 14px 24px;
  background: #00a86b;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
.promo-hint {
  font-size: 13px;
  color: #999;
  text-align: center;
}
</style>
