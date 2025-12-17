<script setup lang="ts">
/**
 * Feature: F386 - Mentions
 * Mention input component
 */
import { ref, computed } from 'vue'

interface User { id: string; name: string; avatar?: string }

const props = withDefaults(defineProps<{
  modelValue: string
  users: User[]
  trigger?: string
}>(), {
  trigger: '@'
})

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void; (e: 'mention', user: User): void }>()

const showSuggestions = ref(false)
const searchQuery = ref('')
const cursorPosition = ref(0)

const filteredUsers = computed(() => {
  if (!searchQuery.value) return props.users.slice(0, 5)
  return props.users.filter(u => u.name.toLowerCase().includes(searchQuery.value.toLowerCase())).slice(0, 5)
})

const onInput = (e: Event) => {
  const target = e.target as HTMLTextAreaElement
  const value = target.value
  cursorPosition.value = target.selectionStart || 0
  emit('update:modelValue', value)
  
  const beforeCursor = value.slice(0, cursorPosition.value)
  const triggerRegex = new RegExp(`\\${props.trigger}(\\w*)$`)
  const match = beforeCursor.match(triggerRegex)
  if (match) {
    searchQuery.value = match[1] || ''
    showSuggestions.value = true
  } else {
    showSuggestions.value = false
  }
}

const selectUser = (user: User) => {
  const beforeCursor = props.modelValue.slice(0, cursorPosition.value)
  const afterCursor = props.modelValue.slice(cursorPosition.value)
  const mentionStart = beforeCursor.lastIndexOf(props.trigger)
  const newValue = beforeCursor.slice(0, mentionStart) + `${props.trigger}${user.name} ` + afterCursor
  emit('update:modelValue', newValue)
  emit('mention', user)
  showSuggestions.value = false
}

const hideSuggestions = () => {
  window.setTimeout(() => { showSuggestions.value = false }, 200)
}
</script>

<template>
  <div class="mentions">
    <textarea :value="modelValue" class="mentions-input" @input="onInput" @blur="hideSuggestions"></textarea>
    <div v-if="showSuggestions && filteredUsers.length" class="suggestions">
      <div v-for="user in filteredUsers" :key="user.id" class="suggestion-item" @mousedown.prevent="selectUser(user)">
        <div class="user-avatar">
          <img v-if="user.avatar" :src="user.avatar" alt="" />
          <span v-else>{{ user.name.charAt(0) }}</span>
        </div>
        <span class="user-name">{{ user.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mentions { position: relative; }
.mentions-input { width: 100%; min-height: 80px; padding: 12px; border: 1px solid #e5e5e5; border-radius: 8px; font-size: 14px; resize: vertical; }
.mentions-input:focus { outline: none; border-color: #000; }
.suggestions { position: absolute; bottom: 100%; left: 0; right: 0; margin-bottom: 4px; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; }
.suggestion-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; }
.suggestion-item:hover { background: #f6f6f6; }
.user-avatar { width: 32px; height: 32px; border-radius: 50%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; overflow: hidden; font-size: 14px; font-weight: 500; }
.user-avatar img { width: 100%; height: 100%; object-fit: cover; }
.user-name { font-size: 14px; color: #000; }
</style>
