<script setup lang="ts">
/**
 * Feature: F02 - Customer Ride Booking
 * MUNEEF Style UI - Clean and Modern
 * Flow: 1.เลือกจุดรับ → 2.เลือกจุดหมาย → 3.เลือกประเภทรถ → 4.ยืนยันจอง
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import LocationPicker from '../components/LocationPicker.vue'
import MapView from '../components/MapView.vue'
import RideTracker from '../components/RideTracker.vue'
import BottomSheet from '../components/BottomSheet.vue'
import NearbyPlacesSheet from '../components/NearbyPlacesSheet.vue'
import BottomNavigation from '../components/customer/BottomNavigation.vue'
import type { NearbyPlace } from '../composables/useNearbyPlaces'
import { useLocation, type GeoLocation } from '../composables/useLocation'
import { useRideStore } from '../stores/ride'
import { useAuthStore } from '../stores/auth'
import { useSurgePricing } from '../composables/useSurgePricing'
import { useServices } from '../composables/useServices'
import { useRecurringRides } from '../composables/useRecurringRides'
import { useRideHistory } from '../composables/useRideHistory'
import type { RideRequest, ServiceProvider } from '../types/database'

const router = useRouter()
const rideStore = useRideStore()
const authStore = useAuthStore()
const { calculateDistance, calculateTravelTime } = useLocation()
const { calculateSurge, currentMultiplier } = useSurgePricing()
const { savedPlaces, recentPlaces, homePlace, workPlace, fetchSavedPlaces, fetchRecentPlaces, loading: placesLoading } = useServices()
const { unratedRidesCount, fetchUnratedRides } = useRideHistory()

const surgeMultiplier = currentMultiplier

// Navigation handler for BottomNavigation
const navigateTo = (route: string) => {
  router.push(route)
}

// Computed: Favorite places (not home/work)
const favoritePlaces = computed(() => 
  savedPlaces.value.filter(p => p.place_type === 'other').slice(0, 3)
)

onMounted(async () => {
  const pendingDest = rideStore.consumeDestination()
  if (pendingDest) {
    destinationLocation.value = pendingDest
    destinationAddress.value = pendingDest.address
    // ถ้ามี destination แล้ว ให้ไปขั้นตอนเลือกจุดรับ
    step.value = 'pickup'
  }
  
  if (pickupLocation.value) {
    await calculateSurge(pickupLocation.value.lat, pickupLocation.value.lng)
  }
  
  if (authStore.user?.id) {
    await rideStore.initialize(authStore.user.id)
    if (rideStore.hasActiveRide && rideStore.currentRide) {
      activeRide.value = rideStore.currentRide
      viewMode.value = 'tracking'
    }
    // Fetch saved places, recent places, and unrated rides count
    await Promise.all([fetchSavedPlaces(), fetchRecentPlaces(5), fetchUnratedRides()])
  }
})

onUnmounted(() => {
  rideStore.unsubscribeAll()
})

// Form state
const pickupAddress = ref('')
const destinationAddress = ref('')
const pickupLocation = ref<GeoLocation | null>(null)
const destinationLocation = ref<GeoLocation | null>(null)
const rideType = ref<'standard' | 'premium' | 'shared'>('standard')
const passengerCount = ref(1)
const paymentMethod = ref<'cash' | 'wallet' | 'card'>('cash')
const promoCode = ref('')
const specialRequests = ref('')

// UI state
const isCalculating = ref(false)
const isBooking = ref(false)
const estimatedFare = ref(0)
const estimatedTime = ref(0)
const estimatedDistance = ref(0)
const showPaymentSheet = ref(false)
const showPromoSheet = ref(false)
const showPickupMapPicker = ref(false)
const showDestMapPicker = ref(false)
const showNearbyPlaces = ref(false)
const showScheduleSheet = ref(false)

// Schedule state
const isScheduled = ref(false)
const scheduledDate = ref('')
const scheduledTime = ref('')

// Computed: Display text for schedule
const scheduleDisplayText = computed(() => {
  if (!isScheduled.value || !scheduledDate.value || !scheduledTime.value) {
    return 'ตอนนี้'
  }
  const date = new Date(scheduledDate.value + 'T' + scheduledTime.value)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const isToday = date.toDateString() === today.toDateString()
  const isTomorrow = date.toDateString() === tomorrow.toDateString()
  
  const timeStr = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  
  if (isToday) {
    return `วันนี้ ${timeStr}`
  } else if (isTomorrow) {
    return `พรุ่งนี้ ${timeStr}`
  } else {
    const dateStr = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
    return `${dateStr} ${timeStr}`
  }
})

// Schedule helpers
const getMinDate = (): string => {
  const now = new Date()
  return now.toISOString().split('T')[0] || ''
}

const getMaxDate = (): string => {
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 7) // Allow scheduling up to 7 days ahead
  return maxDate.toISOString().split('T')[0] || ''
}

const getMinTime = () => {
  if (!scheduledDate.value) return '00:00'
  const now = new Date()
  const selectedDate = new Date(scheduledDate.value)
  
  // If selected date is today, min time is current time + 30 minutes
  if (selectedDate.toDateString() === now.toDateString()) {
    now.setMinutes(now.getMinutes() + 30)
    return now.toTimeString().slice(0, 5)
  }
  return '00:00'
}

const openScheduleSheet = () => {
  triggerHaptic('light')
  // Set default values if not set
  if (!scheduledDate.value) {
    scheduledDate.value = getMinDate()
  }
  if (!scheduledTime.value) {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 30)
    scheduledTime.value = now.toTimeString().slice(0, 5)
  }
  showScheduleSheet.value = true
}

const confirmSchedule = () => {
  if (scheduledDate.value && scheduledTime.value) {
    isScheduled.value = true
    triggerHaptic('medium')
  }
  showScheduleSheet.value = false
}

const setRideNow = () => {
  isScheduled.value = false
  scheduledDate.value = ''
  scheduledTime.value = ''
  triggerHaptic('light')
  showScheduleSheet.value = false
}

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
  getNextScheduleDisplay
} = useRecurringRides()

const showRecurringSheet = ref(false)
const showCreateRecurringModal = ref(false)
const isRecurring = ref(false)
void isRecurring // Reserved for recurring ride feature
const recurringName = ref('')
const recurringScheduleType = ref<'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom'>('weekdays')
const recurringScheduleTime = ref('08:00')
const recurringScheduleDays = ref<number[]>([1, 2, 3, 4, 5]) // Mon-Fri default

const openRecurringSheet = () => {
  triggerHaptic('light')
  fetchRecurringTemplates()
  showRecurringSheet.value = true
}

const saveAsRecurring = async () => {
  if (!pickupLocation.value || !destinationLocation.value) {
    alert('กรุณาเลือกจุดรับและจุดหมายก่อน')
    return
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
    schedule_days: recurringScheduleType.value === 'weekly' || recurringScheduleType.value === 'custom' 
      ? recurringScheduleDays.value 
      : undefined,
    name: recurringName.value || `${pickupLocation.value.address} → ${destinationLocation.value.address}`
  })

  if (template) {
    triggerHaptic('medium')
    showCreateRecurringModal.value = false
    alert('บันทึกการจองประจำสำเร็จ!')
    recurringName.value = ''
  }
}

const useRecurringTemplate = (template: any) => {
  pickupLocation.value = {
    lat: template.pickup_lat,
    lng: template.pickup_lng,
    address: template.pickup_address
  }
  pickupAddress.value = template.pickup_address
  destinationLocation.value = {
    lat: template.destination_lat,
    lng: template.destination_lng,
    address: template.destination_address
  }
  destinationAddress.value = template.destination_address
  rideType.value = template.ride_type
  passengerCount.value = template.passenger_count
  specialRequests.value = template.special_requests || ''
  
  showRecurringSheet.value = false
  triggerHaptic('medium')
  
  // Go to options step
  calculateFare()
}

// Search state
const pickupSearchQuery = ref('')
const destSearchQuery = ref('')
const pickupSearchResults = ref<Array<{ id: string; name: string; address: string; lat: number; lng: number }>>([])
const destSearchResults = ref<Array<{ id: string; name: string; address: string; lat: number; lng: number }>>([])

// Step Flow: pickup → destination → options → confirm
const step = ref<'pickup' | 'destination' | 'options' | 'confirm'>('pickup')

// Active ride state
const activeRide = ref<RideRequest | null>(null)
const assignedProvider = ref<ServiceProvider | null>(null)
const viewMode = ref<'booking' | 'tracking'>('booking')

// Step labels for indicator
const stepLabels = [
  { key: 'pickup', label: 'จุดรับ', number: 1 },
  { key: 'destination', label: 'จุดหมาย', number: 2 },
  { key: 'options', label: 'เลือกรถ', number: 3 },
  { key: 'confirm', label: 'ยืนยัน', number: 4 }
] as const

const currentStepIndex = computed(() => {
  return stepLabels.findIndex(s => s.key === step.value)
})

// Ride types - MUNEEF Style
const rideTypes = [
  { 
    value: 'standard', 
    label: 'สบาย', 
    description: 'เดินทางสบายกับคนขับที่ไว้ใจได้',
    multiplier: 1.0, 
    icon: 'comfort',
    eta: '2 นาที',
    capacity: 4,
    priceRange: '88 - 107'
  },
  { 
    value: 'premium', 
    label: 'พรีเมียม', 
    description: 'รถหรูสำหรับโอกาสพิเศษ',
    multiplier: 1.5, 
    icon: 'premium',
    eta: '5 นาที',
    capacity: 4,
    priceRange: '150 - 180'
  },
  { 
    value: 'shared', 
    label: 'แชร์', 
    description: 'แชร์การเดินทาง ประหยัดกว่า',
    multiplier: 0.7, 
    icon: 'share',
    eta: '5 นาที',
    capacity: 2,
    priceRange: '60 - 75'
  }
] as const

const paymentMethods = [
  { value: 'cash', label: 'เงินสด', icon: 'cash' },
  { value: 'wallet', label: 'กระเป๋าเงิน GOBEAR', icon: 'wallet' },
  { value: 'card', label: 'บัตรเครดิต/เดบิต', icon: 'card' }
] as const

const canCalculate = computed(() => pickupLocation.value && destinationLocation.value)
const hasRoute = computed(() => !!(pickupLocation.value && destinationLocation.value && estimatedDistance.value > 0))

const selectedRideType = computed(() => 
  rideTypes.find(t => t.value === rideType.value) || rideTypes[0]
)

const finalFare = computed(() => {
  let fare = estimatedFare.value
  if (surgeMultiplier.value > 1) {
    fare = fare * surgeMultiplier.value
  }
  return Math.round(fare)
})

// Handlers (reserved for future use)
const _handlePickupSelected = async (location: GeoLocation) => {
  pickupLocation.value = location
  pickupAddress.value = location.address
  await calculateSurge(location.lat, location.lng)
  // ไปขั้นตอนถัดไป: เลือกจุดหมาย
  step.value = 'destination'
}

const _handleDestinationSelected = async (location: GeoLocation) => {
  destinationLocation.value = location
  destinationAddress.value = location.address
  // คำนวณค่าโดยสารและไปขั้นตอนเลือกรถ
  await calculateFare()
}

// Export for potential future use
void _handlePickupSelected
void _handleDestinationSelected

const handleRouteCalculated = (data: { distance: number; duration: number }) => {
  estimatedDistance.value = data.distance
  estimatedTime.value = data.duration
}

const calculateFare = async () => {
  if (!canCalculate.value || !pickupLocation.value || !destinationLocation.value) return
  
  isCalculating.value = true
  await new Promise(resolve => setTimeout(resolve, 300))
  
  if (estimatedDistance.value === 0) {
    estimatedDistance.value = calculateDistance(
      pickupLocation.value.lat, pickupLocation.value.lng,
      destinationLocation.value.lat, destinationLocation.value.lng
    )
    estimatedTime.value = calculateTravelTime(estimatedDistance.value)
  }
  
  estimatedFare.value = rideStore.calculateFare(estimatedDistance.value, rideType.value)
  step.value = 'options'
  isCalculating.value = false
}

const selectRideType = (type: 'standard' | 'premium' | 'shared') => {
  rideType.value = type
  if (estimatedDistance.value > 0) {
    estimatedFare.value = rideStore.calculateFare(estimatedDistance.value, type)
  }
}
void selectRideType // Reserved for non-enhanced usage

const bookRide = async () => {
  if (!pickupLocation.value || !destinationLocation.value) return
  
  if (!authStore.user) {
    router.push('/login')
    return
  }
  
  isBooking.value = true
  
  try {
    // Build scheduled datetime if scheduled
    let scheduledAt: string | undefined
    if (isScheduled.value && scheduledDate.value && scheduledTime.value) {
      scheduledAt = new Date(`${scheduledDate.value}T${scheduledTime.value}`).toISOString()
    }
    
    const ride = await rideStore.createRideRequest(
      authStore.user.id,
      pickupLocation.value,
      destinationLocation.value,
      rideType.value,
      passengerCount.value,
      specialRequests.value || undefined,
      scheduledAt
    )
    
    if (ride) {
      // Get the current ride from store after creation
      activeRide.value = rideStore.currentRide
      viewMode.value = 'tracking'
      
      // Only find driver immediately if not scheduled
      if (!isScheduled.value) {
        await rideStore.findAndMatchDriver()
      }
    } else {
      alert(rideStore.error || 'ไม่สามารถจองรถได้ กรุณาลองใหม่')
    }
  } catch (error) {
    console.error('Booking error:', error)
    alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
  } finally {
    isBooking.value = false
  }
}

const handleCancelRide = async () => {
  if (!activeRide.value) return
  
  if (confirm('ต้องการยกเลิกการเดินทางนี้หรือไม่?')) {
    const success = await rideStore.cancelRide(activeRide.value.id)
    if (success) {
      resetBooking()
    } else {
      alert('ไม่สามารถยกเลิกได้ กรุณาลองใหม่')
    }
  }
}

const handleRideComplete = () => {
  router.push(`/customer/receipt/${activeRide.value?.id}`)
  resetBooking()
}

const resetBooking = () => {
  activeRide.value = null
  assignedProvider.value = null
  viewMode.value = 'booking'
  step.value = 'pickup'
  pickupAddress.value = ''
  destinationAddress.value = ''
  pickupLocation.value = null
  destinationLocation.value = null
  estimatedFare.value = 0
  estimatedDistance.value = 0
  estimatedTime.value = 0
}

const goBack = () => {
  if (step.value === 'confirm') {
    step.value = 'options'
  } else if (step.value === 'options') {
    step.value = 'destination'
  } else if (step.value === 'destination') {
    step.value = 'pickup'
  } else {
    router.back()
  }
}

const goToStep = (targetStep: 'pickup' | 'destination' | 'options' | 'confirm') => {
  // อนุญาตให้กลับไปขั้นตอนก่อนหน้าเท่านั้น
  const targetIndex = stepLabels.findIndex(s => s.key === targetStep)
  if (targetIndex <= currentStepIndex.value) {
    step.value = targetStep
  }
}

// Mock places for demo
const mockPlaces = [
  { id: '1', name: 'เซ็นทรัลเวิลด์', address: 'ราชดำริ, ปทุมวัน, กรุงเทพฯ', lat: 13.7466, lng: 100.5391 },
  { id: '2', name: 'สยามพารากอน', address: 'พระราม 1, ปทุมวัน, กรุงเทพฯ', lat: 13.7461, lng: 100.5347 },
  { id: '3', name: 'เทอร์มินอล 21', address: 'สุขุมวิท, วัฒนา, กรุงเทพฯ', lat: 13.7377, lng: 100.5603 },
  { id: '4', name: 'เอ็มควอเทียร์', address: 'สุขุมวิท, คลองเตย, กรุงเทพฯ', lat: 13.7314, lng: 100.5697 },
  { id: '5', name: 'ไอคอนสยาม', address: 'เจริญนคร, คลองสาน, กรุงเทพฯ', lat: 13.7267, lng: 100.5100 },
  { id: '6', name: 'สนามบินสุวรรณภูมิ', address: 'บางพลี, สมุทรปราการ', lat: 13.6900, lng: 100.7501 },
  { id: '7', name: 'สนามบินดอนเมือง', address: 'ดอนเมือง, กรุงเทพฯ', lat: 13.9126, lng: 100.6068 },
  { id: '8', name: 'หมอชิต', address: 'จตุจักร, กรุงเทพฯ', lat: 13.8022, lng: 100.5530 }
]

void function searchPickupPlaces() {
  if (pickupSearchQuery.value.length < 2) {
    pickupSearchResults.value = []
    return
  }
  const query = pickupSearchQuery.value.toLowerCase()
  pickupSearchResults.value = mockPlaces.filter(p => 
    p.name.toLowerCase().includes(query) || p.address.toLowerCase().includes(query)
  ).slice(0, 5)
}

void function searchDestPlaces() {
  if (destSearchQuery.value.length < 2) {
    destSearchResults.value = []
    return
  }
  const query = destSearchQuery.value.toLowerCase()
  destSearchResults.value = mockPlaces.filter(p => 
    p.name.toLowerCase().includes(query) || p.address.toLowerCase().includes(query)
  ).slice(0, 5)
}

const selectPickupPlace = (place: typeof mockPlaces[0]) => {
  pickupLocation.value = { lat: place.lat, lng: place.lng, address: place.name }
  pickupAddress.value = place.name
  pickupSearchQuery.value = ''
  pickupSearchResults.value = []
}
void selectPickupPlace // Reserved for non-enhanced usage

const selectDestPlace = async (place: typeof mockPlaces[0]) => {
  destinationLocation.value = { lat: place.lat, lng: place.lng, address: place.name }
  destinationAddress.value = place.name
  destSearchQuery.value = ''
  destSearchResults.value = []
  await calculateFare()
}
void selectDestPlace // Reserved for non-enhanced usage

const useCurrentLocation = async (type: 'pickup' | 'destination') => {
  if (!navigator.geolocation) {
    alert('เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง')
    return
  }
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const loc = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        address: 'ตำแหน่งปัจจุบัน'
      }
      if (type === 'pickup') {
        pickupLocation.value = loc
        pickupAddress.value = loc.address
        await calculateSurge(loc.lat, loc.lng)
        step.value = 'destination'
      } else {
        destinationLocation.value = loc
        destinationAddress.value = loc.address
        await calculateFare()
      }
    },
    () => {
      alert('ไม่สามารถระบุตำแหน่งได้ กรุณาลองใหม่')
    }
  )
}
void useCurrentLocation // Reserved for non-enhanced usage

const clearPickup = () => {
  pickupLocation.value = null
  pickupAddress.value = ''
  pickupSearchQuery.value = ''
}

const handleMapPickerConfirm = async (location: GeoLocation, type: 'pickup' | 'destination') => {
  if (type === 'pickup') {
    pickupLocation.value = location
    pickupAddress.value = location.address
    showPickupMapPicker.value = false
    await calculateSurge(location.lat, location.lng)
    step.value = 'destination'
  } else {
    destinationLocation.value = location
    destinationAddress.value = location.address
    showDestMapPicker.value = false
    await calculateFare()
  }
}

const handleNearbyPlaceSelect = async (place: NearbyPlace) => {
  destinationLocation.value = { lat: place.lat, lng: place.lng, address: place.name }
  destinationAddress.value = place.name
  showNearbyPlaces.value = false
  await calculateFare()
}

const selectSavedPlace = async (place: { name: string; address: string; lat: number; lng: number }) => {
  destinationLocation.value = { lat: place.lat, lng: place.lng, address: place.name }
  destinationAddress.value = place.name
  await calculateFare()
}
void selectSavedPlace // Reserved for non-enhanced usage

const selectRecentPlace = async (place: { name: string; address: string; lat: number; lng: number }) => {
  destinationLocation.value = { lat: place.lat, lng: place.lng, address: place.name }
  destinationAddress.value = place.name
  await calculateFare()
}
void selectRecentPlace // Reserved for non-enhanced usage

const selectFavoritePlace = async (place: { name: string; address: string; lat: number; lng: number }) => {
  destinationLocation.value = { lat: place.lat, lng: place.lng, address: place.name }
  destinationAddress.value = place.name
  await calculateFare()
}
void selectFavoritePlace // Reserved for non-enhanced usage

// Button press states for visual feedback
const pressedButton = ref<string | null>(null)
const isGettingLocation = ref(false)

// Haptic feedback helper
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 25, heavy: 50 }
    navigator.vibrate(patterns[type])
  }
}

// Enhanced button press handler
const handleButtonPress = (buttonId: string) => {
  pressedButton.value = buttonId
  triggerHaptic('light')
}

const handleButtonRelease = () => {
  pressedButton.value = null
}

// Enhanced current location with loading state
const useCurrentLocationEnhanced = async (type: 'pickup' | 'destination') => {
  if (!navigator.geolocation) {
    alert('เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง')
    return
  }
  
  isGettingLocation.value = true
  triggerHaptic('medium')
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const loc = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        address: 'ตำแหน่งปัจจุบัน'
      }
      if (type === 'pickup') {
        pickupLocation.value = loc
        pickupAddress.value = loc.address
        await calculateSurge(loc.lat, loc.lng)
        triggerHaptic('heavy')
        // Small delay for visual feedback before transition
        await new Promise(resolve => setTimeout(resolve, 200))
        step.value = 'destination'
      } else {
        destinationLocation.value = loc
        destinationAddress.value = loc.address
        await calculateFare()
      }
      isGettingLocation.value = false
    },
    () => {
      isGettingLocation.value = false
      alert('ไม่สามารถระบุตำแหน่งได้ กรุณาลองใหม่')
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

// Enhanced step transition
const goToNextStep = async () => {
  triggerHaptic('medium')
  if (step.value === 'pickup' && pickupLocation.value) {
    step.value = 'destination'
  } else if (step.value === 'destination' && destinationLocation.value) {
    await calculateFare()
  } else if (step.value === 'options') {
    step.value = 'confirm'
  }
}

// Enhanced place selection with feedback
void async function selectPickupPlaceEnhanced(place: typeof mockPlaces[0]) {
  triggerHaptic('light')
  pickupLocation.value = { lat: place.lat, lng: place.lng, address: place.name }
  pickupAddress.value = place.name
  pickupSearchQuery.value = ''
  pickupSearchResults.value = []
  // Auto-advance after selection
  await new Promise(resolve => setTimeout(resolve, 150))
  step.value = 'destination'
}

void async function selectDestPlaceEnhanced(place: typeof mockPlaces[0]) {
  triggerHaptic('light')
  destinationLocation.value = { lat: place.lat, lng: place.lng, address: place.name }
  destinationAddress.value = place.name
  destSearchQuery.value = ''
  destSearchResults.value = []
  await calculateFare()
}

const selectSavedPlaceEnhanced = async (place: { name: string; address: string; lat: number; lng: number }) => {
  triggerHaptic('medium')
  destinationLocation.value = { lat: place.lat, lng: place.lng, address: place.name }
  destinationAddress.value = place.name
  await calculateFare()
}

const selectRecentPlaceEnhanced = async (place: { name: string; address: string; lat: number; lng: number }) => {
  triggerHaptic('light')
  destinationLocation.value = { lat: place.lat, lng: place.lng, address: place.name }
  destinationAddress.value = place.name
  await calculateFare()
}

const selectFavoritePlaceEnhanced = async (place: { name: string; address: string; lat: number; lng: number }) => {
  triggerHaptic('light')
  destinationLocation.value = { lat: place.lat, lng: place.lng, address: place.name }
  destinationAddress.value = place.name
  await calculateFare()
}

const selectRideTypeEnhanced = (type: 'standard' | 'premium' | 'shared') => {
  triggerHaptic('light')
  rideType.value = type
  if (estimatedDistance.value > 0) {
    estimatedFare.value = rideStore.calculateFare(estimatedDistance.value, type)
  }
}

watch(rideType, () => {
  if (estimatedDistance.value > 0) {
    estimatedFare.value = rideStore.calculateFare(estimatedDistance.value, rideType.value)
  }
})
</script>

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
      <div class="map-section">
        <MapView
          :pickup="pickupLocation"
          :destination="destinationLocation"
          :show-route="hasRoute"
          height="100%"
          @route-calculated="handleRouteCalculated"
        />
        
        <!-- Top Bar -->
        <div class="top-bar">
          <button class="nav-btn" @click="goBack">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div class="logo-badge">
            <svg viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="#00A86B" stroke-width="2"/>
              <path d="M16 8L22 20H10L16 8Z" fill="#00A86B"/>
              <circle cx="16" cy="18" r="3" fill="#00A86B"/>
            </svg>
            <span>GOBEAR</span>
          </div>
          <button class="nav-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Bottom Panel -->
      <div class="bottom-panel" :class="{ expanded: step === 'options' || step === 'confirm' }">
        <div class="panel-handle"></div>
        
        <!-- Step Indicator -->
        <div class="step-indicator">
          <div 
            v-for="(s, index) in stepLabels" 
            :key="s.key"
            :class="['step-item', { 
              active: s.key === step, 
              completed: index < currentStepIndex,
              clickable: index < currentStepIndex
            }]"
            @click="goToStep(s.key)"
          >
            <div class="step-number">
              <template v-if="index < currentStepIndex">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </template>
              <template v-else>{{ s.number }}</template>
            </div>
            <span class="step-label">{{ s.label }}</span>
          </div>
        </div>

        <!-- Step 1: เลือกจุดรับ -->
        <template v-if="step === 'pickup'">
          <div class="step-content animate-step">
            <!-- Step Header with Icon -->
            <div class="step-header">
              <div class="step-header-icon pickup-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
                </svg>
              </div>
              <div class="step-header-text">
                <h2 class="step-title">คุณอยู่ที่ไหน?</h2>
                <p class="step-desc">เลือกจุดที่ต้องการให้รถมารับ</p>
              </div>
            </div>
            
            <!-- Quick Actions with Enhanced Feedback -->
            <div class="quick-actions-grid">
              <button 
                class="quick-action-card"
                :class="{ 'is-loading': isGettingLocation, 'is-pressed': pressedButton === 'current-loc' }"
                @mousedown="handleButtonPress('current-loc')"
                @mouseup="handleButtonRelease"
                @mouseleave="handleButtonRelease"
                @touchstart="handleButtonPress('current-loc')"
                @touchend="handleButtonRelease"
                @click="useCurrentLocationEnhanced('pickup')"
                :disabled="isGettingLocation"
              >
                <div class="action-card-icon">
                  <template v-if="isGettingLocation">
                    <div class="mini-spinner"></div>
                  </template>
                  <template v-else>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
                    </svg>
                  </template>
                </div>
                <div class="action-card-content">
                  <span class="action-card-title">ตำแหน่งปัจจุบัน</span>
                  <span class="action-card-subtitle">{{ isGettingLocation ? 'กำลังค้นหา...' : 'ใช้ GPS ระบุตำแหน่ง' }}</span>
                </div>
                <div class="action-card-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              </button>
              
              <button 
                class="quick-action-card"
                :class="{ 'is-pressed': pressedButton === 'map-picker' }"
                @mousedown="handleButtonPress('map-picker')"
                @mouseup="handleButtonRelease"
                @mouseleave="handleButtonRelease"
                @touchstart="handleButtonPress('map-picker')"
                @touchend="handleButtonRelease"
                @click="showPickupMapPicker = true; triggerHaptic('light')"
              >
                <div class="action-card-icon map-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div class="action-card-content">
                  <span class="action-card-title">เลือกจากแผนที่</span>
                  <span class="action-card-subtitle">ปักหมุดตำแหน่งบนแผนที่</span>
                </div>
                <div class="action-card-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              </button>
            </div>

            <!-- Selected Pickup Display with Success Animation -->
            <Transition name="scale-fade">
              <div v-if="pickupLocation" class="selected-location-card success">
                <div class="success-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <div class="location-marker pickup">
                  <div class="marker-dot pulse"></div>
                </div>
                <div class="location-info">
                  <span class="location-sublabel">จุดรับ</span>
                  <span class="location-label">{{ pickupAddress }}</span>
                </div>
                <button class="change-btn" @click="clearPickup; triggerHaptic('light')">
                  เปลี่ยน
                </button>
              </div>
            </Transition>

            <!-- Continue Button with Enhanced Style -->
            <Transition name="slide-up">
              <button 
                v-if="pickupLocation" 
                class="continue-btn primary"
                @click="goToNextStep"
              >
                <span>ไปเลือกจุดหมาย</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </Transition>
          </div>
        </template>

        <!-- Step 2: เลือกจุดหมาย -->
        <template v-else-if="step === 'destination'">
          <div class="step-content animate-step">
            <!-- Step Header with Icon -->
            <div class="step-header">
              <div class="step-header-icon destination-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div class="step-header-text">
                <h2 class="step-title">ไปที่ไหน?</h2>
                <p class="step-desc">เลือกจุดหมายปลายทางของคุณ</p>
              </div>
            </div>
            
            <!-- Current Pickup Summary -->
            <div class="route-preview-card">
              <div class="route-preview-item">
                <div class="route-dot pickup"></div>
                <div class="route-preview-text">
                  <span class="route-preview-label">จุดรับ</span>
                  <span class="route-preview-value">{{ pickupAddress }}</span>
                </div>
                <button class="edit-btn" @click="step = 'pickup'; triggerHaptic('light')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
              <div class="route-connector-line"></div>
              <div class="route-preview-item destination-slot">
                <div class="route-dot destination empty"></div>
                <div class="route-preview-text">
                  <span class="route-preview-label">จุดหมาย</span>
                  <span class="route-preview-placeholder">เลือกจุดหมายด้านล่าง</span>
                </div>
              </div>
            </div>

            <!-- Loading State for Places -->
            <div v-if="placesLoading" class="places-loading">
              <div class="loading-shimmer"></div>
              <div class="loading-shimmer"></div>
            </div>

            <!-- Quick Destinations (Home/Work) -->
            <div v-else-if="homePlace || workPlace" class="quick-destinations">
              <h4 class="section-title-small">ไปบ่อย</h4>
              <div class="quick-dest-row">
                <button 
                  v-if="homePlace" 
                  class="quick-dest-chip"
                  :class="{ 'is-pressed': pressedButton === 'home' }"
                  @mousedown="handleButtonPress('home')"
                  @mouseup="handleButtonRelease"
                  @touchstart="handleButtonPress('home')"
                  @touchend="handleButtonRelease"
                  @click="selectSavedPlaceEnhanced(homePlace)"
                >
                  <div class="chip-icon home">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                      <polyline points="9,22 9,12 15,12 15,22"/>
                    </svg>
                  </div>
                  <span>บ้าน</span>
                </button>
                <button 
                  v-if="workPlace" 
                  class="quick-dest-chip"
                  :class="{ 'is-pressed': pressedButton === 'work' }"
                  @mousedown="handleButtonPress('work')"
                  @mouseup="handleButtonRelease"
                  @touchstart="handleButtonPress('work')"
                  @touchend="handleButtonRelease"
                  @click="selectSavedPlaceEnhanced(workPlace)"
                >
                  <div class="chip-icon work">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                    </svg>
                  </div>
                  <span>ที่ทำงาน</span>
                </button>
                <button 
                  class="quick-dest-chip nearby"
                  :class="{ 'is-pressed': pressedButton === 'nearby' }"
                  @mousedown="handleButtonPress('nearby')"
                  @mouseup="handleButtonRelease"
                  @touchstart="handleButtonPress('nearby')"
                  @touchend="handleButtonRelease"
                  @click="showNearbyPlaces = true; triggerHaptic('light')"
                >
                  <div class="chip-icon nearby">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
                    </svg>
                  </div>
                  <span>ใกล้เคียง</span>
                </button>
              </div>
            </div>

            <!-- Map Picker Button -->
            <button 
              class="map-picker-btn"
              @click="showDestMapPicker = true; triggerHaptic('light')"
            >
              <div class="map-picker-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div class="map-picker-text">
                <span class="map-picker-title">เลือกจากแผนที่</span>
                <span class="map-picker-subtitle">ปักหมุดตำแหน่งที่ต้องการ</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="map-picker-arrow">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>

            <!-- Favorite Places -->
            <div v-if="favoritePlaces.length > 0 && !destSearchQuery" class="places-section">
              <h4 class="section-title-small">สถานที่โปรด</h4>
              <div class="places-list">
                <button 
                  v-for="(place, index) in favoritePlaces" 
                  :key="place.id"
                  class="place-item animate-item"
                  :style="{ animationDelay: `${index * 50}ms` }"
                  @click="selectFavoritePlaceEnhanced(place)"
                >
                  <div class="place-icon favorite">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                    </svg>
                  </div>
                  <div class="place-info">
                    <span class="place-name">{{ place.name }}</span>
                    <span class="place-address">{{ place.address }}</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Recent Places -->
            <div v-if="recentPlaces.length > 0 && !destSearchQuery" class="places-section">
              <h4 class="section-title-small">เคยไปเมื่อเร็วๆ นี้</h4>
              <div class="places-list">
                <button 
                  v-for="(place, index) in recentPlaces.slice(0, 5)" 
                  :key="place.id"
                  class="place-item animate-item"
                  :style="{ animationDelay: `${(index + favoritePlaces.length) * 50}ms` }"
                  @click="selectRecentPlaceEnhanced(place)"
                >
                  <div class="place-icon recent">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12,6 12,12 16,14"/>
                    </svg>
                  </div>
                  <div class="place-info">
                    <span class="place-name">{{ place.name }}</span>
                    <span class="place-address">{{ place.address }}</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Loading state -->
            <Transition name="fade">
              <div v-if="isCalculating" class="calculating-overlay">
                <div class="calculating-content">
                  <div class="calculating-spinner"></div>
                  <span class="calculating-text">กำลังคำนวณเส้นทาง...</span>
                  <span class="calculating-subtext">รอสักครู่</span>
                </div>
              </div>
            </Transition>
          </div>
        </template>

        <!-- Step 3: เลือกประเภทรถ -->
        <template v-else-if="step === 'options'">
          <div class="step-content animate-step">
            <!-- Step Header with Icon -->
            <div class="step-header">
              <div class="step-header-icon options-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="3" width="15" height="13" rx="2"/>
                  <path d="M16 8h4a2 2 0 012 2v6a2 2 0 01-2 2h-4"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/>
                  <circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
              </div>
              <div class="step-header-text">
                <h2 class="step-title">เลือกประเภทรถ</h2>
                <p class="step-desc">เลือกรถที่เหมาะกับการเดินทางของคุณ</p>
              </div>
            </div>

            <!-- Route Summary Card Enhanced -->
            <div class="route-summary-card-enhanced">
              <div class="route-summary-header">
                <div class="route-summary-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                  </svg>
                </div>
                <span class="route-summary-title">เส้นทางของคุณ</span>
                <button class="edit-route-btn" @click="step = 'pickup'; triggerHaptic('light')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
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
                    <span class="route-point-value">{{ destinationAddress }}</span>
                  </div>
                </div>
              </div>
              <div class="route-stats-enhanced">
                <div class="stat-chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                  <span>{{ estimatedDistance.toFixed(1) }} กม.</span>
                </div>
                <div class="stat-chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  <span>~{{ estimatedTime }} นาที</span>
                </div>
              </div>
            </div>

            <!-- Schedule Badge -->
            <div class="schedule-section">
              <button class="schedule-badge-enhanced" :class="{ scheduled: isScheduled }" @click="openScheduleSheet">
                <div class="schedule-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                </div>
                <div class="schedule-text">
                  <span class="schedule-label">เวลาออกเดินทาง</span>
                  <span class="schedule-value">{{ scheduleDisplayText }}</span>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="schedule-arrow">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
            </div>

            <!-- Ride Options Enhanced -->
            <div class="ride-options-enhanced">
              <button
                v-for="(type, index) in rideTypes"
                :key="type.value"
                @click="selectRideTypeEnhanced(type.value)"
                :class="['ride-option-enhanced', { 
                  active: rideType === type.value,
                  'is-pressed': pressedButton === `ride-${type.value}`
                }]"
                :style="{ animationDelay: `${index * 80}ms` }"
                @mousedown="handleButtonPress(`ride-${type.value}`)"
                @mouseup="handleButtonRelease"
                @touchstart="handleButtonPress(`ride-${type.value}`)"
                @touchend="handleButtonRelease"
              >
                <div class="ride-option-left">
                  <div :class="['ride-icon-enhanced', type.value]">
                    <svg viewBox="0 0 48 48" fill="none">
                      <rect x="4" y="18" width="40" height="18" rx="4" :fill="type.value === 'premium' ? '#1A1A1A' : type.value === 'shared' ? '#6366F1' : '#00A86B'"/>
                      <rect x="8" y="10" width="32" height="14" rx="4" :fill="type.value === 'premium' ? '#1A1A1A' : type.value === 'shared' ? '#6366F1' : '#00A86B'"/>
                      <rect x="12" y="12" width="10" height="8" rx="2" :fill="type.value === 'premium' ? '#4A4A4A' : type.value === 'shared' ? '#A5B4FC' : '#E8F5EF'"/>
                      <rect x="26" y="12" width="10" height="8" rx="2" :fill="type.value === 'premium' ? '#4A4A4A' : type.value === 'shared' ? '#A5B4FC' : '#E8F5EF'"/>
                      <circle cx="14" cy="36" r="5" fill="#333"/>
                      <circle cx="34" cy="36" r="5" fill="#333"/>
                    </svg>
                  </div>
                  <div class="ride-option-info">
                    <div class="ride-option-header">
                      <span class="ride-option-name">{{ type.label }}</span>
                      <span v-if="type.value === 'shared'" class="ride-badge eco">ประหยัด</span>
                      <span v-if="type.value === 'premium'" class="ride-badge premium">หรู</span>
                    </div>
                    <div class="ride-option-meta">
                      <span class="eta-badge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 6v6l4 2"/>
                        </svg>
                        {{ type.eta }}
                      </span>
                      <span class="capacity-badge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="8" r="4"/>
                          <path d="M20 21a8 8 0 10-16 0"/>
                        </svg>
                        {{ type.capacity }}
                      </span>
                    </div>
                    <p class="ride-option-desc">{{ type.description }}</p>
                  </div>
                </div>
                <div class="ride-option-right">
                  <span class="ride-option-price">฿{{ rideStore.calculateFare(estimatedDistance, type.value) }}</span>
                  <Transition name="scale-fade">
                    <div v-if="rideType === type.value" class="ride-check-enhanced">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <path d="M20 6L9 17l-5-5"/>
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <div class="surge-text">
                  <span class="surge-title">ช่วงเวลาเร่งด่วน</span>
                  <span class="surge-desc">ค่าโดยสารเพิ่มขึ้น x{{ surgeMultiplier.toFixed(1) }}</span>
                </div>
              </div>
            </Transition>

            <!-- Continue Button Enhanced -->
            <button 
              @click="step = 'confirm'; triggerHaptic('medium')" 
              class="continue-btn primary"
            >
              <span>ดำเนินการต่อ</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </template>

        <!-- Step 4: ยืนยันการจอง -->
        <template v-else-if="step === 'confirm'">
          <div class="step-content animate-step">
            <!-- Step Header with Icon -->
            <div class="step-header">
              <div class="step-header-icon confirm-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 12l2 2 4-4"/>
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              </div>
              <div class="step-header-text">
                <h2 class="step-title">ยืนยันการจอง</h2>
                <p class="step-desc">ตรวจสอบรายละเอียดก่อนจอง</p>
              </div>
            </div>
            
            <!-- Confirm Route Card Enhanced -->
            <div class="confirm-route-card-enhanced">
              <div class="confirm-route-header">
                <span class="confirm-route-title">เส้นทาง</span>
                <button class="edit-link" @click="step = 'pickup'; triggerHaptic('light')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
              <div class="confirm-route-body">
                <div class="confirm-route-point">
                  <div class="confirm-dot pickup"></div>
                  <div class="confirm-route-text">
                    <span class="confirm-route-label">จุดรับ</span>
                    <span class="confirm-route-value">{{ pickupAddress }}</span>
                  </div>
                </div>
                <div class="confirm-route-line"></div>
                <div class="confirm-route-point">
                  <div class="confirm-dot destination"></div>
                  <div class="confirm-route-text">
                    <span class="confirm-route-label">จุดหมาย</span>
                    <span class="confirm-route-value">{{ destinationAddress }}</span>
                  </div>
                </div>
              </div>
              <div class="confirm-route-stats">
                <div class="confirm-stat">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                  <span>{{ estimatedDistance.toFixed(1) }} กม.</span>
                </div>
                <div class="confirm-stat-divider"></div>
                <div class="confirm-stat">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  <span>~{{ estimatedTime }} นาที</span>
                </div>
              </div>
            </div>

            <!-- Selected Ride Type Enhanced -->
            <div class="selected-ride-card-enhanced">
              <div class="selected-ride-header">
                <span class="selected-ride-title">ประเภทรถ</span>
                <button class="edit-link" @click="step = 'options'; triggerHaptic('light')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
              <div class="selected-ride-body">
                <div :class="['selected-ride-icon', rideType]">
                  <svg viewBox="0 0 48 48" fill="none">
                    <rect x="4" y="18" width="40" height="18" rx="4" :fill="rideType === 'premium' ? '#1A1A1A' : rideType === 'shared' ? '#6366F1' : '#00A86B'"/>
                    <rect x="8" y="10" width="32" height="14" rx="4" :fill="rideType === 'premium' ? '#1A1A1A' : rideType === 'shared' ? '#6366F1' : '#00A86B'"/>
                    <circle cx="14" cy="36" r="5" fill="#333"/>
                    <circle cx="34" cy="36" r="5" fill="#333"/>
                  </svg>
                </div>
                <div class="selected-ride-info">
                  <div class="selected-ride-name-row">
                    <span class="selected-ride-name">{{ selectedRideType.label }}</span>
                    <span v-if="rideType === 'shared'" class="ride-badge eco small">ประหยัด</span>
                    <span v-if="rideType === 'premium'" class="ride-badge premium small">หรู</span>
                  </div>
                  <span class="selected-ride-desc">{{ selectedRideType.description }}</span>
                  <div class="selected-ride-meta">
                    <span>{{ selectedRideType.eta }}</span>
                    <span class="meta-separator">•</span>
                    <span>{{ selectedRideType.capacity }} ที่นั่ง</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Payment Method Enhanced -->
            <div 
              class="payment-method-card-enhanced"
              :class="{ 'is-pressed': pressedButton === 'payment' }"
              @mousedown="handleButtonPress('payment')"
              @mouseup="handleButtonRelease"
              @touchstart="handleButtonPress('payment')"
              @touchend="handleButtonRelease"
              @click="showPaymentSheet = true; triggerHaptic('light')"
            >
              <div class="payment-method-header">
                <span class="payment-method-title">วิธีชำระเงิน</span>
              </div>
              <div class="payment-method-body">
                <div class="payment-method-icon">
                  <svg v-if="paymentMethod === 'cash'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="1" y="4" width="22" height="16" rx="2"/>
                    <circle cx="12" cy="12" r="4"/>
                    <path d="M1 10h2M21 10h2M1 14h2M21 14h2"/>
                  </svg>
                  <svg v-else-if="paymentMethod === 'wallet'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5z"/>
                    <path d="M16 12h5v4h-5a2 2 0 010-4z"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="1" y="4" width="22" height="16" rx="2"/>
                    <path d="M1 10h22"/>
                  </svg>
                </div>
                <div class="payment-method-info">
                  <span class="payment-method-value">{{ paymentMethods.find(p => p.value === paymentMethod)?.label }}</span>
                  <span class="payment-method-hint">แตะเพื่อเปลี่ยน</span>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="payment-arrow">
                  <path d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </div>

            <!-- Fare Summary Enhanced -->
            <div class="fare-summary-enhanced">
              <div class="fare-summary-header">
                <span class="fare-summary-title">สรุปค่าโดยสาร</span>
              </div>
              <div class="fare-summary-body">
                <div class="fare-row-enhanced">
                  <span class="fare-row-label">ค่าโดยสาร ({{ selectedRideType.label }})</span>
                  <span class="fare-row-value">฿{{ estimatedFare.toFixed(0) }}</span>
                </div>
                <div class="fare-row-enhanced">
                  <span class="fare-row-label">ระยะทาง</span>
                  <span class="fare-row-value">{{ estimatedDistance.toFixed(1) }} กม.</span>
                </div>
                <div class="fare-row-enhanced">
                  <span class="fare-row-label">เวลาโดยประมาณ</span>
                  <span class="fare-row-value">~{{ estimatedTime }} นาที</span>
                </div>
                <Transition name="slide-fade">
                  <div v-if="surgeMultiplier > 1" class="fare-row-enhanced surge">
                    <div class="surge-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                      </svg>
                      <span>ช่วงเร่งด่วน (x{{ surgeMultiplier.toFixed(1) }})</span>
                    </div>
                    <span class="fare-row-value surge">+฿{{ (estimatedFare * (surgeMultiplier - 1)).toFixed(0) }}</span>
                  </div>
                </Transition>
                <div class="fare-divider"></div>
                <div class="fare-row-enhanced total">
                  <span class="fare-row-label">รวมทั้งหมด</span>
                  <span class="fare-row-value total">฿{{ finalFare }}</span>
                </div>
              </div>
            </div>

            <!-- Confirm Book Button Enhanced -->
            <button 
              @click="bookRide" 
              :disabled="isBooking" 
              :class="['confirm-book-btn', { 'is-loading': isBooking }]"
            >
              <template v-if="isBooking">
                <div class="booking-spinner"></div>
                <div class="booking-text">
                  <span class="booking-title">กำลังค้นหาคนขับ...</span>
                  <span class="booking-subtitle">รอสักครู่</span>
                </div>
              </template>
              <template v-else>
                <div class="confirm-btn-content">
                  <span class="confirm-btn-text">ยืนยันการจอง</span>
                  <span class="confirm-btn-price">฿{{ finalFare }}</span>
                </div>
                <div class="confirm-btn-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              </template>
            </button>

            <!-- Safety Note -->
            <div class="safety-note">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div class="schedule-option-text">
            <span class="schedule-option-title">เดินทางตอนนี้</span>
            <span class="schedule-option-desc">รถจะมารับทันที</span>
          </div>
          <div v-if="!isScheduled" class="schedule-check">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M20 6L9 17l-5-5"/>
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
              <path d="M12 14v3l2 1"/>
            </svg>
          </div>
          <div class="schedule-option-text">
            <span class="schedule-option-title">จองล่วงหน้า</span>
            <span class="schedule-option-desc">เลือกวันและเวลาที่ต้องการ</span>
          </div>
          <div v-if="isScheduled" class="schedule-check">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
        </button>

        <!-- Date/Time Picker (show when schedule later is selected) -->
        <Transition name="slide-fade">
          <div v-if="isScheduled" class="schedule-datetime-picker">
            <div class="datetime-row">
              <label class="datetime-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
                วันที่
              </label>
              <input 
                type="date" 
                v-model="scheduledDate"
                :min="getMinDate()"
                :max="getMaxDate()"
                class="datetime-input"
              />
            </div>
            <div class="datetime-row">
              <label class="datetime-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                เวลา
              </label>
              <input 
                type="time" 
                v-model="scheduledTime"
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
                @click="() => {
                  const d = new Date()
                  d.setMinutes(d.getMinutes() + mins)
                  scheduledDate = d.toISOString().split('T')[0] || ''
                  scheduledTime = d.toTimeString().slice(0, 5)
                }"
              >
                {{ mins < 60 ? `${mins} นาที` : `${mins / 60} ชม.` }}
              </button>
            </div>
          </div>
        </Transition>

        <!-- Recurring Rides Link -->
        <button class="recurring-link" @click="showScheduleSheet = false; openRecurringSheet()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 2.1l4 4-4 4"/>
            <path d="M3 12.2v-2a4 4 0 014-4h12.8"/>
            <path d="M7 21.9l-4-4 4-4"/>
            <path d="M21 11.8v2a4 4 0 01-4 4H4.2"/>
          </svg>
          <span>จัดการการจองประจำ</span>
          <span class="recurring-count" v-if="activeTemplates.length > 0">{{ activeTemplates.length }}</span>
        </button>

        <!-- Confirm Button -->
        <button 
          class="schedule-confirm-btn"
          @click="confirmSchedule"
          :disabled="isScheduled && (!scheduledDate || !scheduledTime)"
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
        
        <div v-else-if="recurringTemplates.length === 0" class="recurring-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M17 2.1l4 4-4 4"/>
            <path d="M3 12.2v-2a4 4 0 014-4h12.8"/>
            <path d="M7 21.9l-4-4 4-4"/>
            <path d="M21 11.8v2a4 4 0 01-4 4H4.2"/>
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
            <div class="recurring-item-main" @click="useRecurringTemplate(template)">
              <div class="recurring-item-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 2.1l4 4-4 4"/>
                  <path d="M3 12.2v-2a4 4 0 014-4h12.8"/>
                </svg>
              </div>
              <div class="recurring-item-info">
                <span class="recurring-item-name">{{ template.name || 'การจองประจำ' }}</span>
                <span class="recurring-item-route">{{ template.pickup_address }} → {{ template.destination_address }}</span>
                <span class="recurring-item-schedule">{{ formatSchedule(template) }}</span>
                <span class="recurring-item-next" v-if="template.is_active">
                  ครั้งถัดไป: {{ getNextScheduleDisplay(template) }}
                </span>
              </div>
            </div>
            <div class="recurring-item-actions">
              <button 
                class="recurring-action-btn toggle"
                :class="{ active: template.is_active }"
                @click.stop="toggleTemplate(template.id)"
                :title="template.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'"
              >
                <svg v-if="template.is_active" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18.36 6.64a9 9 0 11-12.73 0"/>
                  <line x1="12" y1="2" x2="12" y2="12"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polygon points="10,8 16,12 10,16"/>
                </svg>
              </button>
              <button 
                class="recurring-action-btn delete"
                @click.stop="deleteTemplate(template.id)"
                title="ลบ"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
                  <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Create New Button -->
        <button 
          class="create-recurring-btn"
          @click="showRecurringSheet = false; showCreateRecurringModal = true"
          :disabled="!pickupLocation || !destinationLocation"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v8M8 12h8"/>
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
            <span>{{ pickupAddress || 'จุดรับ' }}</span>
          </div>
          <div class="route-line"></div>
          <div class="route-point">
            <span class="route-dot destination"></span>
            <span>{{ destinationAddress || 'จุดหมาย' }}</span>
          </div>
        </div>

        <!-- Name Input -->
        <div class="form-group">
          <label>ชื่อการจอง (ไม่บังคับ)</label>
          <input 
            type="text" 
            v-model="recurringName"
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
          <div v-if="recurringScheduleType === 'weekly' || recurringScheduleType === 'custom'" class="form-group">
            <label>เลือกวัน</label>
            <div class="day-selector">
              <button 
                v-for="(label, index) in dayLabels"
                :key="index"
                class="day-btn"
                :class="{ active: recurringScheduleDays.includes(index) }"
                @click="() => {
                  if (recurringScheduleDays.includes(index)) {
                    recurringScheduleDays = recurringScheduleDays.filter(d => d !== index)
                  } else {
                    recurringScheduleDays = [...recurringScheduleDays, index].sort()
                  }
                }"
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
            type="time" 
            v-model="recurringScheduleTime"
            class="form-input time-input"
          />
        </div>

        <!-- Save Button -->
        <button 
          class="save-recurring-btn"
          @click="saveAsRecurring"
          :disabled="recurringLoading || (recurringScheduleType === 'weekly' && recurringScheduleDays.length === 0)"
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
          @click="paymentMethod = method.value; showPaymentSheet = false"
          :class="['payment-option', { active: paymentMethod === method.value }]"
        >
          <span>{{ method.label }}</span>
          <div v-if="paymentMethod === method.value" class="check-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
        </button>
      </div>
    </BottomSheet>

    <!-- Promo Sheet -->
    <BottomSheet v-model="showPromoSheet" title="โค้ดส่วนลด">
      <div class="promo-input-section">
        <input v-model="promoCode" type="text" placeholder="ใส่โค้ดส่วนลด" class="promo-input" />
        <button @click="showPromoSheet = false" class="apply-btn">ใช้</button>
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

    <!-- Bottom Navigation -->
    <BottomNavigation
      active-tab="services"
      :history-badge="unratedRidesCount"
      @navigate="navigateTo"
    />
  </div>
</template>

<style scoped>
.ride-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
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
  background: #FFFFFF;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.nav-btn svg {
  width: 24px;
  height: 24px;
  color: #1A1A1A;
}

.nav-btn:active {
  transform: scale(0.95);
}

.logo-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #FFFFFF;
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
  color: #00A86B;
  letter-spacing: 0.5px;
}

/* Bottom Panel */
.bottom-panel {
  flex: 1;
  min-height: 0;
  background: #FFFFFF;
  border-radius: 28px 28px 0 0;
  margin-top: -24px;
  padding: 12px 20px 90px; /* Extra padding for inline bottom nav */
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
  background: #E0E0E0;
  border-radius: 2px;
  margin: 0 auto 12px;
}

/* Step Indicator */
.step-indicator {
  display: flex;
  justify-content: space-between;
  padding: 0 8px;
  margin-bottom: 16px;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
  position: relative;
}

.step-item:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 14px;
  left: calc(50% + 18px);
  width: calc(100% - 36px);
  height: 2px;
  background: #E8E8E8;
}

.step-item.completed:not(:last-child)::after {
  background: #00A86B;
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  background: #F5F5F5;
  color: #999999;
  position: relative;
  z-index: 1;
}

.step-item.active .step-number {
  background: #00A86B;
  color: #FFFFFF;
}

.step-item.completed .step-number {
  background: #00A86B;
  color: #FFFFFF;
}

.step-item.completed .step-number svg {
  width: 14px;
  height: 14px;
}

.step-item.clickable {
  cursor: pointer;
}

.step-label {
  font-size: 11px;
  font-weight: 500;
  color: #999999;
  text-align: center;
}

.step-item.active .step-label {
  color: #00A86B;
  font-weight: 600;
}

.step-item.completed .step-label {
  color: #00A86B;
}

/* Step Content */
.step-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.step-title {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
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
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-action-btn:hover {
  border-color: #00A86B;
  background: #F8FDF9;
}

.quick-action-btn:active {
  transform: scale(0.98);
}

.action-icon {
  width: 36px;
  height: 36px;
  background: #E8F5EF;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
}

.action-icon svg {
  width: 18px;
  height: 18px;
}

.action-icon.nearby {
  background: #FFF3E0;
  color: #F5A623;
}

.quick-action-btn span {
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
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
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.saved-place-btn:hover {
  border-color: #00A86B;
  background: #F8FDF9;
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
  background: #E3F2FD;
  color: #1976D2;
}

.saved-icon.work {
  background: #F3E5F5;
  color: #7B1FA2;
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
  color: #1A1A1A;
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
  background: linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%);
  background-size: 200% 100%;
  border-radius: 12px;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
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
  background: #FFFBEB;
  border: 1px solid #FEF3C7;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.favorite-place-item:hover {
  background: #FEF3C7;
  border-color: #FCD34D;
}

.favorite-place-item:active {
  transform: scale(0.99);
}

.favorite-icon {
  width: 36px;
  height: 36px;
  background: #FEF3C7;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #F59E0B;
  flex-shrink: 0;
}

.favorite-icon svg {
  width: 18px;
  height: 18px;
  fill: #F59E0B;
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
  color: #1A1A1A;
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
  color: #1A1A1A;
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
  background: #F8F8F8;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.recent-place-item:hover {
  background: #F0F0F0;
}

.recent-place-item:active {
  transform: scale(0.99);
}

.recent-icon {
  width: 36px;
  height: 36px;
  background: #FFFFFF;
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
  color: #1A1A1A;
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
  background: #F5F5F5;
  border: 2px solid transparent;
  border-radius: 12px;
  transition: all 0.2s;
}

.search-input-wrapper:focus-within {
  background: #FFFFFF;
  border-color: #00A86B;
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
  color: #1A1A1A;
  outline: none;
}

.search-input::placeholder {
  color: #999999;
}

/* Search Results */
.search-results {
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
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
  border-bottom: 1px solid #F0F0F0;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background: #F8FDF9;
}

.search-result-item:active {
  background: #E8F5EF;
}

.result-icon {
  width: 36px;
  height: 36px;
  background: #E8F5EF;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
  flex-shrink: 0;
}

.result-icon svg {
  width: 18px;
  height: 18px;
}

.result-icon.destination {
  background: #FFEBEE;
  color: #E53935;
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
  color: #1A1A1A;
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
  background: #E8F5EF;
  border: 2px solid #00A86B;
  border-radius: 14px;
}

.selected-location-card.compact {
  background: #F5F5F5;
  border: 1px solid #E8E8E8;
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
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #00A86B;
  cursor: pointer;
}

.change-btn:active {
  background: #F5F5F5;
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
  background: #F5F5F5;
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
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.route-line {
  width: 2px;
  height: 16px;
  background: #E8E8E8;
  margin-left: 11px;
}

.route-stats {
  display: flex;
  gap: 24px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #E8E8E8;
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.stat svg {
  width: 18px;
  height: 18px;
  color: #00A86B;
}

/* Confirm Route Card */
.confirm-route-card {
  background: #F5F5F5;
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
  color: #1A1A1A;
}

.route-connector {
  width: 2px;
  height: 20px;
  background: #E8E8E8;
  margin: 4px 0 4px 11px;
}

/* Selected Ride Card */
.selected-ride-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
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
  color: #1A1A1A;
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
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 14px;
  cursor: pointer;
}

.payment-method-card:active {
  background: #F5F5F5;
}

.payment-icon {
  width: 40px;
  height: 40px;
  background: #E8F5EF;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
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
  color: #1A1A1A;
}

.arrow-icon {
  width: 20px;
  height: 20px;
  color: #CCCCCC;
}

/* Confirm Button */
.confirm-btn {
  margin-top: 8px;
}

/* Location Card - Legacy (kept for reference) */
.location-card {
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
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
  background: #00A86B;
}

.location-marker.destination .marker-dot {
  background: #E53935;
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
  color: #1A1A1A;
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
  color: #CCCCCC;
}

.location-arrow svg {
  width: 20px;
  height: 20px;
}

.location-divider {
  height: 1px;
  background: #F0F0F0;
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
  color: #1A1A1A;
  margin: 0;
}

.schedule-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #E8F5EF;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #00A86B;
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
  background: #FFFFFF;
  border: 2px solid #F0F0F0;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.ride-option:active {
  transform: scale(0.98);
}

.ride-option.active {
  border-color: #00A86B;
  background: #F8FDF9;
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
  color: #1A1A1A;
}

.ride-price {
  font-size: 15px;
  font-weight: 700;
  color: #1A1A1A;
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
  background: #00A86B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
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
  background: #00A86B;
  color: #FFFFFF;
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
  background: #008F5B;
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
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Driver Card */
.driver-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #F5F5F5;
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
  color: #1A1A1A;
  margin: 0 0 4px;
}

.driver-info p {
  font-size: 13px;
  color: #666666;
  margin: 0;
}

.driver-plate {
  padding: 6px 12px;
  background: #FFFFFF;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #1A1A1A;
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
  color: #1A1A1A;
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
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  cursor: pointer;
}

.action-btn svg {
  width: 20px;
  height: 20px;
}

.action-btn.share {
  background: #00A86B;
  border-color: #00A86B;
  color: #FFFFFF;
}

.action-btn:active {
  transform: scale(0.98);
}

/* Fare Summary */
.fare-summary {
  background: #F5F5F5;
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
  color: #E65100;
}

.fare-row.total {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
  border-top: 1px solid #E8E8E8;
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
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  color: #1A1A1A;
  cursor: pointer;
}

.payment-option.active {
  border-color: #00A86B;
  background: #F8FDF9;
}

.check-mark {
  width: 24px;
  height: 24px;
  background: #00A86B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
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
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 16px;
}

.promo-input:focus {
  outline: none;
  border-color: #00A86B;
}

.apply-btn {
  width: 100%;
  padding: 16px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

/* ========================================
   ENHANCED UX STYLES
   ======================================== */

/* Step Animation */
.animate-step {
  animation: stepFadeIn 0.4s ease-out;
}

@keyframes stepFadeIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
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
  background: #E8F5EF;
  color: #00A86B;
}

.step-header-icon.destination-icon {
  background: #FFEBEE;
  color: #E53935;
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
  background: #FFFFFF;
  border: 1.5px solid #E8E8E8;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.quick-action-card:hover {
  border-color: #00A86B;
  background: #FAFFFE;
}

.quick-action-card:active,
.quick-action-card.is-pressed {
  transform: scale(0.98);
  background: #F0FDF4;
}

.quick-action-card.is-loading {
  opacity: 0.8;
  pointer-events: none;
}

.action-card-icon {
  width: 44px;
  height: 44px;
  background: #E8F5EF;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
  flex-shrink: 0;
}

.action-card-icon svg {
  width: 22px;
  height: 22px;
}

.action-card-icon.map-icon {
  background: #E3F2FD;
  color: #1976D2;
}

.action-card-content {
  flex: 1;
  min-width: 0;
}

.action-card-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
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
  color: #CCCCCC;
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
  border: 2px solid #E8F5EF;
  border-top-color: #00A86B;
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
  content: '';
  flex: 1;
  height: 1px;
  background: #E8E8E8;
}

.section-divider span {
  font-size: 12px;
  color: #999999;
  white-space: nowrap;
}

/* Enhanced Search Input */
.search-input-wrapper.enhanced {
  background: #F8F8F8;
  border: 2px solid #F0F0F0;
  padding: 16px;
}

.search-input-wrapper.enhanced.large {
  padding: 18px;
}

.search-input-wrapper.enhanced:focus-within {
  background: #FFFFFF;
  border-color: #00A86B;
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
  color: #CCCCCC;
  flex-shrink: 0;
}

.result-arrow svg {
  width: 100%;
  height: 100%;
}

/* Selected Location Card Success */
.selected-location-card.success {
  background: #F0FDF4;
  border: 2px solid #00A86B;
  position: relative;
}

.success-check {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  background: #00A86B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
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
  0%, 100% {
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
}

.continue-btn.primary {
  background: #00A86B;
  color: #FFFFFF;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.continue-btn.primary:hover {
  background: #008F5B;
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
  background: #F8F8F8;
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
  background: #00A86B;
}

.route-dot.destination {
  background: #E53935;
}

.route-dot.destination.empty {
  background: transparent;
  border: 2px dashed #E53935;
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
  color: #1A1A1A;
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
  background: #FFFFFF;
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
  background: #F0F0F0;
  color: #1A1A1A;
}

.route-connector-line {
  width: 2px;
  height: 20px;
  background: linear-gradient(to bottom, #00A86B, #E53935);
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
  background: #FFFFFF;
  border: 1.5px solid #E8E8E8;
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-dest-chip:hover {
  border-color: #00A86B;
  background: #FAFFFE;
}

.quick-dest-chip:active,
.quick-dest-chip.is-pressed {
  transform: scale(0.96);
  background: #F0FDF4;
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
  background: #E3F2FD;
  color: #1976D2;
}

.chip-icon.work {
  background: #F3E5F5;
  color: #7B1FA2;
}

.chip-icon.nearby {
  background: #FFF3E0;
  color: #F5A623;
}

.quick-dest-chip span {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
}

/* Map Picker Button */
.map-picker-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: #FFFFFF;
  border: 1.5px dashed #CCCCCC;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.map-picker-btn:hover {
  border-color: #00A86B;
  border-style: solid;
  background: #FAFFFE;
}

.map-picker-btn:active {
  transform: scale(0.98);
}

.map-picker-icon {
  width: 44px;
  height: 44px;
  background: #E3F2FD;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1976D2;
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
  color: #1A1A1A;
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
  color: #CCCCCC;
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
  background: #FFFFFF;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.place-item:hover {
  background: #F5F5F5;
}

.place-item:active {
  transform: scale(0.99);
  background: #F0F0F0;
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
  background: #FEF3C7;
  color: #F59E0B;
}

.place-icon.recent {
  background: #F3F4F6;
  color: #6B7280;
}

.place-info {
  flex: 1;
  min-width: 0;
}

.place-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
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
  border: 3px solid #E8F5EF;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.calculating-text {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.calculating-subtext {
  font-size: 13px;
  color: #666666;
}

/* Vue Transitions */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.scale-fade-enter-active {
  transition: all 0.3s ease-out;
}

.scale-fade-leave-active {
  transition: all 0.2s ease-in;
}

.scale-fade-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.scale-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.slide-up-enter-active {
  transition: all 0.3s ease-out;
}

.slide-up-leave-active {
  transition: all 0.2s ease-in;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ========================================
   STEP 3 ENHANCED STYLES
   ======================================== */

.step-header-icon.options-icon {
  background: #EEF2FF;
  color: #6366F1;
}

/* Route Summary Card Enhanced */
.route-summary-card-enhanced {
  background: #F8F8F8;
  border-radius: 16px;
  overflow: hidden;
}

.route-summary-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: #FFFFFF;
  border-bottom: 1px solid #F0F0F0;
}

.route-summary-icon {
  width: 32px;
  height: 32px;
  background: #E8F5EF;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
}

.route-summary-icon svg {
  width: 16px;
  height: 16px;
}

.route-summary-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.edit-route-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: transparent;
  border: none;
  color: #00A86B;
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
  background: #00A86B;
}

.route-dot-enhanced.destination {
  background: #E53935;
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
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.route-connector-enhanced {
  width: 2px;
  height: 24px;
  background: linear-gradient(to bottom, #00A86B, #E53935);
  margin: 8px 0 8px 5px;
}

.route-stats-enhanced {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: #FFFFFF;
  border-top: 1px solid #F0F0F0;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #F5F5F5;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
}

.stat-chip svg {
  width: 14px;
  height: 14px;
  color: #00A86B;
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
  background: #FFFFFF;
  border: 1.5px solid #E8E8E8;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.schedule-badge-enhanced:hover {
  border-color: #00A86B;
  background: #FAFFFE;
}

.schedule-badge-enhanced:active {
  transform: scale(0.98);
}

.schedule-badge-enhanced.scheduled {
  border-color: #00A86B;
  background: #E8F5EF;
}

.schedule-badge-enhanced.scheduled .schedule-icon {
  background: #00A86B;
  color: #FFFFFF;
}

.schedule-badge-enhanced.scheduled .schedule-value {
  color: #00A86B;
}

.schedule-icon {
  width: 40px;
  height: 40px;
  background: #E8F5EF;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
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
  color: #1A1A1A;
}

.schedule-arrow {
  width: 20px;
  height: 20px;
  color: #CCCCCC;
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
  background: #FFFFFF;
  border: 2px solid #F0F0F0;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  animation: itemSlideIn 0.3s ease-out forwards;
  opacity: 0;
}

.ride-option-enhanced:hover {
  border-color: #E0E0E0;
  background: #FAFAFA;
}

.ride-option-enhanced:active,
.ride-option-enhanced.is-pressed {
  transform: scale(0.98);
}

.ride-option-enhanced.active {
  border-color: #00A86B;
  background: #F8FDF9;
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
  color: #1A1A1A;
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
  background: #DCFCE7;
  color: #16A34A;
}

.ride-badge.premium {
  background: #1A1A1A;
  color: #FFFFFF;
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
  color: #1A1A1A;
}

.ride-check-enhanced {
  width: 28px;
  height: 28px;
  background: #00A86B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
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
  background: #FFF7ED;
  border: 1px solid #FFEDD5;
  border-radius: 12px;
}

.surge-icon {
  width: 40px;
  height: 40px;
  background: #FFEDD5;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #EA580C;
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
  color: #EA580C;
  margin-bottom: 2px;
}

.surge-desc {
  display: block;
  font-size: 12px;
  color: #9A3412;
}

/* ========================================
   STEP 4 ENHANCED STYLES
   ======================================== */

.step-header-icon.confirm-icon {
  background: #DCFCE7;
  color: #16A34A;
}

/* Confirm Route Card Enhanced */
.confirm-route-card-enhanced {
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 16px;
  overflow: hidden;
}

.confirm-route-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #F8F8F8;
  border-bottom: 1px solid #F0F0F0;
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
  background: #FFFFFF;
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
  color: #00A86B;
  background: #F0FDF4;
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
  background: #00A86B;
}

.confirm-dot.destination {
  background: #E53935;
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
  color: #1A1A1A;
}

.confirm-route-line {
  width: 2px;
  height: 20px;
  background: linear-gradient(to bottom, #00A86B, #E53935);
  margin: 6px 0 6px 5px;
}

.confirm-route-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px 16px;
  background: #F8F8F8;
  border-top: 1px solid #F0F0F0;
}

.confirm-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
}

.confirm-stat svg {
  width: 14px;
  height: 14px;
  color: #00A86B;
}

.confirm-stat-divider {
  width: 1px;
  height: 16px;
  background: #E0E0E0;
}

/* Selected Ride Card Enhanced */
.selected-ride-card-enhanced {
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 16px;
  overflow: hidden;
}

.selected-ride-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #F8F8F8;
  border-bottom: 1px solid #F0F0F0;
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
  color: #1A1A1A;
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
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.payment-method-card-enhanced:hover {
  border-color: #00A86B;
}

.payment-method-card-enhanced:active,
.payment-method-card-enhanced.is-pressed {
  transform: scale(0.98);
  background: #FAFAFA;
}

.payment-method-header {
  padding: 12px 16px;
  background: #F8F8F8;
  border-bottom: 1px solid #F0F0F0;
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
  background: #E8F5EF;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
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
  color: #1A1A1A;
  margin-bottom: 2px;
}

.payment-method-hint {
  display: block;
  font-size: 12px;
  color: #999999;
}

.payment-arrow {
  width: 20px;
  height: 20px;
  color: #CCCCCC;
}

/* Fare Summary Enhanced */
.fare-summary-enhanced {
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 16px;
  overflow: hidden;
}

.fare-summary-header {
  padding: 12px 16px;
  background: #F8F8F8;
  border-bottom: 1px solid #F0F0F0;
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
  color: #1A1A1A;
}

.fare-row-enhanced.surge {
  background: #FFF7ED;
  margin: 8px -16px;
  padding: 12px 16px;
}

.surge-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #EA580C;
}

.surge-label svg {
  width: 16px;
  height: 16px;
}

.fare-row-value.surge {
  color: #EA580C;
}

.fare-divider {
  height: 1px;
  background: #E8E8E8;
  margin: 12px 0;
}

.fare-row-enhanced.total {
  padding-bottom: 0;
}

.fare-row-enhanced.total .fare-row-label {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.fare-row-value.total {
  font-size: 20px;
  font-weight: 700;
  color: #00A86B;
}

/* Confirm Book Button Enhanced */
.confirm-book-btn {
  width: 100%;
  padding: 18px 24px;
  background: #00A86B;
  color: #FFFFFF;
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
}

.confirm-book-btn:hover:not(:disabled) {
  background: #008F5B;
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
  background: linear-gradient(90deg, #00A86B, #00C77B, #00A86B);
  background-size: 200% 100%;
  animation: shimmerBtn 1.5s infinite;
}

@keyframes shimmerBtn {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.booking-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
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
  color: #00A86B;
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
  background: #FFFFFF;
  border: 2px solid #E8E8E8;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  margin-bottom: 12px;
}

.schedule-option:hover {
  border-color: #00A86B;
  background: #FAFFFE;
}

.schedule-option.active {
  border-color: #00A86B;
  background: #E8F5EF;
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
  background: #E8F5EF;
  color: #00A86B;
}

.schedule-option-icon.later {
  background: #FEF3C7;
  color: #D97706;
}

.schedule-option.active .schedule-option-icon.now {
  background: #00A86B;
  color: #FFFFFF;
}

.schedule-option.active .schedule-option-icon.later {
  background: #D97706;
  color: #FFFFFF;
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
  color: #1A1A1A;
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
  background: #00A86B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  flex-shrink: 0;
}

.schedule-check svg {
  width: 16px;
  height: 16px;
}

.schedule-datetime-picker {
  background: #F8F8F8;
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
  color: #00A86B;
}

.datetime-input {
  padding: 12px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  color: #1A1A1A;
  background: #FFFFFF;
  min-width: 160px;
  transition: border-color 0.2s ease;
}

.datetime-input:focus {
  outline: none;
  border-color: #00A86B;
}

.quick-time-options {
  display: flex;
  gap: 8px;
}

.quick-time-btn {
  flex: 1;
  padding: 10px 12px;
  background: #FFFFFF;
  border: 1.5px solid #E8E8E8;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-time-btn:hover {
  border-color: #00A86B;
  color: #00A86B;
  background: #FAFFFE;
}

.quick-time-btn:active {
  transform: scale(0.96);
}

.schedule-confirm-btn {
  width: 100%;
  padding: 16px 24px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.schedule-confirm-btn:hover:not(:disabled) {
  background: #008F5B;
  transform: translateY(-1px);
}

.schedule-confirm-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.schedule-confirm-btn:disabled {
  background: #CCCCCC;
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
  background: #F8F8F8;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  margin-bottom: 16px;
  transition: all 0.2s ease;
}

.recurring-link:hover {
  background: #F0F0F0;
}

.recurring-link svg {
  width: 20px;
  height: 20px;
  color: #00A86B;
}

.recurring-link span {
  flex: 1;
  text-align: left;
  font-size: 14px;
  color: #666666;
}

.recurring-count {
  background: #00A86B;
  color: #FFFFFF;
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
  background: #FFFFFF;
  border: 1.5px solid #E8E8E8;
  border-radius: 14px;
  transition: all 0.2s ease;
}

.recurring-item:hover {
  border-color: #00A86B;
  background: #FAFFFE;
}

.recurring-item.inactive {
  opacity: 0.6;
  background: #F8F8F8;
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
  background: #E8F5EF;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.recurring-item-icon svg {
  width: 20px;
  height: 20px;
  color: #00A86B;
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
  color: #1A1A1A;
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
  color: #00A86B;
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
  background: #F0F0F0;
  color: #666666;
}

.recurring-action-btn.toggle.active {
  background: #E8F5EF;
  color: #00A86B;
}

.recurring-action-btn.delete {
  background: #FFEBEE;
  color: #E53935;
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
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.create-recurring-btn:hover:not(:disabled) {
  background: #008F5B;
}

.create-recurring-btn:disabled {
  background: #CCCCCC;
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
  background: #F8F8F8;
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
  background: #E8E8E8;
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
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 15px;
  color: #1A1A1A;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #00A86B;
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
  background: #F5F5F5;
  border: 1.5px solid #E8E8E8;
  border-radius: 20px;
  font-size: 13px;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.schedule-type-btn.active {
  background: #E8F5EF;
  border-color: #00A86B;
  color: #00A86B;
  font-weight: 500;
}

.day-selector {
  display: flex;
  gap: 8px;
}

.day-btn {
  width: 40px;
  height: 40px;
  border: 1.5px solid #E8E8E8;
  border-radius: 50%;
  background: #FFFFFF;
  font-size: 12px;
  font-weight: 500;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.day-btn.active {
  background: #00A86B;
  border-color: #00A86B;
  color: #FFFFFF;
}

.save-recurring-btn {
  width: 100%;
  padding: 16px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.save-recurring-btn:hover:not(:disabled) {
  background: #008F5B;
}

.save-recurring-btn:disabled {
  background: #CCCCCC;
  cursor: not-allowed;
  box-shadow: none;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #E8E8E8;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

</style>
