<script setup lang="ts">
defineProps<{
  destination: string
  duration: number
  progress: number
}>()

defineEmits<{
  'chat': []
  'safety': []
  'complete': []
}>()
</script>

<template>
  <div class="riding-state">
    <div class="ride-progress">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <span class="progress-text">กำลังเดินทาง</span>
    </div>
    
    <div class="ride-destination">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
      <span>{{ destination }}</span>
    </div>
    
    <div class="ride-eta">
      <span class="eta-big">{{ duration }}</span>
      <span class="eta-label">นาทีถึงจุดหมาย</span>
    </div>

    <!-- Safety features -->
    <div class="safety-actions">
      <button @click="$emit('safety')" class="safety-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
        </svg>
        <span>แชร์การเดินทาง</span>
      </button>
      <button @click="$emit('safety')" class="safety-btn sos">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <span>SOS</span>
      </button>
    </div>

    <!-- Contact driver while riding -->
    <div class="ride-contact-actions">
      <button @click="$emit('chat')" class="ride-contact-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
        <span>แชทกับคนขับ</span>
      </button>
    </div>

    <button @click="$emit('complete')" class="btn-primary">จำลองถึงจุดหมาย</button>
  </div>
</template>

<style scoped>
.riding-state {
  padding: 16px 0;
}

.ride-progress {
  margin-bottom: 20px;
}

.progress-bar {
  height: 6px;
  background: #E5E5E5;
  border-radius: 3px;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: #000;
  border-radius: 3px;
  transition: width 0.3s;
}

.progress-text {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.ride-destination {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #F6F6F6;
  border-radius: 14px;
  margin-bottom: 20px;
}

.ride-destination svg {
  width: 22px;
  height: 22px;
  stroke-width: 1.5;
}

.ride-destination span {
  font-size: 16px;
  font-weight: 600;
}

.ride-eta {
  text-align: center;
  margin-bottom: 24px;
}

.eta-big {
  font-size: 52px;
  font-weight: 700;
  display: block;
  line-height: 1;
  margin-bottom: 4px;
}

.eta-label {
  font-size: 15px;
  color: #666;
}

/* Safety Actions */
.safety-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.safety-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  background: #F6F6F6;
  border: none;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 52px;
}

.safety-btn:hover {
  background: #EBEBEB;
}

.safety-btn:active {
  transform: scale(0.97);
}

.safety-btn svg {
  width: 20px;
  height: 20px;
  stroke-width: 1.5;
}

.safety-btn.sos {
  background: #FEE2E2;
  color: #E11900;
  font-weight: 600;
}

.safety-btn.sos:hover {
  background: #FECACA;
}

/* Ride Contact Actions */
.ride-contact-actions {
  margin-bottom: 20px;
}

.ride-contact-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  background: #F6F6F6;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 52px;
}

.ride-contact-btn:hover {
  background: #EBEBEB;
}

.ride-contact-btn:active {
  transform: scale(0.97);
}

.ride-contact-btn svg {
  width: 22px;
  height: 22px;
  stroke-width: 1.5;
}

/* Button */
.btn-primary {
  width: 100%;
  padding: 18px;
  background: #000;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-primary:active {
  transform: scale(0.98);
}
</style>
