<script setup lang="ts">
/**
 * Feature: F365 - Typewriter
 * Typewriter text animation
 */
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  text: string
  speed?: number
  delay?: number
  cursor?: boolean
}>(), {
  speed: 50,
  delay: 0,
  cursor: true
})

const emit = defineEmits<{ (e: 'complete'): void }>()

const displayText = ref('')
let timeout: ReturnType<typeof setTimeout>
let index = 0

const type = () => {
  if (index < props.text.length) {
    displayText.value += props.text.charAt(index)
    index++
    timeout = setTimeout(type, props.speed)
  } else {
    emit('complete')
  }
}

const start = () => {
  displayText.value = ''
  index = 0
  timeout = setTimeout(type, props.delay)
}

watch(() => props.text, start)
onMounted(start)
onUnmounted(() => clearTimeout(timeout))
</script>

<template>
  <span class="typewriter">
    {{ displayText }}<span v-if="cursor" class="cursor">|</span>
  </span>
</template>

<style scoped>
.typewriter { display: inline; }
.cursor { animation: blink 1s infinite; }
@keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
</style>
