<script setup lang="ts">
import { computed, onMounted, ref, onErrorCaptured, watch } from "vue";
import { RouterView, useRoute } from "vue-router";
import AppShell from "./components/AppShell.vue";
import PWAInstallBanner from "./components/PWAInstallBanner.vue";
import ToastContainer from "./components/ToastContainer.vue";
import ErrorBoundary from "./components/ErrorBoundary.vue";
import OfflineIndicator from "./components/OfflineIndicator.vue";
import CelebrationOverlay from "./components/customer/CelebrationOverlay.vue";
import { usePageTransitions } from "./composables/usePageTransitions";
import { useMapPreloader } from "./composables/useMapPreloader";

const route = useRoute();

// Setup page transitions
const { transitionName, setupTransitions } = usePageTransitions();
setupTransitions();

// Initialize map tile preloader (background, non-blocking)
const { init: initMapPreloader } = useMapPreloader({ autoInit: false });

const hideNavigation = computed(() => route.meta?.hideNavigation === true);
const isAdminRoute = computed(() => route.path.startsWith("/admin"));
const appError = ref<string | null>(null);
const isReady = ref(false);

// Capture errors
onErrorCaptured((err) => {
  console.error("[App Error]", err);
  appError.value = err instanceof Error ? err.message : String(err);
  // Return true to prevent error from propagating and breaking the app
  return true;
});

/**
 * Initialize Customer Auth (only for non-admin routes)
 * Admin routes use their own auth system (adminAuth.store.ts)
 */
const initializeCustomerAuth = async (): Promise<void> => {
  // Lazy import to avoid loading customer auth for admin routes
  const { useAuthStore, initializeAuthStore } = await import("./stores/auth");
  const { useRideStore } = await import("./stores/ride");

  const authStore = useAuthStore();
  const rideStore = useRideStore();

  // Use auto-initialization for better session restore
  try {
    await initializeAuthStore();
    
    // If user is logged in, restore any active ride (non-blocking)
    if (authStore.user?.id) {
      rideStore.initialize(authStore.user.id).catch((err) => {
        if (import.meta.env.DEV) {
          console.debug("[Ride Init]", err);
        }
      });
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.debug("[App Init]", err);
    }
  }
};

// Initialize app based on route type
onMounted(async () => {
  // ========================================
  // ADMIN ROUTES - Skip customer auth entirely
  // Admin uses its own auth system (adminAuth.store.ts)
  // ========================================
  if (isAdminRoute.value) {
    console.log(
      "[App] Admin route detected - skipping customer auth initialization"
    );
    isReady.value = true;
    return;
  }

  // ========================================
  // CUSTOMER/PROVIDER ROUTES - Initialize customer auth
  // ========================================
  await initializeCustomerAuth();
  isReady.value = true;
  
  // Initialize map tile preloader in background (non-blocking)
  // This preloads tiles for popular areas and user's location
  setTimeout(() => {
    initMapPreloader().catch(() => {
      // Silently ignore preloader errors
    });
  }, 3000);
});

// Watch for route changes between admin and customer
// This handles cases where user navigates from admin to customer or vice versa
watch(isAdminRoute, async (newIsAdmin, oldIsAdmin) => {
  if (oldIsAdmin && !newIsAdmin) {
    // Navigating FROM admin TO customer - initialize customer auth
    console.log(
      "[App] Navigating from admin to customer - initializing customer auth"
    );
    await initializeCustomerAuth();
  }
  // Note: When navigating from customer to admin, we don't need to do anything
  // Admin auth is handled by adminAuth.store.ts independently
});
</script>

<template>
  <div class="app-root min-h-screen bg-gray-50">
    <!-- Error Display -->
    <div v-if="appError" class="error-banner">
      <p>เกิดข้อผิดพลาด: {{ appError }}</p>
      <button @click="appError = null">ปิด</button>
    </div>

    <!-- Loading State -->
    <div v-if="!isReady" class="app-loading">
      <div class="loading-spinner"></div>
    </div>

    <!-- Offline Indicator -->
    <OfflineIndicator />

    <!-- Main App with Error Boundary -->
    <ErrorBoundary
      v-if="isReady"
      fallback-message="เกิดข้อผิดพลาดในแอป กรุณาลองใหม่อีกครั้ง"
      @error="(err) => console.error('[ErrorBoundary]', err)"
    >
      <!-- Admin routes - NO AppShell wrapper (AdminShell is in admin routes) -->
      <template v-if="isAdminRoute">
        <RouterView v-slot="{ Component }">
          <Suspense>
            <template #default>
              <transition :name="transitionName" mode="out-in">
                <component :is="Component" :key="route.path" />
              </transition>
            </template>
            <template #fallback>
              <div class="admin-loading">
                <div class="loading-spinner"></div>
                <span>กำลังโหลด Admin...</span>
              </div>
            </template>
          </Suspense>
        </RouterView>
      </template>

      <!-- Customer/Provider routes with AppShell -->
      <AppShell v-else-if="!hideNavigation">
        <RouterView v-slot="{ Component }">
          <transition :name="transitionName" mode="out-in">
            <component :is="Component" :key="route.path" />
          </transition>
        </RouterView>
      </AppShell>

      <!-- Routes with hideNavigation (login, register, etc.) -->
      <RouterView v-else v-slot="{ Component }">
        <transition :name="transitionName" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </RouterView>
    </ErrorBoundary>

    <!-- PWA Install Banner - only show on user app -->
    <PWAInstallBanner v-if="!isAdminRoute && isReady" />

    <!-- Global Toast Notifications -->
    <ToastContainer />

    <!-- Celebration Overlay (Global) -->
    <CelebrationOverlay v-if="!isAdminRoute" />
  </div>
</template>

<style>
.app-root {
  font-family: "Sarabun", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  z-index: 9998;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e5e5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #e11900;
  color: white;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 9999;
}

.error-banner button {
  background: white;
  color: #e11900;
  border: none;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
}

/* Admin Loading */
.admin-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 16px;
  color: #6b7280;
}
</style>
