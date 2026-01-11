<script setup lang="ts">
/**
 * Provider Dashboard Fallback - Simple Fallback Component
 * MUNEEF Design System Compliant
 * Thai Ride App - Provider Dashboard Fallback
 */

import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    // Simple check
    loading.value = false
  } catch (err) {
    error.value = 'เกิดข้อผิดพลาดในการโหลด'
    loading.value = false
  }
})

function goHome(): void {
  router.push('/')
}

function retry(): void {
  window.location.reload()
}
</script>

<template>
  <div class="provider-fallback">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">กำลังโหลดระบบ Provider...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <div class="error-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
      </div>
      <h2 class="error-title">เกิดข้อผิดพลาด</h2>
      <p class="error-message">{{ error }}</p>
      <div class="error-actions">
        <button @click="retry" class="retry-button">ลองใหม่</button>
        <button @click="goHome" class="home-button">กลับหน้าหลัก</button>
      </div>
    </div>

    <!-- Success State -->
    <div v-else class="success-container">
      <div class="header">
        <div class="logo">
          <div class="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <h1 class="title">Provider System V2</h1>
        </div>
        <p class="subtitle">ระบบผู้ให้บริการใหม่ - MUNEEF Design</p>
      </div>

      <div class="content">
        <div class="status-card">
          <div class="status-header">
            <div class="status-dot"></div>
            <h3 class="status-title">ระบบพร้อมใช้งาน</h3>
          </div>
          <p class="status-description">
            Provider System V2 ถูกสร้างขึ้นใหม่ทั้งหมดตามมาตรฐาน MUNEEF
          </p>
        </div>

        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20m8-9H4"/>
              </svg>
            </div>
            <h4 class="feature-title">รายได้</h4>
            <p class="feature-description">ติดตามรายได้แบบเรียลไทม์</p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            </div>
            <h4 class="feature-title">ประสิทธิภาพ</h4>
            <p class="feature-description">วัดผลการทำงานแบบละเอียด</p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <h4 class="feature-title">การแจ้งเตือน</h4>
            <p class="feature-description">รับแจ้งงานใหม่ทันที</p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <h4 class="feature-title">ติดตามตำแหน่ง</h4>
            <p class="feature-description">GPS แบบเรียลไทม์</p>
          </div>
        </div>

        <div class="actions">
          <button @click="retry" class="primary-button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            โหลดระบบใหม่
          </button>
          <button @click="goHome" class="secondary-button">
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.provider-fallback {
  min-height: 100vh;
  background: linear-gradient(135deg, #f6f9fc 0%, #ffffff 100%);
  font-family: "Sarabun", -apple-system, BlinkMacSystemFont, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

/* Loading State */
.loading-container {
  text-align: center;
}

.loading-spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid #e5e5e5;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}

.loading-text {
  color: #666666;
  font-size: 0.875rem;
}

/* Error State */
.error-container {
  text-align: center;
  max-width: 400px;
}

.error-icon {
  width: 4rem;
  height: 4rem;
  color: #e11900;
  margin: 0 auto 1rem;
}

.error-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 0.5rem;
}

.error-message {
  color: #666666;
  margin-bottom: 2rem;
  line-height: 1.5;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* Success State */
.success-container {
  max-width: 600px;
  width: 100%;
}

.header {
  text-align: center;
  margin-bottom: 3rem;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.logo-icon {
  width: 3rem;
  height: 3rem;
  background: linear-gradient(135deg, #00a86b, #008f5b);
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.subtitle {
  color: #666666;
  font-size: 1rem;
  margin: 0;
}

.status-card {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 2px solid #00a86b;
  margin-bottom: 2rem;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.status-dot {
  width: 0.75rem;
  height: 0.75rem;
  background: #00a86b;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.status-description {
  color: #666666;
  line-height: 1.5;
  margin: 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.feature-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.25rem;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.feature-icon {
  width: 2rem;
  height: 2rem;
  color: #00a86b;
  margin: 0 auto 0.75rem;
}

.feature-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 0.5rem 0;
}

.feature-description {
  font-size: 0.75rem;
  color: #666666;
  margin: 0;
  line-height: 1.4;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* Buttons */
.retry-button,
.home-button,
.primary-button,
.secondary-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.retry-button,
.primary-button {
  background: #00a86b;
  color: white;
}

.retry-button:hover,
.primary-button:hover {
  background: #008f5b;
  transform: translateY(-1px);
}

.home-button,
.secondary-button {
  background: #f6f6f6;
  color: #666666;
}

.home-button:hover,
.secondary-button:hover {
  background: #e8e8e8;
}

.primary-button svg {
  width: 1rem;
  height: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(0, 168, 107, 0.4);
  }
  50% {
    opacity: 0.8;
    box-shadow: 0 0 0 4px rgba(0, 168, 107, 0);
  }
}

/* Responsive Design */
@media (max-width: 480px) {
  .provider-fallback {
    padding: 0.75rem;
  }
  
  .title {
    font-size: 1.5rem;
  }
  
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .actions {
    flex-direction: column;
  }
  
  .error-actions {
    flex-direction: column;
  }
}
</style>