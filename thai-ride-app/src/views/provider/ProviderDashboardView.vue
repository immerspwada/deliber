<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useLocation } from "../../composables/useLocation";

const router = useRouter();
import { useProvider } from "../../composables/useProvider";
import { useProviderTracking } from "../../composables/useProviderTracking";
import ProviderLayout from "../../components/ProviderLayout.vue";
import ActiveRideView from "../../components/provider/ActiveRideView.vue";
import ActiveJobView from "../../components/provider/ActiveJobView.vue";
import RideRequestCard from "../../components/provider/RideRequestCard.vue";
import PromoInfoBadge from "../../components/provider/PromoInfoBadge.vue";
import ChatModal from "../../components/ChatModal.vue";
import VoiceCallModal from "../../components/VoiceCallModal.vue";
import PassengerRatingModal from "../../components/provider/PassengerRatingModal.vue";
import LocationPermissionModal from "../../components/LocationPermissionModal.vue";
import DeliveryProofCapture from "../../components/provider/DeliveryProofCapture.vue";

const { getCurrentPosition, currentLocation, shouldShowPermissionModal } =
  useLocation();
const {
  loading,
  profile,
  isOnline,
  pendingRequests,
  pendingDeliveries,
  pendingShopping,
  activeRide,
  activeJob,
  earnings,
  hasActiveRide,
  hasActiveJob,
  totalPendingJobs,
  fetchProfile,
  toggleOnline,
  acceptRide,
  declineRide,
  updateRideStatus,
  cancelActiveRide,
  fetchEarnings,
  acceptDelivery,
  updateDeliveryStatus,
  acceptShopping,
  updateShoppingStatus,
  fetchPendingDeliveries,
  fetchPendingShopping,
  uploadDeliveryProof,
  updateAppBadge,
} = useProvider();

// Local state
const isLoadingLocation = ref(false);
const showChatModal = ref(false);
const showVoiceCallModal = ref(false);
const showRatingModal = ref(false);
const showLocationPermission = ref(false);
const showDeliveryProofModal = ref(false);
const completedRideInfo = ref<{
  passengerName: string;
  fare: number;
  rideId: string;
} | null>(null);
const isInitialized = ref(false);

// GPS Tracking for provider - initialized after profile loads
let trackingInstance: ReturnType<typeof useProviderTracking> | null = null;
const trackingInitialized = ref(false);

// Computed tracking values
const isTracking = computed(() => trackingInstance?.isTracking?.value ?? false);
const trackingPosition = computed(
  () => trackingInstance?.currentPosition?.value ?? null
);
const trackingError = computed(
  () => trackingInstance?.trackingError?.value ?? null
);
const trackingUpdateCount = computed(
  () => trackingInstance?.updateCount?.value ?? 0
);
const batteryLevel = computed(
  () => trackingInstance?.batteryLevel?.value ?? null
);
const isInsideServiceArea = computed(
  () => trackingInstance?.isInsideServiceArea?.value ?? true
);
const distanceFromCenter = computed(
  () => trackingInstance?.distanceFromCenter?.value ?? 0
);

// Initialize tracking when profile is ready
const initializeTracking = () => {
  if (profile.value?.id && !trackingInstance) {
    trackingInstance = useProviderTracking(profile.value.id);
    trackingInitialized.value = true;
  }
};

// Watch online status to start/stop tracking
watch(isOnline, async (online) => {
  if (!trackingInstance) return;

  if (online) {
    await trackingInstance.startTracking();
  } else {
    trackingInstance.stopTracking();
  }
});

// Watch active ride to adjust tracking frequency
watch(activeRide, (ride) => {
  if (!trackingInstance) return;
  trackingInstance.setActiveRide(!!ride);
});

// Watch online status to update badge
watch(isOnline, (online) => {
  // Clear badge when going offline
  if (!online) {
    updateAppBadge(0);
  }
});

// Watch totalPendingJobs to update PWA badge
watch(totalPendingJobs, (count) => {
  if (isOnline.value) {
    updateAppBadge(count);
  }
});

// Toggle online status
const handleToggleOnline = async () => {
  if (!isOnline.value) {
    // Check if we should show permission modal first
    const shouldShow = await shouldShowPermissionModal();
    if (shouldShow) {
      showLocationPermission.value = true;
      return;
    }
    await executeGoOnline();
  } else {
    await toggleOnline(false);
  }
};

// Execute go online with GPS
const executeGoOnline = async () => {
  isLoadingLocation.value = true;
  try {
    const pos = await getCurrentPosition();
    await toggleOnline(true, pos ? { lat: pos.lat, lng: pos.lng } : undefined);
  } catch (e) {
    console.warn("GPS error:", e);
    globalThis.alert("กรุณาเปิด GPS เพื่อรับงาน");
  } finally {
    isLoadingLocation.value = false;
  }
};

// Handle location permission responses
const handleLocationPermissionAllow = async () => {
  showLocationPermission.value = false;
  await executeGoOnline();
};

const handleLocationPermissionDeny = () => {
  showLocationPermission.value = false;
};

// Open navigation app
const openNavigation = (lat: number, lng: number) => {
  // Try Google Maps first, then Apple Maps
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  const appleMapsUrl = `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;

  // Check if iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS) {
    window.open(appleMapsUrl, "_blank");
  } else {
    window.open(googleMapsUrl, "_blank");
  }
};

// Handle navigation from ActiveRideView
const handleNavigate = () => {
  if (!activeRide.value) return;

  // Navigate to pickup or destination based on status
  const showPickup = ["matched", "arriving", "arrived"].includes(
    activeRide.value.status
  );
  if (showPickup) {
    openNavigation(activeRide.value.pickup.lat, activeRide.value.pickup.lng);
  } else {
    openNavigation(
      activeRide.value.destination.lat,
      activeRide.value.destination.lng
    );
  }
};

// Handle ride status update with rating modal
const handleUpdateStatus = async (
  status:
    | "matched"
    | "arriving"
    | "arrived"
    | "picked_up"
    | "in_progress"
    | "completed"
) => {
  // Save ride info before completing
  if (status === "completed" && activeRide.value) {
    completedRideInfo.value = {
      passengerName: activeRide.value.passenger.name,
      fare: activeRide.value.fare,
      rideId: activeRide.value.id,
    };
  }

  await updateRideStatus(status);

  // Show rating modal after completion
  if (status === "completed") {
    setTimeout(() => {
      showRatingModal.value = true;
    }, 500);
  }
};

// Handle rating submission
const handleRatingSubmit = (rating: number, comment: string) => {
  console.log("Rating submitted:", {
    rating,
    comment,
    rideId: completedRideInfo.value?.rideId,
  });
  // In real app, save to database
  showRatingModal.value = false;
  completedRideInfo.value = null;
};

// Handle rating modal close
const handleRatingClose = () => {
  showRatingModal.value = false;
  completedRideInfo.value = null;
};

// Handle job status update (delivery/shopping)
const handleJobUpdateStatus = async (status: string) => {
  if (!activeJob.value) return;

  if (activeJob.value.type === "delivery") {
    await updateDeliveryStatus(status as "pickup" | "in_transit" | "delivered");
  } else if (activeJob.value.type === "shopping") {
    await updateShoppingStatus(
      status as "shopping" | "delivering" | "completed"
    );
  }
};

// Handle job navigation
const handleJobNavigate = () => {
  if (!activeJob.value) return;

  const showPickup =
    activeJob.value.type === "delivery"
      ? ["matched", "pickup"].includes(activeJob.value.status)
      : ["matched", "shopping"].includes(activeJob.value.status);

  if (showPickup) {
    openNavigation(activeJob.value.pickup.lat, activeJob.value.pickup.lng);
  } else {
    openNavigation(
      activeJob.value.destination.lat,
      activeJob.value.destination.lng
    );
  }
};

// Handle job cancel
const handleJobCancel = async () => {
  // TODO: Implement job cancellation
  console.log("Cancel job:", activeJob.value?.id);
};

// Handle delivery proof photo
const handleTakePhoto = () => {
  showDeliveryProofModal.value = true;
};

// Handle delivery proof upload complete
const handleProofUploaded = (photoUrl: string) => {
  showDeliveryProofModal.value = false;
  console.log("Proof uploaded:", photoUrl);
};

// Initialize
onMounted(async () => {
  try {
    console.log('[ProviderDashboard] Mounting...')
    
    // Always await fetchProfile to ensure profile is ready before toggle
    const providerProfile = await fetchProfile();
    console.log('[ProviderDashboard] Profile loaded:', providerProfile)

    // Check if user is a registered provider
    if (!providerProfile) {
      console.log('[ProviderDashboard] No provider profile, redirecting to onboarding')
      // Not a provider, redirect to onboarding
      router.replace("/provider/onboarding");
      return;
    }

    // Check provider status
    if (providerProfile) {
      const status = (providerProfile as any).status;
      console.log('[ProviderDashboard] Provider status:', status)
      
      if (status === "pending") {
        // Application pending, redirect to onboarding to show status
        console.log('[ProviderDashboard] Status pending, redirecting to onboarding')
        router.replace("/provider/onboarding");
        return;
      } else if (status === "rejected") {
        // Application rejected, redirect to onboarding
        console.log('[ProviderDashboard] Status rejected, redirecting to onboarding')
        router.replace("/provider/onboarding");
        return;
      }
    }

    console.log('[ProviderDashboard] Loading earnings...')
    fetchEarnings(); // Can run in background

    // Initialize GPS tracking after profile is loaded
    console.log('[ProviderDashboard] Initializing tracking...')
    initializeTracking();

    // Start tracking if already online
    if (isOnline.value && trackingInstance) {
      console.log('[ProviderDashboard] Starting tracking (already online)...')
      trackingInstance.startTracking();
      if (activeRide.value) {
        trackingInstance.setActiveRide(true);
      }
    }

    console.log('[ProviderDashboard] Initialization complete')
    isInitialized.value = true;
  } catch (err) {
    console.error('[ProviderDashboard] Mount error:', err)
    // Show error and redirect to onboarding
    router.replace("/provider/onboarding");
  }
});

// Cleanup
onUnmounted(() => {
  // Stop GPS tracking
  if (trackingInstance) {
    trackingInstance.stopTracking();
  }
});
</script>

<template>
  <ProviderLayout>
    <div class="dashboard-page">
      <!-- Loading State -->
      <div v-if="!isInitialized" class="loading-state">
        <div class="loading-spinner"></div>
        <p>กำลังโหลด...</p>
      </div>

      <!-- Error State (if profile failed to load) -->
      <div v-else-if="!profile" class="error-state">
        <div class="error-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <h3>เกิดข้อผิดพลาด</h3>
        <p>ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง</p>
        <button @click="router.push('/provider/onboarding')" class="btn-retry">
          ลองใหม่อีกครั้ง
        </button>
      </div>

      <!-- Active Ride View -->
      <ActiveRideView
        v-else-if="hasActiveRide() && activeRide"
        :ride="activeRide"
        :current-location="
          currentLocation
            ? { lat: currentLocation.lat, lng: currentLocation.lng }
            : undefined
        "
        @update-status="handleUpdateStatus"
        @call="showVoiceCallModal = true"
        @chat="showChatModal = true"
        @cancel="cancelActiveRide"
        @navigate="handleNavigate"
      />

      <!-- Active Job View (Delivery/Shopping) -->
      <ActiveJobView
        v-else-if="hasActiveJob() && activeJob"
        :job="activeJob"
        :current-location="
          currentLocation
            ? { lat: currentLocation.lat, lng: currentLocation.lng }
            : undefined
        "
        @update-status="handleJobUpdateStatus"
        @call="showVoiceCallModal = true"
        @chat="showChatModal = true"
        @cancel="handleJobCancel"
        @navigate="handleJobNavigate"
        @take-photo="handleTakePhoto"
      />

      <!-- Normal Dashboard -->
      <div v-else class="dashboard-content">
        <!-- Status Toggle Card -->
        <div class="status-card" :class="{ online: isOnline }">
          <div class="status-info">
            <div class="status-indicator" :class="{ active: isOnline }"></div>
            <div>
              <h3 class="status-label">
                {{ isOnline ? "ออนไลน์" : "ออฟไลน์" }}
              </h3>
              <p class="status-text">
                {{ isOnline ? "พร้อมรับงาน" : "เปิดเพื่อเริ่มรับงาน" }}
              </p>
            </div>
          </div>
          <button
            @click="handleToggleOnline"
            :disabled="isLoadingLocation || loading"
            :class="['toggle-btn', { active: isOnline }]"
          >
            <span
              v-if="isLoadingLocation || loading"
              class="toggle-loading"
            ></span>
            <span v-else class="toggle-knob"></span>
          </button>
        </div>

        <!-- GPS Tracking Status (when online) -->
        <div v-if="isOnline" class="tracking-status-card">
          <div class="tracking-info">
            <div
              class="tracking-icon"
              :class="{ active: isTracking, error: trackingError }"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div class="tracking-details">
              <span class="tracking-label">{{
                isTracking ? "GPS ทำงานอยู่" : "GPS ไม่ทำงาน"
              }}</span>
              <span v-if="trackingError" class="tracking-error">{{
                trackingError
              }}</span>
              <span v-else-if="isTracking" class="tracking-meta">
                อัพเดท {{ trackingUpdateCount }} ครั้ง
                <span v-if="batteryLevel !== null">
                  · แบต {{ batteryLevel }}%</span
                >
              </span>
            </div>
          </div>
          <div v-if="trackingPosition" class="tracking-coords">
            {{ trackingPosition.lat.toFixed(5) }},
            {{ trackingPosition.lng.toFixed(5) }}
          </div>
        </div>

        <!-- Geofencing Alert (when outside service area) -->
        <div v-if="isOnline && !isInsideServiceArea" class="geofence-alert">
          <div class="geofence-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div class="geofence-text">
            <span class="geofence-title">นอกพื้นที่ให้บริการ</span>
            <span class="geofence-desc"
              >ห่างจากศูนย์กลาง {{ distanceFromCenter.toFixed(1) }} กม.</span
            >
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value"
                >฿{{ earnings.today.toLocaleString() }}</span
              >
              <span class="stat-label">รายได้วันนี้</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ earnings.todayTrips }}</span>
              <span class="stat-label">เที่ยววันนี้</span>
            </div>
          </div>
        </div>

        <!-- Rating Badge -->
        <div class="rating-card">
          <div class="rating-info">
            <svg class="star-icon" fill="currentColor" viewBox="0 0 20 20">
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
            </svg>
            <span class="rating-value">{{ profile?.rating || 4.8 }}</span>
          </div>
          <span class="rating-label">คะแนนเฉลี่ย</span>
        </div>

        <!-- Pending Requests Section -->
        <div class="requests-section">
          <h2 class="section-title">
            งานที่รอรับ
            <span v-if="totalPendingJobs > 0" class="count-badge">
              {{ totalPendingJobs }}
            </span>
          </h2>

          <!-- Offline State -->
          <div v-if="!isOnline" class="offline-card">
            <div class="offline-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            </div>
            <h3>คุณออฟไลน์อยู่</h3>
            <p>เปิดสถานะออนไลน์เพื่อเริ่มรับงาน</p>
          </div>

          <!-- Empty State -->
          <div
            v-else-if="
              pendingRequests.length === 0 &&
              pendingDeliveries.length === 0 &&
              pendingShopping.length === 0
            "
            class="empty-state"
          >
            <svg
              class="empty-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p>ยังไม่มีงานในขณะนี้</p>
            <span>รอสักครู่...</span>
          </div>

          <!-- Requests List -->
          <div v-else class="requests-list">
            <!-- Ride Requests -->
            <RideRequestCard
              v-for="request in pendingRequests"
              :key="'ride-' + request.id"
              :request="request"
              :auto-decline-seconds="30"
              @accept="acceptRide(request.id)"
              @decline="declineRide(request.id)"
            />

            <!-- Delivery Requests -->
            <div
              v-for="delivery in pendingDeliveries"
              :key="'delivery-' + delivery.id"
              class="job-request-card delivery"
            >
              <div class="job-type-header">
                <div class="job-type-badge delivery">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                  <span>ส่งพัสดุ</span>
                </div>
                <span class="job-fee">฿{{ delivery.estimated_fee }}</span>
              </div>
              <div class="job-locations">
                <div class="location-row">
                  <div class="location-dot pickup"></div>
                  <span>{{ delivery.sender_address }}</span>
                </div>
                <div class="location-row">
                  <div class="location-dot destination"></div>
                  <span>{{ delivery.recipient_address }}</span>
                </div>
              </div>
              <div class="job-meta">
                <span v-if="delivery.distance_km"
                  >{{ delivery.distance_km.toFixed(1) }} กม.</span
                >
                <span>{{ delivery.package_type }}</span>
              </div>
              <!-- Promo Badge (if customer used promo code) -->
              <div v-if="delivery.promo_code" class="promo-badge-wrapper">
                <PromoInfoBadge
                  service-type="delivery"
                  :request-id="delivery.id"
                />
              </div>
              <div class="job-actions">
                <button
                  class="btn-decline"
                  @click="
                    pendingDeliveries = pendingDeliveries.filter(
                      (d) => d.id !== delivery.id
                    )
                  "
                >
                  ปฏิเสธ
                </button>
                <button class="btn-accept" @click="acceptDelivery(delivery.id)">
                  รับงาน
                </button>
              </div>
            </div>

            <!-- Shopping Requests -->
            <div
              v-for="shopping in pendingShopping"
              :key="'shopping-' + shopping.id"
              class="job-request-card shopping"
            >
              <div class="job-type-header">
                <div class="job-type-badge shopping">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  <span>ซื้อของ</span>
                </div>
                <span class="job-fee">฿{{ shopping.service_fee }}</span>
              </div>
              <div class="job-locations">
                <div class="location-row">
                  <div class="location-dot pickup"></div>
                  <span>{{
                    shopping.store_name || shopping.store_address || "ร้านค้า"
                  }}</span>
                </div>
                <div class="location-row">
                  <div class="location-dot destination"></div>
                  <span>{{ shopping.delivery_address }}</span>
                </div>
              </div>
              <div class="job-meta">
                <span>งบ ฿{{ shopping.budget_limit?.toLocaleString() }}</span>
                <span v-if="shopping.items?.length"
                  >{{ shopping.items.length }} รายการ</span
                >
              </div>
              <!-- Promo Badge (if customer used promo code) -->
              <div v-if="shopping.promo_code" class="promo-badge-wrapper">
                <PromoInfoBadge
                  service-type="shopping"
                  :request-id="shopping.id"
                />
              </div>
              <div class="job-actions">
                <button
                  class="btn-decline"
                  @click="
                    pendingShopping = pendingShopping.filter(
                      (s) => s.id !== shopping.id
                    )
                  "
                >
                  ปฏิเสธ
                </button>
                <button class="btn-accept" @click="acceptShopping(shopping.id)">
                  รับงาน
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modals -->
      <ChatModal
        v-if="activeRide || activeJob"
        :ride-id="activeRide?.id || activeJob?.id || ''"
        :driver-name="
          activeRide?.passenger.name || activeJob?.customer.name || ''
        "
        :show="showChatModal"
        @close="showChatModal = false"
      />

      <VoiceCallModal
        v-if="activeRide || activeJob"
        :show="showVoiceCallModal"
        :driver-name="
          activeRide?.passenger.name || activeJob?.customer.name || ''
        "
        :driver-phone="
          activeRide?.passenger.phone || activeJob?.customer.phone || ''
        "
        :ride-id="activeRide?.id || activeJob?.id || ''"
        @close="showVoiceCallModal = false"
        @end="showVoiceCallModal = false"
      />

      <!-- Passenger Rating Modal -->
      <PassengerRatingModal
        v-if="completedRideInfo"
        :show="showRatingModal"
        :passenger-name="completedRideInfo.passengerName"
        :fare="completedRideInfo.fare"
        :ride-id="completedRideInfo.rideId"
        @close="handleRatingClose"
        @submit="handleRatingSubmit"
      />

      <!-- Location Permission Modal -->
      <LocationPermissionModal
        :show="showLocationPermission"
        @allow="handleLocationPermissionAllow"
        @deny="handleLocationPermissionDeny"
      />

      <!-- Delivery Proof Modal -->
      <DeliveryProofCapture
        v-if="activeJob && activeJob.type === 'delivery'"
        :show="showDeliveryProofModal"
        :delivery-id="activeJob.id"
        @close="showDeliveryProofModal = false"
        @uploaded="handleProofUploaded"
      />
    </div>
  </ProviderLayout>
</template>

<style scoped>
.dashboard-page {
  min-height: 100vh;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e5e5;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state p {
  font-size: 14px;
  color: #6b6b6b;
}

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 24px;
  text-align: center;
}

.error-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fee2e2;
  border-radius: 50%;
  margin-bottom: 16px;
}

.error-icon svg {
  width: 32px;
  height: 32px;
  color: #e11900;
}

.error-state h3 {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.error-state p {
  font-size: 14px;
  color: #6b6b6b;
  margin-bottom: 24px;
}

.btn-retry {
  padding: 12px 32px;
  background: #00a86b;
  color: white;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-retry:hover {
  background: #008f5b;
}

.btn-retry:active {
  transform: scale(0.98);
}

.dashboard-content {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
}

/* Status Card */
.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background-color: #ffffff;
  border-radius: 16px;
  margin-bottom: 16px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.status-card.online {
  border-color: #00a86b;
  background-color: rgba(0, 168, 107, 0.05);
}

.status-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  background-color: #ccc;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.status-indicator.active {
  background-color: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.2);
}

.status-label {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 2px;
}

.status-text {
  font-size: 13px;
  color: #6b6b6b;
}

.toggle-btn {
  width: 56px;
  height: 32px;
  background-color: #e5e5e5;
  border: none;
  border-radius: 16px;
  position: relative;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.toggle-btn.active {
  background-color: #00a86b;
}

.toggle-knob {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-btn.active .toggle-knob {
  transform: translateX(24px);
}

.toggle-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  border: 2px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* GPS Tracking Status Card */
.tracking-status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: #f6f6f6;
  border-radius: 12px;
  margin-bottom: 16px;
}

.tracking-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tracking-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e5e5e5;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.tracking-icon svg {
  width: 18px;
  height: 18px;
  color: #6b6b6b;
}

.tracking-icon.active {
  background-color: #22c55e;
}

.tracking-icon.active svg {
  color: white;
}

.tracking-icon.error {
  background-color: #fee2e2;
}

.tracking-icon.error svg {
  color: #e11900;
}

.tracking-details {
  display: flex;
  flex-direction: column;
}

.tracking-label {
  font-size: 13px;
  font-weight: 500;
}

.tracking-meta {
  font-size: 11px;
  color: #6b6b6b;
}

.tracking-error {
  font-size: 11px;
  color: #e11900;
}

.tracking-coords {
  font-size: 10px;
  color: #6b6b6b;
  font-family: monospace;
}

/* Geofence Alert */
.geofence-alert {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 12px;
  margin-bottom: 16px;
}

.geofence-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f59e0b;
  border-radius: 8px;
}

.geofence-icon svg {
  width: 20px;
  height: 20px;
  color: white;
}

.geofence-text {
  display: flex;
  flex-direction: column;
}

.geofence-title {
  font-size: 14px;
  font-weight: 600;
  color: #92400e;
}

.geofence-desc {
  font-size: 12px;
  color: #b45309;
}

.tracking-coords {
  font-size: 10px;
  color: #6b6b6b;
  font-family: monospace;
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: #ffffff;
  border-radius: 12px;
}

.stat-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f6f6f6;
  border-radius: 10px;
}

.stat-icon svg {
  width: 22px;
  height: 22px;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
}

.stat-label {
  font-size: 12px;
  color: #6b6b6b;
}

/* Rating Card */
.rating-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background-color: #ffffff;
  border-radius: 12px;
  margin-bottom: 24px;
}

.rating-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.star-icon {
  width: 24px;
  height: 24px;
  color: #f59e0b;
}

.rating-value {
  font-size: 24px;
  font-weight: 700;
}

.rating-label {
  font-size: 14px;
  color: #6b6b6b;
}

/* Requests Section */
.requests-section {
  margin-top: 8px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}

.count-badge {
  padding: 2px 10px;
  background-color: #e11900;
  color: white;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
}

/* Offline Card */
.offline-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  background-color: #ffffff;
  border-radius: 16px;
  text-align: center;
}

.offline-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f6f6f6;
  border-radius: 50%;
  margin-bottom: 16px;
}

.offline-icon svg {
  width: 32px;
  height: 32px;
  color: #6b6b6b;
}

.offline-card h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.offline-card p {
  font-size: 14px;
  color: #6b6b6b;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  background-color: #ffffff;
  border-radius: 16px;
  text-align: center;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: #ccc;
  margin-bottom: 12px;
}

.empty-state p {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.empty-state span {
  font-size: 14px;
  color: #6b6b6b;
}

/* Requests List */
.requests-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Job Request Card Styles */
.job-request-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.job-type-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.job-type-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.job-type-badge.delivery {
  background: #e8f5ef;
  color: #00a86b;
}

.job-type-badge.shopping {
  background: #fef3c7;
  color: #d97706;
}

.job-type-badge svg {
  width: 16px;
  height: 16px;
}

.job-fee {
  font-size: 18px;
  font-weight: 700;
  color: #00a86b;
}

.job-locations {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 10px;
}

.location-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.location-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.location-dot.pickup {
  background: #00a86b;
}

.location-dot.destination {
  background: #e53935;
}

.job-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
  font-size: 12px;
  color: #666;
}

.job-meta span {
  padding: 4px 8px;
  background: #f0f0f0;
  border-radius: 6px;
}

.promo-badge-wrapper {
  margin-bottom: 12px;
}

.job-actions {
  display: flex;
  gap: 10px;
}

.btn-decline {
  flex: 1;
  padding: 12px;
  background: #f6f6f6;
  color: #666;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-accept {
  flex: 2;
  padding: 12px;
  background: #00a86b;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.btn-accept:active {
  transform: scale(0.98);
}
</style>
