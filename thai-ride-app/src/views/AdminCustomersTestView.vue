<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import AdminLayout from '../components/AdminLayout.vue'

const users = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const count = ref(0)

const testQuery = async () => {
  loading.value = true
  error.value = null
  
  console.log('[Test] Starting query...')
  
  try {
    const { data, count: totalCount, error: fetchError } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .limit(10)
    
    console.log('[Test] Query result:', { 
      dataLength: data?.length, 
      count: totalCount, 
      error: fetchError?.message,
      data 
    })
    
    if (fetchError) {
      error.value = fetchError.message
      return
    }
    
    users.value = data || []
    count.value = totalCount || 0
    
  } catch (err: any) {
    console.error('[Test] Error:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  testQuery()
})
</script>

<template>
  <AdminLayout>
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-4">Test Admin Customers Query</h1>
      
      <button 
        @click="testQuery" 
        class="bg-green-500 text-white px-4 py-2 rounded mb-4"
        :disabled="loading"
      >
        {{ loading ? 'Loading...' : 'Test Query' }}
      </button>
      
      <div v-if="error" class="bg-red-100 text-red-700 p-4 rounded mb-4">
        Error: {{ error }}
      </div>
      
      <div class="mb-4">
        <strong>Total Count:</strong> {{ count }}
      </div>
      
      <div v-if="loading" class="text-gray-500">Loading...</div>
      
      <div v-else-if="users.length === 0" class="text-gray-500">
        No users found
      </div>
      
      <div v-else class="space-y-2">
        <div 
          v-for="user in users" 
          :key="user.id"
          class="bg-white p-4 rounded shadow"
        >
          <div><strong>ID:</strong> {{ user.id }}</div>
          <div><strong>Email:</strong> {{ user.email }}</div>
          <div><strong>Member UID:</strong> {{ user.member_uid }}</div>
          <div><strong>Name:</strong> {{ user.first_name }} {{ user.last_name }}</div>
          <div><strong>Status:</strong> {{ user.is_active ? 'Active' : 'Inactive' }}</div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
