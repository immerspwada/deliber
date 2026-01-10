<template>
  <div class="performance-metrics-card bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>

    <div class="space-y-4">
      <!-- Rating -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span class="text-sm font-medium text-gray-700">Rating</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-2xl font-bold text-gray-900">{{ metrics.rating.toFixed(2) }}</span>
          <span
            v-if="metrics.rating < 4.0"
            class="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded"
          >
            ⚠️ Low
          </span>
        </div>
      </div>

      <!-- Acceptance Rate -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700">Acceptance Rate</span>
          <span class="text-lg font-bold text-gray-900">{{ metrics.acceptanceRate.toFixed(1) }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div
            :class="[
              'h-2 rounded-full transition-all',
              metrics.acceptanceRate >= 80 ? 'bg-green-500' :
              metrics.acceptanceRate >= 60 ? 'bg-yellow-500' :
              'bg-red-500'
            ]"
            :style="{ width: `${metrics.acceptanceRate}%` }"
          ></div>
        </div>
        <p v-if="metrics.acceptanceRate < 80" class="mt-1 text-xs text-gray-500">
          Target: 80% or higher
        </p>
      </div>

      <!-- Completion Rate -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700">Completion Rate</span>
          <span class="text-lg font-bold text-gray-900">{{ metrics.completionRate.toFixed(1) }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div
            :class="[
              'h-2 rounded-full transition-all',
              metrics.completionRate >= 95 ? 'bg-green-500' :
              metrics.completionRate >= 85 ? 'bg-yellow-500' :
              'bg-red-500'
            ]"
            :style="{ width: `${metrics.completionRate}%` }"
          ></div>
        </div>
        <p v-if="metrics.completionRate < 95" class="mt-1 text-xs text-gray-500">
          Target: 95% or higher
        </p>
      </div>

      <!-- Cancellation Rate -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700">Cancellation Rate</span>
          <span class="text-lg font-bold text-gray-900">{{ metrics.cancellationRate.toFixed(1) }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div
            :class="[
              'h-2 rounded-full transition-all',
              metrics.cancellationRate <= 5 ? 'bg-green-500' :
              metrics.cancellationRate <= 10 ? 'bg-yellow-500' :
              'bg-red-500'
            ]"
            :style="{ width: `${metrics.cancellationRate}%` }"
          ></div>
        </div>
        <p v-if="metrics.cancellationRate > 5" class="mt-1 text-xs text-gray-500">
          Target: 5% or lower
        </p>
      </div>
    </div>

    <!-- Warning Messages -->
    <div v-if="hasWarnings" class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div class="flex items-start gap-2">
        <svg class="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <div class="flex-1">
          <h4 class="text-sm font-semibold text-yellow-800 mb-1">Performance Warnings</h4>
          <ul class="text-sm text-yellow-700 space-y-1">
            <li v-if="metrics.rating < 4.0">• Rating below 4.0 - Risk of account suspension</li>
            <li v-if="metrics.acceptanceRate < 80">• Acceptance rate below 80% - May affect job priority</li>
            <li v-if="metrics.completionRate < 95">• Completion rate below 95% - Improve reliability</li>
            <li v-if="metrics.cancellationRate > 5">• Cancellation rate above 5% - Reduce cancellations</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Tips Section -->
    <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 class="text-sm font-semibold text-blue-800 mb-2">💡 Tips to Improve</h4>
      <ul class="text-sm text-blue-700 space-y-1">
        <li>• Accept jobs promptly to improve acceptance rate</li>
        <li>• Complete all accepted jobs to maintain high completion rate</li>
        <li>• Provide excellent service for better ratings</li>
        <li>• Only accept jobs you can complete to reduce cancellations</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface PerformanceMetrics {
  rating: number;
  acceptanceRate: number;
  completionRate: number;
  cancellationRate: number;
}

interface Props {
  metrics: PerformanceMetrics;
}

const props = defineProps<Props>();

// Computed
const hasWarnings = computed(() => {
  return (
    props.metrics.rating < 4.0 ||
    props.metrics.acceptanceRate < 80 ||
    props.metrics.completionRate < 95 ||
    props.metrics.cancellationRate > 5
  );
});
</script>

<style scoped>
.performance-metrics-card {
  @apply max-w-md;
}
</style>
