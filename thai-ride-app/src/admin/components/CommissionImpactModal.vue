<script setup lang="ts">
import { computed } from 'vue'
import type { CommissionRates } from '@/types/financial-settings'

interface ServiceImpact {
  service_type: keyof CommissionRates
  affected_providers: number
  current_rate: number
  new_rate: number
  rate_change_percent: number
  estimated_monthly_transactions: number
  estimated_monthly_revenue_change: number
  provider_earnings_change: number
}

interface Props {
  modelValue: boolean
  serviceType: keyof CommissionRates
  impact: ServiceImpact | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

const serviceLabels: Record<keyof CommissionRates, string> = {
  ride: 'บริการเรียกรถ',
  delivery: 'บริการจัดส่ง',
  shopping: 'บริการช้อปปิ้ง',
  moving: 'บริการขนย้าย',
  queue: 'บริการจองคิว',
  laundry: 'บริการซักรีด'
}

const isIncrease = computed(() => 
  props.impact ? props.impact.new_rate > props.impact.current_rate : false
)

const impactSeverity = computed(() => {
  if (!props.impact) return 'low'
  const changePercent = Math.abs(props.impact.rate_change_percent)
  if (changePercent >= 20) return 'high'
  if (changePercent >= 10) return 'medium'
  return 'low'
})

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function close() {
  emit('update:modelValue', false)
  emit('cancel')
}

function confirm() {
  emit('confirm')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal-container" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <!-- Header -->
          <div class="modal-header">
            <div>
              <h2 id="modal-title" class="modal-title">
                ยืนยันการเปลี่ยนอัตราคอมมิชชั่น
              </h2>
              <p class="modal-subtitle">
                {{ serviceLabels[serviceType] }}
              </p>
            </div>
            <button
              type="button"
              class="btn-close"
              aria-label="ปิด"
              @click="close"
            >
              <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Loading State -->
          <div v-if="loading" class="modal-body">
            <div class="loading-state">
              <div class="spinner"></div>
              <p>กำลังคำนวณผลกระทบ...</p>
            </div>
          </div>

          <!-- Impact Analysis -->
          <div v-else-if="impact" class="modal-body">
            <!-- Alert Banner -->
            <div 
              class="alert"
              :class="{
                'alert-danger': isIncrease && impactSeverity === 'high',
                'alert-warning': isIncrease && impactSeverity === 'medium',
                'alert-info': !isIncrease || impactSeverity === 'low'
              }"
            >
              <svg class="alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path 
                  v-if="isIncrease && impactSeverity === 'high'"
                  stroke-linecap="round" 
                  stroke-linejoin="round" 
                  stroke-width="2" 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
                <path 
                  v-else
                  stroke-linecap="round" 
                  stroke-linejoin="round" 
                  stroke-width="2" 
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <div>
                <p class="alert-title">
                  {{ isIncrease ? 'การเปลี่ยนแปลงนี้จะส่งผลกระทบต่อรายได้ Provider' : 'การเปลี่ยนแปลงนี้จะเพิ่มรายได้ให้ Provider' }}
                </p>
                <p class="alert-message">
                  Provider {{ impact.affected_providers }} คน จะได้รับผลกระทบจากการเปลี่ยนแปลงนี้
                </p>
              </div>
            </div>

            <!-- Rate Comparison -->
            <div class="comparison-grid">
              <div class="comparison-card">
                <div class="comparison-label">อัตราปัจจุบัน</div>
                <div class="comparison-value">{{ formatPercent(impact.current_rate) }}</div>
              </div>
              <div class="comparison-arrow">
                <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
              <div class="comparison-card">
                <div class="comparison-label">อัตราใหม่</div>
                <div class="comparison-value" :class="{ 'text-red-600': isIncrease, 'text-green-600': !isIncrease }">
                  {{ formatPercent(impact.new_rate) }}
                </div>
                <div class="comparison-change" :class="{ 'text-red-600': isIncrease, 'text-green-600': !isIncrease }">
                  {{ isIncrease ? '+' : '' }}{{ impact.rate_change_percent.toFixed(1) }}%
                </div>
              </div>
            </div>

            <!-- Impact Details -->
            <div class="impact-section">
              <h3 class="section-title">ผลกระทบโดยประมาณ (ต่อเดือน)</h3>
              
              <div class="impact-grid">
                <!-- Platform Revenue -->
                <div class="impact-card">
                  <div class="impact-label">
                    <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    รายได้แพลตฟอร์ม
                  </div>
                  <div class="impact-value" :class="{ 'text-green-600': isIncrease, 'text-red-600': !isIncrease }">
                    {{ isIncrease ? '+' : '' }}{{ formatCurrency(impact.estimated_monthly_revenue_change) }}
                  </div>
                </div>

                <!-- Provider Earnings -->
                <div class="impact-card">
                  <div class="impact-label">
                    <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    รายได้ Provider
                  </div>
                  <div class="impact-value" :class="{ 'text-red-600': isIncrease, 'text-green-600': !isIncrease }">
                    {{ isIncrease ? '' : '+' }}{{ formatCurrency(impact.provider_earnings_change) }}
                  </div>
                </div>

                <!-- Affected Providers -->
                <div class="impact-card">
                  <div class="impact-label">
                    <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Provider ที่ได้รับผลกระทบ
                  </div>
                  <div class="impact-value">
                    {{ impact.affected_providers }} คน
                  </div>
                </div>

                <!-- Monthly Transactions -->
                <div class="impact-card">
                  <div class="impact-label">
                    <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    ธุรกรรมต่อเดือน (30 วัน)
                  </div>
                  <div class="impact-value">
                    {{ impact.estimated_monthly_transactions.toLocaleString() }} รายการ
                  </div>
                </div>
              </div>
            </div>

            <!-- Warning Note -->
            <div class="note">
              <svg class="note-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p class="note-title">หมายเหตุ</p>
                <ul class="note-list">
                  <li>การเปลี่ยนแปลงจะมีผลในวันถัดไป (24 ชั่วโมง)</li>
                  <li>Provider ทุกคนจะได้รับการแจ้งเตือนผ่านแอป</li>
                  <li>ตัวเลขเป็นการประมาณการจากข้อมูล 30 วันที่ผ่านมา</li>
                  <li>การเปลี่ยนแปลงจะถูกบันทึกใน Audit Log</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="close"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              class="btn btn-primary"
              :disabled="loading"
              @click="confirm"
            >
              <svg v-if="loading" class="icon-sm animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              ยืนยันการเปลี่ยนแปลง
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-container {
  background: #fff;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e5e5;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.modal-subtitle {
  font-size: 0.875rem;
  color: #666;
  margin: 0.25rem 0 0 0;
}

.btn-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #666;
}

.btn-close:hover {
  background: #f5f5f5;
  color: #000;
}

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid #f5f5f5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Alert */
.alert {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid;
}

.alert-danger {
  background: #fef2f2;
  border-color: #fecaca;
  color: #991b1b;
}

.alert-warning {
  background: #fffbeb;
  border-color: #fde68a;
  color: #92400e;
}

.alert-info {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1e40af;
}

.alert-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

.alert-title {
  font-weight: 600;
  margin: 0 0 0.25rem 0;
}

.alert-message {
  font-size: 0.875rem;
  margin: 0;
}

/* Comparison */
.comparison-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 1rem;
  align-items: center;
}

.comparison-card {
  padding: 1rem;
  background: #fafafa;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  text-align: center;
}

.comparison-label {
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.comparison-value {
  font-size: 1.875rem;
  font-weight: 700;
  color: #000;
}

.comparison-change {
  font-size: 0.875rem;
  font-weight: 600;
  margin-top: 0.25rem;
}

.comparison-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Impact Section */
.impact-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.impact-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.impact-card {
  padding: 1rem;
  background: #fafafa;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
}

.impact-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.impact-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #000;
}

/* Note */
.note {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.note-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #6b7280;
  flex-shrink: 0;
}

.note-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.5rem 0;
}

.note-list {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
  padding-left: 1.25rem;
}

.note-list li {
  margin-bottom: 0.25rem;
}

/* Footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e5e5;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;
  min-height: 40px;
}

.btn-secondary {
  background: #fff;
  border-color: #e5e5e5;
  color: #000;
}

.btn-secondary:hover {
  background: #fafafa;
}

.btn-primary {
  background: #000;
  border-color: #000;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #333;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon {
  width: 1.25rem;
  height: 1.25rem;
}

.icon-sm {
  width: 1rem;
  height: 1rem;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.2s, opacity 0.2s;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
  opacity: 0;
}

/* Responsive */
@media (max-width: 640px) {
  .comparison-grid {
    grid-template-columns: 1fr;
  }
  
  .comparison-arrow {
    transform: rotate(90deg);
  }
  
  .impact-grid {
    grid-template-columns: 1fr;
  }
}
</style>
