<script setup lang="ts">
/**
 * Feature: F312 - Package Details
 * Package information display
 */
defineProps<{
  size: 'small' | 'medium' | 'large' | 'xlarge'
  weight?: number
  description?: string
  fragile?: boolean
  requireSignature?: boolean
  photos?: string[]
}>()

const sizeLabels = {
  small: { label: 'เล็ก', desc: 'พอดีมือถือ' },
  medium: { label: 'กลาง', desc: 'พอดีกล่องรองเท้า' },
  large: { label: 'ใหญ่', desc: 'พอดีกระเป๋าเดินทาง' },
  xlarge: { label: 'ใหญ่พิเศษ', desc: 'ต้องใช้รถกระบะ' }
}
</script>

<template>
  <div class="package-details">
    <div class="header">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
        <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
      <h4>รายละเอียดพัสดุ</h4>
    </div>
    
    <div class="info-grid">
      <div class="info-item">
        <span class="label">ขนาด</span>
        <span class="value">{{ sizeLabels[size].label }}</span>
        <span class="desc">{{ sizeLabels[size].desc }}</span>
      </div>
      <div v-if="weight" class="info-item">
        <span class="label">น้ำหนัก</span>
        <span class="value">{{ weight }} กก.</span>
      </div>
    </div>
    
    <div v-if="description" class="description">
      <span class="label">รายละเอียด</span>
      <p>{{ description }}</p>
    </div>
    
    <div v-if="fragile || requireSignature" class="tags">
      <span v-if="fragile" class="tag fragile">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        </svg>
        แตกง่าย
      </span>
      <span v-if="requireSignature" class="tag signature">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
        </svg>
        ต้องเซ็นรับ
      </span>
    </div>
    
    <div v-if="photos && photos.length > 0" class="photos">
      <span class="label">รูปภาพ</span>
      <div class="photo-grid">
        <img v-for="(photo, i) in photos" :key="i" :src="photo" alt="Package photo" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.package-details {
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
}

.header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.header h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 8px;
}

.label {
  font-size: 11px;
  color: #6b6b6b;
  margin-bottom: 4px;
}

.value {
  font-size: 16px;
  font-weight: 600;
}

.desc {
  font-size: 11px;
  color: #6b6b6b;
}

.description {
  margin-bottom: 16px;
}

.description p {
  font-size: 14px;
  margin: 4px 0 0;
}

.tags {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}

.tag.fragile { background: #fff3e0; color: #f5a623; }
.tag.signature { background: #e8f4ff; color: #276ef1; }

.photos .label {
  display: block;
  margin-bottom: 8px;
}

.photo-grid {
  display: flex;
  gap: 8px;
}

.photo-grid img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
}
</style>
