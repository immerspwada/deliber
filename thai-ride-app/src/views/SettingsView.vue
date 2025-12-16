<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePWA } from '../composables/usePWA'
import { usePushNotifications } from '../composables/usePushNotifications'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const router = useRouter()
const { 
  isInstalled, 
  canInstall, 
  installApp, 
  isOnline,
  notificationPermission,
  requestNotificationPermission,
  checkForUpdates,
  getCacheSize,
  clearAllCaches
} = usePWA()

const {
  isSupported: pushSupported,
  isSubscribed: pushSubscribed,
  isLoading: pushLoading,
  statusText: pushStatusText,
  subscribe: subscribePush,
  unsubscribe: unsubscribePush,
  sendTestNotification,
  initialize: initPush
} = usePushNotifications()

const loading = ref(true)
const cacheInfo = ref({ used: 0, quota: 0, percent: 0 })
const clearingCache = ref(false)
const testingPush = ref(false)

// Settings state
const settings = ref({
  notifications: {
    push: true,
    email: true,
    sms: false,
    promotions: true
  },
  privacy: {
    shareLocation: true,
    shareRideHistory: false
  },
  preferences: {
    language: 'th',
    currency: 'THB'
  }
})

const languages = [
  { code: 'th', name: 'ไทย' },
  { code: 'en', name: 'English' }
]

const currencies = [
  { code: 'THB', name: 'บาท (฿)' },
  { code: 'USD', name: 'US Dollar ($)' }
]

const saveSettings = () => {
  localStorage.setItem('thairide_settings', JSON.stringify(settings.value))
}

onMounted(async () => {
  const saved = localStorage.getItem('thairide_settings')
  if (saved) {
    settings.value = { ...settings.value, ...JSON.parse(saved) }
  }
  
  // Initialize push notifications
  await initPush()
  
  // Get cache size
  cacheInfo.value = await getCacheSize()
  
  setTimeout(() => { loading.value = false }, 500)
})

const goBack = () => router.back()

// PWA functions
const handleInstallApp = async () => {
  await installApp()
}

const handleEnableNotifications = async () => {
  const granted = await requestNotificationPermission()
  if (granted) {
    settings.value.notifications.push = true
    saveSettings()
  }
}

const handleCheckUpdates = async () => {
  await checkForUpdates()
  alert('ตรวจสอบอัพเดทเรียบร้อย')
}

// Push notification functions
const handleTogglePush = async () => {
  if (pushSubscribed.value) {
    await unsubscribePush()
  } else {
    await subscribePush()
  }
}

const handleTestPush = async () => {
  testingPush.value = true
  const success = await sendTestNotification()
  testingPush.value = false
  if (success) {
    alert('ส่งการแจ้งเตือนทดสอบแล้ว')
  } else {
    alert('ไม่สามารถส่งการแจ้งเตือนได้')
  }
}

// Cache management
const handleClearCache = async () => {
  if (!confirm('ต้องการล้างแคชทั้งหมดหรือไม่?')) return
  
  clearingCache.value = true
  await clearAllCaches()
  cacheInfo.value = await getCacheSize()
  clearingCache.value = false
  alert('ล้างแคชเรียบร้อยแล้ว')
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<template>
  <div class="page-container">
    <div class="content-container">
      <!-- Header -->
      <div class="page-header">
        <button @click="goBack" class="back-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>ตั้งค่า</h1>
      </div>

      <!-- Skeleton Loading -->
      <template v-if="loading">
        <SkeletonLoader type="settings" :count="4" />
        <SkeletonLoader type="settings" :count="2" />
        <SkeletonLoader type="settings" :count="2" />
      </template>

      <template v-else>
      <!-- Notifications Section -->
      <div class="settings-section">
        <h2 class="section-title">การแจ้งเตือน</h2>
        
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Push Notification</span>
            <span class="setting-desc">รับการแจ้งเตือนบนอุปกรณ์</span>
          </div>
          <label class="toggle">
            <input v-model="settings.notifications.push" type="checkbox" @change="saveSettings" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">อีเมล</span>
            <span class="setting-desc">รับข่าวสารทางอีเมล</span>
          </div>
          <label class="toggle">
            <input v-model="settings.notifications.email" type="checkbox" @change="saveSettings" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">SMS</span>
            <span class="setting-desc">รับ SMS แจ้งเตือน</span>
          </div>
          <label class="toggle">
            <input v-model="settings.notifications.sms" type="checkbox" @change="saveSettings" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">โปรโมชั่น</span>
            <span class="setting-desc">รับข้อเสนอพิเศษและส่วนลด</span>
          </div>
          <label class="toggle">
            <input v-model="settings.notifications.promotions" type="checkbox" @change="saveSettings" />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Privacy Section -->
      <div class="settings-section">
        <h2 class="section-title">ความเป็นส่วนตัว</h2>
        
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">แชร์ตำแหน่ง</span>
            <span class="setting-desc">อนุญาตให้แอปเข้าถึงตำแหน่ง</span>
          </div>
          <label class="toggle">
            <input v-model="settings.privacy.shareLocation" type="checkbox" @change="saveSettings" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">แชร์ประวัติการเดินทาง</span>
            <span class="setting-desc">เพื่อปรับปรุงบริการ</span>
          </div>
          <label class="toggle">
            <input v-model="settings.privacy.shareRideHistory" type="checkbox" @change="saveSettings" />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Preferences Section -->
      <div class="settings-section">
        <h2 class="section-title">การตั้งค่าทั่วไป</h2>
        
        <div class="setting-item select-item">
          <div class="setting-info">
            <span class="setting-label">ภาษา</span>
          </div>
          <select v-model="settings.preferences.language" @change="saveSettings" class="setting-select">
            <option v-for="lang in languages" :key="lang.code" :value="lang.code">
              {{ lang.name }}
            </option>
          </select>
        </div>

        <div class="setting-item select-item">
          <div class="setting-info">
            <span class="setting-label">สกุลเงิน</span>
          </div>
          <select v-model="settings.preferences.currency" @change="saveSettings" class="setting-select">
            <option v-for="curr in currencies" :key="curr.code" :value="curr.code">
              {{ curr.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Push Notifications Section -->
      <div class="settings-section" v-if="pushSupported">
        <h2 class="section-title">Push Notifications</h2>
        
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">สถานะ Push</span>
            <span class="setting-desc">{{ pushStatusText }}</span>
          </div>
          <button 
            @click="handleTogglePush" 
            :class="['toggle-btn', pushSubscribed ? 'active' : '']"
            :disabled="pushLoading"
          >
            {{ pushLoading ? 'กำลังดำเนินการ...' : (pushSubscribed ? 'ปิด' : 'เปิด') }}
          </button>
        </div>

        <div v-if="pushSubscribed" class="setting-item">
          <div class="setting-info">
            <span class="setting-label">ทดสอบการแจ้งเตือน</span>
            <span class="setting-desc">ส่ง Push notification ทดสอบ</span>
          </div>
          <button @click="handleTestPush" class="test-btn" :disabled="testingPush">
            {{ testingPush ? 'กำลังส่ง...' : 'ทดสอบ' }}
          </button>
        </div>
      </div>

      <!-- PWA Section -->
      <div class="settings-section">
        <h2 class="section-title">แอปพลิเคชัน</h2>
        
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">สถานะการเชื่อมต่อ</span>
            <span class="setting-desc">{{ isOnline ? 'ออนไลน์' : 'ออฟไลน์' }}</span>
          </div>
          <div :class="['status-dot', isOnline ? 'online' : 'offline']"></div>
        </div>

        <div v-if="canInstall && !isInstalled" class="setting-item">
          <div class="setting-info">
            <span class="setting-label">ติดตั้งแอป</span>
            <span class="setting-desc">เพิ่มลงหน้าจอหลัก</span>
          </div>
          <button @click="handleInstallApp" class="install-btn">ติดตั้ง</button>
        </div>

        <div v-if="isInstalled" class="setting-item">
          <div class="setting-info">
            <span class="setting-label">ติดตั้งแล้ว</span>
            <span class="setting-desc">แอปพร้อมใช้งานแบบออฟไลน์</span>
          </div>
          <svg fill="none" stroke="#05944f" viewBox="0 0 24 24" width="24" height="24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        </div>

        <div v-if="notificationPermission !== 'granted'" class="setting-item">
          <div class="setting-info">
            <span class="setting-label">เปิดการแจ้งเตือน</span>
            <span class="setting-desc">รับการแจ้งเตือนแบบ Push</span>
          </div>
          <button @click="handleEnableNotifications" class="enable-btn">เปิด</button>
        </div>

        <!-- Cache Info -->
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">พื้นที่แคช</span>
            <span class="setting-desc">{{ formatBytes(cacheInfo.used) }} / {{ formatBytes(cacheInfo.quota) }} ({{ cacheInfo.percent }}%)</span>
          </div>
          <button @click="handleClearCache" class="clear-btn" :disabled="clearingCache">
            {{ clearingCache ? 'กำลังล้าง...' : 'ล้างแคช' }}
          </button>
        </div>

        <button @click="handleCheckUpdates" class="action-item">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          <span>ตรวจสอบอัพเดท</span>
          <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      <!-- Other Actions -->
      <div class="settings-section">
        <h2 class="section-title">อื่นๆ</h2>
        
        <button class="action-item">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <span>ข้อกำหนดการใช้งาน</span>
          <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>

        <button class="action-item">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
          <span>นโยบายความเป็นส่วนตัว</span>
          <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>

        <button class="action-item">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>เกี่ยวกับ ThaiRide</span>
          <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
      </template>

      <p class="version-text">ThaiRide v1.0.0</p>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
}

.back-btn {
  width: 40px;
  height: 40px;
  background: none;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.back-btn svg {
  width: 24px;
  height: 24px;
}

.page-header h1 {
  font-size: 20px;
  font-weight: 600;
}

.settings-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #6B6B6B;
  margin-bottom: 12px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
  min-height: 64px;
}

.setting-item:hover {
  background: #FAFAFA;
}

.setting-info {
  display: flex;
  flex-direction: column;
}

.setting-label {
  font-size: 15px;
  font-weight: 500;
}

.setting-desc {
  font-size: 12px;
  color: #6B6B6B;
}

/* Toggle Switch */
.toggle {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 32px;
  flex-shrink: 0;
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
  background-color: #E5E5E5;
  border-radius: 28px;
  transition: 0.3s;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: 0.3s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.toggle input:checked + .toggle-slider {
  background-color: #000;
}

.toggle input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

/* Select */
.setting-select {
  padding: 8px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  outline: none;
}

.setting-select:focus {
  border-color: #000;
}

/* Action Items */
.action-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px;
  background: #fff;
  border: none;
  border-radius: 12px;
  margin-bottom: 8px;
  font-size: 15px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  min-height: 56px;
}

.action-item:hover {
  background: #F6F6F6;
}

.action-item:active {
  transform: scale(0.98);
  background: #EBEBEB;
}

.action-item svg {
  width: 22px;
  height: 22px;
}

.action-item span {
  flex: 1;
}

.action-item .chevron {
  width: 18px;
  height: 18px;
  color: #6B6B6B;
}

.version-text {
  text-align: center;
  font-size: 12px;
  color: #6B6B6B;
  margin-top: 24px;
}

/* PWA Styles */
.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-dot.online {
  background: #05944f;
}

.status-dot.offline {
  background: #e11900;
}

.install-btn,
.enable-btn {
  padding: 8px 16px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.install-btn:hover,
.enable-btn:hover {
  background: #333;
}

.toggle-btn {
  padding: 8px 16px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.toggle-btn.active {
  background: #E5E5E5;
  color: #000;
}

.toggle-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.test-btn,
.clear-btn {
  padding: 8px 16px;
  background: #F6F6F6;
  color: #000;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.test-btn:hover,
.clear-btn:hover {
  background: #E5E5E5;
}

.test-btn:disabled,
.clear-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
