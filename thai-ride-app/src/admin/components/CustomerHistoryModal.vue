<script setup lang="ts">
/**
 * Customer History Modal
 * ======================
 * แสดงประวัติออเดอร์และการเปลี่ยนแปลงข้อมูลของลูกค้า
 */
import { ref, watch, computed } from 'vue'
import { useCustomerHistory } from '@/admin/composables/useCustomerHistory'

interface Props {
  show: boolean
  customerId: string | null
  customerName: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const {
  orders,
  historyChanges,
  loadingOrders,
  loadingHistory,
  totalOrders,
  completedOrders,
  cancelledOrders,
  totalSpent,
  fetchCustomerOrders,
  fetchCustomerHistory,
  formatCurrency,
  formatDate,
  formatOrderType,
  formatStatus,
  getStatusColor,
  getOrderTypeIcon
} = useCustomerHistory()

// Active tab
const activeTab = ref<'orders' | 'history'>('orders')

// Load data when modal opens
watch(() => props.show, (show) => {
  if (show && props.customerId) {
    fetchCustomerOrders(props.customerId)
    fetchCustomerHistory(props.customerId)
  }
})

// Filter orders by type
const orderTypeFilter = ref<string>('all')
const filteredOrders = computed(() => {
  if (orderTypeFilter.value === 'all') return orders.value
  return orders.value.filter(o => o.order_type === orderTypeFilter.value)
})

</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
        <div class="modal-container modal-lg">
          <!-- Header -->
          <div class="modal-header">
            <div class="header-content">
              <h2 class="modal-title">ประวัติลูกค้า</h2>
              <div class="customer-badge">{{ customerName }}</div>
            </div>
            <button class="modal-close" @click="$emit('close')" aria-label="ปิด">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Stats Summary -->
          <div class="stats-bar">
            <div class="stat-item">
              <div class="stat-label">ออเดอร์ทั้งหมด</div>
              <div class="stat-value">{{ totalOrders }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">สำเร็จ</div>
              <div class="stat-value success">{{ completedOrders }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">ยกเลิก</div>
              <div class="stat-value danger">{{ cancelledOrders }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">ยอดใช้จ่ายรวม</div>
              <div class="stat-value highlight">{{ formatCurrency(totalSpent) }}</div>
            </div>
          </div>

          <!-- Tabs -->
          <div class="tabs-container">
            <button 
              class="tab-btn" 
              :class="{ active: activeTab === 'orders' }"
              @click="activeTab = 'orders'"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              ประวัติออเดอร์
              <span class="tab-badge">{{ totalOrders }}</span>
            </button>
            <button 
              class="tab-btn" 
              :class="{ active: activeTab === 'history' }"
              @click="activeTab = 'history'"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              ประวัติการเปลี่ยนแปลง
              <span class="tab-badge">{{ historyChanges.length }}</span>
            </button>
          </div>

          <!-- Content -->
          <div class="modal-content">
            <!-- Orders Tab -->
            <div v-if="activeTab === 'orders'" class="tab-content">
              <!-- Filter -->
              <div class="filter-bar">
                <button 
                  class="filter-chip" 
                  :class="{ active: orderTypeFilter === 'all' }"
                  @click="orderTypeFilter = 'all'"
                >
                  ทั้งหมด
                </button>
                <button 
                  class="filter-chip" 
                  :class="{ active: orderTypeFilter === 'ride' }"
                  @click="orderTypeFilter = 'ride'"
                >
                  🚗 เรียกรถ
                </button>
                <button 
                  class="filter-chip" 
                  :class="{ active: orderTypeFilter === 'queue' }"
                  @click="orderTypeFilter = 'queue'"
                >
                  📅 จองคิว
                </button>
                <button 
                  class="filter-chip" 
                  :class="{ active: orderTypeFilter === 'shopping' }"
                  @click="orderTypeFilter = 'shopping'"
                >
                  🛒 ช้อปปิ้ง
                </button>
                <button 
                  class="filter-chip" 
                  :class="{ active: orderTypeFilter === 'delivery' }"
                  @click="orderTypeFilter = 'delivery'"
                >
                  📦 ส่งของ
                </button>
              </div>

              <!-- Loading -->
              <div v-if="loadingOrders" class="loading-state">
                <div class="spinner"></div>
                <p>กำลังโหลดประวัติออเดอร์...</p>
              </div>

              <!-- Orders List -->
              <div v-else-if="filteredOrders.length > 0" class="orders-list">
                <div 
                  v-for="order in filteredOrders" 
                  :key="order.id" 
                  class="order-card"
                >
                  <div class="order-header">
                    <div class="order-type">
                      <span class="type-icon">{{ getOrderTypeIcon(order.order_type) }}</span>
                      <span class="type-label">{{ formatOrderType(order.order_type) }}</span>
                    </div>
                    <span 
                      class="status-badge" 
                      :style="{ backgroundColor: getStatusColor(order.status) + '20', color: getStatusColor(order.status) }"
                    >
                      {{ formatStatus(order.status) }}
                    </span>
                  </div>

                  <div class="order-body">
                    <div class="order-info">
                      <div class="info-row">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M9 11a3 3 0 106 0 3 3 0 00-6 0z"/>
                          <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        </svg>
                        <span class="info-text">{{ order.pickup_address }}</span>
                      </div>
                      <div class="info-row">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span class="info-text">{{ order.dropoff_address }}</span>
                      </div>
                      <div class="info-row">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        <span class="info-text">{{ order.provider_name }}</span>
                      </div>
                    </div>

                    <div class="order-meta">
                      <div class="meta-item">
                        <span class="meta-label">หมายเลข</span>
                        <code class="meta-value">{{ order.order_number }}</code>
                      </div>
                      <div class="meta-item">
                        <span class="meta-label">วันที่</span>
                        <span class="meta-value">{{ formatDate(order.created_at) }}</span>
                      </div>
                      <div class="meta-item">
                        <span class="meta-label">ค่าบริการ</span>
                        <span class="meta-value highlight">{{ formatCurrency(order.total_fare) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-else class="empty-state">
                <div class="empty-icon">📋</div>
                <p class="empty-text">ไม่พบประวัติออเดอร์</p>
              </div>
            </div>

            <!-- History Tab -->
            <div v-if="activeTab === 'history'" class="tab-content">
              <!-- Loading -->
              <div v-if="loadingHistory" class="loading-state">
                <div class="spinner"></div>
                <p>กำลังโหลดประวัติการเปลี่ยนแปลง...</p>
              </div>

              <!-- History Timeline -->
              <div v-else-if="historyChanges.length > 0" class="history-timeline">
                <div 
                  v-for="change in historyChanges" 
                  :key="change.id" 
                  class="timeline-item"
                >
                  <div class="timeline-marker"></div>
                  <div class="timeline-content">
                    <div class="timeline-header">
                      <span class="change-type">{{ change.change_type }}</span>
                      <span class="change-date">{{ formatDate(change.changed_at) }}</span>
                    </div>
                    <div class="timeline-body">
                      <div class="change-field">
                        <span class="field-label">ฟิลด์:</span>
                        <code>{{ change.field_name }}</code>
                      </div>
                      <div v-if="change.old_value" class="change-value">
                        <span class="value-label">เดิม:</span>
                        <span class="value-text old">{{ change.old_value }}</span>
                      </div>
                      <div v-if="change.new_value" class="change-value">
                        <span class="value-label">ใหม่:</span>
                        <span class="value-text new">{{ change.new_value }}</span>
                      </div>
                      <div v-if="change.reason" class="change-reason">
                        <span class="reason-label">เหตุผล:</span>
                        <span class="reason-text">{{ change.reason }}</span>
                      </div>
                      <div class="change-by">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        <span>{{ change.changed_by_name }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-else class="empty-state">
                <div class="empty-icon">📝</div>
                <p class="empty-text">ไม่พบประวัติการเปลี่ยนแปลง</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
  overflow-y: auto;
}

.modal-container {
  background: #fff;
  border-radius: 20px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modalSlideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-bottom: 1px solid #E5E7EB;
  flex-shrink: 0;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.customer-badge {
  padding: 6px 14px;
  background: linear-gradient(135deg, #00A86B 0%, #00C87A 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  border-radius: 20px;
}

.modal-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  color: #6B7280;
  transition: all 0.2s;
  flex-shrink: 0;
}

.modal-close:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #374151;
}

.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: #E5E7EB;
  border-bottom: 1px solid #E5E7EB;
}

.stat-item {
  padding: 16px 20px;
  background: #F9FAFB;
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: #6B7280;
  margin-bottom: 6px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
}

.stat-value.success {
  color: #059669;
}

.stat-value.danger {
  color: #DC2626;
}

.stat-value.highlight {
  color: #00A86B;
}

.tabs-container {
  display: flex;
  gap: 4px;
  padding: 16px 20px 0;
  border-bottom: 1px solid #E5E7EB;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  font-size: 14px;
  font-weight: 500;
  color: #6B7280;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #374151;
  background: #F9FAFB;
}

.tab-btn.active {
  color: #00A86B;
  border-bottom-color: #00A86B;
}

.tab-badge {
  padding: 2px 8px;
  background: #E5E7EB;
  color: #6B7280;
  font-size: 12px;
  font-weight: 600;
  border-radius: 10px;
}

.tab-btn.active .tab-badge {
  background: #D1FAE5;
  color: #059669;
}

.modal-content {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-chip {
  padding: 8px 16px;
  background: #F3F4F6;
  border: 1px solid #E5E7EB;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: #6B7280;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-chip:hover {
  background: #E5E7EB;
}

.filter-chip.active {
  background: #00A86B;
  border-color: #00A86B;
  color: #fff;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E5E7EB;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.order-card {
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
}

.order-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #fff;
  border-bottom: 1px solid #E5E7EB;
}

.order-type {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #111827;
}

.type-icon {
  font-size: 18px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.order-body {
  padding: 16px;
}

.order-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: #6B7280;
}

.info-row svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.info-text {
  font-size: 14px;
  line-height: 1.5;
}

.order-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #E5E7EB;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  font-size: 11px;
  font-weight: 600;
  color: #9CA3AF;
  text-transform: uppercase;
}

.meta-value {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
}

.meta-value.highlight {
  color: #00A86B;
  font-weight: 700;
}

.meta-value code {
  font-family: 'SF Mono', monospace;
  font-size: 12px;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.history-timeline {
  position: relative;
  padding-left: 30px;
}

.history-timeline::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #E5E7EB;
}

.timeline-item {
  position: relative;
  margin-bottom: 24px;
}

.timeline-marker {
  position: absolute;
  left: -26px;
  top: 6px;
  width: 16px;
  height: 16px;
  background: #00A86B;
  border: 3px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 2px #E5E7EB;
}

.timeline-content {
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 16px;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.change-type {
  font-weight: 600;
  color: #111827;
  text-transform: capitalize;
}

.change-date {
  font-size: 12px;
  color: #9CA3AF;
}

.timeline-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.change-field,
.change-value,
.change-reason,
.change-by {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
}

.field-label,
.value-label,
.reason-label {
  font-weight: 600;
  color: #6B7280;
  flex-shrink: 0;
}

.change-field code {
  font-family: 'SF Mono', monospace;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  color: #374151;
}

.value-text {
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 500;
}

.value-text.old {
  background: #FEE2E2;
  color: #991B1B;
}

.value-text.new {
  background: #D1FAE5;
  color: #065F46;
}

.reason-text {
  color: #6B7280;
  font-style: italic;
}

.change-by {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #E5E7EB;
  color: #9CA3AF;
  font-size: 12px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  color: #9CA3AF;
  margin: 0;
}

/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .modal-container {
    max-width: 100%;
    max-height: 95vh;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }

  .order-meta {
    grid-template-columns: 1fr;
  }

  .filter-bar {
    overflow-x: auto;
    flex-wrap: nowrap;
  }
}
</style>
