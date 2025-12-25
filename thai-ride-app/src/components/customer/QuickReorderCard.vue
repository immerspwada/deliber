<script setup lang="ts">
/**
 * QuickReorderCard - สั่งซ้ำด้วย 1 คลิก
 * Feature: F254 - Quick Reorder
 * MUNEEF Style: สีเขียว #00A86B
 */
import { computed } from "vue";
import type { ReorderableItem } from "../../composables/useQuickReorder";

interface Props {
  item: ReorderableItem;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  reorder: [item: ReorderableItem];
}>();

const serviceColor = computed(() => {
  const colors: Record<string, string> = {
    ride: "#00A86B",
    delivery: "#F5A623",
    shopping: "#E53935",
    queue: "#9C27B0",
  };
  return colors[props.item.service_type] || "#00A86B";
});

const serviceLabel = computed(() => {
  const labels: Record<string, string> = {
    ride: "เรียกรถ",
    delivery: "ส่งของ",
    shopping: "ซื้อของ",
    queue: "จองคิว",
  };
  return labels[props.item.service_type] || props.item.service_type;
});

const handleReorder = () => {
  emit("reorder", props.item);
};
</script>

<template>
  <div class="quick-reorder-card">
    <div class="card-header">
      <div
        class="service-badge"
        :style="{ backgroundColor: serviceColor + '20', color: serviceColor }"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            v-if="item.service_type === 'ride'"
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
          />
          <path
            v-else-if="item.service_type === 'delivery'"
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
          <path v-else d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ serviceLabel }}</span>
      </div>
      <span v-if="item.reorder_count > 0" class="reorder-count">
        สั่งซ้ำ {{ item.reorder_count }} ครั้ง
      </span>
    </div>

    <div class="route-info">
      <div class="location-row">
        <div class="location-dot pickup"></div>
        <span class="location-text">{{ item.from_location }}</span>
      </div>
      <div class="location-divider"></div>
      <div class="location-row">
        <div class="location-dot destination"></div>
        <span class="location-text">{{ item.to_location }}</span>
      </div>
    </div>

    <button class="reorder-btn" :disabled="loading" @click="handleReorder">
      <svg
        v-if="!loading"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      <div v-else class="spinner"></div>
      <span>{{ loading ? "กำลังสั่ง..." : "สั่งซ้ำ" }}</span>
    </button>
  </div>
</template>

<style scoped>
.quick-reorder-card {
  background: #ffffff;
  border: 2px solid #f0f0f0;
  border-radius: 18px;
  padding: 16px;
  transition: all 0.2s ease;
}

.quick-reorder-card:hover {
  border-color: #00a86b;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.service-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
}

.service-badge svg {
  width: 16px;
  height: 16px;
}

.reorder-count {
  font-size: 12px;
  color: #999999;
}

.route-info {
  margin-bottom: 14px;
}

.location-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}

.location-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.location-dot.pickup {
  background: #00a86b;
}

.location-dot.destination {
  background: #e53935;
}

.location-divider {
  width: 2px;
  height: 16px;
  background: #e8e8e8;
  margin-left: 4px;
}

.location-text {
  font-size: 14px;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reorder-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: #00a86b;
  color: #ffffff;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.reorder-btn:hover:not(:disabled) {
  background: #008f5b;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.reorder-btn:active:not(:disabled) {
  transform: translateY(0);
}

.reorder-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.reorder-btn svg {
  width: 20px;
  height: 20px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
