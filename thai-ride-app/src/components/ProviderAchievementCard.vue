<script setup lang="ts">
/**
 * Feature: F357 - Provider Achievement Card
 * Achievement/badge card for providers
 */
interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  progress: number
  target: number
  unlocked: boolean
  unlockedAt?: string
}

const props = defineProps<{ achievement: Achievement }>()

const progressPercent = () => Math.min((props.achievement.progress / props.achievement.target) * 100, 100)

const formatDate = (date?: string) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="provider-achievement-card" :class="{ unlocked: achievement.unlocked }">
    <div class="achievement-icon" :class="{ locked: !achievement.unlocked }">
      <span v-html="achievement.icon"></span>
    </div>
    
    <div class="achievement-content">
      <h4 class="achievement-title">{{ achievement.title }}</h4>
      <p class="achievement-desc">{{ achievement.description }}</p>
      
      <div v-if="!achievement.unlocked" class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent() + '%' }"></div>
        </div>
        <span class="progress-text">{{ achievement.progress }}/{{ achievement.target }}</span>
      </div>
      
      <span v-else class="unlocked-date">ปลดล็อคเมื่อ {{ formatDate(achievement.unlockedAt) }}</span>
    </div>
    
    <div v-if="achievement.unlocked" class="unlocked-badge">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#22c55e" stroke="#22c55e" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01" fill="none" stroke="#fff"/>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.provider-achievement-card { display: flex; gap: 12px; background: #fff; border-radius: 12px; padding: 16px; border: 1px solid #e5e5e5; position: relative; }
.provider-achievement-card.unlocked { border-color: #22c55e; background: #f0fdf4; }
.achievement-icon { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: #f6f6f6; border-radius: 12px; font-size: 24px; }
.achievement-icon.locked { filter: grayscale(1); opacity: 0.5; }
.achievement-content { flex: 1; }
.achievement-title { font-size: 14px; font-weight: 600; color: #000; margin: 0 0 4px; }
.achievement-desc { font-size: 13px; color: #6b6b6b; margin: 0 0 8px; }
.progress-section { display: flex; align-items: center; gap: 8px; }
.progress-bar { flex: 1; height: 6px; background: #e5e5e5; border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: #000; border-radius: 3px; transition: width 0.3s; }
.progress-text { font-size: 12px; color: #6b6b6b; }
.unlocked-date { font-size: 12px; color: #22c55e; }
.unlocked-badge { position: absolute; top: 12px; right: 12px; }
</style>
