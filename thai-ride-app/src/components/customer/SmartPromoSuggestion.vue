<template>
  <div v-if="bestPromo" class="smart-promo-banner">
    <!-- Loading State -->
    <div v-if="loading" class="promo-loading">
      <div class="spinner"></div>
      <p>กำลังหาโปรโมชั่นที่ดีที่สุด...</p>
    </div>

    <!-- Best Promo -->
    <div v-else class="promo-content">
      <div class="promo-icon">
        <span class="icon">🎁</span>
        <span v-if="bestPromo.score >= 80" class="badge hot">HOT</span>
        <span v-else-if="bestPromo.score >= 60" class="badge good">แนะนำ</span>
      </div>

      <div class="promo-info">
        <h3 class="promo-title">
          ประหยัด ฿{{ bestPromo.discount.toLocaleString() }}!
        </h3>
        <p class="promo-desc">{{ bestPromo.description }}</p>
        
        <div class="promo-details">
          <span class="detail-item">
            <span class="icon">💰</span>
            {{ formatDiscount(bestPromo) }}
          </span>
          <span v-if="daysLeft <= 3" class="detail-item urgent">
            <span class="icon">⏰</span>
            เหลือ {{ daysLeft }} วัน
          </span>
        </div>
      </div>

      <button 
        class="apply-btn" 
        :disabled="applying"
        @click="() => handleApply()"
      >
        <span v-if="applying">กำลังใช้...</span>
        <span v-else>ใช้เลย</span>
      </button>
    </div>

    <!-- More Promos -->
    <button 
      v-if="rankedPromos.length > 1" 
      class="more-promos-btn"
      @click="showAllPromos = true"
    >
      ดูโปรโมชั่นอื่น ({{ rankedPromos.length - 1 }})
    </button>

    <!-- All Promos Modal -->
    <Teleport to="body">
      <div v-if="showAllPromos" class="promo-modal-overlay" @click="showAllPromos = false">
        <div class="promo-modal" @click.stop>
          <div class="modal-header">
            <h2>โปรโมชั่นทั้งหมด</h2>
            <button class="close-btn" @click="showAllPromos = false">✕</button>
          </div>

          <div class="modal-body">
            <div 
              v-for="promo in rankedPromos" 
              :key="promo.id"
              class="promo-card"
              :class="{ 'is-best': promo.id === bestPromo?.id }"
            >
              <div class="card-header">
                <div class="promo-badge">
                  <span v-if="promo.score >= 80">⭐ แนะนำสูงสุด</span>
                  <span v-else-if="promo.score >= 60">👍 แนะนำ</span>
                  <span v-else>💡 ใช้ได้</span>
                </div>
                <div class="discount-amount">
                  -฿{{ promo.discount.toLocaleString() }}
                </div>
              </div>

              <h4 class="promo-name">{{ promo.code }}</h4>
              <p class="promo-description">{{ promo.description }}</p>

              <div class="promo-meta">
                <span class="meta-item">
                  {{ formatDiscount(promo) }}
                </span>
                <span v-if="promo.min_fare" class="meta-item">
                  ขั้นต่ำ ฿{{ promo.min_fare }}
                </span>
              </div>

              <button 
                class="use-btn" 
                :disabled="applying"
                @click="() => handleApply(promo.code)"
              >
                ใช้โค้ดนี้
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSmartPromo } from '@/composables/useSmartPromo'

interface Props {
  serviceType: string
  estimatedFare: number
  pickup?: { lat: number; lng: number }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  applied: [{ code: string; discount: number; finalFare: number }]
}>()

const { bestPromo, rankedPromos, loading, applyPromo } = useSmartPromo({
  serviceType: props.serviceType,
  fare: props.estimatedFare,
  location: props.pickup,
})

const applying = ref(false)
const showAllPromos = ref(false)

const daysLeft = computed(() => {
  if (!bestPromo.value) return 0
  return Math.ceil(
    (new Date(bestPromo.value.valid_until).getTime() - Date.now()) / 
    (1000 * 60 * 60 * 24)
  )
})

const formatDiscount = (promo: any) => {
  if (promo.discount_type === 'percentage') {
    return `ลด ${promo.discount_value}%`
  }
  return `ลด ฿${promo.discount_value}`
}

const handleApply = async (code?: string) => {
  applying.value = true
  try {
    const promoCode = code || bestPromo.value?.code
    if (!promoCode) return

    const result = await applyPromo(promoCode)
    if (result) {
      emit('applied', {
        code: promoCode,
        discount: result.discount,
        finalFare: result.finalFare,
      })
      showAllPromos.value = false
    }
  } finally {
    applying.value = false
  }
}
</script>

<style scoped>
.smart-promo-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 16px;
  margin: 16px 0;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.promo-loading {
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.promo-content {
  display: flex;
  align-items: center;
  gap: 16px;
  color: white;
}

.promo-icon {
  position: relative;
  flex-shrink: 0;
}

.promo-icon .icon {
  font-size: 48px;
  display: block;
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.promo-icon .badge {
  position: absolute;
  top: -4px;
  right: -4px;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.badge.hot {
  background: #ff4757;
  animation: pulse 1.5s ease-in-out infinite;
}

.badge.good {
  background: #ffa502;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.promo-info {
  flex: 1;
}

.promo-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px 0;
}

.promo-desc {
  font-size: 14px;
  opacity: 0.9;
  margin: 0 0 8px 0;
}

.promo-details {
  display: flex;
  gap: 12px;
  font-size: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
}

.detail-item.urgent {
  background: #ff4757;
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.apply-btn {
  padding: 12px 24px;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.apply-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
}

.apply-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.more-promos-btn {
  margin-top: 12px;
  width: 100%;
  padding: 8px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.more-promos-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Modal Styles */
.promo-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.promo-modal {
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f3f4f6;
  border-radius: 8px;
  cursor: pointer;
  font-size: 20px;
  color: #6b7280;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e5e7eb;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.promo-card {
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.2s;
}

.promo-card.is-best {
  border-color: #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
}

.promo-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.promo-badge {
  font-size: 12px;
  font-weight: 600;
}

.discount-amount {
  font-size: 20px;
  font-weight: 700;
  color: #667eea;
}

.promo-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: #1f2937;
}

.promo-description {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 12px 0;
}

.promo-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.meta-item {
  font-size: 12px;
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 6px;
  color: #6b7280;
}

.use-btn {
  width: 100%;
  padding: 10px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.use-btn:hover:not(:disabled) {
  background: #5568d3;
}

.use-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Mobile Responsive */
@media (max-width: 640px) {
  .promo-content {
    flex-direction: column;
    text-align: center;
  }

  .apply-btn {
    width: 100%;
  }

  .promo-modal {
    max-height: 90vh;
  }
}
</style>
