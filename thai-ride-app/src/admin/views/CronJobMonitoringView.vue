<script setup lang="ts">
/**
 * Component: CronJobMonitoringView
 * Admin dashboard สำหรับติดตาม cron jobs
 * 
 * Features:
 * - แสดงรายการ cron jobs พร้อมสถานะ
 * - สถิติการทำงาน (active, failed, succeeded)
 * - รันงานด้วยตนเอง
 * - ดูประวัติการทำงาน
 */

import { ref, onMounted } from 'vue'
import { useCronJobMonitoring, type CronJob } from '../../composables/useCronJobMonitoring'
import { useToast } from '../../composables/useToast'
import CronJobHistoryTable from '../../admin/components/CronJobHistoryTable.vue'

const {
  jobs,
  selectedJob,
  stats,
  loading,
  error,
  loadJobs,
  loadJobHistory,
  runJobManually,
  refreshStats
} = useCronJobMonitoring()

const { showSuccess, showError, showWarning } = useToast()
const showHistoryModal = ref(false)
const runningJobName = ref<string | null>(null)

// Format date
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Get status badge class
function getStatusClass(status: string | null): string {
  if (!status) return 'bg-gray-100 text-gray-600'
  switch (status) {
    case 'succeeded':
      return 'bg-green-100 text-green-700'
    case 'failed':
      return 'bg-red-100 text-red-700'
    case 'running':
      return 'bg-blue-100 text-blue-700'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

// Get status label
function getStatusLabel(status: string | null): string {
  if (!status) return 'ไม่มีข้อมูล'
  switch (status) {
    case 'succeeded':
      return 'สำเร็จ'
    case 'failed':
      return 'ล้มเหลว'
    case 'running':
      return 'กำลังทำงาน'
    default:
      return status
  }
}

// Handle manual run
async function handleRunJob(job: CronJob): Promise<void> {
  if (runningJobName.value) {
    showWarning('กรุณารอให้งานก่อนหน้าเสร็จก่อน')
    return
  }

  runningJobName.value = job.jobname
  
  try {
    const result = await runJobManually(job.jobname)
    
    if (result.success) {
      showSuccess(`รันงาน ${job.jobname} สำเร็จ`)
    } else {
      showError(result.message)
    }
  } catch (err) {
    showError('ไม่สามารถรันงานได้')
  } finally {
    runningJobName.value = null
  }
}

// View job history
function viewHistory(job: CronJob): void {
  selectedJob.value = job
  showHistoryModal.value = true
  loadJobHistory(job.jobid)
}

onMounted(() => {
  loadJobs()
  
  // Auto-refresh every 30 seconds
  const interval = setInterval(() => {
    refreshStats()
  }, 30000)
  
  // Cleanup
  return () => clearInterval(interval)
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">⏰ Cron Job Monitoring</h1>
        <p class="text-gray-600 mt-1">ติดตามสถานะและประวัติการทำงานของ scheduled tasks</p>
      </div>
      <button
        type="button"
        :disabled="loading"
        class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 
               disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        aria-label="รีเฟรชข้อมูล"
        @click="loadJobs"
      >
        <svg class="w-5 h-5" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        รีเฟรช
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-sm text-gray-500">งานทั้งหมด</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats.total_jobs }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-sm text-gray-500">งานที่ใช้งาน</p>
            <p class="text-2xl font-bold text-green-600">{{ stats.active_jobs }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <div>
            <p class="text-sm text-gray-500">สำเร็จ (24ชม.)</p>
            <p class="text-2xl font-bold text-emerald-600">{{ stats.succeeded_last_24h }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </div>
          <div>
            <p class="text-sm text-gray-500">ล้มเหลว (24ชม.)</p>
            <p class="text-2xl font-bold text-red-600">{{ stats.failed_last_24h }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p class="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <p class="text-red-600">{{ error }}</p>
      <button
        type="button"
        class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        @click="loadJobs"
      >
        ลองใหม่
      </button>
    </div>

    <!-- Jobs List -->
    <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="p-4 border-b border-gray-200">
        <h2 class="font-semibold text-gray-900">รายการ Cron Jobs</h2>
      </div>

      <div v-if="jobs.length === 0" class="p-12 text-center text-gray-500">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="mt-4">ไม่พบ cron jobs</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่องาน</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">กำหนดการ</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รันล่าสุด</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถิติ 24ชม.</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">การกระทำ</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="job in jobs" :key="job.jobid" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div>
                    <div class="text-sm font-medium text-gray-900">{{ job.jobname }}</div>
                    <div class="text-xs text-gray-500">ID: {{ job.jobid }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <code class="text-xs bg-gray-100 px-2 py-1 rounded">{{ job.schedule }}</code>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(job.last_run_time) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="['px-2 py-1 text-xs font-medium rounded-full', getStatusClass(job.last_status)]"
                >
                  {{ getStatusLabel(job.last_status) }}
                </span>
                <span
                  v-if="!job.active"
                  class="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600"
                >
                  ปิดใช้งาน
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <div class="flex items-center gap-3">
                  <span class="text-green-600">✓ {{ job.success_count_24h }}</span>
                  <span class="text-red-600">✗ {{ job.failed_count_24h }}</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="text-blue-600 hover:text-blue-900"
                    aria-label="ดูประวัติ"
                    @click="viewHistory(job)"
                  >
                    ประวัติ
                  </button>
                  <button
                    type="button"
                    :disabled="!job.active || runningJobName === job.jobname"
                    class="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700
                           disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="รันงาน"
                    @click="handleRunJob(job)"
                  >
                    {{ runningJobName === job.jobname ? 'กำลังรัน...' : 'รันเลย' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- History Modal -->
    <div
      v-if="showHistoryModal && selectedJob"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="showHistoryModal = false"
    >
      <div class="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div class="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold text-gray-900">ประวัติการทำงาน</h2>
            <p class="text-sm text-gray-500">{{ selectedJob.jobname }}</p>
          </div>
          <button
            type="button"
            class="p-2 hover:bg-gray-100 rounded-lg"
            aria-label="ปิด"
            @click="showHistoryModal = false"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-auto p-6">
          <CronJobHistoryTable />
        </div>

        <div class="p-6 border-t border-gray-200">
          <button
            type="button"
            class="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
            @click="showHistoryModal = false"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
