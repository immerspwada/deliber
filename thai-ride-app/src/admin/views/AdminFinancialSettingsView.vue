<template>
  <div class="financial-settings-view">
    <!-- Header -->
    <div class="header">
      <div>
        <h1 class="title">การตั้งค่าทางการเงิน</h1>
        <p class="subtitle">{{ totalCount.toLocaleString() }} รายการตั้งค่า</p>
      </div>
      <button class="btn-icon" @click="() => fetchSettings()" :disabled="loading">
        <svg class="icon" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button class="btn-primary" @click="() => fetchSettings()">ลองใหม่</button>
    </div>

    <!-- Tabs Navigation -->
    <div v-else class="tabs-container">
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="tab"
          :class="{ active: activeTab === tab.id }"
          @click="setActiveTab(tab.id)"
        >
          <svg v-if="tab.icon === 'calculator'" class="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <svg v-else-if="tab.icon === 'percent'" class="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else-if="tab.icon === 'wallet'" class="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <svg v-else-if="tab.icon === 'credit-card'" class="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <svg v-else-if="tab.icon === 'history'" class="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="tab-label">{{ tab.label }}</span>
          <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Pricing Tab -->
        <div v-show="activeTab === 'pricing'" class="tab-panel">
          <div class="panel-header">
            <h2 class="panel-title">ราคาบริการตามระยะทาง</h2>
            <p class="panel-subtitle">กำหนดค่าเริ่มต้นและค่าต่อกิโลเมตรสำหรับแต่ละบริการ</p>
          </div>
          <PricingSettingsCard />
        </div>

        <!-- Commission Tab -->
        <div v-show="activeTab === 'commission'" class="tab-panel">
          <div class="panel-header">
            <h2 class="panel-title">อัตราคอมมิชชั่น</h2>
            <p class="panel-subtitle">กำหนดอัตราคอมมิชชั่นสำหรับแต่ละประเภทบริการ</p>
          </div>
          <CommissionSettingsCard />
        </div>

        <!-- Withdrawal Tab -->
        <div v-show="activeTab === 'withdrawal'" class="tab-panel">
          <div class="panel-header">
            <h2 class="panel-title">การตั้งค่าการถอนเงิน</h2>
            <p class="panel-subtitle">กำหนดเงื่อนไขและค่าธรรมเนียมการถอนเงิน</p>
          </div>
          <WithdrawalSettingsCard />
        </div>

        <!-- Top-up Tab -->
        <div v-show="activeTab === 'topup'" class="tab-panel">
          <div class="panel-header">
            <h2 class="panel-title">การตั้งค่าการเติมเงิน</h2>
            <p class="panel-subtitle">กำหนดเงื่อนไขและวิธีการชำระเงินสำหรับการเติมเงิน</p>
          </div>
          <TopupSettingsCard />
        </div>

        <!-- Audit Log Tab -->
        <div v-show="activeTab === 'audit'" class="tab-panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">ประวัติการเปลี่ยนแปลง</h2>
              <p class="panel-subtitle">บันทึกการแก้ไขการตั้งค่าทางการเงิน</p>
            </div>
            <button class="btn-icon-sm" @click="refreshAuditLog">
              <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          <div v-if="auditLog.length === 0" class="empty">
            <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>ยังไม่มีประวัติการเปลี่ยนแปลง</p>
          </div>

          <div v-else class="audit-table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>ประเภท</th>
                  <th>การเปลี่ยนแปลง</th>
                  <th>เหตุผล</th>
                  <th>ผู้แก้ไข</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in auditLog" :key="log.id" class="row">
                  <td class="date">{{ formatDate(log.created_at) }}</td>
                  <td>
                    <span class="badge">{{ getCategoryLabel(log.category) }}</span>
                  </td>
                  <td>{{ log.key }}</td>
                  <td>{{ log.change_reason || '-' }}</td>
                  <td>{{ log.changed_by_email || 'System' }}</td>
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
import { onMounted, computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFinancialSettings } from '@/admin/composables/useFinancialSettings'
import CommissionSettingsCard from '@/admin/components/CommissionSettingsCard.vue'
import WithdrawalSettingsCard from '@/admin/components/WithdrawalSettingsCard.vue'
import TopupSettingsCard from '@/admin/components/TopupSettingsCard.vue'
import PricingSettingsCard from '@/admin/components/PricingSettingsCard.vue'

const route = useRoute()
const router = useRouter()

const {
  loading,
  error,
  auditLog,
  fetchSettings,
  fetchAuditLog
} = useFinancialSettings()

const totalCount = computed(() => 4) // Commission, Withdrawal, Top-up, Pricing

// Tab management with URL sync
type TabId = 'pricing' | 'commission' | 'withdrawal' | 'topup' | 'audit'
const activeTab = ref<TabId>('pricing')

const tabs = computed(() => [
  { id: 'pricing' as TabId, label: 'ราคาบริการ', icon: 'calculator', count: 6 },
  { id: 'commission' as TabId, label: 'คอมมิชชั่น', icon: 'percent', count: 6 },
  { id: 'withdrawal' as TabId, label: 'การถอนเงิน', icon: 'wallet', count: 1 },
  { id: 'topup' as TabId, label: 'การเติมเงิน', icon: 'credit-card', count: 1 },
  { id: 'audit' as TabId, label: 'ประวัติ', icon: 'history', count: auditLog.value.length }
])

function setActiveTab(tabId: TabId) {
  activeTab.value = tabId
  // Update URL without page reload
  router.push({ 
    name: 'admin-financial-settings',
    params: { tab: tabId }
  })
}

// Initialize tab from URL
function initializeTab() {
  const tabParam = route.params.tab as TabId | undefined
  const validTabs: TabId[] = ['pricing', 'commission', 'withdrawal', 'topup', 'audit']
  
  if (tabParam && validTabs.includes(tabParam)) {
    activeTab.value = tabParam
  } else {
    // No tab or invalid tab - redirect to pricing
    activeTab.value = 'pricing'
    router.replace({ 
      name: 'admin-financial-settings',
      params: { tab: 'pricing' }
    })
  }
}

// Watch for URL changes (back/forward navigation)
watch(() => route.params.tab, (newTab) => {
  if (newTab && typeof newTab === 'string') {
    const validTabs: TabId[] = ['pricing', 'commission', 'withdrawal', 'topup', 'audit']
    if (validTabs.includes(newTab as TabId)) {
      activeTab.value = newTab as TabId
    }
  }
})

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
    pricing: 'ราคาบริการ',
    commission: 'คอมมิชชั่น',
    withdrawal: 'การถอนเงิน',
    topup: 'การเติมเงิน'
  }
  return labels[category] || category
}

onMounted(async () => {
  initializeTab()
  await fetchSettings()
  await fetchAuditLog()
})
</script>

<style scoped>
.financial-settings-view { max-width: 1400px; margin: 0 auto; padding: 2rem; }
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; }
.title { font-size: 1.875rem; font-weight: 600; color: #000; margin: 0; }
.subtitle { font-size: 0.875rem; color: #666; margin: 0.25rem 0 0 0; }

.loading, .error { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; gap: 1rem; }
.spinner { width: 2rem; height: 2rem; border: 2px solid #f5f5f5; border-top-color: #000; border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.error p { color: #dc2626; }

/* Tabs */
.tabs-container { display: flex; flex-direction: column; gap: 0; }
.tabs { display: flex; gap: 0.5rem; border-bottom: 2px solid #e5e5e5; padding-bottom: 0; margin-bottom: 0; overflow-x: auto; }
.tab { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.875rem 1.25rem; background: transparent; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; cursor: pointer; font-size: 0.875rem; font-weight: 500; color: #666; white-space: nowrap; transition: all 0.2s; }
.tab:hover { color: #000; background: #fafafa; }
.tab.active { color: #000; border-bottom-color: #000; }
.tab-icon { width: 1.125rem; height: 1.125rem; }
.tab-label { font-weight: 500; }
.tab-count { display: inline-flex; align-items: center; justify-content: center; min-width: 1.25rem; height: 1.25rem; padding: 0 0.375rem; background: #f5f5f5; border-radius: 10px; font-size: 0.75rem; font-weight: 600; }
.tab.active .tab-count { background: #000; color: #fff; }

/* Tab Content */
.tab-content { background: #fff; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px; }
.tab-panel { padding: 2rem; }
.panel-header { margin-bottom: 2rem; display: flex; align-items: flex-start; justify-content: space-between; }
.panel-title { font-size: 1.25rem; font-weight: 600; color: #000; margin: 0 0 0.5rem 0; }
.panel-subtitle { font-size: 0.875rem; color: #666; margin: 0; }

.btn-icon, .btn-icon-sm { display: inline-flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #e5e5e5; border-radius: 6px; cursor: pointer; }
.btn-icon { width: 40px; height: 40px; }
.btn-icon-sm { width: 32px; height: 32px; }
.btn-icon:hover, .btn-icon-sm:hover { background: #fafafa; }
.btn-icon:disabled { opacity: 0.5; cursor: not-allowed; }
.icon { width: 1.25rem; height: 1.25rem; }
.icon-sm { width: 1rem; height: 1rem; }

.btn-primary { height: 40px; padding: 0 1.5rem; border-radius: 6px; font-size: 0.875rem; font-weight: 500; cursor: pointer; background: #000; color: #fff; border: 1px solid #000; }
.btn-primary:hover { background: #333; }

/* Audit Table */
.audit-table-wrapper { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; }
.table thead { background: #fafafa; }
.table th { padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #666; text-transform: uppercase; }
.table tbody .row { border-bottom: 1px solid #f5f5f5; }
.table tbody .row:hover { background: #fafafa; }
.table td { padding: 1rem; font-size: 0.875rem; }
.table td.date { font-size: 0.75rem; color: #666; }

.badge { padding: 0.25rem 0.625rem; background: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 0.75rem; }

.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; gap: 1rem; color: #9ca3af; }
.empty-icon { width: 3rem; height: 3rem; opacity: 0.5; }

.animate-spin { animation: spin 1s linear infinite; }
</style>
