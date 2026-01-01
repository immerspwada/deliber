<script setup lang="ts">
/**
 * Feature: F154 - Ride Request Card (Provider)
 * Display incoming ride request for provider to accept/decline
 *
 * @syncs-with
 * - Customer: RideView.vue (creates ride with promo)
 * - Admin: AdminRidesView.vue (sees all rides)
 * - Promo: PromoInfoBadge.vue (shows discount)
 */
import { ref, onMounted, onUnmounted } from "vue";
import PromoInfoBadge from "./PromoInfoBadge.vue";

interface RideRequest {
  id: string;
  tracking_id?: string;
  user_id: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  destination_lat: number;
  destination_lng: number;
  destination_address: string;
  estimated_fare: number;
  estimated_distance?: number;
  estimated_duration?: number;
  status: string;
  payment_method?: string;
  passenger_name?: string;
  passenger_rating?: number;
  // Promo fields
  promo_code?: string;
  promo_code_id?: string;
  promo_discount_amount?: number;
}

interface Props {
  request: RideRequest;
  autoDeclineSeconds?: number;
}

const props = withDefaults(defineProps<Props>(), {
  autoDeclineSeconds: 30,
});

const emit = defineEmits<{
  accept: [];
  decline: [];
}>();

const timeLeft = ref(props.autoDeclineSeconds);
let timer: number | undefined;

onMounted(() => {
  timer = window.setInterval(() => {
    timeLeft.value--;
    if (timeLeft.value <= 0) {
      emit("decline");
    }
  }, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

const progressPercent = () => {
  return (timeLeft.value / props.autoDeclineSeconds) * 100;
};

const formatDistance = (meters?: number) => {
  if (!meters) return "-";
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} กม.` : `${meters} ม.`;
};
</script>

<template>
  <div class="ride-request-card">
    <div class="timer-bar">
      <div class="timer-fill" :style="{ width: `${progressPercent()}%` }" />
    </div>

    <div class="card-header">
      <span class="request-label">คำขอเรียกรถใหม่</span>
      <span class="timer-text">{{ timeLeft }}s</span>
    </div>

    <div class="customer-info">
      <div class="customer-avatar">
        {{ (request.passenger_name || "U")[0] }}
      </div>
      <div class="customer-details">
        <span class="customer-name">{{
          request.passenger_name || "ผู้โดยสาร"
        }}</span>
        <span v-if="request.passenger_rating" class="customer-rating">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
          {{ request.passenger_rating.toFixed(1) }}
        </span>
      </div>
      <span class="payment-badge">{{
        request.payment_method || "เงินสด"
      }}</span>
    </div>

    <div class="route-section">
      <div class="route-point pickup">
        <div class="point-dot" />
        <div class="point-info">
          <span class="point-label">รับ</span>
          <span class="point-address">{{ request.pickup_address }}</span>
        </div>
      </div>
      <div class="route-line" />
      <div class="route-point destination">
        <div class="point-dot" />
        <div class="point-info">
          <span class="point-label">ส่ง</span>
          <span class="point-address">{{ request.destination_address }}</span>
        </div>
      </div>
    </div>

    <div class="trip-info">
      <div class="info-item">
        <span class="info-label">ระยะทาง</span>
        <span class="info-value">{{
          formatDistance(request.estimated_distance)
        }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">ค่าโดยสาร</span>
        <span class="info-value fare"
          >฿{{ request.estimated_fare?.toLocaleString() || "-" }}</span
        >
      </div>
    </div>

    <!-- Promo Badge (if customer used promo code) -->
    <div v-if="request.promo_code" class="promo-section">
      <PromoInfoBadge service-type="ride" :request-id="request.id" />
    </div>

    <div class="card-actions">
      <button type="button" class="decline-btn" @click="emit('decline')">
        ปฏิเสธ
      </button>
      <button type="button" class="accept-btn" @click="emit('accept')">
        รับงาน
      </button>
    </div>
  </div>
</template>

<style scoped>
.ride-request-card {
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.timer-bar {
  height: 4px;
  background: #e5e5e5;
}

.timer-fill {
  height: 100%;
  background: #2e7d32;
  transition: width 1s linear;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.request-label {
  font-size: 14px;
  font-weight: 600;
  color: #2e7d32;
}

.timer-text {
  font-size: 16px;
  font-weight: 700;
  color: #000;
  font-variant-numeric: tabular-nums;
}

.customer-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
}

.customer-avatar {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 50%;
  font-size: 18px;
  font-weight: 600;
  color: #000;
}

.customer-details {
  flex: 1;
}

.customer-name {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  display: block;
}

.customer-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #6b6b6b;
}

.customer-rating svg {
  color: #ffc107;
}

.payment-badge {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  background: #f6f6f6;
  border-radius: 6px;
  color: #6b6b6b;
}

.route-section {
  padding: 0 20px 16px;
  position: relative;
}

.route-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.route-point.pickup {
  margin-bottom: 12px;
}

.point-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.pickup .point-dot {
  background: #2e7d32;
}
.destination .point-dot {
  border: 3px solid #000;
}

.route-line {
  position: absolute;
  left: 25px;
  top: 20px;
  bottom: 24px;
  width: 2px;
  background: #e5e5e5;
}

.point-label {
  font-size: 11px;
  color: #6b6b6b;
  text-transform: uppercase;
  display: block;
}

.point-address {
  font-size: 14px;
  font-weight: 500;
  color: #000;
}

.trip-info {
  display: flex;
  padding: 16px 20px;
  background: #f6f6f6;
  gap: 24px;
}

.info-item {
  flex: 1;
}

.info-label {
  font-size: 12px;
  color: #6b6b6b;
  display: block;
}

.info-value {
  font-size: 16px;
  font-weight: 600;
  color: #000;
}

.info-value.fare {
  color: #2e7d32;
}

.promo-section {
  padding: 8px 20px 16px;
}

.card-actions {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
}

.decline-btn,
.accept-btn {
  flex: 1;
  padding: 16px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.decline-btn {
  background: #f6f6f6;
  color: #6b6b6b;
}

.accept-btn {
  background: #2e7d32;
  color: #fff;
}

.accept-btn:hover {
  background: #1b5e20;
}
</style>
