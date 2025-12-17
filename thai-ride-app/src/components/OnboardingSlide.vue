<script setup lang="ts">
/**
 * Feature: F275 - Onboarding Slide
 * Single onboarding slide component
 */
defineProps<{
  title: string
  description: string
  imageUrl?: string
  icon?: string
}>()
</script>

<template>
  <div class="onboarding-slide">
    <div class="illustration">
      <img v-if="imageUrl" :src="imageUrl" :alt="title" class="image" />
      <div v-else class="icon-placeholder">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      </div>
    </div>
    
    <div class="content">
      <h2 class="title">{{ title }}</h2>
      <p class="description">{{ description }}</p>
    </div>
  </div>
</template>

<style scoped>
.onboarding-slide {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 24px;
  text-align: center;
  min-height: 100%;
}

.illustration {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40px;
}

.image {
  max-width: 280px;
  max-height: 280px;
  object-fit: contain;
}

.icon-placeholder {
  width: 200px;
  height: 200px;
  background: #f6f6f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ccc;
}

.content {
  max-width: 320px;
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
</style>
