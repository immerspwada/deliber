<template>
  <div class="service-type-switcher">
    <!-- Tabs for multiple service types -->
    <div v-if="serviceTypes.length > 1" class="flex gap-2 overflow-x-auto pb-2">
      <button
        v-for="type in serviceTypes"
        :key="type"
        @click="switchServiceType(type)"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
          activeServiceType === type
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        ]"
      >
        <span class="mr-2">{{ getServiceIcon(type) }}</span>
        {{ getServiceLabel(type) }}
      </button>
    </div>

    <!-- Single service type badge -->
    <div v-else-if="serviceTypes.length === 1" class="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
      <span class="text-lg">{{ getServiceIcon(serviceTypes[0]) }}</span>
      <span class="font-medium">{{ getServiceLabel(serviceTypes[0]) }}</span>
    </div>

    <!-- No service types -->
    <div v-else class="text-gray-500 text-sm">
      ไม่มีประเภทบริการ
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useProviderStore } from '@/stores/provider';

const providerStore = useProviderStore();

// Props
interface Props {
  serviceTypes: string[];
}

const props = defineProps<Props>();

// Emits
interface Emits {
  (e: 'service-type-changed', serviceType: string): void;
}

const emit = defineEmits<Emits>();

// Active service type from store
const activeServiceType = computed(() => providerStore.activeServiceType);

// Service type configuration
const serviceTypeConfig: Record<string, { label: string; icon: string }> = {
  ride: { label: 'Ride', icon: '🚗' },
  delivery: { label: 'Delivery', icon: '📦' },
  shopping: { label: 'Shopping', icon: '🛒' },
  moving: { label: 'Moving', icon: '🚚' },
  laundry: { label: 'Laundry', icon: '👕' }
};

// Methods
function getServiceLabel(type: string): string {
  return serviceTypeConfig[type]?.label || type;
}

function getServiceIcon(type: string): string {
  return serviceTypeConfig[type]?.icon || '📋';
}

async function switchServiceType(type: string): Promise<void> {
  if (type === activeServiceType.value) return;

  try {
    // Update store
    await providerStore.setActiveServiceType(type);
    
    // Emit event
    emit('service-type-changed', type);
  } catch (error) {
    console.error('Error switching service type:', error);
  }
}
</script>

<style scoped>
.service-type-switcher {
  @apply mb-4;
}
</style>
