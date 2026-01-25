<script setup lang="ts">
/**
 * Feature: F221 - Review Card
 * Display single review/rating
 */
defineProps<{
  reviewerName: string
  rating: number
  comment?: string
  date: string
  serviceType?: string
  reply?: string
  onReply?: () => void
}>()

const formatDate = (date: string) => {
  const d = new Date(date)
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="review-card">
    <div class="review-header">
      <div class="reviewer-avatar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <div class="reviewer-info">
        <span class="reviewer-name">{{ reviewerName }}</span>
        <span class="review-date">{{ formatDate(date) }}</span>
      </div>
      <div class="review-rating">
        <svg
          v-for="i in 5" :key="i" width="14" height="14" viewBox="0 0 24 24" 
          :fill="i <= rating ? '#f59e0b' : '#e5e5e5'" stroke="none"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </div>
    </div>
    <p v-if="comment" class="review-comment">{{ comment }}</p>
    <span v-if="serviceType" class="service-badge">{{ serviceType }}</span>
    <div v-if="reply" class="review-reply">
      <span class="reply-label">ตอบกลับ:</span>
      <p class="reply-text">{{ reply }}</p>
    </div>
    <button v-if="onReply && !reply" type="button" class="reply-btn" @click="onReply">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
      </svg>
      ตอบกลับ
    </button>
  </div>
</template>

<style scoped>
.review-card { padding: 16px; background: #fff; border-radius: 12px; border: 1px solid #e5e5e5; }
.review-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.reviewer-avatar { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #f6f6f6; border-radius: 50%; color: #6b6b6b; }
.reviewer-info { flex: 1; }
.reviewer-name { display: block; font-size: 14px; font-weight: 600; color: #000; }
.review-date { font-size: 12px; color: #6b6b6b; }
.review-rating { display: flex; gap: 2px; }
.review-comment { font-size: 14px; color: #000; margin: 0 0 12px; line-height: 1.5; }
.service-badge { display: inline-block; font-size: 11px; color: #6b6b6b; background: #f6f6f6; padding: 4px 10px; border-radius: 12px; }
.review-reply { margin-top: 12px; padding: 12px; background: #f6f6f6; border-radius: 8px; }
.reply-label { font-size: 12px; font-weight: 600; color: #6b6b6b; }
.reply-text { font-size: 13px; color: #000; margin: 4px 0 0; }
.reply-btn { display: flex; align-items: center; gap: 6px; margin-top: 12px; padding: 8px 14px; background: transparent; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 13px; color: #6b6b6b; cursor: pointer; }
.reply-btn:hover { background: #f6f6f6; color: #000; }
</style>
