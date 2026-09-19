<template>
  <span
    :class="[
      'ui-badge',
      `ui-badge--${variant}`,
      `ui-badge--${size}`
    ]"
  >
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup lang="ts">
type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'
type BadgeSize = 'sm' | 'md' | 'lg'

interface Props {
  label?: string
  variant?: BadgeVariant
  size?: BadgeSize
}

withDefaults(defineProps<Props>(), {
  variant: 'neutral',
  size: 'md'
})
</script>

<style scoped lang="scss">
.ui-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--ui-radius-xl);
  font-weight: var(--ui-font-weight-medium);
  white-space: nowrap;

  // Variants
  &--success {
    background-color: var(--ui-color-success-subtle);
    color: var(--ui-color-success);
  }

  &--warning {
    background-color: var(--ui-color-warning-subtle);
    color: var(--ui-color-warning);
  }

  &--error {
    background-color: var(--ui-color-error-subtle);
    color: var(--ui-color-error);
  }

  &--info {
    background-color: var(--ui-color-info-subtle);
    color: var(--ui-color-info);
  }

  &--neutral {
    background-color: var(--ui-color-bg-subtle);
    color: var(--ui-color-text-muted);
  }

  // Sizes
  &--sm {
    padding: var(--ui-spacing-xs) var(--ui-spacing-sm);
    font-size: var(--ui-font-size-sm);
  }

  &--md {
    padding: var(--ui-spacing-xs) var(--ui-spacing-md);
    font-size: var(--ui-font-size-sm);
  }

  &--lg {
    padding: var(--ui-spacing-sm) var(--ui-spacing-lg);
    font-size: var(--ui-font-size-base);
  }
}
</style>
