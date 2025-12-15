<script setup lang="ts">
import { ref } from 'vue'
import { usePWA } from '../composables/usePWA'

const { canInstall, installApp, isOnline, needsUpdate, applyUpdate } = usePWA()
const dismissed = ref(false)

const handleInstall = async () => {
  const installed = await installApp()
  if (installed) dismissed.value = true
}

const dismiss = () => {
  dismissed.value = true
  localStorage.setItem('pwa_banner_dismissed', Date.now().toString())
}

// Check if banner was recently dismissed
const wasDismissed = localStorage.getItem('pwa_banner_dismissed')
if (wasDismissed && Date.now() - parseInt(wasDismissed) < 7 * 24 * 60 * 60 * 1000) {
  dismissed.value = true
}
</script>

<template>
  <!-- Offline Banner -->
  <div v-if="!isOnline" class="offline-banner">
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"/>
    </svg>
    <span>คุณกำลังออฟไลน์ - บางฟีเจอร์อาจไม่พร้อมใช้งาน</span>
  </div>

  <!-- Update Banner -->
  <div v-if="needsUpdate" class="update-banner">
    <span>มีเวอร์ชันใหม่พร้อมใช้งาน</span>
    <button @click="applyUpdate" class="update-btn">อัพเดท</button>
  </div>

  <!-- Install Banner -->
  <div v-if="canInstall && !dismissed" class="install-banner">
    <div class="install-content">
      <div class="install-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
        </svg>
      </div>
      <div class="install-text">
        <strong>ติดตั้ง ThaiRide</strong>
        <span>เพิ่มลงหน้าจอหลักเพื่อเข้าถึงได้เร็วขึ้น</span>
      </div>
    </div>
    <div class="install-actions">
      <button @click="dismiss" class="dismiss-btn">ไม่ใช่ตอนนี้</button>
      <button @click="handleInstall" class="install-btn">ติดตั้ง</button>
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

.update-btn {
  padding: 8px 16px;
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
  padding: 16px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  z-index: 1000;
  animation: slideUp 0.3s ease;
}

.install-content {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.install-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 12px;
}

.install-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.install-text strong {
  font-size: 15px;
  color: #000;
}

.install-text span {
  font-size: 13px;
  color: #6b6b6b;
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
