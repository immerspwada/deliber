<script setup lang="ts">
/**
 * Feature: F173 - Promo Banner
 * Display promotional banner with action
 */

interface Props {
  title: string
  description?: string
  code?: string
  discount?: string
  bgColor?: string
  textColor?: string
  expiresAt?: string
  imageUrl?: string
}

withDefaults(defineProps<Props>(), {
  bgColor: '#000',
  textColor: '#fff'
})

const emit = defineEmits<{
  click: []
  copy: [code: string]
}>()

const copyCode = (code: string) => {
  navigator.clipboard.writeText(code)
  emit('copy', code)
}
</script>

<template>
  <div 
    class="promo-banner" 
    :style="{ background: bgColor, color: textColor }"
    @click="emit('click')"
  >
    <div class="banner-content">
      <h3 class="banner-title">{{ title }}</h3>
      <p v-if="description" class="banner-desc">{{ description }}</p>
      <div class="banner-footer">
        <button 
          v-if="code" 
          type="button" 
          class="code-btn"
          @click.stop="copyCode(code)"
        >
          <span class="code-text">{{ code }}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
        </button>
        <span v-if="discount" class="discount-badge">{{ discount }}</span>
        <span v-if="expiresAt" class="expires-text">หมดอายุ {{ expiresAt }}</span>
      </div>
    </div>
    <div v-if="imageUrl" class="banner-image">
      <img :src="imageUrl" alt="" />
    </div>
  </div>
</template>

<style scoped>
.promo-banner {
  display: flex;
  align-items: center;
  border-radius: 14px;
  padding: 16px;
  cursor: pointer;
  overflow: hidden;
  position: relative;
}

.banner-content {
  flex: 1;
  z-index: 1;
}

.banner-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 6px;
}

.banner-desc {
  font-size: 13px;
  opacity: 0.9;
  margin: 0 0 12px;
  line-height: 1.4;
}

.banner-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.code-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px dashed rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  color: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.code-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.discount-badge {
  font-size: 14px;
  font-weight: 700;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
}

.expires-text {
  font-size: 11px;
  opacity: 0.7;
}

.banner-image {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
}

.banner-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>