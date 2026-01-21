<template>
  <div
    :class="['skeleton', variantClass, { 'skeleton--animated': animated }]"
    :style="customStyle"
    :aria-busy="true"
    :aria-label="ariaLabel || 'Loading content'"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";

/**
 * Skeleton Loader Component
 * Feature: F257 - Professional Loading States
 *
 * MUNEEF Style skeleton loader for better perceived performance
 */

interface Props {
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  animated?: boolean;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "text",
  animated: true,
});

const variantClass = computed(() => `skeleton--${props.variant}`);

const customStyle = computed(() => {
  const style: Record<string, string> = {};

  if (props.width) {
    style.width =
      typeof props.width === "number" ? `${props.width}px` : props.width;
  }

  if (props.height) {
    style.height =
      typeof props.height === "number" ? `${props.height}px` : props.height;
  }

  return style;
});
</script>

<style scoped>
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-border-light) 0%,
    var(--color-bg-secondary) 50%,
    var(--color-border-light) 100%
  );
  background-size: 200% 100%;
  display: inline-block;
}

.skeleton--animated {
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.skeleton--text {
  height: 1em;
  width: 100%;
  border-radius: var(--radius-sm);
  margin-bottom: 0.5em;
}

.skeleton--circular {
  border-radius: 50%;
  width: 40px;
  height: 40px;
}

.skeleton--rectangular {
  border-radius: 0;
  width: 100%;
  height: 100px;
}

.skeleton--rounded {
  border-radius: var(--radius-lg);
  width: 100%;
  height: 100px;
}

/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  .skeleton--animated {
    animation: none;
    background: var(--color-border-light);
  }
}
</style>
