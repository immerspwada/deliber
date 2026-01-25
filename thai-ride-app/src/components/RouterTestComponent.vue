<template>
  <div class="p-4 bg-gray-100 rounded-lg">
    <h3 class="text-lg font-semibold mb-4">Router Navigation Test</h3>
    
    <div class="space-y-2">
      <div class="text-sm">
        <strong>Current User:</strong> {{ authStore.user?.email || 'Not logged in' }}
      </div>
      <div class="text-sm">
        <strong>Current Role:</strong> {{ authStore.user?.role || 'None' }}
      </div>
      <div class="text-sm">
        <strong>Current Route:</strong> {{ $route.path }}
      </div>
    </div>

    <div class="mt-4 space-y-2">
      <h4 class="font-medium">Test Navigation:</h4>
      <div class="flex flex-wrap gap-2">
        <button 
          class="px-3 py-1 bg-blue-500 text-white rounded text-sm"
          @click="testNavigation('/customer')"
        >
          Customer
        </button>
        <button 
          class="px-3 py-1 bg-green-500 text-white rounded text-sm"
          @click="testNavigation('/provider/onboarding')"
        >
          Provider Onboarding
        </button>
        <button 
          class="px-3 py-1 bg-yellow-500 text-white rounded text-sm"
          @click="testNavigation('/provider')"
        >
          Provider Dashboard
        </button>
        <button 
          class="px-3 py-1 bg-red-500 text-white rounded text-sm"
          @click="testNavigation('/admin')"
        >
          Admin
        </button>
      </div>
    </div>

    <div v-if="navigationResult" class="mt-4 p-3 rounded" :class="navigationResult.success ? 'bg-green-100' : 'bg-red-100'">
      <div class="text-sm">
        <strong>Navigation Result:</strong> {{ navigationResult.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const navigationResult = ref<{ success: boolean; message: string } | null>(null)

const testNavigation = async (path: string) => {
  try {
    console.log(`[RouterTest] Attempting to navigate to: ${path}`)
    await router.push(path)
    
    // Check if we actually navigated to the intended path
    if (route.path === path) {
      navigationResult.value = {
        success: true,
        message: `Successfully navigated to ${path}`
      }
    } else {
      navigationResult.value = {
        success: false,
        message: `Navigation redirected from ${path} to ${route.path}`
      }
    }
  } catch (error) {
    console.error('[RouterTest] Navigation error:', error)
    navigationResult.value = {
      success: false,
      message: `Navigation failed: ${error}`
    }
  }
}
</script>