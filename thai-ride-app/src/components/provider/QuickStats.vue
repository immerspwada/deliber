<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  todayEarnings: number
  todayTrips: number
  weeklyEarnings: number
  monthlyEarnings: number
  rating: number
  completionRate: number
}

const props = withDefaults(defineProps<Props>(), {
  todayEarnings: 0,
  todayTrips: 0,
  weeklyEarnings: 0,
  monthlyEarnings: 0,
  rating: 0,
  completionRate: 0
})

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
  }).format(amount)
}

const getRatingColor = (rating: number): string => {
  if (rating >= 4.5) return 'text-green-600'
  if (rating >= 4.0) return 'text-yellow-600'
  return 'text-red-600'
}

const getCompletionRateColor = (rate: number): string => {
  if (rate >= 95) return 'text-green-600'
  if (rate >= 85) return 'text-yellow-600'
  return 'text-red-600'
}

const earningsGrowth = computed(() => {
  if (props.weeklyEarnings === 0) return 0
  return ((props.todayEarnings * 7 - props.weeklyEarnings) / props.weeklyEarnings) * 100
})
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
      <div class="w-2 h-5 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full mr-3"></div>
      สถิติด่วน
    </h3>
    
    <div class="grid grid-cols-2 gap-4">
      <!-- Weekly Earnings -->
      <div class="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
        <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
          <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <p class="text-xs text-gray-600 mb-1">สัปดาห์นี้</p>
        <p class="text-sm font-bold text-gray-900">{{ formatCurrency(weeklyEarnings) }}</p>
        <p v-if="earningsGrowth !== 0" class="text-xs" :class="earningsGrowth > 0 ? 'text-green-600' : 'text-red-600'">
          {{ earningsGrowth > 0 ? '+' : '' }}{{ earningsGrowth.toFixed(1) }}%
        </p>
      </div>

      <!-- Monthly Earnings -->
      <div class="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
        <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
          <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p class="text-xs text-gray-600 mb-1">เดือนนี้</p>
        <p class="text-sm font-bold text-gray-900">{{ formatCurrency(monthlyEarnings) }}</p>
      </div>

      <!-- Completion Rate -->
      <div class="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-100">
        <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
          <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-xs text-gray-600 mb-1">อัตราสำเร็จ</p>
        <p class="text-sm font-bold" :class="getCompletionRateColor(completionRate)">
          {{ completionRate > 0 ? completionRate.toFixed(1) + '%' : 'ยังไม่มี' }}
        </p>
      </div>

      <!-- Rating Stars -->
      <div class="text-center p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl border border-yellow-100">
        <div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-2">
          <svg class="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
        <p class="text-xs text-gray-600 mb-1">คะแนน</p>
        <div v-if="rating > 0" class="flex items-center justify-center mb-1">
          <svg v-for="i in 5" :key="i" class="w-3 h-3" :class="i <= Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
        <p class="text-xs font-bold" :class="getRatingColor(rating)">
          {{ rating > 0 ? rating.toFixed(2) : 'ยังไม่มี' }}
        </p>
      </div>
    </div>
  </div>
</template>