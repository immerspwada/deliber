<script setup lang="ts">
/**
 * Feature: F396 - QR Code
 * QR Code generator component
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  value: string
  size?: number
  color?: string
  bgColor?: string
  errorLevel?: 'L' | 'M' | 'Q' | 'H'
}>(), {
  size: 128,
  color: '#000000',
  bgColor: '#FFFFFF',
  errorLevel: 'M'
})

// Simple QR code placeholder - in production use a library like qrcode
const qrUrl = computed(() => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${props.size}x${props.size}&data=${encodeURIComponent(props.value)}&color=${props.color.replace('#', '')}&bgcolor=${props.bgColor.replace('#', '')}&ecc=${props.errorLevel}`
})
</script>

<template>
  <div class="qr-code" :style="{ width: size + 'px', height: size + 'px' }">
    <img :src="qrUrl" :alt="value" :width="size" :height="size" />
  </div>
</template>

<style scoped>
.qr-code { display: inline-block; border-radius: 8px; overflow: hidden; background: #fff; padding: 8px; border: 1px solid #e5e5e5; }
.qr-code img { display: block; }
</style>
