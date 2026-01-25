<template>
  <section class="tabs-section">
    <div class="tabs">
      <button
        :class="['tab', { active: modelValue === 'transactions' }]"
        type="button"
        @click="emit('update:modelValue', 'transactions')"
      >
        ประวัติ
      </button>
      <button
        :class="['tab', { active: modelValue === 'topup' }]"
        type="button"
        @click="emit('update:modelValue', 'topup')"
      >
        เติมเงิน
      </button>
      <button
        :class="['tab', { active: modelValue === 'withdraw' }]"
        type="button"
        @click="emit('update:modelValue', 'withdraw')"
      >
        ถอนเงิน
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
type TabType = 'transactions' | 'topup' | 'withdraw'

interface Props {
  modelValue: TabType
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: TabType]
}>()
</script>

<style scoped>
.tabs-section {
  padding: 0 16px 16px;
}

.tabs {
  display: flex;
  background: #fff;
  border-radius: 12px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.tab {
  flex: 1;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab.active {
  background: #00A86B;
  color: #fff;
}

.tab:hover:not(.active) {
  background: #f3f4f6;
}
</style>
