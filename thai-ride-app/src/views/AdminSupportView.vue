<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useAdmin } from '../composables/useAdmin'
import { useAdminCleanup } from '../composables/useAdminCleanup'

const { fetchSupportTickets, updateTicketStatus } = useAdmin()
const { addCleanup } = useAdminCleanup()

const tickets = ref<any[]>([])
const total = ref(0)
const loading = ref(true)
const statusFilter = ref('')
const priorityFilter = ref('')
const selectedTicket = ref<any>(null)
const resolution = ref('')

const loadTickets = async () => {
  loading.value = true
  const result = await fetchSupportTickets(1, 100, { status: statusFilter.value || undefined, priority: priorityFilter.value || undefined })
  tickets.value = result.data
  total.value = result.total
  loading.value = false
}

onMounted(loadTickets)

// Cleanup on unmount
addCleanup(() => {
  tickets.value = []
  total.value = 0
  statusFilter.value = ''
  priorityFilter.value = ''
  selectedTicket.value = null
  resolution.value = ''
  console.log('[AdminSupportView] Cleanup complete')
})

const handleResolve = async () => {
  if (!selectedTicket.value) return
  await updateTicketStatus(selectedTicket.value.id, 'resolved', resolution.value)
  selectedTicket.value = null
  resolution.value = ''
  loadTickets()
}

const getStatusColor = (s: string) => ({ open: '#e11900', in_progress: '#ffc043', resolved: '#05944f', closed: '#6b6b6b' }[s] || '#6b6b6b')
const getStatusText = (s: string) => ({ open: 'เปิด', in_progress: 'กำลังดำเนินการ', resolved: 'แก้ไขแล้ว', closed: 'ปิด' }[s] || s)
const getPriorityColor = (p: string) => ({ urgent: '#e11900', high: '#f57c00', normal: '#276ef1', low: '#6b6b6b' }[p] || '#6b6b6b')
const getPriorityText = (p: string) => ({ urgent: 'เร่งด่วน', high: 'สูง', normal: 'ปกติ', low: 'ต่ำ' }[p] || p)
const formatDate = (d: string) => new Date(d).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
</script>

<template>
  <AdminLayout>
    <div class="admin-page">
      <div class="page-header">
        <h1>ซัพพอร์ต</h1>
        <p class="subtitle">{{ total }} รายการ</p>
      </div>

      <div class="filters">
        <select v-model="statusFilter" @change="loadTickets" class="filter-select">
          <option value="">ทุกสถานะ</option>
          <option value="open">เปิด</option>
          <option value="in_progress">กำลังดำเนินการ</option>
          <option value="resolved">แก้ไขแล้ว</option>
        </select>
        <select v-model="priorityFilter" @change="loadTickets" class="filter-select">
          <option value="">ทุกความสำคัญ</option>
          <option value="urgent">เร่งด่วน</option>
          <option value="high">สูง</option>
          <option value="normal">ปกติ</option>
          <option value="low">ต่ำ</option>
        </select>
      </div>

      <div v-if="loading" class="loading-state"><div class="spinner"></div></div>

      <div v-else class="tickets-list">
        <div v-for="t in tickets" :key="t.id" class="ticket-card" @click="selectedTicket = t">
          <div class="ticket-header">
            <span class="ticket-id">{{ t.tracking_id }}</span>
            <span class="ticket-priority" :style="{ color: getPriorityColor(t.priority) }">{{ getPriorityText(t.priority) }}</span>
          </div>
          <h3 class="ticket-subject">{{ t.subject }}</h3>
          <p class="ticket-user">{{ t.users?.name || 'ไม่ระบุ' }}</p>
          <div class="ticket-footer">
            <span class="ticket-status" :style="{ color: getStatusColor(t.status), background: getStatusColor(t.status) + '15' }">
              {{ getStatusText(t.status) }}
            </span>
            <span class="ticket-date">{{ formatDate(t.created_at) }}</span>
          </div>
        </div>
      </div>

      <!-- Ticket Detail Modal -->
      <div v-if="selectedTicket" class="modal-overlay" @click.self="selectedTicket = null">
        <div class="modal-content">
          <div class="modal-header">
            <h2>รายละเอียด Ticket</h2>
            <button class="close-btn" @click="selectedTicket = null">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="detail-id">{{ selectedTicket.tracking_id }}</p>
            <h3 class="detail-subject">{{ selectedTicket.subject }}</h3>
            <p class="detail-desc">{{ selectedTicket.description || 'ไม่มีรายละเอียดเพิ่มเติม' }}</p>
            <div class="detail-meta">
              <span>หมวดหมู่: {{ selectedTicket.category }}</span>
              <span>ความสำคัญ: {{ getPriorityText(selectedTicket.priority) }}</span>
            </div>
            <div v-if="selectedTicket.status !== 'resolved'" class="resolve-form">
              <label class="form-label">วิธีแก้ไข</label>
              <textarea v-model="resolution" class="form-textarea" placeholder="อธิบายวิธีแก้ไขปัญหา..."></textarea>
              <button class="btn-resolve" @click="handleResolve">แก้ไขแล้ว</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.admin-page { padding: 20px; max-width: 900px; margin: 0 auto; }
.page-header { margin-bottom: 20px; }
.page-header h1 { font-size: 24px; font-weight: 700; }
.subtitle { color: #6b6b6b; font-size: 14px; }

.filters { display: flex; gap: 12px; margin-bottom: 20px; }
.filter-select { padding: 12px 16px; border: 1px solid #e5e5e5; border-radius: 8px; background: #fff; font-size: 14px; }

.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid #e5e5e5; border-top-color: #000; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.tickets-list { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
.ticket-card { background: #fff; border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s; }
.ticket-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-2px); }

.ticket-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.ticket-id { font-family: monospace; font-size: 11px; color: #999; }
.ticket-priority { font-size: 11px; font-weight: 600; }
.ticket-subject { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
.ticket-user { font-size: 13px; color: #6b6b6b; margin-bottom: 12px; }
.ticket-footer { display: flex; justify-content: space-between; align-items: center; }
.ticket-status { font-size: 12px; padding: 4px 10px; border-radius: 20px; font-weight: 500; }
.ticket-date { font-size: 11px; color: #999; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal-content { background: #fff; border-radius: 16px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #e5e5e5; }
.modal-header h2 { font-size: 18px; font-weight: 600; }
.close-btn { width: 40px; height: 40px; border: none; background: none; cursor: pointer; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.close-btn:hover { background: #f6f6f6; }
.modal-body { padding: 20px; }
.detail-id { font-family: monospace; font-size: 12px; color: #999; margin-bottom: 8px; }
.detail-subject { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
.detail-desc { font-size: 14px; color: #545454; margin-bottom: 16px; line-height: 1.6; }
.detail-meta { display: flex; gap: 16px; font-size: 13px; color: #6b6b6b; margin-bottom: 20px; }
.resolve-form { border-top: 1px solid #e5e5e5; padding-top: 20px; }
.form-label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px; }
.form-textarea { width: 100%; min-height: 100px; padding: 12px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 14px; resize: vertical; }
.form-textarea:focus { outline: none; border-color: #000; }
.btn-resolve { width: 100%; padding: 14px; background: #000; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 500; cursor: pointer; margin-top: 12px; }
.btn-resolve:hover { background: #333; }
</style>
