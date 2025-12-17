<script setup lang="ts">
/**
 * Feature: F289 - Payment Method Selector
 * Payment method selection sheet
 */
interface PaymentMethod {
  id: string
  type: 'cash' | 'card' | 'wallet' | 'promptpay'
  label: string
  sublabel?: string
  icon?: string
  default?: boolean
}

const props = defineProps<{
  visible: boolean
  methods: PaymentMethod[]
  selected?: string
}>()

const emit = defineEmits<{
  'close': []
  'select': [method: PaymentMethod]
  'add-new': []
}>()

const icons: Record<string, string> = {
  cash: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  card: 'M1 4h22v16H1zM1 10h22',
  wallet: 'M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2zM16 12a2 2 0 100 4 2 2 0 000-4z',
  promptpay: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'
}
</script>

<template>
  <Teleport to="body">
    <Transition name="slide">
      <div v-if="visible" class="sheet-overlay" @click="emit('close')">
        <div class="sheet-content" @click.stop>
          <div class="sheet-handle"></div>
          <h3 class="sheet-title">เลือกวิธีชำระเงิน</h3>
          
          <div class="methods-list">
            <button
              v-for="method in methods"
              :key="method.id"
              type="button"
              class="method-item"
              :class="{ selected: method.id === selected }"
              @click="emit('select', method)"
            >
              <div class="method-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path :d="icons[method.type]"/>
                </svg>
              </div>
              <div class="method-info">
                <span class="method-label">{{ method.label }}</span>
                <span v-if="method.sublabel" class="method-sublabel">{{ method.sublabel }}</span>
              </div>
              <div v-if="method.default" class="default-badge">ค่าเริ่มต้น</div>
              <div v-if="method.id === selected" class="check-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
              </div>
            </button>
          </div>
          
          <button type="button" class="add-btn" @click="emit('add-new')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            เพิ่มวิธีชำระเงินใหม่
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.sheet-content {
  width: 100%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 12px 20px 24px;
  max-height: 70vh;
  overflow-y: auto;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: #e5e5e5;
  border-radius: 2px;
  margin: 0 auto 16px;
}

.sheet-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px;
}

.methods-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.method-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  background: #f6f6f6;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
}

.method-item.selected {
  border-color: #000;
  background: #fff;
}

.method-icon {
  width: 44px;
  height: 44px;
  background: #fff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.method-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.method-label {
  font-size: 15px;
  font-weight: 500;
  color: #000;
}

.method-sublabel {
  font-size: 12px;
  color: #6b6b6b;
}

.default-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: #e5e5e5;
  border-radius: 4px;
  color: #6b6b6b;
}

.check-icon {
  color: #000;
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  margin-top: 16px;
  background: transparent;
  border: 1px dashed #e5e5e5;
  border-radius: 12px;
  font-size: 14px;
  color: #6b6b6b;
  cursor: pointer;
}

.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
}

.slide-enter-from .sheet-content,
.slide-leave-to .sheet-content {
  transform: translateY(100%);
}
</style>
