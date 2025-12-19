<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useProviderVerification } from '../composables/useProviderVerification'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const {
  loading,
  queue,
  queueStats,
  currentItem,
  checklist,
  checklistResults,
  checklistComplete,
  verificationScore,
  fetchQueue,
  fetchQueueStats,
  startVerification,
  completeVerification,
  toggleChecklistItem,
  checkAllItems
} = useProviderVerification()

const activeTab = ref<'pending' | 'in_review' | 'completed'>('pending')
const showVerificationModal = ref(false)
const verificationNotes = ref('')
const actionLoading = ref(false)

const filteredQueue = computed(() => {
  return queue.value.filter(item => {
    if (activeTab.value === 'pending') return item.status === 'pending'
    if (activeTab.value === 'in_review') return item.status === 'in_review'
    return item.status === 'completed'
  })
})

onMounted(async () => {
  await Promise.all([fetchQueue(), fetchQueueStats()])
})

const handleStartVerification = async (item: any) => {
  actionLoading.value = true
  const result = await startVerification(item.id, auth.user?.id || '')
  if (result.success) {
    showVerificationModal.value = true
  }
  actionLoading.value = false
}

const handleApprove = async () => {
  if (!currentItem.value || !checklistComplete.value) return
  actionLoading.value = true
  await completeVerification(currentItem.value.id, 'approved', verificationNotes.value)
  showVerificationModal.value = false
  verificationNotes.value = ''
  actionLoading.value = false
}

const handleReject = async () => {
  if (!currentItem.value || !verificationNotes.value.trim()) {
    alert('กรุณาระบุเหตุผลที่ปฏิเสธ')
    return
  }
  actionLoading.value = true
  await completeVerification(currentItem.value.id, 'rejected', verificationNotes.value)
  showVerificationModal.value = false
  verificationNotes.value = ''
  actionLoading.value = false
}

const handleNeedsRevision = async () => {
  if (!currentItem.value || !verificationNotes.value.trim()) {
    alert('กรุณาระบุสิ่งที่ต้องแก้ไข')
    return
  }
  actionLoading.value = true
  await completeVerification(currentItem.value.id, 'needs_revision', verificationNotes.value)
  showVerificationModal.value = false
  verificationNotes.value = ''
  actionLoading.value = false
}

const getDocTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    id_card: 'บัตรประชาชน',
    license: 'ใบขับขี่',
    vehicle: 'รูปยานพาหนะ'
  }
  return labels[type] || type
}

const getDocStatus = (docs: any, type: string) => {
  if (!docs) return 'pending'
  return docs[type] || 'pending'
}

const formatTime = (time: string | null) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('th-TH')
}
</script>

<template>
  <AdminLayout>
    <div class="verification-queue-page">
      <div class="page-header">
        <h1>คิวตรวจสอบผู้ให้บริการ</h1>
        <p class="subtitle">จัดการและตรวจสอบใบสมัครผู้ให้บริการ</p>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid" v-if="queueStats">
        <div class="stat-card pending">
          <div class="stat-value">{{ queueStats.pending_count }}</div>
          <div class="stat-label">รอตรวจสอบ</div>
        </div>
        <div class="stat-card in-review">
          <div class="stat-value">{{ queueStats.in_review_count }}</div>
          <div class="stat-label">กำลังตรวจสอบ</div>
        </div>
        <div class="stat-card completed">
          <div class="stat-value">{{ queueStats.completed_today }}</div>
          <div class="stat-label">เสร็จวันนี้</div>
        </div>
        <div class="stat-card time">
          <div class="stat-value">{{ queueStats.avg_review_time?.split(':')[1] || '25' }} นาที</div>
          <div class="stat-label">เวลาเฉลี่ย</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button 
          :class="['tab', { active: activeTab === 'pending' }]"
          @click="activeTab = 'pending'"
        >
          รอตรวจสอบ
          <span class="badge" v-if="queueStats?.pending_count">{{ queueStats.pending_count }}</span>
        </button>
        <button 
          :class="['tab', { active: activeTab === 'in_review' }]"
          @click="activeTab = 'in_review'"
        >
          กำลังตรวจสอบ
          <span class="badge" v-if="queueStats?.in_review_count">{{ queueStats.in_review_count }}</span>
        </button>
        <button 
          :class="['tab', { active: activeTab === 'completed' }]"
          @click="activeTab = 'completed'"
        >
          เสร็จสิ้น
        </button>
      </div>

      <!-- Queue List -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>

      <div v-else-if="filteredQueue.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p>ไม่มีรายการในคิว</p>
      </div>

      <div v-else class="queue-list">
        <div v-for="item in filteredQueue" :key="item.id" class="queue-card">
          <div class="queue-header">
            <div class="provider-info">
              <div class="avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div>
                <h3>{{ item.provider?.users?.name || 'ไม่ระบุชื่อ' }}</h3>
                <p>{{ item.provider?.users?.email }}</p>
              </div>
            </div>
            <div class="queue-meta">
              <span class="queue-position">#{{ item.queue_position }}</span>
              <span :class="['status-badge', item.status]">
                {{ item.status === 'pending' ? 'รอตรวจสอบ' : item.status === 'in_review' ? 'กำลังตรวจ' : 'เสร็จสิ้น' }}
              </span>
            </div>
          </div>

          <div class="queue-details">
            <div class="detail-row">
              <span class="label">ประเภท:</span>
              <span>{{ item.provider?.provider_type === 'driver' ? 'คนขับรถ' : 'ไรเดอร์' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">ยานพาหนะ:</span>
              <span>{{ item.provider?.vehicle_type }} {{ item.provider?.vehicle_plate }}</span>
            </div>
            <div class="detail-row">
              <span class="label">ส่งเมื่อ:</span>
              <span>{{ formatTime(item.created_at) }}</span>
            </div>
          </div>

          <!-- Document Status -->
          <div class="documents-status">
            <div 
              v-for="docType in ['id_card', 'license', 'vehicle']" 
              :key="docType"
              :class="['doc-badge', getDocStatus(item.provider?.documents, docType)]"
            >
              {{ getDocTypeLabel(docType) }}
            </div>
          </div>

          <div class="queue-actions">
            <button 
              v-if="item.status === 'pending'"
              class="btn-primary"
              @click="handleStartVerification(item)"
              :disabled="actionLoading"
            >
              เริ่มตรวจสอบ
            </button>
            <button 
              v-if="item.status === 'in_review'"
              class="btn-secondary"
              @click="currentItem = item; showVerificationModal = true"
            >
              ดำเนินการต่อ
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Verification Modal -->
    <div v-if="showVerificationModal && currentItem" class="modal-overlay" @click.self="showVerificationModal = false">
      <div class="modal-content verification-modal">
        <div class="modal-header">
          <h2>ตรวจสอบเอกสาร</h2>
          <button @click="showVerificationModal = false" class="close-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- Provider Info -->
          <div class="provider-summary">
            <h3>{{ currentItem.provider?.users?.name }}</h3>
            <p>{{ currentItem.provider?.provider_type === 'driver' ? 'คนขับรถ' : 'ไรเดอร์' }} - {{ currentItem.provider?.vehicle_type }}</p>
          </div>

          <!-- Checklist -->
          <div class="checklist-section">
            <div class="checklist-header">
              <h4>รายการตรวจสอบ</h4>
              <button class="check-all-btn" @click="checkAllItems">เลือกทั้งหมด</button>
            </div>
            
            <div class="checklist-items">
              <label 
                v-for="item in checklist" 
                :key="item.key"
                class="checklist-item"
              >
                <input 
                  type="checkbox" 
                  :checked="checklistResults[item.key]"
                  @change="toggleChecklistItem(item.key)"
                />
                <span class="checkmark"></span>
                <span class="item-label">
                  {{ item.label }}
                  <span v-if="item.required" class="required">*</span>
                </span>
              </label>
            </div>

            <!-- Score -->
            <div class="verification-score">
              <div class="score-bar">
                <div class="score-fill" :style="{ width: verificationScore + '%' }"></div>
              </div>
              <span class="score-text">{{ verificationScore }}%</span>
            </div>
          </div>

          <!-- Notes -->
          <div class="notes-section">
            <label>หมายเหตุ / เหตุผล</label>
            <textarea 
              v-model="verificationNotes"
              placeholder="ระบุหมายเหตุหรือเหตุผล (จำเป็นสำหรับการปฏิเสธ)"
              rows="3"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button 
            class="btn-reject"
            @click="handleReject"
            :disabled="actionLoading"
          >
            ปฏิเสธ
          </button>
          <button 
            class="btn-revision"
            @click="handleNeedsRevision"
            :disabled="actionLoading"
          >
            ขอแก้ไข
          </button>
          <button 
            class="btn-approve"
            @click="handleApprove"
            :disabled="actionLoading || !checklistComplete"
          >
            อนุมัติ
          </button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>


<style scoped>
.verification-queue-page { padding: 24px; max-width: 1200px; margin: 0 auto; }
.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 24px; font-weight: 700; color: #1A1A1A; margin: 0 0 4px; }
.subtitle { color: #666; margin: 0; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { background: #fff; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #E8E8E8; }
.stat-card.pending { border-left: 4px solid #ffc043; }
.stat-card.in-review { border-left: 4px solid #3b82f6; }
.stat-card.completed { border-left: 4px solid #00A86B; }
.stat-card.time { border-left: 4px solid #8b5cf6; }
.stat-value { font-size: 28px; font-weight: 700; color: #1A1A1A; }
.stat-label { font-size: 14px; color: #666; margin-top: 4px; }

.tabs { display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid #E8E8E8; padding-bottom: 12px; }
.tab { padding: 10px 20px; border: none; background: none; font-size: 14px; font-weight: 500; color: #666; cursor: pointer; border-radius: 8px; display: flex; align-items: center; gap: 8px; }
.tab.active { background: #00A86B; color: #fff; }
.tab .badge { background: rgba(0,0,0,0.1); padding: 2px 8px; border-radius: 10px; font-size: 12px; }
.tab.active .badge { background: rgba(255,255,255,0.2); }

.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 40px; height: 40px; border: 3px solid #E8E8E8; border-top-color: #00A86B; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state { text-align: center; padding: 60px 20px; color: #666; }
.empty-state svg { margin-bottom: 16px; opacity: 0.5; }

.queue-list { display: flex; flex-direction: column; gap: 16px; }
.queue-card { background: #fff; border-radius: 16px; padding: 20px; border: 1px solid #E8E8E8; }
.queue-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.provider-info { display: flex; gap: 12px; align-items: center; }
.avatar { width: 48px; height: 48px; background: #F5F5F5; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.provider-info h3 { margin: 0; font-size: 16px; font-weight: 600; }
.provider-info p { margin: 4px 0 0; font-size: 13px; color: #666; }
.queue-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.queue-position { font-size: 14px; color: #999; }
.status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
.status-badge.pending { background: #FFF3CD; color: #856404; }
.status-badge.in_review { background: #CCE5FF; color: #004085; }
.status-badge.completed { background: #D4EDDA; color: #155724; }

.queue-details { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
.detail-row { font-size: 14px; }
.detail-row .label { color: #999; margin-right: 4px; }

.documents-status { display: flex; gap: 8px; margin-bottom: 16px; }
.doc-badge { padding: 6px 12px; border-radius: 8px; font-size: 12px; }
.doc-badge.pending { background: #FFF3CD; color: #856404; }
.doc-badge.verified { background: #D4EDDA; color: #155724; }
.doc-badge.rejected { background: #F8D7DA; color: #721C24; }

.queue-actions { display: flex; justify-content: flex-end; gap: 12px; }
.btn-primary { background: #00A86B; color: #fff; border: none; padding: 10px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: #F5F5F5; color: #1A1A1A; border: none; padding: 10px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal-content { background: #fff; border-radius: 20px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #E8E8E8; }
.modal-header h2 { margin: 0; font-size: 18px; }
.close-btn { background: none; border: none; cursor: pointer; padding: 4px; }
.modal-body { padding: 24px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 24px; border-top: 1px solid #E8E8E8; }

.provider-summary { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #E8E8E8; }
.provider-summary h3 { margin: 0 0 4px; font-size: 18px; }
.provider-summary p { margin: 0; color: #666; }

.checklist-section { margin-bottom: 24px; }
.checklist-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.checklist-header h4 { margin: 0; font-size: 16px; }
.check-all-btn { background: none; border: 1px solid #00A86B; color: #00A86B; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; }

.checklist-items { display: flex; flex-direction: column; gap: 12px; }
.checklist-item { display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 12px; background: #F9F9F9; border-radius: 10px; }
.checklist-item input { display: none; }
.checkmark { width: 22px; height: 22px; border: 2px solid #E8E8E8; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.checklist-item input:checked + .checkmark { background: #00A86B; border-color: #00A86B; }
.checklist-item input:checked + .checkmark::after { content: '✓'; color: #fff; font-size: 14px; }
.item-label { flex: 1; }
.required { color: #E53935; margin-left: 4px; }

.verification-score { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
.score-bar { flex: 1; height: 8px; background: #E8E8E8; border-radius: 4px; overflow: hidden; }
.score-fill { height: 100%; background: #00A86B; transition: width 0.3s; }
.score-text { font-weight: 600; color: #00A86B; }

.notes-section label { display: block; font-weight: 500; margin-bottom: 8px; }
.notes-section textarea { width: 100%; padding: 12px; border: 1px solid #E8E8E8; border-radius: 10px; resize: vertical; font-family: inherit; }

.btn-reject { background: #E53935; color: #fff; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-revision { background: #ffc043; color: #1A1A1A; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-approve { background: #00A86B; color: #fff; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-approve:disabled, .btn-reject:disabled, .btn-revision:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .queue-details { grid-template-columns: 1fr; }
  .modal-footer { flex-wrap: wrap; }
  .modal-footer button { flex: 1; min-width: 100px; }
}
</style>
