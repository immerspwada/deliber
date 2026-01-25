<template>
  <div class="system-settings-view">
    <!-- Header -->
    <div class="header mb-6">
      <button
        type="button"
        class="text-primary-600 hover:text-primary-700 flex items-center gap-2 mb-4 min-h-[44px]"
        @click="$router.back()"
      >
        ← กลับ
      </button>
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">การตั้งค่าระบบ</h1>
          <p class="text-sm text-gray-600 mt-1">
            จัดการข้อมูลพื้นฐานของเว็บไซต์ SEO และการติดต่อ
          </p>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="btn-secondary"
            title="ดูประวัติการเปลี่ยนแปลง"
            @click="showAuditLog = true"
          >
            📋 ประวัติ
          </button>
          <button
            type="button"
            class="btn-secondary"
            title="ส่งออกการตั้งค่า"
            @click="exportSettings"
          >
            📥 ส่งออก
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <SettingsLoadingState 
      v-if="loading" 
      message="กำลังโหลดการตั้งค่า..."
      :show-skeleton="true"
      :skeleton-count="3"
    />

    <!-- Error State -->
    <SettingsErrorState
      v-else-if="error"
      :message="error"
      @retry="loadSettings"
    />

    <!-- Content -->
    <form v-else @submit.prevent="handleSubmit">
      <!-- ข้อมูลเว็บไซต์ -->
      <SettingsSection
        title="ข้อมูลเว็บไซต์"
        description="ข้อมูลพื้นฐานที่แสดงบนเว็บไซต์และแอปพลิเคชัน"
      >
        <div class="settings-card">
          <SettingsFormField
            id="site-name"
            label="ชื่อเว็บไซต์"
            help-text="ชื่อที่จะแสดงในหัวเว็บไซต์และแอป"
            :error="errors.siteName"
            required
          >
            <input
              id="site-name"
              v-model="form.siteName"
              type="text"
              class="form-input"
              placeholder="Thai Ride App"
              required
            />
          </SettingsFormField>

          <SettingsFormField
            id="site-description"
            label="คำอธิบายเว็บไซต์"
            help-text="คำอธิบายสั้นๆ เกี่ยวกับเว็บไซต์ของคุณ"
          >
            <textarea
              id="site-description"
              v-model="form.siteDescription"
              class="form-input"
              rows="3"
              placeholder="แพลตฟอร์มเรียกรถและจัดส่งสินค้าในประเทศไทย"
            ></textarea>
          </SettingsFormField>

          <SettingsFormField
            id="contact-email"
            label="อีเมลติดต่อ"
            help-text="อีเมลสำหรับการติดต่อและการสนับสนุน"
            :error="errors.contactEmail"
            required
          >
            <input
              id="contact-email"
              v-model="form.contactEmail"
              type="email"
              class="form-input"
              placeholder="support@example.com"
              required
            />
          </SettingsFormField>

          <SettingsFormField
            id="contact-phone"
            label="เบอร์โทรติดต่อ"
            help-text="เบอร์โทรศัพท์สำหรับการติดต่อ"
          >
            <input
              id="contact-phone"
              v-model="form.contactPhone"
              type="tel"
              class="form-input"
              placeholder="02-xxx-xxxx"
            />
          </SettingsFormField>
        </div>
      </SettingsSection>

      <!-- SEO -->
      <SettingsSection
        title="การตั้งค่า SEO"
        description="ปรับแต่งการแสดงผลในเครื่องมือค้นหา"
      >
        <div class="settings-card">
          <SettingsFormField
            id="meta-title"
            label="Meta Title"
            help-text="หัวข้อที่แสดงในผลการค้นหา (แนะนำ 50-60 ตัวอักษร)"
          >
            <input
              id="meta-title"
              v-model="form.metaTitle"
              type="text"
              class="form-input"
              placeholder="Thai Ride App - บริการเรียกรถและจัดส่งสินค้า"
              maxlength="60"
            />
            <div class="text-xs text-gray-500 mt-1">
              {{ form.metaTitle.length }}/60 ตัวอักษร
            </div>
          </SettingsFormField>

          <SettingsFormField
            id="meta-description"
            label="Meta Description"
            help-text="คำอธิบายที่แสดงในผลการค้นหา (แนะนำ 150-160 ตัวอักษร)"
          >
            <textarea
              id="meta-description"
              v-model="form.metaDescription"
              class="form-input"
              rows="3"
              placeholder="แพลตฟอร์มเรียกรถและจัดส่งสินค้าที่ดีที่สุดในประเทศไทย"
              maxlength="160"
            ></textarea>
            <div class="text-xs text-gray-500 mt-1">
              {{ form.metaDescription.length }}/160 ตัวอักษร
            </div>
          </SettingsFormField>

          <SettingsFormField
            id="meta-keywords"
            label="Meta Keywords"
            help-text="คำสำคัญสำหรับ SEO (คั่นด้วยเครื่องหมายจุลภาค)"
          >
            <input
              id="meta-keywords"
              v-model="form.metaKeywords"
              type="text"
              class="form-input"
              placeholder="เรียกรถ, จัดส่งสินค้า, ไทย"
            />
          </SettingsFormField>
        </div>
      </SettingsSection>

      <!-- การตั้งค่าทั่วไป -->
      <SettingsSection
        title="การตั้งค่าทั่วไป"
        description="การตั้งค่าพื้นฐานของระบบ"
      >
        <div class="settings-card">
          <SettingsFormField
            id="timezone"
            label="เขตเวลา"
            help-text="เขตเวลาที่ใช้ในระบบ"
          >
            <select
              id="timezone"
              v-model="form.timezone"
              class="form-input"
            >
              <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
              <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
              <option value="UTC">UTC (GMT+0)</option>
            </select>
          </SettingsFormField>

          <SettingsFormField
            id="currency"
            label="สกุลเงิน"
            help-text="สกุลเงินที่ใช้ในระบบ"
          >
            <select
              id="currency"
              v-model="form.currency"
              class="form-input"
            >
              <option value="THB">บาท (THB)</option>
              <option value="USD">ดอลลาร์สหรัฐ (USD)</option>
              <option value="EUR">ยูโร (EUR)</option>
            </select>
          </SettingsFormField>

          <SettingsFormField
            id="maintenance-mode"
            label="โหมดปิดปรับปรุง"
            help-text="เปิดใช้งานเมื่อต้องการปิดระบบชั่วคราว"
          >
            <label class="flex items-center gap-2 cursor-pointer min-h-[44px]">
              <input
                id="maintenance-mode"
                v-model="form.maintenanceMode"
                type="checkbox"
                class="form-checkbox"
              />
              <span class="text-sm text-gray-700">เปิดใช้งานโหมดปิดปรับปรุง</span>
            </label>
            <div v-if="form.maintenanceMode" class="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p class="text-sm text-amber-800">
                ⚠️ เมื่อเปิดใช้งาน ผู้ใช้ทั่วไปจะไม่สามารถเข้าถึงระบบได้
              </p>
            </div>
          </SettingsFormField>
        </div>
      </SettingsSection>

      <!-- Actions -->
      <SettingsActions
        :loading="saving"
        :has-changes="hasChanges"
        :show-reset="true"
        @cancel="handleCancel"
        @reset="handleReset"
      />
    </form>

    <!-- Audit Log Modal -->
    <SettingsAuditLogModal
      v-if="showAuditLog"
      :audit-log="auditLog"
      :loading="loadingAuditLog"
      @close="showAuditLog = false"
      @refresh="loadAuditLog"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSystemSettings } from '@/admin/composables/useSystemSettings'
import { useToast } from '@/composables/useToast'
import SettingsSection from '@/admin/components/settings/SettingsSection.vue'
import SettingsFormField from '@/admin/components/settings/SettingsFormField.vue'
import SettingsActions from '@/admin/components/settings/SettingsActions.vue'
import SettingsLoadingState from '@/admin/components/settings/SettingsLoadingState.vue'
import SettingsErrorState from '@/admin/components/settings/SettingsErrorState.vue'
import SettingsAuditLogModal from '@/admin/components/SettingsAuditLogModal.vue'

const router = useRouter()
const { showSuccess, showError, showWarning } = useToast()
const {
  settings,
  isLoading: loading,
  error: apiError,
  fetchAllSettings,
  updateSetting,
  getSettingValue,
  fetchAuditLog,
  auditLog
} = useSystemSettings()

const saving = ref(false)
const error = ref<string | null>(null)
const showAuditLog = ref(false)
const loadingAuditLog = ref(false)

const form = ref({
  siteName: '',
  siteDescription: '',
  contactEmail: '',
  contactPhone: '',
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  timezone: 'Asia/Bangkok',
  currency: 'THB',
  maintenanceMode: false
})

const originalForm = ref({ ...form.value })

const errors = ref({
  siteName: '',
  contactEmail: ''
})

const hasChanges = computed(() => {
  return JSON.stringify(form.value) !== JSON.stringify(originalForm.value)
})

async function loadSettings() {
  error.value = null
  
  try {
    await fetchAllSettings()
    
    // Map settings to form
    form.value = {
      siteName: getSettingValue('site_name', 'general') || 'Thai Ride App',
      siteDescription: getSettingValue('site_description', 'general') || '',
      contactEmail: getSettingValue('contact_email', 'general') || '',
      contactPhone: getSettingValue('contact_phone', 'general') || '',
      metaTitle: getSettingValue('meta_title', 'seo') || '',
      metaDescription: getSettingValue('meta_description', 'seo') || '',
      metaKeywords: getSettingValue('meta_keywords', 'seo') || '',
      timezone: getSettingValue('timezone', 'general') || 'Asia/Bangkok',
      currency: getSettingValue('currency', 'general') || 'THB',
      maintenanceMode: getSettingValue('maintenance_mode', 'general') === 'true'
    }
    
    originalForm.value = { ...form.value }
  } catch (e) {
    error.value = apiError.value || 'ไม่สามารถโหลดการตั้งค่าได้ กรุณาลองใหม่อีกครั้ง'
    console.error('[SystemSettingsView] Failed to load settings:', e)
  }
}

async function loadAuditLog() {
  loadingAuditLog.value = true
  try {
    await fetchAuditLog(50)
  } catch (e) {
    showError('ไม่สามารถโหลดประวัติการเปลี่ยนแปลงได้')
    console.error('[SystemSettingsView] Failed to load audit log:', e)
  } finally {
    loadingAuditLog.value = false
  }
}

function validateForm(): boolean {
  errors.value = {
    siteName: '',
    contactEmail: ''
  }
  
  let isValid = true
  
  if (!form.value.siteName.trim()) {
    errors.value.siteName = 'กรุณากรอกชื่อเว็บไซต์'
    isValid = false
  }
  
  if (!form.value.contactEmail.trim()) {
    errors.value.contactEmail = 'กรุณากรอกอีเมลติดต่อ'
    isValid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.contactEmail)) {
    errors.value.contactEmail = 'รูปแบบอีเมลไม่ถูกต้อง'
    isValid = false
  }
  
  return isValid
}

async function handleSubmit() {
  if (!validateForm()) {
    return
  }
  
  saving.value = true
  
  try {
    // Update all changed settings
    const updates = [
      { key: 'site_name', value: form.value.siteName, category: 'general' },
      { key: 'site_description', value: form.value.siteDescription, category: 'general' },
      { key: 'contact_email', value: form.value.contactEmail, category: 'general' },
      { key: 'contact_phone', value: form.value.contactPhone, category: 'general' },
      { key: 'timezone', value: form.value.timezone, category: 'general' },
      { key: 'currency', value: form.value.currency, category: 'general' },
      { key: 'maintenance_mode', value: String(form.value.maintenanceMode), category: 'general' },
      { key: 'meta_title', value: form.value.metaTitle, category: 'seo' },
      { key: 'meta_description', value: form.value.metaDescription, category: 'seo' },
      { key: 'meta_keywords', value: form.value.metaKeywords, category: 'seo' }
    ]
    
    let successCount = 0
    let failCount = 0
    
    for (const update of updates) {
      const result = await updateSetting(update.key, update.value, update.category)
      if (result.success) {
        successCount++
      } else {
        failCount++
        console.error(`Failed to update ${update.key}:`, result.message)
      }
    }
    
    if (failCount === 0) {
      originalForm.value = { ...form.value }
      showSuccess('บันทึกการตั้งค่าสำเร็จ')
    } else if (successCount > 0) {
      showWarning(`บันทึกสำเร็จ ${successCount} รายการ แต่มี ${failCount} รายการที่ล้มเหลว`)
    } else {
      showError('ไม่สามารถบันทึกการตั้งค่าได้')
    }
  } catch (e) {
    showError('ไม่สามารถบันทึกการตั้งค่าได้ กรุณาลองใหม่อีกครั้ง')
    console.error('[SystemSettingsView] Failed to save settings:', e)
  } finally {
    saving.value = false
  }
}

function handleCancel() {
  if (hasChanges.value) {
    if (confirm('คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ต้องการยกเลิกหรือไม่?')) {
      router.push('/admin/settings')
    }
  } else {
    router.push('/admin/settings')
  }
}

function handleReset() {
  if (confirm('ต้องการรีเซ็ตการตั้งค่าเป็นค่าเริ่มต้นหรือไม่?')) {
    form.value = { ...originalForm.value }
  }
}

function exportSettings() {
  try {
    const data = {
      exported_at: new Date().toISOString(),
      settings: form.value
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `system-settings-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    showSuccess('ส่งออกการตั้งค่าสำเร็จ')
  } catch (e) {
    showError('ไม่สามารถส่งออกการตั้งค่าได้')
    console.error('[SystemSettingsView] Failed to export settings:', e)
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.system-settings-view {
  max-width: 56rem;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;
  padding-right: 1rem;
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}

.settings-card {
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-input {
  width: 100%;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  min-height: 44px;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  ring: 2px;
  ring-color: #3b82f6;
  border-color: transparent;
}

.form-input:disabled {
  background-color: #f9fafb;
  cursor: not-allowed;
}

.form-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  color: #3b82f6;
  border-color: #d1d5db;
  border-radius: 0.25rem;
  cursor: pointer;
}

.form-checkbox:focus {
  ring: 2px;
  ring-color: #3b82f6;
  ring-offset: 2px;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  background-color: white;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-secondary:hover {
  background-color: #f9fafb;
  border-color: #9ca3af;
}

.btn-secondary:active {
  transform: scale(0.98);
}

.btn-secondary:focus {
  outline: none;
  ring: 2px;
  ring-color: #3b82f6;
  ring-offset: 2px;
}
</style>
