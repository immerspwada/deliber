<script setup lang="ts">
/**
 * Feature: F293 - Vehicle Animation
 * Animated vehicle icon for loading states
 */
withDefaults(defineProps<{
  type?: 'car' | 'motorcycle' | 'truck'
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}>(), {
  type: 'car',
  size: 'md',
  animated: true
})

const sizes = { sm: 32, md: 48, lg: 64 }
</script>

<template>
  <div class="vehicle-animation" :class="[size, { animated }]">
    <svg :width="sizes[size]" :height="sizes[size]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <!-- Car -->
      <g v-if="type === 'car'">
        <path d="M5 17a2 2 0 104 0 2 2 0 00-4 0zM15 17a2 2 0 104 0 2 2 0 00-4 0z"/>
        <path d="M5 17H3v-4l2-5h10l4 5v4h-2M5 17h10"/>
        <path d="M5 8l1.5-3h7L15 8"/>
      </g>
      
      <!-- Motorcycle -->
      <g v-else-if="type === 'motorcycle'">
        <circle cx="5" cy="17" r="2"/>
        <circle cx="19" cy="17" r="2"/>
        <path d="M5 17h2l3-6h4l2 3h3"/>
        <path d="M12 11V8"/>
      </g>
      
      <!-- Truck -->
      <g v-else>
        <path d="M1 14h12v7H1z"/>
        <path d="M13 17h8v4h-8z"/>
        <path d="M13 14l4-4h4v7"/>
        <circle cx="5" cy="21" r="2"/>
        <circle cx="17" cy="21" r="2"/>
      </g>
    </svg>
    
    <div v-if="animated" class="road">
      <div class="line"></div>
      <div class="line"></div>
      <div class="line"></div>
    </div>
  </div>
</template>

<style scoped>
.vehicle-animation {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.vehicle-animation.animated svg {
  animation: bounce 0.6s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.road {
  display: flex;
  gap: 8px;
}

.line {
  width: 20px;
  height: 3px;
  background: #e5e5e5;
  border-radius: 2px;
  animation: road 0.8s linear infinite;
}

.line:nth-child(2) { animation-delay: 0.2s; }
.line:nth-child(3) { animation-delay: 0.4s; }

@keyframes road {
  0% { transform: translateX(30px); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateX(-30px); opacity: 0; }
}

.vehicle-animation.sm .line { width: 12px; height: 2px; }
.vehicle-animation.lg .line { width: 28px; height: 4px; }
</style>
