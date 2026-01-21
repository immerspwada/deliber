<script setup lang="ts">
/**
 * SmartSuggestionsCard - AI-Powered Suggestions Display
 * Feature: F270 - Smart Suggestions UI
 * MUNEEF Style: สีเขียว #00A86B
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSmartSuggestions, type SmartSuggestion } from '../../composables/useSmartSuggestions'
import { useHapticFeedback } from '../../composables/useHapticFeedback'
import { useRideStore } from '../../stores/ride'

const router = useRouter()
const rideStore = useRideStore()
const { vibrate } = useHapticFeedback()
const { 
  topSuggestions, 
  isAnalyzing, 
  generateSuggestions, 
  dismissSuggestion,
  trackSuggestionClick,
  cleanup 
} = useSmartSuggestions()

const dismissedIds = ref<Set<string>>(new Set())

const visibleSuggestions = computed(() => {
  return topSuggestions.value.filter(s => !dismissedIds.value.has(s.id))
})

const handleSuggestionClick = async (suggestion: SmartSuggestion) => {
  vibrate('medium')
  await trackSuggestionClick(suggestion)
  
  switch (suggestion.action.type) {
    case 'navigate':
      if (suggestion.action.route) {
        router.push(suggestion.action.route)
      }
      break
    case 'prefill':
      if (suggestion.action.data?.destination) {
        rideStore.setDestination(suggestion.action.data.destination)
      }
      if (suggestion.action.route) {
        router.push(suggestion.action.route)
      }
      break
    case 'apply_promo':
      if (suggestion.action.data?.code) {
        localStorage.setItem('pending_promo', suggestion.action.data.code)
      }
      router.push('/customer/ride')
      break
  }
}

const handleDismiss = (e: Event, suggestionId: string) => {
  e.stopPropagation()
  vibrate('light')
  dismissedIds.value.add(suggestionId)
  dismissSuggestion(suggestionId)
}

onMounted(() => { generateSuggestions() })
onUnmounted(() => { cleanup() })
</script>

<template>
  <section v-if="visibleSuggestions.length > 0" class="suggestions-section">
    <div class="section-header">
      <div class="header-left">
        <div class="ai-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z"/>
            <circle cx="7.5" cy="14.5" r="1.5"/>
            <circle cx="16.5" cy="14.5" r="1.5"/>
          </svg>
        </div>
        <h3 class="section-title">แนะนำสำหรับคุณ</h3>
      </div>
      <span v-if="isAnalyzing" class="analyzing-badge">
        <span class="dot"></span>
        กำลังวิเคราะห์
      </span>
    </div>

    <div class="suggestions-list">
      <div
        v-for="suggestion in visibleSuggestions"
        :key="suggestion.id"
        class="suggestion-card"
        role="button"
        tabindex="0"
        :style="{ '--accent': suggestion.iconColor }"
        @click="handleSuggestionClick(suggestion)"
        @keydown.enter="handleSuggestionClick(suggestion)"
      >
        <div class="suggestion-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path :d="suggestion.icon" />
          </svg>
        </div>
        <div class="suggestion-content">
          <span class="suggestion-title">{{ suggestion.title }}</span>
          <span class="suggestion-subtitle">{{ suggestion.subtitle }}</span>
        </div>
        <div class="confidence-bar" :style="{ width: `${suggestion.confidence * 100}%` }"></div>
        <button class="dismiss-btn" @click="(e) => handleDismiss(e, suggestion.id)" aria-label="ปิด">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        <div class="suggestion-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.suggestions-section { padding: 0 20px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.header-left { display: flex; align-items: center; gap: 8px; }
.ai-badge { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%); border-radius: 6px; }
.ai-badge svg { width: 14px; height: 14px; color: #FFFFFF; }
.section-title { font-size: 16px; font-weight: 600; color: #1A1A1A; margin: 0; }
.analyzing-badge { display: flex; align-items: center; gap: 6px; padding: 4px 10px; background: #E8F5EF; border-radius: 8px; font-size: 11px; font-weight: 500; color: #00A86B; }
.analyzing-badge .dot { width: 6px; height: 6px; background: #00A86B; border-radius: 50%; animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
.suggestions-list { display: flex; flex-direction: column; gap: 10px; }
.suggestion-card { position: relative; display: flex; align-items: center; gap: 14px; width: 100%; padding: 14px 16px; background: #FFFFFF; border: 2px solid #F0F0F0; border-radius: 16px; cursor: pointer; text-align: left; overflow: hidden; transition: all 0.2s ease; }
.suggestion-card:hover { border-color: var(--accent); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08); }
.suggestion-card:active { transform: scale(0.98); }
.suggestion-icon { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: #E8F5EF; border-radius: 12px; flex-shrink: 0; }
.suggestion-icon svg { width: 22px; height: 22px; color: var(--accent, #00A86B); }
.suggestion-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.suggestion-title { font-size: 15px; font-weight: 600; color: #1A1A1A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.suggestion-subtitle { font-size: 13px; color: #666666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.confidence-bar { position: absolute; bottom: 0; left: 0; height: 3px; background: linear-gradient(90deg, var(--accent, #00A86B) 0%, transparent 100%); opacity: 0.3; }
.dismiss-btn { position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: transparent; border: none; border-radius: 6px; cursor: pointer; opacity: 0; transition: all 0.2s ease; }
.suggestion-card:hover .dismiss-btn { opacity: 1; }
.dismiss-btn:hover { background: #F5F5F5; }
.dismiss-btn svg { width: 14px; height: 14px; color: #999999; }
.suggestion-arrow { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; color: #CCCCCC; flex-shrink: 0; transition: all 0.2s ease; }
.suggestion-card:hover .suggestion-arrow { transform: translateX(4px); color: var(--accent, #00A86B); }
.suggestion-arrow svg { width: 18px; height: 18px; }
</style>
