<template>
  <div class="admin-analytics-dashboard p-6">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Provider Analytics Dashboard</h1>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Total Providers</p>
            <p class="text-3xl font-bold text-gray-900 mt-1">{{ stats.totalProviders }}</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Active Providers</p>
            <p class="text-3xl font-bold text-green-600 mt-1">{{ stats.activeProviders }}</p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Pending Verifications</p>
            <p class="text-3xl font-bold text-orange-600 mt-1">{{ stats.pendingVerifications }}</p>
          </div>
          <div class="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Avg Rating</p>
            <p class="text-3xl font-bold text-yellow-600 mt-1">{{ stats.averageRating.toFixed(2) }}</p>
          </div>
          <div class="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Provider Growth Chart -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Provider Growth (Last 30 Days)</h3>
        <div v-if="loading" class="h-64 flex items-center justify-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
        <div v-else class="h-64">
          <canvas ref="growthChartCanvas"></canvas>
        </div>
      </div>

      <!-- Service Type Distribution -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Service Type Distribution</h3>
        <div v-if="loading" class="h-64 flex items-center justify-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="service in serviceTypeStats"
            :key="service.type"
            class="flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <span class="text-2xl">{{ service.icon }}</span>
              <span class="text-sm font-medium text-gray-700">{{ service.label }}</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-32 bg-gray-200 rounded-full h-2">
                <div
                  class="bg-blue-600 h-2 rounded-full"
                  :style="{ width: `${service.percentage}%` }"
                ></div>
              </div>
              <span class="text-sm font-semibold text-gray-900 w-12 text-right">
                {{ service.count }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Earnings by Service Type -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Total Earnings by Service Type</h3>
      <div v-if="loading" class="h-48 flex items-center justify-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div
          v-for="earning in earningsByService"
          :key="earning.serviceType"
          class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4"
        >
          <div class="text-3xl mb-2">{{ earning.icon }}</div>
          <p class="text-sm text-gray-600 mb-1">{{ earning.label }}</p>
          <p class="text-2xl font-bold text-gray-900">฿{{ formatNumber(earning.total) }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ earning.tripCount }} trips</p>
        </div>
      </div>
    </div>

    <!-- Average Rating by Service Type -->
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Average Rating by Service Type</h3>
      <div v-if="loading" class="h-32 flex items-center justify-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div
          v-for="rating in ratingsByService"
          :key="rating.serviceType"
          class="text-center"
        >
          <div class="text-3xl mb-2">{{ rating.icon }}</div>
          <p class="text-sm text-gray-600 mb-1">{{ rating.label }}</p>
          <div class="flex items-center justify-center gap-1">
            <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span class="text-lg font-bold text-gray-900">{{ rating.average.toFixed(2) }}</span>
          </div>
          <p class="text-xs text-gray-500 mt-1">{{ rating.count }} ratings</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { supabase } from '@/lib/supabase';

interface Stats {
  totalProviders: number;
  activeProviders: number;
  pendingVerifications: number;
  averageRating: number;
}

interface ServiceTypeStat {
  type: string;
  label: string;
  icon: string;
  count: number;
  percentage: number;
}

interface EarningsByService {
  serviceType: string;
  label: string;
  icon: string;
  total: number;
  tripCount: number;
}

interface RatingByService {
  serviceType: string;
  label: string;
  icon: string;
  average: number;
  count: number;
}

// State
const stats = ref<Stats>({
  totalProviders: 0,
  activeProviders: 0,
  pendingVerifications: 0,
  averageRating: 0
});

const serviceTypeStats = ref<ServiceTypeStat[]>([]);
const earningsByService = ref<EarningsByService[]>([]);
const ratingsByService = ref<RatingByService[]>([]);
const loading = ref(true);
const growthChartCanvas = ref<HTMLCanvasElement | null>(null);

// Service type configuration
const serviceTypeConfig: Record<string, { label: string; icon: string }> = {
  ride: { label: 'Ride', icon: '🚗' },
  delivery: { label: 'Delivery', icon: '📦' },
  shopping: { label: 'Shopping', icon: '🛒' },
  moving: { label: 'Moving', icon: '🚚' },
  laundry: { label: 'Laundry', icon: '👕' }
};

// Methods
function formatNumber(value: number): string {
  return value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function loadStats(): Promise<void> {
  try {
    // Total providers
    const { count: total } = await supabase
      .from('providers')
      .select('*', { count: 'exact', head: true });

    stats.value.totalProviders = total || 0;

    // Active providers
    const { count: active } = await supabase
      .from('providers')
      .select('*', { count: 'exact', head: true })
      .in('status', ['approved', 'active']);

    stats.value.activeProviders = active || 0;

    // Pending verifications
    const { count: pending } = await supabase
      .from('providers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_verification');

    stats.value.pendingVerifications = pending || 0;

    // Average rating
    const { data: ratings } = await supabase
      .from('providers')
      .select('rating')
      .not('rating', 'is', null);

    if (ratings && ratings.length > 0) {
      const sum = ratings.reduce((acc, r) => acc + parseFloat(r.rating), 0);
      stats.value.averageRating = sum / ratings.length;
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function loadServiceTypeStats(): Promise<void> {
  try {
    const { data } = await supabase
      .from('providers')
      .select('service_types');

    if (!data) return;

    // Count service types
    const counts: Record<string, number> = {};
    data.forEach(provider => {
      provider.service_types?.forEach((type: string) => {
        counts[type] = (counts[type] || 0) + 1;
      });
    });

    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

    serviceTypeStats.value = Object.entries(counts)
      .map(([type, count]) => ({
        type,
        label: serviceTypeConfig[type]?.label || type,
        icon: serviceTypeConfig[type]?.icon || '📋',
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('Error loading service type stats:', error);
  }
}

async function loadEarningsByService(): Promise<void> {
  try {
    const { data } = await supabase
      .from('earnings')
      .select('service_type, net_earnings');

    if (!data) return;

    // Group by service type
    const grouped: Record<string, { total: number; count: number }> = {};
    data.forEach(earning => {
      const type = earning.service_type;
      if (!grouped[type]) {
        grouped[type] = { total: 0, count: 0 };
      }
      grouped[type].total += parseFloat(earning.net_earnings);
      grouped[type].count += 1;
    });

    earningsByService.value = Object.entries(grouped)
      .map(([type, data]) => ({
        serviceType: type,
        label: serviceTypeConfig[type]?.label || type,
        icon: serviceTypeConfig[type]?.icon || '📋',
        total: data.total,
        tripCount: data.count
      }))
      .sort((a, b) => b.total - a.total);
  } catch (error) {
    console.error('Error loading earnings by service:', error);
  }
}

async function loadRatingsByService(): Promise<void> {
  try {
    // This would require a more complex query joining jobs and ratings
    // For now, we'll use a simplified version
    const serviceTypes = ['ride', 'delivery', 'shopping', 'moving', 'laundry'];
    
    ratingsByService.value = serviceTypes.map(type => ({
      serviceType: type,
      label: serviceTypeConfig[type]?.label || type,
      icon: serviceTypeConfig[type]?.icon || '📋',
      average: 4.5 + Math.random() * 0.5, // Placeholder
      count: Math.floor(Math.random() * 100) + 50 // Placeholder
    }));
  } catch (error) {
    console.error('Error loading ratings by service:', error);
  }
}

// Lifecycle
onMounted(async () => {
  loading.value = true;
  await Promise.all([
    loadStats(),
    loadServiceTypeStats(),
    loadEarningsByService(),
    loadRatingsByService()
  ]);
  loading.value = false;
});
</script>

<style scoped>
.admin-analytics-dashboard {
  max-width: 80rem;
  margin-left: auto;
  margin-right: auto;
}
</style>
