<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useSurgePricing } from '../composables/useSurgePricing'
import { useAdminCleanup } from '../composables/useAdminCleanup'

// Initialize cleanup utility
const { addCleanup } = useAdminCleanup()

const { config, updateConfig, isPeakHour } = useSurgePricing()

const localConfig = ref({ ...config.value })
const saving = ref(false)
const success = ref('')

// Register cleanup for memory optimization
addCleanup(() => {
  localConfig.value = {
    enabled: true,
    minMultiplier: 1.0,
    maxMultiplier: 2.5,
    peakHours: [],
    demandThreshold: 10,
    supplyThreshold: 5
  }
  saving.value = false
  success.value = ''
  console.log('[AdminSurgeView] Cleanup complete')
})

// Peak hours selection
const allHours = Array.from({ length: 24 }, (_, i) => i)

const togglePeakHour = (hour: number) => {
  const idx = localConfig.value.peakHours.indexOf(hour)
  if (idx >= 0) {
    localConfig.value.peakHours.splice(idx, 1)
  } else {
    localConfig.value.peakHours.push(hour)
    localConfig.value.peakHours.sort((a, b) => a - b)
  }
}

const isPeakHourSelected = (hour: number) => localConfig.value.peakHours.includes(hour)

const formatHour = (h: number) => `${h.toString().padStart(2, '0')}:00`

const saveConfig = async () => {
  saving.value = true
  try {
    updateConfig(localConfig.value)
    success.value = 'บันทึกการตั้งค่าเรียบร้อย'
    setTimeout(() => { success.value = '' }, 3000)
  } finally {
    saving.value = false
  }
}

const resetToDefault = () => {
  localConfig.value = {
    enabled: true,
    minMultiplier: 1.0,
    maxMultiplier: 2.5,
    peakHours: [7, 8, 12, 17, 18, 19],
    demandThreshold: 10,
    supplyThreshold: 5
  }
}

onMounted(() => {
  localConfig.value = { ...config.value }
})
</script>

<template>
  <AdminLayout>
    <div class="surge-page">
      <div class="page-header">
        <h1>Surge Pricing</h1>
        <p class="subtitle">ตั้งค่าระบบปรับราคาตามความต้องการ</p>
      </div>

      <!-- Success Message -->
      <div v-if="success" class="message success">{{ success }}</div>

      <!-- Current Status -->
      <div class="status-card">
        <div class="status-header">
          <h3>สถานะปัจจุบัน</h3>
          <span :class="['status-badge', isPeakHour() ? 'peak' : 'normal']">
            {{ isPeakHour() ? 'ช่วงเร่งด่วน' : 'ปกติ' }}
          </span>
        </div>
        <p class="status-time">เวลาปัจจุบัน: {{ new Date().toLocaleTimeString('th-TH') }}</p>
      </div>

      <!-- Settings Form -->
      <div class="settings-card">
        <h3>การตั้งค่า</h3>

        <!-- Enable/Disable -->
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">เปิดใช้งาน Surge Pricing</span>
            <span class="setting-desc">ปรับราคาอัตโนมัติตามความต้องการ</span>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="localConfig.enabled" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <!-- Min/Max Multiplier -->
        <div class="setting-group">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">ตัวคูณต่ำสุด</span>
              <span class="setting-desc">ราคาขั้นต่ำ (1.0 = ราคาปกติ)</span>
            </div>
            <input 
              type="number" 
              v-model.number="localConfig.minMultiplier" 
              min="1" 
              max="2" 
              step="0.1"
              class="number-input"
            />
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">ตัวคูณสูงสุด</span>
              <span class="setting-desc">ราคาสูงสุดที่อนุญาต</span>
            </div>
            <input 
              type="number" 
              v-model.number="localConfig.maxMultiplier" 
              min="1" 
              max="5" 
              step="0.1"
              class="number-input"
            />
          </div>
        </div>

        <!-- Thresholds -->
        <div class="setting-group">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Demand Threshold</span>
              <span class="setting-desc">จำนวน request ที่รอเพื่อเริ่ม surge</span>
            </div>
            <input 
              type="number" 
              v-model.number="localConfig.demandThreshold" 
              min="1" 
              max="50"
              class="number-input"
            />
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Supply Threshold</span>
              <span class="setting-desc">จำนวน provider ต่ำกว่านี้เริ่ม surge</span>
            </div>
            <input 
              type="number" 
              v-model.number="localConfig.supplyThreshold" 
              min="1" 
              max="20"
              class="number-input"
            />
          </div>
        </div>

        <!-- Peak Hours -->
        <div class="setting-section">
          <span class="setting-label">ช่วงเวลาเร่งด่วน</span>
          <span class="setting-desc">เลือกชั่วโมงที่ต้องการให้เป็นช่วงเร่งด่วน</span>
          <div class="hours-grid">
            <button
              v-for="hour in allHours"
              :key="hour"
              :class="['hour-btn', { selected: isPeakHourSelected(hour) }]"
              @click="togglePeakHour(hour)"
            >
              {{ formatHour(hour) }}
            </button>
          </div>
        </div>
      </div>

      <!-- Preview -->
      <div class="preview-card">
        <h3>ตัวอย่างการคำนวณ</h3>
        <div class="preview-table">
          <div class="preview-row header">
            <span>สถานการณ์</span>
            <span>ตัวคูณ</span>
            <span>ราคา ฿100</span>
          </div>
          <div class="preview-row">
            <span>ปกติ</span>
            <span>1.0x</span>
            <span>฿100</span>
          </div>
          <div class="preview-row">
            <span>ช่วงเร่งด่วน</span>
            <span>1.2x</span>
            <span>฿120</span>
          </div>
          <div class="preview-row">
            <span>Demand สูง</span>
            <span>1.5x</span>
            <span>฿150</span>
          </div>
          <div class="preview-row highlight">
            <span>สูงสุด</span>
            <span>{{ localConfig.maxMultiplier }}x</span>
            <span>฿{{ Math.round(100 * localConfig.maxMultiplier) }}</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button class="btn-secondary" @click="resetToDefault">รีเซ็ตค่าเริ่มต้น</button>
        <button class="btn-primary" @click="saveConfig" :disabled="saving">
          {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
        </button>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.surge-page {
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

.status-card, .settings-card, .preview-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.status-header h3, .settings-card h3, .preview-card h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.normal {
  background: #e6f7ed;
  color: #05944f;
}

.status-badge.peak {
  background: #fff3e0;
  color: #f57c00;
}

.status-time {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0;
}

.settings-card h3 {
  margin-bottom: 20px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
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

.number-input {
  width: 80px;
  padding: 8px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.number-input:focus {
  outline: none;
  border-color: #000;
}

.setting-group {
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 16px;
}

.setting-section {
  padding: 16px 0;
}

.setting-section .setting-label {
  margin-bottom: 4px;
}

.setting-section .setting-desc {
  margin-bottom: 12px;
}

.hours-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.hour-btn {
  padding: 8px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.hour-btn:hover {
  border-color: #000;
}

.hour-btn.selected {
  background: #000;
  color: #fff;
  border-color: #000;
}

.preview-card h3 {
  margin-bottom: 16px;
}

.preview-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-row {
  display: grid;
  grid-template-columns: 1fr 80px 80px;
  gap: 12px;
  padding: 10px 12px;
  background: #f9f9f9;
  border-radius: 8px;
  font-size: 13px;
}

.preview-row.header {
  background: transparent;
  font-weight: 600;
  font-size: 12px;
  color: #6b6b6b;
}

.preview-row.highlight {
  background: #000;
  color: #fff;
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

@media (min-width: 640px) {
  .hours-grid {
    grid-template-columns: repeat(8, 1fr);
  }
}

@media (min-width: 1024px) {
  .surge-page {
    padding: 32px;
  }
  
  .page-header h1 {
    font-size: 28px;
  }
  
  .hours-grid {
    grid-template-columns: repeat(12, 1fr);
  }
}
</style>
