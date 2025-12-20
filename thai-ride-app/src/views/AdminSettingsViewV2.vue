<!--
  AdminSettingsViewV2 - Enhanced Settings Management
  
  Security Features:
  - RBAC permission guards
  - Double confirmation for critical actions
  - Optimistic UI with rollback
  - Rapid toggle protection
  - Audit trail logging
  
  Feature: F23 - Admin Dashboard
-->

<template>
  <AdminLayout>
    <div class="settings-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>ตั้งค่าระบบ</h1>
          <p class="subtitle">จัดการการตั้งค่าแอพพลิเคชัน (Command Center)</p>
        </div>
        <div class="header-actions">
          <PermissionGuard permission="system.audit_log">
            <button class="btn-outline" @click="showAuditLog = true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
              </svg>
              Audit Log
            </button>
          </PermissionGuard>
        </div>
      </div>

      <!-- Success/Error Messages -->
      <Transition name="slide">
        <div v-if="message.text" class="message" :class="message.type">
          <svg v-if="message.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
            <path d="M22 4L12 14.01l-3-3"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
          <span>{{ message.text }}</span>
        </div>
      </Transition>

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

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>กำลังโหลดการตั้งค่า...</span>
      </div>

      <!-- Settings Form -->
      <div v-else class="settings-form">
        <!-- Pricing Section -->
        <PermissionGuard permission="settings.view">
          <div v-show="activeSection === 'pricing'" class="settings-section">
            <h3>ค่าโดยสาร</h3>
            
            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">ค่าเริ่มต้น (Base Fare)</span>
                <span class="setting-desc">ค่าโดยสารเริ่มต้นก่อนคำนวณระยะทาง</span>
              </div>
              <div class="input-group">
                <span class="input-prefix">฿</span>
                <input 
                  type="number" 
                  v-model.number="localSettings.baseFare" 
                  min="0" 
                  :disabled="!canEdit"
                />
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">ค่าต่อกิโลเมตร</span>
                <span class="setting-desc">ค่าโดยสารต่อระยะทาง 1 กม.</span>
              </div>
              <div class="input-group">
                <span class="input-prefix">฿</span>
                <input 
                  type="number" 
                  v-model.number="localSettings.perKmRate" 
                  min="0" 
                  step="0.5"
                  :disabled="!canEdit"
                />
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <span class="setting-label">ค่าโดยสารขั้นต่ำ</span>
                <span class="setting-desc">ค่าโดยสารต่ำสุดที่เรียกเก็บ</span>
              </div>
              <div class="input-group">
                <span class="input-prefix">฿</span>
                <input 
                  type="number" 
                  v-model.number="localSettings.minimumFare" 
                  min="0"
                  :disabled="!canEdit"
                />
              </div>
            </div>
          </div>
        </PermissionGuard>

        <!-- Maintenance Section (Critical) -->
        <PermissionGuard permission="settings.maintenance">
          <div v-show="activeSection === 'maintenance'" class="settings-section">
            <h3>ระบบ (Critical Actions)</h3>
            
            <div class="setting-row critical">
              <div class="setting-info">
                <span class="setting-label">โหมดปิดปรับปรุง</span>
                <span class="setting-desc">ปิดการใช้งานแอพชั่วคราว - ผู้ใช้ทุกคนจะถูกล็อคหน้าจอ</span>
              </div>
              <button 
                class="toggle-btn"
                :class="{ active: localSettings.maintenanceMode }"
                @click="toggleMaintenanceMode"
              >
                <span class="toggle-slider"></span>
                <span class="toggle-label">{{ localSettings.maintenanceMode ? 'เปิด' : 'ปิด' }}</span>
              </button>
            </div>

            <div class="warning-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div>
                <strong>คำเตือน:</strong> การเปิดโหมดปิดปรับปรุงจะส่งผลกระทบต่อผู้ใช้ทุกคนทันที
              </div>
            </div>
          </div>
        </PermissionGuard>
      </div>

      <!-- Actions -->
      <PermissionGuard permission="settings.edit">
        <div class="actions">
          <button class="btn-secondary" @click="handleReset" :disabled="saving">
            รีเซ็ตค่าเริ่มต้น
          </button>
          <button class="btn-primary" @click="saveSettings" :disabled="saving">
            <span v-if="saving" class="btn-spinner"></span>
            {{ saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า' }}
          </button>
        </div>
      </PermissionGuard>

      <!-- Double Confirm Modal -->
      <DoubleConfirmModal
        v-model:visible="showConfirmModal"
        :title="pendingAction?.type === 'maintenance' 
          ? (pendingAction?.data?.enabled ? 'เปิดโหมดปิดปรับปรุง?' : 'ปิดโหมดปิดปรับปรุง?')
          : 'รีเซ็ตการตั้งค่า?'"
        :message="pendingAction?.type === 'maintenance'
          ? (pendingAction?.data?.enabled 
              ? 'ผู้ใช้ทุกคนจะไม่สามารถใช้งานแอพได้จนกว่าจะปิดโหมดนี้'
              : 'ผู้ใช้จะสามารถใช้งานแอพได้ตามปกติ')
          : 'การตั้งค่าทั้งหมดจะถูกรีเซ็ตเป็นค่าเริ่มต้น'"
        :severity="pendingAction?.type === 'maintenance' ? 'critical' : 'high'"
        :requires-double-confirm="true"
        :countdown-seconds="pendingAction?.type === 'maintenance' ? 3 : 0"
        @confirm="handleConfirm"
        @cancel="showConfirmModal = false"
      />
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import PermissionGuard from '../components/admin/PermissionGuard.vue'
import DoubleConfirmModal from '../components/admin/DoubleConfirmModal.vue'
import { useAppSettings } from '../composables/useAppSettings'
import { useAdminRBAC } from '../composables/useAdminRBAC'
import { useAdminCleanup } from '../composables/useAdminCleanup'

// Initialize cleanup utility
const { addCleanup } = useAdminCleanup()

// Composables
const { loading, settings, fetchSettings, updateSettings, resetToDefaults, DEFAULT_SETTINGS } = useAppSettings()
const { 
  can, 
  logAction, 
  executeWithDebounce, 
  executeWithRollback,
  recentAuditLogs,
  requestConfirmation
} = useAdminRBAC()

// State
const localSettings = ref({ ...DEFAULT_SETTINGS })
const saving = ref(false)
const activeSection = ref<'pricing' | 'delivery' | 'provider' | 'general' | 'maintenance'>('pricing')
const showAuditLog = ref(false)
const showConfirmModal = ref(false)
const pendingAction = ref<{ type: string; data?: any } | null>(null)

// Message state
const message = reactive({
  text: '',
  type: 'success' as 'success' | 'error'
})

// Previous settings for rollback
const previousSettings = ref({ ...DEFAULT_SETTINGS })

// Register cleanup for memory optimization
addCleanup(() => {
  localSettings.value = { ...DEFAULT_SETTINGS }
  previousSettings.value = { ...DEFAULT_SETTINGS }
  saving.value = false
  activeSection.value = 'pricing'
  showAuditLog.value = false
  showConfirmModal.value = false
  pendingAction.value = null
  message.text = ''
  console.log('[AdminSettingsViewV2] Cleanup complete')
})

// Sections config
const sections = [
  { id: 'pricing', label: 'ค่าโดยสาร', icon: 'money', permission: 'settings.view' },
  { id: 'delivery', label: 'ส่งของ/ซื้อของ', icon: 'package', permission: 'settings.view' },
  { id: 'provider', label: 'ผู้ให้บริการ', icon: 'user', permission: 'settings.view' },
  { id: 'general', label: 'ทั่วไป', icon: 'settings', permission: 'settings.view' },
  { id: 'maintenance', label: 'ระบบ', icon: 'shield', permission: 'settings.maintenance' }
]

// Computed
const canEdit = computed(() => can('settings.edit'))
const canMaintenance = computed(() => can('settings.maintenance'))

// Methods
const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
  message.text = text
  message.type = type
  setTimeout(() => { message.text = '' }, 4000)
}

const saveSettings = async () => {
  if (!canEdit.value) {
    showMessage('คุณไม่มีสิทธิ์แก้ไขการตั้งค่า', 'error')
    return
  }

  saving.value = true
  
  try {
    await executeWithDebounce('save_settings', async () => {
      await executeWithRollback(
        'update_settings',
        'settings',
        'app_settings',
        // Optimistic update
        () => {
          previousSettings.value = { ...settings.value }
        },
        // Server action
        async () => {
          await updateSettings(localSettings.value)
          return true
        },
        // Rollback
        () => {
          localSettings.value = { ...previousSettings.value }
        }
      )
    })
    
    showMessage('บันทึกการตั้งค่าเรียบร้อย')
    logAction('settings_updated', 'settings', 'app_settings', { 
      changes: getChangedFields() 
    })
  } catch (error: any) {
    showMessage(error.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error')
  } finally {
    saving.value = false
  }
}

const getChangedFields = () => {
  const changes: Record<string, { from: any; to: any }> = {}
  for (const key of Object.keys(localSettings.value) as (keyof typeof localSettings.value)[]) {
    if (localSettings.value[key] !== previousSettings.value[key]) {
      changes[key] = {
        from: previousSettings.value[key],
        to: localSettings.value[key]
      }
    }
  }
  return changes
}

const handleReset = () => {
  pendingAction.value = { type: 'reset' }
  showConfirmModal.value = true
}

const confirmReset = async () => {
  try {
    await resetToDefaults()
    localSettings.value = { ...DEFAULT_SETTINGS }
    showMessage('รีเซ็ตเป็นค่าเริ่มต้นแล้ว')
    logAction('settings_reset', 'settings', 'app_settings')
  } catch (error: any) {
    showMessage(error.message || 'เกิดข้อผิดพลาด', 'error')
  }
  showConfirmModal.value = false
  pendingAction.value = null
}

const toggleMaintenanceMode = async () => {
  if (!canMaintenance.value) {
    showMessage('คุณไม่มีสิทธิ์เปิด/ปิดโหมดปิดปรับปรุง', 'error')
    return
  }

  const newValue = !localSettings.value.maintenanceMode
  
  pendingAction.value = { 
    type: 'maintenance', 
    data: { enabled: newValue } 
  }
  showConfirmModal.value = true
}

const confirmMaintenanceToggle = async () => {
  const newValue = pendingAction.value?.data?.enabled
  
  try {
    await executeWithDebounce('toggle_maintenance', async () => {
      localSettings.value.maintenanceMode = newValue
      await updateSettings(localSettings.value)
      
      // Broadcast to all clients (simulated)
      broadcastMaintenanceMode(newValue)
      
      logAction(
        newValue ? 'maintenance_enabled' : 'maintenance_disabled',
        'settings',
        'maintenance_mode',
        { enabled: newValue }
      )
    })
    
    showMessage(newValue ? 'เปิดโหมดปิดปรับปรุงแล้ว' : 'ปิดโหมดปิดปรับปรุงแล้ว')
  } catch (error: any) {
    showMessage(error.message || 'เกิดข้อผิดพลาด', 'error')
  }
  
  showConfirmModal.value = false
  pendingAction.value = null
}

const broadcastMaintenanceMode = (enabled: boolean) => {
  // In production, this would use WebSocket/Realtime
  // For demo, we'll use localStorage event
  localStorage.setItem('maintenance_mode', enabled ? 'true' : 'false')
  localStorage.setItem('maintenance_broadcast', Date.now().toString())
  
  // Dispatch custom event for same-tab listeners
  window.dispatchEvent(new CustomEvent('maintenance-mode-changed', { 
    detail: { enabled } 
  }))
}

const handleConfirm = () => {
  if (pendingAction.value?.type === 'reset') {
    confirmReset()
  } else if (pendingAction.value?.type === 'maintenance') {
    confirmMaintenanceToggle()
  }
}

// Lifecycle
onMounted(async () => {
  await fetchSettings()
  localSettings.value = { ...settings.value }
  previousSettings.value = { ...settings.value }
})
</script>


<style scoped>
.settings-page {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 16px;
}

.header-content h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 14px;
  color: #666666;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-outline {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-outline:hover {
  border-color: #00A86B;
  color: #00A86B;
}

.btn-outline svg {
  width: 18px;
  height: 18px;
}

/* Messages */
.message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 12px;
  margin-bottom: 20px;
  font-size: 14px;
  font-weight: 500;
}

.message.success {
  background: #E8F5EF;
  color: #00A86B;
}

.message.error {
  background: #FFF5F5;
  color: #E53935;
}

.message svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* Section Tabs */
.section-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  background: #F5F5F5;
  padding: 4px;
  border-radius: 12px;
  overflow-x: auto;
}

.section-tabs button {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: #666666;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.section-tabs button.active {
  background: #FFFFFF;
  color: #1A1A1A;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  gap: 16px;
  color: #666666;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #E8E8E8;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Settings Form */
.settings-form {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #F0F0F0;
}

.settings-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #F0F0F0;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #F5F5F5;
  gap: 20px;
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-row.critical {
  background: #FFF5F5;
  margin: 0 -24px;
  padding: 16px 24px;
  border-radius: 12px;
}

.setting-info {
  flex: 1;
}

.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  margin-bottom: 4px;
}

.setting-desc {
  display: block;
  font-size: 13px;
  color: #666666;
}

.input-group {
  display: flex;
  align-items: center;
  border: 2px solid #E8E8E8;
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.2s;
}

.input-group:focus-within {
  border-color: #00A86B;
}

.input-prefix {
  padding: 10px 14px;
  background: #F5F5F5;
  font-size: 14px;
  color: #666666;
  font-weight: 500;
}

.input-group input {
  width: 100px;
  padding: 10px 14px;
  border: none;
  font-size: 14px;
  text-align: right;
}

.input-group input:focus {
  outline: none;
}

.input-group input:disabled {
  background: #F9F9F9;
  color: #999999;
}

/* Toggle Button */
.toggle-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: #F5F5F5;
  border: 2px solid #E8E8E8;
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.3s;
}

.toggle-btn.active {
  background: #E53935;
  border-color: #E53935;
}

.toggle-slider {
  width: 20px;
  height: 20px;
  background: #FFFFFF;
  border-radius: 50%;
  transition: transform 0.3s;
}

.toggle-btn.active .toggle-slider {
  transform: translateX(4px);
}

.toggle-label {
  font-size: 14px;
  font-weight: 600;
  color: #666666;
}

.toggle-btn.active .toggle-label {
  color: #FFFFFF;
}

/* Warning Box */
.warning-box {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: #FFF8E1;
  border: 1px solid #FFE082;
  border-radius: 12px;
  margin-top: 20px;
}

.warning-box svg {
  width: 20px;
  height: 20px;
  color: #F5A623;
  flex-shrink: 0;
  margin-top: 2px;
}

.warning-box div {
  font-size: 14px;
  color: #666666;
  line-height: 1.5;
}

.warning-box strong {
  color: #1A1A1A;
}

/* Actions */
.actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #F0F0F0;
}

.btn-primary,
.btn-secondary {
  padding: 14px 24px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.btn-primary:hover:not(:disabled) {
  background: #008F5B;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #F5F5F5;
  color: #666666;
  border: none;
}

.btn-secondary:hover:not(:disabled) {
  background: #E8E8E8;
}

.btn-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Transitions */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Responsive */
@media (max-width: 768px) {
  .settings-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
  }

  .setting-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .actions {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
    justify-content: center;
  }
}
</style>
