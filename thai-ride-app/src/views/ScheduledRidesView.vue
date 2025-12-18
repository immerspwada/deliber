<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAdvancedFeatures } from '../composables/useAdvancedFeatures'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const {
  scheduledRides,
  loading,
  error,
  fetchScheduledRides,
  createScheduledRide,
  cancelScheduledRide
} = useAdvancedFeatures()

// Quick booking state
const selectedPlace = ref<{ address: string; lat: number; lng: number } | null>(null)
const selectedTime = ref<{ label: string; datetime: Date } | null>(null)
const recentPlaces = ref<any[]>([])
const savedPlaces = ref<any[]>([])
const showCancelConfirm = ref(false)
const selectedRideId = ref<string | null>(null)
const bookingSuccess = ref(false)
const customAddress = ref('')
const loadingPlaces = ref(true)
const isRefreshing = ref(false)
const showAddPlaceModal = ref(false)
const newPlace = ref({ name: '', address: '', type: 'other' })
const savingPlace = ref(false)

// Can book when both selected
const canBook = computed(() => selectedPlace.value && selectedTime.value)

// Quick time slots
const quickTimeSlots = computed(() => {
  const now = new Date()
  const slots = []
  
  // วันนี้ (ถ้ายังไม่เกิน 20:00)
  if (now.getHours() < 20) {
    const tonight = new Date(now)
    tonight.setHours(20, 0, 0, 0)
    slots.push({ label: 'วันนี้ 20:00', datetime: tonight, icon: 'moon' })
  }
  
  // พรุ่งนี้เช้า
  const tomorrowMorning = new Date(now)
  tomorrowMorning.setDate(tomorrowMorning.getDate() + 1)
  tomorrowMorning.setHours(8, 0, 0, 0)
  slots.push({ label: 'พรุ่งนี้ 08:00', datetime: tomorrowMorning, icon: 'sun' })
  
  // พรุ่งนี้เย็น
  const tomorrowEvening = new Date(now)
  tomorrowEvening.setDate(tomorrowEvening.getDate() + 1)
  tomorrowEvening.setHours(18, 0, 0, 0)
  slots.push({ label: 'พรุ่งนี้ 18:00', datetime: tomorrowEvening, icon: 'sunset' })
  
  // มะรืนนี้
  const dayAfter = new Date(now)
  dayAfter.setDate(dayAfter.getDate() + 2)
  dayAfter.setHours(9, 0, 0, 0)
  slots.push({ label: formatShortDate(dayAfter) + ' 09:00', datetime: dayAfter, icon: 'calendar' })
  
  return slots
})

const upcomingRides = computed(() => {
  return scheduledRides.value.filter(r => 
    new Date(r.scheduled_datetime) > new Date() && r.status === 'scheduled'
  ).slice(0, 3)
})

onMounted(async () => {
  loadingPlaces.value = true
  
  // Timeout protection - stop loading after 3 seconds max
  const timeoutId = setTimeout(() => {
    if (loadingPlaces.value) {
      console.warn('Loading timeout - stopping spinner')
      loadingPlaces.value = false
    }
  }, 3000)
  
  try {
    // Wait for auth store to initialize if loading
    let waitCount = 0
    while (authStore.loading && waitCount < 10) {
      await new Promise(resolve => setTimeout(resolve, 200))
      waitCount++
    }
    
    console.log('ScheduledRidesView: Auth state:', {
      userId: authStore.user?.id,
      isAuthenticated: authStore.isAuthenticated,
      loading: authStore.loading
    })
    
    // Fetch data in parallel with individual error handling
    const results = await Promise.allSettled([
      fetchScheduledRides(),
      fetchRecentPlaces(),
      fetchSavedPlaces()
    ])
    
    results.forEach((result, index) => {
      const names = ['scheduledRides', 'recentPlaces', 'savedPlaces']
      if (result.status === 'rejected') {
        console.warn(`${names[index]} fetch failed:`, result.reason)
      }
    })
  } catch (e) {
    console.error('Error loading data:', e)
  } finally {
    clearTimeout(timeoutId)
    loadingPlaces.value = false
  }
})

const fetchRecentPlaces = async () => {
  if (!authStore.user?.id) {
    console.log('fetchRecentPlaces: No user ID, skipping')
    return
  }
  
  // Check if user ID is a valid UUID (not demo user)
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authStore.user.id)
  if (!isValidUUID) {
    console.log('fetchRecentPlaces: Invalid UUID format, skipping DB query')
    recentPlaces.value = []
    return
  }
  
  try {
    const { data, error: err } = await supabase
      .from('recent_places')
      .select('*')
      .eq('user_id', authStore.user.id)
      .order('last_used_at', { ascending: false })
      .limit(5)
    
    if (err) {
      console.error('fetchRecentPlaces error:', err.message)
      return
    }
    recentPlaces.value = data || []
    console.log('Recent places loaded:', recentPlaces.value.length)
  } catch (e) {
    console.error('fetchRecentPlaces exception:', e)
  }
}

const fetchSavedPlaces = async () => {
  if (!authStore.user?.id) {
    console.log('fetchSavedPlaces: No user ID, skipping')
    return
  }
  
  // Check if user ID is a valid UUID (not demo user)
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authStore.user.id)
  if (!isValidUUID) {
    console.log('fetchSavedPlaces: Invalid UUID format, skipping DB query')
    savedPlaces.value = []
    return
  }
  
  try {
    const { data, error: err } = await supabase
      .from('saved_places')
      .select('*')
      .eq('user_id', authStore.user.id)
      .limit(10)
    
    if (err) {
      console.error('fetchSavedPlaces error:', err.message)
      return
    }
    
    savedPlaces.value = data || []
    console.log('Saved places loaded:', savedPlaces.value.length)
  } catch (e) {
    console.error('fetchSavedPlaces exception:', e)
  }
}

const selectPlace = (place: any) => {
  selectedPlace.value = {
    address: place.address || place.name,
    lat: place.lat || 13.7563,
    lng: place.lng || 100.5018
  }
  customAddress.value = ''
}

const selectTime = (slot: any) => {
  selectedTime.value = slot
}

const setCustomAddress = () => {
  if (customAddress.value.trim()) {
    selectedPlace.value = {
      address: customAddress.value.trim(),
      lat: 13.7563,
      lng: 100.5018
    }
  }
}

const clearPlace = () => {
  selectedPlace.value = null
  customAddress.value = ''
}

// Pull to refresh
const handleRefresh = async () => {
  isRefreshing.value = true
  await Promise.all([
    fetchScheduledRides(),
    fetchRecentPlaces(),
    fetchSavedPlaces()
  ])
  isRefreshing.value = false
}

// Add new place
const openAddPlaceModal = () => {
  newPlace.value = { name: '', address: '', type: 'other' }
  showAddPlaceModal.value = true
}

const saveNewPlace = async () => {
  if (!newPlace.value.name.trim() || !newPlace.value.address.trim()) return
  if (!authStore.user?.id) return
  
  // Check if user ID is a valid UUID
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authStore.user.id)
  if (!isValidUUID) {
    console.error('Cannot save place: Invalid user ID format')
    // Still allow selecting the place locally without saving to DB
    selectPlace({
      name: newPlace.value.name,
      address: newPlace.value.address,
      lat: 13.7563,
      lng: 100.5018
    })
    showAddPlaceModal.value = false
    return
  }
  
  savingPlace.value = true
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await supabase
      .from('saved_places')
      .insert({
        user_id: authStore.user.id,
        name: newPlace.value.name.trim(),
        address: newPlace.value.address.trim(),
        type: newPlace.value.type,
        lat: 13.7563,
        lng: 100.5018
      } as any)
    
    if (err) {
      console.error('Error saving place to DB:', err.message)
    }
    
    await fetchSavedPlaces()
    showAddPlaceModal.value = false
    // Auto-select the new place
    selectPlace({
      name: newPlace.value.name,
      address: newPlace.value.address,
      lat: 13.7563,
      lng: 100.5018
    })
  } catch (e) {
    console.error('Error saving place:', e)
  } finally {
    savingPlace.value = false
  }
}

const quickBook = async () => {
  if (!selectedPlace.value || !selectedTime.value) return
  
  const result = await createScheduledRide({
    pickup: { lat: 13.7563, lng: 100.5018, address: 'ตำแหน่งปัจจุบัน' },
    destination: selectedPlace.value,
    scheduledDatetime: selectedTime.value.datetime.toISOString(),
    rideType: 'standard'
  })
  
  if (result) {
    bookingSuccess.value = true
    setTimeout(() => {
      bookingSuccess.value = false
      resetSelection()
    }, 2000)
  }
}

const resetSelection = () => {
  selectedPlace.value = null
  selectedTime.value = null
}

const confirmCancel = (rideId: string | null) => {
  if (rideId) {
    selectedRideId.value = rideId
    showCancelConfirm.value = true
  }
}

const handleCancel = async () => {
  if (selectedRideId.value) {
    await cancelScheduledRide(selectedRideId.value)
    showCancelConfirm.value = false
    selectedRideId.value = null
  }
}

const formatShortDate = (date: Date) => {
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

const formatDateTime = (datetime: string) => {
  const date = new Date(datetime)
  return {
    date: date.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  }
}

const getPlaceIcon = (type: string) => {
  const icons: Record<string, string> = {
    home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    work: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    default: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'
  }
  return icons[type] || icons.default
}


</script>

<template>
  <div class="scheduled-page">
    <!-- Pull to Refresh Indicator -->
    <div v-if="isRefreshing" class="refresh-indicator">
      <div class="refresh-spinner"></div>
      <span>กำลังโหลด...</span>
    </div>

    <!-- Success Toast -->
    <div v-if="bookingSuccess" class="success-toast">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
      </svg>
      <span>จองสำเร็จ!</span>
    </div>

    <!-- Hero Section - Clear Purpose -->
    <section class="hero-section">
      <button class="refresh-btn" @click="handleRefresh" :disabled="isRefreshing">
        <svg :class="{ spinning: isRefreshing }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
      </button>
      <div class="hero-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </div>
      <h1 class="hero-title">จองรถล่วงหน้า</h1>
      <p class="hero-subtitle">เลือกเวลา + สถานที่ แล้วกดจอง</p>
    </section>

    <!-- Step Indicator -->
    <div class="step-indicator">
      <div :class="['step', { done: selectedTime }]">
        <span class="step-num">1</span>
        <span class="step-text">เลือกเวลา</span>
      </div>
      <div class="step-line" :class="{ active: selectedTime }"></div>
      <div :class="['step', { done: selectedPlace }]">
        <span class="step-num">2</span>
        <span class="step-text">เลือกที่</span>
      </div>
      <div class="step-line" :class="{ active: canBook }"></div>
      <div :class="['step', { done: canBook }]">
        <span class="step-num">3</span>
        <span class="step-text">จอง</span>
      </div>
    </div>

    <!-- Quick Book Section -->
    <section class="quick-book">
      <!-- Time Slots -->
      <div class="section-box">
        <h2 class="section-label">
          <span class="label-icon">1</span>
          เลือกเวลา
        </h2>
        <div class="time-slots">
          <button 
            v-for="slot in quickTimeSlots" 
            :key="slot.label"
            :class="['time-slot', { active: selectedTime?.label === slot.label }]"
            @click="selectTime(slot)"
          >
            <svg v-if="slot.icon === 'sun'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
            <svg v-else-if="slot.icon === 'moon'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            </svg>
            <svg v-else-if="slot.icon === 'sunset'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m3.343-5.657l-.707-.707m12.728 0l-.707.707M12 7a5 5 0 00-5 5h10a5 5 0 00-5-5z"/>
            </svg>
            <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <span>{{ slot.label }}</span>
            <svg v-if="selectedTime?.label === slot.label" class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Places -->
      <div class="section-box">
        <h2 class="section-label">
          <span class="label-icon">2</span>
          เลือกปลายทาง
        </h2>

        <!-- Selected Place Display -->
        <div v-if="selectedPlace" class="selected-place-card">
          <div class="selected-place-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div class="selected-place-info">
            <span class="selected-label">ปลายทาง</span>
            <span class="selected-address">{{ selectedPlace.address }}</span>
          </div>
          <button @click="clearPlace" class="clear-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Address Input -->
        <div v-if="!selectedPlace" class="address-input-section">
          <div class="address-input-wrapper">
            <svg class="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input 
              v-model="customAddress"
              type="text"
              placeholder="พิมพ์ที่อยู่ปลายทาง..."
              class="address-input"
              @keyup.enter="setCustomAddress"
            />
            <button 
              v-if="customAddress.trim()"
              @click="setCustomAddress" 
              class="confirm-address-btn"
            >
              ตกลง
            </button>
          </div>
        </div>

        <!-- Saved Places -->
        <div v-if="savedPlaces.length > 0 && !selectedPlace && !loadingPlaces" class="places-section">
          <h3 class="places-label">สถานที่บันทึก ({{ savedPlaces.length }})</h3>
          <div class="places-list">
            <button 
              v-for="place in savedPlaces" 
              :key="place.id"
              class="place-item"
              @click="selectPlace(place)"
            >
              <div class="place-icon" :class="place.type">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getPlaceIcon(place.type)"/>
                </svg>
              </div>
              <div class="place-info">
                <span class="place-name">{{ place.name || 'สถานที่' }}</span>
                <span class="place-address">{{ place.address || 'ไม่ระบุที่อยู่' }}</span>
              </div>
              <svg class="arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Recent Places -->
        <div v-if="recentPlaces.length > 0 && !selectedPlace && !loadingPlaces" class="places-section">
          <h3 class="places-label">ล่าสุด</h3>
          <div class="places-list">
            <button 
              v-for="place in recentPlaces" 
              :key="place.id"
              class="place-item"
              @click="selectPlace(place)"
            >
              <div class="place-icon recent">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div class="place-info">
                <span class="place-address">{{ place.address || 'ไม่ระบุที่อยู่' }}</span>
              </div>
              <svg class="arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Loading state -->
        <div v-if="loadingPlaces && !selectedPlace" class="loading-places">
          <div class="loading-spinner"></div>
          <span>กำลังโหลดสถานที่...</span>
        </div>

        <!-- Add New Place Button -->
        <button v-if="!selectedPlace && !loadingPlaces" @click="openAddPlaceModal" class="add-place-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          <span>เพิ่มสถานที่ใหม่</span>
        </button>

        <!-- Empty state hint -->
        <div v-if="!loadingPlaces && savedPlaces.length === 0 && recentPlaces.length === 0 && !selectedPlace" class="empty-hint-text">
          <p>พิมพ์ที่อยู่ด้านบน หรือกดปุ่มเพิ่มสถานที่</p>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="error-msg">{{ error }}</div>
    </section>

    <!-- Upcoming Rides -->
    <section v-if="upcomingRides.length > 0" class="upcoming-section">
      <h2 class="section-label-simple">การจองที่กำลังจะมาถึง</h2>
      <div class="rides-list">
        <div v-for="ride in upcomingRides" :key="ride.id" class="ride-card">
          <div class="ride-time">
            <span class="time-big">{{ formatDateTime(ride.scheduled_datetime).time }}</span>
            <span class="time-date">{{ formatDateTime(ride.scheduled_datetime).date }}</span>
          </div>
          <div class="ride-dest">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            </svg>
            <span>{{ ride.destination_address }}</span>
          </div>
          <button @click="confirmCancel(ride.id)" class="cancel-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      
      <button v-if="scheduledRides.length > 3" @click="router.push('/customer/history')" class="view-all-btn">
        ดูทั้งหมด
      </button>
    </section>

    <!-- Fixed Bottom Book Button -->
    <div class="bottom-action">
      <div v-if="canBook" class="selection-summary">
        <span>{{ selectedTime?.label }}</span>
        <span class="summary-dot"></span>
        <span class="summary-place">{{ selectedPlace?.address }}</span>
      </div>
      <button 
        @click="quickBook" 
        :disabled="!canBook || loading" 
        :class="['btn-book', { ready: canBook }]"
      >
        <template v-if="loading">
          <svg class="spinner" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="31.4" stroke-dashoffset="10"/>
          </svg>
          กำลังจอง...
        </template>
        <template v-else-if="canBook">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          จองเลย
        </template>
        <template v-else>
          เลือกเวลาและสถานที่
        </template>
      </button>
    </div>

    <!-- Cancel Confirm Modal -->
    <div v-if="showCancelConfirm" class="modal-overlay" @click="showCancelConfirm = false">
      <div class="modal-content" @click.stop>
        <h3>ยกเลิกการจอง?</h3>
        <p>คุณแน่ใจหรือไม่?</p>
        <div class="modal-actions">
          <button @click="showCancelConfirm = false" class="btn-secondary">ไม่</button>
          <button @click="handleCancel" class="btn-danger">ยกเลิก</button>
        </div>
      </div>
    </div>

    <!-- Add Place Modal -->
    <div v-if="showAddPlaceModal" class="modal-overlay" @click="showAddPlaceModal = false">
      <div class="modal-content add-place-modal" @click.stop>
        <h3>เพิ่มสถานที่ใหม่</h3>
        
        <div class="form-group">
          <label>ชื่อสถานที่</label>
          <input 
            v-model="newPlace.name" 
            type="text" 
            placeholder="เช่น บ้าน, ที่ทำงาน, ยิม"
            class="form-input"
          />
        </div>
        
        <div class="form-group">
          <label>ที่อยู่</label>
          <input 
            v-model="newPlace.address" 
            type="text" 
            placeholder="พิมพ์ที่อยู่..."
            class="form-input"
          />
        </div>
        
        <div class="form-group">
          <label>ประเภท</label>
          <div class="type-selector">
            <button 
              :class="['type-btn', { active: newPlace.type === 'home' }]"
              @click="newPlace.type = 'home'"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
              </svg>
              บ้าน
            </button>
            <button 
              :class="['type-btn', { active: newPlace.type === 'work' }]"
              @click="newPlace.type = 'work'"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
              ที่ทำงาน
            </button>
            <button 
              :class="['type-btn', { active: newPlace.type === 'other' }]"
              @click="newPlace.type = 'other'"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              </svg>
              อื่นๆ
            </button>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="showAddPlaceModal = false" class="btn-secondary">ยกเลิก</button>
          <button 
            @click="saveNewPlace" 
            :disabled="!newPlace.name.trim() || !newPlace.address.trim() || savingPlace"
            class="btn-primary"
          >
            {{ savingPlace ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scheduled-page {
  min-height: 100vh;
  background: #f6f6f6;
  padding-bottom: 160px;
}

/* Success Toast */
.success-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: #00A86B;
  color: #fff;
  padding: 12px 24px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 100;
  animation: slideDown 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.success-toast svg {
  width: 20px;
  height: 20px;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* Hero Section */
.hero-section {
  background: #fff;
  padding: 24px 20px;
  text-align: center;
  position: relative;
}

.refresh-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  background: #f6f6f6;
  border: none;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-btn svg {
  width: 20px;
  height: 20px;
}

.refresh-btn svg.spinning {
  animation: spin 1s linear infinite;
}

.refresh-btn:disabled {
  opacity: 0.5;
}

.hero-icon {
  width: 56px;
  height: 56px;
  background: #E8F5EF;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}

.hero-icon svg {
  width: 28px;
  height: 28px;
  color: #00A86B;
}

.hero-title {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 4px;
}

.hero-subtitle {
  font-size: 14px;
  color: #6b6b6b;
}

/* Step Indicator */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 20px;
  background: #fff;
  border-bottom: 1px solid #e5e5e5;
  gap: 8px;
}

.step {
  display: flex;
  align-items: center;
  gap: 6px;
}

.step-num {
  width: 24px;
  height: 24px;
  background: #e5e5e5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #6b6b6b;
  transition: all 0.2s;
}

.step.done .step-num {
  background: #00A86B;
  color: #fff;
}

.step-text {
  font-size: 12px;
  color: #6b6b6b;
}

.step.done .step-text {
  color: #00A86B;
  font-weight: 500;
}

.step-line {
  width: 24px;
  height: 2px;
  background: #e5e5e5;
  transition: background 0.2s;
}

.step-line.active {
  background: #00A86B;
}

/* Quick Book */
.quick-book {
  padding: 16px;
}

.section-box {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 12px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin-bottom: 16px;
}

.section-label-simple {
  font-size: 14px;
  font-weight: 600;
  color: #6b6b6b;
  margin-bottom: 12px;
  text-transform: uppercase;
}

.label-icon {
  width: 24px;
  height: 24px;
  background: #00A86B;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

/* Time Slots */
.time-slots {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.time-slot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 12px;
  background: #f6f6f6;
  border: 2px solid transparent;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  position: relative;
}

.time-slot svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.time-slot.active {
  border-color: #00A86B;
  background: #E8F5EF;
}

.check-icon {
  width: 18px;
  height: 18px;
  color: #00A86B;
  margin-left: auto;
}

/* Places */
.places-section {
  margin-bottom: 16px;
}

.places-section:last-child {
  margin-bottom: 0;
}

.places-label {
  font-size: 12px;
  color: #6b6b6b;
  margin-bottom: 10px;
  text-transform: uppercase;
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
  background: #f6f6f6;
  border: 2px solid transparent;
  border-radius: 12px;
  text-align: left;
  transition: all 0.2s;
}

.place-item.active {
  border-color: #00A86B;
  background: #E8F5EF;
}

.place-icon {
  width: 40px;
  height: 40px;
  background: #fff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.place-icon.recent {
  background: #e5e5e5;
}

.place-icon svg {
  width: 20px;
  height: 20px;
}

.place-info {
  flex: 1;
  min-width: 0;
}

.place-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
}

.place-address {
  display: block;
  font-size: 12px;
  color: #6b6b6b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Selected Place Card */
.selected-place-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #00A86B00;
  border-radius: 12px;
  margin-bottom: 16px;
}

.selected-place-icon {
  width: 44px;
  height: 44px;
  background: #fff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.selected-place-icon svg {
  width: 22px;
  height: 22px;
  color: #00A86B;
}

.selected-place-info {
  flex: 1;
  min-width: 0;
}

.selected-label {
  display: block;
  font-size: 11px;
  color: #999;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.selected-address {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.clear-btn {
  width: 32px;
  height: 32px;
  background: rgba(255,255,255,0.2);
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.clear-btn svg {
  width: 16px;
  height: 16px;
  color: #fff;
}

/* Address Input */
.address-input-section {
  margin-bottom: 16px;
}

.address-input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #f6f6f6;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  transition: border-color 0.2s;
}

.address-input-wrapper:focus-within {
  border-color: #00A86B;
}

.input-icon {
  width: 20px;
  height: 20px;
  color: #6b6b6b;
  flex-shrink: 0;
}

.address-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 15px;
  outline: none;
}

.address-input::placeholder {
  color: #999;
}

.confirm-address-btn {
  padding: 8px 16px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  flex-shrink: 0;
}

/* Loading Places */
.loading-places {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  color: #6b6b6b;
  font-size: 14px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e5e5;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.arrow-icon {
  width: 16px;
  height: 16px;
  color: #ccc;
  flex-shrink: 0;
}

.place-icon.home {
  background: #E8F5EF;
}

.place-icon.home svg {
  color: #00A86B;
}

.place-icon.work {
  background: #e3f2fd;
}

.place-icon.work svg {
  color: #1976D2;
}

.empty-hint-text {
  text-align: center;
  padding: 16px;
  color: #6b6b6b;
  font-size: 14px;
}

.empty-hint-text p {
  margin-bottom: 4px;
}

.link-btn {
  background: none;
  border: none;
  color: #00A86B;
  font-weight: 500;
  text-decoration: underline;
}

.error-msg {
  margin-top: 12px;
  padding: 12px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 8px;
  font-size: 14px;
}

/* Upcoming */
.upcoming-section {
  padding: 0 16px;
  margin-top: 8px;
}

.rides-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ride-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: 12px;
  padding: 14px;
}

.ride-time {
  min-width: 70px;
  text-align: center;
}

.time-big {
  display: block;
  font-size: 18px;
  font-weight: 600;
}

.time-date {
  display: block;
  font-size: 11px;
  color: #6b6b6b;
}

.ride-dest {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  min-width: 0;
}

.ride-dest svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: #6b6b6b;
}

.ride-dest span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cancel-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  flex-shrink: 0;
}

.cancel-btn svg {
  width: 18px;
  height: 18px;
  color: #ef4444;
}

.view-all-btn {
  width: 100%;
  padding: 12px;
  background: none;
  border: none;
  color: #00A86B;
  font-weight: 500;
  margin-top: 8px;
}

/* Bottom Action */
.bottom-action {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0));
  border-top: 1px solid #e5e5e5;
  z-index: 50;
}

.selection-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  color: #6b6b6b;
  margin-bottom: 10px;
}

.summary-dot {
  width: 4px;
  height: 4px;
  background: #ccc;
  border-radius: 50%;
}

.summary-place {
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-book {
  width: 100%;
  padding: 18px 24px;
  background: #e5e5e5;
  color: #6b6b6b;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-book.ready {
  background: #00A86B;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.btn-book:disabled {
  opacity: 0.7;
}

.btn-book svg {
  width: 20px;
  height: 20px;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Buttons */
.btn-secondary {
  padding: 14px 24px;
  background: #f6f6f6;
  color: #000;
  border: none;
  border-radius: 8px;
  font-size: 16px;
}

.btn-danger {
  padding: 14px 24px;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 320px;
  text-align: center;
}

.modal-content h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.modal-content p {
  font-size: 14px;
  color: #6b6b6b;
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-actions button {
  flex: 1;
}

/* Pull to Refresh */
.refresh-indicator {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  z-index: 90;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  font-size: 14px;
  color: #6b6b6b;
}

.refresh-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e5e5;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Add Place Button */
.add-place-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: #f6f6f6;
  border: 2px dashed #ccc;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #6b6b6b;
  transition: all 0.2s;
}

.add-place-btn:hover,
.add-place-btn:active {
  border-color: #00A86B;
  color: #00A86B;
}

.add-place-btn svg {
  width: 20px;
  height: 20px;
}

/* Add Place Modal */
.add-place-modal {
  text-align: left;
  max-width: 360px;
}

.add-place-modal h3 {
  text-align: center;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #6b6b6b;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 14px 16px;
  background: #f6f6f6;
  border: 2px solid #e5e5e5;
  border-radius: 10px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: #00A86B;
}

.form-input::placeholder {
  color: #999;
}

/* Type Selector */
.type-selector {
  display: flex;
  gap: 8px;
}

.type-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: #f6f6f6;
  border: 2px solid transparent;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  color: #6b6b6b;
  transition: all 0.2s;
}

.type-btn svg {
  width: 22px;
  height: 22px;
}

.type-btn.active {
  border-color: #00A86B;
  background: #E8F5EF;
  color: #00A86B;
}

/* Primary Button */
.btn-primary {
  padding: 14px 24px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.btn-primary:disabled {
  background: #ccc;
  color: #999;
  box-shadow: none;
}
</style>
