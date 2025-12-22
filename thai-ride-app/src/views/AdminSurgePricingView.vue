<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'

const loading = ref(false)
const rules = ref<any[]>([])

onMounted(() => { loading.value = false })
</script>

<template>
  <AdminLayout>
    <div class="surge-page">
      <h1>Surge Pricing</h1>
      <p>จัดการระบบปรับราคาอัตโนมัติ</p>
      <div v-if="loading">Loading...</div>
      <div v-else>
        <p>ยังไม่มีกฎ Surge Pricing</p>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.surge-page { padding: 24px; }
.surge-page h1 { font-size: 24px; font-weight: 600; margin: 0 0 8px; }
.surge-page p { color: #666; }
</style>
