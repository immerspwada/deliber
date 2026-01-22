<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useOrderReassignment, type Provider } from '../composables/useOrderReassignment';
import { useAdminUIStore } from '../stores/adminUI.store';

interface Props {
  show: boolean;
  orderId: string;
  orderType: string;
  currentProviderId?: string | null;
  currentProviderName?: string | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  success: [];
}>();

const uiStore = useAdminUIStore();
const reassignment = useOrderReassignment();

// Refs
const modalContainerRef = ref<HTMLElement | null>(null);
const closeButtonRef = ref<HTMLElement | null>(null);

let previousActiveElement: HTMLElement | null = null;

// State
const selectedProviderId = ref<string>('');
const reason = ref<string>('');
const notes = ref<string>('');
const searchQuery = ref<string>('');
const showOnlineOnly = ref(true);
const isSubmitting = ref(false);

// Computed
const filteredProviders = computed(() => {
  let providers = showOnlineOnly.value
    ? reassignment.onlineProviders.value
    : reassignment.availableProviders.value;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    providers = providers.filter(
      (p) =>
        p.full_name.toLowerCase().includes(query) ||
        p.phone.includes(query) ||
        p.vehicle_plate?.toLowerCase().includes(query)
    );
  }

  // Exclude current provider
  if (props.currentProviderId) {
    providers = providers.filter((p) => p.id !== props.currentProviderId);
  }

  return providers;
});

const canSubmit = computed(() => {
  return selectedProviderId.value && !isSubmitting.value;
});

// Methods
async function loadProviders() {
  await reassignment.getAvailableProviders(props.orderType);
}

async function handleSubmit() {
  if (!canSubmit.value) return;

  isSubmitting.value = true;

  try {
    const result = await reassignment.reassignOrder(
      props.orderId,
      props.orderType,
      selectedProviderId.value,
      reason.value || undefined,
      notes.value || undefined
    );

    if (result.success) {
      uiStore.showSuccess('ย้ายงานสำเร็จ');
      emit('success');
      handleClose();
    } else {
      uiStore.showError(result.error || 'เกิดข้อผิดพลาดในการย้ายงาน');
    }
  } catch (err) {
    console.error('[OrderReassignmentModal] Submit error:', err);
    uiStore.showError('เกิดข้อผิดพลาดในการย้ายงาน');
  } finally {
    isSubmitting.value = false;
  }
}

function handleClose() {
  selectedProviderId.value = '';
  reason.value = '';
  notes.value = '';
  searchQuery.value = '';
  showOnlineOnly.value = true;
  emit('close');
}

function selectProvider(providerId: string) {
  selectedProviderId.value = providerId;
}

function getProviderStatusColor(provider: Provider): string {
  if (provider.is_online) return '#10B981';
  return '#6B7280';
}

function formatRating(rating: number | null): string {
  if (!rating) return 'ไม่มีคะแนน';
  return `⭐ ${rating.toFixed(1)}`;
}

// Watchers
watch(() => props.show, async (show) => {
  if (show) {
    // Store previous active element
    previousActiveElement = document.activeElement as HTMLElement;
    
    // Load providers
    loadProviders();
    
    // Subscribe to realtime updates
    reassignment.subscribeToProviderUpdates();
    reassignment.subscribeToReassignmentUpdates(props.orderId);
    
    // Activate focus trap and focus first element
    await nextTick();
    focusTrap.activate();
    
    // Focus close button
    if (closeButtonRef.value) {
      closeButtonRef.value.focus();
    }
  } else {
    // Unsubscribe from realtime updates
    reassignment.unsubscribeAll();
    
    // Deactivate focus trap
    focusTrap.deactivate();
    
    // Restore focus to previous element
    if (previousActiveElement) {
      previousActiveElement.focus();
      previousActiveElement = null;
    }
  }
});

// Lifecycle
onMounted(() => {
  if (props.show) {
    loadProviders();
  }
});
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose" @keydown.esc="handleClose">
    <div 
      ref="modalContainerRef"
      class="modal-container"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <!-- Header -->
      <div class="modal-header">
        <div>
          <h2 id="modal-title" class="modal-title">ย้ายงานไปให้ไรเดอร์คนอื่น</h2>
          <p id="modal-description" class="modal-description">เลือกไรเดอร์ที่พร้อมรับงานเพื่อมอบหมายงานใหม่</p>
        </div>
        <button ref="closeButtonRef" class="close-btn" @click="handleClose" aria-label="ปิดหน้าต่าง">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Current Provider Info -->
      <div v-if="currentProviderName" class="current-provider-info">
        <div class="info-label">ไรเดอร์ปัจจุบัน:</div>
        <div class="info-value">{{ currentProviderName }}</div>
      </div>

      <!-- Search and Filters -->
      <div class="search-section">
        <div class="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาชื่อ, เบอร์โทร, ทะเบียนรถ..."
            class="search-input"
            aria-label="ค้นหาไรเดอร์"
          />
        </div>

        <label class="checkbox-label">
          <input v-model="showOnlineOnly" type="checkbox" class="checkbox" />
          <span>แสดงเฉพาะออนไลน์</span>
        </label>
      </div>

      <!-- Provider List -->
      <div class="provider-list-container">
        <div v-if="reassignment.isLoading.value" class="loading-state">
          <div class="spinner"></div>
          <p>กำลังโหลดรายชื่อไรเดอร์...</p>
        </div>

        <div v-else-if="reassignment.error.value" class="error-state" role="alert" aria-live="assertive">
          <p class="error-message">{{ reassignment.error.value }}</p>
          <button class="btn btn-secondary" @click="loadProviders">ลองใหม่</button>
        </div>

        <div v-else-if="filteredProviders.length === 0" class="empty-state">
          <p>ไม่พบไรเดอร์ที่ว่าง</p>
          <button v-if="showOnlineOnly" class="btn btn-secondary" @click="showOnlineOnly = false">
            แสดงทั้งหมด
          </button>
        </div>

        <div v-else class="provider-list">
          <div
            v-for="provider in filteredProviders"
            :key="provider.id"
            class="provider-card"
            :class="{ selected: selectedProviderId === provider.id }"
            @click="selectProvider(provider.id)"
          >
            <div class="provider-header">
              <div class="provider-info">
                <div class="provider-name">{{ provider.full_name }}</div>
                <div class="provider-phone">{{ provider.phone }}</div>
              </div>
              <div class="provider-status">
                <span
                  class="status-dot"
                  :style="{ backgroundColor: getProviderStatusColor(provider) }"
                ></span>
                <span class="status-text">{{ provider.is_online ? 'ออนไลน์' : 'ออฟไลน์' }}</span>
              </div>
            </div>

            <div class="provider-details">
              <div v-if="provider.vehicle_type" class="detail-item">
                <span class="detail-label">ประเภทรถ:</span>
                <span class="detail-value">{{ provider.vehicle_type }}</span>
              </div>
              <div v-if="provider.vehicle_plate" class="detail-item">
                <span class="detail-label">ทะเบียน:</span>
                <span class="detail-value">{{ provider.vehicle_plate }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">คะแนน:</span>
                <span class="detail-value">{{ formatRating(provider.rating) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">งานทั้งหมด:</span>
                <span class="detail-value">{{ provider.total_jobs }} งาน</span>
              </div>
            </div>

            <div v-if="selectedProviderId === provider.id" class="selected-indicator">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Reason and Notes -->
      <div class="form-section">
        <div class="form-group">
          <label for="reason" class="form-label">เหตุผลในการย้ายงาน</label>
          <select id="reason" v-model="reason" class="form-select">
            <option value="">เลือกเหตุผล (ไม่บังคับ)</option>
            <option value="provider_unavailable">ไรเดอร์ไม่ว่าง</option>
            <option value="provider_request">ไรเดอร์ขอเปลี่ยน</option>
            <option value="customer_request">ลูกค้าขอเปลี่ยน</option>
            <option value="location_mismatch">ตำแหน่งไม่เหมาะสม</option>
            <option value="performance_issue">ปัญหาการให้บริการ</option>
            <option value="other">อื่นๆ</option>
          </select>
        </div>

        <div class="form-group">
          <label for="notes" class="form-label">หมายเหตุเพิ่มเติม</label>
          <textarea
            id="notes"
            v-model="notes"
            rows="3"
            placeholder="ระบุรายละเอียดเพิ่มเติม (ไม่บังคับ)"
            class="form-textarea"
          ></textarea>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="modal-footer">
        <button 
          class="btn btn-secondary" 
          @click="handleClose" 
          :disabled="isSubmitting"
          aria-label="ยกเลิกการย้ายงาน"
        >
          ยกเลิก
        </button>
        <button
          class="btn btn-primary"
          @click="handleSubmit"
          :disabled="!canSubmit"
          aria-label="ยืนยันการย้ายงาน"
        >
          <span v-if="isSubmitting" class="btn-spinner"></span>
          <span>{{ isSubmitting ? 'กำลังย้ายงาน...' : 'ยืนยันการย้ายงาน' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  padding: 1rem;
}

.modal-container {
  background: white;
  border-radius: 1rem;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.modal-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

.close-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: #6b7280;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #111827;
}

.current-provider-info {
  padding: 1rem 1.5rem;
  background: #fef3c7;
  border-bottom: 1px solid #fde68a;
  display: flex;
  gap: 0.5rem;
}

.info-label {
  font-weight: 500;
  color: #92400e;
}

.info-value {
  color: #78350f;
}

.search-section {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.search-box {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background: white;
}

.search-box svg {
  color: #9ca3af;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.875rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.checkbox {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.provider-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem;
  min-height: 300px;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  color: #6b7280;
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  color: #ef4444;
  margin-bottom: 1rem;
}

.provider-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.provider-card {
  position: relative;
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.provider-card:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.provider-card.selected {
  border-color: #3b82f6;
  background: #dbeafe;
}

.provider-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.provider-name {
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.25rem;
}

.provider-phone {
  font-size: 0.875rem;
  color: #6b7280;
}

.provider-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
}

.status-text {
  font-size: 0.875rem;
  color: #6b7280;
}

.provider-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  font-size: 0.875rem;
}

.detail-item {
  display: flex;
  gap: 0.5rem;
}

.detail-label {
  color: #6b7280;
}

.detail-value {
  color: #111827;
  font-weight: 500;
}

.selected-indicator {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 2rem;
  height: 2rem;
  background: #3b82f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.form-section {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.form-select,
.form-textarea {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s;
}

.form-select:focus,
.form-textarea:focus {
  border-color: #3b82f6;
  outline: 2px solid #dbeafe;
  outline-offset: 2px;
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.modal-footer {
  display: flex;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  justify-content: flex-end;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@media (max-width: 640px) {
  .modal-container {
    max-height: 100vh;
    border-radius: 0;
  }

  .provider-details {
    grid-template-columns: 1fr;
  }

  .search-section {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
