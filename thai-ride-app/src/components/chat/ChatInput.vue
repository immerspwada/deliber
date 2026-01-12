<script setup lang="ts">
import { ref } from 'vue';
import type { QuickReply } from '@/types/chat';

interface Props {
  disabled?: boolean;
  sending?: boolean;
  quickReplies?: QuickReply[];
  showQuickReplies?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  sending: false,
  quickReplies: () => [],
  showQuickReplies: true,
});

const emit = defineEmits<{
  send: [message: string];
  quickReply: [reply: QuickReply];
  sendLocation: [];
}>();

const message = ref('');
const showQuickReplyPanel = ref(false);

function handleSend(): void {
  if (!message.value.trim() || props.disabled || props.sending) return;

  emit('send', message.value.trim());
  message.value = '';
}

function handleQuickReply(reply: QuickReply): void {
  emit('quickReply', reply);
  showQuickReplyPanel.value = false;
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
}
</script>

<template>
  <div class="bg-white border-t border-gray-100">
    <!-- Quick replies panel -->
    <div
      v-if="showQuickReplyPanel && quickReplies.length > 0"
      class="p-3 border-b border-gray-100 bg-gray-50"
    >
      <p class="text-xs text-gray-500 mb-2">ข้อความด่วน</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="reply in quickReplies"
          :key="reply.id"
          class="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm
                 hover:bg-primary hover:text-white hover:border-primary
                 transition-colors duration-200"
          @click="handleQuickReply(reply)"
        >
          <span v-if="reply.icon" class="mr-1">{{ reply.icon }}</span>
          {{ reply.text }}
        </button>
      </div>
    </div>

    <!-- Input area -->
    <div class="p-3 flex items-end gap-2">
      <!-- Quick reply toggle -->
      <button
        v-if="showQuickReplies && quickReplies.length > 0"
        class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
               text-gray-500 hover:bg-gray-100 transition-colors"
        :class="{ 'bg-primary/10 text-primary': showQuickReplyPanel }"
        @click="showQuickReplyPanel = !showQuickReplyPanel"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>

      <!-- Location button -->
      <button
        class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
               text-gray-500 hover:bg-gray-100 transition-colors"
        @click="emit('sendLocation')"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      <!-- Text input -->
      <div class="flex-1 relative">
        <textarea
          v-model="message"
          rows="1"
          class="w-full px-4 py-2.5 bg-gray-100 rounded-2xl resize-none
                 focus:outline-none focus:ring-2 focus:ring-primary/20
                 placeholder-gray-400 text-gray-800"
          placeholder="พิมพ์ข้อความ..."
          :disabled="disabled"
          @keydown="handleKeydown"
        />
      </div>

      <!-- Send button -->
      <button
        class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
               bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed
               hover:bg-primary-dark transition-colors"
        :disabled="!message.trim() || disabled || sending"
        @click="handleSend"
      >
        <svg
          v-if="sending"
          class="w-5 h-5 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>
  </div>
</template>
