<template>
  <div class="ui-radio-wrapper">
    <label class="ui-radio__label" :for="radioId">
      <input
        :id="radioId"
        :checked="modelValue === value"
        :disabled="disabled"
        :name="name"
        type="radio"
        :value="value"
        class="ui-radio__input"
        v-bind="$attrs"
        @change="$emit('update:modelValue', value)"
      />
      <span class="ui-radio__control" aria-hidden="true" />
      <span v-if="label" class="ui-radio__text">{{ label }}</span>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue'

interface Props {
  modelValue: string | number
  value: string | number
  label?: string
  name: string
  disabled?: boolean
  id?: string
}

withDefaults(defineProps<Props>(), {
  disabled: false
})

defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const instance = getCurrentInstance()
const radioId = computed(() => `radio-${instance?.uid}`)
</script>

<style scoped lang="scss">
.ui-radio-wrapper {
  display: flex;
  width: 100%;
}

.ui-radio__label {
  display: flex;
  align-items: center;
  gap: var(--ui-spacing-sm);
  cursor: pointer;
  user-select: none;
  font-size: var(--ui-font-size-base);
}

.ui-radio__input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  width: 0;
  height: 0;

  &:disabled ~ .ui-radio__control {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:disabled ~ .ui-radio__text {
    opacity: 0.6;
  }
}

.ui-radio__control {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 0.2rem solid var(--ui-color-border);
  border-radius: 50%;
  background-color: var(--ui-color-bg);
  transition: var(--ui-transition-base);
  flex-shrink: 0;

  &::after {
    content: '';
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 50%;
    background-color: var(--ui-color-primary);
    opacity: 0;
    transition: opacity var(--ui-transition-base);
  }
}

.ui-radio__input:checked ~ .ui-radio__control {
  border-color: var(--ui-color-primary);
  background-color: var(--ui-color-bg);

  &::after {
    opacity: 1;
  }
}

.ui-radio__input:focus-visible ~ .ui-radio__control {
  outline: 0.2rem solid var(--ui-color-primary);
  outline-offset: 0.2rem;
  box-shadow: 0 0 0 0.3rem var(--ui-color-primary-focus-ring);
}

.ui-radio__input:hover:not(:disabled) ~ .ui-radio__control {
  border-color: var(--ui-color-primary);
}

.ui-radio__text {
  color: var(--ui-color-text);
}
</style>
