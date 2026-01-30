<template>
  <div class="min-h-screen bg-white">
    <!-- Header -->
    <div class="sticky top-0 z-10 bg-white border-b border-gray-200">
      <div class="flex items-center justify-between px-4 py-3">
        <button
          @click="goBack"
          class="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 class="text-lg font-semibold">ใบเสร็จ</h1>
        <button
          @click="shareReceipt"
          class="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-4">
      <div class="bg-gray-50 rounded-lg p-6 text-center">
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-gray-600 mb-4">{{ error }}</p>
        <button
          @click="goBack"
          class="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          กลับ
        </button>
      </div>
    </div>

    <!-- Receipt Content -->
    <div v-else-if="order" class="p-4 pb-20">
      <!-- Receipt Card -->
      <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <!-- Status Badge -->
        <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">สถานะ</span>
            <span class="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
              {{ getStatusLabel(order.status) }}
            </span>
          </div>
        </div>

        <!-- Order Info -->
        <div class="p-4 space-y-3 border-b border-gray-200">
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">รหัสคำสั่ง</span>
            <span class="text-sm font-medium">{{ order.tracking_id || order.id.slice(0, 8) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">ประเภทบริการ</span>
            <span class="text-sm font-medium">{{ getServiceTypeLabel(order.service_type) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">วันที่</span>
            <span class="text-sm font-medium">{{ formatDate(order.created_at) }}</span>
          </div>
        </div>

        <!-- Route Info (for ride/delivery) -->
        <div v-if="order.pickup_address || order.dropoff_address" class="p-4 space-y-3 border-b border-gray-200">
          <div v-if="order.pickup_address">
            <div class="text-sm text-gray-600 mb-1">จุดรับ</div>
            <div class="text-sm">{{ order.pickup_address }}</div>
          </div>
          <div v-if="order.dropoff_address">
            <div class="text-sm text-gray-600 mb-1">จุดส่ง</div>
            <div class="text-sm">{{ order.dropoff_address }}</div>
          </div>
        </div>

        <!-- Fare Breakdown -->
        <div class="p-4 space-y-3 border-b border-gray-200">
          <div class="text-sm font-medium mb-2">รายละเอียดค่าใช้จ่าย</div>
          
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">ค่าบริการ</span>
            <span>฿{{ formatAmount(order.total_fare || order.fare || 0) }}</span>
          </div>

          <div v-if="order.promo_discount_amount && order.promo_discount_amount > 0" class="flex justify-between text-sm text-green-600">
            <span>ส่วนลด ({{ order.promo_code }})</span>
            <span>-฿{{ formatAmount(order.promo_discount_amount) }}</span>
          </div>

          <div v-if="order.tip_amount && order.tip_amount > 0" class="flex justify-between text-sm">
            <span class="text-gray-600">ทิป</span>
            <span>฿{{ formatAmount(order.tip_amount) }}</span>
          </div>

          <div class="pt-3 border-t border-gray-200 flex justify-between font-semibold">
            <span>ยอดรวม</span>
            <span class="text-lg">฿{{ formatAmount(getTotalAmount()) }}</span>
          </div>
        </div>

        <!-- Payment Method -->
        <div class="p-4 border-b border-gray-200">
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">วิธีชำระเงิน</span>
            <span class="text-sm font-medium">กระเป๋าเงิน</span>
          </div>
        </div>

        <!-- Provider Info (if available) -->
        <div v-if="order.provider_name" class="p-4">
          <div class="text-sm text-gray-600 mb-2">ผู้ให้บริการ</div>
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <div class="text-sm font-medium">{{ order.provider_name }}</div>
              <div v-if="order.vehicle_plate" class="text-xs text-gray-600">{{ order.vehicle_plate }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="mt-6 space-y-3">
        <button
          @click="downloadReceipt"
          class="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>ดาวน์โหลดใบเสร็จ</span>
        </button>

        <button
          v-if="canRebook"
          @click="rebook"
          class="w-full py-3 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors"
        >
          จองอีกครั้ง
        </button>
      </div>

      <!-- Help Text -->
      <div class="mt-6 text-center text-sm text-gray-600">
        <p>หากมีปัญหาเกี่ยวกับใบเสร็จนี้</p>
        <button class="text-black underline mt-1">ติดต่อฝ่ายสนับสนุน</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const loading = ref(true)
const error = ref<string | null>(null)
const order = ref<any>(null)

const orderId = computed(() => route.params.id as string)

const canRebook = computed(() => {
  if (!order.value) return false
  return ['ride', 'delivery', 'queue_booking'].includes(order.value.service_type)
})

onMounted(async () => {
  await fetchOrder()
})

async function fetchOrder() {
  try {
    loading.value = true
    error.value = null

    // Try to fetch from different tables based on service type
    const tables = [
      'ride_requests',
      'delivery_requests',
      'shopping_requests',
      'queue_bookings',
      'moving_requests',
      'laundry_requests'
    ]

    let foundOrder = null

    for (const table of tables) {
      const { data, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .eq('id', orderId.value)
        .maybeSingle()

      if (data && !fetchError) {
        foundOrder = {
          ...data,
          service_type: getServiceTypeFromTable(table)
        }
        break
      }
    }

    if (!foundOrder) {
      error.value = 'ไม่พบข้อมูลใบเสร็จ'
      return
    }

    order.value = foundOrder
  } catch (err) {
    console.error('Error fetching order:', err)
    error.value = 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
  } finally {
    loading.value = false
  }
}

function getServiceTypeFromTable(table: string): string {
  const mapping: Record<string, string> = {
    'ride_requests': 'ride',
    'delivery_requests': 'delivery',
    'shopping_requests': 'shopping',
    'queue_bookings': 'queue_booking',
    'moving_requests': 'moving',
    'laundry_requests': 'laundry'
  }
  return mapping[table] || 'unknown'
}

function getServiceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ride: 'เรียกรถ',
    delivery: 'ส่งของ',
    shopping: 'ช้อปปิ้ง',
    queue_booking: 'จองคิว',
    moving: 'ขนของ',
    laundry: 'ซักรีด'
  }
  return labels[type] || type
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'รอดำเนินการ',
    matched: 'จับคู่แล้ว',
    accepted: 'รับงานแล้ว',
    in_progress: 'กำลังดำเนินการ',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก'
  }
  return labels[status] || status
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatAmount(amount: number): string {
  return Math.round(amount).toLocaleString('th-TH')
}

function getTotalAmount(): number {
  if (!order.value) return 0
  
  let total = order.value.total_fare || order.value.fare || 0
  
  // Subtract discount
  if (order.value.promo_discount_amount) {
    total -= order.value.promo_discount_amount
  }
  
  // Add tip
  if (order.value.tip_amount) {
    total += order.value.tip_amount
  }
  
  return total
}

function goBack() {
  router.back()
}

function shareReceipt() {
  if (navigator.share) {
    navigator.share({
      title: 'ใบเสร็จ',
      text: `ใบเสร็จ ${order.value.tracking_id || order.value.id.slice(0, 8)}`,
      url: window.location.href
    }).catch(() => {
      // User cancelled share
    })
  } else {
    // Fallback: copy link
    navigator.clipboard.writeText(window.location.href)
    toast.success('คัดลอกลิงก์แล้ว')
  }
}

function downloadReceipt() {
  // TODO: Implement PDF generation
  toast.info('ฟีเจอร์นี้กำลังพัฒนา')
}

function rebook() {
  if (!order.value) return

  const serviceType = order.value.service_type
  const routes: Record<string, string> = {
    ride: '/customer/ride',
    delivery: '/customer/delivery',
    queue_booking: '/customer/queue-booking'
  }

  const targetRoute = routes[serviceType]
  if (targetRoute) {
    router.push({
      path: targetRoute,
      query: {
        pickup: order.value.pickup_address,
        dropoff: order.value.dropoff_address
      }
    })
  }
}
</script>
