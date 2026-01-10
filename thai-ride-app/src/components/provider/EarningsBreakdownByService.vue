<template>
  <div class="earnings-breakdown-by-service">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">รายได้แยกตามประเภทบริการ</h3>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="animate-pulse bg-gray-100 rounded-lg h-20" />
    </div>

    <!-- Service Type Earnings -->
    <div v-else-if="earningsByService.length > 0" class="space-y-3">
      <div
        v-for="item in earningsByService"
        :key="item.serviceType"
        class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-2xl">
              {{ getServiceIcon(item.serviceType) }}
            </div>
            <div>
              <h4 class="font-semibold text-gray-900">{{ getServiceLabel(item.serviceType) }}</h4>
              <p class="text-sm text-gray-500">{{ item.tripCount }} เที่ยว</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold text-gray-900">
              ฿{{ formatNumber(item.totalEarnings) }}
            </p>
            <p class="text-sm text-gray-500">
              {{ item.percentage.toFixed(1) }}% ของรายได้ทั้งหมด
            </p>
          </div>
        </div>

        <!-- Detailed Breakdown -->
        <div v-if="item.expanded" class="mt-4 pt-4 border-t border-gray-100 space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">ค่าโดยสารพื้นฐาน</span>
            <span class="font-medium">฿{{ formatNumber(item.breakdown.baseFare) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">ค่าระยะทาง</span>
            <span class="font-medium">฿{{ formatNumber(item.breakdown.distanceFare) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">ค่าเวลา</span>
            <span class="font-medium">฿{{ formatNumber(item.breakdown.timeFare) }}</span>
          </div>
          <div v-if="item.breakdown.surgeFare > 0" class="flex justify-between text-sm">
            <span class="text-gray-600">ค่า Surge</span>
            <span class="font-medium text-orange-600">฿{{ formatNumber(item.breakdown.surgeFare) }}</span>
          </div>
          <div v-if="item.breakdown.tips > 0" class="flex justify-between text-sm">
            <span class="text-gray-600">ทิป</span>
            <span class="font-medium text-green-600">฿{{ formatNumber(item.breakdown.tips) }}</span>
          </div>
          <div class="flex justify-between text-sm pt-2 border-t border-gray-100">
            <span class="text-gray-600">ค่าธรรมเนียมแพลตฟอร์ม</span>
            <span class="font-medium text-red-600">-฿{{ formatNumber(item.breakdown.platformFee) }}</span>
          </div>
        </div>

        <!-- Toggle Button -->
        <button
          @click="toggleExpanded(item.serviceType)"
          class="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {{ item.expanded ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด' }}
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-8">
      <p class="text-gray-500">ยังไม่มีรายได้</p>
    </div>

    <!-- Total Summary -->
    <div v-if="earningsByService.length > 0" class="mt-6 bg-blue-50 rounded-lg p-4">
      <div class="flex justify-between items-center">
        <span class="text-gray-700 font-medium">รายได้รวมทั้งหมด</span>
        <span class="text-2xl font-bold text-blue-600">
          ฿{{ formatNumber(totalEarnings) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { supabase } from '@/lib/supabase';

interface EarningsBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeFare: number;
  tips: number;
  platformFee: number;
}

interface ServiceEarnings {
  serviceType: string;
  totalEarnings: number;
  tripCount: number;
  percentage: number;
  breakdown: EarningsBreakdown;
  expanded: boolean;
}

interface Props {
  providerId: string;
  dateRange?: { start: Date; end: Date };
}

const props = defineProps<Props>();

// State
const earningsByService = ref<ServiceEarnings[]>([]);
const loading = ref(true);

// Service type configuration
const serviceTypeConfig: Record<string, { label: string; icon: string }> = {
  ride: { label: 'Ride', icon: '🚗' },
  delivery: { label: 'Delivery', icon: '📦' },
  shopping: { label: 'Shopping', icon: '🛒' },
  moving: { label: 'Moving', icon: '🚚' },
  laundry: { label: 'Laundry', icon: '👕' }
};

// Computed
const totalEarnings = computed(() => 
  earningsByService.value.reduce((sum, item) => sum + item.totalEarnings, 0)
);

// Methods
function getServiceLabel(type: string): string {
  return serviceTypeConfig[type]?.label || type;
}

function getServiceIcon(type: string): string {
  return serviceTypeConfig[type]?.icon || '📋';
}

function formatNumber(value: number): string {
  return value.toFixed(2);
}

function toggleExpanded(serviceType: string): void {
  const item = earningsByService.value.find(i => i.serviceType === serviceType);
  if (item) {
    item.expanded = !item.expanded;
  }
}

async function loadEarningsByService(): Promise<void> {
  try {
    loading.value = true;

    let query = supabase
      .from('earnings')
      .select('service_type, base_fare, distance_fare, time_fare, surge_amount, tips, platform_fee, net_earnings')
      .eq('provider_id', props.providerId);

    // Apply date range filter if provided
    if (props.dateRange) {
      query = query
        .gte('earned_at', props.dateRange.start.toISOString())
        .lte('earned_at', props.dateRange.end.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    if (!data || data.length === 0) {
      earningsByService.value = [];
      return;
    }

    // Group by service type
    const grouped = data.reduce((acc, earning) => {
      const serviceType = earning.service_type;
      
      if (!acc[serviceType]) {
        acc[serviceType] = {
          serviceType,
          totalEarnings: 0,
          tripCount: 0,
          breakdown: {
            baseFare: 0,
            distanceFare: 0,
            timeFare: 0,
            surgeFare: 0,
            tips: 0,
            platformFee: 0
          },
          expanded: false
        };
      }

      acc[serviceType].totalEarnings += parseFloat(earning.net_earnings);
      acc[serviceType].tripCount += 1;
      acc[serviceType].breakdown.baseFare += parseFloat(earning.base_fare);
      acc[serviceType].breakdown.distanceFare += parseFloat(earning.distance_fare);
      acc[serviceType].breakdown.timeFare += parseFloat(earning.time_fare);
      acc[serviceType].breakdown.surgeFare += parseFloat(earning.surge_amount || '0');
      acc[serviceType].breakdown.tips += parseFloat(earning.tips || '0');
      acc[serviceType].breakdown.platformFee += parseFloat(earning.platform_fee);

      return acc;
    }, {} as Record<string, ServiceEarnings>);

    // Convert to array and calculate percentages
    const total = Object.values(grouped).reduce((sum, item) => sum + item.totalEarnings, 0);
    
    earningsByService.value = Object.values(grouped)
      .map(item => ({
        ...item,
        percentage: total > 0 ? (item.totalEarnings / total) * 100 : 0
      }))
      .sort((a, b) => b.totalEarnings - a.totalEarnings);

  } catch (error) {
    console.error('Error loading earnings by service:', error);
  } finally {
    loading.value = false;
  }
}

// Lifecycle
onMounted(() => {
  loadEarningsByService();
});
</script>

<style scoped>
.earnings-breakdown-by-service {
  @apply max-w-2xl;
}
</style>
