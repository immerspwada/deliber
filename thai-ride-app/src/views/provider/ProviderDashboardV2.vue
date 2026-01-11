<script setup lang="ts">
/**
 * Provider Dashboard V2 - Main Dashboard View
 * MUNEEF Design System Compliant
 * Thai Ride App - Provider Dashboard Page
 */

import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase'
import { useProviderStore } from '../../stores/providerStore'
import { useErrorHandler } from '../../composables/useErrorHandler'
import ProviderDashboardV2 from '../../components/provider/ProviderDashboardV2.vue'

const router = useRouter()
const providerStore = useProviderStore()
const { handleError } = useErrorHandler()

// Check authentication and provider status
onMounted(async () => {
  try {
    // This will be handled by the ProviderDashboardV2 component
    // Just ensure we have a valid session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/login')
      return
    }
  } catch (error) {
    handleError(error)
    router.replace('/login')
  }
})

onUnmounted(() => {
  providerStore.cleanup()
})
</script>

<template>
  <ProviderDashboardV2 />
</template>