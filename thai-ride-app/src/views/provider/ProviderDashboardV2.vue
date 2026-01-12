<script setup lang="ts">
/**
 * Provider Dashboard V2 - Enhanced UX
 * Modern, accessible, and feature-rich dashboard
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase'
import ProviderStatusToggle from '../../components/ProviderStatusToggle.vue'
import DailyGoalCard from '../../components/DailyGoalCard.vue'

const router = useRouter()

// State
const loading = ref(true)
const error = ref('')
const provider = ref<Record<string, unknown> | null>(null)
const isOnline = ref(false)
const toggling = ref(false)
const refreshing = ref(false)

// Pull to refresh
const touchStartY = ref(0)
const pullDistance = ref(0)
const isPulling = ref(false)
const PULL_THRESHOLD = 80

// Computed
const displayName = computed(() => {
  if (!provider.value) return 'ผู้ให้บริการ'
  return `${provider.value.first_name || ''} ${provider.value.last_name || ''}`.trim() || 'ผู้ให้บริการ'
})

const firstName = computed(() => {
  return (provider.value?.first_name as string) || 'P'
})

const statusInfo = computed(() => {
  if (!provider.value) return { text: '', class: '', icon: '' }
  const s = provider.value.status as string
  const map: Record<string, { text: string; class: string; icon: string }> = {
    pending: { text: 'รอการอนุมัติ', class: 'pending', icon: '⏳' },
    approved: { text: 'อนุมัติแล้ว', class: 'approved', icon: '✓' },
    active: { text: 'ใช้งานได้', class: 'active', icon: '✓' },
    suspended: { text: 'ถูกระงับ', class: 'suspended', icon: '⚠' },
    rejected: { text: 'ถูกปฏิเสธ', class: 'rejected', icon: '✕' }
  }
  return map[s] || { text: s, class: '', icon: '' }
})

const canWork = computed(() => {
  const s = provider.value?.status as string
  return s === 'approved' || s === 'active'
})

const stats = computed(() => ({
  earnings: (provider.value?.total_earnings as number) || 0,
  rating: (provider.value?.rating as number) || 5.0,
  trips: (provider.value?.total_trips as number) || 0,
  completionRate: (provider.value?.completion_rate as number) || 100,
  acceptanceRate: (provider.value?.acceptance_rate as number) || 100
}))

const todayGoal = computed(() => ({
  currentTrips: 0, // TODO: Calculate from today's data
  goalTrips: 10,
  currentEarnings: 0,
  goalEarnings: 1500,
  bonusAmount: 100
}))

// Quick actions
const quickActions = [
  { id: 'earnings', icon: '💰', label: 'รายได้', route: '/provider/earnings', color: 'green' },
  { id: 'history', icon: '📋', label: 'ประวัติงาน', route: '/provider/history', color: 'blue' },
  { id: 'profile', icon: '👤', label: 'โปรไฟล์', route: '/provider/profile', color: 'purple' },
  { id: 'support', icon: '💬', label: 'ช่วยเหลือ', route: '/provider/support', color: 'orange' }
]

// Methods
async function loadProvider() {
  loading.value = true
  error.value = ''
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login')
      return
    }

    const { data, error: e } = await supabase
      .from('providers_v2')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (e) {
      console.error('Load provider error:', e)
      error.value = 'ไม่สามารถโหลดข้อมูลได้'
      return
    }

    if (!data) {
      router.replace('/provider/register')
      return
    }

    provider.value = data
    isOnline.value = (data as Record<string, unknown>).is_online as boolean || false

    const status = (data as Record<string, unknown>).status as string
    if (status === 'pending' || status === 'rejected') {
      router.replace('/provider/onboarding')
      return
    }
  } catch (err) {
    console.error('Exception:', err)
    error.value = 'เกิดข้อผิดพลาด'
  } finally {
    loading.value = false
  }
}

async function handleToggleOnline(newValue: boolean) {
  if (!provider.value || !canWork.value || toggling.value) return
  
  toggling.value = true
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: e } = await (supabase as any)
      .from('providers_v2')
      .update({ is_online: newValue, updated_at: new Date().toISOString() })
      .eq('id', provider.value.id)

    if (e) {
      console.error('Toggle error:', e)
      isOnline.value = !newValue // Revert
      return
    }

    isOnline.value = newValue
  } catch (err) {
    console.error('Toggle exception:', err)
    isOnline.value = !newValue // Revert
  } finally {
    toggling.value = false
  }
}

async function refresh() {
  refreshing.value = true
  await loadProvider()
  refreshing.value = false
  pullDistance.value = 0
}

function handleTouchStart(e: TouchEvent) {
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
  if (scrollTop === 0) {
    touchStartY.value = e.touches[0]?.clientY ?? 0
    isPulling.value = true
  }
}

function handleTouchMove(e: TouchEvent) {
  if (!isPulling.value) return
  const currentY = e.touches[0]?.clientY ?? 0
  const diff = currentY - touchStartY.value
  if (diff > 0) {
    pullDistance.value = Math.min(diff * 0.5, 120)
  }
}

function handleTouchEnd() {
  if (pullDistance.value >= PULL_THRESHOLD && !refreshing.value) {
    refresh()
  } else {
    pullDistance.value = 0
  }
  isPulling.value = false
}

function navigateTo(route: string) {
  router.push(route)
}

function goToCustomer() {
  router.push('/customer')
}

async function logout() {
  await supabase.auth.signOut()
  router.replace('/login')
}

// Lifecycle
onMounted(() => {
  loadProvider()
  document.addEventListener('touchstart', handleTouchStart, { passive: true })
  document.addEventListener('touchmove', handleTouchMove, { passive: true })
  document.addEventListener('touchend', handleTouchEnd)
})

onUnmounted(() => {
  document.removeEventListener('touchstart', handleTouchStart)
  document.removeEventListener('touchmove', handleTouchMove)
  document.removeEventListener('touchend', handleTouchEnd)
})
</script>

<template>
  <div class="dashboard">
    <!-- Pull to Refresh Indicator -->
    <div 
      v-if="pullDistance > 0" 
      class="pull-indicator"
      :style="{ height: `${pullDistance}px` }"
    >
      <div class="pull-spinner" :class="{ active: pullDistance >= PULL_THRESHOLD }">
        <svg v-if="refreshing" class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12l7-7 7 7"/>
        </svg>
      </div>
      <span class="pull-text">{{ pullDistance >= PULL_THRESHOLD ? 'ปล่อยเพื่อรีเฟรช' : 'ดึงลงเพื่อรีเฟรช' }}</span>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner" aria-label="กำลังโหลด"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state" role="alert">
      <div class="error-icon">⚠️</div>
      <p class="error-message">{{ error }}</p>
      <button class="retry-btn" @click="loadProvider">
        ลองใหม่
      </button>
    </div>

    <!-- Main Content -->
    <main v-else-if="provider" class="content">
      <!-- Header -->
      <header class="header">
        <div class="header-left">
          <div class="avatar" :aria-label="`รูปโปรไฟล์ของ ${displayName}`">
            {{ firstName.charAt(0).toUpperCase() }}
          </div>
          <div class="user-info">
            <h1 class="greeting">สวัสดี, {{ displayName }}</h1>
            <div class="status-badge" :class="statusInfo.class">
              <span class="status-icon">{{ statusInfo.icon }}</span>
              {{ statusInfo.text }}
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button 
            class="icon-btn" 
            @click="goToCustomer" 
            aria-label="สลับไปหน้าลูกค้า"
            title="หน้าลูกค้า"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </button>
          <button 
            class="icon-btn logout" 
            @click="logout" 
            aria-label="ออกจากระบบ"
            title="ออกจากระบบ"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- Online Status Toggle -->
      <section v-if="canWork" class="section" aria-labelledby="status-heading">
        <h2 id="status-heading" class="sr-only">สถานะการทำงาน</h2>
        <ProviderStatusToggle
          v-model="isOnline"
          :loading="toggling"
          @update:model-value="handleToggleOnline"
        />
      </section>

      <!-- Waiting for Jobs -->
      <div v-if="isOnline" class="waiting-card">
        <div class="waiting-animation">
          <div class="pulse-ring"></div>
          <div class="pulse-ring delay-1"></div>
          <div class="pulse-ring delay-2"></div>
          <span class="waiting-icon">🔔</span>
        </div>
        <div class="waiting-text">
          <h3>รอรับงาน...</h3>
          <p>ระบบจะแจ้งเตือนเมื่อมีงานใหม่เข้ามา</p>
        </div>
      </div>

      <!-- Daily Goal -->
      <section class="section" aria-labelledby="goal-heading">
        <h2 id="goal-heading" class="sr-only">เป้าหมายวันนี้</h2>
        <DailyGoalCard
          :current-trips="todayGoal.currentTrips"
          :goal-trips="todayGoal.goalTrips"
          :current-earnings="todayGoal.currentEarnings"
          :goal-earnings="todayGoal.goalEarnings"
          :bonus-amount="todayGoal.bonusAmount"
        />
      </section>

      <!-- Stats Grid -->
      <section class="section" aria-labelledby="stats-heading">
        <h2 id="stats-heading" class="section-title">สรุปผลงาน</h2>
        <div class="stats-grid">
          <div class="stat-card earnings">
            <div class="stat-icon-wrapper green">
              <span>฿</span>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.earnings.toLocaleString() }}</span>
              <span class="stat-label">รายได้รวม (บาท)</span>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon-wrapper yellow">
              <span>★</span>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.rating.toFixed(1) }}</span>
              <span class="stat-label">คะแนนเฉลี่ย</span>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon-wrapper blue">
              <span>📦</span>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.trips }}</span>
              <span class="stat-label">งานทั้งหมด</span>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon-wrapper purple">
              <span>✓</span>
            </div>
            <div class="stat-content">
              <span class="stat-value">{{ stats.completionRate }}%</span>
              <span class="stat-label">อัตราสำเร็จ</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="section" aria-labelledby="actions-heading">
        <h2 id="actions-heading" class="section-title">เมนูลัด</h2>
        <div class="quick-actions">
          <button
            v-for="action in quickActions"
            :key="action.id"
            class="action-card"
            :class="action.color"
            @click="navigateTo(action.route)"
          >
            <span class="action-icon">{{ action.icon }}</span>
            <span class="action-label">{{ action.label }}</span>
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
/* Base */
.dashboard {
  min-height: 100vh;
  min-height: 100dvh;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Pull to Refresh */
.pull-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #f1f5f9;
  overflow: hidden;
  transition: height 0.2s ease-out;
}

.pull-spinner {
  width: 32px;
  height: 32px;
  color: #64748b;
  transition: color 0.2s;
}

.pull-spinner.active {
  color: #00a86b;
}

.pull-spinner svg {
  width: 100%;
  height: 100%;
}

.pull-spinner .spinning {
  animation: spin 0.8s linear infinite;
}

.pull-text {
  font-size: 13px;
  color: #64748b;
}

/* Loading State */
.loading-state {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid #e2e8f0;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error State */
.error-state {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  text-align: center;
}

.error-icon {
  font-size: 48px;
}

.error-message {
  font-size: 16px;
  color: #64748b;
  margin: 0;
}

.retry-btn {
  padding: 12px 32px;
  background: #00a86b;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
  min-height: 48px;
}

.retry-btn:active {
  transform: scale(0.98);
  background: #009960;
}

/* Content */
.content {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
  padding-bottom: 32px;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.avatar {
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, #00a86b 0%, #00c77b 100%);
  color: white;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.greeting {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  width: fit-content;
}

.status-badge.approved,
.status-badge.active {
  background: #dcfce7;
  color: #16a34a;
}

.status-badge.pending {
  background: #fef3c7;
  color: #d97706;
}

.status-badge.suspended,
.status-badge.rejected {
  background: #fee2e2;
  color: #dc2626;
}

.status-icon {
  font-size: 10px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 44px;
  height: 44px;
  background: #f1f5f9;
  border: none;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: #e2e8f0;
}

.icon-btn:active {
  transform: scale(0.95);
}

.icon-btn svg {
  width: 20px;
  height: 20px;
  color: #64748b;
}

.icon-btn.logout svg {
  color: #ef4444;
}

/* Section */
.section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 12px 4px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Waiting Card */
.waiting-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  border: 2px solid #10b981;
  border-radius: 16px;
  margin-bottom: 20px;
}

.waiting-animation {
  position: relative;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 2px solid #10b981;
  border-radius: 50%;
  animation: pulse-ring 2s ease-out infinite;
  opacity: 0;
}

.pulse-ring.delay-1 {
  animation-delay: 0.5s;
}

.pulse-ring.delay-2 {
  animation-delay: 1s;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.5);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.waiting-icon {
  font-size: 28px;
  z-index: 1;
}

.waiting-text h3 {
  font-size: 16px;
  font-weight: 700;
  color: #065f46;
  margin: 0 0 4px 0;
}

.waiting-text p {
  font-size: 13px;
  color: #047857;
  margin: 0;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.stat-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}

.stat-icon-wrapper.green {
  background: #dcfce7;
  color: #16a34a;
}

.stat-icon-wrapper.yellow {
  background: #fef3c7;
  color: #d97706;
}

.stat-icon-wrapper.blue {
  background: #dbeafe;
  color: #2563eb;
}

.stat-icon-wrapper.purple {
  background: #f3e8ff;
  color: #9333ea;
}

.stat-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
}

.stat-label {
  font-size: 11px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Quick Actions */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  background: white;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  min-height: 88px;
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.action-card:active {
  transform: scale(0.98);
}

.action-icon {
  font-size: 24px;
}

.action-label {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  text-align: center;
}

/* Responsive */
@media (max-width: 360px) {
  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
