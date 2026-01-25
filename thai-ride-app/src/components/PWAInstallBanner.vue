<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { usePWA } from '../composables/usePWA'

const { 
  canInstall, 
  installApp, 
  isOnline, 
  needsUpdate, 
  applyUpdate,
  isInstalled,
  pendingActionsCount,
  syncPendingActions
} = usePWA()

const dismissed = ref(false)
const showOfflineReady = ref(false)
const showSyncStatus = ref(false)

const handleInstall = async () => {
  const installed = await installApp()
  if (installed) dismissed.value = true
}

const dismiss = () => {
  dismissed.value = true
  localStorage.setItem('pwa_banner_dismissed', Date.now().toString())
}

const dismissOfflineReady = () => {
  showOfflineReady.value = false
}

const handleUpdate = () => {
  applyUpdate()
  // Also dispatch event for main.ts handler
  window.dispatchEvent(new CustomEvent('pwa-update-request'))
}

const handleSync = async () => {
  showSyncStatus.value = true
  await syncPendingActions()
  setTimeout(() => {
    showSyncStatus.value = false
  }, 2000)
}

// Event handlers
const onOfflineReady = () => {
  showOfflineReady.value = true
  setTimeout(() => {
    showOfflineReady.value = false
  }, 5000)
}

const onUpdateAvailable = () => {
  needsUpdate.value = true
}

// Check if banner was recently dismissed
onMounted(() => {
  const wasDismissed = localStorage.getItem('pwa_banner_dismissed')
  if (wasDismissed && Date.now() - parseInt(wasDismissed) < 7 * 24 * 60 * 60 * 1000) {
    dismissed.value = true
  }
  
  // Listen for PWA events
  window.addEventListener('pwa-offline-ready', onOfflineReady)
  window.addEventListener('pwa-update-available', onUpdateAvailable)
})

onUnmounted(() => {
  window.removeEventListener('pwa-offline-ready', onOfflineReady)
  window.removeEventListener('pwa-update-available', onUpdateAvailable)
})
</script>

<template>
  <!-- Offline Banner -->
  <div v-if="!isOnline" class="offline-banner">
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
      <path
        stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
      />
    </svg>
    <span>คุณกำลังออฟไลน์ - บางฟีเจอร์อาจไม่พร้อมใช้งาน</span>
    <button v-if="pendingActionsCount > 0" class="sync-btn" :disabled="showSyncStatus" @click="handleSync">
      {{ showSyncStatus ? 'กำลังซิงค์...' : `${pendingActionsCount} รายการรอซิงค์` }}
    </button>
  </div>

  <!-- Back Online Banner -->
  <div v-if="isOnline && pendingActionsCount > 0" class="sync-banner">
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
      <path
        stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
    <span>มี {{ pendingActionsCount }} รายการรอซิงค์</span>
    <button class="sync-action-btn" :disabled="showSyncStatus" @click="handleSync">
      {{ showSyncStatus ? 'กำลังซิงค์...' : 'ซิงค์เลย' }}
    </button>
  </div>

  <!-- Offline Ready Banner -->
  <div v-if="showOfflineReady" class="offline-ready-banner">
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
      <path
        stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
    <span>แอปพร้อมใช้งานแบบออฟไลน์แล้ว</span>
    <button class="dismiss-icon-btn" @click="dismissOfflineReady">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>
  </div>

  <!-- Update Banner -->
  <div v-if="needsUpdate" class="update-banner">
    <div class="update-content">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
        <path
          stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      <span>มีเวอร์ชันใหม่พร้อมใช้งาน</span>
    </div>
    <button class="update-btn" @click="handleUpdate">อัพเดท</button>
  </div>

  <!-- Install Banner -->
  <div v-if="canInstall && !dismissed && !isInstalled" class="install-banner">
    <div class="install-content">
      <div class="install-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="28" height="28">
          <path
            stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      </div>
      <div class="install-text">
        <strong>ติดตั้ง GOBEAR</strong>
        <span>เพิ่มลงหน้าจอหลักเพื่อเข้าถึงได้เร็วขึ้น</span>
      </div>
    </div>
    <div class="install-features">
      <div class="feature-item">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        <span>เปิดได้ทันทีจากหน้าจอหลัก</span>
      </div>
      <div class="feature-item">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        <span>ใช้งานได้แม้ไม่มีอินเทอร์เน็ต</span>
      </div>
      <div class="feature-item">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        <span>รับการแจ้งเตือนแบบเรียลไทม์</span>
      </div>
    </div>
    <div class="install-actions">
      <button class="dismiss-btn" @click="dismiss">ไม่ใช่ตอนนี้</button>
      <button class="install-btn" @click="handleInstall">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
          <path
            stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        ติดตั้ง
      </button>
    </div>
  </div>
</template>

<style scoped>
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: #1a1a1a;
  color: #fff;
  font-size: 13px;
  z-index: 1000;
  animation: slideDown 0.3s ease;
}

.sync-btn {
  padding: 6px 12px;
  background: rgba(255,255,255,0.2);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  margin-left: 8px;
}

.sync-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sync-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: #276EF1;
  color: #fff;
  font-size: 13px;
  z-index: 1000;
  animation: slideDown 0.3s ease;
}

.sync-action-btn {
  padding: 6px 12px;
  background: #fff;
  color: #276EF1;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  margin-left: 8px;
}

.sync-action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.offline-ready-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: #0D7C66;
  color: #fff;
  font-size: 13px;
  z-index: 1000;
  animation: slideDown 0.3s ease;
}

.dismiss-icon-btn {
  padding: 4px;
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  margin-left: 8px;
  opacity: 0.8;
}

.dismiss-icon-btn:hover {
  opacity: 1;
}

.update-banner {
  position: fixed;
  bottom: 80px;
  left: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #000;
  color: #fff;
  border-radius: 12px;
  font-size: 14px;
  z-index: 1000;
  animation: slideUp 0.3s ease;
}

.update-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.update-btn {
  padding: 10px 20px;
  background: #fff;
  color: #000;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.install-banner {
  position: fixed;
  bottom: 80px;
  left: 16px;
  right: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.15);
  z-index: 1000;
  animation: slideUp 0.3s ease;
}

.install-content {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.install-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 14px;
  flex-shrink: 0;
}

.install-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.install-text strong {
  font-size: 16px;
  color: #000;
}

.install-text span {
  font-size: 13px;
  color: #6b6b6b;
}

.install-features {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 10px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #333;
}

.feature-item svg {
  color: #0D7C66;
  flex-shrink: 0;
}

.install-actions {
  display: flex;
  gap: 12px;
}

.dismiss-btn {
  flex: 1;
  padding: 14px;
  background: #f6f6f6;
  color: #000;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.install-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

@keyframes slideDown {
  from { transform: translateY(-100%); }
  to { transform: translateY(0); }
}

@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
