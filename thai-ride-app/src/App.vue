<script setup lang="ts">
import { computed, onMounted, ref, onErrorCaptured } from "vue";
import { RouterView, useRoute } from "vue-router";
import AppShell from "./components/AppShell.vue";
import PWAInstallBanner from "./components/PWAInstallBanner.vue";
import ToastContainer from "./components/ToastContainer.vue";
import ErrorBoundary from "./components/ErrorBoundary.vue";
import OfflineIndicator from "./components/OfflineIndicator.vue";
import { useAuthStore } from "./stores/auth";
import { useRideStore } from "./stores/ride";
import { usePageTransitions } from "./composables/usePageTransitions";

const route = useRoute();
const authStore = useAuthStore();
const rideStore = useRideStore();

// Setup page transitions
const { transitionName, setupTransitions } = usePageTransitions();
setupTransitions();

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

// Initialize auth and restore active ride on app mount
onMounted(async () => {
  // Check demo mode first - instant ready
  const isDemoMode = localStorage.getItem("demo_mode") === "true";

  if (isDemoMode) {
    // Demo mode - initialize and show app immediately
    try {
      await authStore.initialize();
    } catch (err) {
      if (import.meta.env.DEV) {
        console.debug("[Demo Init]", err);
      }
    }
    isReady.value = true;

    // Initialize ride store in background if user exists
    if (authStore.user?.id) {
      rideStore.initialize(authStore.user.id).catch((err) => {
        console.warn("[Ride Init]", err);
      });
    }
    return;
  }

  // Check if user has any stored session before waiting
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const projectRef = supabaseUrl?.split("//")[1]?.split(".")[0] || "";
  const hasStoredSession = localStorage.getItem(`sb-${projectRef}-auth-token`);

  if (!hasStoredSession) {
    // No stored session - show app immediately (user is not logged in)
    isReady.value = true;
    return;
  }

  // Has stored session - initialize with race condition handling
  let initCompleted = false;

  const timeout = setTimeout(() => {
    if (!initCompleted) {
      // Use debug level - this is expected behavior, not a warning
      if (import.meta.env.DEV) {
        console.debug("[App] Init taking longer than expected, showing app");
      }
      isReady.value = true;
    }
  }, 2000); // Increased to 2s for slower networks

  try {
    await authStore.initialize();
    initCompleted = true;

    // If user is logged in, restore any active ride (non-blocking)
    if (authStore.user?.id) {
      rideStore.initialize(authStore.user.id).catch((err) => {
        if (import.meta.env.DEV) {
          console.debug("[Ride Init]", err);
        }
      });
    }
  } catch (err) {
    initCompleted = true;
    if (import.meta.env.DEV) {
      console.debug("[App Init]", err);
    }
    // Don't block app for init errors
  } finally {
    clearTimeout(timeout);
    isReady.value = true;
  }
});
</script>

<template>
  <div id="app" class="min-h-screen bg-gray-50">
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
      :show-details="true"
      @error="(err) => console.error('[ErrorBoundary]', err)"
    >
      <AppShell v-if="!hideNavigation">
        <RouterView v-slot="{ Component }">
          <transition :name="transitionName" mode="out-in">
            <component :is="Component" :key="route.path" />
          </transition>
        </RouterView>
      </AppShell>
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
  </div>
</template>

<style>
#app {
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
</style>
