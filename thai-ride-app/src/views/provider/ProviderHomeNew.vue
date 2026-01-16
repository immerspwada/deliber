<script setup lang="ts">
/**
 * ProviderHomeNew - หน้าหลัก Provider ใหม่
 * Design: Green theme ตาม reference UI
 * 
 * Features:
 * - Green gradient header with earnings & level
 * - Online/Offline status toggle
 * - Rush hour alert
 * - Available orders count
 * - Recent transactions
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

const router = useRouter()

// Realtime subscription
let realtimeChannel: RealtimeChannel | null = null

// State
const loading = ref(true)
const isOnline = ref(false)
const isToggling = ref(false)
const providerId = ref<string | null>(null)

// Provider data
const providerData = ref<{
  first_name?: string
  last_name?: string
  rating?: number
  total_earnings?: number
  total_trips?: number
} | null>(null)

// Earnings
const todayEarnings = ref(0)
const availableOrders = ref(0)

// Recent transactions
const recentTransactions = ref<Array<{
  id: string
  type: string
  count: number
  earnings: number
  tips: number
  date: string
  distance: number
}>>([])

// Rush hour state
const isRushHour = computed(() => {
  const hour = new Date().getHours()
  return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20)
})

// Computed
const displayName = computed(() => {
  if (!providerData.value) return 'พาร์ทเนอร์'
  const first = providerData.value.first_name || ''
  return first || 'พาร์ทเนอร์'
})

const providerLevel = computed(() => {
  // Calculate level based on total_trips
  const trips = providerData.value?.total_trips || 0
  if (trips >= 1000) return 5
  if (trips >= 500) return 4
  if (trips >= 100) return 3
  if (trips >= 20) return 2
  return 1
})

// Methods
async function loadProviderData() {
  loading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get provider info
    const { data: provider } = await supabase
      .from('providers_v2')
      .select('id, first_name, last_name, rating, total_earnings, total_trips, is_online, is_available')
      .eq('user_id', user.id)
      .maybeSingle()

    if (provider) {
      providerId.value = provider.id
      providerData.value = provider
      isOnline.value = provider.is_online && provider.is_available

      // Load today's earnings
      await loadTodayEarnings(provider.id)
      
      // Load available orders count
      await loadAvailableOrders()
      
      // Load recent transactions
      await loadRecentTransactions(provider.id)
    }
  } catch (err) {
    console.error('[ProviderHome] Error:', err)
  } finally {
    loading.value = false
  }
}

async function loadTodayEarnings(provId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('ride_requests')
    .select('estimated_fare, final_fare')
    .eq('provider_id', provId)
    .eq('status', 'completed')
    .gte('completed_at', today.toISOString())

  if (data) {
    todayEarnings.value = data.reduce((sum, r) => sum + (r.final_fare || r.estimated_fare || 0), 0)
  }
}

async function loadAvailableOrders() {
  const { count } = await supabase
    .from('ride_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  availableOrders.value = count || 0
}

async function loadRecentTransactions(provId: string) {
  const { data } = await supabase
    .from('ride_requests')
    .select('id, ride_type, estimated_fare, final_fare, created_at, pickup_lat, pickup_lng, destination_lat, destination_lng')
    .eq('provider_id', provId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(5)

  if (data && data.length > 0) {
    // Group by date
    const grouped = new Map<string, typeof data>()
    data.forEach(item => {
      const date = new Date(item.created_at).toLocaleDateString('th-TH')
      if (!grouped.has(date)) grouped.set(date, [])
      grouped.get(date)!.push(item)
    })

    recentTransactions.value = Array.from(grouped.entries()).map(([date, items]) => ({
      id: date,
      type: 'batch',
      count: items.length,
      earnings: items.reduce((sum, i) => sum + (i.final_fare || i.estimated_fare || 0), 0),
      tips: 0, // TODO: Add tips support
      date,
      distance: items.reduce((sum, i) => {
        if (!i.pickup_lat || !i.destination_lat) return sum
        return sum + calculateDistance(i.pickup_lat, i.pickup_lng, i.destination_lat, i.destination_lng)
      }, 0)
    }))
  }
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

async function toggleOnline() {
  if (isToggling.value) return
  isToggling.value = true

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newStatus = !isOnline.value

    await supabase
      .from('providers_v2')
      .update({
        is_online: newStatus,
        is_available: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    isOnline.value = newStatus

    if (newStatus) {
      await loadAvailableOrders()
    }
  } catch (err) {
    console.error('[ProviderHome] Toggle error:', err)
  } finally {
    isToggling.value = false
  }
}

function goToOrders() {
  router.push('/provider/orders')
}

function openMenu() {
  // TODO: Open side menu
}

// Lifecycle
onMounted(() => {
  loadProviderData()
  setupRealtimeSubscription()
})

onUnmounted(() => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
})

// Realtime subscription for new jobs
function setupRealtimeSubscription() {
  console.log('[ProviderHome] Setting up realtime subscription...')
  
  realtimeChannel = supabase
    .channel('provider-home-jobs')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ride_requests',
        filter: 'status=eq.pending'
      },
      (payload) => {
        console.log('[ProviderHome] New job received:', payload.new)
        // Reload available orders count when new job comes in
        loadAvailableOrders()
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'ride_requests'
      },
      (payload) => {
        console.log('[ProviderHome] Job updated:', payload.eventType, payload.new)
        // Reload count when job status changes
        loadAvailableOrders()
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'ride_requests'
      },
      () => {
        console.log('[ProviderHome] Job deleted')
        loadAvailableOrders()
      }
    )
    .subscribe((status) => {
      console.log('[ProviderHome] Realtime subscription status:', status)
    })
}
</script>

<template>
  <div class="provider-home">
    <!-- Green Header -->
    <header class="header">
      <!-- Menu Button -->
      <button class="menu-btn" @click="openMenu" aria-label="เมนู">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <!-- Profile Section -->
      <div class="profile-section">
        <div class="level-badge">ระดับ {{ providerLevel }}</div>
        <h1 class="partner-name">พาร์ทเนอร์ {{ displayName }}</h1>
        
        <!-- Earnings Display -->
        <div class="earnings-display">
          <span class="earnings-label">รายได้ของคุณ</span>
          <span class="earnings-amount">
            <span class="currency">฿</span>
            {{ todayEarnings.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </span>
        </div>
      </div>

      <!-- Delivery Person Illustration (SVG) -->
      <div class="illustration">
        <svg viewBox="0 0 200 200" fill="none" class="delivery-svg">
          <!-- Scooter -->
          <ellipse cx="100" cy="160" rx="60" ry="10" fill="rgba(0,0,0,0.1)"/>
          <circle cx="60" cy="150" r="20" fill="#FFD93D" stroke="#333" stroke-width="3"/>
          <circle cx="140" cy="150" r="20" fill="#FFD93D" stroke="#333" stroke-width="3"/>
          <path d="M50 130 L70 100 L130 100 L150 130" fill="#FFD93D" stroke="#333" stroke-width="3"/>
          <rect x="65" y="90" width="70" height="15" rx="5" fill="#333"/>
          <!-- Person -->
          <circle cx="100" cy="50" r="20" fill="#FFB347"/>
          <ellipse cx="100" cy="85" rx="25" ry="20" fill="#00A86B"/>
          <rect x="85" y="100" width="30" height="5" fill="#333"/>
          <!-- Helmet -->
          <path d="M80 45 Q100 20 120 45" fill="#FFD93D" stroke="#333" stroke-width="2"/>
          <!-- Box -->
          <rect x="110" y="70" width="35" height="30" rx="3" fill="#8B4513" stroke="#333" stroke-width="2"/>
          <rect x="115" y="75" width="25" height="5" fill="#A0522D"/>
        </svg>
      </div>
    </header>

    <!-- Main Content -->
    <main class="content">
      <!-- Status Card -->
      <div class="status-card">
        <div class="status-info">
          <span class="status-label">สถานะ: {{ isOnline ? 'ออนไลน์' : 'ออฟไลน์' }}</span>
          <span class="status-desc">{{ isOnline ? 'พร้อมรับงานทุกประเภท' : 'คุณออฟไลน์อยู่' }}</span>
        </div>
        <button 
          class="toggle-btn"
          :class="{ active: isOnline }"
          @click="toggleOnline"
          :disabled="isToggling"
          :aria-label="isOnline ? 'ปิดรับงาน' : 'เปิดรับงาน'"
        >
          <span class="toggle-track">
            <span class="toggle-thumb"></span>
          </span>
        </button>
      </div>

      <!-- Rush Hour Alert -->
      <div v-if="isRushHour && isOnline" class="alert-card">
        <div class="alert-icon">
          <svg viewBox="0 0 64 64" fill="none" class="alert-svg">
            <rect x="10" y="20" width="44" height="35" rx="4" fill="#DEB887" stroke="#8B4513" stroke-width="2"/>
            <rect x="15" y="25" width="34" height="5" fill="#A0522D"/>
            <path d="M20 45 L32 35 L44 45" stroke="#8B4513" stroke-width="2" fill="none"/>
          </svg>
        </div>
        <div class="alert-content">
          <span class="alert-badge">ช่วงเร่งด่วน ระวังด้วยนะ</span>
          <h3 class="alert-title">พบ {{ availableOrders }} งานส่ง!</h3>
          <button class="alert-link" @click="goToOrders">
            ดูรายละเอียด
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Orders Available (when not rush hour) -->
      <div v-else-if="isOnline && availableOrders > 0" class="orders-card" @click="goToOrders">
        <div class="orders-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <div class="orders-content">
          <h3>{{ availableOrders }} งานที่พร้อมรับ</h3>
          <span>แตะเพื่อดูและรับงาน</span>
        </div>
        <svg class="orders-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </div>

      <!-- Recent Transactions -->
      <section class="transactions-section">
        <h2 class="section-title">รายการล่าสุด</h2>
        
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
        </div>

        <div v-else-if="recentTransactions.length === 0" class="empty-state">
          <p>ไม่มีรายการล่าสุด</p>
        </div>

        <div v-else class="transactions-list">
          <div 
            v-for="tx in recentTransactions" 
            :key="tx.id"
            class="transaction-item"
          >
            <div class="tx-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
              </svg>
            </div>
            <div class="tx-content">
              <h4>{{ tx.count }} งานส่ง</h4>
              <span class="tx-meta">{{ tx.date }} • {{ tx.distance.toFixed(1) }} กม.</span>
            </div>
            <div class="tx-amount">
              <span class="tx-earnings">+ ฿{{ tx.earnings.toFixed(2) }}</span>
              <span v-if="tx.tips > 0" class="tx-tips">+ ฿{{ tx.tips.toFixed(2) }} ทิป</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.provider-home {
  min-height: 100vh;
  background: #F5F5F5;
}

/* Header */
.header {
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  padding: 16px 20px 80px;
  position: relative;
  overflow: hidden;
}

.menu-btn {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #FFFFFF;
  margin-bottom: 20px;
}

.menu-btn svg {
  width: 24px;
  height: 24px;
}

.profile-section {
  position: relative;
  z-index: 1;
}

.level-badge {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 8px;
}

.partner-name {
  font-size: 24px;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0 0 16px 0;
}

.earnings-display {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.earnings-label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 0.5px;
}

.earnings-amount {
  font-size: 36px;
  font-weight: 700;
  color: #FFFFFF;
}

.currency {
  font-size: 24px;
  margin-right: 2px;
}

.illustration {
  position: absolute;
  right: -10px;
  bottom: 30px;
  width: 160px;
  height: 160px;
  opacity: 0.95;
}

.delivery-svg {
  width: 100%;
  height: 100%;
}

/* Content */
.content {
  padding: 0 16px 24px;
  margin-top: -60px;
  position: relative;
  z-index: 10;
}

/* Status Card */
.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.status-label {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.status-desc {
  font-size: 13px;
  color: #6B7280;
}

.toggle-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
}

.toggle-track {
  display: block;
  width: 52px;
  height: 32px;
  background: #E5E7EB;
  border-radius: 16px;
  position: relative;
  transition: background 0.3s;
}

.toggle-btn.active .toggle-track {
  background: #00A86B;
}

.toggle-thumb {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s;
}

.toggle-btn.active .toggle-thumb {
  transform: translateX(20px);
}

/* Alert Card */
.alert-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}

.alert-icon {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
}

.alert-svg {
  width: 100%;
  height: 100%;
}

.alert-content {
  flex: 1;
}

.alert-badge {
  display: inline-block;
  padding: 4px 10px;
  background: #FEF3C7;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #B45309;
  margin-bottom: 8px;
}

.alert-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
}

.alert-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  padding: 0;
  font-size: 14px;
  font-weight: 600;
  color: #00A86B;
  cursor: pointer;
}

.alert-link svg {
  width: 16px;
  height: 16px;
}

/* Orders Card */
.orders-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
  cursor: pointer;
  transition: transform 0.2s;
}

.orders-card:active {
  transform: scale(0.98);
}

.orders-icon {
  width: 48px;
  height: 48px;
  background: #E8F5EF;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
}

.orders-icon svg {
  width: 24px;
  height: 24px;
}

.orders-content {
  flex: 1;
}

.orders-content h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 2px 0;
}

.orders-content span {
  font-size: 13px;
  color: #6B7280;
}

.orders-arrow {
  width: 20px;
  height: 20px;
  color: #9CA3AF;
}

/* Transactions Section */
.transactions-section {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E7EB;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #6B7280;
}

.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.transaction-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #F3F4F6;
}

.transaction-item:last-child {
  border-bottom: none;
}

.tx-icon {
  width: 44px;
  height: 44px;
  background: #F3F4F6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6B7280;
}

.tx-icon svg {
  width: 22px;
  height: 22px;
}

.tx-content {
  flex: 1;
}

.tx-content h4 {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 2px 0;
}

.tx-meta {
  font-size: 13px;
  color: #6B7280;
}

.tx-amount {
  text-align: right;
}

.tx-earnings {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #00A86B;
}

.tx-tips {
  display: block;
  font-size: 12px;
  color: #6B7280;
}
</style>
