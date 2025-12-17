<script setup lang="ts">
/**
 * Feature: F292 - Driver Rating
 * Post-ride driver rating component
 */
import { ref } from 'vue'

const props = defineProps<{
  driverName: string
  driverPhoto?: string
  vehicleInfo?: string
}>()

const emit = defineEmits<{
  'submit': [data: { rating: number; comment: string; tip: number }]
  'skip': []
}>()

const rating = ref(0)
const comment = ref('')
const selectedTip = ref(0)
const tipOptions = [0, 20, 50, 100]

const setRating = (value: number) => {
  rating.value = value
}

const submit = () => {
  emit('submit', {
    rating: rating.value,
    comment: comment.value,
    tip: selectedTip.value
  })
}
</script>

<template>
  <div class="driver-rating">
    <div class="driver-info">
      <div class="avatar">
        <img v-if="driverPhoto" :src="driverPhoto" :alt="driverName" />
        <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <h3 class="name">{{ driverName }}</h3>
      <p v-if="vehicleInfo" class="vehicle">{{ vehicleInfo }}</p>
    </div>
    
    <div class="rating-section">
      <p class="label">ให้คะแนนการเดินทาง</p>
      <div class="stars">
        <button
          v-for="i in 5"
          :key="i"
          type="button"
          class="star"
          :class="{ active: i <= rating }"
          @click="setRating(i)"
        >
          <svg width="36" height="36" viewBox="0 0 24 24" :fill="i <= rating ? '#000' : 'none'" stroke="#000" stroke-width="1.5">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
          </svg>
        </button>
      </div>
    </div>
    
    <div class="tip-section">
      <p class="label">ให้ทิปคนขับ</p>
      <div class="tip-options">
        <button
          v-for="tip in tipOptions"
          :key="tip"
          type="button"
          class="tip-btn"
          :class="{ active: selectedTip === tip }"
          @click="selectedTip = tip"
        >
          {{ tip === 0 ? 'ไม่ให้' : '฿' + tip }}
        </button>
      </div>
    </div>
    
    <div class="comment-section">
      <textarea
        v-model="comment"
        placeholder="แสดงความคิดเห็น (ไม่บังคับ)"
        rows="3"
      ></textarea>
    </div>
    
    <div class="actions">
      <button type="button" class="btn-submit" :disabled="rating === 0" @click="submit">
        ส่งคะแนน
      </button>
      <button type="button" class="btn-skip" @click="emit('skip')">
        ข้ามไปก่อน
      </button>
    </div>
  </div>
</template>

<style scoped>
.driver-rating {
  padding: 24px;
  text-align: center;
}

.driver-info {
  margin-bottom: 24px;
}

.avatar {
  width: 80px;
  height: 80px;
  background: #f6f6f6;
  border-radius: 50%;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.name {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 4px;
}

.vehicle {
  font-size: 14px;
  color: #6b6b6b;
  margin: 0;
}

.label {
  font-size: 14px;
  color: #6b6b6b;
  margin: 0 0 12px;
}

.stars {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}

.star {
  padding: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: transform 0.2s;
}

.star:hover {
  transform: scale(1.1);
}

.tip-options {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 24px;
}

.tip-btn {
  padding: 10px 20px;
  background: #f6f6f6;
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.tip-btn.active {
  border-color: #000;
  background: #fff;
}

textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
  resize: none;
  outline: none;
}

textarea:focus {
  border-color: #000;
}

.actions {
  margin-top: 24px;
}

.btn-submit {
  width: 100%;
  padding: 14px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.btn-submit:disabled {
  background: #ccc;
}

.btn-skip {
  margin-top: 12px;
  padding: 8px;
  background: transparent;
  border: none;
  font-size: 14px;
  color: #6b6b6b;
  cursor: pointer;
}
</style>
