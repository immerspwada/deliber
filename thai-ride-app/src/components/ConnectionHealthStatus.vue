<template>
  <div class="connection-health-status">
    <!-- Status Indicator -->
    <div 
      class="status-indicator"
      :class="statusClass"
      @click="toggleDetails"
    >
      <div class="status-dot" :style="{ backgroundColor: connectionInfo.statusColor }"></div>
      <span class="status-text">{{ connectionInfo.statusText }}</span>
      <svg 
        class="chevron" 
        :class="{ 'rotated': showDetails }"
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="2"
      >
        <polyline points="6,9 12,15 18,9"></polyline>
      </svg>
    </div>

    <!-- Detailed Status Panel -->
    <Transition name="slide-down">
      <div v-if="showDetails" class="status-details">
        <div class="detail-row">
          <span class="label">สถานะ:</span>
          <span class="value" :style="{ color: connectionInfo.statusColor }">
            {{ connectionInfo.statusText }}
          </span>
        </div>
        
        <div class="detail-row">
          <span class="label">งานที่พร้อม:</span>
          <span class="value">{{ connectionInfo.jobCount }} งาน</span>
        </div>
        
        <div class="detail-row">
          <span class="label">โหมด:</span>
          <span class="value">
            {{ connectionInfo.fallbackMode ? '🎭 Mock Mode' : '🗄️ Database Mode' }}
          </span>
        </div>
        
        <div v-if="lastCheck" class="detail-row">
          <span class="label">ตรวจสอบล่าสุด:</span>
          <span class="value">{{ formatTime(lastCheck.timestamp) }}</span>
        </div>
        
        <div v-if="lastCheck?.latency" class="detail-row">
          <span class="label">Latency:</span>
          <span class="value">{{ lastCheck.latency }}ms</span>
        </div>
        
        <div v-if="lastCheck?.error" class="detail-row error">
          <span class="label">Error:</span>
          <span class="value">{{ lastCheck.error }}</span>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button 
            class="btn btn-primary"
            :disabled="isReconnecting"
            @click="handleReconnect"
          >
            {{ isReconnecting ? 'กำลังเชื่อมต่อ...' : '🔄 เชื่อมต่อใหม่' }}
          </button>
          
          <button 
            class="btn btn-secondary"
            @click="handleToggleFallback"
          >
            {{ connectionInfo.fallbackMode ? '🗄️ ใช้ Database' : '🎭 ใช้ Mock Mode' }}
          </button>
          
          <button 
            class="btn btn-info"
            @click="showDiagnostics"
          >
            🔍 Diagnostics
          </button>
        </div>
      </div>
    </Transition>

    <!-- Diagnostics Modal -->
    <Teleport to="body">
      <div v-if="showDiagnosticsModal" class="modal-overlay" @click="closeDiagnostics">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>🔍 Connection Diagnostics</h3>
            <button class="close-btn" @click="closeDiagnostics">×</button>
          </div>
          
          <div class="modal-body">
            <pre class="diagnostics-output">{{ JSON.stringify(diagnostics, null, 2) }}</pre>
          </div>
          
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="copyDiagnostics">
              📋 Copy to Clipboard
            </button>
            <button class="btn btn-primary" @click="closeDiagnostics">
              Close
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import type { ConnectionInfo, HealthCheck } from '../composables/useConnectionHealth'

// Props
interface Props {
  connectionInfo: ConnectionInfo
  lastCheck?: HealthCheck | null
  onReconnect?: () => Promise<void>
  onToggleFallback?: () => void
  onGetDiagnostics?: () => any
}

const props = withDefaults(defineProps<Props>(), {
  lastCheck: null,
  onReconnect: async () => {},
  onToggleFallback: () => {},
  onGetDiagnostics: () => ({})
})

// State
const showDetails = ref(false)
const showDiagnosticsModal = ref(false)
const isReconnecting = ref(false)
const diagnostics = ref<any>({})

// Computed
const statusClass = computed(() => {
  const baseClass = 'status-indicator'
  switch (props.connectionInfo.status) {
    case 'connected': return `${baseClass} connected`
    case 'checking': return `${baseClass} checking`
    case 'disconnected': return `${baseClass} disconnected`
    case 'fallback': return `${baseClass} fallback`
    default: return baseClass
  }
})

// Methods
function toggleDetails(): void {
  showDetails.value = !showDetails.value
}

async function handleReconnect(): Promise<void> {
  isReconnecting.value = true
  try {
    await props.onReconnect()
  } finally {
    isReconnecting.value = false
  }
}

function handleToggleFallback(): void {
  props.onToggleFallback()
}

function showDiagnostics(): void {
  diagnostics.value = props.onGetDiagnostics()
  showDiagnosticsModal.value = true
}

function closeDiagnostics(): void {
  showDiagnosticsModal.value = false
}

async function copyDiagnostics(): Promise<void> {
  try {
    await navigator.clipboard.writeText(JSON.stringify(diagnostics.value, null, 2))
    // Show toast notification
    const toast = document.createElement('div')
    toast.textContent = '📋 Copied to clipboard!'
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      z-index: 10000;
      font-size: 14px;
    `
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 2000)
  } catch (error) {
    console.error('Failed to copy diagnostics:', error)
  }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('th-TH')
}
</script>

<style scoped>
.connection-health-status {
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.status-indicator:hover {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.status-indicator.connected {
  border-color: #10b981;
}

.status-indicator.checking {
  border-color: #f59e0b;
}

.status-indicator.disconnected {
  border-color: #ef4444;
}

.status-indicator.fallback {
  border-color: #8b5cf6;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.chevron {
  transition: transform 0.2s ease;
  color: #9ca3af;
}

.chevron.rotated {
  transform: rotate(180deg);
}

.status-details {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 16px;
  margin-top: 4px;
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 13px;
}

.detail-row.error .value {
  color: #ef4444;
  font-family: monospace;
  font-size: 11px;
}

.label {
  color: #6b7280;
  font-weight: 500;
}

.value {
  color: #374151;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.btn {
  flex: 1;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-info {
  background: #8b5cf6;
  color: white;
}

.btn-info:hover {
  background: #7c3aed;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
}

.diagnostics-output {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 16px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-all;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e5e7eb;
  justify-content: flex-end;
}

/* Transitions */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>