<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useServices } from "../composables/useServices";
import { useLocation } from "../composables/useLocation";
import { useToast } from "../composables/useToast";
import { useLeafletMap } from "../composables/useLeafletMap";
import AddressSearchInput from "../components/AddressSearchInput.vue";
import type { PlaceResult } from "../composables/usePlaceSearch";

const router = useRouter();
const route = useRoute();
const { showSuccess, showError, showWarning, showInfo } = useToast();
const {
  savedPlaces,
  recentPlaces,
  fetchSavedPlaces,
  fetchRecentPlaces,
  savePlace: savePlaceToDb,
  deletePlace: deletePlaceFromDb,
  updatePlacesSortOrder,
  error: serviceError,
} = useServices();
const { currentLocation } = useLocation();

// Haptic feedback utility
const triggerHaptic = (type: "light" | "medium" | "heavy" = "light") => {
  if ("vibrate" in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 30 };
    navigator.vibrate(patterns[type]);
  }
};

// Helper function to get current location
const getCurrentLocationAsync = (): Promise<{
  lat: number;
  lng: number;
  address: string;
} | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: "ตำแหน่งปัจจุบัน",
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};

const loading = ref(true);
const saving = ref(false);
const activeTab = ref<"saved" | "recent">("saved");
const showAddModal = ref(false);
const editingPlace = ref<any>(null);
const isSetupMode = ref(false);
const tabDirection = ref<"left" | "right">("right");

// Quick Add from Map
const showQuickAddMap = ref(false);
const quickAddMapContainer = ref<HTMLElement | null>(null);
const quickAddLocation = ref<{
  lat: number;
  lng: number;
  address: string;
} | null>(null);
const isLoadingAddress = ref(false);

// Import from Maps
const showImportOptions = ref(false);

const newPlace = ref({
  name: "",
  address: "",
  type: "other" as "home" | "work" | "other",
  lat: 13.7563,
  lng: 100.5018,
});

// Get modal title based on type and editing state
const modalTitle = computed(() => {
  if (editingPlace.value) return "แก้ไขสถานที่";
  if (newPlace.value.type === "home") return "เพิ่มที่อยู่บ้าน";
  if (newPlace.value.type === "work") return "เพิ่มที่อยู่ที่ทำงาน";
  return "เพิ่มสถานที่";
});

// Check if form is valid
const isFormValid = computed(() => {
  return (
    newPlace.value.name.trim() &&
    newPlace.value.address.trim() &&
    newPlace.value.lat &&
    newPlace.value.lng
  );
});

const placeTypes = [
  {
    id: "home",
    label: "บ้าน",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    id: "work",
    label: "ที่ทำงาน",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  },
  {
    id: "other",
    label: "อื่นๆ",
    icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z",
  },
];

const homePlace = computed(() =>
  savedPlaces.value.find((p) => p.place_type === "home")
);
const workPlace = computed(() =>
  savedPlaces.value.find((p) => p.place_type === "work")
);
const otherPlaces = computed(() =>
  savedPlaces.value.filter((p) => p.place_type === "other")
);

// Drag and Drop state
const draggedItem = ref<any>(null);
const dragOverIndex = ref<number | null>(null);
const isDragging = ref(false);
const localOtherPlaces = ref<any[]>([]);

// Sync local places with computed
watch(
  otherPlaces,
  (newPlaces) => {
    localOtherPlaces.value = [...newPlaces];
  },
  { immediate: true }
);

// Drag handlers
const handleDragStart = (e: DragEvent, place: any, index: number) => {
  draggedItem.value = place;
  isDragging.value = true;

  // Haptic feedback on drag start
  triggerHaptic("medium");

  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  }
  // Add dragging class after a small delay for visual feedback
  setTimeout(() => {
    const target = e.target as HTMLElement;
    target.classList.add("dragging");
  }, 0);
};

const handleDragEnd = (e: DragEvent) => {
  isDragging.value = false;
  draggedItem.value = null;
  dragOverIndex.value = null;
  const target = e.target as HTMLElement;
  target.classList.remove("dragging");
};

const handleDragOver = (e: DragEvent, index: number) => {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = "move";
  }
  // Haptic feedback when hovering over new position
  if (dragOverIndex.value !== index) {
    triggerHaptic("light");
  }
  dragOverIndex.value = index;
};

const handleDragLeave = () => {
  dragOverIndex.value = null;
};

const handleDrop = async (e: DragEvent, dropIndex: number) => {
  e.preventDefault();
  const dragIndex = parseInt(e.dataTransfer?.getData("text/plain") || "0");

  if (dragIndex !== dropIndex && draggedItem.value) {
    // Haptic feedback on drop
    triggerHaptic("heavy");

    // Reorder local array
    const items = [...localOtherPlaces.value];
    const [removed] = items.splice(dragIndex, 1);
    items.splice(dropIndex, 0, removed);
    localOtherPlaces.value = items;

    // Sync to database
    const placeIds = items.map((p) => p.id);
    const sortOrders = items.map((_, i) => i + 1);

    const success = await updatePlacesSortOrder(placeIds, sortOrders);
    if (success) {
      showSuccess("เรียงลำดับสถานที่เรียบร้อย");
    } else {
      // Revert on failure
      localOtherPlaces.value = [...otherPlaces.value];
      showError("ไม่สามารถบันทึกลำดับได้");
    }
  }

  dragOverIndex.value = null;
  isDragging.value = false;
  draggedItem.value = null;
};

// Animation state for add/delete
const recentlyAddedId = ref<string | null>(null);
const recentlyDeletedId = ref<string | null>(null);

onMounted(async () => {
  // Check if this is setup mode (first time after registration)
  isSetupMode.value = route.query.setup === "true";

  // Force loading to false after 3 seconds max
  const forceStopLoading = setTimeout(() => {
    if (loading.value) {
      console.warn("SavedPlacesView: Force stop loading after timeout");
      loading.value = false;
    }
  }, 3000);

  try {
    // Use Promise.race with timeout for each fetch
    const fetchWithTimeout = async (
      fetchFn: () => Promise<any>,
      timeoutMs = 2500
    ) => {
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve([]), timeoutMs);
      });
      return Promise.race([fetchFn(), timeoutPromise]);
    };

    await Promise.all([
      fetchWithTimeout(() => fetchSavedPlaces()),
      fetchWithTimeout(() => fetchRecentPlaces()),
    ]);
  } catch (err) {
    console.error("Error loading places:", err);
  } finally {
    clearTimeout(forceStopLoading);
    loading.value = false;
  }

  // Check if we should open add modal from query param
  const addType = route.query.add as "home" | "work" | undefined;
  if (addType && (addType === "home" || addType === "work")) {
    openAddModal(addType);
  }
});

const openAddModal = (type?: "home" | "work" | "other") => {
  // Set default name based on type
  let defaultName = "";
  if (type === "home") defaultName = "บ้าน";
  else if (type === "work") defaultName = "ที่ทำงาน";

  newPlace.value = {
    name: defaultName,
    address: "",
    type: type || "other",
    lat: 13.7563,
    lng: 100.5018,
  };
  editingPlace.value = null;
  showAddModal.value = true;
};

const openEditModal = (place: any) => {
  newPlace.value = { ...place };
  editingPlace.value = place;
  showAddModal.value = true;
};

const savePlace = async () => {
  if (!isFormValid.value) {
    showWarning("กรุณากรอกข้อมูลให้ครบถ้วน");
    return;
  }

  saving.value = true;

  // Timeout protection - 10 seconds max
  let timeoutId: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Request timeout")), 10000);
  });

  try {
    const savePromise = savePlaceToDb({
      name: newPlace.value.name.trim(),
      address: newPlace.value.address.trim(),
      lat: newPlace.value.lat,
      lng: newPlace.value.lng,
      place_type: newPlace.value.type,
    });

    const result = await Promise.race([savePromise, timeoutPromise]);

    if (result) {
      // Set animation state for newly added place
      if (result.id) {
        recentlyAddedId.value = result.id;
        setTimeout(() => {
          recentlyAddedId.value = null;
        }, 1000);
      }

      // Fetch with timeout too
      await Promise.race([
        fetchSavedPlaces().catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
      showAddModal.value = false;

      const typeLabel =
        newPlace.value.type === "home"
          ? "บ้าน"
          : newPlace.value.type === "work"
          ? "ที่ทำงาน"
          : "สถานที่";
      showSuccess(`บันทึก${typeLabel}เรียบร้อยแล้ว`);

      // Clear query param after successful save
      if (route.query.add) {
        router.replace({ path: "/customer/saved-places" });
      }
    } else {
      // Show specific error message based on error type
      let errorMsg = serviceError.value || "ไม่สามารถบันทึกได้ กรุณาลองใหม่";
      if (errorMsg.includes("เชื่อมต่อ") || errorMsg.includes("fetch")) {
        errorMsg =
          "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";
      }
      showError(errorMsg);
    }
  } catch (err: any) {
    console.error("Save place error:", err);
    let errorMsg = err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่";
    if (errorMsg === "Request timeout") {
      errorMsg = "การบันทึกใช้เวลานานเกินไป กรุณาลองใหม่";
    } else if (
      errorMsg.includes("Failed to fetch") ||
      errorMsg.includes("NetworkError")
    ) {
      errorMsg =
        "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";
    }
    showError(errorMsg);
  } finally {
    saving.value = false;
  }
};

// Handle search result selection in modal
const handleSearchSelect = (place: PlaceResult) => {
  // Keep existing name if it's a default (home/work), otherwise use place name
  if (
    !newPlace.value.name ||
    newPlace.value.name === "บ้าน" ||
    newPlace.value.name === "ที่ทำงาน"
  ) {
    // Keep the default name for home/work
  } else {
    newPlace.value.name = place.name;
  }
  newPlace.value.address = place.address;
  newPlace.value.lat = place.lat;
  newPlace.value.lng = place.lng;
};

const deletePlace = async (id: string) => {
  if (confirm("ต้องการลบสถานที่นี้?")) {
    saving.value = true;
    // Set animation state for deletion
    recentlyDeletedId.value = id;

    try {
      const success = await deletePlaceFromDb(id);
      if (success) {
        // Wait for animation to complete
        await new Promise((resolve) => setTimeout(resolve, 300));
        await fetchSavedPlaces();
        showAddModal.value = false;
        showSuccess("ลบสถานที่เรียบร้อยแล้ว");
      } else {
        recentlyDeletedId.value = null;
        showError("ไม่สามารถลบได้ กรุณาลองใหม่");
      }
    } catch (err) {
      recentlyDeletedId.value = null;
      showError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      saving.value = false;
      recentlyDeletedId.value = null;
    }
  }
};

const goBack = () => {
  if (isSetupMode.value) {
    // In setup mode, go to home instead of back
    router.push("/customer");
  } else {
    router.back();
  }
};

const skipSetup = () => {
  router.push("/customer");
};

// Tab switching with animation direction
const switchTab = (tab: "saved" | "recent") => {
  if (tab === activeTab.value) return;
  tabDirection.value = tab === "recent" ? "right" : "left";
  activeTab.value = tab;
};

// Quick Add from Map
const {
  initMap: initQuickMap,
  addMarker: addQuickMarker,
  cleanup: cleanupQuickMap,
  setCenter: setQuickMapCenter,
  clearMarkers: clearQuickMarkers,
} = useLeafletMap();

const openQuickAddMap = async () => {
  showQuickAddMap.value = true;
  quickAddLocation.value = null;

  await nextTick();

  if (quickAddMapContainer.value) {
    const center = currentLocation.value || { lat: 13.7563, lng: 100.5018 };
    initQuickMap(quickAddMapContainer.value, {
      center,
      zoom: 16,
    });

    // Add draggable marker at center
    const marker = addQuickMarker({
      position: center,
      icon: "destination",
      draggable: true,
    });

    // Add drag end event listener
    if (marker) {
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        handleMarkerDrag(pos.lat, pos.lng);
      });
    }
  }
};

const handleMarkerDrag = async (lat: number, lng: number) => {
  // Trigger haptic feedback on drag
  triggerHaptic("medium");

  quickAddLocation.value = { lat, lng, address: "" };
  isLoadingAddress.value = true;

  try {
    // Reverse geocode to get address
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=th`
    );
    const data = await response.json();
    if (data.display_name) {
      quickAddLocation.value = { lat, lng, address: data.display_name };
    }
  } catch (err) {
    console.error("Reverse geocode error:", err);
    quickAddLocation.value = {
      lat,
      lng,
      address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    };
  } finally {
    isLoadingAddress.value = false;
  }
};

// Import from Google Maps / Apple Maps
const openImportOptions = () => {
  triggerHaptic("light");
  showImportOptions.value = true;
};

const closeImportOptions = () => {
  showImportOptions.value = false;
};

const importFromGoogleMaps = () => {
  triggerHaptic("light");
  // Open Google Maps with intent to share location
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  if (isIOS || isAndroid) {
    // On mobile, open Google Maps app
    window.open("https://maps.google.com", "_blank");
    showInfo("คัดลอก URL จาก Google Maps แล้ววางในช่องค้นหา");
  } else {
    // On desktop, show instructions
    showInfo("เปิด Google Maps แล้วคัดลอก URL ของสถานที่มาวางในช่องค้นหา");
    window.open("https://maps.google.com", "_blank");
  }
  showImportOptions.value = false;
};

const importFromAppleMaps = () => {
  triggerHaptic("light");
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS) {
    // Open Apple Maps on iOS
    window.open("maps://", "_blank");
    showInfo("แชร์สถานที่จาก Apple Maps แล้วคัดลอก URL มาวาง");
  } else {
    // On non-iOS, show web version
    window.open("https://maps.apple.com", "_blank");
    showInfo("เปิด Apple Maps แล้วคัดลอก URL ของสถานที่มาวาง");
  }
  showImportOptions.value = false;
};

const pasteFromClipboard = async () => {
  triggerHaptic("light");
  try {
    const text = await navigator.clipboard.readText();

    // Try to parse Google Maps URL
    // Format: https://maps.google.com/?q=13.7563,100.5018 or https://goo.gl/maps/xxx
    // Or: https://www.google.com/maps/place/.../@13.7563,100.5018,17z
    let lat: number | null = null;
    let lng: number | null = null;

    // Pattern 1: @lat,lng in URL
    const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const atMatch = text.match(atPattern);
    if (atMatch && atMatch[1] && atMatch[2]) {
      lat = parseFloat(atMatch[1]);
      lng = parseFloat(atMatch[2]);
    }

    // Pattern 2: ?q=lat,lng
    const qPattern = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const qMatch = text.match(qPattern);
    if (!lat && qMatch && qMatch[1] && qMatch[2]) {
      lat = parseFloat(qMatch[1]);
      lng = parseFloat(qMatch[2]);
    }

    // Pattern 3: ll=lat,lng (Apple Maps)
    const llPattern = /ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
    const llMatch = text.match(llPattern);
    if (!lat && llMatch && llMatch[1] && llMatch[2]) {
      lat = parseFloat(llMatch[1]);
      lng = parseFloat(llMatch[2]);
    }

    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      // Valid coordinates found
      triggerHaptic("heavy");

      // Close import options and open quick add map with this location
      showImportOptions.value = false;
      showQuickAddMap.value = true;

      await nextTick();

      if (quickAddMapContainer.value) {
        initQuickMap(quickAddMapContainer.value, {
          center: { lat, lng },
          zoom: 16,
        });

        const marker = addQuickMarker({
          position: { lat, lng },
          icon: "destination",
          draggable: true,
        });

        if (marker) {
          marker.on("dragend", () => {
            const pos = marker.getLatLng();
            handleMarkerDrag(pos.lat, pos.lng);
          });
        }

        await handleMarkerDrag(lat, lng);
        showSuccess("นำเข้าตำแหน่งสำเร็จ!");
      }
    } else {
      showError(
        "ไม่พบพิกัดในข้อความที่วาง กรุณาคัดลอก URL จาก Google Maps หรือ Apple Maps"
      );
    }
  } catch (err) {
    console.error("Clipboard error:", err);
    showError("ไม่สามารถอ่านคลิปบอร์ดได้ กรุณาอนุญาตการเข้าถึง");
  }
};

const useCurrentLocationForQuickAdd = async () => {
  isLoadingAddress.value = true;
  try {
    const location = await getCurrentLocationAsync();
    if (location && quickAddMapContainer.value) {
      setQuickMapCenter(location.lat, location.lng, 16);
      clearQuickMarkers();
      const marker = addQuickMarker({
        position: { lat: location.lat, lng: location.lng },
        icon: "destination",
        draggable: true,
      });

      // Add drag end event listener
      if (marker) {
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          handleMarkerDrag(pos.lat, pos.lng);
        });
      }

      await handleMarkerDrag(location.lat, location.lng);
    }
  } catch (err) {
    showError("ไม่สามารถดึงตำแหน่งปัจจุบันได้");
  } finally {
    isLoadingAddress.value = false;
  }
};

const confirmQuickAdd = () => {
  if (!quickAddLocation.value) {
    showWarning("กรุณาเลือกตำแหน่งบนแผนที่");
    return;
  }

  // Close quick add map and open add modal with location
  showQuickAddMap.value = false;
  cleanupQuickMap();

  newPlace.value = {
    name: "",
    address: quickAddLocation.value.address,
    type: "other",
    lat: quickAddLocation.value.lat,
    lng: quickAddLocation.value.lng,
  };
  editingPlace.value = null;
  showAddModal.value = true;
};

const closeQuickAddMap = () => {
  showQuickAddMap.value = false;
  cleanupQuickMap();
  quickAddLocation.value = null;
};

// Map preview
const mapContainer = ref<HTMLElement | null>(null);
const { initMap, addMarker, cleanup: cleanupMap } = useLeafletMap();

// Watch for address changes to update map
watch(
  () => [newPlace.value.lat, newPlace.value.lng, newPlace.value.address],
  async () => {
    if (
      newPlace.value.address &&
      newPlace.value.lat &&
      newPlace.value.lng &&
      mapContainer.value
    ) {
      await nextTick();
      // Cleanup previous map first
      cleanupMap();
      await nextTick();

      initMap(mapContainer.value, {
        center: { lat: newPlace.value.lat, lng: newPlace.value.lng },
        zoom: 16,
      });
      addMarker({
        position: { lat: newPlace.value.lat, lng: newPlace.value.lng },
        icon: "destination",
      });
    }
  },
  { deep: true }
);

// Cleanup map when modal closes
watch(showAddModal, (isOpen) => {
  if (!isOpen) {
    cleanupMap();
  }
});
</script>

<template>
  <div class="page-container">
    <div class="content-container">
      <!-- Header -->
      <div class="page-header">
        <button @click="goBack" class="back-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h1>สถานที่ของฉัน</h1>
      </div>

      <!-- Setup Mode Welcome Banner -->
      <div v-if="isSetupMode" class="setup-banner">
        <div class="setup-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
        </div>
        <div class="setup-content">
          <h3>ยินดีต้อนรับสู่ GOBEAR!</h3>
          <p>เพิ่มที่อยู่บ้านและที่ทำงานเพื่อการจองที่รวดเร็วขึ้น</p>
        </div>
        <button @click="skipSetup" class="skip-btn">ข้าม</button>
      </div>

      <!-- Tabs with animation -->
      <div class="tabs">
        <button
          @click="switchTab('saved')"
          :class="['tab', { active: activeTab === 'saved' }]"
        >
          สถานที่บันทึก
        </button>
        <button
          @click="switchTab('recent')"
          :class="['tab', { active: activeTab === 'recent' }]"
        >
          ล่าสุด
        </button>
        <div
          class="tab-indicator"
          :class="{ 'tab-right': activeTab === 'recent' }"
        ></div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
      </div>

      <!-- Saved Places Tab -->
      <Transition
        :name="tabDirection === 'right' ? 'slide-right' : 'slide-left'"
        mode="out-in"
      >
        <div v-if="activeTab === 'saved'" key="saved" class="tab-content">
          <!-- Home -->
          <div class="place-section">
            <div class="section-header">
              <h3>บ้าน</h3>
            </div>
            <div
              v-if="homePlace"
              class="place-card"
              @click="openEditModal(homePlace)"
            >
              <div class="place-icon home">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </div>
              <div class="place-info">
                <span class="place-name">{{ homePlace.name }}</span>
                <span class="place-address">{{ homePlace.address }}</span>
              </div>
              <svg
                class="chevron"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <button v-else class="add-place-btn" @click="openAddModal('home')">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span>เพิ่มที่อยู่บ้าน</span>
            </button>
          </div>

          <!-- Work -->
          <div class="place-section">
            <div class="section-header">
              <h3>ที่ทำงาน</h3>
            </div>
            <div
              v-if="workPlace"
              class="place-card"
              @click="openEditModal(workPlace)"
            >
              <div class="place-icon work">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div class="place-info">
                <span class="place-name">{{ workPlace.name }}</span>
                <span class="place-address">{{ workPlace.address }}</span>
              </div>
              <svg
                class="chevron"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <button v-else class="add-place-btn" @click="openAddModal('work')">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span>เพิ่มที่อยู่ที่ทำงาน</span>
            </button>
          </div>

          <!-- Other Places with Drag & Drop -->
          <div class="place-section">
            <div class="section-header">
              <h3>สถานที่อื่นๆ</h3>
              <span v-if="localOtherPlaces.length > 1" class="drag-hint"
                >กดค้างเพื่อเรียงลำดับ</span
              >
            </div>
            <TransitionGroup name="place-list" tag="div" class="places-list">
              <div
                v-for="(place, index) in localOtherPlaces"
                :key="place.id"
                :class="[
                  'place-card',
                  'draggable',
                  {
                    'drag-over': dragOverIndex === index,
                    'is-dragging': isDragging && draggedItem?.id === place.id,
                    'just-added': recentlyAddedId === place.id,
                    'just-deleted': recentlyDeletedId === place.id,
                  },
                ]"
                draggable="true"
                @dragstart="handleDragStart($event, place, index)"
                @dragend="handleDragEnd"
                @dragover="handleDragOver($event, index)"
                @dragleave="handleDragLeave"
                @drop="handleDrop($event, index)"
                @click="openEditModal(place)"
              >
                <div class="drag-handle">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 8h16M4 16h16"
                    />
                  </svg>
                </div>
                <div class="place-icon">
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
                <div class="place-info">
                  <span class="place-name">{{ place.name }}</span>
                  <span class="place-address">{{ place.address }}</span>
                </div>
                <svg
                  class="chevron"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </TransitionGroup>
            <button class="add-place-btn" @click="openAddModal('other')">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span>เพิ่มสถานที่</span>
            </button>
          </div>
        </div>

        <!-- Recent Places Tab -->
        <div
          v-else-if="activeTab === 'recent'"
          key="recent"
          class="tab-content"
        >
          <div v-if="recentPlaces.length === 0" class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p>ยังไม่มีสถานที่ล่าสุด</p>
          </div>
          <div v-else class="recent-list">
            <div
              v-for="place in recentPlaces"
              :key="place.name"
              class="place-card"
            >
              <div class="place-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div class="place-info">
                <span class="place-name">{{ place.name }}</span>
                <span class="place-address">{{ place.address }}</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- FAB Group -->
    <div class="fab-group">
      <!-- Import FAB -->
      <button
        class="fab-import"
        @click="openImportOptions"
        title="นำเข้าจาก Maps"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
      </button>

      <!-- Quick Add FAB -->
      <button
        class="fab-quick-add"
        @click="openQuickAddMap"
        title="เพิ่มจากแผนที่"
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
        <span>+</span>
      </button>
    </div>

    <!-- Import Options Modal -->
    <Transition name="fade">
      <div
        v-if="showImportOptions"
        class="import-overlay"
        @click.self="closeImportOptions"
      >
        <div class="import-sheet">
          <div class="import-header">
            <h3>นำเข้าสถานที่</h3>
            <button @click="closeImportOptions" class="close-btn">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div class="import-options">
            <button class="import-option" @click="importFromGoogleMaps">
              <div class="import-icon google">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                  />
                </svg>
              </div>
              <div class="import-text">
                <span class="import-title">Google Maps</span>
                <span class="import-desc">เปิด Google Maps แล้วคัดลอก URL</span>
              </div>
              <svg
                class="chevron"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            <button class="import-option" @click="importFromAppleMaps">
              <div class="import-icon apple">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                  />
                </svg>
              </div>
              <div class="import-text">
                <span class="import-title">Apple Maps</span>
                <span class="import-desc">เปิด Apple Maps แล้วแชร์สถานที่</span>
              </div>
              <svg
                class="chevron"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            <div class="import-divider">
              <span>หรือ</span>
            </div>

            <button class="import-paste-btn" @click="pasteFromClipboard">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              วาง URL จากคลิปบอร์ด
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Quick Add Map Modal -->
    <Transition name="slide-up">
      <div v-if="showQuickAddMap" class="quick-add-overlay">
        <div class="quick-add-container">
          <div class="quick-add-header">
            <button @click="closeQuickAddMap" class="close-btn">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <h3>เลือกตำแหน่งจากแผนที่</h3>
            <div style="width: 36px"></div>
          </div>

          <div class="quick-add-map" ref="quickAddMapContainer"></div>

          <div class="quick-add-info">
            <div class="map-hint">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>ลากหมุดเพื่อเลือกตำแหน่ง</span>
            </div>

            <button
              @click="useCurrentLocationForQuickAdd"
              class="btn-current-location"
              :disabled="isLoadingAddress"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
              </svg>
              ใช้ตำแหน่งปัจจุบัน
            </button>

            <div v-if="quickAddLocation" class="selected-location">
              <div class="location-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                </svg>
              </div>
              <div class="location-text">
                <span v-if="isLoadingAddress" class="loading-text"
                  >กำลังค้นหาที่อยู่...</span
                >
                <span v-else>{{
                  quickAddLocation.address || "ไม่พบที่อยู่"
                }}</span>
              </div>
            </div>
          </div>

          <div class="quick-add-actions">
            <button @click="closeQuickAddMap" class="btn-cancel">ยกเลิก</button>
            <button
              @click="confirmQuickAdd"
              class="btn-confirm"
              :disabled="!quickAddLocation || isLoadingAddress"
            >
              ยืนยันตำแหน่ง
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Add/Edit Modal -->
    <div
      v-if="showAddModal"
      class="modal-overlay"
      @click.self="showAddModal = false"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ modalTitle }}</h3>
          <button
            @click="showAddModal = false"
            class="close-btn"
            :disabled="saving"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div class="form-group">
          <label>ประเภท</label>
          <div class="type-options">
            <button
              v-for="type in placeTypes"
              :key="type.id"
              @click="newPlace.type = type.id as any"
              :class="['type-btn', { active: newPlace.type === type.id }]"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  :d="type.icon"
                />
              </svg>
              <span>{{ type.label }}</span>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>ชื่อสถานที่</label>
          <input
            v-model="newPlace.name"
            type="text"
            placeholder="เช่น บ้านแม่, ออฟฟิศ"
          />
        </div>

        <div class="form-group">
          <label>ค้นหาที่อยู่</label>
          <AddressSearchInput
            v-model="newPlace.address"
            placeholder="ค้นหาสถานที่หรือที่อยู่..."
            :show-saved-places="false"
            :current-lat="currentLocation?.lat"
            :current-lng="currentLocation?.lng"
            @select="handleSearchSelect"
          />
        </div>

        <!-- Map Preview -->
        <div
          v-if="newPlace.address && newPlace.lat && newPlace.lng"
          class="map-preview"
        >
          <div class="map-preview-header">
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              width="16"
              height="16"
            >
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
            <span>ตำแหน่งที่เลือก</span>
          </div>
          <div ref="mapContainer" class="map-preview-container"></div>
          <div class="map-preview-address">{{ newPlace.address }}</div>
        </div>

        <div class="modal-actions">
          <button
            v-if="editingPlace"
            @click="deletePlace(editingPlace.id)"
            class="btn-delete"
            :disabled="saving"
          >
            ลบสถานที่
          </button>
          <button
            @click="savePlace"
            class="btn-primary"
            :disabled="saving || !isFormValid"
          >
            <span v-if="saving">กำลังบันทึก...</span>
            <span v-else>บันทึก</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Page Container - MUNEEF Style */
.page-container {
  min-height: 100vh;
  background-color: #ffffff;
}

.content-container {
  padding: 0 20px;
  max-width: 480px;
  margin: 0 auto;
}

.tab-content {
  padding-bottom: 100px;
}

/* Setup Banner - Green Theme */
.setup-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #00a86b 0%, #008f5b 100%);
  border-radius: 16px;
  margin-bottom: 20px;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.25);
}

.setup-icon {
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.setup-icon svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.setup-content {
  flex: 1;
}

.setup-content h3 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 2px;
}

.setup-content p {
  font-size: 13px;
  opacity: 0.9;
  line-height: 1.4;
}

.skip-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.25);
  border: none;
  border-radius: 20px;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}

.skip-btn:active {
  background: rgba(255, 255, 255, 0.35);
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  padding-top: calc(16px + env(safe-area-inset-top));
}

.back-btn {
  width: 40px;
  height: 40px;
  background: none;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
  transition: background 0.15s;
}

.back-btn:active {
  background: #f5f5f5;
}

.back-btn svg {
  width: 24px;
  height: 24px;
  color: #1a1a1a;
}

.page-header h1 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.tabs {
  display: flex;
  position: relative;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 20px;
}

.tab {
  flex: 1;
  padding: 14px;
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 500;
  color: #999999;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.25s ease;
  position: relative;
  z-index: 1;
}

.tab.active {
  color: #00a86b;
}

.tab-indicator {
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 50%;
  height: 2px;
  background: #00a86b;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-indicator.tab-right {
  transform: translateX(100%);
}

/* Tab Slide Animations */
.slide-right-enter-active,
.slide-right-leave-active,
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.25s ease-out;
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.loading {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e8f5ef;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.place-section {
  margin-bottom: 24px;
}

.section-header {
  margin-bottom: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: #666666;
}

.drag-hint {
  font-size: 11px;
  color: #999999;
  font-weight: 400;
}

.places-list {
  position: relative;
}

.place-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 14px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.place-card:active {
  background: #f5f5f5;
  transform: scale(0.98);
}

/* Drag Handle */
.drag-handle {
  display: none;
  width: 24px;
  height: 24px;
  color: #cccccc;
  cursor: grab;
  flex-shrink: 0;
  touch-action: none;
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-handle svg {
  width: 20px;
  height: 20px;
}

.place-card.draggable .drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Drag States */
.place-card.draggable {
  user-select: none;
}

.place-card.is-dragging {
  opacity: 0.5;
  transform: scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.place-card.drag-over {
  border-color: #00a86b;
  background: #e8f5ef;
  transform: translateY(4px);
}

.place-card.dragging {
  opacity: 0.4;
}

/* Add/Delete Animations */
.place-card.just-added {
  animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.place-card.just-deleted {
  animation: slideOut 0.3s ease-out forwards;
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(-10px);
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes slideOut {
  0% {
    opacity: 1;
    transform: translateX(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-100%);
    height: 0;
    margin: 0;
    padding: 0;
  }
}

/* TransitionGroup animations */
.place-list-enter-active {
  animation: popIn 0.3s ease-out;
}

.place-list-leave-active {
  animation: slideOut 0.3s ease-out;
}

.place-list-move {
  transition: transform 0.3s ease;
}

.place-icon {
  width: 46px;
  height: 46px;
  background: #e8f5ef;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.place-icon svg {
  width: 22px;
  height: 22px;
  color: #00a86b;
}

.place-icon.home {
  background: #e8f5ef;
}

.place-icon.home svg {
  color: #00a86b;
}

.place-icon.work {
  background: #e3f2fd;
}

.place-icon.work svg {
  color: #2196f3;
}

.place-info {
  flex: 1;
  min-width: 0;
}

.place-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 2px;
}

.place-address {
  font-size: 13px;
  color: #666666;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.chevron {
  width: 20px;
  height: 20px;
  color: #999999;
  flex-shrink: 0;
}

.add-place-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px;
  background: none;
  border: 2px dashed #e8e8e8;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 500;
  color: #00a86b;
  cursor: pointer;
  transition: all 0.15s;
}

.add-place-btn:active {
  background: #e8f5ef;
  border-color: #00a86b;
}

.add-place-btn svg {
  width: 24px;
  height: 24px;
}

.empty-state {
  text-align: center;
  padding: 48px 20px;
  color: #666666;
}

.empty-state svg {
  width: 56px;
  height: 56px;
  margin-bottom: 16px;
  color: #00a86b;
  opacity: 0.5;
}

.empty-state p {
  font-size: 15px;
}

/* Modal - MUNEEF Style */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.modal-content {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  background: #fff;
  border-radius: 24px 24px 0 0;
  padding: 24px 20px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.close-btn {
  width: 36px;
  height: 36px;
  background: #f5f5f5;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}

.close-btn:active {
  background: #e8e8e8;
}

.close-btn svg {
  width: 20px;
  height: 20px;
  color: #666666;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #666666;
  margin-bottom: 10px;
}

.form-group input {
  width: 100%;
  padding: 16px;
  border: 2px solid #e8e8e8;
  border-radius: 12px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.15s;
}

.form-group input:focus {
  border-color: #00a86b;
}

.form-group input::placeholder {
  color: #999999;
}

.type-options {
  display: flex;
  gap: 10px;
}

.type-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 12px;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.type-btn.active {
  border-color: #00a86b;
  background: #e8f5ef;
}

.type-btn svg {
  width: 24px;
  height: 24px;
  color: #666666;
}

.type-btn.active svg {
  color: #00a86b;
}

.type-btn span {
  font-size: 12px;
  font-weight: 500;
  color: #666666;
}

.type-btn.active span {
  color: #00a86b;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-primary {
  flex: 1;
  padding: 16px;
  background: #00a86b;
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-primary:disabled {
  background: #e8e8e8;
  color: #999999;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-delete {
  padding: 16px 20px;
  background: #ffebee;
  color: #e53935;
  border: none;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-delete:active {
  background: #ffcdd2;
}

.btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Map Preview - MUNEEF Style */
.map-preview {
  margin-bottom: 20px;
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 16px;
  overflow: hidden;
}

.map-preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #00a86b;
  background: #e8f5ef;
}

.map-preview-header svg {
  color: #00a86b;
}

.map-preview-container {
  height: 140px;
  background: #f5f5f5;
  overflow: hidden;
}

.map-preview-container :deep(.leaflet-container) {
  height: 100%;
  width: 100%;
}

.map-preview-address {
  padding: 12px 16px;
  font-size: 13px;
  color: #1a1a1a;
  line-height: 1.5;
  border-top: 1px solid #f0f0f0;
  background: #fff;
}

/* Recent List */
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* FAB Group - MUNEEF Style */
.fab-group {
  position: fixed;
  bottom: calc(100px + env(safe-area-inset-bottom));
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 100;
}

.fab-import {
  width: 48px;
  height: 48px;
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.fab-import:active {
  transform: scale(0.95);
  background: #f5f5f5;
}

.fab-import svg {
  width: 22px;
  height: 22px;
  color: #00a86b;
}

.fab-quick-add {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #00a86b 0%, #008f5b 100%);
  border: none;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 168, 107, 0.4);
  transition: all 0.2s ease;
}

.fab-quick-add:active {
  transform: scale(0.95);
}

.fab-quick-add svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.fab-quick-add span {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #00a86b;
}

/* Import Options Modal */
.import-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1002;
}

.import-sheet {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  background: #fff;
  border-radius: 24px 24px 0 0;
  padding: 24px 20px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.import-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.import-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.import-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.import-option {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}

.import-option:active {
  background: #f5f5f5;
  transform: scale(0.98);
}

.import-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.import-icon svg {
  width: 24px;
  height: 24px;
}

.import-icon.google {
  background: #e8f5ef;
  color: #00a86b;
}

.import-icon.apple {
  background: #f5f5f5;
  color: #1a1a1a;
}

.import-text {
  flex: 1;
  min-width: 0;
}

.import-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 2px;
}

.import-desc {
  font-size: 13px;
  color: #666666;
}

.import-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0;
}

.import-divider::before,
.import-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: #f0f0f0;
}

.import-divider span {
  font-size: 13px;
  color: #999999;
}

.import-paste-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px;
  background: #00a86b;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
  transition: all 0.15s;
}

.import-paste-btn:active {
  transform: scale(0.98);
}

.import-paste-btn svg {
  width: 20px;
  height: 20px;
}

/* Fade Animation */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Quick Add Map Modal */
.quick-add-overlay {
  position: fixed;
  inset: 0;
  background: #fff;
  z-index: 1001;
  display: flex;
  flex-direction: column;
}

.quick-add-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 480px;
  margin: 0 auto;
  width: 100%;
}

.quick-add-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top));
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.quick-add-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.quick-add-map {
  flex: 1;
  min-height: 300px;
  background: #f5f5f5;
}

.quick-add-map :deep(.leaflet-container) {
  height: 100%;
  width: 100%;
}

.quick-add-info {
  padding: 16px 20px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
}

.map-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #e8f5ef;
  border-radius: 10px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #00a86b;
}

.map-hint svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.btn-current-location {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  background: #f5f5f5;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  cursor: pointer;
  margin-bottom: 12px;
  transition: background 0.15s;
}

.btn-current-location:active {
  background: #e8e8e8;
}

.btn-current-location:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-current-location svg {
  width: 18px;
  height: 18px;
  color: #00a86b;
}

.selected-location {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
}

.location-icon {
  width: 36px;
  height: 36px;
  background: #e8f5ef;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.location-icon svg {
  width: 18px;
  height: 18px;
  color: #00a86b;
}

.location-text {
  flex: 1;
  font-size: 13px;
  color: #1a1a1a;
  line-height: 1.5;
}

.loading-text {
  color: #999999;
  font-style: italic;
}

.quick-add-actions {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid #f0f0f0;
}

.btn-cancel {
  flex: 1;
  padding: 16px;
  background: #f5f5f5;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  color: #666666;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-cancel:active {
  background: #e8e8e8;
}

.btn-confirm {
  flex: 2;
  padding: 16px;
  background: #00a86b;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
  transition: all 0.15s;
}

.btn-confirm:active {
  transform: scale(0.98);
}

.btn-confirm:disabled {
  background: #e8e8e8;
  color: #999999;
  box-shadow: none;
  cursor: not-allowed;
}

/* Slide Up Animation */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease-out;
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
