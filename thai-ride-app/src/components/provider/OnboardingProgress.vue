<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  currentStep: 1 | 2 | 3
}

const props = defineProps<Props>()

interface Step {
  number: 1 | 2 | 3
  title: string
  description: string
}

const steps: Step[] = [
  {
    number: 1,
    title: 'ลงทะเบียน',
    description: 'กรอกข้อมูลส่วนตัว',
  },
  {
    number: 2,
    title: 'ยืนยันอีเมล',
    description: 'ยืนยันอีเมลของคุณ',
  },
  {
    number: 3,
    title: 'อัปโหลดเอกสาร',
    description: 'อัปโหลดเอกสารที่จำเป็น',
  },
]

const progressPercentage = computed(() => {
  return (props.currentStep / steps.length) * 100
})

function isStepCompleted(stepNumber: number): boolean {
  return stepNumber < props.currentStep
}

function isStepCurrent(stepNumber: number): boolean {
  return stepNumber === props.currentStep
}

function isStepUpcoming(stepNumber: number): boolean {
  return stepNumber > props.currentStep
}
</script>

<template>
  <div class="w-full max-w-3xl mx-auto px-4 py-6">
    <!-- Progress Bar -->
    <div class="mb-8">
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm font-medium text-gray-700">ความคืบหน้า</span>
        <span class="text-sm font-medium text-blue-600">{{ Math.round(progressPercentage) }}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div
          class="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
          :style="{ width: `${progressPercentage}%` }"
        />
      </div>
    </div>

    <!-- Steps -->
    <div class="relative">
      <!-- Connection Lines -->
      <div class="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10" aria-hidden="true" />
      <div
        class="absolute top-5 left-0 h-0.5 bg-blue-600 -z-10 transition-all duration-500"
        :style="{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }"
        aria-hidden="true"
      />

      <!-- Step Items -->
      <div class="relative flex justify-between">
        <div
          v-for="step in steps"
          :key="step.number"
          class="flex flex-col items-center"
          :class="{
            'flex-1': step.number !== steps.length,
          }"
        >
          <!-- Step Circle -->
          <div
            class="relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300"
            :class="{
              'bg-blue-600 border-blue-600': isStepCompleted(step.number),
              'bg-white border-blue-600 ring-4 ring-blue-100': isStepCurrent(step.number),
              'bg-white border-gray-300': isStepUpcoming(step.number),
            }"
          >
            <!-- Completed Check -->
            <svg
              v-if="isStepCompleted(step.number)"
              class="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>

            <!-- Current Step Number -->
            <span
              v-else-if="isStepCurrent(step.number)"
              class="text-sm font-bold text-blue-600"
            >
              {{ step.number }}
            </span>

            <!-- Upcoming Step Number -->
            <span
              v-else
              class="text-sm font-medium text-gray-400"
            >
              {{ step.number }}
            </span>
          </div>

          <!-- Step Info -->
          <div class="mt-3 text-center max-w-[120px]">
            <p
              class="text-sm font-medium transition-colors"
              :class="{
                'text-blue-600': isStepCurrent(step.number),
                'text-gray-900': isStepCompleted(step.number),
                'text-gray-500': isStepUpcoming(step.number),
              }"
            >
              {{ step.title }}
            </p>
            <p
              class="text-xs mt-1 transition-colors"
              :class="{
                'text-blue-500': isStepCurrent(step.number),
                'text-gray-600': isStepCompleted(step.number),
                'text-gray-400': isStepUpcoming(step.number),
              }"
            >
              {{ step.description }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Current Step Indicator (Mobile) -->
    <div class="mt-6 p-4 bg-blue-50 rounded-lg md:hidden">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span class="text-sm font-bold text-white">{{ currentStep }}</span>
          </div>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-blue-900">
            {{ steps[currentStep - 1].title }}
          </p>
          <p class="text-xs text-blue-700">
            {{ steps[currentStep - 1].description }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
