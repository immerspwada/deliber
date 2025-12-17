<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useAppSettings } from '../composables/useAppSettings'

const { loading, settings, fetchSettings, updateSettings, resetToDefaults, DEFAULT_SETTINGS } = useAppSettings()

const localSettings = ref({ ...DEFAULT_SETTINGS })
const saving = ref(false)
const success = ref('')
const activeSection = ref<'pricing' | 'delivery' | 'provider' | 'general'>('pricing')

onMounted(async () => {
  await fetchSettings()
  localSettings.value = { ...settings.value }
})

const saveSettings = async () => {
  saving.value = true
  success.value = ''
  try {
    await updateSettings(localSettings.value)
    success.value = 'บันทึกการตั้งค่าเรียบร้อย'
    setTimeout(() => { success.value = '' }, 3000)
  } finally {
    saving.value = false
  }
}

const handleReset = async () => {
  if (confirm('ต้องการรีเซ็ตเป็นค่าเริ่มต้นหรือไม่?')) {
    await resetToDefaults()
    localSettings.value = { ...DEFAULT_SETTINGS }
    success.value = 'รีเซ็ตเป็นค่าเริ่มต้นแล้ว'
    setTimeout(() => { success.value = '' }, 3000)
  }
}

const sections = [
  { id: 'pricing', label: 'ค่าโดยสาร', icon: 'money' },
  { id: 'delivery', label: 'ส่งของ/ซื้อของ', icon: 'package' },
  { id: 'provider', label: 'ผู้ให้บริการ', icon: 'user' },
  { id: 'general', label: 'ทั่วไป', icon: 'settings' }
]
</script>

<template>
  <AdminLayout>
    <div class="settings-page">
      <div class="page-header">
        <h1>ตั้งค่าระบบ</h1>
        <p class="subtitle">จัดการการตั้งค่าแอพพลิเคชัน</p>
      </div>

      <!-- Success Message -->
      <div v-if="success" class="message success">{{ success }}</div>

      <!-- Section Tabs -->
      <div class="section-tabs">
        <button
          v-for="section in sections"
          :key="section.id"
          :class="{ active: activeSection === section.id }"
          @click="activeSection = section.id as any"
        >
          {{ section.label }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>

      <!-- Settings Form -->
      <div v-else class="settings-form">
        <!-- Pricing Section -->
        <div v-show="activeSection === 'pricing'" class="settings-section">
          <h3>ค่าโดยสาร</h3>
          
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">ค่าเริ่มต้น (Base Fare)</span>
              <span class="setting-desc">ค่าโดยสารเริ่มต้นก่อนคำนวณระยะทาง</span>
            </div>
            <div class="input-group">
              <span class="input-prefix">฿</span>
              <input type="number" v-model.number="localSettings.baseFare" min="0" />
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">ค่าต่อกิโลเมตร</span>
              <span class="setting-desc">ค่าโดยสารต่อระยะทาง 1 กม.</span>
            </div>
            <div class="input-group">
              <span class="input-prefix">฿</span>
              <input type="number" v-model.number="localSettings.perKmRate" min="0" step="0.5" />
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">ค่าต่อนาที</span>
              <span class="setting-desc">ค่าโดยสารต่อเวลาเดินทาง 1 นาที</span>
            </div>
            <div class="input-group">
              <span class="input-prefix">฿</span>
              <input type="number" v-model.number="localSettings.perMinuteRate" min="0" step="0.5" />
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">ค่าโดยสารขั้นต่ำ</span>
              <span class="setting-desc">ค่าโดยสารต่ำสุดที่เรียกเก็บ</span>
            </div>
            <div class="input-group">
              <span class="input-prefix">฿</span>
              <input type="number" v-model.number="localSettings.minimumFare" min="0" />
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">ค่าจอง (Booking Fee)</span>
              <span class="setting-desc">ค่าธรรมเนียมการจองต่อเที่ยว</span>
            </div>
            <div class="input-group">
              <span class="input-prefix">฿</span>
              <input type="number" v-model.number="localSettings.bookingFee" min="0" />
            </div>
          </div>
        </div>

        <!-- Delivery Section -->
        <div v-show="activeSection === 'delivery'" class="settings-section">
          <h3>บริการส่งของ</h3>
          
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">ค่าส่งเริ่มต้น</span>
              <span class="setting-desc">ค่าบริการส่งของเริ่มต้น</span>
            </div>
            <div class="input-group">
              <span class="input-prefix">฿</span>
              <input type="number" v-model.number="localSettings.deliveryBaseFee" min="0" />
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">ค่าส่งต่อกิโลเมตร</span>
              <span class="setting-desc">ค่าบริการส่งของต่อระยะทาง 1 กม.</span>
            </div>
            <div class="input-group">
              <span class="input-prefix">฿</span>
              <input type="number" v-model.number="localSettings.deliveryPerKmRate" min="0" />
            </div>
          </div>

          <h3 style="margin-top: 24px;">บริการซื้อของ</h3>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">ค่าบริการซื้อของ</span>
              <span class="setting-desc">ค่าบริการคงที่ต่อออเดอร์</span>
            </div>
            <div class="input-group">
              <span class="input-prefix">฿</span>
              <input type="number" v-model.number="localSettings.shoppingServiceFee" min="0" />
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">ค่าบริการ % จากยอดสินค้า</span>
              <span class="setting-desc">เปอร์เซ็นต์จากมูลค่าสินค้าที่ซื้อ</span>
            </div>
            <div class="input-group">
              <input type="number" v-model.number="localSettings.shoppingPercentageFee" min="0" max="100" />
              <span class="input-suffix">%</span>
            </div>
          </div>
        </div>

        <!-- Provider Section -->
        <div v-show="activeSection === 'provider'" class="settings-section">
          <h3>ผู้ให้บริการ</h3>
          
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">ค่าคอมมิชชั่น</span>
              <span class="setting-desc">เปอร์เซ็นต์ที่หักจากรายได้ผู้ให้บริการ</span>
            </div>
            <div class="input-group">
              <input type="number" v-model.number="localSettings.providerCommissionRate" min="0" max="50" />
              <span class="input-suffix">%</span>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">ยอดถอนขั้นต่ำ</span>
              <span class="setting-desc">ยอดเงินขั้นต่ำที่สามารถถอนได้</span>
            </div>
            <div class="input-group">
              <span class="input-prefix">฿</span>
              <input type="number" v-model.number="localSettings.minimumWithdrawal" min="0" />
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">ค่าธรรมเนียมถอนเงิน</span>
              <span class="setting-desc">ค่าธรรมเนียมต่อการถอนเงิน 1 ครั้ง</span>
            </div>
            <div class="input-group">
              <span class="input-prefix">฿</span>
              <input type="number" v-model.number="localSettings.withdrawalFee" min="0" />
            </div>
          </div>

          <h3 style="margin-top: 24px;">พื้นที่ให้บริการ</h3>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">รัศมีพื้นที่ให้บริการ</span>
              <span class="setting-desc">ระยะทางสูงสุดจากศูนย์กลาง</span>
            </div>
            <div class="input-group">
              <input type="number" v-model.number="localSettings.serviceAreaRadius" min="1" />
              <span class="input-suffix">กม.</span>
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">ระยะรับงานสูงสุด</span>
              <span class="setting-desc">ระยะทางสูงสุดที่ Provider จะเห็นงาน</span>
            </div>
            <div class="input-group">
              <input type="number" v-model.number="localSettings.maxPickupDistance" min="1" />
              <span class="input-suffix">กม.</span>
            </div>
          </div>
        </div>

        <!-- General Section -->
        <div v-show="activeSection === 'general'" class="settings-section">
          <h3>ข้อมูลทั่วไป</h3>
          
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">เบอร์โทรซัพพอร์ต</span>
              <span class="setting-desc">เบอร์โทรศัพท์สำหรับติดต่อ</span>
            </div>
            <input type="tel" v-model="localSettings.supportPhone" class="text-input" />
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">อีเมลซัพพอร์ต</span>
              <span class="setting-desc">อีเมลสำหรับติดต่อ</span>
            </div>
            <input type="email" v-model="localSettings.supportEmail" class="text-input" />
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">เวอร์ชันแอพ</span>
              <span class="setting-desc">เวอร์ชันปัจจุบันของแอพ</span>
            </div>
            <input type="text" v-model="localSettings.appVersion" class="text-input" />
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">โหมดปิดปรับปรุง</span>
              <span class="setting-desc">ปิดการใช้งานแอพชั่วคราว</span>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="localSettings.maintenanceMode" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button class="btn-secondary" @click="handleReset">รีเซ็ตค่าเริ่มต้น</button>
        <button class="btn-primary" @click="saveSettings" :disabled="saving">
          {{ saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า' }}
        </button>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.settings-page {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.subtitle {
  color: #6b6b6b;
  font-size: 14px;
}

.message.success {
  background: #e6f7ed;
  color: #05944f;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

.section-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  background: #f6f6f6;
  padding: 4px;
  border-radius: 10px;
  overflow-x: auto;
}

.section-tabs button {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.section-tabs button.active {
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 60px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e5e5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.settings-form {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
}

.settings-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
  gap: 16px;
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
}

.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
}

.setting-desc {
  display: block;
  font-size: 12px;
  color: #6b6b6b;
}

.input-group {
  display: flex;
  align-items: center;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  overflow: hidden;
}

.input-prefix, .input-suffix {
  padding: 8px 12px;
  background: #f6f6f6;
  font-size: 14px;
  color: #6b6b6b;
}

.input-group input {
  width: 80px;
  padding: 8px 12px;
  border: none;
  font-size: 14px;
  text-align: center;
}

.input-group input:focus {
  outline: none;
}

.text-input {
  width: 200px;
  padding: 8px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
}

.text-input:focus {
  outline: none;
  border-color: #000;
}

.toggle {
  position: relative;
  width: 48px;
  height: 28px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: #ccc;
  border-radius: 28px;
  transition: 0.3s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 22px;
  height: 22px;
  left: 3px;
  bottom: 3px;
  background: #fff;
  border-radius: 50%;
  transition: 0.3s;
}

.toggle input:checked + .toggle-slider {
  background: #000;
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn-primary, .btn-secondary {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #000;
  color: #fff;
  border: none;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f6f6f6;
  color: #000;
  border: none;
}

.btn-secondary:hover {
  background: #e5e5e5;
}

@media (min-width: 1024px) {
  .settings-page {
    padding: 32px;
  }
  
  .page-header h1 {
    font-size: 28px;
  }
}
</style>
