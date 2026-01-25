<script setup lang="ts">
/**
 * หน้าสมัครเป็นผู้ให้บริการ - สำหรับลูกค้าที่ต้องการอัพเกรด
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRoleSwitch, type UpgradeData } from '../composables/useRoleSwitch'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const { loading, error, providers, upgradeToProvider, checkProviderStatus, getUnregisteredTypes } = useRoleSwitch()

const step = ref(1)
const selectedType = ref<string>('')
const formData = ref({
  vehicle_type: '',
  vehicle_plate: '',
  vehicle_color: '',
  license_number: ''
})

const providerTypes = [
  { value: 'driver', label: 'คนขับรถ', icon: 'car', desc: 'รับส่งผู้โดยสาร' },
  { value: 'rider', label: 'ไรเดอร์', icon: 'bike', desc: 'ส่งอาหาร/พัสดุ' },
  { value: 'delivery', label: 'ส่งของ', icon: 'package', desc: 'บริการส่งของ' },
  { value: 'shopping', label: 'ช้อปปิ้ง', icon: 'cart', desc: 'ซื้อของให้' },
  { value: 'moving', label: 'ขนย้าย', icon: 'truck', desc: 'บริการขนย้าย' },
  { value: 'laundry', label: 'ซักผ้า', icon: 'wash', desc: 'บริการซักผ้า' }
]

const unregisteredTypes = ref<string[]>([])

onMounted(async () => {
  await checkProviderStatus()
  unregisteredTypes.value = getUnregisteredTypes()
})

const selectType = (type: string) => {
  selectedType.value = type
  step.value = 2
}

const needsVehicle = (type: string) => {
  return ['driver', 'rider', 'delivery', 'moving'].includes(type)
}

const handleSubmit = async () => {
  const data: UpgradeData = {
    provider_type: selectedType.value as any,
    ...(needsVehicle(selectedType.value) && {
      vehicle_type: formData.value.vehicle_type,
      vehicle_plate: formData.value.vehicle_plate,
      vehicle_color: formData.value.vehicle_color,
      license_number: formData.value.license_number
    })
  }

  const result = await upgradeToProvider(data)
  
  if (result?.success) {
    step.value = 3
  }
}

const goToProviderDocs = () => {
  router.push('/provider/documents')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b sticky top-0 z-10">
      <div class="flex items-center px-4 py-3">
        <button class="p-2 -ml-2" @click="router.back()">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 class="text-lg font-semibold ml-2">สมัครเป็นผู้ให้บริการ</h1>
      </div>
    </div>

    <div class="p-4">
      <!-- Step 1: Select Provider Type -->
      <div v-if="step === 1">
        <div class="bg-white rounded-2xl p-6 mb-4">
          <div class="text-center mb-6">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-gray-900">เริ่มหารายได้กับเรา</h2>
            <p class="text-gray-500 mt-2">เลือกประเภทบริการที่คุณต้องการให้</p>
          </div>

          <!-- Already registered types -->
          <div v-if="providers.length > 0" class="mb-6">
            <p class="text-sm text-gray-500 mb-2">บริการที่สมัครแล้ว:</p>
            <div class="flex flex-wrap gap-2">
              <span 
                v-for="p in providers" 
                :key="p.id"
                class="px-3 py-1 rounded-full text-sm"
                :class="p.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
              >
                {{ providerTypes.find(t => t.value === p.type)?.label || p.type }}
                <span v-if="p.status === 'pending'">(รออนุมัติ)</span>
              </span>
            </div>
          </div>

          <!-- Available types to register -->
          <div class="space-y-3">
            <button
              v-for="type in providerTypes.filter(t => unregisteredTypes.includes(t.value))"
              :key="type.value"
              class="w-full flex items-center p-4 bg-gray-50 rounded-xl hover:bg-green-50 transition-colors border-2 border-transparent hover:border-green-500"
              @click="selectType(type.value)"
            >
              <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <svg v-if="type.icon === 'car'" class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h8m-8 5h8m-4-9a9 9 0 110 18 9 9 0 010-18z"/>
                </svg>
                <svg v-else-if="type.icon === 'bike'" class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                <svg v-else class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
              </div>
              <div class="ml-4 flex-1 text-left">
                <p class="font-semibold text-gray-900">{{ type.label }}</p>
                <p class="text-sm text-gray-500">{{ type.desc }}</p>
              </div>
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          <div v-if="unregisteredTypes.length === 0" class="text-center py-8">
            <p class="text-gray-500">คุณสมัครครบทุกประเภทแล้ว</p>
          </div>
        </div>
      </div>

      <!-- Step 2: Fill Details -->
      <div v-else-if="step === 2">
        <div class="bg-white rounded-2xl p-6">
          <h2 class="text-lg font-semibold mb-4">
            กรอกข้อมูล{{ providerTypes.find(t => t.value === selectedType)?.label }}
          </h2>

          <form class="space-y-4" @submit.prevent="handleSubmit">
            <!-- Vehicle info for driver/rider -->
            <template v-if="needsVehicle(selectedType)">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">ประเภทยานพาหนะ</label>
                <select 
                  v-model="formData.vehicle_type"
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                  required
                >
                  <option value="">เลือกประเภท</option>
                  <option value="car">รถยนต์</option>
                  <option value="motorcycle">รถจักรยานยนต์</option>
                  <option value="van">รถตู้</option>
                  <option value="truck">รถกระบะ</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">ทะเบียนรถ</label>
                <input 
                  v-model="formData.vehicle_plate"
                  type="text"
                  placeholder="เช่น กข 1234"
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">สีรถ</label>
                <input 
                  v-model="formData.vehicle_color"
                  type="text"
                  placeholder="เช่น ขาว, ดำ, เงิน"
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">เลขใบขับขี่</label>
                <input 
                  v-model="formData.license_number"
                  type="text"
                  placeholder="เลขใบอนุญาตขับขี่"
                  class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                  required
                />
              </div>
            </template>

            <!-- Error message -->
            <div v-if="error" class="p-3 bg-red-50 text-red-600 rounded-xl text-sm">
              {{ error }}
            </div>

            <!-- Buttons -->
            <div class="flex gap-3 pt-4">
              <button 
                type="button"
                class="flex-1 py-3 border-2 border-gray-200 rounded-xl font-semibold"
                @click="step = 1"
              >
                ย้อนกลับ
              </button>
              <button 
                type="submit"
                :disabled="loading"
                class="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold disabled:opacity-50"
              >
                {{ loading ? 'กำลังส่ง...' : 'สมัคร' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Step 3: Success -->
      <div v-else-if="step === 3">
        <div class="bg-white rounded-2xl p-6 text-center">
          <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 class="text-xl font-bold text-gray-900 mb-2">สมัครสำเร็จ!</h2>
          <p class="text-gray-500 mb-6">
            กรุณาอัพโหลดเอกสารเพื่อรอการอนุมัติ<br/>
            ทีมงานจะตรวจสอบภายใน 1-3 วันทำการ
          </p>

          <button 
            class="w-full py-3 bg-green-600 text-white rounded-xl font-semibold mb-3"
            @click="goToProviderDocs"
          >
            อัพโหลดเอกสาร
          </button>
          
          <button 
            class="w-full py-3 border-2 border-gray-200 rounded-xl font-semibold"
            @click="router.push('/home')"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
