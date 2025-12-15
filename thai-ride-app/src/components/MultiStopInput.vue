<script setup lang="ts">
import { computed, watch } from 'vue'

interface Stop {
  id: string
  address: string
  lat?: number
  lng?: number
  contactName?: string
  contactPhone?: string
}

const props = withDefaults(defineProps<{
  modelValue?: Stop[]
  maxStops?: number
}>(), {
  modelValue: () => [],
  maxStops: 3
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Stop[]): void
  (e: 'stopsChange', value: Stop[]): void
}>()

// Watch for changes and emit both events
watch(() => props.modelValue, (newVal) => {
  emit('stopsChange', newVal)
}, { deep: true })

const maxStops = computed(() => props.maxStops)
const stops = computed(() => props.modelValue || [])

const addStop = () => {
  if (stops.value.length >= maxStops.value) return
  const newStop: Stop = {
    id: `stop-${Date.now()}`,
    address: ''
  }
  emit('update:modelValue', [...stops.value, newStop])
}

const removeStop = (index: number) => {
  const updated = stops.value.filter((_, i) => i !== index)
  emit('update:modelValue', updated)
}

const updateStop = (index: number, field: keyof Stop, value: string) => {
  const updated = [...stops.value]
  if (updated[index]) {
    (updated[index] as any)[field] = value
  }
  emit('update:modelValue', updated)
}
</script>

<template>
  <div class="multi-stop-input">
    <div class="stops-list">
      <div v-for="(stop, index) in stops" :key="stop.id" class="stop-item">
        <div class="stop-marker">
          <div class="marker-dot"></div>
          <div v-if="index < stops.length - 1" class="marker-line"></div>
        </div>
        <div class="stop-content">
          <div class="stop-header">
            <span class="stop-label">จุดแวะ {{ index + 1 }}</span>
            <button @click="removeStop(index)" class="remove-btn">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <input
            :value="stop.address"
            @input="updateStop(index, 'address', ($event.target as HTMLInputElement).value)"
            type="text"
            placeholder="ระบุที่อยู่"
            class="stop-input"
          />
          <div class="stop-contact">
            <input
              :value="stop.contactName"
              @input="updateStop(index, 'contactName', ($event.target as HTMLInputElement).value)"
              type="text"
              placeholder="ชื่อผู้รับ (ไม่บังคับ)"
              class="contact-input"
            />
            <input
              :value="stop.contactPhone"
              @input="updateStop(index, 'contactPhone', ($event.target as HTMLInputElement).value)"
              type="tel"
              placeholder="เบอร์โทร"
              class="contact-input"
            />
          </div>
        </div>
      </div>
    </div>

    <button
      v-if="stops.length < maxStops"
      @click="addStop"
      class="add-stop-btn"
    >
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>
      <span>เพิ่มจุดแวะ (สูงสุด {{ maxStops }} จุด)</span>
    </button>

    <p class="stop-fee-note">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      ค่าบริการเพิ่ม ฿20 ต่อจุดแวะ
    </p>
  </div>
</template>

<style scoped>
.multi-stop-input {
  padding: 16px;
  background: #fff;
  border-radius: 12px;
}

.stops-list {
  margin-bottom: 16px;
}

.stop-item {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.stop-item:last-child {
  margin-bottom: 0;
}

.stop-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 8px;
}

.marker-dot {
  width: 12px;
  height: 12px;
  background: #000;
  border-radius: 50%;
}

.marker-line {
  width: 2px;
  flex: 1;
  min-height: 40px;
  background: #e5e5e5;
  margin-top: 4px;
}

.stop-content {
  flex: 1;
}

.stop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stop-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b6b6b;
}

.remove-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
}

.remove-btn svg {
  width: 16px;
  height: 16px;
}

.stop-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 8px;
}

.stop-input:focus {
  outline: none;
  border-color: #000;
}

.stop-contact {
  display: flex;
  gap: 8px;
}

.contact-input {
  flex: 1;
  padding: 10px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 13px;
}

.contact-input:focus {
  outline: none;
  border-color: #000;
}

.add-stop-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  border: 2px dashed #e5e5e5;
  border-radius: 8px;
  background: none;
  font-size: 14px;
  color: #6b6b6b;
  cursor: pointer;
  transition: all 0.2s;
}

.add-stop-btn:hover {
  border-color: #000;
  color: #000;
}

.add-stop-btn svg {
  width: 20px;
  height: 20px;
}

.stop-fee-note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 12px;
  color: #6b6b6b;
}

.stop-fee-note svg {
  width: 16px;
  height: 16px;
}
</style>
