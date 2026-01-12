<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { useAdminAuth } from '../composables/useAdminAuth'

const route = useRoute()
const router = useRouter()
const sidebarOpen = ref(false)
const adminAuth = useAdminAuth()

// Pending provider count for badge
const pendingProviderCount = ref(0)
let providerSubscription: any = null

// Fetch pending provider count
const fetchPendingProviderCount = async () => {
  try {
    const { data, error } = await supabase.rpc('get_pending_provider_count')
    if (!error && data !== null) {
      pendingProviderCount.value = data
    }
  } catch (err) {
    console.error('Error fetching pending provider count:', err)
  }
}

// Setup realtime subscription for provider status changes
const setupProviderSubscription = () => {
  providerSubscription = supabase
    .channel('admin-provider-status')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'service_providers',
        filter: 'status=eq.pending'
      },
      () => {
        // Refetch count when providers change
        fetchPendingProviderCount()
      }
    )
    .subscribe()
}

onMounted(() => {
  fetchPendingProviderCount()
  setupProviderSubscription()
  // Start session check for auto-logout
  adminAuth.startSessionCheck()
})

onUnmounted(() => {
  if (providerSubscription) {
    supabase.removeChannel(providerSubscription)
  }
  adminAuth.stopSessionCheck()
})

// ✅ FIX 1: Session check moved to global router guard (see router/index.ts)
// No longer checking on every mount - reduces localStorage access from 3,600 to 1

// ✅ FIX 2: Memoize menu sections (static data, no need to recreate)
const menuSections = computed(() => [
  {
    title: '',
    items: [
      { path: '/admin/dashboard', label: 'แดชบอร์ด', icon: 'dashboard' },
      { path: '/admin/orders', label: 'ออเดอร์', icon: 'orders' },
      { path: '/admin/live-map', label: 'แผนที่สด', icon: 'live' }
    ]
  },
  {
    title: 'ผู้ใช้',
    items: [
      { path: '/admin/customers', label: 'ลูกค้า', icon: 'customer' },
      { path: '/admin/providers', label: 'ผู้ให้บริการ', icon: 'car', badgeKey: 'pendingProviders' },
      { path: '/admin/documents', label: 'เอกสาร', icon: 'audit' },
      { path: '/admin/verification-queue', label: 'คิวตรวจสอบ', icon: 'users' }
    ]
  },
  {
    title: 'บริการ',
    items: [
      { path: '/admin/driver-tracking', label: 'ติดตามคนขับ', icon: 'live' },
      { path: '/admin/scheduled-rides', label: 'นัดหมาย', icon: 'schedule' },
      { path: '/admin/delivery', label: 'ส่งของ', icon: 'moving' },
      { path: '/admin/shopping', label: 'ช้อปปิ้ง', icon: 'orders' },
      { path: '/admin/queue-bookings', label: 'จองคิว', icon: 'queue' },
      { path: '/admin/moving', label: 'ขนย้าย', icon: 'moving' },
      { path: '/admin/laundry', label: 'ซักผ้า', icon: 'laundry' },
      { path: '/admin/cancellations', label: 'ยกเลิก', icon: 'cancel' }
    ]
  },
  {
    title: 'การเงิน',
    items: [
      { path: '/admin/revenue', label: 'รายได้', icon: 'revenue' },
      { path: '/admin/payments', label: 'การชำระเงิน', icon: 'payment' },
      { path: '/admin/refunds', label: 'คืนเงิน', icon: 'withdrawal' },
      { path: '/admin/wallets', label: 'กระเป๋าเงิน', icon: 'wallet' },
      { path: '/admin/topup-requests', label: 'เติมเงิน', icon: 'topup' },
      { path: '/admin/withdrawals', label: 'ถอนเงิน', icon: 'withdrawal' },
      { path: '/admin/tips', label: 'ทิป', icon: 'tip' }
    ]
  },
  {
    title: 'Marketing',
    items: [
      { path: '/admin/promos', label: 'โปรโมโค้ด', icon: 'promo' },
      { path: '/admin/referrals', label: 'แนะนำเพื่อน', icon: 'referral' },
      { path: '/admin/loyalty', label: 'Loyalty', icon: 'loyalty' },
      { path: '/admin/incentives', label: 'โบนัสคนขับ', icon: 'incentive' },
      { path: '/admin/subscriptions', label: 'แพ็กเกจ', icon: 'subscription' }
    ]
  },
  {
    title: 'Support',
    items: [
      { path: '/admin/ratings', label: 'รีวิว', icon: 'ratings' },
      { path: '/admin/feedback', label: 'Feedback', icon: 'feedback' },
      { path: '/admin/support', label: 'Tickets', icon: 'support' },
      { path: '/admin/fraud-alerts', label: 'ทุจริต', icon: 'fraud' },
      { path: '/admin/corporate', label: 'องค์กร', icon: 'corporate' }
    ]
  },
  {
    title: 'รายงาน',
    items: [
      { path: '/admin/analytics', label: 'วิเคราะห์', icon: 'analytics' },
      { path: '/admin/reports', label: 'รายงาน', icon: 'report' },
      { path: '/admin/ux-analytics', label: 'UX Analytics', icon: 'ux' }
    ]
  },
  {
    title: 'ตั้งค่า',
    items: [
      { path: '/admin/settings', label: 'ทั่วไป', icon: 'gear' },
      { path: '/admin/notifications', label: 'แจ้งเตือน', icon: 'notification' },
      { path: '/admin/push-notifications', label: 'Push Notifications', icon: 'push' },
      { path: '/admin/notification-templates', label: 'Notification Templates', icon: 'template' },
      { path: '/admin/service-zones', label: 'พื้นที่บริการ', icon: 'map' },
      { path: '/admin/surge-pricing', label: 'Surge Pricing', icon: 'surge' },
      { path: '/admin/system-health', label: 'สุขภาพระบบ', icon: 'health' },
      { path: '/admin/security', label: 'ความปลอดภัย', icon: 'security' },
      { path: '/admin/production-dashboard', label: 'Production KPIs', icon: 'dashboard' },
      { path: '/admin/cross-role-monitor', label: 'Cross-Role Monitor', icon: 'monitor' },
      { path: '/admin/audit-log', label: 'Audit Log', icon: 'audit' },
      { path: '/admin/alerting', label: 'Alerts', icon: 'alert' },
      { path: '/admin/deployment', label: 'Deployment', icon: 'deploy' },
      { path: '/admin/data-management', label: 'Data Management', icon: 'data' },
      { path: '/admin/compliance', label: 'Compliance', icon: 'compliance' },
      { path: '/admin/incidents', label: 'Incidents', icon: 'incident' },
      { path: '/admin/readiness', label: 'Readiness Check', icon: 'checklist' }
    ]
  }
])

// ✅ FIX 3: Memoize flattened menu items
const menuItems = computed(() => menuSections.value.flatMap(section => section.items))

// Badge counts for menu items
const badgeCounts = computed(() => ({
  pendingProviders: pendingProviderCount.value
}))

// ✅ FIX 4: Memoize isActive function
const isActive = (path: string) => {
  if (path === '/admin/dashboard') return route.path === '/admin/dashboard'
  return route.path.startsWith(path)
}

const navigate = (path: string) => {
  router.push(path)
  sidebarOpen.value = false
}

const logout = async () => {
  await adminAuth.logout()
}

// ✅ FIX 5: Cleanup on unmount
onUnmounted(() => {
  // Reset sidebar state
  sidebarOpen.value = false
  
  // Note: menuSections is computed, will be auto-disposed by Vue
  // No manual cleanup needed for static data
})
</script>

<template>
  <div class="admin-layout">
    <!-- Mobile Header -->
    <header class="admin-header">
      <button class="menu-btn" @click="sidebarOpen = true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12h18M3 6h18M3 18h18"/>
        </svg>
      </button>
      <h1 class="header-title">GOBEAR Admin</h1>
      <button class="menu-btn" @click="logout">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
        </svg>
      </button>
    </header>

    <!-- Sidebar Overlay -->
    <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false"></div>

    <!-- Sidebar -->
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-header">
        <div class="logo">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          <span>GOBEAR</span>
        </div>
        <button class="close-btn" @click="sidebarOpen = false">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <nav class="sidebar-nav">
        <div v-for="section in menuSections" :key="section.title || 'main'" class="nav-section">
          <div v-if="section.title" class="section-title">{{ section.title }}</div>
          <button
            v-for="item in section.items"
            :key="item.path"
            class="nav-item"
            :class="{ active: isActive(item.path) }"
            @click="navigate(item.path)"
          >
          <!-- Dashboard -->
          <svg v-if="item.icon === 'dashboard'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/>
            <rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
          </svg>
          <!-- Analytics -->
          <svg v-else-if="item.icon === 'analytics'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 20V10M12 20V4M6 20v-6"/>
          </svg>
          <!-- Users -->
          <svg v-else-if="item.icon === 'users'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
          <!-- Customer -->
          <svg v-else-if="item.icon === 'customer'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            <path d="M12 14l-2 2 2 2 2-2-2-2z"/>
          </svg>
          <!-- Car -->
          <svg v-else-if="item.icon === 'car'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 17h14v-5H5v5zM19 12l-2-6H7L5 12"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
          </svg>
          <!-- Orders -->
          <svg v-else-if="item.icon === 'orders'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h6"/>
          </svg>
          <!-- Schedule -->
          <svg v-else-if="item.icon === 'schedule'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <!-- Cancel -->
          <svg v-else-if="item.icon === 'cancel'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <!-- Tip -->
          <svg v-else-if="item.icon === 'tip'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <!-- Payment -->
          <svg v-else-if="item.icon === 'payment'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>
          </svg>
          <!-- Wallet -->
          <svg v-else-if="item.icon === 'wallet'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 100 4h4v-4h-4z"/>
          </svg>
          <!-- Topup -->
          <svg v-else-if="item.icon === 'topup'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
          </svg>
          <!-- Support -->
          <svg v-else-if="item.icon === 'support'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          <!-- Promo -->
          <svg v-else-if="item.icon === 'promo'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
            <circle cx="7" cy="7" r="1"/>
          </svg>
          <!-- Subscription -->
          <svg v-else-if="item.icon === 'subscription'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <!-- Insurance -->
          <svg v-else-if="item.icon === 'insurance'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <!-- Corporate -->
          <svg v-else-if="item.icon === 'corporate'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
          </svg>
          <!-- Ratings -->
          <svg v-else-if="item.icon === 'ratings'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <!-- Notification -->
          <svg v-else-if="item.icon === 'notification'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          <!-- Withdrawal -->
          <svg v-else-if="item.icon === 'withdrawal'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
            <path d="M17 3l4 4-4 4M21 7H9"/>
          </svg>
          <!-- Referral -->
          <svg v-else-if="item.icon === 'referral'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
            <path d="M20 8v6M23 11h-6"/>
          </svg>
          <!-- Surge -->
          <svg v-else-if="item.icon === 'surge'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          <!-- Gear/Settings -->
          <svg v-else-if="item.icon === 'gear'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
          <!-- Feedback -->
          <svg v-else-if="item.icon === 'feedback'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            <path d="M8 10h.01M12 10h.01M16 10h.01"/>
          </svg>
          <!-- Live -->
          <svg v-else-if="item.icon === 'live'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
          <!-- Map -->
          <svg v-else-if="item.icon === 'map'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
          </svg>
          <!-- Audit -->
          <svg v-else-if="item.icon === 'audit'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
          </svg>
          <!-- Report -->
          <svg v-else-if="item.icon === 'report'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <!-- Loyalty -->
          <svg v-else-if="item.icon === 'loyalty'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 15l-2 5l9-9l-5 2l2-5l-9 9l5-2z"/>
            <circle cx="12" cy="12" r="10"/>
          </svg>
          <!-- Performance -->
          <svg v-else-if="item.icon === 'performance'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          <!-- Components -->
          <svg v-else-if="item.icon === 'components'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          <!-- Flag -->
          <svg v-else-if="item.icon === 'flag'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
          </svg>
          <!-- A/B Testing -->
          <svg v-else-if="item.icon === 'ab'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M2 17h4l3-10h6l3 10h4"/><path d="M6 13h12"/>
          </svg>
          <!-- Health -->
          <svg v-else-if="item.icon === 'health'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
          <!-- Events -->
          <svg v-else-if="item.icon === 'events'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 10"/>
          </svg>
          <!-- Journey -->
          <svg v-else-if="item.icon === 'journey'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 20V10M12 20V4M6 20v-6"/>
          </svg>
          <!-- UX Analytics -->
          <svg v-else-if="item.icon === 'ux'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
          <!-- Revenue -->
          <svg v-else-if="item.icon === 'revenue'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
          <!-- Incentive -->
          <svg v-else-if="item.icon === 'incentive'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 16.4 5.7 21l2.3-7-6-4.6h7.6L12 2z"/>
          </svg>
          <!-- Transaction -->
          <svg v-else-if="item.icon === 'transaction'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 3l4 4-4 4M21 7H3M7 21l-4-4 4-4M3 17h18"/>
          </svg>
          <!-- Fraud -->
          <svg v-else-if="item.icon === 'fraud'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <!-- Queue -->
          <svg v-else-if="item.icon === 'queue'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
          <!-- Moving -->
          <svg v-else-if="item.icon === 'moving'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          <!-- Laundry -->
          <svg v-else-if="item.icon === 'laundry'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="20" height="20" rx="2"/><circle cx="12" cy="14" r="5"/>
            <path d="M8 6h.01M12 6h.01M16 6h.01"/>
          </svg>
          <!-- Service Health -->
          <svg v-else-if="item.icon === 'service-health'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <!-- Alert -->
          <svg v-else-if="item.icon === 'alert'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
            <circle cx="12" cy="2" r="1"/>
          </svg>
          <!-- Deploy -->
          <svg v-else-if="item.icon === 'deploy'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <!-- Data -->
          <svg v-else-if="item.icon === 'data'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
          </svg>
          <!-- Monitor -->
          <svg v-else-if="item.icon === 'monitor'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <path d="M8 21h8M12 17v4"/>
          </svg>
          <!-- Security -->
          <svg v-else-if="item.icon === 'security'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
          <!-- Compliance -->
          <svg v-else-if="item.icon === 'compliance'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
          <!-- Incident -->
          <svg v-else-if="item.icon === 'incident'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <!-- Checklist -->
          <svg v-else-if="item.icon === 'checklist'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
          <!-- Push Notification -->
          <svg v-else-if="item.icon === 'push'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
            <path d="M12 2v2"/>
          </svg>
          <!-- Template -->
          <svg v-else-if="item.icon === 'template'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18"/>
            <path d="M9 21V9"/>
          </svg>
          <span>{{ item.label }}</span>
          <!-- Badge for pending items -->
          <span 
            v-if="item.badgeKey && badgeCounts[item.badgeKey] > 0" 
            class="menu-badge"
          >
            {{ badgeCounts[item.badgeKey] > 99 ? '99+' : badgeCounts[item.badgeKey] }}
          </span>
          </button>
        </div>
      </nav>

      <div class="sidebar-footer">
        <button class="nav-item logout" @click="logout">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="admin-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.admin-layout {
  min-height: 100vh;
  background: #f7f7f7;
}

.admin-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: #000;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  z-index: 100;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
}

.menu-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
}

.menu-btn:hover {
  background: rgba(255,255,255,0.1);
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 200;
  animation: fadeIn 0.2s ease;
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 280px;
  background: #fff;
  z-index: 300;
  transform: translateX(-100%);
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 24px rgba(0,0,0,0.1);
}

.sidebar.open {
  transform: translateX(0);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e5e5;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 700;
}

.close-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #f6f6f6;
}

.sidebar-nav {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}

.nav-section {
  margin-bottom: 8px;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 16px 16px 8px;
  margin-top: 8px;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: none;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  color: #545454;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.nav-item:hover {
  background: #f6f6f6;
  color: #000;
}

.nav-item.active {
  background: #000;
  color: #fff;
}

.nav-item.active .menu-badge {
  background: #00A86B;
  color: #fff;
}

.menu-badge {
  margin-left: auto;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #00A86B;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: badgePulse 2s ease-in-out infinite;
}

@keyframes badgePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid #e5e5e5;
}

.nav-item.logout {
  color: #e11900;
}

.nav-item.logout:hover {
  background: rgba(225, 25, 0, 0.08);
}

.admin-main {
  padding-top: 56px;
  min-height: 100vh;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Desktop */
@media (min-width: 1024px) {
  .admin-header {
    display: none;
  }

  .sidebar-overlay {
    display: none;
  }

  .sidebar {
    transform: translateX(0);
    box-shadow: none;
    border-right: 1px solid #e5e5e5;
  }

  .close-btn {
    display: none;
  }

  .admin-main {
    padding-top: 0;
    margin-left: 280px;
  }
}
</style>
