<script setup lang="ts">
/**
 * Feature: F02 - Uber-Style Ride Booking
 * UI: Clean, Minimal, Fast - 2 Steps Only
 * Flow: 1.ไปไหน? → 2.เลือกรถ+จอง
 */
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import { useRideStore } from "../../stores/ride";
import { useServices } from "../../composables/useServices";
import { useLocation, type GeoLocation } from "../../composables/useLocation";
import { supabase } from "../../lib/supabase";

const router = useRouter();
const authStore = useAuthStore();
const rideStore = useRideStore();
const { calculateDistance, calculateTravelTime } = useLocation();
const { savedPlaces, recentPlaces, fetchSavedPlaces, fetchRecentPlaces } =
  useServices();

// ========== STATE ==========
const currentStep = ref<"where" | "confirm">("where");
const pickup = ref<GeoLocation | null>(null);
const destination = ref<GeoLocation | null>(null);
const searchQuery = ref("");
const isSearching = ref(false);
const searchResults = ref<
  Array<{ id: string; name: string; address: string; lat: number; lng: number }>
>([]);
const selectedVehicle = ref<"standard" | "premium" | "economy">("standard");
const isBooking = ref(false);
const isGettingLocation = ref(false);

// Fare calculation
const estimatedFare = ref(0);
const estimatedTime = ref(0);
const estimatedDistance = ref(0);

// Active ride tracking
const activeRide = ref<any>(null);
const matchedDriver = ref<any>(null);

// Vehicle options
const vehicles = [
  {
    id: "economy",
    name: "ประหยัด",
    icon: "🛵",
    multiplier: 0.7,
    eta: "3 นาที",
    desc: "มอเตอร์ไซค์",
  },
  {
    id: "standard",
    name: "สบาย",
    icon: "🚗",
    multiplier: 1.0,
    eta: "5 นาที",
    desc: "รถยนต์ 4 ที่นั่ง",
  },
  {
    id: "premium",
    name: "พรีเมียม",
    icon: "✨",
    multiplier: 1.5,
    eta: "7 นาที",
    desc: "รถหรู",
  },
] as const;

// ========== COMPUTED ==========
const canConfirm = computed(() => pickup.value && destination.value);
const selectedVehicleInfo = computed(() =>
  vehicles.find((v) => v.id === selectedVehicle.value)
);
const finalFare = computed(() =>
  Math.round(estimatedFare.value * (selectedVehicleInfo.value?.multiplier || 1))
);

// ========== LIFECYCLE ==========
onMounted(async () => {
  getCurrentLocation();
  if (authStore.user?.id) {
    await Promise.all([fetchSavedPlaces(), fetchRecentPlaces(5)]);
    await checkActiveRide();
  }
});

onUnmounted(() => {
  rideStore.unsubscribeAll();
});

// ========== METHODS ==========
async function getCurrentLocation() {
  if (!navigator.geolocation) return;
  isGettingLocation.value = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      pickup.value = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        address: "ตำแหน่งปัจจุบัน",
      };
      isGettingLocation.value = false;
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
  }
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
  const baseFare = 35;
  const perKm = 12;
  estimatedFare.value = Math.round(baseFare + dist * perKm);
}

async function bookRide() {
  if (!pickup.value || !destination.value || !authStore.user) return;
  isBooking.value = true;
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
      await rideStore.findAndMatchDriver();
    }
  } catch (err) {
    console.error("Booking error:", err);
    alert("ไม่สามารถจองได้ กรุณาลองใหม่");
  } finally {
    isBooking.value = false;
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
  }
}

function goBack() {
  if (currentStep.value === "confirm") {
    currentStep.value = "where";
    destination.value = null;
  } else {
    router.back();
  }
}
</script>

<template>
  <div class="uber-ride">
    <!-- Active Ride View -->
    <div v-if="activeRide" class="ride-tracking">
      <div class="tracking-header">
        <div class="status-badge" :class="activeRide.status">
          {{
            activeRide.status === "pending"
              ? "กำลังหาคนขับ..."
              : activeRide.status === "matched"
              ? "พบคนขับแล้ว!"
              : activeRide.status === "arriving"
              ? "คนขับกำลังมา"
              : activeRide.status === "picked_up"
              ? "รับผู้โดยสารแล้ว"
              : "กำลังเดินทาง"
          }}
        </div>
      </div>
      <div v-if="matchedDriver" class="driver-card">
        <div class="driver-avatar">
          {{ matchedDriver.first_name?.[0] || "?" }}
        </div>
        <div class="driver-info">
          <div class="driver-name">
            {{ matchedDriver.first_name }} {{ matchedDriver.last_name }}
          </div>
          <div class="driver-vehicle">
            {{ matchedDriver.vehicle_plate_number }}
          </div>
        </div>
        <a :href="`tel:${matchedDriver.phone_number}`" class="call-btn">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
            />
          </svg>
        </a>
      </div>
      <div class="route-summary">
        <div class="route-point">
          <div class="point-dot pickup"></div>
          <div class="point-text">{{ activeRide.pickup_address }}</div>
        </div>
        <div class="route-line"></div>
        <div class="route-point">
          <div class="point-dot dest"></div>
          <div class="point-text">{{ activeRide.destination_address }}</div>
        </div>
      </div>
      <button class="cancel-btn" @click="cancelRide">ยกเลิกการเดินทาง</button>
    </div>

    <!-- Booking Flow -->
    <template v-else>
      <div class="uber-header">
        <button class="back-btn" @click="goBack">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1>{{ currentStep === "where" ? "ไปไหน?" : "ยืนยันการจอง" }}</h1>
        <div class="spacer"></div>
      </div>
    </template>
  </div>
</template>

<!-- Step 1: Where to? -->
<template v-if="currentStep === 'where'">
  <div class="search-section">
    <div class="location-row pickup">
      <div class="loc-dot green"></div>
      <div class="loc-text">
        <span class="loc-label">จุดรับ</span>
        <span class="loc-address">{{
          pickup?.address || "กำลังหาตำแหน่ง..."
        }}</span>
      </div>
      <button v-if="isGettingLocation" class="loc-loading">
        <div class="spinner"></div>
      </button>
    </div>
    <div class="location-row dest">
      <div class="loc-dot red"></div>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="ค้นหาจุดหมาย..."
        class="dest-input"
        @input="searchPlaces"
      />
    </div>
  </div>
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
      <div class="result-text">
        <div class="result-name">{{ place.name }}</div>
        <div class="result-address">{{ place.address }}</div>
      </div>
    </div>
  </div>
  <div v-if="!searchQuery" class="quick-picks">
    <div v-if="savedPlaces?.length" class="picks-section">
      <h3>สถานที่บันทึก</h3>
      <div class="picks-grid">
        <div
          v-for="place in savedPlaces.slice(0, 4)"
          :key="place.id"
          class="pick-card"
          @click="selectDestination(place)"
        >
          <div class="pick-icon">
            {{
              place.place_type === "home"
                ? "🏠"
                : place.place_type === "work"
                ? "💼"
                : "📍"
            }}
          </div>
          <div class="pick-name">{{ place.name }}</div>
        </div>
      </div>
    </div>
    <div v-if="recentPlaces?.length" class="picks-section">
      <h3>ล่าสุด</h3>
      <div
        v-for="place in recentPlaces.slice(0, 3)"
        :key="place.id"
        class="recent-item"
        @click="selectDestination(place)"
      >
        <div class="recent-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"
            />
          </svg>
        </div>
        <div class="recent-text">
          <div class="recent-name">{{ place.name }}</div>
          <div class="recent-address">{{ place.address }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

      <!-- Step 2: Confirm -->
      <template v-if="currentStep === 'confirm'">
        <div class="confirm-section">
          <div class="route-card">
            <div class="route-point">
              <div class="point-dot green"></div>
              <div class="point-info"><span class="point-label">จุดรับ</span><span class="point-address">{{ pickup?.address }}</span></div>
            </div>
            <div class="route-divider"></div>
            <div class="route-point">
              <div class="point-dot red"></div>
              <div class="point-info"><span class="point-label">จุดหมาย</span><span class="point-address">{{ destination?.address }}</span></div>
            </div>
          </div>
          <div class="vehicle-section">
            <h3>เลือกประเภทรถ</h3>
            <div class="vehicle-list">
              <div v-for="v in vehicles" :key="v.id" :class="['vehicle-card', { selected: selectedVehicle === v.id }]" @click="selectedVehicle = v.id as any">
                <div class="v-icon">{{ v.icon }}</div>
                <div class="v-info"><div class="v-name">{{ v.name }}</div><div class="v-desc">{{ v.desc }} · {{ v.eta }}</div></div>
                <div class="v-price">฿{{ Math.round(estimatedFare * v.multiplier) }}</div>
              </div>
            </div>
          </div>
          <div class="trip-info">
            <div class="info-item"><span class="info-label">ระยะทาง</span><span class="info-value">{{ estimatedDistance.toFixed(1) }} กม.</span></div>
            <div class="info-item"><span class="info-label">เวลาโดยประมาณ</span><span class="info-value">{{ estimatedTime }} นาที</span></div>
          </div>
        </div>
        <div class="book-footer">
          <button class="book-btn" :disabled="isBooking || !canConfirm" @click="bookRide">
            <span v-if="isBooking">กำลังจอง...</span>
            <span v-else>จองเลย · ฿{{ finalFare }}</span>
          </button>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.uber-ride { min-height: 100vh; background: #fff; display: flex; flex-direction: column; }
.uber-header { display: flex; align-items: center; padding: 16px; gap: 12px; border-bottom: 1px solid #f0f0f0; }
.uber-header h1 { flex: 1; font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 0; }
.back-btn { width: 40px; height: 40px; border: none; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.back-btn svg { width: 24px; height: 24px; color: #1a1a1a; }
.spacer { width: 40px; }
.search-section { padding: 16px; background: #f8f8f8; }
.location-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #fff; border-radius: 12px; margin-bottom: 8px; }
.location-row:last-child { margin-bottom: 0; }
.loc-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.loc-dot.green { background: #00A86B; }
.loc-dot.red { background: #E53935; }
.loc-text { flex: 1; display: flex; flex-direction: column; }
.loc-label { font-size: 12px; color: #999; }
.loc-address { font-size: 15px; color: #1a1a1a; }
.dest-input { flex: 1; border: none; outline: none; font-size: 16px; background: transparent; }
.dest-input::placeholder { color: #999; }
.loc-loading { background: none; border: none; }
.spinner { width: 20px; height: 20px; border: 2px solid #e0e0e0; border-top-color: #00A86B; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.search-results { padding: 8px 16px; }
.result-item { display: flex; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
.result-item:active { background: #f8f8f8; }
.result-icon { width: 40px; height: 40px; background: #f0f0f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.result-icon svg { width: 20px; height: 20px; color: #666; }
.result-text { flex: 1; }
.result-name { font-size: 15px; font-weight: 500; color: #1a1a1a; }
.result-address { font-size: 13px; color: #999; margin-top: 2px; }

.quick-picks { padding: 16px; flex: 1; overflow-y: auto; }
.picks-section { margin-bottom: 24px; }
.picks-section h3 { font-size: 14px; font-weight: 600; color: #666; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px; }
.picks-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.pick-card { display: flex; flex-direction: column; align-items: center; padding: 16px 8px; background: #f8f8f8; border-radius: 12px; cursor: pointer; transition: background 0.2s; }
.pick-card:active { background: #e8e8e8; }
.pick-icon { font-size: 24px; margin-bottom: 8px; }
.pick-name { font-size: 12px; color: #1a1a1a; text-align: center; }
.recent-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
.recent-item:active { background: #f8f8f8; }
.recent-icon { width: 36px; height: 36px; background: #f0f0f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.recent-icon svg { width: 18px; height: 18px; color: #666; }
.recent-text { flex: 1; }
.recent-name { font-size: 15px; color: #1a1a1a; }
.recent-address { font-size: 13px; color: #999; }
.confirm-section { flex: 1; padding: 16px; overflow-y: auto; padding-bottom: 100px; }
.route-card { background: #f8f8f8; border-radius: 16px; padding: 16px; margin-bottom: 20px; }
.route-point { display: flex; align-items: flex-start; gap: 12px; }
.point-dot { width: 12px; height: 12px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; }
.point-dot.green { background: #00A86B; }
.point-dot.red { background: #E53935; }
.point-info { flex: 1; }
.point-label { font-size: 12px; color: #999; display: block; }
.point-address { font-size: 15px; color: #1a1a1a; font-weight: 500; }
.route-divider { width: 2px; height: 24px; background: #e0e0e0; margin: 4px 0 4px 5px; }

.vehicle-section { margin-bottom: 20px; }
.vehicle-section h3 { font-size: 16px; font-weight: 600; color: #1a1a1a; margin: 0 0 12px; }
.vehicle-list { display: flex; flex-direction: column; gap: 8px; }
.vehicle-card { display: flex; align-items: center; gap: 12px; padding: 16px; background: #f8f8f8; border-radius: 12px; border: 2px solid transparent; cursor: pointer; transition: all 0.2s; }
.vehicle-card.selected { background: #E8F5EF; border-color: #00A86B; }
.vehicle-card:active { transform: scale(0.98); }
.v-icon { font-size: 28px; }
.v-info { flex: 1; }
.v-name { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.v-desc { font-size: 13px; color: #666; margin-top: 2px; }
.v-price { font-size: 18px; font-weight: 700; color: #00A86B; }
.trip-info { display: flex; gap: 16px; padding: 16px; background: #f8f8f8; border-radius: 12px; }
.info-item { flex: 1; text-align: center; }
.info-label { font-size: 12px; color: #999; display: block; }
.info-value { font-size: 16px; font-weight: 600; color: #1a1a1a; margin-top: 4px; }
.book-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 16px; background: #fff; border-top: 1px solid #f0f0f0; padding-bottom: calc(16px + env(safe-area-inset-bottom)); }
.book-btn { width: 100%; padding: 18px; background: #1a1a1a; color: #fff; border: none; border-radius: 12px; font-size: 17px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.book-btn:active { transform: scale(0.98); background: #333; }
.book-btn:disabled { background: #ccc; cursor: not-allowed; }

.ride-tracking { padding: 16px; min-height: 100vh; background: #fff; }
.tracking-header { margin-bottom: 20px; }
.status-badge { display: inline-block; padding: 8px 16px; background: #E8F5EF; color: #00A86B; border-radius: 20px; font-size: 14px; font-weight: 600; }
.status-badge.pending { background: #FFF3E0; color: #F57C00; }
.status-badge.matched { background: #E8F5EF; color: #00A86B; }
.driver-card { display: flex; align-items: center; gap: 12px; padding: 16px; background: #f8f8f8; border-radius: 16px; margin-bottom: 16px; }
.driver-avatar { width: 56px; height: 56px; background: #00A86B; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 600; }
.driver-info { flex: 1; }
.driver-name { font-size: 18px; font-weight: 600; color: #1a1a1a; }
.driver-vehicle { font-size: 14px; color: #666; margin-top: 2px; }
.call-btn { width: 48px; height: 48px; background: #00A86B; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; }
.call-btn svg { width: 24px; height: 24px; }
.route-summary { padding: 16px; background: #f8f8f8; border-radius: 16px; margin-bottom: 20px; }
.route-summary .route-point { display: flex; align-items: center; gap: 12px; }
.route-summary .point-dot { width: 10px; height: 10px; border-radius: 50%; }
.route-summary .point-dot.pickup { background: #00A86B; }
.route-summary .point-dot.dest { background: #E53935; }
.route-summary .point-text { font-size: 14px; color: #1a1a1a; }
.route-line { width: 2px; height: 20px; background: #e0e0e0; margin: 4px 0 4px 4px; }
.cancel-btn { width: 100%; padding: 16px; background: #fff; color: #E53935; border: 2px solid #E53935; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 20px; }
.cancel-btn:active { background: #FFEBEE; }
@media (max-width: 380px) { .picks-grid { grid-template-columns: repeat(3, 1fr); } .v-icon { font-size: 24px; } .v-price { font-size: 16px; } }
</style>
