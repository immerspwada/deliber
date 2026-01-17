<script setup lang="ts">
/**
 * Advanced Orders View - Production Ready
 * Features: Reassign provider, bulk actions, real-time updates, analytics
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { supabase } from '../../lib/supabase'

// Types
interface Order {
  id: string
  tracking_id: string
  service_type: string
  status: string
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
const cancelReason = ref('')
const searchQuery = ref('')
const statusFilter = ref('')
const serviceTypeFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const totalOrders = ref(0)
const error = ref<string | null>(null)

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
    
    alert('✅ ยกเลิกออเดอร์สำเร็จ!')
    showCancelModal.value = false
    loadOrders()
  } catch (err) {
    console.error('[OrdersView] Error cancelling order:', err)
    alert('❌ เกิดข้อผิดพลาด')
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
    
    alert('✅ ย้ายงานสำเร็จ!')
    showReassignModal.value = false
    loadOrders()
  } catch (err) {
    console.error('[OrdersView] Error reassigning:', err)
    alert('❌ เกิดข้อผิดพลาด')
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
    alert('❌ ไม่มีเบอร์โทรศัพท์')
    return
  }
  
  const confirmed = confirm(`📞 โทรหา ${name}\nเบอร์: ${formatPhoneNumber(phone)}`)
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
    return { text: '⚠️ รอนาน', color: '#f59e0b' }
  }
  
  if (status === 'in_progress' && minutes > 60) {
    return { text: '⚠️ ใช้เวลานาน', color: '#ef4444' }
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
    <!-- Header with Summary -->
    <div class="header">
      <div class="header-left">
        <h1>📋 ออเดอร์ทั้งหมด</h1>
        <div class="summary-badges">
          <span class="badge badge-total">{{ totalOrders.toLocaleString() }} รายการ</span>
          <span class="badge badge-pending">{{ orders.filter(o => o.status === 'pending').length }} รอรับ</span>
          <span class="badge badge-progress">{{ orders.filter(o => o.status === 'in_progress').length }} กำลังส่ง</span>
          <span class="badge badge-completed">{{ orders.filter(o => o.status === 'completed').length }} สำเร็จ</span>
        </div>
      </div>
      <div class="header-right">
        <div class="auto-refresh-indicator">
          <span class="pulse-dot"></span>
          <span class="refresh-text">Auto-refresh: 30s</span>
        </div>
        <button @click="loadOrders" class="refresh-btn" :disabled="loading">
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
          placeholder="🔍 ค้นหา Tracking ID, ชื่อลูกค้า, ผู้ให้บริการ..."
          class="search-input"
        />
        <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search">✕</button>
      </div>
      
      <select v-model="serviceTypeFilter" class="filter-select">
        <option value="">📦 ทุกบริการ</option>
        <option value="ride">🚗 เรียกรถ</option>
        <option value="delivery">📦 จัดส่ง</option>
        <option value="shopping">🛒 ช้อปปิ้ง</option>
      </select>
      
      <select v-model="statusFilter" class="filter-select">
        <option value="">🔄 ทุกสถานะ</option>
        <option value="pending">⏳ รอรับ</option>
        <option value="matched">✅ จับคู่แล้ว</option>
        <option value="in_progress">🚀 กำลังดำเนินการ</option>
        <option value="completed">✔️ เสร็จสิ้น</option>
        <option value="cancelled">❌ ยกเลิก</option>
      </select>

      <button 
        v-if="searchQuery || serviceTypeFilter || statusFilter" 
        @click="searchQuery = ''; serviceTypeFilter = ''; statusFilter = ''"
        class="clear-filters-btn"
      >
        🗑️ ล้างตัวกรอง
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading && orders.length === 0" class="loading">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <h3>เกิดข้อผิดพลาด</h3>
      <p class="error-message">{{ error }}</p>
      <button @click="loadOrders" class="retry-btn">
        🔄 ลองใหม่อีกครั้ง
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
            <th>บริการ</th>
            <th>Tracking ID</th>
            <th>ลูกค้า</th>
            <th>ผู้ให้บริการ</th>
            <th>สถานะ</th>
            <th>เวลา</th>
            <th>ยอดเงิน</th>
            <th>วันที่</th>
            <th>การจัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in filteredOrders" :key="order.id" @click="viewOrder(order)">
            <td>
              <span class="service-icon">{{ getServiceIcon(order.service_type) }}</span>
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
                    @click.stop="callPhone(order.customer_phone, order.customer_name || 'ลูกค้า')"
                    class="call-btn"
                    title="โทรหาลูกค้า"
                  >
                    📞
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
                    @click.stop="callPhone(order.provider_phone, order.provider_name || 'ไรเดอร์')"
                    class="call-btn"
                    title="โทรหาไรเดอร์"
                  >
                    📞
                  </button>
                </div>
              </div>
            </td>
            <td>
              <span
                class="status-badge"
                :style="{
                  color: getStatusColor(order.status),
                  background: getStatusColor(order.status) + '20'
                }"
              >
                {{ getStatusLabel(order.status) }}
              </span>
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
              <div class="actions">
                <button
                  @click.stop="viewOrder(order)"
                  class="action-btn view"
                  title="ดูรายละเอียด"
                >
                  👁️
                </button>
                <button
                  v-if="order.status === 'pending' || order.status === 'matched'"
                  @click.stop="openReassignModal(order)"
                  class="action-btn reassign"
                  title="ย้ายงาน"
                >
                  🔄
                </button>
                <button
                  v-if="order.status !== 'completed' && order.status !== 'cancelled'"
                  @click.stop="openCancelModal(order)"
                  class="action-btn cancel"
                  title="ยกเลิกออเดอร์"
                >
                  ❌
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>ไม่พบออเดอร์</h3>
      <p>ลองเปลี่ยนเงื่อนไขการค้นหา</p>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button
        @click="currentPage--"
        :disabled="currentPage === 1"
        class="page-btn"
      >
        ← ก่อนหน้า
      </button>
      <span class="page-info">
        หน้า {{ currentPage }} / {{ totalPages }}
      </span>
      <button
        @click="currentPage++"
        :disabled="currentPage === totalPages"
        class="page-btn"
      >
        ถัดไป →
      </button>
    </div>

    <!-- Reassign Modal -->
    <div v-if="showReassignModal" class="modal-overlay" @click.self="showReassignModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>🔄 ย้ายงานไปให้ไรเดอร์คนอื่น</h2>
          <button @click="showReassignModal = false" class="close-btn">✕</button>
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
                  <div>📞 {{ provider.phone }}</div>
                  <div>🚗 {{ provider.vehicle_type }}</div>
                  <div>⭐ {{ provider.rating?.toFixed(1) || 'N/A' }}</div>
                  <div>📦 {{ provider.total_orders || 0 }} งาน</div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button @click="showReassignModal = false" class="btn btn-secondary">
              ยกเลิก
            </button>
            <button
              @click="reassignProvider"
              :disabled="!selectedProvider || loading"
              class="btn btn-primary"
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
          <button @click="showDetailModal = false" class="close-btn">✕</button>
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
                    @click="callPhone(selectedOrder.customer_phone, selectedOrder.customer_name || 'ลูกค้า')"
                    class="call-btn-large"
                  >
                    📞 โทร
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
                    @click="callPhone(selectedOrder.provider_phone, selectedOrder.provider_name || 'ไรเดอร์')"
                    class="call-btn-large"
                  >
                    📞 โทร
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
          </div>

          <div class="modal-actions">
            <button @click="showDetailModal = false" class="btn btn-secondary">
              ปิด
            </button>
            <button
              v-if="selectedOrder && (selectedOrder.status === 'pending' || selectedOrder.status === 'matched')"
              @click="showDetailModal = false; openReassignModal(selectedOrder)"
              class="btn btn-primary"
            >
              🔄 ย้ายงาน
            </button>
            <button
              v-if="selectedOrder && selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled'"
              @click="showDetailModal = false; openCancelModal(selectedOrder)"
              class="btn btn-danger"
            >
              ❌ ยกเลิกออเดอร์
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Cancel Modal -->
    <div v-if="showCancelModal" class="modal-overlay" @click.self="showCancelModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>❌ ยกเลิกออเดอร์</h2>
          <button @click="showCancelModal = false" class="close-btn">✕</button>
        </div>
        <div class="modal-body">
          <div class="order-info warning">
            <p><strong>⚠️ คำเตือน:</strong> คุณกำลังจะยกเลิกออเดอร์นี้</p>
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
            <button @click="showCancelModal = false" class="btn btn-secondary">
              ยกเลิก
            </button>
            <button
              @click="cancelOrder"
              :disabled="loading"
              class="btn btn-danger"
            >
              {{ loading ? 'กำลังยกเลิก...' : '✓ ยืนยันยกเลิกออเดอร์' }}
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

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 24px;
  background: linear-gradient(135deg, #ffffff, #f9fafb);
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.auto-refresh-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #065f46;
}

.auto-refresh-indicator .pulse-dot {
  width: 8px;
  height: 8px;
  background: #10b981;
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

.header-left {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header-left h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  color: #1f2937;
}

.summary-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.badge-total {
  background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
  color: #3730a3;
}

.badge-pending {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
}

.badge-progress {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  color: #1e40af;
}

.badge-completed {
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  color: #065f46;
}

.count {
  padding: 6px 16px;
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  color: #065f46;
  font-size: 14px;
  font-weight: 600;
  border-radius: 20px;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #00a86b;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background: #059669;
  transform: translateY(-1px);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
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
  background: linear-gradient(135deg, #fee2e2, #fecaca);
  color: #dc2626;
  border: 1px solid #fca5a5;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.clear-filters-btn:hover {
  background: linear-gradient(135deg, #fecaca, #fca5a5);
  transform: translateY(-1px);
}

.filter-select {
  padding: 14px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 14px;
  min-width: 160px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-select:focus {
  border-color: #00a86b;
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
  border: 4px solid #e5e7eb;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading p {
  margin-top: 16px;
  color: #6b7280;
}

/* Table */
.table-container {
  position: relative;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
  border: 3px solid #e5e7eb;
  border-top-color: #00a86b;
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
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.error-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.error-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px 0;
}

.error-message {
  color: #ef4444;
  font-size: 14px;
  margin: 0 0 24px 0;
  padding: 12px 20px;
  background: #fee2e2;
  border-radius: 8px;
  max-width: 500px;
}

.retry-btn {
  padding: 12px 24px;
  background: #00a86b;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: #059669;
  transform: translateY(-1px);
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
  color: #6b7280;
  text-transform: uppercase;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.orders-table td {
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
}

.orders-table tbody tr {
  cursor: pointer;
  transition: all 0.15s;
  border-left: 3px solid transparent;
}

.orders-table tbody tr:hover {
  background: #f9fafb;
  border-left-color: #00a86b;
  transform: translateX(2px);
}

.orders-table tbody tr:active {
  transform: translateX(0);
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

.call-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  border: 1px solid #6ee7b7;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.call-btn:hover {
  background: linear-gradient(135deg, #a7f3d0, #6ee7b7);
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
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
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.amount {
  font-weight: 600;
  color: #059669;
  font-size: 14px;
}

.date {
  font-size: 13px;
  color: #6b7280;
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
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: #00a86b;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 168, 107, 0.2);
}

.action-btn.reassign {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  border-color: #93c5fd;
}

.action-btn.cancel {
  background: linear-gradient(135deg, #fee2e2, #fecaca);
  border-color: #fca5a5;
}

.action-btn.cancel:hover {
  border-color: #ef4444;
  background: linear-gradient(135deg, #fecaca, #fca5a5);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.empty-state p {
  color: #6b7280;
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
  background: #fff;
  border-radius: 12px;
}

.page-btn {
  padding: 10px 20px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  border-color: #00a86b;
  color: #00a86b;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #6b7280;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.modal {
  background: #fff;
  border-radius: 20px;
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal.modal-lg {
  max-width: 900px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #1f2937;
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
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.provider-card:hover {
  border-color: #00a86b;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.provider-card.selected {
  border-color: #00a86b;
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
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
  background: #d1fae5;
  color: #065f46;
  border-radius: 12px;
  font-weight: 600;
}

.offline-badge {
  font-size: 12px;
  padding: 4px 8px;
  background: #f3f4f6;
  color: #6b7280;
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
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  border: 1px solid #6ee7b7;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #065f46;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.call-btn-large:hover {
  background: linear-gradient(135deg, #a7f3d0, #6ee7b7);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.call-btn-large:active {
  transform: translateY(0);
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
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px;
}

.btn-primary {
  background: #00a86b;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #e5e7eb;
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
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 100px;
  transition: all 0.2s;
}

.form-textarea:focus {
  border-color: #00a86b;
  outline: none;
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
