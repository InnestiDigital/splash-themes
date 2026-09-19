<template>
  <div
    class="header-logo-zone"
    data-target="logo"
    :style="{
      transform: resolvedStyle.transform,
      transformOrigin: 'center center',
      opacity: resolvedStyle.opacity,
      pointerEvents: resolvedStyle.pointerEvents,
      visibility: resolvedStyle.visibility,
      willChange: 'transform, opacity',
    }"
  >
    <NuxtLink :to="homeUrl" class="header-logo-zone__link">
      <img
        v-if="activeLogo"
        :src="activeLogo"
        :alt="logoAlt"
        class="header-logo-zone__img"
      />
      <span v-else-if="logoText" class="header-logo-zone__text">
        {{ logoText }}
      </span>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ResolvedZoneStyle } from '~/shared/types/headerZone'

const props = defineProps<{
  logoUrl: string
  logoAlt: string
  compactLogoUrl: string
  logoText: string
  homeUrl: string
  isCompact: boolean
  resolvedStyle: ResolvedZoneStyle
}>()

const activeLogo = computed(() => {
  if (props.isCompact && props.compactLogoUrl) return props.compactLogoUrl
  return props.logoUrl
})
</script>

<style lang="scss" scoped>
.header-logo-zone {
  flex-shrink: 0;
  display: flex;
  align-items: center;

  &__link {
    display: inline-flex;
    align-items: center;
    // WCAG minimum tap target — the wordmark glyphs are short, so enlarge the
    // vertical hit area to 44px. The header row is 6rem tall, so no layout shift.
    min-height: 4.4rem;
    text-decoration: none;
    color: inherit;
    transition: opacity var(--transition-fast);

    &:hover { opacity: 0.8; }
    &:focus-visible {
      outline: 0.2rem solid var(--color-primary);
      outline-offset: 0.2rem;
      border-radius: var(--border-radius);
    }
  }

  &__img {
    height: 4.8rem;
    width: auto;
    object-fit: contain;
  }

  &__text {
    font-family: var(--font-family-heading, 'dm-serif-display', Georgia, serif);
    font-size: 1.3rem;
    font-weight: var(--font-weight-semibold);
    color: var(--header-text-color);
    letter-spacing: -0.02em;
  }
}
</style>
