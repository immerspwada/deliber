<script setup lang="ts">
/**
 * Component: RideShareETA
 * แชร์ตำแหน่งและเวลาถึงโดยประมาณให้คนที่รออยู่ปลายทาง
 */
import { ref, computed } from 'vue'

const props = defineProps<{
  rideId: string
  destinationName: string
  estimatedArrival: number // minutes
  currentLocation?: { lat: number; lng: number }
}>()

const isSharing = ref(false)
const shareLink = ref('')
const showShareOptions = ref(false)

// Generate share link
const generateShareLink = computed(() => {
  const baseUrl = window.location.origin
  return `${baseUrl}/track/${props.rideId}`
})

// Share message
const shareMessage = computed(() => {
  return `🚗 กำลังเดินทางไป ${props.destinationName}\n⏱️ ถึงประมาณ ${props.estimatedArrival} นาที\n📍 ติดตามตำแหน่ง: ${generateShareLink.value}`
})

// LINE share URL
const lineShareUrl = computed(() => {
  const text = encodeURIComponent(shareMessage.value)
  return `https://line.me/R/share?text=${text}`
})

async function handleShare(): Promise<void> {
  // Try native share first
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'แชร์ตำแหน่งการเดินทาง',
        text: shareMessage.value,
        url: generateShareLink.value
      })
      return
    } catch {
      // User cancelled or error, fall back to options
    }
  }
  
  // Show share options modal
  showShareOptions.value = true
}

function shareToLine(): void {
  window.open(lineShareUrl.value, '_blank')
  showShareOptions.value = false
}

async function copyLink(): Promise<void> {
  try {
    await navigator.clipboard.writeText(generateShareLink.value)
    alert('คัดลอกลิงก์แล้ว!')
  } catch {
    // Fallback
    const input = document.createElement('input')
    input.value = generateShareLink.value
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    alert('คัดลอกลิงก์แล้ว!')
  }
  showShareOptions.value = false
}

function closeShareOptions(): void {
  showShareOptions.value = false
}
</script>

<template>
  <div class="share-eta">
    <!-- Share Button -->
    <button class="share-btn" @click="handleShare">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      <span>แชร์ตำแหน่ง</span>
    </button>

    <!-- Share Options Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showShareOptions" class="share-modal-overlay" @click="closeShareOptions">
          <div class="share-modal" @click.stop>
            <div class="modal-header">
              <h3>แชร์ตำแหน่งการเดินทาง</h3>
              <button class="close-btn" @click="closeShareOptions" aria-label="ปิด">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="share-preview">
              <div class="preview-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div class="preview-info">
                <span class="preview-dest">{{ destinationName }}</span>
                <span class="preview-eta">ถึงประมาณ {{ estimatedArrival }} นาที</span>
              </div>
            </div>

            <div class="share-options">
              <button class="share-option line" @click="shareToLine">
                <div class="option-icon line-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                </div>
                <span>LINE</span>
              </button>

              <button class="share-option copy" @click="copyLink">
                <div class="option-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </div>
                <span>คัดลอกลิงก์</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.share-eta {
  display: inline-block;
}

.share-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #e8f5ef;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #00a86b;
  cursor: pointer;
  transition: all 0.2s;
}

.share-btn:active {
  transform: scale(0.98);
  background: #d0ebe0;
}

/* Modal */
.share-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.share-modal {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
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
  color: #1a1a1a;
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f5f5f5;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  cursor: pointer;
}

/* Preview */
.share-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
  margin-bottom: 20px;
}

.preview-icon {
  width: 48px;
  height: 48px;
  background: #e8f5ef;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00a86b;
}

.preview-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-dest {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
}

.preview-eta {
  font-size: 13px;
  color: #666;
}

/* Share Options */
.share-options {
  display: flex;
  gap: 12px;
}

.share-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: #f5f5f5;
  border: none;
  border-radius: 12px;
  font-size: 13px;
  color: #1a1a1a;
  cursor: pointer;
  transition: all 0.2s;
}

.share-option:active {
  transform: scale(0.98);
}

.option-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.share-option.line .option-icon {
  background: #00B900;
  color: #fff;
}

.share-option.copy .option-icon {
  background: #1976d2;
  color: #fff;
}

/* Modal Animation */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .share-modal,
.modal-leave-to .share-modal {
  transform: translateY(100%);
}
</style>
