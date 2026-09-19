<template>
  <div class="ui-checkbox-wrapper" :class="{ 'ui-checkbox--error': error }">
    <label class="ui-checkbox__label" :for="checkboxId">
      <input
        :id="checkboxId"
        :checked="isChecked"
        :indeterminate="indeterminate"
        :disabled="disabled"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? errorId : undefined"
        type="checkbox"
        class="ui-checkbox__input"
        v-bind="$attrs"
        @change="handleChange"
      />
      <span class="ui-checkbox__control" aria-hidden="true">
        <Icon v-if="isChecked" name="check" class="ui-checkbox__check-icon" />
        <span v-else-if="indeterminate" class="ui-checkbox__minus" />
      </span>
      <span v-if="label" class="ui-checkbox__text">{{ label }}</span>
    </label>
    <p v-if="error" :id="errorId" class="ui-checkbox__error" role="alert">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue'
import Icon from './Icon.vue'

interface Props {
  modelValue?: boolean | null
  label?: string
  disabled?: boolean
  indeterminate?: boolean
  id?: string
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
  indeterminate: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const instance = getCurrentInstance()
const checkboxId = computed(() => props.id ?? `checkbox-${instance?.uid}`)
const errorId = computed(() => `${checkboxId.value}-error`)

const isChecked = computed(() => {
  if (props.indeterminate) return false
  return props.modelValue === true
})

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}
</script>

<style scoped lang="scss">
.ui-checkbox-wrapper {
  display: flex;
  width: 100%;
}

.ui-checkbox__label {
  display: flex;
  align-items: center;
  gap: var(--ui-spacing-sm);
  cursor: pointer;
  user-select: none;
  font-size: var(--ui-font-size-base);
}

.ui-checkbox__input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  width: 0;
  height: 0;

  &:disabled ~ .ui-checkbox__control {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:disabled ~ .ui-checkbox__text {
    opacity: 0.6;
  }
}

.ui-checkbox__control {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 0.2rem solid var(--ui-color-border);
  border-radius: var(--ui-radius);
  background-color: var(--ui-color-bg);
  transition: var(--ui-transition-base);
  flex-shrink: 0;
}

.ui-checkbox__input:checked ~ .ui-checkbox__control {
  border-color: var(--ui-color-primary);
  background-color: var(--ui-color-primary);
}

.ui-checkbox__input:indeterminate ~ .ui-checkbox__control {
  border-color: var(--ui-color-primary);
  background-color: var(--ui-color-primary);
}

.ui-checkbox__input:focus-visible ~ .ui-checkbox__control {
  outline: 0.2rem solid var(--ui-color-primary);
  outline-offset: 0.2rem;
  box-shadow: 0 0 0 0.3rem var(--ui-color-primary-focus-ring);
}

.ui-checkbox__input:hover:not(:disabled) ~ .ui-checkbox__control {
  border-color: var(--ui-color-primary);
}

.ui-checkbox__check-icon {
  width: 1.4rem;
  height: 1.4rem;
  color: var(--ui-color-bg);
}

.ui-checkbox__minus {
  display: inline-block;
  width: 1rem;
  height: 0.2rem;
  background-color: var(--ui-color-bg);
}

.ui-checkbox__text {
  color: var(--ui-color-text);
}

.ui-checkbox--error .ui-checkbox__control {
  border-color: var(--ui-color-error);
}

.ui-checkbox__error {
  margin: 0.4rem 0 0 0;
  padding-inline-start: 3rem;
  font-size: var(--ui-font-size-sm);
  color: var(--ui-color-error);
}
</style>
