<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center h-16">
          <button
            type="button"
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-3"
            @click="goBack"
            aria-label="กลับ"
          >
            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 class="text-xl font-semibold text-gray-900">การยืนยันตัวตน</h1>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="space-y-8">
        <!-- User Registration Section -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
          <div class="p-6">
            <div class="flex items-start justify-between gap-8">
              <!-- Left: Title & Description -->
              <div class="flex-1 min-w-0">
                <h2 class="text-lg font-semibold text-gray-900 mb-2">
                  การลงทะเบียนผู้ใช้
                </h2>
                <p class="text-sm text-gray-600 leading-relaxed">
                  ต้องการยืนยันหมายเลขโทรศัพท์เมื่อลงทะเบียนผู้ใช้
                </p>
              </div>

              <!-- Right: Toggle & Links -->
              <div class="flex items-start gap-6 flex-shrink-0">
                <!-- Toggle Switch -->
                <div class="flex items-center gap-3">
                  <span class="text-sm text-gray-700 whitespace-nowrap">เปิดใช้งาน</span>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input
                      v-model="twoFactorEnabled"
                      type="checkbox"
                      class="sr-only peer"
                    />
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <span class="text-sm text-gray-700 whitespace-nowrap">เปิดใช้งาน</span>
                </div>

                <!-- Guide Links -->
                <div class="flex flex-col gap-1.5">
                  <a href="#" class="text-sm text-blue-600 hover:text-blue-700 hover:underline whitespace-nowrap">
                    เข้าดูรายละเอียดเพิ่มเติม
                  </a>
                  <a href="#" class="text-sm text-blue-600 hover:text-blue-700 hover:underline whitespace-nowrap">
                    ข้อตกลงผู้ใช้
                  </a>
                  <a href="#" class="text-sm text-blue-600 hover:text-blue-700 hover:underline whitespace-nowrap">
                    พบปัญหาการลงทะเบียนผู้ใช้
                  </a>
                  <a href="#" class="text-sm text-blue-600 hover:text-blue-700 hover:underline whitespace-nowrap">
                    แบบบำรุงแนวทาง
                  </a>
                </div>
              </div>
            </div>

            <!-- Warning Message when disabled -->
            <div
              v-if="!twoFactorEnabled"
              class="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4"
            >
              <div class="flex items-start gap-3">
                <svg class="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                <p class="text-sm text-yellow-800 leading-relaxed">
                  การลงทะเบียนผู้ใช้ถูกปิดใช้งาน ผู้ใช้ใหม่ไม่สามารถสร้างบัญชีได้
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Biometric Authentication Section -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
          <div class="p-6">
            <div class="flex items-start justify-between gap-8">
              <!-- Left: Title & Description -->
              <div class="flex-1 min-w-0">
                <h2 class="text-lg font-semibold text-gray-900 mb-2">
                  เข้าสู่ระบบด้วยชีวภาพยืนยัน
                </h2>
                <p class="text-sm text-gray-600 leading-relaxed">
                  เปิดใช้งานอุปกรณ์ทั้งหมดที่เคยใช้ไว้ให้เข้าสู่ระบบด้วยชีวภาพยืนยัน
                </p>
              </div>

              <!-- Right: Toggle Switch -->
              <div class="flex items-center gap-3 flex-shrink-0">
                <span class="text-sm text-gray-700 whitespace-nowrap">เปิดใช้งาน</span>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    v-model="biometricEnabled"
                    type="checkbox"
                    class="sr-only peer"
                  />
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span class="text-sm text-gray-700 whitespace-nowrap">เปิดใช้งาน</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Terms & Conditions Section -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
          <div class="p-6">
            <div class="flex items-start justify-between gap-8">
              <!-- Left: Title & Description -->
              <div class="flex-1 min-w-0">
                <h2 class="text-lg font-semibold text-gray-900 mb-2">
                  ข้อตกลงผู้ใช้ไว้ในขั้นตอนการลงทะเบียน
                </h2>
                <p class="text-sm text-gray-600 leading-relaxed">
                  เปิดใช้งานอุปกรณ์ทั้งหมดที่เคยใช้ไว้ให้ต้องยอมรับข้อตกลงผู้ใช้ก่อนลงทะเบียนเข้าใช้งาน
                </p>
              </div>

              <!-- Right: Toggle Switch -->
              <div class="flex items-center gap-3 flex-shrink-0">
                <span class="text-sm text-gray-700 whitespace-nowrap">เปิดใช้งาน</span>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    v-model="termsEnabled"
                    type="checkbox"
                    class="sr-only peer"
                  />
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                <span class="text-sm text-gray-700 whitespace-nowrap">เปิดใช้งาน</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// State
const twoFactorEnabled = ref(true)
const biometricEnabled = ref(false)
const termsEnabled = ref(false)

// Methods
function goBack(): void {
  router.back()
}
</script>
