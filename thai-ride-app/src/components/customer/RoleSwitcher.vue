<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { supabase } from '../../lib/supabase'

const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(false)
const providerStatus = ref<'none' | 'pending' | 'approved' | 'active' | 'rejected'>('none')

const canSwitchToProvider = computed(() => 
  providerStatus.value === 'approved' || providerStatus.value === 'active'
)

const isCurrentlyProvider = computed(() => 
  router.currentRoute.value.path.startsWith('/provider')
)

const checkProviderStatus = async (): Promise<void> => {
  if (!authStore.user?.id) return

  try {
    const { data, error } = await supabase
      .from('providers_v2')
      .select('status')
      .eq('user_id', authStore.user.id)
      .maybeSingle()

    if (error) {
      console.error('Error checking provider status:', error)
      return
    }

    providerStatus.value = data?.status || 'none'
  } catch (error) {
    console.error('Exception checking provider status:', error)
  }
}

const switchToCustomer = (): void => {
  router.push('/customer')
}

const switchToProvider = (): void => {
  if (canSwitchToProvider.value) {
    router.push('/provider')
  } else if (providerStatus.value === 'none') {
    router.push('/provider/onboarding')
  } else {
    // Pending, rejected, etc. - go to onboarding to see status
    router.push('/provider/onboarding')
  }
}

const becomeProvider = (): void => {
  router.push('/provider/onboarding')
}

onMounted(() => {
  checkProviderStatus()
})
</script>

<template>
  <div class="role-switcher">
    <!-- Current Role Indicator -->
    <div class="current-role">
      <div class="role-badge" :class="{ 'customer': !isCurrentlyProvider, 'provider': isCurrentlyProvider }">
        <svg v-if="!isCurrentlyProvider" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="1" y="3" width="15" height="13" rx="2"/>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
          <circle cx="5.5" cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
        <span>{{ isCurrentlyProvider ? 'คนขับ' : 'ลูกค้า' }}</span>
      </div>
    </div>

    <!-- Role Switch Options -->
    <div class="switch-options">
      <!-- Switch to Customer (always available) -->
      <button 
        v-if="isCurrentlyProvider"
        @click="switchToCustomer"
        class="switch-btn customer-btn"
        :disabled="isLoading"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span>เปลี่ยนเป็นลูกค้า</span>
      </button>

      <!-- Switch to Provider (if approved) -->
      <button 
        v-if="!isCurrentlyProvider && canSwitchToProvider"
        @click="switchToProvider"
        class="switch-btn provider-btn"
        :disabled="isLoading"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="1" y="3" width="15" height="13" rx="2"/>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
          <circle cx="5.5" cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
        <span>เปลี่ยนเป็นคนขับ</span>
      </button>

      <!-- Become Provider (if not registered) - Enhanced Version -->
      <button 
        v-if="!isCurrentlyProvider && providerStatus === 'none'"
        @click="becomeProvider"
        class="switch-btn become-provider-btn enhanced"
        :disabled="isLoading"
      >
        <div class="btn-content">
          <div class="btn-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v8M8 12h8"/>
            </svg>
          </div>
          <div class="btn-text">
            <span class="btn-title">สมัครเป็นคนขับ</span>
            <span class="btn-subtitle">รายได้เสริม 15,000-30,000 บาท/เดือน</span>
          </div>
        </div>
        <div class="btn-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </button>

      <!-- Provider Status (if pending/rejected) -->
      <div 
        v-if="!isCurrentlyProvider && (providerStatus === 'pending' || providerStatus === 'rejected')"
        class="status-indicator"
        @click="switchToProvider"
      >
        <div class="status-icon" :class="providerStatus">
          <svg v-if="providerStatus === 'pending'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M15 9l-6 6M9 9l6 6"/>
          </svg>
        </div>
        <div class="status-text">
          <span class="status-label">
            {{ providerStatus === 'pending' ? 'รอการอนุมัติ' : 'ไม่ผ่านการอนุมัติ' }}
          </span>
          <span class="status-desc">แตะเพื่อดูรายละเอียด</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.role-switcher {
  padding: 16px;
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
}

.current-role {
  margin-bottom: 16px;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.role-badge.customer {
  background: #E3F2FD;
  color: #1976D2;
}

.role-badge.provider {
  background: #E8F5E8;
  color: #2E7D32;
}

.role-badge svg {
  width: 18px;
  height: 18px;
}

.switch-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.switch-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  background: #F8F9FA;
  border: 1px solid #E9ECEF;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
}

.switch-btn:hover {
  background: #E9ECEF;
  border-color: #DEE2E6;
}

.switch-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.switch-btn svg {
  width: 20px;
  height: 20px;
  color: #6C757D;
}

.customer-btn {
  color: #1976D2;
}

.customer-btn:hover {
  background: #E3F2FD;
  border-color: #BBDEFB;
}

.customer-btn svg {
  color: #1976D2;
}

.provider-btn {
  color: #2E7D32;
}

.provider-btn:hover {
  background: #E8F5E8;
  border-color: #C8E6C9;
}

.provider-btn svg {
  color: #2E7D32;
}

.become-provider-btn {
  color: #00A86B;
  background: #E8F5EF;
  border-color: #C8E6C9;
}

.become-provider-btn:hover {
  background: #D4EDDA;
  border-color: #A3D9A5;
}

.become-provider-btn svg {
  color: #00A86B;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #F8F9FA;
  border: 1px solid #E9ECEF;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-indicator:hover {
  background: #E9ECEF;
}

.status-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-icon.pending {
  background: #FEF3C7;
  color: #F59E0B;
}

.status-icon.rejected {
  background: #FEE2E2;
  color: #E53935;
}

.status-icon svg {
  width: 20px;
  height: 20px;
}

.status-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.status-label {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.status-desc {
  font-size: 12px;
  color: #6C757D;
}
</style>