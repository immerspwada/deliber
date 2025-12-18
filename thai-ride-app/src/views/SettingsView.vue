<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePWA } from '../composables/usePWA'
import { usePushNotifications } from '../composables/usePushNotifications'
import { useBackgroundSync } from '../composables/useBackgroundSync'
import { precacheSungaiKolokTiles, getTileCacheStats } from '../composables/useLeafletMap'
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

const {
  pendingCount,
  isSyncing,
  lastSyncResult,
  formatLastSyncTime,
  processQueue,
  clearQueue,
  syncHistory,
  clearSyncHistory,
  conflicts,
  resolveConflict,
  dismissConflict
} = useBackgroundSync()

const showSyncHistory = ref(false)
const showConflicts = ref(false)

const loading = ref(true)
const cacheInfo = ref({ used: 0, quota: 0, percent: 0 })
const clearingCache = ref(false)
const testingPush = ref(false)

// Offline map state
const offlineMapStats = ref({ count: 0, size: 0, sizeFormatted: '0 B' })
const downloadingMap = ref(false)
const downloadProgress = ref(0)
const downloadTotal = ref(0)

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
  localStorage.setItem('gobear_settings', JSON.stringify(settings.value))
}

onMounted(async () => {
  const saved = localStorage.getItem('gobear_settings')
  if (saved) {
    settings.value = { ...settings.value, ...JSON.parse(saved) }
  }
  
  // Initialize push notifications
  await initPush()
  
  // Get cache size
  cacheInfo.value = await getCacheSize()
  
  // Get offline map stats
  offlineMapStats.value = await getTileCacheStats()
  
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
  offlineMapStats.value = await getTileCacheStats()
  clearingCache.value = false
  alert('ล้างแคชเรียบร้อยแล้ว')
}

// Offline map download
const handleDownloadOfflineMap = async () => {
  if (downloadingMap.value) return
  
  downloadingMap.value = true
  downloadProgress.value = 0
  downloadTotal.value = 0
  
  try {
    const result = await precacheSungaiKolokTiles((progress, total) => {
      downloadProgress.value = progress
      downloadTotal.value = total
    })
    
    if (result.success) {
      offlineMapStats.value = await getTileCacheStats()
      alert(`ดาวน์โหลดแผนที่สำเร็จ! (${result.cached} tiles)`)
    } else {
      alert('ไม่สามารถดาวน์โหลดแผนที่ได้')
    }
  } catch (err) {
    console.error('Download error:', err)
    alert('เกิดข้อผิดพลาดในการดาวน์โหลด')
  } finally {
    downloadingMap.value = false
    downloadProgress.value = 0
    downloadTotal.value = 0
  }
}

// Sync management
const handleManualSync = async () => {
  await processQueue()
}

const handleClearSyncQueue = () => {
  if (!confirm('ต้องการล้างคิวซิงค์ทั้งหมดหรือไม่? ข้อมูลที่ยังไม่ได้ซิงค์จะหายไป')) return
  clearQueue()
  alert('ล้างคิวซิงค์เรียบร้อยแล้ว')
}

// Sync history
const handleClearHistory = () => {
  if (!confirm('ต้องการล้างประวัติการซิงค์ทั้งหมดหรือไม่?')) return
  clearSyncHistory()
}

const formatHistoryTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleString('th-TH', { 
    day: '2-digit', 
    month: 'short', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// Conflict resolution
const handleResolveConflict = async (conflictId: string, resolution: 'local' | 'server' | 'merge') => {
  await resolveConflict(conflictId, resolution)
}

const handleDismissConflict = (conflictId: string) => {
  if (!confirm('ต้องการยกเลิกข้อขัดแย้งนี้หรือไม่?')) return
  dismissConflict(conflictId)
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

      <!-- Sync Status Section -->
      <div class="settings-section">
        <h2 class="section-title">สถานะการซิงค์</h2>
        
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">รายการรอซิงค์</span>
            <span class="setting-desc">{{ pendingCount }} รายการ</span>
          </div>
          <div :class="['sync-badge', pendingCount > 0 ? 'pending' : 'synced']">
            {{ pendingCount > 0 ? 'รอซิงค์' : 'ซิงค์แล้ว' }}
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">ซิงค์ล่าสุด</span>
            <span class="setting-desc">{{ formatLastSyncTime() }}</span>
          </div>
          <span v-if="lastSyncResult" class="sync-result">
            <svg v-if="lastSyncResult.failed === 0" fill="none" stroke="#05944f" viewBox="0 0 24 24" width="18" height="18">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <svg v-else fill="none" stroke="#e11900" viewBox="0 0 24 24" width="18" height="18">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </span>
        </div>

        <div v-if="pendingCount > 0" class="setting-item sync-actions-container">
          <div class="sync-actions">
            <button @click="handleManualSync" class="sync-btn" :disabled="isSyncing || !isOnline">
              <svg v-if="isSyncing" class="spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <span>{{ isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ตอนนี้' }}</span>
            </button>
            <button @click="handleClearSyncQueue" class="clear-sync-btn">
              ล้างคิว
            </button>
          </div>
        </div>

        <!-- Conflicts Alert -->
        <div v-if="conflicts.length > 0" class="setting-item conflict-alert" @click="showConflicts = true">
          <div class="setting-info">
            <span class="setting-label">ข้อมูลขัดแย้ง</span>
            <span class="setting-desc">{{ conflicts.length }} รายการต้องการการตัดสินใจ</span>
          </div>
          <svg fill="none" stroke="#E65100" viewBox="0 0 24 24" width="20" height="20">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>

        <!-- Sync History Button -->
        <button class="action-item" @click="showSyncHistory = true">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>ประวัติการซิงค์</span>
          <span v-if="syncHistory.length > 0" class="history-count">{{ syncHistory.length }}</span>
          <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      <!-- Sync History Modal -->
      <Teleport to="body">
        <div v-if="showSyncHistory" class="modal-overlay" @click.self="showSyncHistory = false">
          <div class="modal-content">
            <div class="modal-header">
              <h3>ประวัติการซิงค์</h3>
              <button @click="showSyncHistory = false" class="close-btn">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div v-if="syncHistory.length === 0" class="empty-state">
                <p>ยังไม่มีประวัติการซิงค์</p>
              </div>
              <div v-else class="history-list">
                <div v-for="entry in [...syncHistory].reverse()" :key="entry.id" class="history-item">
                  <div class="history-icon" :class="entry.status">
                    <svg v-if="entry.status === 'success'" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    <svg v-else-if="entry.status === 'failed'" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01"/>
                    </svg>
                  </div>
                  <div class="history-info">
                    <span class="history-message">{{ entry.message }}</span>
                    <span class="history-time">{{ formatHistoryTime(entry.timestamp) }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="syncHistory.length > 0" class="modal-footer">
              <button @click="handleClearHistory" class="clear-history-btn">ล้างประวัติ</button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Conflicts Modal -->
      <Teleport to="body">
        <div v-if="showConflicts" class="modal-overlay" @click.self="showConflicts = false">
          <div class="modal-content">
            <div class="modal-header">
              <h3>ข้อมูลขัดแย้ง</h3>
              <button @click="showConflicts = false" class="close-btn">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div v-if="conflicts.length === 0" class="empty-state">
                <p>ไม่มีข้อมูลขัดแย้ง</p>
              </div>
              <div v-else class="conflict-list">
                <div v-for="conflict in conflicts" :key="conflict.id" class="conflict-item">
                  <div class="conflict-header">
                    <span class="conflict-type">{{ conflict.type }}</span>
                    <span class="conflict-time">{{ formatHistoryTime(conflict.createdAt) }}</span>
                  </div>
                  <div class="conflict-data">
                    <div class="data-section">
                      <span class="data-label">ข้อมูล Local:</span>
                      <pre class="data-preview">{{ JSON.stringify(conflict.localData, null, 2).slice(0, 100) }}...</pre>
                    </div>
                    <div class="data-section">
                      <span class="data-label">ข้อมูล Server:</span>
                      <pre class="data-preview">{{ JSON.stringify(conflict.serverData, null, 2).slice(0, 100) }}...</pre>
                    </div>
                  </div>
                  <div class="conflict-actions">
                    <button @click="handleResolveConflict(conflict.id, 'local')" class="resolve-btn local">
                      ใช้ Local
                    </button>
                    <button @click="handleResolveConflict(conflict.id, 'server')" class="resolve-btn server">
                      ใช้ Server
                    </button>
                    <button @click="handleDismissConflict(conflict.id)" class="resolve-btn dismiss">
                      ยกเลิก
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

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

        <!-- Offline Map Section -->
        <div class="setting-item offline-map-item">
          <div class="setting-info">
            <span class="setting-label">แผนที่ออฟไลน์</span>
            <span class="setting-desc">
              อ.สุไหงโกลก จ.นราธิวาส
              <span v-if="offlineMapStats.count > 0" class="map-cached">
                ({{ offlineMapStats.sizeFormatted }})
              </span>
            </span>
          </div>
          <button 
            @click="handleDownloadOfflineMap" 
            :class="['download-map-btn', { downloading: downloadingMap }]"
            :disabled="downloadingMap"
          >
            <svg v-if="!downloadingMap" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            <svg v-else class="spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span v-if="downloadingMap">{{ downloadProgress }}/{{ downloadTotal }}</span>
            <span v-else>{{ offlineMapStats.count > 0 ? 'อัพเดท' : 'ดาวน์โหลด' }}</span>
          </button>
        </div>
        
        <!-- Download progress bar -->
        <div v-if="downloadingMap" class="download-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: downloadTotal > 0 ? (downloadProgress / downloadTotal * 100) + '%' : '0%' }"></div>
          </div>
          <span class="progress-text">กำลังดาวน์โหลดแผนที่... {{ Math.round(downloadProgress / downloadTotal * 100) || 0 }}%</span>
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
          <span>เกี่ยวกับ GOBEAR</span>
          <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
      </template>

      <p class="version-text">GOBEAR v1.0.0</p>
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
  background-color: #00A86B;
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
  border-color: #00A86B;
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
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.install-btn:hover,
.enable-btn:hover {
  background: #008F5B;
}

.toggle-btn {
  padding: 8px 16px;
  background: #00A86B;
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

/* Sync Status Styles */
.sync-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.sync-badge.synced {
  background: #E8F5E9;
  color: #05944f;
}

.sync-badge.pending {
  background: #FFF3E0;
  color: #E65100;
}

.sync-result {
  display: flex;
  align-items: center;
}

.sync-actions-container {
  padding: 16px;
}

.sync-actions {
  display: flex;
  gap: 8px;
  width: 100%;
}

.sync-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.sync-btn:hover {
  background: #008F5B;
}

.sync-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.clear-sync-btn {
  padding: 12px 16px;
  background: #F6F6F6;
  color: #000;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.clear-sync-btn:hover {
  background: #E5E5E5;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spin {
  animation: spin 1s linear infinite;
}

/* History count badge */
.history-count {
  background: #E5E5E5;
  color: #000;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
}

/* Conflict alert */
.conflict-alert {
  background: #FFF3E0 !important;
  border: 1px solid #FFE0B2;
  cursor: pointer;
}

/* Modal styles */
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
  background: #fff;
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #E5E5E5;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #E5E5E5;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #6B6B6B;
}

/* History list */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #F6F6F6;
  border-radius: 8px;
}

.history-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.history-icon.success {
  background: #E8F5E9;
  color: #05944f;
}

.history-icon.failed {
  background: #FFEBEE;
  color: #e11900;
}

.history-icon.conflict {
  background: #FFF3E0;
  color: #E65100;
}

.history-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history-message {
  font-size: 14px;
  color: #000;
}

.history-time {
  font-size: 12px;
  color: #6B6B6B;
}

.clear-history-btn {
  width: 100%;
  padding: 12px;
  background: #F6F6F6;
  color: #000;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.clear-history-btn:hover {
  background: #E5E5E5;
}

/* Conflict list */
.conflict-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.conflict-item {
  background: #F6F6F6;
  border-radius: 12px;
  padding: 16px;
}

.conflict-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.conflict-type {
  font-size: 14px;
  font-weight: 600;
  text-transform: capitalize;
}

.conflict-time {
  font-size: 12px;
  color: #6B6B6B;
}

.conflict-data {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.data-section {
  background: #fff;
  border-radius: 8px;
  padding: 8px 12px;
}

.data-label {
  font-size: 12px;
  color: #6B6B6B;
  display: block;
  margin-bottom: 4px;
}

.data-preview {
  font-size: 11px;
  color: #000;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 60px;
  overflow: hidden;
}

.conflict-actions {
  display: flex;
  gap: 8px;
}

.resolve-btn {
  flex: 1;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.resolve-btn.local {
  background: #00A86B;
  color: #fff;
}

.resolve-btn.server {
  background: #276EF1;
  color: #fff;
}

.resolve-btn.dismiss {
  background: #E5E5E5;
  color: #000;
}

/* Offline Map Styles */
.offline-map-item {
  flex-wrap: wrap;
}

.map-cached {
  color: #05944f;
  font-weight: 500;
}

.download-map-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.download-map-btn:hover:not(:disabled) {
  background: #008F5B;
}

.download-map-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.download-map-btn.downloading {
  background: #276EF1;
}

.download-progress {
  width: 100%;
  padding: 12px 16px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 8px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #E5E5E5;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: #00A86B;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #6B6B6B;
}
</style>
