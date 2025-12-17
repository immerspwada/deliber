<script setup lang="ts">
/**
 * Feature: F355 - Provider Review Card
 * Customer review card for providers
 */
interface Review {
  id: string
  customerName: string
  customerAvatar?: string
  rating: number
  comment?: string
  date: string
  orderType: 'ride' | 'delivery' | 'shopping'
  reply?: string
}

const props = defineProps<{ review: Review }>()
const emit = defineEmits<{ (e: 'reply', id: string): void }>()

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

const orderTypeLabels = { ride: 'เรียกรถ', delivery: 'ส่งของ', shopping: 'ซื้อของ' }
</script>

<template>
  <div class="provider-review-card">
    <div class="review-header">
      <div class="customer-info">
        <div class="customer-avatar">
          <img v-if="review.customerAvatar" :src="review.customerAvatar" alt="" />
          <span v-else>{{ review.customerName.charAt(0) }}</span>
        </div>
        <div class="customer-details">
          <span class="customer-name">{{ review.customerName }}</span>
          <span class="review-meta">{{ orderTypeLabels[review.orderType] }} • {{ formatDate(review.date) }}</span>
        </div>
      </div>
      <div class="rating">
        <svg v-for="i in 5" :key="i" width="16" height="16" viewBox="0 0 24 24" :fill="i <= review.rating ? '#FFB800' : 'none'" :stroke="i <= review.rating ? '#FFB800' : '#e5e5e5'" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </div>
    </div>

    <p v-if="review.comment" class="review-comment">{{ review.comment }}</p>

    <div v-if="review.reply" class="review-reply">
      <span class="reply-label">ตอบกลับของคุณ:</span>
      <p class="reply-text">{{ review.reply }}</p>
    </div>

    <button v-else type="button" class="reply-btn" @click="emit('reply', review.id)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </svg>
      ตอบกลับ
    </button>
  </div>
</template>

<style scoped>
.provider-review-card { background: #fff; border-radius: 12px; padding: 16px; border: 1px solid #e5e5e5; }
.review-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.customer-info { display: flex; gap: 12px; }
.customer-avatar { width: 40px; height: 40px; border-radius: 50%; background: #f6f6f6; display: flex; align-items: center; justify-content: center; overflow: hidden; font-size: 16px; font-weight: 600; color: #6b6b6b; }
.customer-avatar img { width: 100%; height: 100%; object-fit: cover; }
.customer-name { display: block; font-size: 14px; font-weight: 600; color: #000; }
.review-meta { font-size: 12px; color: #6b6b6b; }
.rating { display: flex; gap: 2px; }
.review-comment { font-size: 14px; color: #000; line-height: 1.5; margin: 0 0 12px; }
.review-reply { background: #f6f6f6; border-radius: 8px; padding: 12px; }
.reply-label { font-size: 12px; color: #6b6b6b; display: block; margin-bottom: 4px; }
.reply-text { font-size: 13px; color: #000; margin: 0; }
.reply-btn { display: flex; align-items: center; gap: 6px; background: none; border: 1px solid #e5e5e5; padding: 8px 16px; border-radius: 8px; font-size: 13px; color: #000; cursor: pointer; }
.reply-btn:hover { background: #f6f6f6; }
</style>
