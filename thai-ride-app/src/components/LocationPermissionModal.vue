<script setup lang="ts">
defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'allow'): void
  (e: 'deny'): void
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click.self="emit('deny')">
        <div class="modal-content">
          <!-- Location Icon -->
          <div class="icon-wrapper">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>

          <h2 class="modal-title">อนุญาตเข้าถึงตำแหน่ง</h2>
          
          <p class="modal-description">
            GOBEAR ต้องการเข้าถึงตำแหน่งของคุณเพื่อ:
          </p>

          <ul class="feature-list">
            <li>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <span>ระบุจุดรับอัตโนมัติ</span>
            </li>
            <li>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <span>แสดงคนขับใกล้เคียง</span>
            </li>
            <li>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <span>คำนวณระยะทางและค่าโดยสาร</span>
            </li>
            <li>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <span>ติดตามการเดินทางแบบ real-time</span>
            </li>
          </ul>

          <p class="privacy-note">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            <span>ตำแหน่งของคุณจะถูกใช้เฉพาะขณะใช้งานแอปเท่านั้น</span>
          </p>

          <div class="modal-actions">
            <button class="btn-secondary" @click="emit('deny')">
              ไม่อนุญาต
            </button>
            <button class="btn-primary" @click="emit('allow')">
              อนุญาต
            </button>
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
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 9999;
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  max-width: 360px;
  width: 100%;
  text-align: center;
}

.icon-wrapper {
  width: 64px;
  height: 64px;
  background: #F6F6F6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.icon-wrapper svg {
  width: 32px;
  height: 32px;
  color: #000;
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #000;
  margin-bottom: 8px;
}

.modal-description {
  font-size: 14px;
  color: #6B6B6B;
  margin-bottom: 16px;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
  text-align: left;
}

.feature-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 14px;
  color: #000;
}

.feature-list li svg {
  width: 18px;
  height: 18px;
  color: #000;
  flex-shrink: 0;
}

.privacy-note {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #F6F6F6;
  border-radius: 8px;
  font-size: 12px;
  color: #6B6B6B;
  margin-bottom: 20px;
}

.privacy-note svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.btn-secondary {
  flex: 1;
  padding: 14px;
  background: #F6F6F6;
  color: #000;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: #E5E5E5;
}

.btn-primary {
  flex: 1;
  padding: 14px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #333;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
}
</style>
