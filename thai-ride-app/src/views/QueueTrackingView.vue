<script setup lang="ts">
/**
 * Feature: F158 - Queue Booking Tracking
 * Customer view for tracking queue booking status
 * Fixed: Now properly fetches booking data before subscribing
 */
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQueueBooking } from "../composables/useQueueBooking";
import { useToast } from "../composables/useToast";

const route = useRoute();
const router = useRouter();
const { showSuccess, showError, showWarning, showInfo } = useToast();
const {
  currentBooking: currentRequest,
  loading,
  error,
  fetchBooking,
  subscribeToBooking,
  unsubscribe,
  cancelBooking,
  submitRating,
  categoryLabels,
  statusLabels,
  getStatusColor,
  canCancel,
  canRate,
} = useQueueBooking();

const bookingId = computed(() => route.params.id as string);

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
    showSuccess("ยกเลิกการจองเรียบร้อยแล้ว");
  } else {
    showError("ไม่สามารถยกเลิกได้");
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
    showSuccess("ขอบคุณสำหรับการให้คะแนน!");
    showRatingModal.value = false;
  } else {
    showError("ไม่สามารถให้คะแนนได้");
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

// Load booking data on mount
const loadBooking = async () => {
  const id = bookingId.value;
  if (!id) {
    router.push("/customer/services");
    return;
  }

  const booking = await fetchBooking(id);
  if (!booking) {
    showError("ไม่พบข้อมูลการจอง");
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
});
</script>

<template>
  <div class="tracking-page">
    <!-- Header -->
    <header class="header">
      <button class="back-btn" @click="goBack" aria-label="ย้อนกลับ">
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
    <main class="content" v-else-if="currentRequest">
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
          <span class="notice-reason" v-if="currentRequest.cancel_reason">{{
            currentRequest.cancel_reason
          }}</span>
          <span class="notice-time" v-if="currentRequest.cancelled_at">{{
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

        <div class="detail-row" v-if="currentRequest.place_name">
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

        <div class="detail-row" v-if="currentRequest.place_address">
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
          <span class="value"
            >{{ formatTime(currentRequest.scheduled_time) }} น.</span
          >
        </div>

        <div class="detail-row" v-if="currentRequest.details">
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
          <span class="value"
            >฿{{ currentRequest.final_fee || currentRequest.service_fee }}</span
          >
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <!-- Cancel Button -->
        <button
          v-if="canCancel(currentRequest)"
          class="btn-cancel"
          @click="handleCancel"
          :disabled="loading"
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
              @click="handleRate"
              :disabled="submittingRating"
            >
              {{ submittingRating ? "กำลังส่ง..." : "ส่งคะแนน" }}
            </button>
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
</style>
