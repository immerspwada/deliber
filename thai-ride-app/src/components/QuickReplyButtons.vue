<script setup lang="ts">
/**
 * Feature: F218 - Quick Reply Buttons
 * Quick reply buttons for chat
 */
interface QuickReply {
  id: string
  text: string
  icon?: string
}

defineProps<{
  replies: QuickReply[]
}>()

const emit = defineEmits<{
  select: [reply: QuickReply]
}>()
</script>

<template>
  <div class="quick-reply-buttons">
    <button v-for="reply in replies" :key="reply.id" type="button" class="reply-btn" @click="emit('select', reply)">
      <span v-if="reply.icon" class="reply-icon" v-html="reply.icon" />
      {{ reply.text }}
    </button>
  </div>
</template>

<style scoped>
.quick-reply-buttons { display: flex; gap: 8px; flex-wrap: wrap; padding: 12px 16px; }
.reply-btn { display: flex; align-items: center; gap: 6px; padding: 10px 16px; background: #fff; border: 1px solid #e5e5e5; border-radius: 20px; font-size: 13px; color: #000; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.reply-btn:hover { background: #f6f6f6; border-color: #000; }
.reply-icon { width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; }
</style>
