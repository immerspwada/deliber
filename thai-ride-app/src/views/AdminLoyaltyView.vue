<script setup lang="ts">
/**
 * Feature: F156 - Admin Loyalty Management
 * จัดการระบบ Loyalty Program: ดู/แก้ไข tiers, rewards, และแต้มผู้ใช้
 */
import { ref, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { supabase } from '../lib/supabase'

interface LoyaltyTier { id: string; name: string; name_th: string; min_points: number; multiplier: number; benefits: string[]; badge_color: string; is_active: boolean }
interface LoyaltyReward { id: string; name_th: string; type: string; points_required: number; value: number; value_type: string; is_active: boolean; quantity_redeemed: number }
interface UserLoyalty { id: string; user_id: string; current_points: number; lifetime_points: number; user?: { name: string; email: string } }

const loading = ref(false)
const activeTab = ref<'overview' | 'tiers' | 'rewards' | 'users'>('overview')
const tiers = ref<LoyaltyTier[]>([])
const rewards = ref<LoyaltyReward[]>([])
const userLoyalties = ref<UserLoyalty[]>([])
const stats = ref({ totalUsers: 0, totalPoints: 0, totalRedeemed: 0, avgPoints: 0 })

// Modals
const showRewardModal = ref(false)
const showAdjustModal = ref(false)
const adjustingUser = ref<UserLoyalty | null>(null)
const adjustPoints = ref(0)
const adjustReason = ref('')

// For future use
void showRewardModal

onMounted(async () => {
  await Promise.all([fetchStats(), fetchTiers(), fetchRewards(), fetchUserLoyalties()])
})

const fetchStats = async () => {
  try {
    const { data: loyaltyData } = await supabase.from('user_loyalty').select('current_points, lifetime_points')
    const { data: rewardData } = await supabase.from('user_rewards').select('points_spent')
    
    if (loyaltyData && Array.isArray(loyaltyData)) {
      stats.value.totalUsers = loyaltyData.length
      stats.value.totalPoints = loyaltyData.reduce((sum: number, u: any) => sum + (u.current_points || 0), 0)
      stats.value.avgPoints = loyaltyData.length > 0 ? Math.round(stats.value.totalPoints / loyaltyData.length) : 0
    }
    if (rewardData && Array.isArray(rewardData)) {
      stats.value.totalRedeemed = rewardData.reduce((sum: number, r: any) => sum + (r.points_spent || 0), 0)
    }
  } catch (e) {
    // Demo data
    stats.value = { totalUsers: 1250, totalPoints: 2500000, totalRedeemed: 450000, avgPoints: 2000 }
  }
}

const fetchTiers = async () => {
  try {
    const { data } = await supabase.from('loyalty_tiers').select('*').order('sort_order')
    tiers.value = data || []
  } catch (e) {
    tiers.value = [
      { id: '1', name: 'Bronze', name_th: 'บรอนซ์', min_points: 0, multiplier: 1.0, benefits: ['สะสมแต้ม 1 แต้ม/บาท'], badge_color: '#CD7F32', is_active: true },
      { id: '2', name: 'Silver', name_th: 'ซิลเวอร์', min_points: 1000, multiplier: 1.2, benefits: ['สะสมแต้ม 1.2 แต้ม/บาท'], badge_color: '#C0C0C0', is_active: true },
      { id: '3', name: 'Gold', name_th: 'โกลด์', min_points: 5000, multiplier: 1.5, benefits: ['สะสมแต้ม 1.5 แต้ม/บาท'], badge_color: '#FFD700', is_active: true },
      { id: '4', name: 'Platinum', name_th: 'แพลทินัม', min_points: 15000, multiplier: 2.0, benefits: ['สะสมแต้ม 2 แต้ม/บาท'], badge_color: '#E5E4E2', is_active: true }
    ]
  }
}

const fetchRewards = async () => {
  try {
    const { data } = await supabase.from('loyalty_rewards').select('*').order('points_required')
    rewards.value = data || []
  } catch (e) {
    rewards.value = [
      { id: '1', name_th: 'ส่วนลด 20 บาท', type: 'discount', points_required: 200, value: 20, value_type: 'fixed', is_active: true, quantity_redeemed: 150 },
      { id: '2', name_th: 'ส่วนลด 50 บาท', type: 'discount', points_required: 450, value: 50, value_type: 'fixed', is_active: true, quantity_redeemed: 85 },
      { id: '3', name_th: 'เดินทางฟรี', type: 'free_ride', points_required: 1500, value: 100, value_type: 'fixed', is_active: true, quantity_redeemed: 25 }
    ]
  }
}

const fetchUserLoyalties = async () => {
  try {
    const { data } = await supabase.from('user_loyalty').select('*, user:users(name, email)').order('lifetime_points', { ascending: false }).limit(50)
    userLoyalties.value = data || []
  } catch (e) {
    userLoyalties.value = [
      { id: '1', user_id: 'u1', current_points: 3500, lifetime_points: 8500, user: { name: 'สมชาย ใจดี', email: 'somchai@email.com' } },
      { id: '2', user_id: 'u2', current_points: 1200, lifetime_points: 4200, user: { name: 'สมหญิง รักดี', email: 'somying@email.com' } }
    ]
  }
}

const openAdjustModal = (user: UserLoyalty) => {
  adjustingUser.value = user
  adjustPoints.value = 0
  adjustReason.value = ''
  showAdjustModal.value = true
}

const submitAdjustPoints = async () => {
  if (!adjustingUser.value || adjustPoints.value === 0) return
  loading.value = true
  try {
    await supabase.rpc('add_loyalty_points', {
      p_user_id: adjustingUser.value.user_id,
      p_points: adjustPoints.value,
      p_type: 'adjust',
      p_source: 'admin',
      p_description: adjustReason.value || 'ปรับแต้มโดย Admin'
    } as any)
    await fetchUserLoyalties()
    showAdjustModal.value = false
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

const toggleRewardActive = async (reward: LoyaltyReward) => {
  try {
    await (supabase.from('loyalty_rewards') as any).update({ is_active: !reward.is_active }).eq('id', reward.id)
    reward.is_active = !reward.is_active
  } catch (e) { console.error(e) }
}
</script>

<template>
  <AdminLayout>
    <div class="admin-loyalty">
      <div class="page-header">
        <h1>Loyalty Program</h1>
        <p>จัดการระบบสะสมแต้มและรางวัล</p>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">สมาชิกทั้งหมด</span>
          <span class="stat-value">{{ stats.totalUsers.toLocaleString() }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">แต้มในระบบ</span>
          <span class="stat-value">{{ stats.totalPoints.toLocaleString() }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">แต้มที่แลกไป</span>
          <span class="stat-value">{{ stats.totalRedeemed.toLocaleString() }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">เฉลี่ยต่อคน</span>
          <span class="stat-value">{{ stats.avgPoints.toLocaleString() }}</span>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button :class="['tab', { active: activeTab === 'overview' }]" @click="activeTab = 'overview'">ภาพรวม</button>
        <button :class="['tab', { active: activeTab === 'tiers' }]" @click="activeTab = 'tiers'">ระดับสมาชิก</button>
        <button :class="['tab', { active: activeTab === 'rewards' }]" @click="activeTab = 'rewards'">รางวัล</button>
        <button :class="['tab', { active: activeTab === 'users' }]" @click="activeTab = 'users'">ผู้ใช้</button>
      </div>

      <!-- Tiers Tab -->
      <div v-if="activeTab === 'tiers'" class="tab-content">
        <div class="section-header">
          <h2>ระดับสมาชิก</h2>
        </div>
        <div class="tiers-table">
          <div v-for="tier in tiers" :key="tier.id" class="tier-row">
            <div class="tier-badge" :style="{ backgroundColor: tier.badge_color }">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
            </div>
            <div class="tier-info">
              <span class="tier-name">{{ tier.name_th }}</span>
              <span class="tier-points">{{ tier.min_points.toLocaleString() }}+ แต้ม</span>
            </div>
            <div class="tier-multiplier">x{{ tier.multiplier }}</div>
            <div class="tier-benefits">
              <span v-for="(b, i) in tier.benefits" :key="i" class="benefit-tag">{{ b }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Rewards Tab -->
      <div v-if="activeTab === 'rewards'" class="tab-content">
        <div class="section-header">
          <h2>รางวัลที่แลกได้</h2>
          <button class="btn-primary" @click="showRewardModal = true">+ เพิ่มรางวัล</button>
        </div>
        <div class="rewards-table">
          <div v-for="reward in rewards" :key="reward.id" class="reward-row">
            <div class="reward-info">
              <span class="reward-name">{{ reward.name_th }}</span>
              <span class="reward-type">{{ reward.type }} - {{ reward.value }}{{ reward.value_type === 'percentage' ? '%' : ' บาท' }}</span>
            </div>
            <div class="reward-points">{{ reward.points_required.toLocaleString() }} แต้ม</div>
            <div class="reward-redeemed">แลกแล้ว {{ reward.quantity_redeemed }} ครั้ง</div>
            <div class="reward-actions">
              <button :class="['toggle-btn', { active: reward.is_active }]" @click="toggleRewardActive(reward)">
                {{ reward.is_active ? 'เปิด' : 'ปิด' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Users Tab -->
      <div v-if="activeTab === 'users'" class="tab-content">
        <div class="section-header">
          <h2>ผู้ใช้ที่มีแต้มสูงสุด</h2>
        </div>
        <div class="users-table">
          <div v-for="ul in userLoyalties" :key="ul.id" class="user-row">
            <div class="user-info">
              <span class="user-name">{{ ul.user?.name || 'ไม่ระบุชื่อ' }}</span>
              <span class="user-email">{{ ul.user?.email }}</span>
            </div>
            <div class="user-points">
              <span class="current">{{ ul.current_points.toLocaleString() }}</span>
              <span class="lifetime">สะสม {{ ul.lifetime_points.toLocaleString() }}</span>
            </div>
            <button class="btn-secondary" @click="openAdjustModal(ul)">ปรับแต้ม</button>
          </div>
        </div>
      </div>

      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'" class="tab-content">
        <div class="overview-grid">
          <div class="overview-card">
            <h3>ระดับสมาชิก</h3>
            <p>{{ tiers.length }} ระดับ</p>
          </div>
          <div class="overview-card">
            <h3>รางวัลที่เปิดใช้</h3>
            <p>{{ rewards.filter(r => r.is_active).length }} รายการ</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Adjust Points Modal -->
    <div v-if="showAdjustModal" class="modal-overlay" @click.self="showAdjustModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>ปรับแต้ม</h3>
          <button @click="showAdjustModal = false" class="close-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="modal-body" v-if="adjustingUser">
          <p>ผู้ใช้: {{ adjustingUser.user?.name }}</p>
          <p>แต้มปัจจุบัน: {{ adjustingUser.current_points.toLocaleString() }}</p>
          <div class="form-group">
            <label>จำนวนแต้ม (บวก = เพิ่ม, ลบ = หัก)</label>
            <input v-model.number="adjustPoints" type="number" class="input-field" />
          </div>
          <div class="form-group">
            <label>เหตุผล</label>
            <input v-model="adjustReason" type="text" class="input-field" placeholder="ระบุเหตุผล" />
          </div>
        </div>
        <button @click="submitAdjustPoints" :disabled="loading || adjustPoints === 0" class="btn-primary">
          {{ loading ? 'กำลังบันทึก...' : 'ยืนยัน' }}
        </button>
      </div>
    </div>
  </AdminLayout>
</template>


<style scoped>
.admin-loyalty {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #000;
  margin: 0 0 4px;
}

.page-header p {
  font-size: 14px;
  color: #6b6b6b;
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

@media (min-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 13px;
  color: #6b6b6b;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #000;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.tab {
  padding: 10px 20px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #6b6b6b;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab:hover {
  background: #e5e5e5;
}

.tab.active {
  background: #000;
  color: #fff;
}

.tab-content {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.btn-primary {
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f6f6f6;
  color: #000;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: #e5e5e5;
}

/* Tiers */
.tiers-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tier-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 10px;
}

.tier-badge {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.tier-badge svg {
  width: 24px;
  height: 24px;
}

.tier-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tier-name {
  font-size: 16px;
  font-weight: 600;
  color: #000;
}

.tier-points {
  font-size: 13px;
  color: #6b6b6b;
}

.tier-multiplier {
  font-size: 18px;
  font-weight: 700;
  color: #000;
  padding: 8px 16px;
  background: #fff;
  border-radius: 8px;
}

.tier-benefits {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.benefit-tag {
  font-size: 12px;
  padding: 4px 10px;
  background: #fff;
  border-radius: 20px;
  color: #545454;
}

/* Rewards */
.rewards-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reward-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 10px;
}

.reward-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.reward-name {
  font-size: 15px;
  font-weight: 600;
  color: #000;
}

.reward-type {
  font-size: 13px;
  color: #6b6b6b;
}

.reward-points {
  font-size: 14px;
  font-weight: 600;
  color: #000;
}

.reward-redeemed {
  font-size: 13px;
  color: #6b6b6b;
}

.reward-actions {
  display: flex;
  gap: 8px;
}

.toggle-btn {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  background: #e5e5e5;
  color: #6b6b6b;
}

.toggle-btn.active {
  background: #000;
  color: #fff;
}

/* Users */
.users-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 10px;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: 15px;
  font-weight: 600;
  color: #000;
}

.user-email {
  font-size: 13px;
  color: #6b6b6b;
}

.user-points {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.user-points .current {
  font-size: 18px;
  font-weight: 700;
  color: #000;
}

.user-points .lifetime {
  font-size: 12px;
  color: #6b6b6b;
}

/* Overview */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.overview-card {
  padding: 20px;
  background: #f9f9f9;
  border-radius: 10px;
  text-align: center;
}

.overview-card h3 {
  font-size: 14px;
  color: #6b6b6b;
  margin: 0 0 8px;
  font-weight: 500;
}

.overview-card p {
  font-size: 28px;
  font-weight: 700;
  color: #000;
  margin: 0;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  padding: 24px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #e5e5e5;
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.modal-body {
  margin-bottom: 20px;
}

.modal-body p {
  margin: 0 0 8px;
  font-size: 14px;
  color: #545454;
}

.form-group {
  margin-top: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #000;
  margin-bottom: 6px;
}

.input-field {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 15px;
  transition: border-color 0.2s;
}

.input-field:focus {
  outline: none;
  border-color: #000;
}

.modal-content .btn-primary {
  width: 100%;
  padding: 14px;
}

@media (max-width: 640px) {
  .tier-row {
    flex-wrap: wrap;
  }
  
  .tier-benefits {
    width: 100%;
    margin-top: 8px;
  }
  
  .reward-row {
    flex-wrap: wrap;
  }
  
  .reward-actions {
    width: 100%;
    margin-top: 8px;
  }
}
</style>
