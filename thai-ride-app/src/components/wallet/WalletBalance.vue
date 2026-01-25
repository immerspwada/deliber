<template>
  <div class="balance-card">
    <div class="balance-label">ยอดเงินคงเหลือ</div>
    <div class="balance-amount">
      <span v-if="!loading">{{ formattedBalance }}</span>
      <span v-else class="loading-text">กำลังโหลด...</span>
    </div>
    <div class="balance-actions">
      <button class="action-btn topup-btn" type="button" @click="emit('topup')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 6v12M6 12h12"/>
        </svg>
        <span>เติมเงิน</span>
      </button>
      <button class="action-btn withdraw-btn" type="button" @click="emit('withdraw')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
        </svg>
        <span>ถอนเงิน</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  formattedBalance: string
  loading?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  topup: []
  withdraw: []
}>()
</script>

<style scoped>
.balance-card {
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  border-radius: 20px;
  padding: 24px;
  color: #fff;
  box-shadow: 0 8px 24px rgba(0, 168, 107, 0.3);
}

.balance-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.balance-amount {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 24px;
}

.loading-text {
  font-size: 20px;
  opacity: 0.7;
}

.balance-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn svg {
  width: 20px;
  height: 20px;
}

.topup-btn {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.topup-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.withdraw-btn {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.withdraw-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
