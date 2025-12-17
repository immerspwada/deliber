<script setup lang="ts">
/**
 * Feature: F156 - Delivery Item Card
 * Display delivery package item
 */

interface Props {
  name: string
  description?: string
  quantity?: number
  weight?: string
  size?: 'small' | 'medium' | 'large'
  fragile?: boolean
  photo?: string
}

withDefaults(defineProps<Props>(), {
  quantity: 1,
  fragile: false
})

const sizeLabels = {
  small: 'เล็ก',
  medium: 'กลาง',
  large: 'ใหญ่'
}
</script>

<template>
  <div class="delivery-item-card">
    <div v-if="photo" class="item-photo">
      <img :src="photo" :alt="name" />
    </div>
    <div v-else class="item-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
        <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>
      </svg>
    </div>
    
    <div class="item-info">
      <h4 class="item-name">{{ name }}</h4>
      <p v-if="description" class="item-desc">{{ description }}</p>
      <div class="item-meta">
        <span v-if="quantity > 1" class="meta-tag">x{{ quantity }}</span>
        <span v-if="weight" class="meta-tag">{{ weight }}</span>
        <span v-if="size" class="meta-tag">{{ sizeLabels[size] }}</span>
        <span v-if="fragile" class="meta-tag fragile">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          แตกง่าย
        </span>
      </div>
    </div>
  </div>
</template>


<style scoped>
.delivery-item-card {
  display: flex;
  gap: 12px;
  padding: 14px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
}

.item-photo {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
}

.item-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 10px;
  color: #6b6b6b;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 15px;
  font-weight: 600;
  color: #000;
  margin: 0 0 4px;
}

.item-desc {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0 0 8px;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  padding: 4px 8px;
  background: #f6f6f6;
  border-radius: 6px;
  color: #6b6b6b;
}

.meta-tag.fragile {
  background: #fff3e0;
  color: #ef6c00;
}
</style>
