<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div
        v-if="isOpen"
        class="ui-modal-backdrop"
        @click="handleBackdropClick"
      >
        <transition name="modal-slide">
          <div
            v-if="isOpen"
            ref="modalRef"
            :class="[
              'ui-modal',
              `ui-modal--${size}`
            ]"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="title ? modalTitleId : undefined"
            @click.stop
            @keydown="handleKeydown"
          >
            <div class="ui-modal__header">
              <slot name="header">
                <h2 v-if="title" :id="modalTitleId" class="ui-modal__title">{{ title }}</h2>
              </slot>

              <button
                v-if="closeable"
                class="ui-modal__close"
                :aria-label="closeLabel"
                @click="handleClose"
              >
                <Icon name="close" />
              </button>
            </div>

            <div class="ui-modal__body">
              <slot />
            </div>

            <div v-if="$slots.footer" class="ui-modal__footer">
              <slot name="footer" />
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted, getCurrentInstance } from 'vue'
import Icon from './Icon.vue'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

interface Props {
  isOpen: boolean
  title?: string
  size?: ModalSize
  closeable?: boolean
  closeOnBackdropClick?: boolean
  closeLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closeable: true,
  closeOnBackdropClick: true,
  closeLabel: 'Close modal'
})

const emit = defineEmits<{
  close: []
  'update:isOpen': [value: boolean]
}>()

const instance = getCurrentInstance()
const modalTitleId = computed(() => `modal-title-${instance?.uid}`)
const modalRef = ref<HTMLElement>()

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ')

let previousFocus: HTMLElement | null = null

const getFocusable = (): HTMLElement[] => {
  if (!modalRef.value) return []
  return Array.from(modalRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

const handleClose = () => {
  emit('update:isOpen', false)
  emit('close')
}

const handleBackdropClick = () => {
  if (props.closeOnBackdropClick) {
    handleClose()
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.closeable) {
    e.stopPropagation()
    handleClose()
    return
  }

  if (e.key === 'Tab') {
    const focusable = getFocusable()
    if (focusable.length === 0) {
      e.preventDefault()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }
}

watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    previousFocus = document.activeElement as HTMLElement
    document.body.style.overflow = 'hidden'
    await nextTick()
    const firstFocusable = getFocusable()[0]
    if (firstFocusable) {
      firstFocusable.focus()
    } else {
      modalRef.value?.focus()
    }
  } else {
    document.body.style.overflow = ''
    previousFocus?.focus()
    previousFocus = null
  }
})

onUnmounted(() => {
  document.body.style.overflow = ''
  previousFocus?.focus()
  previousFocus = null
})
</script>

<style scoped lang="scss">
.ui-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: var(--ui-z-modal-backdrop);
  padding: var(--ui-spacing-md);
}

.ui-modal {
  display: flex;
  flex-direction: column;
  background-color: var(--ui-color-bg);
  border-radius: var(--ui-radius-lg);
  box-shadow: var(--ui-shadow-xl);
  max-height: 90vh;
  overflow-y: auto;
  z-index: var(--ui-z-modal);

  &:focus {
    outline: none;
  }

  // Sizes
  &--sm { width: 100%; max-width: 40rem; }
  &--md { width: 100%; max-width: 60rem; }
  &--lg { width: 100%; max-width: 80rem; }
  &--xl { width: 100%; max-width: 100rem; }
}

.ui-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--ui-spacing-lg);
  border-bottom: 0.1rem solid var(--ui-color-border);
  flex-shrink: 0;
}

.ui-modal__title {
  margin: 0;
  font-size: var(--ui-font-size-lg);
  font-weight: var(--ui-font-weight-bold);
  color: var(--ui-color-text);
}

.ui-modal__close {
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--ui-spacing-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-color-text-muted);
  transition: var(--ui-transition-base);
  flex-shrink: 0;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: var(--ui-radius);

  &:hover {
    color: var(--ui-color-text);
  }

  &:focus-visible {
    outline: 0.2rem solid var(--ui-color-primary);
    outline-offset: 0.2rem;
  }
}

.ui-modal__body {
  padding: var(--ui-spacing-lg);
  flex: 1;
  overflow-y: auto;
  color: var(--ui-color-text);
}

.ui-modal__footer {
  padding: var(--ui-spacing-lg);
  border-top: 0.1rem solid var(--ui-color-border);
  display: flex;
  justify-content: flex-end;
  gap: var(--ui-spacing-sm);
  flex-shrink: 0;
}

// Animations
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--ui-transition-base);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-slide-enter-active,
.modal-slide-leave-active {
  transition: transform var(--ui-transition-base);
}

.modal-slide-enter-from {
  transform: translateY(-2rem);
  opacity: 0;
}

.modal-slide-leave-to {
  transform: translateY(2rem);
  opacity: 0;
}

@media (max-width: $bp-sm) {
  .ui-modal {
    max-height: 100vh;
    border-radius: var(--ui-radius-lg) var(--ui-radius-lg) 0 0;

    &--sm,
    &--md,
    &--lg,
    &--xl {
      max-width: 100%;
    }
  }

  .ui-modal__header,
  .ui-modal__body,
  .ui-modal__footer {
    padding: var(--ui-spacing-md);
  }
}
</style>
