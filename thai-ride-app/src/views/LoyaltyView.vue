<script setup lang="ts">
/**
 * Feature: F156 - Customer Loyalty Program
 * หน้าแสดงแต้มสะสม, ระดับสมาชิก, และรางวัลที่แลกได้
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLoyalty } from '../composables/useLoyalty'
import PullToRefresh from '../components/PullToRefresh.vue'
import SkeletonLoader from '../components/SkeletonLoader.vue'

const router = useRouter()
const {
  loading, transactions, rewards, userRewards, tiers,
  currentPoints, currentTier, nextTier, progressToNextTier,
  fetchSummary, fetchTiers, fetchTransactions, fetchRewards, fetchUserRewards,
  redeemReward, canRedeem, formatPoints, getTransactionIcon
} = useLoyalty()

const activeTab = ref<'rewards' | 'history' | 'my-rewards'>('rewards')
const isRefreshing = ref(false)
const showRedeemModal = ref(false)
const selectedReward = ref<any>(null)
const redeeming = ref(false)

onMounted(async () => {
  await Promise.all([
    fetchSummary(), fetchTiers(), fetchTransactions(), fetchRewards(), fetchUserRewards()
  ])
})

const handleRefresh = async () => {
  isRefreshing.value = true
  await Promise.all([fetchSummary(), fetchTransactions(), fetchRewards(), fetchUserRewards()])
  isRefreshing.value = false
}

const openRedeemModal = (reward: any) => {
  selectedReward.value = reward
  showRedeemModal.value = true
}

const confirmRedeem = async () => {
  if (!selectedReward.value) return
  redeeming.value = true
  const result = await redeemReward(selectedReward.value.id)
  redeeming.value = false
  if (result) {
    showRedeemModal.value = false
    activeTab.value = 'my-rewards'
  }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}
</script>

<template>
  <div class="loyalty-page">
    <PullToRefresh :loading="isRefreshing || loading" @refresh="handleRefresh">
      <div class="content-container">
        <!-- Header -->
        <div class="page-header">
          <button @click="router.back()" class="back-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1>GOBEAR Rewards</h1>
        </div>

        <!-- Points Card -->
        <SkeletonLoader v-if="loading && !isRefreshing" type="balance" />
        <div v-else class="points-card">
          <div class="tier-badge" :style="{ backgroundColor: currentTier?.badge_color || '#CD7F32' }">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
            <span>{{ currentTier?.name_th || 'บรอนซ์' }}</span>
          </div>
          
          <div class="points-display">
            <span class="points-label">แต้มสะสม</span>
            <span class="points-value">{{ currentPoints.toLocaleString() }}</span>
            <span class="points-unit">แต้ม</span>
          </div>

          <!-- Progress to next tier -->
          <div v-if="nextTier" class="tier-progress">
            <div class="progress-info">
              <span>อีก {{ nextTier.points_needed.toLocaleString() }} แต้ม เพื่อเลื่อนเป็น {{ nextTier.name_th }}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progressToNextTier + '%' }"></div>
            </div>
          </div>

          <!-- Benefits -->
          <div class="benefits-list">
            <span class="benefits-title">สิทธิประโยชน์ของคุณ</span>
            <div v-for="(benefit, i) in (currentTier?.benefits || [])" :key="i" class="benefit-item">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <span>{{ benefit }}</span>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button :class="['tab', { active: activeTab === 'rewards' }]" @click="activeTab = 'rewards'">
            รางวัล
          </button>
          <button :class="['tab', { active: activeTab === 'my-rewards' }]" @click="activeTab = 'my-rewards'">
            รางวัลของฉัน
          </button>
          <button :class="['tab', { active: activeTab === 'history' }]" @click="activeTab = 'history'">
            ประวัติแต้ม
          </button>
        </div>

        <!-- Rewards Tab -->
        <div v-if="activeTab === 'rewards'" class="tab-content">
          <div class="rewards-grid">
            <div v-for="reward in rewards" :key="reward.id" class="reward-card" @click="openRedeemModal(reward)">
              <div class="reward-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
                </svg>
              </div>
              <div class="reward-info">
                <span class="reward-name">{{ reward.name_th }}</span>
                <span class="reward-desc">{{ reward.description_th }}</span>
              </div>
              <div class="reward-points" :class="{ affordable: canRedeem(reward) }">
                {{ reward.points_required.toLocaleString() }} แต้ม
              </div>
            </div>
          </div>
        </div>

        <!-- My Rewards Tab -->
        <div v-else-if="activeTab === 'my-rewards'" class="tab-content">
          <div v-if="userRewards.length === 0" class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
            </svg>
            <p>ยังไม่มีรางวัลที่แลก</p>
            <span>แลกแต้มเพื่อรับส่วนลดและของรางวัล</span>
          </div>
          <div v-else class="my-rewards-list">
            <div v-for="ur in userRewards" :key="ur.id" class="my-reward-card" :class="ur.status">
              <div class="my-reward-info">
                <span class="my-reward-name">{{ ur.reward?.name_th || 'รางวัล' }}</span>
                <span class="my-reward-code">รหัส: {{ ur.code }}</span>
                <span class="my-reward-expires">หมดอายุ: {{ formatDate(ur.expires_at) }}</span>
              </div>
              <span :class="['status-badge', ur.status]">
                {{ ur.status === 'active' ? 'ใช้ได้' : ur.status === 'used' ? 'ใช้แล้ว' : 'หมดอายุ' }}
              </span>
            </div>
          </div>
        </div>

        <!-- History Tab -->
        <div v-else-if="activeTab === 'history'" class="tab-content">
          <div v-if="transactions.length === 0" class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <p>ยังไม่มีประวัติแต้ม</p>
          </div>
          <div v-else class="transactions-list">
            <div v-for="tx in transactions" :key="tx.id" class="transaction-item">
              <div class="tx-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getTransactionIcon(tx.type, tx.source)"/>
                </svg>
              </div>
              <div class="tx-info">
                <span class="tx-desc">{{ tx.description }}</span>
                <span class="tx-date">{{ formatDate(tx.created_at) }}</span>
              </div>
              <span :class="['tx-points', { positive: tx.points > 0 }]">
                {{ formatPoints(tx.points) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Tiers Info -->
        <div class="tiers-section">
          <h3>ระดับสมาชิก</h3>
          <div class="tiers-list">
            <div v-for="tier in tiers" :key="tier.id" class="tier-item" :class="{ current: tier.id === currentTier?.id }">
              <div class="tier-dot" :style="{ backgroundColor: tier.badge_color }"></div>
              <div class="tier-info">
                <span class="tier-name">{{ tier.name_th }}</span>
                <span class="tier-points">{{ tier.min_points.toLocaleString() }}+ แต้ม</span>
              </div>
              <span class="tier-multiplier">x{{ tier.multiplier }}</span>
            </div>
          </div>
        </div>
      </div>
    </PullToRefresh>

    <!-- Redeem Modal -->
    <div v-if="showRedeemModal" class="modal-overlay" @click.self="showRedeemModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>แลกรางวัล</h3>
          <button @click="showRedeemModal = false" class="close-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="modal-body" v-if="selectedReward">
          <div class="reward-preview">
            <div class="reward-preview-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
              </svg>
            </div>
            <h4>{{ selectedReward.name_th }}</h4>
            <p>{{ selectedReward.description_th }}</p>
            <div class="redeem-cost">
              <span>ใช้แต้ม</span>
              <strong>{{ selectedReward.points_required.toLocaleString() }}</strong>
            </div>
            <div class="points-after">
              <span>แต้มคงเหลือหลังแลก</span>
              <strong>{{ (currentPoints - selectedReward.points_required).toLocaleString() }}</strong>
            </div>
          </div>
        </div>
        <button 
          @click="confirmRedeem" 
          :disabled="redeeming || !canRedeem(selectedReward)" 
          class="btn-primary"
        >
          {{ redeeming ? 'กำลังแลก...' : canRedeem(selectedReward) ? 'ยืนยันแลกรางวัล' : 'แต้มไม่เพียงพอ' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loyalty-page { min-height: 100vh; background: #F6F6F6; padding-bottom: 100px; }
.content-container { max-width: 480px; margin: 0 auto; padding: 0 16px; }
.page-header { display: flex; align-items: center; gap: 12px; padding: 16px 0; }
.back-btn { width: 40px; height: 40px; background: none; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.back-btn svg { width: 24px; height: 24px; }
.page-header h1 { font-size: 20px; font-weight: 600; }

/* Points Card */
.points-card { background: #000; color: #fff; border-radius: 20px; padding: 24px; margin-bottom: 20px; }
.tier-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
.tier-badge svg { width: 16px; height: 16px; }
.points-display { text-align: center; margin-bottom: 20px; }
.points-label { display: block; font-size: 14px; opacity: 0.8; margin-bottom: 4px; }
.points-value { font-size: 48px; font-weight: 700; }
.points-unit { font-size: 16px; opacity: 0.8; margin-left: 4px; }
.tier-progress { margin-bottom: 20px; }
.progress-info { font-size: 13px; opacity: 0.8; margin-bottom: 8px; }
.progress-bar { height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: #fff; border-radius: 3px; transition: width 0.3s ease; }
.benefits-list { border-top: 1px solid rgba(255,255,255,0.2); padding-top: 16px; }
.benefits-title { display: block; font-size: 12px; opacity: 0.7; margin-bottom: 8px; }
.benefit-item { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 6px; }
.benefit-item svg { width: 16px; height: 16px; color: #4ade80; }

/* Tabs */
.tabs { display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; }
.tab { padding: 10px 16px; background: #fff; border: 1px solid #E5E5E5; border-radius: 20px; font-size: 14px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: all 0.2s; }
.tab.active { background: #000; color: #fff; border-color: #000; }
.tab-content { min-height: 200px; }

/* Rewards Grid */
.rewards-grid { display: flex; flex-direction: column; gap: 12px; }
.reward-card { display: flex; align-items: center; gap: 12px; padding: 16px; background: #fff; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
.reward-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.reward-icon { width: 48px; height: 48px; background: #F6F6F6; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.reward-icon svg { width: 24px; height: 24px; }
.reward-info { flex: 1; }
.reward-name { display: block; font-size: 15px; font-weight: 600; margin-bottom: 2px; }
.reward-desc { font-size: 13px; color: #6B6B6B; }
.reward-points { font-size: 13px; font-weight: 600; color: #6B6B6B; white-space: nowrap; }
.reward-points.affordable { color: #000; }

/* My Rewards */
.my-rewards-list { display: flex; flex-direction: column; gap: 12px; }
.my-reward-card { display: flex; align-items: center; justify-content: space-between; padding: 16px; background: #fff; border-radius: 12px; }
.my-reward-card.used, .my-reward-card.expired { opacity: 0.6; }
.my-reward-info { display: flex; flex-direction: column; gap: 2px; }
.my-reward-name { font-size: 15px; font-weight: 600; }
.my-reward-code { font-size: 13px; color: #6B6B6B; font-family: monospace; }
.my-reward-expires { font-size: 12px; color: #6B6B6B; }
.status-badge { font-size: 12px; padding: 4px 10px; border-radius: 12px; font-weight: 500; }
.status-badge.active { background: rgba(39,110,241,0.1); color: #276EF1; }
.status-badge.used { background: #F6F6F6; color: #6B6B6B; }
.status-badge.expired { background: rgba(225,25,0,0.1); color: #E11900; }

/* Transactions */
.transactions-list { display: flex; flex-direction: column; gap: 8px; }
.transaction-item { display: flex; align-items: center; gap: 12px; padding: 14px; background: #fff; border-radius: 12px; }
.tx-icon { width: 40px; height: 40px; background: #F6F6F6; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.tx-icon svg { width: 20px; height: 20px; }
.tx-info { flex: 1; }
.tx-desc { display: block; font-size: 14px; font-weight: 500; }
.tx-date { font-size: 12px; color: #6B6B6B; }
.tx-points { font-size: 15px; font-weight: 600; color: #6B6B6B; }
.tx-points.positive { color: #000; }

/* Tiers Section */
.tiers-section { margin-top: 24px; padding: 20px; background: #fff; border-radius: 16px; }
.tiers-section h3 { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
.tiers-list { display: flex; flex-direction: column; gap: 12px; }
.tier-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 8px; transition: all 0.2s; }
.tier-item.current { background: #F6F6F6; }
.tier-dot { width: 12px; height: 12px; border-radius: 50%; }
.tier-info { flex: 1; }
.tier-name { display: block; font-size: 14px; font-weight: 600; }
.tier-points { font-size: 12px; color: #6B6B6B; }
.tier-multiplier { font-size: 14px; font-weight: 600; color: #6B6B6B; }

/* Empty State */
.empty-state { text-align: center; padding: 48px 24px; color: #6B6B6B; }
.empty-state svg { width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.5; }
.empty-state p { font-size: 16px; font-weight: 500; margin-bottom: 4px; }
.empty-state span { font-size: 13px; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; z-index: 1000; }
.modal-content { width: 100%; max-width: 480px; margin: 0 auto; background: #fff; border-radius: 20px 20px 0 0; padding: 20px; padding-bottom: calc(20px + env(safe-area-inset-bottom)); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.modal-header h3 { font-size: 18px; font-weight: 600; }
.close-btn { width: 36px; height: 36px; background: #F6F6F6; border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.close-btn svg { width: 20px; height: 20px; }
.reward-preview { text-align: center; padding: 20px 0; }
.reward-preview-icon { width: 64px; height: 64px; background: #F6F6F6; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
.reward-preview-icon svg { width: 32px; height: 32px; }
.reward-preview h4 { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
.reward-preview p { font-size: 14px; color: #6B6B6B; margin-bottom: 20px; }
.redeem-cost, .points-after { display: flex; justify-content: space-between; padding: 12px 0; border-top: 1px solid #E5E5E5; }
.redeem-cost span, .points-after span { color: #6B6B6B; }
.redeem-cost strong, .points-after strong { font-size: 18px; }
.btn-primary { width: 100%; padding: 16px; background: #000; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 500; cursor: pointer; margin-top: 16px; }
.btn-primary:disabled { background: #CCC; }
</style>
