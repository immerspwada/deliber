<script setup lang="ts">
/**
 * Feature: F158 - Queue Booking Tracking
 * Customer view for tracking queue booking status
 * Fixed: Now properly fetches booking data before subscribing
 * Added: Chat integration for queue bookings
 */
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQueueBooking } from "../composables/useQueueBooking";
import { useChat } from "../composables/useChat";
import type { BookingType } from "../composables/useChat";
import { useToast } from "../composables/useToast";

const route = useRoute();
const router = useRouter();
const { success: showSuccess, error: showError } = useToast();
const {
  currentBooking: currentRequest,
  providerInfo,
  loading,
  loadingProvider,
  error,
  fetchBooking,
  subscribeToBooking,
  unsubscribe,
  cancelBooking,
  submitRating,
  categoryLabels,
  canCancel,
  canRate,
} = useQueueBooking();

const bookingId = computed(() => route.params.id as string);

// Chat system
const showChatModal = ref(false);
const newMessage = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const chatInitialized = ref(false);

const {
  messages,
  loading: chatLoading,
  sending: chatSending,
  error: chatError,
  canSendMessage,
  isChatClosed,
  initialize: initializeChat,
  sendMessage: sendChatMessage,
  cleanupRealtimeSubscription
} = useChat(bookingId.value, 'queue' as BookingType);

// Rating state
const showRatingModal = ref(false);
const ratingValue = ref(5);
const ratingComment = ref("");
const submittingRating = ref(false);

const statusSteps = [
  { status: "pending", label: "รอดำเนินการ", icon: "clock" },
  { status: "confirmed", label: "ยืนยันแล้ว", icon: "check" },
  { status: "in_progress", label: "กำลังดำเนินการ", icon: "play" },
  { status: "completed", label: "เสร็จสิ้น", icon: "check-circle" },
];

const currentStepIndex = computed(() => {
  if (!currentRequest.value) return 0;
  if (currentRequest.value.status === "cancelled") return -1;
  return statusSteps.findIndex(
    (s) => s.status === currentRequest.value?.status
  );
});

const isCancelled = computed(
  () => currentRequest.value?.status === "cancelled"
);

const goBack = () => router.back();

const handleCancel = async () => {
  if (!confirm("ต้องการยกเลิกการจองนี้หรือไม่?")) return;
  const success = await cancelBooking(bookingId.value, "ลูกค้ายกเลิก");
  if (success) {
    showSuccess('ยกเลิกการจองเรียบร้อยแล้ว');
  } else {
    showError('ไม่สามารถยกเลิกได้');
  }
};

const handleRate = async () => {
  if (!currentRequest.value?.provider_id) return;

  submittingRating.value = true;
  const success = await submitRating(
    bookingId.value,
    currentRequest.value.provider_id,
    ratingValue.value,
    ratingComment.value || undefined
  );
  submittingRating.value = false;

  if (success) {
    showSuccess('ขอบคุณสำหรับการให้คะแนน!');
    showRatingModal.value = false;
  } else {
    showError('ไม่สามารถให้คะแนนได้');
  }
};

const formatDate = (date: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatTime = (time: string) => {
  return time?.substring(0, 5) || "-";
};

const formatDateTime = (datetime: string) => {
  if (!datetime) return "-";
  return new Date(datetime).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Helper to format phone number for tel: link
const formatPhoneLink = (phone: string) => {
  // Remove all non-digit characters
  return phone.replace(/\D/g, '')
}

// Helper to format phone number for display
const formatPhoneDisplay = (phone: string) => {
  // Format as XXX-XXX-XXXX
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

// Open chat modal with provider
const openChat = async () => {
  if (!currentRequest.value?.provider_id) {
    showError('ยังไม่มีผู้ให้บริการรับงาน');
    return;
  }
  
  showChatModal.value = true;
  
  // Initialize chat if not already initialized
  if (!chatInitialized.value) {
    try {
      await initializeChat();
      chatInitialized.value = true;
      
      // Scroll to bottom after messages load
      await nextTick();
      scrollToBottom();
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      showError('ไม่สามารถเปิดแชทได้');
      showChatModal.value = false;
    }
  } else {
    // Just scroll to bottom if already initialized
    await nextTick();
    scrollToBottom();
  }
};

// Close chat modal
const closeChat = () => {
  showChatModal.value = false;
};

// Send chat message
const handleSendMessage = async () => {
  if (!newMessage.value.trim() || !canSendMessage.value) return;
  
  const messageText = newMessage.value.trim();
  newMessage.value = '';
  
  try {
    await sendChatMessage(messageText);
    
    // Scroll to bottom after sending
    await nextTick();
    scrollToBottom();
  } catch (error) {
    console.error('Failed to send message:', error);
    showError('ไม่สามารถส่งข้อความได้');
    // Restore message on error
    newMessage.value = messageText;
  }
};

// Scroll chat to bottom
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// Format message timestamp
const formatMessageTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('th-TH', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

// Load booking data on mount
const loadBooking = async () => {
  const id = bookingId.value;
  if (!id) {
    router.push("/customer/services");
    return;
  }

  const booking = await fetchBooking(id);
  if (!booking) {
    showError('ไม่พบข้อมูลการจอง');
    router.push("/customer/services");
    return;
  }

  // Subscribe to realtime updates after fetching
  subscribeToBooking(id);
};

// Watch for route changes
watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      loadBooking();
    }
  }
);

onMounted(() => {
  loadBooking();
});

onUnmounted(() => {
  unsubscribe();
  
  // Cleanup chat subscription if initialized
  if (chatInitialized.value) {
    cleanupRealtimeSubscription();
  }
});
</script>

<template>
  <div class="tracking-page">
    <!-- Header -->
    <header class="header">
      <button class="back-btn" aria-label="ย้อนกลับ" @click="goBack">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h1>ติดตามการจองคิว</h1>
      <div class="spacer"></div>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>
      <p>{{ error }}</p>
      <button class="btn-primary" @click="loadBooking">ลองใหม่</button>
    </div>

    <!-- Main Content -->
    <main v-else-if="currentRequest" class="content">
      <!-- Tracking ID Card -->
      <div class="tracking-id-card" :class="{ cancelled: isCancelled }">
        <span class="label">หมายเลขติดตาม</span>
        <span class="tracking-id">{{ currentRequest.tracking_id }}</span>
        <span v-if="isCancelled" class="cancelled-badge">ยกเลิกแล้ว</span>
      </div>

      <!-- Cancelled Notice -->
      <div v-if="isCancelled" class="cancelled-notice">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
        <div class="notice-content">
          <span class="notice-title">การจองถูกยกเลิก</span>
          <span v-if="currentRequest.cancel_reason" class="notice-reason">{{
            currentRequest.cancel_reason
          }}</span>
          <span v-if="currentRequest.cancelled_at" class="notice-time">{{
            formatDateTime(currentRequest.cancelled_at)
          }}</span>
        </div>
      </div>

      <!-- Status Timeline (not shown if cancelled) -->
      <div v-else class="status-timeline">
        <div
          v-for="(step, index) in statusSteps"
          :key="step.status"
          :class="[
            'timeline-step',
            {
              active: index <= currentStepIndex,
              current: index === currentStepIndex,
            },
          ]"
        >
          <div class="step-dot">
            <svg
              v-if="index < currentStepIndex"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
            <span v-else>{{ index + 1 }}</span>
          </div>
          <div class="step-label">{{ step.label }}</div>
          <div v-if="index < statusSteps.length - 1" class="step-line"></div>
        </div>
      </div>

      <!-- Provider Info Card (shown when provider is assigned) -->
      <div v-if="currentRequest.provider_id && providerInfo" class="provider-info-card">
        <h3>ข้อมูลผู้ให้บริการ</h3>
        
        <div class="provider-header">
          <div class="provider-avatar">
            <img
              v-if="providerInfo.avatar_url"
              :src="providerInfo.avatar_url"
              alt="รูปผู้ให้บริการ"
              class="avatar-img"
            />
            <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
            </svg>
          </div>
          
          <div class="provider-main-info">
            <span class="provider-name">{{ providerInfo.name || 'ผู้ให้บริการ' }}</span>
            <span v-if="providerInfo.phone_number" class="provider-phone">
              {{ formatPhoneDisplay(providerInfo.phone_number) }}
            </span>
          </div>
          
          <div class="provider-actions">
            <!-- Call Button -->
            <a
              v-if="providerInfo.phone_number"
              :href="`tel:${formatPhoneLink(providerInfo.phone_number)}`"
              class="action-btn call"
              aria-label="โทรหาผู้ให้บริการ"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
            </a>
            
            <!-- Chat Button -->
            <button
              class="action-btn chat"
              aria-label="แชทกับผู้ให้บริการ"
              @click="openChat"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Vehicle Info (if available) -->
        <div v-if="providerInfo.vehicle_type || providerInfo.vehicle_plate" class="vehicle-info-row">
          <div v-if="providerInfo.vehicle_plate" class="vehicle-detail">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            <span class="vehicle-plate">{{ providerInfo.vehicle_plate }}</span>
          </div>
          <div v-if="providerInfo.vehicle_type" class="vehicle-detail">
            <span class="vehicle-type-badge">{{ providerInfo.vehicle_type }}</span>
          </div>
        </div>
      </div>

      <!-- Loading Provider Info -->
      <div v-else-if="currentRequest.provider_id && loadingProvider" class="provider-loading">
        <div class="loading-spinner"></div>
        <span>กำลังโหลดข้อมูลผู้ให้บริการ...</span>
      </div>

      <!-- Booking Details -->
      <div class="details-card">
        <h3>รายละเอียดการจอง</h3>

        <div class="detail-row">
          <span class="label">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            ประเภท
          </span>
          <span class="value">{{
            categoryLabels[currentRequest.category]
          }}</span>
        </div>

        <div v-if="currentRequest.place_name" class="detail-row">
          <span class="label">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="10" r="3" />
              <path
                d="M12 21.7C17.3 17 20 13 20 10a8 8 0 10-16 0c0 3 2.7 7 8 11.7z"
              />
            </svg>
            สถานที่
          </span>
          <span class="value">{{ currentRequest.place_name }}</span>
        </div>

        <div v-if="currentRequest.place_address" class="detail-row">
          <span class="label">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M3 21h18M9 8h6M12 5v6M5 21V7l7-4 7 4v14" />
            </svg>
            ที่อยู่
          </span>
          <span class="value">{{ currentRequest.place_address }}</span>
        </div>

        <div class="detail-row">
          <span class="label">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            วันที่
          </span>
          <span class="value">{{
            formatDate(currentRequest.scheduled_date)
          }}</span>
        </div>

        <div class="detail-row">
          <span class="label">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            เวลา
          </span>
          <span class="value">{{ formatTime(currentRequest.scheduled_time) }} น.</span>
        </div>

        <div v-if="currentRequest.details" class="detail-row">
          <span class="label">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
            รายละเอียด
          </span>
          <span class="value">{{ currentRequest.details }}</span>
        </div>

        <div class="detail-row fee">
          <span class="label">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            ค่าบริการ
          </span>
          <span class="value">฿{{ currentRequest.final_fee || currentRequest.service_fee }}</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <!-- Cancel Button -->
        <button
          v-if="canCancel(currentRequest)"
          class="btn-cancel"
          :disabled="loading"
          @click="handleCancel"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
          ยกเลิกการจอง
        </button>

        <!-- Rate Button -->
        <button
          v-if="canRate(currentRequest)"
          class="btn-rate"
          @click="showRatingModal = true"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
          ให้คะแนน
        </button>

        <!-- Back to Services -->
        <button
          class="btn-secondary"
          @click="router.push('/customer/services')"
        >
          กลับหน้าบริการ
        </button>
      </div>
    </main>

    <!-- Rating Modal -->
    <Teleport to="body">
      <div
        v-if="showRatingModal"
        class="modal-overlay"
        @click.self="showRatingModal = false"
      >
        <div class="modal-box">
          <h3>ให้คะแนนบริการ</h3>
          <p>กรุณาให้คะแนนการบริการจองคิวครั้งนี้</p>

          <div class="rating-stars">
            <button
              v-for="star in 5"
              :key="star"
              :class="['star', { active: star <= ratingValue }]"
              @click="ratingValue = star"
            >
              <svg
                viewBox="0 0 24 24"
                :fill="star <= ratingValue ? 'currentColor' : 'none'"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                />
              </svg>
            </button>
          </div>

          <textarea
            v-model="ratingComment"
            placeholder="ความคิดเห็นเพิ่มเติม (ไม่บังคับ)"
            rows="3"
          ></textarea>

          <div class="modal-actions">
            <button class="btn-secondary" @click="showRatingModal = false">
              ยกเลิก
            </button>
            <button
              class="btn-primary"
              :disabled="submittingRating"
              @click="handleRate"
            >
              {{ submittingRating ? "กำลังส่ง..." : "ส่งคะแนน" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Chat Modal -->
    <Teleport to="body">
      <div
        v-if="showChatModal"
        class="chat-modal-overlay"
        @click.self="closeChat"
      >
        <div class="chat-modal-box">
          <!-- Chat Header -->
          <div class="chat-header">
            <div class="chat-header-info">
              <div class="provider-avatar-small">
                <img
                  v-if="providerInfo?.avatar_url"
                  :src="providerInfo.avatar_url"
                  alt="รูปผู้ให้บริการ"
                  class="avatar-img"
                />
                <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                </svg>
              </div>
              <div class="chat-header-text">
                <span class="chat-provider-name">{{ providerInfo?.name || 'ผู้ให้บริการ' }}</span>
                <span class="chat-status">{{ isChatClosed ? 'ปิดแชทแล้ว' : 'ออนไลน์' }}</span>
              </div>
            </div>
            <button class="chat-close-btn" aria-label="ปิดแชท" @click="closeChat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Chat Messages -->
          <div ref="messagesContainer" class="chat-messages">
            <!-- Loading State -->
            <div v-if="chatLoading" class="chat-loading">
              <div class="spinner-small"></div>
              <span>กำลังโหลดข้อความ...</span>
            </div>

            <!-- Error State -->
            <div v-else-if="chatError" class="chat-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span>{{ chatError }}</span>
            </div>

            <!-- Messages List -->
            <div v-else-if="messages.length > 0" class="messages-list">
              <div
                v-for="message in messages"
                :key="message.id"
                :class="['message-bubble', message.sender_type === 'customer' ? 'sent' : 'received']"
              >
                <div class="message-content">{{ message.message }}</div>
                <div class="message-time">{{ formatMessageTime(message.created_at) }}</div>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else class="chat-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              <span>ยังไม่มีข้อความ</span>
              <span class="chat-empty-hint">เริ่มต้นการสนทนากับผู้ให้บริการ</span>
            </div>

            <!-- Chat Closed Notice -->
            <div v-if="isChatClosed" class="chat-closed-notice">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span>การแชทถูกปิดแล้ว</span>
            </div>
          </div>

          <!-- Chat Input -->
          <div class="chat-input-container">
            <div v-if="isChatClosed" class="chat-input-disabled">
              <span>ไม่สามารถส่งข้อความได้ เนื่องจากการจองถูกยกเลิกหรือเสร็จสิ้นแล้ว</span>
            </div>
            <div v-else class="chat-input-wrapper">
              <textarea
                v-model="newMessage"
                placeholder="พิมพ์ข้อความ..."
                rows="1"
                :disabled="!canSendMessage || chatSending"
                @keydown.enter.exact.prevent="handleSendMessage"
                class="chat-textarea"
              ></textarea>
              <button
                class="chat-send-btn"
                :disabled="!newMessage.trim() || !canSendMessage || chatSending"
                aria-label="ส่งข้อความ"
                @click="handleSendMessage"
              >
                <svg v-if="chatSending" class="spinner-icon" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.25" />
                  <path d="M12 2a10 10 0 0110 10" stroke="currentColor" stroke-width="2" />
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.tracking-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top));
  background: #ffffff;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.back-btn:active {
  background: #f5f5f5;
}
.back-btn svg {
  width: 24px;
  height: 24px;
  color: #1a1a1a;
}

.header h1 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.spacer {
  width: 40px;
}

/* Loading & Error States */
.loading-state,
.error-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f0f0f0;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state p,
.error-state p {
  color: #666666;
  font-size: 14px;
  margin: 0;
}

.error-icon {
  width: 48px;
  height: 48px;
  color: #e53935;
  margin-bottom: 16px;
}

.error-icon svg {
  width: 100%;
  height: 100%;
}

/* Content */
.content {
  flex: 1;
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
}

/* Tracking ID Card */
.tracking-id-card {
  background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%);
  color: #ffffff;
  padding: 24px;
  border-radius: 16px;
  text-align: center;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
}

.tracking-id-card.cancelled {
  background: linear-gradient(135deg, #757575 0%, #616161 100%);
}

.tracking-id-card .label {
  display: block;
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 8px;
}

.tracking-id-card .tracking-id {
  font-size: 22px;
  font-weight: 700;
  font-family: "SF Mono", "Roboto Mono", monospace;
  letter-spacing: 2px;
}

.cancelled-badge {
  display: inline-block;
  margin-top: 12px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

/* Cancelled Notice */
.cancelled-notice {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: #ffebee;
  border-radius: 12px;
  margin-bottom: 20px;
}

.cancelled-notice svg {
  width: 24px;
  height: 24px;
  color: #e53935;
  flex-shrink: 0;
}

.notice-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notice-title {
  font-size: 14px;
  font-weight: 600;
  color: #e53935;
}

.notice-reason {
  font-size: 13px;
  color: #666666;
}

.notice-time {
  font-size: 12px;
  color: #999999;
}

/* Status Timeline */
.status-timeline {
  display: flex;
  justify-content: space-between;
  padding: 24px 16px;
  background: #ffffff;
  border-radius: 16px;
  margin-bottom: 20px;
}

/* Provider Info Card */
.provider-info-card {
  background: linear-gradient(135deg, #f0fdf9 0%, #e6f7f1 100%);
  border: 1px solid #a7f3d0;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 20px;
}

.provider-info-card h3 {
  font-size: 14px;
  font-weight: 600;
  color: #065f46;
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.provider-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.provider-avatar {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0369a1;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.provider-avatar .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.provider-main-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.provider-name {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
}

.provider-phone {
  font-size: 14px;
  color: #666666;
  font-family: 'SF Mono', 'Menlo', monospace;
}

.provider-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.action-btn.call {
  background: #00a86b;
  color: #fff;
}

.action-btn.call:active {
  transform: scale(0.95);
  background: #008c5a;
}

.action-btn.chat {
  background: #2196F3;
  color: #fff;
}

.action-btn.chat:active {
  transform: scale(0.95);
  background: #1976D2;
}

/* Vehicle Info Row */
.vehicle-info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #d1fae5;
  flex-wrap: wrap;
}

.vehicle-detail {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #4b5563;
}

.vehicle-detail svg {
  color: #6b7280;
}

.vehicle-plate {
  font-weight: 600;
  color: #1f2937;
  font-family: 'SF Mono', 'Menlo', monospace;
  letter-spacing: 0.5px;
}

.vehicle-type-badge {
  padding: 2px 8px;
  background: #f3f4f6;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #4b5563;
}

/* Provider Loading State */
.provider-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 12px;
  margin-bottom: 20px;
  color: #666;
  font-size: 14px;
}

.timeline-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;
}

.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  z-index: 1;
  font-size: 12px;
  font-weight: 600;
  color: #999999;
  transition: all 0.3s;
}

.step-dot svg {
  width: 16px;
  height: 16px;
  color: #ffffff;
}

.timeline-step.active .step-dot {
  background: #00a86b;
  color: #ffffff;
}

.timeline-step.current .step-dot {
  background: #9c27b0;
  box-shadow: 0 0 0 4px rgba(156, 39, 176, 0.2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 4px rgba(156, 39, 176, 0.2);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(156, 39, 176, 0.1);
  }
}

.step-label {
  font-size: 11px;
  color: #999999;
  text-align: center;
  max-width: 60px;
}

.timeline-step.active .step-label {
  color: #00a86b;
  font-weight: 500;
}

.timeline-step.current .step-label {
  color: #9c27b0;
  font-weight: 600;
}

.step-line {
  position: absolute;
  top: 14px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #e8e8e8;
}

.timeline-step.active .step-line {
  background: #00a86b;
}

/* Details Card */
.details-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
}

.details-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 14px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row .label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666666;
}

.detail-row .label svg {
  width: 18px;
  height: 18px;
  color: #999999;
}

.detail-row .value {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  text-align: right;
  max-width: 55%;
}

.detail-row.fee .value {
  color: #9c27b0;
  font-size: 18px;
  font-weight: 700;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-cancel {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  background: #ffffff;
  color: #e53935;
  border: 2px solid #e53935;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:active {
  background: #ffebee;
}

.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cancel svg {
  width: 20px;
  height: 20px;
}

.btn-rate {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  background: #00a86b;
  color: #ffffff;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.btn-rate:active {
  transform: scale(0.98);
}

.btn-rate svg {
  width: 20px;
  height: 20px;
}

.btn-secondary {
  width: 100%;
  padding: 14px;
  background: #f5f5f5;
  color: #1a1a1a;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:active {
  background: #e8e8e8;
}

.btn-primary {
  padding: 12px 24px;
  background: #00a86b;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
}

.modal-box {
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  width: 100%;
  max-width: 340px;
  text-align: center;
}

.modal-box h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px;
}

.modal-box p {
  font-size: 14px;
  color: #666666;
  margin: 0 0 20px;
}

/* Rating Stars */
.rating-stars {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
}

.star {
  width: 40px;
  height: 40px;
  background: none;
  border: none;
  cursor: pointer;
  color: #e8e8e8;
  transition: all 0.2s;
}

.star.active {
  color: #f5a623;
}

.star svg {
  width: 100%;
  height: 100%;
}

.modal-box textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e8e8e8;
  border-radius: 12px;
  font-size: 14px;
  resize: none;
  margin-bottom: 16px;
  font-family: inherit;
}

.modal-box textarea:focus {
  outline: none;
  border-color: #00a86b;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-actions .btn-secondary,
.modal-actions .btn-primary {
  flex: 1;
}

/* Chat Modal Styles */
.chat-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1001;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.chat-modal-box {
  background: #ffffff;
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-width: 600px;
  height: 70vh;
  max-height: 700px;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

/* Chat Header */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #ffffff;
  border-radius: 24px 24px 0 0;
}

.chat-header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.provider-avatar-small {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0369a1;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.provider-avatar-small .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-header-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chat-provider-name {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.chat-status {
  font-size: 12px;
  color: #00a86b;
}

.chat-close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.chat-close-btn:active {
  background: #e8e8e8;
  transform: scale(0.95);
}

.chat-close-btn svg {
  width: 20px;
  height: 20px;
  color: #666666;
}

/* Chat Messages */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.chat-loading,
.chat-error,
.chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #666666;
  text-align: center;
}

.spinner-small {
  width: 32px;
  height: 32px;
  border: 3px solid #f0f0f0;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.chat-error svg {
  width: 48px;
  height: 48px;
  color: #e53935;
}

.chat-empty svg {
  width: 64px;
  height: 64px;
  color: #cccccc;
}

.chat-empty-hint {
  font-size: 13px;
  color: #999999;
}

/* Messages List */
.messages-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-bubble {
  max-width: 75%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  animation: messageIn 0.2s ease-out;
}

@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-bubble.sent {
  align-self: flex-end;
  align-items: flex-end;
}

.message-bubble.received {
  align-self: flex-start;
  align-items: flex-start;
}

.message-content {
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
}

.message-bubble.sent .message-content {
  background: #2196F3;
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

.message-bubble.received .message-content {
  background: #ffffff;
  color: #1a1a1a;
  border-bottom-left-radius: 4px;
  border: 1px solid #e8e8e8;
}

.message-time {
  font-size: 11px;
  color: #999999;
  padding: 0 4px;
}

/* Chat Closed Notice */
.chat-closed-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fff3cd;
  border-radius: 12px;
  margin-top: 12px;
  font-size: 13px;
  color: #856404;
}

.chat-closed-notice svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* Chat Input */
.chat-input-container {
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
}

.chat-input-disabled {
  padding: 12px 16px;
  background: #f5f5f5;
  border-radius: 12px;
  text-align: center;
  font-size: 13px;
  color: #666666;
}

.chat-input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.chat-textarea {
  flex: 1;
  min-height: 44px;
  max-height: 120px;
  padding: 12px 16px;
  border: 2px solid #e8e8e8;
  border-radius: 22px;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  transition: border-color 0.2s;
}

.chat-textarea:focus {
  outline: none;
  border-color: #2196F3;
}

.chat-textarea:disabled {
  background: #f5f5f5;
  color: #999999;
  cursor: not-allowed;
}

.chat-send-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: #2196F3;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.chat-send-btn:active:not(:disabled) {
  transform: scale(0.95);
  background: #1976D2;
}

.chat-send-btn:disabled {
  background: #e8e8e8;
  color: #cccccc;
  cursor: not-allowed;
}

.chat-send-btn svg {
  width: 20px;
  height: 20px;
}

.spinner-icon {
  animation: spin 0.8s linear infinite;
}

/* Responsive adjustments */
@media (min-width: 640px) {
  .chat-modal-box {
    border-radius: 24px;
    height: 600px;
    margin: 20px;
  }
  
  .chat-header {
    border-radius: 24px 24px 0 0;
  }
}
</style>
