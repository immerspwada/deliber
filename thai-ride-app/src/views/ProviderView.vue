<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLocation } from '../composables/useLocation'
import { useProvider } from '../composables/useProvider'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../lib/supabase'
import ActiveRideView from '../components/provider/ActiveRideView.vue'
import RideRequestCard from '../components/provider/RideRequestCard.vue'
import ChatModal from '../components/ChatModal.vue'
import VoiceCallModal from '../components/VoiceCallModal.vue'

const router = useRouter()
const authStore = useAuthStore()
const { getCurrentPosition, currentLocation } = useLocation()
const {
  loading,
  profile,
  isOnline,
  pendingRequests,
  activeRide,
  earnings,
  weeklyEarnings,
  maxWeeklyEarning,
  hasActiveRide,
  fetchProfile,
  toggleOnline,
  acceptRide,
  declineRide,
  updateRideStatus,
  cancelActiveRide,
  fetchEarnings
} = useProvider()

// Local state
const isLoadingLocation = ref(false)
const showChatModal = ref(false)
const showVoiceCallModal = ref(false)
const activeTab = ref<'requests' | 'earnings'>('requests')
const isCheckingRole = ref(true)
const applicationStatus = ref<'none' | 'pending' | 'approved' | 'rejected' | 'suspended'>('none')
const rejectionReason = ref('')

// Check if user is a provider (driver/rider)
const isProvider = computed(() => {
  const role = authStore.user?.role
  return role === 'driver' || role === 'rider'
})

// Check if provider is approved
const isApproved = computed(() => applicationStatus.value === 'approved')
const isPending = computed(() => applicationStatus.value === 'pending')
const isRejected = computed(() => applicationStatus.value === 'rejected')
const isSuspended = computed(() => applicationStatus.value === 'suspended')

// Toggle online status
const handleToggleOnline = async () => {
  if (!isOnline.value) {
    isLoadingLocation.value = true
    try {
      const pos = await getCurrentPosition()
      await toggleOnline(true, pos ? { lat: pos.lat, lng: pos.lng } : undefined)
    } catch (e) {
      console.warn('GPS error:', e)
      globalThis.alert('กรุณาเปิด GPS เพื่อรับงาน')
    } finally {
      isLoadingLocation.value = false
    }
  } else {
    await toggleOnline(false)
  }
}

// Go to provider registration
const goToRegister = () => {
  router.push('/provider/register')
}

// Check application status
const checkApplicationStatus = async () => {
  if (!authStore.user) return
  
  const { data, error } = await supabase
    .from('service_providers')
    .select('status, rejection_reason')
    .eq('user_id', authStore.user.id)
    .single()
  
  if (error || !data) {
    applicationStatus.value = 'none'
    return
  }
  
  applicationStatus.value = data.status as any
  rejectionReason.value = data.rejection_reason || ''
}

// Initialize
onMounted(async () => {
  // Check user role first
  if (!isProvider.value) {
    // Check if they have a pending application
    await checkApplicationStatus()
    isCheckingRole.value = false
    return
  }
  
  await checkApplicationStatus()
  isCheckingRole.value = false
  
  if (applicationStatus.value === 'approved') {
    await fetchProfile()
    await fetchEarnings()
  }
})
</script>

<template>
  <div class="provider-page">
    <!-- Loading State -->
    <div v-if="isCheckingRole" class="loading-state">
      <div class="loading-spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Pending Application Status -->
    <div v-else-if="isPending" class="status-page">
      <div class="status-container">
        <div class="status-icon pending-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <h1 class="status-title">รอการอนุมัติ</h1>
        <p class="status-desc">ใบสมัครของคุณอยู่ระหว่างการตรวจสอบ ทีมงานจะติดต่อกลับภายใน 1-3 วันทำการ</p>
        
        <div class="status-timeline">
          <div class="timeline-item completed">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <span class="timeline-title">ส่งใบสมัคร</span>
              <span class="timeline-desc">เสร็จสิ้น</span>
            </div>
          </div>
          <div class="timeline-item active">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <span class="timeline-title">ตรวจสอบเอกสาร</span>
              <span class="timeline-desc">กำลังดำเนินการ</span>
            </div>
          </div>
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <span class="timeline-title">อนุมัติ</span>
              <span class="timeline-desc">รอดำเนินการ</span>
            </div>
          </div>
        </div>

        <button @click="router.push('/')" class="btn-back">
          กลับหน้าหลัก
        </button>
      </div>
    </div>

    <!-- Rejected Application Status -->
    <div v-else-if="isRejected" class="status-page">
      <div class="status-container">
        <div class="status-icon rejected-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
          </svg>
        </div>
        <h1 class="status-title">ไม่ผ่านการอนุมัติ</h1>
        <p class="status-desc">ขออภัย ใบสมัครของคุณไม่ผ่านการอนุมัติ</p>
        
        <div v-if="rejectionReason" class="rejection-reason">
          <span class="reason-label">เหตุผล:</span>
          <p>{{ rejectionReason }}</p>
        </div>

        <div class="action-buttons">
          <button @click="goToRegister" class="btn-primary">
            สมัครใหม่
          </button>
          <button @click="router.push('/')" class="btn-secondary">
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    </div>

    <!-- Suspended Account -->
    <div v-else-if="isSuspended" class="status-page">
      <div class="status-container">
        <div class="status-icon suspended-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <h1 class="status-title">บัญชีถูกระงับ</h1>
        <p class="status-desc">บัญชีผู้ให้บริการของคุณถูกระงับชั่วคราว กรุณาติดต่อฝ่ายสนับสนุน</p>
        
        <button @click="router.push('/help')" class="btn-primary">
          ติดต่อฝ่ายสนับสนุน
        </button>
        <button @click="router.push('/')" class="btn-back">
          กลับหน้าหลัก
        </button>
      </div>
    </div>

    <!-- Not a Provider - Show Registration CTA -->
    <div v-else-if="!isProvider && applicationStatus === 'none'" class="not-provider-page">
      <div class="cta-container">
        <div class="cta-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="1" y="3" width="15" height="13" rx="2"/>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
        </div>
        <h1 class="cta-title">เป็นผู้ให้บริการกับเรา</h1>
        <p class="cta-desc">สร้างรายได้เสริมด้วยการขับรถหรือส่งของ เลือกเวลาทำงานได้เอง</p>
        
        <div class="benefits-list">
          <div class="benefit-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <span class="benefit-title">รายได้ดี</span>
              <span class="benefit-desc">ถอนเงินได้ทุกวัน</span>
            </div>
          </div>
          <div class="benefit-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            <div>
              <span class="benefit-title">ยืดหยุ่น</span>
              <span class="benefit-desc">เลือกเวลาทำงานได้เอง</span>
            </div>
          </div>
          <div class="benefit-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <div>
              <span class="benefit-title">ปลอดภัย</span>
              <span class="benefit-desc">ประกันอุบัติเหตุฟรี</span>
            </div>
          </div>
        </div>

        <button @click="goToRegister" class="btn-register">
          สมัครเป็นผู้ให้บริการ
        </button>
        
        <button @click="router.push('/')" class="btn-back">
          กลับหน้าหลัก
        </button>
      </div>
    </div>

    <!-- Active Ride View (Approved Provider) -->
    <ActiveRideView
      v-else-if="isApproved && hasActiveRide && activeRide"
      :ride="activeRide"
      :current-location="currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : undefined"
      @update-status="updateRideStatus"
      @call="showVoiceCallModal = true"
      @chat="showChatModal = true"
      @cancel="cancelActiveRide"
      @navigate="() => {}"
    />

    <!-- Normal Provider View (Approved) -->
    <div v-else-if="isApproved" class="content-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">ผู้ให้บริการ</h1>
          <div class="rating-badge">
            <svg class="star-icon" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <span>{{ profile?.rating || 4.8 }}</span>
          </div>
        </div>
      </div>

      <!-- Status Toggle -->
      <div class="status-card" :class="{ 'status-online': isOnline }">
        <div class="status-info">
          <div class="status-indicator" :class="{ 'indicator-online': isOnline }"></div>
          <div>
            <h3 class="status-label">{{ isOnline ? 'ออนไลน์' : 'ออฟไลน์' }}</h3>
            <p class="status-text">{{ isOnline ? 'พร้อมรับงาน' : 'เปิดเพื่อเริ่มรับงาน' }}</p>
          </div>
        </div>
        <button
          @click="handleToggleOnline"
          :disabled="isLoadingLocation || loading"
          :class="['toggle-btn', { 'toggle-btn-active': isOnline }]"
        >
          <span v-if="isLoadingLocation || loading" class="toggle-loading"></span>
          <span v-else class="toggle-knob"></span>
        </button>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card stat-earnings">
          <div class="stat-icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">฿{{ earnings.today.toLocaleString() }}</span>
            <span class="stat-label">รายได้วันนี้</span>
          </div>
        </div>
        <div class="stat-card stat-trips">
          <div class="stat-icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ earnings.todayTrips }}</span>
            <span class="stat-label">เที่ยววันนี้</span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button 
          @click="activeTab = 'requests'" 
          :class="['tab', { active: activeTab === 'requests' }]"
        >
          งานที่มี
          <span v-if="pendingRequests.length > 0" class="tab-badge">{{ pendingRequests.length }}</span>
        </button>
        <button 
          @click="activeTab = 'earnings'" 
          :class="['tab', { active: activeTab === 'earnings' }]"
        >
          รายได้
        </button>
      </div>

      <!-- Requests Tab -->
      <div v-if="activeTab === 'requests'" class="tab-content">
        <div v-if="!isOnline" class="offline-card">
          <div class="offline-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            </svg>
          </div>
          <h3>คุณออฟไลน์อยู่</h3>
          <p>เปิดสถานะออนไลน์เพื่อเริ่มรับงาน</p>
        </div>

        <div v-else-if="pendingRequests.length === 0" class="empty-state">
          <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <p>ยังไม่มีงานในขณะนี้</p>
          <span>รอสักครู่...</span>
        </div>

        <div v-else class="requests-list">
          <RideRequestCard
            v-for="request in pendingRequests"
            :key="request.id"
            :request="request"
            :auto-decline-seconds="30"
            @accept="acceptRide(request.id)"
            @decline="declineRide(request.id)"
          />
        </div>
      </div>

      <!-- Earnings Tab -->
      <div v-if="activeTab === 'earnings'" class="tab-content">
        <!-- Weekly Chart -->
        <div class="chart-card">
          <h3 class="chart-title">รายได้สัปดาห์นี้</h3>
          <div class="chart-container">
            <div 
              v-for="stat in weeklyEarnings" 
              :key="stat.date"
              class="chart-bar-wrapper"
            >
              <div 
                class="chart-bar"
                :style="{ height: `${(stat.earnings / maxWeeklyEarning) * 100}%` }"
              ></div>
              <span class="chart-label">{{ stat.day }}</span>
            </div>
          </div>
          <div class="chart-summary">
            <span>รวม ฿{{ earnings.thisWeek.toLocaleString() }}</span>
            <span>{{ earnings.weekTrips }} เที่ยว</span>
          </div>
        </div>

        <!-- Earnings Summary -->
        <div class="earnings-summary">
          <div class="summary-item">
            <span class="summary-label">วันนี้</span>
            <span class="summary-value">฿{{ earnings.today.toLocaleString() }}</span>
            <span class="summary-trips">{{ earnings.todayTrips }} เที่ยว</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">สัปดาห์นี้</span>
            <span class="summary-value">฿{{ earnings.thisWeek.toLocaleString() }}</span>
            <span class="summary-trips">{{ earnings.weekTrips }} เที่ยว</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">เดือนนี้</span>
            <span class="summary-value">฿{{ earnings.thisMonth.toLocaleString() }}</span>
            <span class="summary-trips">{{ earnings.monthTrips }} เที่ยว</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Chat Modal -->
    <ChatModal
      v-if="activeRide"
      :ride-id="activeRide.id"
      :driver-name="activeRide.passenger.name"
      :show="showChatModal"
      @close="showChatModal = false"
    />

    <!-- Voice Call Modal -->
    <VoiceCallModal
      v-if="activeRide"
      :show="showVoiceCallModal"
      :driver-name="activeRide.passenger.name"
      :driver-phone="activeRide.passenger.phone"
      :ride-id="activeRide.id"
      @close="showVoiceCallModal = false"
      @end="showVoiceCallModal = false"
    />
  </div>
</template>


<style scoped>
.provider-page {
  min-height: 100vh;
  background-color: #F6F6F6;
  padding-bottom: 100px;
}

/* Loading State */
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
  border: 3px solid #E5E5E5;
  border-top-color: #000000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  font-size: 14px;
  color: #6B6B6B;
}

/* Not Provider Page */
.not-provider-page {
  min-height: 100vh;
  background-color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

.cta-container {
  max-width: 400px;
  text-align: center;
}

.cta-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F6F6F6;
  border-radius: 50%;
}

.cta-icon svg {
  width: 40px;
  height: 40px;
  color: #000000;
}

.cta-title {
  font-size: 24px;
  font-weight: 700;
  color: #000000;
  margin-bottom: 12px;
}

.cta-desc {
  font-size: 14px;
  color: #6B6B6B;
  line-height: 1.6;
  margin-bottom: 32px;
}

.benefits-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
  text-align: left;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background-color: #F6F6F6;
  border-radius: 12px;
}

.benefit-item svg {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.benefit-item div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.benefit-title {
  font-size: 14px;
  font-weight: 600;
  color: #000000;
}

.benefit-desc {
  font-size: 13px;
  color: #6B6B6B;
}

.btn-register {
  width: 100%;
  padding: 16px 24px;
  background-color: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 12px;
}

.btn-register:hover {
  opacity: 0.9;
}

.btn-register:active {
  transform: scale(0.98);
}

.btn-back {
  width: 100%;
  padding: 14px 24px;
  background-color: #F6F6F6;
  color: #000000;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-back:hover {
  background-color: #EBEBEB;
}

/* Status Pages */
.status-page {
  min-height: 100vh;
  background-color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

.status-container {
  max-width: 400px;
  text-align: center;
}

.status-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.status-icon svg {
  width: 40px;
  height: 40px;
}

.pending-icon {
  background-color: rgba(39, 110, 241, 0.1);
  color: #276EF1;
}

.rejected-icon {
  background-color: rgba(225, 25, 0, 0.1);
  color: #E11900;
}

.suspended-icon {
  background-color: rgba(245, 158, 11, 0.1);
  color: #F59E0B;
}

.status-title {
  font-size: 24px;
  font-weight: 700;
  color: #000000;
  margin-bottom: 12px;
}

.status-desc {
  font-size: 14px;
  color: #6B6B6B;
  line-height: 1.6;
  margin-bottom: 32px;
}

/* Timeline */
.status-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-bottom: 32px;
  text-align: left;
}

.timeline-item {
  display: flex;
  gap: 16px;
  padding-bottom: 24px;
  position: relative;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 24px;
  bottom: 0;
  width: 2px;
  background-color: #E5E5E5;
}

.timeline-item:last-child::before {
  display: none;
}

.timeline-item.completed::before {
  background-color: #276EF1;
}

.timeline-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #E5E5E5;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.timeline-item.completed .timeline-dot {
  background-color: #276EF1;
}

.timeline-item.completed .timeline-dot::after {
  content: '';
  width: 8px;
  height: 8px;
  background-color: #FFFFFF;
  border-radius: 50%;
}

.timeline-item.active .timeline-dot {
  background-color: #276EF1;
  box-shadow: 0 0 0 4px rgba(39, 110, 241, 0.2);
}

.timeline-item.active .timeline-dot::after {
  content: '';
  width: 8px;
  height: 8px;
  background-color: #FFFFFF;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.timeline-title {
  font-size: 14px;
  font-weight: 600;
  color: #000000;
}

.timeline-desc {
  font-size: 13px;
  color: #6B6B6B;
}

.timeline-item.active .timeline-desc {
  color: #276EF1;
}

/* Rejection Reason */
.rejection-reason {
  padding: 16px;
  background-color: rgba(225, 25, 0, 0.05);
  border-radius: 12px;
  margin-bottom: 24px;
  text-align: left;
}

.reason-label {
  font-size: 12px;
  font-weight: 600;
  color: #E11900;
  text-transform: uppercase;
}

.rejection-reason p {
  font-size: 14px;
  color: #000000;
  margin-top: 8px;
  line-height: 1.5;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-primary {
  width: 100%;
  padding: 14px 24px;
  background-color: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-secondary {
  width: 100%;
  padding: 14px 24px;
  background-color: #F6F6F6;
  color: #000000;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background-color: #EBEBEB;
}

.content-container {
  max-width: 480px;
  margin: 0 auto;
  padding: 0 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 0 16px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
}

.rating-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background-color: white;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.star-icon {
  width: 16px;
  height: 16px;
  color: #F59E0B;
}

/* Status Card */
.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background-color: white;
  border-radius: 12px;
  margin-bottom: 16px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.status-card.status-online {
  border-color: #276EF1;
  background-color: rgba(39, 110, 241, 0.05);
}

.status-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  background-color: #CCC;
  border-radius: 50%;
  transition: background-color 0.3s ease;
}

.status-indicator.indicator-online {
  background-color: #276EF1;
  box-shadow: 0 0 0 4px rgba(39, 110, 241, 0.2);
}

.status-label {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 2px;
}

.status-text {
  font-size: 13px;
  color: #6B6B6B;
}

.toggle-btn {
  width: 56px;
  height: 32px;
  background-color: #E5E5E5;
  border: none;
  border-radius: 16px;
  position: relative;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.toggle-btn-active {
  background-color: #276EF1;
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

.toggle-btn-active .toggle-knob {
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

@keyframes spin {
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

/* Stats Grid */
.stats-grid {
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
  background-color: white;
  border-radius: 12px;
}

.stat-icon-box {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F6F6F6;
  border-radius: 8px;
}

.stat-icon-box svg {
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
  color: #6B6B6B;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  background: white;
  border: 2px solid transparent;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab.active {
  border-color: #000;
}

.tab-badge {
  padding: 2px 8px;
  background: #E11900;
  color: white;
  border-radius: 10px;
  font-size: 12px;
}

.tab-content {
  min-height: 200px;
}

/* Requests List */
.requests-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  background-color: white;
  border-radius: 12px;
  text-align: center;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: #CCC;
  margin-bottom: 12px;
}

.empty-state p {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.empty-state span {
  font-size: 14px;
  color: #6B6B6B;
}

/* Offline Card */
.offline-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  background-color: white;
  border-radius: 12px;
  text-align: center;
}

.offline-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F6F6F6;
  border-radius: 50%;
  margin-bottom: 16px;
}

.offline-icon svg {
  width: 32px;
  height: 32px;
  color: #6B6B6B;
}

.offline-card h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.offline-card p {
  font-size: 14px;
  color: #6B6B6B;
}

/* Chart */
.chart-card {
  padding: 20px;
  background-color: white;
  border-radius: 12px;
  margin-bottom: 16px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.chart-container {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 100px;
  gap: 8px;
  margin-bottom: 12px;
}

.chart-bar-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.chart-bar {
  width: 100%;
  background-color: #000;
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: height 0.3s ease;
}

.chart-label {
  font-size: 11px;
  color: #6B6B6B;
}

.chart-summary {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #6B6B6B;
  padding-top: 12px;
  border-top: 1px solid #E5E5E5;
}

/* Earnings Summary */
.earnings-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 12px;
}

.summary-label {
  font-size: 14px;
  color: #6B6B6B;
  width: 80px;
}

.summary-value {
  font-size: 18px;
  font-weight: 700;
  flex: 1;
}

.summary-trips {
  font-size: 13px;
  color: #6B6B6B;
}
</style>
