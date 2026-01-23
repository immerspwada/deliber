<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { supabase } from '../../lib/supabase'
import { useAdminUIStore } from '../stores/adminUI.store'

interface Delivery {
  id: string
  tracking_id: string
  status: string
  user_id: string
  user_name: string
  user_phone: string | null
  provider_id: string | null
  provider_name: string
  provider_phone: string | null
  sender_name: string
  sender_phone: string
  sender_address: string
  recipient_name: string
  recipient_phone: string
  recipient_address: string
  package_type: string
  package_description: string | null
  distance_km: number | null
  amount: number
  payment_method: string
  payment_status: string
  created_at: string
  picked_up_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
}

interface DeliveryStats {
  total: number
  pending: number
  matched: number
  in_transit: number
  delivered: number
  cancelled: number
}

const uiStore = useAdminUIStore()

const deliveries = ref<Delivery[]>([])
const totalDeliveries = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const totalPages = ref(0)
const statusFilter = ref('')
const selectedDelivery = ref<Delivery | null>(null)
const showDetailModal = ref(false)
const isLoading = ref(false)
const loadError = ref<string | null>(null)

const stats = ref<DeliveryStats>({
  total: 0, pending: 0, matched: 0, in_transit: 0, delivered: 0, cancelled: 0
})

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null

async function loadDeliveries() {
  isLoading.value = true
  loadError.value = null
  
  try {
    const offset = (currentPage.value - 1) * pageSize.value
    
    const { data, error } = await (supabase.rpc as any)('get_all_deliveries_for_admin', {
      p_status: statusFilter.value || null,
      p_limit: pageSize.value,
      p_offset: offset
    })

    if (error) throw error

    const { data: countData, error: countError } = await (supabase.rpc as any)('count_deliveries_for_admin', {
      p_status: statusFilter.value || null
    })

    if (countError) throw countError

    deliveries.value = data || []
    totalDeliveries.value = countData || 0
    totalPages.value = Math.ceil(totalDeliveries.value / pageSize.value)
    
    await loadStats()
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
    console.error('[DeliveryView] Load error:', err)
  } finally {
    isLoading.value = false
  }
}

async function loadStats() {
  try {
    const { data, error } = await (supabase.rpc as any)('get_delivery_stats_for_admin')
    
    if (error) throw error
    
    if (data && data[0]) {
      stats.value = data[0]
    }
  } catch (err) {
    console.error('[DeliveryView] Stats error:', err)
  }
}

function viewDelivery(delivery: Delivery) {
  selectedDelivery.value = delivery
  showDetailModal.value = true
}

function formatDate(date: string | null) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatCurrency(amount: number | null) {
  if (amount === null) return '-'
  return new Intl.NumberFormat('th-TH', {
    style: 'currency', currency: 'THB', minimumFractionDigits: 0
  }).format(amount)
}

function getStatusColor(s: string) {
  const colors: Record<string, string> = {
    pending: '#F59E0B',
    matched: '#3B82F6',
    pickup: '#8B5CF6',
    in_transit: '#8B5CF6',
    delivered: '#10B981',
    failed: '#EF4444',
    cancelled: '#EF4444'
  }
  return colors[s] || '#6B7280'
}

function getStatusLabel(s: string) {
  const labels: Record<string, string> = {
    pending: 'รอรับงาน',
    matched: 'จับคู่แล้ว',
    pickup: 'กำลังรับพัสดุ',
    in_transit: 'กำลังส่ง',
    delivered: 'ส่งแล้ว',
    failed: 'ส่งไม่สำเร็จ',
    cancelled: 'ยกเลิก'
  }
  return labels[s] || s
}

function getPackageTypeLabel(type: string) {
  const labels: Record<string, string> = {
    document: 'เอกสาร',
    small: 'ขนาดเล็ก',
    medium: 'ขนาดกลาง',
    large: 'ขนาดใหญ่',
    fragile: 'แตกหักง่าย'
  }
  return labels[type] || type
}

function setupRealtime() {
  realtimeChannel = supabase
    .channel('admin-delivery-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'delivery_requests'
    }, () => {
      loadDeliveries()
    })
    .subscribe()
}

watch([statusFilter], () => { 
  currentPage.value = 1
  loadDeliveries() 
})
watch(currentPage, loadDeliveries)

onMounted(() => {
  uiStore.setBreadcrumbs([{ label: 'Orders' }, { label: 'Delivery' }])
  loadDeliveries()
  setupRealtime()
})

onUnmounted(() => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
  }
})
</script>

<template>
  <div class="delivery-view">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">การส่งพัสดุ</h1>
        <span class="total-count">{{ totalDeliveries.toLocaleString() }} รายการ</span>
      </div>
      <div class="header-right">
        <button class="refresh-btn" @click="loadDeliveries" :disabled="isLoading" aria-label="รีเฟรช">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ spinning: isLoading }">
            <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon total">📦</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">ทั้งหมด</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon pending">⏳</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.pending }}</div>
          <div class="stat-label">รอรับงาน</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon in-progress">🚚</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.in_transit }}</div>
          <div class="stat-label">กำลังส่ง</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon delivered">✅</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.delivered }}</div>
          <div class="stat-label">ส่งแล้ว</div>
        </div>
      </div>
    </div>

    <div class="status-tabs">
      <button class="status-tab" :class="{ active: statusFilter === '' }" @click="statusFilter = ''">ทั้งหมด</button>
      <button class="status-tab" :class="{ active: statusFilter === 'pending' }" @click="statusFilter = 'pending'">รอรับงาน</button>
      <button class="status-tab" :class="{ active: statusFilter === 'matched' }" @click="statusFilter = 'matched'">จับคู่แล้ว</button>
      <button class="status-tab" :class="{ active: statusFilter === 'in_transit' }" @click="statusFilter = 'in_transit'">กำลังส่ง</button>
      <button class="status-tab" :class="{ active: statusFilter === 'delivered' }" @click="statusFilter = 'delivered'">ส่งแล้ว</button>
      <button class="status-tab" :class="{ active: statusFilter === 'cancelled' }" @click="statusFilter = 'cancelled'">ยกเลิก</button>
    </div>

    <div class="table-container">
      <div v-if="loadError" class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>เกิดข้อผิดพลาด</h3>
        <p class="error-message">{{ loadError }}</p>
        <button class="btn btn-primary" @click="loadDeliveries">ลองใหม่</button>
      </div>

      <div v-else-if="isLoading" class="loading-state">
        <div class="skeleton" v-for="i in 8" :key="i"/>
      </div>

      <table v-else-if="deliveries.length > 0" class="data-table">
        <thead>
          <tr>
            <th>Tracking ID</th>
            <th>ผู้ส่ง</th>
            <th>ผู้รับ</th>
            <th>ประเภท</th>
            <th>ผู้รับงาน</th>
            <th>สถานะ</th>
            <th>ยอดเงิน</th>
            <th>วันที่</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in deliveries" :key="d.id" @click="viewDelivery(d)">
            <td><code class="tracking-id">{{ d.tracking_id }}</code></td>
            <td>
              <div class="person-cell">
                <div class="person-name">{{ d.sender_name || '-' }}</div>
                <div class="person-phone">{{ d.sender_phone || '-' }}</div>
              </div>
            </td>
            <td>
              <div class="person-cell">
                <div class="person-name">{{ d.recipient_name || '-' }}</div>
                <div class="person-phone">{{ d.recipient_phone || '-' }}</div>
              </div>
            </td>
            <td><span class="package-badge">{{ getPackageTypeLabel(d.package_type) }}</span></td>
            <td>
              <div class="provider-cell">
                <div class="provider-name">{{ d.provider_name }}</div>
              </div>
            </td>
            <td>
              <span class="status-badge" :style="{ color: getStatusColor(d.status), background: getStatusColor(d.status) + '20' }">
                {{ getStatusLabel(d.status) }}
              </span>
            </td>
            <td class="amount">{{ formatCurrency(d.amount) }}</td>
            <td class="date">{{ formatDate(d.created_at) }}</td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty-state">
        <div class="empty-icon">📦</div>
        <p>ไม่พบรายการส่งพัสดุ</p>
      </div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">ก่อนหน้า</button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">ถัดไป</button>
    </div>
  </div>
</template>

<style scoped>
.delivery-view { max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 24px; font-weight: 700; color: #1f2937; margin: 0; }
.total-count { padding: 4px 12px; background: #e8f5ef; color: #00a86b; font-size: 13px; font-weight: 500; border-radius: 16px; }
.refresh-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; cursor: pointer; color: #6b7280; transition: all 0.2s; }
.refresh-btn:hover { background: #f9fafb; border-color: #00a86b; color: #00a86b; }
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.refresh-btn svg.spinning { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card { display: flex; align-items: center; gap: 12px; padding: 16px; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.stat-icon { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 12px; font-size: 24px; }
.stat-icon.total { background: #e0f2fe; }
.stat-icon.pending { background: #fef3c7; }
.stat-icon.in-progress { background: #ede9fe; }
.stat-icon.delivered { background: #d1fae5; }
.stat-content { flex: 1; }
.stat-value { font-size: 24px; font-weight: 700; color: #1f2937; }
.stat-label { font-size: 13px; color: #6b7280; }
.status-tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.status-tab { padding: 8px 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 20px; font-size: 14px; cursor: pointer; transition: all 0.2s; }
.status-tab:hover { border-color: #00a86b; }
.status-tab.active { background: #00a86b; color: #fff; border-color: #00a86b; }
.table-container { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.loading-state { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.skeleton { height: 56px; background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
.data-table td { padding: 14px 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
.data-table tbody tr { cursor: pointer; transition: background 0.15s; }
.data-table tbody tr:hover { background: #f9fafb; }
.tracking-id { background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-family: monospace; }
.person-cell .person-name { font-weight: 500; color: #1f2937; }
.person-cell .person-phone { font-size: 12px; color: #6b7280; }
.provider-cell .provider-name { font-weight: 500; color: #1f2937; }
.package-badge { display: inline-block; padding: 4px 10px; background: #f3f4f6; color: #374151; border-radius: 16px; font-size: 12px; font-weight: 500; }
.status-badge { display: inline-block; padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 500; }
.amount { font-weight: 600; color: #059669; }
.date { color: #6b7280; font-size: 13px; }
.empty-state, .error-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: #9ca3af; text-align: center; }
.empty-icon, .error-icon { font-size: 48px; margin-bottom: 16px; }
.error-state h3 { font-size: 18px; font-weight: 600; color: #1f2937; margin: 0 0 8px 0; }
.error-message { color: #ef4444; font-size: 14px; margin: 0 0 16px 0; padding: 12px 16px; background: #fee2e2; border-radius: 8px; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
.page-btn { padding: 8px 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; font-size: 14px; }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { font-size: 14px; color: #6b7280; }
.btn { padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: #00a86b; color: #fff; }
.btn-primary:hover:not(:disabled) { background: #009960; }
@media (max-width: 768px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .data-table { font-size: 12px; }
  .data-table th, .data-table td { padding: 10px 8px; }
}
</style>
