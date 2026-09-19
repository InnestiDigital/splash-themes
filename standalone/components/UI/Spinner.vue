<template>
  <div
    :class="[
      'ui-spinner',
      `ui-spinner--${size}`
    ]"
    :style="{ color: color || 'var(--ui-color-primary)' }"
    role="status"
    aria-label="Loading"
  >
    <svg
      viewBox="0 0 50 50"
      xmlns="http://www.w3.org/2000/svg"
      class="ui-spinner__svg"
      aria-hidden="true"
    >
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke="currentColor"
        stroke-width="4"
        stroke-linecap="round"
        stroke-dasharray="125.6"
        stroke-dashoffset="0"
        class="ui-spinner__track"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
type SpinnerSize = 'sm' | 'md' | 'lg'

interface Props {
  size?: SpinnerSize
  color?: string
}

withDefaults(defineProps<Props>(), {
  size: 'md'
})
</script>

<style scoped lang="scss">
.ui-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  // Sizes
  &--sm {
    width: 2.4rem;
    height: 2.4rem;
  }

  &--md {
    width: 4rem;
    height: 4rem;
  }

  &--lg {
    width: 5.6rem;
    height: 5.6rem;
  }
}

.ui-spinner__svg {
  width: 100%;
  height: 100%;
  animation: spin 1s linear infinite;
}

.ui-spinner__track {
  opacity: 0.3;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
