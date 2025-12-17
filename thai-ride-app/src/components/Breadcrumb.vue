<script setup lang="ts">
/**
 * Feature: F108 - Breadcrumb
 * Navigation breadcrumb trail
 */
interface BreadcrumbItem {
  label: string
  href?: string
  active?: boolean
}

interface Props {
  items: BreadcrumbItem[]
  separator?: 'slash' | 'arrow' | 'dot'
}

const props = withDefaults(defineProps<Props>(), {
  separator: 'arrow'
})

const emit = defineEmits<{
  navigate: [item: BreadcrumbItem, index: number]
}>()

const handleClick = (item: BreadcrumbItem, index: number) => {
  if (!item.active && item.href) {
    emit('navigate', item, index)
  }
}
</script>

<template>
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <ol class="breadcrumb-list">
      <li
        v-for="(item, index) in items"
        :key="index"
        class="breadcrumb-item"
        :class="{ active: item.active }"
      >
        <a
          v-if="item.href && !item.active"
          :href="item.href"
          class="breadcrumb-link"
          @click.prevent="handleClick(item, index)"
        >
          {{ item.label }}
        </a>
        <span v-else class="breadcrumb-text">{{ item.label }}</span>
        
        <span v-if="index < items.length - 1" class="breadcrumb-separator">
          <!-- Slash -->
          <span v-if="separator === 'slash'">/</span>
          <!-- Arrow -->
          <svg v-else-if="separator === 'arrow'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <!-- Dot -->
          <span v-else-if="separator === 'dot'" class="dot" />
        </span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumb-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.breadcrumb-link {
  font-size: 14px;
  color: #6b6b6b;
  text-decoration: none;
  transition: color 0.2s;
}

.breadcrumb-link:hover {
  color: #000;
}

.breadcrumb-text {
  font-size: 14px;
  color: #6b6b6b;
}

.breadcrumb-item.active .breadcrumb-text {
  color: #000;
  font-weight: 500;
}

.breadcrumb-separator {
  display: flex;
  align-items: center;
  color: #ccc;
  font-size: 14px;
}

.dot {
  width: 4px;
  height: 4px;
  background: #ccc;
  border-radius: 50%;
}
</style>
