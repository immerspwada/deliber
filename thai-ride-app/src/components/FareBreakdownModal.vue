<script setup lang="ts">
/**
 * Feature: F288 - Fare Breakdown Modal
 * Detailed fare breakdown in modal
 */
defineProps<{
  visible: boolean
  baseFare: number
  distanceFare: number
  timeFare: number
  surgeMultiplier?: number
  discount?: number
  tip?: number
  total: number
}>()

const emit = defineEmits<{
  'close': []
}>()

const formatPrice = (n: number) => '฿' + n.toFixed(2)
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="modal-overlay" @click="emit('close')">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>รายละเอียดค่าโดยสาร</h3>
            <button type="button" class="close-btn" @click="emit('close')">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="breakdown-list">
            <div class="item">
              <span class="label">ค่าโดยสารเริ่มต้น</span>
              <span class="value">{{ formatPrice(baseFare) }}</span>
            </div>
            <div class="item">
              <span class="label">ค่าระยะทาง</span>
              <span class="value">{{ formatPrice(distanceFare) }}</span>
            </div>
            <div class="item">
              <span class="label">ค่าเวลา</span>
              <span class="value">{{ formatPrice(timeFare) }}</span>
            </div>
            <div v-if="surgeMultiplier && surgeMultiplier > 1" class="item surge">
              <span class="label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
                </svg>
                Surge ({{ surgeMultiplier }}x)
              </span>
              <span class="value">+{{ formatPrice((baseFare + distanceFare + timeFare) * (surgeMultiplier - 1)) }}</span>
            </div>
            <div v-if="discount" class="item discount">
              <span class="label">ส่วนลด</span>
              <span class="value">-{{ formatPrice(discount) }}</span>
            </div>
            <div v-if="tip" class="item">
              <span class="label">ทิป</span>
              <span class="value">{{ formatPrice(tip) }}</span>
            </div>
          </div>
          
          <div class="total-row">
            <span class="label">รวมทั้งหมด</span>
            <span class="value">{{ formatPrice(total) }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.modal-content {
  width: 100%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 20px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  padding: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.item .label {
  color: #6b6b6b;
  display: flex;
  align-items: center;
  gap: 4px;
}

.item .value {
  font-weight: 500;
  color: #000;
}

.item.surge .label { color: #f5a623; }
.item.surge .value { color: #f5a623; }
.item.discount .value { color: #276ef1; }

.total-row {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e5e5;
}

.total-row .label {
  font-size: 16px;
  font-weight: 600;
}

.total-row .value {
  font-size: 20px;
  font-weight: 700;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
