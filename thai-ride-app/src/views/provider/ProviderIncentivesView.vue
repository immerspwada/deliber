<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <!-- Header -->
    <div class="bg-primary text-white p-4 pt-12">
      <h1 class="text-xl font-bold">โปรแกรมโบนัส</h1>
      <p class="text-sm opacity-80">ทำภารกิจรับโบนัสเพิ่ม</p>
    </div>

    <!-- Active Incentives -->
    <div class="p-4 space-y-3">
      <div v-if="loading" class="text-center py-8 text-gray-500">กำลังโหลด...</div>
      <div v-else-if="incentives.length === 0" class="text-center py-8 text-gray-500">ไม่มีโปรแกรมโบนัสในขณะนี้</div>
      
      <div v-else v-for="item in incentives" :key="item.incentive_id" 
        class="bg-white rounded-2xl p-4 shadow-sm">
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="font-semibold text-gray-900">{{ item.name_th || item.name }}</h3>
            <p class="text-xs text-gray-500">หมดเขต {{ formatDate(item.valid_until) }}</p>
          </div>
          <span v-if="item.is_completed" class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
            สำเร็จ!
          </span>
        </div>
        
        <!-- Progress Bar -->
        <div class="mb-2">
          <div class="flex justify-between text-sm mb-1">
            <span class="text-gray-600">{{ item.current_progress }}/{{ item.target_value }}</span>
            <span class="text-primary font-medium">฿{{ item.reward_amount }}</span>
          </div>
          <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div class="h-full bg-primary rounded-full transition-all"
              :style="{ width: Math.min(100, (item.current_progress / item.target_value) * 100) + '%' }"></div>
          </div>
        </div>
        
        <p class="text-xs text-gray-500">{{ getTargetLabel(item.target_type) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const incentives = ref<any[]>([])
const loading = ref(false)

const fetchIncentives = async () => {
  loading.value = true
  try {
    const { data: provider } = await supabase.from('service_providers').select('id').eq('user_id', authStore.user?.id).single()
    if (provider) {
      const { data } = await supabase.rpc('get_provider_active_incentives', { p_provider_id: provider.id })
      if (data) incentives.value = data
    }
  } catch (err) { console.error(err) }
  finally { loading.value = false }
}

const formatDate = (d: string) => new Date(d).toLocaleDateString('th-TH')
const getTargetLabel = (t: string) => ({ trips: 'จำนวนเที่ยว', hours: 'ชั่วโมงออนไลน์', rating: 'คะแนนเฉลี่ย', acceptance: 'อัตราการรับงาน' }[t] || t)

onMounted(fetchIncentives)
</script>
