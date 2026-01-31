<script setup lang="ts">
/**
 * CustomerHomeView - หน้าแรกลูกค้าแบบน่ารัก
 * MUNEEF Style: สีเขียว var(--cm-accent), ใส่ใจทุกรายละเอียด
 *
 * Performance Optimizations:
 * - Progressive loading: แสดง UI ทันที ไม่รอ data
 * - Lazy load components: โหลด non-critical components ทีหลัง
 * - Cached data: ใช้ localStorage cache สำหรับ instant display
 * - Deferred fetching: โหลด data ที่ไม่สำคัญทีหลัง
 */
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  defineAsyncComponent,
  shallowRef,
} from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useNotifications } from "../composables/useNotifications";
import { useLoyalty } from "../composables/useLoyalty";
import { useWallet } from "../composables/useWallet";
import { useSearchHistory } from "../composables/useSearchHistory";
import { useServices } from "../composables/useServices";
import { useRideStore } from "../stores/ride";
import { useRideHistory } from "../composables/useRideHistory";
import { useRoleAccess } from "../composables/useRoleAccess";
import { useToast } from "../composables/useToast";
import { usePerformanceMetrics } from "../composables/usePerformanceMetrics";
import { useQuickReorder } from "../composables/useQuickReorder";
import { useErrorHandler } from "../composables/useErrorHandler";
import { useLoadingStates } from "../composables/useLoadingStates";
import { useCacheInvalidation, CacheKeys } from "../composables/useCacheInvalidation";
import { useDebounceFn } from "@vueuse/core";
import { supabase } from "../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Critical Components - โหลดทันที
import ErrorBoundary from "../components/ErrorBoundary.vue";
import WelcomeHeader from "../components/customer/WelcomeHeader.vue";
import CuteServiceGrid from "../components/customer/CuteServiceGrid.vue";
import BottomNavigation from "../components/customer/BottomNavigation.vue";

// Non-critical Components - Lazy load
const ActiveOrderCard = defineAsyncComponent(
  () => import("../components/customer/ActiveOrderCard.vue")
);
const OrderLoadingSkeleton = defineAsyncComponent(
  () => import("../components/customer/OrderLoadingSkeleton.vue")
);
const SavedPlacesRow = defineAsyncComponent(
  () => import("../components/customer/SavedPlacesRow.vue")
);
const QuickShortcuts = defineAsyncComponent(
  () => import("../components/customer/QuickShortcuts.vue")
);
const PromoBanner = defineAsyncComponent(
  () => import("../components/customer/PromoBanner.vue")
);
const RecentDestinations = defineAsyncComponent(
  () => import("../components/customer/RecentDestinations.vue")
);
const ProviderCTA = defineAsyncComponent(
  () => import("../components/customer/ProviderCTA.vue")
);
const QuickReorderCard = defineAsyncComponent(
  () => import("../components/customer/QuickReorderCard.vue")
);
const SmartSuggestionsCard = defineAsyncComponent(
  () => import("../components/customer/SmartSuggestionsCard.vue")
);
const WhereToGoBanner = defineAsyncComponent(
  () => import("../components/customer/WhereToGoBanner.vue")
);

const router = useRouter();
const authStore = useAuthStore();
const rideStore = useRideStore();
const { success: showSuccess, info: showInfo } = useToast();
const { handle: handleError } = useErrorHandler();
const { withLoading, isLoadingKey } = useLoadingStates();
const { get: getCache, set: setCache, invalidate, registerRefresh } = useCacheInvalidation();
const { unreadCount, fetchNotifications } = useNotifications();
const { summary: loyaltySummary, currentPoints: loyaltyCurrentPoints, fetchSummary: fetchLoyaltySummary } =
  useLoyalty();
const { balance, fetchBalance } = useWallet();
const { history: recentPlaces, fetchHistory: fetchRecentPlaces } =
  useSearchHistory();
const { homePlace, workPlace, fetchSavedPlaces } = useServices();
const { unratedRidesCount, fetchUnratedRides } = useRideHistory();
const {
  reorderableItems,
  loading: loadingReorder,
  reordering,
  hasReorderableItems,
  fetchReorderableItems,
  quickReorder,
} = useQuickReorder();

// Multi-role support
const { getRoleBadge } = useRoleAccess();

// Performance Metrics - เก็บ Web Vitals
const { startCollecting, stopCollecting } = usePerformanceMetrics();

// =====================================================
// STATE - แสดง UI ทันทีด้วย cached data
// =====================================================
const isRefreshing = ref(false);
const pullDistance = ref(0);
const isPulling = ref(false);
const startY = ref(0);
const PULL_THRESHOLD = 80;

// Load cached data immediately for instant display
const cachedWallet = getCache<number>(CacheKeys.wallet('customer'));
const cachedLoyalty = getCache<number>(CacheKeys.loyalty('customer'));
const cachedOrders = getCache<ActiveOrder[]>(CacheKeys.orders('customer'));

// Active orders
interface ActiveOrder {
  id: string;
  trackingId?: string;
  type: "ride" | "delivery" | "shopping" | "queue" | "moving" | "laundry";
  typeName: string;
  status: string;
  statusText: string;
  from: string;
  to: string;
  trackingPath: string;
}

// Active orders - ใช้ cached data ก่อน
const activeOrders = ref<ActiveOrder[]>(cachedOrders || []);
let realtimeChannel: RealtimeChannel | null = null;

// Computed - ใช้ cached values สำหรับ instant display
const userName = computed(() => {
  if (authStore.user?.name) {
    // Show role badge for providers
    const roleBadge = getRoleBadge()
    return roleBadge ? `${authStore.user.name}` : authStore.user.name
  }
  return "คุณ";
});

const walletBalance = computed(() => {
  const live = balance.value?.balance;
  if (live !== undefined && live !== null) {
    setCache(CacheKeys.wallet('customer'), live, 5 * 60 * 1000); // 5 min TTL
    return live;
  }
  return cachedWallet || 0;
});

const loyaltyPoints = computed<number>(() => {
  // Use the composable's currentPoints computed which already extracts the value correctly
  const points = loyaltyCurrentPoints.value;
  
  // Validate it's actually a number
  if (typeof points === 'number' && !isNaN(points)) {
    setCache(CacheKeys.loyalty('customer'), points, 5 * 60 * 1000); // 5 min TTL
    return points;
  }
  
  // Fallback to cached value or 0
  return typeof cachedLoyalty === 'number' ? cachedLoyalty : 0;
});

const recentDestinations = computed(() => {
  if (recentPlaces.value && recentPlaces.value.length > 0) {
    return recentPlaces.value.slice(0, 3).map((place: any, index: number) => ({
      id: index + 1,
      name: place.name || place.address?.split(",")[0] || "ไม่ระบุ",
      address: place.address,
      lat: place.lat,
      lng: place.lng,
    }));
  }
  return [];
});

// Main services
const mainServices = [
  {
    id: "ride",
    name: "เรียกรถ",
    description: "รถยนต์ส่วนตัว",
    route: "/customer/ride",
    color: "var(--cm-accent)",
  },
  {
    id: "delivery",
    name: "ส่งของ",
    description: "ส่งพัสดุด่วน",
    route: "/customer/delivery",
    color: "#F5A623",
  },
  {
    id: "shopping",
    name: "ซื้อของ",
    description: "ฝากซื้อสินค้า",
    route: "/customer/shopping",
    color: "#E53935",
  },
  {
    id: "queue",
    name: "จองคิว",
    description: "จองคิวร้านค้า",
    route: "/customer/queue-booking",
    color: "#9C27B0",
  },
];

// More services
const moreServices = [
  {
    id: "moving",
    name: "ขนย้าย",
    description: "บริการขนย้าย",
    route: "/customer/moving",
    color: "var(--cm-accent)",
  },
  {
    id: "laundry",
    name: "ซักรีด",
    description: "รับ-ส่งซักผ้า",
    route: "/customer/laundry",
    color: "#00BCD4",
  },
];

// Shortcuts
const shortcuts = [
  {
    id: "bundles",
    name: "แพ็คเกจ",
    route: "/customer/bundles",
    color: "#9C27B0",
  },
  {
    id: "scheduled",
    name: "นัดล่วงหน้า",
    route: "/customer/scheduled-rides",
    color: "var(--cm-accent)",
  },
  {
    id: "saved",
    name: "บันทึกไว้",
    route: "/customer/saved-places",
    color: "#E53935",
  },
  {
    id: "history",
    name: "ประวัติ",
    route: "/customer/history",
    color: "var(--cm-accent)",
  },
  {
    id: "referral",
    name: "ชวนเพื่อน",
    route: "/customer/referral",
    color: "#9C27B0",
  },
  {
    id: "promotions",
    name: "โปรโมชั่น",
    route: "/customer/promotions",
    color: "#F5A623",
  },
  {
    id: "wallet",
    name: "กระเป๋าเงิน",
    route: "/customer/wallet",
    color: "var(--cm-accent)",
  },
  { id: "help", name: "ช่วยเหลือ", route: "/customer/help", color: "#666666" },
];

// Status text mapping
const getStatusText = (type: string, status: string): string => {
  const statusMap: Record<string, Record<string, string>> = {
    ride: {
      pending: "กำลังหาคนขับ",
      matched: "คนขับกำลังมา",
      arriving: "คนขับใกล้ถึงแล้ว",
      arrived: "คนขับถึงจุดรับแล้ว",
      picked_up: "กำลังเดินทาง",
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

// Fetch active orders - optimized with single combined query
const fetchActiveOrders = async () => {
  if (!authStore.user?.id) return;

  await withLoading('activeOrders', async () => {
    try {
      const userId = authStore.user!.id;
      const orders: ActiveOrder[] = [];

      // Parallel fetch all order types - ใช้ Promise.allSettled เพื่อไม่ให้ error หนึ่งทำให้ทั้งหมดล้ม
      const [ridesResult, deliveriesResult, shoppingResult] =
        await Promise.allSettled([
          supabase
            .from("ride_requests")
            .select(
              "id, tracking_id, status, pickup_address, destination_address"
            )
            .eq("user_id", userId)
            .in("status", ["pending", "matched", "arriving", "arrived", "picked_up", "in_progress"])
            .limit(3),
          supabase
            .from("delivery_requests")
            .select("id, tracking_id, status, sender_address, recipient_address")
            .eq("user_id", userId)
            .in("status", ["pending", "matched", "picked_up", "in_transit"])
            .limit(3),
          supabase
            .from("shopping_requests")
            .select("id, tracking_id, status, store_name, delivery_address")
            .eq("user_id", userId)
            .in("status", ["pending", "matched", "purchased", "delivering"])
            .limit(3),
        ]);

      // Process rides
      if (ridesResult.status === "fulfilled" && ridesResult.value.data) {
        ridesResult.value.data.forEach((r: any) => {
          orders.push({
            id: r.id,
            trackingId: r.tracking_id,
            type: "ride",
            typeName: "เรียกรถ",
            status: r.status,
            statusText: getStatusText("ride", r.status),
            from: r.pickup_address?.split(",")[0] || "",
            to: r.destination_address?.split(",")[0] || "",
            trackingPath: `/customer/ride`,
          });
        });
      }

      // Process deliveries
      if (
        deliveriesResult.status === "fulfilled" &&
        deliveriesResult.value.data
      ) {
        deliveriesResult.value.data.forEach((d: any) => {
          orders.push({
            id: d.id,
            trackingId: d.tracking_id,
            type: "delivery",
            typeName: "ส่งของ",
            status: d.status,
            statusText: getStatusText("delivery", d.status),
            from: d.sender_address?.split(",")[0] || "",
            to: d.recipient_address?.split(",")[0] || "",
            trackingPath: `/tracking/${d.id}`,
          });
        });
      }

      // Process shopping
      if (shoppingResult.status === "fulfilled" && shoppingResult.value.data) {
        shoppingResult.value.data.forEach((s: any) => {
          orders.push({
            id: s.id,
            trackingId: s.tracking_id,
            type: "shopping",
            typeName: "ซื้อของ",
            status: s.status,
            statusText: getStatusText("shopping", s.status),
            from: s.store_name || "ร้านค้า",
            to: s.delivery_address?.split(",")[0] || "",
            trackingPath: `/tracking/${s.id}`,
          });
        });
      }

      activeOrders.value = orders.slice(0, 3);
      setCache(CacheKeys.orders('customer'), activeOrders.value, 5 * 60 * 1000); // 5 min TTL
    } catch (err) {
      handleError(err, 'fetchActiveOrders');
      // Don't show error toast here - silent fail with cached data
      // User can pull to refresh if needed
    }
  });
};

// Computed for loading state
const loadingOrders = computed(() => isLoadingKey('activeOrders'));

// Pull to refresh handlers
const handleTouchStart = (e: TouchEvent) => {
  const scrollTop = document.querySelector(".customer-home")?.scrollTop || 0;
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
    fetchNotifications(),
    fetchLoyaltySummary(),
    fetchBalance(),
    fetchRecentPlaces(),
    fetchSavedPlaces(),
    fetchActiveOrders(),
  ]);
  
  // Invalidate all customer caches to force fresh data
  invalidate(CacheKeys.wallet('customer'));
  invalidate(CacheKeys.loyalty('customer'));
  invalidate(CacheKeys.orders('customer'));
  
  showSuccess("รีเฟรชข้อมูลแล้ว");
};

// Setup realtime subscription with debounce
const debouncedFetchOrders = useDebounceFn(fetchActiveOrders, 1000);

const setupRealtimeSubscription = () => {
  if (!authStore.user?.id) return;
  const userId = authStore.user.id;

  realtimeChannel = supabase
    .channel("customer-home-orders")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "ride_requests",
        filter: `user_id=eq.${userId}`,
      },
      () => debouncedFetchOrders()
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "delivery_requests",
        filter: `user_id=eq.${userId}`,
      },
      () => debouncedFetchOrders()
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shopping_requests",
        filter: `user_id=eq.${userId}`,
      },
      () => debouncedFetchOrders()
    )
    .subscribe();
};

// Navigation handlers
const navigateTo = (path: string) => {
  console.log("CustomerHomeView: navigateTo called with path:", path);
  router.push(path);
};

const handleServiceClick = (service: any) => {
  navigateTo(service.route);
};

const handleShortcutClick = (shortcut: any) => {
  navigateTo(shortcut.route);
};

const handleOrderClick = (id: string) => {
  const order = activeOrders.value.find((o) => o.id === id);
  if (order) navigateTo(order.trackingPath);
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

const handleDestinationClick = (dest: any) => {
  if (dest.lat && dest.lng) {
    rideStore.setDestination({
      lat: dest.lat,
      lng: dest.lng,
      address: dest.address || dest.name || "",
    });
    navigateTo("/customer/ride");
  }
};

const handleReorder = async (item: any) => {
  const newRequestId = await quickReorder(item);
  if (newRequestId) {
    // Navigate to tracking page based on service type
    if (item.service_type === "ride") {
      navigateTo("/customer/ride");
    } else if (item.service_type === "delivery") {
      navigateTo(`/tracking/${newRequestId}`);
    }
  }
};

// Lifecycle - Progressive Loading Strategy
onMounted(() => {
  // Start performance tracking
  startCollecting("/customer");

  // Register background refresh for critical data
  registerRefresh(CacheKeys.wallet('customer'), () => fetchBalance(), 60 * 1000); // Every 1 min
  registerRefresh(CacheKeys.loyalty('customer'), () => fetchLoyaltySummary(), 5 * 60 * 1000); // Every 5 min
  registerRefresh(CacheKeys.orders('customer'), () => fetchActiveOrders(), 30 * 1000); // Every 30 sec

  // Phase 1: Critical data (active orders) - โหลดทันที
  fetchActiveOrders();

  // Phase 2: Important data - โหลดหลังจาก UI render แล้ว
  requestAnimationFrame(() => {
    Promise.all([
      withLoading('wallet', () => fetchBalance().catch(() => {})),
      withLoading('savedPlaces', () => fetchSavedPlaces().catch(() => {})),
      withLoading('reorderItems', () => fetchReorderableItems(3).catch(() => {})),
    ]);
  });

  // Phase 3: Non-critical data - โหลดเมื่อ idle
  if ("requestIdleCallback" in window) {
    requestIdleCallback(
      () => {
        Promise.all([
          withLoading('notifications', () => fetchNotifications().catch(() => {})),
          withLoading('loyalty', () => fetchLoyaltySummary().catch(() => {})),
          withLoading('recentPlaces', () => fetchRecentPlaces().catch(() => {})),
          withLoading('unratedRides', () => fetchUnratedRides().catch(() => {})),
        ]).finally(() => {
          // Stop performance tracking after all data loaded
          stopCollecting();
        });
      },
      { timeout: 2000 }
    );
  } else {
    // Fallback สำหรับ browser ที่ไม่รองรับ
    setTimeout(() => {
      Promise.all([
        fetchNotifications().catch(() => {}),
        fetchLoyaltySummary().catch(() => {}),
        fetchRecentPlaces().catch(() => {}),
        fetchUnratedRides().catch(() => {}),
      ]).finally(() => {
        // Stop performance tracking
        stopCollecting();
      });
    }, 500);
  }

  // Phase 4: Realtime subscriptions - โหลดหลังสุด
  setTimeout(() => {
    setupRealtimeSubscription();
  }, 1000);
});

onUnmounted(() => {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  
  // Clean up background refresh intervals
  invalidate(CacheKeys.wallet('customer'));
  invalidate(CacheKeys.loyalty('customer'));
  invalidate(CacheKeys.orders('customer'));
});
</script>

<template>
  <ErrorBoundary fallback-message="ไม่สามารถโหลดหน้าหลักได้ กรุณาลองใหม่">
    <div
      class="customer-home"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
    <!-- Pull to Refresh Indicator -->
    <div
      class="pull-indicator"
      :class="{ visible: pullDistance > 0, refreshing: isRefreshing }"
      :style="{ transform: `translateY(${pullDistance - 50}px)` }"
      role="status"
      aria-live="polite"
      :aria-label="isRefreshing ? 'กำลังรีเฟรชข้อมูล' : 'ดึงลงเพื่อรีเฟรชข้อมูล'"
    >
      <div class="pull-spinner" :class="{ spinning: isRefreshing }" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21 12a9 9 0 11-6.219-8.56" />
        </svg>
      </div>
      <span>{{
        pullDistance >= PULL_THRESHOLD ? "ปล่อยเพื่อรีเฟรช" : isRefreshing ? "กำลังโหลด..." : "ดึงลงเพื่อรีเฟรช"
      }}</span>
    </div>

    <!-- Welcome Header -->
    <WelcomeHeader
      :user-name="userName"
      :wallet-balance="walletBalance"
      :loyalty-points="loyaltyPoints"
      :unread-notifications="unreadCount"
      @wallet-click="navigateTo('/customer/wallet')"
      @notification-click="navigateTo('/customer/notifications')"
      @profile-click="navigateTo('/customer/profile')"
    />



    <!-- Main Content -->
    <main class="main-content" role="main" aria-label="เนื้อหาหลัก">
      <!-- Where To Go Banner -->
      <section class="where-to-go-section">
        <WhereToGoBanner
          title="ไปไหนดี?"
          subtitle="ค้นหาสถานที่ยอดนิยม"
          @click="navigateTo('/customer/ride')"
        />
      </section>

      <!-- Active Orders -->
      <section
        v-if="loadingOrders || activeOrders.length > 0 || (!loadingOrders && activeOrders.length === 0)"
        class="active-orders-section"
        aria-label="รายการที่กำลังดำเนินการ"
      >
        <div class="section-header">
          <h3 class="section-title">กำลังดำเนินการ</h3>
          <span v-if="!loadingOrders && activeOrders.length > 0" class="order-count" role="status">{{ activeOrders.length }} รายการ</span>
        </div>

        <!-- Skeleton Loading -->
        <div v-if="loadingOrders" class="skeleton-orders" aria-busy="true" aria-label="กำลังโหลดรายการ">
          <OrderLoadingSkeleton v-for="i in 2" :key="i" />
        </div>

        <!-- Orders List -->
        <div v-else-if="activeOrders.length > 0" class="orders-list" role="list">
          <ActiveOrderCard
            v-for="order in activeOrders"
            :key="order.id"
            v-bind="order"
            role="listitem"
            @click="handleOrderClick"
          />
        </div>
      </section>

      <!-- Quick Reorder Section -->
      <section
        v-if="hasReorderableItems && !loadingReorder"
        class="quick-reorder-section"
      >
        <div class="section-header">
          <h3 class="section-title">สั่งซ้ำด้วย 1 คลิก</h3>
          <span class="reorder-badge">ประหยัดเวลา</span>
        </div>

        <div class="reorder-list">
          <QuickReorderCard
            v-for="item in reorderableItems.slice(0, 3)"
            :key="item.id"
            :item="item"
            :loading="reordering"
            @reorder="handleReorder"
          />
        </div>
      </section>

      <!-- Smart Suggestions Section -->
      <SmartSuggestionsCard />

      <!-- Main Services -->
      <CuteServiceGrid
        :services="mainServices"
        title="บริการหลัก"
        :columns="4"
        @service-click="handleServiceClick"
      />

      <!-- Saved Places -->
      <section class="saved-section">
        <SavedPlacesRow
          :home-place="homePlace"
          :work-place="workPlace"
          @place-click="handleSavedPlaceClick"
          @manage-click="
            () => {
              console.log(
                'CustomerHomeView: manage-click received, navigating to /customer/saved-places'
              );
              navigateTo('/customer/saved-places');
            }
          "
        />
      </section>

      <!-- Promo Banner -->
      <section class="promo-section">
        <PromoBanner
          title="โปรโมชั่นพิเศษ"
          subtitle="ดูส่วนลดทั้งหมด"
          code="FIRST20"
          discount="20%"
          @click="navigateTo('/customer/promotions')"
        />
      </section>

      <!-- More Services -->
      <CuteServiceGrid
        :services="moreServices"
        title="บริการเพิ่มเติม"
        :columns="3"
        @service-click="handleServiceClick"
      />

      <!-- Recent Destinations -->
      <RecentDestinations
        :destinations="recentDestinations"
        @destination-click="handleDestinationClick"
        @see-all-click="navigateTo('/customer/saved-places')"
      />

      <!-- Quick Shortcuts -->
      <QuickShortcuts
        :shortcuts="shortcuts"
        title="ทางลัด"
        @shortcut-click="handleShortcutClick"
      />

      <!-- Provider CTA -->
      <section class="provider-section">
        <ProviderCTA />
      </section>
    </main>

    <!-- Bottom Navigation -->
    <BottomNavigation
      active-tab="home"
      :history-badge="unratedRidesCount"
      @navigate="navigateTo"
    />
  </div>
  </ErrorBoundary>
</template>

<style scoped>
.customer-home {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--color-bg-secondary);
  padding-bottom: 90px;
}

/* Pull to Refresh */
.pull-indicator {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%) translateY(-50px);
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--color-bg-primary);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-md);
  z-index: var(--z-sticky);
  opacity: 0;
  transition: opacity var(--transition-base) var(--ease-in-out);
}

.pull-indicator.visible {
  opacity: 1;
}

.pull-indicator span {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.pull-spinner {
  width: 20px;
  height: 20px;
  color: var(--color-primary);
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

/* Main Content */
.main-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
  padding-top: var(--spacing-5);
}

/* Active Orders Section */
.active-orders-section {
  padding: 0 var(--spacing-5);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-3);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.order-count {
  padding: var(--spacing-1) var(--spacing-3);
  background: var(--color-primary-bg);
  border-radius: var(--radius-base);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

/* Skeleton Loading */
.skeleton-orders {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

/* Saved Section */
.saved-section {
  /* Uses SavedPlacesRow component */
}

/* Promo Section */
.promo-section {
  padding: 0 var(--spacing-5);
}

/* Quick Reorder Section */
.quick-reorder-section {
  padding: 0 var(--spacing-5);
}

.reorder-badge {
  padding: var(--spacing-1) var(--spacing-3);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  border-radius: var(--radius-base);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-inverse);
}

.reorder-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

/* Provider Section */
.provider-section {
  padding: 0 var(--spacing-5);
  margin-bottom: var(--spacing-5);
}

/* Where To Go Section */
.where-to-go-section {
  padding: 0 var(--spacing-5);
}
</style>
