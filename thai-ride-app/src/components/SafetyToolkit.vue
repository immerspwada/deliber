<script setup lang="ts">
/**
 * Feature: F298 - Safety Toolkit
 * Safety features quick access panel
 */
defineProps<{
  visible: boolean
  tripActive?: boolean
}>()

const emit = defineEmits<{
  'close': []
  'sos': []
  'share-trip': []
  'call-support': []
  'report-issue': []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="slide">
      <div v-if="visible" class="sheet-overlay" @click="emit('close')">
        <div class="sheet-content" @click.stop>
          <div class="sheet-handle"></div>
          
          <div class="header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <h3>ความปลอดภัย</h3>
          </div>
          
          <div class="tools-grid">
            <button type="button" class="tool-btn sos" @click="emit('sos')">
              <div class="icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
              </div>
              <span class="label">SOS ฉุกเฉิน</span>
              <span class="desc">โทรหาหน่วยกู้ชีพ</span>
            </button>
            
            <button v-if="tripActive" type="button" class="tool-btn" @click="emit('share-trip')">
              <div class="icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </div>
              <span class="label">แชร์การเดินทาง</span>
              <span class="desc">ส่งตำแหน่งให้คนใกล้ชิด</span>
            </button>
            
            <button type="button" class="tool-btn" @click="emit('call-support')">
              <div class="icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
                </svg>
              </div>
              <span class="label">ติดต่อฝ่ายช่วยเหลือ</span>
              <span class="desc">พูดคุยกับเจ้าหน้าที่</span>
            </button>
            
            <button type="button" class="tool-btn" @click="emit('report-issue')">
              <div class="icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <span class="label">รายงานปัญหา</span>
              <span class="desc">แจ้งเหตุการณ์ผิดปกติ</span>
            </button>
          </div>
          
          <div class="tips">
            <p>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              ทีมงานพร้อมช่วยเหลือคุณตลอด 24 ชั่วโมง
            </p>
          </div>
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
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: #e5e5e5;
  border-radius: 2px;
  margin: 0 auto 16px;
}

.header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 16px;
  background: #f6f6f6;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  text-align: center;
}

.tool-btn.sos {
  background: #ffe5e5;
}

.tool-btn.sos .icon {
  background: #e11900;
  color: #fff;
}

.icon {
  width: 56px;
  height: 56px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.label {
  font-size: 14px;
  font-weight: 600;
  color: #000;
}

.desc {
  font-size: 11px;
  color: #6b6b6b;
  margin-top: 2px;
}

.tips {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e5e5e5;
}

.tips p {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b6b6b;
  margin: 0;
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
