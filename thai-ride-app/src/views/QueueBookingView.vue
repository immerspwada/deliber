<script setup lang="ts">
/**
 * Feature: F158 - Queue Booking Service
 * MUNEEF Style UI - Clean, Modern, and Efficient
 * UX Flow: 1.ประเภท → 2.สถานที่ → 3.วันเวลา → 4.ยืนยัน
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQueueBooking, type CreateQueueBookingInput } from '../composables/useQueueBooking';
import { useToast } from '../composables/useToast';

const router = useRouter();
const { 
  createQueueBooking, 
  loading, 
  error: bookingError,
  walletBalance,
  subscribeToBooking,  // ✅ Added for realtime updates
  unsubscribe,         // ✅ Added for cleanup
  currentBooking       // ✅ Added to watch status changes
} = useQueueBooking();

// Debug: Log balance changes
watch(() => walletBalance.balance.value, (newBalance) => {
  console.log('💰 Balance changed in QueueBookingView:', newBalance);
}, { immediate: true });

const { success: showSuccess, error: showError } = useToast();

// ✅ Watch for realtime status updates
watch(() => currentBooking.value?.status, (newStatus, oldStatus) => {
  if (newStatus && newStatus !== oldStatus) {
    console.log('📡 Queue booking status updated:', oldStatus, '→', newStatus);
    
    // Show user-friendly notifications
    switch (newStatus) {
      case 'confirmed':
        showSuccess('✅ ไรเดอร์รับงานแล้ว! กำลังเดินทางมา');
        break;
      case 'in_progress':
        showSuccess('🚗 ไรเดอร์กำลังดำเนินการ');
        break;
      case 'completed':
        showSuccess('🎉 งานเสร็จสิ้นแล้ว!');
        break;
      case 'cancelled':
        showError('❌ งานถูกยกเลิก');
        break;
    }
  }
});

// Step Flow
type Step = 'category' | 'place' | 'datetime' | 'confirm';
const currentStep = ref<Step>('category');

// Form Data
const selectedCategory = ref<CreateQueueBookingInput['category'] | null>(null);
const placeName = ref('');
const placeAddress = ref('');
const details = ref('');
const selectedDate = ref('');
const selectedTime = ref('');

// UI State
const showExitConfirm = ref(false);
const pressedButton = ref<string | null>(null);

// Categories with friendly SVG icons and warm colors
const categories = [
  { 
    id: 'hospital', 
    label: 'โรงพยาบาล', 
    icon: 'hospital', 
    color: '#FF5252', 
    bgColor: '#FFEBEE',
    desc: 'จองคิวตรวจ/รักษา' 
  },
  { 
    id: 'bank', 
    label: 'ธนาคาร', 
    icon: 'bank', 
    color: '#2196F3', 
    bgColor: '#E3F2FD',
    desc: 'จองคิวทำธุรกรรม' 
  },
  { 
    id: 'government', 
    label: 'หน่วยงานราชการ', 
    icon: 'government', 
    color: '#9C27B0', 
    bgColor: '#F3E5F5',
    desc: 'จองคิวติดต่อราชการ' 
  },
  { 
    id: 'restaurant', 
    label: 'ร้านอาหาร', 
    icon: 'restaurant', 
    color: '#FF9800', 
    bgColor: '#FFF3E0',
    desc: 'จองโต๊ะอาหาร' 
  },
  { 
    id: 'salon', 
    label: 'ร้านเสริมสวย', 
    icon: 'salon', 
    color: '#E91E63', 
    bgColor: '#FCE4EC',
    desc: 'จองคิวทำผม/เล็บ' 
  },
  { 
    id: 'other', 
    label: 'อื่นๆ', 
    icon: 'other', 
    color: '#757575', 
    bgColor: '#F5F5F5',
    desc: 'จองคิวอื่นๆ' 
  }
] as const;

// SVG Icon Component Helper - Friendly Rounded Icons
const getCategoryIcon = (iconName: string) => {
  const icons: Record<string, string> = {
    // Hospital - Friendly medical cross with heart
    hospital: '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.3"/>',
    
    // Bank - Friendly building with smile
    bank: '<path d="M6.5 10h-2v7h2v-7zm6 0h-2v7h2v-7zm8.5 9H2v2h19v-2zm-2.5-9h-2v7h2v-7zm-7-6.74L16.71 6H6.29l5.21-2.74m0-2.26L2 6v2h19V6l-9.5-5z" fill="currentColor"/><path d="M12 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z" fill="currentColor" opacity="0.5"/>',
    
    // Government - Friendly government building
    government: '<path d="M12 3L2 8v2h20V8L12 3zm0 2.5l6 3H6l6-3z" fill="currentColor"/><path d="M4 11v8h3v-8H4zm6.5 0v8h3v-8h-3zM17 11v8h3v-8h-3z" fill="currentColor"/><path d="M2 20h20v2H2v-2z" fill="currentColor"/><circle cx="12" cy="7" r="1" fill="currentColor" opacity="0.5"/>',
    
    // Restaurant - Friendly fork and spoon
    restaurant: '<path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" fill="currentColor"/><circle cx="8" cy="4" r="1" fill="currentColor" opacity="0.3"/><circle cx="18" cy="4" r="1" fill="currentColor" opacity="0.3"/>',
    
    // Salon - Friendly person with sparkles
    salon: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="currentColor"/><circle cx="9" cy="7" r="0.8" fill="currentColor" opacity="0.5"/><circle cx="15" cy="7" r="0.8" fill="currentColor" opacity="0.5"/><circle cx="12" cy="4" r="0.8" fill="currentColor" opacity="0.5"/>',
    
    // Other - Friendly list with checkmark
    other: '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2z" fill="currentColor"/><path d="M7 15h10v2H7v-2z" fill="currentColor" opacity="0.7"/><circle cx="19" cy="5" r="1.5" fill="currentColor" opacity="0.4"/>'
  };
  return icons[iconName] || icons.other;
};

// Step labels
const stepLabels = [
  { key: 'category', label: 'ประเภท', number: 1 },
  { key: 'place', label: 'สถานที่', number: 2 },
  { key: 'datetime', label: 'วันเวลา', number: 3 },
  { key: 'confirm', label: 'ยืนยัน', number: 4 }
] as const;

const currentStepIndex = computed(() => 
  stepLabels.findIndex(s => s.key === currentStep.value)
);

const hasEnteredData = computed(() => 
  selectedCategory.value || placeName.value || placeAddress.value || details.value
);

const canSubmit = computed(() => 
  selectedCategory.value && 
  placeName.value.trim() && 
  selectedDate.value && 
  selectedTime.value
);

// Get minimum date (today)
const minDate = computed(() => {
  const today = new Date();
  return today.toISOString().split('T')[0];
});

// Get minimum time (if today is selected)
const minTime = computed(() => {
  if (selectedDate.value === minDate.value) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  return '00:00';
});

// Haptic feedback
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 25, heavy: 50 };
    navigator.vibrate(patterns[type]);
  }
};

const handleButtonPress = (id: string) => {
  pressedButton.value = id;
  triggerHaptic('light');
};

const handleButtonRelease = () => {
  pressedButton.value = null;
};

// Navigation
const goBack = () => {
  triggerHaptic('light');
  if (currentStep.value === 'place') currentStep.value = 'category';
  else if (currentStep.value === 'datetime') currentStep.value = 'place';
  else if (currentStep.value === 'confirm') currentStep.value = 'datetime';
  else router.push('/customer');
};

const goHome = () => {
  triggerHaptic('medium');
  if (hasEnteredData.value) {
    showExitConfirm.value = true;
  } else {
    router.push('/customer');
  }
};

const confirmExit = () => {
  triggerHaptic('heavy');
  showExitConfirm.value = false;
  router.push('/customer');
};

const cancelExit = () => {
  triggerHaptic('light');
  showExitConfirm.value = false;
};

const goToStep = (targetStep: Step) => {
  const targetIndex = stepLabels.findIndex(s => s.key === targetStep);
  if (targetIndex <= currentStepIndex.value) {
    currentStep.value = targetStep;
  }
};

// Category selection
const selectCategory = (categoryId: typeof categories[number]['id']) => {
  triggerHaptic('medium');
  selectedCategory.value = categoryId;
  setTimeout(() => {
    currentStep.value = 'place';
  }, 200);
};

// Submit booking
const handleSubmit = async () => {
  if (!canSubmit.value || !selectedCategory.value) {
    showError('กรุณากรอกข้อมูลให้ครบถ้วน');
    return;
  }

  triggerHaptic('heavy');

  try {
    const input: CreateQueueBookingInput = {
      category: selectedCategory.value,
      place_name: placeName.value,
      place_address: placeAddress.value || placeName.value,
      details: details.value || undefined,
      scheduled_date: selectedDate.value,
      scheduled_time: selectedTime.value
    };

    const result = await createQueueBooking(input);

    if (result) {
      showSuccess('จองคิวสำเร็จ!');
      triggerHaptic('heavy');
      
      // ✅ Subscribe to realtime updates for this booking
      subscribeToBooking(result.id);
      console.log('📡 Subscribed to queue booking updates:', result.id);
      
      router.push(`/customer/queue-booking/${result.id}`);
    } else if (bookingError.value) {
      showError(bookingError.value);
    } else {
      showError('ไม่สามารถจองคิวได้ กรุณาลองใหม่');
    }
  } catch (err: any) {
    console.error('❌ Error in handleSubmit:', err);
    showError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
  }
};

// Set default date to today
onMounted(() => {
  selectedDate.value = minDate.value;
});

// ✅ Cleanup realtime subscription on unmount
onUnmounted(() => {
  unsubscribe();
  console.log('🔌 Unsubscribed from queue booking updates');
});
</script>

<template>
  <div class="queue-booking-page">
    <!-- Exit Confirmation Dialog -->
    <Transition name="modal">
      <div v-if="showExitConfirm" class="confirm-overlay" @click.self="cancelExit">
        <div class="confirm-dialog">
          <div class="confirm-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#F5A623" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h3 class="confirm-title">ออกจากหน้านี้?</h3>
          <p class="confirm-message">ข้อมูลที่กรอกไว้จะหายไป</p>
          <div class="confirm-actions">
            <button class="confirm-btn cancel" @click="cancelExit">ยกเลิก</button>
            <button class="confirm-btn exit" @click="confirmExit">ออก</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Top Bar -->
    <div class="top-bar">
      <button class="nav-btn" @click="goBack" aria-label="ย้อนกลับ">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <span class="page-title">จองคิว</span>
      <button class="nav-btn home-btn" title="กลับหน้าหลัก" @click="goHome" aria-label="กลับหน้าหลัก">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9,22 9,12 15,12 15,22" />
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div class="content-wrapper">
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
              clickable: index < currentStepIndex
            }
          ]"
          @click="goToStep(s.key)"
        >
          <div class="step-number">
            <template v-if="index < currentStepIndex">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </template>
            <template v-else>{{ s.number }}</template>
          </div>
          <span class="step-label">{{ s.label }}</span>
        </div>
      </div>

      <!-- Step 1: Category Selection -->
      <template v-if="currentStep === 'category'">
        <div class="step-content animate-step">
          <h2 class="step-title">เลือกประเภทการจองคิว</h2>
          <p class="step-subtitle">คุณต้องการจองคิวที่ไหน?</p>

          <div class="categories-grid">
            <button
              v-for="cat in categories"
              :key="cat.id"
              :class="[
                'category-card',
                { 
                  selected: selectedCategory === cat.id,
                  'is-pressed': pressedButton === cat.id
                }
              ]"
              :style="{ 
                '--category-color': cat.color,
                '--icon-bg': cat.bgColor
              }"
              @mousedown="handleButtonPress(cat.id)"
              @mouseup="handleButtonRelease"
              @touchstart="handleButtonPress(cat.id)"
              @touchend="handleButtonRelease"
              @click="selectCategory(cat.id)"
            >
              <div class="category-icon" :style="{ color: cat.color, background: cat.bgColor }">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <g v-html="getCategoryIcon(cat.icon)"></g>
                </svg>
              </div>
              <div class="category-info">
                <span class="category-label">{{ cat.label }}</span>
                <span class="category-desc">{{ cat.desc }}</span>
              </div>
              <div v-if="selectedCategory === cat.id" class="category-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </template>

      <!-- Step 2: Place Details -->
      <template v-else-if="currentStep === 'place'">
        <div class="step-content animate-step">
          <h2 class="step-title">ข้อมูลสถานที่</h2>
          <p class="step-subtitle">ระบุสถานที่ที่ต้องการจองคิว</p>

          <!-- Selected Category Badge -->
          <div class="selected-badge">
            <div 
              class="badge-icon" 
              :style="{ 
                color: categories.find(c => c.id === selectedCategory)?.color,
                background: categories.find(c => c.id === selectedCategory)?.bgColor,
                '--icon-bg': categories.find(c => c.id === selectedCategory)?.bgColor
              }"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <g v-html="getCategoryIcon(categories.find(c => c.id === selectedCategory)?.icon || 'other')"></g>
              </svg>
            </div>
            <span class="badge-label">{{ categories.find(c => c.id === selectedCategory)?.label }}</span>
            <button class="badge-change" @click="currentStep = 'category'" aria-label="เปลี่ยนประเภท">เปลี่ยน</button>
          </div>

          <!-- Place Name -->
          <div class="form-card">
            <label class="input-label">ชื่อสถานที่ <span class="required">*</span></label>
            <input
              v-model="placeName"
              type="text"
              placeholder="เช่น โรงพยาบาลรามาธิบดี, ธนาคารกรุงเทพ สาขาสยาม"
              class="input-field"
              maxlength="200"
            />
            <p class="input-hint">ระบุชื่อสถานที่ให้ชัดเจน</p>
          </div>

          <!-- Place Address -->
          <div class="form-card">
            <label class="input-label">ที่อยู่ (ถ้ามี)</label>
            <textarea
              v-model="placeAddress"
              placeholder="เช่น 270 ถนนพระราม 6 แขวงทุ่งพญาไท เขตราชเทวี กรุงเทพฯ"
              class="textarea-field"
              rows="3"
              maxlength="500"
            />
            <p class="input-hint">ระบุที่อยู่เพื่อความสะดวกในการเดินทาง</p>
          </div>

          <!-- Details -->
          <div class="form-card">
            <label class="input-label">รายละเอียดเพิ่มเติม</label>
            <textarea
              v-model="details"
              placeholder="เช่น ต้องการตรวจเลือด, ทำธุรกรรมเปิดบัญชี, ขอใบรับรองต่างๆ"
              class="textarea-field"
              rows="3"
              maxlength="1000"
            />
            <p class="input-hint">ระบุรายละเอียดที่ต้องการให้ทราบ</p>
          </div>

          <!-- Continue Button -->
          <button
            :disabled="!placeName.trim()"
            class="continue-btn primary"
            @click="currentStep = 'datetime'; triggerHaptic('medium')"
            aria-label="ไปเลือกวันเวลา"
          >
            <span>ไปเลือกวันเวลา</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </template>

      <!-- Step 3: Date & Time -->
      <template v-else-if="currentStep === 'datetime'">
        <div class="step-content animate-step">
          <h2 class="step-title">เลือกวันและเวลา</h2>
          <p class="step-subtitle">กำหนดวันเวลาที่ต้องการจองคิว</p>

          <!-- Date Selection -->
          <div class="form-card">
            <label class="input-label">วันที่ <span class="required">*</span></label>
            <input
              v-model="selectedDate"
              type="date"
              :min="minDate"
              class="input-field date-input"
            />
            <p class="input-hint">เลือกวันที่ต้องการจองคิว</p>
          </div>

          <!-- Time Selection -->
          <div class="form-card">
            <label class="input-label">เวลา <span class="required">*</span></label>
            <input
              v-model="selectedTime"
              type="time"
              :min="minTime"
              class="input-field time-input"
            />
            <p class="input-hint">เลือกเวลาที่ต้องการจองคิว</p>
          </div>

          <!-- Selected DateTime Preview -->
          <Transition name="scale-fade">
            <div v-if="selectedDate && selectedTime" class="datetime-preview">
              <div class="preview-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <circle cx="12" cy="15" r="2" />
                </svg>
              </div>
              <div class="preview-info">
                <span class="preview-label">วันเวลาที่เลือก</span>
                <span class="preview-value">
                  {{ new Date(selectedDate).toLocaleDateString('th-TH', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) }}
                  เวลา {{ selectedTime }} น.
                </span>
              </div>
            </div>
          </Transition>

          <!-- Continue Button -->
          <button
            :disabled="!selectedDate || !selectedTime"
            class="continue-btn primary"
            @click="currentStep = 'confirm'; triggerHaptic('medium')"
            aria-label="ไปยืนยันการจอง"
          >
            <span>ไปยืนยันการจอง</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </template>

      <!-- Step 4: Confirmation -->
      <template v-else-if="currentStep === 'confirm'">
        <div class="step-content animate-step">
          <h2 class="step-title">ยืนยันการจองคิว</h2>
          <p class="step-subtitle">ตรวจสอบข้อมูลก่อนยืนยัน</p>

          <!-- Summary Card -->
          <div class="summary-card">
            <!-- Category -->
            <div class="summary-row">
              <div 
                class="summary-icon category-icon" 
                :style="{ 
                  color: categories.find(c => c.id === selectedCategory)?.color,
                  background: categories.find(c => c.id === selectedCategory)?.bgColor
                }"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <g v-html="getCategoryIcon(categories.find(c => c.id === selectedCategory)?.icon || 'other')"></g>
                </svg>
              </div>
              <div class="summary-content">
                <span class="summary-label">ประเภท</span>
                <span class="summary-value">{{ categories.find(c => c.id === selectedCategory)?.label }}</span>
              </div>
              <button class="edit-btn" @click="currentStep = 'category'" aria-label="แก้ไขประเภท">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>

            <div class="summary-divider"></div>

            <!-- Place -->
            <div class="summary-row">
              <div class="summary-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div class="summary-content">
                <span class="summary-label">สถานที่</span>
                <span class="summary-value">{{ placeName }}</span>
                <span v-if="placeAddress" class="summary-subvalue">{{ placeAddress }}</span>
              </div>
              <button class="edit-btn" @click="currentStep = 'place'" aria-label="แก้ไขสถานที่">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>

            <div class="summary-divider"></div>

            <!-- DateTime -->
            <div class="summary-row">
              <div class="summary-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div class="summary-content">
                <span class="summary-label">วันเวลา</span>
                <span class="summary-value">
                  {{ new Date(selectedDate).toLocaleDateString('th-TH', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) }}
                </span>
                <span class="summary-subvalue">เวลา {{ selectedTime }} น.</span>
              </div>
              <button class="edit-btn" @click="currentStep = 'datetime'" aria-label="แก้ไขวันเวลา">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>

            <!-- Details (if provided) -->
            <template v-if="details">
              <div class="summary-divider"></div>
              <div class="summary-row">
                <div class="summary-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10,9 9,9 8,9" />
                  </svg>
                </div>
                <div class="summary-content">
                  <span class="summary-label">รายละเอียด</span>
                  <span class="summary-value">{{ details }}</span>
                </div>
              </div>
            </template>
          </div>

          <!-- Fee Info -->
          <div class="fee-card">
            <div class="fee-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div class="fee-content">
              <div class="fee-row">
                <span class="fee-label">ค่าบริการจองคิว</span>
                <span class="fee-value">฿50</span>
              </div>
              <p class="fee-note">ค่าบริการจะถูกหักจากกระเป๋าเงินทันที</p>
            </div>
          </div>

          <!-- Wallet Balance Info -->
          <div :class="['wallet-card', { 'insufficient': walletBalance.balance.value < 50 }]">
            <div class="wallet-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12V7H5a2 2 0 01-2-2V4a2 2 0 012-2h14v5" />
                <path d="M3 5v14a2 2 0 002 2h16v-5" />
                <path d="M18 12a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
            </div>
            <div class="wallet-content">
              <div class="wallet-row">
                <span class="wallet-label">ยอดเงินในกระเป๋า</span>
                <span class="wallet-value">{{ walletBalance.formattedBalance.value }}</span>
              </div>
              <p class="wallet-note">
                <template v-if="walletBalance.balance.value >= 50">
                  ยอดเงินเพียงพอสำหรับการจองคิว
                </template>
                <template v-else>
                  ยอดเงินไม่เพียงพอ กรุณาเติมเงินก่อนจองคิว
                </template>
              </p>
            </div>
          </div>

          <!-- Submit Button -->
          <button
            :disabled="loading || !canSubmit || walletBalance.balance.value < 50"
            class="submit-btn"
            @click="handleSubmit"
          >
            <template v-if="loading">
              <div class="btn-spinner"></div>
              <span>กำลังจองคิว...</span>
            </template>
            <template v-else-if="walletBalance.balance.value < 50">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12V7H5a2 2 0 01-2-2V4a2 2 0 012-2h14v5" />
                <path d="M3 5v14a2 2 0 002 2h16v-5" />
                <path d="M18 12a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              <span>ยอดเงินไม่เพียงพอ</span>
            </template>
            <template v-else>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span>ยืนยันการจองคิว</span>
            </template>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.queue-booking-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #F5F5F7;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* Top Bar */
.top-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #FFFFFF;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  min-height: 44px;
}

.nav-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.15s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  color: #007AFF;
}

.nav-btn:active {
  background-color: rgba(0, 122, 255, 0.1);
}

.nav-btn svg {
  width: 22px;
  height: 22px;
}

.home-btn svg {
  color: #007AFF;
}

.page-title {
  font-size: 17px;
  font-weight: 600;
  color: #000000;
  letter-spacing: -0.4px;
}

/* Content Wrapper */
.content-wrapper {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 16px;
  background: #F5F5F7;
}

/* Step Indicator */
.step-indicator {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: #FFFFFF;
  border-radius: 12px;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
  position: relative;
  cursor: default;
}

.step-item.clickable {
  cursor: pointer;
}

.step-item::after {
  content: '';
  position: absolute;
  top: 14px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #E5E5EA;
  z-index: -1;
}

.step-item:last-child::after {
  display: none;
}

.step-item.completed::after {
  background: #007AFF;
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #E5E5EA;
  color: #8E8E93;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
  transition: all 0.2s ease;
}

.step-item.active .step-number {
  background: #007AFF;
  color: #FFFFFF;
  transform: scale(1.1);
}

.step-item.completed .step-number {
  background: #34C759;
  color: #FFFFFF;
}

.step-number svg {
  width: 16px;
  height: 16px;
}

.step-label {
  font-size: 11px;
  color: #8E8E93;
  font-weight: 500;
  text-align: center;
}

.step-item.active .step-label {
  color: #000000;
  font-weight: 600;
}

/* Step Content */
.step-content {
  animation: slideIn 0.25s ease-out;
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

.step-title {
  font-size: 28px;
  font-weight: 700;
  color: #000000;
  margin-bottom: 4px;
  letter-spacing: -0.6px;
}

.step-subtitle {
  font-size: 15px;
  color: #8E8E93;
  margin-bottom: 20px;
  font-weight: 400;
}

/* Categories Grid */
.categories-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.category-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.category-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.5) 100%);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.category-card:hover::before {
  opacity: 1;
}

.category-card:active,
.category-card.is-pressed {
  transform: scale(0.96);
}

.category-card.selected {
  border-color: var(--category-color);
  background: linear-gradient(135deg, #FFFFFF 0%, var(--icon-bg) 100%);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: scale(1.02);
}

.category-card.selected::before {
  opacity: 0.5;
}

.category-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--icon-bg, rgba(0, 0, 0, 0.03));
  border-radius: 14px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.category-icon svg {
  width: 30px;
  height: 30px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.category-card.selected .category-icon {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.2);
}

.category-card:active .category-icon {
  transform: scale(0.95);
}

.category-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: relative;
  z-index: 1;
}

.category-label {
  font-size: 16px;
  font-weight: 600;
  color: #000000;
  letter-spacing: -0.3px;
}

.category-desc {
  font-size: 13px;
  color: #8E8E93;
  font-weight: 400;
}

.category-check {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--category-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  animation: checkBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

@keyframes checkBounce {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.category-check svg {
  width: 16px;
  height: 16px;
}

/* Form Cards */
.form-card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  transition: box-shadow 0.15s ease;
}

.form-card:focus-within {
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.input-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #000000;
  margin-bottom: 8px;
  letter-spacing: -0.2px;
}

.required {
  color: #FF3B30;
}

.input-field,
.textarea-field {
  width: 100%;
  padding: 12px;
  border: 1px solid #E5E5EA;
  border-radius: 10px;
  font-size: 16px;
  color: #000000;
  transition: all 0.15s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #FFFFFF;
}

.input-field:focus,
.textarea-field:focus {
  outline: none;
  border-color: #007AFF;
  background: #FFFFFF;
}

.textarea-field {
  resize: vertical;
  min-height: 80px;
}

.date-input,
.time-input {
  cursor: pointer;
}

.input-hint {
  font-size: 12px;
  color: #8E8E93;
  margin-top: 6px;
  font-weight: 400;
}

/* Selected Badge */
.selected-badge {
  background: #FFFFFF;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.badge-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--icon-bg, rgba(0, 0, 0, 0.03));
  border-radius: 10px;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.badge-icon svg {
  width: 22px;
  height: 22px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.badge-label {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: #000000;
  letter-spacing: -0.3px;
}

.badge-change {
  padding: 6px 12px;
  background: rgba(0, 122, 255, 0.1);
  color: #007AFF;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.badge-change:active {
  transform: scale(0.95);
  background: rgba(0, 122, 255, 0.15);
}

/* DateTime Preview */
.datetime-preview {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 16px;
  animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.preview-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(0, 122, 255, 0.1);
  color: #007AFF;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.preview-icon svg {
  width: 22px;
  height: 22px;
}

.preview-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-label {
  font-size: 13px;
  color: #8E8E93;
  font-weight: 500;
}

.preview-value {
  font-size: 15px;
  font-weight: 600;
  color: #000000;
  letter-spacing: -0.3px;
}

/* Summary Card */
.summary-card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.summary-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 0;
}

.summary-row:first-child {
  padding-top: 0;
}

.summary-row:last-child {
  padding-bottom: 0;
}

.summary-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(0, 122, 255, 0.1);
  color: #007AFF;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.summary-icon.category-icon {
  background: rgba(0, 0, 0, 0.03);
}

.summary-icon.category-icon svg {
  width: 24px;
  height: 24px;
}

.summary-icon svg {
  width: 22px;
  height: 22px;
}

.summary-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-label {
  font-size: 13px;
  color: #8E8E93;
  font-weight: 500;
}

.summary-value {
  font-size: 15px;
  font-weight: 600;
  color: #000000;
  letter-spacing: -0.3px;
}

.summary-subvalue {
  font-size: 14px;
  color: #8E8E93;
}

.summary-divider {
  height: 0.5px;
  background: rgba(0, 0, 0, 0.1);
  margin: 0 -16px;
}

.edit-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.03);
  border: none;
  color: #8E8E93;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.edit-btn:active {
  transform: scale(0.9);
  background: rgba(0, 0, 0, 0.08);
}

.edit-btn svg {
  width: 18px;
  height: 18px;
}

/* Fee Card */
.fee-card {
  background: #FFF9E6;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  border: 1px solid rgba(255, 149, 0, 0.2);
}

.fee-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(255, 149, 0, 0.15);
  color: #FF9500;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.fee-icon svg {
  width: 22px;
  height: 22px;
}

.fee-content {
  flex: 1;
}

.fee-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.fee-label {
  font-size: 15px;
  font-weight: 600;
  color: #000000;
  letter-spacing: -0.3px;
}

.fee-value {
  font-size: 20px;
  font-weight: 700;
  color: #FF9500;
  letter-spacing: -0.5px;
}

.fee-note {
  font-size: 13px;
  color: #8E8E93;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.fee-note::before {
  content: '';
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #FF9500;
  flex-shrink: 0;
}

/* Wallet Card */
.wallet-card {
  background: linear-gradient(135deg, #E8F5E9 0%, #F1F8E9 100%);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  border: 1px solid rgba(76, 175, 80, 0.2);
  transition: all 0.3s ease;
}

.wallet-card.insufficient {
  background: linear-gradient(135deg, #FFEBEE 0%, #FCE4EC 100%);
  border-color: rgba(244, 67, 54, 0.2);
}

.wallet-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(76, 175, 80, 0.15);
  color: #4CAF50;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.wallet-card.insufficient .wallet-icon {
  background: rgba(244, 67, 54, 0.15);
  color: #F44336;
}

.wallet-icon svg {
  width: 22px;
  height: 22px;
}

.wallet-content {
  flex: 1;
}

.wallet-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.wallet-label {
  font-size: 15px;
  font-weight: 600;
  color: #000000;
  letter-spacing: -0.3px;
}

.wallet-value {
  font-size: 20px;
  font-weight: 700;
  color: #4CAF50;
  letter-spacing: -0.5px;
  transition: color 0.3s ease;
}

.wallet-card.insufficient .wallet-value {
  color: #F44336;
}

.wallet-note {
  font-size: 13px;
  color: #558B2F;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  transition: color 0.3s ease;
}

.wallet-card.insufficient .wallet-note {
  color: #C62828;
}

.wallet-note::before {
  content: '';
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #4CAF50;
  flex-shrink: 0;
  transition: background 0.3s ease;
}

.wallet-card.insufficient .wallet-note::before {
  background: #F44336;
}

/* Buttons */
.continue-btn,
.submit-btn {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: none;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  margin-top: 16px;
  letter-spacing: -0.4px;
}

.continue-btn.primary {
  background: #007AFF;
  color: #FFFFFF;
}

.continue-btn.primary:active:not(:disabled) {
  transform: scale(0.97);
  opacity: 0.8;
}

.continue-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
}

.continue-btn svg {
  width: 18px;
  height: 18px;
}

.submit-btn {
  background: #34C759;
  color: #FFFFFF;
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.97);
  opacity: 0.8;
}

.submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
}

.submit-btn svg {
  width: 20px;
  height: 20px;
}

.btn-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Confirm Dialog */
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.confirm-dialog {
  background: #FFFFFF;
  border-radius: 14px;
  padding: 20px;
  max-width: 280px;
  width: 100%;
  text-align: center;
}

.confirm-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 12px;
}

.confirm-icon svg {
  width: 100%;
  height: 100%;
}

.confirm-title {
  font-size: 17px;
  font-weight: 600;
  color: #000000;
  margin: 0 0 6px;
  letter-spacing: -0.4px;
}

.confirm-message {
  font-size: 13px;
  color: #8E8E93;
  margin: 0 0 20px;
  font-weight: 400;
}

.confirm-actions {
  display: flex;
  gap: 8px;
}

.confirm-btn {
  flex: 1;
  padding: 11px;
  border-radius: 10px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  letter-spacing: -0.3px;
}

.confirm-btn.cancel {
  background: #F2F2F7;
  color: #007AFF;
}

.confirm-btn.exit {
  background: #FF3B30;
  color: #FFFFFF;
}

.confirm-btn:active {
  transform: scale(0.95);
  opacity: 0.8;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
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
  transform: scale(0.9);
}

/* Responsive */
@media (min-width: 640px) {
  .content-wrapper {
    max-width: 480px;
    margin: 0 auto;
  }

  .categories-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .step-indicator {
    padding: 0 16px;
  }
}

@media (min-width: 768px) {
  .content-wrapper {
    max-width: 560px;
  }

  .top-bar {
    padding: 16px 24px;
  }

  .content-wrapper {
    padding: 24px 20px 40px;
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus visible for keyboard navigation */
.nav-btn:focus-visible,
.category-card:focus-visible,
.badge-change:focus-visible,
.edit-btn:focus-visible,
.continue-btn:focus-visible,
.submit-btn:focus-visible,
.confirm-btn:focus-visible {
  outline: 3px solid #007AFF;
  outline-offset: 2px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .category-card {
    border: 2px solid currentColor;
  }

  .step-number {
    border: 2px solid currentColor;
  }

  .form-card {
    border: 1px solid currentColor;
  }
}
</style>
