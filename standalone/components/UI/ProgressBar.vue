<template>
  <div class="ui-progress-wrapper">
    <div v-if="label" class="ui-progress__label">
      <span>{{ label }}</span>
      <span v-if="showPercentage" class="ui-progress__percentage">{{ percentage }}%</span>
    </div>

    <div
      :class="[
        'ui-progress',
        `ui-progress--${variant}`,
        { 'ui-progress--animated': animated }
      ]"
      role="progressbar"
      :aria-valuenow="percentage"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="label || 'Progress'"
    >
      <div
        class="ui-progress__bar"
        :style="{ width: `${percentage}%` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type ProgressVariant = 'primary' | 'success' | 'warning' | 'error' | 'info'

interface Props {
  percentage: number
  label?: string
  showPercentage?: boolean
  animated?: boolean
  variant?: ProgressVariant
}

const props = withDefaults(defineProps<Props>(), {
  showPercentage: true,
  animated: true,
  variant: 'primary'
})

const percentage = computed(() => {
  const value = Math.min(Math.max(props.percentage, 0), 100)
  return Math.round(value)
})
</script>

<style scoped lang="scss">
.ui-progress-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--ui-spacing-xs);
  width: 100%;
}

.ui-progress__label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--ui-font-size-sm);
  font-weight: var(--ui-font-weight-medium);
  color: var(--ui-color-text);
}

.ui-progress__percentage {
  font-weight: var(--ui-font-weight-semibold);
  color: var(--ui-color-primary);
}

.ui-progress {
  width: 100%;
  height: 0.8rem;
  background-color: var(--ui-color-border);
  border-radius: var(--ui-radius);
  overflow: hidden;
  position: relative;
}

.ui-progress__bar {
  height: 100%;
  border-radius: var(--ui-radius);
  transition: width var(--ui-transition-base);
  background-color: var(--ui-color-primary);

  // Variants
  .ui-progress--primary & {
    background-color: var(--ui-color-primary);
  }

  .ui-progress--success & {
    background-color: var(--ui-color-success);
  }

  .ui-progress--warning & {
    background-color: var(--ui-color-warning);
  }

  .ui-progress--error & {
    background-color: var(--ui-color-error);
  }

  .ui-progress--info & {
    background-color: var(--ui-color-info);
  }

  .ui-progress--animated & {
    animation: progress 1.5s ease infinite;
  }
}

@keyframes progress {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 4rem 0;
  }
}

@media (max-width: $bp-sm) {
  .ui-progress {
    height: 0.6rem;
  }

  .ui-progress__label {
    font-size: var(--ui-font-size-sm);
  }
}
</style>
