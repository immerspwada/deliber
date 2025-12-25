<script setup lang="ts">
/**
 * Feature: F160 - Laundry Service
 * บริการรับ-ส่งซักผ้า
 */
import { ref, computed, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useLaundry, type LaundryService } from "../composables/useLaundry";
import { useToast } from "../composables/useToast";

const router = useRouter();
const { createLaundryRequest, calculatePrice, loading, error, clearError } =
  useLaundry();
const { showSuccess, showError, showWarning, showInfo } = useToast();

// Clear error on unmount
onUnmounted(() => {
  clearError();
});

const serviceTypes = [
  {
    id: "wash-fold" as LaundryService,
    name: "ซัก-พับ",
    desc: "ซักและพับเรียบร้อย",
    price: "฿40/กก.",
    icon: "wash",
  },
  {
    id: "wash-iron" as LaundryService,
    name: "ซัก-รีด",
    desc: "ซักและรีดเรียบ",
    price: "฿60/กก.",
    icon: "iron",
  },
  {
    id: "dry-clean" as LaundryService,
    name: "ซักแห้ง",
    desc: "สำหรับเสื้อผ้าพิเศษ",
    price: "฿150/ชิ้น",
    icon: "dry",
  },
  {
    id: "express" as LaundryService,
    name: "ด่วน 6 ชม.",
    desc: "รับคืนภายใน 6 ชั่วโมง",
    price: "+฿100",
    icon: "express",
  },
];

const selectedServices = ref<LaundryService[]>([]);
const pickupAddress = ref("");
const pickupLat = ref<number | null>(null);
const pickupLng = ref<number | null>(null);
const pickupDate = ref("");
const pickupTime = ref("");
const estimatedWeight = ref<number | null>(null);
const notes = ref("");

// Exit confirmation
const showExitConfirm = ref(false);

// Set minimum date to today
const today = new Date().toISOString().split("T")[0];

// Haptic feedback
const triggerHaptic = (type: "light" | "medium" | "heavy" = "light") => {
  if ("vibrate" in navigator) {
    const patterns = { light: 10, medium: 25, heavy: 50 };
    navigator.vibrate(patterns[type]);
  }
};

// Check if user has entered any data
const hasEnteredData = computed(() => {
  return (
    selectedServices.value.length > 0 ||
    pickupAddress.value ||
    pickupDate.value ||
    notes.value
  );
});

const goBack = () => router.back();

const goHome = () => {
  triggerHaptic("medium");
  if (hasEnteredData.value) {
    showExitConfirm.value = true;
  } else {
    router.push("/customer");
  }
};

const confirmExit = () => {
  triggerHaptic("heavy");
  showExitConfirm.value = false;
  router.push("/customer");
};

const cancelExit = () => {
  triggerHaptic("light");
  showExitConfirm.value = false;
};

const toggleService = (id: LaundryService) => {
  const index = selectedServices.value.indexOf(id);
  if (index === -1) {
    // If selecting a main service, remove other main services
    if (["wash-fold", "wash-iron", "dry-clean"].includes(id)) {
      selectedServices.value = selectedServices.value.filter(
        (s) => !["wash-fold", "wash-iron", "dry-clean"].includes(s)
      );
    }
    selectedServices.value.push(id);
  } else {
    selectedServices.value.splice(index, 1);
  }
};

const isSelected = (id: LaundryService) => selectedServices.value.includes(id);

// Calculate estimated price
const estimatedPrice = computed(() => {
  if (selectedServices.value.length === 0) return 0;
  const weight = estimatedWeight.value || 3; // default 3kg
  return calculatePrice(selectedServices.value, weight);
});

// Validation
const isFormValid = computed(() => {
  if (selectedServices.value.length === 0) return false;
  // Must have at least one main service
  const hasMainService = selectedServices.value.some((s) =>
    ["wash-fold", "wash-iron", "dry-clean"].includes(s)
  );
  if (!hasMainService) return false;
  if (!pickupAddress.value.trim()) return false;
  if (!pickupDate.value || !pickupTime.value) return false;

  // Check if date/time is in the future
  const scheduledDateTime = new Date(`${pickupDate.value}T${pickupTime.value}`);
  if (scheduledDateTime <= new Date()) return false;

  return true;
});

// Show confirmation before submit
const showConfirmation = ref(false);

const confirmSubmit = () => {
  if (!isFormValid.value) return;
  showConfirmation.value = true;
};

const submitRequest = async () => {
  showConfirmation.value = false;
  if (!isFormValid.value) return;

  const scheduledPickup = new Date(
    `${pickupDate.value}T${pickupTime.value}`
  ).toISOString();

  const result = await createLaundryRequest({
    services: selectedServices.value,
    pickup_address: pickupAddress.value,
    pickup_lat: pickupLat.value || undefined,
    pickup_lng: pickupLng.value || undefined,
    scheduled_pickup: scheduledPickup,
    estimated_weight: estimatedWeight.value || undefined,
    notes: notes.value || undefined,
  });

  if (result) {
    showSuccess("นัดรับผ้าสำเร็จ!");
    router.push({ name: "laundry-tracking", params: { id: result.id } });
  } else if (error.value) {
    showError(error.value);
  }
};

const cancelConfirmation = () => {
  showConfirmation.value = false;
};

// Get selected services names
const selectedServicesNames = computed(() => {
  return selectedServices.value
    .map((s) => {
      const service = serviceTypes.find((st) => st.id === s);
      return service?.name || s;
    })
    .join(", ");
});

// Format date for display
const formatDate = (date: string) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("th-TH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Format time for display
const formatTimeDisplay = (time: string) => {
  if (!time) return "";
  return time.substring(0, 5) + " น.";
};

// Format price
const formatPrice = (price: number) => {
  return new Intl.NumberFormat("th-TH").format(price);
};
</script>

<template>
  <div class="laundry-page">
    <!-- Header -->
    <div class="header">
      <button class="back-btn" @click="goBack">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h1>บริการซักผ้า</h1>
      <button class="home-btn" @click="goHome" title="กลับหน้าหลัก">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
      </button>
    </div>

    <div class="content">
      <!-- Error Message -->
      <div v-if="error" class="error-msg">{{ error }}</div>

      <!-- Service Selection -->
      <section class="section">
        <h2 class="section-title">
          เลือกบริการ <span class="required">*</span>
        </h2>
        <p class="section-hint">
          เลือกบริการหลัก 1 อย่าง และเพิ่มตัวเลือกด่วนได้
        </p>
        <div class="service-grid">
          <button
            v-for="service in serviceTypes"
            :key="service.id"
            :class="['service-btn', { active: isSelected(service.id) }]"
            @click="toggleService(service.id)"
          >
            <div class="service-icon">
              <svg
                v-if="service.icon === 'wash'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect x="3" y="2" width="18" height="20" rx="2" />
                <circle cx="12" cy="13" r="5" />
                <path d="M9 13c0-1.5 1.5-2 3-1s3 .5 3-1" />
                <circle cx="7" cy="6" r="1" fill="currentColor" />
              </svg>
              <svg
                v-else-if="service.icon === 'iron'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M3 17h18l-3-8H6l-3 8z" />
                <path d="M6 9V5a2 2 0 012-2h8a2 2 0 012 2v4" />
                <path d="M8 17v4M16 17v4" />
              </svg>
              <svg
                v-else-if="service.icon === 'dry'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M12 2v6M12 22v-6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M22 12h-6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24"
                />
              </svg>
              <svg
                v-else
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div class="service-info">
              <span class="service-name">{{ service.name }}</span>
              <span class="service-desc">{{ service.desc }}</span>
              <span class="service-price">{{ service.price }}</span>
            </div>
            <div v-if="isSelected(service.id)" class="check-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
          </button>
        </div>
      </section>

      <!-- Pickup Address -->
      <section class="section">
        <h2 class="section-title">
          ที่อยู่รับผ้า <span class="required">*</span>
        </h2>
        <div class="address-input">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <input
            v-model="pickupAddress"
            type="text"
            placeholder="กรอกที่อยู่รับผ้า"
          />
        </div>
      </section>

      <!-- Pickup Schedule -->
      <section class="section">
        <h2 class="section-title">
          วันเวลารับผ้า <span class="required">*</span>
        </h2>
        <div class="datetime-row">
          <div class="datetime-field">
            <label>วันที่</label>
            <input type="date" v-model="pickupDate" :min="today" />
          </div>
          <div class="datetime-field">
            <label>เวลา</label>
            <input type="time" v-model="pickupTime" />
          </div>
        </div>
      </section>

      <!-- Estimated Weight -->
      <section class="section">
        <h2 class="section-title">น้ำหนักโดยประมาณ (กก.)</h2>
        <div class="weight-input">
          <input
            v-model.number="estimatedWeight"
            type="number"
            min="1"
            max="50"
            step="0.5"
            placeholder="เช่น 3"
          />
          <span class="unit">กก.</span>
        </div>
        <p class="weight-note">* น้ำหนักจริงจะชั่งเมื่อรับผ้า</p>
      </section>

      <!-- Notes -->
      <section class="section">
        <h2 class="section-title">หมายเหตุ</h2>
        <textarea
          v-model="notes"
          placeholder="เช่น ผ้าขาวแยกซัก, ระวังผ้าหด, มีคราบพิเศษ..."
          class="notes-input"
          rows="2"
        ></textarea>
      </section>

      <!-- Price Estimate -->
      <div v-if="selectedServices.length > 0" class="price-estimate">
        <div class="price-row">
          <span>ราคาโดยประมาณ</span>
          <span class="price">฿{{ formatPrice(estimatedPrice) }}</span>
        </div>
        <p class="price-note">
          * คำนวณจากน้ำหนัก {{ estimatedWeight || 3 }} กก.
          ราคาจริงขึ้นอยู่กับน้ำหนักจริง
        </p>
      </div>
    </div>

    <!-- Submit Button -->
    <div class="footer">
      <button
        class="submit-btn"
        @click="confirmSubmit"
        :disabled="!isFormValid || loading"
      >
        <span v-if="loading">กำลังส่งคำขอ...</span>
        <span v-else>นัดรับผ้า</span>
      </button>
    </div>

    <!-- Exit Confirmation Modal -->
    <Transition name="modal">
      <div
        v-if="showExitConfirm"
        class="modal-overlay"
        @click.self="cancelExit"
      >
        <div class="modal-content exit-modal">
          <div class="exit-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#F5A623"
              stroke-width="2"
            >
              <path
                d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h3>ออกจากหน้านี้?</h3>
          <p class="exit-message">ข้อมูลที่กรอกไว้จะหายไป</p>
          <div class="modal-actions">
            <button class="btn-cancel" @click="cancelExit">ยกเลิก</button>
            <button class="btn-exit" @click="confirmExit">ออก</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Confirmation Modal -->
    <div
      v-if="showConfirmation"
      class="modal-overlay"
      @click.self="cancelConfirmation"
    >
      <div class="modal-content">
        <h3>ยืนยันนัดรับผ้า</h3>
        <div class="confirm-details">
          <div class="detail-row">
            <span class="label">บริการ:</span>
            <span class="value">{{ selectedServicesNames }}</span>
          </div>
          <div class="detail-row">
            <span class="label">ที่อยู่:</span>
            <span class="value truncate">{{ pickupAddress }}</span>
          </div>
          <div class="detail-row">
            <span class="label">วันที่:</span>
            <span class="value">{{ formatDate(pickupDate) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">เวลา:</span>
            <span class="value">{{ formatTimeDisplay(pickupTime) }}</span>
          </div>
          <div v-if="estimatedWeight" class="detail-row">
            <span class="label">น้ำหนักประมาณ:</span>
            <span class="value">{{ estimatedWeight }} กก.</span>
          </div>
          <div class="detail-row">
            <span class="label">ราคาประมาณ:</span>
            <span class="value price">฿{{ formatPrice(estimatedPrice) }}</span>
          </div>
        </div>
        <p class="confirm-note">* ราคาจริงขึ้นอยู่กับน้ำหนักจริงเมื่อรับผ้า</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="cancelConfirmation">ยกเลิก</button>
          <button
            class="btn-confirm"
            @click="submitRequest"
            :disabled="loading"
          >
            {{ loading ? "กำลังส่ง..." : "ยืนยัน" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.laundry-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  padding-top: calc(16px + env(safe-area-inset-top));
  border-bottom: 1px solid #f0f0f0;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
}

.back-btn svg {
  width: 24px;
  height: 24px;
  color: #1a1a1a;
}

.home-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 168, 107, 0.1);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.home-btn svg {
  width: 22px;
  height: 22px;
  color: #00a86b;
}

.home-btn:active {
  transform: scale(0.95);
  background: rgba(0, 168, 107, 0.2);
}

.header h1 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.error-msg {
  padding: 12px 16px;
  background: #ffebee;
  color: #e53935;
  border-radius: 10px;
  font-size: 14px;
  margin-bottom: 16px;
}

.section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #666666;
  margin: 0 0 8px;
}

.section-hint {
  font-size: 12px;
  color: #999999;
  margin: 0 0 12px;
}

.required {
  color: #e53935;
}

.service-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.service-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 12px;
  background: #ffffff;
  border: 2px solid #f0f0f0;
  border-radius: 14px;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s;
  position: relative;
}

.service-btn.active {
  border-color: #00bcd4;
  background: #e0f7fa;
}

.service-icon {
  width: 44px;
  height: 44px;
  background: #e0f7fa;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00bcd4;
}

.service-icon svg {
  width: 24px;
  height: 24px;
}

.service-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.service-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.service-desc {
  font-size: 11px;
  color: #666666;
}

.service-price {
  font-size: 13px;
  font-weight: 600;
  color: #00bcd4;
}

.check-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  background: #00bcd4;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
}

.check-icon svg {
  width: 14px;
  height: 14px;
}

.address-input {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #f5f5f5;
  border-radius: 12px;
}

.address-input svg {
  width: 20px;
  height: 20px;
  color: #00bcd4;
  flex-shrink: 0;
}

.address-input input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  outline: none;
}

.datetime-row {
  display: flex;
  gap: 12px;
}

.datetime-field {
  flex: 1;
}

.datetime-field label {
  display: block;
  font-size: 12px;
  color: #666666;
  margin-bottom: 6px;
}

.datetime-field input {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e8e8e8;
  border-radius: 10px;
  font-size: 14px;
}

.datetime-field input:focus {
  outline: none;
  border-color: #00bcd4;
}

.weight-input {
  display: flex;
  align-items: center;
  gap: 10px;
}

.weight-input input {
  width: 100px;
  padding: 12px 14px;
  border: 2px solid #e8e8e8;
  border-radius: 10px;
  font-size: 14px;
  text-align: center;
}

.weight-input input:focus {
  outline: none;
  border-color: #00bcd4;
}

.weight-input .unit {
  font-size: 14px;
  color: #666666;
}

.weight-note {
  font-size: 12px;
  color: #999999;
  margin: 8px 0 0;
}

.notes-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e8e8e8;
  border-radius: 12px;
  font-size: 14px;
  resize: none;
}

.notes-input:focus {
  outline: none;
  border-color: #00bcd4;
}

.price-estimate {
  padding: 16px;
  background: #e0f7fa;
  border-radius: 14px;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-row span {
  font-size: 14px;
  color: #666666;
}

.price-row .price {
  font-size: 20px;
  font-weight: 700;
  color: #00bcd4;
}

.price-note {
  font-size: 11px;
  color: #999999;
  margin: 8px 0 0;
}

.footer {
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  border-top: 1px solid #f0f0f0;
}

.submit-btn {
  width: 100%;
  padding: 16px;
  background: #00bcd4;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-btn:not(:disabled):active {
  opacity: 0.9;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  width: 100%;
  max-width: 340px;
}

.modal-content h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 20px;
  text-align: center;
}

.confirm-details {
  background: #f5f5f5;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e8e8e8;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row .label {
  font-size: 14px;
  color: #666666;
  flex-shrink: 0;
}

.detail-row .value {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  text-align: right;
}

.detail-row .value.truncate {
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.detail-row .value.price {
  color: #00bcd4;
  font-weight: 700;
}

.confirm-note {
  font-size: 12px;
  color: #999999;
  text-align: center;
  margin: 0 0 16px;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.btn-cancel {
  flex: 1;
  padding: 14px;
  background: #f5f5f5;
  color: #666666;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.btn-confirm {
  flex: 1;
  padding: 14px;
  background: #00bcd4;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Exit Modal */
.exit-modal {
  text-align: center;
}

.exit-icon {
  width: 56px;
  height: 56px;
  background: #fff3e0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.exit-icon svg {
  width: 28px;
  height: 28px;
}

.exit-message {
  font-size: 14px;
  color: #666666;
  margin: 8px 0 20px;
}

.btn-exit {
  flex: 1;
  padding: 14px;
  background: #e53935;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

/* Modal Transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.9);
}
</style>
