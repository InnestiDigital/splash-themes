<template>
  <div class="ui-input-wrapper">
    <label v-if="label" :for="inputId" class="ui-input__label">
      {{ label }}
      <span v-if="required" class="ui-input__required" aria-hidden="true">*</span>
    </label>

    <div class="ui-input__container" :class="{ 'ui-input__container--error': !!error }">
      <slot v-if="$slots.prepend" name="prepend" class="ui-input__prepend" />

      <input
        :id="inputId"
        :value="modelValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined"
        :class="[
          'ui-input__field',
          { 'ui-input__field--error': error }
        ]"
        v-bind="$attrs"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="$emit('blur')"
        @focus="$emit('focus')"
      />

      <slot v-if="$slots.append" name="append" class="ui-input__append" />
    </div>

    <span v-if="error" :id="`${inputId}-error`" class="ui-input__error" role="alert">{{ error }}</span>
    <span v-else-if="helperText" :id="`${inputId}-helper`" class="ui-input__helper">{{ helperText }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue'

interface Props {
  modelValue: string
  label?: string
  placeholder?: string
  type?: string
  error?: string
  helperText?: string
  disabled?: boolean
  required?: boolean
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  required: false
})

defineEmits<{
  'update:modelValue': [value: string]
  blur: []
  focus: []
}>()

const instance = getCurrentInstance()
const inputId = computed(() => props.id ?? `input-${instance?.uid}`)
</script>

<style scoped lang="scss">
.ui-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--ui-spacing-xs);
  width: 100%;
}

.ui-input__label {
  font-size: var(--ui-font-size-sm);
  // Figma: label weight is regular (not semibold)
  font-weight: var(--ui-font-weight-normal);
  color: var(--ui-color-text-muted);
  display: flex;
  align-items: center;
  gap: var(--ui-spacing-xs);
}

.ui-input__required {
  color: var(--ui-color-error);
}

.ui-input__container {
  display: flex;
  align-items: center;
  border: 0.1rem solid var(--ui-color-border-input);
  border-radius: var(--ui-radius);
  background-color: var(--ui-color-bg);
  transition: var(--ui-transition-base);
  overflow: hidden;

  &:focus-within {
    border-color: var(--ui-color-primary);
    box-shadow: 0 0 0 0.3rem var(--ui-color-primary-focus-ring);
  }

  &--error {
    border-color: var(--ui-color-error);

    &:focus-within {
      border-color: var(--ui-color-error);
      box-shadow: 0 0 0 0.3rem var(--ui-color-error-focus-ring);
    }
  }
}

.ui-input__field {
  flex: 1;
  padding: var(--ui-spacing-sm) var(--ui-spacing-md);
  border: none;
  background-color: transparent;
  color: var(--ui-color-text);
  font-size: var(--ui-font-size-base);
  font-family: inherit;
  min-height: 4.8rem;

  &::placeholder {
    color: var(--ui-color-text-faint);
  }

  &:focus {
    outline: none;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: var(--ui-color-bg-subtle);
  }
}

.ui-input__error {
  font-size: var(--ui-font-size-sm);
  color: var(--ui-color-error);
  font-weight: var(--ui-font-weight-normal);
}

.ui-input__helper {
  font-size: var(--ui-font-size-sm);
  color: var(--ui-color-text-muted);
}

:deep(.ui-input__prepend),
:deep(.ui-input__append) {
  display: flex;
  align-items: center;
  padding: 0 var(--ui-spacing-md);
  color: var(--ui-color-text-muted);
}
</style>
