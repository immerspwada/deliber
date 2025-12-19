<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const trackingId = ref('')
const isSearching = ref(false)
const error = ref('')

// Recent searches from localStorage
const recentSearches = ref<string[]>([])

// Load recent searches
const loadRecentSearches = () => {
  try {
    const saved = localStorage.getItem('tracking_recent_searches')
    if (saved) {
      recentSearches.value = JSON.parse(saved).slice(0, 5)
    }
  } catch {
    recentSearches.value = []
  }
}
loadRecentSearches()

// Save to recent searches
const saveToRecent = (id: string) => {
  const searches = [id, ...recentSearches.value.filter(s => s !== id)].slice(0, 5)
  localStorage.setItem('tracking_recent_searches', JSON.stringify(searches))
  recentSearches.value = searches
}

// Validate tracking ID format
const isValidFormat = computed(() => {
  const id = trackingId.value.trim().toUpperCase()
  if (!id) return true // Empty is ok
  
  // UUID format
  const uuidRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i
  if (uuidRegex.test(id)) return true
  
  // Tracking ID format: XXX-YYYYMMDD-NNNNNN
  const trackingRegex = /^(RID|DEL|SHP|QUE|MOV|LAU)-\d{8}-\d{6}$/
  if (trackingRegex.test(id)) return true
  
  return false
})

const searchOrder = async () => {
  const id = trackingId.value.trim()
  if (!id) {
    error.value = 'กรุณากรอกรหัสติดตาม'
    return
  }
  
  if (!isValidFormat.value) {
    error.value = 'รูปแบบรหัสไม่ถูกต้อง'
    return
  }
  
  error.value = ''
  isSearching.value = true
  
  // Save to recent
  saveToRecent(id.toUpperCase())
  
  // Navigate to tracking page
  router.push(`/tracking/${id.toUpperCase()}`)
}

const searchRecent = (id: string) => {
  trackingId.value = id
  searchOrder()
}

const clearRecent = () => {
  localStorage.removeItem('tracking_recent_searches')
  recentSearches.value = []
}

// Service type info
const serviceTypes = [
  { prefix: 'RID', name: 'เรียกรถ', icon: 'car', color: '#00A86B' },
  { prefix: 'DEL', name: 'ส่งพัสดุ', icon: 'package', color: '#F5A623' },
  { prefix: 'SHP', name: 'ซื้อของ', icon: 'shopping', color: '#E91E63' },
  { prefix: 'QUE', name: 'จองคิว', icon: 'queue', color: '#9C27B0' },
  { prefix: 'MOV', name: 'ขนย้าย', icon: 'truck', color: '#2196F3' },
  { prefix: 'LAU', name: 'ซักผ้า', icon: 'laundry', color: '#00BCD4' }
]
</script>

<template>
  <div class="tracking-landing">
    <!-- Header -->
    <div class="header">
      <div class="logo">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <span class="logo-text">ThaiRide</span>
      </div>
    </div>

    <!-- Hero Section -->
    <div class="hero">
      <div class="hero-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
        </svg>
      </div>
      <h1>ติดตามคำสั่งซื้อ</h1>
      <p>กรอกรหัสติดตามเพื่อดูสถานะการจัดส่งแบบเรียลไทม์</p>
    </div>

    <!-- Search Box -->
    <div class="search-section">
      <div class="search-box" :class="{ 'has-error': error }">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          v-model="trackingId"
          type="text"
          placeholder="กรอกรหัสติดตาม เช่น RID-20251219-000001"
          @keyup.enter="searchOrder"
          :disabled="isSearching"
          class="search-input"
        />
        <button 
          v-if="trackingId" 
          class="clear-btn"
          @click="trackingId = ''; error = ''"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <p v-if="error" class="error-text">{{ error }}</p>
      
      <button 
        class="search-btn" 
        @click="searchOrder"
        :disabled="isSearching || !trackingId.trim()"
      >
        <span v-if="isSearching" class="spinner"></span>
        <span v-else>ค้นหา</span>
      </button>
    </div>

    <!-- Recent Searches -->
    <div v-if="recentSearches.length > 0" class="recent-section">
      <div class="section-header">
        <span class="section-title">ค้นหาล่าสุด</span>
        <button class="clear-all" @click="clearRecent">ล้างทั้งหมด</button>
      </div>
      <div class="recent-list">
        <button 
          v-for="id in recentSearches" 
          :key="id"
          class="recent-item"
          @click="searchRecent(id)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          <span>{{ id }}</span>
        </button>
      </div>
    </div>

    <!-- Service Types Info -->
    <div class="info-section">
      <h3>รูปแบบรหัสติดตาม</h3>
      <div class="service-grid">
        <div 
          v-for="service in serviceTypes" 
          :key="service.prefix"
          class="service-item"
        >
          <div class="service-prefix" :style="{ background: service.color + '15', color: service.color }">
            {{ service.prefix }}
          </div>
          <span class="service-name">{{ service.name }}</span>
        </div>
      </div>
      <p class="format-hint">
        ตัวอย่าง: <code>RID-20251219-000001</code>
      </p>
    </div>

    <!-- Help Section -->
    <div class="help-section">
      <div class="help-card">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div class="help-content">
          <h4>หารหัสติดตามไม่เจอ?</h4>
          <p>รหัสติดตามจะถูกส่งให้คุณทาง SMS หรือ Notification เมื่อสร้างคำสั่งซื้อสำเร็จ</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>© 2025 ThaiRide. All rights reserved.</p>
    </div>
  </div>
</template>

<style scoped>
.tracking-landing {
  min-height: 100vh;
  background: linear-gradient(180deg, #E8F5EF 0%, #FFFFFF 40%);
  font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
  padding: 0 20px;
  padding-bottom: env(safe-area-inset-bottom, 20px);
}

/* Header */
.header {
  padding: 20px 0;
  display: flex;
  justify-content: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: #00A86B;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.logo-icon svg {
  width: 24px;
  height: 24px;
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  color: #1A1A1A;
}

/* Hero */
.hero {
  text-align: center;
  padding: 30px 0 40px;
}

.hero-icon {
  width: 80px;
  height: 80px;
  background: #fff;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  box-shadow: 0 8px 24px rgba(0, 168, 107, 0.15);
}

.hero-icon svg {
  width: 44px;
  height: 44px;
  color: #00A86B;
}

.hero h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 8px;
}

.hero p {
  font-size: 15px;
  color: #666666;
  margin: 0;
}

/* Search Section */
.search-section {
  max-width: 400px;
  margin: 0 auto;
}

.search-box {
  display: flex;
  align-items: center;
  background: #fff;
  border: 2px solid #E8E8E8;
  border-radius: 16px;
  padding: 4px 16px;
  transition: all 0.2s ease;
}

.search-box:focus-within {
  border-color: #00A86B;
  box-shadow: 0 0 0 4px rgba(0, 168, 107, 0.1);
}

.search-box.has-error {
  border-color: #E53935;
}

.search-icon {
  width: 22px;
  height: 22px;
  color: #999999;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 14px 12px;
  font-size: 16px;
  color: #1A1A1A;
  background: transparent;
  font-family: inherit;
}

.search-input::placeholder {
  color: #999999;
}

.clear-btn {
  width: 28px;
  height: 28px;
  background: #F5F5F5;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.clear-btn svg {
  width: 16px;
  height: 16px;
  color: #666666;
}

.error-text {
  color: #E53935;
  font-size: 13px;
  margin: 8px 0 0;
  padding-left: 4px;
}

.search-btn {
  width: 100%;
  padding: 16px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
  transition: all 0.2s ease;
}

.search-btn:hover:not(:disabled) {
  background: #008F5B;
  transform: translateY(-1px);
}

.search-btn:disabled {
  background: #E8E8E8;
  color: #999999;
  box-shadow: none;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Recent Section */
.recent-section {
  max-width: 400px;
  margin: 32px auto 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.clear-all {
  background: none;
  border: none;
  color: #00A86B;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #F0F0F0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.recent-item:hover {
  background: #F5F5F5;
  border-color: #E8E8E8;
}

.recent-item svg {
  width: 18px;
  height: 18px;
  color: #999999;
  flex-shrink: 0;
}

.recent-item span {
  font-size: 14px;
  color: #1A1A1A;
  font-family: monospace;
}

/* Info Section */
.info-section {
  max-width: 400px;
  margin: 40px auto 0;
  text-align: center;
}

.info-section h3 {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 16px;
}

.service-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.service-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.service-prefix {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  font-family: monospace;
}

.service-name {
  font-size: 12px;
  color: #666666;
}

.format-hint {
  margin-top: 16px;
  font-size: 13px;
  color: #999999;
}

.format-hint code {
  background: #F5F5F5;
  padding: 4px 8px;
  border-radius: 6px;
  font-family: monospace;
  color: #1A1A1A;
}

/* Help Section */
.help-section {
  max-width: 400px;
  margin: 40px auto 0;
}

.help-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #FFF9E6;
  border-radius: 16px;
  border: 1px solid #FFE082;
}

.help-card svg {
  width: 24px;
  height: 24px;
  color: #F5A623;
  flex-shrink: 0;
  margin-top: 2px;
}

.help-content h4 {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 4px;
}

.help-content p {
  font-size: 13px;
  color: #666666;
  margin: 0;
  line-height: 1.5;
}

/* Footer */
.footer {
  text-align: center;
  padding: 40px 0 20px;
}

.footer p {
  font-size: 12px;
  color: #999999;
  margin: 0;
}

/* Safe area */
@supports (padding-top: env(safe-area-inset-top)) {
  .header {
    padding-top: calc(20px + env(safe-area-inset-top));
  }
}
</style>
