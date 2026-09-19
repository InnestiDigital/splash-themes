<template>
  <div
    class="header-actions-zone"
    data-target="actions"
    :style="{
      transform: resolvedStyle.transform,
      transformOrigin: 'right center',
      opacity: resolvedStyle.opacity,
      pointerEvents: resolvedStyle.pointerEvents,
      visibility: resolvedStyle.visibility,
      willChange: 'transform, opacity',
    }"
  >
    <button
      v-if="showLanguageToggle"
      class="header-actions-zone__lang-button"
      :aria-label="languageLabel"
      @click="$emit('toggleLanguage')"
    >
      {{ currentLocale === 'en-US' ? 'EN' : 'FR' }}
      <svg class="header-actions-zone__caret" viewBox="0 0 10 6" fill="none" aria-hidden="true">
        <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ResolvedZoneStyle } from '~/shared/types/headerZone'

defineProps<{
  showLanguageToggle: boolean
  currentLocale: string
  languageLabel: string
  resolvedStyle: ResolvedZoneStyle
}>()

defineEmits<{
  toggleLanguage: []
}>()
</script>

<style lang="scss" scoped>
.header-actions-zone {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  flex-shrink: 0;

  &__lang-button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 1.3rem;
    font-weight: var(--font-weight-medium);
    color: var(--nav-link-color, var(--color-text));
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.4rem 0.2rem;
    transition: color var(--transition-fast);
    white-space: nowrap;

    &:hover { color: var(--nav-link-hover-color, var(--color-primary)); }
    &:focus-visible {
      outline: 0.2rem solid var(--color-primary);
      outline-offset: 0.2rem;
      border-radius: 0.2rem;
    }
  }

  &__caret {
    width: 1rem;
    height: 0.6rem;
    flex-shrink: 0;
  }
}
</style>
