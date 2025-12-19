<script setup lang="ts">
/**
 * Feature: F158 - Queue Booking Service
 * บริการจองคิวร้านค้า/โรงพยาบาล
 * Enhanced UX: Step-by-step flow, better animations, haptic feedback
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQueueBooking } from '../composables/useQueueBooking'
import { useQueueFavorites, type QueueFavoriteWithStats, type EstimatedWaitTime } from '../composables/useQueueFavorites'
import { useServices } from '../composables/useServices'
import { useToast } from '../composables/useToast'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const { 
  createQueueBooking, 
  fetchUserBookings,
  activeBookings,
  loading, 
  error, 
  categoryLabels, 
  clearError 
} = useQueueBooking()
const {
  favorites,
  topFavorites,
  fetchFavorites,
  saveFavoritePlace,
  getFavoritesByCategory,
  isFavorite,
  getEstimatedWaitTime,
  formatWaitTime,
  getConfidenceLabel,
  getConfidenceColor,
  loading: favoritesLoading
} = useQueueFavorites()
const { recentPlaces, fetchRecentPlaces } = useServices()
const toast = useToast()

// Step Flow
type Step = 'category' | 'place' | 'schedule' | 'confirm'
const currentStep = ref<Step>('category')
const stepDirection = ref<'next' | 'prev' | null>(null)

const steps = [
  { key: 'category', label: 'ประเภท', number: 1 },
  { key: 'place', label: 'สถานที่', number: 2 },
  { key: 'schedule', label: 'วันเวลา', number: 3 },
  { key: 'confirm', label: 'ยืนยัน', number: 4 }
] as const

const currentStepIndex = computed(() => steps.findIndex(s => s.key === currentStep.value))

// Categories with enhanced design
const categories = [
  { id: 'hospital', name: 'โรงพยาบาล', color: '#E53935', desc: 'นัดพบแพทย์, ตรวจสุขภาพ' },
  { id: 'bank', name: 'ธนาคาร', color: '#2196F3', desc: 'เปิดบัญชี, ทำธุรกรรม' },
  { id: 'government', name: 'หน่วยงานราชการ', color: '#9C27B0', desc: 'ทำบัตร, จดทะเบียน' },
  { id: 'restaurant', name: 'ร้านอาหาร', color: '#F5A623', desc: 'จองโต๊ะ, สั่งล่วงหน้า' },
  { id: 'salon', name: 'ร้านเสริมสวย', color: '#E91E63', desc: 'ทำผม, สปา, นวด' },
  { id: 'other', name: 'อื่นๆ', color: '#607D8B', desc: 'บริการอื่นๆ' }
] as const

// Form state
const selectedCategory = ref<'hospital' | 'bank' | 'government' | 'restaurant' | 'salon' | 'other' | ''>('')
const placeName = ref('')
const placeAddress = ref('')
const queueDetails = ref('')
const selectedDate = ref('')
const selectedTime = ref('')
const contactPhone = ref('')

// UI state
const showExitConfirm = ref(false)
const pressedButton = ref<string | null>(null)
const showSaveFavoriteModal = ref(false)
const selectedFavorite = ref<QueueFavoriteWithStats | null>(null)

// Estimated wait time
const estimatedWait = ref<EstimatedWaitTime | null>(null)
const loadingWaitTime = ref(false)

// Set minimum date to today
const today = new Date().toISOString().split('T')[0]

// Initialize
onMounted(async () => {
  clearError()
  if (authStore.user) {
    contactPhone.value = (authStore.user as any).phone_number || ''
  }
  await Promise.all([fetchUserBookings(), fetchRecentPlaces(5), fetchFavorites()])
})

// Watch for place name changes to fetch estimated wait time
watch([placeName, selectedCategory, selectedTime], async ([name, category, time]) => {
  if (name && category) {
    loadingWaitTime.value = true
    estimatedWait.value = await getEstimatedWaitTime(name, category, time || undefined)
    loadingWaitTime.value = false
  } else {
    estimatedWait.value = null
  }
}, { debounce: 500 } as any)

onUnmounted(() => {
  clearError()
})

// Haptic feedback
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 25, heavy: 50 }
    navigator.vibrate(patterns[type])
  }
}

// Button press handlers
const handleButtonPress = (id: string) => {
  pressedButton.value = id
  triggerHaptic('light')
}

const handleButtonRelease = () => {
  pressedButton.value = null
}

// Navigation
const goBack = () => {
  if (currentStep.value === 'category') {
    if (selectedCategory.value || placeName.value) {
      showExitConfirm.value = true
    } else {
      router.back()
    }
  } else {
    prevStep()
  }
}

const confirmExit = () => {
  triggerHaptic('heavy')
  showExitConfirm.value = false
  router.back()
}

const cancelExit = () => {
  triggerHaptic('light')
  showExitConfirm.value = false
}

// Check if user has entered any data
const hasEnteredData = computed(() => {
  return selectedCategory.value || placeName.value || placeAddress.value || queueDetails.value || selectedDate.value
})

const goHome = () => {
  triggerHaptic('medium')
  if (hasEnteredData.value) {
    showExitConfirm.value = true
  } else {
    router.push('/customer')
  }
}

const confirmExitToHome = () => {
  triggerHaptic('heavy')
  showExitConfirm.value = false
  router.push('/customer')
}

// Step navigation
const nextStep = () => {
  triggerHaptic('medium')
  stepDirection.value = 'next'
  
  const stepOrder: Step[] = ['category', 'place', 'schedule', 'confirm']
  const currentIndex = stepOrder.indexOf(currentStep.value)
  if (currentIndex < stepOrder.length - 1) {
    currentStep.value = stepOrder[currentIndex + 1] as Step
  }
}

const prevStep = () => {
  triggerHaptic('light')
  stepDirection.value = 'prev'
  
  const stepOrder: Step[] = ['category', 'place', 'schedule', 'confirm']
  const currentIndex = stepOrder.indexOf(currentStep.value)
  if (currentIndex > 0) {
    currentStep.value = stepOrder[currentIndex - 1] as Step
  }
}

// Category selection
const selectCategory = (id: string) => {
  triggerHaptic('medium')
  selectedCategory.value = id as typeof selectedCategory.value
  // Reset selected favorite when category changes
  selectedFavorite.value = null
  // Auto advance after short delay
  setTimeout(() => nextStep(), 200)
}

// Select from favorites
const selectFromFavorite = (fav: QueueFavoriteWithStats) => {
  triggerHaptic('medium')
  selectedFavorite.value = fav
  placeName.value = fav.place_name
  placeAddress.value = fav.place_address || ''
  queueDetails.value = fav.default_details || ''
  // Set estimated wait from favorite
  if (fav.avg_wait_time) {
    estimatedWait.value = {
      avg_wait: fav.avg_wait_time,
      min_wait: Math.max(10, fav.avg_wait_time - 15),
      max_wait: fav.avg_wait_time + 30,
      time_based_wait: fav.avg_wait_time,
      confidence: fav.confidence
    }
  }
}

// Save current place as favorite
const saveAsFavorite = async () => {
  if (!placeName.value || !selectedCategory.value) return
  
  triggerHaptic('medium')
  const result = await saveFavoritePlace({
    category: selectedCategory.value,
    place_name: placeName.value,
    place_address: placeAddress.value || undefined,
    default_details: queueDetails.value || undefined
  })
  
  if (result) {
    toast.success('บันทึกสถานที่โปรดแล้ว')
    showSaveFavoriteModal.value = false
  } else {
    toast.error('ไม่สามารถบันทึกได้')
  }
}

// Check if current place is already favorite
const isCurrentPlaceFavorite = computed(() => {
  if (!placeName.value || !selectedCategory.value) return false
  return isFavorite(placeName.value, selectedCategory.value)
})

// Get favorites for current category
const categoryFavorites = computed(() => {
  if (!selectedCategory.value) return []
  return getFavoritesByCategory(selectedCategory.value)
})

// Validation
const canProceedFromCategory = computed(() => !!selectedCategory.value)
const canProceedFromPlace = computed(() => !!placeName.value)
const canProceedFromSchedule = computed(() => {
  if (!selectedDate.value || !selectedTime.value) return false
  const scheduledDateTime = new Date(`${selectedDate.value}T${selectedTime.value}`)
  return scheduledDateTime > new Date()
})

const isFormValid = computed(() => 
  canProceedFromCategory.value && 
  canProceedFromSchedule.value
)

// Quick time slots
const timeSlots = [
  { label: 'เช้า', time: '09:00', icon: 'morning' },
  { label: 'สาย', time: '11:00', icon: 'late-morning' },
  { label: 'บ่าย', time: '14:00', icon: 'afternoon' },
  { label: 'เย็น', time: '17:00', icon: 'evening' }
]

const selectTimeSlot = (time: string) => {
  triggerHaptic('light')
  selectedTime.value = time
}

// Quick date options
const dateOptions = computed(() => {
  const options = []
  const now = new Date()
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    
    let label = ''
    if (i === 0) label = 'วันนี้'
    else if (i === 1) label = 'พรุ่งนี้'
    else label = date.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric' })
    
    options.push({ date: dateStr, label })
  }
  return options
})

const selectDate = (date: string) => {
  triggerHaptic('light')
  selectedDate.value = date
}

// Submit booking
const submitBooking = async () => {
  if (!isFormValid.value || !selectedCategory.value) return
  
  triggerHaptic('heavy')
  
  const result = await createQueueBooking({
    category: selectedCategory.value,
    place_name: placeName.value || undefined,
    place_address: placeAddress.value || undefined,
    details: queueDetails.value || undefined,
    scheduled_date: selectedDate.value,
    scheduled_time: selectedTime.value
  })
  
  if (result) {
    toast.success('จองคิวสำเร็จ!')
    router.push({ name: 'queue-tracking', params: { id: result.id } })
  } else if (error.value) {
    toast.error(error.value)
  }
}

// Format helpers
const formatDate = (date: string) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatTime = (time: string) => {
  if (!time) return ''
  return time.substring(0, 5) + ' น.'
}

const getCategoryInfo = (id: string) => {
  return categories.find(c => c.id === id)
}

// Service fee
const serviceFee = 50
</script>

<template>
  <div class="queue-page">
    <!-- Header -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <h1>จองคิว</h1>
      <button class="home-btn" @click="goHome" title="กลับหน้าหลัก">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        </svg>
      </button>
    </div>

    <!-- Progress Steps -->
    <div class="progress-bar">
      <div 
        v-for="(step, index) in steps" 
        :key="step.key"
        :class="['step', { 
          active: index === currentStepIndex, 
          completed: index < currentStepIndex 
        }]"
      >
        <div class="step-dot">
          <svg v-if="index < currentStepIndex" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          <span v-else>{{ step.number }}</span>
        </div>
        <span class="step-label">{{ step.label }}</span>
      </div>
      <div class="progress-line">
        <div class="progress-fill" :style="{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }"></div>
      </div>
    </div>

    <!-- Active Bookings Alert -->
    <div v-if="activeBookings.length > 0" class="active-alert" @click="router.push('/customer/queue-history')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
      <span>คุณมี {{ activeBookings.length }} คิวที่กำลังดำเนินการ</span>
      <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Error Message -->
      <div v-if="error" class="error-msg">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
        {{ error }}
      </div>

      <!-- Step 1: Category Selection -->
      <div v-show="currentStep === 'category'" class="step-content">
        <h2 class="section-title">เลือกประเภทบริการ</h2>
        <p class="section-desc">เลือกประเภทสถานที่ที่ต้องการจองคิว</p>
        
        <div class="category-list">
          <button 
            v-for="cat in categories" 
            :key="cat.id"
            :class="['category-card', { active: selectedCategory === cat.id, pressed: pressedButton === cat.id }]"
            :style="{ '--accent': cat.color }"
            @click="selectCategory(cat.id)"
            @touchstart="handleButtonPress(cat.id)"
            @touchend="handleButtonRelease"
            @mousedown="handleButtonPress(cat.id)"
            @mouseup="handleButtonRelease"
            @mouseleave="handleButtonRelease"
          >
            <div class="cat-icon">
              <svg v-if="cat.id === 'hospital'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 21h18M9 8h6M12 5v6M5 21V7l7-4 7 4v14"/>
              </svg>
              <svg v-else-if="cat.id === 'bank'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
              </svg>
              <svg v-else-if="cat.id === 'government'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 21h18M4 21V10l8-6 8 6v11M9 21v-6h6v6"/>
              </svg>
              <svg v-else-if="cat.id === 'restaurant'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
              </svg>
              <svg v-else-if="cat.id === 'salon'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 3v18M18 3v18M6 8h12M6 16h12"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01"/>
              </svg>
            </div>
            <div class="cat-info">
              <span class="cat-name">{{ cat.name }}</span>
              <span class="cat-desc">{{ cat.desc }}</span>
            </div>
            <div class="cat-check" v-if="selectedCategory === cat.id">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
          </button>
        </div>
      </div>

      <!-- Step 2: Place Details -->
      <div v-show="currentStep === 'place'" class="step-content">
        <h2 class="section-title">ข้อมูลสถานที่</h2>
        <p class="section-desc">ระบุชื่อและที่อยู่สถานที่ที่ต้องการจองคิว</p>

        <!-- Favorite Places for this category -->
        <div v-if="categoryFavorites.length > 0" class="favorites-section">
          <h3 class="subsection-title">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            สถานที่โปรด
          </h3>
          <div class="favorite-cards">
            <button 
              v-for="fav in categoryFavorites.slice(0, 3)" 
              :key="fav.id"
              :class="['favorite-card', { active: selectedFavorite?.id === fav.id }]"
              @click="selectFromFavorite(fav)"
            >
              <div class="fav-header">
                <span class="fav-name">{{ fav.place_name }}</span>
                <span class="fav-visits">{{ fav.visit_count }} ครั้ง</span>
              </div>
              <div class="fav-wait" v-if="fav.avg_wait_time">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                <span>รอ {{ formatWaitTime(fav.avg_wait_time) }}</span>
                <span class="confidence" :style="{ color: getConfidenceColor(fav.confidence) }">
                  ({{ getConfidenceLabel(fav.confidence) }})
                </span>
              </div>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">ชื่อสถานที่ <span class="required">*</span></label>
          <div class="input-with-action">
            <input 
              v-model="placeName"
              type="text"
              :placeholder="selectedCategory === 'hospital' ? 'เช่น โรงพยาบาลรามา' : 
                           selectedCategory === 'bank' ? 'เช่น ธนาคารกรุงเทพ สาขาสยาม' :
                           selectedCategory === 'government' ? 'เช่น สำนักงานเขตบางรัก' :
                           selectedCategory === 'restaurant' ? 'เช่น ร้านอาหารครัวคุณแม่' :
                           selectedCategory === 'salon' ? 'เช่น ร้านเสริมสวย Beauty Plus' :
                           'ระบุชื่อสถานที่'"
              class="text-input"
            />
            <button 
              v-if="placeName && !isCurrentPlaceFavorite"
              class="save-fav-btn"
              @click="showSaveFavoriteModal = true"
              title="บันทึกเป็นสถานที่โปรด"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </button>
            <div v-else-if="isCurrentPlaceFavorite" class="fav-badge">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Estimated Wait Time Preview -->
        <div v-if="estimatedWait" class="wait-time-card">
          <div class="wait-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div class="wait-info">
            <span class="wait-label">เวลารอโดยประมาณ</span>
            <span class="wait-value">{{ formatWaitTime(estimatedWait.time_based_wait) }}</span>
            <span class="wait-range">({{ estimatedWait.min_wait }}-{{ estimatedWait.max_wait }} นาที)</span>
          </div>
          <div class="wait-confidence" :style="{ color: getConfidenceColor(estimatedWait.confidence) }">
            {{ getConfidenceLabel(estimatedWait.confidence) }}
          </div>
        </div>
        <div v-else-if="loadingWaitTime" class="wait-time-card loading">
          <div class="loading-spinner small"></div>
          <span>กำลังคำนวณเวลารอ...</span>
        </div>

        <div class="form-group">
          <label class="form-label">ที่อยู่</label>
          <input 
            v-model="placeAddress"
            type="text"
            placeholder="ที่อยู่สถานที่ (ถ้ามี)"
            class="text-input"
          />
        </div>

        <div class="form-group">
          <label class="form-label">รายละเอียดเพิ่มเติม</label>
          <textarea 
            v-model="queueDetails"
            placeholder="ระบุรายละเอียดการจองคิว เช่น บริการที่ต้องการ, แผนกที่ต้องไป..."
            class="details-input"
            rows="3"
          ></textarea>
        </div>

        <!-- Recent Places Suggestion -->
        <div v-if="recentPlaces.length > 0 && categoryFavorites.length === 0" class="recent-places">
          <h3 class="subsection-title">สถานที่ล่าสุด</h3>
          <div class="place-chips">
            <button 
              v-for="place in recentPlaces.slice(0, 3)" 
              :key="place.id"
              class="place-chip"
              @click="placeName = place.name; placeAddress = place.address || ''"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="10" r="3"/>
                <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 10-16 0c0 3 2.7 7 8 11.7z"/>
              </svg>
              <span>{{ place.name }}</span>
            </button>
          </div>
        </div>

        <div class="step-actions">
          <button class="btn-secondary" @click="prevStep">ย้อนกลับ</button>
          <button class="btn-primary" @click="nextStep" :disabled="!canProceedFromPlace">ถัดไป</button>
        </div>
      </div>

      <!-- Step 3: Schedule -->
      <div v-show="currentStep === 'schedule'" class="step-content">
        <h2 class="section-title">เลือกวันและเวลา</h2>
        <p class="section-desc">เลือกวันและเวลาที่ต้องการจองคิว</p>

        <!-- Quick Date Selection -->
        <div class="form-group">
          <label class="form-label">วันที่ <span class="required">*</span></label>
          <div class="date-chips">
            <button 
              v-for="opt in dateOptions" 
              :key="opt.date"
              :class="['date-chip', { active: selectedDate === opt.date }]"
              @click="selectDate(opt.date)"
            >
              {{ opt.label }}
            </button>
          </div>
          <input 
            type="date" 
            v-model="selectedDate" 
            :min="today"
            class="date-input"
          />
        </div>

        <!-- Quick Time Slots -->
        <div class="form-group">
          <label class="form-label">เวลา <span class="required">*</span></label>
          <div class="time-slots">
            <button 
              v-for="slot in timeSlots" 
              :key="slot.time"
              :class="['time-slot', { active: selectedTime === slot.time }]"
              @click="selectTimeSlot(slot.time)"
            >
              <svg v-if="slot.icon === 'morning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              </svg>
              <svg v-else-if="slot.icon === 'late-morning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
              <svg v-else-if="slot.icon === 'afternoon'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 3v1M12 20v1M3 12h1M20 12h1M5.6 5.6l.7.7M17.7 17.7l.7.7M5.6 18.4l.7-.7M17.7 6.3l.7-.7"/>
                <circle cx="12" cy="12" r="4"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
              <span class="slot-label">{{ slot.label }}</span>
              <span class="slot-time">{{ slot.time }}</span>
            </button>
          </div>
          <input 
            type="time" 
            v-model="selectedTime"
            class="time-input"
          />
        </div>

        <div class="step-actions">
          <button class="btn-secondary" @click="prevStep">ย้อนกลับ</button>
          <button class="btn-primary" @click="nextStep" :disabled="!canProceedFromSchedule">ถัดไป</button>
        </div>
      </div>

      <!-- Step 4: Confirmation -->
      <div v-show="currentStep === 'confirm'" class="step-content">
        <h2 class="section-title">ยืนยันการจอง</h2>
        <p class="section-desc">ตรวจสอบข้อมูลก่อนยืนยันการจองคิว</p>

        <div class="confirm-card">
          <!-- Category -->
          <div class="confirm-row">
            <div class="confirm-icon" :style="{ background: getCategoryInfo(selectedCategory)?.color + '15', color: getCategoryInfo(selectedCategory)?.color }">
              <svg v-if="selectedCategory === 'hospital'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 21h18M9 8h6M12 5v6M5 21V7l7-4 7 4v14"/>
              </svg>
              <svg v-else-if="selectedCategory === 'bank'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
              </svg>
              <svg v-else-if="selectedCategory === 'government'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 21h18M4 21V10l8-6 8 6v11M9 21v-6h6v6"/>
              </svg>
              <svg v-else-if="selectedCategory === 'restaurant'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
              </svg>
              <svg v-else-if="selectedCategory === 'salon'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 3v18M18 3v18M6 8h12M6 16h12"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01"/>
              </svg>
            </div>
            <div class="confirm-info">
              <span class="confirm-label">ประเภท</span>
              <span class="confirm-value">{{ categoryLabels[selectedCategory as keyof typeof categoryLabels] }}</span>
            </div>
          </div>

          <!-- Place -->
          <div class="confirm-row" v-if="placeName">
            <div class="confirm-icon location">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="10" r="3"/>
                <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 10-16 0c0 3 2.7 7 8 11.7z"/>
              </svg>
            </div>
            <div class="confirm-info">
              <span class="confirm-label">สถานที่</span>
              <span class="confirm-value">{{ placeName }}</span>
              <span class="confirm-sub" v-if="placeAddress">{{ placeAddress }}</span>
            </div>
          </div>

          <!-- Schedule -->
          <div class="confirm-row">
            <div class="confirm-icon schedule">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
              </svg>
            </div>
            <div class="confirm-info">
              <span class="confirm-label">วันและเวลา</span>
              <span class="confirm-value">{{ formatDate(selectedDate) }}</span>
              <span class="confirm-sub">เวลา {{ formatTime(selectedTime) }}</span>
            </div>
          </div>

          <!-- Details -->
          <div class="confirm-row" v-if="queueDetails">
            <div class="confirm-icon details">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
              </svg>
            </div>
            <div class="confirm-info">
              <span class="confirm-label">รายละเอียด</span>
              <span class="confirm-value">{{ queueDetails }}</span>
            </div>
          </div>
        </div>

        <!-- Fee Info -->
        <div class="fee-card">
          <div class="fee-row">
            <span>ค่าบริการจองคิว</span>
            <span class="fee-amount">฿{{ serviceFee }}</span>
          </div>
          <div class="fee-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            <span>ชำระเงินหลังจากบริการเสร็จสิ้น</span>
          </div>
        </div>

        <div class="step-actions">
          <button class="btn-secondary" @click="prevStep">แก้ไข</button>
          <button 
            class="btn-primary submit" 
            @click="submitBooking" 
            :disabled="!isFormValid || loading"
          >
            <span v-if="loading" class="loading-spinner"></span>
            <span>{{ loading ? 'กำลังจอง...' : 'ยืนยันจองคิว' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Exit Confirmation Modal -->
    <div v-if="showExitConfirm" class="modal-overlay" @click.self="cancelExit">
      <div class="modal-content">
        <div class="modal-icon warning">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <path d="M12 9v4M12 17h.01"/>
          </svg>
        </div>
        <h3>ยกเลิกการจอง?</h3>
        <p>ข้อมูลที่กรอกไว้จะหายไป</p>
        <div class="modal-actions">
          <button class="btn-secondary" @click="cancelExit">กลับไปกรอก</button>
          <button class="btn-danger" @click="confirmExit">ยกเลิก</button>
        </div>
      </div>
    </div>

    <!-- Save Favorite Modal -->
    <div v-if="showSaveFavoriteModal" class="modal-overlay" @click.self="showSaveFavoriteModal = false">
      <div class="modal-content">
        <div class="modal-icon favorite">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
        <h3>บันทึกสถานที่โปรด</h3>
        <p>บันทึก "{{ placeName }}" เป็นสถานที่โปรดเพื่อจองคิวได้เร็วขึ้นในครั้งถัดไป</p>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showSaveFavoriteModal = false">ยกเลิก</button>
          <button class="btn-primary" @click="saveAsFavorite" :disabled="favoritesLoading">
            {{ favoritesLoading ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.queue-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  padding-top: calc(16px + env(safe-area-inset-top));
  border-bottom: 1px solid #F0F0F0;
  background: #FFFFFF;
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 12px;
  transition: background 0.15s;
}

.back-btn:active {
  background: #F5F5F5;
}

.back-btn svg {
  width: 24px;
  height: 24px;
  color: #1A1A1A;
}

.home-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 168, 107, 0.1);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.home-btn svg {
  width: 22px;
  height: 22px;
  color: #00A86B;
}

.home-btn:active {
  transform: scale(0.95);
  background: rgba(0, 168, 107, 0.2);
}

.header h1 {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
}

/* Progress Bar */
.progress-bar {
  display: flex;
  justify-content: space-between;
  padding: 20px 24px;
  position: relative;
  background: #FFFFFF;
}

.progress-line {
  position: absolute;
  top: 34px;
  left: 48px;
  right: 48px;
  height: 3px;
  background: #E8E8E8;
  border-radius: 2px;
  z-index: 0;
}

.progress-fill {
  height: 100%;
  background: #00A86B;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  z-index: 1;
}

.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #E8E8E8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #999999;
  transition: all 0.2s;
}

.step.active .step-dot {
  background: #00A86B;
  color: #FFFFFF;
  transform: scale(1.1);
}

.step.completed .step-dot {
  background: #00A86B;
  color: #FFFFFF;
}

.step.completed .step-dot svg {
  width: 16px;
  height: 16px;
}

.step-label {
  font-size: 11px;
  color: #999999;
  font-weight: 500;
}

.step.active .step-label,
.step.completed .step-label {
  color: #00A86B;
}

/* Active Alert */
.active-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 20px 16px;
  padding: 12px 16px;
  background: #E8F5EF;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.active-alert:active {
  background: #D0EBE0;
}

.active-alert svg {
  width: 20px;
  height: 20px;
  color: #00A86B;
  flex-shrink: 0;
}

.active-alert span {
  flex: 1;
  font-size: 14px;
  color: #00A86B;
  font-weight: 500;
}

.active-alert .arrow {
  width: 18px;
  height: 18px;
}

/* Content */
.content {
  flex: 1;
  padding: 0 20px 100px;
  overflow-y: auto;
}

.error-msg {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #FFEBEE;
  color: #E53935;
  border-radius: 12px;
  font-size: 14px;
  margin-bottom: 16px;
}

.error-msg svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.step-content {
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateX(10px); }
  to { opacity: 1; transform: translateX(0); }
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 6px;
}

.section-desc {
  font-size: 14px;
  color: #666666;
  margin: 0 0 20px;
}

/* Category List */
.category-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #FFFFFF;
  border: 2px solid #F0F0F0;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  width: 100%;
}

.category-card:active,
.category-card.pressed {
  transform: scale(0.98);
}

.category-card.active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 5%, white);
}

.cat-icon {
  width: 48px;
  height: 48px;
  background: color-mix(in srgb, var(--accent) 12%, white);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  flex-shrink: 0;
}

.cat-icon svg {
  width: 24px;
  height: 24px;
}

.cat-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cat-name {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.cat-desc {
  font-size: 13px;
  color: #666666;
}

.cat-check {
  width: 24px;
  height: 24px;
  background: var(--accent);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
}

.cat-check svg {
  width: 16px;
  height: 16px;
}

/* Form Styles */
.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.required {
  color: #E53935;
}

.text-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 15px;
  color: #1A1A1A;
  background: #FFFFFF;
  transition: border-color 0.15s;
}

.text-input:focus {
  outline: none;
  border-color: #00A86B;
}

.text-input::placeholder {
  color: #999999;
}

.details-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 15px;
  color: #1A1A1A;
  resize: none;
  font-family: inherit;
}

.details-input:focus {
  outline: none;
  border-color: #00A86B;
}

/* Recent Places */
.recent-places {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #F0F0F0;
}

.subsection-title {
  font-size: 13px;
  font-weight: 600;
  color: #666666;
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.place-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.place-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #F5F5F5;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  color: #1A1A1A;
  cursor: pointer;
  transition: background 0.15s;
}

.place-chip:active {
  background: #E8E8E8;
}

.place-chip svg {
  width: 16px;
  height: 16px;
  color: #666666;
}

/* Date & Time */
.date-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 12px;
  margin-bottom: 12px;
  -webkit-overflow-scrolling: touch;
}

.date-chip {
  padding: 10px 16px;
  background: #F5F5F5;
  border: 2px solid transparent;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s;
}

.date-chip.active {
  background: #E8F5EF;
  border-color: #00A86B;
  color: #00A86B;
}

.date-input,
.time-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 15px;
  color: #1A1A1A;
}

.date-input:focus,
.time-input:focus {
  outline: none;
  border-color: #00A86B;
}

.time-slots {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.time-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: #F5F5F5;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.time-slot.active {
  background: #E8F5EF;
  border-color: #00A86B;
}

.time-slot svg {
  width: 22px;
  height: 22px;
  color: #666666;
}

.time-slot.active svg {
  color: #00A86B;
}

.slot-label {
  font-size: 12px;
  font-weight: 600;
  color: #1A1A1A;
}

.slot-time {
  font-size: 11px;
  color: #666666;
}

.time-slot.active .slot-label,
.time-slot.active .slot-time {
  color: #00A86B;
}

/* Step Actions */
.step-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding: 20px 0;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  border-top: 1px solid #F0F0F0;
  background: #FFFFFF;
  /* Sticky CTA - ติดด้านล่างเสมอ */
  position: sticky;
  bottom: 0;
  z-index: 10;
}

.btn-secondary {
  flex: 1;
  padding: 16px;
  background: #F5F5F5;
  color: #1A1A1A;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-secondary:active {
  background: #E8E8E8;
}

.btn-primary {
  flex: 2;
  padding: 16px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary:not(:disabled):active {
  transform: scale(0.98);
}

.btn-primary.submit {
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Confirmation Card */
.confirm-card {
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 16px;
  overflow: hidden;
}

.confirm-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  border-bottom: 1px solid #F0F0F0;
}

.confirm-row:last-child {
  border-bottom: none;
}

.confirm-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.confirm-icon svg {
  width: 22px;
  height: 22px;
}

.confirm-icon.location {
  background: #E8F5EF;
  color: #00A86B;
}

.confirm-icon.schedule {
  background: #E3F2FD;
  color: #2196F3;
}

.confirm-icon.details {
  background: #FFF3E0;
  color: #F5A623;
}

.confirm-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.confirm-label {
  font-size: 12px;
  color: #999999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.confirm-value {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
}

.confirm-sub {
  font-size: 13px;
  color: #666666;
}

/* Fee Card */
.fee-card {
  margin-top: 16px;
  padding: 16px;
  background: #F5F5F5;
  border-radius: 14px;
}

.fee-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.fee-row span:first-child {
  font-size: 15px;
  color: #1A1A1A;
}

.fee-amount {
  font-size: 20px;
  font-weight: 700;
  color: #00A86B;
}

.fee-note {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #E8E8E8;
}

.fee-note svg {
  width: 16px;
  height: 16px;
  color: #999999;
  flex-shrink: 0;
}

.fee-note span {
  font-size: 13px;
  color: #666666;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: #FFFFFF;
  border-radius: 20px;
  padding: 24px;
  width: 100%;
  max-width: 320px;
  text-align: center;
}

.modal-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.modal-icon.warning {
  background: #FFF3E0;
  color: #F5A623;
}

.modal-icon svg {
  width: 28px;
  height: 28px;
}

.modal-content h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 8px;
}

.modal-content p {
  font-size: 14px;
  color: #666666;
  margin: 0 0 20px;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-actions .btn-secondary {
  flex: 1;
}

.btn-danger {
  flex: 1;
  padding: 14px;
  background: #E53935;
  color: #FFFFFF;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.btn-danger:active {
  opacity: 0.9;
}

/* Favorites Section */
.favorites-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #F0F0F0;
}

.favorites-section .subsection-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.favorites-section .subsection-title svg {
  width: 16px;
  height: 16px;
  color: #F5A623;
}

.favorite-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.favorite-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  background: #FFFFFF;
  border: 2px solid #F0F0F0;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  width: 100%;
}

.favorite-card:active {
  transform: scale(0.98);
}

.favorite-card.active {
  border-color: #00A86B;
  background: #E8F5EF;
}

.fav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.fav-name {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
}

.fav-visits {
  font-size: 12px;
  color: #999999;
  background: #F5F5F5;
  padding: 4px 8px;
  border-radius: 10px;
}

.fav-wait {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666666;
}

.fav-wait svg {
  width: 14px;
  height: 14px;
  color: #999999;
}

.fav-wait .confidence {
  font-size: 11px;
}

/* Input with action */
.input-with-action {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-action .text-input {
  padding-right: 50px;
}

.save-fav-btn {
  position: absolute;
  right: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFF3E0;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
}

.save-fav-btn:active {
  transform: scale(0.95);
}

.save-fav-btn svg {
  width: 20px;
  height: 20px;
  color: #F5A623;
}

.fav-badge {
  position: absolute;
  right: 12px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fav-badge svg {
  width: 20px;
  height: 20px;
  color: #F5A623;
}

/* Wait Time Card */
.wait-time-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #E3F2FD;
  border-radius: 14px;
  margin-bottom: 20px;
}

.wait-time-card.loading {
  background: #F5F5F5;
  justify-content: center;
  color: #666666;
  font-size: 14px;
}

.wait-icon {
  width: 44px;
  height: 44px;
  background: #FFFFFF;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wait-icon svg {
  width: 24px;
  height: 24px;
  color: #2196F3;
}

.wait-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wait-label {
  font-size: 12px;
  color: #666666;
}

.wait-value {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
}

.wait-range {
  font-size: 12px;
  color: #666666;
}

.wait-confidence {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  background: rgba(255,255,255,0.8);
  border-radius: 8px;
}

.loading-spinner.small {
  width: 16px;
  height: 16px;
  border-width: 2px;
  margin-right: 8px;
}

/* Modal favorite icon */
.modal-icon.favorite {
  background: #FFF3E0;
  color: #F5A623;
}
</style>
