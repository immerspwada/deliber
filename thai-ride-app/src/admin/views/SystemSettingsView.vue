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
      <h1 class="text-2xl font-bold text-gray-900">การตั้งค่าระบบ</h1>
      <p class="text-sm text-gray-600 mt-1">
        จัดการข้อมูลพื้นฐานของเว็บไซต์ SEO และการติดต่อ
      </p>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  SettingsSection,
  SettingsFormField,
  SettingsActions,
  SettingsLoadingState,
  SettingsErrorState
} from '@/admin/components/settings'

const router = useRouter()

const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)

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
  loading.value = true
  error.value = null
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    form.value = {
      siteName: 'Thai Ride App',
      siteDescription: 'แพลตฟอร์มเรียกรถและจัดส่งสินค้าในประเทศไทย',
      contactEmail: 'support@thairideapp.com',
      contactPhone: '02-xxx-xxxx',
      metaTitle: 'Thai Ride App - บริการเรียกรถและจัดส่งสินค้า',
      metaDescription: 'แพลตฟอร์มเรียกรถและจัดส่งสินค้าที่ดีที่สุดในประเทศไทย',
      metaKeywords: 'เรียกรถ, จัดส่งสินค้า, ไทย',
      timezone: 'Asia/Bangkok',
      currency: 'THB',
      maintenanceMode: false
    }
    
    originalForm.value = { ...form.value }
  } catch (e) {
    error.value = 'ไม่สามารถโหลดการตั้งค่าได้ กรุณาลองใหม่อีกครั้ง'
    console.error('Failed to load settings:', e)
  } finally {
    loading.value = false
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
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    originalForm.value = { ...form.value }
    
    alert('บันทึกการตั้งค่าสำเร็จ')
  } catch (e) {
    alert('ไม่สามารถบันทึกการตั้งค่าได้ กรุณาลองใหม่อีกครั้ง')
    console.error('Failed to save settings:', e)
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

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.system-settings-view {
  @apply max-w-4xl mx-auto px-4 py-6;
}

.settings-card {
  @apply bg-white border border-gray-200 rounded-lg p-6 space-y-4;
}

.form-input {
  @apply w-full px-4 py-2 border border-gray-300 rounded-lg;
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent;
  @apply transition-all duration-200;
  @apply min-h-[44px];
}

.form-input:disabled {
  @apply bg-gray-50 cursor-not-allowed;
}

.form-checkbox {
  @apply w-5 h-5 text-primary-600 border-gray-300 rounded;
  @apply focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
  @apply cursor-pointer;
}
</style>
