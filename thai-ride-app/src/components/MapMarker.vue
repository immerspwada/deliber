<script setup lang="ts">
/**
 * Feature: F119 - Map Marker
 * Custom map marker component
 */
interface Props {
  type: 'pickup' | 'dropoff' | 'driver' | 'stop' | 'user'
  label?: string
  pulse?: boolean
  size?: 'sm' | 'md' | 'lg'
}

withDefaults(defineProps<Props>(), {
  label: '',
  pulse: false,
  size: 'md'
})
</script>

<template>
  <div class="map-marker" :class="[type, `size-${size}`, { pulse }]">
    <div class="marker-icon">
      <!-- Pickup marker -->
      <svg v-if="type === 'pickup'" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="8"/>
      </svg>
      <!-- Dropoff marker -->
      <svg v-else-if="type === 'dropoff'" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
      <!-- Driver marker -->
      <svg v-else-if="type === 'driver'" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
      </svg>
      <!-- Stop marker -->
      <svg v-else-if="type === 'stop'" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="6" width="12" height="12" rx="2"/>
      </svg>
      <!-- User marker -->
      <svg v-else viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10"/>
      </svg>
    </div>
    
    <span v-if="label" class="marker-label">{{ label }}</span>
    
    <div v-if="pulse" class="pulse-ring" />
  </div>
</template>

<style scoped>
.map-marker {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.marker-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* Size variants */
.size-sm .marker-icon {
  width: 24px;
  height: 24px;
}

.size-sm .marker-icon svg {
  width: 14px;
  height: 14px;
}

.size-md .marker-icon {
  width: 36px;
  height: 36px;
}

.size-md .marker-icon svg {
  width: 20px;
  height: 20px;
}

.size-lg .marker-icon {
  width: 48px;
  height: 48px;
}

.size-lg .marker-icon svg {
  width: 28px;
  height: 28px;
}

/* Type colors */
.pickup .marker-icon {
  background: #00c853;
  color: #fff;
}

.dropoff .marker-icon {
  background: #e11900;
  color: #fff;
}

.driver .marker-icon {
  background: #000;
  color: #fff;
}

.stop .marker-icon {
  background: #276ef1;
  color: #fff;
}

.user .marker-icon {
  background: #276ef1;
  color: #fff;
}

.marker-label {
  margin-top: 4px;
  padding: 2px 8px;
  background: #fff;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #000;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
}

.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  animation: pulse-ring 2s infinite;
}

.size-sm .pulse-ring {
  width: 40px;
  height: 40px;
}

.size-md .pulse-ring {
  width: 60px;
  height: 60px;
}

.size-lg .pulse-ring {
  width: 80px;
  height: 80px;
}

.pickup .pulse-ring {
  background: rgba(0, 200, 83, 0.3);
}

.dropoff .pulse-ring {
  background: rgba(225, 25, 0, 0.3);
}

.driver .pulse-ring {
  background: rgba(0, 0, 0, 0.2);
}

.user .pulse-ring {
  background: rgba(39, 110, 241, 0.3);
}

@keyframes pulse-ring {
  0% {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0;
  }
}
</style>
