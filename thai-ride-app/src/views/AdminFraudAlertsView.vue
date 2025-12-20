<template>
  <AdminLayout>
    <div class="p-4 space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-gray-900">Fraud Alerts</h1>
        <button @click="runChecks" :disabled="checking" class="px-4 py-2 bg-red-500 text-white rounded-xl text-sm">
          {{ checking ? 'กำลังตรวจสอบ...' : 'ตรวจสอบใหม่' }}
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-red-50 rounded-2xl p-4 text-center">
          <p class="text-2xl font-bold text-red-600">{{ stats.pending }}</p>
          <p class="text-xs text-red-600">รอตรวจสอบ</p>
        </div>
        <div class="bg-yellow-50 rounded-2xl p-4 text-center">
          <p class="text-2xl font-bold text-yellow-600">{{ stats.reviewing }}</p>
          <p class="text-xs text-yellow-600">กำลังตรวจสอบ</p>
        </div>
        <div class="bg-green-50 rounded-2xl p-4 text-center">
          <p class="text-2xl font-bold text-green-600">{{ stats.resolved }}</p>
          <p class="text-xs text-green-600">แก้ไขแล้ว</p>
        </div>
      </div>

      <!-- Alerts List -->
      <div class="bg-white rounded-2xl divide-y divide-gray-100">
        <div v-if="loading" class="p-8 text-center text-gray-500">กำลังโหลด...</div>
        <div v-else-if="alerts.length === 0" class="p-8 text-center text-gray-500">ไม่พบการแจ้งเตือน</div>
        <div v-else v-for="alert in alerts" :key="alert.id" class="p-4">
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span :class="getSeverityClass(alert.severity)" class="px-2 py-0.5 rounded-full text-xs font-medium">
                  {{ alert.severity }}
                </span>
                <span class="text-sm font-medium text-gray-900">{{ formatAlertType(alert.alert_type) }}</span>
              </div>
              <p class="text-sm text-gray-600 mt-1">{{ alert.description }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ formatDate(alert.created_at) }}</p>
            </div>
            <button v-if="alert.status === 'pending'" @click="resolveAlert(alert.id)"
              class="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs">แก้ไขแล้ว</button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>


<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { supabase } from '../lib/supabase'
import { useAdminCleanup } from '../composables/useAdminCleanup'

const { addCleanup } = useAdminCleanup()

interface FraudAlert {
  id: string
  user_id: string | null
  provider_id: string | null
  alert_type: string
  severity: string
  description: string
  status: string
  created_at: string
}

const alerts = ref<FraudAlert[]>([])
const loading = ref(false)
const checking = ref(false)
const stats = reactive({ pending: 0, reviewing: 0, resolved: 0 })

const fetchAlerts = async () => {
  loading.value = true
  try {
    const { data, error } = await supabase.from('fraud_alerts').select('*').order('created_at', { ascending: false }).limit(50)
    if (!error && data) {
      alerts.value = data
      stats.pending = data.filter((a: any) => a.status === 'pending').length
      stats.reviewing = data.filter((a: any) => a.status === 'reviewing').length
      stats.resolved = data.filter((a: any) => a.status === 'resolved').length
    }
  } catch (err) { console.error(err) }
  finally { loading.value = false }
}

const runChecks = async () => {
  checking.value = true
  try {
    await supabase.rpc('check_suspicious_wallet_activity')
    await supabase.rpc('check_suspicious_cancellations')
    await fetchAlerts()
  } catch (err) { console.error(err) }
  finally { checking.value = false }
}

const resolveAlert = async (id: string) => {
  await (supabase.from('fraud_alerts') as any).update({ status: 'resolved', reviewed_at: new Date().toISOString() }).eq('id', id)
  await fetchAlerts()
}

const getSeverityClass = (s: string) => ({ high: 'bg-red-100 text-red-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-blue-100 text-blue-700' }[s] || 'bg-gray-100')
const formatAlertType = (t: string) => ({ suspicious_topup: 'เติมเงินผิดปกติ', high_cancellation_rate: 'ยกเลิกบ่อย' }[t] || t)
const formatDate = (d: string) => new Date(d).toLocaleString('th-TH')

onMounted(fetchAlerts)

// Cleanup on unmount
addCleanup(() => {
  alerts.value = []
  stats.pending = 0
  stats.reviewing = 0
  stats.resolved = 0
  console.log('[AdminFraudAlertsView] Cleanup complete')
})
</script>
