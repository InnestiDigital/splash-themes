<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'ui-button',
      `ui-button--${variant}`,
      `ui-button--${size}`,
      { 'ui-button--loading': loading }
    ]"
    v-bind="$attrs"
  >
    <span v-if="$slots.icon" class="ui-button__icon ui-button__icon--start">
      <slot name="icon" />
    </span>
    <span class="ui-button__content">
      <slot>{{ label }}</slot>
    </span>
    <Spinner v-if="loading" :size="spinnerSize" class="ui-button__spinner" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Spinner from './Spinner.vue'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text'
type ButtonSize = 'sm' | 'md' | 'lg'
type ButtonType = 'button' | 'submit' | 'reset'

interface Props {
  label?: string
  variant?: ButtonVariant
  size?: ButtonSize
  type?: ButtonType
  disabled?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  disabled: false,
  loading: false
})

const spinnerSize = computed(() => {
  const sizeMap: Record<ButtonSize, 'sm' | 'md' | 'lg'> = {
    sm: 'sm',
    md: 'md',
    lg: 'md'
  }
  return sizeMap[props.size]
})
</script>

<style scoped lang="scss">
.ui-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ui-spacing-xs);
  // Figma: TD_Graphik:Medium (500) for all button text
  font-weight: var(--ui-font-weight-medium);
  border: none;
  border-radius: var(--ui-radius);
  cursor: pointer;
  transition: var(--ui-transition-base);
  white-space: nowrap;
  font-family: inherit;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  // Variants
  &--primary {
    background-color: var(--ui-color-primary);
    color: var(--ui-color-bg);

    // Figma: no transform/shadow on hover — just slightly darker green
    &:hover:not(:disabled) {
      background-color: var(--ui-color-primary-hover);
    }

    &:active:not(:disabled) {
      opacity: 0.9;
    }

    &:focus-visible {
      outline: 0.2rem solid var(--ui-color-primary);
      outline-offset: 0.2rem;
      box-shadow: 0 0 0 0.3rem var(--ui-color-primary-focus-ring);
    }
  }

  &--secondary {
    background-color: var(--ui-color-secondary);
    color: var(--ui-color-bg);

    &:hover:not(:disabled) {
      opacity: 0.9;
    }

    &:active:not(:disabled) {
      opacity: 0.8;
    }

    &:focus-visible {
      outline: 0.2rem solid var(--ui-color-secondary);
      outline-offset: 0.2rem;
      box-shadow: 0 0 0 0.3rem var(--ui-color-primary-focus-ring);
    }
  }

  &--outline {
    background-color: transparent;
    color: var(--ui-color-primary);
    // Figma: border-2 (2px) for outline variant
    border: 0.2rem solid var(--ui-color-primary);

    &:hover:not(:disabled) {
      background-color: var(--ui-color-primary);
      color: var(--ui-color-bg);
    }

    &:focus-visible {
      outline: 0.2rem solid var(--ui-color-primary);
      outline-offset: 0.2rem;
      box-shadow: 0 0 0 0.3rem var(--ui-color-primary-focus-ring);
    }
  }

  &--text {
    background-color: transparent;
    color: var(--ui-color-primary);

    &:hover:not(:disabled) {
      opacity: 0.8;
      text-decoration: underline;
    }

    &:focus-visible {
      outline: 0.2rem solid var(--ui-color-primary);
      outline-offset: 0.2rem;
    }
  }

  // Sizes — Figma: md is 40px height (4.0rem), 48px h-padding (4.8rem)
  &--sm {
    padding: var(--ui-spacing-xs) var(--ui-spacing-lg);
    font-size: var(--ui-font-size-sm);
    min-height: 3.2rem;
  }

  &--md {
    // Figma: min-h-[40px], px-[48px] — 15px text with 1rem vertical padding
    padding: 1.0rem 4.8rem;
    font-size: var(--ui-font-size-base);
    min-height: 4.0rem;
  }

  &--lg {
    padding: 1.2rem 6.4rem;
    font-size: var(--ui-font-size-base);
    min-height: 5.0rem;
  }

  // Loading state
  &--loading {
    pointer-events: none;
  }
}

.ui-button__icon {
  display: flex;
  align-items: center;
  justify-content: center;

  &--start {
    order: -1;
  }
}

.ui-button__content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.ui-button__spinner {
  margin-inline-start: var(--ui-spacing-xs);
}
</style>
