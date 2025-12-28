<script setup lang="ts">
/**
 * Feature: F02 - Customer Ride Booking (Uber-Style Simple)
 * MUNEEF Style UI - Clean and Modern
 *
 * Simple Flow like Uber:
 * - แผนที่เต็มจอ
 * - Bottom sheet เล็กๆ: จุดรับ + จุดส่ง
 * - ปุ่มตัวเลือก: ไปรับตอนนี้, สำหรับฉัน
 */
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import MapView from "../components/MapView.vue";
import RideTracker from "../components/RideTracker.vue";
import LocationPicker from "../components/LocationPicker.vue";
import type { GeoLocation } from "../composables/useLocation";
import { useRideStore } from "../stores/ride";
import { useAuthStore } from "../stores/auth";
import { useServices } from "../composables/useServices";

const router = useRouter();
const rideStore = useRideStore();
const authStore = useAuthStore();
const { homePlace, workPlace, fetchSavedPlaces, fetchRecentPlaces } =
  useServices();

// ============================================
// VIEW MODES
// ============================================
type ViewMode =
  | "HOME"
  | "SEARCH_PICKUP"
  | "SEARCH_DEST"
  | "CHOOSE_RIDE"
  | "REQUESTING"
  | "TRACKING";
const viewMode = ref<ViewMode>("HOME");

// ============================================
// LOCATION STATES
// ============================================
const pickupLocation = ref<GeoLocation | null>(null);
const destinationLocation = ref<GeoLocation | null>(null);
const pickupAddress = ref("");
const destinationAddress = ref("");
const currentGpsLocation = ref<{ lat: number; lng: number } | null>(null);

// ============================================
// UI STATES
// ============================================
const isLoading = ref(false);
const showScheduleDropdown = ref(false);
const showPassengerDropdown = ref(false);
const passengerCount = ref(1);
const scheduleOption = ref<"now" | "later">("now");
const scheduledTime = ref<string | null>(null);

// Tracking ID - เก็บไว้แสดงใน REQUESTING mode
const trackingId = ref<string | null>(null);

// ============================================
// RIDE TYPE SELECTION
// ============================================
const selectedRideType = ref<"standard" | "premium" | "shared">("standard");
const estimatedFare = ref(0);
const estimatedTime = ref(0);
const estimatedDistance = ref(0);

// ============================================
// COMPUTED
// ============================================
const canProceed = computed(
  () => pickupLocation.value && destinationLocation.value
);

// ============================================
// LIFECYCLE
// ============================================
onMounted(async () => {
  // Check for active ride
  if (authStore.user?.id) {
    await rideStore.initialize(authStore.user.id);
    if (rideStore.hasActiveRide) {
      viewMode.value = "TRACKING";
    }
  }

  // Fetch saved places
  if (authStore.user?.id) {
    await Promise.all([
      fetchSavedPlaces(authStore.user.id),
      fetchRecentPlaces(authStore.user.id),
    ]);
  }

  // Check for pending destination from services page
  const pendingDest = rideStore.consumeDestination();
  if (pendingDest) {
    destinationLocation.value = { lat: pendingDest.lat, lng: pendingDest.lng };
    destinationAddress.value = pendingDest.address;
  }
});

onUnmounted(() => {
  // Cleanup if needed
});

// ============================================
// HANDLERS
// ============================================
const handleLocationDetected = (location: { lat: number; lng: number }) => {
  currentGpsLocation.value = location;
  if (!pickupLocation.value) {
    pickupLocation.value = location;
    pickupAddress.value = "ตำแหน่งปัจจุบัน";
  }
};

const handleRouteCalculated = (data: {
  distance: number;
  duration: number;
}) => {
  estimatedDistance.value = data.distance;
  estimatedTime.value = data.duration;
  estimatedFare.value = rideStore.calculateFare(
    data.distance,
    selectedRideType.value
  );
};

const openPickupSearch = () => {
  viewMode.value = "SEARCH_PICKUP";
};

const openDestinationSearch = () => {
  viewMode.value = "SEARCH_DEST";
};

const handlePickupSelected = (place: {
  lat: number;
  lng: number;
  address: string;
}) => {
  pickupLocation.value = { lat: place.lat, lng: place.lng };
  pickupAddress.value = place.address;
  viewMode.value = "HOME";
};

const handleDestinationSelected = (place: {
  lat: number;
  lng: number;
  address: string;
}) => {
  destinationLocation.value = { lat: place.lat, lng: place.lng };
  destinationAddress.value = place.address;

  // If both locations set, go to ride selection
  if (pickupLocation.value) {
    viewMode.value = "CHOOSE_RIDE";
  } else {
    viewMode.value = "HOME";
  }
};

const closeSearch = () => {
  viewMode.value = "HOME";
};

const proceedToRideSelection = () => {
  if (canProceed.value) {
    viewMode.value = "CHOOSE_RIDE";
  }
};

const selectRideType = (type: "standard" | "premium" | "shared") => {
  selectedRideType.value = type;
  if (estimatedDistance.value > 0) {
    estimatedFare.value = rideStore.calculateFare(
      estimatedDistance.value,
      type
    );
  }
};

const requestRide = async () => {
  if (
    !authStore.user?.id ||
    !pickupLocation.value ||
    !destinationLocation.value
  )
    return;

  isLoading.value = true;
  viewMode.value = "REQUESTING";

  try {
    const result = await rideStore.createRideRequest(
      authStore.user.id,
      {
        lat: pickupLocation.value.lat,
        lng: pickupLocation.value.lng,
        address: pickupAddress.value,
      },
      {
        lat: destinationLocation.value.lat,
        lng: destinationLocation.value.lng,
        address: destinationAddress.value,
      },
      selectedRideType.value,
      passengerCount.value,
      undefined,
      scheduleOption.value === "later"
        ? scheduledTime.value || undefined
        : undefined
    );

    if (result) {
      // เก็บ tracking ID ไว้แสดงใน UI
      trackingId.value = result.trackingId;

      // Keep in REQUESTING mode while finding driver
      // Start finding driver (this may take time)
      const driver = await rideStore.findAndMatchDriver();

      // Only go to TRACKING if driver found
      if (driver) {
        viewMode.value = "TRACKING";
      }
      // If no driver found, stay in REQUESTING mode
    } else {
      viewMode.value = "CHOOSE_RIDE";
    }
  } catch (err) {
    console.error("Request ride error:", err);
    viewMode.value = "CHOOSE_RIDE";
  } finally {
    isLoading.value = false;
  }
};

const cancelRequest = async () => {
  isLoading.value = true;
  try {
    await rideStore.cancelRide();
    viewMode.value = "HOME";
    pickupLocation.value = null;
    destinationLocation.value = null;
    pickupAddress.value = "";
    destinationAddress.value = "";
    trackingId.value = null;
  } finally {
    isLoading.value = false;
  }
};

const goBack = () => {
  if (viewMode.value === "CHOOSE_RIDE") {
    viewMode.value = "HOME";
  } else if (viewMode.value === "REQUESTING") {
    cancelRequest();
  } else {
    router.back();
  }
};

// Ride type options
const rideTypes = [
  { id: "shared", name: "ประหยัด", icon: "users", multiplier: 0.8 },
  { id: "standard", name: "มาตรฐาน", icon: "car", multiplier: 1 },
  { id: "premium", name: "พรีเมียม", icon: "star", multiplier: 1.5 },
];
</script>

<template>
  <div class="ride-uber-container">
    <!-- ============================================ -->
    <!-- TRACKING MODE - Show RideTracker -->
    <!-- ============================================ -->
    <RideTracker
      v-if="viewMode === 'TRACKING' && rideStore.currentRide"
      :ride="rideStore.currentRide"
      :driver="rideStore.matchedDriver"
      @cancel="cancelRequest"
      @complete="() => (viewMode = 'HOME')"
    />

    <!-- ============================================ -->
    <!-- SEARCH MODE - Location Picker -->
    <!-- ============================================ -->
    <div
      v-else-if="viewMode === 'SEARCH_PICKUP' || viewMode === 'SEARCH_DEST'"
      class="search-fullscreen"
    >
      <LocationPicker
        :type="viewMode === 'SEARCH_PICKUP' ? 'pickup' : 'destination'"
        :title="viewMode === 'SEARCH_PICKUP' ? 'เลือกจุดรับ' : 'เลือกจุดหมาย'"
        :initial-location="
          viewMode === 'SEARCH_PICKUP' ? pickupLocation : destinationLocation
        "
        :home-place="homePlace"
        :work-place="workPlace"
        @confirm="
          viewMode === 'SEARCH_PICKUP'
            ? handlePickupSelected($event)
            : handleDestinationSelected($event)
        "
        @close="closeSearch"
      />
    </div>

    <!-- ============================================ -->
    <!-- HOME / CHOOSE_RIDE / REQUESTING MODE -->
    <!-- ============================================ -->
    <template v-else>
      <!-- Full Screen Map -->
      <div class="map-fullscreen">
        <MapView
          :pickup="pickupLocation"
          :destination="destinationLocation"
          :show-route="!!pickupLocation && !!destinationLocation"
          :draggable="viewMode === 'HOME'"
          height="100%"
          @location-detected="handleLocationDetected"
          @route-calculated="handleRouteCalculated"
        />
      </div>

      <!-- Header Bar (floating) -->
      <div class="floating-header">
        <!-- Back Button -->
        <button class="header-btn back-btn" @click="goBack">
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

        <!-- Title -->
        <h1 class="header-title">เรียกรถ</h1>

        <!-- Home Button -->
        <button class="header-btn home-btn" @click="router.push('/customer')">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9,22 9,12 15,12 15,22" />
          </svg>
        </button>
      </div>

      <!-- Brand Badge -->
      <div class="brand-badge">
        <span class="brand-text">GOBEAR</span>
      </div>

      <!-- ============================================ -->
      <!-- HOME MODE - Simple Bottom Sheet -->
      <!-- ============================================ -->
      <div v-if="viewMode === 'HOME'" class="bottom-sheet home-sheet">
        <!-- Header -->
        <div class="sheet-header">
          <h2 class="sheet-title">เรียกรถ</h2>
        </div>

        <!-- Location Inputs -->
        <div class="location-inputs">
          <!-- Pickup -->
          <div class="location-row" @click="openPickupSearch">
            <div class="location-icon pickup-icon">
              <div class="dot green"></div>
            </div>
            <div class="location-text">
              <span :class="{ placeholder: !pickupAddress }">
                {{ pickupAddress || "จุดรับ" }}
              </span>
            </div>
          </div>

          <!-- Divider -->
          <div class="location-divider">
            <div class="divider-line"></div>
          </div>

          <!-- Destination -->
          <div class="location-row" @click="openDestinationSearch">
            <div class="location-icon dest-icon">
              <div class="square red"></div>
            </div>
            <div class="location-text">
              <span :class="{ placeholder: !destinationAddress }">
                {{ destinationAddress || "จุดส่ง" }}
              </span>
            </div>
          </div>
        </div>

        <!-- Option Buttons -->
        <div class="option-buttons">
          <button
            class="option-btn"
            :class="{ active: scheduleOption === 'now' }"
            @click="scheduleOption = 'now'"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span>ไปรับตอนนี้</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          <button
            class="option-btn"
            @click="showPassengerDropdown = !showPassengerDropdown"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>สำหรับฉัน</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>

        <!-- Quick Proceed Button (if both locations set) -->
        <button
          v-if="canProceed"
          class="proceed-btn"
          @click="proceedToRideSelection"
        >
          ดูราคา
        </button>
      </div>

      <!-- ============================================ -->
      <!-- CHOOSE_RIDE MODE - Ride Selection Sheet -->
      <!-- ============================================ -->
      <div
        v-else-if="viewMode === 'CHOOSE_RIDE'"
        class="bottom-sheet ride-sheet"
      >
        <!-- Route Summary -->
        <div class="route-summary">
          <div class="route-info-row">
            <span class="route-label">{{ pickupAddress }}</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            <span class="route-label">{{ destinationAddress }}</span>
          </div>
          <div class="route-stats">
            <span>{{ estimatedDistance.toFixed(1) }} กม.</span>
            <span class="dot-separator">•</span>
            <span>{{ estimatedTime }} นาที</span>
          </div>
        </div>

        <!-- Ride Type Selection -->
        <div class="ride-types">
          <div
            v-for="type in rideTypes"
            :key="type.id"
            class="ride-type-card"
            :class="{ selected: selectedRideType === type.id }"
            @click="
              selectRideType(type.id as 'standard' | 'premium' | 'shared')
            "
          >
            <div class="ride-type-icon">
              <svg
                v-if="type.icon === 'car'"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path d="M5 17h14v-5l-2-4H7l-2 4v5z" />
                <circle cx="7.5" cy="17.5" r="1.5" />
                <circle cx="16.5" cy="17.5" r="1.5" />
              </svg>
              <svg
                v-else-if="type.icon === 'users'"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
                <polygon
                  points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                />
              </svg>
            </div>
            <div class="ride-type-info">
              <span class="ride-type-name">{{ type.name }}</span>
              <span class="ride-type-price"
                >฿{{ Math.round(estimatedFare * type.multiplier) }}</span
              >
            </div>
            <div v-if="selectedRideType === type.id" class="check-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Request Button -->
        <button class="request-btn" :disabled="isLoading" @click="requestRide">
          <span v-if="!isLoading"
            >เรียก
            {{ rideTypes.find((t) => t.id === selectedRideType)?.name }}</span
          >
          <span v-else class="loading-text">
            <span class="spinner"></span>
            กำลังค้นหา...
          </span>
        </button>
      </div>

      <!-- ============================================ -->
      <!-- REQUESTING MODE - Searching for Driver -->
      <!-- ============================================ -->
      <div
        v-else-if="viewMode === 'REQUESTING'"
        class="bottom-sheet requesting-sheet"
      >
        <!-- Header with status -->
        <div class="requesting-header">
          <div class="status-indicator">
            <div class="search-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <span class="status-text">กำลังค้นหาคนขับ</span>
            <div class="status-dot"></div>
          </div>
        </div>

        <!-- Map Section (smaller) -->
        <div class="requesting-map">
          <MapView
            :pickup="pickupLocation"
            :destination="destinationLocation"
            :show-route="true"
            height="200px"
          />
        </div>

        <!-- Share Trip Button -->
        <button class="share-trip-btn">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>แชร์การเดินทาง</span>
        </button>

        <!-- Route Info -->
        <div class="route-details">
          <!-- Pickup -->
          <div class="route-point">
            <div class="point-marker pickup">
              <div class="marker-dot"></div>
            </div>
            <div class="point-info">
              <span class="point-label">จุดรับ</span>
              <span class="point-address">{{
                pickupAddress || "ตำแหน่งปัจจุบัน"
              }}</span>
            </div>
          </div>

          <!-- Line connector -->
          <div class="route-line"></div>

          <!-- Destination -->
          <div class="route-point">
            <div class="point-marker destination">
              <div class="marker-dot"></div>
            </div>
            <div class="point-info">
              <span class="point-label">จุดหมาย</span>
              <span class="point-address">{{ destinationAddress }}</span>
            </div>
          </div>
        </div>

        <!-- Fare Info -->
        <div class="fare-row">
          <span class="fare-label">ค่าโดยสาร</span>
          <span class="fare-amount">฿{{ estimatedFare }}</span>
        </div>

        <!-- Tracking ID -->
        <div v-if="trackingId" class="tracking-id-row">
          <span class="tracking-label">รหัสติดตาม</span>
          <span class="tracking-value">{{ trackingId }}</span>
        </div>

        <!-- Cancel Button -->
        <button class="cancel-ride-btn" @click="cancelRequest">
          ยกเลิกการเดินทาง
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ============================================ */
/* CONTAINER */
/* ============================================ */
.ride-uber-container {
  position: fixed;
  inset: 0;
  background: #f5f5f5;
  overflow: hidden;
}

/* ============================================ */
/* FULL SCREEN MAP */
/* ============================================ */
.map-fullscreen {
  position: absolute;
  inset: 0;
  z-index: 1;
}

/* ============================================ */
/* FLOATING HEADER */
/* ============================================ */
.floating-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top, 0px));
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(255, 255, 255, 0) 100%
  );
}

.header-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #fff;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  color: #1a1a1a;
}

.header-btn:active {
  transform: scale(0.95);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.header-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

/* ============================================ */
/* BRAND BADGE */
/* ============================================ */
.brand-badge {
  position: absolute;
  bottom: 280px;
  right: 16px;
  z-index: 100;
  background: #00a86b;
  padding: 8px 16px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 168, 107, 0.3);
}

.brand-text {
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
}

/* ============================================ */
/* BOTTOM SHEET - BASE */
/* ============================================ */
.bottom-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: #fff;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
}

/* ============================================ */
/* HOME SHEET */
/* ============================================ */
.home-sheet {
  min-height: 240px;
}

.sheet-header {
  margin-bottom: 16px;
}

.sheet-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

/* Location Inputs */
.location-inputs {
  background: #f5f5f5;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 16px;
}

.location-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  cursor: pointer;
  transition: background 0.2s;
  border-radius: 8px;
}

.location-row:active {
  background: #e8e8e8;
}

.location-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot.green {
  background: #00a86b;
}

.square {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.square.red {
  background: #e53935;
}

.location-text {
  flex: 1;
  font-size: 15px;
  color: #1a1a1a;
}

.location-text .placeholder {
  color: #999;
}

.location-divider {
  padding: 0 12px 0 36px;
}

.divider-line {
  height: 1px;
  background: #e0e0e0;
}

/* Option Buttons */
.option-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.option-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  background: #f5f5f5;
  border: none;
  border-radius: 24px;
  font-size: 13px;
  font-weight: 500;
  color: #1a1a1a;
  cursor: pointer;
  transition: background 0.2s;
}

.option-btn:active {
  background: #e8e8e8;
}

.option-btn.active {
  background: #e8f5ef;
  color: #00a86b;
}

.option-btn svg {
  flex-shrink: 0;
}

/* Proceed Button */
.proceed-btn {
  width: 100%;
  padding: 16px;
  background: #00a86b;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}

.proceed-btn:active {
  background: #008f5b;
  transform: scale(0.98);
}

/* ============================================ */
/* RIDE SELECTION SHEET */
/* ============================================ */
.ride-sheet {
  max-height: 70vh;
  overflow-y: auto;
}

.route-summary {
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 16px;
}

.route-info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.route-label {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #999;
}

.dot-separator {
  font-size: 8px;
}

/* Ride Types */
.ride-types {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.ride-type-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.ride-type-card:active {
  transform: scale(0.98);
}

.ride-type-card.selected {
  background: #e8f5ef;
  border-color: #00a86b;
}

.ride-type-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 12px;
}

.ride-type-card.selected .ride-type-icon {
  background: #00a86b;
}

.ride-type-card.selected .ride-type-icon svg {
  stroke: #fff;
}

.ride-type-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ride-type-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.ride-type-price {
  font-size: 14px;
  color: #666;
}

.ride-type-card.selected .ride-type-price {
  color: #00a86b;
  font-weight: 600;
}

.check-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00a86b;
}

/* Request Button */
.request-btn {
  width: 100%;
  padding: 18px;
  background: #00a86b;
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.request-btn:active:not(:disabled) {
  background: #008f5b;
  transform: scale(0.98);
}

.request-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* ============================================ */
/* REQUESTING SHEET - New Design */
/* ============================================ */
.requesting-sheet {
  max-height: 85vh;
  overflow-y: auto;
  padding: 0;
}

.requesting-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-icon {
  width: 44px;
  height: 44px;
  background: #1a1a1a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.status-text {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.status-dot {
  width: 10px;
  height: 10px;
  background: #00a86b;
  border-radius: 50%;
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

.requesting-map {
  width: 100%;
  height: 200px;
  background: #f5f5f5;
}

.share-trip-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: calc(100% - 40px);
  margin: 16px 20px;
  padding: 14px;
  background: #fff;
  border: 2px solid #00a86b;
  border-radius: 12px;
  color: #00a86b;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.share-trip-btn:active {
  background: #e8f5ef;
}

.route-details {
  padding: 16px 20px;
  position: relative;
}

.route-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
}

.point-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.point-marker.pickup {
  background: #00a86b;
}

.point-marker.destination {
  background: #e53935;
}

.point-marker .marker-dot {
  display: none;
}

.route-line {
  position: absolute;
  left: 25px;
  top: 40px;
  bottom: 40px;
  width: 2px;
  background: #e0e0e0;
}

.point-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.point-label {
  font-size: 12px;
  color: #999;
}

.point-address {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.fare-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
}

.fare-label {
  font-size: 14px;
  color: #666;
}

.fare-amount {
  font-size: 20px;
  font-weight: 700;
  color: #00a86b;
}

.tracking-id-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #f8f8f8;
  margin: 0 20px;
  border-radius: 8px;
}

.tracking-label {
  font-size: 13px;
  color: #666;
}

.tracking-value {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  font-family: "SF Mono", "Monaco", "Inconsolata", monospace;
  letter-spacing: 0.5px;
}

.cancel-ride-btn {
  width: calc(100% - 40px);
  margin: 16px 20px;
  padding: 16px;
  background: transparent;
  color: #e53935;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-ride-btn:active {
  background: #fee;
}

/* ============================================ */
/* SEARCH FULLSCREEN */
/* ============================================ */
.search-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: #fff;
}

/* ============================================ */
/* ANIMATIONS */
/* ============================================ */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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

/* ============================================ */
/* SAFE AREA */
/* ============================================ */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .bottom-sheet {
    padding-bottom: calc(20px + env(safe-area-inset-bottom));
  }
}
</style>
