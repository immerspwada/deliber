<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    @click.self="close"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">
          {{ isSuspending ? 'ระงับผู้ใช้งาน' : 'ยกเลิกการระงับ' }}
        </h3>
        <button
          class="text-gray-400 hover:text-gray-600 transition-colors"
          :disabled="loading"
          @click="close"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="mb-6">
        <p class="text-sm text-gray-600 mb-4">
          {{ isSuspending 
            ? `คุณต้องการระงับผู้ใช้งาน ${customerCount} คน?` 
            : `คุณต้องการยกเลิกการระงับผู้ใช้งาน ${customerCount} คน?` 
          }}
        </p>

        <!-- Reason input (only for suspension) -->
        <div v-if="isSuspending" class="space-y-2">
          <label for="reason" class="block text-sm font-medium text-gray-700">
            เหตุผล <span class="text-red-500">*</span>
          </label>
          <textarea
            id="reason"
            v-model="reason"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="ระบุเหตุผลในการระงับ..."
            :disabled="loading"
          />
          <p v-if="reasonError" class="text-sm text-red-600">
            {{ reasonError }}
          </p>
        </div>

        <!-- Error message -->
        <div v-if="error" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-600">{{ error }}</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button
          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          :disabled="loading"
          @click="close"
        >
          ยกเลิก
        </button>
        <button
          class="flex-1 px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :class="isSuspending ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'"
          :disabled="loading || (isSuspending && !reason.trim())"
          @click="confirm"
        >
          <span v-if="loading" class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            กำลังดำเนินการ...
          </span>
          <span v-else>
            {{ isSuspending ? 'ระงับ' : 'ยกเลิกการระงับ' }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useCustomerSuspension } from '@/admin/composables/useCustomerSuspension';

interface Props {
  isOpen: boolean;
  customerIds: string[];
  isSuspending: boolean;
}

interface Emits {
  (e: 'close'): void;
  (e: 'success'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { loading, error, suspendCustomer, unsuspendCustomer, bulkSuspendCustomers } = useCustomerSuspension();

const reason = ref('');
const reasonError = ref('');

const customerCount = computed(() => props.customerIds.length);

// Reset form when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    reason.value = '';
    reasonError.value = '';
    error.value = null;
  }
});

const close = () => {
  if (!loading.value) {
    emit('close');
  }
};

const confirm = async () => {
  // Validate reason for suspension
  if (props.isSuspending && !reason.value.trim()) {
    reasonError.value = 'กรุณาระบุเหตุผล';
    return;
  }

  reasonError.value = '';

  try {
    if (props.isSuspending) {
      // Suspend customers
      if (props.customerIds.length === 1) {
        await suspendCustomer(props.customerIds[0], reason.value.trim());
      } else {
        await bulkSuspendCustomers(props.customerIds, reason.value.trim());
      }
    } else {
      // Unsuspend customers
      if (props.customerIds.length === 1) {
        await unsuspendCustomer(props.customerIds[0]);
      } else {
        // Unsuspend one by one (no bulk unsuspend function)
        for (const customerId of props.customerIds) {
          await unsuspendCustomer(customerId);
        }
      }
    }

    emit('success');
    close();
  } catch (err) {
    // Error is already set in the composable
    console.error('Suspension action failed:', err);
  }
};
</script>
