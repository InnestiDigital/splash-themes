<template>
  <div class="splash-notification-container" :class="`splash-notification-container--${position || 'top-right'}`">
    <transition-group name="notification" tag="div">
      <div
        v-for="notification in visibleNotifications"
        :key="notification.id"
        class="notification"
        :class="`notification--${notification.type || 'info'}`"
        :style="cardStyle"
        role="alert"
        aria-live="assertive"
      >
        <div class="notification__content" :style="contentStyle">
          <span class="notification__icon" aria-hidden="true">
            <svg v-if="notification.type === 'success'" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
              <path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
            </svg>
            <svg v-else-if="notification.type === 'error'" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9L9 15M9 9l6 6" stroke="white" stroke-width="2" stroke-linecap="round" />
            </svg>
            <svg v-else-if="notification.type === 'warning'" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 20h20L12 2zm0 5v7m0 3h.01" stroke="currentColor" stroke-width="2" fill="none" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" stroke="white" stroke-width="2" fill="none" />
            </svg>
          </span>
          <span class="notification__message">{{ notification.message }}</span>
        </div>

        <button
          class="notification__close"
          @click="dismissNotification(notification.id)"
          :aria-label="$t('broadcast.close', 'Close notification')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'

type NotificationType = 'success' | 'error' | 'warning' | 'info'

interface Notification {
  id: string
  message: string
  type: NotificationType
}

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  blocks?: Array<Record<string, unknown>>
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  autoCloseDelay?: number
  maxVisible?: number
  surfaceStyle?: string
  borderRadius?: string
  internalPadding?: string
  textAlign?: string
}>(), {
  position: 'top-right',
  autoCloseDelay: 5000,
  maxVisible: 3,
})

const notifications = ref<Notification[]>([])
// Separate map for timeout handles — avoids mutating notification objects
const timeoutHandles = new Map<string, ReturnType<typeof setTimeout>>()

const visibleNotifications = computed(() =>
  notifications.value.slice(0, props.maxVisible || 3)
)

function addNotification(message: string, type: NotificationType = 'info'): string {
  const id = `notification-${Date.now()}`
  notifications.value = [...notifications.value, { id, message, type }]

  if (props.autoCloseDelay && props.autoCloseDelay > 0) {
    const handle = setTimeout(() => dismissNotification(id), props.autoCloseDelay)
    timeoutHandles.set(id, handle)
  }

  return id
}

function dismissNotification(id: string) {
  const handle = timeoutHandles.get(id)
  if (handle) {
    clearTimeout(handle)
    timeoutHandles.delete(id)
  }
  notifications.value = notifications.value.filter(n => n.id !== id)
}

function dismissAll() {
  timeoutHandles.forEach(handle => clearTimeout(handle))
  timeoutHandles.clear()
  notifications.value = []
}

defineExpose({
  addNotification,
  dismissNotification,
  dismissAll,
})

const cardStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.surfaceStyle === 'filled') {
    style.backgroundColor = 'var(--section-accent)'
  } else if (props.surfaceStyle === 'subtle') {
    style.backgroundColor = 'var(--section-surface)'
  }
  if (props.borderRadius) {
    style.borderRadius = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? ''
  }
  return style
})

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  if (props.textAlign) {
    style.textAlign = props.textAlign
  }
  return style
})

</script>

<style lang="scss" scoped>
.splash-notification-container {
  position: fixed;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  pointer-events: none;
  z-index: 9999;

  &--top-left {
    top: var(--spacing-md);
    inset-inline-start: var(--spacing-md);
  }

  &--top-right {
    top: var(--spacing-md);
    inset-inline-end: var(--spacing-md);
  }

  &--bottom-left {
    bottom: var(--spacing-md);
    inset-inline-start: var(--spacing-md);
  }

  &--bottom-right {
    bottom: var(--spacing-md);
    inset-inline-end: var(--spacing-md);
  }
}

.notification {
  background: var(--color-background);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  min-width: 30rem;
  max-width: 45rem;
  pointer-events: all;
  border-inline-start: 0.4rem solid var(--color-text-lighter);

  &--success {
    border-inline-start-color: var(--color-primary);

    .notification__icon {
      color: var(--color-primary);
    }
  }

  &--error {
    border-inline-start-color: var(--color-error);

    .notification__icon {
      color: var(--color-error);
    }
  }

  &--warning {
    border-inline-start-color: var(--color-warning);

    .notification__icon {
      color: var(--color-warning);
    }
  }

  &--info {
    border-inline-start-color: var(--color-info);

    .notification__icon {
      color: var(--color-info);
    }
  }
}

.notification__content {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1;
}

.notification__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 2.4rem;
  flex-shrink: 0;

  svg {
    width: 100%;
    height: 100%;
  }
}

.notification__message {
  color: var(--color-text);
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
}

.notification__close {
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--spacing-xs);
  color: var(--color-text-lighter);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
  flex-shrink: 0;
  border-radius: var(--border-radius);

  svg {
    width: 1.8rem;
    height: 1.8rem;
  }

  &:hover {
    color: var(--color-text);
  }

  &:focus-visible {
    outline: 0.2rem solid var(--color-primary);
    outline-offset: 0.2rem;
  }
}

.notification-enter-active,
.notification-leave-active {
  transition: all var(--transition-base);
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(10rem);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(10rem);
}

@media (max-width: $bp-md) {
  .notification {
    min-width: 28rem;
    max-width: 90vw;
    padding: var(--spacing-sm);
  }

  .splash-notification-container {
    &--top-left,
    &--bottom-left {
      inset-inline-start: var(--spacing-xs);
    }

    &--top-right,
    &--bottom-right {
      inset-inline-end: var(--spacing-xs);
    }

    &--top-left,
    &--top-right {
      top: var(--spacing-xs);
    }

    &--bottom-left,
    &--bottom-right {
      bottom: var(--spacing-xs);
    }
  }
}
</style>
