<script setup lang="ts">
/**
 * ProviderProfileNew - หน้า Profile ใหม่
 * Design: Green theme
 * 
 * Features:
 * - Profile header with avatar
 * - Stats display
 * - Settings menu with working modals
 * - Role switcher
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase'
import { useProviderMedia } from '../../composables/useProviderMedia'
import { usePushNotification } from '../../composables/usePushNotification'
import { useDocumentUpload } from '../../composables/useDocumentUpload'
import ProviderMediaUpload from '../../components/provider/ProviderMediaUpload.vue'
import DocumentUpload from '../../components/DocumentUpload.vue'

const router = useRouter()
const { avatarUrl, fetchProviderMedia } = useProviderMedia()
const { isSupported: pushSupported, isSubscribed: pushEnabled, permission: pushPermission, loading: pushLoading, requestPermission, unsubscribe } = usePushNotification()
const { documents, loadDocuments } = useDocumentUpload()

// State
const loading = ref(true)
const showMediaUpload = ref(false)
const showRoleSwitcher = ref(false)
const saving = ref(false)
const saveMessage = ref('')

// Active modal
const activeModal = ref<string | null>(null)

// Provider data with all fields
const provider = ref<{
  id?: string
  first_name?: string
  last_name?: string
  phone_number?: string
  email?: string
  rating?: number
  total_trips?: number
  total_earnings?: number
  status?: string
  vehicle_type?: string
  vehicle_plate?: string
  vehicle_color?: string
  vehicle_info?: Record<string, unknown>
  bank_name?: string
  bank_account_number?: string
  bank_account_name?: string
  national_id?: string
  address?: string
} | null>(null)

// Form data for editing
const personalForm = ref({
  first_name: '',
  last_name: '',
  phone_number: '',
  national_id: '',
  address: ''
})

const vehicleForm = ref({
  vehicle_type: '',
  vehicle_plate: '',
  vehicle_color: '',
  vehicle_brand: '',
  vehicle_model: '',
  vehicle_year: ''
})

const bankForm = ref({
  bank_name: '',
  bank_account_number: '',
  bank_account_name: ''
})

// Bank options
const bankOptions = [
  'ธนาคารกรุงเทพ',
  'ธนาคารกสิกรไทย',
  'ธนาคารกรุงไทย',
  'ธนาคารไทยพาณิชย์',
  'ธนาคารกรุงศรีอยุธยา',
  'ธนาคารทหารไทยธนชาต',
  'ธนาคารออมสิน',
  'ธนาคารเกียรตินาคินภัทร',
  'ธนาคารซีไอเอ็มบี ไทย',
  'ธนาคารยูโอบี'
]

// Vehicle type options
const vehicleTypeOptions = [
  { value: 'car', label: 'รถยนต์' },
  { value: 'motorcycle', label: 'มอเตอร์ไซค์' },
  { value: 'van', label: 'รถตู้' },
  { value: 'pickup', label: 'รถกระบะ' },
  { value: 'truck', label: 'รถบรรทุก' }
]

// Computed
const displayName = computed(() => {
  if (!provider.value) return ''
  return `${provider.value.first_name || ''} ${provider.value.last_name || ''}`.trim()
})

const initials = computed(() => {
  const first = provider.value?.first_name?.charAt(0) || ''
  const last = provider.value?.last_name?.charAt(0) || ''
  return (first + last).toUpperCase() || 'P'
})

const statusInfo = computed(() => {
  const s = provider.value?.status
  const map: Record<string, { text: string; class: string }> = {
    pending: { text: 'รอการอนุมัติ', class: 'pending' },
    approved: { text: 'อนุมัติแล้ว', class: 'success' },
    active: { text: 'ใช้งานอยู่', class: 'success' },
    suspended: { text: 'ถูกระงับ', class: 'error' },
    rejected: { text: 'ถูกปฏิเสธ', class: 'error' }
  }
  return map[s || ''] || { text: s || '', class: '' }
})

// Document count
const documentCount = computed(() => documents.value.length)

// Menu items
const menuItems = [
  { id: 'personal', icon: 'user', label: 'ข้อมูลส่วนตัว', desc: 'ชื่อ เบอร์โทร ที่อยู่' },
  { id: 'vehicle', icon: 'car', label: 'รายละเอียดยานพาหนะ', desc: 'ทะเบียน ยี่ห้อ สี' },
  { id: 'documents', icon: 'file', label: 'เอกสาร', desc: `${documentCount.value} เอกสาร` },
  { id: 'bank', icon: 'bank', label: 'บัญชีธนาคาร', desc: 'สำหรับรับเงิน' },
  { id: 'notifications', icon: 'bell', label: 'การแจ้งเตือน', desc: pushEnabled.value ? 'เปิดอยู่' : 'ปิดอยู่' },
  { id: 'settings', icon: 'settings', label: 'ตั้งค่า', desc: 'ภาษา ความเป็นส่วนตัว' },
  { id: 'help', icon: 'help', label: 'ช่วยเหลือและสนับสนุน', desc: 'FAQ ติดต่อเรา' }
]

// Methods
async function loadData() {
  loading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('providers_v2')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (data) {
      provider.value = data
      await fetchProviderMedia()
      await loadDocuments()
      
      // Initialize forms with current data
      initializeForms(data)
    }
  } catch (err) {
    console.error('[Profile] Error:', err)
  } finally {
    loading.value = false
  }
}

function initializeForms(data: Record<string, unknown>) {
  // Personal form
  personalForm.value = {
    first_name: (data.first_name as string) || '',
    last_name: (data.last_name as string) || '',
    phone_number: (data.phone_number as string) || '',
    national_id: (data.national_id as string) || '',
    address: (data.address as string) || ''
  }
  
  // Vehicle form
  const vehicleInfo = (data.vehicle_info as Record<string, unknown>) || {}
  vehicleForm.value = {
    vehicle_type: (data.vehicle_type as string) || '',
    vehicle_plate: (data.vehicle_plate as string) || '',
    vehicle_color: (data.vehicle_color as string) || '',
    vehicle_brand: (vehicleInfo.brand as string) || '',
    vehicle_model: (vehicleInfo.model as string) || '',
    vehicle_year: (vehicleInfo.year as string) || ''
  }
  
  // Bank form
  bankForm.value = {
    bank_name: (data.bank_name as string) || '',
    bank_account_number: (data.bank_account_number as string) || '',
    bank_account_name: (data.bank_account_name as string) || ''
  }
}

function openModal(id: string) {
  activeModal.value = id
  saveMessage.value = ''
}

function closeModal() {
  activeModal.value = null
  saveMessage.value = ''
}

// Save personal info
async function savePersonalInfo() {
  if (!provider.value?.id) return
  
  saving.value = true
  saveMessage.value = ''
  
  try {
    const { error } = await supabase
      .from('providers_v2')
      .update({
        first_name: personalForm.value.first_name,
        last_name: personalForm.value.last_name,
        phone_number: personalForm.value.phone_number,
        national_id: personalForm.value.national_id,
        address: personalForm.value.address,
        updated_at: new Date().toISOString()
      })
      .eq('id', provider.value.id)
    
    if (error) throw error
    
    // Update local state
    provider.value = {
      ...provider.value,
      ...personalForm.value
    }
    
    saveMessage.value = 'บันทึกสำเร็จ'
    setTimeout(() => closeModal(), 1000)
  } catch (err) {
    console.error('[Profile] Save error:', err)
    saveMessage.value = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  } finally {
    saving.value = false
  }
}

// Save vehicle info
async function saveVehicleInfo() {
  if (!provider.value?.id) return
  
  saving.value = true
  saveMessage.value = ''
  
  try {
    const { error } = await supabase
      .from('providers_v2')
      .update({
        vehicle_type: vehicleForm.value.vehicle_type,
        vehicle_plate: vehicleForm.value.vehicle_plate,
        vehicle_color: vehicleForm.value.vehicle_color,
        vehicle_info: {
          brand: vehicleForm.value.vehicle_brand,
          model: vehicleForm.value.vehicle_model,
          year: vehicleForm.value.vehicle_year
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', provider.value.id)
    
    if (error) throw error
    
    // Update local state
    provider.value = {
      ...provider.value,
      vehicle_type: vehicleForm.value.vehicle_type,
      vehicle_plate: vehicleForm.value.vehicle_plate,
      vehicle_color: vehicleForm.value.vehicle_color,
      vehicle_info: {
        brand: vehicleForm.value.vehicle_brand,
        model: vehicleForm.value.vehicle_model,
        year: vehicleForm.value.vehicle_year
      }
    }
    
    saveMessage.value = 'บันทึกสำเร็จ'
    setTimeout(() => closeModal(), 1000)
  } catch (err) {
    console.error('[Profile] Save error:', err)
    saveMessage.value = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  } finally {
    saving.value = false
  }
}

// Save bank info
async function saveBankInfo() {
  if (!provider.value?.id) return
  
  saving.value = true
  saveMessage.value = ''
  
  try {
    const { error } = await supabase
      .from('providers_v2')
      .update({
        bank_name: bankForm.value.bank_name,
        bank_account_number: bankForm.value.bank_account_number,
        bank_account_name: bankForm.value.bank_account_name,
        updated_at: new Date().toISOString()
      })
      .eq('id', provider.value.id)
    
    if (error) throw error
    
    // Update local state
    provider.value = {
      ...provider.value,
      ...bankForm.value
    }
    
    saveMessage.value = 'บันทึกสำเร็จ'
    setTimeout(() => closeModal(), 1000)
  } catch (err) {
    console.error('[Profile] Save error:', err)
    saveMessage.value = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  } finally {
    saving.value = false
  }
}

// Toggle push notification
async function togglePushNotification() {
  if (pushEnabled.value) {
    await unsubscribe()
  } else {
    await requestPermission()
  }
}

function openMediaUpload() {
  showMediaUpload.value = true
}

function closeMediaUpload() {
  showMediaUpload.value = false
  fetchProviderMedia()
}

function switchToCustomer() {
  showRoleSwitcher.value = false
  router.push('/customer')
}

async function logout() {
  await supabase.auth.signOut()
  router.replace('/login')
}

// Lifecycle
onMounted(loadData)
</script>

<template>
  <div class="profile-page">
    <!-- Header -->
    <header class="header">
      <h1 class="title">โปรไฟล์</h1>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <!-- Content -->
    <main v-else class="content">
      <!-- Profile Card -->
      <div class="profile-card">
        <button class="avatar-btn" @click="openMediaUpload" aria-label="แก้ไขรูปโปรไฟล์">
          <div class="avatar" :class="{ 'has-image': avatarUrl }">
            <img v-if="avatarUrl" :src="avatarUrl" alt="Profile" />
            <span v-else>{{ initials }}</span>
          </div>
          <div class="edit-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
        </button>
        
        <div class="profile-info">
          <h2 class="profile-name">{{ displayName }}</h2>
          <span class="profile-status" :class="statusInfo.class">
            {{ statusInfo.text }}
          </span>
        </div>

        <!-- Stats -->
        <div class="stats-row">
          <div class="stat-item">
            <span class="stat-value">{{ (provider?.rating || 5.0).toFixed(1) }}</span>
            <span class="stat-label">คะแนน</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ provider?.total_trips || 0 }}</span>
            <span class="stat-label">เที่ยว</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">฿{{ (provider?.total_earnings || 0).toLocaleString() }}</span>
            <span class="stat-label">รายได้</span>
          </div>
        </div>
      </div>

      <!-- Menu -->
      <div class="menu-card">
        <button 
          v-for="item in menuItems" 
          :key="item.id"
          class="menu-item"
          @click="openModal(item.id)"
        >
          <div class="menu-icon">
            <svg v-if="item.icon === 'user'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="8" r="4"/>
              <path d="M20 21a8 8 0 10-16 0"/>
            </svg>
            <svg v-else-if="item.icon === 'car'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M5 11l1.5-4.5a2 2 0 011.9-1.5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/>
              <circle cx="7.5" cy="14.5" r="1.5"/>
              <circle cx="16.5" cy="14.5" r="1.5"/>
            </svg>
            <svg v-else-if="item.icon === 'file'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
            </svg>
            <svg v-else-if="item.icon === 'bank'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>
            </svg>
            <svg v-else-if="item.icon === 'bell'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            <svg v-else-if="item.icon === 'settings'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/>
            </svg>
          </div>
          <div class="menu-text">
            <span class="menu-label">{{ item.label }}</span>
            <span class="menu-desc">{{ item.desc }}</span>
          </div>
          <svg class="menu-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      <!-- Switch Mode -->
      <button class="switch-btn" @click="switchToCustomer">
        <div class="switch-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </div>
        <div class="switch-text">
          <span class="switch-label">สลับเป็นโหมดลูกค้า</span>
          <span class="switch-desc">จองรถ สั่งของ</span>
        </div>
        <svg class="switch-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>

      <!-- Logout -->
      <button class="logout-btn" @click="logout">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        ออกจากระบบ
      </button>

      <!-- Version -->
      <p class="version">GOBEAR Partner v2.0.0</p>
    </main>

    <!-- Media Upload Modal -->
    <Teleport to="body">
      <div v-if="showMediaUpload" class="modal-overlay" @click.self="closeMediaUpload">
        <div class="modal-content">
          <div class="modal-header">
            <h3>จัดการรูปภาพ</h3>
            <button class="close-btn" @click="closeMediaUpload" aria-label="ปิด">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <ProviderMediaUpload />
        </div>
      </div>
    </Teleport>

    <!-- Personal Info Modal -->
    <Teleport to="body">
      <div v-if="activeModal === 'personal'" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>ข้อมูลส่วนตัว</h3>
            <button class="close-btn" @click="closeModal" aria-label="ปิด">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="first_name">ชื่อ</label>
              <input id="first_name" v-model="personalForm.first_name" type="text" placeholder="ชื่อจริง" />
            </div>
            <div class="form-group">
              <label for="last_name">นามสกุล</label>
              <input id="last_name" v-model="personalForm.last_name" type="text" placeholder="นามสกุล" />
            </div>
            <div class="form-group">
              <label for="phone_number">เบอร์โทรศัพท์</label>
              <input id="phone_number" v-model="personalForm.phone_number" type="tel" placeholder="0812345678" />
            </div>
            <div class="form-group">
              <label for="national_id">เลขบัตรประชาชน</label>
              <input id="national_id" v-model="personalForm.national_id" type="text" placeholder="1234567890123" maxlength="13" />
            </div>
            <div class="form-group">
              <label for="address">ที่อยู่</label>
              <textarea id="address" v-model="personalForm.address" rows="3" placeholder="ที่อยู่ปัจจุบัน"></textarea>
            </div>
            <p v-if="saveMessage" class="save-message" :class="{ error: saveMessage.includes('ผิดพลาด') }">{{ saveMessage }}</p>
            <button class="save-btn" :disabled="saving" @click="savePersonalInfo">
              {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Vehicle Info Modal -->
    <Teleport to="body">
      <div v-if="activeModal === 'vehicle'" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>รายละเอียดยานพาหนะ</h3>
            <button class="close-btn" @click="closeModal" aria-label="ปิด">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="vehicle_type">ประเภทยานพาหนะ</label>
              <select id="vehicle_type" v-model="vehicleForm.vehicle_type">
                <option value="">เลือกประเภท</option>
                <option v-for="opt in vehicleTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <label for="vehicle_brand">ยี่ห้อ</label>
              <input id="vehicle_brand" v-model="vehicleForm.vehicle_brand" type="text" placeholder="เช่น Toyota, Honda" />
            </div>
            <div class="form-group">
              <label for="vehicle_model">รุ่น</label>
              <input id="vehicle_model" v-model="vehicleForm.vehicle_model" type="text" placeholder="เช่น Vios, City" />
            </div>
            <div class="form-group">
              <label for="vehicle_year">ปี</label>
              <input id="vehicle_year" v-model="vehicleForm.vehicle_year" type="text" placeholder="เช่น 2023" maxlength="4" />
            </div>
            <div class="form-group">
              <label for="vehicle_plate">ทะเบียนรถ</label>
              <input id="vehicle_plate" v-model="vehicleForm.vehicle_plate" type="text" placeholder="เช่น กข 1234" />
            </div>
            <div class="form-group">
              <label for="vehicle_color">สี</label>
              <input id="vehicle_color" v-model="vehicleForm.vehicle_color" type="text" placeholder="เช่น ขาว, ดำ, เงิน" />
            </div>
            <p v-if="saveMessage" class="save-message" :class="{ error: saveMessage.includes('ผิดพลาด') }">{{ saveMessage }}</p>
            <button class="save-btn" :disabled="saving" @click="saveVehicleInfo">
              {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Documents Modal -->
    <Teleport to="body">
      <div v-if="activeModal === 'documents'" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content modal-large">
          <div class="modal-header">
            <h3>เอกสาร</h3>
            <button class="close-btn" @click="closeModal" aria-label="ปิด">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <DocumentUpload @back="closeModal" @complete="closeModal" />
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Bank Account Modal -->
    <Teleport to="body">
      <div v-if="activeModal === 'bank'" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>บัญชีธนาคาร</h3>
            <button class="close-btn" @click="closeModal" aria-label="ปิด">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="info-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
              <p>บัญชีนี้จะใช้สำหรับรับเงินจากการให้บริการ</p>
            </div>
            <div class="form-group">
              <label for="bank_name">ธนาคาร</label>
              <select id="bank_name" v-model="bankForm.bank_name">
                <option value="">เลือกธนาคาร</option>
                <option v-for="bank in bankOptions" :key="bank" :value="bank">{{ bank }}</option>
              </select>
            </div>
            <div class="form-group">
              <label for="bank_account_number">เลขบัญชี</label>
              <input id="bank_account_number" v-model="bankForm.bank_account_number" type="text" placeholder="เลขบัญชี 10-12 หลัก" />
            </div>
            <div class="form-group">
              <label for="bank_account_name">ชื่อบัญชี</label>
              <input id="bank_account_name" v-model="bankForm.bank_account_name" type="text" placeholder="ชื่อ-นามสกุล ตามบัญชี" />
            </div>
            <p v-if="saveMessage" class="save-message" :class="{ error: saveMessage.includes('ผิดพลาด') }">{{ saveMessage }}</p>
            <button class="save-btn" :disabled="saving" @click="saveBankInfo">
              {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Notifications Modal -->
    <Teleport to="body">
      <div v-if="activeModal === 'notifications'" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>การแจ้งเตือน</h3>
            <button class="close-btn" @click="closeModal" aria-label="ปิด">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div v-if="pushSupported" class="notification-setting">
              <div class="notification-info">
                <div class="notification-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 01-3.46 0"/>
                  </svg>
                </div>
                <div class="notification-text">
                  <span class="notification-label">การแจ้งเตือนงานใหม่</span>
                  <span class="notification-desc">
                    {{ pushPermission === 'denied' ? 'ถูกบล็อก - เปิดในการตั้งค่าเบราว์เซอร์' : 
                       pushEnabled ? 'เปิดใช้งานอยู่' : 'ปิดอยู่' }}
                  </span>
                </div>
              </div>
              <button 
                class="toggle-btn"
                :class="{ active: pushEnabled, disabled: pushPermission === 'denied' }"
                :disabled="pushLoading || pushPermission === 'denied'"
                @click="togglePushNotification"
                :aria-label="pushEnabled ? 'ปิดการแจ้งเตือน' : 'เปิดการแจ้งเตือน'"
              >
                <span class="toggle-track">
                  <span class="toggle-thumb"></span>
                </span>
              </button>
            </div>
            <div v-else class="not-supported">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4M12 16h.01"/>
              </svg>
              <p>เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน</p>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Settings Modal -->
    <Teleport to="body">
      <div v-if="activeModal === 'settings'" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>ตั้งค่า</h3>
            <button class="close-btn" @click="closeModal" aria-label="ปิด">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="settings-item">
              <div class="settings-info">
                <span class="settings-label">ภาษา</span>
                <span class="settings-value">ไทย</span>
              </div>
              <svg class="settings-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
            <div class="settings-item">
              <div class="settings-info">
                <span class="settings-label">เวอร์ชัน</span>
                <span class="settings-value">2.0.0</span>
              </div>
            </div>
            <div class="settings-item">
              <div class="settings-info">
                <span class="settings-label">ล้างแคช</span>
                <span class="settings-value">ล้างข้อมูลชั่วคราว</span>
              </div>
              <svg class="settings-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Help Modal -->
    <Teleport to="body">
      <div v-if="activeModal === 'help'" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>ช่วยเหลือและสนับสนุน</h3>
            <button class="close-btn" @click="closeModal" aria-label="ปิด">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="help-section">
              <h4>คำถามที่พบบ่อย</h4>
              <div class="faq-item">
                <span class="faq-q">ฉันจะเริ่มรับงานได้อย่างไร?</span>
                <span class="faq-a">เปิดสถานะ "พร้อมรับงาน" ที่หน้าหลัก แล้วรอรับงานจากระบบ</span>
              </div>
              <div class="faq-item">
                <span class="faq-q">เงินจะเข้าบัญชีเมื่อไหร่?</span>
                <span class="faq-a">เงินจะโอนเข้าบัญชีทุกวันจันทร์ สำหรับงานที่เสร็จสิ้นในสัปดาห์ก่อนหน้า</span>
              </div>
              <div class="faq-item">
                <span class="faq-q">ฉันจะยกเลิกงานได้อย่างไร?</span>
                <span class="faq-a">กดปุ่ม "ยกเลิกงาน" ในหน้ารายละเอียดงาน (อาจมีค่าปรับ)</span>
              </div>
            </div>
            <div class="help-section">
              <h4>ติดต่อเรา</h4>
              <a href="tel:021234567" class="contact-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                </svg>
                <span>02-123-4567</span>
              </a>
              <a href="mailto:support@gobear.app" class="contact-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span>support@gobear.app</span>
              </a>
              <a href="https://line.me/ti/p/@gobear" target="_blank" class="contact-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
                </svg>
                <span>@gobear (LINE)</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #F5F5F5;
}

/* Header */
.header {
  padding: 20px 16px;
  background: #FFFFFF;
  border-bottom: 1px solid #E5E5E5;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

/* Loading */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E5E7EB;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Content */
.content {
  padding: 16px;
}

/* Profile Card */
.profile-card {
  background: #FFFFFF;
  border-radius: 20px;
  padding: 24px;
  text-align: center;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.avatar-btn {
  position: relative;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  margin-bottom: 16px;
}

.avatar {
  width: 80px;
  height: 80px;
  background: #00A86B;
  color: #FFFFFF;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  overflow: hidden;
  transition: transform 0.2s;
}

.avatar.has-image {
  border: 3px solid #00A86B;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-btn:active .avatar {
  transform: scale(0.95);
}

.edit-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 28px;
  height: 28px;
  background: #FFFFFF;
  border: 2px solid #00A86B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
}

.edit-badge svg {
  width: 14px;
  height: 14px;
}

.profile-info {
  margin-bottom: 20px;
}

.profile-name {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px 0;
}

.profile-status {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.profile-status.success {
  background: #DCFCE7;
  color: #15803D;
}

.profile-status.pending {
  background: #FEF3C7;
  color: #B45309;
}

.profile-status.error {
  background: #FEE2E2;
  color: #B91C1C;
}

/* Stats */
.stats-row {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 20px;
  border-top: 1px solid #F3F4F6;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.stat-label {
  font-size: 12px;
  color: #6B7280;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: #F3F4F6;
}

/* Menu Card */
.menu-card {
  background: #FFFFFF;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: transparent;
  border: none;
  border-bottom: 1px solid #F3F4F6;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active {
  background: #F9FAFB;
}

.menu-icon {
  width: 44px;
  height: 44px;
  background: #F3F4F6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6B7280;
}

.menu-icon svg {
  width: 22px;
  height: 22px;
}

.menu-label {
  font-size: 15px;
  font-weight: 500;
  color: #111827;
}

.menu-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.menu-desc {
  font-size: 12px;
  color: #9CA3AF;
}

.menu-arrow {
  width: 20px;
  height: 20px;
  color: #D1D5DB;
}

/* Switch Button */
.switch-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: #E8F5EF;
  border: 1px solid #A7F3D0;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  margin-bottom: 16px;
  transition: all 0.2s;
}

.switch-btn:active {
  transform: scale(0.99);
}

.switch-icon {
  width: 48px;
  height: 48px;
  background: #00A86B;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
}

.switch-icon svg {
  width: 24px;
  height: 24px;
}

.switch-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.switch-label {
  font-size: 15px;
  font-weight: 600;
  color: #065F46;
}

.switch-desc {
  font-size: 13px;
  color: #047857;
}

.switch-arrow {
  width: 20px;
  height: 20px;
  color: #00A86B;
}

/* Logout */
.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px;
  background: #FFFFFF;
  border: 1px solid #FEE2E2;
  border-radius: 16px;
  color: #DC2626;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 20px;
}

.logout-btn:active {
  background: #FEF2F2;
}

.logout-btn svg {
  width: 20px;
  height: 20px;
}

/* Version */
.version {
  text-align: center;
  font-size: 12px;
  color: #9CA3AF;
  margin: 0;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #FFFFFF;
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-width: 500px;
  max-height: 85vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #E5E5E5;
  position: sticky;
  top: 0;
  background: #FFFFFF;
  z-index: 1;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  background: #F3F4F6;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6B7280;
  cursor: pointer;
}

.close-btn:active {
  background: #E5E7EB;
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

/* Modal Body & Forms */
.modal-body {
  padding: 20px;
}

.modal-large {
  max-height: 90vh;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px 14px;
  font-size: 15px;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  background: #FFFFFF;
  color: #111827;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #00A86B;
  box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.save-btn {
  width: 100%;
  padding: 14px;
  background: #00A86B;
  color: #FFFFFF;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
}

.save-btn:active {
  transform: scale(0.98);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.save-message {
  text-align: center;
  font-size: 14px;
  color: #00A86B;
  margin: 8px 0;
}

.save-message.error {
  color: #DC2626;
}

/* Info Box */
.info-box {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #F0FDF4;
  border: 1px solid #BBF7D0;
  border-radius: 12px;
  margin-bottom: 16px;
}

.info-box svg {
  width: 20px;
  height: 20px;
  color: #00A86B;
  flex-shrink: 0;
  margin-top: 2px;
}

.info-box p {
  font-size: 13px;
  color: #166534;
  margin: 0;
  line-height: 1.4;
}

/* Notification Setting */
.notification-setting {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #F9FAFB;
  border-radius: 12px;
}

.notification-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notification-icon {
  width: 44px;
  height: 44px;
  background: #FEF3C7;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #F59E0B;
}

.notification-icon svg {
  width: 22px;
  height: 22px;
}

.notification-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notification-label {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.notification-desc {
  font-size: 12px;
  color: #6B7280;
}

.toggle-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
}

.toggle-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-track {
  display: block;
  width: 52px;
  height: 32px;
  background: #E5E7EB;
  border-radius: 16px;
  position: relative;
  transition: background 0.2s;
}

.toggle-btn.active .toggle-track {
  background: #00A86B;
}

.toggle-thumb {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.toggle-btn.active .toggle-thumb {
  transform: translateX(20px);
}

.not-supported {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px;
  text-align: center;
}

.not-supported svg {
  width: 48px;
  height: 48px;
  color: #9CA3AF;
}

.not-supported p {
  font-size: 14px;
  color: #6B7280;
  margin: 0;
}

/* Settings Items */
.settings-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #F3F4F6;
  cursor: pointer;
}

.settings-item:last-child {
  border-bottom: none;
}

.settings-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.settings-label {
  font-size: 15px;
  font-weight: 500;
  color: #111827;
}

.settings-value {
  font-size: 13px;
  color: #6B7280;
}

.settings-arrow {
  width: 20px;
  height: 20px;
  color: #D1D5DB;
}

/* Help Section */
.help-section {
  margin-bottom: 24px;
}

.help-section:last-child {
  margin-bottom: 0;
}

.help-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 12px 0;
}

.faq-item {
  padding: 12px 0;
  border-bottom: 1px solid #F3F4F6;
}

.faq-item:last-child {
  border-bottom: none;
}

.faq-q {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  margin-bottom: 4px;
}

.faq-a {
  display: block;
  font-size: 13px;
  color: #6B7280;
  line-height: 1.4;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #F9FAFB;
  border-radius: 12px;
  margin-bottom: 8px;
  text-decoration: none;
  color: #111827;
  transition: background 0.2s;
}

.contact-item:last-child {
  margin-bottom: 0;
}

.contact-item:active {
  background: #F3F4F6;
}

.contact-item svg {
  width: 20px;
  height: 20px;
  color: #00A86B;
}

.contact-item span {
  font-size: 14px;
  font-weight: 500;
}
</style>
