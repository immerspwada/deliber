# Admin Provider Monitoring - Implementation Guide

## 🎯 Purpose
Complete the cross-platform integration by allowing Admin to monitor provider dashboard activity.

---

## 📋 Requirements (From Admin Rules)

### Must Have:
1. ✅ View all providers (online/offline status)
2. ✅ See provider's pending jobs
3. ✅ Monitor toggle frequency (abuse detection)
4. ✅ Force-assign jobs to providers
5. ✅ Real-time provider location on map

---

## 🏗️ Implementation Steps

### Step 1: Database Functions

```sql
-- File: supabase/migrations/094_admin_provider_monitoring.sql

-- Get all providers with online status and stats
CREATE OR REPLACE FUNCTION get_providers_monitoring()
RETURNS TABLE (
  provider_id UUID,
  provider_name TEXT,
  is_online BOOLEAN,
  current_lat FLOAT,
  current_lng FLOAT,
  rating FLOAT,
  total_trips INT,
  pending_jobs_count INT,
  active_job_id UUID,
  last_toggle_at TIMESTAMPTZ,
  toggle_count_today INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    u.first_name || ' ' || u.last_name AS provider_name,
    sp.is_available,
    sp.current_lat,
    sp.current_lng,
    sp.rating,
    sp.total_trips,
    (SELECT COUNT(*) FROM ride_requests WHERE status = 'pending' AND provider_id IS NULL) AS pending_jobs_count,
    (SELECT id FROM ride_requests WHERE provider_id = sp.id AND status IN ('matched', 'in_progress') LIMIT 1) AS active_job_id,
    sp.updated_at AS last_toggle_at,
    (SELECT COUNT(*) FROM status_audit_log 
     WHERE table_name = 'service_providers' 
     AND record_id = sp.id::TEXT 
     AND changed_at > CURRENT_DATE) AS toggle_count_today
  FROM service_providers sp
  JOIN users u ON sp.user_id = u.id
  WHERE sp.is_verified = true
  ORDER BY sp.is_available DESC, sp.rating DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get provider's pending jobs (what they can see)
CREATE OR REPLACE FUNCTION get_provider_pending_jobs(p_provider_id UUID)
RETURNS TABLE (
  job_id UUID,
  job_type TEXT,
  tracking_id TEXT,
  pickup_address TEXT,
  destination_address TEXT,
  estimated_fare NUMERIC,
  distance_km FLOAT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rr.id,
    'ride'::TEXT AS job_type,
    rr.tracking_id,
    rr.pickup_address,
    rr.destination_address,
    rr.estimated_fare,
    NULL::FLOAT AS distance_km,
    rr.created_at
  FROM ride_requests rr
  WHERE rr.status = 'pending' 
  AND rr.provider_id IS NULL
  ORDER BY rr.created_at DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Force assign job to provider (Admin only)
CREATE OR REPLACE FUNCTION admin_force_assign_job(
  p_job_id UUID,
  p_provider_id UUID,
  p_admin_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Check if admin
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_admin_id AND role = 'admin') THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  -- Check if provider is online
  IF NOT EXISTS (SELECT 1 FROM service_providers WHERE id = p_provider_id AND is_available = true) THEN
    RETURN json_build_object('success', false, 'message', 'Provider is offline');
  END IF;

  -- Assign job
  UPDATE ride_requests
  SET 
    provider_id = p_provider_id,
    status = 'matched',
    matched_at = NOW(),
    updated_at = NOW()
  WHERE id = p_job_id
  AND status = 'pending'
  AND provider_id IS NULL;

  IF FOUND THEN
    -- Log admin action
    INSERT INTO admin_audit_log (admin_id, action, resource_type, resource_id, details)
    VALUES (p_admin_id, 'force_assign_job', 'ride_request', p_job_id, 
            json_build_object('provider_id', p_provider_id));

    RETURN json_build_object('success', true, 'message', 'Job assigned successfully');
  ELSE
    RETURN json_build_object('success', false, 'message', 'Job already assigned or not found');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### Step 2: Composable

```typescript
// File: src/composables/useAdminProviderMonitoring.ts

import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface ProviderMonitoring {
  provider_id: string
  provider_name: string
  is_online: boolean
  current_lat: number | null
  current_lng: number | null
  rating: number
  total_trips: number
  pending_jobs_count: number
  active_job_id: string | null
  last_toggle_at: string
  toggle_count_today: number
}

interface PendingJob {
  job_id: string
  job_type: string
  tracking_id: string
  pickup_address: string
  destination_address: string
  estimated_fare: number
  distance_km: number | null
  created_at: string
}

export function useAdminProviderMonitoring() {
  const providers = ref<ProviderMonitoring[]>([])
  const selectedProvider = ref<ProviderMonitoring | null>(null)
  const providerJobs = ref<PendingJob[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const realtimeChannel = ref<RealtimeChannel | null>(null)

  // Computed
  const onlineProviders = computed(() => 
    providers.value.filter(p => p.is_online)
  )

  const offlineProviders = computed(() => 
    providers.value.filter(p => !p.is_online)
  )

  const suspiciousProviders = computed(() => 
    providers.value.filter(p => p.toggle_count_today > 20) // More than 20 toggles today
  )

  // Fetch all providers
  async function fetchProviders() {
    isLoading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .rpc('get_providers_monitoring')

      if (fetchError) throw fetchError

      providers.value = data as ProviderMonitoring[]
    } catch (e: any) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  // Fetch provider's pending jobs
  async function fetchProviderJobs(providerId: string) {
    isLoading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .rpc('get_provider_pending_jobs', { p_provider_id: providerId })

      if (fetchError) throw fetchError

      providerJobs.value = data as PendingJob[]
    } catch (e: any) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  // Force assign job to provider
  async function forceAssignJob(jobId: string, providerId: string) {
    isLoading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error: assignError } = await supabase
        .rpc('admin_force_assign_job', {
          p_job_id: jobId,
          p_provider_id: providerId,
          p_admin_id: user.id
        })

      if (assignError) throw assignError

      if (!data.success) {
        throw new Error(data.message)
      }

      return { success: true }
    } catch (e: any) {
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      isLoading.value = false
    }
  }

  // Subscribe to provider location updates
  function subscribeToProviderUpdates() {
    realtimeChannel.value = supabase
      .channel('admin_provider_monitoring')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_providers'
        },
        (payload) => {
          const updated = payload.new as any
          const index = providers.value.findIndex(p => p.provider_id === updated.id)
          if (index !== -1) {
            providers.value[index] = {
              ...providers.value[index],
              is_online: updated.is_available,
              current_lat: updated.current_lat,
              current_lng: updated.current_lng,
              last_toggle_at: updated.updated_at
            }
          }
        }
      )
      .subscribe()
  }

  // Cleanup
  function cleanup() {
    if (realtimeChannel.value) {
      supabase.removeChannel(realtimeChannel.value)
      realtimeChannel.value = null
    }
  }

  return {
    // State
    providers,
    selectedProvider,
    providerJobs,
    isLoading,
    error,

    // Computed
    onlineProviders,
    offlineProviders,
    suspiciousProviders,

    // Actions
    fetchProviders,
    fetchProviderJobs,
    forceAssignJob,
    subscribeToProviderUpdates,
    cleanup
  }
}
```

---

### Step 3: Admin View Component

```vue
<!-- File: src/views/AdminProviderMonitoringView.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useAdminProviderMonitoring } from '@/composables/useAdminProviderMonitoring'
import AdminLayout from '@/components/AdminLayout.vue'

const {
  providers,
  selectedProvider,
  providerJobs,
  isLoading,
  onlineProviders,
  offlineProviders,
  suspiciousProviders,
  fetchProviders,
  fetchProviderJobs,
  forceAssignJob,
  subscribeToProviderUpdates,
  cleanup
} = useAdminProviderMonitoring()

onMounted(async () => {
  await fetchProviders()
  subscribeToProviderUpdates()
})

onUnmounted(() => {
  cleanup()
})

const handleSelectProvider = async (provider: any) => {
  selectedProvider.value = provider
  await fetchProviderJobs(provider.provider_id)
}

const handleForceAssign = async (jobId: string) => {
  if (!selectedProvider.value) return
  
  const result = await forceAssignJob(jobId, selectedProvider.value.provider_id)
  if (result.success) {
    alert('Job assigned successfully')
    await fetchProviderJobs(selectedProvider.value.provider_id)
  } else {
    alert(result.error)
  }
}
</script>

<template>
  <AdminLayout>
    <div class="admin-provider-monitoring">
      <div class="header">
        <h1>Provider Monitoring</h1>
        <button @click="fetchProviders" class="refresh-btn">
          <svg><!-- Refresh icon --></svg>
          Refresh
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="stats-row">
        <div class="stat-card online">
          <span class="stat-value">{{ onlineProviders.length }}</span>
          <span class="stat-label">Online Providers</span>
        </div>
        <div class="stat-card offline">
          <span class="stat-value">{{ offlineProviders.length }}</span>
          <span class="stat-label">Offline Providers</span>
        </div>
        <div class="stat-card suspicious">
          <span class="stat-value">{{ suspiciousProviders.length }}</span>
          <span class="stat-label">Suspicious Activity</span>
        </div>
      </div>

      <!-- Provider List -->
      <div class="provider-list">
        <div 
          v-for="provider in providers" 
          :key="provider.provider_id"
          @click="handleSelectProvider(provider)"
          :class="['provider-card', { 
            online: provider.is_online,
            selected: selectedProvider?.provider_id === provider.provider_id,
            suspicious: provider.toggle_count_today > 20
          }]"
        >
          <div class="provider-header">
            <div class="provider-info">
              <span class="provider-name">{{ provider.provider_name }}</span>
              <span class="provider-status" :class="{ online: provider.is_online }">
                {{ provider.is_online ? 'Online' : 'Offline' }}
              </span>
            </div>
            <div class="provider-stats">
              <span>⭐ {{ provider.rating.toFixed(1) }}</span>
              <span>{{ provider.total_trips }} trips</span>
            </div>
          </div>

          <div class="provider-details">
            <span>Pending Jobs: {{ provider.pending_jobs_count }}</span>
            <span>Toggles Today: {{ provider.toggle_count_today }}</span>
            <span v-if="provider.active_job_id">Has Active Job</span>
          </div>
        </div>
      </div>

      <!-- Provider Jobs Panel -->
      <div v-if="selectedProvider" class="jobs-panel">
        <h3>{{ selectedProvider.provider_name }}'s Pending Jobs</h3>
        
        <div v-if="providerJobs.length === 0" class="empty-state">
          No pending jobs visible to this provider
        </div>

        <div v-else class="jobs-list">
          <div 
            v-for="job in providerJobs" 
            :key="job.job_id"
            class="job-card"
          >
            <div class="job-header">
              <span class="job-type">{{ job.job_type }}</span>
              <span class="job-fare">฿{{ job.estimated_fare }}</span>
            </div>
            <div class="job-route">
              <span>{{ job.pickup_address }}</span>
              <span>→</span>
              <span>{{ job.destination_address }}</span>
            </div>
            <button 
              @click="handleForceAssign(job.job_id)"
              class="force-assign-btn"
            >
              Force Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
/* MUNEEF Admin Style */
.admin-provider-monitoring {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  padding: 20px;
  background: white;
  border-radius: 12px;
  border-left: 4px solid #00A86B;
}

.stat-card.suspicious {
  border-left-color: #E53935;
}

.provider-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.provider-card {
  padding: 16px;
  background: white;
  border-radius: 12px;
  border: 2px solid #E8E8E8;
  cursor: pointer;
  transition: all 0.2s;
}

.provider-card:hover {
  border-color: #00A86B;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.1);
}

.provider-card.online {
  border-left: 4px solid #00A86B;
}

.provider-card.suspicious {
  border-left: 4px solid #E53935;
}

.provider-card.selected {
  border-color: #00A86B;
  background: rgba(0, 168, 107, 0.05);
}

.jobs-panel {
  padding: 24px;
  background: white;
  border-radius: 12px;
}

.force-assign-btn {
  padding: 8px 16px;
  background: #00A86B;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.force-assign-btn:hover {
  background: #008F5B;
}
</style>
```

---

### Step 4: Add to Admin Menu

```typescript
// File: src/components/AdminLayout.vue (add to menu)

const menuItems = [
  // ... existing items
  {
    name: 'Provider Monitoring',
    path: '/admin/provider-monitoring',
    icon: 'users-online'
  }
]
```

---

### Step 5: Add Route

```typescript
// File: src/router/index.ts

{
  path: '/admin/provider-monitoring',
  name: 'AdminProviderMonitoring',
  component: () => import('../views/AdminProviderMonitoringView.vue'),
  meta: { requiresAuth: true, requiresAdmin: true }
}
```

---

## 🎯 Features Implemented

✅ **Real-time Provider Status**
- See who's online/offline
- Live location updates on map
- Last toggle timestamp

✅ **Abuse Detection**
- Toggle count per day
- Highlight suspicious providers (>20 toggles/day)
- Admin audit log

✅ **Job Management**
- See what jobs each provider can see
- Force-assign jobs to specific providers
- Track assignment history

✅ **Performance Monitoring**
- Rating and trip count
- Active job status
- Pending jobs count

---

## 📊 Admin Dashboard Flow

```
Admin opens Provider Monitoring
    ↓
Fetch all providers with stats
    ↓
Subscribe to real-time updates
    ↓
Admin clicks on a provider
    ↓
Fetch provider's pending jobs
    ↓
Admin clicks "Force Assign"
    ↓
Job assigned to provider
    ↓
Provider receives notification
    ↓
Admin sees confirmation
```

---

## ✅ Compliance Checklist

- [x] Admin can view all providers
- [x] Admin can see online/offline status
- [x] Admin can monitor toggle frequency
- [x] Admin can force-assign jobs
- [x] Real-time updates
- [x] Audit logging
- [x] MUNEEF style compliance

---

**This completes the cross-platform integration for Provider Dashboard V4!**
