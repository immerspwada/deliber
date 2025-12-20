<template>
  <AdminLayout>
    <div class="p-4 space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-gray-900">จัดการโปรแกรมโบนัส</h1>
        <button @click="showCreateModal = true" class="px-4 py-2 bg-primary text-white rounded-xl text-sm">
          + สร้างโปรแกรม
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-green-50 rounded-2xl p-4 text-center">
          <p class="text-2xl font-bold text-green-600">{{ activeCount }}</p>
          <p class="text-xs text-green-600">โปรแกรมที่ใช้งาน</p>
        </div>
        <div class="bg-blue-50 rounded-2xl p-4 text-center">
          <p class="text-2xl font-bold text-blue-600">{{ totalParticipants }}</p>
          <p class="text-xs text-blue-600">ผู้เข้าร่วม</p>
        </div>
        <div class="bg-purple-50 rounded-2xl p-4 text-center">
          <p class="text-2xl font-bold text-purple-600">฿{{ totalPaid }}</p>
          <p class="text-xs text-purple-600">จ่ายโบนัสแล้ว</p>
        </div>
      </div>

      <!-- Incentives List -->
      <div class="bg-white rounded-2xl divide-y divide-gray-100">
        <div v-for="item in incentives" :key="item.id" class="p-4">
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span :class="item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'" 
                  class="px-2 py-0.5 rounded-full text-xs">{{ item.is_active ? 'ใช้งาน' : 'ปิด' }}</span>
                <h3 class="font-medium text-gray-900">{{ item.name_th || item.name }}</h3>
              </div>
              <p class="text-sm text-gray-500 mt-1">{{ item.target_type }}: {{ item.target_value }} → ฿{{ item.reward_amount }}</p>
              <p class="text-xs text-gray-400">{{ formatDate(item.valid_from) }} - {{ formatDate(item.valid_until) }}</p>
            </div>
            <button @click="toggleActive(item)" class="px-3 py-1 border rounded-lg text-xs">
              {{ item.is_active ? 'ปิด' : 'เปิด' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { supabase } from '../lib/supabase'
import { useAdminCleanup } from '../composables/useAdminCleanup'

const { addCleanup } = useAdminCleanup()

const incentives = ref<any[]>([])
const showCreateModal = ref(false)

const activeCount = computed(() => incentives.value.filter(i => i.is_active).length)
const totalParticipants = computed(() => incentives.value.reduce((s, i) => s + (i.current_participants || 0), 0))
const totalPaid = computed(() => 0) // Would calculate from paid rewards

const fetchIncentives = async () => {
  const { data } = await supabase.from('provider_incentives').select('*').order('created_at', { ascending: false })
  if (data) incentives.value = data
}

const toggleActive = async (item: any) => {
  await (supabase.from('provider_incentives') as any).update({ is_active: !item.is_active }).eq('id', item.id)
  await fetchIncentives()
}

const formatDate = (d: string) => new Date(d).toLocaleDateString('th-TH')

onMounted(fetchIncentives)

// Cleanup on unmount
addCleanup(() => {
  incentives.value = []
  showCreateModal.value = false
  console.log('[AdminIncentivesView] Cleanup complete')
})
</script>
