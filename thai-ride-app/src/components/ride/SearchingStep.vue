<script setup lang="ts">
defineEmits<{
  'cancel': []
}>()
</script>

<template>
  <div class="searching-state">
    <div class="search-animation">
      <div class="ripple"></div>
      <div class="ripple delay-1"></div>
      <div class="ripple delay-2"></div>
      <div class="search-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/>
        </svg>
      </div>
    </div>
    <h3 class="search-title">กำลังหาคนขับให้คุณ</h3>
    <p class="search-subtitle">โปรดรอสักครู่...</p>
    <button @click="$emit('cancel')" class="btn-cancel-search">ยกเลิก</button>
  </div>
</template>

<style scoped>
.searching-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 0;
}

.search-animation {
  position: relative;
  width: 100px;
  height: 100px;
  margin-bottom: 28px;
}

.ripple {
  position: absolute;
  inset: 0;
  border: 2px solid #000;
  border-radius: 50%;
  animation: ripple 1.5s ease-out infinite;
}

.ripple.delay-1 { animation-delay: 0.5s; }
.ripple.delay-2 { animation-delay: 1s; }

@keyframes ripple {
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 52px;
  height: 52px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.search-icon svg {
  width: 28px;
  height: 28px;
  stroke-width: 1.5;
}

.search-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

.search-subtitle {
  font-size: 15px;
  color: #888;
  margin-bottom: 28px;
}

.btn-cancel-search {
  padding: 14px 40px;
  background: #F6F6F6;
  color: #000;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 48px;
}

.btn-cancel-search:hover {
  background: #EBEBEB;
}

.btn-cancel-search:active {
  transform: scale(0.97);
}
</style>
