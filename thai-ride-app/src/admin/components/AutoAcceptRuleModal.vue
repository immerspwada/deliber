<template>
  <div class="modal-placeholder">
    <p>AutoAcceptRuleModal - To be implemented</p>
  </div>
</template>

<script setup lang="ts">
// Placeholder component
defineProps<{
  show: boolean
  rule?: unknown
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'save', rule: unknown): void
}>()
</script>

<style scoped>
.modal-placeholder {
  padding: 2rem;
  text-align: center;
}
</style>
