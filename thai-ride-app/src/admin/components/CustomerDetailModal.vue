<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    @click.self="close"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900">รายละเอียดลูกค้า</h3>
        <button
          type="button"
          class="text-gray-400 hover:text-gray-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="ปิด"
          @click="close"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="px-6 py-4 space-y-6">
        <!-- Basic Info -->
        <section>
          <h4 class="text-sm font-medium text-gray-700 mb-3">ข้อมูลพื้นฐาน</h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs text-gray-500">ชื่อ</label>
              <p class="text-sm font-medium text-gray-900">{{ customer.full_name || '-' }}</p>
            </div>
            <div>
              <label class="text-xs text-gray-500">อีเมล</label>
              <p class="text-sm font-medium text-gray-900">{{ customer.email || '-' }}</p>
            </div>
            <div>
              <label class="text-xs text-gray-500">เบอร์โทร</label>
              <p class="text-sm font-medium text-gray-900">{{ customer.phone_number || '-' }}</p>
            </div>
            <div>
              <label class="text-xs text-gray-500">สถานะ</label>
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="getStatusClass(customer.status)"
              >
                {{ getStatusLabel(customer.status) }}
              </span>
            </div>
            <div>
              <label class="text-xs text-gray-500">วันที่สมัคร</label>
              <p class="text-sm font-medium text-gray-900">{{ formatDate(customer.created_at) }}</p>
            </div>
          </div>
        </section>

        <!-- Suspension Info -->
        <section v-if="customer.status === 'suspended' && customer.suspended_at">
          <h4 class="text-sm font-medium text-gray-700 mb-3">ข้อมูลการระงับ</h4>
          <div class="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
            <div>
              <label class="text-xs text-red-700">วันที่ระงับ</label>
              <p class="text-sm font-medium text-red-900">{{ formatDate(customer.suspended_at) }}</p>
            </div>
            <div v-if="customer.suspension_reason">
              <label class="text-xs text-red-700">เหตุผล</label>
              <p class="text-sm text-red-900">{{ customer.suspension_reason }}</p>
            </div>
          </div>
        </section>
      </div>

      <!-- Actions -->
      <div class="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
        <button
          type="button"
          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors min-h-[44px]"
          @click="close"
        >
          ปิด
        </button>
        
        <button
          v-if="customer.status === 'active'"
          type="button"
          class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors min-h-[44px]"
          @click="handleSuspend"
        >
          ระงับผู้ใช้งาน
        </button>
        
        <button
          v-else-if="customer.status === 'suspended'"
          type="button"
          class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors min-h-[44px]"
          @click="handleUnsuspend"
        >
          ยกเลิกการระงับ
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Customer {
  id: string;
  email: string | null;
  full_name: string | null;
  phone_number: string | null;
  status: string;
  created_at: string;
  suspended_at: string | null;
  suspension_reason: string | null;
}

interface Props {
  isOpen: boolean;
  customer: Customer;
}

interface Emits {
  (e: 'close'): void;
  (e: 'suspend'): void;
  (e: 'unsuspend'): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

function close() {
  emit('close');
}

function handleSuspend() {
  emit('suspend');
}

function handleUnsuspend() {
  emit('unsuspend');
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'ใช้งานปกติ',
    suspended: 'ถูกระงับ',
    banned: 'ถูกแบน',
  };
  return labels[status] || status;
}

function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-red-100 text-red-800',
    banned: 'bg-gray-100 text-gray-800',
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>
