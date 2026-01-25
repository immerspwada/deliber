<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-6 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl font-semibold text-gray-900 mb-2">ตั้งค่าทางการเงิน</h1>
        <p class="text-sm text-gray-500">จัดการอัตราคอมมิชชั่น การถอนเงิน และการเติมเงิน</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="bg-white rounded-lg shadow-sm p-8">
        <div class="animate-pulse space-y-4">
          <div class="h-4 bg-gray-200 rounded w-1/4"></div>
          <div class="h-4 bg-gray-200 rounded w-1/2"></div>
          <div class="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>

      <!-- Error State -->
      <SettingsErrorState
        v-else-if="error"
        title="ไม่สามารถโหลดการตั้งค่าทางการเงินได้"
        :message="error"
        show-support
        @retry="fetchSettings"
      />

      <!-- Content -->
      <div v-else class="space-y-6">
        <!-- Commission Settings Card -->
        <div class="bg-white rounded-xl shadow-md overflow-hidden border-l-4 border-blue-500 hover:shadow-lg transition-shadow duration-200">
          <SettingsCardHeader
            title="อัตราคอมมิชชั่น"
            description="กำหนดอัตราคอมมิชชั่นสำหรับแต่ละประเภทบริการ"
            color="blue"
          >
            <template #icon>
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </template>
          </SettingsCardHeader>
          <CommissionSettingsCard />
        </div>

        <!-- Withdrawal Settings Card -->
        <div class="bg-white rounded-xl shadow-md overflow-hidden border-l-4 border-green-500 hover:shadow-lg transition-shadow duration-200">
          <SettingsCardHeader
            title="การตั้งค่าการถอนเงิน"
            description="กำหนดเงื่อนไขและค่าธรรมเนียมการถอนเงิน"
            color="green"
          >
            <template #icon>
              <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </template>
          </SettingsCardHeader>
          <WithdrawalSettingsCard />
        </div>

        <!-- Top-up Settings Card -->
        <div class="bg-white rounded-xl shadow-md overflow-hidden border-l-4 border-purple-500 hover:shadow-lg transition-shadow duration-200">
          <SettingsCardHeader
            title="การตั้งค่าการเติมเงิน"
            description="กำหนดเงื่อนไขและวิธีการชำระเงินสำหรับการเติมเงิน"
            color="purple"
          >
            <template #icon>
              <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </template>
          </SettingsCardHeader>
          <TopupSettingsCard />
        </div>

        <!-- Audit Log Card -->
        <div class="bg-white rounded-xl shadow-md overflow-hidden border-l-4 border-gray-500 hover:shadow-lg transition-shadow duration-200">
          <SettingsCardHeader
            title="ประวัติการเปลี่ยนแปลง"
            description="บันทึกการแก้ไขการตั้งค่าทางการเงิน"
            color="gray"
          >
            <template #icon>
              <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </template>
            <template #actions>
              <button
                type="button"
                class="min-h-[44px] px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors inline-flex items-center gap-2"
                @click="refreshAuditLog"
                aria-label="รีเฟรชประวัติการเปลี่ยนแปลง"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>รีเฟรช</span>
              </button>
            </template>
          </SettingsCardHeader>

          <!-- Audit Log Empty State -->
          <div v-if="auditLog.length === 0" class="p-12 text-center">
            <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 class="text-base font-medium text-gray-900 mb-2">
              ยังไม่มีประวัติการเปลี่ยนแปลง
            </h3>
            <p class="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
              เมื่อมีการแก้ไขการตั้งค่าทางการเงิน ระบบจะบันทึกประวัติไว้ที่นี่
              เพื่อความโปร่งใสและตรวจสอบได้
            </p>
          </div>

          <!-- Audit Log Table -->
          <div v-else class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-gray-200">
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ประเภท
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    การเปลี่ยนแปลง
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    เหตุผล
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ผู้แก้ไข
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr v-for="log in auditLog" :key="log.id" class="group transition-all duration-200 hover:bg-gray-50 hover:shadow-sm">
                  <td class="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                    {{ formatDate(log.created_at) }}
                  </td>
                  <td class="px-6 py-4 text-sm">
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      :class="getCategoryBadgeClass(log.category)"
                    >
                      {{ getCategoryLabel(log.category) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-900">
                    {{ log.key }}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-600 max-w-md">
                    {{ log.change_reason || '-' }}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-600">
                    {{ log.changed_by_email || 'System' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useFinancialSettings } from '@/admin/composables/useFinancialSettings'
import CommissionSettingsCard from '@/admin/components/CommissionSettingsCard.vue'
import WithdrawalSettingsCard from '@/admin/components/WithdrawalSettingsCard.vue'
import TopupSettingsCard from '@/admin/components/TopupSettingsCard.vue'
import SettingsErrorState from '@/admin/components/settings/SettingsErrorState.vue'
import SettingsCardHeader from '@/admin/components/settings/SettingsCardHeader.vue'

const {
  loading,
  error,
  auditLog,
  fetchSettings,
  fetchAuditLog
} = useFinancialSettings()

async function refreshAuditLog() {
  await fetchAuditLog()
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    commission: 'คอมมิชชั่น',
    withdrawal: 'การถอนเงิน',
    topup: 'การเติมเงิน'
  }
  return labels[category] || category
}

function getCategoryBadgeClass(category: string): string {
  const classes: Record<string, string> = {
    commission: 'bg-blue-50 text-blue-700 border border-blue-200',
    withdrawal: 'bg-green-50 text-green-700 border border-green-200',
    topup: 'bg-purple-50 text-purple-700 border border-purple-200'
  }
  return classes[category] || 'bg-gray-50 text-gray-700 border border-gray-200'
}

onMounted(async () => {
  await fetchSettings()
  await fetchAuditLog()
})
</script>

<style scoped>
/* Custom styles if needed */
</style>
