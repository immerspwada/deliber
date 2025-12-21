<script setup lang="ts">
/**
 * ProviderNotificationSettingsView - Provider Notification Settings
 * Feature: F07 - Push Notifications (Provider Settings)
 * 
 * ให้ Provider เลือกเปิด/ปิด push notification ตามประเภทงาน
 */
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import ProviderLayout from '../../components/ProviderLayout.vue'
import { useProviderNotificationSettings } from '../../composables/useProviderNotificationSettings'
import { useSoundNotification } from '../../composables/useSoundNotification'
import { usePushNotifications } from '../../composables/usePushNotifications'

const router = useRouter()
const { 
  settings, 
  loading, 
  loadSettings, 
  saveSettings, 
  toggleAllPush,
  resetToDefaults,
  statusText 
} = useProviderNotificationSettings()

const { 
  playJobNotification,
  setVolume
} = useSoundNotification()

const {
  isSupported: pushSupported,
  isSubscribed: pushSubscribed,
  subscribe: subscribePush,
  unsubscribe: unsubscribePush,
  permission: pushPermission
} = usePushNotifications()

const isSaving = ref(false)
const showTestSound = ref(false)

// Job types for settings
const jobTypes = [
  { key: 'pushRide', label: 'เรียกรถ', icon: 'car', soundType: 'ride' as const },
  { key: 'pushDelivery', label: 'ส่งพัสดุ', icon: 'package', soundType: 'delivery' as const },
  { key: 'pushShopping', label: 'ซื้อของ', icon: 'shopping', soundType: 'shopping' as const },
  { key: 'pushQueue', label: 'จองคิว', icon: 'queue', soundType: 'queue' as const },
  { key: 'pushMoving', label: 'ขนย้าย', icon: 'truck', soundType: 'moving' as const },
  { key: 'pushLaundry', label: 'ซักผ้า', icon: 'laundry', soundType: 'laundry' as const },
  { key: 'pushScheduled', label: 'งานจองล่วงหน้า', icon: 'calendar', soundType: 'ride' as const }
]

// Sound types
const soundTypes = [
  { value: 'default', label: 'เสียงมาตรฐาน' },
  { value: 'chime', label: 'เสียงระฆัง' },
  { value: 'bell', label: 'เสียงกระดิ่ง' },
  { value: 'urgent', label: 'เสียงเร่งด่วน' }
]

// Toggle individual job type
const toggleJobType = async (key: string) => {
  isSaving.value = true
  const newValue = !settings.value[key as keyof typeof settings.value]
  await saveSettings({ [key]: newValue })
  isSaving.value = false
}

// Toggle all push notifications
const handleToggleAllPush = async () => {
  isSaving.value = true
  await toggleAllPush(!settings.value.pushEnabled)
  isSaving.value = false
}

// Toggle sound
const toggleSound = async () => {
  isSaving.value = true
  await saveSettings({ soundEnabled: !settings.value.soundEnabled })
  isSaving.value = false
}

// Toggle vibration
const toggleVibration = async () => {
  isSaving.value = true
  await saveSettings({ vibrationEnabled: !settings.value.vibrationEnabled })
  isSaving.value = false
}

// Toggle quiet hours
const toggleQuietHours = async () => {
  isSaving.value = true
  await saveSettings({ quietHoursEnabled: !settings.value.quietHoursEnabled })
  isSaving.value = false
}

// Update volume
const updateVolume = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const newVolume = parseInt(target.value)
  await saveSettings({ soundVolume: newVolume })
  setVolume(newVolume / 100)
}

// Update quiet hours
const updateQuietHours = async (field: 'quietHoursStart' | 'quietHoursEnd', value: string) => {
  await saveSettings({ [field]: value })
}

// Test sound for job type
const testSound = (soundType: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry') => {
  playJobNotification(soundType)
}

// Handle push subscription
const handlePushToggle = async () => {
  if (pushSubscribed.value) {
    await unsubscribePush()
  } else {
    await subscribePush()
  }
}

// Reset to defaults
const handleReset = async () => {
  if (confirm('รีเซ็ตการตั้งค่าทั้งหมดเป็นค่าเริ่มต้น?')) {
    isSaving.value = true
    await resetToDefaults()
    isSaving.value = false
  }
}

onMounted(async () => {
  await loadSettings()
})
</script>

<template>
  <ProviderLayout>
    <div class="settings-page">
      <!-- Header -->
      <div class="page-header">
        <button class="back-btn" @click="router.back()">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>ตั้งค่าการแจ้งเตือน</h1>
        <div class="status-badge" :class="{ active: settings.pushEnabled }">
          {{ statusText }}
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>กำลังโหลด...</p>
      </div>

      <div v-else class="settings-content">
        <!-- Push Notification Section -->
        <section class="settings-section">
          <div class="section-header">
            <h2>Push Notification</h2>
            <p>แจ้งเตือนเมื่อมีงานใหม่แม้ปิดแอป</p>
          </div>

          <!-- Push Permission Status -->
          <div v-if="pushSupported" class="push-status-card">
            <div class="push-info">
              <div class="push-icon" :class="{ active: pushSubscribed }">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
              </div>
              <div>
                <span class="push-label">{{ pushSubscribed ? 'เปิดใช้งานแล้ว' : 'ยังไม่เปิดใช้งาน' }}</span>
                <span v-if="pushPermission === 'denied'" class="push-denied">ถูกปฏิเสธในเบราว์เซอร์</span>
              </div>
            </div>
            <button 
              class="push-toggle-btn"
              :class="{ active: pushSubscribed }"
              @click="handlePushToggle"
              :disabled="pushPermission === 'denied'"
            >
              {{ pushSubscribed ? 'ปิด' : 'เปิด' }}
            </button>
          </div>
          <div v-else class="push-not-supported">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <span>เบราว์เซอร์ไม่รองรับ Push Notification</span>
          </div>

          <!-- Master Toggle -->
          <div class="setting-item master-toggle">
            <div class="setting-info">
              <span class="setting-label">เปิด/ปิดทั้งหมด</span>
              <span class="setting-desc">เปิดหรือปิดการแจ้งเตือนทุกประเภท</span>
            </div>
            <button 
              class="toggle-btn"
              :class="{ active: settings.pushEnabled }"
              @click="handleToggleAllPush"
              :disabled="isSaving"
            >
              <span class="toggle-knob"></span>
            </button>
          </div>

          <!-- Job Type Toggles -->
          <div class="job-types-list" :class="{ disabled: !settings.pushEnabled }">
            <div 
              v-for="job in jobTypes" 
              :key="job.key"
              class="setting-item"
            >
              <div class="setting-info">
                <div class="job-icon">
                  <svg v-if="job.icon === 'car'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h8m-8 5h8m-4-9a9 9 0 110 18 9 9 0 010-18z"/>
                  </svg>
                  <svg v-else-if="job.icon === 'package'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                  </svg>
                  <svg v-else-if="job.icon === 'shopping'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                  </svg>
                  <svg v-else-if="job.icon === 'queue'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                  <svg v-else-if="job.icon === 'truck'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                  </svg>
                  <svg v-else-if="job.icon === 'laundry'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                  <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <span class="setting-label">{{ job.label }}</span>
              </div>
              <div class="setting-actions">
                <button 
                  class="test-sound-btn"
                  @click="testSound(job.soundType)"
                  title="ทดสอบเสียง"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
                  </svg>
                </button>
                <button 
                  class="toggle-btn small"
                  :class="{ active: settings[job.key as keyof typeof settings] }"
                  @click="toggleJobType(job.key)"
                  :disabled="isSaving || !settings.pushEnabled"
                >
                  <span class="toggle-knob"></span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Sound Section -->
        <section class="settings-section">
          <div class="section-header">
            <h2>เสียงแจ้งเตือน</h2>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">เปิดเสียง</span>
            </div>
            <button 
              class="toggle-btn"
              :class="{ active: settings.soundEnabled }"
              @click="toggleSound"
              :disabled="isSaving"
            >
              <span class="toggle-knob"></span>
            </button>
          </div>

          <div class="setting-item" :class="{ disabled: !settings.soundEnabled }">
            <div class="setting-info">
              <span class="setting-label">ระดับเสียง</span>
              <span class="volume-value">{{ settings.soundVolume }}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              :value="settings.soundVolume"
              @change="updateVolume"
              :disabled="!settings.soundEnabled"
              class="volume-slider"
            />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">สั่น</span>
            </div>
            <button 
              class="toggle-btn"
              :class="{ active: settings.vibrationEnabled }"
              @click="toggleVibration"
              :disabled="isSaving"
            >
              <span class="toggle-knob"></span>
            </button>
          </div>
        </section>

        <!-- Quiet Hours Section -->
        <section class="settings-section">
          <div class="section-header">
            <h2>โหมดเงียบ</h2>
            <p>ปิดเสียงและการสั่นในช่วงเวลาที่กำหนด</p>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">เปิดโหมดเงียบ</span>
            </div>
            <button 
              class="toggle-btn"
              :class="{ active: settings.quietHoursEnabled }"
              @click="toggleQuietHours"
              :disabled="isSaving"
            >
              <span class="toggle-knob"></span>
            </button>
          </div>

          <div v-if="settings.quietHoursEnabled" class="quiet-hours-times">
            <div class="time-input">
              <label>เริ่ม</label>
              <input 
                type="time" 
                :value="settings.quietHoursStart"
                @change="(e) => updateQuietHours('quietHoursStart', (e.target as HTMLInputElement).value)"
              />
            </div>
            <div class="time-separator">ถึง</div>
            <div class="time-input">
              <label>สิ้นสุด</label>
              <input 
                type="time" 
                :value="settings.quietHoursEnd"
                @change="(e) => updateQuietHours('quietHoursEnd', (e.target as HTMLInputElement).value)"
              />
            </div>
          </div>
        </section>

        <!-- Reset Button -->
        <button class="reset-btn" @click="handleReset">
          รีเซ็ตเป็นค่าเริ่มต้น
        </button>
      </div>
    </div>
  </ProviderLayout>
</template>

<style scoped>
.settings-page {
  min-height: 100vh;
  background-color: #F5F5F5;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: #FFFFFF;
  border-bottom: 1px solid #E8E8E8;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
}

.back-btn svg {
  width: 24px;
  height: 24px;
  color: #1A1A1A;
}

.page-header h1 {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  background-color: #F0F0F0;
  color: #666666;
}

.status-badge.active {
  background-color: #E8F5EF;
  color: #00A86B;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.settings-content {
  padding: 16px;
  max-width: 480px;
  margin: 0 auto;
}

.settings-section {
  background-color: #FFFFFF;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
}

.section-header {
  margin-bottom: 16px;
}

.section-header h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.section-header p {
  font-size: 13px;
  color: #666666;
  margin: 0;
}

.push-status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background-color: #F6F6F6;
  border-radius: 12px;
  margin-bottom: 16px;
}

.push-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.push-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #E5E5E5;
  border-radius: 10px;
}

.push-icon svg {
  width: 20px;
  height: 20px;
  color: #666666;
}

.push-icon.active {
  background-color: #00A86B;
}

.push-icon.active svg {
  color: white;
}

.push-label {
  font-size: 14px;
  font-weight: 500;
  display: block;
}

.push-denied {
  font-size: 12px;
  color: #E53935;
  display: block;
}

.push-toggle-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background-color: #00A86B;
  color: white;
}

.push-toggle-btn.active {
  background-color: #E5E5E5;
  color: #666666;
}

.push-toggle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.push-not-supported {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: #FEF3C7;
  border-radius: 12px;
  margin-bottom: 16px;
}

.push-not-supported svg {
  width: 20px;
  height: 20px;
  color: #D97706;
}

.push-not-supported span {
  font-size: 13px;
  color: #92400E;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #F0F0F0;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item.master-toggle {
  padding: 16px 0;
  border-bottom: 2px solid #E8E8E8;
  margin-bottom: 8px;
}

.setting-item.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.setting-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.job-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F0F0F0;
  border-radius: 8px;
}

.job-icon svg {
  width: 18px;
  height: 18px;
  color: #666666;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
}

.setting-desc {
  font-size: 12px;
  color: #666666;
  display: block;
}

.setting-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.test-sound-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F0F0F0;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.test-sound-btn svg {
  width: 18px;
  height: 18px;
  color: #666666;
}

.test-sound-btn:active {
  background-color: #E5E5E5;
}

.toggle-btn {
  width: 52px;
  height: 28px;
  background-color: #E5E5E5;
  border: none;
  border-radius: 14px;
  position: relative;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.toggle-btn.small {
  width: 44px;
  height: 24px;
  border-radius: 12px;
}

.toggle-btn.active {
  background-color: #00A86B;
}

.toggle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-btn.small .toggle-knob {
  width: 18px;
  height: 18px;
}

.toggle-btn.active .toggle-knob {
  transform: translateX(24px);
}

.toggle-btn.small.active .toggle-knob {
  transform: translateX(20px);
}

.job-types-list.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.volume-value {
  font-size: 13px;
  color: #00A86B;
  font-weight: 500;
}

.volume-slider {
  width: 120px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #E5E5E5;
  border-radius: 2px;
  outline: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: #00A86B;
  border-radius: 50%;
  cursor: pointer;
}

.volume-slider:disabled {
  opacity: 0.5;
}

.quiet-hours-times {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
}

.time-input {
  flex: 1;
}

.time-input label {
  display: block;
  font-size: 12px;
  color: #666666;
  margin-bottom: 4px;
}

.time-input input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #E8E8E8;
  border-radius: 10px;
  font-size: 14px;
}

.time-input input:focus {
  border-color: #00A86B;
  outline: none;
}

.time-separator {
  font-size: 14px;
  color: #666666;
  padding-top: 20px;
}

.reset-btn {
  width: 100%;
  padding: 14px;
  background-color: transparent;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 14px;
  color: #666666;
  cursor: pointer;
  margin-top: 8px;
}

.reset-btn:active {
  background-color: #F5F5F5;
}
</style>
