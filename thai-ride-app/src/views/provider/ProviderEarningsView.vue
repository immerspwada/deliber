<script setup lang="ts">
/**
 * Provider Earnings View - หน้ารายได้
 * Integrated with EarningsDashboard component
 */
import { onMounted } from 'vue'
import EarningsDashboard from '../../components/provider/EarningsDashboard.vue'

onMounted(() => {
  // Component handles its own data loading
})
</script>

<template>
  <div class="earnings-page">
    <EarningsDashboard />
  </div>
</template>

<style scoped>
.earnings-page {
  padding: 16px;
  min-height: calc(100vh - 130px);
  background: #f8fafc;
}
</style>
