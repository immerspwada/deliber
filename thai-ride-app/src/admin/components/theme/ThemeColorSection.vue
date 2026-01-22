<template>
  <div class="theme-color-section">
    <div class="section-header">
      <h3 class="section-title">{{ title }}</h3>
      <p v-if="description" class="section-description">{{ description }}</p>
    </div>
    <div class="section-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
  description?: string
}

defineProps<Props>()
</script>

<style scoped>
.theme-color-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.section-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.25rem;
}

.section-description {
  font-size: 0.875rem;
  color: #6b7280;
}

.section-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

@media (max-width: 640px) {
  .section-content {
    grid-template-columns: 1fr;
  }
}
</style>
