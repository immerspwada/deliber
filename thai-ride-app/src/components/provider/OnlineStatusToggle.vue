<script setup lang="ts">
import { computed } from 'vue'
import { useProviderStore } from '../../stores/provider'

const providerStore = useProviderStore()

// Computed properties from store
const isOnline = computed(() => providerStore.isOnline)
const isToggling = computed(() => providerStore.loading)
const canToggle = computed(() => providerStore.isApproved)

async function toggleStatus(): Promise<void> {
  if (!canToggle.value || isToggling.value) return

  try {
    await providerStore.toggleOnlineStatus()
  } catch (error) {
    console.error('Error toggling status:', error)
    // Error handling is done in the store
  }
}
</script>

<template>
  <div>
    <!-- Toggle Switch -->
    <button
      @click="toggleStatus"
      :disabled="isToggling || !canToggle"
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

    <!-- Cannot Toggle Message -->
    <div v-if="!canToggle" class="mt-1 text-center">
      <span class="text-xs text-red-600">
        ไม่สามารถเปิดได้
      </span>
    </div>
  </div>
</template>
