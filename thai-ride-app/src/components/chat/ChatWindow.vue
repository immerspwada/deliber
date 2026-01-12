<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue';
import { useChat } from '@/composables/useChat';
import ChatBubble from './ChatBubble.vue';
import ChatInput from './ChatInput.vue';
import type { QuickReply } from '@/types/chat';

interface Props {
  rideId: string;
  userId: string;
  providerId?: string;
  userType: 'customer' | 'provider';
  partnerName?: string;
  partnerAvatar?: string;
  isOpen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: true,
});

const emit = defineEmits<{
  close: [];
  unreadChange: [count: number];
}>();

const messagesContainer = ref<HTMLElement | null>(null);

const {
  messages,
  loading,
  sending,
  error,
  unreadCount,
  quickReplies,
  sendMessage,
  sendQuickReply,
  sendLocation,
  markAsRead,
} = useChat({
  rideId: props.rideId,
  userId: props.userId,
  providerId: props.providerId,
  userType: props.userType,
});

// Scroll to bottom when new messages arrive
watch(
  () => messages.value.length,
  async () => {
    await nextTick();
    scrollToBottom();
  }
);

// Emit unread count changes
watch(unreadCount, (count) => {
  emit('unreadChange', count);
});

// Mark as read when window is open
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      markAsRead();
    }
  },
  { immediate: true }
);

function scrollToBottom(): void {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

async function handleSend(text: string): Promise<void> {
  await sendMessage(text);
}

async function handleQuickReply(reply: QuickReply): Promise<void> {
  await sendQuickReply(reply);
}

async function handleSendLocation(): Promise<void> {
  if (!navigator.geolocation) {
    alert('เบราว์เซอร์ไม่รองรับการแชร์ตำแหน่ง');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      await sendLocation(position.coords.latitude, position.coords.longitude);
    },
    (err) => {
      console.error('Geolocation error:', err);
      alert('ไม่สามารถดึงตำแหน่งได้');
    }
  );
}

onMounted(() => {
  scrollToBottom();
});
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50">
    <!-- Header -->
    <div class="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
      <button
        class="w-8 h-8 rounded-full flex items-center justify-center
               text-gray-500 hover:bg-gray-100 transition-colors"
        @click="emit('close')"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <div class="flex items-center gap-3 flex-1">
        <div
          class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden"
        >
          <img
            v-if="partnerAvatar"
            :src="partnerAvatar"
            :alt="partnerName"
            class="w-full h-full object-cover"
          />
          <svg v-else class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
            />
          </svg>
        </div>

        <div>
          <h3 class="font-semibold text-gray-800">
            {{ partnerName || (userType === 'customer' ? 'คนขับ' : 'ลูกค้า') }}
          </h3>
          <p class="text-xs text-green-500">ออนไลน์</p>
        </div>
      </div>

      <!-- Call button -->
      <a
        v-if="userType === 'customer'"
        href="tel:"
        class="w-10 h-10 rounded-full flex items-center justify-center
               text-primary hover:bg-primary/10 transition-colors"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path
            d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
          />
        </svg>
      </a>
    </div>

    <!-- Messages -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto p-4 space-y-1"
    >
      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-8">
        <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-8">
        <p class="text-red-500 text-sm">{{ error }}</p>
        <button
          class="mt-2 text-primary text-sm underline"
          @click="() => {}"
        >
          ลองใหม่
        </button>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="messages.length === 0"
        class="flex flex-col items-center justify-center py-12 text-gray-400"
      >
        <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <p class="text-sm">เริ่มการสนทนา</p>
        <p class="text-xs mt-1">ส่งข้อความหาคู่สนทนาของคุณ</p>
      </div>

      <!-- Messages list -->
      <template v-else>
        <ChatBubble
          v-for="msg in messages"
          :key="msg.id"
          :message="msg"
          :is-own="msg.sender_id === userId"
          :show-avatar="msg.sender_id !== userId"
          :avatar-url="msg.sender_id !== userId ? partnerAvatar : undefined"
          :sender-name="msg.sender_id !== userId ? partnerName : undefined"
        />
      </template>
    </div>

    <!-- Input -->
    <ChatInput
      :disabled="loading"
      :sending="sending"
      :quick-replies="quickReplies"
      @send="handleSend"
      @quick-reply="handleQuickReply"
      @send-location="handleSendLocation"
    />
  </div>
</template>
