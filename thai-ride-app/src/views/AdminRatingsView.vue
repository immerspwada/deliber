<script setup lang="ts">
/**
 * Feature: F26 - Delivery/Shopping Ratings (Admin)
 * Tables: ride_ratings, delivery_ratings, shopping_ratings
 * Migration: 008_service_ratings.sql
 */
import { ref, onMounted, computed } from 'vue'
import { useAdmin } from '../composables/useAdmin'

const { 
  loading,
  fetchRideRatings, 
  fetchDeliveryRatings, 
  fetchShoppingRatings,
  fetchRatingsStats,
  deleteRating
} = useAdmin()

const activeTab = ref<'all' | 'ride' | 'delivery' | 'shopping'>('all')
const rideRatings = ref<any[]>([])
const deliveryRatings = ref<any[]>([])
const shoppingRatings = ref<any[]>([])
const stats = ref<any>(null)
const filterRating = ref<number | null>(null)

const allRatings = computed(() => {
  const all = [
    ...rideRatings.value.map(r => ({ ...r, type: 'ride' })),
    ...deliveryRatings.value.map(r => ({ ...r, type: 'delivery' })),
    ...shoppingRatings.value.map(r => ({ ...r, type: 'shopping' }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  
  if (filterRating.value) {
    return all.filter(r => r.rating >= filterRating.value!)
  }
  return all
})

const displayedRatings = computed(() => {
  switch (activeTab.value) {
    case 'ride': return rideRatings.value
    case 'delivery': return deliveryRatings.value
    case 'shopping': return shoppingRatings.value
    default: return allRatings.value
  }
})

const loadData = async () => {
  const [ride, delivery, shopping, statsData] = await Promise.all([
    fetchRideRatings(1, 50),
    fetchDeliveryRatings(1, 50),
    fetchShoppingRatings(1, 50),
    fetchRatingsStats()
  ])
  rideRatings.value = ride.data
  deliveryRatings.value = delivery.data
  shoppingRatings.value = shopping.data
  stats.value = statsData
}

const handleDelete = async (type: 'ride' | 'delivery' | 'shopping', id: string) => {
  if (!confirm('ต้องการลบรีวิวนี้?')) return
  const success = await deleteRating(type, id)
  if (success) {
    await loadData()
  }
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'ride': return 'เรียกรถ'
    case 'delivery': return 'ส่งของ'
    case 'shopping': return 'ซื้อของ'
    default: return type
  }
}

const getTypeBadgeClass = (type: string) => {
  switch (type) {
    case 'ride': return 'bg-black text-white'
    case 'delivery': return 'bg-gray-600 text-white'
    case 'shopping': return 'bg-gray-400 text-black'
    default: return 'bg-gray-200'
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(loadData)
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">จัดการรีวิว</h1>
        <p class="text-gray-500 text-sm">F26 - ดูและจัดการรีวิวทุกบริการ</p>
      </div>
    </div>

    <!-- Stats Cards -->
    <div v-if="stats" class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl p-4 border border-gray-100">
        <div class="text-sm text-gray-500">รีวิวทั้งหมด</div>
        <div class="text-2xl font-bold">{{ stats.total?.count || 0 }}</div>
      </div>
      <div class="bg-white rounded-xl p-4 border border-gray-100">
        <div class="text-sm text-gray-500">เรียกรถ</div>
        <div class="text-2xl font-bold">{{ stats.ride?.count || 0 }}</div>
        <div class="text-sm text-gray-400">เฉลี่ย {{ stats.ride?.avg || 0 }}</div>
      </div>
      <div class="bg-white rounded-xl p-4 border border-gray-100">
        <div class="text-sm text-gray-500">ส่งของ</div>
        <div class="text-2xl font-bold">{{ stats.delivery?.count || 0 }}</div>
        <div class="text-sm text-gray-400">เฉลี่ย {{ stats.delivery?.avg || 0 }}</div>
      </div>
      <div class="bg-white rounded-xl p-4 border border-gray-100">
        <div class="text-sm text-gray-500">ซื้อของ</div>
        <div class="text-2xl font-bold">{{ stats.shopping?.count || 0 }}</div>
        <div class="text-sm text-gray-400">เฉลี่ย {{ stats.shopping?.avg || 0 }}</div>
      </div>
    </div>

    <!-- Tabs & Filter -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex gap-2">
        <button
          v-for="tab in [
            { key: 'all', label: 'ทั้งหมด' },
            { key: 'ride', label: 'เรียกรถ' },
            { key: 'delivery', label: 'ส่งของ' },
            { key: 'shopping', label: 'ซื้อของ' }
          ]"
          :key="tab.key"
          @click="activeTab = tab.key as any"
          :class="[
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            activeTab === tab.key ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          ]"
        >
          {{ tab.label }}
        </button>
      </div>
      
      <select
        v-model="filterRating"
        class="px-3 py-2 border border-gray-200 rounded-lg text-sm"
      >
        <option :value="null">ทุกคะแนน</option>
        <option :value="5">5 ดาว</option>
        <option :value="4">4+ ดาว</option>
        <option :value="3">3+ ดาว</option>
        <option :value="2">2+ ดาว</option>
        <option :value="1">1+ ดาว</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full mx-auto"></div>
      <p class="text-gray-500 mt-2">กำลังโหลด...</p>
    </div>

    <!-- Ratings List -->
    <div v-else class="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="text-left px-4 py-3 text-sm font-medium text-gray-500">ประเภท</th>
            <th class="text-left px-4 py-3 text-sm font-medium text-gray-500">ผู้ให้คะแนน</th>
            <th class="text-left px-4 py-3 text-sm font-medium text-gray-500">ผู้ให้บริการ</th>
            <th class="text-left px-4 py-3 text-sm font-medium text-gray-500">คะแนน</th>
            <th class="text-left px-4 py-3 text-sm font-medium text-gray-500">ความคิดเห็น</th>
            <th class="text-left px-4 py-3 text-sm font-medium text-gray-500">ทิป</th>
            <th class="text-left px-4 py-3 text-sm font-medium text-gray-500">วันที่</th>
            <th class="text-right px-4 py-3 text-sm font-medium text-gray-500">จัดการ</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="rating in displayedRatings" :key="rating.id" class="hover:bg-gray-50">
            <td class="px-4 py-3">
              <span :class="['px-2 py-1 rounded text-xs font-medium', getTypeBadgeClass(rating.type)]">
                {{ getTypeLabel(rating.type) }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="font-medium">{{ rating.user?.name || '-' }}</div>
            </td>
            <td class="px-4 py-3">
              <div class="font-medium">{{ rating.provider?.users?.name || '-' }}</div>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-1">
                <svg v-for="i in 5" :key="i" class="w-4 h-4" :class="i <= rating.rating ? 'text-yellow-400' : 'text-gray-200'" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                <span class="ml-1 text-sm text-gray-500">{{ rating.rating }}</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <div class="max-w-xs truncate text-sm text-gray-600">
                {{ rating.comment || '-' }}
              </div>
              <div v-if="rating.tags?.length" class="flex gap-1 mt-1">
                <span v-for="tag in rating.tags.slice(0, 2)" :key="tag" class="px-1.5 py-0.5 bg-gray-100 rounded text-xs">
                  {{ tag }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3">
              <span v-if="rating.tip_amount > 0" class="text-green-600 font-medium">
                ฿{{ rating.tip_amount }}
              </span>
              <span v-else class="text-gray-400">-</span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">
              {{ formatDate(rating.created_at) }}
            </td>
            <td class="px-4 py-3 text-right">
              <button
                @click="handleDelete(rating.type, rating.id)"
                class="text-red-500 hover:text-red-700 text-sm"
              >
                ลบ
              </button>
            </td>
          </tr>
          <tr v-if="displayedRatings.length === 0">
            <td colspan="8" class="px-4 py-12 text-center text-gray-500">
              ไม่พบรีวิว
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
