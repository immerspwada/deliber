<script setup lang="ts">
/**
 * Unified Service Detail Modal
 * ============================
 * แสดงรายละเอียดของ Service Request ทุกประเภท
 * รองรับ: Ride, Delivery, Shopping, Queue, Moving, Laundry
 */
import { computed } from "vue";
import type { Order, ServiceType, OrderStatus } from "../../types";

const props = defineProps<{
  order: Order | null;
  show: boolean;
}>();

const emit = defineEmits<{
  close: [];
  updateStatus: [orderId: string, newStatus: OrderStatus];
  processRefund: [orderId: string];
}>();

// Service type configuration
const serviceConfig: Record<
  ServiceType,
  { label: string; icon: string; color: string }
> = {
  ride: { label: "เรียกรถ", icon: "🚗", color: "#3B82F6" },
  delivery: { label: "ส่งของ", icon: "📦", color: "#8B5CF6" },
  shopping: { label: "ซื้อของ", icon: "🛒", color: "#F59E0B" },
  queue: { label: "จองคิว", icon: "🎫", color: "#10B981" },
  moving: { label: "ขนย้าย", icon: "🚚", color: "#EF4444" },
  laundry: { label: "ซักผ้า", icon: "👕", color: "#06B6D4" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "รอรับ", color: "#F59E0B" },
  matched: { label: "จับคู่แล้ว", color: "#3B82F6" },
  accepted: { label: "รับงานแล้ว", color: "#3B82F6" },
  picking_up: { label: "กำลังไปรับ", color: "#8B5CF6" },
  in_progress: { label: "กำลังดำเนินการ", color: "#8B5CF6" },
  arrived: { label: "ถึงแล้ว", color: "#10B981" },
  completed: { label: "เสร็จสิ้น", color: "#10B981" },
  cancelled: { label: "ยกเลิก", color: "#EF4444" },
  refunded: { label: "คืนเงินแล้ว", color: "#6B7280" },
};

const serviceInfo = computed(() => {
  if (!props.order) return serviceConfig.ride;
  return serviceConfig[props.order.service_type] || serviceConfig.ride;
});

const statusInfo = computed(() => {
  if (!props.order) return statusConfig.pending;
  return statusConfig[props.order.status] || statusConfig.pending;
});

function formatDate(date: string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

// Available status transitions based on current status
const availableStatuses = computed<OrderStatus[]>(() => {
  if (!props.order) return [];
  const current = props.order.status;
  const transitions: Record<string, OrderStatus[]> = {
    pending: ["matched", "cancelled"],
    matched: ["in_progress", "cancelled"],
    accepted: ["picking_up", "in_progress", "cancelled"],
    picking_up: ["in_progress", "cancelled"],
    in_progress: ["completed", "cancelled"],
    arrived: ["completed", "cancelled"],
    completed: ["refunded"],
    cancelled: ["refunded"],
    refunded: [],
  };
  return transitions[current] || [];
});

function handleStatusUpdate(newStatus: OrderStatus) {
  if (props.order) {
    emit("updateStatus", props.order.id, newStatus);
  }
}

function handleRefund() {
  if (props.order) {
    emit("processRefund", props.order.id);
  }
}
</script>

<template>
  <div v-if="show && order" class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <!-- Header -->
      <div class="modal-header">
        <div class="header-info">
          <span
            class="service-badge"
            :style="{
              background: serviceInfo.color + '20',
              color: serviceInfo.color,
            }"
          >
            {{ serviceInfo.label }}
          </span>
          <h2>รายละเอียดคำสั่ง</h2>
        </div>
        <button class="close-btn" @click="emit('close')">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="modal-body">
        <!-- Order Header -->
        <div class="order-header">
          <code class="tracking-id">{{ order.tracking_id }}</code>
          <span
            class="status-badge"
            :style="{
              background: statusInfo.color + '20',
              color: statusInfo.color,
            }"
          >
            {{ statusInfo.label }}
          </span>
        </div>

        <!-- Customer & Provider Info -->
        <div class="info-section">
          <h3>ข้อมูลผู้ใช้</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>ลูกค้า</label>
              <span>{{ order.customer_name || "-" }}</span>
            </div>
            <div class="info-item">
              <label>เบอร์โทรลูกค้า</label>
              <span>{{ order.customer_phone || "-" }}</span>
            </div>
            <div class="info-item">
              <label>ผู้ให้บริการ</label>
              <span>{{ order.provider_name || "ยังไม่มี" }}</span>
            </div>
            <div class="info-item">
              <label>เบอร์โทรผู้ให้บริการ</label>
              <span>{{ order.provider_phone || "-" }}</span>
            </div>
          </div>
        </div>

        <!-- Location Info -->
        <div class="info-section">
          <h3>สถานที่</h3>
          <div class="location-info">
            <div class="location-item pickup">
              <div class="location-dot"></div>
              <div class="location-text">
                <label>จุดรับ</label>
                <span>{{ order.pickup_address || "-" }}</span>
              </div>
            </div>
            <div class="location-line"></div>
            <div class="location-item dropoff">
              <div class="location-dot"></div>
              <div class="location-text">
                <label>จุดส่ง</label>
                <span>{{ order.dropoff_address || "-" }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Payment Info -->
        <div class="info-section">
          <h3>การชำระเงิน</h3>
          <div class="info-grid">
            <div class="info-item">
              <label>ยอดรวม</label>
              <span class="amount">{{
                formatCurrency(order.total_amount)
              }}</span>
            </div>
            <div class="info-item">
              <label>วิธีชำระ</label>
              <span>{{
                { cash: "เงินสด", wallet: "Wallet", card: "บัตร" }[
                  order.payment_method
                ] || order.payment_method
              }}</span>
            </div>
            <div v-if="order.promo_discount" class="info-item">
              <label>ส่วนลด</label>
              <span class="discount">-{{ formatCurrency(order.promo_discount) }}</span>
            </div>
            <div v-if="order.tip_amount" class="info-item">
              <label>ทิป</label>
              <span>{{ formatCurrency(order.tip_amount) }}</span>
            </div>
          </div>
        </div>

        <!-- Timeline -->
        <div class="info-section">
          <h3>ไทม์ไลน์</h3>
          <div class="timeline">
            <div v-if="order.created_at" class="timeline-item">
              <div class="timeline-dot active"></div>
              <div class="timeline-content">
                <span class="timeline-label">สร้างคำสั่ง</span>
                <span class="timeline-time">{{
                  formatDate(order.created_at)
                }}</span>
              </div>
            </div>
            <div v-if="order.matched_at" class="timeline-item">
              <div class="timeline-dot active"></div>
              <div class="timeline-content">
                <span class="timeline-label">จับคู่สำเร็จ</span>
                <span class="timeline-time">{{
                  formatDate(order.matched_at)
                }}</span>
              </div>
            </div>
            <div v-if="order.started_at" class="timeline-item">
              <div class="timeline-dot active"></div>
              <div class="timeline-content">
                <span class="timeline-label">เริ่มดำเนินการ</span>
                <span class="timeline-time">{{
                  formatDate(order.started_at)
                }}</span>
              </div>
            </div>
            <div v-if="order.completed_at" class="timeline-item">
              <div class="timeline-dot completed"></div>
              <div class="timeline-content">
                <span class="timeline-label">เสร็จสิ้น</span>
                <span class="timeline-time">{{
                  formatDate(order.completed_at)
                }}</span>
              </div>
            </div>
            <div v-if="order.cancelled_at" class="timeline-item">
              <div class="timeline-dot cancelled"></div>
              <div class="timeline-content">
                <span class="timeline-label">ยกเลิก</span>
                <span class="timeline-time">{{
                  formatDate(order.cancelled_at)
                }}</span>
                <span v-if="order.cancel_reason" class="timeline-note">{{
                  order.cancel_reason
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="order.customer_notes" class="info-section">
          <h3>หมายเหตุ</h3>
          <p class="notes">{{ order.customer_notes }}</p>
        </div>

        <!-- Rating -->
        <div
          v-if="order.customer_rating || order.provider_rating"
          class="info-section"
        >
          <h3>คะแนน</h3>
          <div class="info-grid">
            <div v-if="order.customer_rating" class="info-item">
              <label>จากลูกค้า</label>
              <div class="rating">
                <svg
                  v-for="i in 5"
                  :key="i"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  :fill="i <= order.customer_rating ? '#F59E0B' : '#E5E7EB'"
                  stroke="none"
                >
                  <polygon
                    points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                  />
                </svg>
              </div>
            </div>
            <div v-if="order.provider_rating" class="info-item">
              <label>จากผู้ให้บริการ</label>
              <div class="rating">
                <svg
                  v-for="i in 5"
                  :key="i"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  :fill="i <= order.provider_rating ? '#F59E0B' : '#E5E7EB'"
                  stroke="none"
                >
                  <polygon
                    points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="modal-footer">
        <div v-if="availableStatuses.length > 0" class="status-actions">
          <span class="action-label">เปลี่ยนสถานะ:</span>
          <button
            v-for="status in availableStatuses"
            :key="status"
            class="status-btn"
            :class="status"
            @click="handleStatusUpdate(status)"
          >
            {{ statusConfig[status]?.label || status }}
          </button>
        </div>
        <div class="main-actions">
          <button class="btn btn-secondary" @click="emit('close')">ปิด</button>
          <button
            v-if="order.status === 'cancelled' || order.status === 'completed'"
            class="btn btn-warning"
            @click="handleRefund"
          >
            คืนเงิน
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.service-badge {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #1f2937;
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #6b7280;
}

.close-btn:hover {
  background: #f3f4f6;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.tracking-id {
  font-family: monospace;
  font-size: 16px;
  padding: 6px 12px;
  background: #f3f4f6;
  border-radius: 6px;
  font-weight: 600;
}

.status-badge {
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
}

.info-section {
  margin-bottom: 24px;
}

.info-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #f3f4f6;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
}

.info-item span {
  font-size: 14px;
  color: #1f2937;
}

.info-item .amount {
  font-weight: 600;
  color: #059669;
}

.info-item .discount {
  color: #ef4444;
}

/* Location styling */
.location-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.location-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.location-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.pickup .location-dot {
  background: #00a86b;
}

.dropoff .location-dot {
  background: #ef4444;
}

.location-line {
  width: 2px;
  height: 20px;
  background: #e5e7eb;
  margin-left: 5px;
}

.location-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.location-text label {
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
}

.location-text span {
  font-size: 14px;
  color: #1f2937;
}

/* Timeline styling */
.timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
  background: #d1d5db;
}

.timeline-dot.active {
  background: #3b82f6;
}

.timeline-dot.completed {
  background: #10b981;
}

.timeline-dot.cancelled {
  background: #ef4444;
}

.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.timeline-label {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.timeline-time {
  font-size: 12px;
  color: #6b7280;
}

.timeline-note {
  font-size: 12px;
  color: #ef4444;
  font-style: italic;
}

.notes {
  font-size: 14px;
  color: #4b5563;
  line-height: 1.5;
  margin: 0;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.rating {
  display: flex;
  gap: 2px;
}

/* Footer */
.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.action-label {
  font-size: 13px;
  color: #6b7280;
}

.status-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.status-btn.matched,
.status-btn.in_progress {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-btn.completed {
  background: #d1fae5;
  color: #047857;
}

.status-btn.cancelled {
  background: #fee2e2;
  color: #b91c1c;
}

.status-btn.refunded {
  background: #f3f4f6;
  color: #4b5563;
}

.status-btn:hover {
  opacity: 0.8;
}

.main-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-warning {
  background: #f59e0b;
  color: #fff;
}

.btn:hover {
  opacity: 0.9;
}
</style>
