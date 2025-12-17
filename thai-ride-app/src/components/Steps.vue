<script setup lang="ts">
/**
 * Feature: F391 - Steps
 * Step indicator component
 */
interface Step { title: string; description?: string; icon?: string }

withDefaults(defineProps<{
  steps: Step[]
  current: number
  direction?: 'horizontal' | 'vertical'
  size?: 'small' | 'default'
}>(), {
  direction: 'horizontal',
  size: 'default'
})

const getStatus = (index: number, current: number) => {
  if (index < current) return 'finish'
  if (index === current) return 'process'
  return 'wait'
}
</script>

<template>
  <div class="steps" :class="[direction, size]">
    <div v-for="(step, i) in steps" :key="i" class="step" :class="getStatus(i, current)">
      <div class="step-icon">
        <span v-if="getStatus(i, current) === 'finish'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        </span>
        <span v-else-if="step.icon" v-html="step.icon"></span>
        <span v-else>{{ i + 1 }}</span>
      </div>
      <div class="step-content">
        <div class="step-title">{{ step.title }}</div>
        <div v-if="step.description" class="step-desc">{{ step.description }}</div>
      </div>
      <div v-if="i < steps.length - 1" class="step-connector"></div>
    </div>
  </div>
</template>

<style scoped>
.steps { display: flex; }
.steps.vertical { flex-direction: column; }
.step { display: flex; align-items: flex-start; position: relative; flex: 1; }
.steps.vertical .step { flex-direction: row; padding-bottom: 24px; }
.step-icon { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 500; flex-shrink: 0; border: 2px solid #e5e5e5; background: #fff; color: #6b6b6b; }
.step.process .step-icon { border-color: #000; background: #000; color: #fff; }
.step.finish .step-icon { border-color: #22c55e; background: #22c55e; color: #fff; }
.step-content { margin-left: 12px; padding-right: 16px; }
.step-title { font-size: 14px; font-weight: 500; color: #000; }
.step.wait .step-title { color: #6b6b6b; }
.step-desc { font-size: 12px; color: #6b6b6b; margin-top: 4px; }
.step-connector { position: absolute; top: 16px; left: 44px; right: 0; height: 2px; background: #e5e5e5; }
.step.finish .step-connector { background: #22c55e; }
.steps.vertical .step-connector { top: 32px; left: 15px; width: 2px; height: calc(100% - 32px); }
.steps.small .step-icon { width: 24px; height: 24px; font-size: 12px; }
</style>
