<template>
  <div class="financial-settings-view">
    <!-- Header -->
    <div class="header mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">ตั้งค่าทางการเงิน</h1>
          <p class="text-sm text-gray-600 mt-1">
            จัดการอัตราคอมมิชชั่น การถอนเงิน และการเติมเงิน
          </p>
        </div>
        <button
          @click="showAuditLog = true"
          class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          ดูประวัติการเปลี่ยนแปลง
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div class="flex items-center gap-2 text-red-800">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <span class="font-medium">{{ error }}</span>
      </div>
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Tabs -->
      <div class="tabs border-b border-gray-200 mb-6">
        <nav class="flex gap-4">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'px-4 py-3 font-medium text-sm border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            ]"
          >
            <div class="flex items-center gap-2">
              <component :is="tab.icon" class="w-5 h-5" />
              <span>{{ tab.label }}</span>
            </div>
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="content">
        <CommissionSettingsCard v-if="activeTab === 'commission'" />
        <WithdrawalSettingsCard v-else-if="activeTab === 'withdrawal'" />
        <TopupSettingsCard v-else-if="activeTab === 'topup'" />
      </div>
    </div>

    <!-- Audit Log Modal -->
    <SettingsAuditLogModal v-model="showAuditLog" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import { useFinancialSettings } from '@/admin/composables/useFinancialSettings'
import CommissionSettingsCard from '@/admin/components/CommissionSettingsCard.vue'
import WithdrawalSettingsCard from '@/admin/components/WithdrawalSettingsCard.vue'
import TopupSettingsCard from '@/admin/components/TopupSettingsCard.vue'
import SettingsAuditLogModal from '@/admin/components/SettingsAuditLogModal.vue'

// Icons as functional components
const PercentIcon = () => h('svg', { class: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' })
])

const WithdrawIcon = () => h('svg', { class: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' })
])

const TopupIcon = () => h('svg', { class: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
])

const tabs = [
  { id: 'commission', label: 'คอมมิชชั่น', icon: PercentIcon },
  { id: 'withdrawal', label: 'การถอนเงิน', icon: WithdrawIcon },
  { id: 'topup', label: 'การเติมเงิน', icon: TopupIcon }
]

const activeTab = ref<'commission' | 'withdrawal' | 'topup'>('commission')
const showAuditLog = ref(false)

const { loading, error, fetchSettings } = useFinancialSettings()

onMounted(async () => {
  await fetchSettings()
})
</script>

<style scoped>
.financial-settings-view {
  @apply max-w-7xl mx-auto px-4 py-6;
}
</style>
