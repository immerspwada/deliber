<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();

// Navigation items for customer only (provider uses ProviderLayout)
const customerNavItems = [
  { name: "หน้าหลัก", path: "/customer", icon: "home" },
  { name: "บริการ", path: "/customer/services", icon: "services" },
  { name: "โปรไฟล์", path: "/customer/profile", icon: "user" },
];

const navigationItems = computed(() => customerNavItems);

const activeIndex = ref(0);

const navigateTo = (path: string, index: number) => {
  activeIndex.value = index;
  router.push(path);
};

const isActive = (path: string) => {
  if (path === "/customer/services") {
    return [
      "/customer/services",
      "/customer/ride",
      "/customer/delivery",
      "/customer/shopping",
    ].includes(route.path);
  }
  return route.path === path;
};

const showHeader = computed(() => {
  // Pages that have their own header (exact match only)
  const pagesWithOwnHeader = [
    "/customer",
    "/login",
    "/register",
    "/customer/queue-booking",
    "/customer/moving",
    "/customer/laundry",
    "/customer/delivery",
    "/customer/saved-places",
    "/customer/profile",
    "/customer/wallet",
  ];
  // Normalize path (remove trailing slash)
  const normalizedPath = route.path.replace(/\/$/, "") || "/";
  return !pagesWithOwnHeader.includes(normalizedPath);
});

// Full screen pages that handle their own layout (no padding-bottom needed)
const isFullScreenPage = computed(() => {
  return ["/customer/services", "/customer/ride"].includes(route.path);
});

// Pages that should hide bottom navigation to focus on the feature
const hideBottomNav = computed(() => {
  const pagesWithoutNav = [
    "/customer/ride",
    "/customer/delivery",
    "/customer/shopping",
    "/customer/queue-booking",
    "/customer/moving",
    "/customer/laundry",
    "/customer/wallet",
  ];
  return pagesWithoutNav.includes(route.path);
});

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    "/customer/services": "บริการ",
    "/customer/ride": "เรียกรถ",
    "/customer/delivery": "ส่งของ",
    "/customer/shopping": "ซื้อของ",
    "/customer/profile": "โปรไฟล์",
    "/customer/history": "ประวัติการใช้งาน",
    "/customer/payment-methods": "วิธีการชำระเงิน",
    "/customer/notifications": "การแจ้งเตือน",
    "/customer/wallet": "กระเป๋าเงิน",
    "/customer/promotions": "โปรโมชั่น",
    "/customer/settings": "ตั้งค่า",
    "/customer/help": "ช่วยเหลือ",
  };
  return titles[route.path] || "GOBEAR";
});

const canGoBack = computed(() => {
  return route.path !== "/customer" && window.history.length > 1;
});

const goBack = () => {
  router.back();
};

// Quick back to home for pages without bottom nav
const goToHome = () => {
  router.push("/customer");
};
</script>

<template>
  <div class="app-shell">
    <header v-if="showHeader" class="header">
      <div class="header-content">
        <button v-if="canGoBack" @click="goBack" class="back-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div v-else class="logo">
          <span class="logo-text">GOBEAR</span>
        </div>
        <h1 v-if="canGoBack" class="header-title">{{ pageTitle }}</h1>
        <!-- Quick Home Button - แสดงเมื่อซ่อน BottomNavigation -->
        <button
          v-if="hideBottomNav"
          class="header-home-btn"
          @click="goToHome"
          aria-label="กลับหน้าหลัก"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
        </button>
        <div v-else class="header-spacer"></div>
      </div>
    </header>

    <main
      class="main-content"
      :class="{
        'no-header': !showHeader,
        'full-screen': isFullScreenPage,
        'no-bottom-nav': hideBottomNav,
      }"
    >
      <slot />
    </main>

    <!-- Bottom Navigation with Transition -->
    <Transition name="slide-up">
      <nav v-if="!hideBottomNav" class="bottom-nav">
        <div class="nav-container">
          <button
            v-for="(item, index) in navigationItems"
            :key="item.path"
            @click="navigateTo(item.path, index)"
            :class="['nav-item', { 'nav-item-active': isActive(item.path) }]"
          >
            <div class="nav-icon-wrapper">
              <svg
                v-if="item.icon === 'home'"
                class="nav-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <svg
                v-else-if="item.icon === 'services'"
                class="nav-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              <svg
                v-else-if="item.icon === 'work'"
                class="nav-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              <svg
                v-else-if="item.icon === 'history'"
                class="nav-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <svg
                v-else
                class="nav-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span class="active-dot" v-if="isActive(item.path)"></span>
            </div>
            <span class="nav-label">{{ item.name }}</span>
          </button>
        </div>
      </nav>
    </Transition>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background-color: var(--color-background);
}

.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(12px);
  background-color: rgba(255, 255, 255, 0.9);
}

.header-content {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  max-width: 480px;
  margin: 0 auto;
  min-height: 56px;
}

.back-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 50%;
  margin-left: -8px;
  transition: all 0.2s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.back-btn:hover {
  background-color: var(--color-secondary);
}

.back-btn:active {
  transform: scale(0.92);
  background-color: var(--color-secondary);
}

.back-btn svg {
  width: 24px;
  height: 24px;
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.header-title {
  flex: 1;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
}

.header-spacer {
  width: 40px;
}

.main-content {
  flex: 1;
  /* ✅ CRITICAL FIX: Allow scrolling */
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 90px;
}

.main-content.full-screen {
  padding-bottom: 0;
  /* ✅ CRITICAL: Full screen pages handle their own scrolling */
  overflow: visible;
}

.main-content.no-bottom-nav {
  padding-bottom: 0;
}

/* Bottom Navigation */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-border);
  z-index: 100;
  backdrop-filter: blur(12px);
  background-color: rgba(255, 255, 255, 0.98);
}

.nav-container {
  display: flex;
  justify-content: space-around;
  max-width: 480px;
  margin: 0 auto;
  padding: 6px 8px;
  padding-bottom: max(6px, env(safe-area-inset-bottom));
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 24px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
  transition: all 0.2s ease;
  position: relative;
  min-height: 56px;
  min-width: 72px;
  border-radius: 12px;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.nav-item:active {
  transform: scale(0.92);
  background-color: rgba(0, 0, 0, 0.04);
}

.nav-item-active {
  color: var(--color-text-primary);
}

.nav-item-active:active {
  background-color: rgba(0, 0, 0, 0.06);
}

.nav-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.nav-item-active .nav-icon-wrapper {
  background-color: rgba(0, 0, 0, 0.08);
}

.nav-icon {
  width: 24px;
  height: 24px;
  transition: transform 0.2s ease;
}

.nav-item-active .nav-icon {
  transform: scale(1.05);
  stroke-width: 2.5;
}

.active-dot {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 5px;
  height: 5px;
  background-color: var(--color-primary);
  border-radius: 50%;
  animation: scaleIn 0.2s ease-out;
}

@keyframes scaleIn {
  from {
    transform: translateX(-50%) scale(0);
  }
  to {
    transform: translateX(-50%) scale(1);
  }
}

.nav-label {
  font-size: 11px;
  font-weight: 500;
  margin-top: 4px;
  letter-spacing: -0.2px;
}

/* Header Home Button - ปุ่มกลับหน้าหลักใน Header */
.header-home-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 50%;
  margin-right: -8px;
  transition: all 0.2s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.header-home-btn:hover {
  background-color: var(--color-secondary);
}

.header-home-btn:active {
  transform: scale(0.92);
  background-color: var(--color-secondary);
}

.header-home-btn svg {
  width: 22px;
  height: 22px;
  color: #00a86b;
}

/* Bottom Nav Slide Up Transition */
.slide-up-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.slide-up-leave-active {
  transition: all 0.25s ease-in;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(100%);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
</style>
