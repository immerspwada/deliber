<!--
  ProviderJobLayout - Parent layout for step-based job views
  
  URL Structure:
  - /provider/job/:id          → Auto-redirect to current step
  - /provider/job/:id/matched  → Step 1: กำลังไปรับ
  - /provider/job/:id/pickup   → Step 2: ถึงจุดรับ
  - /provider/job/:id/in-progress → Step 3: กำลังเดินทาง
  - /provider/job/:id/completed → Step 4: เสร็จสิ้น
-->
<script setup lang="ts">
import { ref, computed, watch, onMounted, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProviderJobDetail } from '@/composables/useProviderJobDetail'

// Lazy load step views
const JobMatchedView = defineAsyncComponent(() => import('./JobMatchedViewClean.vue'))
const JobPickupView = defineAsyncComponent(() => import('./JobPickupViewClean.vue'))
const JobInProgressView = defineAsyncComponent(() => import('./JobInProgressViewClean.vue'))
const JobCompletedView = defineAsyncComponent(() => import('./JobCompletedView.vue'))
const ChatDrawer = defineAsyncComponent(() => import('@/components/ChatDrawer.vue'))

const route = useRoute()
const router = useRouter()

// Job management
const {
  job,
  loading,
  updating,
  error,
  loadJob,
  updateStatus,
  cancelJob,
  handlePhotoUploaded
} = useProviderJobDetail({ enableRealtime: true })

// Local state
const showCancelModal = ref(false)
const showChatDrawer = ref(false)
const cancelReason = ref('')
const actionError = ref<string | null>(null)
const actionSuccess = ref<string | null>(null)

// Computed
const jobId = computed(() => route.params.id as string)
const currentStep = computed(() => route.params.step as string | undefined)

// Status to URL step mapping
const STATUS_TO_STEP: Record<string, string> = {
  'pending': 'pending',
  'confirmed': 'matched',
  'matched': 'matched',
  'pickup': 'pickup',
  'shopping': 'pickup',      // Shopping: use pickup view for shopping phase
  'in_progress': 'in-progress',
  'delivering': 'in-progress', // Shopping: use in-progress view for delivering phase
  'completed': 'completed',
  'cancelled': 'cancelled'
}

// Sync URL with job status (only when needed)
function syncURLWithStatus(): void {
  if (!job.value) return
  
  const expectedStep = STATUS_TO_STEP[job.value.status]
  const currentUrlStep = currentStep.value
  
  // Only update if different to prevent loops
  if (expectedStep && currentUrlStep !== expectedStep) {
    console.log('[JobLayout] Syncing URL:', { from: currentUrlStep, to: expectedStep })
    router.replace({
      name: 'ProviderJobStep',
      params: { id: jobId.value, step: expectedStep }
    }).catch(() => {})
  }
}

// Watch for job status changes
watch(() => job.value?.status, (newStatus, oldStatus) => {
  if (newStatus && newStatus !== oldStatus) {
    console.log('[JobLayout] Status changed:', { from: oldStatus, to: newStatus })
    syncURLWithStatus()
  }
}, { immediate: false })

// Clear messages after delay
function clearMessages(): void {
  setTimeout(() => {
    actionError.value = null
    actionSuccess.value = null
  }, 4000)
}

// Methods
async function handleUpdateStatus(): Promise<void> {
  actionError.value = null
  actionSuccess.value = null
  
  console.log('[JobLayout] Updating status...')
  const result = await updateStatus()
  
  if (result.success) {
    actionSuccess.value = getSuccessMessage(result.newStatus)
    console.log('[JobLayout] Status update success:', result.newStatus)
    // URL will be synced by watcher when job.status changes
  } else {
    actionError.value = result.error || 'ไม่สามารถอัพเดทสถานะได้ กรุณาลองใหม่'
    console.error('[JobLayout] Status update failed:', result.error)
  }
  
  clearMessages()
}

function getSuccessMessage(status?: string): string {
  switch (status) {
    case 'pickup': return '✅ ถึงจุดรับแล้ว'
    case 'in_progress': return '✅ รับลูกค้าแล้ว กำลังเดินทาง'
    case 'completed': return '🎉 งานเสร็จสิ้น!'
    default: return '✅ อัพเดทสำเร็จ'
  }
}

async function handleCancelJob(): Promise<void> {
  actionError.value = null
  
  const result = await cancelJob(cancelReason.value)
  if (result.success) {
    showCancelModal.value = false
    router.push('/provider/orders')
  } else {
    actionError.value = result.error || 'ไม่สามารถยกเลิกงานได้'
  }
}

function callCustomer(): void {
  if (job.value?.customer?.phone) {
    window.location.href = `tel:${job.value.customer.phone}`
  } else {
    actionError.value = 'ไม่พบเบอร์โทรลูกค้า'
    clearMessages()
  }
}

// Lifecycle
onMounted(async () => {
  console.log('[JobLayout] Mounted, loading job:', jobId.value)
  if (jobId.value) {
    // Force refresh if coming from accept (has refresh query param)
    const forceRefresh = !!route.query.refresh
    if (forceRefresh) {
      console.log('[JobLayout] Force refresh requested')
    }
    await loadJob(jobId.value, forceRefresh)
    // Sync URL after initial load
    if (job.value) {
      syncURLWithStatus()
    }
  }
})
</script>

<template>
  <div class="job-layout">
    <!-- Toast Messages -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="actionSuccess" class="toast toast-success">
          {{ actionSuccess }}
        </div>
      </Transition>
      <Transition name="toast">
        <div v-if="actionError" class="toast toast-error">
          ⚠️ {{ actionError }}
        </div>
      </Transition>
    </Teleport>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูลงาน...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <h2>เกิดข้อผิดพลาด</h2>
      <p>{{ error }}</p>
      <button class="btn-retry" type="button" @click="loadJob(jobId)">
        ลองใหม่
      </button>
      <button class="btn-back" type="button" @click="router.push('/provider/orders')">
        กลับหน้างาน
      </button>
    </div>

    <!-- Job Content -->
    <template v-else-if="job">
      <!-- Pending State (Queue Booking) -->
      <div v-if="job.status === 'pending'" class="pending-state">
        <div class="pending-icon">⏳</div>
        <h2>รอรับงาน</h2>
        <p>งานนี้ยังไม่ได้รับ กรุณารับงานก่อน</p>
        <div class="job-info">
          <p><strong>ประเภท:</strong> {{ job.type === 'queue' ? 'จองคิว' : job.type }}</p>
          <p v-if="job.tracking_id"><strong>หมายเลข:</strong> {{ job.tracking_id }}</p>
        </div>
        <button class="btn-back" type="button" @click="router.push('/provider/orders')">
          กลับหน้างาน
        </button>
      </div>

      <!-- Step Views -->
      <JobMatchedView
        v-else-if="job.status === 'matched' || job.status === 'confirmed'"
        :job="job"
        :updating="updating"
        @update-status="handleUpdateStatus"
        @cancel="showCancelModal = true"
        @call="callCustomer"
        @chat="showChatDrawer = true"
      />
      
      <JobPickupView
        v-else-if="job.status === 'pickup' || job.status === 'shopping'"
        :job="job"
        :updating="updating"
        @update-status="handleUpdateStatus"
        @cancel="showCancelModal = true"
        @call="callCustomer"
        @chat="showChatDrawer = true"
        @photo-uploaded="handlePhotoUploaded"
      />
      
      <JobInProgressView
        v-else-if="job.status === 'in_progress' || job.status === 'delivering'"
        :job="job"
        :updating="updating"
        @update-status="handleUpdateStatus"
        @cancel="showCancelModal = true"
        @call="callCustomer"
        @chat="showChatDrawer = true"
        @photo-uploaded="handlePhotoUploaded"
      />
      
      <JobCompletedView
        v-else-if="job.status === 'completed'"
        :job="job"
      />
      
      <!-- Cancelled State -->
      <div v-else-if="job.status === 'cancelled'" class="cancelled-state">
        <div class="cancelled-icon">❌</div>
        <h2>งานถูกยกเลิก</h2>
        <p>งานนี้ถูกยกเลิกแล้ว</p>
        <button class="btn-back-home" type="button" @click="router.push('/provider/orders')">
          กลับหน้างาน
        </button>
      </div>

      <!-- Unknown Status -->
      <div v-else class="error-state">
        <div class="error-icon">❓</div>
        <h2>สถานะไม่รู้จัก</h2>
        <p>สถานะ: {{ job.status }}</p>
        <button class="btn-back" type="button" @click="router.push('/provider/orders')">
          กลับหน้างาน
        </button>
      </div>
    </template>

    <!-- Cancel Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCancelModal" class="modal-overlay" @click.self="showCancelModal = false">
          <div class="modal-content">
            <h2>⚠️ ยกเลิกงาน</h2>
            <p>คุณแน่ใจหรือไม่ที่จะยกเลิกงานนี้? การยกเลิกอาจส่งผลต่อคะแนนของคุณ</p>
            <textarea 
              v-model="cancelReason"
              placeholder="เหตุผลในการยกเลิก (ไม่บังคับ)"
              rows="3"
              class="cancel-textarea"
            ></textarea>
            <div class="modal-actions">
              <button class="btn-secondary" type="button" @click="showCancelModal = false">
                ไม่ยกเลิก
              </button>
              <button :disabled="updating" class="btn-danger" type="button" @click="handleCancelJob">
                <span v-if="updating" class="spinner-small"></span>
                <span v-else>ยืนยันยกเลิก</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Chat Drawer -->
    <ChatDrawer
      v-if="showChatDrawer && job"
      :ride-id="job.id"
      :booking-type="job.type === 'queue' ? 'queue' : job.type === 'shopping' ? 'shopping' : 'ride'"
      :other-user-name="job.customer?.name || 'ลูกค้า'"
      :is-open="showChatDrawer"
      @close="showChatDrawer = false"
    />
  </div>
</template>

<style scoped>
.job-layout { min-height: 100vh; background: #F5F5F5; }

/* Toast Messages */
.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 14px 24px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 90%;
  text-align: center;
}

.toast-success {
  background: #00A86B;
  color: #fff;
}

.toast-error {
  background: #FEF2F2;
  color: #DC2626;
  border: 1px solid #FECACA;
}

.toast-enter-active, .toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

/* Loading & Error States */
.loading-state, .error-state, .cancelled-state, .pending-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  text-align: center;
}

.spinner {
  width: 48px; height: 48px;
  border: 4px solid #E5E7EB;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.loading-state p { margin-top: 16px; font-size: 15px; color: #6B7280; font-weight: 500; }

.error-icon, .cancelled-icon, .pending-icon { font-size: 72px; margin-bottom: 16px; }

.error-state h2, .cancelled-state h2, .pending-state h2 {
  font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 8px 0;
}

.error-state p, .cancelled-state p, .pending-state p {
  font-size: 15px; color: #6B7280; margin: 0 0 24px 0; max-width: 300px; line-height: 1.5;
}

.pending-state .job-info {
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  text-align: left;
  max-width: 300px;
  width: 100%;
}

.pending-state .job-info p {
  margin: 8px 0;
  font-size: 14px;
  color: #374151;
}

.pending-state .job-info strong {
  color: #111827;
  font-weight: 600;
}

.btn-retry, .btn-back-home {
  padding: 14px 32px;
  background: #00A86B; color: #fff;
  border: none; border-radius: 12px;
  font-size: 16px; font-weight: 600; cursor: pointer;
  min-height: 48px;
}

.btn-back {
  margin-top: 12px;
  padding: 12px 24px;
  background: transparent; color: #6B7280;
  border: 1px solid #E5E7EB; border-radius: 12px;
  font-size: 14px; font-weight: 500; cursor: pointer;
}

/* Modal */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 100;
}

.modal-content {
  width: 100%; max-width: 500px;
  background: #fff; border-radius: 24px 24px 0 0; padding: 24px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.modal-content h2 { font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 8px 0; }
.modal-content p { font-size: 14px; color: #6B7280; margin: 0 0 16px 0; line-height: 1.5; }

.cancel-textarea {
  width: 100%; padding: 14px;
  border: 1px solid #E5E7EB; border-radius: 12px;
  font-size: 15px; resize: none; margin-bottom: 16px; font-family: inherit;
}

.cancel-textarea:focus { outline: none; border-color: #00A86B; }

.modal-actions { display: flex; gap: 12px; }
.modal-actions button { flex: 1; }

.btn-secondary {
  padding: 14px; background: #fff; color: #111827;
  border: 1px solid #E5E7EB; border-radius: 12px;
  font-size: 15px; font-weight: 600; cursor: pointer; min-height: 48px;
}

.btn-danger {
  padding: 14px; background: #EF4444; color: #fff;
  border: none; border-radius: 12px;
  font-size: 15px; font-weight: 700; cursor: pointer; min-height: 48px;
  display: flex; align-items: center; justify-content: center;
}

.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

.spinner-small {
  width: 18px; height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* Modal Transition */
.modal-enter-active, .modal-leave-active { transition: opacity 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .modal-content, .modal-leave-active .modal-content {
  transition: transform 0.3s ease;
}
.modal-enter-from .modal-content, .modal-leave-to .modal-content {
  transform: translateY(100%);
}
</style>
