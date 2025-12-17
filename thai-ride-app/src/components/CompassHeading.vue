<script setup lang="ts">
/**
 * Feature: F282 - Compass Heading
 * Compass direction indicator
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  heading: number
  showDegrees?: boolean
  size?: 'sm' | 'md' | 'lg'
}>(), {
  showDegrees: true,
  size: 'md'
})

const direction = computed(() => {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(props.heading / 45) % 8
  return dirs[index]
})

const sizes: Record<string, { compass: number; needle: number }> = {
  sm: { compass: 48, needle: 20 },
  md: { compass: 64, needle: 28 },
  lg: { compass: 80, needle: 36 }
}
</script>

<template>
  <div class="compass-heading" :class="size">
    <div class="compass" :style="{ width: (sizes[size]?.compass || 64) + 'px', height: (sizes[size]?.compass || 64) + 'px' }">
      <div class="compass-ring">
        <span class="cardinal n">N</span>
        <span class="cardinal e">E</span>
        <span class="cardinal s">S</span>
        <span class="cardinal w">W</span>
      </div>
      <div class="needle" :style="{ transform: `rotate(${heading}deg)`, height: (sizes[size]?.needle || 28) + 'px' }">
        <div class="needle-north"></div>
        <div class="needle-south"></div>
      </div>
    </div>
    <div class="info">
      <span class="direction">{{ direction }}</span>
      <span v-if="showDegrees" class="degrees">{{ Math.round(heading) }}°</span>
    </div>
  </div>
</template>

<style scoped>
.compass-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}

.compass {
  position: relative;
  border-radius: 50%;
  background: #f6f6f6;
  border: 2px solid #e5e5e5;
}

.compass-ring {
  position: absolute;
  inset: 4px;
}

.cardinal {
  position: absolute;
  font-size: 8px;
  font-weight: 600;
  color: #6b6b6b;
}

.cardinal.n { top: 0; left: 50%; transform: translateX(-50%); color: #e11900; }
.cardinal.e { right: 0; top: 50%; transform: translateY(-50%); }
.cardinal.s { bottom: 0; left: 50%; transform: translateX(-50%); }
.cardinal.w { left: 0; top: 50%; transform: translateY(-50%); }

.needle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  transform-origin: center top;
  margin-left: -2px;
  margin-top: 0;
  transition: transform 0.3s ease-out;
}

.needle-north,
.needle-south {
  width: 100%;
  height: 50%;
}

.needle-north {
  background: #e11900;
  border-radius: 2px 2px 0 0;
}

.needle-south {
  background: #000;
  border-radius: 0 0 2px 2px;
}

.info {
  display: flex;
  flex-direction: column;
}

.direction {
  font-size: 18px;
  font-weight: 700;
  color: #000;
}

.degrees {
  font-size: 12px;
  color: #6b6b6b;
}

.compass-heading.sm .direction { font-size: 14px; }
.compass-heading.sm .degrees { font-size: 10px; }
.compass-heading.lg .direction { font-size: 22px; }
.compass-heading.lg .degrees { font-size: 14px; }
</style>
