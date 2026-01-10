<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProviderStore } from '../../stores/provider'
import { supabase } from '../../lib/supabase'

const route = useRoute()
const router = useRouter()
const providerStore = useProviderStore()

const jobId = route.params.id as string
const loading = ref(true)
const error = ref<string | null>(null)
const job = ref<any>(null)
const isCompleting = ref(false)

const currentJob = computed(() => providerStore.currentJob)

onMounted(async () => {
  await loadJobDetails()
})

async function loadJobDetails(): Promise<void> {
  loading.value = true
  error.value = null

  try {
    // First get the job data
    const { data: jobData, error: jobError } = await supabase
      .from('jobs_v2')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError) throw jobError

    // Then get customer data separately
    if (jobData.customer_id) {
      const { data: customerData, error: customerError } = await supabase
        .from('users')
        .select('id, email, name, phone')
        .eq('id', jobData.customer_id)
        .maybeSingle()

      // If users table doesn't exist or doesn't have the data, try auth.users
      if (customerError || !customerData) {
        // Get from auth.users via RPC or create mock data
        jobData.users = {
          name: 'ลูกค้า',
          phone: '0800000000'
        }
      } else {
        jobData.users = {
          name: customerData.name || customerData.email?.split('@')[0] || 'ลูกค้า',
          phone: customerData.phone || '0800000000'
        }
      }
    } else {
      // Mock customer data if no customer_id
      jobData.users = {
        name: 'ลูกค้า',
        phone: '0800000000'
      }
    }

    job.value = jobData
  } catch (err: any) {
    console.error('Error loading job details:', err)
    error.value = 'ไม่สามารถโหลดรายละเอียดงานได้'
  } finally {
    loading.value = false
  }
}

async function updateJobStatus(newStatus: string): Promise<void> {
  if (!job.value) return

  try {
    const updateData: any = { 
      status: newStatus,
      updated_at: new Date().toISOString()
    }

    // Add timestamp for specific status
    if (newStatus === 'accepted') {
      updateData.accepted_at = new Date().toISOString()
    } else if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('jobs_v2')
      .update(updateData)
      .eq('id', jobId)

    if (error) throw error

    job.value.status = newStatus
    
    // Update store
    await providerStore.loadCurrentJob()
  } catch (err: any) {
    console.error('Error updating job status:', err)
    alert('ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่')
  }
}

async function completeJob(): Promise<void> {
  if (!job.value) return

  isCompleting.value = true

  try {
    // Complete job directly without using store
    const { data: completedJob, error: completeError } = await supabase
      .from('jobs_v2')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        final_earnings: job.value.estimated_earnings
      })
      .eq('id', jobId)
      .select()
      .single()

    if (completeError) throw completeError

    // Create earnings record
    const grossEarnings = parseFloat(job.value.estimated_earnings || 0)
    const platformFee = grossEarnings * 0.2
    const netEarnings = grossEarnings - platformFee

    const { error: earningsError } = await supabase
      .from('earnings_v2')
      .insert({
        provider_id: job.value.provider_id,
        job_id: jobId,
        gross_earnings: grossEarnings,
        platform_fee: platformFee,
        net_earnings: netEarnings,
        earning_type: 'job_completion',
        service_type: job.value.service_type || 'ride'
      })

    if (earningsError) throw earningsError

    // Update provider stats
    const { data: provider } = await supabase
      .from('providers_v2')
      .select('total_trips, total_earnings')
      .eq('id', job.value.provider_id)
      .single()

    if (provider) {
      await supabase
        .from('providers_v2')
        .update({
          total_trips: (provider.total_trips || 0) + 1,
          total_earnings: parseFloat(provider.total_earnings || '0') + netEarnings
        })
        .eq('id', job.value.provider_id)
    }

    // Update local job status
    job.value.status = 'completed'
    job.value.final_earnings = grossEarnings

    // Show success message
    alert(`✅ งานเสร็จสิ้น! รายได้: ฿${netEarnings.toFixed(2)}`)
    
    // Navigate back to dashboard after a short delay
    setTimeout(() => {
      router.push('/provider')
    }, 2000)

  } catch (err: any) {
    console.error('Error completing job:', err)
    alert(err.userMessage || err.message || 'ไม่สามารถจบงานได้ กรุณาลองใหม่')
  } finally {
    isCompleting.value = false
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
  }).format(amount)
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'รอการรับงาน',
    accepted: 'รับงานแล้ว',
    arrived: 'ถึงจุดรับแล้ว',
    in_progress: 'กำลังดำเนินการ',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก'
  }
  return labels[status] || status
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'text-yellow-600 bg-yellow-100',
    accepted: 'text-blue-600 bg-blue-100',
    arrived: 'text-purple-600 bg-purple-100',
    in_progress: 'text-orange-600 bg-orange-100',
    completed: 'text-green-600 bg-green-100',
    cancelled: 'text-red-600 bg-red-100'
  }
  return colors[status] || 'text-gray-600 bg-gray-100'
}

function getNextAction(status: string): { label: string; action: string } | null {
  const actions: Record<string, { label: string; action: string }> = {
    accepted: { label: 'ถึงจุดรับแล้ว', action: 'arrived' },
    arrived: { label: 'เริ่มงาน', action: 'in_progress' },
    in_progress: { label: 'จบงาน', action: 'completed' }
  }
  return actions[status] || null
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button
              @click="router.back()"
              class="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">รายละเอียดงาน</h1>
              <p class="text-sm text-gray-600">งาน #{{ jobId.slice(-8) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p class="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="bg-red-50 border border-red-200 rounded-lg p-6">
        <p class="text-red-600">{{ error }}</p>
        <button
          @click="loadJobDetails"
          class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          ลองใหม่
        </button>
      </div>
    </div>

    <!-- Job Details -->
    <div v-else-if="job" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Status and Earnings -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <span 
            class="px-3 py-1 text-sm font-medium rounded-full"
            :class="getStatusColor(job.status)"
          >
            {{ getStatusLabel(job.status) }}
          </span>
          <span class="text-2xl font-bold text-green-600">
            {{ formatCurrency(job.estimated_earnings || 0) }}
          </span>
        </div>

        <!-- Customer Info -->
        <div v-if="job.users" class="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 class="text-sm font-medium text-gray-900 mb-2">ข้อมูลลูกค้า</h3>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-900">{{ job.users.name || 'ไม่ระบุชื่อ' }}</p>
              <p class="text-sm text-gray-600">{{ job.users.phone || 'ไม่ระบุเบอร์' }}</p>
            </div>
            <a
              v-if="job.users.phone"
              :href="`tel:${job.users.phone}`"
              class="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              โทร
            </a>
          </div>
        </div>

        <!-- Locations -->
        <div class="space-y-3">
          <div class="flex items-start">
            <svg class="w-5 h-5 text-green-600 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                clip-rule="evenodd"
              />
            </svg>
            <div>
              <p class="text-sm font-medium text-gray-900">จุดรับ</p>
              <p class="text-sm text-gray-600">{{ job.pickup_address }}</p>
            </div>
          </div>
          
          <div v-if="job.dropoff_address" class="flex items-start">
            <svg class="w-5 h-5 text-red-600 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                clip-rule="evenodd"
              />
            </svg>
            <div>
              <p class="text-sm font-medium text-gray-900">จุดส่ง</p>
              <p class="text-sm text-gray-600">{{ job.dropoff_address }}</p>
            </div>
          </div>
        </div>

        <!-- Special Instructions -->
        <div v-if="job.special_instructions" class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 class="text-sm font-medium text-yellow-800 mb-1">คำแนะนำพิเศษ</h4>
          <p class="text-sm text-yellow-700">{{ job.special_instructions }}</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div v-if="job.status !== 'completed' && job.status !== 'cancelled'" class="space-y-4">
        <!-- Next Action Button -->
        <button
          v-if="getNextAction(job.status) && getNextAction(job.status)?.action !== 'completed'"
          @click="updateJobStatus(getNextAction(job.status)!.action)"
          class="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          :disabled="loading"
        >
          {{ getNextAction(job.status)?.label }}
        </button>

        <!-- Complete Job Button -->
        <button
          v-if="job.status === 'in_progress'"
          @click="completeJob"
          class="w-full py-3 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
          :disabled="isCompleting"
        >
          <span v-if="isCompleting">กำลังจบงาน...</span>
          <span v-else>จบงาน</span>
        </button>

        <!-- Cancel Job Button (only if accepted) -->
        <button
          v-if="job.status === 'accepted'"
          @click="updateJobStatus('cancelled')"
          class="w-full py-3 px-4 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
          :disabled="loading"
        >
          ยกเลิกงาน
        </button>
      </div>

      <!-- Completed Job Info -->
      <div v-if="job.status === 'completed'" class="bg-green-50 border border-green-200 rounded-lg p-6">
        <div class="flex items-center">
          <svg class="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <h3 class="text-lg font-medium text-green-800">งานเสร็จสิ้น</h3>
            <p class="text-green-700">คุณได้รับเงิน {{ formatCurrency(job.final_earnings || job.estimated_earnings || 0) }}</p>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="mt-8 flex justify-center">
        <button
          @click="router.push('/provider/dashboard')"
          class="px-6 py-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          กลับไปแดชบอร์ด
        </button>
      </div>
    </div>
  </div>
</template>