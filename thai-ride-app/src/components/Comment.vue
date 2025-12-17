<script setup lang="ts">
/**
 * Feature: F393 - Comment
 * Comment/reply component
 */
interface Author { name: string; avatar?: string }

defineProps<{
  author: Author
  content: string
  datetime?: string
  actions?: Array<{ key: string; label: string; icon?: string }>
}>()

const emit = defineEmits<{ (e: 'action', key: string): void }>()
</script>

<template>
  <div class="comment">
    <div class="comment-avatar">
      <img v-if="author.avatar" :src="author.avatar" alt="" />
      <span v-else>{{ author.name.charAt(0) }}</span>
    </div>
    <div class="comment-content">
      <div class="comment-header">
        <span class="author-name">{{ author.name }}</span>
        <span v-if="datetime" class="comment-time">{{ datetime }}</span>
      </div>
      <p class="comment-text">{{ content }}</p>
      <div v-if="actions?.length" class="comment-actions">
        <button v-for="action in actions" :key="action.key" type="button" class="action-btn" @click="emit('action', action.key)">
          <span v-if="action.icon" v-html="action.icon"></span>
          {{ action.label }}
        </button>
      </div>
      <div class="comment-replies">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.comment { display: flex; gap: 12px; }
.comment-avatar { width: 40px; height: 40px; border-radius: 50%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; overflow: hidden; font-size: 16px; font-weight: 500; color: #6b6b6b; flex-shrink: 0; }
.comment-avatar img { width: 100%; height: 100%; object-fit: cover; }
.comment-content { flex: 1; }
.comment-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.author-name { font-size: 14px; font-weight: 600; color: #000; }
.comment-time { font-size: 12px; color: #6b6b6b; }
.comment-text { font-size: 14px; color: #000; line-height: 1.5; margin: 0 0 8px; }
.comment-actions { display: flex; gap: 16px; }
.action-btn { display: flex; align-items: center; gap: 4px; background: none; border: none; font-size: 12px; color: #6b6b6b; cursor: pointer; }
.action-btn:hover { color: #000; }
.comment-replies { margin-top: 16px; padding-left: 16px; border-left: 2px solid #e5e5e5; }
</style>
