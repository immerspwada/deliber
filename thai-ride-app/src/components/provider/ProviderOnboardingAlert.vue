<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fade-in">
      <!-- Icon -->
      <div class="flex justify-center mb-4">
        <div :class="iconClass" class="w-16 h-16 rounded-full flex items-center justify-center">
          <svg v-if="status === 'pending'" class="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else-if="status === 'rejected'" class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <svg v-else-if="status === 'suspended'" class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <svg v-else class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <!-- Title -->
      <h3 class="text-xl font-bold text-gray-900 text-center mb-2">
        {{ title }}
      </h3>

      <!-- Message -->
      <p class="text-gray-600 text-center mb-6">
        {{ message }}
      </p>

      <!-- Action Button -->
      <button
        @click="handleAction"
        class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
      >
        {{ actionText }}
      </button>

      <!-- Secondary Action -->
      <button
        v-if="showSecondaryAction"
        @click="handleSecondaryAction"
        class="w-full mt-3 text-gray-600 hover:text-gray-800 font-medium py-2 transition-colors"
      >
        {{ secondaryActionText }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

interface Props {
  show: boolean
  status: string | null
  isVerified: boolean
  reason?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const router = useRouter()

const iconClass = computed(() => {
  if (props.status === 'pending') return 'bg-orange-100'
  if (props.status === 'rejected' || props.status === 'suspended') return 'bg-red-100'
  return 'bg-blue-100'
})

const title = computed(() => {
  if (!props.isVerified) return 'กรุณายืนยันตัวตน'
  if (props.status === 'pending') return 'รอการอนุมัติ'
  if (props.status === 'rejected') return 'บัญชีถูกปฏิเสธ'
  if (props.status === 'suspended') return 'บัญชีถูกระงับ'
  return 'ดำเนินการให้เสร็จสิ้น'
})

const message = computed(() => {
  return props.reason || 'กรุณาดำเนินการให้เสร็จสิ้นก่อนใช้งาน'
})

const actionText = computed(() => {
  if (!props.isVerified) return 'อัพโหลดเอกสาร'
  if (props.status === 'pending') return 'ดูสถานะ'
  if (props.status === 'rejected' || props.status === 'suspended') return 'ติดต่อแอดมิน'
  return 'ดำเนินการต่อ'
})

const showSecondaryAction = computed(() => {
  return props.status === 'rejected' || props.status === 'suspended'
})

const secondaryActionText = 'กลับไปหน้าหลัก'

const handleAction = () => {
  if (!props.isVerified || props.status === 'pending') {
    router.push('/provider/onboarding')
  } else if (props.status === 'rejected' || props.status === 'suspended') {
    router.push('/customer/help')
  } else {
    router.push('/provider/onboarding')
  }
  emit('close')
}

const handleSecondaryAction = () => {
  router.push('/customer')
  emit('close')
}
</script>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}
</style>
