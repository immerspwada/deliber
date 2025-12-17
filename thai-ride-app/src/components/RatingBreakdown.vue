<script setup lang="ts">
/**
 * Feature: F220 - Rating Breakdown
 * Display rating breakdown by stars
 */
defineProps<{
  totalRatings: number
  averageRating: number
  breakdown: { stars: number; count: number }[]
}>()

const getPercentage = (count: number, total: number) => total > 0 ? (count / total) * 100 : 0
</script>

<template>
  <div class="rating-breakdown">
    <div class="rating-summary">
      <span class="rating-value">{{ averageRating.toFixed(1) }}</span>
      <div class="rating-stars">
        <svg v-for="i in 5" :key="i" width="16" height="16" viewBox="0 0 24 24" 
          :fill="i <= Math.round(averageRating) ? '#f59e0b' : '#e5e5e5'" stroke="none">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </div>
      <span class="rating-count">{{ totalRatings.toLocaleString() }} รีวิว</span>
    </div>
    <div class="rating-bars">
      <div v-for="item in breakdown" :key="item.stars" class="bar-row">
        <span class="bar-label">{{ item.stars }}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        <div class="bar-track">
          <div class="bar-fill" :style="{ width: `${getPercentage(item.count, totalRatings)}%` }" />
        </div>
        <span class="bar-count">{{ item.count }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rating-breakdown { display: flex; gap: 24px; padding: 20px; background: #fff; border-radius: 16px; border: 1px solid #e5e5e5; }
.rating-summary { display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 100px; }
.rating-value { font-size: 40px; font-weight: 700; color: #000; line-height: 1; }
.rating-stars { display: flex; gap: 2px; margin: 8px 0; }
.rating-count { font-size: 12px; color: #6b6b6b; }
.rating-bars { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.bar-row { display: flex; align-items: center; gap: 8px; }
.bar-label { width: 12px; font-size: 13px; color: #6b6b6b; text-align: right; }
.bar-track { flex: 1; height: 8px; background: #e5e5e5; border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; background: #f59e0b; border-radius: 4px; }
.bar-count { width: 36px; font-size: 12px; color: #6b6b6b; text-align: right; }
</style>
