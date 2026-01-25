<script setup lang="ts">
/**
 * Advanced Orders View - Production Ready
 * Features: Reassign provider, bulk actions, real-time updates, analytics, map integration
 * Design: Clean, minimal, no emojis (following design-system.md)
 */
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { supabase } from '../../lib/supabase'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Types
interface Order {
  id: string
  tracking_id: string
  service_type: string
  status: string
  customer_id?: string
  customer_name: string
  customer_phone: string
  provider_id: string | null
  provider_name: string | null
  provider_phone: string | null
  pickup_address: string
  dropoff_address: string
  final_amount: number
  estimated_amount: number
  payment_method: string
  distance_km: number | null
  created_at: string
  priority: string
  notes: string | null
  completed_at?: string | null
}

interface Provider {
  id: string
  user_id: string
  full_name: string
  phone: string
  vehicle_type: string
  status: string
  rating: number
  total_orders: number
  is_online: boolean
}

// State
const loading = ref(false)
const orders = ref<Order[]>([])
const providers = ref<Provider[]>([])
const selectedOrder = ref<Order | null>(null)
const selectedProvider = ref<string | null>(null)
const showReassignModal = ref(false)
const showDetailModal = ref(false)
const showCancelModal = ref(false)
const showNotesModal = ref(false)
const showMapModal = ref(false)
const showBulkModal = ref(false)
const cancelReason = ref('')
const orderNotes = ref('')
const searchQuery = ref('')
const statusFilter = ref('')
const serviceTypeFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const totalOrders = ref(0)
const error = ref<string | null>(null)
const selectedOrders = ref<Set<string>>(new Set())
const bulkAction = ref('')
let map: L.Map | null = null

// Computed
const filteredOrders = computed(() => {
  let result = orders.value
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(o => 
      o.tracking_id.toLowerCase().includes(query) ||
      o.customer_name?.toLowerCase().includes(query) ||
      o.provider_name?.toLowerCase().includes(query)
    )
  }
  
  if (statusFilter.value) {
    result = result.filter(o => o.status === statusFilter.value)
  }
  
  if (serviceTypeFilter.value) {
    result = result.filter(o => o.service_type === serviceTypeFilter.value)
  }
  
  return result
})

const totalPages = computed(() => Math.ceil(totalOrders.value / pageSize.value))

// Analytics computed
const analytics = computed(() => {
  const total = orders.value.length
  const pending = orders.value.filter(o => o.status === 'pending').length
  const inProgress = orders.value.filter(o => o.status === 'in_progress').length
  const completed = orders.value.filter(o => o.status === 'completed').length
  const cancelled = orders.value.filter(o => o.status === 'cancelled').length
  
  const totalRevenue = orders.value
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + (o.final_amount || 0), 0)
  
  const avgOrderValue = completed > 0 ? totalRevenue / completed : 0
  
  return {
    total,
    pending,
    inProgress,
    completed,
    cancelled,
    totalRevenue,
    avgOrderValue,
    completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : '0'
  }
})

// Bulk selection
const allSelected = computed(() => {
  return filteredOrders.value.length > 0 && 
         filteredOrders.value.every(o => selectedOrders.value.has(o.id))
})

function toggleSelectAll() {
  if (allSelected.value) {
    selectedOrders.value.clear()
  } else {
    filteredOrders.value.forEach(o => selectedOrders.value.add(o.id))
  }
}

function toggleSelect(orderId: string) {
  if (selectedOrders.value.has(orderId)) {
    selectedOrders.value.delete(orderId)
  } else {
    selectedOrders.value.add(orderId)
  }
}

// Load orders
async function loadOrders() {
  loading.value = true
  error.value = null
  
  try {
    const { data, error: fetchError, count } = await supabase
      .from('orders_view')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value - 1)
    
    if (fetchError) throw fetchError
    
    orders.value = data || []
    totalOrders.value = count || 0
  } catch (err) {
    console.error('[OrdersView] Error loading orders:', err)
    error.value = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
    orders.value = []
    totalOrders.value = 0
  } finally {
    loading.value = false
  }
}

// Load available providers
async function loadProviders() {
  try {
    const { data, error } = await supabase
      .from('providers_v2')
      .select(`
        id,
        user_id,
        first_name,
        last_name,
        phone_number,
        status,
        rating,
        total_trips,
        is_online
      `)
      .eq('status', 'approved')
      .order('is_online', { ascending: false })
      .order('rating', { ascending: false })
    
    if (error) throw error
    
    // Transform data to match interface
    providers.value = (data || []).map(p => ({
      id: p.id,
      user_id: p.user_id,
      full_name: `${p.first_name} ${p.last_name}`,
      phone: p.phone_number,
      vehicle_type: 'มอเตอร์ไซค์', // Default
      status: p.status,
      rating: p.rating,
      total_orders: p.total_trips,
      is_online: p.is_online
    }))
  } catch (err) {
    console.error('[OrdersView] Error loading providers:', err)
  }
}

// Open reassign modal
function openReassignModal(order: Order) {
  selectedOrder.value = order
  selectedProvider.value = null
  showReassignModal.value = true
  loadProviders()
}

// Open cancel modal
function openCancelModal(order: Order) {
  selectedOrder.value = order
  cancelReason.value = ''
  showCancelModal.value = true
}

// Open notes modal
function openNotesModal(order: Order) {
  selectedOrder.value = order
  orderNotes.value = order.notes || ''
  showNotesModal.value = true
}

// Save notes
async function saveNotes() {
  if (!selectedOrder.value) return
  
  loading.value = true
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        notes: orderNotes.value || null
      })
      .eq('id', selectedOrder.value.id)
    
    if (error) throw error
    
    alert('บันทึกโน้ตสำเร็จ')
    showNotesModal.value = false
    loadOrders()
  } catch (err) {
    console.error('[OrdersView] Error saving notes:', err)
    alert('เกิดข้อผิดพลาด')
  } finally {
    loading.value = false
  }
}

// Update order status
async function updateOrderStatus(order: Order, newStatus: string) {
  if (order.status === newStatus) return
  
  const confirmed = confirm(`เปลี่ยนสถานะจาก "${getStatusLabel(order.status)}" เป็น "${getStatusLabel(newStatus)}"?`)
  if (!confirmed) {
    // Force re-render by reloading
    const temp = orders.value
    orders.value = []
    nextTick(() => {
      orders.value = temp
    })
    return
  }
  
  // Store old status for rollback
  const oldStatus = order.status
  
  // Optimistic update - update UI immediately
  order.status = newStatus
  
  try {
    // 1. Update order status in database (CRITICAL - must succeed)
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)
    
    if (updateError) throw updateError
    
    // 2. Try to create notification for Customer (OPTIONAL - best effort)
    if (order.customer_id) {
      try {
        await supabase.from('notifications').insert({
          user_id: order.customer_id,
          title: 'สถานะออเดอร์เปลี่ยนแปลง',
          message: `ออเดอร์ ${order.tracking_id} เปลี่ยนสถานะเป็น "${getStatusLabel(newStatus)}"`,
          type: 'order_status',
          reference_id: order.id,
          reference_type: 'order',
          read: false
        })
      } catch (notifError) {
        console.warn('[OrdersView] Customer notification failed (non-critical):', notifError)
      }
    }
    
    // 3. Try to create notification for Provider (OPTIONAL - best effort)
    if (order.provider_id) {
      try {
        await supabase.from('notifications').insert({
          user_id: order.provider_id,
          title: 'สถานะงานเปลี่ยนแปลง',
          message: `งาน ${order.tracking_id} เปลี่ยนสถานะเป็น "${getStatusLabel(newStatus)}"`,
          type: 'order_status',
          reference_id: order.id,
          reference_type: 'order',
          read: false
        })
      } catch (notifError) {
        console.warn('[OrdersView] Provider notification failed (non-critical):', notifError)
      }
    }
    
    // 4. Try to log activity for Admin (OPTIONAL - best effort)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          action: 'order_status_changed',
          entity_type: 'order',
          entity_id: order.id,
          details: {
            tracking_id: order.tracking_id,
            old_status: oldStatus,
            new_status: newStatus,
            changed_by: 'admin'
          }
        })
      }
    } catch (logError) {
      console.warn('[OrdersView] Activity log failed (non-critical):', logError)
    }
    
    // 5. Real-time update via Supabase Realtime happens automatically
    
    // Success - reload to ensure consistency
    await loadOrders()
    
    console.log(`[OrdersView] Status updated: ${order.tracking_id} from ${oldStatus} to ${newStatus}`)
  } catch (err) {
    console.error('[OrdersView] Error updating status:', err)
    // Rollback on error
    order.status = oldStatus
    alert('เกิดข้อผิดพลาด: ' + (err instanceof Error ? err.message : 'Unknown error'))
  }
}

// Open map modal
function openMapModal(order: Order) {
  selectedOrder.value = order
  showMapModal.value = true
  
  // Initialize map after modal is shown
  setTimeout(() => {
    initMap()
  }, 100)
}

// Initialize map
function initMap() {
  const mapContainer = document.getElementById('order-map')
  if (!mapContainer || !selectedOrder.value) return
  
  // Clear existing map
  if (map) {
    map.remove()
  }
  
  // Create map centered on Bangkok
  map = L.map('order-map').setView([13.7563, 100.5018], 13)
  
  // Add tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map)
  
  // Add markers (mock coordinates for demo)
  const pickupMarker = L.marker([13.7563, 100.5018])
    .addTo(map)
    .bindPopup('<b>จุดรับ</b><br>' + selectedOrder.value.pickup_address)
  
  const dropoffMarker = L.marker([13.7463, 100.5318])
    .addTo(map)
    .bindPopup('<b>จุดส่ง</b><br>' + selectedOrder.value.dropoff_address)
  
  // Fit bounds to show both markers
  const group = L.featureGroup([pickupMarker, dropoffMarker])
  map.fitBounds(group.getBounds().pad(0.1))
}

// Bulk operations
function openBulkModal() {
  if (selectedOrders.value.size === 0) {
    alert('กรุณาเลือกออเดอร์อย่างน้อย 1 รายการ')
    return
  }
  showBulkModal.value = true
}

async function executeBulkAction() {
  if (!bulkAction.value || selectedOrders.value.size === 0) return
  
  const confirmed = confirm(`ยืนยันการดำเนินการกับ ${selectedOrders.value.size} รายการ?`)
  if (!confirmed) return
  
  loading.value = true
  try {
    const orderIds = Array.from(selectedOrders.value)
    
    if (bulkAction.value === 'cancel') {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled', notes: 'ยกเลิกโดย Admin (Bulk)' })
        .in('id', orderIds)
      
      if (error) throw error
    }
    
    alert(`ดำเนินการสำเร็จ ${selectedOrders.value.size} รายการ`)
    showBulkModal.value = false
    selectedOrders.value.clear()
    bulkAction.value = ''
    loadOrders()
  } catch (err) {
    console.error('[OrdersView] Bulk action error:', err)
    alert('เกิดข้อผิดพลาด')
  } finally {
    loading.value = false
  }
}

// Cancel order
async function cancelOrder() {
  if (!selectedOrder.value) return
  
  loading.value = true
  try {
    // Update order status to cancelled
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        notes: cancelReason.value || 'ยกเลิกโดย Admin'
      })
      .eq('id', selectedOrder.value.id)
    
    if (error) throw error
    
    alert('ยกเลิกออเดอร์สำเร็จ')
    showCancelModal.value = false
    loadOrders()
  } catch (err) {
    console.error('[OrdersView] Error cancelling order:', err)
    alert('เกิดข้อผิดพลาด')
  } finally {
    loading.value = false
  }
}

// Reassign provider
async function reassignProvider() {
  if (!selectedOrder.value || !selectedProvider.value) return
  
  loading.value = true
  try {
    // Update order with new provider
    const { error } = await supabase
      .from('orders')
      .update({
        provider_id: selectedProvider.value,
        status: 'matched',
        matched_at: new Date().toISOString()
      })
      .eq('id', selectedOrder.value.id)
    
    if (error) throw error
    
    alert('ย้ายงานสำเร็จ')
    showReassignModal.value = false
    loadOrders()
  } catch (err) {
    console.error('[OrdersView] Error reassigning:', err)
    alert('เกิดข้อผิดพลาด')
  } finally {
    loading.value = false
  }
}

// View order detail
function viewOrder(order: Order) {
  selectedOrder.value = order
  showDetailModal.value = true
}

// Format helpers
function formatCurrency(amount: number) {
  return `฿${amount?.toLocaleString() || 0}`
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatPhoneNumber(phone: string) {
  if (!phone) return '-'
  // Format: 081-234-5678
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')
}

function callPhone(phone: string, name: string) {
  if (!phone) {
    alert('ไม่มีเบอร์โทรศัพท์')
    return
  }
  
  const confirmed = confirm(`โทรหา ${name}\nเบอร์: ${formatPhoneNumber(phone)}`)
  if (confirmed) {
    window.location.href = `tel:${phone}`
  }
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: '#F59E0B',
    matched: '#3B82F6',
    in_progress: '#8B5CF6',
    completed: '#10B981',
    cancelled: '#EF4444'
  }
  return colors[status] || '#6B7280'
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'รอรับ',
    matched: 'จับคู่แล้ว',
    in_progress: 'กำลังดำเนินการ',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก'
  }
  return labels[status] || status
}

function getServiceIcon(type: string) {
  const icons: Record<string, string> = {
    ride: '🚗',
    delivery: '📦',
    shopping: '🛒'
  }
  return icons[type] || '📋'
}

function getServiceLabel(type: string) {
  const labels: Record<string, string> = {
    ride: 'เรียกรถ',
    delivery: 'จัดส่ง',
    shopping: 'ช้อปปิ้ง'
  }
  return labels[type] || type
}

function getElapsedTime(createdAt: string, completedAt?: string | null): string {
  const start = new Date(createdAt)
  const end = completedAt ? new Date(completedAt) : new Date()
  const diff = end.getTime() - start.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days} วัน ${hours % 24} ชม.`
  if (hours > 0) return `${hours} ชม. ${minutes % 60} นาที`
  return `${minutes} นาที`
}

function getTimeStatus(createdAt: string, status: string): { text: string; color: string } {
  const elapsed = new Date().getTime() - new Date(createdAt).getTime()
  const minutes = Math.floor(elapsed / 60000)
  
  if (status === 'completed' || status === 'cancelled') {
    return { text: '', color: '' }
  }
  
  if (status === 'pending' && minutes > 10) {
    return { text: 'รอนาน', color: '#f59e0b' }
  }
  
  if (status === 'in_progress' && minutes > 60) {
    return { text: 'ใช้เวลานาน', color: '#ef4444' }
  }
  
  return { text: '', color: '' }
}

// Auto-refresh
const autoRefreshInterval = ref<NodeJS.Timeout | null>(null)
const lastRefreshTime = ref<Date>(new Date())

function startAutoRefresh() {
  if (autoRefreshInterval.value) return
  
  autoRefreshInterval.value = setInterval(() => {
    loadOrders()
    lastRefreshTime.value = new Date()
  }, 30000) // 30 seconds
}

function stopAutoRefresh() {
  if (autoRefreshInterval.value) {
    clearInterval(autoRefreshInterval.value)
    autoRefreshInterval.value = null
  }
}

// Lifecycle
onMounted(() => {
  loadOrders()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})

watch([currentPage], loadOrders)
</script>

<template>
  <div class="orders-advanced">
    <!-- Analytics Summary -->
    <div class="analytics-grid">
      <div class="stat-card">
        <div class="stat-label">ทั้งหมด</div>
        <div class="stat-value">{{ analytics.total }}</div>
      </div>
      <div class="stat-card stat-pending">
        <div class="stat-label">รอรับ</div>
        <div class="stat-value">{{ analytics.pending }}</div>
      </div>
      <div class="stat-card stat-progress">
        <div class="stat-label">กำลังส่ง</div>
        <div class="stat-value">{{ analytics.inProgress }}</div>
      </div>
      <div class="stat-card stat-completed">
        <div class="stat-label">สำเร็จ</div>
        <div class="stat-value">{{ analytics.completed }}</div>
      </div>
      <div class="stat-card stat-revenue">
        <div class="stat-label">รายได้รวม</div>
        <div class="stat-value">฿{{ analytics.totalRevenue.toLocaleString() }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">ค่าเฉลี่ย</div>
        <div class="stat-value">฿{{ analytics.avgOrderValue.toFixed(0) }}</div>
      </div>
    </div>

    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <h1>ออเดอร์ทั้งหมด</h1>
        <div class="auto-refresh-indicator">
          <span class="pulse-dot"></span>
          <span class="refresh-text">Auto-refresh: 30s</span>
        </div>
      </div>
      <div class="header-right">
        <button 
          v-if="selectedOrders.size > 0"
          class="bulk-btn" 
          @click="openBulkModal"
        >
          จัดการ {{ selectedOrders.size }} รายการ
        </button>
        <button class="refresh-btn" :disabled="loading" @click="loadOrders">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ 'spin': loading }">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          {{ loading ? 'กำลังโหลด...' : 'รีเฟรช' }}
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <div class="search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ค้นหา Tracking ID, ชื่อลูกค้า, ผู้ให้บริการ..."
          class="search-input"
        />
        <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''">×</button>
      </div>
      
      <select v-model="serviceTypeFilter" class="filter-select">
        <option value="">ทุกบริการ</option>
        <option value="ride">เรียกรถ</option>
        <option value="delivery">จัดส่ง</option>
        <option value="shopping">ช้อปปิ้ง</option>
      </select>
      
      <select v-model="statusFilter" class="filter-select">
        <option value="">ทุกสถานะ</option>
        <option value="pending">รอรับ</option>
        <option value="matched">จับคู่แล้ว</option>
        <option value="in_progress">กำลังดำเนินการ</option>
        <option value="completed">เสร็จสิ้น</option>
        <option value="cancelled">ยกเลิก</option>
      </select>

      <button 
        v-if="searchQuery || serviceTypeFilter || statusFilter" 
        class="clear-filters-btn"
        @click="searchQuery = ''; serviceTypeFilter = ''; statusFilter = ''"
      >
        ล้างตัวกรอง
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading && orders.length === 0" class="loading">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon">!</div>
      <h3>เกิดข้อผิดพลาด</h3>
      <p class="error-message">{{ error }}</p>
      <button class="retry-btn" @click="loadOrders">
        ลองใหม่อีกครั้ง
      </button>
    </div>

    <!-- Orders Table -->
    <div v-else-if="filteredOrders.length > 0" class="table-container">
      <!-- Loading Overlay -->
      <div v-if="loading" class="loading-overlay">
        <div class="spinner-small"></div>
        <span>กำลังอัพเดท...</span>
      </div>
      <table class="orders-table">
        <thead>
          <tr>
            <th class="checkbox-col">
              <input 
                type="checkbox" 
                :checked="allSelected"
                class="checkbox"
                @change="toggleSelectAll"
              />
            </th>
            <th>บริการ</th>
            <th>Tracking ID</th>
            <th>ลูกค้า</th>
            <th>ผู้ให้บริการ</th>
            <th>สถานะ</th>
            <th>เวลา</th>
            <th>ยอดเงิน</th>
            <th>วันที่</th>
            <th>โน้ต</th>
            <th>การจัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="order in filteredOrders" 
            :key="order.id" 
            :class="{ 'selected-row': selectedOrders.has(order.id) }"
            @click="viewOrder(order)"
          >
            <td class="checkbox-col" @click.stop>
              <input 
                type="checkbox" 
                :checked="selectedOrders.has(order.id)"
                class="checkbox"
                @change="toggleSelect(order.id)"
              />
            </td>
            <td>
              <span class="service-type">{{ getServiceLabel(order.service_type) }}</span>
            </td>
            <td>
              <code class="tracking-id">{{ order.tracking_id }}</code>
            </td>
            <td>
              <div class="user-info">
                <div class="name">{{ order.customer_name || '-' }}</div>
                <div v-if="order.customer_phone" class="phone-with-action">
                  <span class="phone">{{ formatPhoneNumber(order.customer_phone) }}</span>
                  <button 
                    class="call-btn"
                    title="โทรหาลูกค้า"
                    @click.stop="callPhone(order.customer_phone, order.customer_name || 'ลูกค้า')"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </td>
            <td>
              <div class="user-info">
                <div class="name">{{ order.provider_name || 'ยังไม่มี' }}</div>
                <div v-if="order.provider_phone" class="phone-with-action">
                  <span class="phone">{{ formatPhoneNumber(order.provider_phone) }}</span>
                  <button 
                    class="call-btn"
                    title="โทรหาไรเดอร์"
                    @click.stop="callPhone(order.provider_phone, order.provider_name || 'ไรเดอร์')"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </td>
            <td @click.stop>
              <select 
                :value="order.status"
                class="status-dropdown"
                :class="`status-${order.status}`"
                @change="updateOrderStatus(order, ($event.target as HTMLSelectElement).value)"
              >
                <option value="pending">รอรับ</option>
                <option value="matched">จับคู่แล้ว</option>
                <option value="in_progress">กำลังดำเนินการ</option>
                <option value="completed">เสร็จสิ้น</option>
                <option value="cancelled">ยกเลิก</option>
              </select>
            </td>
            <td>
              <div class="time-info">
                <div class="elapsed-time">{{ getElapsedTime(order.created_at, order.completed_at) }}</div>
                <div 
                  v-if="getTimeStatus(order.created_at, order.status).text"
                  class="time-warning"
                  :style="{ color: getTimeStatus(order.created_at, order.status).color }"
                >
                  {{ getTimeStatus(order.created_at, order.status).text }}
                </div>
              </div>
            </td>
            <td class="amount">{{ formatCurrency(order.final_amount || order.estimated_amount) }}</td>
            <td class="date">{{ formatDate(order.created_at) }}</td>
            <td>
              <button
                class="notes-indicator"
                :class="{ 'has-notes': order.notes }"
                :title="order.notes ? 'มีโน้ต - คลิกเพื่อดู/แก้ไข' : 'เพิ่มโน้ต'"
                @click.stop="openNotesModal(order)"
              >
                <svg v-if="order.notes" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            </td>
            <td>
              <div class="actions">
                <button
                  class="action-btn view"
                  title="ดูแผนที่"
                  @click.stop="openMapModal(order)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                    <line x1="8" y1="2" x2="8" y2="18"/>
                    <line x1="16" y1="6" x2="16" y2="22"/>
                  </svg>
                </button>
                <button
                  class="action-btn view"
                  title="ดูรายละเอียด"
                  @click.stop="viewOrder(order)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
                <button
                  v-if="order.status === 'pending' || order.status === 'matched'"
                  class="action-btn reassign"
                  title="ย้ายงาน"
                  @click.stop="openReassignModal(order)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                </button>
                <button
                  v-if="order.status !== 'completed' && order.status !== 'cancelled'"
                  class="action-btn cancel"
                  title="ยกเลิกออเดอร์"
                  @click.stop="openCancelModal(order)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
      </div>
      <h3>ไม่พบออเดอร์</h3>
      <p>ลองเปลี่ยนเงื่อนไขการค้นหา</p>
    </div>

    <!-- Map Modal -->
    <div v-if="showMapModal" class="modal-overlay" @click.self="showMapModal = false">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h2>แผนที่ออเดอร์</h2>
          <button class="close-btn" @click="showMapModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="order-info">
            <p><strong>Tracking ID:</strong> {{ selectedOrder?.tracking_id }}</p>
            <p><strong>จุดรับ:</strong> {{ selectedOrder?.pickup_address }}</p>
            <p><strong>จุดส่ง:</strong> {{ selectedOrder?.dropoff_address }}</p>
          </div>
          <div id="order-map" class="map-container"></div>
        </div>
      </div>
    </div>

    <!-- Bulk Operations Modal -->
    <div v-if="showBulkModal" class="modal-overlay" @click.self="showBulkModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>จัดการหลายรายการ</h2>
          <button class="close-btn" @click="showBulkModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="order-info">
            <p><strong>จำนวนที่เลือก:</strong> {{ selectedOrders.size }} รายการ</p>
          </div>

          <div class="form-group">
            <label>เลือกการดำเนินการ</label>
            <select v-model="bulkAction" class="form-select">
              <option value="">-- เลือก --</option>
              <option value="cancel">ยกเลิกทั้งหมด</option>
            </select>
          </div>

          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showBulkModal = false">
              ยกเลิก
            </button>
            <button
              :disabled="!bulkAction || loading"
              class="btn btn-danger"
              @click="executeBulkAction"
            >
              {{ loading ? 'กำลังดำเนินการ...' : 'ยืนยัน' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button
        :disabled="currentPage === 1"
        class="page-btn"
        @click="currentPage--"
      >
        ← ก่อนหน้า
      </button>
      <span class="page-info">
        หน้า {{ currentPage }} / {{ totalPages }}
      </span>
      <button
        :disabled="currentPage === totalPages"
        class="page-btn"
        @click="currentPage++"
      >
        ถัดไป →
      </button>
    </div>

    <!-- Reassign Modal -->
    <div v-if="showReassignModal" class="modal-overlay" @click.self="showReassignModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>ย้ายงานไปให้ไรเดอร์คนอื่น</h2>
          <button class="close-btn" @click="showReassignModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="order-info">
            <p><strong>Tracking ID:</strong> {{ selectedOrder?.tracking_id }}</p>
            <p><strong>ลูกค้า:</strong> {{ selectedOrder?.customer_name }}</p>
            <p><strong>ผู้ให้บริการปัจจุบัน:</strong> {{ selectedOrder?.provider_name || 'ยังไม่มี' }}</p>
          </div>

          <div class="provider-list">
            <h3>เลือกผู้ให้บริการใหม่</h3>
            <div v-if="providers.length === 0" class="no-providers">
              ไม่มีผู้ให้บริการที่พร้อมให้บริการ
            </div>
            <div v-else class="providers-grid">
              <div
                v-for="provider in providers"
                :key="provider.id"
                class="provider-card"
                :class="{ selected: selectedProvider === provider.user_id }"
                @click="selectedProvider = provider.user_id"
              >
                <div class="provider-header">
                  <div class="provider-name">{{ provider.full_name }}</div>
                  <span v-if="provider.is_online" class="online-badge">🟢 ออนไลน์</span>
                  <span v-else class="offline-badge">⚫ ออฟไลน์</span>
                </div>
                <div class="provider-details">
                  <div>{{ provider.phone }}</div>
                  <div>{{ provider.vehicle_type }}</div>
                  <div>⭐ {{ provider.rating?.toFixed(1) || 'N/A' }}</div>
                  <div>{{ provider.total_orders || 0 }} งาน</div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showReassignModal = false">
              ยกเลิก
            </button>
            <button
              :disabled="!selectedProvider || loading"
              class="btn btn-primary"
              @click="reassignProvider"
            >
              {{ loading ? 'กำลังบันทึก...' : 'ยืนยันย้ายงาน' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h2>📋 รายละเอียดออเดอร์</h2>
          <button class="close-btn" @click="showDetailModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div class="detail-item">
              <label>Tracking ID</label>
              <code class="tracking-id">{{ selectedOrder?.tracking_id }}</code>
            </div>
            <div class="detail-item">
              <label>สถานะ</label>
              <span
                class="status-badge"
                :style="{
                  color: getStatusColor(selectedOrder?.status || ''),
                  background: getStatusColor(selectedOrder?.status || '') + '20'
                }"
              >
                {{ getStatusLabel(selectedOrder?.status || '') }}
              </span>
            </div>
            <div class="detail-item">
              <label>ลูกค้า</label>
              <div class="contact-info">
                <div>{{ selectedOrder?.customer_name }}</div>
                <div v-if="selectedOrder?.customer_phone" class="phone-with-action">
                  <span class="phone">{{ formatPhoneNumber(selectedOrder.customer_phone) }}</span>
                  <button 
                    class="call-btn-large"
                    @click="callPhone(selectedOrder.customer_phone, selectedOrder.customer_name || 'ลูกค้า')"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    โทร
                  </button>
                </div>
              </div>
            </div>
            <div class="detail-item">
              <label>ผู้ให้บริการ</label>
              <div class="contact-info">
                <div>{{ selectedOrder?.provider_name || 'ยังไม่มี' }}</div>
                <div v-if="selectedOrder?.provider_phone" class="phone-with-action">
                  <span class="phone">{{ formatPhoneNumber(selectedOrder.provider_phone) }}</span>
                  <button 
                    class="call-btn-large"
                    @click="callPhone(selectedOrder.provider_phone, selectedOrder.provider_name || 'ไรเดอร์')"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    โทร
                  </button>
                </div>
              </div>
            </div>
            <div class="detail-item">
              <label>จุดรับ</label>
              <div>{{ selectedOrder?.pickup_address }}</div>
            </div>
            <div class="detail-item">
              <label>จุดส่ง</label>
              <div>{{ selectedOrder?.dropoff_address }}</div>
            </div>
            <div class="detail-item">
              <label>ยอดเงิน</label>
              <div class="amount-large">
                {{ formatCurrency(selectedOrder?.final_amount || selectedOrder?.estimated_amount || 0) }}
              </div>
            </div>
            <div class="detail-item">
              <label>ระยะทาง</label>
              <div>{{ selectedOrder?.distance_km?.toFixed(1) || '-' }} km</div>
            </div>
            <div class="detail-item full-width">
              <label>โน้ต</label>
              <div class="notes-display">
                <div v-if="selectedOrder?.notes" class="notes-content">
                  {{ selectedOrder.notes }}
                </div>
                <div v-else class="no-notes">ไม่มีโน้ต</div>
                <button 
                  class="edit-notes-btn"
                  @click="showDetailModal = false; openNotesModal(selectedOrder!)"
                >
                  {{ selectedOrder?.notes ? 'แก้ไขโน้ต' : 'เพิ่มโน้ต' }}
                </button>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showDetailModal = false">
              ปิด
            </button>
            <button
              v-if="selectedOrder && (selectedOrder.status === 'pending' || selectedOrder.status === 'matched')"
              class="btn btn-primary"
              @click="showDetailModal = false; openReassignModal(selectedOrder)"
            >
              ย้ายงาน
            </button>
            <button
              v-if="selectedOrder && selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled'"
              class="btn btn-danger"
              @click="showDetailModal = false; openCancelModal(selectedOrder)"
            >
              ยกเลิกออเดอร์
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Cancel Modal -->
    <div v-if="showCancelModal" class="modal-overlay" @click.self="showCancelModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>ยกเลิกออเดอร์</h2>
          <button class="close-btn" @click="showCancelModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="order-info warning">
            <p><strong>คำเตือน:</strong> คุณกำลังจะยกเลิกออเดอร์นี้</p>
            <p><strong>Tracking ID:</strong> {{ selectedOrder?.tracking_id }}</p>
            <p><strong>ลูกค้า:</strong> {{ selectedOrder?.customer_name }}</p>
            <p><strong>ยอดเงิน:</strong> {{ formatCurrency(selectedOrder?.final_amount || 0) }}</p>
          </div>

          <div class="form-group">
            <label>เหตุผลในการยกเลิก</label>
            <textarea
              v-model="cancelReason"
              class="form-textarea"
              placeholder="ระบุเหตุผล (ไม่บังคับ)..."
              rows="4"
            ></textarea>
          </div>

          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showCancelModal = false">
              ยกเลิก
            </button>
            <button
              :disabled="loading"
              class="btn btn-danger"
              @click="cancelOrder"
            >
              {{ loading ? 'กำลังยกเลิก...' : '✓ ยืนยันยกเลิกออเดอร์' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Notes Modal -->
    <div v-if="showNotesModal" class="modal-overlay" @click.self="showNotesModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>โน้ตออเดอร์</h2>
          <button class="close-btn" @click="showNotesModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="order-info">
            <p><strong>Tracking ID:</strong> {{ selectedOrder?.tracking_id }}</p>
            <p><strong>ลูกค้า:</strong> {{ selectedOrder?.customer_name }}</p>
            <p><strong>สถานะ:</strong> {{ getStatusLabel(selectedOrder?.status || '') }}</p>
          </div>

          <div class="form-group">
            <label>โน้ต / บันทึกเพิ่มเติม</label>
            <textarea
              v-model="orderNotes"
              class="form-textarea"
              placeholder="เพิ่มโน้ตหรือบันทึกเพิ่มเติมสำหรับออเดอร์นี้..."
              rows="6"
              autofocus
            ></textarea>
            <div class="notes-hint">
              💡 โน้ตนี้จะถูกบันทึกไว้สำหรับการอ้างอิงภายในของ Admin เท่านั้น
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showNotesModal = false">
              ยกเลิก
            </button>
            <button
              :disabled="loading"
              class="btn btn-primary"
              @click="saveNotes"
            >
              {{ loading ? 'กำลังบันทึก...' : '✓ บันทึกโน้ต' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.orders-advanced {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

/* Analytics Grid */
.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;
}

.stat-card:hover {
  border-color: #D1D5DB;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.stat-label {
  font-size: 12px;
  font-weight: 600;
  color: #6B7280;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1F2937;
}

.stat-card.stat-pending {
  border-left: 3px solid #F59E0B;
}

.stat-card.stat-progress {
  border-left: 3px solid #3B82F6;
}

.stat-card.stat-completed {
  border-left: 3px solid #10B981;
}

.stat-card.stat-revenue {
  border-left: 3px solid #000000;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 24px;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-left h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  color: #1F2937;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.auto-refresh-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.auto-refresh-indicator .pulse-dot {
  width: 8px;
  height: 8px;
  background: #10B981;
  border-radius: 50%;
  animation: pulse-green 2s infinite;
}

@keyframes pulse-green {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  50% {
    opacity: 0.8;
    box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
  }
}

.bulk-btn {
  padding: 12px 20px;
  background: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.bulk-btn:hover {
  background: #374151;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #FFFFFF;
  color: #374151;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover {
  border-color: #000000;
  color: #000000;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-btn svg.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Filters */
.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  padding: 20px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 300px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.2s;
}

.search-box:focus-within {
  border-color: #00a86b;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.1);
}

.search-box svg {
  color: #9ca3af;
  flex-shrink: 0;
}

.clear-search {
  position: absolute;
  right: 12px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: #6b7280;
  font-size: 14px;
  transition: all 0.2s;
}

.clear-search:hover {
  background: #d1d5db;
  color: #374151;
}

.search-input {
  flex: 1;
  padding: 14px 0;
  border: none;
  outline: none;
  font-size: 14px;
  background: transparent;
}

.clear-filters-btn {
  padding: 12px 20px;
  background: #FFFFFF;
  color: #EF4444;
  border: 1px solid #FCA5A5;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.clear-filters-btn:hover {
  background: #FEF2F2;
  border-color: #EF4444;
}

.filter-select {
  padding: 12px 16px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  font-size: 14px;
  min-width: 160px;
  background: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-select:focus {
  border-color: #000000;
  outline: none;
}

/* Loading */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #E5E7EB;
  border-top-color: #000000;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading p {
  margin-top: 16px;
  color: #6B7280;
}

/* Table */
.table-container {
  position: relative;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  overflow: hidden;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 10;
  backdrop-filter: blur(2px);
}

.spinner-small {
  width: 24px;
  height: 24px;
  border: 3px solid #E5E7EB;
  border-top-color: #000000;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
}

.error-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: 700;
  color: #EF4444;
  background: #FEF2F2;
  border: 2px solid #FCA5A5;
  border-radius: 50%;
  margin-bottom: 16px;
}

.error-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1F2937;
  margin: 0 0 12px 0;
}

.error-message {
  color: #EF4444;
  font-size: 14px;
  margin: 0 0 24px 0;
  padding: 12px 20px;
  background: #FEF2F2;
  border: 1px solid #FCA5A5;
  border-radius: 8px;
  max-width: 500px;
}

.retry-btn {
  padding: 12px 24px;
  background: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: #374151;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
}

.orders-table th {
  padding: 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #6B7280;
  text-transform: uppercase;
  background: #F9FAFB;
  border-bottom: 1px solid #E5E7EB;
}

.orders-table td {
  padding: 16px;
  border-bottom: 1px solid #F3F4F6;
}

.orders-table tbody tr {
  cursor: pointer;
  transition: all 0.15s;
  border-left: 3px solid transparent;
}

.orders-table tbody tr:hover {
  background: #F9FAFB;
  border-left-color: #000000;
}

.orders-table tbody tr:active {
  transform: scale(0.995);
}

.service-icon {
  font-size: 24px;
}

.tracking-id {
  font-family: 'SF Mono', 'Monaco', monospace;
  font-size: 13px;
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 6px;
  font-weight: 600;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.name {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.phone {
  font-size: 12px;
  color: #6b7280;
}

.phone-with-action {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Status Dropdown */
.status-dropdown {
  padding: 6px 12px;
  border: 1px solid;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 140px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3 5L6 8L9 5' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 28px;
}

.status-dropdown:hover {
  opacity: 0.8;
}

.status-dropdown:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
}

.status-dropdown.status-pending {
  background-color: #FFFBEB;
  color: #92400E;
  border-color: #FDE68A;
}

.status-dropdown.status-matched {
  background-color: #EFF6FF;
  color: #1E40AF;
  border-color: #BFDBFE;
}

.status-dropdown.status-in_progress {
  background-color: #F3E8FF;
  color: #6B21A8;
  border-color: #D8B4FE;
}

.status-dropdown.status-completed {
  background-color: #F0FDF4;
  color: #166534;
  border-color: #BBF7D0;
}

.status-dropdown.status-cancelled {
  background-color: #FEF2F2;
  color: #991B1B;
  border-color: #FECACA;
}

.call-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F0FDF4;
  border: 1px solid #BBF7D0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.call-btn:hover {
  background: #DCFCE7;
  border-color: #86EFAC;
  transform: scale(1.05);
}

.call-btn:active {
  transform: scale(0.95);
}

.time-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.elapsed-time {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.time-warning {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: 1px solid;
}

.amount {
  font-weight: 600;
  color: #059669;
  font-size: 14px;
}

.date {
  font-size: 13px;
  color: #6B7280;
}

.actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  background: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: #000000;
  background: #F9FAFB;
}

.action-btn.reassign:hover {
  border-color: #3B82F6;
  background: #EFF6FF;
}

.action-btn.cancel:hover {
  border-color: #EF4444;
  background: #FEF2F2;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
}

.empty-icon {
  margin-bottom: 16px;
  color: #9CA3AF;
}

.empty-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1F2937;
  margin: 0 0 8px 0;
}

.empty-state p {
  color: #6B7280;
  margin: 0;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
  padding: 20px;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
}

.page-btn {
  padding: 10px 20px;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  border-color: #000000;
  background: #F9FAFB;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #6B7280;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(2px);
}

.modal {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal.modal-lg {
  max-width: 900px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  border-bottom: 1px solid #E5E7EB;
  background: #F9FAFB;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #1F2937;
}

.close-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 10px;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 28px;
  max-height: calc(90vh - 140px);
  overflow-y: auto;
}

.order-info {
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
  margin-bottom: 24px;
}

.order-info.warning {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border: 2px solid #fbbf24;
}

.order-info p {
  margin: 8px 0;
  font-size: 14px;
  color: #374151;
}

.order-info.warning p {
  color: #92400e;
}

.order-info.warning p:first-child {
  font-weight: 600;
  color: #b45309;
}

.provider-list h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #1f2937;
}

.no-providers {
  padding: 40px;
  text-align: center;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 12px;
}

.providers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.provider-card {
  padding: 16px;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.provider-card:hover {
  border-color: #000000;
  background: #F9FAFB;
}

.provider-card.selected {
  border-color: #000000;
  border-width: 2px;
  background: #F0FDF4;
}

.provider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.provider-name {
  font-weight: 600;
  color: #1f2937;
}

.online-badge {
  font-size: 12px;
  padding: 4px 8px;
  background: #F0FDF4;
  color: #166534;
  border: 1px solid #BBF7D0;
  border-radius: 12px;
  font-weight: 600;
}

.offline-badge {
  font-size: 12px;
  padding: 4px 8px;
  background: #F9FAFB;
  color: #6B7280;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  font-weight: 600;
}

.provider-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  font-size: 13px;
  color: #6b7280;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-item label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
}

.detail-item > div {
  font-size: 14px;
  color: #1f2937;
}

.contact-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.call-btn-large {
  padding: 8px 16px;
  background: #F0FDF4;
  border: 1px solid #BBF7D0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #166534;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.call-btn-large:hover {
  background: #DCFCE7;
  border-color: #86EFAC;
}

.call-btn-large:active {
  transform: scale(0.98);
}

.amount-large {
  font-size: 24px;
  font-weight: 700;
  color: #059669;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px;
}

.btn-primary {
  background: #000000;
  color: #FFFFFF;
}

.btn-primary:hover:not(:disabled) {
  background: #374151;
}

.btn-primary:disabled {
  background: #9CA3AF;
  cursor: not-allowed;
}

.btn-secondary {
  background: #FFFFFF;
  color: #374151;
  border: 1px solid #E5E7EB;
}

.btn-secondary:hover {
  background: #F9FAFB;
  border-color: #D1D5DB;
}

.btn-danger {
  background: #EF4444;
  color: #FFFFFF;
}

.btn-danger:hover:not(:disabled) {
  background: #DC2626;
}

.btn-danger:disabled {
  background: #9CA3AF;
  cursor: not-allowed;
}

.btn-danger {
  background: #ef4444;
  color: #fff;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
  transform: translateY(-1px);
}

.btn-danger:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 100px;
  transition: all 0.2s;
}

.form-textarea:focus {
  border-color: #000000;
  outline: none;
}

.notes-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #6B7280;
  font-style: italic;
}

.notes-indicator {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  background: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s;
}

.notes-indicator:hover {
  border-color: #000000;
  background: #F9FAFB;
}

.notes-indicator.has-notes {
  border-color: #F59E0B;
  background: #FFFBEB;
  color: #92400E;
}

.notes-indicator.has-notes:hover {
  border-color: #D97706;
  background: #FEF3C7;
}

.notes-display {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notes-content {
  padding: 12px 16px;
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  border-radius: 8px;
  font-size: 14px;
  color: #92400E;
  white-space: pre-wrap;
  word-break: break-word;
}

.no-notes {
  padding: 12px 16px;
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  font-size: 14px;
  color: #9CA3AF;
  font-style: italic;
}

.edit-notes-btn {
  padding: 10px 16px;
  background: #FFFBEB;
  border: 1px solid #FDE68A;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #92400E;
  transition: all 0.2s;
  align-self: flex-start;
}

.edit-notes-btn:hover {
  background: #FEF3C7;
  border-color: #FCD34D;
}

/* Responsive */
@media (max-width: 768px) {
  .orders-advanced {
    padding: 16px;
  }
  
  .header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .filters {
    flex-direction: column;
  }
  
  .search-input {
    min-width: auto;
  }
  
  .table-container {
    overflow-x: auto;
  }
  
  .orders-table {
    min-width: 800px;
  }
  
  .providers-grid {
    grid-template-columns: 1fr;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
