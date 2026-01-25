<script setup lang="ts">
/**
 * Feature: F26 - Delivery/Shopping Ratings
 * Component: ShoppingRatingModal
 * Tables: shopping_ratings
 */
import { ref, computed } from 'vue'
import { useServiceRatings, SHOPPING_TAGS } from '../../composables/useServiceRatings'

const props = defineProps<{
  show: boolean
  shoppingId: string
  shopperName: string
  serviceFee: number
}>()

const emit = defineEmits<{
  'close': []
  'submit': [success: boolean]
}>()

const { submitShoppingRating, loading } = useServiceRatings()

const overallRating = ref(0)
const itemSelectionRating = ref(0)
const freshnessRating = ref(0)
const communicationRating = ref(0)
const deliveryRating = ref(0)
const tipAmount = ref(0)
const comment = ref('')
const selectedTags = ref<string[]>([])

const tipOptions = [0, 20, 50, 100]
const totalAmount = computed(() => props.serviceFee + tipAmount.value)

const toggleTag = (tag: string) => {
  const index = selectedTags.value.indexOf(tag)
  if (index === -1) selectedTags.value.push(tag)
  else selectedTags.value.splice(index, 1)
}

const handleSubmit = async () => {
  const result = await submitShoppingRating({
    shoppingId: props.shoppingId,
    rating: overallRating.value,
    itemSelectionRating: itemSelectionRating.value || undefined,
    freshnessRating: freshnessRating.value || undefined,
    communicationRating: communicationRating.value || undefined,
    deliveryRating: deliveryRating.value || undefined,
    comment: comment.value || undefined,
    tipAmount: tipAmount.value,
    tags: selectedTags.value
  })
  emit('submit', !!result)
  resetForm()
}

const resetForm = () => {
  overallRating.value = 0
  itemSelectionRating.value = 0
  freshnessRating.value = 0
  communicationRating.value = 0
  deliveryRating.value = 0
  tipAmount.value = 0
  comment.value = ''
  selectedTags.value = []
}

const handleClose = () => {
  emit('close')
  resetForm()
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="rating-modal">
      <button class="close-btn" @click="handleClose">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
      
      <h3 class="rating-title">ให้คะแนนบริการซื้อของ</h3>
      <p class="rating-subtitle">คุณพอใจกับบริการของ {{ shopperName }} หรือไม่?</p>
      
      <!-- Overall Rating -->
      <div class="star-rating">
        <button 
          v-for="star in 5" 
          :key="star"
          :class="['star-btn', { active: star <= overallRating }]"
          @click="overallRating = star"
        >
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
        </button>
      </div>

      <!-- Detail Ratings -->
      <div v-if="overallRating > 0" class="detail-ratings">
        <div class="detail-rating-item">
          <span class="detail-label">เลือกของ</span>
          <div class="mini-stars">
            <button
              v-for="star in 5" :key="star" :class="['mini-star', { active: star <= itemSelectionRating }]"
              @click="itemSelectionRating = star"
            >
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="detail-rating-item">
          <span class="detail-label">ความสด</span>
          <div class="mini-stars">
            <button
              v-for="star in 5" :key="star" :class="['mini-star', { active: star <= freshnessRating }]"
              @click="freshnessRating = star"
            >
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="detail-rating-item">
          <span class="detail-label">การสื่อสาร</span>
          <div class="mini-stars">
            <button
              v-for="star in 5" :key="star" :class="['mini-star', { active: star <= communicationRating }]"
              @click="communicationRating = star"
            >
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="detail-rating-item">
          <span class="detail-label">การจัดส่ง</span>
          <div class="mini-stars">
            <button
              v-for="star in 5" :key="star" :class="['mini-star', { active: star <= deliveryRating }]"
              @click="deliveryRating = star"
            >
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Tags -->
      <div v-if="overallRating > 0" class="tags-section">
        <p class="tags-label">เลือกสิ่งที่ชอบ</p>
        <div class="tags-grid">
          <button
            v-for="tag in SHOPPING_TAGS" :key="tag" :class="['tag-btn', { active: selectedTags.includes(tag) }]"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </button>
        </div>
      </div>

      <!-- Comment -->
      <div v-if="overallRating > 0" class="comment-section">
        <textarea v-model="comment" placeholder="เขียนความคิดเห็น (ไม่บังคับ)" rows="2" class="comment-input"></textarea>
      </div>

      <!-- Tip Section -->
      <div class="tip-section">
        <p class="tip-label">ให้ทิปผู้ช่วยซื้อของ</p>
        <div class="tip-options">
          <button
            v-for="tip in tipOptions" :key="tip" :class="['tip-btn', { active: tipAmount === tip }]"
            @click="tipAmount = tip"
          >
            {{ tip === 0 ? 'ไม่ให้' : `฿${tip}` }}
          </button>
        </div>
      </div>

      <!-- Summary -->
      <div class="rating-summary">
        <span>ค่าบริการ</span>
        <span>฿{{ serviceFee }}</span>
      </div>
      <div v-if="tipAmount > 0" class="rating-summary">
        <span>ทิป</span>
        <span>฿{{ tipAmount }}</span>
      </div>
      <div class="rating-summary total">
        <span>รวมทั้งหมด</span>
        <span>฿{{ totalAmount }}</span>
      </div>

      <button :disabled="loading || overallRating === 0" class="btn-primary" @click="handleSubmit">
        {{ loading ? 'กำลังบันทึก...' : 'เสร็จสิ้น' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.rating-modal {
  background: white;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  background: #F6F6F6;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.close-btn svg { width: 20px; height: 20px; }
.rating-title { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
.rating-subtitle { font-size: 14px; color: #666; margin-bottom: 20px; }

.star-rating {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
}

.star-btn {
  width: 44px;
  height: 44px;
  background: none;
  border: none;
  color: #E5E5E5;
  cursor: pointer;
  transition: all 0.2s ease;
}

.star-btn:hover { transform: scale(1.1); }
.star-btn:active { transform: scale(0.95); }
.star-btn.active { color: #F59E0B; transform: scale(1.15); }
.star-btn svg { width: 100%; height: 100%; }

.detail-ratings {
  background: #F6F6F6;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.detail-rating-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.detail-label { font-size: 14px; color: #333; }
.mini-stars { display: flex; gap: 4px; }

.mini-star {
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  color: #E5E5E5;
  cursor: pointer;
}

.mini-star.active { color: #F59E0B; }
.mini-star svg { width: 100%; height: 100%; }
.tags-section { margin-bottom: 16px; }
.tags-label { font-size: 14px; color: #666; margin-bottom: 12px; }

.tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.tag-btn {
  padding: 8px 16px;
  background: #F6F6F6;
  border: 2px solid transparent;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag-btn.active { border-color: #000; background: #000; color: white; }
.comment-section { margin-bottom: 16px; }

.comment-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 14px;
  resize: none;
}

.comment-input:focus { outline: none; border-color: #000; }
.tip-section { margin-bottom: 20px; }
.tip-label { font-size: 14px; color: #666; margin-bottom: 12px; }
.tip-options { display: flex; gap: 8px; justify-content: center; }

.tip-btn {
  padding: 10px 20px;
  background: #F6F6F6;
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.tip-btn.active { border-color: #000; background: white; }

.rating-summary {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  color: #666;
}

.rating-summary.total {
  border-top: 1px solid #E5E5E5;
  margin-top: 8px;
  padding-top: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #000;
}

.btn-primary {
  width: 100%;
  margin-top: 16px;
  padding: 16px;
  background: #000;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:disabled { background: #CCC; cursor: not-allowed; }
</style>
