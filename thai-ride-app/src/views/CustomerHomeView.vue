<script setup lang="ts">
/**
 * CustomerHomeView - หน้าแรกลูกค้าแบบน่ารัก
 * MUNEEF Style: สีเขียว #00A86B, ใส่ใจทุกรายละเอียด
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useNotifications } from '../composables/useNotifications'
import { useLoyalty } from '../composables/useLoyalty'
import { useWallet } from '../composables/useWallet'
import { useSearchHistory } from '../composables/useSearchHistory'
import { useServices } from '../composables/useServices'
import { useRideStore } from '../stores/ride'
import { useToast } from '../composables/useToast'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Components
import WelcomeHeader from '../components/customer/WelcomeHeader.vue'
import QuickDestinationSearch from '../components/customer/QuickDestinationSearch.vue'
import CuteServiceGrid from '../components/customer/CuteServiceGrid.vue'
import ActiveOrderCard from '../components/customer/ActiveOrderCard.vue'
import SavedPlacesRow from '../components/customer/SavedPlacesRow.vue'
import QuickShortcuts from '../components/customer/QuickShortcuts.vue'
import PromoBanner from '../components/customer/PromoBanner.vue'
import RecentDestinations from '../components/customer/RecentDestinations.vue'
import ProviderCTA from '../components/customer/ProviderCTA.vue'
import BottomNavigation from '../components/customer/BottomNavigation.vue'

const router = useRouter()
const authStore = useAuthStore()
const rideStore = useRideStore()
const toast = useToast()
const { unreadCount, fetchNotifications } = useNotifications()
const { summary: loyaltySummary, fetchSummary: fetchLoyaltySummary } = useLoyalty()
const { balance, fetchBalance } = useWallet()
const { history: recentPlaces, fetchHistory: fetchRecentPlaces } = useSearchHistory()
const { homePlace, workPlace, fetchSavedPlaces } = useServices()

// State
const isLoaded = ref(false)
const isRefreshing = ref(false)
const pullDistance = ref(0)
const isPulling = ref(false)
const startY = ref(0)
const PULL_THRESHOLD = 80

// Active orders
interface ActiveOrder {
  id: string
  type: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'
  typeName: string
  status: string
  statusText: string
  from: string
  to: string
  trackingPath: string
}

const activeOrders = ref<ActiveOrder[]>([])
const loadingOrders = ref(true)
let realtimeChannel: RealtimeChannel | null = null

// Computed
const userName = computed(() => {
  if (authStore.user?.name) return authStore.user.name
  return 'คุณ'
})

const walletBalance = computed(() => balance.value?.balance || 0)
const loyaltyPoints = computed(() => loyaltySummary.value?.current_points || 0)

const recentDestinations = computed(() => {
  if (recentPlaces.value && recentPlaces.value.length > 0) {
    return recentPlaces.value.slice(0, 3).map((place: any, index: number) => ({
      id: index + 1,
      name: place.name || place.address?.split(',')[0] || 'ไม่ระบุ',
      address: place.address,
      lat: place.lat,
      lng: place.lng
    }))
  }
  return []
})

// Main services
const mainServices = [
  { id: 'ride', name: 'เรียกรถ', description: 'รถยนต์ส่วนตัว', route: '/customer/ride', color: '#00A86B' },
  { id: 'delivery', name: 'ส่งของ', description: 'ส่งพัสดุด่วน', route: '/customer/delivery', color: '#F5A623' },
  { id: 'shopping', name: 'ซื้อของ', description: 'ฝากซื้อสินค้า', route: '/customer/shopping', color: '#E53935' },
  { id: 'queue', name: 'จองคิว', description: 'จองคิวร้านค้า', route: '/customer/queue-booking', color: '#9C27B0' }
]

// More services
const moreServices = [
  { id: 'moving', name: 'ขนย้าย', description: 'บริการขนย้าย', route: '/customer/moving', color: '#2196F3' },
  { id: 'laundry', name: 'ซักรีด', description: 'รับ-ส่งซักผ้า', route: '/customer/laundry', color: '#00BCD4' }
]

// Shortcuts
const shortcuts = [
  { id: 'scheduled', name: 'นัดล่วงหน้า', route: '/customer/scheduled-rides', color: '#00A86B' },
  { id: 'saved', name: 'บันทึกไว้', route: '/customer/saved-places', color: '#E53935' },
  { id: 'history', name: 'ประวัติ', route: '/customer/history', color: '#2196F3' },
  { id: 'referral', name: 'ชวนเพื่อน', route: '/customer/referral', color: '#9C27B0' },
  { id: 'promotions', name: 'โปรโมชั่น', route: '/customer/promotions', color: '#F5A623' },
  { id: 'wallet', name: 'กระเป๋าเงิน', route: '/customer/wallet', color: '#00A86B' },
  { id: 'help', name: 'ช่วยเหลือ', route: '/customer/help', color: '#666666' },
  { id: 'safety', name: 'ความปลอดภัย', route: '/customer/safety', color: '#E53935' }
]

// Status text mapping
const getStatusText = (type: string, status: string): string => {
  const statusMap: Record<string, Record<string, string>> = {
    ride: { pending: 'กำลังหาคนขับ', matched: 'คนขับกำลังมา', arrived: 'คนขับถึงแล้ว', in_progress: 'กำลังเดินทาง' },
    delivery: { pending: 'กำลังหาไรเดอร์', matched: 'ไรเดอร์กำลังมารับ', picked_up: 'รับของแล้ว', in_transit: 'กำลังจัดส่ง' },
    shopping: { pending: 'กำลังหาคนซื้อ', matched: 'กำลังซื้อของ', purchased: 'ซื้อเสร็จแล้ว', delivering: 'กำลังจัดส่ง' },
    queue: { pending: 'รอยืนยัน', confirmed: 'ยืนยันแล้ว', in_progress: 'กำลังดำเนินการ' },
    moving: { pending: 'รอรับงาน', matched: 'กำลังมารับ', in_progress: 'กำลังขนย้าย' },
    laundry: { pending: 'รอรับผ้า', picked_up: 'รับผ้าแล้ว', washing: 'กำลังซัก', ready: 'พร้อมส่ง' }
  }
  return statusMap[type]?.[status] || status
}

// Fetch active orders
const fetchActiveOrders = async () => {
  if (!authStore.user?.id) return
  loadingOrders.value = true
  
  try {
    const userId = authStore.user.id
    const orders: ActiveOrder[] = []
    
    // Fetch active rides
    const { data: rides } = await (supabase.from('ride_requests') as any)
      .select('id, status, pickup_address, destination_address')
      .eq('user_id', userId)
      .in('status', ['pending', 'matched', 'arrived', 'in_progress'])
      .limit(3)
    
    rides?.forEach((r: any) => {
      orders.push({
        id: r.id, type: 'ride', typeName: 'เรียกรถ', status: r.status,
        statusText: getStatusText('ride', r.status),
        from: r.pickup_address?.split(',')[0] || '',
        to: r.destination_address?.split(',')[0] || '',
        trackingPath: `/customer/ride`
      })
    })
    
    // Fetch active deliveries
    const { data: deliveries } = await (supabase.from('delivery_requests') as any)
      .select('id, status, sender_address, recipient_address')
      .eq('user_id', userId)
      .in('status', ['pending', 'matched', 'picked_up', 'in_transit'])
      .limit(3)
    
    deliveries?.forEach((d: any) => {
      orders.push({
        id: d.id, type: 'delivery', typeName: 'ส่งของ', status: d.status,
        statusText: getStatusText('delivery', d.status),
        from: d.sender_address?.split(',')[0] || '',
        to: d.recipient_address?.split(',')[0] || '',
        trackingPath: `/tracking/${d.id}`
      })
    })

    // Fetch active shopping
    const { data: shopping } = await (supabase.from('shopping_requests') as any)
      .select('id, status, store_name, delivery_address')
      .eq('user_id', userId)
      .in('status', ['pending', 'matched', 'purchased', 'delivering'])
      .limit(3)
    
    shopping?.forEach((s: any) => {
      orders.push({
        id: s.id, type: 'shopping', typeName: 'ซื้อของ', status: s.status,
        statusText: getStatusText('shopping', s.status),
        from: s.store_name || 'ร้านค้า',
        to: s.delivery_address?.split(',')[0] || '',
        trackingPath: `/tracking/${s.id}`
      })
    })

    // Fetch active queue bookings
    const { data: queues } = await (supabase.from('queue_bookings') as any)
      .select('id, status, service_name, location_name')
      .eq('user_id', userId)
      .in('status', ['pending', 'confirmed', 'in_progress'])
      .limit(3)
    
    queues?.forEach((q: any) => {
      orders.push({
        id: q.id, type: 'queue', typeName: 'จองคิว', status: q.status,
        statusText: getStatusText('queue', q.status),
        from: q.service_name || '',
        to: q.location_name || '',
        trackingPath: `/customer/queue-booking/${q.id}`
      })
    })
    
    activeOrders.value = orders.slice(0, 3)
  } catch (err) {
    console.error('Error fetching active orders:', err)
  } finally {
    loadingOrders.value = false
  }
}

// Pull to refresh handlers
const handleTouchStart = (e: TouchEvent) => {
  const scrollTop = document.querySelector('.customer-home')?.scrollTop || 0
  if (scrollTop <= 0 && e.touches[0]) {
    startY.value = e.touches[0].clientY
    isPulling.value = true
  }
}

const handleTouchMove = (e: TouchEvent) => {
  if (!isPulling.value || isRefreshing.value || !e.touches[0]) return
  const currentY = e.touches[0].clientY
  const diff = currentY - startY.value
  if (diff > 0) {
    pullDistance.value = Math.min(diff * 0.5, PULL_THRESHOLD * 1.5)
    if (pullDistance.value > 10) e.preventDefault()
  }
}

const handleTouchEnd = async () => {
  if (!isPulling.value) return
  isPulling.value = false
  
  if (pullDistance.value >= PULL_THRESHOLD && !isRefreshing.value) {
    isRefreshing.value = true
    pullDistance.value = PULL_THRESHOLD
    await refreshData()
    isRefreshing.value = false
  }
  pullDistance.value = 0
}

const refreshData = async () => {
  await Promise.all([
    fetchNotifications(),
    fetchLoyaltySummary(),
    fetchBalance(),
    fetchRecentPlaces(),
    fetchSavedPlaces(),
    fetchActiveOrders()
  ])
  toast.success('รีเฟรชข้อมูลแล้ว')
}

// Setup realtime subscription
const setupRealtimeSubscription = () => {
  if (!authStore.user?.id) return
  const userId = authStore.user.id
  
  realtimeChannel = supabase
    .channel('customer-home-orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests', filter: `user_id=eq.${userId}` }, () => fetchActiveOrders())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_requests', filter: `user_id=eq.${userId}` }, () => fetchActiveOrders())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_requests', filter: `user_id=eq.${userId}` }, () => fetchActiveOrders())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_bookings', filter: `user_id=eq.${userId}` }, () => fetchActiveOrders())
    .subscribe()
}

// Navigation handlers
const navigateTo = (path: string) => {
  router.push(path)
}

const handleServiceClick = (service: any) => {
  navigateTo(service.route)
}

const handleShortcutClick = (shortcut: any) => {
  navigateTo(shortcut.route)
}

const handleOrderClick = (id: string) => {
  const order = activeOrders.value.find(o => o.id === id)
  if (order) navigateTo(order.trackingPath)
}

const handleSavedPlaceClick = (type: 'home' | 'work') => {
  const place = type === 'home' ? homePlace.value : workPlace.value
  if (place?.lat && place?.lng) {
    rideStore.setDestination({
      lat: place.lat,
      lng: place.lng,
      address: place.address || place.name || ''
    })
    navigateTo('/customer/ride')
  } else {
    toast.info(`กรุณาเพิ่มที่อยู่${type === 'home' ? 'บ้าน' : 'ที่ทำงาน'}ก่อน`)
    navigateTo('/customer/saved-places')
  }
}

const handleDestinationClick = (dest: any) => {
  if (dest.lat && dest.lng) {
    rideStore.setDestination({
      lat: dest.lat,
      lng: dest.lng,
      address: dest.address || dest.name || ''
    })
    navigateTo('/customer/ride')
  }
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    fetchNotifications().catch(() => {}),
    fetchLoyaltySummary().catch(() => {}),
    fetchBalance().catch(() => {}),
    fetchRecentPlaces().catch(() => {}),
    fetchSavedPlaces().catch(() => {}),
    fetchActiveOrders()
  ])
  
  setupRealtimeSubscription()
  isLoaded.value = true
})

onUnmounted(() => {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel)
})
</script>

<template>
  <div 
    class="customer-home"
    :class="{ loaded: isLoaded }"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <!-- Pull to Refresh Indicator -->
    <div 
      class="pull-indicator" 
      :class="{ visible: pullDistance > 0, refreshing: isRefreshing }"
      :style="{ transform: `translateY(${pullDistance - 50}px)` }"
    >
      <div class="pull-spinner" :class="{ spinning: isRefreshing }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
      </div>
      <span v-if="!isRefreshing">{{ pullDistance >= PULL_THRESHOLD ? 'ปล่อยเพื่อรีเฟรช' : 'ดึงลงเพื่อรีเฟรช' }}</span>
      <span v-else>กำลังโหลด...</span>
    </div>

    <!-- Welcome Header -->
    <WelcomeHeader
      :user-name="userName"
      :wallet-balance="walletBalance"
      :loyalty-points="loyaltyPoints"
      :unread-notifications="unreadCount"
      @wallet-click="navigateTo('/customer/wallet')"
      @notification-click="navigateTo('/customer/notifications')"
      @profile-click="navigateTo('/customer/profile')"
    />

    <!-- Main Content -->
    <main class="main-content">
      <!-- Search Card -->
      <section class="search-section">
        <QuickDestinationSearch
          @search-click="navigateTo('/customer/ride')"
          @voice-click="navigateTo('/customer/ride')"
        />
      </section>

      <!-- Active Orders -->
      <section v-if="loadingOrders || activeOrders.length > 0" class="active-orders-section">
        <div class="section-header">
          <h3 class="section-title">กำลังดำเนินการ</h3>
          <span v-if="!loadingOrders" class="order-count">{{ activeOrders.length }} รายการ</span>
        </div>
        
        <!-- Skeleton Loading -->
        <div v-if="loadingOrders" class="skeleton-orders">
          <div v-for="i in 2" :key="i" class="skeleton-order"></div>
        </div>
        
        <!-- Orders List -->
        <div v-else class="orders-list">
          <ActiveOrderCard
            v-for="order in activeOrders"
            :key="order.id"
            v-bind="order"
            @click="handleOrderClick"
          />
        </div>
      </section>

      <!-- Main Services -->
      <CuteServiceGrid
        :services="mainServices"
        title="บริการหลัก"
        :columns="4"
        @service-click="handleServiceClick"
      />

      <!-- Saved Places -->
      <section class="saved-section">
        <SavedPlacesRow
          :home-place="homePlace"
          :work-place="workPlace"
          @place-click="handleSavedPlaceClick"
          @manage-click="navigateTo('/customer/saved-places')"
        />
      </section>

      <!-- Promo Banner -->
      <section class="promo-section">
        <PromoBanner
          title="โปรโมชั่นพิเศษ"
          subtitle="ดูส่วนลดทั้งหมด"
          code="FIRST20"
          discount="20%"
          @click="navigateTo('/customer/promotions')"
        />
      </section>

      <!-- More Services -->
      <CuteServiceGrid
        :services="moreServices"
        title="บริการเพิ่มเติม"
        :columns="3"
        @service-click="handleServiceClick"
      />

      <!-- Recent Destinations -->
      <RecentDestinations
        :destinations="recentDestinations"
        @destination-click="handleDestinationClick"
        @see-all-click="navigateTo('/customer/saved-places')"
      />

      <!-- Quick Shortcuts -->
      <QuickShortcuts
        :shortcuts="shortcuts"
        title="ทางลัด"
        @shortcut-click="handleShortcutClick"
      />

      <!-- Provider CTA -->
      <section class="provider-section">
        <ProviderCTA @click="navigateTo('/provider')" />
      </section>
    </main>

    <!-- Bottom Navigation -->
    <BottomNavigation
      active-tab="home"
      @navigate="navigateTo"
    />
  </div>
</template>

<style scoped>
.customer-home {
  min-height: 100vh;
  min-height: 100dvh;
  background: #F5F5F5;
  padding-bottom: 90px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.customer-home.loaded {
  opacity: 1;
}

/* Pull to Refresh */
.pull-indicator {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%) translateY(-50px);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #FFFFFF;
  border-radius: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 200;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.pull-indicator.visible { opacity: 1; }

.pull-indicator span {
  font-size: 13px;
  color: #666666;
  white-space: nowrap;
}

.pull-spinner {
  width: 20px;
  height: 20px;
  color: #00A86B;
}

.pull-spinner svg { width: 100%; height: 100%; }

.pull-spinner.spinning svg {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Main Content */
.main-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-top: 20px;
}

/* Search Section */
.search-section {
  padding: 0 20px;
  margin-top: -12px;
}

/* Active Orders Section */
.active-orders-section {
  padding: 0 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.order-count {
  padding: 4px 10px;
  background: #E8F5EF;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #00A86B;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Skeleton Loading */
.skeleton-orders {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-order {
  height: 80px;
  background: linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%);
  background-size: 200% 100%;
  border-radius: 18px;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Saved Section */
.saved-section {
  /* Uses SavedPlacesRow component */
}

/* Promo Section */
.promo-section {
  padding: 0 20px;
}

/* Provider Section */
.provider-section {
  padding: 0 20px;
  margin-bottom: 20px;
}
</style>
