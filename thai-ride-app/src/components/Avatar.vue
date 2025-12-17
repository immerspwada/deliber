<script setup lang="ts">
/**
 * Feature: F74 - Avatar Component
 * User avatar with fallback initials
 */
import { computed } from 'vue'

interface Props {
  src?: string | null
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  online?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  src: null,
  name: '',
  size: 'md',
  online: false
})

const initials = computed(() => {
  if (!props.name) return '?'
  const parts = props.name.trim().split(' ')
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return ((parts[0][0] || '') + (parts[1][0] || '')).toUpperCase()
  }
  return props.name.slice(0, 2).toUpperCase()
})

const sizeClass = computed(() => `size-${props.size}`)
</script>

<template>
  <div class="avatar" :class="sizeClass">
    <img v-if="src" :src="src" :alt="name" class="avatar-img" />
    <span v-else class="avatar-initials">{{ initials }}</span>
    <span v-if="online" class="online-indicator" />
  </div>
</template>

<style scoped>
.avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  font-weight: 600;
  color: #6b6b6b;
}

.online-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 25%;
  height: 25%;
  min-width: 8px;
  min-height: 8px;
  background: #00c853;
  border: 2px solid #fff;
  border-radius: 50%;
}

/* Size variants */
.size-xs {
  width: 24px;
  height: 24px;
}

.size-xs .avatar-initials {
  font-size: 10px;
}

.size-sm {
  width: 32px;
  height: 32px;
}

.size-sm .avatar-initials {
  font-size: 12px;
}

.size-md {
  width: 40px;
  height: 40px;
}

.size-md .avatar-initials {
  font-size: 14px;
}

.size-lg {
  width: 56px;
  height: 56px;
}

.size-lg .avatar-initials {
  font-size: 18px;
}

.size-xl {
  width: 80px;
  height: 80px;
}

.size-xl .avatar-initials {
  font-size: 24px;
}
</style>
