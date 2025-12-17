<script setup lang="ts">
import { onMounted } from 'vue'
import { useProviderPerformance } from '../../composables/useProviderPerformance'

const props = defineProps<{
  providerId: string
}>()

const { loading, metrics, score, fetchPerformance, getLevelColor, getScoreColor } = useProviderPerformance()

onMounted(() => {
  fetchPerformance(props.providerId)
})

const formatPercent = (n: number) => `${Math.round(n)}%`
</script>

<template>
  <div class="performance-card">
    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <!-- Content -->
    <template v-else-if="score && metrics">
      <!-- Score Header -->
      <div class="score-header">
        <div class="score-circle" :style="{ borderColor: getScoreColor(score.overall) }">
          <span class="score-value">{{ score.overall }}</span>
          <span class="score-label">คะแนน</span>
        </div>
        <div class="level-info">
          <div class="level-badge" :style="{ background: getLevelColor(score.level) }">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span>{{ score.levelName }}</span>
          </div>
          <div class="next-level">
            <span class="next-label">ถึง Level ถัดไป</span>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${score.nextLevelProgress}%` }"></div>
            </div>
            <span class="next-score">{{ score.nextLevelScore }} คะแนน</span>
          </div>
        </div>
      </div>

      <!-- Metrics Grid -->
      <div class="metrics-grid">
        <div class="metric-item">
          <span class="metric-value" :class="{ good: metrics.rating >= 4.5 }">{{ metrics.rating.toFixed(1) }}</span>
          <span class="metric-label">คะแนนรีวิว</span>
        </div>
        <div class="metric-item">
          <span class="metric-value" :class="{ good: metrics.completionRate >= 95 }">{{ formatPercent(metrics.completionRate) }}</span>
          <span class="metric-label">สำเร็จ</span>
        </div>
        <div class="metric-item">
          <span class="metric-value" :class="{ good: metrics.acceptanceRate >= 90 }">{{ formatPercent(metrics.acceptanceRate) }}</span>
          <span class="metric-label">รับงาน</span>
        </div>
        <div class="metric-item">
          <span class="metric-value">{{ metrics.totalTrips }}</span>
          <span class="metric-label">งานทั้งหมด</span>
        </div>
      </div>

      <!-- Badges -->
      <div v-if="score.badges.length > 0" class="badges-section">
        <span class="badges-title">เหรียญรางวัล</span>
        <div class="badges-list">
          <div v-for="badge in score.badges.slice(0, 5)" :key="badge.id" class="badge-item" :title="badge.description">
            <svg v-if="badge.icon === 'star'" width="20" height="20" viewBox="0 0 24 24" fill="#ffc043">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <svg v-else-if="badge.icon === 'medal'" width="20" height="20" viewBox="0 0 24 24" fill="#c0c0c0">
              <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
            </svg>
            <svg v-else-if="badge.icon === 'trophy'" width="20" height="20" viewBox="0 0 24 24" fill="#ffd700">
              <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 1012 0V2z"/>
            </svg>
            <svg v-else-if="badge.icon === 'heart'" width="20" height="20" viewBox="0 0 24 24" fill="#e91e63">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
            <svg v-else-if="badge.icon === 'check'" width="20" height="20" viewBox="0 0 24 24" fill="#05944f">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3" stroke="#05944f" stroke-width="2" fill="none"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="#6b6b6b">
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <span v-if="score.badges.length > 5" class="more-badges">+{{ score.badges.length - 5 }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.performance-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e5e5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.score-header {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.score-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 4px solid;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.score-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.score-label {
  font-size: 10px;
  color: #6b6b6b;
}

.level-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.level-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #000;
  width: fit-content;
}

.next-level {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.next-label {
  font-size: 11px;
  color: #6b6b6b;
}

.progress-bar {
  height: 6px;
  background: #e5e5e5;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #000;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.next-score {
  font-size: 11px;
  color: #6b6b6b;
  text-align: right;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 12px 0;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
}

.metric-item {
  text-align: center;
}

.metric-value {
  display: block;
  font-size: 16px;
  font-weight: 700;
}

.metric-value.good {
  color: #05944f;
}

.metric-label {
  display: block;
  font-size: 10px;
  color: #6b6b6b;
  margin-top: 2px;
}

.badges-section {
  padding-top: 12px;
}

.badges-title {
  display: block;
  font-size: 12px;
  color: #6b6b6b;
  margin-bottom: 8px;
}

.badges-list {
  display: flex;
  gap: 8px;
  align-items: center;
}

.badge-item {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f6f6f6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.more-badges {
  font-size: 12px;
  color: #6b6b6b;
}
</style>
