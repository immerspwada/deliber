<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useNotifications } from '../composables/useNotifications'
import { useLoyalty } from '../composables/useLoyalty'
import { useWallet } from '../composables/useWallet'
import { useSearchHistory } from '../composables/useSearchHistory'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

const router = useRouter()
const authStore = useAuthStore()
const { unreadCount, fetchNotifications } = useNotifications()
const { summary: loyaltySummary, fetchSummary: fetchLoyaltySummary } = useLoyalty()
const { balance, fetchBalance } = useWallet()
const { history: recentPlaces, fetchHistory: fetchRecentPlaces } = useSearchHistory()

// Pull to refresh
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
        id: r.id,
        type: 'ride',
        typeName: 'เรียกรถ',
        status: r.status,
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
        id: d.id,
        type: 'delivery',
        typeName: 'ส่งของ',
        status: d.status,
        statusText: getStatusText('delivery', d.status),
        from: d.sender_address?.split(',')[0] || '',
        to: d.recipient_address?.split(',')[0] || '',
        trackingPath: `/tracking/${d.id}`
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
        id: q.id,
        type: 'queue',
        typeName: 'จองคิว',
        status: q.status,
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

const getStatusText = (type: string, status: string): string => {
  const statusMap: Record<string, Record<string, string>> = {
    ride: {
      pending: 'กำลังหาคนขับ',
      matched: 'คนขับกำลังมา',
      arrived: 'คนขับถึงแล้ว',
      in_progress: 'กำลังเดินทาง'
    },
    delivery: {
      pending: 'กำลังหาไรเดอร์',
      matched: 'ไรเดอร์กำลังมารับ',
      picked_up: 'รับของแล้ว',
      in_transit: 'กำลังจัดส่ง'
    },
    queue: {
      pending: 'รอยืนยัน',
      confirmed: 'ยืนยันแล้ว',
      in_progress: 'กำลังดำเนินการ'
    }
  }
  return statusMap[type]?.[status] || status
}

const greeting = ref('')
const isLoaded = ref(false)

const userName = computed(() => {
  if (authStore.user?.name) {
    return authStore.user.name.split(' ')[0]
  }
  return 'คุณ'
})

const walletBalance = computed(() => balance.value?.balance || 0)
const loyaltyPoints = computed(() => loyaltySummary.value?.current_points || 0)

// Pull to refresh handlers
const handleTouchStart = (e: TouchEvent) => {
  const scrollTop = document.querySelector('.home-page')?.scrollTop || 0
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
    if (pullDistance.value > 10) {
      e.preventDefault()
    }
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
    fetchActiveOrders()
  ])
}

// Setup realtime subscription for active orders
const setupRealtimeSubscription = () => {
  if (!authStore.user?.id) return
  
  const userId = authStore.user.id
  
  realtimeChannel = supabase
    .channel('active-orders')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'ride_requests',
      filter: `user_id=eq.${userId}`
    }, () => {
      fetchActiveOrders()
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'delivery_requests',
      filter: `user_id=eq.${userId}`
    }, () => {
      fetchActiveOrders()
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'queue_bookings',
      filter: `user_id=eq.${userId}`
    }, () => {
      fetchActiveOrders()
    })
    .subscribe()
}

onMounted(async () => {
  const hour = new Date().getHours()
  if (hour < 12) greeting.value = 'สวัสดีตอนเช้า'
  else if (hour < 17) greeting.value = 'สวัสดีตอนบ่าย'
  else greeting.value = 'สวัสดีตอนเย็น'
  
  isLoaded.value = true
  
  // Fetch data in parallel
  await Promise.all([
    fetchNotifications(),
    fetchLoyaltySummary(),
    fetchBalance(),
    fetchRecentPlaces(),
    fetchActiveOrders()
  ])
  
  // Setup realtime subscription
  setupRealtimeSubscription()
})

onUnmounted(() => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
  }
})

const navigateTo = (path: string) => {
  router.push(path)
}

// Main services
const mainServices = [
  { id: 'rides', name: 'เรียกรถ', icon: 'car', path: '/customer/services', color: '#00A86B' },
  { id: 'delivery', name: 'ส่งของ', icon: 'package', path: '/customer/delivery', color: '#8B4513' },
  { id: 'shopping', name: 'ซื้อของ', icon: 'shopping', path: '/customer/shopping', color: '#00A86B' },
  { id: 'queue', name: 'จองคิว', icon: 'queue', path: '/customer/queue-booking', color: '#6366F1' },
]

// More services
const moreServices = [
  { id: 'moving', name: 'ขนย้าย', icon: 'moving', path: '/customer/moving', color: '#F59E0B' },
  { id: 'laundry', name: 'ซักรีด', icon: 'laundry', path: '/customer/laundry', color: '#06B6D4' },
  { id: 'rides-plus', name: 'รถพรีเมียม', icon: 'car-plus', path: '/customer/services', color: '#1A1A1A' },
]

const showMoreServices = ref(false)

// Recent destinations from search history
const recentDestinations = computed(() => {
  if (recentPlaces.value && recentPlaces.value.length > 0) {
    return recentPlaces.value.slice(0, 3).map((place: any, index: number) => ({
      id: index + 1,
      name: place.name || place.address,
      icon: 'history'
    }))
  }
  return []
})
</script>

<template>
  <div 
    class="home-page" 
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

    <!-- Top Header -->
    <header class="top-header">
      <div class="header-content">
        <div class="logo-section">
          <div class="logo">
            <svg viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="#00A86B" stroke-width="2"/>
              <path d="M20 10L28 26H12L20 10Z" fill="#00A86B"/>
              <circle cx="20" cy="22" r="4" fill="#00A86B"/>
            </svg>
          </div>
          <span class="brand-name">GOBEAR</span>
        </div>
        <div class="header-actions">
          <!-- Notifications -->
          <button class="icon-btn" @click="navigateTo('/customer/notifications')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            <span v-if="unreadCount > 0" class="notification-badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
          </button>
          <!-- Wallet -->
          <button class="wallet-btn" @click="navigateTo('/customer/wallet')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="5" width="20" height="14" rx="2"/>
              <path d="M2 10h20"/>
            </svg>
            <span>฿{{ walletBalance.toLocaleString() }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Greeting Section -->
      <section class="greeting-section">
        <h2 class="greeting-text">{{ greeting }}, {{ userName }}</h2>
        <p class="greeting-subtitle">วันนี้ต้องการไปไหน?</p>
      </section>

      <!-- Search Card -->
      <section class="search-section">
        <button class="search-card" @click="navigateTo('/customer/services')">
          <div class="search-icon-wrapper">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="8" stroke="#E53935" stroke-width="2"/>
              <circle cx="12" cy="12" r="3" fill="#E53935"/>
            </svg>
          </div>
          <span class="search-placeholder">ค้นหาจุดหมายปลายทาง...</span>
          <svg class="search-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </section>

      <!-- Loyalty Points Card -->
      <section class="loyalty-section" @click="navigateTo('/customer/loyalty')">
        <div class="loyalty-card">
          <div class="loyalty-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="#FFD700"/>
            </svg>
          </div>
          <div class="loyalty-info">
            <span class="loyalty-label">แต้มสะสม</span>
            <span class="loyalty-points">{{ loyaltyPoints.toLocaleString() }} แต้ม</span>
          </div>
          <svg class="loyalty-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5l7 7-7 7"/>
          </svg>
        </div>
      </section>

      <!-- Active Orders Section -->
      <section v-if="loadingOrders || activeOrders.length > 0" class="active-orders-section">
        <div class="section-header">
          <h3 class="section-title">กำลังดำเนินการ</h3>
          <span v-if="!loadingOrders" class="order-count">{{ activeOrders.length }} รายการ</span>
        </div>
        
        <!-- Skeleton Loading -->
        <div v-if="loadingOrders" class="active-orders-list">
          <div v-for="i in 2" :key="i" class="skeleton-order-card">
            <div class="skeleton-badge"></div>
            <div class="skeleton-info">
              <div class="skeleton-line short"></div>
              <div class="skeleton-line"></div>
            </div>
          </div>
        </div>
        
        <!-- Active Orders List -->
        <div v-else class="active-orders-list">
          <button 
            v-for="order in activeOrders" 
            :key="order.id" 
            class="active-order-card"
            @click="navigateTo(order.trackingPath)"
          >
            <div class="order-type-badge" :class="order.type">
              <!-- Ride -->
              <svg v-if="order.type === 'ride'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/>
              </svg>
              <!-- Delivery -->
              <svg v-else-if="order.type === 'delivery'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
              <!-- Queue -->
              <svg v-else-if="order.type === 'queue'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <!-- Moving -->
              <svg v-else-if="order.type === 'moving'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="7" width="16" height="10" rx="2"/>
                <circle cx="6" cy="19" r="2"/>
                <circle cx="14" cy="19" r="2"/>
                <path d="M18 11h2a2 2 0 012 2v4h-4"/>
              </svg>
              <!-- Laundry -->
              <svg v-else-if="order.type === 'laundry'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="4" y="2" width="16" height="20" rx="2"/>
                <circle cx="12" cy="13" r="5"/>
                <circle cx="12" cy="13" r="2"/>
              </svg>
              <!-- Default -->
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div class="order-info">
              <div class="order-header">
                <span class="order-type-name">{{ order.typeName }}</span>
                <span class="order-status">{{ order.statusText }}</span>
              </div>
              <div class="order-route">
                <span class="route-from">{{ order.from }}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
                <span class="route-to">{{ order.to }}</span>
              </div>
            </div>
            <div class="order-pulse"></div>
          </button>
        </div>
      </section>

      <!-- Promo Banner -->
      <section class="promo-section">
        <button class="promo-banner" @click="navigateTo('/customer/promotions')">
          <div class="promo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
              <circle cx="7" cy="7" r="1"/>
            </svg>
          </div>
          <div class="promo-text">
            <span>ส่วนลดสูงสุด 20%</span>
            <strong>ใช้โค้ด: FIRST20</strong>
          </div>
          <svg class="promo-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </section>

      <!-- Main Services Section -->
      <section class="services-section">
        <div class="section-header">
          <h3 class="section-title">บริการของเรา</h3>
        </div>
        
        <div class="services-grid">
          <button 
            v-for="service in mainServices" 
            :key="service.id" 
            class="service-item"
            @click="navigateTo(service.path)"
          >
            <div class="service-icon" :style="{ backgroundColor: service.color + '15' }">
              <!-- Rides -->
              <svg v-if="service.id === 'rides'" viewBox="0 0 48 48" fill="none">
                <rect x="4" y="20" width="40" height="16" rx="4" :fill="service.color"/>
                <rect x="8" y="12" width="32" height="14" rx="4" :fill="service.color"/>
                <rect x="12" y="14" width="10" height="8" rx="2" fill="#E8F5EF"/>
                <rect x="26" y="14" width="10" height="8" rx="2" fill="#E8F5EF"/>
                <circle cx="14" cy="36" r="5" fill="#333"/>
                <circle cx="34" cy="36" r="5" fill="#333"/>
              </svg>
              <!-- Delivery -->
              <svg v-else-if="service.id === 'delivery'" viewBox="0 0 48 48" fill="none">
                <rect x="8" y="12" width="24" height="24" rx="4" :fill="service.color"/>
                <rect x="12" y="16" width="16" height="16" rx="2" fill="#D2691E"/>
                <path d="M20 16v16M12 24h16" :stroke="service.color" stroke-width="2"/>
                <circle cx="36" cy="36" r="6" fill="#333"/>
                <rect x="28" y="28" width="16" height="12" rx="2" fill="#00A86B"/>
              </svg>
              <!-- Shopping -->
              <svg v-else-if="service.id === 'shopping'" viewBox="0 0 48 48" fill="none">
                <path d="M8 16h32l-4 20H12L8 16z" :fill="service.color"/>
                <path d="M16 16V12a8 8 0 1116 0v4" :stroke="service.color" stroke-width="3" fill="none"/>
                <circle cx="16" cy="40" r="4" fill="#333"/>
                <circle cx="32" cy="40" r="4" fill="#333"/>
                <rect x="18" y="22" width="12" height="8" rx="2" fill="#E8F5EF"/>
              </svg>
              <!-- Queue Booking -->
              <svg v-else-if="service.id === 'queue'" viewBox="0 0 48 48" fill="none">
                <rect x="8" y="8" width="32" height="32" rx="6" :fill="service.color"/>
                <rect x="14" y="16" width="20" height="4" rx="2" fill="#E8F5EF"/>
                <rect x="14" y="24" width="14" height="4" rx="2" fill="#E8F5EF"/>
                <rect x="14" y="32" width="18" height="4" rx="2" fill="#E8F5EF"/>
                <circle cx="36" cy="36" r="8" fill="#FFD700"/>
                <text x="36" y="40" text-anchor="middle" font-size="10" font-weight="bold" fill="#1A1A1A">1</text>
              </svg>
            </div>
            <span class="service-name">{{ service.name }}</span>
          </button>
        </div>
      </section>

      <!-- More Services Section -->
      <section class="more-services-section">
        <button class="more-toggle" @click="showMoreServices = !showMoreServices">
          <span>บริการเพิ่มเติม</span>
          <svg :class="{ rotated: showMoreServices }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        
        <div v-if="showMoreServices" class="more-services-grid">
          <button 
            v-for="service in moreServices" 
            :key="service.id" 
            class="service-item"
            @click="navigateTo(service.path)"
          >
            <div class="service-icon" :style="{ backgroundColor: service.color + '15' }">
              <!-- Moving -->
              <svg v-if="service.id === 'moving'" viewBox="0 0 48 48" fill="none">
                <rect x="4" y="20" width="32" height="20" rx="4" :fill="service.color"/>
                <rect x="8" y="24" width="8" height="8" rx="1" fill="#FEF3C7"/>
                <rect x="18" y="24" width="8" height="8" rx="1" fill="#FEF3C7"/>
                <rect x="8" y="34" width="8" height="4" rx="1" fill="#FEF3C7"/>
                <circle cx="12" cy="42" r="4" fill="#333"/>
                <circle cx="28" cy="42" r="4" fill="#333"/>
                <rect x="36" y="28" width="8" height="12" rx="2" fill="#333"/>
              </svg>
              <!-- Laundry -->
              <svg v-else-if="service.id === 'laundry'" viewBox="0 0 48 48" fill="none">
                <rect x="8" y="8" width="32" height="36" rx="4" :fill="service.color"/>
                <circle cx="24" cy="28" r="10" fill="#E0F2FE"/>
                <circle cx="24" cy="28" r="6" fill="#FFFFFF"/>
                <path d="M20 28c0-2 2-4 4-4s4 2 4 4" stroke="#06B6D4" stroke-width="2" fill="none"/>
                <rect x="14" y="12" width="6" height="4" rx="1" fill="#E0F2FE"/>
                <rect x="22" y="12" width="6" height="4" rx="1" fill="#E0F2FE"/>
              </svg>
              <!-- Rides Plus -->
              <svg v-else-if="service.id === 'rides-plus'" viewBox="0 0 48 48" fill="none">
                <rect x="4" y="18" width="40" height="18" rx="4" :fill="service.color"/>
                <rect x="8" y="10" width="32" height="14" rx="4" :fill="service.color"/>
                <rect x="12" y="12" width="10" height="8" rx="2" fill="#4A4A4A"/>
                <rect x="26" y="12" width="10" height="8" rx="2" fill="#4A4A4A"/>
                <circle cx="14" cy="36" r="5" fill="#333"/>
                <circle cx="34" cy="36" r="5" fill="#333"/>
                <circle cx="40" cy="8" r="6" fill="#FFD700"/>
                <path d="M40 5v6M37 8h6" stroke="#1A1A1A" stroke-width="2"/>
              </svg>
            </div>
            <span class="service-name">{{ service.name }}</span>
          </button>
        </div>
      </section>

      <!-- Recent Destinations -->
      <section class="recent-section">
        <div class="section-header">
          <h3 class="section-title">จุดหมายล่าสุด</h3>
          <button v-if="recentDestinations.length > 0" class="see-all-btn" @click="navigateTo('/customer/saved-places')">
            ดูทั้งหมด
          </button>
        </div>
        
        <!-- Empty State -->
        <div v-if="recentDestinations.length === 0" class="empty-recent">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <p class="empty-text">ยังไม่มีจุดหมายล่าสุด</p>
          <p class="empty-subtext">เริ่มเรียกรถเพื่อบันทึกจุดหมาย</p>
        </div>
        
        <!-- Recent List -->
        <div v-else class="recent-list">
          <button 
            v-for="dest in recentDestinations" 
            :key="dest.id" 
            class="recent-item"
            @click="navigateTo('/customer/services')"
          >
            <div class="recent-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="8" stroke="#E53935" stroke-width="2"/>
                <circle cx="12" cy="12" r="3" fill="#E53935"/>
              </svg>
            </div>
            <span class="recent-name">{{ dest.name }}</span>
          </button>
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="quick-section">
        <div class="section-header">
          <h3 class="section-title">ทางลัด</h3>
        </div>
        <div class="quick-grid">
          <button class="quick-item" @click="navigateTo('/customer/scheduled-rides')">
            <div class="quick-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
            </div>
            <span>นัดล่วงหน้า</span>
          </button>
          <button class="quick-item" @click="navigateTo('/customer/saved-places')">
            <div class="quick-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 21s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 7.2c0 7.3-8 11.8-8 11.8z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <span>บันทึกไว้</span>
          </button>
          <button class="quick-item" @click="navigateTo('/customer/history')">
            <div class="quick-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            </div>
            <span>ประวัติ</span>
          </button>
          <button class="quick-item" @click="navigateTo('/customer/referral')">
            <div class="quick-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <span>ชวนเพื่อน</span>
          </button>
        </div>
      </section>

      <!-- Provider CTA -->
      <section class="provider-section">
        <button class="provider-card" @click="navigateTo('/provider')">
          <div class="provider-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div class="provider-content">
            <span class="provider-title">สมัครเป็นคนขับ</span>
            <span class="provider-subtitle">หารายได้กับ GOBEAR</span>
          </div>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </section>
    </main>

    <!-- Bottom Navigation -->
    <nav class="bottom-nav">
      <button class="nav-item active">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
        <span>หน้าแรก</span>
      </button>
      <button class="nav-item" @click="navigateTo('/customer/help')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
          <circle cx="12" cy="17" r="1"/>
        </svg>
        <span>ช่วยเหลือ</span>
      </button>
      <button class="nav-item" @click="navigateTo('/customer/history')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
        <span>กิจกรรม</span>
      </button>
      <button class="nav-item" @click="navigateTo('/customer/profile')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="8" r="4"/>
          <path d="M20 21a8 8 0 10-16 0"/>
        </svg>
        <span>โปรไฟล์</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  background-color: #F5F5F5;
  padding-bottom: 80px;
  opacity: 0;
  transition: opacity 0.3s ease;
  overflow-x: hidden;
}

.home-page.loaded {
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

.pull-indicator.visible {
  opacity: 1;
}

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

.pull-spinner svg {
  width: 100%;
  height: 100%;
}

.pull-spinner.spinning svg {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Top Header */
.top-header {
  position: sticky;
  top: 0;
  background: #FFFFFF;
  z-index: 100;
  border-bottom: 1px solid #F0F0F0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  padding-top: calc(12px + env(safe-area-inset-top));
  max-width: 480px;
  margin: 0 auto;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo svg {
  width: 36px;
  height: 36px;
}

.brand-name {
  font-size: 18px;
  font-weight: 700;
  color: #00A86B;
  letter-spacing: 1px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  position: relative;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.icon-btn svg {
  width: 22px;
  height: 22px;
  color: #1A1A1A;
}

.icon-btn:active {
  transform: scale(0.95);
}

.notification-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #E53935;
  color: white;
  font-size: 10px;
  font-weight: 700;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wallet-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #00A86B;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.wallet-btn svg {
  width: 18px;
  height: 18px;
}

.wallet-btn:active {
  transform: scale(0.96);
}

/* Main Content */
.main-content {
  max-width: 480px;
  margin: 0 auto;
  padding: 0 16px;
}

/* Greeting Section */
.greeting-section {
  padding: 20px 0 12px;
}

.greeting-text {
  font-size: 24px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 4px;
}

.greeting-subtitle {
  font-size: 14px;
  color: #666666;
  margin: 0;
}

/* Search Section */
.search-section {
  padding-bottom: 16px;
}

.search-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px;
  background: #FFFFFF;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.search-card:active {
  background: #FAFAFA;
  transform: scale(0.99);
}

.search-icon-wrapper {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}

.search-icon-wrapper svg {
  width: 100%;
  height: 100%;
}

.search-placeholder {
  flex: 1;
  font-size: 16px;
  color: #999999;
  text-align: left;
}

.search-arrow {
  width: 20px;
  height: 20px;
  color: #CCCCCC;
}

/* Loyalty Section */
.loyalty-section {
  padding-bottom: 12px;
}

.loyalty-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #FFF9E6 0%, #FFF3CC 100%);
  border-radius: 14px;
  cursor: pointer;
}

.loyalty-card:active {
  opacity: 0.9;
}

.loyalty-icon {
  width: 36px;
  height: 36px;
}

.loyalty-icon svg {
  width: 100%;
  height: 100%;
}

.loyalty-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.loyalty-label {
  font-size: 12px;
  color: #996600;
}

.loyalty-points {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
}

.loyalty-arrow {
  width: 20px;
  height: 20px;
  color: #996600;
}

/* Promo Section */
.promo-section {
  padding-bottom: 16px;
}

.promo-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  background: #00A86B;
  color: white;
  border: none;
  border-radius: 14px;
  cursor: pointer;
}

.promo-banner:active {
  opacity: 0.9;
}

.promo-icon {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.promo-icon svg {
  width: 20px;
  height: 20px;
}

.promo-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}

.promo-text span {
  font-size: 12px;
  opacity: 0.9;
}

.promo-text strong {
  font-size: 14px;
  font-weight: 600;
}

.promo-arrow {
  width: 20px;
  height: 20px;
  opacity: 0.8;
}

/* Active Orders Section */
.active-orders-section {
  padding-bottom: 16px;
}

.order-count {
  font-size: 12px;
  color: #00A86B;
  font-weight: 500;
}

/* Skeleton Loading */
.skeleton-order-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 14px;
}

.skeleton-badge {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-line {
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-line.short {
  width: 60%;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.active-orders-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.active-order-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #FFFFFF;
  border: 2px solid #00A86B;
  border-radius: 14px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  text-align: left;
  width: 100%;
}

.active-order-card:active {
  background: #E8F5EF;
}

.order-type-badge {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.order-type-badge svg {
  width: 22px;
  height: 22px;
}

.order-type-badge.ride {
  background: #E8F5EF;
  color: #00A86B;
}

.order-type-badge.delivery {
  background: #FEF3C7;
  color: #92400E;
}

.order-type-badge.queue {
  background: #EEF2FF;
  color: #4F46E5;
}

.order-info {
  flex: 1;
  min-width: 0;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.order-type-name {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.order-status {
  font-size: 12px;
  color: #00A86B;
  font-weight: 500;
}

.order-route {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666666;
}

.order-route svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: #CCCCCC;
}

.route-from, .route-to {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
}

.order-pulse {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 10px;
  height: 10px;
  background: #00A86B;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}

/* Services Section */
.services-section {
  padding: 8px 0 16px;
}

.section-header {
  margin-bottom: 12px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.see-all-btn {
  font-size: 13px;
  color: #00A86B;
  font-weight: 500;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
}

.see-all-btn:active {
  opacity: 0.7;
}

/* Empty State */
.empty-recent {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 20px;
  background: #FFFFFF;
  border-radius: 16px;
}

.empty-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border-radius: 50%;
  margin-bottom: 12px;
}

.empty-icon svg {
  width: 28px;
  height: 28px;
  color: #CCCCCC;
}

.empty-text {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 4px;
}

.empty-subtext {
  font-size: 13px;
  color: #999999;
  margin: 0;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.service-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  background: #FFFFFF;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.service-item:active {
  background: #FAFAFA;
  transform: scale(0.96);
}

.service-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.service-icon svg {
  width: 36px;
  height: 36px;
}

.service-name {
  font-size: 12px;
  font-weight: 600;
  color: #1A1A1A;
  text-align: center;
}

/* More Services Section */
.more-services-section {
  padding-bottom: 16px;
}

.more-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  background: #FFFFFF;
  border: 1px dashed #E0E0E0;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #666666;
  cursor: pointer;
  margin-bottom: 12px;
}

.more-toggle svg {
  width: 18px;
  height: 18px;
  transition: transform 0.2s ease;
}

.more-toggle svg.rotated {
  transform: rotate(180deg);
}

.more-toggle:active {
  background: #FAFAFA;
}

.more-services-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Recent Section */
.recent-section {
  padding: 8px 0 16px;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: #FFFFFF;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.recent-item:active {
  background: #FAFAFA;
}

.recent-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.recent-icon svg {
  width: 100%;
  height: 100%;
}

.recent-name {
  font-size: 15px;
  color: #1A1A1A;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Quick Section */
.quick-section {
  padding: 8px 0 16px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  background: #FFFFFF;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.quick-item:active {
  background: #FAFAFA;
  transform: scale(0.96);
}

.quick-icon {
  width: 28px;
  height: 28px;
  color: #00A86B;
}

.quick-icon svg {
  width: 100%;
  height: 100%;
}

.quick-item span {
  font-size: 11px;
  font-weight: 500;
  color: #1A1A1A;
}

/* Provider Section */
.provider-section {
  padding: 8px 0 24px;
}

.provider-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 18px 16px;
  background: #FFFFFF;
  border: 2px solid #00A86B;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
}

.provider-card:active {
  background: #E8F5EF;
}

.provider-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E8F5EF;
  border-radius: 14px;
  color: #00A86B;
}

.provider-icon svg {
  width: 24px;
  height: 24px;
}

.provider-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.provider-title {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.provider-subtitle {
  font-size: 13px;
  color: #666666;
}

.chevron {
  width: 20px;
  height: 20px;
  color: #00A86B;
}

/* Bottom Navigation */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  background: #FFFFFF;
  border-top: 1px solid #F0F0F0;
  padding: 8px 0;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: none;
  border: none;
  cursor: pointer;
  color: #999999;
}

.nav-item.active {
  color: #00A86B;
}

.nav-item svg {
  width: 24px;
  height: 24px;
}

.nav-item span {
  font-size: 11px;
  font-weight: 500;
}

.nav-item:active {
  opacity: 0.7;
}
</style>
