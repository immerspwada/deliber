<script setup lang="ts">
/**
 * Feature: F356 - Provider Support Card
 * Support options card for providers
 */
const emit = defineEmits<{
  (e: 'contact', type: 'chat' | 'call' | 'email'): void
  (e: 'faq'): void
}>()

const supportOptions = [
  { type: 'chat' as const, icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', label: 'แชทกับเรา', desc: 'ตอบกลับภายใน 5 นาที' },
  { type: 'call' as const, icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>', label: 'โทรหาเรา', desc: '02-xxx-xxxx' },
  { type: 'email' as const, icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>', label: 'อีเมล', desc: 'support@gobear.com' }
]
</script>

<template>
  <div class="provider-support-card">
    <div class="card-header">
      <h3 class="card-title">ศูนย์ช่วยเหลือ</h3>
      <button type="button" class="faq-btn" @click="emit('faq')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        คำถามที่พบบ่อย
      </button>
    </div>

    <div class="support-options">
      <button v-for="opt in supportOptions" :key="opt.type" type="button" class="support-option" @click="emit('contact', opt.type)">
        <div class="option-icon" v-html="opt.icon"></div>
        <div class="option-info">
          <span class="option-label">{{ opt.label }}</span>
          <span class="option-desc">{{ opt.desc }}</span>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.provider-support-card { background: #fff; border-radius: 12px; padding: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.card-title { font-size: 16px; font-weight: 600; color: #000; margin: 0; }
.faq-btn { display: flex; align-items: center; gap: 6px; background: none; border: none; font-size: 13px; color: #276EF1; cursor: pointer; }
.support-options { display: flex; flex-direction: column; gap: 8px; }
.support-option { display: flex; align-items: center; gap: 12px; padding: 14px; background: #f6f6f6; border: none; border-radius: 10px; cursor: pointer; text-align: left; transition: background 0.2s; }
.support-option:hover { background: #e5e5e5; }
.option-icon { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: #fff; border-radius: 10px; color: #000; }
.option-info { flex: 1; }
.option-label { display: block; font-size: 14px; font-weight: 600; color: #000; }
.option-desc { font-size: 12px; color: #6b6b6b; }
</style>
