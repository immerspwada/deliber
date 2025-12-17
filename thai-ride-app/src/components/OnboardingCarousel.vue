<script setup lang="ts">
/**
 * Feature: F276 - Onboarding Carousel
 * Full onboarding flow with slides and navigation
 */
import { ref, computed } from 'vue'

interface Slide {
  title: string
  description: string
  imageUrl?: string
}

const props = withDefaults(defineProps<{
  slides: Slide[]
  skipLabel?: string
  nextLabel?: string
  doneLabel?: string
}>(), {
  skipLabel: 'ข้าม',
  nextLabel: 'ถัดไป',
  doneLabel: 'เริ่มต้นใช้งาน'
})

const emit = defineEmits<{
  'complete': []
  'skip': []
}>()

const currentIndex = ref(0)
const isLast = computed(() => currentIndex.value === props.slides.length - 1)
const currentSlide = computed(() => props.slides[currentIndex.value] || { title: '', description: '' })

const next = () => {
  if (isLast.value) {
    emit('complete')
  } else {
    currentIndex.value++
  }
}

const skip = () => {
  emit('skip')
}

const goTo = (index: number) => {
  currentIndex.value = index
}
</script>

<template>
  <div class="onboarding">
    <button v-if="!isLast" type="button" class="skip-btn" @click="skip">
      {{ skipLabel }}
    </button>
    
    <div class="slide-container">
      <div class="slide">
        <div class="illustration">
          <img v-if="currentSlide.imageUrl" :src="currentSlide.imageUrl" :alt="currentSlide.title" />
          <div v-else class="placeholder">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
        </div>
        
        <h2 class="title">{{ currentSlide.title }}</h2>
        <p class="description">{{ currentSlide.description }}</p>
      </div>
    </div>
    
    <div class="dots">
      <button
        v-for="(_, index) in slides"
        :key="index"
        type="button"
        class="dot"
        :class="{ active: index === currentIndex }"
        @click="goTo(index)"
      />
    </div>
    
    <button type="button" class="next-btn" @click="next">
      {{ isLast ? doneLabel : nextLabel }}
    </button>
  </div>
</template>

<style scoped>
.onboarding {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 16px 24px 32px;
  background: #fff;
}

.skip-btn {
  align-self: flex-end;
  padding: 8px 16px;
  background: transparent;
  border: none;
  font-size: 14px;
  color: #6b6b6b;
  cursor: pointer;
}

.slide-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slide {
  text-align: center;
  max-width: 320px;
}

.illustration {
  margin-bottom: 40px;
}

.illustration img {
  max-width: 280px;
  max-height: 280px;
}

.placeholder {
  width: 200px;
  height: 200px;
  margin: 0 auto;
  background: #f6f6f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ccc;
}

.title {
  font-size: 26px;
  font-weight: 700;
  color: #000;
  margin: 0 0 12px;
}

.description {
  font-size: 15px;
  color: #6b6b6b;
  line-height: 1.6;
  margin: 0;
}

.dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e5e5e5;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: all 0.3s;
}

.dot.active {
  width: 24px;
  border-radius: 4px;
  background: #000;
}

.next-btn {
  width: 100%;
  padding: 16px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}
</style>
