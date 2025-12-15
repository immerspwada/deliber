<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()

const loading = ref(true)
const activeTab = ref<'available' | 'used'>('available')
const promos = ref<any[]>([])

const availablePromos = computed(() => promos.value.filter(p => !p.used && new Date(p.valid_until) > new Date()))
const usedPromos = computed(() => promos.value.filter(p => p.used))

const fetchPromos = async () => {
  loading.value = true
  try {
    const { data } = await (supabase.from('promo_codes') as any)
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (data) {
      promos.value = data.map((p: any) => ({
        ...p,
        used: false // In production, check user_promo_usage
      }))
    }
  } catch (err) {
    // Use mock data
    promos.value = [
      { id: 1, code: 'FIRST50', discount_type: 'fixed', discount_value: 50, min_order: 100, valid_until: '2025-01-31', description: 'ส่วนลดผู้ใช้ใหม่', used: false },
      { id: 2, code: 'SAVE20', discount_type: 'fixed', discount_value: 20, min_order: 50, valid_until: '2025-01-15', description: 'ส่วนลดทั่วไป', used: false },
      { id: 3, code: 'RIDE10', discount_type: 'percentage', discount_value: 10, max_discount: 100, valid_until: '2025-02-28', description: 'ลด 10% สูงสุด 100 บาท', used: false },
      { id: 4, code: 'WEEKEND', discount_type: 'percentage', discount_value: 15, max_discount: 150, valid_until: '2025-01-31', description: 'โปรวันหยุด', used: false },
      { id: 5, code: 'NEWYEAR', discount_type: 'fixed', discount_value: 100, min_order: 200, valid_until: '2024-12-10', description: 'โปรปีใหม่', used: true }
    ]
  } finally {
    loading.value = false
  }
}

const copyCode = (code: string) => {
  navigator.clipboard?.writeText(code)
  alert(`คัดลอกโค้ด ${code} แล้ว`)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

onMounted(fetchPromos)

const goBack = () => router.back()
</script>

<template>
  <div class="page-container">
    <div class="content-container">
      <!-- Header -->
      <div class="page-header">
        <button @click="goBack" class="back-btn">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>โปรโมชั่น</h1>
      </div>

      <!-- Add Promo Code -->
      <div class="add-promo">
        <div class="input-wrapper">
          <svg class="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
          </svg>
          <input type="text" placeholder="ใส่โค้ดส่วนลด" />
        </div>
        <button class="apply-btn">ใช้</button>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button @click="activeTab = 'available'" :class="['tab', { active: activeTab === 'available' }]">
          ใช้ได้ ({{ availablePromos.length }})
        </button>
        <button @click="activeTab = 'used'" :class="['tab', { active: activeTab === 'used' }]">
          ใช้แล้ว ({{ usedPromos.length }})
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
      </div>

      <!-- Available Promos -->
      <div v-else-if="activeTab === 'available'" class="promos-list">
        <div v-if="availablePromos.length === 0" class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
          </svg>
          <p>ไม่มีโปรโมชั่นที่ใช้ได้</p>
        </div>

        <div v-for="promo in availablePromos" :key="promo.id" class="promo-card">
          <div class="promo-left">
            <svg class="promo-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
            </svg>
            <div class="promo-badge">
              <span v-if="promo.discount_type === 'fixed'">฿{{ promo.discount_value }}</span>
              <span v-else>{{ promo.discount_value }}%</span>
            </div>
          </div>
          <div class="promo-content">
            <div class="promo-code">{{ promo.code }}</div>
            <div class="promo-desc">{{ promo.description }}</div>
            <div class="promo-meta">
              <span v-if="promo.min_order">ขั้นต่ำ ฿{{ promo.min_order }}</span>
              <span v-if="promo.max_discount">สูงสุด ฿{{ promo.max_discount }}</span>
            </div>
            <div class="promo-expiry">
              หมดอายุ {{ formatDate(promo.valid_until) }}
            </div>
          </div>
          <button @click="copyCode(promo.code)" class="copy-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Used Promos -->
      <div v-else class="promos-list">
        <div v-if="usedPromos.length === 0" class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <p>ยังไม่มีโปรโมชั่นที่ใช้แล้ว</p>
        </div>

        <div v-for="promo in usedPromos" :key="promo.id" class="promo-card used">
          <div class="promo-left">
            <svg class="promo-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
            </svg>
            <div class="promo-badge">
              <span v-if="promo.discount_type === 'fixed'">฿{{ promo.discount_value }}</span>
              <span v-else>{{ promo.discount_value }}%</span>
            </div>
          </div>
          <div class="promo-content">
            <div class="promo-code">{{ promo.code }}</div>
            <div class="promo-desc">{{ promo.description }}</div>
            <div class="promo-status">ใช้แล้ว</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
}

.back-btn {
  width: 40px;
  height: 40px;
  background: none;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.back-btn svg {
  width: 24px;
  height: 24px;
}

.page-header h1 {
  font-size: 20px;
  font-weight: 600;
}

/* Add Promo */
.add-promo {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  width: 20px;
  height: 20px;
  color: #6B6B6B;
  pointer-events: none;
}

.add-promo input {
  width: 100%;
  padding: 14px 16px 14px 44px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 15px;
  outline: none;
}

.add-promo input:focus {
  border-color: #000;
}

.add-promo input:focus + .input-icon,
.input-wrapper:focus-within .input-icon {
  color: #000;
}

.apply-btn {
  padding: 14px 24px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

/* Tabs */
.tabs {
  display: flex;
  border-bottom: 1px solid #E5E5E5;
  margin-bottom: 20px;
}

.tab {
  flex: 1;
  padding: 14px;
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 500;
  color: #6B6B6B;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.tab.active {
  color: #000;
  border-bottom-color: #000;
}

/* Loading */
.loading {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 40px;
  color: #6B6B6B;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
}

/* Promo Card */
.promos-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.promo-card {
  display: flex;
  align-items: stretch;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.promo-card:hover {
  border-color: #000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.promo-card.used {
  opacity: 0.6;
}

.promo-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: #000;
  min-width: 80px;
  gap: 6px;
}

.promo-icon {
  width: 24px;
  height: 24px;
  color: #fff;
}

.promo-badge {
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
}

.promo-content {
  flex: 1;
  padding: 14px 16px;
}

.promo-code {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 4px;
}

.promo-desc {
  font-size: 13px;
  color: #6B6B6B;
  margin-bottom: 6px;
}

.promo-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #6B6B6B;
  margin-bottom: 4px;
}

.promo-expiry {
  font-size: 12px;
  color: #E11900;
}

.promo-status {
  font-size: 12px;
  color: #6B6B6B;
  font-style: italic;
}

.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  background: none;
  border: none;
  border-left: 1px solid #E5E5E5;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-btn:hover {
  background: #F6F6F6;
}

.copy-btn:active {
  transform: scale(0.95);
}

.copy-btn svg {
  width: 20px;
  height: 20px;
  color: #6B6B6B;
  transition: color 0.2s ease;
}

.copy-btn:hover svg {
  color: #000;
}
</style>
