<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

interface Withdrawal {
  id: string
  withdrawal_uid: string
  user_name: string
  user_email: string
  amount: number
  bank_name: string
  bank_account_number: string
  bank_account_name: string
  status: string
  created_at: string
}

const withdrawals = ref<Withdrawal[]>([])
const loading = ref(false)
const activeFilter = ref<string | null>(null)

const stats = computed(() => {
  const result = { pending: 0, completed: 0, cancelled: 0, total: 0, totalAmount: 0 }
  withdrawals.value.forEach(w => {
    result.total++
    result.totalAmount += w.amount
    if (w.status === 'pending') result.pending++
    else if (w.status === 'completed') result.completed++
    else if (w.status === 'cancelled') result.cancelled++
  })
  return result
})

const filteredWithdrawals = computed(() => {
  let result = withdrawals.value
  if (activeFilter.value) {
    result = result.filter(w => w.status === activeFilter.value)
  }
  return result.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
})

async function load(): Promise<void> {
  loading.value = true
  try {
    const { data, error } = await supabase.rpc('admin_get_customer_withdrawals', {
      p_status: null,
      p_limit: 100,
      p_offset: 0
    })
    if (error) throw error
    withdrawals.value = data || []
  } catch (e) {
    console.error('Load failed:', e)
    alert('ไม่สามารถโหลดข้อมูลได้')
  } finally {
    loading.value = false
  }
}

onMounted(() => load())

</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">คำขอถอนเงิน</h1>
        <p class="text-sm text-gray-600 mt-1">{{ stats.total }} รายการ</p>
      </div>
      <button @click="load" :disabled="loading" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        รีเฟรช
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-white p-4 rounded-xl shadow-sm">
        <div class="text-sm text-gray-500">ยอดรวม</div>
        <div class="text-2xl font-bold text-blue-600">฿{{ stats.totalAmount.toLocaleString() }}</div>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm">
        <div class="text-sm text-gray-500">รอดำเนินการ</div>
        <div class="text-2xl font-bold text-yellow-600">{{ stats.pending }}</div>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm">
        <div class="text-sm text-gray-500">สำเร็จ</div>
        <div class="text-2xl font-bold text-green-600">{{ stats.completed }}</div>
      </div>
      <div class="bg-white p-4 rounded-xl shadow-sm">
        <div class="text-sm text-gray-500">ยกเลิก</div>
        <div class="text-2xl font-bold text-gray-600">{{ stats.cancelled }}</div>
      </div>
    </div>

    <!-- Filter -->
    <div class="mb-4">
      <select v-model="activeFilter" class="px-4 py-2 border rounded-lg">
        <option :value="null">ทุกสถานะ</option>
        <option value="pending">รอดำเนินการ</option>
        <option value="completed">สำเร็จ</option>
        <option value="cancelled">ยกเลิก</option>
      </select>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ลูกค้า</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">จำนวนเงิน</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">บัญชีธนาคาร</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr v-if="loading">
            <td colspan="5" class="px-6 py-12 text-center text-gray-500">กำลังโหลด...</td>
          </tr>
          <tr v-else-if="filteredWithdrawals.length === 0">
            <td colspan="5" class="px-6 py-12 text-center text-gray-500">ไม่พบข้อมูล</td>
          </tr>
          <tr v-else v-for="w in filteredWithdrawals" :key="w.id" class="hover:bg-gray-50">
            <td class="px-6 py-4">
              <div class="font-medium">{{ w.user_name || w.user_email }}</div>
              <div class="text-sm text-gray-500">{{ w.withdrawal_uid }}</div>
            </td>
            <td class="px-6 py-4 font-semibold">฿{{ w.amount.toLocaleString() }}</td>
            <td class="px-6 py-4">
              <div class="text-sm">{{ w.bank_name }}</div>
              <div class="text-xs text-gray-500">{{ w.bank_account_number }}</div>
              <div class="text-xs text-gray-500">{{ w.bank_account_name }}</div>
            </td>
            <td class="px-6 py-4">
              <span :class="{
                'bg-yellow-100 text-yellow-800': w.status === 'pending',
                'bg-green-100 text-green-800': w.status === 'completed',
                'bg-gray-100 text-gray-800': w.status === 'cancelled'
              }" class="px-3 py-1 rounded-full text-xs font-medium">
                {{ w.status === 'pending' ? 'รอดำเนินการ' : w.status === 'completed' ? 'สำเร็จ' : 'ยกเลิก' }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">
              {{ new Date(w.created_at).toLocaleString('th-TH') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
