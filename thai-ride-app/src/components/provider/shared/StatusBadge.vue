<script setup lang="ts">
/**
 * Status Badge V2 - Reusable Status Indicator
 * MUNEEF Design System Compliant
 * Thai Ride App - Status Badge Component
 */

import type { ProviderStatus, JobStatus } from '../../../types/provider'

interface Props {
  status: ProviderStatus | JobStatus | string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'dot' | 'outline'
  animated?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  variant: 'default',
  animated: false,
})

// Status configuration
const statusConfig: Record<string, { label: string; colorClass: string }> = {
  // Provider statuses
  pending: { label: 'รอการอนุมัติ', colorClass: 'status-warning' },
  approved: { label: 'อนุมัติแล้ว', colorClass: 'status-success' },
  active: { label: 'ใช้งานได้', colorClass: 'status-success' },
  suspended: { label: 'ถูกระงับ', colorClass: 'status-error' },
  rejected: { label: 'ถูกปฏิเสธ', colorClass: 'status-error' },
  inactive: { label: 'ไม่ใช้งาน', colorClass: 'status-neutral' },
  
  // Job statuses
  accepted: { label: 'รับงานแล้ว', colorClass: 'status-success' },
  arriving: { label: 'กำลังไป', colorClass: 'status-info' },
  arrived: { label: 'ถึงแล้ว', colorClass: 'status-info' },
  picked_up: { label: 'รับแล้ว', colorClass: 'status-primary' },
  in_progress: { label: 'กำลังดำเนินการ', colorClass: 'status-primary' },
  completed: { label: 'เสร็จสิ้น', colorClass: 'status-success' },
  cancelled: { label: 'ยกเลิก', colorClass: 'status-neutral' },
  
  // Verification statuses
  documents_required: { label: 'ต้องอัพโหลดเอกสาร', colorClass: 'status-warning' },
  under_review: { label: 'กำลังตรวจสอบ', colorClass: 'status-info' },
  verified: { label: 'ตรวจสอบแล้ว', colorClass: 'status-success' },
  
  // Online statuses
  online: { label: 'ออนไลน์', colorClass: 'status-success' },
  offline: { label: 'ออฟไลน์', colorClass: 'status-neutral' },
}

const config = statusConfig[props.status] || { 
  label: props.status, 
  colorClass: 'status-neutral' 
}

const sizeClasses = {
  sm: 'badge-sm',
  md: 'badge-md',
  lg: 'badge-lg',
}

const variantClasses = {
  default: 'badge-default',
  dot: 'badge-dot',
  outline: 'badge-outline',
}
</script>

<template>
  <span
    class="status-badge"
    :class="[
      config.colorClass,
      sizeClasses[size],
      variantClasses[variant],
      { 'badge-animated': animated }
    ]"
  >
    <!-- Dot variant -->
    <span
      v-if="variant === 'dot'"
      class="status-dot"
    />
    
    {{ config.label }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  font-weight: 600;
  border-radius: 9999px;
  transition: all 0.2s ease;
  font-family: "Sarabun", -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Size variants */
.badge-sm {
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  line-height: 1;
}

.badge-md {
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.25;
}

.badge-lg {
  padding: 0.375rem 1rem;
  font-size: 1rem;
  line-height: 1.5;
}

/* Style variants */
.badge-default {
  border: 1px solid transparent;
}

.badge-outline {
  background: transparent !important;
  border: 1px solid currentColor;
}

.badge-dot .status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  margin-right: 0.375rem;
  background: currentColor;
}

/* Color variants */
.status-success {
  background: #dcfce7;
  color: #166534;
  border-color: #bbf7d0;
}

.status-warning {
  background: #fef3c7;
  color: #92400e;
  border-color: #fde68a;
}

.status-error {
  background: #fee2e2;
  color: #991b1b;
  border-color: #fecaca;
}

.status-info {
  background: #dbeafe;
  color: #1e40af;
  border-color: #bfdbfe;
}

.status-primary {
  background: #e8f5ef;
  color: #00a86b;
  border-color: #bbf7d0;
}

.status-neutral {
  background: #f3f4f6;
  color: #374151;
  border-color: #d1d5db;
}

/* Outline variants */
.badge-outline.status-success {
  color: #166534;
}

.badge-outline.status-warning {
  color: #92400e;
}

.badge-outline.status-error {
  color: #991b1b;
}

.badge-outline.status-info {
  color: #1e40af;
}

.badge-outline.status-primary {
  color: #00a86b;
}

.badge-outline.status-neutral {
  color: #374151;
}

/* Animation */
.badge-animated {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

/* Hover effects */
.status-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .badge-lg {
    padding: 0.25rem 0.75rem;
    font-size: 0.875rem;
  }
  
  .badge-md {
    padding: 0.1875rem 0.625rem;
    font-size: 0.8125rem;
  }
}
</style>