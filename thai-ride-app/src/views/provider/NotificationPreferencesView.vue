<script setup lang="ts">
/**
 * Notification Preferences View
 * Provider can manage notification preferences by category
 * 
 * Role: Provider only
 */
import { ref } from 'vue'
import { useNotificationPreferences, NOTIFICATION_CATEGORIES, type NotificationCategory } from '../../composables/useNotificationPreferences'
import { usePushNotification } from '../../composables/usePushNotification'

const { 
  categoriesWithStatus, 
  enabledCount, 
  loading, 
  error,
  toggleCategory,
  enableAll,
  disableAll
} = useNotificationPreferences()

const {
  isSupported,
  isSubscribed,
  permission,
  requestPermission,
  showLocalNotification
} = usePushNotification()

const testingCategory = ref<NotificationCategory | null>(null)

// Toggle a category
async function handleToggle(category: NotificationCategory) {
  await toggleCategory(category)
}

// Send test notification
async function sendTestNotification(category: NotificationCategory) {
  testingCategory.value = category
  
  const meta = NOTIFICATION_CATEGORIES[category]
  showLocalNotification(`${meta.icon} ทดสอบ: ${meta.label}`, {
    body: meta.description,
    tag: `test-${category}`,
    data: { type: 'test', category }
  })
  
  setTimeout(() => {
    testingCategory.value = null
  }, 2000)
}

// Request permission if not granted
async function handleRequestPermission() {
  await requestPermission()
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 pb-20">
    <!-- Header -->
    <div class="bg-white border-b sticky top-0 z-10">
      <div class="px-4 py-4">
        <h1 class="text-xl font-semibold text-gray-900">การแจ้งเตือน</h1>
        <p class="text-sm text-gray-500 mt-1">จัดการการแจ้งเตือนที่ต้องการรับ</p>
      </div>
    </div>

    <div class="p-4 space-y-4">
      <!-- Permission Status -->
      <div 
        v-if="!isSupported"
        class="bg-yellow-50 border border-yellow-200 rounded-xl p-4"
      >
        <div class="flex items-start gap-3">
          <span class="text-2xl">⚠️</span>
          <div>
            <p class="font-medium text-yellow-800">ไม่รองรับการแจ้งเตือน</p>
            <p class="text-sm text-yellow-700 mt-1">
              เบราว์เซอร์ของคุณไม่รองรับ Push Notification
            </p>
          </div>
        </div>
      </div>

      <div 
        v-else-if="permission === 'denied'"
        class="bg-red-50 border border-red-200 rounded-xl p-4"
      >
        <div class="flex items-start gap-3">
          <span class="text-2xl">🚫</span>
          <div>
            <p class="font-medium text-red-800">การแจ้งเตือนถูกปิดกั้น</p>
            <p class="text-sm text-red-700 mt-1">
              กรุณาเปิดการแจ้งเตือนในการตั้งค่าเบราว์เซอร์
            </p>
          </div>
        </div>
      </div>

      <div 
        v-else-if="permission !== 'granted'"
        class="bg-blue-50 border border-blue-200 rounded-xl p-4"
      >
        <div class="flex items-start gap-3">
          <span class="text-2xl">🔔</span>
          <div class="flex-1">
            <p class="font-medium text-blue-800">เปิดการแจ้งเตือน</p>
            <p class="text-sm text-blue-700 mt-1">
              อนุญาตการแจ้งเตือนเพื่อรับข่าวสารงานใหม่
            </p>
            <button
              class="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              @click="handleRequestPermission"
            >
              อนุญาตการแจ้งเตือน
            </button>
          </div>
        </div>
      </div>

      <div 
        v-else-if="isSubscribed"
        class="bg-green-50 border border-green-200 rounded-xl p-4"
      >
        <div class="flex items-center gap-3">
          <span class="text-2xl">✅</span>
          <div>
            <p class="font-medium text-green-800">การแจ้งเตือนเปิดใช้งานแล้ว</p>
            <p class="text-sm text-green-700">
              เปิดอยู่ {{ enabledCount }} หมวดหมู่
            </p>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div 
        v-if="error"
        class="bg-red-50 border border-red-200 rounded-xl p-4"
      >
        <p class="text-red-700">{{ error }}</p>
      </div>

      <!-- Quick Actions -->
      <div class="flex gap-2">
        <button
          :disabled="loading"
          class="flex-1 px-4 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
          @click="enableAll"
        >
          เปิดทั้งหมด
        </button>
        <button
          :disabled="loading"
          class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          @click="disableAll"
        >
          ปิดทั้งหมด
        </button>
      </div>

      <!-- Categories List -->
      <div class="bg-white rounded-xl border divide-y">
        <div
          v-for="item in categoriesWithStatus"
          :key="item.category"
          class="p-4"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3 flex-1">
              <span class="text-2xl">{{ item.icon }}</span>
              <div class="flex-1">
                <p class="font-medium text-gray-900">{{ item.label }}</p>
                <p class="text-sm text-gray-500">{{ item.description }}</p>
              </div>
            </div>
            
            <div class="flex items-center gap-2">
              <!-- Test Button -->
              <button
                v-if="item.enabled && permission === 'granted'"
                :disabled="testingCategory === item.category"
                class="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
                @click="sendTestNotification(item.category)"
              >
                {{ testingCategory === item.category ? 'ส่งแล้ว' : 'ทดสอบ' }}
              </button>
              
              <!-- Toggle Switch -->
              <button
                :disabled="loading"
                :class="[
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  item.enabled ? 'bg-green-500' : 'bg-gray-300'
                ]"
                @click="handleToggle(item.category)"
              >
                <span
                  :class="[
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    item.enabled ? 'translate-x-6' : 'translate-x-1'
                  ]"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Info -->
      <div class="bg-gray-100 rounded-xl p-4">
        <p class="text-sm text-gray-600">
          💡 <strong>หมายเหตุ:</strong> การปิดหมวดหมู่ "งานใหม่" จะทำให้คุณไม่ได้รับแจ้งเตือนเมื่อมีงานใหม่เข้ามา
        </p>
      </div>
    </div>
  </div>
</template>
