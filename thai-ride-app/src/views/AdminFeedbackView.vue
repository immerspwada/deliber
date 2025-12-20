<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useCustomerFeedback, type FeedbackType, type CustomerFeedback } from '../composables/useCustomerFeedback'
import { useAdminCleanup } from '../composables/useAdminCleanup'

const { addCleanup } = useAdminCleanup()

const { 
  loading, 
  feedbackList, 
  stats, 
  getAllFeedback, 
  respondToFeedback, 
  getFeedbackStats 
} = useCustomerFeedback()

// Filters
const filterType = ref<FeedbackType | ''>('')
const filterResolved = ref<'all' | 'resolved' | 'pending'>('all')
const filterRating = ref<number | null>(null)

// Modal state
const showResponseModal = ref(false)
const selectedFeedback = ref<CustomerFeedback | null>(null)
const responseText = ref('')
const isSubmitting = ref(false)

// Filtered feedback
const filteredFeedback = computed(() => {
  let result = feedbackList.value

  if (filterType.value) {
    result = result.filter(f => f.type === filterType.value)
  }

  if (filterResolved.value === 'resolved') {
    result = result.filter(f => f.is_resolved)
  } else if (filterResolved.value === 'pending') {
    result = result.filter(f => !f.is_resolved)
  }

  if (filterRating.value) {
    result = result.filter(f => f.rating === filterRating.value)
  }

  return result
})

// Load data
onMounted(async () => {
  await Promise.all([
    getAllFeedback({ limit: 100 }),
    getFeedbackStats(30)
  ])
})

// Cleanup on unmount
addCleanup(() => {
  filterType.value = ''
  filterResolved.value = 'all'
  filterRating.value = null
  showResponseModal.value = false
  selectedFeedback.value = null
  responseText.value = ''
  console.log('[AdminFeedbackView] Cleanup complete')
})

// Open response modal
const openResponseModal = (feedback: CustomerFeedback) => {
  selectedFeedback.value = feedback
  responseText.value = feedback.admin_response || ''
  showResponseModal.value = true
}

// Submit response
const submitResponse = async () => {
  if (!selectedFeedback.value || !responseText.value.trim()) return

  isSubmitting.value = true
  const result = await respondToFeedback(selectedFeedback.value.id, responseText.value)
  
  if (result.success) {
    showResponseModal.value = false
    await getAllFeedback({ limit: 100 })
  }
  isSubmitting.value = false
}

// Format date
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Get type label
const getTypeLabel = (type: FeedbackType) => {
  const labels: Record<FeedbackType, string> = {
    ride: 'เรียกรถ',
    delivery: 'ส่งของ',
    shopping: 'ซื้อของ',
    app: 'แอพ',
    support: 'ซัพพอร์ต'
  }
  return labels[type] || type
}

// Get NPS color
const getNpsColor = (score: number) => {
  if (score >= 50) return '#22c55e'
  if (score >= 0) return '#f59e0b'
  return '#ef4444'
}

// Get rating stars
const getRatingStars = (rating: number) => {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}
</script>

<template>
  <AdminLayout>
    <div class="feedback-view">
      <!-- Header -->
      <div class="page-header">
        <h1>Customer Feedback</h1>
        <p class="subtitle">จัดการ feedback และความคิดเห็นจากลูกค้า</p>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid" v-if="stats">
        <div class="stat-card">
          <div class="stat-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.totalFeedback }}</span>
            <span class="stat-label">Total Feedback</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon rating">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.avgRating }}/5</span>
            <span class="stat-label">Average Rating</span>
            <span class="stat-trend" :class="stats.recentTrend">
              {{ stats.recentTrend === 'up' ? '↑' : stats.recentTrend === 'down' ? '↓' : '→' }}
            </span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon nps" :style="{ color: getNpsColor(stats.npsScore) }">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value" :style="{ color: getNpsColor(stats.npsScore) }">{{ stats.npsScore }}</span>
            <span class="stat-label">NPS Score</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon pending">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ feedbackList.filter(f => !f.is_resolved).length }}</span>
            <span class="stat-label">Pending Response</span>
          </div>
        </div>
      </div>

      <!-- NPS Breakdown -->
      <div class="nps-breakdown" v-if="stats">
        <h3>NPS Breakdown</h3>
        <div class="nps-bars">
          <div class="nps-bar promoters">
            <span class="nps-label">Promoters (9-10)</span>
            <div class="nps-progress">
              <div class="nps-fill" :style="{ width: `${(stats.promoters / (stats.promoters + stats.passives + stats.detractors)) * 100}%` }"></div>
            </div>
            <span class="nps-count">{{ stats.promoters }}</span>
          </div>
          <div class="nps-bar passives">
            <span class="nps-label">Passives (7-8)</span>
            <div class="nps-progress">
              <div class="nps-fill" :style="{ width: `${(stats.passives / (stats.promoters + stats.passives + stats.detractors)) * 100}%` }"></div>
            </div>
            <span class="nps-count">{{ stats.passives }}</span>
          </div>
          <div class="nps-bar detractors">
            <span class="nps-label">Detractors (0-6)</span>
            <div class="nps-progress">
              <div class="nps-fill" :style="{ width: `${(stats.detractors / (stats.promoters + stats.passives + stats.detractors)) * 100}%` }"></div>
            </div>
            <span class="nps-count">{{ stats.detractors }}</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <select v-model="filterType" class="filter-select">
          <option value="">ทุกประเภท</option>
          <option value="ride">เรียกรถ</option>
          <option value="delivery">ส่งของ</option>
          <option value="shopping">ซื้อของ</option>
          <option value="app">แอพ</option>
          <option value="support">ซัพพอร์ต</option>
        </select>

        <select v-model="filterResolved" class="filter-select">
          <option value="all">ทั้งหมด</option>
          <option value="pending">รอตอบกลับ</option>
          <option value="resolved">ตอบกลับแล้ว</option>
        </select>

        <select v-model="filterRating" class="filter-select">
          <option :value="null">ทุกคะแนน</option>
          <option :value="5">5 ดาว</option>
          <option :value="4">4 ดาว</option>
          <option :value="3">3 ดาว</option>
          <option :value="2">2 ดาว</option>
          <option :value="1">1 ดาว</option>
        </select>
      </div>

      <!-- Feedback List -->
      <div class="feedback-list" v-if="!loading">
        <div 
          v-for="feedback in filteredFeedback" 
          :key="feedback.id"
          class="feedback-card"
          :class="{ resolved: feedback.is_resolved }"
        >
          <div class="feedback-header">
            <div class="feedback-meta">
              <span class="feedback-type">{{ getTypeLabel(feedback.type) }}</span>
              <span class="feedback-date">{{ formatDate(feedback.created_at) }}</span>
            </div>
            <div class="feedback-rating">
              <span class="stars">{{ getRatingStars(feedback.rating) }}</span>
              <span v-if="feedback.nps_score !== undefined" class="nps-badge" :class="{
                promoter: feedback.nps_score >= 9,
                passive: feedback.nps_score >= 7 && feedback.nps_score < 9,
                detractor: feedback.nps_score < 7
              }">
                NPS: {{ feedback.nps_score }}
              </span>
            </div>
          </div>

          <div class="feedback-body">
            <p v-if="feedback.comment" class="feedback-comment">{{ feedback.comment }}</p>
            <p v-else class="no-comment">ไม่มีความคิดเห็น</p>

            <div class="feedback-categories" v-if="feedback.categories?.length">
              <span v-for="cat in feedback.categories" :key="cat" class="category-tag">
                {{ cat }}
              </span>
            </div>
          </div>

          <div class="feedback-response" v-if="feedback.admin_response">
            <div class="response-label">ตอบกลับจาก Admin:</div>
            <p>{{ feedback.admin_response }}</p>
          </div>

          <div class="feedback-actions">
            <span v-if="feedback.is_resolved" class="status-badge resolved">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              ตอบกลับแล้ว
            </span>
            <button 
              v-else 
              class="btn-respond"
              @click="openResponseModal(feedback)"
            >
              ตอบกลับ
            </button>
          </div>
        </div>

        <div v-if="filteredFeedback.length === 0" class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
          </svg>
          <p>ไม่พบ feedback ที่ตรงกับเงื่อนไข</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-else class="loading-state">
        <div class="spinner"></div>
        <p>กำลังโหลด...</p>
      </div>

      <!-- Response Modal -->
      <div v-if="showResponseModal" class="modal-overlay" @click.self="showResponseModal = false">
        <div class="modal">
          <div class="modal-header">
            <h3>ตอบกลับ Feedback</h3>
            <button class="close-btn" @click="showResponseModal = false">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="modal-body" v-if="selectedFeedback">
            <div class="original-feedback">
              <div class="feedback-info">
                <span class="stars">{{ getRatingStars(selectedFeedback.rating) }}</span>
                <span class="type">{{ getTypeLabel(selectedFeedback.type) }}</span>
              </div>
              <p v-if="selectedFeedback.comment">{{ selectedFeedback.comment }}</p>
            </div>

            <div class="response-form">
              <label>ข้อความตอบกลับ</label>
              <textarea 
                v-model="responseText"
                placeholder="พิมพ์ข้อความตอบกลับ..."
                rows="4"
              ></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" @click="showResponseModal = false">ยกเลิก</button>
            <button 
              class="btn-submit" 
              @click="submitResponse"
              :disabled="!responseText.trim() || isSubmitting"
            >
              {{ isSubmitting ? 'กำลังส่ง...' : 'ส่งตอบกลับ' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.feedback-view {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #000;
  margin: 0 0 4px 0;
}

.subtitle {
  color: #6B6B6B;
  margin: 0;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #E5E5E5;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #F6F6F6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg {
  width: 24px;
  height: 24px;
  color: #000;
}

.stat-icon.rating svg { color: #f59e0b; }
.stat-icon.pending svg { color: #ef4444; }

.stat-content {
  display: flex;
  flex-direction: column;
  position: relative;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #000;
}

.stat-label {
  font-size: 13px;
  color: #6B6B6B;
}

.stat-trend {
  position: absolute;
  right: -20px;
  top: 4px;
  font-size: 14px;
}

.stat-trend.up { color: #22c55e; }
.stat-trend.down { color: #ef4444; }
.stat-trend.stable { color: #6B6B6B; }

/* NPS Breakdown */
.nps-breakdown {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid #E5E5E5;
}

.nps-breakdown h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.nps-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.nps-bar {
  display: grid;
  grid-template-columns: 120px 1fr 40px;
  align-items: center;
  gap: 12px;
}

.nps-label {
  font-size: 13px;
  color: #6B6B6B;
}

.nps-progress {
  height: 8px;
  background: #F6F6F6;
  border-radius: 4px;
  overflow: hidden;
}

.nps-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.promoters .nps-fill { background: #22c55e; }
.passives .nps-fill { background: #f59e0b; }
.detractors .nps-fill { background: #ef4444; }

.nps-count {
  font-size: 14px;
  font-weight: 600;
  text-align: right;
}

/* Filters */
.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-select {
  padding: 10px 16px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  min-width: 140px;
}

/* Feedback List */
.feedback-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feedback-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #E5E5E5;
}

.feedback-card.resolved {
  opacity: 0.8;
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.feedback-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.feedback-type {
  font-size: 12px;
  font-weight: 600;
  color: #000;
  background: #F6F6F6;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
  width: fit-content;
}

.feedback-date {
  font-size: 12px;
  color: #6B6B6B;
}

.feedback-rating {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stars {
  color: #f59e0b;
  font-size: 16px;
}

.nps-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.nps-badge.promoter { background: #dcfce7; color: #166534; }
.nps-badge.passive { background: #fef3c7; color: #92400e; }
.nps-badge.detractor { background: #fee2e2; color: #991b1b; }

.feedback-body {
  margin-bottom: 12px;
}

.feedback-comment {
  color: #000;
  line-height: 1.5;
  margin: 0 0 12px 0;
}

.no-comment {
  color: #6B6B6B;
  font-style: italic;
  margin: 0;
}

.feedback-categories {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.category-tag {
  font-size: 11px;
  padding: 4px 8px;
  background: #F6F6F6;
  border-radius: 4px;
  color: #6B6B6B;
}

.feedback-response {
  background: #F6F6F6;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.response-label {
  font-size: 12px;
  font-weight: 600;
  color: #6B6B6B;
  margin-bottom: 4px;
}

.feedback-response p {
  margin: 0;
  font-size: 14px;
  color: #000;
}

.feedback-actions {
  display: flex;
  justify-content: flex-end;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 6px;
}

.status-badge.resolved {
  background: #dcfce7;
  color: #166534;
}

.btn-respond {
  padding: 8px 16px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

/* Empty & Loading States */
.empty-state,
.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #6B6B6B;
}

.empty-state svg,
.loading-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #E5E5E5;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #6B6B6B;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.original-feedback {
  background: #F6F6F6;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.feedback-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.feedback-info .type {
  font-size: 12px;
  background: #fff;
  padding: 4px 8px;
  border-radius: 4px;
}

.original-feedback p {
  margin: 0;
  color: #000;
}

.response-form label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.response-form textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}

.response-form textarea:focus {
  outline: none;
  border-color: #000;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #E5E5E5;
}

.btn-cancel {
  padding: 10px 20px;
  background: #F6F6F6;
  color: #000;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn-submit {
  padding: 10px 20px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .feedback-view {
    padding: 16px;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .nps-bar {
    grid-template-columns: 100px 1fr 30px;
  }

  .filters {
    flex-direction: column;
  }

  .filter-select {
    width: 100%;
  }
}
</style>
