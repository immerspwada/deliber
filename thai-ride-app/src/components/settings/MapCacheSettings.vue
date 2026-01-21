<script setup lang="ts">
/**
 * Map Cache Settings Component
 * Allows users to manage offline map cache
 */
import { ref, onMounted } from 'vue'
import { getTileCacheManager } from '@/services/tileCacheManager'
import { getTilePreloader } from '@/services/mapTilePreloader'
import type { CacheStats, PreloadProgress } from '@/types/map'

const emit = defineEmits<{
  'cache-cleared': []
}>()

// State
const cacheStats = ref<CacheStats | null>(null)
const isLoading = ref(false)
const isClearing = ref(false)
const isDownloading = ref(false)
const downloadProgress = ref<PreloadProgress | null>(null)
const error = ref<string | null>(null)

// Services
const cacheManager = getTileCacheManager()
const preloader = getTilePreloader()

// Load cache stats
async function loadStats(): Promise<void> {
  isLoading.value = true
  error.value = null
  
  try {
    await cacheManager.init()
    cacheStats.value = await cacheManager.getStats()
  } catch (e) {
    error.value = 'ไม่สามารถโหลดข้อมูลแคชได้'
    console.error('[MapCacheSettings] Error loading stats:', e)
  } finally {
    isLoading.value = false
  }
}

// Clear cache
async function clearCache(): Promise<void> {
  if (!confirm('ต้องการลบแคชแผนที่ทั้งหมดหรือไม่?')) return
  
  isClearing.value = true
  error.value = null
  
  try {
    await cacheManager.clear()
    await loadStats()
    emit('cache-cleared')
  } catch (e) {
    error.value = 'ไม่สามารถลบแคชได้'
    console.error('[MapCacheSettings] Error clearing cache:', e)
  } finally {
    isClearing.value = false
  }
}

// Download offline maps for current location
async function downloadCurrentArea(): Promise<void> {
  if (isDownloading.value) {
    preloader.cancel()
    isDownloading.value = false
    return
  }

  isDownloading.value = true
  error.value = null
  downloadProgress.value = null

  try {
    // Get current location
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000
      })
    })

    const { latitude, longitude } = position.coords

    // Start preloading
    await preloader.preloadArea(
      latitude, 
      longitude, 
      5, // 5km radius
      (progress) => {
        downloadProgress.value = progress
      }
    )

    // Refresh stats
    await loadStats()
    
  } catch (e) {
    if ((e as GeolocationPositionError).code === 1) {
      error.value = 'กรุณาอนุญาตการเข้าถึงตำแหน่ง'
    } else {
      error.value = 'ไม่สามารถดาวน์โหลดแผนที่ได้'
    }
    console.error('[MapCacheSettings] Error downloading:', e)
  } finally {
    isDownloading.value = false
  }
}

// Format bytes to human readable
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Format date
function formatDate(date: Date | null): string {
  if (!date) return '-'
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Lifecycle
onMounted(() => {
  loadStats()
})
</script>

<template>
  <div class="map-cache-settings">
    <div class="settings-header">
      <div class="header-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>
      <div class="header-text">
        <h3>แคชแผนที่ออฟไลน์</h3>
        <p>ดาวน์โหลดแผนที่เพื่อใช้งานแบบไม่ต้องเชื่อมต่ออินเทอร์เน็ต</p>
      </div>
    </div>

    <!-- Error message -->
    <div v-if="error" class="error-message">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{{ error }}</span>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <span>กำลังโหลด...</span>
    </div>

    <!-- Cache stats -->
    <div v-else-if="cacheStats" class="cache-stats">
      <div class="stat-item">
        <span class="stat-label">ขนาดแคช</span>
        <span class="stat-value">{{ formatSize(cacheStats.sizeBytes) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">จำนวน Tiles</span>
        <span class="stat-value">{{ cacheStats.tileCount.toLocaleString() }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">อัพเดทล่าสุด</span>
        <span class="stat-value">{{ formatDate(cacheStats.newestTile) }}</span>
      </div>
    </div>

    <!-- Download progress -->
    <div v-if="downloadProgress && isDownloading" class="download-progress">
      <div class="progress-header">
        <span>กำลังดาวน์โหลด...</span>
        <span>{{ downloadProgress.percentage }}%</span>
      </div>
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${downloadProgress.percentage}%` }"
        ></div>
      </div>
      <div class="progress-detail">
        {{ downloadProgress.loaded }}/{{ downloadProgress.total }} tiles
        <span v-if="downloadProgress.failed > 0" class="failed-count">
          ({{ downloadProgress.failed }} ล้มเหลว)
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions">
      <button 
        type="button"
        class="action-btn download-btn"
        :disabled="isClearing"
        @click="downloadCurrentArea"
      >
        <svg v-if="!isDownloading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="6" width="12" height="12" />
        </svg>
        <span>{{ isDownloading ? 'หยุดดาวน์โหลด' : 'ดาวน์โหลดพื้นที่ปัจจุบัน' }}</span>
      </button>

      <button 
        type="button"
        class="action-btn clear-btn"
        :disabled="isClearing || isDownloading || !cacheStats?.tileCount"
        @click="clearCache"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        <span>{{ isClearing ? 'กำลังลบ...' : 'ล้างแคช' }}</span>
      </button>
    </div>

    <!-- Info -->
    <div class="info-text">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      <span>แคชจะถูกลบอัตโนมัติหลัง 7 วัน หรือเมื่อเกิน 100MB</span>
    </div>
  </div>
</template>

<style scoped>
.map-cache-settings {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #f0f0f0;
}

.settings-header {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.header-icon {
  width: 44px;
  height: 44px;
  background: #eff6ff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-icon svg {
  width: 22px;
  height: 22px;
  color: #3b82f6;
}

.header-text h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111;
  margin: 0 0 4px 0;
}

.header-text p {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #fef2f2;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #dc2626;
}

.error-message svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  color: #6b7280;
  font-size: 14px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.cache-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
  padding: 12px;
  background: #f9fafb;
  border-radius: 10px;
}

.stat-label {
  display: block;
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #111;
}

.download-progress {
  margin-bottom: 16px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 10px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #0369a1;
  margin-bottom: 8px;
}

.progress-bar {
  height: 6px;
  background: #e0f2fe;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #0ea5e9;
  border-radius: 3px;
  transition: width 0.3s;
}

.progress-detail {
  font-size: 12px;
  color: #6b7280;
  margin-top: 6px;
}

.failed-count {
  color: #dc2626;
}

.actions {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn svg {
  width: 18px;
  height: 18px;
}

.download-btn {
  background: #3b82f6;
  color: #fff;
}

.download-btn:not(:disabled):active {
  background: #2563eb;
  transform: scale(0.98);
}

.clear-btn {
  background: #f3f4f6;
  color: #374151;
}

.clear-btn:not(:disabled):active {
  background: #e5e7eb;
  transform: scale(0.98);
}

.info-text {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: #9ca3af;
}

.info-text svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-top: 1px;
}
</style>
