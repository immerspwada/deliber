<script setup lang="ts">
/**
 * Feature: F369 - Carousel
 * Image/content carousel slider
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  items: Array<{ id: string | number; content?: string; image?: string }>
  autoPlay?: boolean
  interval?: number
  showDots?: boolean
  showArrows?: boolean
}>(), {
  autoPlay: false,
  interval: 5000,
  showDots: true,
  showArrows: true
})

const emit = defineEmits<{ (e: 'change', index: number): void }>()

const currentIndex = ref(0)
let autoPlayTimer: ReturnType<typeof setInterval>

const next = () => {
  currentIndex.value = (currentIndex.value + 1) % props.items.length
  emit('change', currentIndex.value)
}

const prev = () => {
  currentIndex.value = (currentIndex.value - 1 + props.items.length) % props.items.length
  emit('change', currentIndex.value)
}

const goTo = (index: number) => {
  currentIndex.value = index
  emit('change', index)
}

const translateX = computed(() => -currentIndex.value * 100)

onMounted(() => {
  if (props.autoPlay) {
    autoPlayTimer = setInterval(next, props.interval)
  }
})

onUnmounted(() => {
  clearInterval(autoPlayTimer)
})
</script>

<template>
  <div class="carousel">
    <div class="carousel-track" :style="{ transform: `translateX(${translateX}%)` }">
      <div v-for="item in items" :key="item.id" class="carousel-slide">
        <img v-if="item.image" :src="item.image" :alt="String(item.id)" class="slide-image" />
        <div v-else-if="item.content" class="slide-content">{{ item.content }}</div>
        <slot v-else :item="item"></slot>
      </div>
    </div>

    <button v-if="showArrows && items.length > 1" type="button" class="arrow prev" @click="prev">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
    <button v-if="showArrows && items.length > 1" type="button" class="arrow next" @click="next">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
    </button>

    <div v-if="showDots && items.length > 1" class="dots">
      <button v-for="(_, i) in items" :key="i" type="button" class="dot" :class="{ active: i === currentIndex }" @click="goTo(i)"></button>
    </div>
  </div>
</template>

<style scoped>
.carousel { position: relative; overflow: hidden; border-radius: 12px; }
.carousel-track { display: flex; transition: transform 0.3s ease; }
.carousel-slide { flex: 0 0 100%; min-width: 100%; }
.slide-image { width: 100%; height: 200px; object-fit: cover; }
.slide-content { padding: 20px; text-align: center; }
.arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 36px; height: 36px; background: rgba(255,255,255,0.9); border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 2; }
.arrow.prev { left: 12px; }
.arrow.next { right: 12px; }
.dots { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; }
.dot { width: 8px; height: 8px; background: rgba(255,255,255,0.5); border: none; border-radius: 50%; cursor: pointer; padding: 0; }
.dot.active { background: #fff; }
</style>
