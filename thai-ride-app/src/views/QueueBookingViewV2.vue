<script setup lang="ts">
/**
 * Feature: F158 - Queue Booking Service V2
 * Enhanced UX: Better flow, animations, quick booking
 * MUNEEF Style: Clean, modern, green accent
 */
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
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

// Step Flow - Simplified to 3 steps
type Step = 'select' | 'schedule' | 'confirm'
const currentStep = ref<Step>('select')

const steps = [
  { key: 'select', label: 'เลือกบริการ', number: 1 },
  { key: 'schedule', label: 'นัดหมาย', number: 2 },
  { key: 'confirm', label: 'ยืนยัน', number: 3 }
] as const

const currentStepIndex = computed(() => steps.findIndex(s => s.key === currentStep.value))

// Categories with icons
const categories = [
  { id: 'hospital', name: 'โรงพยาบาล', color: '#E53935', bgColor: '#FFEBEE', desc: 'นัดพบแพทย์, ตรวจสุขภาพ' },
  { id: 'bank', name: 'ธนาคาร', color: '#2196F3', bgColor: '#E3F2FD', desc: 'เปิดบัญชี, ทำธุรกรรม' },
  { id: 'government', name: 'หน่วยงานราชการ', color: '#9C27B0', bgColor: '#F3E5F5', desc: 'ทำบัตร, จดทะเบียน' },
  { id: 'restaurant', name: 'ร้านอาหาร', color: '#F5A623', bgColor: '#FFF8E1', desc: 'จองโต๊ะ, สั่งล่วงหน้า' },
  { id: 'salon', name: 'ร้านเสริมสวย', color: '#E91E63', bgColor: '#FCE4EC', desc: 'ทำผม, สปา, นวด' },
  { id: 'other', name: 'อื่นๆ', color: '#607D8B', bgColor: '#ECEFF1', desc: 'บริการอื่นๆ' }
] as const

// Form state
const selectedCategory = ref<'hospital' | 'bank' | 'government' | 'restaurant' | 'salon' | 'other' | ''>('')
const placeName = ref('')
const placeAddress = ref('')
const queueDetails = ref('')
const selectedDate = ref('')
const selectedTime = ref('')

// UI state
const showExitConfirm = ref(false)
const showSaveFavoriteModal = ref(false)
const selectedFavorite = ref<QueueFavoriteWithStats | null>(null)
const isQuickBooking = ref(false)

// Estimated wait time
const estimatedWait = ref<EstimatedWaitTime | null>(null)
const loadingWaitTime = ref(false)

// Set minimum date to today
const today = new Date().toISOString().split('T')[0]

// Initialize
onMounted(async () => {
  clearError()
  await Promise.all([fetchUserBookings(), fetchRecentPlaces(5), fetchFavorites()])
})

// Watch for place changes to fetch estimated wait time
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

// Navigation
const goBack = () => {
  if (currentStep.value === 'select') {
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

// Step navigation
const nextStep = () => {
  triggerHaptic('medium')
  const stepOrder: Step[] = ['select', 'schedule', 'confirm']
  const currentIndex = stepOrder.indexOf(currentStep.value)
  if (currentIndex < stepOrder.length - 1) {
    currentStep.value = stepOrder[currentIndex + 1] as Step
  }
}

const prevStep = () => {
  triggerHaptic('light')
  const stepOrder: Step[] = ['select', 'schedule', 'confirm']
  const currentIndex = stepOrder.indexOf(currentStep.value)
  if (currentIndex > 0) {
    currentStep.value = stepOrder[currentIndex - 1] as Step
  }
}

// Category selection
const selectCategory = (id: string) => {
  triggerHaptic('medium')
  selectedCategory.value = id as typeof selectedCategory.value
  selectedFavorite.value = null
  isQuickBooking.value = false
}

// Quick booking from favorite
const quickBookFromFavorite = (fav: QueueFavoriteWithStats) => {
  triggerHaptic('medium')
  selectedFavorite.value = fav
  selectedCategory.value = fav.category as typeof selectedCategory.value
  placeName.value = fav.place_name
  placeAddress.value = fav.place_address || ''
  queueDetails.value = fav.default_details || ''
  isQuickBooking.value = true
  
  if (fav.avg_wait_time) {
    estimatedWait.value = {
      avg_wait: fav.avg_wait_time,
      min_wait: Math.max(10, fav.avg_wait_time - 15),
      max_wait: fav.avg_wait_time + 30,
      time_based_wait: fav.avg_wait_time,
      confidence: fav.confidence
    }
  }
  
  // Auto advance to schedule
  nextTick(() => nextStep())
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
const canProceedFromSelect = computed(() => !!selectedCategory.value)
const canProceedFromSchedule = computed(() => {
  if (!selectedDate.value || !selectedTime.value) return false
  const scheduledDateTime = new Date(`${selectedDate.value}T${selectedTime.value}`)
  return scheduledDateTime > new Date()
})

const isFormValid = computed(() => 
  canProceedFromSelect.value && canProceedFromSchedule.value
)

// Quick time slots
const timeSlots = [
  { label: 'เช้า', time: '09:00', period: 'morning' },
  { label: 'สาย', time: '11:00', period: 'late-morning' },
  { label: 'บ่าย', time: '14:00', period: 'afternoon' },
  { label: 'เย็น', time: '17:00', period: 'evening' }
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
    let subLabel = ''
    if (i === 0) {
      label = 'วันนี้'
      subLabel = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
    } else if (i === 1) {
      label = 'พรุ่งนี้'
      subLabel = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
    } else {
      label = date.toLocaleDateString('th-TH', { weekday: 'short' })
      subLabel = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
    }
    
    options.push({ date: dateStr, label, subLabel })
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
    <header class="header">
      <button class="back-btn" @click="goBack" aria-label="ย้อนกลับ">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <h1>จองคิว</h1>
      <div class="header-spacer"></div>
    </header>

    <!-- Progress Steps -->
    <div class="progress-container">
      <div class="progress-steps">
        <div 
          v-for="(step, index) in steps" 
          :key="step.key"
          :class="['step', { active: index === currentStepIndex, completed: index < currentStepIndex }]"
        >
          <div class="step-indicator">
            <div class="step-dot">
              <svg v-if="index < currentStepIndex" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <span v-else>{{ step.number }}</span>
            </div>
          </div>
          <span class="step-label">{{ step.label }}</span>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }"></div>
      </div>
    </div>

    <!-- Active Bookings Alert -->
    <div v-if="activeBookings.length > 0" class="active-alert" @click="router.push('/customer/queue-history')">
      <div class="alert-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      </div>
      <div class="alert-content">
        <span class="alert-title">คิวที่กำลังดำเนินการ</span>
        <span class="alert-count">{{ activeBookings.length }} รายการ</span>
      </div>
      <svg class="alert-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </div>

    <!-- Main Content -->
    <main class="content">
      <!-- Error Message -->
      <div v-if="error" class="error-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
        <span>{{ error }}</span>
      </div>

      <!-- Step 1: Select Service -->
      <section v-show="currentStep === 'select'" class="step-content">
        <!-- Quick Booking from Favorites -->
        <div v-if="topFavorites.length > 0" class="quick-section">
          <h2 class="section-title">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            จองด่วนจากสถานที่โปรด
          </h2>
          <div class="quick-cards">
            <button 
              v-for="fav in topFavorites.slice(0, 3)" 
              :key="fav.id"
              class="quick-card"
              @click="quickBookFromFavorite(fav)"
            >
              <div class="quick-card-header">
                <span class="quick-name">{{ fav.place_name }}</span>
                <span class="quick-badge">{{ fav.visit_count }}x</span>
              </div>
              <div class="quick-card-meta">
                <span class="quick-category">{{ categoryLabels[fav.category as keyof typeof categoryLabels] }}</span>
                <span v-if="fav.avg_wait_time" class="quick-wait">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  {{ formatWaitTime(fav.avg_wait_time) }}
                </span>
              </div>
            </button>
          </div>
        </div>

        <!-- Category Selection -->
        <div class="category-section">
          <h2 class="section-title">เลือกประเภทบริการ</h2>
          <div class="category-grid">
            <button 
              v-for="cat in categories" 
              :key="cat.id"
              :class="['category-card', { active: selectedCategory === cat.id }]"
              :style="{ '--cat-color': cat.color, '--cat-bg': cat.bgColor }"
              @click="selectCategory(cat.id)"
            >
              <div class="cat-icon-wrap">
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
                  <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3v7"/>
                </svg>
                <svg v-else-if="cat.id === 'salon'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 3v18M18 3v18M6 8h12M6 16h12"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              </div>
              <span class="cat-name">{{ cat.name }}</span>
              <div v-if="selectedCategory === cat.id" class="cat-check">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
            </button>
          </div>
        </div>

        <!-- Place Details (shown when category selected) -->
        <div v-if="selectedCategory" class="place-section">
          <h3 class="subsection-title">ข้อมูลสถานที่</h3>
          
          <!-- Category Favorites -->
          <div v-if="categoryFavorites.length > 0" class="fav-chips">
            <button 
              v-for="fav in categoryFavorites.slice(0, 4)" 
              :key="fav.id"
              :class="['fav-chip', { active: selectedFavorite?.id === fav.id }]"
              @click="quickBookFromFavorite(fav)"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              {{ fav.place_name }}
            </button>
          </div>

          <div class="form-group">
            <label class="form-label">ชื่อสถานที่</label>
            <div class="input-wrapper">
              <input 
                v-model="placeName"
                type="text"
                :placeholder="getCategoryInfo(selectedCategory)?.desc || 'ระบุชื่อสถานที่'"
                class="text-input"
              />
              <button 
                v-if="placeName && !isCurrentPlaceFavorite"
                class="input-action"
                @click="showSaveFavoriteModal = true"
                title="บันทึกเป็นสถานที่โปรด"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </button>
              <div v-else-if="isCurrentPlaceFavorite" class="input-badge">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Wait Time Preview -->
          <div v-if="estimatedWait" class="wait-preview">
            <div class="wait-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div class="wait-info">
              <span class="wait-label">เวลารอโดยประมาณ</span>
              <span class="wait-value">{{ formatWaitTime(estimatedWait.time_based_wait) }}</span>
            </div>
            <span class="wait-confidence" :style="{ color: getConfidenceColor(estimatedWait.confidence) }">
              {{ getConfidenceLabel(estimatedWait.confidence) }}
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">รายละเอียดเพิ่มเติม</label>
            <textarea 
              v-model="queueDetails"
              placeholder="เช่น บริการที่ต้องการ, แผนกที่ต้องไป..."
              class="textarea-input"
              rows="2"
            ></textarea>
          </div>
        </div>

        <!-- Next Button -->
        <div class="step-footer">
          <button 
            class="btn-primary"
            :disabled="!canProceedFromSelect"
            @click="nextStep"
          >
            ถัดไป
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </section>

      <!-- Step 2: Schedule -->
      <section v-show="currentStep === 'schedule'" class="step-content">
        <h2 class="section-title">เลือกวันและเวลา</h2>

        <!-- Date Selection -->
        <div class="schedule-group">
          <label class="form-label">วันที่ <span class="required">*</span></label>
          <div class="date-scroll">
            <button 
              v-for="opt in dateOptions" 
              :key="opt.date"
              :class="['date-card', { active: selectedDate === opt.date }]"
              @click="selectDate(opt.date)"
            >
              <span class="date-label">{{ opt.label }}</span>
              <span class="date-sub">{{ opt.subLabel }}</span>
            </button>
          </div>
        </div>

        <!-- Time Selection -->
        <div class="schedule-group">
          <label class="form-label">เวลา <span class="required">*</span></label>
          <div class="time-grid">
            <button 
              v-for="slot in timeSlots" 
              :key="slot.time"
              :class="['time-card', { active: selectedTime === slot.time }]"
              @click="selectTimeSlot(slot.time)"
            >
              <svg v-if="slot.period === 'morning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              </svg>
              <svg v-else-if="slot.period === 'late-morning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2"/>
              </svg>
              <svg v-else-if="slot.period === 'afternoon'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 3v1M12 20v1M3 12h1M20 12h1M5.6 5.6l.7.7M17.7 17.7l.7.7"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
              <span class="time-label">{{ slot.label }}</span>
              <span class="time-value">{{ slot.time }}</span>
            </button>
          </div>
          <input 
            type="time" 
            v-model="selectedTime"
            class="time-input"
          />
        </div>

        <!-- Footer Actions -->
        <div class="step-footer dual">
          <button class="btn-secondary" @click="prevStep">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            ย้อนกลับ
          </button>
          <button 
            class="btn-primary"
            :disabled="!canProceedFromSchedule"
            @click="nextStep"
          >
            ถัดไป
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </section>

      <!-- Step 3: Confirmation -->
      <section v-show="currentStep === 'confirm'" class="step-content">
        <h2 class="section-title">ยืนยันการจอง</h2>

        <div class="confirm-card">
          <!-- Category & Place -->
          <div class="confirm-item">
            <div class="confirm-icon" :style="{ background: getCategoryInfo(selectedCategory)?.bgColor, color: getCategoryInfo(selectedCategory)?.color }">
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
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3v7"/>
              </svg>
              <svg v-else-if="selectedCategory === 'salon'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 3v18M18 3v18M6 8h12M6 16h12"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 2v4M12 18v4"/>
              </svg>
            </div>
            <div class="confirm-info">
              <span class="confirm-label">ประเภท</span>
              <span class="confirm-value">{{ categoryLabels[selectedCategory as keyof typeof categoryLabels] }}</span>
              <span v-if="placeName" class="confirm-sub">{{ placeName }}</span>
            </div>
          </div>

          <!-- Schedule -->
          <div class="confirm-item">
            <div class="confirm-icon schedule">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
            </div>
            <div class="confirm-info">
              <span class="confirm-label">วันและเวลา</span>
              <span class="confirm-value">{{ formatDate(selectedDate) }}</span>
              <span class="confirm-sub">เวลา {{ formatTime(selectedTime) }}</span>
            </div>
          </div>

          <!-- Details -->
          <div v-if="queueDetails" class="confirm-item">
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

        <!-- Fee Summary -->
        <div class="fee-summary">
          <div class="fee-row">
            <span>ค่าบริการจองคิว</span>
            <span class="fee-amount">฿{{ serviceFee }}</span>
          </div>
          <p class="fee-note">ชำระเงินหลังจากบริการเสร็จสิ้น</p>
        </div>

        <!-- Footer Actions -->
        <div class="step-footer dual">
          <button class="btn-secondary" @click="prevStep">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            แก้ไข
          </button>
          <button 
            class="btn-primary submit"
            :disabled="!isFormValid || loading"
            @click="submitBooking"
          >
            <span v-if="loading" class="spinner"></span>
            <span>{{ loading ? 'กำลังจอง...' : 'ยืนยันจองคิว' }}</span>
          </button>
        </div>
      </section>
    </main>

    <!-- Exit Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showExitConfirm" class="modal-overlay" @click.self="showExitConfirm = false">
        <div class="modal-box">
          <div class="modal-icon warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <path d="M12 9v4M12 17h.01"/>
            </svg>
          </div>
          <h3>ยกเลิกการจอง?</h3>
          <p>ข้อมูลที่กรอกไว้จะหายไป</p>
          <div class="modal-actions">
            <button class="btn-secondary" @click="showExitConfirm = false">กลับไปกรอก</button>
            <button class="btn-danger" @click="confirmExit">ยกเลิก</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Save Favorite Modal -->
    <Teleport to="body">
      <div v-if="showSaveFavoriteModal" class="modal-overlay" @click.self="showSaveFavoriteModal = false">
        <div class="modal-box">
          <div class="modal-icon favorite">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <h3>บันทึกสถานที่โปรด</h3>
          <p>บันทึก "{{ placeName }}" เพื่อจองคิวได้เร็วขึ้นในครั้งถัดไป</p>
          <div class="modal-actions">
            <button class="btn-secondary" @click="showSaveFavoriteModal = false">ยกเลิก</button>
            <button class="btn-primary" @click="saveAsFavorite" :disabled="favoritesLoading">
              {{ favoritesLoading ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* Base Layout */
.queue-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top));
  background: #FFFFFF;
  border-bottom: 1px solid #F0F0F0;
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
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.back-btn:active { background: #F5F5F5; }
.back-btn svg { width: 24px; height: 24px; color: #1A1A1A; }

.header h1 {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
}

.header-spacer { width: 40px; }

/* Progress */
.progress-container {
  padding: 16px 20px;
  background: #FFFFFF;
}

.progress-steps {
  display: flex;
  justify-content: space-between;
  position: relative;
  margin-bottom: 8px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  z-index: 1;
}

.step-indicator { position: relative; }

.step-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #E8E8E8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #999999;
  transition: all 0.2s;
}

.step.active .step-dot {
  background: #00A86B;
  color: #FFFFFF;
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 168, 107, 0.3);
}

.step.completed .step-dot {
  background: #00A86B;
  color: #FFFFFF;
}

.step.completed .step-dot svg { width: 18px; height: 18px; }

.step-label {
  font-size: 12px;
  color: #999999;
  font-weight: 500;
}

.step.active .step-label,
.step.completed .step-label { color: #00A86B; }

.progress-bar {
  height: 4px;
  background: #E8E8E8;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00A86B, #00C77B);
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* Active Alert */
.active-alert {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 16px 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #E8F5EF 0%, #D4EDDA 100%);
  border-radius: 14px;
  cursor: pointer;
  transition: transform 0.15s;
}

.active-alert:active { transform: scale(0.98); }

.alert-icon {
  width: 40px;
  height: 40px;
  background: #FFFFFF;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-icon svg { width: 20px; height: 20px; color: #00A86B; }

.alert-content { flex: 1; }

.alert-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.alert-count {
  font-size: 12px;
  color: #00A86B;
}

.alert-arrow { width: 20px; height: 20px; color: #00A86B; }

/* Content */
.content {
  flex: 1;
  padding: 0 16px 100px;
  overflow-y: auto;
}

.error-banner {
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

.error-banner svg { width: 20px; height: 20px; flex-shrink: 0; }

.step-content {
  animation: slideIn 0.25s ease;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 16px;
}

.section-title svg {
  width: 20px;
  height: 20px;
  color: #F5A623;
}

.subsection-title {
  font-size: 14px;
  font-weight: 600;
  color: #666666;
  margin: 20px 0 12px;
}

/* Quick Booking Section */
.quick-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #F0F0F0;
}

.quick-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #FFFFFF 0%, #FAFAFA 100%);
  border: 2px solid #F0F0F0;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  width: 100%;
}

.quick-card:active {
  transform: scale(0.98);
  border-color: #00A86B;
}

.quick-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quick-name {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
}

.quick-badge {
  font-size: 11px;
  font-weight: 600;
  color: #00A86B;
  background: #E8F5EF;
  padding: 4px 8px;
  border-radius: 8px;
}

.quick-card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quick-category {
  font-size: 12px;
  color: #666666;
}

.quick-wait {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #999999;
}

.quick-wait svg { width: 14px; height: 14px; }

/* Category Grid */
.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.category-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  background: var(--cat-bg);
  border: 2px solid transparent;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
}

.category-card:active { transform: scale(0.95); }

.category-card.active {
  border-color: var(--cat-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.cat-icon-wrap {
  width: 48px;
  height: 48px;
  background: #FFFFFF;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--cat-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.cat-icon-wrap svg { width: 24px; height: 24px; }

.cat-name {
  font-size: 12px;
  font-weight: 600;
  color: #1A1A1A;
  text-align: center;
}

.cat-check {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  background: var(--cat-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
}

.cat-check svg { width: 14px; height: 14px; }

/* Place Section */
.place-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #F0F0F0;
}

.fav-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.fav-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #FFF8E1;
  border: 2px solid transparent;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
  cursor: pointer;
  transition: all 0.15s;
}

.fav-chip svg { width: 14px; height: 14px; color: #F5A623; }

.fav-chip:active,
.fav-chip.active {
  border-color: #F5A623;
  background: #FFF3E0;
}

/* Form Elements */
.form-group { margin-bottom: 16px; }

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.required { color: #E53935; }

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.text-input {
  width: 100%;
  padding: 14px 16px;
  padding-right: 48px;
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

.text-input::placeholder { color: #999999; }

.input-action {
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
  transition: transform 0.15s;
}

.input-action:active { transform: scale(0.9); }
.input-action svg { width: 18px; height: 18px; color: #F5A623; }

.input-badge {
  position: absolute;
  right: 12px;
}

.input-badge svg { width: 20px; height: 20px; color: #F5A623; }

.textarea-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 15px;
  color: #1A1A1A;
  resize: none;
  font-family: inherit;
}

.textarea-input:focus {
  outline: none;
  border-color: #00A86B;
}

/* Wait Preview */
.wait-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #E3F2FD;
  border-radius: 12px;
  margin-bottom: 16px;
}

.wait-icon {
  width: 40px;
  height: 40px;
  background: #FFFFFF;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wait-icon svg { width: 20px; height: 20px; color: #2196F3; }

.wait-info { flex: 1; }

.wait-label {
  display: block;
  font-size: 11px;
  color: #666666;
}

.wait-value {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
}

.wait-confidence {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  background: rgba(255,255,255,0.8);
  border-radius: 6px;
}

/* Schedule Section */
.schedule-group { margin-bottom: 20px; }

.date-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 8px;
  -webkit-overflow-scrolling: touch;
}

.date-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 72px;
  padding: 12px 16px;
  background: #F5F5F5;
  border: 2px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.date-card:active { transform: scale(0.95); }

.date-card.active {
  background: #E8F5EF;
  border-color: #00A86B;
}

.date-label {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.date-sub {
  font-size: 11px;
  color: #666666;
}

.date-card.active .date-label,
.date-card.active .date-sub { color: #00A86B; }

.time-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.time-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  background: #F5F5F5;
  border: 2px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.time-card:active { transform: scale(0.95); }

.time-card.active {
  background: #E8F5EF;
  border-color: #00A86B;
}

.time-card svg {
  width: 24px;
  height: 24px;
  color: #666666;
}

.time-card.active svg { color: #00A86B; }

.time-label {
  font-size: 12px;
  font-weight: 600;
  color: #1A1A1A;
}

.time-value {
  font-size: 11px;
  color: #666666;
}

.time-card.active .time-label,
.time-card.active .time-value { color: #00A86B; }

.time-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 15px;
  color: #1A1A1A;
}

.time-input:focus {
  outline: none;
  border-color: #00A86B;
}

/* Confirmation */
.confirm-card {
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 16px;
  overflow: hidden;
}

.confirm-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  border-bottom: 1px solid #F0F0F0;
}

.confirm-item:last-child { border-bottom: none; }

.confirm-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.confirm-icon svg { width: 22px; height: 22px; }

.confirm-icon.schedule {
  background: #E3F2FD;
  color: #2196F3;
}

.confirm-icon.details {
  background: #FFF3E0;
  color: #F5A623;
}

.confirm-info { flex: 1; }

.confirm-label {
  display: block;
  font-size: 11px;
  color: #999999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.confirm-value {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
}

.confirm-sub {
  display: block;
  font-size: 13px;
  color: #666666;
  margin-top: 2px;
}

/* Fee Summary */
.fee-summary {
  margin-top: 16px;
  padding: 16px;
  background: #F5F5F5;
  border-radius: 14px;
}

.fee-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.fee-row span:first-child {
  font-size: 15px;
  color: #1A1A1A;
}

.fee-amount {
  font-size: 22px;
  font-weight: 700;
  color: #00A86B;
}

.fee-note {
  font-size: 12px;
  color: #666666;
  margin: 12px 0 0;
  padding-top: 12px;
  border-top: 1px solid #E8E8E8;
}

/* Footer Actions */
.step-footer {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 0;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background: #FFFFFF;
  border-top: 1px solid #F0F0F0;
  margin-top: 24px;
}

.step-footer.dual {
  display: flex;
  gap: 12px;
}

.btn-secondary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px;
  background: #F5F5F5;
  color: #1A1A1A;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-secondary:active { background: #E8E8E8; }
.btn-secondary svg { width: 18px; height: 18px; }

.btn-primary {
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 24px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary:not(:disabled):active { transform: scale(0.98); }
.btn-primary svg { width: 18px; height: 18px; }

.btn-primary.submit {
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

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

.btn-danger:active { opacity: 0.9; }

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
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-box {
  background: #FFFFFF;
  border-radius: 20px;
  padding: 24px;
  width: 100%;
  max-width: 320px;
  text-align: center;
  animation: scaleIn 0.2s ease;
}

@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
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

.modal-icon.favorite {
  background: #FFF3E0;
  color: #F5A623;
}

.modal-icon svg { width: 28px; height: 28px; }

.modal-box h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 8px;
}

.modal-box p {
  font-size: 14px;
  color: #666666;
  margin: 0 0 20px;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-actions .btn-secondary,
.modal-actions .btn-primary,
.modal-actions .btn-danger {
  flex: 1;
  padding: 14px;
}
</style>
