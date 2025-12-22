<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'

const loading = ref(false)
const queue = ref<any[]>([])

onMounted(() => { loading.value = false })
</script>

<template>
  <AdminLayout>
    <div class="verification-page">
      <h1>Verification Queue</h1>
      <p>รายการรอตรวจสอบ</p>
      <div v-if="loading">Loading...</div>
      <div v-else-if="queue.length === 0">
        <p>ไม่มีรายการรอตรวจสอบ</p>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.verification-page { padding: 24px; }
.verification-page h1 { font-size: 24px; font-weight: 600; margin: 0 0 8px; }
.verification-page p { color: #666; }
</style>
