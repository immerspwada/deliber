<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import MapView from "../components/MapView.vue";
import LocationPermissionModal from "../components/LocationPermissionModal.vue";
import { useLocation, type GeoLocation } from "../composables/useLocation";
import { useServices } from "../composables/useServices";
import { useRideStore } from "../stores/ride";
import { useAuthStore } from "../stores/auth";
import { useToast } from "../composables/useToast";
import { useWallet } from "../composables/useWallet";
import { useLoyalty } from "../composables/useLoyalty";
import { supabase } from "../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

const router = useRouter();
const rideStore = useRideStore();
const authStore = useAuthStore();
const { showSuccess, showError, showWarning, showInfo } = useToast();
const { getCurrentPosition, shouldShowPermissionModal } = useLocation();
const {
  homePlace,
  workPlace,
  recentPlaces,
  fetchSavedPlaces,
  fetchRecentPlaces,
} = useServices();
const { balance, fetchBalance } = useWallet();
const { summary: loyaltySummary, fetchSummary: fetchLoyaltySummary } =
  useLoyalty();

const loading = ref(false);
const pickupLocation = ref<GeoLocation | null>(null);
const showLocationPermission = ref(false);
const isLoaded = ref(false);

// Pull to refresh
const isRefreshing = ref(false);
const pullDistance = ref(0);
const isPulling = ref(false);
const startY = ref(0);
const PULL_THRESHOLD = 80;

const DEFAULT_LOCATION = { lat: 6.0296, lng: 101.9653, address: "สุไหงโก-ลก" };

// Active orders tracking
interface ActiveOrder {
  id: string;
  type: "ride" | "delivery" | "shopping" | "queue" | "moving" | "laundry";
  typeName: string;
  status: string;
  statusText: string;
  from: string;
  to: string;
  trackingPath: string;
}

const activeOrders = ref<ActiveOrder[]>([]);
const loadingOrders = ref(true);
let realtimeChannel: RealtimeChannel | null = null;

// Main services - บริการหลัก
const mainServices = [
  {
    id: "ride",
    name: "เรียกรถ",
    route: "/customer/ride",
    color: "#00A86B",
    description: "รถยนต์ส่วนตัว",
  },
  {
    id: "delivery",
    name: "ส่งของ",
    route: "/customer/delivery",
    color: "#F5A623",
    description: "ส่งพัสดุด่วน",
  },
  {
    id: "shopping",
    name: "ซื้อของ",
    route: "/customer/shopping",
    color: "#E53935",
    description: "ฝากซื้อสินค้า",
  },
];

// Additional services - บริการเพิ่มเติม
const additionalServices = [
  {
    id: "queue",
    name: "จองคิว",
    route: "/customer/queue-booking",
    color: "#9C27B0",
    description: "จองคิวร้านค้า/โรงพยาบาล",
  },
  {
    id: "moving",
    name: "ขนย้าย",
    route: "/customer/moving",
    color: "#2196F3",
    description: "บริการยกของ/ขนย้าย",
  },
  {
    id: "laundry",
    name: "ซักรีด",
    route: "/customer/laundry",
    color: "#00BCD4",
    description: "รับ-ส่งซักผ้า",
  },
];

const savedPlaces = computed(() => [
  {
    id: "home",
    name: homePlace.value?.name || "บ้าน",
    place: homePlace.value,
    icon: "home",
  },
  {
    id: "work",
    name: workPlace.value?.name || "ที่ทำงาน",
    place: workPlace.value,
    icon: "work",
  },
]);

const displayRecentPlaces = computed(() => recentPlaces.value.slice(0, 3));
const walletBalance = computed(() => balance.value?.balance || 0);
const loyaltyPoints = computed(() => loyaltySummary.value?.current_points || 0);

const getStatusText = (type: string, status: string): string => {
  const statusMap: Record<string, Record<string, string>> = {
    ride: {
      pending: "กำลังหาคนขับ",
      matched: "คนขับกำลังมา",
      arrived: "คนขับถึงแล้ว",
      in_progress: "กำลังเดินทาง",
    },
    delivery: {
      pending: "กำลังหาไรเดอร์",
      matched: "ไรเดอร์กำลังมารับ",
      picked_up: "รับของแล้ว",
      in_transit: "กำลังจัดส่ง",
    },
    shopping: {
      pending: "กำลังหาคนซื้อ",
      matched: "กำลังซื้อของ",
      purchased: "ซื้อเสร็จแล้ว",
      delivering: "กำลังจัดส่ง",
    },
    queue: {
      pending: "รอยืนยัน",
      confirmed: "ยืนยันแล้ว",
      in_progress: "กำลังดำเนินการ",
    },
    moving: {
      pending: "รอรับงาน",
      matched: "กำลังมารับ",
      in_progress: "กำลังขนย้าย",
    },
    laundry: {
      pending: "รอรับผ้า",
      picked_up: "รับผ้าแล้ว",
      washing: "กำลังซัก",
      ready: "พร้อมส่ง",
    },
  };
  return statusMap[type]?.[status] || status;
};

const fetchActiveOrders = async () => {
  if (!authStore.user?.id) return;
  loadingOrders.value = true;

  try {
    const userId = authStore.user.id;
    const orders: ActiveOrder[] = [];

    // Fetch active rides
    const { data: rides } = await (supabase.from("ride_requests") as any)
      .select("id, status, pickup_address, destination_address")
      .eq("user_id", userId)
      .in("status", ["pending", "matched", "arrived", "in_progress"])
      .limit(3);

    rides?.forEach((r: any) => {
      orders.push({
        id: r.id,
        type: "ride",
        typeName: "เรียกรถ",
        status: r.status,
        statusText: getStatusText("ride", r.status),
        from: r.pickup_address?.split(",")[0] || "",
        to: r.destination_address?.split(",")[0] || "",
        trackingPath: `/customer/ride`,
      });
    });

    // Fetch active deliveries
    const { data: deliveries } = await (
      supabase.from("delivery_requests") as any
    )
      .select("id, status, sender_address, recipient_address")
      .eq("user_id", userId)
      .in("status", ["pending", "matched", "picked_up", "in_transit"])
      .limit(3);

    deliveries?.forEach((d: any) => {
      orders.push({
        id: d.id,
        type: "delivery",
        typeName: "ส่งของ",
        status: d.status,
        statusText: getStatusText("delivery", d.status),
        from: d.sender_address?.split(",")[0] || "",
        to: d.recipient_address?.split(",")[0] || "",
        trackingPath: `/tracking/${d.id}`,
      });
    });

    // Fetch active shopping
    const { data: shopping } = await (supabase.from("shopping_requests") as any)
      .select("id, status, store_name, delivery_address")
      .eq("user_id", userId)
      .in("status", ["pending", "matched", "purchased", "delivering"])
      .limit(3);

    shopping?.forEach((s: any) => {
      orders.push({
        id: s.id,
        type: "shopping",
        typeName: "ซื้อของ",
        status: s.status,
        statusText: getStatusText("shopping", s.status),
        from: s.store_name || "ร้านค้า",
        to: s.delivery_address?.split(",")[0] || "",
        trackingPath: `/tracking/${s.id}`,
      });
    });

    activeOrders.value = orders.slice(0, 3);
  } catch (err) {
    console.error("Error fetching active orders:", err);
  } finally {
    loadingOrders.value = false;
  }
};

// Pull to refresh handlers
const handleTouchStart = (e: TouchEvent) => {
  const scrollTop = document.querySelector(".services-page")?.scrollTop || 0;
  if (scrollTop <= 0 && e.touches[0]) {
    startY.value = e.touches[0].clientY;
    isPulling.value = true;
  }
};

const handleTouchMove = (e: TouchEvent) => {
  if (!isPulling.value || isRefreshing.value || !e.touches[0]) return;
  const currentY = e.touches[0].clientY;
  const diff = currentY - startY.value;
  if (diff > 0) {
    pullDistance.value = Math.min(diff * 0.5, PULL_THRESHOLD * 1.5);
    if (pullDistance.value > 10) e.preventDefault();
  }
};

const handleTouchEnd = async () => {
  if (!isPulling.value) return;
  isPulling.value = false;

  if (pullDistance.value >= PULL_THRESHOLD && !isRefreshing.value) {
    isRefreshing.value = true;
    pullDistance.value = PULL_THRESHOLD;
    await refreshData();
    isRefreshing.value = false;
  }
  pullDistance.value = 0;
};

const refreshData = async () => {
  await Promise.all([
    fetchSavedPlaces(true),
    fetchRecentPlaces(5, true),
    fetchActiveOrders(),
    fetchBalance(),
    fetchLoyaltySummary(),
  ]);
  showSuccess("รีเฟรชข้อมูลแล้ว");
};

const getCurrentLocation = async () => {
  const shouldShow = await shouldShowPermissionModal();
  if (shouldShow) {
    showLocationPermission.value = true;
    return;
  }
  await fetchCurrentLocation();
};

const fetchCurrentLocation = async () => {
  loading.value = true;
  try {
    const location = await getCurrentPosition();
    pickupLocation.value = location;
  } catch (error) {
    console.warn("Location error:", error);
    pickupLocation.value = DEFAULT_LOCATION;
  } finally {
    loading.value = false;
  }
};

const handlePermissionAllow = async () => {
  showLocationPermission.value = false;
  await fetchCurrentLocation();
};

const handlePermissionDeny = () => {
  showLocationPermission.value = false;
  pickupLocation.value = DEFAULT_LOCATION;
};

const goToService = (route: string) => {
  router.push(route);
};

const goToRideWithDestination = (place: {
  lat?: number;
  lng?: number;
  address?: string;
  name?: string;
}) => {
  if (place?.lat && place?.lng) {
    rideStore.setDestination({
      lat: place.lat,
      lng: place.lng,
      address: place.address || place.name || "",
    });
  }
  router.push("/customer/ride");
};

const handleSavedPlace = (item: { id: string; place: any }) => {
  if (item.place?.lat && item.place?.lng) {
    goToRideWithDestination(item.place);
  } else {
    showInfo(
      `กรุณาเพิ่มที่อยู่${item.id === "home" ? "บ้าน" : "ที่ทำงาน"}ก่อน`
    );
    router.push({ path: "/customer/saved-places", query: { add: item.id } });
  }
};

const goBack = () => {
  router.push("/customer");
};

// Setup realtime subscription
const setupRealtimeSubscription = () => {
  if (!authStore.user?.id) return;
  const userId = authStore.user.id;

  realtimeChannel = supabase
    .channel("services-active-orders")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "ride_requests",
        filter: `user_id=eq.${userId}`,
      },
      () => fetchActiveOrders()
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "delivery_requests",
        filter: `user_id=eq.${userId}`,
      },
      () => fetchActiveOrders()
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shopping_requests",
        filter: `user_id=eq.${userId}`,
      },
      () => fetchActiveOrders()
    )
    .subscribe();
};

onMounted(async () => {
  if (!pickupLocation.value) pickupLocation.value = DEFAULT_LOCATION;

  await Promise.all([
    fetchSavedPlaces().catch(() => {}),
    fetchRecentPlaces().catch(() => {}),
    fetchActiveOrders(),
    fetchBalance().catch(() => {}),
    fetchLoyaltySummary().catch(() => {}),
  ]);

  getCurrentLocation();
  setupRealtimeSubscription();
  isLoaded.value = true;
});

onUnmounted(() => {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
});
</script>

<template>
  <div
    class="services-page"
    :class="{ loaded: isLoaded }"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <!-- Pull to Refresh Indicator -->
    <div
      class="pull-indicator"
      :class="{ visible: pullDistance > 0, refreshing: isRefreshing }"
      :style="{ transform: `translateY(${pullDistance - 50}px)` }"
    >
      <div class="pull-spinner" :class="{ spinning: isRefreshing }">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21 12a9 9 0 11-6.219-8.56" />
        </svg>
      </div>
      <span v-if="!isRefreshing">{{
        pullDistance >= PULL_THRESHOLD ? "ปล่อยเพื่อรีเฟรช" : "ดึงลงเพื่อรีเฟรช"
      }}</span>
      <span v-else>กำลังโหลด...</span>
    </div>

    <!-- Map Background -->
    <div class="map-container">
      <MapView
        :pickup="pickupLocation"
        :show-route="false"
        :draggable="false"
        height="100%"
      />

      <!-- Top Bar -->
      <div class="top-bar">
        <button class="back-btn" aria-label="กลับ" @click="goBack">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div class="logo">
          <svg viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="#00A86B" stroke-width="2" />
            <path d="M16 8L22 20H10L16 8Z" fill="#00A86B" />
            <circle cx="16" cy="18" r="3" fill="#00A86B" />
          </svg>
          <span>GOBEAR</span>
        </div>
        <button class="wallet-btn" @click="goToService('/customer/wallet')">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
          </svg>
          <span>฿{{ walletBalance.toLocaleString() }}</span>
        </button>
      </div>
    </div>

    <!-- Bottom Sheet - Main Content -->
    <div class="bottom-sheet">
      <div class="sheet-handle"></div>

      <!-- Quick Destination Search -->
      <button class="destination-btn" @click="goToService('/customer/ride')">
        <div class="dest-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" fill="#E53935" />
            <circle cx="12" cy="12" r="8" stroke="#E53935" stroke-width="2" />
          </svg>
        </div>
        <div class="dest-text">
          <span class="dest-label">ไปไหนดี?</span>
          <span class="dest-hint">ค้นหาจุดหมายปลายทาง</span>
        </div>
        <svg
          class="dest-arrow"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#999"
          stroke-width="2"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      <!-- Active Orders Section -->
      <div
        v-if="loadingOrders || activeOrders.length > 0"
        class="active-orders-section"
      >
        <div class="section-header">
          <h3 class="section-title">กำลังดำเนินการ</h3>
          <span
            v-if="!loadingOrders && activeOrders.length > 0"
            class="order-count"
          >{{ activeOrders.length }}</span>
        </div>

        <div v-if="loadingOrders" class="skeleton-orders">
          <div v-for="i in 2" :key="i" class="skeleton-order"></div>
        </div>

        <div v-else class="active-orders-list">
          <button
            v-for="order in activeOrders"
            :key="order.id"
            class="active-order-card"
            @click="goToService(order.trackingPath)"
          >
            <div class="order-type-badge" :class="order.type">
              <svg
                v-if="order.type === 'ride'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M5 17a2 2 0 104 0 2 2 0 00-4 0zM15 17a2 2 0 104 0 2 2 0 00-4 0z"
                />
                <path d="M5 17H3v-4l2-5h9l4 5h3v4h-2" />
              </svg>
              <svg
                v-else-if="order.type === 'delivery'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="3" y="7" width="12" height="12" rx="1" />
                <path d="M15 11h4l2 4v4h-6v-8z" />
                <circle cx="7" cy="19" r="2" />
                <circle cx="17" cy="19" r="2" />
              </svg>
              <svg
                v-else
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M6 6h15l-1.5 9h-12L6 6z" />
                <circle cx="9" cy="20" r="1.5" />
                <circle cx="18" cy="20" r="1.5" />
              </svg>
            </div>
            <div class="order-info">
              <div class="order-header">
                <span class="order-type-name">{{ order.typeName }}</span>
                <span class="order-status">{{ order.statusText }}</span>
              </div>
              <div class="order-route">
                <span>{{ order.from }}</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <span>{{ order.to }}</span>
              </div>
            </div>
            <div class="order-pulse"></div>
          </button>
        </div>
      </div>

      <!-- Main Services Grid -->
      <div class="services-section">
        <div class="section-header">
          <h3 class="section-title">บริการหลัก</h3>
        </div>
        <div class="services-grid">
          <button
            v-for="service in mainServices"
            :key="service.id"
            class="service-btn"
            :style="{ '--accent': service.color }"
            @click="goToService(service.route)"
          >
            <div class="service-icon">
              <svg v-if="service.id === 'ride'" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 17a2 2 0 104 0 2 2 0 00-4 0zM15 17a2 2 0 104 0 2 2 0 00-4 0z"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <path
                  d="M5 17H3v-4l2-5h9l4 5h3v4h-2"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
                <path
                  d="M14 8V5H6"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
              <svg
                v-else-if="service.id === 'delivery'"
                viewBox="0 0 24 24"
                fill="none"
              >
                <rect
                  x="3"
                  y="7"
                  width="12"
                  height="12"
                  rx="1"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <path
                  d="M15 11h4l2 4v4h-6v-8z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <circle
                  cx="7"
                  cy="19"
                  r="2"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <circle
                  cx="17"
                  cy="19"
                  r="2"
                  stroke="currentColor"
                  stroke-width="2"
                />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6h15l-1.5 9h-12L6 6z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M6 6L5 3H2"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
                <circle
                  cx="9"
                  cy="20"
                  r="1.5"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <circle
                  cx="18"
                  cy="20"
                  r="1.5"
                  stroke="currentColor"
                  stroke-width="2"
                />
              </svg>
            </div>
            <div class="service-info">
              <span class="service-name">{{ service.name }}</span>
              <span class="service-desc">{{ service.description }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Saved Places -->
      <div class="saved-section">
        <div class="section-header">
          <h3 class="section-title">สถานที่บันทึก</h3>
          <button
            class="see-all-btn"
            @click="goToService('/customer/saved-places')"
          >
            จัดการ
          </button>
        </div>
        <div class="saved-row">
          <button
            v-for="item in savedPlaces"
            :key="item.id"
            class="saved-btn"
            @click="handleSavedPlace(item)"
          >
            <div class="saved-icon">
              <svg
                v-if="item.icon === 'home'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <svg
                v-else
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div class="saved-info">
              <span class="saved-name">{{ item.name }}</span>
              <span class="saved-hint">{{
                item.place ? "กดเพื่อไป" : "กดเพื่อเพิ่ม"
              }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Loyalty Points Card -->
      <button class="loyalty-card" @click="goToService('/customer/loyalty')">
        <div class="loyalty-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill="#FFD700"
            />
          </svg>
        </div>
        <div class="loyalty-info">
          <span class="loyalty-label">แต้มสะสม</span>
          <span class="loyalty-points">{{ loyaltyPoints.toLocaleString() }} แต้ม</span>
        </div>
        <svg
          class="loyalty-arrow"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Additional Services -->
      <div class="additional-section">
        <div class="section-header">
          <h3 class="section-title">บริการเพิ่มเติม</h3>
        </div>
        <div class="additional-grid">
          <button
            v-for="service in additionalServices"
            :key="service.id"
            class="additional-btn"
            :style="{ '--accent': service.color }"
            @click="goToService(service.route)"
          >
            <div class="additional-icon">
              <svg
                v-if="service.id === 'queue'"
                viewBox="0 0 24 24"
                fill="none"
              >
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="16"
                  rx="2"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <path
                  d="M8 9h8M8 13h5"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
                <circle
                  cx="17"
                  cy="13"
                  r="2"
                  stroke="currentColor"
                  stroke-width="2"
                />
              </svg>
              <svg
                v-else-if="service.id === 'moving'"
                viewBox="0 0 24 24"
                fill="none"
              >
                <rect
                  x="4"
                  y="8"
                  width="10"
                  height="10"
                  rx="1"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <path
                  d="M14 12h4l2 3v3h-6v-6z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <circle
                  cx="8"
                  cy="18"
                  r="2"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <circle
                  cx="16"
                  cy="18"
                  r="2"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <path
                  d="M7 8V5h6v3"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none">
                <rect
                  x="3"
                  y="2"
                  width="18"
                  height="20"
                  rx="2"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <circle
                  cx="12"
                  cy="13"
                  r="5"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <path
                  d="M9 13c0-1.5 1.5-2 3-1s3 .5 3-1"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <circle cx="7" cy="6" r="1" fill="currentColor" />
                <circle cx="10" cy="6" r="1" fill="currentColor" />
              </svg>
            </div>
            <div class="additional-info">
              <span class="additional-name">{{ service.name }}</span>
              <span class="additional-desc">{{ service.description }}</span>
            </div>
            <svg
              class="additional-arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#CCC"
              stroke-width="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Recent Places -->
      <div v-if="displayRecentPlaces.length > 0" class="recent-section">
        <div class="section-header">
          <h3 class="section-title">ล่าสุด</h3>
        </div>
        <div class="recent-list">
          <button
            v-for="place in displayRecentPlaces"
            :key="place.name"
            class="recent-item"
            @click="goToRideWithDestination(place)"
          >
            <div class="recent-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 8v4l3 3"
                  stroke="#666"
                  stroke-width="2"
                  stroke-linecap="round"
                />
                <circle cx="12" cy="12" r="9" stroke="#666" stroke-width="2" />
              </svg>
            </div>
            <span class="recent-name">{{ place.name }}</span>
            <svg
              class="recent-arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#CCC"
              stroke-width="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Promo Banner -->
      <button class="promo-banner" @click="goToService('/customer/promotions')">
        <div class="promo-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"
            />
            <circle cx="7" cy="7" r="1" />
          </svg>
        </div>
        <div class="promo-text">
          <span class="promo-title">โปรโมชั่นพิเศษ</span>
          <span class="promo-subtitle">ดูส่วนลดทั้งหมด</span>
        </div>
        <svg
          class="promo-arrow"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Quick Actions -->
      <div class="quick-section">
        <div class="quick-grid">
          <button
            class="quick-item"
            @click="goToService('/customer/scheduled-rides')"
          >
            <div class="quick-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <span>นัดล่วงหน้า</span>
          </button>
          <button class="quick-item" @click="goToService('/customer/history')">
            <div class="quick-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
            </div>
            <span>ประวัติ</span>
          </button>
          <button class="quick-item" @click="goToService('/customer/referral')">
            <div class="quick-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <span>ชวนเพื่อน</span>
          </button>
          <button class="quick-item" @click="goToService('/customer/help')">
            <div class="quick-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                <circle cx="12" cy="17" r="1" />
              </svg>
            </div>
            <span>ช่วยเหลือ</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Location Permission Modal -->
    <LocationPermissionModal
      :show="showLocationPermission"
      @allow="handlePermissionAllow"
      @deny="handlePermissionDeny"
    />
  </div>
</template>

<style scoped>
.services-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #ffffff;
  position: relative;
  display: flex;
  flex-direction: column;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.services-page.loaded {
  opacity: 1;
}

/* Pull to Refresh */
.pull-indicator {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%) translateY(-50px);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 200;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.pull-indicator.visible {
  opacity: 1;
}

.pull-indicator span {
  font-size: 13px;
  color: #666666;
  white-space: nowrap;
}

.pull-spinner {
  width: 20px;
  height: 20px;
  color: #00a86b;
}

.pull-spinner svg {
  width: 100%;
  height: 100%;
}

.pull-spinner.spinning svg {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Map Container */
.map-container {
  position: relative;
  height: 28vh;
  flex-shrink: 0;
}

/* Top Bar */
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top));
  z-index: 10;
}

.back-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.back-btn svg {
  width: 24px;
  height: 24px;
  color: #1a1a1a;
}

.back-btn:active {
  transform: scale(0.95);
}

.logo {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.logo svg {
  width: 24px;
  height: 24px;
}

.logo span {
  font-size: 13px;
  font-weight: 700;
  color: #00a86b;
  letter-spacing: 0.5px;
}

.wallet-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #ffffff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.wallet-btn svg {
  width: 18px;
  height: 18px;
  color: #00a86b;
}

.wallet-btn span {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
}

.wallet-btn:active {
  transform: scale(0.95);
}

/* Bottom Sheet */
.bottom-sheet {
  flex: 1;
  background: #ffffff;
  border-radius: 24px 24px 0 0;
  margin-top: -20px;
  padding: 10px 20px 24px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
  position: relative;
  z-index: 20;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
  overflow-y: auto;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  margin: 0 auto 16px;
}

/* Destination Button */
.destination-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: #f8f8f8;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  margin-bottom: 20px;
  text-align: left;
}

.destination-btn:active {
  background: #f0f0f0;
}

.dest-icon {
  width: 48px;
  height: 48px;
  background: #ffffff;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.dest-icon svg {
  width: 26px;
  height: 26px;
}

.dest-text {
  flex: 1;
  min-width: 0;
}

.dest-label {
  display: block;
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 2px;
}

.dest-hint {
  display: block;
  font-size: 13px;
  color: #999999;
}

.dest-arrow {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* Section Header */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.see-all-btn {
  font-size: 13px;
  font-weight: 500;
  color: #00a86b;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
}

.order-count {
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  background: #00a86b;
  padding: 2px 8px;
  border-radius: 10px;
}

/* Active Orders */
.active-orders-section {
  margin-bottom: 20px;
}

.skeleton-orders {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-order {
  height: 72px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 14px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.active-orders-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.active-order-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  position: relative;
  overflow: hidden;
}

.active-order-card:active {
  background: #f5f5f5;
  transform: scale(0.99);
}

.order-type-badge {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.order-type-badge svg {
  width: 22px;
  height: 22px;
}

.order-type-badge.ride {
  background: #e8f5ef;
  color: #00a86b;
}

.order-type-badge.delivery {
  background: #fff3e0;
  color: #f5a623;
}

.order-type-badge.shopping {
  background: #ffebee;
  color: #e53935;
}

.order-type-badge.queue {
  background: #f3e5f5;
  color: #9c27b0;
}

.order-type-badge.moving {
  background: #e3f2fd;
  color: #2196f3;
}

.order-type-badge.laundry {
  background: #e0f7fa;
  color: #00bcd4;
}

.order-info {
  flex: 1;
  min-width: 0;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.order-type-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.order-status {
  font-size: 12px;
  font-weight: 500;
  color: #00a86b;
}

.order-route {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666666;
}

.order-route svg {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

.order-route span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
}

.order-pulse {
  position: absolute;
  right: 16px;
  width: 8px;
  height: 8px;
  background: #00a86b;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
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

/* Services Section */
.services-section {
  margin-bottom: 20px;
}

.services-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.service-btn {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #ffffff;
  border: 2px solid #f0f0f0;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: all 0.15s ease;
}

.service-btn:active {
  transform: scale(0.98);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, white);
}

.service-icon {
  width: 56px;
  height: 56px;
  background: color-mix(in srgb, var(--accent) 12%, white);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.service-icon svg {
  width: 30px;
  height: 30px;
  color: var(--accent);
}

.service-info {
  flex: 1;
}

.service-name {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 2px;
}

.service-desc {
  display: block;
  font-size: 13px;
  color: #999999;
}

/* Saved Places */
.saved-section {
  margin-bottom: 20px;
}

.saved-row {
  display: flex;
  gap: 12px;
}

.saved-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
}

.saved-btn:active {
  background: #f5f5f5;
  transform: scale(0.98);
}

.saved-icon {
  width: 40px;
  height: 40px;
  background: #e8f5ef;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.saved-icon svg {
  width: 20px;
  height: 20px;
  color: #00a86b;
}

.saved-info {
  flex: 1;
  min-width: 0;
}

.saved-name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.saved-hint {
  display: block;
  font-size: 11px;
  color: #999999;
}

/* Loyalty Card */
.loyalty-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #fff9e6 0%, #fff3cc 100%);
  border: none;
  border-radius: 16px;
  cursor: pointer;
  margin-bottom: 20px;
  text-align: left;
}

.loyalty-card:active {
  transform: scale(0.98);
}

.loyalty-icon {
  width: 44px;
  height: 44px;
  background: #ffffff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
}

.loyalty-icon svg {
  width: 24px;
  height: 24px;
}

.loyalty-info {
  flex: 1;
}

.loyalty-label {
  display: block;
  font-size: 12px;
  color: #8b7355;
  margin-bottom: 2px;
}

.loyalty-points {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #8b6914;
}

.loyalty-arrow {
  width: 20px;
  height: 20px;
  color: #8b7355;
  flex-shrink: 0;
}

/* Additional Services */
.additional-section {
  margin-bottom: 20px;
}

.additional-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.additional-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.additional-btn:active {
  transform: scale(0.98);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, white);
}

.additional-icon {
  width: 44px;
  height: 44px;
  background: color-mix(in srgb, var(--accent) 12%, white);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.additional-icon svg {
  width: 24px;
  height: 24px;
  color: var(--accent);
}

.additional-info {
  flex: 1;
  min-width: 0;
}

.additional-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 2px;
}

.additional-desc {
  display: block;
  font-size: 12px;
  color: #999999;
}

.additional-arrow {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* Recent Section */
.recent-section {
  margin-bottom: 20px;
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
  padding: 12px 14px;
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  width: 100%;
}

.recent-item:active {
  background: #f5f5f5;
}

.recent-icon {
  width: 36px;
  height: 36px;
  background: #f5f5f5;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.recent-icon svg {
  width: 18px;
  height: 18px;
}

.recent-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-arrow {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* Promo Banner */
.promo-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #e8f5ef 0%, #d4edda 100%);
  border: none;
  border-radius: 16px;
  cursor: pointer;
  margin-bottom: 20px;
  text-align: left;
}

.promo-banner:active {
  transform: scale(0.98);
}

.promo-icon {
  width: 44px;
  height: 44px;
  background: #ffffff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 168, 107, 0.2);
}

.promo-icon svg {
  width: 22px;
  height: 22px;
  color: #00a86b;
}

.promo-text {
  flex: 1;
}

.promo-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 2px;
}

.promo-subtitle {
  display: block;
  font-size: 12px;
  color: #00a86b;
}

.promo-arrow {
  width: 20px;
  height: 20px;
  color: #00a86b;
  flex-shrink: 0;
}

/* Quick Actions */
.quick-section {
  margin-bottom: 20px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  background: #f8f8f8;
  border: none;
  border-radius: 14px;
  cursor: pointer;
}

.quick-item:active {
  background: #f0f0f0;
  transform: scale(0.95);
}

.quick-icon {
  width: 36px;
  height: 36px;
  background: #ffffff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.quick-icon svg {
  width: 18px;
  height: 18px;
  color: #00a86b;
}

.quick-item span {
  font-size: 11px;
  font-weight: 500;
  color: #666666;
  text-align: center;
}
</style>
