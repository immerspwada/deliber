<template>
  <div class="promo-card">
    <!-- Checkbox -->
    <input
      type="checkbox"
      :checked="selected"
      class="promo-checkbox"
      @change="$emit('select')"
    />

    <!-- Content -->
    <div class="promo-content">
      <!-- Header -->
      <div class="promo-header">
        <div class="promo-title-section">
          <h3 class="promo-code">{{ promo.code }}</h3>
          <div class="promo-badges">
            <span :class="['badge', promo.is_active ? 'badge-active' : 'badge-inactive']">
              {{ promo.is_active ? 'ใช้งานอยู่' : 'ปิดใช้งาน' }}
            </span>
            <span v-if="isExpired" class="badge badge-expired">
              หมดอายุ
            </span>
            <span v-else-if="isUpcoming" class="badge badge-upcoming">
              กำลังจะมา
            </span>
          </div>
          <p v-if="promo.description" class="promo-description">{{ promo.description }}</p>
        </div>

        <!-- Actions -->
        <div class="promo-actions">
          <button
            type="button"
            class="action-btn"
            @click="$emit('toggle-status')"
          >
            {{ promo.is_active ? 'ปิด' : 'เปิด' }}
          </button>
          <button
            type="button"
            class="action-btn"
            @click="$emit('edit')"
          >
            แก้ไข
          </button>
          <button
            type="button"
            class="action-btn danger"
            @click="$emit('delete')"
          >
            ลบ
          </button>
        </div>
      </div>

      <!-- Details Grid -->
      <div class="promo-details">
        <div class="detail-item">
          <span class="detail-label">ส่วนลด</span>
          <span class="detail-value">{{ formatDiscount(promo) }}</span>
        </div>

        <div class="detail-item">
          <span class="detail-label">การใช้งาน</span>
          <span class="detail-value">
            {{ promo.used_count || 0 }} / {{ promo.usage_limit || '∞' }}
          </span>
          <div class="usage-bar">
            <div class="usage-fill" :style="{ width: usagePercentage + '%' }"></div>
          </div>
        </div>

        <div class="detail-item">
          <span class="detail-label">ยอดขั้นต่ำ</span>
          <span class="detail-value">
            {{ promo.min_order_amount ? `฿${promo.min_order_amount}` : 'ไม่จำกัด' }}
          </span>
        </div>

        <div class="detail-item">
          <span class="detail-label">จำกัดต่อคน</span>
          <span class="detail-value">
            {{ promo.per_user_limit || 'ไม่จำกัด' }}
          </span>
        </div>
      </div>

      <!-- Meta Info -->
      <div class="promo-meta">
        <div class="meta-item">
          <span class="meta-label">บริการ:</span>
          <div class="meta-tags">
            <span
              v-for="service in promo.service_types"
              :key="service"
              class="meta-tag"
            >
              {{ service }}
            </span>
          </div>
        </div>

        <div class="meta-item">
          <span class="meta-label">ระยะเวลา:</span>
          <span class="meta-value">
            {{ formatDate(promo.valid_from) }} - {{ formatDate(promo.valid_until) }}
          </span>
        </div>

        <div class="meta-item">
          <span class="meta-label">หมวดหมู่:</span>
          <span class="meta-value">{{ promo.category }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Database } from '@/types/database'

type PromoCode = Database['public']['Tables']['promo_codes']['Row']

interface Props {
  promo: PromoCode
  selected: boolean
}

const props = defineProps<Props>()

defineEmits<{
  select: []
  edit: []
  delete: []
  'toggle-status': []
}>()

const isExpired = computed(() => {
  if (!props.promo.valid_until) return false
  return new Date(props.promo.valid_until) < new Date()
})

const isUpcoming = computed(() => {
  if (!props.promo.valid_from) return false
  return new Date(props.promo.valid_from) > new Date()
})

const usagePercentage = computed(() => {
  if (!props.promo.usage_limit) return 0
  const used = props.promo.used_count || 0
  const limit = props.promo.usage_limit
  return Math.min((used / limit) * 100, 100)
})

function formatDiscount(promo: PromoCode): string {
  if (promo.discount_type === 'fixed') {
    return `฿${promo.discount_value}`
  } else {
    const max = promo.max_discount ? ` (สูงสุด ฿${promo.max_discount})` : ''
    return `${promo.discount_value}%${max}`
  }
}

function formatDate(date: string | null): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<style scoped>
/* Promo Card */
.promo-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: #FFFFFF;
  border: 2px solid #E5E5E5;
  border-radius: 8px;
  transition: all 0.2s;
}

.promo-card:hover {
  border-color: #000000;
}

/* Checkbox */
.promo-checkbox {
  width: 20px;
  height: 20px;
  margin-top: 2px;
  cursor: pointer;
  flex-shrink: 0;
  accent-color: #000000;
}

/* Content */
.promo-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Header */
.promo-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.promo-title-section {
  flex: 1;
  min-width: 0;
}

.promo-code {
  font-size: 20px;
  font-weight: 700;
  color: #000000;
  margin: 0 0 8px 0;
}

.promo-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.badge {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-active {
  background: #000000;
  color: #FFFFFF;
}

.badge-inactive {
  background: #F5F5F5;
  color: #666666;
  border: 1px solid #E5E5E5;
}

.badge-expired {
  background: #FFFFFF;
  color: #000000;
  border: 2px solid #000000;
}

.badge-upcoming {
  background: #F5F5F5;
  color: #000000;
  border: 1px solid #CCCCCC;
}

.promo-description {
  font-size: 14px;
  color: #666666;
  margin: 0;
  line-height: 1.5;
}

/* Actions */
.promo-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  padding: 8px 16px;
  background: #FFFFFF;
  color: #000000;
  border: 2px solid #E5E5E5;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  min-height: 36px;
}

.action-btn:hover {
  border-color: #000000;
}

.action-btn.danger {
  border-color: #000000;
}

.action-btn.danger:hover {
  background: #000000;
  color: #FFFFFF;
}

/* Details Grid */
.promo-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  padding: 16px;
  background: #F5F5F5;
  border-radius: 6px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 11px;
  font-weight: 600;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 16px;
  font-weight: 700;
  color: #000000;
}

/* Usage Bar */
.usage-bar {
  width: 100%;
  height: 4px;
  background: #E5E5E5;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 4px;
}

.usage-fill {
  height: 100%;
  background: #000000;
  transition: width 0.3s;
}

/* Meta Info */
.promo-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-label {
  font-weight: 600;
  color: #666666;
}

.meta-value {
  color: #000000;
  font-weight: 500;
}

.meta-tags {
  display: flex;
  gap: 4px;
}

.meta-tag {
  padding: 2px 8px;
  background: #000000;
  color: #FFFFFF;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Responsive */
@media (max-width: 768px) {
  .promo-card {
    flex-direction: column;
  }

  .promo-header {
    flex-direction: column;
  }

  .promo-actions {
    width: 100%;
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
  }

  .promo-details {
    grid-template-columns: repeat(2, 1fr);
  }

  .promo-meta {
    flex-direction: column;
    gap: 8px;
  }

  .meta-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
