<template>
  <Modal
    :is-open="isOpen"
    :title="t('cart.removeItemTitle', 'Remove Item')"
    size="sm"
    @close="handleClose"
    @update:is-open="$emit('update:isOpen', $event)"
  >
    <p class="remove-item-modal__message">
      {{ t('cart.removeItemConfirm', 'Are you sure you want to remove this item from your cart?') }}
    </p>

    <p v-if="itemName" class="remove-item-modal__item-name">
      <strong>{{ itemName }}</strong>
    </p>

    <template #footer>
      <button
        class="remove-item-modal__btn remove-item-modal__btn--cancel"
        type="button"
        :disabled="loading"
        @click="handleClose"
      >
        {{ t('common.cancel', 'Cancel') }}
      </button>
      <button
        class="remove-item-modal__btn remove-item-modal__btn--confirm"
        type="button"
        :disabled="loading"
        @click="handleConfirm"
      >
        <span v-if="loading" aria-hidden="true">{{ t('common.loading', 'Loading...') }}</span>
        <span v-else>{{ t('cart.removeItem', 'Remove') }}</span>
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Modal from './Modal.vue'

interface Props {
  isOpen: boolean
  itemName?: string
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  'update:isOpen': [value: boolean]
  confirm: []
  cancel: []
}>()

const { t } = useI18n()

function handleClose() {
  emit('update:isOpen', false)
  emit('cancel')
}

function handleConfirm() {
  emit('confirm')
}
</script>

<style scoped>
.remove-item-modal__message {
  font-size: var(--ui-font-size-base);
  color: var(--ui-color-text);
  margin-bottom: var(--ui-spacing-md);
  line-height: var(--ui-line-height-relaxed);
}

.remove-item-modal__item-name {
  font-size: var(--ui-font-size-base);
  color: var(--ui-color-text-muted);
  margin-bottom: 0;
}

.remove-item-modal__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 2rem;
  border-radius: var(--ui-radius);
  font-size: var(--ui-font-size-base);
  font-weight: var(--ui-font-weight-semibold);
  cursor: pointer;
  border: none;
  min-height: 4rem;
  transition: background-color var(--ui-transition-fast);
}

.remove-item-modal__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.remove-item-modal__btn--cancel {
  background-color: transparent;
  color: var(--ui-color-text-muted);
  border: 0.1rem solid var(--ui-color-border);
}

.remove-item-modal__btn--cancel:hover:not(:disabled) {
  background-color: var(--ui-color-bg-subtle);
}

.remove-item-modal__btn--confirm {
  background-color: var(--ui-color-error);
  color: var(--ui-color-bg);
}

.remove-item-modal__btn--confirm:hover:not(:disabled) {
  background-color: var(--ui-color-error-dark);
}

.remove-item-modal__btn:focus-visible {
  outline: 0.2rem solid var(--ui-color-primary);
  outline-offset: 0.2rem;
}
</style>
