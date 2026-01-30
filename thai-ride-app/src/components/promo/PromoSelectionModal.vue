<script setup lang="ts">
/**
 * PromoSelectionModal - Beautiful Promo Selection UI
 * Feature: F10 - Promo Codes
 * 
 * Inspired by modern ride-hailing apps
 */
import { ref, computed, onMounted } from 'vue';
import { usePromoSystem } from '../../composables/usePromoSystem';

interface PromoCode {
  id: string;
  code: string;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  max_discount?: number;
  min_order_amount?: number;
  valid_until: string;
  usage_limit?: number;
  usage_count: number;
  service_types: string[];
  description?: string;
}

const props = defineProps<{
  modelValue: boolean;
  serviceType: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry';
  orderAmount: number;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'promo-selected', promo: {
    code: string;
    promoId: string;
    discountAmount: number;
  }): void;
}>();

const promoSystem = usePromoSystem();

const availablePromos = ref<PromoCode[]>([]);
const loading = ref(false);
const selectedPromoId = ref<string | null>(null);
const manualCode = ref('');
const manualCodeError = ref('');
const isValidatingManual = ref(false);

// Computed
const hasPromos = computed(() => availablePromos.value.length > 0);

// Fetch available promos
async function fetchPromos() {
  loading.value = true;
  try {
    const promos = await promoSystem.getAvailablePromos(props.serviceType);
    availablePromos.value = promos.filter(p => {
      // Filter by min order amount
      if (p.min_order_amount && props.orderAmount < p.min_order_amount) {
        return false;
      }
      // Filter by usage limit
      if (p.usage_limit && p.usage_count >= p.usage_limit) {
        return false;
      }
      return true;
    });
  } catch (error) {
    console.error('[PromoSelectionModal] Error fetching promos:', error);
  } finally {
    loading.value = false;
  }
}

// Calculate discount for display
function calculateDiscount(promo: PromoCode): number {
  if (promo.discount_type === 'fixed') {
    return promo.discount_value;
  } else {
    const discount = (props.orderAmount * promo.discount_value) / 100;
    return promo.max_discount ? Math.min(discount, promo.max_discount) : discount;
  }
}

// Format discount display
function formatDiscount(promo: PromoCode): string {
  if (promo.discount_type === 'fixed') {
    return `ลด ${promo.discount_value} บาท`;
  } else {
    const text = `ลด ${promo.discount_value}%`;
    if (promo.max_discount) {
      return `${text} สูงสุด ${promo.max_discount} บาท`;
    }
    return text;
  }
}

// Format expiry date
function formatExpiry(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'หมดอายุวันนี้';
  } else if (diffDays === 1) {
    return 'หมดอายุพรุ่งนี้';
  } else if (diffDays <= 7) {
    return `เหลือ ${diffDays} วัน`;
  } else {
    return date.toLocaleDateString('th-TH', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  }
}

// Check if promo is expiring soon (within 2 days)
function isExpiringSoon(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 2;
}

// Select promo
async function selectPromo(promo: PromoCode) {
  selectedPromoId.value = promo.id;
  
  // Validate and calculate actual discount
  const result = await promoSystem.validatePromoCode(
    promo.code,
    props.orderAmount,
    props.serviceType
  );
  
  if (result.is_valid) {
    emit('promo-selected', {
      code: promo.code,
      promoId: promo.id,
      discountAmount: result.discount_amount
    });
    close();
  }
}

// Apply manual code
async function applyManualCode() {
  if (!manualCode.value.trim()) return;
  
  isValidatingManual.value = true;
  manualCodeError.value = '';
  
  try {
    const result = await promoSystem.validatePromoCode(
      manualCode.value.trim(),
      props.orderAmount,
      props.serviceType
    );
    
    if (result.is_valid) {
      emit('promo-selected', {
        code: manualCode.value.trim().toUpperCase(),
        promoId: result.promo_id!,
        discountAmount: result.discount_amount
      });
      close();
    } else {
      manualCodeError.value = result.message || 'โค้ดไม่ถูกต้องหรือหมดอายุแล้ว';
    }
  } catch (error) {
    manualCodeError.value = 'เกิดข้อผิดพลาด กรุณาลองใหม่';
  } finally {
    isValidatingManual.value = false;
  }
}

// Close modal
function close() {
  emit('update:modelValue', false);
}

// Lifecycle
onMounted(() => {
  if (props.modelValue) {
    fetchPromos();
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="modal-overlay"
        @click.self="close"
      >
        <div class="modal-container">
          <!-- Header -->
          <div class="modal-header">
            <h2 class="modal-title">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
              โปรโมชั่นสำหรับคุณ
            </h2>
            <button
              class="close-btn"
              type="button"
              aria-label="ปิด"
              @click="close"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="modal-content">
            <!-- Loading State -->
            <div v-if="loading" class="loading-state">
              <div class="spinner"></div>
              <p>กำลังโหลดโปรโมชั่น...</p>
            </div>

            <!-- Promo List -->
            <div v-else-if="hasPromos" class="promo-list">
              <div
                v-for="promo in availablePromos"
                :key="promo.id"
                class="promo-card"
                :class="{ 'expiring-soon': isExpiringSoon(promo.valid_until) }"
                @click="selectPromo(promo)"
              >
                <!-- Hot Badge -->
                <div v-if="isExpiringSoon(promo.valid_until)" class="hot-badge">
                  HOT
                </div>

                <!-- Gift Icon -->
                <div class="gift-icon">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 64 64"
                    fill="none"
                  >
                    <!-- Gift box -->
                    <rect x="12" y="28" width="40" height="28" rx="2" fill="#FFD700" />
                    <rect x="12" y="20" width="40" height="8" rx="2" fill="#FF6B6B" />
                    <rect x="30" y="20" width="4" height="36" fill="#FF4757" />
                    <!-- Ribbon -->
                    <path d="M32 20 L28 12 L32 16 L36 12 L32 20" fill="#FF4757" />
                  </svg>
                </div>

                <!-- Promo Info -->
                <div class="promo-info">
                  <h3 class="promo-title">{{ promo.code }}</h3>
                  <p class="promo-description">
                    {{ promo.description || formatDiscount(promo) }}
                  </p>
                  <div class="promo-meta">
                    <span class="discount-badge">
                      💰 ลด {{ calculateDiscount(promo).toLocaleString() }} บาท
                    </span>
                    <span class="expiry-badge" :class="{ 'urgent': isExpiringSoon(promo.valid_until) }">
                      ⏰ {{ formatExpiry(promo.valid_until) }}
                    </span>
                  </div>
                </div>

                <!-- Use Button -->
                <button
                  class="use-btn"
                  type="button"
                  @click.stop="selectPromo(promo)"
                >
                  ใช้เลย
                </button>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else class="empty-state">
              <svg
                width="80"
                height="80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <p class="empty-text">ไม่มีโปรโมชั่นที่ใช้ได้ในขณะนี้</p>
              <p class="empty-subtext">ลองใส่โค้ดด้านล่างหรือกลับมาดูใหม่ภายหลัง</p>
            </div>

            <!-- Manual Code Input -->
            <div class="manual-code-section">
              <p class="section-label">มีโค้ดส่วนลดอื่นไหม?</p>
              <div class="manual-input-wrapper">
                <input
                  v-model="manualCode"
                  type="text"
                  placeholder="ใส่โค้ดส่วนลด"
                  class="manual-input"
                  :disabled="isValidatingManual"
                  @keyup.enter="applyManualCode"
                />
                <button
                  class="apply-btn"
                  type="button"
                  :disabled="!manualCode.trim() || isValidatingManual"
                  @click="applyManualCode"
                >
                  <span v-if="isValidatingManual" class="spinner-small"></span>
                  <span v-else>ใช้</span>
                </button>
              </div>
              <p v-if="manualCodeError" class="error-text">{{ manualCodeError }}</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 9999;
  padding: 0;
}

@media (min-width: 768px) {
  .modal-overlay {
    align-items: center;
    padding: 20px;
  }
}

/* Modal Container */
.modal-container {
  background: #fff;
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
}

@media (min-width: 768px) {
  .modal-container {
    border-radius: 24px;
    max-height: 80vh;
  }
}

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.modal-title svg {
  color: #00a86b;
}

.close-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: none;
  border-radius: 12px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e8e8e8;
  color: #1a1a1a;
}

/* Content */
.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f0f0f0;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  color: #666;
  font-size: 15px;
}

/* Promo List */
.promo-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Promo Card */
.promo-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s;
  overflow: hidden;
}

.promo-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%);
  pointer-events: none;
}

.promo-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

.promo-card:active {
  transform: translateY(0);
}

.promo-card.expiring-soon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

/* Hot Badge */
.hot-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 12px;
  background: #ff4757;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(255, 71, 87, 0.4);
  z-index: 1;
}

/* Gift Icon */
.gift-icon {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  backdrop-filter: blur(10px);
}

/* Promo Info */
.promo-info {
  flex: 1;
  min-width: 0;
}

.promo-title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 6px 0;
  font-family: monospace;
  letter-spacing: 2px;
}

.promo-description {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.promo-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.discount-badge,
.expiry-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.expiry-badge.urgent {
  background: rgba(255, 71, 87, 0.3);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Use Button */
.use-btn {
  flex-shrink: 0;
  padding: 12px 24px;
  background: #fff;
  color: #667eea;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.promo-card.expiring-soon .use-btn {
  color: #f5576c;
}

.use-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.use-btn:active {
  transform: scale(0.98);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-state svg {
  color: #d0d0d0;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  font-weight: 600;
  color: #666;
  margin: 0 0 8px 0;
}

.empty-subtext {
  font-size: 14px;
  color: #999;
  margin: 0;
}

/* Manual Code Section */
.manual-code-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.section-label {
  font-size: 14px;
  font-weight: 600;
  color: #666;
  margin: 0 0 12px 0;
}

.manual-input-wrapper {
  display: flex;
  gap: 8px;
  padding: 4px;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  transition: border-color 0.2s;
}

.manual-input-wrapper:focus-within {
  border-color: #00a86b;
}

.manual-input {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: transparent;
  font-size: 15px;
  color: #1a1a1a;
  outline: none;
}

.manual-input::placeholder {
  color: #999;
}

.apply-btn {
  padding: 12px 20px;
  background: #00a86b;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.apply-btn:hover:not(:disabled) {
  background: #008f5b;
}

.apply-btn:disabled {
  background: #e8e8e8;
  color: #999;
  cursor: not-allowed;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.error-text {
  font-size: 13px;
  color: #e53935;
  margin: 8px 0 0 0;
  padding-left: 4px;
}

/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container {
  transform: translateY(100%);
}

.modal-leave-to .modal-container {
  transform: translateY(100%);
}

@media (min-width: 768px) {
  .modal-enter-from .modal-container,
  .modal-leave-to .modal-container {
    transform: translateY(20px) scale(0.95);
  }
}
</style>
