<template>
  <div
    class="splash-ui-quantity-selector"
    :class="{ 'splash-ui-quantity-selector--disabled': disabled }"
    role="group"
    :aria-label="ariaLabel || t('cart.quantity', 'Quantity')"
  >
    <button
      class="splash-ui-quantity-selector__btn splash-ui-quantity-selector__btn--decrement"
      type="button"
      :disabled="disabled || modelValue <= min"
      :aria-label="t('cart.decreaseQuantity', 'Decrease quantity')"
      @click="decrement"
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <line x1="3" y1="8" x2="13" y2="8" stroke-linecap="round" />
      </svg>
    </button>

    <span
      class="splash-ui-quantity-selector__value"
      :aria-live="loading ? 'polite' : undefined"
      :aria-atomic="loading ? 'true' : undefined"
    >
      <span v-if="loading" class="splash-ui-quantity-selector__loading" aria-label="Updating...">
        <svg viewBox="0 0 24 24" fill="none" class="splash-ui-quantity-selector__spinner" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="40" stroke-dashoffset="10" />
        </svg>
      </span>
      <span v-else>{{ modelValue }}</span>
    </span>

    <button
      class="splash-ui-quantity-selector__btn splash-ui-quantity-selector__btn--increment"
      type="button"
      :disabled="disabled || modelValue >= max"
      :aria-label="t('cart.increaseQuantity', 'Increase quantity')"
      @click="increment"
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <line x1="8" y1="3" x2="8" y2="13" stroke-linecap="round" />
        <line x1="3" y1="8" x2="13" y2="8" stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface Props {
  modelValue: number
  min?: number
  max?: number
  disabled?: boolean
  loading?: boolean
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  min: 1,
  max: 99,
  disabled: false,
  loading: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
  'change': [value: number]
}>()

const { t } = useI18n()

function decrement() {
  if (props.disabled || props.modelValue <= props.min) return
  const newValue = props.modelValue - 1
  emit('update:modelValue', newValue)
  emit('change', newValue)
}

function increment() {
  if (props.disabled || props.modelValue >= props.max) return
  const newValue = props.modelValue + 1
  emit('update:modelValue', newValue)
  emit('change', newValue)
}
</script>

<style scoped>
.splash-ui-quantity-selector {
  display: inline-flex;
  align-items: center;
  gap: 0;
  border: 0.1rem solid var(--ui-color-border-input);
  border-radius: var(--ui-radius);
  overflow: hidden;
  background-color: var(--ui-color-bg);
}

.splash-ui-quantity-selector--disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* Buttons */
.splash-ui-quantity-selector__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.6rem;
  height: 3.6rem;
  background-color: transparent;
  border: none;
  cursor: pointer;
  color: var(--ui-color-text);
  transition: background-color var(--ui-transition-fast), color var(--ui-transition-fast);
  flex-shrink: 0;
}

.splash-ui-quantity-selector__btn:hover:not(:disabled) {
  background-color: var(--ui-color-bg-subtle);
}

.splash-ui-quantity-selector__btn:focus-visible {
  outline: 0.2rem solid var(--ui-color-primary);
  outline-offset: -0.2rem;
}

.splash-ui-quantity-selector__btn:disabled {
  color: var(--ui-color-text-faint);
  cursor: not-allowed;
}

.splash-ui-quantity-selector__btn svg {
  width: 1.4rem;
  height: 1.4rem;
}

/* Value display */
.splash-ui-quantity-selector__value {
  min-width: 3.2rem;
  text-align: center;
  font-size: var(--ui-font-size-base);
  font-weight: var(--ui-font-weight-semibold);
  color: var(--ui-color-text);
  border-inline: 0.1rem solid var(--ui-color-border-input);
  line-height: 3.6rem;
  height: 3.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Spinner */
.splash-ui-quantity-selector__spinner {
  width: 1.6rem;
  height: 1.6rem;
  animation: qs-spin 0.8s linear infinite;
  color: var(--ui-color-text-muted);
}

@keyframes qs-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
