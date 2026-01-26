<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useServices } from "../composables/useServices";
import { useLocation } from "../composables/useLocation";
import { useToast } from "../composables/useToast";
import { useLeafletMap } from "../composables/useLeafletMap";
import { useSearchHistory } from "../composables/useSearchHistory";
import { useSavedPlacesEnhanced, PLACE_CATEGORIES, type PlaceCategory, type SortOption } from "../composables/useSavedPlacesEnhanced";
import AddressSearchInput from "../components/AddressSearchInput.vue";
import type { PlaceResult } from "../composables/usePlaceSearch";

const router = useRouter();
const route = useRoute();
const { success: showSuccess, error: showError, warning: showWarning, info: showInfo } = useToast();
const {
  savedPlaces,
  recentPlaces,
  fetchSavedPlaces,
  fetchRecentPlaces,
  savePlace: savePlaceToDb,
  deletePlace: deletePlaceFromDb,
  updatePlacesSortOrder,
  addRecentPlace,
  error: serviceError,
} = useServices();
const { currentLocation } = useLocation();
const { addToHistory } = useSearchHistory();

// Enhanced features
const {
  sortOption,
  selectedCategory,
  isOnline,
  trackPlaceUsage,
  getUsageCount,
  sortPlaces,
  setSortOption,
  getTopUsedPlaces,
  setPlaceCategory,
  getPlaceCategory,
  getCategoryInfo,
  filterByCategory,
  setSelectedCategory,
  autoDetectCategory,
  saveForOffline,
  removeFromOffline,
  isOfflineAvailable,
  getOfflinePlaces,
  syncOfflinePlaces,
  getPlacesWithOfflineFallback,
  getOfflineStorageSize,
} = useSavedPlacesEnhanced();

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

// Share Place
const showShareModal = ref(false);
const placeToShare = ref<any>(null);

// Map Preview for place cards
const expandedPlaceId = ref<string | null>(null);
const placeMapContainers = ref<Map<string, HTMLElement>>(new Map());
const placeMapInstances = ref<Map<string, any>>(new Map());

// Sort & Filter UI
const showSortOptions = ref(false);
const showCategoryFilter = ref(false);

// Recent Places Features
const recentSearchQuery = ref('');
const showRecentSettings = ref(false);
const recentPlacesLimit = ref(20);
const RECENT_LIMIT_OPTIONS = [10, 20, 30, 50];

// Load recent places limit from localStorage
const loadRecentSettings = () => {
  const savedLimit = localStorage.getItem('recent_places_limit');
  if (savedLimit) {
    recentPlacesLimit.value = parseInt(savedLimit, 10);
  }
};
loadRecentSettings();

// Filtered recent places based on search
const filteredRecentPlaces = computed(() => {
  if (!recentSearchQuery.value.trim()) {
    return recentPlaces.value;
  }
  const query = recentSearchQuery.value.toLowerCase();
  return recentPlaces.value.filter(place => 
    place.name.toLowerCase().includes(query) ||
    place.address.toLowerCase().includes(query)
  );
});

// New place with category
const newPlace = ref({
  name: "",
  address: "",
  type: "other" as "home" | "work" | "other",
  category: "other" as PlaceCategory,
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

// Smart validation with helpful messages
const validationErrors = computed(() => {
  const errors: string[] = [];
  
  if (!newPlace.value.name.trim()) {
    errors.push('กรุณาใส่ชื่อสถานที่');
  }
  
  if (!newPlace.value.address.trim()) {
    errors.push('กรุณาเลือกที่อยู่จากการค้นหา');
  }
  
  if (!newPlace.value.lat || !newPlace.value.lng) {
    errors.push('กรุณาเลือกตำแหน่งบนแผนที่');
  }
  
  // Check for duplicate names (except when editing)
  if (newPlace.value.name.trim() && !editingPlace.value) {
    const isDuplicate = savedPlaces.value.some(
      p => p.name.toLowerCase() === newPlace.value.name.toLowerCase().trim()
    );
    if (isDuplicate) {
      errors.push('มีสถานที่ชื่อนี้อยู่แล้ว');
    }
  }
  
  return errors;
});

const isFormValid = computed(() => validationErrors.value.length === 0);

// Smart name suggestions based on address
const nameSuggestions = computed(() => {
  if (!newPlace.value.address || newPlace.value.name.trim()) return [];
  
  const suggestions: string[] = [];
  const address = newPlace.value.address.toLowerCase();
  
  // Extract potential names from address
  const parts = newPlace.value.address.split(',').map(p => p.trim());
  
  // First part is usually the most specific
  if (parts[0] && parts[0].length < 50) {
    suggestions.push(parts[0]);
  }
  
  // Check for common place types
  const placeTypes = [
    { keywords: ['ร้าน', 'shop', 'store'], prefix: 'ร้าน' },
    { keywords: ['โรงแรม', 'hotel'], prefix: 'โรงแรม' },
    { keywords: ['ห้าง', 'mall', 'plaza'], prefix: 'ห้าง' },
    { keywords: ['โรงพยาบาล', 'hospital'], prefix: 'โรงพยาบาล' },
    { keywords: ['สถานี', 'station'], prefix: 'สถานี' },
    { keywords: ['สนามบิน', 'airport'], prefix: 'สนามบิน' },
  ];
  
  for (const type of placeTypes) {
    if (type.keywords.some(k => address.includes(k))) {
      const match = parts.find(p => type.keywords.some(k => p.toLowerCase().includes(k)));
      if (match) suggestions.push(match);
    }
  }
  
  return [...new Set(suggestions)].slice(0, 3);
});

// Auto-detect if address is near home/work
const proximityWarning = computed(() => {
  if (!newPlace.value.lat || !newPlace.value.lng) return null;
  
  const checkProximity = (place: any, label: string) => {
    if (!place?.lat || !place?.lng) return null;
    
    const distance = calculateDistance(
      newPlace.value.lat,
      newPlace.value.lng,
      place.lat,
      place.lng
    );
    
    if (distance < 0.1) { // Less than 100 meters
      return `ใกล้กับ${label}มาก (${Math.round(distance * 1000)}m)`;
    }
    return null;
  };
  
  return checkProximity(homePlace.value, 'บ้าน') || 
         checkProximity(workPlace.value, 'ที่ทำงาน');
});

// Calculate distance between two points (in km)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

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

// Sort options
const sortOptions: { id: SortOption; label: string; icon: string }[] = [
  { id: 'default', label: 'ค่าเริ่มต้น', icon: 'M4 6h16M4 12h16M4 18h16' },
  { id: 'frequency', label: 'ใช้บ่อย', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  { id: 'recent', label: 'ล่าสุด', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'alphabetical', label: 'ก-ฮ', icon: 'M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12' },
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

// Filtered and sorted other places
const filteredOtherPlaces = computed(() => {
  let places = otherPlaces.value;
  
  // Apply category filter
  if (selectedCategory.value !== 'all') {
    places = filterByCategory(places, selectedCategory.value);
  }
  
  // Apply sorting
  return sortPlaces(places, sortOption.value);
});

// Top used places for quick access
const topUsedPlaces = computed(() => {
  return getTopUsedPlaces(savedPlaces.value, 3);
});

// Offline places count
const offlinePlacesCount = computed(() => getOfflinePlaces().length);

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
    category: "other" as PlaceCategory,
    lat: 13.7563,
    lng: 100.5018,
  };
  editingPlace.value = null;
  showAddModal.value = true;
};

const openEditModal = (place: any) => {
  newPlace.value = { 
    ...place,
    category: getPlaceCategory(place.id) || 'other'
  };
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
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
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
        
        // Save category to localStorage if it's "other" type
        if (newPlace.value.type === 'other' && newPlace.value.category) {
          setPlaceCategory(result.id, newPlace.value.category);
        }
      }

      // Fetch with timeout too
      await Promise.race([
        fetchSavedPlaces().catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
      
      // Close modal BEFORE showing success message to prevent cleanup errors
      showAddModal.value = false;
      
      // Wait for modal to close completely
      await nextTick();
      
      // Small delay to ensure cleanup is done
      await new Promise(resolve => setTimeout(resolve, 100));

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
    // Clear timeout if it exists
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

// Handle search result selection in modal
const handleSearchSelect = (place: PlaceResult) => {
  // Auto-fill address and coordinates
  newPlace.value.address = place.address;
  newPlace.value.lat = place.lat;
  newPlace.value.lng = place.lng;
  
  // Smart name handling
  if (newPlace.value.type === 'home' || newPlace.value.type === 'work') {
    // Keep default name for home/work unless user changed it
    if (!newPlace.value.name || 
        newPlace.value.name === 'บ้าน' || 
        newPlace.value.name === 'ที่ทำงาน') {
      // Keep the default
    } else {
      // User typed something, use place name
      newPlace.value.name = place.name;
    }
  } else {
    // For "other" type, use place name
    newPlace.value.name = place.name;
  }
  
  // Auto-detect category from address
  const detectedCategory = autoDetectCategory(place.name, place.address);
  newPlace.value.category = detectedCategory;
  
  // Trigger haptic feedback
  triggerHaptic('medium');
  
  // Show success toast
  showInfo('เลือกสถานที่แล้ว');
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

  // Auto-detect category from address
  const detectedCategory = autoDetectCategory('', quickAddLocation.value.address);
  
  newPlace.value = {
    name: "",
    address: quickAddLocation.value.address,
    type: "other",
    category: detectedCategory,
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

// ============================================
// Feature 1: Search History Integration
// ============================================
// When user selects a saved place, add to search history
const usePlaceForRide = async (place: any) => {
  triggerHaptic("medium");
  
  // Track usage for sorting
  trackPlaceUsage(place.id);
  
  // Add to search history
  await addToHistory({
    address: place.address,
    name: place.name,
    lat: place.lat,
    lng: place.lng,
    type: 'destination'
  });
  
  // Also add to recent places in database
  await addRecentPlace({
    name: place.name,
    address: place.address,
    lat: place.lat,
    lng: place.lng
  });
  
  // Navigate to ride with this destination
  router.push({
    path: '/customer/ride',
    query: {
      destLat: place.lat.toString(),
      destLng: place.lng.toString(),
      destAddress: place.address,
      destName: place.name
    }
  });
};

// Save recent place to saved places
const saveRecentToSaved = (place: any) => {
  triggerHaptic("light");
  const detectedCategory = autoDetectCategory(place.name || '', place.address);
  newPlace.value = {
    name: place.name || '',
    address: place.address,
    type: 'other',
    category: detectedCategory,
    lat: place.lat,
    lng: place.lng
  };
  editingPlace.value = null;
  showAddModal.value = true;
};

// ============================================
// Feature 2: Map Preview for Place Cards
// ============================================
const toggleMapPreview = async (placeId: string, place: any) => {
  triggerHaptic("light");
  
  if (expandedPlaceId.value === placeId) {
    // Collapse
    expandedPlaceId.value = null;
    // Cleanup map instance
    const mapInstance = placeMapInstances.value.get(placeId);
    if (mapInstance) {
      mapInstance.remove();
      placeMapInstances.value.delete(placeId);
    }
  } else {
    // Expand
    expandedPlaceId.value = placeId;
    
    await nextTick();
    
    // Initialize map for this place
    const container = document.getElementById(`place-map-${placeId}`);
    if (container && place.lat && place.lng) {
      // Dynamic import Leaflet
      const L = await import('leaflet');
      
      const map = L.map(container, {
        center: [place.lat, place.lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false
      });
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      
      // Add marker
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="width: 24px; height: 24px; background: #00a86b; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      
      L.marker([place.lat, place.lng], { icon }).addTo(map);
      
      placeMapInstances.value.set(placeId, map);
    }
  }
};

// ============================================
// Feature 4: Sort & Filter Functions
// ============================================
const toggleSortOptions = () => {
  triggerHaptic("light");
  showSortOptions.value = !showSortOptions.value;
  showCategoryFilter.value = false;
};

const toggleCategoryFilter = () => {
  triggerHaptic("light");
  showCategoryFilter.value = !showCategoryFilter.value;
  showSortOptions.value = false;
};

const selectSortOption = (option: SortOption) => {
  triggerHaptic("medium");
  setSortOption(option);
  showSortOptions.value = false;
  showSuccess(`เรียงตาม: ${sortOptions.find(o => o.id === option)?.label}`);
};

const selectCategoryFilter = (category: PlaceCategory | 'all') => {
  triggerHaptic("medium");
  setSelectedCategory(category);
  showCategoryFilter.value = false;
  if (category === 'all') {
    showInfo('แสดงทุกหมวดหมู่');
  } else {
    const catInfo = getCategoryInfo(category);
    showInfo(`กรองตาม: ${catInfo?.label}`);
  }
};

// ============================================
// Feature 5: Offline Places Functions
// ============================================
const toggleOfflinePlace = (place: any, event: Event) => {
  event.stopPropagation();
  triggerHaptic("medium");
  
  if (isOfflineAvailable(place.id)) {
    removeFromOffline(place.id);
    showInfo('ลบออกจากโหมดออฟไลน์แล้ว');
  } else {
    saveForOffline(place);
    showSuccess('บันทึกสำหรับใช้งานออฟไลน์แล้ว');
  }
};

// ============================================
// Feature 6: Category Selection in Modal
// ============================================
const selectPlaceCategory = (category: PlaceCategory) => {
  triggerHaptic("light");
  newPlace.value.category = category;
};

// ============================================
// Feature 7: Recent Places Management
// ============================================
const clearRecentHistory = async () => {
  if (!confirm('ต้องการล้างประวัติสถานที่ล่าสุดทั้งหมด?')) return;
  
  triggerHaptic("heavy");
  
  // Clear from localStorage
  localStorage.removeItem('demo_recent_places');
  
  // Refresh the list
  await fetchRecentPlaces(recentPlacesLimit.value, true);
  
  showSuccess('ล้างประวัติสถานที่ล่าสุดแล้ว');
};

const toggleRecentSettings = () => {
  triggerHaptic("light");
  showRecentSettings.value = !showRecentSettings.value;
};

const setRecentPlacesLimit = async (limit: number) => {
  triggerHaptic("medium");
  recentPlacesLimit.value = limit;
  localStorage.setItem('recent_places_limit', limit.toString());
  
  // Trim existing places if needed
  const STORAGE_KEY = 'demo_recent_places';
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    const places = JSON.parse(existing);
    if (places.length > limit) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(places.slice(0, limit)));
    }
  }
  
  // Refresh the list
  await fetchRecentPlaces(limit, true);
  
  showRecentSettings.value = false;
  showSuccess(`ตั้งค่าเก็บสถานที่ล่าสุด ${limit} รายการ`);
};

const deleteRecentPlace = async (placeId: string, event: Event) => {
  event.stopPropagation();
  triggerHaptic("medium");
  
  const STORAGE_KEY = 'demo_recent_places';
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    const places = JSON.parse(existing);
    const filtered = places.filter((p: any) => p.id !== placeId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
  
  // Refresh the list
  await fetchRecentPlaces(recentPlacesLimit.value, true);
  showInfo('ลบสถานที่ออกจากประวัติแล้ว');
};

// ============================================
// Feature 3: Share Places
// ============================================
const openShareModal = (place: any, event: Event) => {
  event.stopPropagation();
  triggerHaptic("light");
  placeToShare.value = place;
  showShareModal.value = true;
};

const closeShareModal = () => {
  showShareModal.value = false;
  placeToShare.value = null;
};

const shareViaLink = async () => {
  if (!placeToShare.value) return;
  triggerHaptic("medium");
  
  const place = placeToShare.value;
  const shareUrl = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
  const shareText = `📍 ${place.name}\n${place.address}\n\n${shareUrl}`;
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: place.name,
        text: `📍 ${place.name}\n${place.address}`,
        url: shareUrl
      });
      showSuccess('แชร์สำเร็จ!');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // Fallback to clipboard
        await copyToClipboard(shareText);
      }
    }
  } else {
    await copyToClipboard(shareText);
  }
  
  closeShareModal();
};

const shareViaGoogleMaps = () => {
  if (!placeToShare.value) return;
  triggerHaptic("medium");
  
  const place = placeToShare.value;
  const url = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
  window.open(url, '_blank');
  closeShareModal();
};

const shareViaLine = () => {
  if (!placeToShare.value) return;
  triggerHaptic("medium");
  
  const place = placeToShare.value;
  const shareUrl = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
  const text = encodeURIComponent(`📍 ${place.name}\n${place.address}\n${shareUrl}`);
  window.open(`https://line.me/R/msg/text/?${text}`, '_blank');
  closeShareModal();
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    showSuccess('คัดลอกลิงก์แล้ว!');
  } catch {
    showError('ไม่สามารถคัดลอกได้');
  }
};

const copyPlaceLink = async () => {
  if (!placeToShare.value) return;
  triggerHaptic("medium");
  
  const place = placeToShare.value;
  const shareUrl = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
  const shareText = `📍 ${place.name}\n${place.address}\n\n${shareUrl}`;
  
  await copyToClipboard(shareText);
  closeShareModal();
};
</script>

<template>
  <div class="page-container">
    <div class="content-container">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" @click="goBack">
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
        <button class="skip-btn" @click="skipSetup">ข้าม</button>
      </div>

      <!-- Tabs with animation -->
      <div class="tabs">
        <button
          :class="['tab', { active: activeTab === 'saved' }]"
          @click="switchTab('saved')"
        >
          สถานที่บันทึก
        </button>
        <button
          :class="['tab', { active: activeTab === 'recent' }]"
          @click="switchTab('recent')"
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
            <div v-if="homePlace" class="place-card-wrapper">
              <div
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
                <div class="place-actions">
                  <button class="action-btn map-btn" title="ดูแผนที่" @click.stop="toggleMapPreview(homePlace.id, homePlace)">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </button>
                  <button class="action-btn share-btn" title="แชร์" @click.stop="openShareModal(homePlace, $event)">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                  <button class="action-btn use-btn" title="ใช้เป็นจุดหมาย" @click.stop="usePlaceForRide(homePlace)">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              </div>
              <!-- Map Preview -->
              <Transition name="expand">
                <div v-if="expandedPlaceId === homePlace.id" class="place-map-preview">
                  <div :id="`place-map-${homePlace.id}`" class="mini-map"></div>
                </div>
              </Transition>
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
            <div v-if="workPlace" class="place-card-wrapper">
              <div
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
                <div class="place-actions">
                  <button class="action-btn map-btn" title="ดูแผนที่" @click.stop="toggleMapPreview(workPlace.id, workPlace)">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </button>
                  <button class="action-btn share-btn" title="แชร์" @click.stop="openShareModal(workPlace, $event)">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                  <button class="action-btn use-btn" title="ใช้เป็นจุดหมาย" @click.stop="usePlaceForRide(workPlace)">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              </div>
              <!-- Map Preview -->
              <Transition name="expand">
                <div v-if="expandedPlaceId === workPlace.id" class="place-map-preview">
                  <div :id="`place-map-${workPlace.id}`" class="mini-map"></div>
                </div>
              </Transition>
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

          <!-- Quick Access: Top Used Places -->
          <div v-if="topUsedPlaces.length > 0" class="place-section quick-access-section">
            <div class="section-header">
              <h3>⭐ ใช้บ่อย</h3>
            </div>
            <div class="quick-access-row">
              <button 
                v-for="place in topUsedPlaces" 
                :key="place.id" 
                class="quick-access-chip"
                @click="usePlaceForRide(place)"
              >
                <span class="chip-name">{{ place.name }}</span>
                <span class="chip-count">{{ getUsageCount(place.id) }}x</span>
              </button>
            </div>
          </div>

          <!-- Other Places with Sort & Filter -->
          <div class="place-section">
            <div class="section-header">
              <h3>สถานที่อื่นๆ</h3>
              <div class="header-actions">
                <!-- Sort Button -->
                <button class="header-action-btn" :class="{ active: sortOption !== 'default' }" @click="toggleSortOptions">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                </button>
                <!-- Filter Button -->
                <button class="header-action-btn" :class="{ active: selectedCategory !== 'all' }" @click="toggleCategoryFilter">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Sort Options Dropdown -->
            <Transition name="dropdown">
              <div v-if="showSortOptions" class="dropdown-menu">
                <button 
                  v-for="opt in sortOptions" 
                  :key="opt.id" 
                  class="dropdown-item"
                  :class="{ active: sortOption === opt.id }"
                  @click="selectSortOption(opt.id)"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="opt.icon" />
                  </svg>
                  <span>{{ opt.label }}</span>
                  <svg v-if="sortOption === opt.id" class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </Transition>

            <!-- Category Filter Dropdown -->
            <Transition name="dropdown">
              <div v-if="showCategoryFilter" class="dropdown-menu category-menu">
                <button 
                  class="dropdown-item"
                  :class="{ active: selectedCategory === 'all' }"
                  @click="selectCategoryFilter('all')"
                >
                  <div class="category-icon" style="background: #e8e8e8;">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </div>
                  <span>ทั้งหมด</span>
                  <svg v-if="selectedCategory === 'all'" class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button 
                  v-for="cat in PLACE_CATEGORIES" 
                  :key="cat.id" 
                  class="dropdown-item"
                  :class="{ active: selectedCategory === cat.id }"
                  @click="selectCategoryFilter(cat.id)"
                >
                  <div class="category-icon" :style="{ background: cat.color + '20', color: cat.color }">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                      <path :d="cat.icon" />
                    </svg>
                  </div>
                  <span>{{ cat.label }}</span>
                  <svg v-if="selectedCategory === cat.id" class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </Transition>

            <!-- Offline Status Banner -->
            <div v-if="!isOnline" class="offline-banner">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
              </svg>
              <span>โหมดออฟไลน์ - แสดงเฉพาะสถานที่ที่บันทึกไว้ ({{ offlinePlacesCount }} รายการ)</span>
            </div>

            <TransitionGroup name="place-list" tag="div" class="places-list">
              <div
                v-for="(place, index) in filteredOtherPlaces"
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
                <div class="place-icon" :style="{ background: getCategoryInfo(getPlaceCategory(place.id))?.color + '20' }">
                  <svg viewBox="0 0 24 24" fill="currentColor" :style="{ color: getCategoryInfo(getPlaceCategory(place.id))?.color }">
                    <path :d="getCategoryInfo(getPlaceCategory(place.id))?.icon || 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'" />
                  </svg>
                </div>
                <div class="place-info">
                  <div class="place-name-row">
                    <span class="place-name">{{ place.name }}</span>
                    <span v-if="getUsageCount(place.id) > 0" class="usage-badge">{{ getUsageCount(place.id) }}x</span>
                    <span v-if="isOfflineAvailable(place.id)" class="offline-badge" title="พร้อมใช้งานออฟไลน์">📥</span>
                  </div>
                  <span class="place-address">{{ place.address }}</span>
                </div>
                <button class="offline-toggle-btn" :title="isOfflineAvailable(place.id) ? 'ลบจากออฟไลน์' : 'บันทึกออฟไลน์'" @click="toggleOfflinePlace(place, $event)">
                  <svg v-if="isOfflineAvailable(place.id)" fill="currentColor" viewBox="0 0 24 24" width="18" height="18">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                  </svg>
                  <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
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
          <!-- Recent Places Header with Search & Settings -->
          <div class="recent-header">
            <div class="recent-search-box">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                v-model="recentSearchQuery"
                type="text"
                placeholder="ค้นหาสถานที่ล่าสุด..."
                class="recent-search-input"
              />
              <button v-if="recentSearchQuery" class="clear-search-btn" @click="recentSearchQuery = ''">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div class="recent-actions">
              <button class="recent-action-btn" title="ตั้งค่า" @click="toggleRecentSettings">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button 
                v-if="recentPlaces.length > 0"
                class="recent-action-btn danger" 
                title="ล้างประวัติ" 
                @click="clearRecentHistory"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Settings Dropdown -->
          <Transition name="dropdown">
            <div v-if="showRecentSettings" class="recent-settings-panel">
              <div class="settings-section">
                <label class="settings-label">จำนวนสถานที่ที่เก็บ</label>
                <div class="limit-options">
                  <button 
                    v-for="limit in RECENT_LIMIT_OPTIONS" 
                    :key="limit"
                    :class="['limit-btn', { active: recentPlacesLimit === limit }]"
                    @click="setRecentPlacesLimit(limit)"
                  >
                    {{ limit }}
                  </button>
                </div>
              </div>
              <div class="settings-info">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>ปัจจุบันเก็บ {{ recentPlaces.length }} รายการ</span>
              </div>
            </div>
          </Transition>

          <!-- Search Results Info -->
          <div v-if="recentSearchQuery && filteredRecentPlaces.length !== recentPlaces.length" class="search-results-info">
            พบ {{ filteredRecentPlaces.length }} จาก {{ recentPlaces.length }} รายการ
          </div>

          <div v-if="filteredRecentPlaces.length === 0 && recentSearchQuery" class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p>ไม่พบสถานที่ที่ค้นหา</p>
            <p class="empty-hint">ลองค้นหาด้วยคำอื่น</p>
          </div>
          <div v-else-if="recentPlaces.length === 0" class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p>ยังไม่มีสถานที่ล่าสุด</p>
            <p class="empty-hint">สถานที่ที่คุณค้นหาจะแสดงที่นี่</p>
          </div>
          <div v-else class="recent-list">
            <div
              v-for="place in filteredRecentPlaces"
              :key="place.id || place.name"
              class="place-card recent-card"
            >
              <div class="place-icon recent">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div class="place-info" @click="usePlaceForRide(place)">
                <span class="place-name">{{ place.name }}</span>
                <span class="place-address">{{ place.address }}</span>
              </div>
              <div class="place-actions">
                <button class="action-btn save-btn" title="บันทึก" @click.stop="saveRecentToSaved(place)">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
                <button class="action-btn use-btn" title="ใช้เป็นจุดหมาย" @click.stop="usePlaceForRide(place)">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <button class="action-btn delete-btn" title="ลบ" @click="deleteRecentPlace(place.id, $event)">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
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
        title="นำเข้าจาก Maps"
        @click="openImportOptions"
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
        title="เพิ่มจากแผนที่"
        @click="openQuickAddMap"
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
            <button class="close-btn" @click="closeImportOptions">
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
            <button class="close-btn" @click="closeQuickAddMap">
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

          <div ref="quickAddMapContainer" class="quick-add-map"></div>

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
              class="btn-current-location"
              :disabled="isLoadingAddress"
              @click="useCurrentLocationForQuickAdd"
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
                <span v-if="isLoadingAddress" class="loading-text">กำลังค้นหาที่อยู่...</span>
                <span v-else>{{
                  quickAddLocation.address || "ไม่พบที่อยู่"
                }}</span>
              </div>
            </div>
          </div>

          <div class="quick-add-actions">
            <button class="btn-cancel" @click="closeQuickAddMap">ยกเลิก</button>
            <button
              class="btn-confirm"
              :disabled="!quickAddLocation || isLoadingAddress"
              @click="confirmQuickAdd"
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
            class="close-btn"
            :disabled="saving"
            @click="showAddModal = false"
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
              :class="['type-btn', { active: newPlace.type === type.id }]"
              @click="newPlace.type = type.id as any"
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

        <!-- Category Selection (only for "other" type) -->
        <div v-if="newPlace.type === 'other'" class="form-group">
          <label>หมวดหมู่</label>
          <div class="category-grid">
            <button
              v-for="cat in PLACE_CATEGORIES"
              :key="cat.id"
              :class="['category-btn', { active: newPlace.category === cat.id }]"
              :style="{ '--cat-color': cat.color }"
              @click="selectPlaceCategory(cat.id)"
            >
              <div class="cat-icon" :style="{ background: cat.color + '20', color: cat.color }">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path :d="cat.icon" />
                </svg>
              </div>
              <span class="cat-label">{{ cat.label }}</span>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>ชื่อสถานที่</label>
          <input
            v-model="newPlace.name"
            type="text"
            placeholder="เช่น บ้านแม่, ออฟฟิศ"
            :class="{ 'input-error': validationErrors.some(e => e.includes('ชื่อ')) }"
          />
          
          <!-- Name Suggestions -->
          <div v-if="nameSuggestions.length > 0 && !newPlace.name.trim()" class="name-suggestions">
            <span class="suggestion-label">แนะนำ:</span>
            <button
              v-for="(suggestion, index) in nameSuggestions"
              :key="index"
              class="suggestion-chip"
              @click="newPlace.name = suggestion"
            >
              {{ suggestion }}
            </button>
          </div>
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
          
          <!-- Proximity Warning -->
          <div v-if="proximityWarning" class="proximity-warning">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{{ proximityWarning }}</span>
          </div>
        </div>

        <!-- Validation Errors -->
        <div v-if="validationErrors.length > 0" class="validation-errors">
          <div v-for="(error, index) in validationErrors" :key="index" class="error-item">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ error }}</span>
          </div>
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
            class="btn-delete"
            :disabled="saving"
            @click="deletePlace(editingPlace.id)"
          >
            ลบสถานที่
          </button>
          <button
            class="btn-primary"
            :disabled="saving || !isFormValid"
            @click="savePlace"
          >
            <span v-if="saving">กำลังบันทึก...</span>
            <span v-else>บันทึก</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Share Modal -->
    <Transition name="fade">
      <div v-if="showShareModal" class="share-overlay" @click.self="closeShareModal">
        <div class="share-sheet">
          <div class="share-header">
            <h3>แชร์สถานที่</h3>
            <button class="close-btn" @click="closeShareModal">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div v-if="placeToShare" class="share-place-info">
            <div class="share-place-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
            <div class="share-place-text">
              <span class="share-place-name">{{ placeToShare.name }}</span>
              <span class="share-place-address">{{ placeToShare.address }}</span>
            </div>
          </div>

          <div class="share-options">
            <button class="share-option" @click="shareViaLink">
              <div class="share-icon native">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <span>แชร์</span>
            </button>

            <button class="share-option" @click="shareViaLine">
              <div class="share-icon line">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                </svg>
              </div>
              <span>LINE</span>
            </button>

            <button class="share-option" @click="shareViaGoogleMaps">
              <div class="share-icon google">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              <span>Google Maps</span>
            </button>

            <button class="share-option" @click="copyPlaceLink">
              <div class="share-icon copy">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </div>
              <span>คัดลอกลิงก์</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
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

/* ============================================ */
/* New Features Styles */
/* ============================================ */

/* Place Card Wrapper for Map Preview */
.place-card-wrapper {
  margin-bottom: 10px;
}

/* Place Actions */
.place-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.action-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn svg {
  width: 18px;
  height: 18px;
}

.action-btn.map-btn {
  background: #e3f2fd;
  color: #2196f3;
}

.action-btn.map-btn:active {
  background: #bbdefb;
}

.action-btn.share-btn {
  background: #fff3e0;
  color: #ff9800;
}

.action-btn.share-btn:active {
  background: #ffe0b2;
}

.action-btn.use-btn {
  background: #e8f5ef;
  color: #00a86b;
}

.action-btn.use-btn:active {
  background: #c8e6c9;
}

.action-btn.save-btn {
  background: #fce4ec;
  color: #e91e63;
}

.action-btn.save-btn:active {
  background: #f8bbd9;
}

/* Map Preview */
.place-map-preview {
  overflow: hidden;
  border-radius: 0 0 14px 14px;
  margin-top: -10px;
  border: 1px solid #f0f0f0;
  border-top: none;
}

.mini-map {
  height: 150px;
  width: 100%;
  background: #f5f5f5;
}

/* Expand Animation */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  height: 0;
  opacity: 0;
}

/* Recent Card */
.recent-card .place-info {
  cursor: pointer;
}

.place-icon.recent {
  background: #f5f5f5;
}

.place-icon.recent svg {
  color: #999999;
}

/* Empty State */
.empty-hint {
  font-size: 13px;
  color: #999999;
  margin-top: 4px;
}

/* Share Modal */
.share-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1001;
}

.share-sheet {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  background: #fff;
  border-radius: 24px 24px 0 0;
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
}

.share-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.share-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.share-place-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #f8f9fa;
  border-radius: 12px;
  margin-bottom: 20px;
}

.share-place-icon {
  width: 44px;
  height: 44px;
  background: #e8f5ef;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.share-place-icon svg {
  width: 22px;
  height: 22px;
  color: #00a86b;
}

.share-place-text {
  flex: 1;
  min-width: 0;
}

.share-place-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 2px;
}

.share-place-address {
  font-size: 13px;
  color: #666666;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.share-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.share-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  border-radius: 12px;
}

.share-option:active {
  background: #f5f5f5;
  transform: scale(0.95);
}

.share-option span {
  font-size: 12px;
  color: #666666;
  font-weight: 500;
}

.share-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.share-icon svg {
  width: 24px;
  height: 24px;
}

.share-icon.native {
  background: #e8f5ef;
  color: #00a86b;
}

.share-icon.line {
  background: #00b900;
  color: #fff;
}

.share-icon.google {
  background: #ea4335;
  color: #fff;
}

.share-icon.copy {
  background: #e3f2fd;
  color: #2196f3;
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

/* ============================================ */
/* New Features: Sort, Filter, Categories, Offline */
/* ============================================ */

/* Quick Access Section */
.quick-access-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e8f5ef 100%);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 20px;
}

.quick-access-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.quick-access-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.quick-access-chip:active {
  background: #e8f5ef;
  border-color: #00a86b;
}

.chip-name {
  color: #1a1a1a;
  font-weight: 500;
}

.chip-count {
  color: #00a86b;
  font-size: 11px;
  font-weight: 600;
}

/* Header Actions */
.header-actions {
  display: flex;
  gap: 8px;
}

.header-action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: #f5f5f5;
  color: #666666;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}

.header-action-btn:active {
  background: #e8e8e8;
}

.header-action-btn.active {
  background: #e8f5ef;
  color: #00a86b;
}

/* Dropdown Menu */
.dropdown-menu {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  margin-bottom: 12px;
  overflow: hidden;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  background: none;
  border: none;
  font-size: 14px;
  color: #1a1a1a;
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
}

.dropdown-item:active {
  background: #f5f5f5;
}

.dropdown-item.active {
  background: #e8f5ef;
  color: #00a86b;
}

.dropdown-item .check-icon {
  margin-left: auto;
  color: #00a86b;
}

/* Category Menu */
.category-menu {
  max-height: 300px;
  overflow-y: auto;
}

.category-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.category-icon svg {
  width: 16px;
  height: 16px;
}

/* Dropdown Animation */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Offline Banner */
.offline-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #fff3e0;
  border-radius: 10px;
  margin-bottom: 12px;
  color: #e65100;
  font-size: 13px;
}

.offline-banner svg {
  flex-shrink: 0;
}

/* Place Name Row */
.place-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.usage-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: #e8f5ef;
  color: #00a86b;
  border-radius: 10px;
  font-weight: 600;
}

.offline-badge {
  font-size: 12px;
}

/* Offline Toggle Button */
.offline-toggle-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: #f5f5f5;
  color: #666666;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.offline-toggle-btn:active {
  background: #e8e8e8;
}

.offline-toggle-btn svg[fill="currentColor"] {
  color: #00a86b;
}

/* Category Selection in Modal */
.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 8px;
}

.category-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
}

.category-btn:active {
  transform: scale(0.95);
}

.category-btn.active {
  border-color: var(--cat-color, #00a86b);
  background: color-mix(in srgb, var(--cat-color, #00a86b) 10%, white);
}

.category-btn.active .cat-icon {
  background: var(--cat-color, #00a86b) !important;
  color: #fff !important;
}

.category-btn.active .cat-label {
  color: var(--cat-color, #00a86b);
  font-weight: 600;
}

.cat-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.cat-icon svg {
  width: 18px;
  height: 18px;
}

.cat-label {
  font-size: 10px;
  color: #666666;
  text-align: center;
  line-height: 1.2;
  transition: all 0.15s;
}

/* Recent Places Header & Search */
.recent-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 0 4px;
}

.recent-search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f5f5f5;
  border-radius: 12px;
  padding: 10px 14px;
}

.recent-search-box svg {
  color: #999;
  flex-shrink: 0;
}

.recent-search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #333;
  outline: none;
}

.recent-search-input::placeholder {
  color: #999;
}

.clear-search-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-search-btn:active {
  transform: scale(0.9);
}

.recent-actions {
  display: flex;
  gap: 8px;
}

.recent-action-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: none;
  background: #f5f5f5;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.recent-action-btn:active {
  transform: scale(0.95);
}

.recent-action-btn.danger {
  color: #ef4444;
}

.recent-action-btn.danger:hover {
  background: #fef2f2;
}

/* Recent Settings Panel */
.recent-settings-panel {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.settings-section {
  margin-bottom: 12px;
}

.settings-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  margin-bottom: 10px;
}

.limit-options {
  display: flex;
  gap: 8px;
}

.limit-btn {
  flex: 1;
  padding: 10px 12px;
  border: 2px solid #e5e5e5;
  border-radius: 10px;
  background: #fff;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.15s;
}

.limit-btn:active {
  transform: scale(0.95);
}

.limit-btn.active {
  border-color: #00a86b;
  background: #f0fdf4;
  color: #00a86b;
}

.settings-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #999;
}

/* Search Results Info */
.search-results-info {
  font-size: 13px;
  color: #666;
  padding: 8px 4px;
  margin-bottom: 8px;
}

/* Delete Button for Recent Places */
.action-btn.delete-btn {
  color: #999;
}

.action-btn.delete-btn:hover {
  color: #ef4444;
  background: #fef2f2;
}
</style>

/* ============================================ */
/* Smart Modal Enhancements */
/* ============================================ */

/* Name Suggestions */
.name-suggestions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
  padding: 8px 0;
}

.suggestion-label {
  font-size: 12px;
  color: #999999;
  font-weight: 500;
}

.suggestion-chip {
  padding: 6px 12px;
  background: #e8f5ef;
  border: 1px solid #d4ede3;
  border-radius: 16px;
  font-size: 13px;
  color: #00a86b;
  cursor: pointer;
  transition: all 0.15s;
  font-weight: 500;
}

.suggestion-chip:hover {
  background: #d4ede3;
  border-color: #00a86b;
}

.suggestion-chip:active {
  transform: scale(0.95);
  background: #00a86b;
  color: #fff;
}

/* Proximity Warning */
.proximity-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 10px 12px;
  background: #fff3e0;
  border-radius: 10px;
  font-size: 13px;
  color: #e65100;
}

.proximity-warning svg {
  flex-shrink: 0;
  color: #ff9800;
}

/* Validation Errors */
.validation-errors {
  margin-top: 12px;
  padding: 12px;
  background: #ffebee;
  border-radius: 10px;
  border-left: 3px solid #f44336;
}

.error-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: #c62828;
  margin-bottom: 6px;
}

.error-item:last-child {
  margin-bottom: 0;
}

.error-item svg {
  flex-shrink: 0;
  margin-top: 1px;
}

/* Input Error State */
.input-error {
  border-color: #f44336 !important;
  background: #ffebee !important;
}

.input-error:focus {
  border-color: #f44336 !important;
  box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.1) !important;
}

/* Enhanced Form Group */
.form-group {
  margin-bottom: 18px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #666666;
  margin-bottom: 8px;
}

.form-group input[type="text"] {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e8e8e8;
  border-radius: 10px;
  font-size: 14px;
  transition: all 0.15s;
  background: #fff;
}

.form-group input[type="text"]:focus {
  outline: none;
  border-color: #00a86b;
  background: #f8fbf9;
  box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.1);
}

.form-group input[type="text"]::placeholder {
  color: #cccccc;
}

/* Enhanced Modal Actions */
.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.btn-primary {
  flex: 1;
  padding: 14px 20px;
  background: linear-gradient(135deg, #00a86b 0%, #008f5b 100%);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 168, 107, 0.2);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(0, 168, 107, 0.2);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #cccccc;
  box-shadow: none;
}

.btn-delete {
  padding: 14px 20px;
  background: #fff;
  border: 2px solid #f44336;
  border-radius: 12px;
  color: #f44336;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-delete:hover:not(:disabled) {
  background: #ffebee;
}

.btn-delete:active:not(:disabled) {
  transform: scale(0.98);
  background: #f44336;
  color: #fff;
}

.btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Enhanced Type Options */
.type-options {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.type-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.type-btn:active {
  transform: scale(0.95);
}

.type-btn.active {
  background: #e8f5ef;
  border-color: #00a86b;
}

.type-btn svg {
  width: 24px;
  height: 24px;
  color: #666666;
  transition: color 0.15s;
}

.type-btn.active svg {
  color: #00a86b;
}

.type-btn span {
  font-size: 12px;
  color: #666666;
  font-weight: 500;
  transition: all 0.15s;
}

.type-btn.active span {
  color: #00a86b;
  font-weight: 600;
}

/* Map Preview Enhancements */
.map-preview {
  margin-top: 16px;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid #e8e8e8;
  background: #f8f9fa;
}

.map-preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  font-size: 13px;
  color: #666666;
  font-weight: 500;
}

.map-preview-header svg {
  color: #00a86b;
}

.map-preview-container {
  height: 180px;
  background: #e8e8e8;
}

.map-preview-address {
  padding: 10px 12px;
  background: #fff;
  font-size: 12px;
  color: #666666;
  line-height: 1.4;
  border-top: 1px solid #e8e8e8;
}

/* Responsive Adjustments */
@media (max-width: 380px) {
  .category-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .type-options {
    flex-direction: column;
  }
  
  .type-btn {
    flex-direction: row;
    justify-content: flex-start;
    padding: 12px 14px;
  }
}

/* Loading State for Save Button */
.btn-primary span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary:disabled span::before {
  content: '';
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
