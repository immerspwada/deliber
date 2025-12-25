<script setup lang="ts">
/**
 * CustomerServicesView - หน้ารวมบริการทั้งหมด
 * MUNEEF Style: สีเขียว #00A86B, ใส่ใจทุกรายละเอียด
 * รวมบริการทั้งหมดไว้ในที่เดียว พร้อมรองรับบริการใหม่ในอนาคต
 */
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useRideStore } from "../stores/ride";
import { useToast } from "../composables/useToast";
import { useWallet } from "../composables/useWallet";
import { useLoyalty } from "../composables/useLoyalty";
import { useServices } from "../composables/useServices";
import { useHapticFeedback } from "../composables/useHapticFeedback";
import { useRideHistory } from "../composables/useRideHistory";
import { supabase } from "../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import BottomNavigation from "../components/customer/BottomNavigation.vue";

const router = useRouter();
const authStore = useAuthStore();
const rideStore = useRideStore();
const { showSuccess, showError, showWarning, showInfo } = useToast();
const { vibrate } = useHapticFeedback();
const { balance, fetchBalance } = useWallet();
const { summary: loyaltySummary, fetchSummary: fetchLoyaltySummary } =
  useLoyalty();
const { homePlace, workPlace, fetchSavedPlaces } = useServices();
const { unratedRidesCount, fetchUnratedRides } = useRideHistory();

// State
const isLoaded = ref(false);
const isRefreshing = ref(false);
const pullDistance = ref(0);
const isPulling = ref(false);
const startY = ref(0);
const PULL_THRESHOLD = 80;
const activeCategory = ref("all");
const pressedServiceId = ref<string | null>(null);
const isChangingCategory = ref(false);
const loadingServices = ref(true);

// Recommended services based on user behavior
interface RecommendedService {
  service: Service;
  reason: string;
  score: number;
}
const recommendedServices = ref<RecommendedService[]>([]);
const loadingRecommendations = ref(true);

// Active orders
interface ActiveOrder {
  id: string;
  type: string;
  typeName: string;
  status: string;
  statusText: string;
  from: string;
  to: string;
  trackingPath: string;
  color: string;
}

const activeOrders = ref<ActiveOrder[]>([]);
const loadingOrders = ref(true);
let realtimeChannel: RealtimeChannel | null = null;

// Service Categories
const categories = [
  { id: "all", name: "ทั้งหมด" },
  { id: "transport", name: "เดินทาง" },
  { id: "delivery", name: "จัดส่ง" },
  { id: "lifestyle", name: "ไลฟ์สไตล์" },
];

// All Services - รวมบริการทั้งหมด
interface Service {
  id: string;
  name: string;
  description: string;
  route: string;
  color: string;
  category: string;
  badge?: string;
  isNew?: boolean;
  isPopular?: boolean;
}

const allServices: Service[] = [
  // Transport
  {
    id: "ride",
    name: "เรียกรถ",
    description: "รถยนต์ส่วนตัว",
    route: "/customer/ride",
    color: "#00A86B",
    category: "transport",
    isPopular: true,
  },
  {
    id: "scheduled",
    name: "นัดล่วงหน้า",
    description: "จองรถล่วงหน้า",
    route: "/customer/scheduled-rides",
    color: "#00A86B",
    category: "transport",
  },

  // Delivery
  {
    id: "delivery",
    name: "ส่งของ",
    description: "ส่งพัสดุด่วน",
    route: "/customer/delivery",
    color: "#F5A623",
    category: "delivery",
    isPopular: true,
  },
  {
    id: "shopping",
    name: "ซื้อของ",
    description: "ฝากซื้อสินค้า",
    route: "/customer/shopping",
    color: "#E53935",
    category: "delivery",
  },
  {
    id: "moving",
    name: "ขนย้าย",
    description: "บริการยกของ/ขนย้าย",
    route: "/customer/moving",
    color: "#2196F3",
    category: "delivery",
  },

  // Lifestyle
  {
    id: "queue",
    name: "จองคิว",
    description: "จองคิวร้านค้า/โรงพยาบาล",
    route: "/customer/queue-booking",
    color: "#9C27B0",
    category: "lifestyle",
  },
  {
    id: "laundry",
    name: "ซักรีด",
    description: "รับ-ส่งซักผ้า",
    route: "/customer/laundry",
    color: "#00BCD4",
    category: "lifestyle",
  },
];

// Computed
const walletBalance = computed(() => balance.value?.balance || 0);
const loyaltyPoints = computed(() => loyaltySummary.value?.current_points || 0);

const filteredServices = computed(() => {
  if (activeCategory.value === "all") return allServices;
  return allServices.filter((s) => s.category === activeCategory.value);
});

const popularServices = computed(() => allServices.filter((s) => s.isPopular));

// Fetch recommended services based on user history
const fetchRecommendedServices = async () => {
  if (!authStore.user?.id) {
    loadingRecommendations.value = false;
    return;
  }

  loadingRecommendations.value = true;

  try {
    const userId = authStore.user.id;
    const recommendations: RecommendedService[] = [];

    // Get user's service usage history
    const [ridesResult, deliveriesResult, shoppingResult] = await Promise.all([
      (supabase.from("ride_requests") as any)
        .select("id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      (supabase.from("delivery_requests") as any)
        .select("id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      (supabase.from("shopping_requests") as any)
        .select("id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const rideCount = ridesResult.data?.length || 0;
    const deliveryCount = deliveriesResult.data?.length || 0;
    const shoppingCount = shoppingResult.data?.length || 0;

    // Calculate scores based on usage
    const serviceScores: Record<
      string,
      { count: number; lastUsed: Date | null }
    > = {
      ride: {
        count: rideCount,
        lastUsed: ridesResult.data?.[0]?.created_at
          ? new Date(ridesResult.data[0].created_at)
          : null,
      },
      delivery: {
        count: deliveryCount,
        lastUsed: deliveriesResult.data?.[0]?.created_at
          ? new Date(deliveriesResult.data[0].created_at)
          : null,
      },
      shopping: {
        count: shoppingCount,
        lastUsed: shoppingResult.data?.[0]?.created_at
          ? new Date(shoppingResult.data[0].created_at)
          : null,
      },
    };

    // Generate recommendations
    const now = new Date();
    const hour = now.getHours();

    // Time-based recommendations
    if (hour >= 7 && hour <= 9) {
      // Morning commute
      const rideService = allServices.find((s) => s.id === "ride");
      if (rideService) {
        recommendations.push({
          service: rideService,
          reason: "เวลาเดินทางไปทำงาน",
          score: 90,
        });
      }
    } else if (hour >= 11 && hour <= 13) {
      // Lunch time
      const shoppingService = allServices.find((s) => s.id === "shopping");
      if (shoppingService) {
        recommendations.push({
          service: shoppingService,
          reason: "ช่วงเวลาอาหารกลางวัน",
          score: 85,
        });
      }
    } else if (hour >= 17 && hour <= 19) {
      // Evening commute
      const rideService = allServices.find((s) => s.id === "ride");
      if (rideService) {
        recommendations.push({
          service: rideService,
          reason: "เวลาเดินทางกลับบ้าน",
          score: 90,
        });
      }
    }

    // Usage-based recommendations
    Object.entries(serviceScores).forEach(([serviceId, data]) => {
      if (data.count > 0) {
        const service = allServices.find((s) => s.id === serviceId);
        if (
          service &&
          !recommendations.find((r) => r.service.id === serviceId)
        ) {
          let reason = "บริการที่คุณใช้บ่อย";
          if (data.lastUsed) {
            const daysSinceLastUse = Math.floor(
              (now.getTime() - data.lastUsed.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceLastUse <= 7) {
              reason = "ใช้เมื่อเร็วๆ นี้";
            }
          }
          recommendations.push({
            service,
            reason,
            score: Math.min(data.count * 10, 80),
          });
        }
      }
    });

    // Add new services as recommendations
    const newServices = allServices.filter((s) => s.isNew);
    newServices.forEach((service) => {
      if (!recommendations.find((r) => r.service.id === service.id)) {
        recommendations.push({
          service,
          reason: "บริการใหม่ ลองใช้เลย!",
          score: 70,
        });
      }
    });

    // Sort by score and take top 3
    recommendations.sort((a, b) => b.score - a.score);
    recommendedServices.value = recommendations.slice(0, 3);
  } catch (err) {
    console.error("Error fetching recommendations:", err);
  } finally {
    loadingRecommendations.value = false;
  }
};

// Handle category change with animation
const handleCategoryChange = async (categoryId: string) => {
  if (categoryId === activeCategory.value) return;

  isChangingCategory.value = true;
  vibrate("light");

  // Small delay for animation
  await new Promise((resolve) => setTimeout(resolve, 150));
  activeCategory.value = categoryId;

  await new Promise((resolve) => setTimeout(resolve, 100));
  isChangingCategory.value = false;
};

// Status text mapping
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

const getServiceColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    ride: "#00A86B",
    delivery: "#F5A623",
    shopping: "#E53935",
    queue: "#9C27B0",
    moving: "#2196F3",
    laundry: "#00BCD4",
  };
  return colorMap[type] || "#00A86B";
};

// Fetch active orders
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
      .limit(5);

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
        color: getServiceColor("ride"),
      });
    });

    // Fetch active deliveries
    const { data: deliveries } = await (
      supabase.from("delivery_requests") as any
    )
      .select("id, status, sender_address, recipient_address")
      .eq("user_id", userId)
      .in("status", ["pending", "matched", "picked_up", "in_transit"])
      .limit(5);

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
        color: getServiceColor("delivery"),
      });
    });

    // Fetch active shopping
    const { data: shopping } = await (supabase.from("shopping_requests") as any)
      .select("id, status, store_name, delivery_address")
      .eq("user_id", userId)
      .in("status", ["pending", "matched", "purchased", "delivering"])
      .limit(5);

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
        color: getServiceColor("shopping"),
      });
    });

    // Fetch active queue bookings
    const { data: queues } = await (supabase.from("queue_bookings") as any)
      .select("id, status, service_name, location_name")
      .eq("user_id", userId)
      .in("status", ["pending", "confirmed", "in_progress"])
      .limit(5);

    queues?.forEach((q: any) => {
      orders.push({
        id: q.id,
        type: "queue",
        typeName: "จองคิว",
        status: q.status,
        statusText: getStatusText("queue", q.status),
        from: q.service_name || "",
        to: q.location_name || "",
        trackingPath: `/customer/queue-booking/${q.id}`,
        color: getServiceColor("queue"),
      });
    });

    // Fetch active moving
    const { data: movings } = await (supabase.from("moving_requests") as any)
      .select("id, status, pickup_address, destination_address")
      .eq("user_id", userId)
      .in("status", ["pending", "matched", "in_progress"])
      .limit(5);

    movings?.forEach((m: any) => {
      orders.push({
        id: m.id,
        type: "moving",
        typeName: "ขนย้าย",
        status: m.status,
        statusText: getStatusText("moving", m.status),
        from: m.pickup_address?.split(",")[0] || "",
        to: m.destination_address?.split(",")[0] || "",
        trackingPath: `/customer/moving/${m.id}`,
        color: getServiceColor("moving"),
      });
    });

    // Fetch active laundry
    const { data: laundries } = await (supabase.from("laundry_requests") as any)
      .select("id, status, pickup_address")
      .eq("user_id", userId)
      .in("status", ["pending", "picked_up", "washing", "ready"])
      .limit(5);

    laundries?.forEach((l: any) => {
      orders.push({
        id: l.id,
        type: "laundry",
        typeName: "ซักรีด",
        status: l.status,
        statusText: getStatusText("laundry", l.status),
        from: l.pickup_address?.split(",")[0] || "",
        to: "รอรับคืน",
        trackingPath: `/customer/laundry/${l.id}`,
        color: getServiceColor("laundry"),
      });
    });

    activeOrders.value = orders.slice(0, 5);
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
    fetchActiveOrders(),
    fetchBalance(),
    fetchLoyaltySummary(),
    fetchSavedPlaces(),
  ]);
  showSuccess("รีเฟรชข้อมูลแล้ว");
};

// Navigation
const navigateTo = (path: string) => {
  router.push(path);
};

const handleServicePress = (id: string) => {
  pressedServiceId.value = id;
  vibrate("light");
};

const handleServiceRelease = () => {
  pressedServiceId.value = null;
};

const handleServiceClick = (service: Service) => {
  vibrate("medium");
  navigateTo(service.route);
};

const handleOrderClick = (order: ActiveOrder) => {
  vibrate("light");
  navigateTo(order.trackingPath);
};

const handleSavedPlaceClick = (type: "home" | "work") => {
  const place = type === "home" ? homePlace.value : workPlace.value;
  if (place?.lat && place?.lng) {
    rideStore.setDestination({
      lat: place.lat,
      lng: place.lng,
      address: place.address || place.name || "",
    });
    navigateTo("/customer/ride");
  } else {
    showInfo(`กรุณาเพิ่มที่อยู่${type === "home" ? "บ้าน" : "ที่ทำงาน"}ก่อน`);
    navigateTo("/customer/saved-places");
  }
};

// Setup realtime subscription
const setupRealtimeSubscription = () => {
  if (!authStore.user?.id) return;
  const userId = authStore.user.id;

  realtimeChannel = supabase
    .channel("customer-services-orders")
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
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "queue_bookings",
        filter: `user_id=eq.${userId}`,
      },
      () => fetchActiveOrders()
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "moving_requests",
        filter: `user_id=eq.${userId}`,
      },
      () => fetchActiveOrders()
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "laundry_requests",
        filter: `user_id=eq.${userId}`,
      },
      () => fetchActiveOrders()
    )
    .subscribe();
};

// Lifecycle
onMounted(async () => {
  // Simulate loading for skeleton
  loadingServices.value = true;

  await Promise.all([
    fetchActiveOrders(),
    fetchBalance().catch(() => {}),
    fetchLoyaltySummary().catch(() => {}),
    fetchSavedPlaces().catch(() => {}),
    fetchUnratedRides().catch(() => {}),
    fetchRecommendedServices(),
  ]);

  // Small delay for smooth transition
  await new Promise((resolve) => setTimeout(resolve, 300));
  loadingServices.value = false;

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

    <!-- Header -->
    <header class="page-header">
      <div class="header-top">
        <button
          class="back-btn"
          @click="navigateTo('/customer')"
          aria-label="กลับ"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 class="page-title">บริการทั้งหมด</h1>
        <button class="wallet-btn" @click="navigateTo('/customer/wallet')">
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

      <!-- Category Tabs with Animation -->
      <div class="category-tabs">
        <button
          v-for="cat in categories"
          :key="cat.id"
          class="category-tab"
          :class="{ active: activeCategory === cat.id }"
          @click="handleCategoryChange(cat.id)"
        >
          <span class="tab-text">{{ cat.name }}</span>
          <span v-if="activeCategory === cat.id" class="tab-indicator"></span>
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Active Orders Section -->
      <section
        v-if="loadingOrders || activeOrders.length > 0"
        class="active-orders-section"
      >
        <div class="section-header">
          <h2 class="section-title">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
            กำลังดำเนินการ
          </h2>
          <span v-if="!loadingOrders" class="order-count">{{
            activeOrders.length
          }}</span>
        </div>

        <!-- Skeleton Loading -->
        <div v-if="loadingOrders" class="skeleton-orders">
          <div v-for="i in 2" :key="i" class="skeleton-order"></div>
        </div>

        <!-- Orders List -->
        <div v-else class="orders-scroll">
          <button
            v-for="order in activeOrders"
            :key="order.id"
            class="order-card"
            :style="{ '--accent': order.color }"
            @click="handleOrderClick(order)"
          >
            <div class="order-badge">
              <span class="order-type">{{ order.typeName }}</span>
              <span class="order-status">{{ order.statusText }}</span>
            </div>
            <div class="order-route">
              <span class="route-from">{{ order.from }}</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              <span class="route-to">{{ order.to }}</span>
            </div>
            <div class="order-pulse"></div>
          </button>
        </div>
      </section>

      <!-- Quick Access - Saved Places -->
      <section class="quick-access-section">
        <div class="section-header">
          <h2 class="section-title">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            ไปที่บันทึกไว้
          </h2>
          <button
            class="see-all-btn"
            @click="navigateTo('/customer/saved-places')"
          >
            จัดการ
          </button>
        </div>

        <div class="quick-places">
          <button class="place-card" @click="handleSavedPlaceClick('home')">
            <div class="place-icon home">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </div>
            <div class="place-info">
              <span class="place-name">{{ homePlace?.name || "บ้าน" }}</span>
              <span class="place-hint">{{
                homePlace ? "กดเพื่อไป" : "กดเพื่อเพิ่ม"
              }}</span>
            </div>
          </button>

          <button class="place-card" @click="handleSavedPlaceClick('work')">
            <div class="place-icon work">
              <svg
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
            <div class="place-info">
              <span class="place-name">{{
                workPlace?.name || "ที่ทำงาน"
              }}</span>
              <span class="place-hint">{{
                workPlace ? "กดเพื่อไป" : "กดเพื่อเพิ่ม"
              }}</span>
            </div>
          </button>
        </div>
      </section>

      <!-- Recommended Services Section -->
      <section
        v-if="
          activeCategory === 'all' &&
          (loadingRecommendations || recommendedServices.length > 0)
        "
        class="recommended-section"
      >
        <div class="section-header">
          <h2 class="section-title">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            แนะนำสำหรับคุณ
          </h2>
        </div>

        <!-- Skeleton Loading -->
        <div v-if="loadingRecommendations" class="skeleton-recommendations">
          <div v-for="i in 2" :key="i" class="skeleton-recommendation"></div>
        </div>

        <!-- Recommendations List -->
        <div v-else class="recommendations-list">
          <button
            v-for="rec in recommendedServices"
            :key="rec.service.id"
            class="recommendation-card"
            :class="{ pressed: pressedServiceId === `rec-${rec.service.id}` }"
            :style="{ '--accent': rec.service.color }"
            @mousedown="handleServicePress(`rec-${rec.service.id}`)"
            @mouseup="handleServiceRelease"
            @mouseleave="handleServiceRelease"
            @touchstart="handleServicePress(`rec-${rec.service.id}`)"
            @touchend="handleServiceRelease"
            @click="handleServiceClick(rec.service)"
          >
            <div class="rec-icon">
              <!-- Ride -->
              <svg
                v-if="rec.service.id === 'ride'"
                viewBox="0 0 48 48"
                fill="none"
              >
                <rect
                  x="6"
                  y="20"
                  width="36"
                  height="15"
                  rx="4"
                  :fill="rec.service.color"
                />
                <rect
                  x="10"
                  y="13"
                  width="28"
                  height="13"
                  rx="4"
                  :fill="rec.service.color"
                />
                <circle cx="14" cy="35" r="5" fill="#333" />
                <circle cx="34" cy="35" r="5" fill="#333" />
              </svg>
              <!-- Delivery -->
              <svg
                v-else-if="rec.service.id === 'delivery'"
                viewBox="0 0 48 48"
                fill="none"
              >
                <rect
                  x="8"
                  y="12"
                  width="20"
                  height="20"
                  rx="4"
                  :fill="rec.service.color"
                />
                <rect
                  x="28"
                  y="20"
                  width="12"
                  height="12"
                  rx="2"
                  :fill="rec.service.color"
                  opacity="0.8"
                />
                <circle cx="14" cy="38" r="4" fill="#333" />
                <circle cx="34" cy="38" r="4" fill="#333" />
              </svg>
              <!-- Shopping -->
              <svg
                v-else-if="rec.service.id === 'shopping'"
                viewBox="0 0 48 48"
                fill="none"
              >
                <path d="M10 16h28l-4 20H14L10 16z" :fill="rec.service.color" />
                <path
                  d="M18 16V12a6 6 0 0112 0v4"
                  stroke="#FFFFFF"
                  stroke-width="2"
                  fill="none"
                  opacity="0.5"
                />
                <circle cx="18" cy="38" r="4" fill="#333" />
                <circle cx="30" cy="38" r="4" fill="#333" />
              </svg>
              <!-- Default -->
              <svg v-else viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="16" :fill="rec.service.color" />
              </svg>
            </div>
            <div class="rec-info">
              <span class="rec-name">{{ rec.service.name }}</span>
              <span class="rec-reason">{{ rec.reason }}</span>
            </div>
            <div class="rec-badge">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
          </button>
        </div>
      </section>

      <!-- Popular Services -->
      <section v-if="activeCategory === 'all'" class="popular-section">
        <div class="section-header">
          <h2 class="section-title">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polygon
                points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              />
            </svg>
            ยอดนิยม
          </h2>
        </div>

        <div class="popular-grid">
          <button
            v-for="service in popularServices"
            :key="service.id"
            class="popular-card"
            :class="{ pressed: pressedServiceId === service.id }"
            :style="{ '--accent': service.color }"
            @mousedown="handleServicePress(service.id)"
            @mouseup="handleServiceRelease"
            @mouseleave="handleServiceRelease"
            @touchstart="handleServicePress(service.id)"
            @touchend="handleServiceRelease"
            @click="handleServiceClick(service)"
          >
            <div class="popular-icon">
              <!-- Service Icons -->
              <svg v-if="service.id === 'ride'" viewBox="0 0 64 64" fill="none">
                <rect
                  x="8"
                  y="28"
                  width="48"
                  height="20"
                  rx="6"
                  :fill="service.color"
                />
                <rect
                  x="14"
                  y="18"
                  width="36"
                  height="18"
                  rx="5"
                  :fill="service.color"
                />
                <rect
                  x="18"
                  y="21"
                  width="12"
                  height="10"
                  rx="3"
                  fill="#FFFFFF"
                  opacity="0.4"
                />
                <rect
                  x="34"
                  y="21"
                  width="12"
                  height="10"
                  rx="3"
                  fill="#FFFFFF"
                  opacity="0.4"
                />
                <circle cx="20" cy="48" r="7" fill="#333" />
                <circle cx="44" cy="48" r="7" fill="#333" />
              </svg>
              <svg
                v-else-if="service.id === 'delivery'"
                viewBox="0 0 64 64"
                fill="none"
              >
                <rect
                  x="10"
                  y="16"
                  width="28"
                  height="28"
                  rx="5"
                  :fill="service.color"
                />
                <path
                  d="M24 16v28M10 30h28"
                  stroke="#FFFFFF"
                  stroke-width="2"
                  opacity="0.4"
                />
                <rect
                  x="38"
                  y="28"
                  width="16"
                  height="16"
                  rx="3"
                  :fill="service.color"
                  opacity="0.8"
                />
                <circle cx="18" cy="52" r="6" fill="#333" />
                <circle cx="46" cy="52" r="6" fill="#333" />
              </svg>
            </div>
            <div class="popular-info">
              <span class="popular-name">{{ service.name }}</span>
              <span class="popular-desc">{{ service.description }}</span>
            </div>
            <svg
              class="popular-arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </section>

      <!-- All Services Grid -->
      <section
        class="services-section"
        :class="{ 'category-changing': isChangingCategory }"
      >
        <div class="section-header">
          <h2 class="section-title">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            {{
              activeCategory === "all"
                ? "บริการทั้งหมด"
                : categories.find((c) => c.id === activeCategory)?.name
            }}
          </h2>
        </div>

        <!-- Skeleton Loading for Services -->
        <div v-if="loadingServices" class="skeleton-services">
          <div v-for="i in 6" :key="i" class="skeleton-service"></div>
        </div>

        <div
          v-else
          class="services-grid"
          :class="{ 'fade-in': !isChangingCategory }"
        >
          <button
            v-for="service in filteredServices"
            :key="service.id"
            class="service-card"
            :class="{ pressed: pressedServiceId === service.id }"
            :style="{ '--accent': service.color }"
            @mousedown="handleServicePress(service.id)"
            @mouseup="handleServiceRelease"
            @mouseleave="handleServiceRelease"
            @touchstart="handleServicePress(service.id)"
            @touchend="handleServiceRelease"
            @click="handleServiceClick(service)"
          >
            <!-- Badge -->
            <span v-if="service.isNew" class="service-badge new">ใหม่</span>
            <span v-else-if="service.isPopular" class="service-badge popular"
              >ยอดนิยม</span
            >

            <!-- Icon -->
            <div class="service-icon">
              <!-- Ride -->
              <svg v-if="service.id === 'ride'" viewBox="0 0 64 64" fill="none">
                <rect
                  x="8"
                  y="28"
                  width="48"
                  height="20"
                  rx="6"
                  :fill="service.color"
                />
                <rect
                  x="14"
                  y="18"
                  width="36"
                  height="18"
                  rx="5"
                  :fill="service.color"
                />
                <rect
                  x="18"
                  y="21"
                  width="12"
                  height="10"
                  rx="3"
                  fill="#FFFFFF"
                  opacity="0.4"
                />
                <rect
                  x="34"
                  y="21"
                  width="12"
                  height="10"
                  rx="3"
                  fill="#FFFFFF"
                  opacity="0.4"
                />
                <circle cx="20" cy="48" r="7" fill="#333" />
                <circle cx="44" cy="48" r="7" fill="#333" />
              </svg>

              <!-- Scheduled -->
              <svg
                v-else-if="service.id === 'scheduled'"
                viewBox="0 0 64 64"
                fill="none"
              >
                <rect
                  x="10"
                  y="10"
                  width="44"
                  height="44"
                  rx="8"
                  :fill="service.color"
                />
                <rect x="18" y="6" width="4" height="10" rx="2" fill="#333" />
                <rect x="42" y="6" width="4" height="10" rx="2" fill="#333" />
                <rect
                  x="16"
                  y="24"
                  width="32"
                  height="2"
                  fill="#FFFFFF"
                  opacity="0.4"
                />
                <circle cx="32" cy="38" r="10" fill="#FFFFFF" opacity="0.3" />
                <path
                  d="M32 32v6l4 2"
                  stroke="#FFFFFF"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>

              <!-- Delivery -->
              <svg
                v-else-if="service.id === 'delivery'"
                viewBox="0 0 64 64"
                fill="none"
              >
                <rect
                  x="10"
                  y="16"
                  width="28"
                  height="28"
                  rx="5"
                  :fill="service.color"
                />
                <path
                  d="M24 16v28M10 30h28"
                  stroke="#FFFFFF"
                  stroke-width="2"
                  opacity="0.4"
                />
                <rect
                  x="38"
                  y="28"
                  width="16"
                  height="16"
                  rx="3"
                  :fill="service.color"
                  opacity="0.8"
                />
                <circle cx="18" cy="52" r="6" fill="#333" />
                <circle cx="46" cy="52" r="6" fill="#333" />
              </svg>

              <!-- Shopping -->
              <svg
                v-else-if="service.id === 'shopping'"
                viewBox="0 0 64 64"
                fill="none"
              >
                <path d="M12 20h40l-5 28H17L12 20z" :fill="service.color" />
                <path
                  d="M22 20V14a10 10 0 0120 0v6"
                  stroke="#FFFFFF"
                  stroke-width="3"
                  fill="none"
                  opacity="0.5"
                />
                <circle cx="22" cy="52" r="5" fill="#333" />
                <circle cx="42" cy="52" r="5" fill="#333" />
                <rect
                  x="28"
                  y="26"
                  width="8"
                  height="12"
                  rx="2"
                  fill="#FFFFFF"
                  opacity="0.3"
                />
              </svg>

              <!-- Moving -->
              <svg
                v-else-if="service.id === 'moving'"
                viewBox="0 0 64 64"
                fill="none"
              >
                <rect
                  x="6"
                  y="26"
                  width="38"
                  height="24"
                  rx="5"
                  :fill="service.color"
                />
                <rect
                  x="12"
                  y="30"
                  width="10"
                  height="10"
                  rx="2"
                  fill="#FFFFFF"
                  opacity="0.4"
                />
                <rect
                  x="26"
                  y="30"
                  width="10"
                  height="10"
                  rx="2"
                  fill="#FFFFFF"
                  opacity="0.4"
                />
                <circle cx="16" cy="54" r="5" fill="#333" />
                <circle cx="34" cy="54" r="5" fill="#333" />
                <rect x="44" y="34" width="14" height="16" rx="3" fill="#333" />
              </svg>

              <!-- Queue -->
              <svg
                v-else-if="service.id === 'queue'"
                viewBox="0 0 64 64"
                fill="none"
              >
                <rect
                  x="10"
                  y="10"
                  width="44"
                  height="44"
                  rx="8"
                  :fill="service.color"
                />
                <rect
                  x="18"
                  y="20"
                  width="28"
                  height="5"
                  rx="2"
                  fill="#FFFFFF"
                  opacity="0.4"
                />
                <rect
                  x="18"
                  y="30"
                  width="20"
                  height="5"
                  rx="2"
                  fill="#FFFFFF"
                  opacity="0.4"
                />
                <rect
                  x="18"
                  y="40"
                  width="24"
                  height="5"
                  rx="2"
                  fill="#FFFFFF"
                  opacity="0.4"
                />
                <circle cx="48" cy="48" r="10" fill="#FFD700" />
                <text
                  x="48"
                  y="52"
                  text-anchor="middle"
                  font-size="12"
                  font-weight="bold"
                  fill="#1A1A1A"
                >
                  1
                </text>
              </svg>

              <!-- Laundry -->
              <svg
                v-else-if="service.id === 'laundry'"
                viewBox="0 0 64 64"
                fill="none"
              >
                <rect
                  x="12"
                  y="8"
                  width="40"
                  height="48"
                  rx="6"
                  :fill="service.color"
                />
                <circle cx="32" cy="36" r="14" fill="#FFFFFF" opacity="0.3" />
                <circle cx="32" cy="36" r="9" fill="#FFFFFF" />
                <path
                  d="M26 36c0-3 3-5 6-4s6 1 6-2"
                  stroke="currentColor"
                  stroke-width="2"
                  fill="none"
                  :style="{ color: service.color }"
                />
                <rect
                  x="18"
                  y="14"
                  width="8"
                  height="5"
                  rx="2"
                  fill="#FFFFFF"
                  opacity="0.4"
                />
                <rect
                  x="28"
                  y="14"
                  width="8"
                  height="5"
                  rx="2"
                  fill="#FFFFFF"
                  opacity="0.4"
                />
                <circle cx="44" cy="28" r="3" fill="#FFFFFF" opacity="0.5" />
              </svg>
            </div>

            <span class="service-name">{{ service.name }}</span>
            <span class="service-desc">{{ service.description }}</span>
          </button>
        </div>
      </section>

      <!-- Loyalty Card -->
      <section class="loyalty-section">
        <button class="loyalty-card" @click="navigateTo('/customer/loyalty')">
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
            <span class="loyalty-points"
              >{{ loyaltyPoints.toLocaleString() }} แต้ม</span
            >
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
      </section>

      <!-- Quick Actions -->
      <section class="quick-actions-section">
        <div class="section-header">
          <h2 class="section-title">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            ทางลัด
          </h2>
        </div>

        <div class="quick-grid">
          <button class="quick-item" @click="navigateTo('/customer/history')">
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

          <button
            class="quick-item"
            @click="navigateTo('/customer/promotions')"
          >
            <div class="quick-icon promo">
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
            <span>โปรโมชั่น</span>
          </button>

          <button class="quick-item" @click="navigateTo('/customer/referral')">
            <div class="quick-icon referral">
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

          <button class="quick-item" @click="navigateTo('/customer/help')">
            <div class="quick-icon help">
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
      </section>
    </main>

    <!-- Bottom Navigation -->
    <BottomNavigation
      active-tab="services"
      :history-badge="unratedRidesCount"
      @navigate="navigateTo"
    />
  </div>
</template>

<style scoped>
.services-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #f5f5f5;
  padding-bottom: 90px;
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

/* Header */
.page-header {
  background: #ffffff;
  padding: 12px 20px 0;
  padding-top: calc(12px + env(safe-area-inset-top));
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.back-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn svg {
  width: 24px;
  height: 24px;
  color: #1a1a1a;
}

.back-btn:active {
  transform: scale(0.95);
  background: #e8e8e8;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.wallet-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #e8f5ef;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.wallet-btn svg {
  width: 18px;
  height: 18px;
  color: #00a86b;
}

.wallet-btn span {
  font-size: 13px;
  font-weight: 600;
  color: #00a86b;
}

.wallet-btn:active {
  transform: scale(0.95);
}

/* Category Tabs with Animation */
.category-tabs {
  display: flex;
  gap: 8px;
  padding-bottom: 12px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.category-tabs::-webkit-scrollbar {
  display: none;
}

.category-tab {
  position: relative;
  padding: 10px 18px;
  background: #f5f5f5;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  color: #666666;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.category-tab .tab-text {
  position: relative;
  z-index: 1;
}

.category-tab .tab-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  background: #ffffff;
  border-radius: 2px;
  animation: tabIndicator 0.3s ease forwards;
}

@keyframes tabIndicator {
  from {
    width: 0;
    opacity: 0;
  }
  to {
    width: 20px;
    opacity: 1;
  }
}

.category-tab.active {
  background: #00a86b;
  color: #ffffff;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.category-tab:not(.active):hover {
  background: #e8e8e8;
  transform: translateY(-1px);
}

.category-tab:active {
  transform: scale(0.95);
}

/* Main Content */
.main-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px;
}

/* Section Header */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.section-title svg {
  width: 20px;
  height: 20px;
  color: #00a86b;
}

.see-all-btn {
  padding: 6px 12px;
  background: none;
  border: none;
  font-size: 13px;
  font-weight: 500;
  color: #00a86b;
  cursor: pointer;
}

.see-all-btn:active {
  opacity: 0.7;
}

.order-count {
  padding: 4px 10px;
  background: #e8f5ef;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #00a86b;
}

/* Active Orders */
.active-orders-section {
  background: #ffffff;
  border-radius: 20px;
  padding: 16px;
  margin: -20px -20px 0;
  margin-bottom: 4px;
}

.skeleton-orders {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-order {
  height: 70px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 14px;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.orders-scroll {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.order-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  background: #ffffff;
  border: 2px solid #f0f0f0;
  border-left: 4px solid var(--accent);
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  overflow: hidden;
}

.order-card:active {
  transform: scale(0.98);
  border-color: var(--accent);
}

.order-badge {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-type {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
}

.order-status {
  padding: 4px 8px;
  background: color-mix(in srgb, var(--accent) 10%, white);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
}

.order-route {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #666666;
}

.order-route svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: #999999;
}

.route-from,
.route-to {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.order-pulse {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 8px;
  height: 8px;
  background: var(--accent);
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

/* Recommended Services Section */
.recommended-section {
  /* Default styling */
}

.skeleton-recommendations {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-recommendation {
  height: 80px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 16px;
  animation: shimmer 1.5s infinite;
}

.recommendations-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recommendation-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent) 8%, white) 0%,
    #ffffff 100%
  );
  border: 2px solid color-mix(in srgb, var(--accent) 20%, white);
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: fadeInUp 0.4s ease forwards;
}

.recommendation-card:nth-child(1) {
  animation-delay: 0s;
}
.recommendation-card:nth-child(2) {
  animation-delay: 0.1s;
}
.recommendation-card:nth-child(3) {
  animation-delay: 0.2s;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.recommendation-card:hover {
  border-color: var(--accent);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--accent) 20%, transparent);
  transform: translateY(-2px);
}

.recommendation-card.pressed {
  transform: scale(0.98);
  border-color: var(--accent);
}

.rec-icon {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.rec-icon svg {
  width: 100%;
  height: 100%;
}

.rec-info {
  flex: 1;
  min-width: 0;
}

.rec-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.rec-reason {
  display: block;
  font-size: 12px;
  color: var(--accent);
  margin-top: 2px;
  font-weight: 500;
}

.rec-badge {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent) 15%, white);
  border-radius: 10px;
  flex-shrink: 0;
}

.rec-badge svg {
  width: 18px;
  height: 18px;
  color: var(--accent);
}

/* Quick Access - Saved Places */
.quick-access-section {
  /* Default styling */
}

.quick-places {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.place-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #ffffff;
  border: 2px solid #f0f0f0;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.place-card:active {
  transform: scale(0.98);
  border-color: #00a86b;
  background: #e8f5ef;
}

.place-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  flex-shrink: 0;
}

.place-icon.home {
  background: #e8f5ef;
  color: #00a86b;
}

.place-icon.work {
  background: #e3f2fd;
  color: #2196f3;
}

.place-icon svg {
  width: 22px;
  height: 22px;
}

.place-info {
  flex: 1;
  min-width: 0;
}

.place-name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.place-hint {
  display: block;
  font-size: 12px;
  color: #999999;
  margin-top: 2px;
}

/* Popular Section */
.popular-section {
  /* Default styling */
}

.popular-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.popular-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #ffffff;
  border: 2px solid #f0f0f0;
  border-radius: 18px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.popular-card:hover {
  border-color: var(--accent);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.popular-card.pressed {
  transform: scale(0.98);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 5%, white);
}

.popular-icon {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
}

.popular-icon svg {
  width: 100%;
  height: 100%;
}

.popular-info {
  flex: 1;
  min-width: 0;
}

.popular-name {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.popular-desc {
  display: block;
  font-size: 13px;
  color: #666666;
  margin-top: 2px;
}

.popular-arrow {
  width: 20px;
  height: 20px;
  color: #cccccc;
  flex-shrink: 0;
}

/* Services Grid */
.services-section {
  transition: opacity 0.2s ease;
}

.services-section.category-changing {
  opacity: 0.5;
}

/* Skeleton Services */
.skeleton-services {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.skeleton-service {
  height: 130px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 20px;
  animation: shimmer 1.5s infinite;
}

.skeleton-service:nth-child(1) {
  animation-delay: 0s;
}
.skeleton-service:nth-child(2) {
  animation-delay: 0.1s;
}
.skeleton-service:nth-child(3) {
  animation-delay: 0.2s;
}
.skeleton-service:nth-child(4) {
  animation-delay: 0.3s;
}
.skeleton-service:nth-child(5) {
  animation-delay: 0.4s;
}
.skeleton-service:nth-child(6) {
  animation-delay: 0.5s;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.services-grid.fade-in {
  animation: gridFadeIn 0.4s ease forwards;
}

@keyframes gridFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.service-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 18px 12px;
  background: #ffffff;
  border: 2px solid #f5f5f5;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
}

.service-card:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 5%, white);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.service-card.pressed {
  transform: scale(0.95);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, white);
}

@media (hover: none) {
  .service-card:hover {
    transform: none;
    box-shadow: none;
  }

  .service-card:active {
    transform: scale(0.95);
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, white);
  }
}

.service-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 3px 6px;
  border-radius: 6px;
  font-size: 9px;
  font-weight: 700;
  color: #ffffff;
}

.service-badge.new {
  background: #e53935;
}

.service-badge.popular {
  background: #f5a623;
}

.service-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.service-card:hover .service-icon {
  transform: scale(1.1);
}

.service-card.pressed .service-icon {
  transform: scale(0.95);
}

.service-icon svg {
  width: 100%;
  height: 100%;
}

.service-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  text-align: center;
}

.service-desc {
  font-size: 11px;
  color: #999999;
  text-align: center;
  line-height: 1.3;
}

/* Loyalty Card */
.loyalty-section {
  /* Default styling */
}

.loyalty-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
  border: none;
  border-radius: 18px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.loyalty-card:active {
  transform: scale(0.98);
}

.loyalty-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loyalty-icon svg {
  width: 32px;
  height: 32px;
}

.loyalty-info {
  flex: 1;
}

.loyalty-label {
  display: block;
  font-size: 13px;
  color: #666666;
}

.loyalty-points {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin-top: 2px;
}

.loyalty-arrow {
  width: 20px;
  height: 20px;
  color: #999999;
}

/* Quick Actions */
.quick-actions-section {
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
  background: #ffffff;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-item:active {
  transform: scale(0.95);
  background: #f5f5f5;
}

.quick-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 12px;
  color: #666666;
}

.quick-icon svg {
  width: 22px;
  height: 22px;
}

.quick-icon.promo {
  background: #fff3e0;
  color: #f5a623;
}

.quick-icon.referral {
  background: #f3e5f5;
  color: #9c27b0;
}

.quick-icon.help {
  background: #e8f5ef;
  color: #00a86b;
}

.quick-item span {
  font-size: 12px;
  font-weight: 500;
  color: #666666;
}

/* Responsive */
@media (max-width: 360px) {
  .services-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .service-icon {
    width: 44px;
    height: 44px;
  }

  .service-name {
    font-size: 13px;
  }
}
</style>
