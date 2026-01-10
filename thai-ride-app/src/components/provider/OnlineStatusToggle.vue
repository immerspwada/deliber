<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProviderStore } from '@/stores/provider'

const providerStore = useProviderStore()

const isToggling = ref(false)
const showConfirmModal = ref(false)

const isOnline = computed(() => providerStore.isOnline)
const hasActiveJob = computed(() => !!providerStore.currentJob)

async function toggleStatus(): Promise<void> {
  // If going offline with active job, show confirmation
  if (isOnline.value && hasActiveJob.value) {
    showConfirmModal.value = true
    return
  }

  await performToggle()
}

async function performToggle(): Promise<void> {
  isToggling.value = true

  try {
    await providerStore.toggleOnlineStatus()
    showConfirmModal.value = false
  } catch (error) {
    console.error('Error toggling status:', error)
  } finally {
    isToggling.value = false
  }
}

function cancelToggle(): void {
  showConfirmModal.value = false
}
</script>

<template>
  <div>
    <!-- Toggle Switch -->
    <button
      @click="toggleStatus"
      :disabled="isToggling"
      class="relative inline-flex items-center h-10 rounded-full w-20 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      :class="{
        'bg-green-600': isOnline,
        'bg-gray-300': !isOnline,
      }"
    >
      <span class="sr-only">Toggle online status</span>
      <span
        class="inline-block w-8 h-8 transform bg-white rounded-full transition-transform shadow-lg"
        :class="{
          'translate-x-11': isOnline,
          'translate-x-1': !isOnline,
        }"
      >
        <span
          v-if="isToggling"
          class="flex items-center justify-center h-full"
        >
          <svg class="animate-spin h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </span>
      </span>
    </button>

    <!-- Status Label -->
    <div class="mt-2 text-center">
      <span
        class="text-xs font-medium"
        :class="{
          'text-green-600': isOnline,
          'text-gray-600': !isOnline,
        }"
      >
        {{ isOnline ? 'ออนไลน์' : 'ออฟไลน์' }}
      </span>
    </div>

    <!-- Confirmation Modal -->
    <div
      v-if="showConfirmModal"
      class="fixed inset-0 z-50 overflow-y-auto"
    >
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <!-- Backdrop -->
        <div
          class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          @click="cancelToggle"
        />

        <!-- Modal -->
        <div
          class="relative inline-block w-full max-w-md overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl"
        >
          <div class="px-6 py-4">
            <!-- Icon -->
            <div class="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full">
              <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <!-- Content -->
            <div class="mt-4 text-center">
              <h3 class="text-lg font-semibold text-gray-900">คุณมีงานที่กำลังทำอยู่</h3>
              <p class="mt-2 text-sm text-gray-600">
                คุณแน่ใจหรือไม่ว่าต้องการออฟไลน์? คุณจะไม่สามารถรับงานใหม่ได้จนกว่าจะเสร็จงานปัจจุบัน
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="px-6 py-4 bg-gray-50 flex space-x-3">
            <button
              @click="cancelToggle"
              class="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              @click="performToggle"
              :disabled="isToggling"
              class="flex-1 px-4 py-2 text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span v-if="isToggling">กำลังดำเนินการ...</span>
              <span v-else>ยืนยัน</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
