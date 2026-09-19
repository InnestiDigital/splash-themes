<template>
  <Teleport to="body">
    <transition
      name="toast-slide"
      @enter="onEnter"
      @leave="onLeave"
    >
      <div
        v-if="isVisible"
        :class="[
          'ui-toast',
          `ui-toast--${variant}`,
          `ui-toast--${position}`
        ]"
        role="alert"
        :aria-live="variant === 'error' ? 'assertive' : 'polite'"
      >
        <div class="ui-toast__content">
          <Icon :name="iconName" class="ui-toast__icon" aria-hidden="true" />
          <div class="ui-toast__message">
            <p v-if="title" class="ui-toast__title">{{ title }}</p>
            <p v-if="message" class="ui-toast__text">{{ message }}</p>
            <slot />
          </div>
        </div>

        <button
          v-if="closeable"
          class="ui-toast__close"
          aria-label="Close notification"
          @click="close"
        >
          <Icon name="close" size="sm" />
        </button>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Icon from './Icon.vue'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'
type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
type IconName = 'success' | 'error' | 'alert' | 'info'

interface Props {
  title?: string
  message?: string
  variant?: ToastVariant
  position?: ToastPosition
  duration?: number
  closeable?: boolean
  isOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'info',
  position: 'top-right',
  duration: 5000,
  closeable: true,
  isOpen: true
})

const emit = defineEmits<{
  close: []
  'update:isOpen': [value: boolean]
}>()

const isVisible = ref(props.isOpen)
let timeout: ReturnType<typeof setTimeout> | null = null

const iconName = computed<IconName>(() => {
  const iconMap: Record<ToastVariant, IconName> = {
    success: 'success',
    error: 'error',
    warning: 'alert',
    info: 'info'
  }
  return iconMap[props.variant]
})

const close = () => {
  isVisible.value = false
  emit('update:isOpen', false)
  emit('close')
}

const onEnter = () => {
  if (props.duration > 0) {
    timeout = setTimeout(() => {
      close()
    }, props.duration)
  }
}

const onLeave = () => {
  if (timeout) {
    clearTimeout(timeout)
    timeout = null
  }
}

onMounted(() => {
  if (!props.isOpen) {
    isVisible.value = false
  }
})

onUnmounted(() => {
  if (timeout) {
    clearTimeout(timeout)
  }
})
</script>

<style scoped lang="scss">
.ui-toast {
  position: fixed;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ui-spacing-md);
  padding: var(--ui-spacing-md);
  background-color: var(--ui-color-bg);
  border-radius: var(--ui-radius-lg);
  box-shadow: var(--ui-shadow-lg);
  min-width: 30rem;
  max-width: 50rem;
  z-index: var(--ui-z-tooltip);
  animation: slideIn 0.3s ease-out;

  // Positions (physical props required for viewport corner placement)
  &--top-right {
    top: 1.5rem;
    right: 1.5rem;
  }

  &--top-left {
    top: 1.5rem;
    left: 1.5rem;
  }

  &--bottom-right {
    bottom: 1.5rem;
    right: 1.5rem;
  }

  &--bottom-left {
    bottom: 1.5rem;
    left: 1.5rem;
  }

  &--top-center {
    top: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
  }

  &--bottom-center {
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
  }

  // Variants
  &--success {
    border-inline-start: 0.4rem solid var(--ui-color-success);

    .ui-toast__icon {
      color: var(--ui-color-success);
    }
  }

  &--error {
    border-inline-start: 0.4rem solid var(--ui-color-error);

    .ui-toast__icon {
      color: var(--ui-color-error);
    }
  }

  &--warning {
    border-inline-start: 0.4rem solid var(--ui-color-warning);

    .ui-toast__icon {
      color: var(--ui-color-warning);
    }
  }

  &--info {
    border-inline-start: 0.4rem solid var(--ui-color-primary);

    .ui-toast__icon {
      color: var(--ui-color-primary);
    }
  }
}

.ui-toast__content {
  display: flex;
  align-items: flex-start;
  gap: var(--ui-spacing-md);
  flex: 1;
}

.ui-toast__icon {
  flex-shrink: 0;
  width: 2.4rem;
  height: 2.4rem;
  margin-block-start: 0.2rem;
}

.ui-toast__message {
  display: flex;
  flex-direction: column;
  gap: var(--ui-spacing-xs);
}

.ui-toast__title {
  margin: 0;
  font-weight: var(--ui-font-weight-semibold);
  color: var(--ui-color-text);
  font-size: var(--ui-font-size-base);
}

.ui-toast__text {
  margin: 0;
  color: var(--ui-color-text-muted);
  font-size: var(--ui-font-size-sm);
  line-height: var(--ui-line-height-base);
}

.ui-toast__close {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-color-text-faint);
  transition: color var(--ui-transition-base);
  margin-block-start: 0.2rem;

  &:hover {
    color: var(--ui-color-text);
  }

  &:focus-visible {
    outline: 0.2rem solid var(--ui-color-primary);
    outline-offset: 0.2rem;
    border-radius: var(--ui-radius);
  }
}

// Animations
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.toast-slide-enter-active {
  transition: all 0.3s ease-out;
}

.toast-slide-leave-active {
  transition: all 0.3s ease-in;
}

.toast-slide-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.ui-toast--top-center.toast-slide-enter-from,
.ui-toast--top-center.toast-slide-leave-to,
.ui-toast--bottom-center.toast-slide-enter-from,
.ui-toast--bottom-center.toast-slide-leave-to {
  transform: translateX(-50%) translateY(-2rem);
}

.ui-toast--top-left.toast-slide-enter-from,
.ui-toast--top-left.toast-slide-leave-to {
  transform: translateX(-100%);
}

.ui-toast--bottom-left.toast-slide-enter-from,
.ui-toast--bottom-left.toast-slide-leave-to {
  transform: translateX(-100%);
}

@media (max-width: $bp-sm) {
  .ui-toast {
    min-width: auto;
    width: calc(100% - var(--ui-spacing-xl));
    left: var(--ui-spacing-md) !important;
    right: var(--ui-spacing-md) !important;

    &--top-center,
    &--bottom-center {
      left: var(--ui-spacing-md) !important;
      right: var(--ui-spacing-md) !important;
      transform: none;
    }

    &--top-right,
    &--top-left {
      top: var(--ui-spacing-md);
    }

    &--bottom-right,
    &--bottom-left {
      bottom: var(--ui-spacing-md);
    }

    .toast-slide-enter-from,
    .toast-slide-leave-to {
      transform: translateY(-100%);
    }

    .ui-toast--top-center.toast-slide-enter-from,
    .ui-toast--top-center.toast-slide-leave-to {
      transform: translateY(-100%);
    }
  }
}
</style>
