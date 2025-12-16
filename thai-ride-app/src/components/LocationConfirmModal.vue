<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  show: boolean
  type: 'pickup' | 'destination'
  address: string
  fullAddress: string
  lat: number
  lng: number
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
  (e: 'edit'): void
}>()

// Static map URL using OpenStreetMap
const staticMapUrl = computed(() => {
  const zoom = 17
  const width = 400
  const height = 200
  // Use OpenStreetMap static map service
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${props.lat},${props.lng}&zoom=${zoom}&size=${width}x${height}&markers=${props.lat},${props.lng},red`
})

const typeLabel = computed(() => props.type === 'pickup' ? 'จุดรับ' : 'จุดหมาย')
const typeIcon = computed(() => props.type === 'pickup' ? 'pickup' : 'destination')
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click.self="emit('cancel')">
        <div class="modal-content">
          <!-- Header -->
          <div class="modal-header">
            <h3>ยืนยัน{{ typeLabel }}</h3>
            <button class="close-btn" @click="emit('cancel')">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Mini Map Preview -->
          <div class="map-preview">
            <img :src="staticMapUrl" alt="Location preview" class="map-image" />
            <div :class="['map-marker', typeIcon]">
              <svg v-if="type === 'pickup'" width="32" height="32" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="12" fill="#22C55E"/>
                <circle cx="24" cy="24" r="6" fill="#fff"/>
              </svg>
              <svg v-else width="24" height="32" viewBox="0 0 24 32">
                <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z" fill="#EF4444"/>
                <circle cx="12" cy="12" r="4" fill="#fff"/>
              </svg>
            </div>
          </div>

          <!-- Address Info -->
          <div class="address-section">
            <div class="address-icon">
              <svg v-if="type === 'pickup'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" stroke-width="2"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2v2m0 16v2M2 12h2m16 0h2"/>
              </svg>
              <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <div class="address-text">
              <span class="address-main">{{ address }}</span>
              <span class="address-full">{{ fullAddress }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="modal-actions">
            <button class="btn-secondary" @click="emit('edit')">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
              </svg>
              แก้ไขตำแหน่ง
            </button>
            <button class="btn-primary" @click="emit('confirm')">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              ยืนยันตำแหน่ง
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
  align-items: flex-end;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
}

.modal-content {
  background: #fff;
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 20px 16px;
  border-bottom: 1px solid #E5E5E5;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #000;
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F6F6F6;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s;
}

.close-btn:hover { background: #E5E5E5; }
.close-btn svg { width: 20px; height: 20px; }

/* Map Preview */
.map-preview {
  position: relative;
  width: 100%;
  height: 180px;
  background: #F6F6F6;
  overflow: hidden;
}

.map-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.map-marker {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: markerBounce 0.5s ease;
}

.map-marker.destination {
  transform: translate(-50%, -100%);
}

@keyframes markerBounce {
  0% { transform: translate(-50%, -150%) scale(0.5); opacity: 0; }
  60% { transform: translate(-50%, -45%) scale(1.1); }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}

.map-marker.destination {
  animation: markerBounceDest 0.5s ease;
}

@keyframes markerBounceDest {
  0% { transform: translate(-50%, -200%) scale(0.5); opacity: 0; }
  60% { transform: translate(-50%, -95%) scale(1.1); }
  100% { transform: translate(-50%, -100%) scale(1); opacity: 1; }
}

/* Address Section */
.address-section {
  display: flex;
  gap: 14px;
  padding: 20px;
  border-bottom: 1px solid #E5E5E5;
}

.address-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F6F6F6;
  border-radius: 12px;
  flex-shrink: 0;
}

.address-icon svg {
  width: 22px;
  height: 22px;
  color: #000;
}

.address-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.address-main {
  font-size: 16px;
  font-weight: 600;
  color: #000;
}

.address-full {
  font-size: 13px;
  color: #6B6B6B;
  line-height: 1.4;
}

/* Actions */
.modal-actions {
  display: flex;
  gap: 12px;
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
}

.btn-secondary, .btn-primary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-secondary {
  background: #F6F6F6;
  color: #000;
}

.btn-secondary:hover { background: #E5E5E5; }
.btn-secondary:active { transform: scale(0.98); }

.btn-primary {
  background: #000;
  color: #fff;
}

.btn-primary:hover { background: #333; }
.btn-primary:active { transform: scale(0.98); }

.btn-secondary svg, .btn-primary svg {
  width: 18px;
  height: 18px;
}

/* Modal Transition */
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-content, .modal-leave-active .modal-content {
  transition: transform 0.3s ease;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content, .modal-leave-to .modal-content {
  transform: translateY(100%);
}
</style>
