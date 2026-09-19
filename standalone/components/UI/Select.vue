<template>
  <div class="ui-select-wrapper">
    <label v-if="label" :for="selectId" class="ui-select__label">
      {{ label }}
      <span v-if="required" class="ui-select__required" aria-hidden="true">*</span>
    </label>

    <div class="ui-select__container" :class="{ 'ui-select__container--error': !!error }">
      <select
        :id="selectId"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? `${selectId}-error` : undefined"
        :class="[
          'ui-select__field',
          { 'ui-select__field--error': error }
        ]"
        v-bind="$attrs"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
        @blur="$emit('blur')"
        @focus="$emit('focus')"
      >
        <option v-if="placeholder" value="">{{ placeholder }}</option>
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <Icon name="chevron" class="ui-select__icon" aria-hidden="true" />
    </div>

    <span v-if="error" :id="`${selectId}-error`" class="ui-select__error" role="alert">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue'
import Icon from './Icon.vue'

interface SelectOption {
  value: string | number
  label: string
}

interface Props {
  modelValue: string | number
  label?: string
  placeholder?: string
  options: SelectOption[]
  error?: string
  disabled?: boolean
  required?: boolean
  id?: string
}

withDefaults(defineProps<Props>(), {
  disabled: false,
  required: false
})

defineEmits<{
  'update:modelValue': [value: string | number]
  blur: []
  focus: []
}>()

const instance = getCurrentInstance()
const selectId = computed(() => `select-${instance?.uid}`)
</script>

<style scoped lang="scss">
.ui-select-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--ui-spacing-xs);
  width: 100%;
}

.ui-select__label {
  font-size: var(--ui-font-size-sm);
  font-weight: var(--ui-font-weight-semibold);
  color: var(--ui-color-text-muted);
  display: flex;
  align-items: center;
  gap: var(--ui-spacing-xs);
}

.ui-select__required {
  color: var(--ui-color-error);
}

.ui-select__container {
  position: relative;
  display: flex;
  align-items: center;
}

.ui-select__field {
  width: 100%;
  padding: var(--ui-spacing-sm) var(--ui-spacing-md);
  padding-inline-end: var(--ui-spacing-2xl);
  border: 0.1rem solid var(--ui-color-border-input);
  border-radius: var(--ui-radius);
  background-color: var(--ui-color-bg);
  color: var(--ui-color-text);
  font-size: var(--ui-font-size-base);
  font-family: inherit;
  cursor: pointer;
  transition: var(--ui-transition-base);
  appearance: none;
  min-height: 4.8rem;

  &:hover:not(:disabled) {
    border-color: var(--ui-color-primary);
  }

  &:focus {
    outline: none;
    border-color: var(--ui-color-primary);
    box-shadow: 0 0 0 0.3rem var(--ui-color-primary-focus-ring);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: var(--ui-color-bg-subtle);
  }

  &--error {
    border-color: var(--ui-color-error);

    &:focus {
      box-shadow: 0 0 0 0.3rem var(--ui-color-error-focus-ring);
    }
  }
}

.ui-select__icon {
  position: absolute;
  inset-inline-end: var(--ui-spacing-md);
  pointer-events: none;
  color: var(--ui-color-text-muted);
  transform: rotate(180deg);
}

.ui-select__error {
  font-size: var(--ui-font-size-sm);
  color: var(--ui-color-error);
  font-weight: var(--ui-font-weight-semibold);
}
</style>
