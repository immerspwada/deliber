<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useAdmin } from '../composables/useAdmin'
import { supabase } from '../lib/supabase'

const { fetchProviders } = useAdmin()

const providers = ref<any[]>([])
const total = ref(0)
const loading = ref(true)
const typeFilter = ref('')
const statusFilter = ref('')

// Modal state
const showDetailModal = ref(false)
const showRejectModal = ref(false)
const showImageModal = ref(false)
const selectedProvider = ref<any>(null)
const rejectionReason = ref('')
const actionLoading = ref(false)
const previewImage = ref({ src: '', title: '' })

const loadProviders = async () => {
  loading.value = true
  const result = await fetchProviders(1, 50, { type: typeFilter.value || undefined, status: statusFilter.value || undefined })
  providers.value = result.data
  total.value = result.total
  loading.value = false
}

onMounted(loadProviders)

// View provider details
const viewDetails = (provider: any) => {
  selectedProvider.value = provider
  showDetailModal.value = true
}

// Send notification to provider
const sendProviderNotification = async (userId: string, type: 'approved' | 'rejected' | 'suspended', reason?: string) => {
  const notifications = {
    approved: {
      title: 'ยินดีด้วย! ใบสมัครได้รับการอนุมัติ',
      message: 'คุณสามารถเริ่มรับงานได้แล้ว เปิดสถานะออนไลน์เพื่อเริ่มต้น'
    },
    rejected: {
      title: 'ใบสมัครไม่ผ่านการอนุมัติ',
      message: reason || 'กรุณาตรวจสอบข้อมูลและสมัครใหม่อีกครั้ง'
    },
    suspended: {
      title: 'บัญชีถูกระงับชั่วคราว',
      message: 'กรุณาติดต่อฝ่ายสนับสนุนเพื่อขอข้อมูลเพิ่มเติม'
    }
  }

  const notif = notifications[type]
  
  await (supabase.from('user_notifications') as any).insert({
    user_id: userId,
    type: 'system',
    title: notif.title,
    message: notif.message,
    action_url: '/provider',
    is_read: false
  })
}

// Approve provider
const approveProvider = async (id: string) => {
  const provider = providers.value.find(p => p.id === id) || selectedProvider.value
  actionLoading.value = true
  
  await (supabase
    .from('service_providers') as any)
    .update({ status: 'approved', is_verified: true })
    .eq('id', id)
  
  // Send notification
  if (provider?.user_id) {
    await sendProviderNotification(provider.user_id, 'approved')
  }
  
  actionLoading.value = false
  showDetailModal.value = false
  loadProviders()
}

// Open reject modal
const openRejectModal = (provider: any) => {
  selectedProvider.value = provider
  rejectionReason.value = ''
  showRejectModal.value = true
}

// Reject provider
const rejectProvider = async () => {
  if (!selectedProvider.value || !rejectionReason.value.trim()) return
  actionLoading.value = true
  
  await (supabase
    .from('service_providers') as any)
    .update({ 
      status: 'rejected', 
      is_verified: false,
      rejection_reason: rejectionReason.value 
    })
    .eq('id', selectedProvider.value.id)
  
  // Send notification
  if (selectedProvider.value?.user_id) {
    await sendProviderNotification(selectedProvider.value.user_id, 'rejected', rejectionReason.value)
  }
  
  actionLoading.value = false
  showRejectModal.value = false
  showDetailModal.value = false
  loadProviders()
}

// Suspend provider
const suspendProvider = async (id: string) => {
  const provider = providers.value.find(p => p.id === id)
  actionLoading.value = true
  
  await (supabase
    .from('service_providers') as any)
    .update({ status: 'suspended', is_available: false })
    .eq('id', id)
  
  // Send notification
  if (provider?.user_id) {
    await sendProviderNotification(provider.user_id, 'suspended')
  }
  
  actionLoading.value = false
  loadProviders()
}

// Reactivate provider
const reactivateProvider = async (id: string) => {
  actionLoading.value = true
  await (supabase
    .from('service_providers') as any)
    .update({ status: 'approved', is_verified: true })
    .eq('id', id)
  actionLoading.value = false
  loadProviders()
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: '#ffc043',
    approved: '#05944f',
    rejected: '#e11900',
    suspended: '#6b6b6b'
  }
  return colors[status] || '#6b6b6b'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    pending: 'รอตรวจสอบ',
    approved: 'อนุมัติแล้ว',
    rejected: 'ไม่อนุมัติ',
    suspended: 'ถูกระงับ'
  }
  return texts[status] || status
}

const getTypeText = (t: string) => ({ driver: 'คนขับ', rider: 'ไรเดอร์', delivery: 'ส่งของ', both: 'ทั้งสอง' }[t] || t)

// Open image preview modal
const openImagePreview = (src: string, title: string) => {
  previewImage.value = { src, title }
  showImageModal.value = true
}
</script>

<template>
  <AdminLayout>
    <div class="admin-page">
      <div class="page-header">
        <h1>จัดการผู้ให้บริการ</h1>
        <p class="subtitle">{{ total }} ผู้ให้บริการทั้งหมด</p>
      </div>

      <div class="filters">
        <select v-model="typeFilter" @change="loadProviders" class="filter-select">
          <option value="">ทุกประเภท</option>
          <option value="driver">คนขับ</option>
          <option value="delivery">ส่งของ</option>
          <option value="shopper">ซื้อของ</option>
        </select>
        <select v-model="statusFilter" @change="loadProviders" class="filter-select">
          <option value="">ทุกสถานะ</option>
          <option value="pending">รอตรวจสอบ</option>
          <option value="approved">อนุมัติแล้ว</option>
          <option value="rejected">ไม่อนุมัติ</option>
          <option value="suspended">ถูกระงับ</option>
        </select>
      </div>

      <div v-if="loading" class="loading-state"><div class="spinner"></div></div>

      <div v-else class="providers-list">
        <div v-for="p in providers" :key="p.id" class="provider-card">
          <div class="provider-header">
            <div class="provider-avatar">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 17h14v-5H5v5zM19 12l-2-6H7L5 12"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
              </svg>
            </div>
            <div class="provider-info">
              <span class="provider-name">{{ p.users?.name }}</span>
              <span class="provider-email">{{ p.users?.email }}</span>
            </div>
            <span class="provider-type">{{ getTypeText(p.provider_type) }}</span>
          </div>

          <div class="provider-details">
            <div class="detail-item">
              <span class="detail-label">ยานพาหนะ</span>
              <span class="detail-value">{{ p.vehicle_type || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">ทะเบียน</span>
              <span class="detail-value">{{ p.vehicle_plate || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">คะแนน</span>
              <span class="detail-value">{{ p.rating?.toFixed(1) || '0.0' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">เที่ยว</span>
              <span class="detail-value">{{ p.total_trips || 0 }}</span>
            </div>
          </div>

          <div class="provider-footer">
            <div class="status-badge" :style="{ color: getStatusColor(p.status || 'pending') }">
              <span class="status-dot" :style="{ background: getStatusColor(p.status || 'pending') }"></span>
              {{ getStatusText(p.status || 'pending') }}
            </div>
            <div class="online-status" :class="{ online: p.is_available }">
              {{ p.is_available ? 'พร้อมรับงาน' : 'ไม่พร้อม' }}
            </div>
            <div class="provider-actions">
              <button class="action-btn view" @click="viewDetails(p)">ดูรายละเอียด</button>
              <button v-if="p.status === 'pending'" class="action-btn approve" @click="approveProvider(p.id)">อนุมัติ</button>
              <button v-if="p.status === 'pending'" class="action-btn reject" @click="openRejectModal(p)">ปฏิเสธ</button>
              <button v-if="p.status === 'approved'" class="action-btn reject" @click="suspendProvider(p.id)">ระงับ</button>
              <button v-if="p.status === 'suspended' || p.status === 'rejected'" class="action-btn approve" @click="reactivateProvider(p.id)">เปิดใช้งาน</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Detail Modal -->
      <div v-if="showDetailModal && selectedProvider" class="modal-overlay" @click.self="showDetailModal = false">
        <div class="modal-content">
          <div class="modal-header">
            <h2>รายละเอียดผู้ให้บริการ</h2>
            <button @click="showDetailModal = false" class="close-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <div class="detail-section">
              <h3>ข้อมูลส่วนตัว</h3>
              <div class="detail-grid">
                <div><span>ชื่อ:</span> {{ selectedProvider.users?.name }}</div>
                <div><span>อีเมล:</span> {{ selectedProvider.users?.email }}</div>
                <div><span>โทร:</span> {{ selectedProvider.users?.phone || '-' }}</div>
                <div><span>ประเภท:</span> {{ getTypeText(selectedProvider.provider_type) }}</div>
              </div>
            </div>

            <div class="detail-section">
              <h3>ข้อมูลยานพาหนะ</h3>
              <div class="detail-grid">
                <div><span>ประเภท:</span> {{ selectedProvider.vehicle_type || '-' }}</div>
                <div><span>ยี่ห้อ:</span> {{ selectedProvider.vehicle_info?.brand || '-' }}</div>
                <div><span>รุ่น:</span> {{ selectedProvider.vehicle_info?.model || '-' }}</div>
                <div><span>ทะเบียน:</span> {{ selectedProvider.vehicle_info?.license_plate || '-' }}</div>
              </div>
            </div>

            <div class="detail-section">
              <h3>ใบอนุญาต</h3>
              <div class="detail-grid">
                <div><span>เลขที่:</span> {{ selectedProvider.license_number || '-' }}</div>
                <div><span>หมดอายุ:</span> {{ selectedProvider.license_expiry || '-' }}</div>
              </div>
            </div>

            <div v-if="selectedProvider.documents" class="detail-section">
              <h3>เอกสาร</h3>
              <div class="documents-grid">
                <div v-if="selectedProvider.documents.id_card" class="doc-item">
                  <span>บัตรประชาชน</span>
                  <img :src="selectedProvider.documents.id_card" alt="ID Card" @click="openImagePreview(selectedProvider.documents.id_card, 'บัตรประชาชน')" />
                </div>
                <div v-if="selectedProvider.documents.license" class="doc-item">
                  <span>ใบขับขี่</span>
                  <img :src="selectedProvider.documents.license" alt="License" @click="openImagePreview(selectedProvider.documents.license, 'ใบขับขี่')" />
                </div>
                <div v-if="selectedProvider.documents.vehicle" class="doc-item">
                  <span>รูปรถ</span>
                  <img :src="selectedProvider.documents.vehicle" alt="Vehicle" @click="openImagePreview(selectedProvider.documents.vehicle, 'รูปรถ')" />
                </div>
              </div>
            </div>

            <div v-if="selectedProvider.rejection_reason" class="rejection-box">
              <span>เหตุผลที่ปฏิเสธ:</span>
              <p>{{ selectedProvider.rejection_reason }}</p>
            </div>
          </div>

          <div class="modal-footer">
            <button v-if="selectedProvider.status === 'pending'" class="action-btn approve" @click="approveProvider(selectedProvider.id)" :disabled="actionLoading">
              อนุมัติ
            </button>
            <button v-if="selectedProvider.status === 'pending'" class="action-btn reject" @click="openRejectModal(selectedProvider)" :disabled="actionLoading">
              ปฏิเสธ
            </button>
            <button @click="showDetailModal = false" class="action-btn secondary">ปิด</button>
          </div>
        </div>
      </div>

      <!-- Reject Modal -->
      <div v-if="showRejectModal" class="modal-overlay" @click.self="showRejectModal = false">
        <div class="modal-content small">
          <div class="modal-header">
            <h2>ปฏิเสธใบสมัคร</h2>
            <button @click="showRejectModal = false" class="close-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <label class="form-label">เหตุผลที่ปฏิเสธ</label>
            <textarea v-model="rejectionReason" placeholder="กรุณาระบุเหตุผล..." class="form-textarea"></textarea>
          </div>
          <div class="modal-footer">
            <button @click="rejectProvider" :disabled="!rejectionReason.trim() || actionLoading" class="action-btn reject">
              {{ actionLoading ? 'กำลังดำเนินการ...' : 'ยืนยันปฏิเสธ' }}
            </button>
            <button @click="showRejectModal = false" class="action-btn secondary">ยกเลิก</button>
          </div>
        </div>
      </div>

      <!-- Image Preview Modal -->
      <div v-if="showImageModal" class="image-modal-overlay" @click="showImageModal = false">
        <div class="image-modal-content" @click.stop>
          <div class="image-modal-header">
            <h3>{{ previewImage.title }}</h3>
            <button @click="showImageModal = false" class="close-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="image-modal-body">
            <img :src="previewImage.src" :alt="previewImage.title" />
          </div>
          <div class="image-modal-footer">
            <a :href="previewImage.src" download class="action-btn secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              ดาวน์โหลด
            </a>
            <button @click="showImageModal = false" class="action-btn secondary">ปิด</button>
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

.providers-list { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }

.provider-card { background: #fff; border-radius: 12px; padding: 16px; transition: box-shadow 0.2s; }
.provider-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }

.provider-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.provider-avatar { width: 48px; height: 48px; border-radius: 12px; background: #f6f6f6; display: flex; align-items: center; justify-content: center; color: #000; }
.provider-info { flex: 1; }
.provider-name { display: block; font-weight: 600; font-size: 15px; }
.provider-email { display: block; font-size: 11px; color: #999; }
.provider-type { font-size: 12px; padding: 4px 10px; background: #f6f6f6; border-radius: 20px; font-weight: 500; }

.provider-details { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 12px 0; border-top: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0; }
.detail-item { }
.detail-label { display: block; font-size: 11px; color: #999; }
.detail-value { font-size: 14px; font-weight: 500; }

.provider-footer { display: flex; align-items: center; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
.status-badge { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.online-status { font-size: 12px; color: #999; }
.online-status.online { color: #05944f; }

.provider-actions { display: flex; gap: 8px; margin-left: auto; }
.action-btn { padding: 8px 16px; border-radius: 6px; border: none; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.action-btn.view { background: #f6f6f6; color: #000; }
.action-btn.view:hover { background: #e5e5e5; }
.action-btn.approve { background: #000; color: #fff; }
.action-btn.approve:hover { background: #333; }
.action-btn.reject { background: #f6f6f6; color: #e11900; }
.action-btn.reject:hover { background: #ffebee; }
.action-btn.secondary { background: #f6f6f6; color: #000; }
.action-btn.secondary:hover { background: #e5e5e5; }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
.modal-content { background: #fff; border-radius: 16px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
.modal-content.small { max-width: 400px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px; border-bottom: 1px solid #e5e5e5; }
.modal-header h2 { font-size: 18px; font-weight: 600; }
.close-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; }
.close-btn svg { width: 20px; height: 20px; }
.modal-body { padding: 20px; }
.modal-footer { display: flex; gap: 12px; padding: 20px; border-top: 1px solid #e5e5e5; }

.detail-section { margin-bottom: 20px; }
.detail-section h3 { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #6b6b6b; }
.detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.detail-grid div { font-size: 14px; }
.detail-grid span { color: #6b6b6b; }

.documents-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.doc-item { text-align: center; }
.doc-item span { display: block; font-size: 12px; color: #6b6b6b; margin-bottom: 8px; }
.doc-item img { width: 100%; height: 80px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 1px solid #e5e5e5; }
.doc-item img:hover { border-color: #000; }

.rejection-box { padding: 12px; background: rgba(225,25,0,0.05); border-radius: 8px; margin-top: 16px; }
.rejection-box span { font-size: 12px; color: #e11900; font-weight: 600; }
.rejection-box p { font-size: 14px; margin-top: 4px; }

.form-label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 8px; }
.form-textarea { width: 100%; min-height: 100px; padding: 12px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 14px; resize: vertical; }
.form-textarea:focus { outline: none; border-color: #000; }

/* Image Preview Modal */
.image-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 16px; }
.image-modal-content { background: #fff; border-radius: 16px; width: 100%; max-width: 800px; max-height: 90vh; display: flex; flex-direction: column; }
.image-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #e5e5e5; }
.image-modal-header h3 { font-size: 16px; font-weight: 600; }
.image-modal-body { flex: 1; overflow: auto; padding: 20px; display: flex; align-items: center; justify-content: center; background: #f6f6f6; }
.image-modal-body img { max-width: 100%; max-height: 60vh; object-fit: contain; border-radius: 8px; }
.image-modal-footer { display: flex; gap: 12px; padding: 16px 20px; border-top: 1px solid #e5e5e5; justify-content: flex-end; }
.image-modal-footer a { display: flex; align-items: center; gap: 6px; text-decoration: none; }
</style>
