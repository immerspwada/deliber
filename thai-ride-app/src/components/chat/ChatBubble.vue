<script setup lang="ts">
import { computed } from 'vue';
import type { ChatMessage } from '@/types/chat';

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  showAvatar?: boolean;
  avatarUrl?: string;
  senderName?: string;
}

const props = withDefaults(defineProps<Props>(), {
  showAvatar: false,
});

const formattedTime = computed(() => {
  const date = new Date(props.message.created_at);
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
});

const isLocation = computed(() => props.message.message_type === 'location');
const isQuickReply = computed(() => props.message.message_type === 'quick_reply');
const isSystem = computed(() => props.message.sender_type === 'system');

function openLocation(): void {
  if (props.message.metadata?.lat && props.message.metadata?.lng) {
    const { lat, lng } = props.message.metadata as { lat: number; lng: number };
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  }
}
</script>

<template>
  <div
    class="flex gap-2 mb-3"
    :class="[isOwn ? 'flex-row-reverse' : 'flex-row']"
  >
    <!-- Avatar -->
    <div v-if="showAvatar && !isOwn" class="flex-shrink-0">
      <div
        class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden"
      >
        <img
          v-if="avatarUrl"
          :src="avatarUrl"
          :alt="senderName"
          class="w-full h-full object-cover"
        />
        <svg
          v-else
          class="w-5 h-5 text-gray-400"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
          />
        </svg>
      </div>
    </div>

    <!-- Message content -->
    <div class="max-w-[75%]">
      <!-- System message -->
      <div
        v-if="isSystem"
        class="text-center text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1"
      >
        {{ message.message }}
      </div>

      <!-- Regular message -->
      <div
        v-else
        class="rounded-2xl px-4 py-2 shadow-sm"
        :class="[
          isOwn
            ? 'bg-primary text-white rounded-br-md'
            : 'bg-white text-gray-800 rounded-bl-md border border-gray-100',
          isLocation ? 'cursor-pointer hover:opacity-90' : '',
        ]"
        @click="isLocation ? openLocation() : undefined"
      >
        <!-- Location message -->
        <div v-if="isLocation" class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
            />
          </svg>
          <span class="underline">{{ message.message }}</span>
        </div>

        <!-- Quick reply badge -->
        <div v-else-if="isQuickReply" class="flex items-center gap-1">
          <span class="text-lg">{{ getQuickReplyIcon() }}</span>
          <span>{{ message.message }}</span>
        </div>

        <!-- Text message -->
        <p v-else class="whitespace-pre-wrap break-words">
          {{ message.message }}
        </p>
      </div>

      <!-- Time & read status -->
      <div
        class="flex items-center gap-1 mt-1 text-xs text-gray-400"
        :class="[isOwn ? 'justify-end' : 'justify-start']"
      >
        <span>{{ formattedTime }}</span>
        <svg
          v-if="isOwn && message.is_read"
          class="w-4 h-4 text-primary"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"
          />
        </svg>
        <svg
          v-else-if="isOwn"
          class="w-4 h-4 text-gray-300"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
function getQuickReplyIcon(): string {
  return '💬';
}
</script>
