<script setup lang="ts">
/**
 * Feature: F04 - Shopping Service
 * MUNEEF Style UI - Clean and Modern
 * Enhanced UX Flow: 1.ร้านค้า → 2.ที่อยู่ → 3.รายการ → 4.ยืนยัน
 */
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import AddressSearchInput from "../components/AddressSearchInput.vue";
import MapView from "../components/MapView.vue";
import LocationPicker from "../components/LocationPicker.vue";
import { useLocation, type GeoLocation } from "../composables/useLocation";
import { useShopping } from "../composables/useShopping";
import { useServices } from "../composables/useServices";
import {
  useFavoriteShoppingLists,
  type ShoppingFavoriteList,
} from "../composables/useFavoriteShoppingLists";
import { useShoppingImages } from "../composables/useShoppingImages";
import { useRealtimeOrder } from "../composables/useRealtimeOrder";
import { useWalletBalance } from "../composables/useWalletBalance";
import type { PlaceResult } from "../composables/usePlaceSearch";

const router = useRouter();
const { calculateDistance, currentLocation, getCurrentPosition } =
  useLocation();
const { createShoppingRequest, calculateServiceFee, loading, formatStatus } = useShopping();
const {
  homePlace,
  workPlace,
  recentPlaces,
  savedPlaces,
  fetchSavedPlaces,
  fetchRecentPlaces,
} = useServices();
const { favorites, fetchFavorites, saveFavorite, useFavorite, deleteFavorite } =
  useFavoriteShoppingLists();
const {
  images,
  uploading: _uploading,
  addImage,
  removeImage,
  uploadImages,
  MAX_IMAGES,
} = useShoppingImages();
const { subscribe: subscribeToOrders, unsubscribe: unsubscribeFromOrders } = useRealtimeOrder();
const { balance, formattedBalance, loading: walletLoading, fetchBalance } = useWalletBalance();
void _uploading;

// Step Flow
type Step = "store" | "delivery" | "items" | "confirm";
const currentStep = ref<Step>("store");

// UI State
const isGettingLocation = ref(false);
const showStoreMapPicker = ref(false);
const showDeliveryMapPicker = ref(false);
const pressedButton = ref<string | null>(null);
const showExitConfirm = ref(false);
const errorMessage = ref("");
const showErrorToast = ref(false);

// Realtime tracking
const activeShoppingId = ref<string | null>(null);
const realtimeConnected = ref(false);

// Swipe gesture state
const touchStartX = ref(0);
const touchStartY = ref(0);
const isSwiping = ref(false);
const swipeThreshold = 80;
const swipeOffset = ref(0);
const stepDirection = ref<"next" | "prev" | null>(null);

// Modals
const showFavoritesModal = ref(false);
const showSaveFavoriteModal = ref(false);
const newFavoriteName = ref("");
const savingFavorite = ref(false);

// File input ref
const fileInputRef = ref<HTMLInputElement | null>(null);

// Store info
const storeName = ref("");
const storeAddress = ref("");
const storeLocation = ref<GeoLocation | null>(null);

// Delivery info
const deliveryAddress = ref("");
const deliveryLocation = ref<GeoLocation | null>(null);

// Shopping info
const itemList = ref("");
const budgetLimit = ref("");
const specialInstructions = ref("");

// Results
const serviceFee = ref(0);
const estimatedTime = ref(0);
const estimatedDistance = ref(0);

// Quick budget options
const budgetOptions = [500, 1000, 2000, 5000];

// Step labels
const stepLabels = [
  { key: "store", label: "ร้านค้า", number: 1 },
  { key: "delivery", label: "ที่อยู่", number: 2 },
  { key: "items", label: "รายการ", number: 3 },
  { key: "confirm", label: "ยืนยัน", number: 4 },
] as const;

const currentStepIndex = computed(() =>
  stepLabels.findIndex((s) => s.key === currentStep.value),
);

// Favorite places
const favoritePlaces = computed(() =>
  savedPlaces.value.filter((p) => p.place_type === "other").slice(0, 3),
);

const itemCount = computed(() => {
  if (!itemList.value.trim()) return 0;
  return itemList.value.split("\n").filter((line) => line.trim()).length;
});

const hasRoute = computed(
  () => !!(storeLocation.value && deliveryLocation.value),
);

const canSubmit = computed(
  () =>
    storeLocation.value &&
    deliveryLocation.value &&
    itemList.value.trim() &&
    budgetLimit.value &&
    balance.value >= serviceFee.value,
);

const insufficientBalance = computed(() => {
  return serviceFee.value > 0 && balance.value < serviceFee.value;
});

const hasEnteredData = computed(() => {
  return (
    storeAddress.value ||
    deliveryAddress.value ||
    itemList.value ||
    specialInstructions.value ||
    images.value.length > 0
  );
});

// Fetch data on mount
onMounted(() => {
  fetchSavedPlaces();
  fetchRecentPlaces();
  fetchFavorites();
  // Fetch wallet balance on mount
  fetchBalance();
});

// Auto calculate when both locations set
watch([storeLocation, deliveryLocation], async () => {
  if (storeLocation.value && deliveryLocation.value) {
    estimatedDistance.value = calculateDistance(
      storeLocation.value.lat,
      storeLocation.value.lng,
      deliveryLocation.value.lat,
      deliveryLocation.value.lng,
    );
    estimatedTime.value = Math.ceil((estimatedDistance.value / 20) * 60) + 30;
    serviceFee.value = await calculateServiceFee(
      parseFloat(budgetLimit.value) || 0,
      estimatedDistance.value,
    );
  }
});

watch(budgetLimit, async () => {
  if (storeLocation.value && deliveryLocation.value) {
    serviceFee.value = await calculateServiceFee(
      parseFloat(budgetLimit.value) || 0,
      estimatedDistance.value,
    );
  }
});

// Haptic feedback
const triggerHaptic = (type: "light" | "medium" | "heavy" = "light") => {
  if ("vibrate" in navigator) {
    const patterns = { light: 10, medium: 25, heavy: 50 };
    navigator.vibrate(patterns[type]);
  }
};

const handleButtonPress = (id: string) => {
  pressedButton.value = id;
  triggerHaptic("light");
};

const handleButtonRelease = () => {
  pressedButton.value = null;
};

// Navigation
const goBack = () => {
  triggerHaptic("light");
  if (currentStep.value === "delivery") currentStep.value = "store";
  else if (currentStep.value === "items") currentStep.value = "delivery";
  else if (currentStep.value === "confirm") currentStep.value = "items";
  else router.push("/customer");
};

const goHome = () => {
  triggerHaptic("medium");
  if (hasEnteredData.value) {
    showExitConfirm.value = true;
  } else {
    router.push("/customer");
  }
};

const confirmExit = () => {
  triggerHaptic("heavy");
  showExitConfirm.value = false;
  router.push("/customer");
};

const cancelExit = () => {
  triggerHaptic("light");
  showExitConfirm.value = false;
};

const goToStep = (targetStep: Step) => {
  const targetIndex = stepLabels.findIndex((s) => s.key === targetStep);
  if (targetIndex <= currentStepIndex.value) {
    currentStep.value = targetStep;
  }
};

// Swipe gesture handlers
const handleTouchStart = (e: TouchEvent) => {
  if (showStoreMapPicker.value || showDeliveryMapPicker.value) return;
  const touch = e.touches[0];
  if (touch) {
    touchStartX.value = touch.clientX;
    touchStartY.value = touch.clientY;
    isSwiping.value = true;
    swipeOffset.value = 0;
  }
};

const handleTouchMove = (e: TouchEvent) => {
  if (!isSwiping.value) return;
  const touch = e.touches[0];
  if (!touch) return;

  const deltaX = touch.clientX - touchStartX.value;
  const deltaY = touch.clientY - touchStartY.value;

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    const maxOffset = 100;
    swipeOffset.value = Math.max(-maxOffset, Math.min(maxOffset, deltaX * 0.5));
  }
};

const handleTouchEnd = (e: TouchEvent) => {
  if (!isSwiping.value) return;
  isSwiping.value = false;

  const touch = e.changedTouches[0];
  if (!touch) return;

  const deltaX = touch.clientX - touchStartX.value;
  const deltaY = touch.clientY - touchStartY.value;

  if (
    Math.abs(deltaX) > Math.abs(deltaY) &&
    Math.abs(deltaX) > swipeThreshold
  ) {
    if (deltaX > 0) {
      stepDirection.value = "prev";
      goBack();
    } else {
      stepDirection.value = "next";
      handleSwipeNext();
    }
  }

  swipeOffset.value = 0;
  setTimeout(() => {
    stepDirection.value = null;
  }, 300);
};

const handleSwipeNext = () => {
  if (currentStep.value === "store" && storeLocation.value) {
    triggerHaptic("medium");
    currentStep.value = "delivery";
  } else if (currentStep.value === "delivery" && deliveryLocation.value) {
    triggerHaptic("medium");
    currentStep.value = "items";
  } else if (
    currentStep.value === "items" &&
    itemList.value.trim() &&
    budgetLimit.value
  ) {
    triggerHaptic("medium");
    currentStep.value = "confirm";
  }
};

// Location handlers
const useCurrentLocationForStore = async () => {
  isGettingLocation.value = true;
  triggerHaptic("medium");

  try {
    const loc = await getCurrentPosition();
    if (loc) {
      storeLocation.value = loc;
      storeAddress.value = loc.address || "ตำแหน่งปัจจุบัน";
      triggerHaptic("heavy");
      await new Promise((resolve) => setTimeout(resolve, 200));
      currentStep.value = "delivery";
    }
  } catch {
    alert("ไม่สามารถระบุตำแหน่งได้ กรุณาลองใหม่");
  } finally {
    isGettingLocation.value = false;
  }
};

const handleStoreSearchSelect = (place: PlaceResult) => {
  triggerHaptic("light");
  storeAddress.value = place.name;
  storeLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.address,
  };
  currentStep.value = "delivery";
};

const handleDeliverySearchSelect = (place: PlaceResult) => {
  triggerHaptic("light");
  deliveryAddress.value = place.name;
  deliveryLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.address,
  };
  currentStep.value = "items";
};

const selectSavedPlaceForStore = (place: any) => {
  triggerHaptic("medium");
  storeAddress.value = place.name;
  storeLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.address,
  };
  currentStep.value = "delivery";
};

const selectSavedPlaceForDelivery = (place: any) => {
  triggerHaptic("medium");
  deliveryAddress.value = place.name;
  deliveryLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.address,
  };
  currentStep.value = "items";
};

const handleMapPickerConfirm = (
  location: GeoLocation,
  type: "store" | "delivery",
) => {
  triggerHaptic("heavy");
  if (type === "store") {
    storeLocation.value = location;
    storeAddress.value = location.address;
    showStoreMapPicker.value = false;
    currentStep.value = "delivery";
  } else {
    deliveryLocation.value = location;
    deliveryAddress.value = location.address;
    showDeliveryMapPicker.value = false;
    currentStep.value = "items";
  }
};

const handleRouteCalculated = async (data: {
  distance: number;
  duration: number;
}) => {
  estimatedDistance.value = data.distance;
  estimatedTime.value = data.duration + 30;
  serviceFee.value = await calculateServiceFee(
    parseFloat(budgetLimit.value) || 0,
    data.distance,
  );
};

const clearStore = () => {
  storeLocation.value = null;
  storeAddress.value = "";
  storeName.value = "";
};

const clearDelivery = () => {
  deliveryLocation.value = null;
  deliveryAddress.value = "";
};

const selectBudget = (amount: number) => {
  triggerHaptic("light");
  budgetLimit.value = amount.toString();
};

// Favorites functions
const applyFavorite = (fav: ShoppingFavoriteList) => {
  triggerHaptic("medium");
  itemList.value = fav.items;
  if (fav.estimated_budget) {
    budgetLimit.value = fav.estimated_budget.toString();
  }
  if (fav.store_name) {
    storeName.value = fav.store_name;
  }
  if (fav.store_address && fav.store_lat && fav.store_lng) {
    storeAddress.value = fav.store_address;
    storeLocation.value = {
      lat: fav.store_lat,
      lng: fav.store_lng,
      address: fav.store_address,
    };
  }
  useFavorite(fav.id);
  showFavoritesModal.value = false;
};

const handleSaveFavorite = async () => {
  if (!newFavoriteName.value.trim() || !itemList.value.trim()) return;

  triggerHaptic("medium");
  savingFavorite.value = true;
  await saveFavorite({
    name: newFavoriteName.value,
    items: itemList.value,
    storeName: storeName.value || undefined,
    storeAddress: storeAddress.value || undefined,
    storeLat: storeLocation.value?.lat,
    storeLng: storeLocation.value?.lng,
    estimatedBudget: budgetLimit.value
      ? parseFloat(budgetLimit.value)
      : undefined,
  });
  savingFavorite.value = false;
  newFavoriteName.value = "";
  showSaveFavoriteModal.value = false;
};

const handleDeleteFavorite = async (id: string) => {
  triggerHaptic("light");
  await deleteFavorite(id);
};

// Image functions
const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files) {
    Array.from(input.files).forEach((file) => addImage(file));
  }
  input.value = "";
};

// Show error toast
const showError = (message: string) => {
  errorMessage.value = message;
  showErrorToast.value = true;
  triggerHaptic("heavy");
  setTimeout(() => {
    showErrorToast.value = false;
    errorMessage.value = "";
  }, 6000);
};

// Show success notification
const showNotification = (message: string) => {
  // Use error toast for now (can be enhanced with separate notification component)
  errorMessage.value = message;
  showErrorToast.value = true;
  triggerHaptic("medium");
  setTimeout(() => {
    showErrorToast.value = false;
    errorMessage.value = "";
  }, 4000);
};

// Submit
const handleSubmit = async () => {
  if (!canSubmit.value || !storeLocation.value || !deliveryLocation.value) {
    showError("กรุณากรอกข้อมูลให้ครบถ้วน");
    return;
  }

  // Refresh wallet balance before submission
  console.log('🔄 [ShoppingView] Refreshing wallet balance before submission...');
  await fetchBalance();
  
  // Check balance again after refresh
  if (balance.value < serviceFee.value) {
    console.error('❌ [ShoppingView] Insufficient balance after refresh:', {
      balance: balance.value,
      serviceFee: serviceFee.value,
      required: serviceFee.value - balance.value
    });
    showError(`💰 ยอดเงินไม่เพียงพอ\n\nค่าบริการ: ฿${serviceFee.value}\nยอดคงเหลือ: ${formattedBalance.value}\nกรุณาเติมเงินก่อนสั่งบริการ`);
    return;
  }

  triggerHaptic("heavy");

  try {
    // Upload images if any
    let imageUrls: string[] = [];
    if (images.value.length > 0) {
      imageUrls = await uploadImages();
    }

    // Create shopping request
    const result = await createShoppingRequest({
      storeName: storeName.value,
      storeAddress: storeAddress.value,
      storeLocation: storeLocation.value,
      deliveryAddress: deliveryAddress.value,
      deliveryLocation: deliveryLocation.value,
      itemList: itemList.value,
      budgetLimit: parseFloat(budgetLimit.value) || 0,
      specialInstructions: specialInstructions.value,
      distanceKm: estimatedDistance.value,
      referenceImages: imageUrls.length > 0 ? imageUrls : undefined,
    });

    if (result) {
      triggerHaptic("heavy");
      
      // Store shopping ID for realtime tracking
      activeShoppingId.value = result.id;
      
      // Subscribe to realtime updates
      console.log('🔌 [ShoppingView] Subscribing to realtime updates for:', result.id);
      subscribeToOrders({
        onOrderCreated: (order) => {
          console.log('🆕 [ShoppingView] New shopping order:', order);
        },
        onOrderUpdated: (order) => {
          console.log('🔄 [ShoppingView] Shopping order updated:', order);
          if (order.orderId === activeShoppingId.value) {
            showNotification('คำสั่งซื้อของคุณมีการอัพเดท');
          }
        },
        onOrderStatusChanged: (orderId, newStatus) => {
          console.log('📊 [ShoppingView] Status changed:', orderId, newStatus);
          if (orderId === activeShoppingId.value) {
            const statusText = formatStatus(newStatus);
            showNotification(`สถานะเปลี่ยนเป็น: ${statusText}`);
          }
        },
        onProviderAssigned: (orderId, providerId) => {
          console.log('🚗 [ShoppingView] Provider assigned:', orderId, providerId);
          if (orderId === activeShoppingId.value) {
            showNotification('🎉 มีไรเดอร์รับงานแล้ว!');
            triggerHaptic('heavy');
          }
        }
      });
      
      realtimeConnected.value = true;
      console.log('✅ [ShoppingView] Realtime subscription active');
      
      // Refresh wallet balance after successful order
      await fetchBalance();
      
      // Navigate to tracking
      router.push(`/tracking/${result.tracking_id}`);
    } else {
      showError("ไม่สามารถสร้างคำสั่งซื้อได้ กรุณาลองใหม่");
    }
  } catch (error: any) {
    console.error("❌ Error in handleSubmit:", error);

    // Parse error message
    let userMessage = "เกิดข้อผิดพลาด กรุณาลองใหม่";

    if (
      error.message?.includes("ยอดเงิน") ||
      error.message?.includes("INSUFFICIENT_BALANCE")
    ) {
      // Refresh balance to show current amount
      await fetchBalance();
      userMessage = `💰 ยอดเงินไม่เพียงพอ\n\nค่าบริการ: ฿${serviceFee.value}\nยอดคงเหลือ: ${formattedBalance.value}\nกรุณาเติมเงินก่อนสั่งบริการ`;
    } else if (
      error.message?.includes("ไม่พบข้อมูลผู้ใช้") ||
      error.message?.includes("USER_NOT_FOUND")
    ) {
      userMessage = "ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่";
    } else if (error.message) {
      userMessage = error.message;
    }

    showError(userMessage);
  }
};

// Clear error toast
const clearError = () => {
  showErrorToast.value = false;
  errorMessage.value = "";
};

// Cleanup realtime subscription on unmount
onUnmounted(() => {
  if (realtimeConnected.value) {
    console.log('🔌 [ShoppingView] Unsubscribing from realtime');
    unsubscribeFromOrders();
    realtimeConnected.value = false;
  }
});
</script>

<template>
  <div
    class="shopping-page"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <!-- Exit Confirmation Dialog -->
    <Transition name="modal">
      <div
        v-if="showExitConfirm"
        class="confirm-overlay"
        @click.self="cancelExit"
      >
        <div class="confirm-dialog">
          <div class="confirm-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#F5A623"
              stroke-width="2"
            >
              <path
                d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h3 class="confirm-title">ออกจากหน้านี้?</h3>
          <p class="confirm-message">ข้อมูลที่กรอกไว้จะหายไป</p>
          <div class="confirm-actions">
            <button class="confirm-btn cancel" @click="cancelExit">
              ยกเลิก
            </button>
            <button class="confirm-btn exit" @click="confirmExit">ออก</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Top Bar -->
    <div class="top-bar">
      <button class="nav-btn" @click="goBack">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <span class="page-title">ซื้อของ</span>
      <button class="nav-btn home-btn" title="กลับหน้าหลัก" @click="goHome">
        <svg
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

    <!-- Map Section -->
    <div class="map-section">
      <MapView
        :pickup="storeLocation"
        :destination="deliveryLocation"
        :show-route="hasRoute"
        height="100%"
        @route-calculated="handleRouteCalculated"
      />
    </div>

    <!-- Bottom Panel -->
    <div
      class="bottom-panel"
      :class="{
        expanded: currentStep === 'items' || currentStep === 'confirm',
      }"
    >
      <div class="panel-handle"></div>

      <!-- Step Indicator -->
      <div class="step-indicator">
        <div
          v-for="(s, index) in stepLabels"
          :key="s.key"
          :class="[
            'step-item',
            {
              active: s.key === currentStep,
              completed: index < currentStepIndex,
              clickable: index < currentStepIndex,
            },
          ]"
          @click="goToStep(s.key)"
        >
          <div class="step-number">
            <template v-if="index < currentStepIndex">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </template>
            <template v-else>{{ s.number }}</template>
          </div>
          <span class="step-label">{{ s.label }}</span>
        </div>
      </div>

      <!-- Swipe Indicator -->
      <Transition name="fade">
        <div
          v-if="isSwiping && Math.abs(swipeOffset) > 20"
          class="swipe-indicator"
          :class="{
            'swipe-left': swipeOffset < 0,
            'swipe-right': swipeOffset > 0,
          }"
        >
          <div class="swipe-arrow">
            <svg
              v-if="swipeOffset > 0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <svg
              v-else
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
          <span class="swipe-text">{{
            swipeOffset > 0 ? "ย้อนกลับ" : "ถัดไป"
          }}</span>
        </div>
      </Transition>

      <!-- Step 1: Store Selection -->
      <template v-if="currentStep === 'store'">
        <div
          class="step-content animate-step"
          :class="{
            'step-next': stepDirection === 'next',
            'step-prev': stepDirection === 'prev',
          }"
          :style="{
            transform: `translateX(${swipeOffset}px)`,
            opacity: 1 - Math.abs(swipeOffset) / 200,
          }"
        >
          <!-- Store Name Input -->
          <div class="form-card">
            <label class="input-label">ชื่อร้านค้า (ถ้าทราบ)</label>
            <input
              v-model="storeName"
              type="text"
              placeholder="เช่น 7-Eleven, Big C, Lotus's, ร้านชำ"
              class="input-field"
            />
            <p class="input-hint">ระบุชื่อร้านเพื่อให้ไรเดอร์หาได้ง่ายขึ้น</p>
          </div>

          <!-- Quick Actions -->
          <div class="quick-actions-grid">
            <button
              class="quick-action-card"
              :class="{
                'is-loading': isGettingLocation,
                'is-pressed': pressedButton === 'current-loc',
              }"
              :disabled="isGettingLocation"
              @mousedown="handleButtonPress('current-loc')"
              @mouseup="handleButtonRelease"
              @touchstart="handleButtonPress('current-loc')"
              @touchend="handleButtonRelease"
              @click="useCurrentLocationForStore"
            >
              <div class="action-card-icon">
                <template v-if="isGettingLocation">
                  <div class="mini-spinner"></div>
                </template>
                <template v-else>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
                  </svg>
                </template>
              </div>
              <div class="action-card-content">
                <span class="action-card-title">ตำแหน่งปัจจุบัน</span>
                <span class="action-card-subtitle">{{
                  isGettingLocation ? "กำลังค้นหา..." : "ใช้ GPS ระบุตำแหน่ง"
                }}</span>
              </div>
              <div class="action-card-arrow">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </button>

            <button
              class="quick-action-card"
              :class="{ 'is-pressed': pressedButton === 'map-picker' }"
              @mousedown="handleButtonPress('map-picker')"
              @mouseup="handleButtonRelease"
              @touchstart="handleButtonPress('map-picker')"
              @touchend="handleButtonRelease"
              @click="
                showStoreMapPicker = true;
                triggerHaptic('light');
              "
            >
              <div class="action-card-icon map-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div class="action-card-content">
                <span class="action-card-title">เลือกจากแผนที่</span>
                <span class="action-card-subtitle">ปักหมุดตำแหน่งบนแผนที่</span>
              </div>
              <div class="action-card-arrow">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </button>
          </div>

          <!-- Address Search -->
          <div class="form-card">
            <label class="input-label">ค้นหาตำแหน่งร้านค้า</label>
            <AddressSearchInput
              v-model="storeAddress"
              placeholder="พิมพ์ชื่อร้าน ถนน หรือสถานที่..."
              icon="pickup"
              :show-saved-places="false"
              :recent-places="recentPlaces"
              :current-lat="currentLocation?.lat"
              :current-lng="currentLocation?.lng"
              @select="handleStoreSearchSelect"
              @select-recent="selectSavedPlaceForStore"
            />
          </div>

          <!-- Recent Places -->
          <div v-if="recentPlaces.length > 0" class="places-section">
            <h4 class="section-title-small">เคยใช้เมื่อเร็วๆ นี้</h4>
            <div class="places-list">
              <button
                v-for="(place, index) in recentPlaces.slice(0, 3)"
                :key="place.id"
                class="place-item animate-item"
                :style="{ animationDelay: `${index * 50}ms` }"
                @click="selectSavedPlaceForStore(place)"
              >
                <div class="place-icon recent">
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
                <div class="place-info">
                  <span class="place-name">{{ place.name }}</span>
                  <span class="place-address">{{ place.address }}</span>
                </div>
              </button>
            </div>
          </div>

          <!-- Selected Location -->
          <Transition name="scale-fade">
            <div v-if="storeLocation" class="selected-location-card success">
              <div class="success-check">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div class="location-marker store">
                <div class="marker-dot pulse"></div>
              </div>
              <div class="location-info">
                <span class="location-sublabel">ร้านค้า</span>
                <span class="location-label">{{
                  storeName || storeAddress
                }}</span>
              </div>
              <button class="change-btn" @click="clearStore">เปลี่ยน</button>
            </div>
          </Transition>

          <!-- Continue Button -->
          <Transition name="slide-up">
            <button
              v-if="storeLocation"
              class="continue-btn primary"
              @click="
                currentStep = 'delivery';
                triggerHaptic('medium');
              "
            >
              <span>ไปเลือกที่อยู่จัดส่ง</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </Transition>
        </div>
      </template>

      <!-- Step 2: Delivery Address -->
      <template v-else-if="currentStep === 'delivery'">
        <div
          class="step-content animate-step"
          :class="{
            'step-next': stepDirection === 'next',
            'step-prev': stepDirection === 'prev',
          }"
          :style="{
            transform: `translateX(${swipeOffset}px)`,
            opacity: 1 - Math.abs(swipeOffset) / 200,
          }"
        >
          <!-- Route Preview -->
          <div class="route-preview-card">
            <div class="route-preview-item">
              <div class="route-dot store"></div>
              <div class="route-preview-text">
                <span class="route-preview-label">ร้านค้า</span>
                <span class="route-preview-value">{{
                  storeName || storeAddress
                }}</span>
              </div>
              <button
                class="edit-btn"
                @click="
                  currentStep = 'store';
                  triggerHaptic('light');
                "
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                  />
                  <path
                    d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                  />
                </svg>
              </button>
            </div>
            <div class="route-connector-line"></div>
            <div class="route-preview-item destination-slot">
              <div class="route-dot destination empty"></div>
              <div class="route-preview-text">
                <span class="route-preview-label">จุดส่ง</span>
                <span class="route-preview-placeholder">เลือกที่อยู่จัดส่งด้านล่าง</span>
              </div>
            </div>
          </div>

          <!-- Quick Saved Places -->
          <div v-if="homePlace || workPlace" class="quick-destinations">
            <h4 class="section-title-small">ส่งไปที่</h4>
            <div class="quick-dest-row">
              <button
                v-if="homePlace"
                class="quick-dest-chip"
                @click="selectSavedPlaceForDelivery(homePlace)"
              >
                <div class="chip-icon home">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <polyline points="9,22 9,12 15,12 15,22" />
                  </svg>
                </div>
                <span>บ้าน</span>
              </button>
              <button
                v-if="workPlace"
                class="quick-dest-chip"
                @click="selectSavedPlaceForDelivery(workPlace)"
              >
                <div class="chip-icon work">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <rect x="2" y="7" width="20" height="14" rx="2" />
                    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                  </svg>
                </div>
                <span>ที่ทำงาน</span>
              </button>
            </div>
          </div>

          <!-- Map Picker Button -->
          <button
            class="map-picker-btn"
            @click="
              showDeliveryMapPicker = true;
              triggerHaptic('light');
            "
          >
            <div class="map-picker-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div class="map-picker-text">
              <span class="map-picker-title">เลือกจากแผนที่</span>
              <span class="map-picker-subtitle">ปักหมุดตำแหน่งบนแผนที่</span>
            </div>
            <div class="map-picker-arrow">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </button>

          <!-- Address Search -->
          <div class="form-card">
            <label class="input-label">ค้นหาที่อยู่จัดส่ง</label>
            <AddressSearchInput
              v-model="deliveryAddress"
              placeholder="พิมพ์ที่อยู่ บ้านเลขที่ ถนน หรือสถานที่..."
              icon="destination"
              :home-place="homePlace"
              :work-place="workPlace"
              :recent-places="recentPlaces"
              :current-lat="currentLocation?.lat"
              :current-lng="currentLocation?.lng"
              @select="handleDeliverySearchSelect"
              @select-home="selectSavedPlaceForDelivery(homePlace)"
              @select-work="selectSavedPlaceForDelivery(workPlace)"
              @select-recent="selectSavedPlaceForDelivery"
            />
          </div>

          <!-- Selected Location -->
          <Transition name="scale-fade">
            <div v-if="deliveryLocation" class="selected-location-card success">
              <div class="success-check">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <div class="location-marker destination">
                <div class="marker-dot pulse"></div>
              </div>
              <div class="location-info">
                <span class="location-sublabel">ที่อยู่จัดส่ง</span>
                <span class="location-label">{{ deliveryAddress }}</span>
              </div>
              <button class="change-btn" @click="clearDelivery">เปลี่ยน</button>
            </div>
          </Transition>

          <!-- Route Info -->
          <Transition name="scale-fade">
            <div
              v-if="deliveryLocation && estimatedDistance > 0"
              class="route-info-card"
            >
              <div class="route-info-item">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
                </svg>
                <span>{{ estimatedDistance.toFixed(1) }} กม.</span>
              </div>
              <div class="route-info-item">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span>~{{ estimatedTime }} นาที</span>
              </div>
            </div>
          </Transition>

          <!-- Continue Button -->
          <Transition name="slide-up">
            <button
              v-if="deliveryLocation"
              class="continue-btn primary"
              @click="
                currentStep = 'items';
                triggerHaptic('medium');
              "
            >
              <span>ไปเลือกรายการสินค้า</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </Transition>
        </div>
      </template>

      <!-- Step 3: Items & Budget -->
      <template v-else-if="currentStep === 'items'">
        <div
          class="step-content animate-step scrollable"
          :class="{
            'step-next': stepDirection === 'next',
            'step-prev': stepDirection === 'prev',
          }"
        >
          <!-- Wallet Balance Preview (Early Display) -->
          <div v-if="balance > 0" class="wallet-preview-card">
            <div class="wallet-preview-content">
              <div class="wallet-preview-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" />
                  <path d="M1 10h22" />
                </svg>
              </div>
              <div class="wallet-preview-info">
                <span class="wallet-preview-label">ยอดเงินในกระเป๋า</span>
                <span class="wallet-preview-amount">{{ formattedBalance }}</span>
              </div>
            </div>
          </div>

          <!-- Favorites Quick Access -->
          <div v-if="favorites.length > 0" class="favorites-row">
            <button class="favorites-btn" @click="showFavoritesModal = true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              รายการโปรด ({{ favorites.length }})
            </button>
          </div>

          <div class="form-card">
            <div class="label-row">
              <label class="input-label">รายการสินค้าที่ต้องการซื้อ</label>
              <span v-if="itemCount > 0" class="item-badge">{{ itemCount }} รายการ</span>
            </div>
            <textarea
              v-model="itemList"
              placeholder="พิมพ์รายการสินค้า (แยกบรรทัดละ 1 รายการ)&#10;&#10;ตัวอย่าง:&#10;• นมสด 1 กล่อง&#10;• ขนมปัง 2 ห่อ&#10;• ไข่ไก่ 1 แผง&#10;• น้ำดื่ม 6 ขวด"
              rows="6"
              class="input-field textarea"
            ></textarea>
            <p class="input-hint">เขียนให้ละเอียด ระบุจำนวนและยี่ห้อ (ถ้ามี) เพื่อความแม่นยำ</p>

            <!-- Save as Favorite -->
            <button
              v-if="itemList.trim()"
              class="save-favorite-btn"
              @click="showSaveFavoriteModal = true"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              บันทึกเป็นรายการโปรด
            </button>
          </div>

          <!-- Image Upload Section -->
          <div class="form-card">
            <div class="label-row">
              <label class="input-label">รูปภาพอ้างอิง (ไม่บังคับ)</label>
              <span class="image-count">{{ images.length }}/{{ MAX_IMAGES }}</span>
            </div>

            <div class="images-grid">
              <div v-for="img in images" :key="img.id" class="image-item">
                <img :src="img.preview" alt="Reference" />
                <button class="remove-image-btn" @click="removeImage(img.id)">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div v-if="img.uploading" class="image-uploading">
                  <span class="spinner-small"></span>
                </div>
              </div>

              <button
                v-if="images.length < MAX_IMAGES"
                class="add-image-btn"
                @click="triggerFileInput"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <span>เพิ่มรูป</span>
              </button>
            </div>

            <input
              ref="fileInputRef"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              class="hidden-input"
              @change="handleFileSelect"
            />
            <p class="image-hint">
              ถ่ายรูปสินค้าที่ต้องการ หรือแคปหน้าจอจากแอปอื่น<br>
              ช่วยให้ไรเดอร์เข้าใจและหาสินค้าได้ง่ายขึ้น
            </p>
          </div>

          <div class="form-card">
            <label class="input-label">งบประมาณสูงสุด (ไม่รวมค่าบริการ)</label>
            <div class="budget-options">
              <button
                v-for="amount in budgetOptions"
                :key="amount"
                :class="[
                  'budget-btn',
                  { active: budgetLimit === amount.toString() },
                ]"
                @click="selectBudget(amount)"
              >
                ฿{{ amount.toLocaleString() }}
              </button>
            </div>
            <div class="input-with-icon">
              <span class="input-prefix">฿</span>
              <input
                v-model="budgetLimit"
                type="number"
                placeholder="หรือระบุจำนวนเงินเอง"
                class="input-field with-prefix"
              />
            </div>
            <p class="input-hint">ระบุงบที่ต้องการใช้ซื้อสินค้า (ไม่รวมค่าบริการไรเดอร์)</p>
          </div>

          <div class="form-card">
            <label class="input-label">หมายเหตุพิเศษ (ไม่บังคับ)</label>
            <textarea
              v-model="specialInstructions"
              placeholder="ตัวอย่าง:&#10;• ถ้าไม่มียี่ห้อนี้ให้เอายี่ห้ออื่นแทน&#10;• เลือกผลไม้ที่สุกพอดี&#10;• ขอใบเสร็จด้วย"
              rows="3"
              class="input-field textarea"
            ></textarea>
            <p class="input-hint">ข้อแนะนำพิเศษสำหรับไรเดอร์ เช่น การเลือกสินค้า หรือคำขอพิเศษ</p>
          </div>

          <!-- Continue Button - Fixed at Bottom -->
          <div class="continue-btn-container">
            <button
              class="continue-btn primary"
              :disabled="!itemList.trim() || !budgetLimit"
              @click="
                currentStep = 'confirm';
                triggerHaptic('medium');
              "
            >
              <span>ดูสรุปและยืนยัน</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </template>

      <!-- Step 4: Confirmation -->
      <template v-else-if="currentStep === 'confirm'">
        <div class="step-content animate-step scrollable">
          <!-- Summary Card -->
          <div class="summary-card">
            <div class="summary-section">
              <div class="summary-label">ร้านค้า</div>
              <div class="summary-value">{{ storeName || storeAddress }}</div>
            </div>

            <div class="summary-divider"></div>

            <div class="summary-section">
              <div class="summary-label">ที่อยู่จัดส่ง</div>
              <div class="summary-value">{{ deliveryAddress }}</div>
            </div>

            <div class="summary-divider"></div>

            <div class="summary-section">
              <div class="summary-label">
                รายการสินค้า ({{ itemCount }} รายการ)
              </div>
              <div class="items-preview">
                <div
                  v-for="(item, index) in itemList
                    .split('\n')
                    .filter((l) => l.trim())
                    .slice(0, 5)"
                  :key="index"
                  class="item-line"
                >
                  <span class="item-bullet"></span>
                  <span>{{ item }}</span>
                </div>
                <div v-if="itemCount > 5" class="more-items">
                  +{{ itemCount - 5 }} รายการเพิ่มเติม
                </div>
              </div>
            </div>

            <div v-if="images.length > 0" class="summary-divider"></div>

            <div v-if="images.length > 0" class="summary-section">
              <div class="summary-label">รูปภาพอ้างอิง</div>
              <div class="images-preview">
                <img
                  v-for="img in images"
                  :key="img.id"
                  :src="img.preview"
                  alt="Reference"
                />
              </div>
            </div>

            <div v-if="specialInstructions" class="summary-divider"></div>

            <div v-if="specialInstructions" class="summary-section">
              <div class="summary-label">หมายเหตุ</div>
              <div class="summary-value note">{{ specialInstructions }}</div>
            </div>
          </div>

          <!-- Price Summary -->
          <div class="price-summary-card">
            <div class="price-row">
              <span>ระยะทาง</span>
              <span>{{ estimatedDistance.toFixed(1) }} กม.</span>
            </div>
            <div class="price-row">
              <span>เวลาโดยประมาณ</span>
              <span>~{{ estimatedTime }} นาที</span>
            </div>
            <div class="price-row">
              <span>งบประมาณสินค้า</span>
              <span>฿{{ parseInt(budgetLimit).toLocaleString() }}</span>
            </div>
            <div class="price-divider"></div>
            <div class="price-row total">
              <span>ค่าบริการไรเดอร์</span>
              <span class="total-price">฿{{ serviceFee.toLocaleString() }}</span>
            </div>
            <p class="price-note">
              <strong>หมายเหตุ:</strong> ค่าบริการนี้เป็นค่าไรเดอร์เท่านั้น<br>
              ราคาสินค้าจะจ่ายเพิ่มตามจริงเมื่อไรเดอร์ซื้อเสร็จ
            </p>
          </div>

          <!-- Wallet Balance Card - Enhanced -->
          <div class="wallet-balance-card" :class="{ 'insufficient': insufficientBalance, 'loading': walletLoading }">
            <div class="wallet-header">
              <div class="wallet-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" />
                  <path d="M1 10h22" />
                </svg>
              </div>
              <div class="wallet-info">
                <span class="wallet-label">ยอดเงินในกระเป๋า</span>
                <span v-if="walletLoading" class="wallet-loading">
                  <span class="loading-dots">กำลังโหลด<span>.</span><span>.</span><span>.</span></span>
                </span>
                <span v-else class="wallet-amount" :class="{ 'low': insufficientBalance }">
                  {{ formattedBalance }}
                </span>
              </div>
              <!-- Refresh Button -->
              <button 
                v-if="!walletLoading" 
                class="wallet-refresh-btn"
                :disabled="walletLoading"
                @click="fetchBalance(); triggerHaptic('light')"
                title="รีเฟรชยอดเงิน"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 4v6h6M23 20v-6h-6" />
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                </svg>
              </button>
            </div>
            
            <!-- Insufficient Balance Warning -->
            <Transition name="slide-down">
              <div v-if="insufficientBalance" class="insufficient-warning">
                <div class="warning-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div class="warning-text">
                  <strong>⚠️ ยอดเงินไม่เพียงพอ</strong>
                  <p>ต้องการ <strong>฿{{ serviceFee.toLocaleString() }}</strong> แต่มีเพียง <strong>{{ formattedBalance }}</strong></p>
                  <p class="topup-hint">💡 ต้องเติมเงินอีก <strong>฿{{ (serviceFee - balance).toLocaleString() }}</strong></p>
                </div>
              </div>
            </Transition>

            <!-- Balance After Payment - Enhanced -->
            <Transition name="slide-down">
              <div v-if="!insufficientBalance && serviceFee > 0" class="balance-after">
                <div class="balance-breakdown">
                  <div class="breakdown-row">
                    <span>ยอดปัจจุบัน</span>
                    <span>{{ formattedBalance }}</span>
                  </div>
                  <div class="breakdown-row deduct">
                    <span>หักค่าบริการ</span>
                    <span>-฿{{ serviceFee.toLocaleString() }}</span>
                  </div>
                  <div class="breakdown-divider"></div>
                  <div class="breakdown-row remaining">
                    <span>คงเหลือหลังชำระ</span>
                    <span class="balance-value">฿{{ (balance - serviceFee).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
                  </div>
                </div>
              </div>
            </Transition>
          </div>

          <!-- Submit Button - Fixed at Bottom -->
          <div class="submit-btn-container">
            <button
              v-if="insufficientBalance"
              class="submit-btn topup"
              @click="router.push('/wallet')"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              เติมเงินในกระเป๋า
            </button>
            <button
              v-else
              class="submit-btn"
              :disabled="loading || !canSubmit"
              @click="handleSubmit"
            >
              <span v-if="loading" class="spinner"></span>
              <svg
                v-else
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
              {{ loading ? "กำลังสร้าง..." : "ยืนยันคำสั่งซื้อ" }}
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Location Picker Modal - Store -->
    <Transition name="modal">
      <LocationPicker
        v-if="showStoreMapPicker"
        title="เลือกตำแหน่งร้านค้า"
        :initial-location="storeLocation || currentLocation"
        @confirm="(loc) => handleMapPickerConfirm(loc, 'store')"
        @close="showStoreMapPicker = false"
      />
    </Transition>

    <!-- Location Picker Modal - Delivery -->
    <Transition name="modal">
      <LocationPicker
        v-if="showDeliveryMapPicker"
        title="เลือกตำแหน่งจัดส่ง"
        :initial-location="deliveryLocation || currentLocation"
        @confirm="(loc) => handleMapPickerConfirm(loc, 'delivery')"
        @close="showDeliveryMapPicker = false"
      />
    </Transition>

    <!-- Favorites Modal -->
    <Transition name="modal">
      <div
        v-if="showFavoritesModal"
        class="modal-overlay"
        @click.self="showFavoritesModal = false"
      >
        <div class="modal-content">
          <div class="modal-header">
            <h3>รายการโปรด</h3>
            <button class="close-btn" @click="showFavoritesModal = false">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="favorites-list">
            <div v-for="fav in favorites" :key="fav.id" class="favorite-item">
              <div class="favorite-info" @click="applyFavorite(fav)">
                <div class="favorite-name">{{ fav.name }}</div>
                <div class="favorite-meta">
                  <span>{{
                    fav.items.split("\n").filter((l) => l.trim()).length
                  }}
                    รายการ</span>
                  <span v-if="fav.estimated_budget">฿{{ fav.estimated_budget.toLocaleString() }}</span>
                </div>
                <div v-if="fav.use_count > 0" class="favorite-usage">
                  ใช้แล้ว {{ fav.use_count }} ครั้ง
                </div>
              </div>
              <button
                class="delete-favorite-btn"
                @click.stop="handleDeleteFavorite(fav.id)"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
            <div v-if="favorites.length === 0" class="empty-favorites">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <p>ยังไม่มีรายการโปรด</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Save Favorite Modal -->
    <Transition name="modal">
      <div
        v-if="showSaveFavoriteModal"
        class="modal-overlay"
        @click.self="showSaveFavoriteModal = false"
      >
        <div class="modal-content small">
          <div class="modal-header">
            <h3>บันทึกรายการโปรด</h3>
            <button class="close-btn" @click="showSaveFavoriteModal = false">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <label class="input-label">ชื่อรายการ</label>
            <input
              v-model="newFavoriteName"
              type="text"
              placeholder="เช่น ของใช้ประจำสัปดาห์"
              class="input-field"
            />
            <p class="save-hint">จะบันทึกรายการสินค้า {{ itemCount }} รายการ</p>
          </div>
          <div class="modal-actions">
            <button
              class="btn-secondary"
              @click="showSaveFavoriteModal = false"
            >
              ยกเลิก
            </button>
            <button
              class="btn-primary"
              :disabled="!newFavoriteName.trim() || savingFavorite"
              @click="handleSaveFavorite"
            >
              <span v-if="savingFavorite" class="spinner"></span>
              {{ savingFavorite ? "กำลังบันทึก..." : "บันทึก" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Error Toast -->
    <Transition name="slide-down">
      <div v-if="showErrorToast" class="error-toast">
        <div class="error-toast-content">
          <div class="error-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div class="error-message">{{ errorMessage }}</div>
          <button class="error-close" @click="clearError">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.shopping-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

/* Top Bar */
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  z-index: 100;
  border-bottom: 1px solid #f0f0f0;
}

.nav-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #f5f5f5;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:active {
  transform: scale(0.95);
  background: #e8e8e8;
}

.nav-btn svg {
  width: 22px;
  height: 22px;
  color: #1a1a1a;
}

.page-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
}

/* Map Section */
.map-section {
  position: fixed;
  top: 56px;
  left: 0;
  right: 0;
  height: 35vh;
  z-index: 1;
}

/* Bottom Panel */
.bottom-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  top: calc(56px + 30vh);
  background: #ffffff;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  z-index: 10;
  transition: top 0.3s ease;
  overflow: hidden;
}

.bottom-panel.expanded {
  top: 56px;
}

.panel-handle {
  width: 40px;
  height: 4px;
  background: #e8e8e8;
  border-radius: 2px;
  margin: 12px auto 8px;
  flex-shrink: 0;
}

/* Step Indicator */
.step-indicator {
  display: flex;
  justify-content: space-between;
  padding: 0 24px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: default;
  transition: all 0.2s;
}

.step-item.clickable {
  cursor: pointer;
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #999999;
  transition: all 0.3s;
}

.step-item.active .step-number {
  background: #00a86b;
  color: #ffffff;
  transform: scale(1.1);
}

.step-item.completed .step-number {
  background: #00a86b;
  color: #ffffff;
}

.step-item.completed .step-number svg {
  width: 14px;
  height: 14px;
}

.step-label {
  font-size: 11px;
  color: #999999;
  font-weight: 500;
}

.step-item.active .step-label {
  color: #00a86b;
  font-weight: 600;
}

.step-item.completed .step-label {
  color: #1a1a1a;
}

/* Step Content */
.step-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.step-content.scrollable {
  padding-bottom: 24px;
}

/* Submit/Continue Button Container - At bottom of content, not floating */
.submit-btn-container,
.continue-btn-container {
  padding: 16px 0;
  margin-top: 16px;
}

.continue-btn-container .continue-btn:disabled {
  background: #e8e8e8;
  color: #999999;
  box-shadow: none;
  cursor: not-allowed;
}

.animate-step {
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.step-next {
  animation: slideOutLeft 0.3s ease;
}

.step-prev {
  animation: slideOutRight 0.3s ease;
}

@keyframes slideOutLeft {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-100%);
  }
}

@keyframes slideOutRight {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(100%);
  }
}

/* Step Header */
.step-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.step-header-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-header-icon svg {
  width: 24px;
  height: 24px;
}

.step-header-icon.store-icon {
  background: #e8f5ef;
  color: #00a86b;
}

.step-header-icon.delivery-icon {
  background: #fff3e0;
  color: #f5a623;
}

.step-header-icon.items-icon {
  background: #e3f2fd;
  color: #2196f3;
}

.step-header-icon.confirm-icon {
  background: #e8f5ef;
  color: #00a86b;
}

.step-header-text h2 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.3;
}

.step-header-text p {
  font-size: 13px;
  color: #999999;
  margin: 4px 0 0;
  line-height: 1.4;
}

/* Quick Actions Grid */
.quick-actions-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.quick-action-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #ffffff;
  border: 2px solid #f0f0f0;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-action-card:active,
.quick-action-card.is-pressed {
  transform: scale(0.98);
  border-color: #00a86b;
  background: #f8fff8;
}

.quick-action-card.is-loading {
  opacity: 0.7;
  pointer-events: none;
}

.action-card-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #e8f5ef;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00a86b;
  flex-shrink: 0;
}

.action-card-icon svg {
  width: 22px;
  height: 22px;
}

.action-card-icon.map-icon {
  background: #fff3e0;
  color: #f5a623;
}

.action-card-content {
  flex: 1;
  text-align: left;
}

.action-card-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.action-card-subtitle {
  display: block;
  font-size: 13px;
  color: #666666;
  margin-top: 2px;
}

.action-card-arrow {
  color: #cccccc;
}

.action-card-arrow svg {
  width: 20px;
  height: 20px;
}

/* Form Card */
.form-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #f0f0f0;
}

.input-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #666666;
  margin-bottom: 8px;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.item-badge {
  font-size: 12px;
  font-weight: 600;
  color: #00a86b;
  background: #e8f5ef;
  padding: 4px 10px;
  border-radius: 12px;
}

.input-field {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e8e8e8;
  border-radius: 12px;
  font-size: 15px;
  color: #1a1a1a;
  background: #ffffff;
  transition: border-color 0.2s;
}

.input-field:focus {
  outline: none;
  border-color: #00a86b;
}

.input-field::placeholder {
  color: #999999;
}

.input-hint {
  font-size: 12px;
  color: #666666;
  margin: 8px 0 0;
  line-height: 1.5;
}

.textarea {
  resize: none;
  line-height: 1.5;
}

/* Budget Options */
.budget-options {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.budget-btn {
  padding: 10px 16px;
  border: 2px solid #e8e8e8;
  border-radius: 10px;
  background: #ffffff;
  font-size: 14px;
  font-weight: 600;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s;
}

.budget-btn:active {
  transform: scale(0.96);
}

.budget-btn.active {
  border-color: #00a86b;
  background: #e8f5ef;
  color: #00a86b;
}

.input-with-icon {
  position: relative;
}

.input-prefix {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 15px;
  font-weight: 600;
  color: #666666;
}

.input-field.with-prefix {
  padding-left: 36px;
}

/* Quick Destinations */
.quick-destinations {
  margin-bottom: 16px;
}

.section-title-small {
  font-size: 13px;
  font-weight: 600;
  color: #666666;
  margin: 0 0 10px;
}

.quick-dest-row {
  display: flex;
  gap: 10px;
}

.quick-dest-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #ffffff;
  border: 2px solid #f0f0f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-dest-chip:active {
  transform: scale(0.98);
  border-color: #00a86b;
}

.chip-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chip-icon svg {
  width: 18px;
  height: 18px;
}

.chip-icon.home {
  background: #e8f5ef;
  color: #00a86b;
}

.chip-icon.work {
  background: #e3f2fd;
  color: #2196f3;
}

.quick-dest-chip span {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

/* Places Section */
.places-section {
  margin-bottom: 16px;
}

.places-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.place-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.place-item:active {
  background: #f5f5f5;
}

.animate-item {
  animation: fadeInUp 0.3s ease forwards;
  opacity: 0;
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

.place-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.place-icon svg {
  width: 18px;
  height: 18px;
}

.place-icon.recent {
  background: #f5f5f5;
  color: #666666;
}

.place-info {
  flex: 1;
  min-width: 0;
}

.place-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.place-address {
  display: block;
  font-size: 12px;
  color: #999999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Selected Location Card */
.selected-location-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #ffffff;
  border: 2px solid #e8e8e8;
  border-radius: 14px;
  margin-top: 12px;
}

.selected-location-card.success {
  border-color: #00a86b;
  background: #f8fff8;
}

.success-check {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #00a86b;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  flex-shrink: 0;
}

.success-check svg {
  width: 14px;
  height: 14px;
}

.location-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.location-marker.store {
  background: #00a86b;
}

.location-marker.destination {
  background: #e53935;
}

.marker-dot {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: inherit;
}

.marker-dot.pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
}

.location-info {
  flex: 1;
  min-width: 0;
}

.location-sublabel {
  display: block;
  font-size: 11px;
  color: #999999;
  margin-bottom: 2px;
}

.location-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.change-btn {
  padding: 8px 14px;
  background: #f5f5f5;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #666666;
  cursor: pointer;
}

.change-btn:active {
  background: #e8e8e8;
}

/* Route Preview Card */
.route-preview-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #f0f0f0;
}

.route-preview-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.route-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.route-dot.store {
  background: #00a86b;
}

.route-dot.destination {
  background: #e53935;
}

.route-dot.empty {
  background: transparent;
  border: 2px dashed #cccccc;
}

.route-preview-text {
  flex: 1;
  min-width: 0;
}

.route-preview-label {
  display: block;
  font-size: 11px;
  color: #999999;
}

.route-preview-value {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.route-preview-placeholder {
  display: block;
  font-size: 14px;
  color: #999999;
}

.edit-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #f5f5f5;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.edit-btn svg {
  width: 16px;
  height: 16px;
  color: #666666;
}

.route-connector-line {
  width: 2px;
  height: 24px;
  background: linear-gradient(to bottom, #00a86b, #e53935);
  margin: 8px 0 8px 5px;
}

/* Map Picker Button */
.map-picker-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: #ffffff;
  border: 2px solid #f0f0f0;
  border-radius: 14px;
  cursor: pointer;
  margin-bottom: 12px;
  transition: all 0.2s;
}

.map-picker-btn:active {
  border-color: #00a86b;
  background: #f8fff8;
}

.map-picker-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #fff3e0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f5a623;
}

.map-picker-icon svg {
  width: 22px;
  height: 22px;
}

.map-picker-text {
  flex: 1;
  text-align: left;
}

.map-picker-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.map-picker-subtitle {
  display: block;
  font-size: 13px;
  color: #666666;
}

.map-picker-arrow {
  color: #cccccc;
}

.map-picker-arrow svg {
  width: 20px;
  height: 20px;
}

/* Route Info Card */
.route-info-card {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 14px;
  background: #f5f5f5;
  border-radius: 12px;
  margin-top: 12px;
}

.route-info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #666666;
}

.route-info-item svg {
  width: 18px;
  height: 18px;
}

/* Continue Button */
.continue-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 16px 24px;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 16px;
  transition: all 0.2s;
}

.continue-btn.primary {
  background: #00a86b;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.continue-btn.primary:active {
  transform: scale(0.98);
}

.continue-btn svg {
  width: 20px;
  height: 20px;
}

/* Favorites */
.favorites-row {
  margin-bottom: 12px;
}

.favorites-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fff0f5;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #e91e63;
  cursor: pointer;
  width: 100%;
  justify-content: center;
}

.favorites-btn svg {
  width: 18px;
  height: 18px;
}

.save-favorite-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 12px;
  padding: 10px;
  background: none;
  border: 1px dashed #e91e63;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  color: #e91e63;
  cursor: pointer;
  width: 100%;
}

.save-favorite-btn svg {
  width: 16px;
  height: 16px;
}

/* Image Upload */
.image-count {
  font-size: 12px;
  color: #999999;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-image-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.remove-image-btn svg {
  width: 14px;
  height: 14px;
  color: #ffffff;
}

.image-uploading {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-image-btn {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: #f5f5f5;
  border: 2px dashed #e8e8e8;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-image-btn:active {
  background: #e8e8e8;
}

.add-image-btn svg {
  width: 24px;
  height: 24px;
  color: #999999;
}

.add-image-btn span {
  font-size: 11px;
  color: #999999;
}

.hidden-input {
  display: none;
}

.image-hint {
  font-size: 12px;
  color: #999999;
  margin: 0;
}

/* Summary Card */
.summary-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #f0f0f0;
}

.summary-section {
  padding: 8px 0;
}

.summary-label {
  font-size: 12px;
  color: #999999;
  margin-bottom: 4px;
}

.summary-value {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.summary-value.note {
  color: #666666;
  font-style: italic;
}

.summary-divider {
  height: 1px;
  background: #f0f0f0;
  margin: 8px 0;
}

.items-preview {
  margin-top: 8px;
}

.item-line {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #1a1a1a;
  padding: 4px 0;
}

.item-bullet {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #00a86b;
  flex-shrink: 0;
}

.more-items {
  font-size: 13px;
  color: #666666;
  padding: 4px 0;
  margin-left: 14px;
}

.images-preview {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.images-preview img {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
}

/* Price Summary Card */
.price-summary-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  border: 2px solid #00a86b;
}

.price-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  color: #666666;
}

.price-row span:last-child {
  font-weight: 500;
  color: #1a1a1a;
}

.price-row.total {
  padding-top: 12px;
}

.price-row.total span:first-child {
  font-weight: 600;
  color: #1a1a1a;
}

.total-price {
  font-size: 24px;
  font-weight: 700;
  color: #00a86b !important;
}

.price-divider {
  height: 1px;
  background: #e8e8e8;
  margin: 8px 0;
}

.price-note {
  font-size: 12px;
  color: #999999;
  text-align: right;
  margin: 8px 0 0;
}

/* Submit Button */
.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 18px 24px;
  background: linear-gradient(135deg, #00a86b 0%, #008f5b 100%);
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
  transition: all 0.2s;
}

.submit-btn:active {
  transform: scale(0.98);
}

.submit-btn:disabled {
  background: #cccccc;
  box-shadow: none;
  cursor: not-allowed;
}

.submit-btn svg {
  width: 20px;
  height: 20px;
}

/* Spinner */
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.mini-spinner {
  width: 22px;
  height: 22px;
  border: 2px solid rgba(0, 168, 107, 0.2);
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Swipe Indicator */
.swipe-indicator {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 20px;
  color: #ffffff;
  z-index: 100;
}

.swipe-indicator.swipe-left {
  right: 20px;
}

.swipe-indicator.swipe-right {
  left: 20px;
}

.swipe-arrow svg {
  width: 20px;
  height: 20px;
}

.swipe-text {
  font-size: 14px;
  font-weight: 500;
}

/* Confirm Dialog */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.confirm-dialog {
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  width: 100%;
  max-width: 320px;
  text-align: center;
}

.confirm-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
}

.confirm-icon svg {
  width: 100%;
  height: 100%;
}

.confirm-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px;
}

.confirm-message {
  font-size: 14px;
  color: #666666;
  margin: 0 0 20px;
}

.confirm-actions {
  display: flex;
  gap: 12px;
}

.confirm-btn {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.confirm-btn.cancel {
  background: #f5f5f5;
  color: #666666;
}

.confirm-btn.exit {
  background: #e53935;
  color: #ffffff;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: #ffffff;
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 480px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.modal-content.small {
  max-height: auto;
  border-radius: 20px;
  margin-bottom: auto;
  margin-top: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.close-btn svg {
  width: 20px;
  height: 20px;
  color: #666666;
}

.modal-body {
  padding: 20px;
}

.save-hint {
  font-size: 13px;
  color: #666666;
  margin-top: 8px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
}

.btn-secondary,
.btn-primary {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn-secondary {
  background: #f5f5f5;
  color: #666666;
}

.btn-primary {
  background: #00a86b;
  color: #ffffff;
}

.btn-primary:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

/* Favorites List */
.favorites-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 20px 20px;
}

.favorite-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #f5f5f5;
  border-radius: 12px;
  margin-bottom: 10px;
}

.favorite-info {
  flex: 1;
  cursor: pointer;
}

.favorite-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.favorite-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #666666;
}

.favorite-usage {
  font-size: 11px;
  color: #999999;
  margin-top: 4px;
}

.delete-favorite-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
}

.delete-favorite-btn svg {
  width: 18px;
  height: 18px;
  color: #e53935;
}

.empty-favorites {
  text-align: center;
  padding: 40px 20px;
  color: #999999;
}

.empty-favorites svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
}

.empty-favorites p {
  font-size: 14px;
  margin: 0;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content,
.modal-enter-active .confirm-dialog,
.modal-leave-active .confirm-dialog {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: translateY(100%);
}

.modal-enter-from .confirm-dialog,
.modal-leave-to .confirm-dialog {
  transform: scale(0.9);
}

.scale-fade-enter-active,
.scale-fade-leave-active {
  transition: all 0.3s ease;
}

.scale-fade-enter-from,
.scale-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Error Toast */
.error-toast {
  position: fixed;
  top: 72px;
  left: 16px;
  right: 16px;
  z-index: 1000;
  animation: slideDown 0.3s ease;
}

.error-toast-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: #fff1f0;
  border: 2px solid #ff4d4f;
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(255, 77, 79, 0.2);
}

.error-icon {
  width: 24px;
  height: 24px;
  color: #ff4d4f;
  flex-shrink: 0;
}

.error-icon svg {
  width: 24px;
  height: 24px;
}

.error-message {
  flex: 1;
  font-size: 14px;
  line-height: 1.5;
  color: #1a1a1a;
  white-space: pre-line;
}

.error-close {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #999999;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
}

.error-close:active {
  color: #666666;
}

.error-close svg {
  width: 18px;
  height: 18px;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Wallet Balance Card - Enhanced */
.wallet-balance-card {
  background: linear-gradient(135deg, #00a86b 0%, #00c878 100%);
  border-radius: 16px;
  padding: 20px;
  margin-top: 16px;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

/* Wallet Preview Card (Early Display in Items Step) */
.wallet-preview-card {
  background: linear-gradient(135deg, #e8f5ef 0%, #d4f1e3 100%);
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 16px;
  border: 2px solid #00a86b;
  animation: slideInDown 0.3s ease;
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.wallet-preview-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.wallet-preview-icon {
  width: 40px;
  height: 40px;
  background: #ffffff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 168, 107, 0.1);
}

.wallet-preview-icon svg {
  width: 20px;
  height: 20px;
  color: #00a86b;
}

.wallet-preview-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wallet-preview-label {
  font-size: 12px;
  color: #666666;
  font-weight: 500;
}

.wallet-preview-amount {
  font-size: 20px;
  font-weight: 700;
  color: #00a86b;
  letter-spacing: -0.3px;
}

.wallet-balance-card::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  pointer-events: none;
}

.wallet-balance-card.insufficient {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8787 100%);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.wallet-balance-card.loading {
  opacity: 0.8;
}

.wallet-header {
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  z-index: 1;
}

.wallet-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.3s ease;
}

.wallet-balance-card:active .wallet-icon {
  transform: scale(0.95);
}

.wallet-icon svg {
  width: 24px;
  height: 24px;
  color: #ffffff;
}

.wallet-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wallet-label {
  font-size: 13px;
  opacity: 0.9;
  font-weight: 500;
}

.wallet-amount {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.5px;
  transition: all 0.3s ease;
}

.wallet-amount.low {
  animation: pulse 2s ease-in-out infinite;
}

.wallet-loading {
  font-size: 14px;
  opacity: 0.9;
}

.loading-dots span {
  animation: blink 1.4s infinite;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 1; }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.02);
  }
}

/* Wallet Refresh Button */
.wallet-refresh-btn {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.wallet-refresh-btn:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.3);
}

.wallet-refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wallet-refresh-btn svg {
  width: 18px;
  height: 18px;
  color: #ffffff;
  transition: transform 0.3s ease;
}

.wallet-refresh-btn:active svg {
  transform: rotate(180deg);
}

/* Insufficient Warning - Enhanced */
.insufficient-warning {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: slideInUp 0.3s ease;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.warning-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.warning-icon svg {
  width: 24px;
  height: 24px;
  color: #ffffff;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.warning-text {
  flex: 1;
}

.warning-text strong {
  display: block;
  font-size: 15px;
  margin-bottom: 6px;
  font-weight: 700;
}

.warning-text p {
  font-size: 13px;
  margin: 4px 0;
  opacity: 0.95;
  line-height: 1.5;
}

.warning-text p strong {
  display: inline;
  font-weight: 700;
  font-size: inherit;
  margin: 0;
}

.topup-hint {
  font-weight: 600;
  margin-top: 8px !important;
  opacity: 1 !important;
}

/* Balance After Payment - Enhanced */
.balance-after {
  margin-top: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: slideInUp 0.3s ease;
}

.balance-breakdown {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.breakdown-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  opacity: 0.9;
}

.breakdown-row.deduct {
  color: rgba(255, 255, 255, 0.8);
}

.breakdown-row.deduct span:last-child {
  font-weight: 600;
}

.breakdown-row.remaining {
  font-size: 14px;
  font-weight: 600;
  opacity: 1;
  padding-top: 4px;
}

.breakdown-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
  margin: 4px 0;
}

.balance-value {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.3px;
}

.submit-btn.topup {
  background: linear-gradient(135deg, #00a86b 0%, #00c878 100%);
  color: #ffffff;
}

.submit-btn.topup:active {
  transform: scale(0.98);
}

.submit-btn.topup svg {
  width: 20px;
  height: 20px;
}
</style>
