<script setup lang="ts">
/**
 * Feature: F02 - Customer Ride Booking
 * MUNEEF Style UI - Clean and Modern
 * Flow: 1.เลือกจุดรับ → 2.เลือกจุดหมาย → 3.เลือกประเภทรถ → 4.ยืนยันจอง
 */
import { ref, computed, watch, onMounted, onUnmounted, defineAsyncComponent } from "vue";
import { useRouter } from "vue-router";
import LocationPicker from "../components/LocationPicker.vue";
import MapView from "../components/MapView.vue";
import RideTracker from "../components/RideTracker.vue";
import BottomSheet from "../components/BottomSheet.vue";
import PromoCodeInput from "../components/shared/PromoCodeInput.vue";
import DestinationPicker from "../components/DestinationPicker.vue";
import PickupPicker from "../components/PickupPicker.vue";
import type { NearbyPlace } from "../composables/useNearbyPlaces";
import { useLocation, type GeoLocation } from "../composables/useLocation";
import { useRideStore } from "../stores/ride";
import { useAuthStore } from "../stores/auth";
import { useSurgePricing } from "../composables/useSurgePricing";
import { useServices } from "../composables/useServices";
import { useRecurringRides } from "../composables/useRecurringRides";
import { usePromoSystem } from "../composables/usePromoSystem";
import { useWallet } from "../composables/useWallet";
import type { RideRequest, ServiceProvider } from "../types/database";

// Lazy load heavy components
const NearbyPlacesSheet = defineAsyncComponent({
  loader: () => import("../components/NearbyPlacesSheet.vue"),
  delay: 100,
  timeout: 5000,
});

const router = useRouter();
const rideStore = useRideStore();
const authStore = useAuthStore();
const { calculateDistance, calculateTravelTime } = useLocation();
const { calculateSurge, currentMultiplier } = useSurgePricing();
const {
  savedPlaces,
  recentPlaces,
  homePlace,
  workPlace,
  fetchSavedPlaces,
  fetchRecentPlaces,
  loading: placesLoading,
} = useServices();
const promoSystem = usePromoSystem();
const wallet = useWallet();

const surgeMultiplier = currentMultiplier;

// Promo state
const appliedPromo = ref<{
  code: string;
  promoId: string;
  discountAmount: number;
} | null>(null);
const promoDiscount = ref(0);

// Computed: Favorite places (not home/work)
const favoritePlaces = computed(() =>
  savedPlaces.value.filter((p) => p.place_type === "other").slice(0, 3)
);

onMounted(async () => {
  // 1. Handle pending destination first (instant, no network)
  const pendingDest = rideStore.consumeDestination();
  if (pendingDest) {
    destinationLocation.value = pendingDest;
    destinationAddress.value = pendingDest.address;
    step.value = "pickup";
  }

  // 2. Non-blocking: Calculate surge in background (don't await)
  if (pickupLocation.value) {
    calculateSurge(pickupLocation.value.lat, pickupLocation.value.lng).catch(() => {
      // Silent fail - surge is not critical for initial load
    });
  }

  // 3. Initialize ride store and check for active ride
  if (authStore.user?.id) {
    // Initialize ride store first (critical for tracking mode)
    await rideStore.initialize(authStore.user.id);
    if (rideStore.hasActiveRide && rideStore.currentRide) {
      activeRide.value = rideStore.currentRide;
      viewMode.value = "tracking";
      return; // Skip loading places if in tracking mode
    }
    
    // 4. Load places in parallel but don't block UI
    // These use cache-first strategy, so they return instantly if cached
    Promise.all([
      fetchSavedPlaces(),
      fetchRecentPlaces(5),
      wallet.fetchBalance(),
    ]).catch((err) => {
      console.warn('Background data fetch error:', err);
      // Non-critical - UI still works without these
    });
  }
});

onUnmounted(() => {
  rideStore.unsubscribeAll();
});

// Form state
const pickupAddress = ref("");
const destinationAddress = ref("");
const pickupLocation = ref<GeoLocation | null>(null);
const destinationLocation = ref<GeoLocation | null>(null);
const rideType = ref<"standard" | "premium" | "shared">("standard");
const passengerCount = ref(1);
const paymentMethod = ref<"cash" | "wallet" | "card">("cash");
const promoCode = ref("");
const specialRequests = ref("");

// UI state
const isCalculating = ref(false);
const isBooking = ref(false);
const estimatedFare = ref(0);
const estimatedTime = ref(0);
const estimatedDistance = ref(0);
const showPaymentSheet = ref(false);
const showPromoSheet = ref(false);
const showPickupMapPicker = ref(false);
const showDestMapPicker = ref(false);
const showNearbyPlaces = ref(false);
const showScheduleSheet = ref(false);
const showDestinationPicker = ref(false);
const showPickupPicker = ref(false);

// Tap-to-select destination mode
const tapToSelectMode = ref(false);
const tapSelectedLocation = ref<{ lat: number; lng: number; address: string } | null>(null);
const isReverseGeocoding = ref(false);

// Schedule state
const isScheduled = ref(false);
const scheduledDate = ref("");
const scheduledTime = ref("");

// Computed: Display text for schedule
const scheduleDisplayText = computed(() => {
  if (!isScheduled.value || !scheduledDate.value || !scheduledTime.value) {
    return "ตอนนี้";
  }
  const date = new Date(scheduledDate.value + "T" + scheduledTime.value);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) {
    return `วันนี้ ${timeStr}`;
  } else if (isTomorrow) {
    return `พรุ่งนี้ ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
    });
    return `${dateStr} ${timeStr}`;
  }
});

// Schedule helpers
const getMinDate = (): string => {
  const now = new Date();
  return now.toISOString().split("T")[0] || "";
};

const getMaxDate = (): string => {
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 7); // Allow scheduling up to 7 days ahead
  return maxDate.toISOString().split("T")[0] || "";
};

const getMinTime = () => {
  if (!scheduledDate.value) return "00:00";
  const now = new Date();
  const selectedDate = new Date(scheduledDate.value);

  // If selected date is today, min time is current time + 30 minutes
  if (selectedDate.toDateString() === now.toDateString()) {
    now.setMinutes(now.getMinutes() + 30);
    return now.toTimeString().slice(0, 5);
  }
  return "00:00";
};

const openScheduleSheet = () => {
  triggerHaptic("light");
  // Set default values if not set
  if (!scheduledDate.value) {
    scheduledDate.value = getMinDate();
  }
  if (!scheduledTime.value) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    scheduledTime.value = now.toTimeString().slice(0, 5);
  }
  showScheduleSheet.value = true;
};

const confirmSchedule = () => {
  if (scheduledDate.value && scheduledTime.value) {
    isScheduled.value = true;
    triggerHaptic("medium");
  }
  showScheduleSheet.value = false;
};

const setRideNow = () => {
  isScheduled.value = false;
  scheduledDate.value = "";
  scheduledTime.value = "";
  triggerHaptic("light");
  showScheduleSheet.value = false;
};

// Recurring rides
const {
  templates: recurringTemplates,
  activeTemplates,
  loading: recurringLoading,
  scheduleTypeLabels,
  dayLabels,
  fetchTemplates: fetchRecurringTemplates,
  createTemplate: createRecurringTemplate,
  toggleTemplate,
  deleteTemplate,
  formatSchedule,
  getNextScheduleDisplay,
} = useRecurringRides();

const showRecurringSheet = ref(false);
const showCreateRecurringModal = ref(false);
const isRecurring = ref(false);
void isRecurring.value; // Reserved for recurring ride feature
const recurringName = ref("");
const recurringScheduleType = ref<
  "daily" | "weekdays" | "weekends" | "weekly" | "custom"
>("weekdays");
const recurringScheduleTime = ref("08:00");
const recurringScheduleDays = ref<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default

const openRecurringSheet = () => {
  triggerHaptic("light");
  fetchRecurringTemplates();
  showRecurringSheet.value = true;
};

const saveAsRecurring = async () => {
  if (!pickupLocation.value || !destinationLocation.value) {
    alert("กรุณาเลือกจุดรับและจุดหมายก่อน");
    return;
  }

  const template = await createRecurringTemplate({
    pickup_lat: pickupLocation.value.lat,
    pickup_lng: pickupLocation.value.lng,
    pickup_address: pickupLocation.value.address,
    destination_lat: destinationLocation.value.lat,
    destination_lng: destinationLocation.value.lng,
    destination_address: destinationLocation.value.address,
    ride_type: rideType.value,
    passenger_count: passengerCount.value,
    special_requests: specialRequests.value || undefined,
    schedule_type: recurringScheduleType.value,
    schedule_time: recurringScheduleTime.value,
    schedule_days:
      recurringScheduleType.value === "weekly" ||
      recurringScheduleType.value === "custom"
        ? recurringScheduleDays.value
        : undefined,
    name:
      recurringName.value ||
      `${pickupLocation.value.address} → ${destinationLocation.value.address}`,
  });

  if (template) {
    triggerHaptic("medium");
    showCreateRecurringModal.value = false;
    alert("บันทึกการจองประจำสำเร็จ!");
    recurringName.value = "";
  }
};

const useRecurringTemplate = (template: any) => {
  pickupLocation.value = {
    lat: template.pickup_lat,
    lng: template.pickup_lng,
    address: template.pickup_address,
  };
  pickupAddress.value = template.pickup_address;
  destinationLocation.value = {
    lat: template.destination_lat,
    lng: template.destination_lng,
    address: template.destination_address,
  };
  destinationAddress.value = template.destination_address;
  rideType.value = template.ride_type;
  passengerCount.value = template.passenger_count;
  specialRequests.value = template.special_requests || "";

  showRecurringSheet.value = false;
  triggerHaptic("medium");

  // Go to options step
  calculateFare();
};

// Search state
const pickupSearchQuery = ref("");
const destSearchQuery = ref("");
const pickupSearchResults = ref<
  Array<{ id: string; name: string; address: string; lat: number; lng: number }>
>([]);
const destSearchResults = ref<
  Array<{ id: string; name: string; address: string; lat: number; lng: number }>
>([]);

// Simplified 2-Step Flow (UX Redesign)
// Step 1: "location" - เลือกจุดรับ + จุดหมาย (combined)
// Step 2: "book" - เลือกรถ + ยืนยัน (combined)
const step = ref<"location" | "book">("location");
const stepDirection = ref<"forward" | "backward">("forward");
const previousStep = ref<"location" | "book">("location");

// Active ride state
const activeRide = ref<RideRequest | null>(null);
const assignedProvider = ref<ServiceProvider | null>(null);
const viewMode = ref<"booking" | "tracking">("booking");

// Step labels for indicator (simplified 2-step)
const stepLabels = [
  { key: "location", label: "เลือกสถานที่", number: 1, description: "จุดรับ-ปลายทาง" },
  { key: "book", label: "จองรถ", number: 2, description: "เลือกรถและชำระเงิน" },
] as const;

const currentStepIndex = computed(() => {
  return stepLabels.findIndex((s) => s.key === step.value);
});

// Ride types - MUNEEF Style
const rideTypes = [
  {
    value: "standard",
    label: "สบาย",
    description: "เดินทางสบายกับคนขับที่ไว้ใจได้",
    multiplier: 1.0,
    icon: "comfort",
    eta: "2 นาที",
    capacity: 4,
    priceRange: "88 - 107",
  },
  {
    value: "premium",
    label: "พรีเมียม",
    description: "รถหรูสำหรับโอกาสพิเศษ",
    multiplier: 1.5,
    icon: "premium",
    eta: "5 นาที",
    capacity: 4,
    priceRange: "150 - 180",
  },
  {
    value: "shared",
    label: "แชร์",
    description: "แชร์การเดินทาง ประหยัดกว่า",
    multiplier: 0.7,
    icon: "share",
    eta: "5 นาที",
    capacity: 2,
    priceRange: "60 - 75",
  },
] as const;

const paymentMethods = [
  { value: "cash", label: "เงินสด", icon: "cash" },
  { value: "wallet", label: "กระเป๋าเงิน GOBEAR", icon: "wallet" },
  { value: "card", label: "บัตรเครดิต/เดบิต", icon: "card" },
] as const;

const canCalculate = computed(
  () => pickupLocation.value && destinationLocation.value
);
const hasRoute = computed(
  () =>
    !!(
      pickupLocation.value &&
      destinationLocation.value &&
      estimatedDistance.value > 0
    )
);

const selectedRideType = computed(
  () => rideTypes.find((t) => t.value === rideType.value) || rideTypes[0]
);

const finalFare = computed(() => {
  let fare = estimatedFare.value;
  if (surgeMultiplier.value > 1) {
    fare = fare * surgeMultiplier.value;
  }
  // Apply promo discount
  fare = fare - promoDiscount.value;
  return Math.max(0, Math.round(fare));
});

// Wallet balance check
const walletBalance = computed(() => wallet.balance.value?.balance || 0);
const hasInsufficientBalance = computed(() => {
  if (paymentMethod.value !== "wallet") return false;
  return walletBalance.value < finalFare.value;
});

// Handle promo discount
const handlePromoDiscount = (amount: number) => {
  promoDiscount.value = amount;
};

// Handlers (reserved for future use)
const _handlePickupSelected = async (location: GeoLocation) => {
  pickupLocation.value = location;
  pickupAddress.value = location.address;
  await calculateSurge(location.lat, location.lng);
  // ไปขั้นตอนถัดไป: เลือกจุดหมาย
  step.value = "destination";
};

const _handleDestinationSelected = async (location: GeoLocation) => {
  destinationLocation.value = location;
  destinationAddress.value = location.address;
  // คำนวณค่าโดยสารและไปขั้นตอนเลือกรถ
  await calculateFare();
};

// Export for potential future use
void _handlePickupSelected;
void _handleDestinationSelected;

const handleRouteCalculated = (data: {
  distance: number;
  duration: number;
}) => {
  estimatedDistance.value = data.distance;
  estimatedTime.value = data.duration;
};

const calculateFare = async () => {
  if (
    !canCalculate.value ||
    !pickupLocation.value ||
    !destinationLocation.value
  )
    return;

  isCalculating.value = true;
  await new Promise((resolve) => setTimeout(resolve, 300));

  if (estimatedDistance.value === 0) {
    estimatedDistance.value = calculateDistance(
      pickupLocation.value.lat,
      pickupLocation.value.lng,
      destinationLocation.value.lat,
      destinationLocation.value.lng
    );
    estimatedTime.value = calculateTravelTime(estimatedDistance.value);
  }

  estimatedFare.value = rideStore.calculateFare(
    estimatedDistance.value,
    rideType.value
  );
  step.value = "book";
  isCalculating.value = false;
};

const selectRideType = (type: "standard" | "premium" | "shared") => {
  rideType.value = type;
  if (estimatedDistance.value > 0) {
    estimatedFare.value = rideStore.calculateFare(
      estimatedDistance.value,
      type
    );
  }
};
void selectRideType; // Reserved for non-enhanced usage

const bookRide = async () => {
  if (!pickupLocation.value || !destinationLocation.value) return;

  if (!authStore.user) {
    router.push("/login");
    return;
  }

  // Check wallet balance if paying with wallet
  if (paymentMethod.value === "wallet") {
    await wallet.fetchBalance(); // Refresh balance before check
    if (walletBalance.value < finalFare.value) {
      alert(
        `ยอดเงินในกระเป๋าไม่เพียงพอ\nคงเหลือ: ฿${walletBalance.value.toLocaleString()}\nค่าโดยสาร: ฿${finalFare.value.toLocaleString()}\n\nกรุณาเติมเงินหรือเปลี่ยนวิธีชำระเงิน`
      );
      return;
    }
  }

  isBooking.value = true;

  try {
    // Build scheduled datetime if scheduled
    let scheduledAt: string | undefined;
    if (isScheduled.value && scheduledDate.value && scheduledTime.value) {
      scheduledAt = new Date(
        `${scheduledDate.value}T${scheduledTime.value}`
      ).toISOString();
    }

    const ride = await rideStore.createRideRequest(
      authStore.user.id,
      pickupLocation.value,
      destinationLocation.value,
      rideType.value,
      passengerCount.value,
      specialRequests.value || undefined,
      scheduledAt
    );

    if (ride) {
      // Apply promo if selected
      if (appliedPromo.value && ride.id) {
        await promoSystem.applyPromoToRequest(
          "ride",
          ride.id,
          appliedPromo.value.code,
          appliedPromo.value.promoId,
          appliedPromo.value.discountAmount
        );
        // Record usage
        await promoSystem.applyPromoCode(
          appliedPromo.value.code,
          "ride",
          ride.id,
          estimatedFare.value *
            (surgeMultiplier.value > 1 ? surgeMultiplier.value : 1),
          appliedPromo.value.discountAmount
        );
      }

      // Get the current ride from store after creation
      activeRide.value = rideStore.currentRide;
      viewMode.value = "tracking";

      // Only find driver immediately if not scheduled
      if (!isScheduled.value) {
        await rideStore.findAndMatchDriver();
      }
    } else {
      alert(rideStore.error || "ไม่สามารถจองรถได้ กรุณาลองใหม่");
    }
  } catch (error) {
    console.error("Booking error:", error);
    alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
  } finally {
    isBooking.value = false;
  }
};

const handleCancelRide = async () => {
  if (!activeRide.value) return;

  if (confirm("ต้องการยกเลิกการเดินทางนี้หรือไม่?")) {
    const success = await rideStore.cancelRide(activeRide.value.id);
    if (success) {
      resetBooking();
    } else {
      alert("ไม่สามารถยกเลิกได้ กรุณาลองใหม่");
    }
  }
};

const handleRideComplete = () => {
  router.push(`/customer/receipt/${activeRide.value?.id}`);
  resetBooking();
};

const resetBooking = () => {
  activeRide.value = null;
  assignedProvider.value = null;
  viewMode.value = "booking";
  step.value = "location";
  pickupAddress.value = "";
  destinationAddress.value = "";
  pickupLocation.value = null;
  destinationLocation.value = null;
  estimatedFare.value = 0;
  estimatedDistance.value = 0;
  estimatedTime.value = 0;
};

const goBack = () => {
  stepDirection.value = "backward";
  previousStep.value = step.value;

  if (step.value === "book") {
    step.value = "location";
  } else {
    router.back();
  }
  triggerHaptic("light");
};

const goToStep = (targetStep: "location" | "book") => {
  // อนุญาตให้กลับไปขั้นตอนก่อนหน้าเท่านั้น
  const targetIndex = stepLabels.findIndex((s) => s.key === targetStep);
  if (targetIndex <= currentStepIndex.value) {
    // Track direction for animation
    stepDirection.value =
      targetIndex < currentStepIndex.value ? "backward" : "forward";
    previousStep.value = step.value;
    step.value = targetStep;
    triggerHaptic("light");
  }
};

// Mock places for demo
const mockPlaces = [
  {
    id: "1",
    name: "เซ็นทรัลเวิลด์",
    address: "ราชดำริ, ปทุมวัน, กรุงเทพฯ",
    lat: 13.7466,
    lng: 100.5391,
  },
  {
    id: "2",
    name: "สยามพารากอน",
    address: "พระราม 1, ปทุมวัน, กรุงเทพฯ",
    lat: 13.7461,
    lng: 100.5347,
  },
  {
    id: "3",
    name: "เทอร์มินอล 21",
    address: "สุขุมวิท, วัฒนา, กรุงเทพฯ",
    lat: 13.7377,
    lng: 100.5603,
  },
  {
    id: "4",
    name: "เอ็มควอเทียร์",
    address: "สุขุมวิท, คลองเตย, กรุงเทพฯ",
    lat: 13.7314,
    lng: 100.5697,
  },
  {
    id: "5",
    name: "ไอคอนสยาม",
    address: "เจริญนคร, คลองสาน, กรุงเทพฯ",
    lat: 13.7267,
    lng: 100.51,
  },
  {
    id: "6",
    name: "สนามบินสุวรรณภูมิ",
    address: "บางพลี, สมุทรปราการ",
    lat: 13.69,
    lng: 100.7501,
  },
  {
    id: "7",
    name: "สนามบินดอนเมือง",
    address: "ดอนเมือง, กรุงเทพฯ",
    lat: 13.9126,
    lng: 100.6068,
  },
  {
    id: "8",
    name: "หมอชิต",
    address: "จตุจักร, กรุงเทพฯ",
    lat: 13.8022,
    lng: 100.553,
  },
];

void function searchPickupPlaces() {
  if (pickupSearchQuery.value.length < 2) {
    pickupSearchResults.value = [];
    return;
  }
  const query = pickupSearchQuery.value.toLowerCase();
  pickupSearchResults.value = mockPlaces
    .filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query)
    )
    .slice(0, 5);
};

void function searchDestPlaces() {
  if (destSearchQuery.value.length < 2) {
    destSearchResults.value = [];
    return;
  }
  const query = destSearchQuery.value.toLowerCase();
  destSearchResults.value = mockPlaces
    .filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query)
    )
    .slice(0, 5);
};

const selectPickupPlace = (place: (typeof mockPlaces)[0]) => {
  pickupLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.name,
  };
  pickupAddress.value = place.name;
  pickupSearchQuery.value = "";
  pickupSearchResults.value = [];
};
void selectPickupPlace; // Reserved for non-enhanced usage

const selectDestPlace = async (place: (typeof mockPlaces)[0]) => {
  destinationLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.name,
  };
  destinationAddress.value = place.name;
  destSearchQuery.value = "";
  destSearchResults.value = [];
  await calculateFare();
};
void selectDestPlace; // Reserved for non-enhanced usage

const useCurrentLocation = async (type: "pickup" | "destination") => {
  if (!navigator.geolocation) {
    alert("เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const loc = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        address: "ตำแหน่งปัจจุบัน",
      };
      if (type === "pickup") {
        pickupLocation.value = loc;
        pickupAddress.value = loc.address;
        await calculateSurge(loc.lat, loc.lng);
        step.value = "destination";
      } else {
        destinationLocation.value = loc;
        destinationAddress.value = loc.address;
        await calculateFare();
      }
    },
    () => {
      alert("ไม่สามารถระบุตำแหน่งได้ กรุณาลองใหม่");
    }
  );
};
void useCurrentLocation; // Reserved for non-enhanced usage

const clearPickup = () => {
  pickupLocation.value = null;
  pickupAddress.value = "";
  pickupSearchQuery.value = "";
};

const handleMapPickerConfirm = async (
  location: GeoLocation,
  type: "pickup" | "destination"
) => {
  if (type === "pickup") {
    pickupLocation.value = location;
    pickupAddress.value = location.address;
    showPickupMapPicker.value = false;
    await calculateSurge(location.lat, location.lng);
    step.value = "destination";
  } else {
    destinationLocation.value = location;
    destinationAddress.value = location.address;
    showDestMapPicker.value = false;
    await calculateFare();
  }
};

const handleNearbyPlaceSelect = async (place: NearbyPlace) => {
  destinationLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.name,
  };
  destinationAddress.value = place.name;
  showNearbyPlaces.value = false;
  await calculateFare();
};

// Handler for map click (tap-to-select destination)
const handleMapClick = async (data: { lat: number; lng: number }) => {
  // Only handle clicks when in destination step and tap mode is enabled
  if (step.value !== 'destination' || !tapToSelectMode.value) return;
  
  triggerHaptic('medium');
  
  // Set temporary location
  tapSelectedLocation.value = {
    lat: data.lat,
    lng: data.lng,
    address: 'กำลังค้นหาที่อยู่...'
  };
  
  // Reverse geocode to get address
  isReverseGeocoding.value = true;
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${data.lat}&lon=${data.lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'th' } }
    );
    const result = await response.json();
    
    if (result && result.display_name) {
      // Simplify address
      const parts = result.display_name.split(',').slice(0, 3);
      tapSelectedLocation.value = {
        lat: data.lat,
        lng: data.lng,
        address: parts.join(', ')
      };
    } else {
      tapSelectedLocation.value = {
        lat: data.lat,
        lng: data.lng,
        address: `${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`
      };
    }
  } catch {
    tapSelectedLocation.value = {
      lat: data.lat,
      lng: data.lng,
      address: `${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`
    };
  } finally {
    isReverseGeocoding.value = false;
  }
};

// Confirm tap-selected destination
const confirmTapSelectedDestination = async () => {
  if (!tapSelectedLocation.value) return;
  
  triggerHaptic('heavy');
  destinationLocation.value = {
    lat: tapSelectedLocation.value.lat,
    lng: tapSelectedLocation.value.lng,
    address: tapSelectedLocation.value.address,
  };
  destinationAddress.value = tapSelectedLocation.value.address;
  
  // Reset tap mode
  tapToSelectMode.value = false;
  tapSelectedLocation.value = null;
  
  await calculateFare();
};

// Cancel tap-to-select mode
const cancelTapToSelect = () => {
  triggerHaptic('light');
  tapToSelectMode.value = false;
  tapSelectedLocation.value = null;
};

// Enable tap-to-select mode
const enableTapToSelect = () => {
  triggerHaptic('medium');
  tapToSelectMode.value = true;
  tapSelectedLocation.value = null;
};

// Handler for DestinationPicker selection
const handleDestinationPickerSelect = async (place: { name: string; address: string; lat: number; lng: number }) => {
  triggerHaptic('medium');
  destinationLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.name,
  };
  destinationAddress.value = place.name;
  showDestinationPicker.value = false;
  await calculateFare();
};

// Handler for PickupPicker selection
const handlePickupPickerSelect = async (place: { name: string; address: string; lat: number; lng: number }) => {
  triggerHaptic('medium');
  pickupLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.name,
  };
  pickupAddress.value = place.name;
  showPickupPicker.value = false;
  await calculateSurge(place.lat, place.lng);
  // Auto advance to destination step
  await new Promise(resolve => setTimeout(resolve, 200));
  step.value = 'destination';
};

// Handler for PickupPicker current location
const handlePickupCurrentLocation = async () => {
  showPickupPicker.value = false;
  await useCurrentLocationEnhanced('pickup');
};

const selectSavedPlace = async (place: {
  name: string;
  address: string;
  lat: number;
  lng: number;
}) => {
  destinationLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.name,
  };
  destinationAddress.value = place.name;
  await calculateFare();
};
void selectSavedPlace; // Reserved for non-enhanced usage

const selectRecentPlace = async (place: {
  name: string;
  address: string;
  lat: number;
  lng: number;
}) => {
  destinationLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.name,
  };
  destinationAddress.value = place.name;
  await calculateFare();
};
void selectRecentPlace; // Reserved for non-enhanced usage

const selectFavoritePlace = async (place: {
  name: string;
  address: string;
  lat: number;
  lng: number;
}) => {
  destinationLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.name,
  };
  destinationAddress.value = place.name;
  await calculateFare();
};
void selectFavoritePlace; // Reserved for non-enhanced usage

// Button press states for visual feedback
const pressedButton = ref<string | null>(null);
const isGettingLocation = ref(false);

// Haptic feedback helper
const triggerHaptic = (type: "light" | "medium" | "heavy" = "light") => {
  if ("vibrate" in navigator) {
    const patterns = { light: 10, medium: 25, heavy: 50 };
    navigator.vibrate(patterns[type]);
  }
};

// Enhanced button press handler
const handleButtonPress = (buttonId: string) => {
  pressedButton.value = buttonId;
  triggerHaptic("light");
};

const handleButtonRelease = () => {
  pressedButton.value = null;
};

// Enhanced current location with loading state
const useCurrentLocationEnhanced = async (type: "pickup" | "destination") => {
  if (!navigator.geolocation) {
    alert("เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง");
    return;
  }

  isGettingLocation.value = true;
  triggerHaptic("medium");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const loc = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        address: "ตำแหน่งปัจจุบัน",
      };
      if (type === "pickup") {
        pickupLocation.value = loc;
        pickupAddress.value = loc.address;
        await calculateSurge(loc.lat, loc.lng);
        triggerHaptic("heavy");
        // Small delay for visual feedback before transition
        await new Promise((resolve) => setTimeout(resolve, 200));
        step.value = "destination";
      } else {
        destinationLocation.value = loc;
        destinationAddress.value = loc.address;
        await calculateFare();
      }
      isGettingLocation.value = false;
    },
    () => {
      isGettingLocation.value = false;
      alert("ไม่สามารถระบุตำแหน่งได้ กรุณาลองใหม่");
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
};

// Enhanced step transition
const goToNextStep = async () => {
  triggerHaptic("medium");
  stepDirection.value = "forward";
  previousStep.value = step.value;

  if (step.value === "location" && pickupLocation.value && destinationLocation.value) {
    await calculateFare();
    step.value = "book";
  }
};

// Enhanced place selection with feedback
void async function selectPickupPlaceEnhanced(place: (typeof mockPlaces)[0]) {
  triggerHaptic("light");
  pickupLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.name,
  };
  pickupAddress.value = place.name;
  pickupSearchQuery.value = "";
  pickupSearchResults.value = [];
  // Auto-advance after selection
  await new Promise((resolve) => setTimeout(resolve, 150));
  step.value = "destination";
};

void async function selectDestPlaceEnhanced(place: (typeof mockPlaces)[0]) {
  triggerHaptic("light");
  destinationLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.name,
  };
  destinationAddress.value = place.name;
  destSearchQuery.value = "";
  destSearchResults.value = [];
  await calculateFare();
};

const selectSavedPlaceEnhanced = async (place: {
  name: string;
  address: string;
  lat: number;
  lng: number;
}) => {
  triggerHaptic("medium");
  destinationLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.name,
  };
  destinationAddress.value = place.name;
  await calculateFare();
};

const selectRecentPlaceEnhanced = async (place: {
  name: string;
  address: string;
  lat: number;
  lng: number;
}) => {
  triggerHaptic("light");
  destinationLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.name,
  };
  destinationAddress.value = place.name;
  await calculateFare();
};

// Quick select for popular destinations
const selectDestPlaceQuick = async (place: {
  name: string;
  address: string;
  lat: number;
  lng: number;
}) => {
  triggerHaptic("medium");
  destinationLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.name,
  };
  destinationAddress.value = place.name;
  await calculateFare();
};

const selectFavoritePlaceEnhanced = async (place: {
  name: string;
  address: string;
  lat: number;
  lng: number;
}) => {
  triggerHaptic("light");
  destinationLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.name,
  };
  destinationAddress.value = place.name;
  await calculateFare();
};

const selectRideTypeEnhanced = (type: "standard" | "premium" | "shared") => {
  triggerHaptic("light");
  rideType.value = type;
  if (estimatedDistance.value > 0) {
    estimatedFare.value = rideStore.calculateFare(
      estimatedDistance.value,
      type
    );
  }
};

watch(rideType, () => {
  if (estimatedDistance.value > 0) {
    estimatedFare.value = rideStore.calculateFare(
      estimatedDistance.value,
      rideType.value
    );
  }
});
</script>

<!-- Import Native App Enhancements -->
<template>
  <div class="ride-page">
    <!-- Tracking Mode -->
    <template v-if="viewMode === 'tracking' && activeRide">
      <RideTracker
        :ride="activeRide"
        :provider="(assignedProvider || rideStore.matchedDriver) as any"
        @cancel="handleCancelRide"
        @complete="handleRideComplete"
      />
    </template>

    <!-- Booking Mode -->
    <template v-else>
      <!-- Map Section -->
      <div class="map-section" :class="{ 'tap-mode-active': tapToSelectMode }">
        <MapView
          :pickup="pickupLocation"
          :destination="tapSelectedLocation ? { lat: tapSelectedLocation.lat, lng: tapSelectedLocation.lng, address: tapSelectedLocation.address } : destinationLocation"
          :show-route="hasRoute && !tapToSelectMode"
          height="100%"
          @route-calculated="handleRouteCalculated"
          @map-click="handleMapClick"
        />

        <!-- Tap-to-Select Overlay -->
        <Transition name="fade">
          <div v-if="tapToSelectMode" class="tap-select-overlay">
            <div class="tap-hint-banner">
              <div class="tap-hint-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <span class="tap-hint-text">แตะบนแผนที่เพื่อเลือกปลายทาง</span>
              <button class="tap-cancel-btn" type="button" aria-label="ยกเลิก" @click="cancelTapToSelect">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </Transition>

        <!-- Selected Location Card (when tapped) -->
        <Transition name="slide-up">
          <div v-if="tapSelectedLocation" class="tap-selected-card">
            <div class="tap-selected-header">
              <div class="tap-selected-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div class="tap-selected-info">
                <span class="tap-selected-label">ปลายทางที่เลือก</span>
                <span v-if="isReverseGeocoding" class="tap-selected-address loading">
                  <span class="loading-dots">กำลังค้นหาที่อยู่</span>
                </span>
                <span v-else class="tap-selected-address">{{ tapSelectedLocation.address }}</span>
              </div>
            </div>
            <div class="tap-selected-actions">
              <button class="tap-action-btn cancel" type="button" @click="cancelTapToSelect">
                เลือกใหม่
              </button>
              <button 
                class="tap-action-btn confirm" 
                type="button" 
                :disabled="isReverseGeocoding"
                @click="confirmTapSelectedDestination"
              >
                ยืนยันปลายทาง
              </button>
            </div>
          </div>
        </Transition>

        <!-- Top Bar -->
        <div class="top-bar" :class="{ hidden: tapToSelectMode }">
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
          <div class="logo-badge">
            <svg viewBox="0 0 32 32" fill="none">
              <circle
                cx="16"
                cy="16"
                r="14"
                stroke="#00A86B"
                stroke-width="2"
              />
              <path d="M16 8L22 20H10L16 8Z" fill="#00A86B" />
              <circle cx="16" cy="18" r="3" fill="#00A86B" />
            </svg>
            <span>GOBEAR</span>
          </div>
          <button class="nav-btn">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Bottom Panel -->
      <div
        class="bottom-panel"
        :class="{ expanded: step === 'book', minimized: tapToSelectMode }"
      >
        <div class="panel-handle"></div>

        <!-- Step Indicator - Clear Progress -->
        <div class="step-indicator-wrapper">
          <div class="step-indicator-header">
            <span class="step-indicator-title">ขั้นตอนที่ {{ currentStepIndex + 1 }} จาก {{ stepLabels.length }}</span>
            <span class="step-indicator-current">{{ stepLabels[currentStepIndex]?.label }}</span>
          </div>
          <div class="step-indicator-enhanced">
            <div class="step-progress-bar">
              <div
                class="step-progress-fill"
                :style="{
                  width: `${(currentStepIndex / (stepLabels.length - 1)) * 100}%`,
                }"
              ></div>
            </div>
            <div class="step-items-row">
              <div
                v-for="(s, index) in stepLabels"
                :key="s.key"
                :class="[
                  'step-item-enhanced',
                  {
                    active: s.key === step,
                    completed: index < currentStepIndex,
                    clickable: index < currentStepIndex,
                  },
                ]"
                @click="goToStep(s.key)"
              >
                <div class="step-circle">
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
                <div class="step-label-group">
                  <span class="step-text">{{ s.label }}</span>
                  <span class="step-description">{{ s.description }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 1: เลือกที่ (Combined Pickup + Destination) -->
        <template v-if="step === 'location'">
          <div
            :key="'step-location'"
            :class="[
              'step-content',
              stepDirection === 'forward'
                ? 'animate-step'
                : 'animate-step-back',
            ]"
          >
            <!-- Pickup Section (Collapsed when selected) -->
            <div class="location-section pickup-section" :class="{ 'is-selected': pickupLocation }">
              <!-- Pickup Header -->
              <div class="location-section-header">
                <div class="location-marker-icon pickup">
                  <div class="marker-dot" :class="{ pulse: !pickupLocation }"></div>
                </div>
                <div class="location-section-title">
                  <span class="section-label">จุดรับ</span>
                  <span v-if="pickupLocation" class="section-value">{{ pickupAddress }}</span>
                  <span v-else class="section-placeholder">เลือกจุดรับ</span>
                </div>
                <button
                  v-if="pickupLocation"
                  class="edit-btn"
                  type="button"
                  aria-label="เปลี่ยนจุดรับ"
                  @click="clearPickup(); triggerHaptic('light');"
                >
                  เปลี่ยน
                </button>
              </div>

              <!-- Pickup Options (Show when not selected) -->
              <Transition name="slide-fade">
                <div v-if="!pickupLocation" class="location-options">
                  <!-- GPS Button - Primary -->
                  <button
                    class="gps-btn primary"
                    :class="{ 'is-loading': isGettingLocation }"
                    :disabled="isGettingLocation"
                    @click="useCurrentLocationEnhanced('pickup')"
                  >
                    <div class="gps-icon">
                      <template v-if="isGettingLocation">
                        <div class="spinner-small"></div>
                      </template>
                      <template v-else>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="3" />
                          <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
                        </svg>
                      </template>
                    </div>
                    <span>{{ isGettingLocation ? 'กำลังค้นหา...' : 'ใช้ตำแหน่งปัจจุบัน' }}</span>
                  </button>

                  <!-- Quick Options Row -->
                  <div class="quick-options-row">
                    <button
                      class="quick-option-btn"
                      @click="showPickupPicker = true; triggerHaptic('medium');"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                      </svg>
                      <span>ค้นหา</span>
                    </button>
                    <button
                      v-if="homePlace"
                      class="quick-option-btn home"
                      @click="handlePickupPickerSelect(homePlace); triggerHaptic('medium');"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        <polyline points="9,22 9,12 15,12 15,22" />
                      </svg>
                      <span>บ้าน</span>
                    </button>
                    <button
                      v-if="workPlace"
                      class="quick-option-btn work"
                      @click="handlePickupPickerSelect(workPlace); triggerHaptic('medium');"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" />
                        <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                      </svg>
                      <span>ที่ทำงาน</span>
                    </button>
                    <button
                      class="quick-option-btn map"
                      @click="showPickupMapPicker = true; triggerHaptic('medium');"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span>แผนที่</span>
                    </button>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Destination Section -->
            <div class="location-section destination-section" :class="{ 'is-active': pickupLocation && !destinationLocation }">
              <!-- Destination Header -->
              <div class="location-section-header">
                <div class="location-marker-icon destination">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" fill="white" />
                  </svg>
                </div>
                <div class="location-section-title">
                  <span class="section-label">ปลายทาง</span>
                  <span v-if="destinationLocation" class="section-value">{{ destinationAddress }}</span>
                  <span v-else class="section-placeholder">ไปไหนดี?</span>
                </div>
                <button
                  v-if="destinationLocation"
                  class="edit-btn"
                  type="button"
                  aria-label="เปลี่ยนปลายทาง"
                  @click="destinationLocation = null; destinationAddress = ''; triggerHaptic('light');"
                >
                  เปลี่ยน
                </button>
              </div>

              <!-- Destination Options (Show when pickup selected but destination not) -->
              <Transition name="slide-fade">
                <div v-if="pickupLocation && !destinationLocation" class="destination-options">
                  <!-- Hero Search Bar -->
                  <button
                    class="hero-search-bar"
                    @click="showDestinationPicker = true; triggerHaptic('medium');"
                  >
                    <div class="hero-search-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                      </svg>
                    </div>
                    <span class="hero-search-placeholder">ค้นหาปลายทาง...</span>
                    <div class="hero-search-arrow">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </button>

                  <!-- Quick Access: Home & Work -->
                  <div v-if="homePlace || workPlace" class="quick-access-row">
                    <button
                      v-if="homePlace"
                      class="quick-access-chip home"
                      @click="selectSavedPlaceEnhanced(homePlace); triggerHaptic('medium');"
                    >
                      <div class="quick-access-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                          <polyline points="9,22 9,12 15,12 15,22" />
                        </svg>
                      </div>
                      <div class="quick-access-text">
                        <span class="quick-access-label">บ้าน</span>
                      </div>
                    </button>
                    <button
                      v-if="workPlace"
                      class="quick-access-chip work"
                      @click="selectSavedPlaceEnhanced(workPlace); triggerHaptic('medium');"
                    >
                      <div class="quick-access-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="2" y="7" width="20" height="14" rx="2" />
                          <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                        </svg>
                      </div>
                      <div class="quick-access-text">
                        <span class="quick-access-label">ที่ทำงาน</span>
                      </div>
                    </button>
                  </div>

                  <!-- Popular Destinations -->
                  <div class="popular-destinations-compact">
                    <div class="popular-grid">
                      <button
                        class="popular-chip"
                        @click="selectDestPlaceQuick({ name: 'เซ็นทรัลเวิลด์', address: 'ราชดำริ, ปทุมวัน', lat: 13.7466, lng: 100.5391 })"
                      >
                        <span>🛍️ เซ็นทรัลเวิลด์</span>
                      </button>
                      <button
                        class="popular-chip"
                        @click="selectDestPlaceQuick({ name: 'สยามพารากอน', address: 'พระราม 1, ปทุมวัน', lat: 13.7461, lng: 100.5347 })"
                      >
                        <span>🛍️ สยามพารากอน</span>
                      </button>
                      <button
                        class="popular-chip"
                        @click="selectDestPlaceQuick({ name: 'สนามบินสุวรรณภูมิ', address: 'บางพลี, สมุทรปราการ', lat: 13.69, lng: 100.7501 })"
                      >
                        <span>✈️ สุวรรณภูมิ</span>
                      </button>
                      <button
                        class="popular-chip"
                        @click="selectDestPlaceQuick({ name: 'สนามบินดอนเมือง', address: 'ดอนเมือง, กรุงเทพฯ', lat: 13.9126, lng: 100.6068 })"
                      >
                        <span>✈️ ดอนเมือง</span>
                      </button>
                    </div>
                  </div>

                  <!-- Quick Actions -->
                  <div class="quick-action-row compact">
                    <button
                      class="quick-action-btn tap-select"
                      @click="enableTapToSelect"
                    >
                      <div class="quick-action-icon tap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
                        </svg>
                      </div>
                      <span>แตะแผนที่</span>
                    </button>
                    <button
                      class="quick-action-btn nearby"
                      @click="showNearbyPlaces = true; triggerHaptic('medium');"
                    >
                      <div class="quick-action-icon nearby">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </div>
                      <span>ใกล้เคียง</span>
                    </button>
                  </div>

                  <!-- Recent Places -->
                  <div v-if="recentPlaces.length > 0 && !placesLoading" class="recent-places-compact">
                    <h4 class="section-title-small">ไปเมื่อเร็วๆ นี้</h4>
                    <div class="recent-chips-scroll">
                      <button
                        v-for="place in recentPlaces.slice(0, 4)"
                        :key="place.id"
                        class="recent-chip"
                        @click="selectRecentPlaceEnhanced(place)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12,6 12,12 16,14" />
                        </svg>
                        <span>{{ place.name }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Route Summary (Show when both selected) -->
            <Transition name="slide-fade">
              <div v-if="pickupLocation && destinationLocation" class="route-summary-inline">
                <div class="route-line-visual">
                  <div class="route-dot pickup"></div>
                  <div class="route-connector"></div>
                  <div class="route-dot destination"></div>
                </div>
                <div class="route-info">
                  <div class="route-point">
                    <span class="route-label">จาก</span>
                    <span class="route-value">{{ pickupAddress }}</span>
                  </div>
                  <div class="route-point">
                    <span class="route-label">ไป</span>
                    <span class="route-value">{{ destinationAddress }}</span>
                  </div>
                </div>
              </div>
            </Transition>

            <!-- Continue Button -->
            <Transition name="slide-up">
              <button
                v-if="pickupLocation && destinationLocation"
                class="continue-btn primary"
                :disabled="isCalculating"
                @click="goToNextStep"
              >
                <template v-if="isCalculating">
                  <div class="btn-spinner"></div>
                  <span>กำลังคำนวณ...</span>
                </template>
                <template v-else>
                  <span>เลือกรถ</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </template>
              </button>
            </Transition>

            <!-- Loading Overlay -->
            <Transition name="fade">
              <div v-if="isCalculating" class="calculating-overlay">
                <div class="calculating-content">
                  <div class="calculating-spinner"></div>
                  <span class="calculating-text">กำลังคำนวณเส้นทาง...</span>
                </div>
              </div>
            </Transition>
          </div>
        </template>

        <!-- Step 2: จองรถ (Combined Options + Confirm) -->
        <template v-else-if="step === 'book'">
          <div
            :key="'step-book'"
            :class="[
              'step-content',
              stepDirection === 'forward'
                ? 'animate-step'
                : 'animate-step-back',
            ]"
          >
            <!-- Step Header Card -->
            <div class="step-header-card">
              <div class="step-header-icon-box options">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="1" y="3" width="15" height="13" rx="2" />
                  <path d="M16 8h4a2 2 0 012 2v6a2 2 0 01-2 2h-4" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <div class="step-header-content">
                <h2 class="step-header-title">เลือกประเภทรถ</h2>
                <p class="step-header-subtitle">
                  เลือกรถที่เหมาะกับการเดินทางของคุณ
                </p>
              </div>
            </div>

            <!-- Route Summary Card Enhanced -->
            <div class="route-summary-card-enhanced">
              <div class="route-summary-header">
                <div class="route-summary-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                </div>
                <span class="route-summary-title">เส้นทางของคุณ</span>
                <button
                  class="edit-route-btn"
                  @click="
                    step = 'location';
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
                  <span>แก้ไข</span>
                </button>
              </div>
              <div class="route-summary-body">
                <div class="route-point-enhanced">
                  <div class="route-dot-enhanced pickup"></div>
                  <div class="route-point-text">
                    <span class="route-point-label">จุดรับ</span>
                    <span class="route-point-value">{{ pickupAddress }}</span>
                  </div>
                </div>
                <div class="route-connector-enhanced"></div>
                <div class="route-point-enhanced">
                  <div class="route-dot-enhanced destination"></div>
                  <div class="route-point-text">
                    <span class="route-point-label">จุดหมาย</span>
                    <span class="route-point-value">{{
                      destinationAddress
                    }}</span>
                  </div>
                </div>
              </div>
              <div class="route-stats-enhanced">
                <div class="stat-chip">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                  <span>{{ estimatedDistance.toFixed(1) }} กม.</span>
                </div>
                <div class="stat-chip">
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
            </div>

            <!-- Schedule Badge -->
            <div class="schedule-section">
              <button
                class="schedule-badge-enhanced"
                :class="{ scheduled: isScheduled }"
                @click="openScheduleSheet"
              >
                <div class="schedule-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <div class="schedule-text">
                  <span class="schedule-label">เวลาออกเดินทาง</span>
                  <span class="schedule-value">{{ scheduleDisplayText }}</span>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="schedule-arrow"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>

            <!-- Ride Options Enhanced -->
            <div class="ride-options-enhanced">
              <button
                v-for="(type, index) in rideTypes"
                :key="type.value"
                :class="[
                  'ride-option-enhanced',
                  {
                    active: rideType === type.value,
                    'is-pressed': pressedButton === `ride-${type.value}`,
                  },
                ]"
                :style="{ animationDelay: `${index * 80}ms` }"
                @click="selectRideTypeEnhanced(type.value)"
                @mousedown="handleButtonPress(`ride-${type.value}`)"
                @mouseup="handleButtonRelease"
                @touchstart="handleButtonPress(`ride-${type.value}`)"
                @touchend="handleButtonRelease"
              >
                <div class="ride-option-left">
                  <div :class="['ride-icon-enhanced', type.value]">
                    <svg viewBox="0 0 48 48" fill="none">
                      <rect
                        x="4"
                        y="18"
                        width="40"
                        height="18"
                        rx="4"
                        :fill="
                          type.value === 'premium'
                            ? '#1A1A1A'
                            : type.value === 'shared'
                              ? '#6366F1'
                              : '#00A86B'
                        "
                      />
                      <rect
                        x="8"
                        y="10"
                        width="32"
                        height="14"
                        rx="4"
                        :fill="
                          type.value === 'premium'
                            ? '#1A1A1A'
                            : type.value === 'shared'
                              ? '#6366F1'
                              : '#00A86B'
                        "
                      />
                      <rect
                        x="12"
                        y="12"
                        width="10"
                        height="8"
                        rx="2"
                        :fill="
                          type.value === 'premium'
                            ? '#4A4A4A'
                            : type.value === 'shared'
                              ? '#A5B4FC'
                              : '#E8F5EF'
                        "
                      />
                      <rect
                        x="26"
                        y="12"
                        width="10"
                        height="8"
                        rx="2"
                        :fill="
                          type.value === 'premium'
                            ? '#4A4A4A'
                            : type.value === 'shared'
                              ? '#A5B4FC'
                              : '#E8F5EF'
                        "
                      />
                      <circle cx="14" cy="36" r="5" fill="#333" />
                      <circle cx="34" cy="36" r="5" fill="#333" />
                    </svg>
                  </div>
                  <div class="ride-option-info">
                    <div class="ride-option-header">
                      <span class="ride-option-name">{{ type.label }}</span>
                      <span
                        v-if="type.value === 'shared'"
                        class="ride-badge eco"
                      >ประหยัด</span>
                      <span
                        v-if="type.value === 'premium'"
                        class="ride-badge premium"
                      >หรู</span>
                    </div>
                    <div class="ride-option-meta">
                      <span class="eta-badge">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 6v6l4 2" />
                        </svg>
                        {{ type.eta }}
                      </span>
                      <span class="capacity-badge">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <circle cx="12" cy="8" r="4" />
                          <path d="M20 21a8 8 0 10-16 0" />
                        </svg>
                        {{ type.capacity }}
                      </span>
                    </div>
                    <p class="ride-option-desc">{{ type.description }}</p>
                  </div>
                </div>
                <div class="ride-option-right">
                  <span class="ride-option-price">฿{{
                    rideStore.calculateFare(estimatedDistance, type.value)
                  }}</span>
                  <Transition name="scale-fade">
                    <div
                      v-if="rideType === type.value"
                      class="ride-check-enhanced"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="3"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  </Transition>
                </div>
              </button>
            </div>

            <!-- Surge Warning -->
            <Transition name="slide-fade">
              <div v-if="surgeMultiplier > 1" class="surge-warning">
                <div class="surge-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <div class="surge-text">
                  <span class="surge-title">ช่วงเวลาเร่งด่วน</span>
                  <span class="surge-desc">ค่าโดยสารเพิ่มขึ้น x{{ surgeMultiplier.toFixed(1) }}</span>
                </div>
              </div>
            </Transition>

            <!-- Payment Method -->
            <div
              class="payment-method-card-enhanced"
              :class="{ 'is-pressed': pressedButton === 'payment' }"
              @mousedown="handleButtonPress('payment')"
              @mouseup="handleButtonRelease"
              @touchstart="handleButtonPress('payment')"
              @touchend="handleButtonRelease"
              @click="
                showPaymentSheet = true;
                triggerHaptic('light');
              "
            >
              <div class="payment-method-body">
                <div class="payment-method-icon">
                  <svg
                    v-if="paymentMethod === 'cash'"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <rect x="1" y="4" width="22" height="16" rx="2" />
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                  <svg
                    v-else-if="paymentMethod === 'wallet'"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5z"
                    />
                    <path d="M16 12h5v4h-5a2 2 0 010-4z" />
                  </svg>
                  <svg
                    v-else
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <rect x="1" y="4" width="22" height="16" rx="2" />
                    <path d="M1 10h22" />
                  </svg>
                </div>
                <div class="payment-method-info">
                  <span class="payment-method-value">{{
                    paymentMethods.find((p) => p.value === paymentMethod)?.label
                  }}</span>
                  <span
                    v-if="paymentMethod === 'wallet'"
                    class="wallet-balance-hint"
                    :class="{ insufficient: hasInsufficientBalance }"
                  >
                    คงเหลือ ฿{{ walletBalance.toLocaleString() }}
                  </span>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="payment-arrow"
                >
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            <!-- Promo Code -->
            <PromoCodeInput
              v-model="appliedPromo"
              service-type="ride"
              :order-amount="
                estimatedFare * (surgeMultiplier > 1 ? surgeMultiplier : 1)
              "
              @discount-applied="handlePromoDiscount"
            />

            <!-- Fare Summary Compact -->
            <div class="fare-summary-compact">
              <div class="fare-row">
                <span>ค่าโดยสาร</span>
                <span>฿{{ estimatedFare.toFixed(0) }}</span>
              </div>
              <div v-if="surgeMultiplier > 1" class="fare-row surge">
                <span>ช่วงเร่งด่วน (x{{ surgeMultiplier.toFixed(1) }})</span>
                <span>+฿{{ (estimatedFare * (surgeMultiplier - 1)).toFixed(0) }}</span>
              </div>
              <div v-if="promoDiscount > 0" class="fare-row discount">
                <span>ส่วนลด</span>
                <span>-฿{{ promoDiscount }}</span>
              </div>
              <div class="fare-row total">
                <span>รวมทั้งหมด</span>
                <span class="total-price">฿{{ finalFare }}</span>
              </div>
            </div>

            <!-- Insufficient Balance Warning -->
            <Transition name="slide-fade">
              <div
                v-if="hasInsufficientBalance"
                class="insufficient-balance-warning"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div class="warning-text">
                  <span class="warning-title">ยอดเงินไม่เพียงพอ</span>
                  <span class="warning-detail">คงเหลือ ฿{{ walletBalance.toLocaleString() }} / ต้องการ ฿{{
                    finalFare.toLocaleString()
                  }}</span>
                </div>
                <button
                  class="topup-btn"
                  @click="router.push('/customer/wallet')"
                >
                  เติมเงิน
                </button>
              </div>
            </Transition>

            <!-- Book Button -->
            <button
              :disabled="isBooking || hasInsufficientBalance"
              :class="[
                'confirm-book-btn',
                {
                  'is-loading': isBooking,
                  'is-disabled': hasInsufficientBalance,
                },
              ]"
              @click="bookRide"
            >
              <template v-if="isBooking">
                <div class="booking-spinner"></div>
                <div class="booking-text">
                  <span class="booking-title">กำลังค้นหาคนขับ...</span>
                  <span class="booking-subtitle">รอสักครู่</span>
                </div>
              </template>
              <template v-else-if="hasInsufficientBalance">
                <div class="confirm-btn-content">
                  <span class="confirm-btn-text">ยอดเงินไม่พอ</span>
                  <span class="confirm-btn-price">฿{{ finalFare }}</span>
                </div>
              </template>
              <template v-else>
                <div class="confirm-btn-content">
                  <span class="confirm-btn-text">จองรถ</span>
                  <span class="confirm-btn-price">฿{{ finalFare }}</span>
                </div>
                <div class="confirm-btn-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </template>
            </button>

            <!-- Safety Note -->
            <div class="safety-note">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>การเดินทางของคุณได้รับการคุ้มครองโดย GOBEAR</span>
            </div>
          </div>
        </template>
      </div>
    </template>

    <!-- Schedule Sheet -->
    <BottomSheet v-model="showScheduleSheet" title="เลือกเวลาเดินทาง">
      <div class="schedule-sheet-content">
        <!-- Ride Now Option -->
        <button
          class="schedule-option"
          :class="{ active: !isScheduled }"
          @click="setRideNow"
        >
          <div class="schedule-option-icon now">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div class="schedule-option-text">
            <span class="schedule-option-title">เดินทางตอนนี้</span>
            <span class="schedule-option-desc">รถจะมารับทันที</span>
          </div>
          <div v-if="!isScheduled" class="schedule-check">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        </button>

        <!-- Schedule Later Option -->
        <button
          class="schedule-option"
          :class="{ active: isScheduled }"
          @click="isScheduled = true"
        >
          <div class="schedule-option-icon later">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
              <path d="M12 14v3l2 1" />
            </svg>
          </div>
          <div class="schedule-option-text">
            <span class="schedule-option-title">จองล่วงหน้า</span>
            <span class="schedule-option-desc">เลือกวันและเวลาที่ต้องการ</span>
          </div>
          <div v-if="isScheduled" class="schedule-check">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        </button>

        <!-- Date/Time Picker (show when schedule later is selected) -->
        <Transition name="slide-fade">
          <div v-if="isScheduled" class="schedule-datetime-picker">
            <div class="datetime-row">
              <label class="datetime-label">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                วันที่
              </label>
              <input
                v-model="scheduledDate"
                type="date"
                :min="getMinDate()"
                :max="getMaxDate()"
                class="datetime-input"
              />
            </div>
            <div class="datetime-row">
              <label class="datetime-label">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                เวลา
              </label>
              <input
                v-model="scheduledTime"
                type="time"
                :min="getMinTime()"
                class="datetime-input"
              />
            </div>

            <!-- Quick Time Options -->
            <div class="quick-time-options">
              <button
                v-for="mins in [30, 60, 120]"
                :key="mins"
                class="quick-time-btn"
                @click="
                  () => {
                    const d = new Date();
                    d.setMinutes(d.getMinutes() + mins);
                    scheduledDate = d.toISOString().split('T')[0] || '';
                    scheduledTime = d.toTimeString().slice(0, 5);
                  }
                "
              >
                {{ mins < 60 ? `${mins} นาที` : `${mins / 60} ชม.` }}
              </button>
            </div>
          </div>
        </Transition>

        <!-- Recurring Rides Link -->
        <button
          class="recurring-link"
          @click="
            showScheduleSheet = false;
            openRecurringSheet();
          "
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M17 2.1l4 4-4 4" />
            <path d="M3 12.2v-2a4 4 0 014-4h12.8" />
            <path d="M7 21.9l-4-4 4-4" />
            <path d="M21 11.8v2a4 4 0 01-4 4H4.2" />
          </svg>
          <span>จัดการการจองประจำ</span>
          <span v-if="activeTemplates.length > 0" class="recurring-count">{{
            activeTemplates.length
          }}</span>
        </button>

        <!-- Confirm Button -->
        <button
          class="schedule-confirm-btn"
          :disabled="isScheduled && (!scheduledDate || !scheduledTime)"
          @click="confirmSchedule"
        >
          <span>ยืนยัน</span>
        </button>
      </div>
    </BottomSheet>

    <!-- Recurring Rides Sheet -->
    <BottomSheet v-model="showRecurringSheet" title="การจองประจำ">
      <div class="recurring-sheet-content">
        <!-- Active Templates -->
        <div v-if="recurringLoading" class="recurring-loading">
          <div class="spinner"></div>
          <span>กำลังโหลด...</span>
        </div>

        <div
          v-else-if="recurringTemplates.length === 0"
          class="recurring-empty"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path d="M17 2.1l4 4-4 4" />
            <path d="M3 12.2v-2a4 4 0 014-4h12.8" />
            <path d="M7 21.9l-4-4 4-4" />
            <path d="M21 11.8v2a4 4 0 01-4 4H4.2" />
          </svg>
          <span>ยังไม่มีการจองประจำ</span>
          <p>สร้างการจองประจำเพื่อให้ระบบจองรถให้อัตโนมัติ</p>
        </div>

        <div v-else class="recurring-list">
          <div
            v-for="template in recurringTemplates"
            :key="template.id"
            class="recurring-item"
            :class="{ inactive: !template.is_active }"
          >
            <div
              class="recurring-item-main"
              @click="useRecurringTemplate(template)"
            >
              <div class="recurring-item-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M17 2.1l4 4-4 4" />
                  <path d="M3 12.2v-2a4 4 0 014-4h12.8" />
                </svg>
              </div>
              <div class="recurring-item-info">
                <span class="recurring-item-name">{{
                  template.name || "การจองประจำ"
                }}</span>
                <span class="recurring-item-route">{{ template.pickup_address }} →
                  {{ template.destination_address }}</span>
                <span class="recurring-item-schedule">{{
                  formatSchedule(template)
                }}</span>
                <span v-if="template.is_active" class="recurring-item-next">
                  ครั้งถัดไป: {{ getNextScheduleDisplay(template) }}
                </span>
              </div>
            </div>
            <div class="recurring-item-actions">
              <button
                class="recurring-action-btn toggle"
                :class="{ active: template.is_active }"
                :title="template.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'"
                @click.stop="toggleTemplate(template.id)"
              >
                <svg
                  v-if="template.is_active"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M18.36 6.64a9 9 0 11-12.73 0" />
                  <line x1="12" y1="2" x2="12" y2="12" />
                </svg>
                <svg
                  v-else
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="10,8 16,12 10,16" />
                </svg>
              </button>
              <button
                class="recurring-action-btn delete"
                title="ลบ"
                @click.stop="deleteTemplate(template.id)"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                  <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Create New Button -->
        <button
          class="create-recurring-btn"
          :disabled="!pickupLocation || !destinationLocation"
          @click="
            showRecurringSheet = false;
            showCreateRecurringModal = true;
          "
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v8M8 12h8" />
          </svg>
          <span>สร้างการจองประจำใหม่</span>
        </button>
        <p v-if="!pickupLocation || !destinationLocation" class="create-hint">
          เลือกจุดรับและจุดหมายก่อนสร้างการจองประจำ
        </p>
      </div>
    </BottomSheet>

    <!-- Create Recurring Modal -->
    <BottomSheet v-model="showCreateRecurringModal" title="สร้างการจองประจำ">
      <div class="create-recurring-content">
        <!-- Route Preview -->
        <div class="route-preview-mini">
          <div class="route-point">
            <span class="route-dot pickup"></span>
            <span>{{ pickupAddress || "จุดรับ" }}</span>
          </div>
          <div class="route-line"></div>
          <div class="route-point">
            <span class="route-dot destination"></span>
            <span>{{ destinationAddress || "จุดหมาย" }}</span>
          </div>
        </div>

        <!-- Name Input -->
        <div class="form-group">
          <label>ชื่อการจอง (ไม่บังคับ)</label>
          <input
            v-model="recurringName"
            type="text"
            placeholder="เช่น ไปทำงาน, กลับบ้าน"
            class="form-input"
          />
        </div>

        <!-- Schedule Type -->
        <div class="form-group">
          <label>รูปแบบการจอง</label>
          <div class="schedule-type-options">
            <button
              v-for="(label, type) in scheduleTypeLabels"
              :key="String(type)"
              class="schedule-type-btn"
              :class="{ active: recurringScheduleType === String(type) }"
              @click="recurringScheduleType = String(type) as any"
            >
              {{ label }}
            </button>
          </div>
        </div>

        <!-- Day Selection (for weekly/custom) -->
        <Transition name="slide-fade">
          <div
            v-if="
              recurringScheduleType === 'weekly' ||
                recurringScheduleType === 'custom'
            "
            class="form-group"
          >
            <label>เลือกวัน</label>
            <div class="day-selector">
              <button
                v-for="(label, index) in dayLabels"
                :key="index"
                class="day-btn"
                :class="{ active: recurringScheduleDays.includes(index) }"
                @click="
                  () => {
                    if (recurringScheduleDays.includes(index)) {
                      recurringScheduleDays = recurringScheduleDays.filter(
                        (d) => d !== index
                      );
                    } else {
                      recurringScheduleDays = [
                        ...recurringScheduleDays,
                        index,
                      ].sort();
                    }
                  }
                "
              >
                {{ label }}
              </button>
            </div>
          </div>
        </Transition>

        <!-- Time -->
        <div class="form-group">
          <label>เวลาออกเดินทาง</label>
          <input
            v-model="recurringScheduleTime"
            type="time"
            class="form-input time-input"
          />
        </div>

        <!-- Save Button -->
        <button
          class="save-recurring-btn"
          :disabled="
            recurringLoading ||
              (recurringScheduleType === 'weekly' &&
                recurringScheduleDays.length === 0)
          "
          @click="saveAsRecurring"
        >
          <span v-if="recurringLoading">กำลังบันทึก...</span>
          <span v-else>บันทึกการจองประจำ</span>
        </button>
      </div>
    </BottomSheet>

    <!-- Payment Sheet -->
    <BottomSheet v-model="showPaymentSheet" title="วิธีชำระเงิน">
      <div class="payment-options">
        <button
          v-for="method in paymentMethods"
          :key="method.value"
          :class="[
            'payment-option',
            { active: paymentMethod === method.value },
          ]"
          @click="
            paymentMethod = method.value;
            showPaymentSheet = false;
          "
        >
          <span>{{ method.label }}</span>
          <div v-if="paymentMethod === method.value" class="check-mark">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        </button>
      </div>
    </BottomSheet>

    <!-- Promo Sheet -->
    <BottomSheet v-model="showPromoSheet" title="โค้ดส่วนลด">
      <div class="promo-input-section">
        <input
          v-model="promoCode"
          type="text"
          placeholder="ใส่โค้ดส่วนลด"
          class="promo-input"
        />
        <button class="apply-btn" @click="showPromoSheet = false">ใช้</button>
      </div>
    </BottomSheet>

    <!-- Pickup Map Picker -->
    <LocationPicker
      v-if="showPickupMapPicker"
      v-model="pickupAddress"
      placeholder="เลือกจุดรับ"
      type="pickup"
      @location-selected="(loc) => handleMapPickerConfirm(loc, 'pickup')"
      @confirm="(loc) => handleMapPickerConfirm(loc, 'pickup')"
      @close="showPickupMapPicker = false"
    />

    <!-- Destination Map Picker -->
    <LocationPicker
      v-if="showDestMapPicker"
      v-model="destinationAddress"
      placeholder="เลือกจุดหมาย"
      type="destination"
      title="ลากหมุดเพื่อเลือกปลายทาง"
      :initial-location="destinationLocation || pickupLocation"
      :home-place="homePlace"
      :work-place="workPlace"
      @location-selected="(loc) => handleMapPickerConfirm(loc, 'destination')"
      @confirm="(loc) => handleMapPickerConfirm(loc, 'destination')"
      @close="showDestMapPicker = false"
    />

    <!-- Nearby Places Sheet -->
    <NearbyPlacesSheet
      :show="showNearbyPlaces"
      :current-lat="pickupLocation?.lat"
      :current-lng="pickupLocation?.lng"
      @close="showNearbyPlaces = false"
      @select="handleNearbyPlaceSelect"
    />

    <!-- Destination Picker Modal -->
    <Teleport to="body">
      <Transition name="slide-up-full">
        <div v-if="showDestinationPicker" class="destination-picker-modal">
          <DestinationPicker
            :home-place="homePlace"
            :work-place="workPlace"
            :recent-places="recentPlaces"
            :favorite-places="favoritePlaces"
            :current-lat="pickupLocation?.lat"
            :current-lng="pickupLocation?.lng"
            @select="handleDestinationPickerSelect"
            @select-map="showDestMapPicker = true; showDestinationPicker = false;"
            @select-nearby="showNearbyPlaces = true; showDestinationPicker = false;"
            @close="showDestinationPicker = false"
          />
        </div>
      </Transition>
    </Teleport>

    <!-- Pickup Picker Modal -->
    <Teleport to="body">
      <Transition name="slide-up-full">
        <div v-if="showPickupPicker" class="pickup-picker-modal">
          <PickupPicker
            :home-place="homePlace"
            :work-place="workPlace"
            :recent-places="recentPlaces"
            :current-lat="pickupLocation?.lat"
            :current-lng="pickupLocation?.lng"
            :is-getting-location="isGettingLocation"
            @select="handlePickupPickerSelect"
            @select-current-location="handlePickupCurrentLocation"
            @select-map="showPickupMapPicker = true; showPickupPicker = false;"
            @close="showPickupPicker = false"
          />
        </div>
      </Transition>
    </Teleport>

    <!-- BottomNavigation ถูกซ่อนในหน้านี้เพื่อให้ผู้ใช้โฟกัสกับการจอง -->
  </div>
</template>

<style src="../styles/native-ride-enhancements.css"></style>

<style scoped>
/* ========================================
   NATIVE APP ENHANCEMENTS
   ======================================== */

/* Root Page - Native Feel */
.ride-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  /* Native smooth scrolling */
  -webkit-overflow-scrolling: touch;
  /* Prevent overscroll bounce on iOS */
  overscroll-behavior-y: contain;
  /* Hardware acceleration */
  transform: translateZ(0);
  will-change: transform;
}

/* Map Section */
.map-section {
  position: relative;
  height: 40vh;
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
  padding: 16px 20px;
  padding-top: calc(16px + env(safe-area-inset-top));
  z-index: 10;
}

.nav-btn {
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

.nav-btn svg {
  width: 24px;
  height: 24px;
  color: #1a1a1a;
}

.nav-btn:active {
  transform: scale(0.95);
}

.logo-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.logo-badge svg {
  width: 28px;
  height: 28px;
}

.logo-badge span {
  font-size: 14px;
  font-weight: 700;
  color: #00a86b;
  letter-spacing: 0.5px;
}

/* Bottom Panel */
.bottom-panel {
  flex: 1;
  min-height: 0;
  background: #ffffff;
  border-radius: 28px 28px 0 0;
  margin-top: -24px;
  padding: 12px 20px;
  padding-bottom: calc(
    24px + env(safe-area-inset-bottom)
  ); /* Safe area for CTA button */
  position: relative;
  z-index: 20;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.panel-handle {
  width: 40px;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  margin: 0 auto 12px;
}

/* Step Indicator Enhanced */
.step-indicator-wrapper {
  background: linear-gradient(135deg, #f8fdf9 0%, #e8f5ef 100%);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid rgba(0, 168, 107, 0.15);
}

.step-indicator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.step-indicator-title {
  font-size: 12px;
  font-weight: 500;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.step-indicator-current {
  font-size: 14px;
  font-weight: 700;
  color: #00a86b;
  background: rgba(0, 168, 107, 0.1);
  padding: 4px 12px;
  border-radius: 20px;
}

.step-indicator-enhanced {
  position: relative;
}

.step-progress-bar {
  position: absolute;
  top: 22px;
  left: 50px;
  right: 50px;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  z-index: 0;
}

.step-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00a86b, #00c77b);
  border-radius: 2px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.step-items-row {
  display: flex;
  justify-content: space-between;
  position: relative;
  z-index: 1;
}

.step-item-enhanced {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  cursor: default;
  transition: all 0.3s ease;
}

.step-item-enhanced.clickable {
  cursor: pointer;
}

.step-item-enhanced.clickable:hover .step-circle {
  transform: scale(1.05);
}

.step-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  background: #ffffff;
  color: #cccccc;
  border: 3px solid #e0e0e0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.step-item-enhanced.active .step-circle {
  background: #00a86b;
  color: #ffffff;
  border-color: #00a86b;
  box-shadow: 0 4px 16px rgba(0, 168, 107, 0.4);
  transform: scale(1.15);
}

.step-item-enhanced.completed .step-circle {
  background: #00a86b;
  color: #ffffff;
  border-color: #00a86b;
  box-shadow: 0 2px 8px rgba(0, 168, 107, 0.25);
}

.step-item-enhanced.completed .step-circle svg {
  width: 20px;
  height: 20px;
}

.step-label-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.step-text {
  font-size: 13px;
  font-weight: 600;
  color: #888888;
  text-align: center;
  transition: all 0.3s ease;
}

.step-description {
  font-size: 10px;
  font-weight: 400;
  color: #aaaaaa;
  text-align: center;
  max-width: 100px;
}

.step-item-enhanced.active .step-text {
  color: #00a86b;
  font-weight: 700;
}

.step-item-enhanced.active .step-description {
  color: #00a86b;
}

.step-item-enhanced.completed .step-text {
  color: #00a86b;
  font-weight: 600;
}

.step-item-enhanced.completed .step-description {
  color: rgba(0, 168, 107, 0.7);
}

/* Step Content */
.step-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

/* ========================================
   NEW 2-STEP FLOW STYLES
   ======================================== */

/* Location Section */
.location-section {
  background: #ffffff;
  border-radius: 16px;
  border: 2px solid #e8e8e8;
  padding: 16px;
  transition: all 0.3s ease;
}

.location-section.is-selected {
  border-color: #00a86b;
  background: #f0fdf4;
}

.location-section.is-active {
  border-color: #00a86b;
  box-shadow: 0 0 0 4px rgba(0, 168, 107, 0.1);
}

.location-section-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.location-marker-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.location-marker-icon.pickup {
  background: #e8f5ef;
}

.location-marker-icon.pickup .marker-dot {
  width: 16px;
  height: 16px;
  background: #00a86b;
  border-radius: 50%;
}

.location-marker-icon.pickup .marker-dot.pulse {
  animation: pulse 2s infinite;
}

.location-marker-icon.destination {
  background: #fef2f2;
}

.location-marker-icon.destination svg {
  width: 24px;
  height: 24px;
  color: #ef4444;
}

.location-section-title {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-label {
  font-size: 12px;
  font-weight: 500;
  color: #888888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-value {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.section-placeholder {
  font-size: 15px;
  color: #aaaaaa;
}

.edit-btn {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.edit-btn:active {
  background: #f5f5f5;
  transform: scale(0.95);
}

/* Location Options */
.location-options {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gps-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #f8f8f8;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
  cursor: pointer;
  transition: all 0.2s ease;
}

.gps-btn.primary {
  background: #00a86b;
  color: #ffffff;
}

.gps-btn:active {
  transform: scale(0.98);
}

.gps-btn.is-loading {
  opacity: 0.7;
  pointer-events: none;
}

.gps-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gps-icon svg {
  width: 24px;
  height: 24px;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Quick Options Row */
.quick-options-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.quick-option-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  background: #f8f8f8;
  border: none;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 70px;
}

.quick-option-btn svg {
  width: 20px;
  height: 20px;
}

.quick-option-btn:active {
  background: #e8e8e8;
  transform: scale(0.95);
}

.quick-option-btn.home svg {
  color: #00a86b;
}

.quick-option-btn.work svg {
  color: #6366f1;
}

/* Destination Options */
.destination-options {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Popular Destinations Compact */
.popular-destinations-compact {
  margin-top: 4px;
}

.popular-destinations-compact .popular-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.popular-destinations-compact .popular-chip {
  padding: 10px 14px;
  background: #f8f8f8;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: #1a1a1a;
  cursor: pointer;
  transition: all 0.2s ease;
}

.popular-destinations-compact .popular-chip:active {
  background: #e8e8e8;
  transform: scale(0.95);
}

/* Recent Places Compact */
.recent-places-compact {
  margin-top: 8px;
}

.recent-chips-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
}

.recent-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #f8f8f8;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: #1a1a1a;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.recent-chip svg {
  width: 16px;
  height: 16px;
  color: #888888;
}

.recent-chip:active {
  background: #e8e8e8;
  transform: scale(0.95);
}

/* Route Summary Inline */
.route-summary-inline {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #f8f8f8;
  border-radius: 16px;
}

.route-line-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
}

.route-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.route-dot.pickup {
  background: #00a86b;
}

.route-dot.destination {
  background: #ef4444;
}

.route-connector {
  width: 2px;
  flex: 1;
  min-height: 24px;
  background: linear-gradient(to bottom, #00a86b, #ef4444);
}

.route-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.route-point {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.route-label {
  font-size: 11px;
  font-weight: 500;
  color: #888888;
  text-transform: uppercase;
}

.route-value {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

/* Fare Summary Compact */
.fare-summary-compact {
  background: #f8f8f8;
  border-radius: 16px;
  padding: 16px;
}

.fare-summary-compact .fare-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 14px;
  color: #666666;
}

.fare-summary-compact .fare-row.surge {
  color: #f59e0b;
}

.fare-summary-compact .fare-row.discount {
  color: #00a86b;
}

.fare-summary-compact .fare-row.total {
  border-top: 1px solid #e0e0e0;
  margin-top: 8px;
  padding-top: 12px;
  font-weight: 600;
  color: #1a1a1a;
}

.fare-summary-compact .total-price {
  font-size: 18px;
  font-weight: 700;
  color: #00a86b;
}

/* Button Spinner */
.btn-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Step Header Card - Clean Style */
.step-header-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 4px 0;
}

.step-header-icon-box {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-header-icon-box svg {
  width: 26px;
  height: 26px;
}

.step-header-icon-box.pickup {
  background: #e8f5ef;
  color: #00a86b;
}

.step-header-icon-box.destination {
  background: #e3f2fd;
  color: #1976d2;
}

.step-header-icon-box.options {
  background: #fff3e0;
  color: #f57c00;
}

.step-header-icon-box.confirm {
  background: #e8f5ef;
  color: #00a86b;
}

.step-header-content {
  flex: 1;
}

.step-header-title {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 4px;
  line-height: 1.2;
}

.step-header-subtitle {
  font-size: 14px;
  color: #666666;
  margin: 0;
  line-height: 1.4;
}

/* Location Options List - Clean Card Style */
.location-options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.location-option-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #ffffff;
  border: 1.5px solid #f0f0f0;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.location-option-card:hover {
  border-color: #00a86b;
  background: #fafffe;
}

.location-option-card:active,
.location-option-card.is-pressed {
  transform: scale(0.98);
  border-color: #00a86b;
}

.location-option-card.is-loading {
  opacity: 0.8;
  pointer-events: none;
}

.option-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.option-icon-box svg {
  width: 24px;
  height: 24px;
}

.option-icon-box.green {
  background: #e8f5ef;
  color: #00a86b;
}

.option-icon-box.blue {
  background: #e3f2fd;
  color: #1976d2;
}

.option-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.option-subtitle {
  font-size: 13px;
  color: #888888;
}

.option-arrow {
  width: 20px;
  height: 20px;
  color: #cccccc;
  flex-shrink: 0;
}

.option-arrow svg {
  width: 100%;
  height: 100%;
}

/* Mini Spinner */
.mini-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e8f5ef;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.step-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.step-desc {
  font-size: 14px;
  color: #666666;
  margin: -8px 0 0;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: 12px;
}

.quick-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-action-btn:hover {
  border-color: #00a86b;
  background: #f8fdf9;
}

.quick-action-btn:active {
  transform: scale(0.98);
}

.action-icon {
  width: 36px;
  height: 36px;
  background: #e8f5ef;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00a86b;
}

.action-icon svg {
  width: 18px;
  height: 18px;
}

.action-icon.nearby {
  background: #fff3e0;
  color: #f5a623;
}

.quick-action-btn span {
  font-size: 13px;
  font-weight: 500;
  color: #1a1a1a;
}

/* Saved Places Row */
.saved-places-row {
  display: flex;
  gap: 12px;
}

.saved-place-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.saved-place-btn:hover {
  border-color: #00a86b;
  background: #f8fdf9;
}

.saved-place-btn:active {
  transform: scale(0.98);
}

.saved-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.saved-icon svg {
  width: 20px;
  height: 20px;
}

.saved-icon.home {
  background: #e3f2fd;
  color: #1976d2;
}

.saved-icon.work {
  background: #f3e5f5;
  color: #7b1fa2;
}

.saved-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.saved-label {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
}

.saved-address {
  font-size: 11px;
  color: #666666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Loading State for Places */
.places-loading {
  display: flex;
  gap: 12px;
}

.loading-shimmer {
  flex: 1;
  height: 72px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  border-radius: 12px;
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

/* Animation for items */
.animate-in {
  animation: fadeSlideIn 0.3s ease-out forwards;
  opacity: 0;
}

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Favorite Places Section */
.favorite-places-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.favorite-places-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.favorite-place-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #fffbeb;
  border: 1px solid #fef3c7;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.favorite-place-item:hover {
  background: #fef3c7;
  border-color: #fcd34d;
}

.favorite-place-item:active {
  transform: scale(0.99);
}

.favorite-icon {
  width: 36px;
  height: 36px;
  background: #fef3c7;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f59e0b;
  flex-shrink: 0;
}

.favorite-icon svg {
  width: 18px;
  height: 18px;
  fill: #f59e0b;
}

.favorite-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.favorite-name {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.favorite-address {
  font-size: 12px;
  color: #666666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Recent Places Section */
.recent-places-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.recent-places-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-place-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #f8f8f8;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.recent-place-item:hover {
  background: #f0f0f0;
}

.recent-place-item:active {
  transform: scale(0.99);
}

.recent-icon {
  width: 36px;
  height: 36px;
  background: #ffffff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999999;
  flex-shrink: 0;
}

.recent-icon svg {
  width: 18px;
  height: 18px;
}

.recent-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recent-name {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-address {
  font-size: 12px;
  color: #666666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Search Input */
.search-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 12px;
  transition: all 0.2s;
}

.search-input-wrapper:focus-within {
  background: #ffffff;
  border-color: #00a86b;
}

.search-icon {
  width: 20px;
  height: 20px;
  color: #999999;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 15px;
  color: #1a1a1a;
  outline: none;
}

.search-input::placeholder {
  color: #999999;
}

/* Search Results */
.search-results {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  overflow: hidden;
  max-height: 280px;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: transparent;
  border: none;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background: #f8fdf9;
}

.search-result-item:active {
  background: #e8f5ef;
}

.result-icon {
  width: 36px;
  height: 36px;
  background: #e8f5ef;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00a86b;
  flex-shrink: 0;
}

.result-icon svg {
  width: 18px;
  height: 18px;
}

.result-icon.destination {
  background: #ffebee;
  color: #e53935;
}

.result-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.result-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.result-address {
  font-size: 12px;
  color: #666666;
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
  background: #e8f5ef;
  border: 2px solid #00a86b;
  border-radius: 14px;
}

.selected-location-card.compact {
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
}

.selected-location-card .location-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.change-btn {
  padding: 8px 14px;
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #00a86b;
  cursor: pointer;
}

.change-btn:active {
  background: #f5f5f5;
}

/* Calculating State */
.calculating-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  color: #666666;
  font-size: 14px;
}

/* Route Summary */
.route-summary {
  background: #f5f5f5;
  border-radius: 14px;
  padding: 16px;
}

.route-locations {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.route-point {
  display: flex;
  align-items: center;
  gap: 12px;
}

.route-point span {
  font-size: 14px;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.route-line {
  width: 2px;
  height: 16px;
  background: #e8e8e8;
  margin-left: 11px;
}

.route-stats {
  display: flex;
  gap: 24px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e8e8e8;
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.stat svg {
  width: 18px;
  height: 18px;
  color: #00a86b;
}

/* Confirm Route Card */
.confirm-route-card {
  background: #f5f5f5;
  border-radius: 14px;
  padding: 16px;
}

.confirm-route-card .route-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.route-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.route-label {
  font-size: 12px;
  color: #999999;
}

.route-address {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.route-connector {
  width: 2px;
  height: 20px;
  background: #e8e8e8;
  margin: 4px 0 4px 11px;
}

/* Selected Ride Card */
.selected-ride-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 14px;
}

.ride-icon-small {
  width: 48px;
  height: 36px;
  flex-shrink: 0;
}

.ride-icon-small svg {
  width: 100%;
  height: 100%;
}

.ride-type-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ride-type-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.ride-type-desc {
  font-size: 12px;
  color: #666666;
}

/* Payment Method Card */
.payment-method-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 14px;
  cursor: pointer;
}

.payment-method-card:active {
  background: #f5f5f5;
}

.payment-icon {
  width: 40px;
  height: 40px;
  background: #e8f5ef;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00a86b;
}

.payment-icon svg {
  width: 20px;
  height: 20px;
}

.payment-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.payment-label {
  font-size: 12px;
  color: #999999;
}

.payment-value {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
}

.arrow-icon {
  width: 20px;
  height: 20px;
  color: #cccccc;
}

/* Confirm Button */
.confirm-btn {
  margin-top: 8px;
}

/* Location Card - Legacy (kept for reference) */
.location-card {
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 16px;
  padding: 4px;
}

.location-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
}

.location-marker {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.marker-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.location-marker.pickup .marker-dot {
  background: #00a86b;
}

.location-marker.destination .marker-dot {
  background: #e53935;
}

.location-input {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.location-label {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.location-sublabel {
  display: block;
  font-size: 13px;
  color: #999999;
  margin-top: 2px;
}

.location-arrow {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #cccccc;
}

.location-arrow svg {
  width: 20px;
  height: 20px;
}

.location-divider {
  height: 1px;
  background: #f0f0f0;
  margin: 0 16px 0 54px;
}

/* Search Section */
.search-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Ride Details Header */
.ride-details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ride-details-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.schedule-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #e8f5ef;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #00a86b;
  cursor: pointer;
}

.schedule-badge svg {
  width: 16px;
  height: 16px;
}

/* Ride Options */
.ride-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ride-option {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #ffffff;
  border: 2px solid #f0f0f0;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.ride-option:active {
  transform: scale(0.98);
}

.ride-option.active {
  border-color: #00a86b;
  background: #f8fdf9;
}

.ride-icon {
  width: 64px;
  height: 48px;
  flex-shrink: 0;
}

.ride-icon svg {
  width: 100%;
  height: 100%;
}

.ride-info {
  flex: 1;
  min-width: 0;
}

.ride-name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.ride-name {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
}

.ride-price {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
}

.ride-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666666;
  margin-bottom: 4px;
}

.meta-dot {
  font-size: 8px;
}

.capacity-icon {
  width: 14px;
  height: 14px;
}

.ride-desc {
  font-size: 12px;
  color: #999999;
  margin: 0;
}

.ride-check {
  width: 28px;
  height: 28px;
  background: #00a86b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  flex-shrink: 0;
}

.ride-check svg {
  width: 16px;
  height: 16px;
}

/* Book Button */
.book-btn {
  width: 100%;
  padding: 18px 24px;
  background: #00a86b;
  color: #ffffff;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
  margin-top: auto;
}

.book-btn:hover:not(:disabled) {
  background: #008f5b;
}

.book-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.book-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Driver Card */
.driver-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 16px;
}

.driver-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.driver-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.driver-info {
  flex: 1;
  min-width: 0;
}

.driver-info h3 {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 4px;
}

.driver-info p {
  font-size: 13px;
  color: #666666;
  margin: 0;
}

.driver-plate {
  padding: 6px 12px;
  background: #ffffff;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #1a1a1a;
}

.driver-rating {
  display: flex;
  align-items: center;
  gap: 4px;
}

.driver-rating svg {
  width: 16px;
  height: 16px;
}

.driver-rating span {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  cursor: pointer;
}

.action-btn svg {
  width: 20px;
  height: 20px;
}

.action-btn.share {
  background: #00a86b;
  border-color: #00a86b;
  color: #ffffff;
}

.action-btn:active {
  transform: scale(0.98);
}

/* Fare Summary */
.fare-summary {
  background: #f5f5f5;
  border-radius: 12px;
  padding: 16px;
}

.fare-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #666666;
  padding: 8px 0;
}

.fare-row.surge {
  color: #e65100;
}

.fare-row.total {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  border-top: 1px solid #e8e8e8;
  margin-top: 8px;
  padding-top: 12px;
}

/* Payment Options */
.payment-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.payment-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
  cursor: pointer;
}

.payment-option.active {
  border-color: #00a86b;
  background: #f8fdf9;
}

.check-mark {
  width: 24px;
  height: 24px;
  background: #00a86b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
}

.check-mark svg {
  width: 14px;
  height: 14px;
}

/* Promo Input */
.promo-input-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.promo-input {
  width: 100%;
  padding: 16px;
  border: 2px solid #e8e8e8;
  border-radius: 12px;
  font-size: 16px;
}

.promo-input:focus {
  outline: none;
  border-color: #00a86b;
}

.apply-btn {
  width: 100%;
  padding: 16px;
  background: #00a86b;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

/* ========================================
   ENHANCED UX STYLES
   ======================================== */

/* Step Animation - Slide Left/Right */
.animate-step {
  animation: stepSlideIn 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

@keyframes stepSlideIn {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Backward animation class */
.animate-step-back {
  animation: stepSlideBack 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

@keyframes stepSlideBack {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Recent History Quick Chips */
.recent-history-chips {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-chips-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.history-chips-scroll::-webkit-scrollbar {
  display: none;
}

.history-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #f8f8f8;
  border: 1.5px solid #f0f0f0;
  border-radius: 24px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.2s ease;
  animation: chipFadeIn 0.3s ease-out backwards;
}

.history-chip:hover {
  background: #f0f0f0;
  border-color: #e0e0e0;
}

.history-chip:active,
.history-chip.is-pressed {
  transform: scale(0.95);
  background: #e8f5ef;
  border-color: #00a86b;
}

.history-chip-icon {
  width: 20px;
  height: 20px;
  color: #888888;
  flex-shrink: 0;
}

.history-chip-icon svg {
  width: 100%;
  height: 100%;
}

.history-chip-text {
  font-size: 13px;
  font-weight: 500;
  color: #333333;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

@keyframes chipFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Step Header */
.step-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 8px;
}

.step-header-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-header-icon svg {
  width: 24px;
  height: 24px;
}

.step-header-icon.pickup-icon {
  background: #e8f5ef;
  color: #00a86b;
}

.step-header-icon.destination-icon {
  background: #ffebee;
  color: #e53935;
}

.step-header-text {
  flex: 1;
}

.step-header-text .step-title {
  margin-bottom: 2px;
}

.step-header-text .step-desc {
  margin: 0;
}

/* Quick Actions Grid */
.quick-actions-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-action-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #ffffff;
  border: 1.5px solid #e8e8e8;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.quick-action-card:hover {
  border-color: #00a86b;
  background: #fafffe;
}

.quick-action-card:active,
.quick-action-card.is-pressed {
  transform: scale(0.98);
  background: #f0fdf4;
}

.quick-action-card.is-loading {
  opacity: 0.8;
  pointer-events: none;
}

.action-card-icon {
  width: 44px;
  height: 44px;
  background: #e8f5ef;
  border-radius: 12px;
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
  background: #e3f2fd;
  color: #1976d2;
}

.action-card-content {
  flex: 1;
  min-width: 0;
}

.action-card-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 2px;
}

.action-card-subtitle {
  display: block;
  font-size: 12px;
  color: #666666;
}

.action-card-arrow {
  width: 20px;
  height: 20px;
  color: #cccccc;
  flex-shrink: 0;
}

.action-card-arrow svg {
  width: 100%;
  height: 100%;
}

/* Mini Spinner */
.mini-spinner {
  width: 22px;
  height: 22px;
  border: 2px solid #e8f5ef;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Section Divider */
.section-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 4px 0;
}

.section-divider::before,
.section-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: #e8e8e8;
}

.section-divider span {
  font-size: 12px;
  color: #999999;
  white-space: nowrap;
}

/* Enhanced Search Input */
.search-input-wrapper.enhanced {
  background: #f8f8f8;
  border: 2px solid #f0f0f0;
  padding: 16px;
}

.search-input-wrapper.enhanced.large {
  padding: 18px;
}

.search-input-wrapper.enhanced:focus-within {
  background: #ffffff;
  border-color: #00a86b;
  box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.1);
}

.clear-search-btn {
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  color: #999999;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-search-btn svg {
  width: 18px;
  height: 18px;
}

/* Enhanced Search Results */
.search-results.enhanced {
  border: none;
  background: transparent;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  overflow: hidden;
}

.search-results.enhanced .search-result-item {
  padding: 16px;
}

.animate-item {
  animation: itemSlideIn 0.3s ease-out forwards;
  opacity: 0;
}

@keyframes itemSlideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.result-arrow {
  width: 20px;
  height: 20px;
  color: #cccccc;
  flex-shrink: 0;
}

.result-arrow svg {
  width: 100%;
  height: 100%;
}

/* Selected Location Card Success */
.selected-location-card.success {
  background: #f0fdf4;
  border: 2px solid #00a86b;
  position: relative;
}

.success-check {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  background: #00a86b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 168, 107, 0.3);
}

.success-check svg {
  width: 14px;
  height: 14px;
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
    opacity: 0.8;
  }
}

/* Continue Button */
.continue-btn {
  width: 100%;
  padding: 18px 24px;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s ease;
  /* Sticky CTA - ติดด้านล่างเสมอ */
  position: sticky;
  bottom: 0;
  margin-top: auto;
  flex-shrink: 0;
  z-index: 10;
}

.continue-btn.primary {
  background: #00a86b;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.continue-btn.primary:hover {
  background: #008f5b;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 168, 107, 0.35);
}

.continue-btn.primary:active {
  transform: translateY(0) scale(0.98);
}

.continue-btn svg {
  width: 20px;
  height: 20px;
}

/* Route Preview Card */
.route-preview-card {
  background: #f8f8f8;
  border-radius: 14px;
  padding: 16px;
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

.route-dot.pickup {
  background: #00a86b;
}

.route-dot.destination {
  background: #e53935;
}

.route-dot.destination.empty {
  background: transparent;
  border: 2px dashed #e53935;
}

.route-preview-text {
  flex: 1;
  min-width: 0;
}

.route-preview-label {
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: #999999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.route-preview-value {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.route-preview-placeholder {
  display: block;
  font-size: 14px;
  color: #999999;
  font-style: italic;
}

.edit-btn {
  width: 32px;
  height: 32px;
  background: #ffffff;
  border: none;
  border-radius: 8px;
  color: #666666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.edit-btn svg {
  width: 16px;
  height: 16px;
}

.edit-btn:hover {
  background: #f0f0f0;
  color: #1a1a1a;
}

.route-connector-line {
  width: 2px;
  height: 20px;
  background: linear-gradient(to bottom, #00a86b, #e53935);
  margin-left: 5px;
  margin: 8px 0 8px 5px;
}

.destination-slot {
  opacity: 0.7;
}

/* Quick Destinations */
.quick-destinations {
  margin-bottom: 4px;
}

.section-title-small {
  font-size: 12px;
  font-weight: 600;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 10px;
}

.quick-dest-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.quick-dest-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #ffffff;
  border: 1.5px solid #e8e8e8;
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-dest-chip:hover {
  border-color: #00a86b;
  background: #fafffe;
}

.quick-dest-chip:active,
.quick-dest-chip.is-pressed {
  transform: scale(0.96);
  background: #f0fdf4;
}

.chip-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chip-icon svg {
  width: 14px;
  height: 14px;
}

.chip-icon.home {
  background: #e3f2fd;
  color: #1976d2;
}

.chip-icon.work {
  background: #f3e5f5;
  color: #7b1fa2;
}

.chip-icon.nearby {
  background: #fff3e0;
  color: #f5a623;
}

.quick-dest-chip span {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
}

/* Map Picker Button */
.map-picker-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: #ffffff;
  border: 1.5px dashed #cccccc;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.map-picker-btn:hover {
  border-color: #00a86b;
  border-style: solid;
  background: #fafffe;
}

.map-picker-btn:active {
  transform: scale(0.98);
}

.map-picker-icon {
  width: 44px;
  height: 44px;
  background: #e3f2fd;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1976d2;
  flex-shrink: 0;
}

.map-picker-icon svg {
  width: 22px;
  height: 22px;
}

.map-picker-text {
  flex: 1;
}

.map-picker-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 2px;
}

.map-picker-subtitle {
  display: block;
  font-size: 12px;
  color: #666666;
}

.map-picker-arrow {
  width: 20px;
  height: 20px;
  color: #cccccc;
  flex-shrink: 0;
}

/* Places Section */
.places-section {
  margin-top: 8px;
}

.places-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.place-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #ffffff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.place-item:hover {
  background: #f5f5f5;
}

.place-item:active {
  transform: scale(0.99);
  background: #f0f0f0;
}

.place-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.place-icon svg {
  width: 18px;
  height: 18px;
}

.place-icon.favorite {
  background: #fef3c7;
  color: #f59e0b;
}

.place-icon.recent {
  background: #f3f4f6;
  color: #6b7280;
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
  color: #666666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Calculating Overlay */
.calculating-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.calculating-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.calculating-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid #e8f5ef;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.calculating-text {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.calculating-subtext {
  font-size: 13px;
  color: #666666;
}

/* Vue Transitions - Enhanced Smooth Animations */
.slide-fade-enter-active {
  transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.slide-fade-leave-active {
  transition: all 0.25s cubic-bezier(0.55, 0.06, 0.68, 0.19);
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-12px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.scale-fade-enter-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.scale-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.55, 0.06, 0.68, 0.19);
}

.scale-fade-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

.scale-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.slide-up-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.slide-up-leave-active {
  transition: all 0.25s cubic-bezier(0.55, 0.06, 0.68, 0.19);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(24px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(16px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ========================================
   STEP 3 ENHANCED STYLES
   ======================================== */

.step-header-icon.options-icon {
  background: #eef2ff;
  color: #6366f1;
}

/* Route Summary Card Enhanced */
.route-summary-card-enhanced {
  background: #f8f8f8;
  border-radius: 16px;
  overflow: hidden;
}

.route-summary-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: #ffffff;
  border-bottom: 1px solid #f0f0f0;
}

.route-summary-icon {
  width: 32px;
  height: 32px;
  background: #e8f5ef;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00a86b;
}

.route-summary-icon svg {
  width: 16px;
  height: 16px;
}

.route-summary-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.edit-route-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: transparent;
  border: none;
  color: #00a86b;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.edit-route-btn svg {
  width: 14px;
  height: 14px;
}

.edit-route-btn:active {
  opacity: 0.7;
}

.route-summary-body {
  padding: 16px;
}

.route-point-enhanced {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.route-dot-enhanced {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.route-dot-enhanced.pickup {
  background: #00a86b;
}

.route-dot-enhanced.destination {
  background: #e53935;
}

.route-point-text {
  flex: 1;
  min-width: 0;
}

.route-point-label {
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: #999999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.route-point-value {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.route-connector-enhanced {
  width: 2px;
  height: 24px;
  background: linear-gradient(to bottom, #00a86b, #e53935);
  margin: 8px 0 8px 5px;
}

.route-stats-enhanced {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
}

.stat-chip svg {
  width: 14px;
  height: 14px;
  color: #00a86b;
}

/* Schedule Section */
.schedule-section {
  margin: -8px 0;
}

.schedule-badge-enhanced {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  background: #ffffff;
  border: 1.5px solid #e8e8e8;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.schedule-badge-enhanced:hover {
  border-color: #00a86b;
  background: #fafffe;
}

.schedule-badge-enhanced:active {
  transform: scale(0.98);
}

.schedule-badge-enhanced.scheduled {
  border-color: #00a86b;
  background: #e8f5ef;
}

.schedule-badge-enhanced.scheduled .schedule-icon {
  background: #00a86b;
  color: #ffffff;
}

.schedule-badge-enhanced.scheduled .schedule-value {
  color: #00a86b;
}

.schedule-icon {
  width: 40px;
  height: 40px;
  background: #e8f5ef;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00a86b;
}

.schedule-icon svg {
  width: 20px;
  height: 20px;
}

.schedule-text {
  flex: 1;
}

.schedule-label {
  display: block;
  font-size: 12px;
  color: #666666;
  margin-bottom: 2px;
}

.schedule-value {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.schedule-arrow {
  width: 20px;
  height: 20px;
  color: #cccccc;
}

/* Ride Options Enhanced */
.ride-options-enhanced {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ride-option-enhanced {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #ffffff;
  border: 2px solid #f0f0f0;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  animation: itemSlideIn 0.3s ease-out forwards;
  opacity: 0;
}

.ride-option-enhanced:hover {
  border-color: #e0e0e0;
  background: #fafafa;
}

.ride-option-enhanced:active,
.ride-option-enhanced.is-pressed {
  transform: scale(0.98);
}

.ride-option-enhanced.active {
  border-color: #00a86b;
  background: #f8fdf9;
  box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.1);
}

.ride-option-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
}

.ride-icon-enhanced {
  width: 64px;
  height: 48px;
  flex-shrink: 0;
}

.ride-icon-enhanced svg {
  width: 100%;
  height: 100%;
}

.ride-option-info {
  flex: 1;
  min-width: 0;
}

.ride-option-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.ride-option-name {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
}

.ride-badge {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.ride-badge.eco {
  background: #dcfce7;
  color: #16a34a;
}

.ride-badge.premium {
  background: #1a1a1a;
  color: #ffffff;
}

.ride-badge.small {
  padding: 2px 6px;
  font-size: 9px;
}

.ride-option-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.eta-badge,
.capacity-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #666666;
}

.eta-badge svg,
.capacity-badge svg {
  width: 12px;
  height: 12px;
}

.ride-option-desc {
  font-size: 12px;
  color: #999999;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ride-option-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.ride-option-price {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.ride-check-enhanced {
  width: 28px;
  height: 28px;
  background: #00a86b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
}

.ride-check-enhanced svg {
  width: 16px;
  height: 16px;
}

/* Surge Warning */
.surge-warning {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #fff7ed;
  border: 1px solid #ffedd5;
  border-radius: 12px;
}

.surge-icon {
  width: 40px;
  height: 40px;
  background: #ffedd5;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ea580c;
}

.surge-icon svg {
  width: 20px;
  height: 20px;
}

.surge-text {
  flex: 1;
}

.surge-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #ea580c;
  margin-bottom: 2px;
}

.surge-desc {
  display: block;
  font-size: 12px;
  color: #9a3412;
}

/* ========================================
   STEP 4 ENHANCED STYLES
   ======================================== */

.step-header-icon.confirm-icon {
  background: #dcfce7;
  color: #16a34a;
}

/* Confirm Route Card Enhanced */
.confirm-route-card-enhanced {
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 16px;
  overflow: hidden;
}

.confirm-route-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8f8f8;
  border-bottom: 1px solid #f0f0f0;
}

.confirm-route-title {
  font-size: 13px;
  font-weight: 600;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.edit-link {
  width: 28px;
  height: 28px;
  background: #ffffff;
  border: none;
  border-radius: 6px;
  color: #666666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-link svg {
  width: 14px;
  height: 14px;
}

.edit-link:hover {
  color: #00a86b;
  background: #f0fdf4;
}

.confirm-route-body {
  padding: 16px;
}

.confirm-route-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.confirm-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.confirm-dot.pickup {
  background: #00a86b;
}

.confirm-dot.destination {
  background: #e53935;
}

.confirm-route-text {
  flex: 1;
  min-width: 0;
}

.confirm-route-label {
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: #999999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.confirm-route-value {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}

.confirm-route-line {
  width: 2px;
  height: 20px;
  background: linear-gradient(to bottom, #00a86b, #e53935);
  margin: 6px 0 6px 5px;
}

.confirm-route-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px 16px;
  background: #f8f8f8;
  border-top: 1px solid #f0f0f0;
}

.confirm-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
}

.confirm-stat svg {
  width: 14px;
  height: 14px;
  color: #00a86b;
}

.confirm-stat-divider {
  width: 1px;
  height: 16px;
  background: #e0e0e0;
}

/* Selected Ride Card Enhanced */
.selected-ride-card-enhanced {
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 16px;
  overflow: hidden;
}

.selected-ride-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8f8f8;
  border-bottom: 1px solid #f0f0f0;
}

.selected-ride-title {
  font-size: 13px;
  font-weight: 600;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.selected-ride-body {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
}

.selected-ride-icon {
  width: 56px;
  height: 42px;
  flex-shrink: 0;
}

.selected-ride-icon svg {
  width: 100%;
  height: 100%;
}

.selected-ride-info {
  flex: 1;
  min-width: 0;
}

.selected-ride-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.selected-ride-name {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
}

.selected-ride-desc {
  display: block;
  font-size: 13px;
  color: #666666;
  margin-bottom: 4px;
}

.selected-ride-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #999999;
}

.meta-separator {
  font-size: 8px;
}

/* Payment Method Card Enhanced */
.payment-method-card-enhanced {
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.payment-method-card-enhanced:hover {
  border-color: #00a86b;
}

.payment-method-card-enhanced:active,
.payment-method-card-enhanced.is-pressed {
  transform: scale(0.98);
  background: #fafafa;
}

.payment-method-header {
  padding: 12px 16px;
  background: #f8f8f8;
  border-bottom: 1px solid #f0f0f0;
}

.payment-method-title {
  font-size: 13px;
  font-weight: 600;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.payment-method-body {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
}

.payment-method-icon {
  width: 44px;
  height: 44px;
  background: #e8f5ef;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00a86b;
}

.payment-method-icon svg {
  width: 22px;
  height: 22px;
}

.payment-method-info {
  flex: 1;
}

.payment-method-value {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 2px;
}

.payment-method-hint {
  display: block;
  font-size: 12px;
  color: #999999;
}

.wallet-balance-hint {
  display: block;
  font-size: 12px;
  color: #00a86b;
  font-weight: 500;
}

.wallet-balance-hint.insufficient {
  color: #e53935;
}

/* Insufficient Balance Warning */
.insufficient-balance-warning {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff5f5;
  border: 1px solid #ffcdd2;
  border-radius: 12px;
  margin-bottom: 12px;
}

.insufficient-balance-warning svg {
  width: 24px;
  height: 24px;
  color: #e53935;
  flex-shrink: 0;
}

.insufficient-balance-warning .warning-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.insufficient-balance-warning .warning-title {
  font-size: 14px;
  font-weight: 600;
  color: #c62828;
}

.insufficient-balance-warning .warning-detail {
  font-size: 12px;
  color: #e53935;
}

.insufficient-balance-warning .topup-btn {
  padding: 8px 16px;
  background: #e53935;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.insufficient-balance-warning .topup-btn:active {
  background: #c62828;
}

/* Disabled button state */
.confirm-book-btn.is-disabled {
  background: #e0e0e0;
  box-shadow: none;
  cursor: not-allowed;
}

.confirm-book-btn.is-disabled .confirm-btn-text {
  color: #999;
}

.confirm-book-btn.is-disabled .confirm-btn-price {
  color: #999;
}

.payment-arrow {
  width: 20px;
  height: 20px;
  color: #cccccc;
}

/* Fare Summary Enhanced */
.fare-summary-enhanced {
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 16px;
  overflow: hidden;
}

.fare-summary-header {
  padding: 12px 16px;
  background: #f8f8f8;
  border-bottom: 1px solid #f0f0f0;
}

.fare-summary-title {
  font-size: 13px;
  font-weight: 600;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.fare-summary-body {
  padding: 16px;
}

.fare-row-enhanced {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
}

.fare-row-enhanced:first-child {
  padding-top: 0;
}

.fare-row-label {
  font-size: 14px;
  color: #666666;
}

.fare-row-value {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.fare-row-enhanced.surge {
  background: #fff7ed;
  margin: 8px -16px;
  padding: 12px 16px;
}

.surge-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #ea580c;
}

.surge-label svg {
  width: 16px;
  height: 16px;
}

.fare-row-value.surge {
  color: #ea580c;
}

/* Discount Row */
.fare-row-enhanced.discount {
  background: rgba(0, 168, 107, 0.08);
  margin: 8px -16px;
  padding: 12px 16px;
}

.fare-row-enhanced.discount .fare-row-label {
  color: #00a86b;
}

.fare-row-value.discount {
  color: #00a86b;
  font-weight: 600;
}

.fare-divider {
  height: 1px;
  background: #e8e8e8;
  margin: 12px 0;
}

.fare-row-enhanced.total {
  padding-bottom: 0;
}

.fare-row-enhanced.total .fare-row-label {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.fare-row-value.total {
  font-size: 20px;
  font-weight: 700;
  color: #00a86b;
}

/* Confirm Book Button Enhanced */
.confirm-book-btn {
  width: 100%;
  padding: 18px 24px;
  background: #00a86b;
  color: #ffffff;
  border: none;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 16px rgba(0, 168, 107, 0.35);
  transition: all 0.2s ease;
  /* Sticky CTA - ติดด้านล่างเสมอ */
  position: sticky;
  bottom: 0;
  margin-top: auto;
  flex-shrink: 0;
  z-index: 10;
}

.confirm-book-btn:hover:not(:disabled) {
  background: #008f5b;
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(0, 168, 107, 0.4);
}

.confirm-book-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

.confirm-book-btn:disabled {
  cursor: not-allowed;
}

.confirm-book-btn.is-loading {
  justify-content: center;
  gap: 14px;
  background: linear-gradient(90deg, #00a86b, #00c77b, #00a86b);
  background-size: 200% 100%;
  animation: shimmerBtn 1.5s infinite;
}

@keyframes shimmerBtn {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.booking-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.booking-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.booking-title {
  font-size: 15px;
  font-weight: 600;
}

.booking-subtitle {
  font-size: 12px;
  opacity: 0.8;
}

.confirm-btn-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.confirm-btn-text {
  font-size: 16px;
  font-weight: 600;
}

.confirm-btn-price {
  font-size: 20px;
  font-weight: 700;
}

.confirm-btn-icon {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-btn-icon svg {
  width: 20px;
  height: 20px;
}

/* Safety Note */
.safety-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  font-size: 12px;
  color: #666666;
}

.safety-note svg {
  width: 16px;
  height: 16px;
  color: #00a86b;
}

/* Schedule Sheet Styles */
.schedule-sheet-content {
  padding: 8px 0;
}

.schedule-option {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: #ffffff;
  border: 2px solid #e8e8e8;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  margin-bottom: 12px;
}

.schedule-option:hover {
  border-color: #00a86b;
  background: #fafffe;
}

.schedule-option.active {
  border-color: #00a86b;
  background: #e8f5ef;
}

.schedule-option-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.schedule-option-icon.now {
  background: #e8f5ef;
  color: #00a86b;
}

.schedule-option-icon.later {
  background: #fef3c7;
  color: #d97706;
}

.schedule-option.active .schedule-option-icon.now {
  background: #00a86b;
  color: #ffffff;
}

.schedule-option.active .schedule-option-icon.later {
  background: #d97706;
  color: #ffffff;
}

.schedule-option-icon svg {
  width: 24px;
  height: 24px;
}

.schedule-option-text {
  flex: 1;
}

.schedule-option-title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.schedule-option-desc {
  display: block;
  font-size: 13px;
  color: #666666;
}

.schedule-check {
  width: 28px;
  height: 28px;
  background: #00a86b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  flex-shrink: 0;
}

.schedule-check svg {
  width: 16px;
  height: 16px;
}

.schedule-datetime-picker {
  background: #f8f8f8;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 16px;
}

.datetime-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.datetime-row:last-of-type {
  margin-bottom: 16px;
}

.datetime-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #666666;
}

.datetime-label svg {
  width: 18px;
  height: 18px;
  color: #00a86b;
}

.datetime-input {
  padding: 12px 16px;
  border: 2px solid #e8e8e8;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
  background: #ffffff;
  min-width: 160px;
  transition: border-color 0.2s ease;
}

.datetime-input:focus {
  outline: none;
  border-color: #00a86b;
}

.quick-time-options {
  display: flex;
  gap: 8px;
}

.quick-time-btn {
  flex: 1;
  padding: 10px 12px;
  background: #ffffff;
  border: 1.5px solid #e8e8e8;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-time-btn:hover {
  border-color: #00a86b;
  color: #00a86b;
  background: #fafffe;
}

.quick-time-btn:active {
  transform: scale(0.96);
}

.schedule-confirm-btn {
  width: 100%;
  padding: 16px 24px;
  background: #00a86b;
  color: #ffffff;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.schedule-confirm-btn:hover:not(:disabled) {
  background: #008f5b;
  transform: translateY(-1px);
}

.schedule-confirm-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.schedule-confirm-btn:disabled {
  background: #cccccc;
  cursor: not-allowed;
  box-shadow: none;
}

/* Recurring Link */
.recurring-link {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 14px 16px;
  background: #f8f8f8;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  margin-bottom: 16px;
  transition: all 0.2s ease;
}

.recurring-link:hover {
  background: #f0f0f0;
}

.recurring-link svg {
  width: 20px;
  height: 20px;
  color: #00a86b;
}

.recurring-link span {
  flex: 1;
  text-align: left;
  font-size: 14px;
  color: #666666;
}

.recurring-count {
  background: #00a86b;
  color: #ffffff;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

/* Recurring Sheet */
.recurring-sheet-content {
  padding: 8px 0;
}

.recurring-loading,
.recurring-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: #999999;
}

.recurring-empty svg {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.recurring-empty span {
  font-size: 16px;
  font-weight: 500;
  color: #666666;
  margin-bottom: 8px;
}

.recurring-empty p {
  font-size: 13px;
  color: #999999;
  margin: 0;
}

.recurring-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.recurring-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #ffffff;
  border: 1.5px solid #e8e8e8;
  border-radius: 14px;
  transition: all 0.2s ease;
}

.recurring-item:hover {
  border-color: #00a86b;
  background: #fafffe;
}

.recurring-item.inactive {
  opacity: 0.6;
  background: #f8f8f8;
}

.recurring-item-main {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
}

.recurring-item-icon {
  width: 40px;
  height: 40px;
  background: #e8f5ef;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.recurring-item-icon svg {
  width: 20px;
  height: 20px;
  color: #00a86b;
}

.recurring-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recurring-item-name {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.recurring-item-route {
  font-size: 12px;
  color: #666666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.recurring-item-schedule {
  font-size: 12px;
  color: #00a86b;
  font-weight: 500;
}

.recurring-item-next {
  font-size: 11px;
  color: #999999;
}

.recurring-item-actions {
  display: flex;
  gap: 8px;
}

.recurring-action-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.recurring-action-btn svg {
  width: 18px;
  height: 18px;
}

.recurring-action-btn.toggle {
  background: #f0f0f0;
  color: #666666;
}

.recurring-action-btn.toggle.active {
  background: #e8f5ef;
  color: #00a86b;
}

.recurring-action-btn.delete {
  background: #ffebee;
  color: #e53935;
}

.recurring-action-btn:hover {
  transform: scale(1.05);
}

.create-recurring-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px;
  background: #00a86b;
  color: #ffffff;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.create-recurring-btn:hover:not(:disabled) {
  background: #008f5b;
}

.create-recurring-btn:disabled {
  background: #cccccc;
  cursor: not-allowed;
  box-shadow: none;
}

.create-recurring-btn svg {
  width: 20px;
  height: 20px;
}

.create-hint {
  text-align: center;
  font-size: 12px;
  color: #999999;
  margin-top: 8px;
}

/* Create Recurring Modal */
.create-recurring-content {
  padding: 8px 0;
}

.route-preview-mini {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  background: #f8f8f8;
  border-radius: 12px;
  margin-bottom: 20px;
}

.route-point {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #666666;
}

.route-line {
  width: 2px;
  height: 16px;
  background: #e8e8e8;
  margin-left: 5px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #666666;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e8e8e8;
  border-radius: 12px;
  font-size: 15px;
  color: #1a1a1a;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #00a86b;
}

.form-input.time-input {
  max-width: 150px;
}

.schedule-type-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.schedule-type-btn {
  padding: 10px 16px;
  background: #f5f5f5;
  border: 1.5px solid #e8e8e8;
  border-radius: 20px;
  font-size: 13px;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.schedule-type-btn.active {
  background: #e8f5ef;
  border-color: #00a86b;
  color: #00a86b;
  font-weight: 500;
}

.day-selector {
  display: flex;
  gap: 8px;
}

.day-btn {
  width: 40px;
  height: 40px;
  border: 1.5px solid #e8e8e8;
  border-radius: 50%;
  background: #ffffff;
  font-size: 12px;
  font-weight: 500;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.day-btn.active {
  background: #00a86b;
  border-color: #00a86b;
  color: #ffffff;
}

.save-recurring-btn {
  width: 100%;
  padding: 16px;
  background: #00a86b;
  color: #ffffff;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.save-recurring-btn:hover:not(:disabled) {
  background: #008f5b;
}

.save-recurring-btn:disabled {
  background: #cccccc;
  cursor: not-allowed;
  box-shadow: none;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e8e8e8;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* ========================================
   DESTINATION PICKER ENHANCEMENTS
   ======================================== */

/* Quick Search Button */
.quick-search-btn {
  display: none; /* Hidden - replaced by quick-action-row */
}

/* Quick Action Row - Search & Map buttons */
.quick-action-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.quick-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 16px;
  background: #f8f9fa;
  border: 2px solid transparent;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-action-btn:active {
  transform: scale(0.97);
}

.quick-action-btn.search {
  background: linear-gradient(135deg, #e8f5ef 0%, #d4edda 100%);
  border-color: #00a86b;
}

.quick-action-btn.search:active {
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
}

.quick-action-btn.map {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-color: #2196f3;
}

.quick-action-btn.map:active {
  background: linear-gradient(135deg, #bbdefb 0%, #90caf9 100%);
}

.quick-action-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.quick-action-btn.search .quick-action-icon {
  color: #00a86b;
}

.quick-action-btn.map .quick-action-icon {
  color: #2196f3;
}

.quick-action-icon svg {
  width: 26px;
  height: 26px;
}

.quick-action-btn span {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

/* Clickable destination slot */
.route-preview-item.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 10px;
  margin: -8px -10px;
  padding: 8px 10px;
}

.route-preview-item.clickable:active {
  background: #f6f6f6;
}

.search-icon-hint {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 50%;
  color: #888;
  margin-left: auto;
}

.search-icon-hint svg {
  width: 16px;
  height: 16px;
}

/* Destination Picker Modal */
.destination-picker-modal,
.pickup-picker-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  z-index: 1000;
}

/* Slide up full animation */
.slide-up-full-enter-active,
.slide-up-full-leave-active {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.slide-up-full-enter-from,
.slide-up-full-leave-to {
  transform: translateY(100%);
}

.slide-up-full-enter-to,
.slide-up-full-leave-from {
  transform: translateY(0);
}

/* Safe area support */
@supports (padding-top: env(safe-area-inset-top)) {
  .destination-picker-modal,
  .pickup-picker-modal {
    padding-top: env(safe-area-inset-top);
  }
}

/* ========================================
   STEP 1 ENHANCED STYLES
   ======================================== */

/* Hero Location Button */
.hero-location-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px 18px;
  background: linear-gradient(135deg, #00A86B 0%, #00875A 100%);
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
  margin-bottom: 16px;
}

.hero-location-btn:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(0, 168, 107, 0.2);
}

.hero-location-btn.is-loading {
  background: linear-gradient(135deg, #00875A 0%, #006644 100%);
}

.hero-btn-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: #fff;
  flex-shrink: 0;
}

.hero-btn-icon svg {
  width: 26px;
  height: 26px;
}

.hero-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.hero-btn-text {
  flex: 1;
  text-align: left;
}

.hero-btn-label {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.hero-btn-hint {
  display: block;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
}

.hero-btn-arrow {
  width: 24px;
  height: 24px;
  color: rgba(255, 255, 255, 0.8);
}

.hero-btn-arrow svg {
  width: 100%;
  height: 100%;
}

/* Pickup Divider */
.pickup-divider {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.pickup-divider::before,
.pickup-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e5e5e5;
}

.pickup-divider span {
  padding: 0 12px;
  font-size: 13px;
  color: #999;
}

/* Quick Places Row */
.quick-places-row {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.quick-place-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f8f9fa;
  border: 1.5px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.quick-place-chip:active {
  transform: scale(0.97);
  border-color: #00A86B;
  background: #f0fdf4;
}

.quick-place-chip .chip-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.quick-place-chip.home .chip-icon {
  background: #FEF3C7;
  color: #D97706;
}

.quick-place-chip.work .chip-icon {
  background: #DBEAFE;
  color: #2563EB;
}

.quick-place-chip .chip-icon svg {
  width: 16px;
  height: 16px;
}

/* ========================================
   STEP 2 ENHANCED STYLES - Destination
   ======================================== */

/* Hero Search Bar */
.hero-search-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 18px 20px;
  background: #f8f9fa;
  border: 2px solid #e5e5e5;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 16px;
}

.hero-search-bar:hover {
  border-color: #00A86B;
  background: #fff;
}

.hero-search-bar:active {
  transform: scale(0.99);
  border-color: #00A86B;
  background: #f0fdf4;
}

.hero-search-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #00A86B 0%, #00875A 100%);
  border-radius: 12px;
  color: #fff;
  flex-shrink: 0;
}

.hero-search-icon svg {
  width: 22px;
  height: 22px;
}

.hero-search-placeholder {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  color: #666;
  text-align: left;
}

.hero-search-arrow {
  width: 24px;
  height: 24px;
  color: #999;
}

.hero-search-arrow svg {
  width: 100%;
  height: 100%;
}

/* Quick Access Row (Home/Work) */
.quick-access-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.quick-access-chip {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #fff;
  border: 1.5px solid #e5e5e5;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.quick-access-chip:active {
  transform: scale(0.97);
  border-color: #00A86B;
  background: #f0fdf4;
}

.quick-access-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  flex-shrink: 0;
}

.quick-access-chip.home .quick-access-icon {
  background: #FEF3C7;
  color: #D97706;
}

.quick-access-chip.work .quick-access-icon {
  background: #DBEAFE;
  color: #2563EB;
}

.quick-access-icon svg {
  width: 20px;
  height: 20px;
}

.quick-access-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.quick-access-label {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.quick-access-address {
  font-size: 12px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Popular Destinations */
.popular-destinations {
  margin-bottom: 16px;
}

.popular-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 10px;
}

.popular-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #f8f9fa;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.popular-chip:active {
  transform: scale(0.97);
  background: #e8f5ef;
}

.popular-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  flex-shrink: 0;
}

.popular-icon.shopping {
  background: #FCE7F3;
  color: #DB2777;
}

.popular-icon.airport {
  background: #DBEAFE;
  color: #2563EB;
}

.popular-icon svg {
  width: 18px;
  height: 18px;
}

.popular-chip span {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Quick Action Row Compact */
.quick-action-row.compact {
  gap: 10px;
  margin-bottom: 16px;
}

.quick-action-row.compact .quick-action-btn {
  padding: 12px 14px;
}

/* Recent Destinations */
.recent-destinations {
  margin-bottom: 16px;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #f8f9fa;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  animation: fadeSlideIn 0.3s ease-out forwards;
  opacity: 0;
}

.recent-item:active {
  transform: scale(0.99);
  background: #e8f5ef;
}

.recent-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 50%;
  color: #888;
  flex-shrink: 0;
}

.recent-icon svg {
  width: 18px;
  height: 18px;
}

.recent-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.recent-name {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-address {
  font-size: 12px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Pickup Summary Compact */
.pickup-summary-compact {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #e8f5ef;
  border-radius: 12px;
  margin-top: auto;
}

.pickup-summary-compact .pickup-dot {
  width: 10px;
  height: 10px;
  background: #00A86B;
  border-radius: 50%;
  flex-shrink: 0;
}

.pickup-summary-compact .pickup-label {
  font-size: 13px;
  color: #666;
  flex-shrink: 0;
}

.pickup-summary-compact .pickup-value {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.edit-pickup-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: none;
  border-radius: 8px;
  color: #00A86B;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.edit-pickup-btn:active {
  transform: scale(0.95);
  background: #f0f0f0;
}

.edit-pickup-btn svg {
  width: 16px;
  height: 16px;
}

/* ========================================
   TAP-TO-SELECT DESTINATION STYLES
   ======================================== */

/* Map section in tap mode */
.map-section.tap-mode-active {
  height: 70vh;
}

/* Tap select overlay */
.tap-select-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  pointer-events: none;
}

.tap-hint-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px;
  margin-top: calc(16px + env(safe-area-inset-top));
  padding: 14px 16px;
  background: rgba(0, 0, 0, 0.85);
  border-radius: 14px;
  pointer-events: auto;
  backdrop-filter: blur(10px);
}

.tap-hint-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E53935;
  border-radius: 10px;
  color: #fff;
  flex-shrink: 0;
}

.tap-hint-icon svg {
  width: 20px;
  height: 20px;
}

.tap-hint-text {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: #fff;
}

.tap-cancel-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.tap-cancel-btn:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.3);
}

.tap-cancel-btn svg {
  width: 18px;
  height: 18px;
}

/* Selected location card */
.tap-selected-card {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  z-index: 200;
}

.tap-selected-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 16px;
}

.tap-selected-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFEBEE;
  border-radius: 12px;
  color: #E53935;
  flex-shrink: 0;
}

.tap-selected-icon svg {
  width: 22px;
  height: 22px;
}

.tap-selected-info {
  flex: 1;
  min-width: 0;
}

.tap-selected-label {
  display: block;
  font-size: 13px;
  color: #888;
  margin-bottom: 4px;
}

.tap-selected-address {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.4;
}

.tap-selected-address.loading {
  color: #888;
}

.loading-dots::after {
  content: '';
  animation: loading-dots 1.5s infinite;
}

@keyframes loading-dots {
  0% { content: ''; }
  25% { content: '.'; }
  50% { content: '..'; }
  75% { content: '...'; }
}

.tap-selected-actions {
  display: flex;
  gap: 12px;
}

.tap-action-btn {
  flex: 1;
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tap-action-btn:active {
  transform: scale(0.98);
}

.tap-action-btn.cancel {
  background: #f5f5f5;
  color: #666;
}

.tap-action-btn.cancel:active {
  background: #e5e5e5;
}

.tap-action-btn.confirm {
  background: linear-gradient(135deg, #00A86B 0%, #00875A 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.tap-action-btn.confirm:active {
  background: linear-gradient(135deg, #00875A 0%, #006644 100%);
}

.tap-action-btn.confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Top bar hidden in tap mode */
.top-bar.hidden {
  opacity: 0;
  pointer-events: none;
}

/* Bottom panel minimized in tap mode */
.bottom-panel.minimized {
  transform: translateY(calc(100% - 80px));
  pointer-events: none;
}

/* Tap select button style */
.quick-action-icon.tap {
  background: linear-gradient(135deg, #E53935 0%, #C62828 100%);
  color: #fff;
}

.quick-action-btn.tap-select {
  border-color: #FFCDD2;
  background: #FFF5F5;
}

.quick-action-btn.tap-select:active {
  background: #FFEBEE;
  border-color: #E53935;
}

/* Fade animation */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
