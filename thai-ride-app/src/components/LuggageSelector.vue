<script setup lang="ts">
/**
 * Feature: F306 - Luggage Selector
 * Luggage size/count selector
 */
import { ref } from 'vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'close': []
  'confirm': [luggage: { small: number; medium: number; large: number }]
}>()

const small = ref(0)
const medium = ref(0)
const large = ref(0)

const confirm = () => {
  emit('confirm', { small: small.value, medium: medium.value, large: large.value })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="slide">
      <div v-if="visible" class="sheet-overlay" @click="emit('close')">
        <div class="sheet-content" @click.stop>
          <div class="sheet-handle"></div>
          <h3 class="title">เลือกขนาดกระเป๋า</h3>
          
          <div class="luggage-list">
            <div class="luggage-item">
              <div class="info">
                <span class="size">เล็ก</span>
                <span class="desc">กระเป๋าถือ, กระเป๋าสะพาย</span>
              </div>
              <div class="counter">
                <button type="button" :disabled="small <= 0" @click="small--">-</button>
                <span>{{ small }}</span>
                <button type="button" @click="small++">+</button>
              </div>
            </div>
            
            <div class="luggage-item">
              <div class="info">
                <span class="size">กลาง</span>
                <span class="desc">กระเป๋าเดินทาง 20-24 นิ้ว</span>
              </div>
              <div class="counter">
                <button type="button" :disabled="medium <= 0" @click="medium--">-</button>
                <span>{{ medium }}</span>
                <button type="button" @click="medium++">+</button>
              </div>
            </div>
            
            <div class="luggage-item">
              <div class="info">
                <span class="size">ใหญ่</span>
                <span class="desc">กระเป๋าเดินทาง 28+ นิ้ว</span>
              </div>
              <div class="counter">
                <button type="button" :disabled="large <= 0" @click="large--">-</button>
                <span>{{ large }}</span>
                <button type="button" @click="large++">+</button>
              </div>
            </div>
          </div>
          
          <button type="button" class="btn-confirm" @click="confirm">ยืนยัน</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.sheet-content {
  width: 100%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 12px 20px 24px;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: #e5e5e5;
  border-radius: 2px;
  margin: 0 auto 16px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px;
}

.luggage-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.luggage-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 8px;
}

.info {
  display: flex;
  flex-direction: column;
}

.size {
  font-size: 15px;
  font-weight: 500;
}

.desc {
  font-size: 12px;
  color: #6b6b6b;
}

.counter {
  display: flex;
  align-items: center;
  gap: 12px;
}

.counter button {
  width: 32px;
  height: 32px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
}

.counter button:disabled {
  opacity: 0.3;
}

.counter span {
  font-size: 16px;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

.btn-confirm {
  width: 100%;
  padding: 14px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 20px;
}

.slide-enter-active, .slide-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.slide-enter-from, .slide-leave-to {
  opacity: 0;
}

.slide-enter-from .sheet-content,
.slide-leave-to .sheet-content {
  transform: translateY(100%);
}
</style>
