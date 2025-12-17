<script setup lang="ts">
/**
 * Feature: F100 - Image Gallery
 * Image gallery with lightbox
 */
import { ref } from 'vue'

interface Props {
  images: string[]
  columns?: 2 | 3 | 4
  gap?: number
  aspectRatio?: string
}

const props = withDefaults(defineProps<Props>(), {
  columns: 3,
  gap: 8,
  aspectRatio: '1/1'
})

const lightboxOpen = ref(false)
const currentIndex = ref(0)

const openLightbox = (index: number) => {
  currentIndex.value = index
  lightboxOpen.value = true
  document.body.style.overflow = 'hidden'
}

const closeLightbox = () => {
  lightboxOpen.value = false
  document.body.style.overflow = ''
}

const prev = () => {
  currentIndex.value = currentIndex.value > 0 
    ? currentIndex.value - 1 
    : props.images.length - 1
}

const next = () => {
  currentIndex.value = currentIndex.value < props.images.length - 1 
    ? currentIndex.value + 1 
    : 0
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!lightboxOpen.value) return
  if (e.key === 'Escape') closeLightbox()
  if (e.key === 'ArrowLeft') prev()
  if (e.key === 'ArrowRight') next()
}

// Add keyboard listener
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', handleKeydown)
}
</script>

<template>
  <div class="image-gallery">
    <div
      class="gallery-grid"
      :style="{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`
      }"
    >
      <button
        v-for="(image, index) in images"
        :key="index"
        class="gallery-item"
        :style="{ aspectRatio }"
        @click="openLightbox(index)"
      >
        <img :src="image" :alt="`Image ${index + 1}`" />
      </button>
    </div>

    <!-- Lightbox -->
    <Teleport to="body">
      <Transition name="lightbox">
        <div v-if="lightboxOpen" class="lightbox" @click="closeLightbox">
          <button class="lightbox-close" @click="closeLightbox">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>

          <button class="lightbox-nav prev" @click.stop="prev">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <div class="lightbox-content" @click.stop>
            <img :src="images[currentIndex]" :alt="`Image ${currentIndex + 1}`" />
          </div>

          <button class="lightbox-nav next" @click.stop="next">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          <div class="lightbox-counter">
            {{ currentIndex + 1 }} / {{ images.length }}
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.gallery-grid {
  display: grid;
}

.gallery-item {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  background: #f6f6f6;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: transform 0.2s;
}

.gallery-item:hover {
  transform: scale(1.02);
}

.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Lightbox */
.lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
  z-index: 10;
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
  z-index: 10;
}

.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.2);
}

.lightbox-nav.prev {
  left: 16px;
}

.lightbox-nav.next {
  right: 16px;
}

.lightbox-content {
  max-width: 90vw;
  max-height: 90vh;
}

.lightbox-content img {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
}

.lightbox-counter {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  color: #fff;
  font-size: 14px;
  background: rgba(0, 0, 0, 0.5);
  padding: 8px 16px;
  border-radius: 100px;
}

/* Animation */
.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.3s ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}
</style>
