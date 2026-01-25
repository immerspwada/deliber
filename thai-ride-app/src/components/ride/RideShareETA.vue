<script setup lang="ts">
/**
 * Component: RideShareETA
 * ปุ่มแชร์ ETA และลิงก์ติดตามการเดินทาง
 */
import { ref, onMounted } from 'vue'
import { useShareTrip } from '../../composables/useShareTrip'

const props = defineProps<{
  rideId: string
  destinationName?: string
  estimatedArrival?: number
  currentLocation?: { lat: number; lng: number }
}>()

const {
  shareUrl,
  loading,
  hasShareLink,
  createShareLink,
  shareViaSystem,
  shareViaLine,
  copyToClipboard,
  checkExistingLink
} = useShareTrip(props.rideId)

const showShareMenu = ref(false)
const copied = ref(false)
const shareSuccess = ref(false)

// Toggle share menu
function toggleShareMenu(): void {
  showShareMenu.value = !showShareMenu.value
}

// Close menu when clicking outside
function closeMenu(): void {
  showShareMenu.value = false
}

// Handle share button click
async function handleShare(): Promise<void> {
  if (!hasShareLink.value) {
    await createShareLink()
  }
  toggleShareMenu()
}

// Share via system (Web Share API or clipboard)
async function handleSystemShare(): Promise<void> {
  const message = props.destinationName 
    ? `กำลังเดินทางไป ${props.destinationName}${props.estimatedArrival ? ` (ถึงใน ${props.estimatedArrival} นาที)` : ''}`
    : 'ติดตามการเดินทางของฉัน'
  
  const success = await shareViaSystem(message)
  if (success) {
    shareSuccess.value = true
    setTimeout(() => {
      shareSuccess.value = false
      closeMenu()
    }, 1500)
  }
}

// Copy link
async function handleCopy(): Promise<void> {
  const success = await copyToClipboard()
  if (success) {
    copied.value = true
    setTimeout(() => {
      copied.value = false
      closeMenu()
    }, 1500)
  }
}

// Share via LINE
function handleLineShare(): void {
  shareViaLine()
  closeMenu()
}

// Check for existing link on mount
onMounted(() => {
  checkExistingLink()
})
</script>

<template>
  <div class="share-eta-wrapper">
    <!-- Share Button -->
    <button 
      type="button"
      class="share-btn"
      :class="{ 'has-link': hasShareLink }"
      :disabled="loading"
      aria-label="แชร์การเดินทาง"
      @click="handleShare"
    >
      <svg v-if="loading" class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
        <path d="M12 2a10 10 0 0110 10" stroke-linecap="round" />
      </svg>
      <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      <span>แชร์</span>
    </button>

    <!-- Share Menu Dropdown -->
    <Transition name="fade-scale">
      <div v-if="showShareMenu" class="share-menu">
        <!-- Backdrop -->
        <div class="share-backdrop" @click="closeMenu"></div>
        
        <!-- Menu Content -->
        <div class="share-menu-content">
          <div class="share-header">
            <span class="share-title">แชร์การเดินทาง</span>
            <button type="button" class="close-btn" aria-label="ปิด" @click="closeMenu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <!-- Share URL Preview -->
          <div v-if="shareUrl" class="share-url-preview">
            <span class="url-text">{{ shareUrl }}</span>
          </div>

          <!-- Share Options -->
          <div class="share-options">
            <!-- System Share -->
            <button type="button" class="share-option" @click="handleSystemShare">
              <div class="option-icon system">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </div>
              <span>{{ shareSuccess ? 'แชร์แล้ว!' : 'แชร์' }}</span>
            </button>

            <!-- LINE Share -->
            <button type="button" class="share-option" @click="handleLineShare">
              <div class="option-icon line">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                </svg>
              </div>
              <span>LINE</span>
            </button>

            <!-- Copy Link -->
            <button type="button" class="share-option" @click="handleCopy">
              <div class="option-icon copy" :class="{ copied }">
                <svg v-if="!copied" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span>{{ copied ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์' }}</span>
            </button>
          </div>

          <!-- Info Text -->
          <p class="share-info">
            ลิงก์จะหมดอายุใน 24 ชั่วโมง
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.share-eta-wrapper {
  position: relative;
}

.share-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;
}

.share-btn:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
}

.share-btn:active {
  transform: scale(0.98);
}

.share-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.share-btn.has-link {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
}

.share-btn.has-link:hover {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
}

/* Share Menu */
.share-menu {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.share-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.share-menu-content {
  position: relative;
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  animation: slide-up 0.3s ease-out;
}

@keyframes slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.share-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.share-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: none;
  border-radius: 50%;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e8e8e8;
}

/* URL Preview */
.share-url-preview {
  padding: 12px;
  background: #f5f5f5;
  border-radius: 10px;
  margin-bottom: 16px;
  overflow: hidden;
}

.url-text {
  font-size: 12px;
  color: #666;
  word-break: break-all;
  font-family: 'SF Mono', 'Menlo', monospace;
}

/* Share Options */
.share-options {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.share-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  background: #f5f5f5;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;
}

.share-option:hover {
  background: #e8e8e8;
}

.share-option:active {
  transform: scale(0.98);
}

.share-option span {
  font-size: 12px;
  font-weight: 500;
  color: #333;
}

.option-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.option-icon.system {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
}

.option-icon.line {
  background: #06c755;
  color: #fff;
}

.option-icon.copy {
  background: #f5f5f5;
  border: 2px solid #e0e0e0;
  color: #666;
}

.option-icon.copy.copied {
  background: #22c55e;
  border-color: #22c55e;
  color: #fff;
}

/* Info Text */
.share-info {
  font-size: 12px;
  color: #999;
  text-align: center;
  margin: 0;
}

/* Transitions */
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.3s ease;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
}

.fade-scale-enter-from .share-menu-content,
.fade-scale-leave-to .share-menu-content {
  transform: translateY(100%);
}

/* Spin animation */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
