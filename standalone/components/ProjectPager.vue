<template>
  <section
    class="splash-project-pager"
    :class="{ 'splash-project-pager--monochrome': monochrome }"
    data-target="root"
  >
    <div
      class="splash-project-pager__container"
      :class="containerSurfaceClass"
      :style="containerStyle"
    >
      <nav
        class="splash-project-pager__wall"
        :class="{ 'splash-project-pager__wall--single': sides.length === 1 }"
        aria-label="Project navigation"
      >
        <component
          :is="side.link ? 'a' : 'div'"
          v-for="side in sides"
          :key="side.key"
          class="splash-project-pager__card"
          :class="[
            `splash-project-pager__card--${side.key}`,
            { 'splash-project-pager__card--linked': side.link },
          ]"
          :data-target="side.key"
          :href="side.link || undefined"
          :aria-label="side.link ? `${side.eyebrow}: ${side.title}` : undefined"
        >
          <span class="splash-project-pager__eyebrow">
            <span
              v-if="side.key === 'prev'"
              class="splash-project-pager__arrow splash-project-pager__arrow--prev"
              aria-hidden="true"
            >&#8592;</span>
            <span class="splash-project-pager__eyebrow-text">{{ side.eyebrow }}</span>
            <span
              v-if="side.key === 'next'"
              class="splash-project-pager__arrow splash-project-pager__arrow--next"
              aria-hidden="true"
            >&#8594;</span>
          </span>

          <span v-if="side.title" class="splash-project-pager__title">{{ side.title }}</span>

          <span v-if="side.meta" class="splash-project-pager__meta">{{ side.meta }}</span>

          <span
            v-if="showThumbnails && side.image"
            class="splash-project-pager__thumb"
            :class="{ 'splash-project-pager__thumb--always': thumbnailReveal === 'always' }"
          >
            <img
              :src="side.image"
              class="splash-project-pager__img"
              loading="lazy"
              decoding="async"
              :alt="side.title ? `${side.title} thumbnail` : ''"
            />
          </span>
        </component>
      </nav>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { useLocalized } from '~/shared/composables/useLocalized'

const { getLocalizedValue } = useLocalized()

type Localized = string | Record<string, string>

interface Side {
  key: 'prev' | 'next'
  eyebrow: string
  title: string
  meta: string
  image?: string
  link?: string
}

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  prevEyebrow?: Localized
  prevTitle?: Localized
  prevMeta?: Localized
  prevImage?: string
  prevLink?: string
  nextEyebrow?: Localized
  nextTitle?: Localized
  nextMeta?: Localized
  nextImage?: string
  nextLink?: string
  showThumbnails?: boolean
  thumbnailReveal?: 'hover' | 'always'
  monochrome?: boolean
  surfaceStyle?: string
  borderRadius?: string
  internalPadding?: string
}>(), {
  showThumbnails: true,
  thumbnailReveal: 'hover',
  monochrome: false,
  surfaceStyle: 'none',
  borderRadius: 'none',
  internalPadding: 'none',
})

const sides = computed<Side[]>(() => {
  const result: Side[] = []

  const prevTitle = getLocalizedValue(props.prevTitle)
  if (prevTitle || props.prevLink) {
    result.push({
      key: 'prev',
      eyebrow: getLocalizedValue(props.prevEyebrow) || 'Previous',
      title: prevTitle,
      meta: getLocalizedValue(props.prevMeta),
      image: props.prevImage || undefined,
      link: props.prevLink || undefined,
    })
  }

  const nextTitle = getLocalizedValue(props.nextTitle)
  if (nextTitle || props.nextLink) {
    result.push({
      key: 'next',
      eyebrow: getLocalizedValue(props.nextEyebrow) || 'Next',
      title: nextTitle,
      meta: getLocalizedValue(props.nextMeta),
      image: props.nextImage || undefined,
      link: props.nextLink || undefined,
    })
  }

  return result
})

const containerSurfaceClass = computed(() =>
  props.surfaceStyle && props.surfaceStyle !== 'none'
    ? `splash-project-pager__container--surface-${props.surfaceStyle}`
    : ''
)

const containerStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  if (props.borderRadius && props.borderRadius !== 'none') {
    style.borderRadius = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0'
  }
  return style
})
</script>

<style lang="scss" scoped>
.splash-project-pager {
  padding: var(--spacing-2xl) var(--spacing-md);

  @media (max-width: $bp-md) {
    padding: var(--spacing-xl) var(--spacing-md);
  }

  &__container {
    max-width: 120rem;
    margin: 0 auto;

    &--surface-subtle {
      background: var(--section-surface, rgba(255, 255, 255, 0.04));
    }

    &--surface-filled {
      background: var(--section-accent, rgba(255, 255, 255, 0.1));
    }
  }

  /* ── Auto-fit grid: collapses intrinsically, no @media count juggling. ── */
  &__wall {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
    gap: var(--spacing-xl);
    align-items: stretch;

    @media (max-width: $bp-sm) {
      gap: var(--spacing-lg);
    }

    &--single {
      max-width: 40rem;
      margin-inline: auto;
      grid-template-columns: minmax(0, 1fr);
    }
  }

  &__card {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-lg);
    // min-width:0 lets the flex/grid card shrink below its content's intrinsic
    // width so a long unbreakable title can never force page-wide horizontal scroll.
    min-width: 0;
    text-decoration: none;
    color: inherit;
    border-radius: var(--border-radius-sm, 4px);
    transition: background var(--transition-base), opacity var(--transition-base);

    &--prev {
      text-align: start;
      align-items: flex-start;
    }

    &--next {
      text-align: end;
      align-items: flex-end;
    }

    &--linked {
      cursor: pointer;

      &:hover,
      &:focus-within {
        background: var(--section-surface, rgba(0, 0, 0, 0.04));
      }
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  }

  &__eyebrow {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-family: var(--rt-role-overline-family, inherit);
    font-size: var(--rt-role-overline-size, var(--font-size-sm, 0.85rem));
    font-weight: var(--rt-role-overline-weight, var(--font-weight-medium));
    letter-spacing: var(--rt-role-overline-letter-spacing, 0.08em);
    text-transform: var(--rt-role-overline-text-transform, uppercase);
    color: var(--section-text-secondary, var(--color-text-lighter, #666));
  }

  &__arrow {
    display: inline-block;
    transition: transform var(--transition-base);
  }

  &__title {
    font-family: var(--rt-role-heading2-family, inherit);
    font-size: var(--rt-role-heading2-size, var(--font-size-2xl));
    font-weight: var(--rt-role-heading2-weight, var(--font-weight-bold));
    line-height: var(--rt-role-heading2-line-height, 1.15);
    letter-spacing: var(--rt-role-heading2-letter-spacing, normal);
    text-transform: var(--rt-role-heading2-text-transform, none);
    color: var(--rt-role-heading2-color, inherit);
    overflow-wrap: anywhere;
  }

  &__meta {
    font-size: var(--font-size-sm, 0.85rem);
    color: var(--section-text-secondary, var(--color-text-lighter, #666));
    overflow-wrap: anywhere;
  }

  /* ── Thumbnail: hidden by default, revealed on card hover / focus. ── */
  &__thumb {
    display: block;
    margin-block-start: var(--spacing-sm);
    max-width: 16rem;
    width: 100%;
    opacity: 0;
    transform: translateY(0.5rem);
    max-height: 0;
    overflow: hidden;
    transition:
      opacity var(--transition-base),
      transform var(--transition-base),
      max-height var(--transition-base);

    &--always {
      opacity: 1;
      transform: none;
      max-height: 20rem;
    }
  }

  &__card--next &__thumb {
    margin-inline-start: auto;
  }

  &__card:hover &__thumb,
  &__card:focus-within &__thumb {
    opacity: 1;
    transform: translateY(0);
    max-height: 20rem;
  }

  &__img {
    display: block;
    width: 100%;
    height: auto;
    object-fit: cover;
    border-radius: var(--border-radius-sm, 4px);
  }

  /* ── Arrow slide affordance on hover / focus (motion). ── */
  &__card:hover,
  &__card:focus-within {
    .splash-project-pager__arrow--prev {
      transform: translateX(-0.35rem);
    }

    .splash-project-pager__arrow--next {
      transform: translateX(0.35rem);
    }
  }

  /* ── Touch / no-hover devices can't hover-reveal: show thumbnails outright
        (and drop the monochrome-until-hover dim) so mobile isn't left blank. ── */
  @media (hover: none) {
    .splash-project-pager__thumb {
      opacity: 1;
      transform: none;
      max-height: 20rem;
    }

    &.splash-project-pager--monochrome .splash-project-pager__img {
      filter: none;
      opacity: 1;
    }
  }

  /* ── Monochrome thumbnails: desaturate until hover (colour only). ── */
  &--monochrome {
    .splash-project-pager__img {
      filter: grayscale(1);
      opacity: 0.7;
      transition: filter var(--transition-base), opacity var(--transition-base);
    }

    .splash-project-pager__card:hover .splash-project-pager__img,
    .splash-project-pager__card:focus-within .splash-project-pager__img {
      filter: grayscale(0);
      opacity: 1;
    }
  }

  /* ── Reduced motion: drop movement, keep opacity / colour reveals. ── */
  @media (prefers-reduced-motion: reduce) {
    .splash-project-pager__arrow {
      transition: none;
    }

    .splash-project-pager__card:hover .splash-project-pager__arrow--prev,
    .splash-project-pager__card:focus-within .splash-project-pager__arrow--prev,
    .splash-project-pager__card:hover .splash-project-pager__arrow--next,
    .splash-project-pager__card:focus-within .splash-project-pager__arrow--next {
      transform: none;
    }

    .splash-project-pager__thumb {
      transform: none;
      transition: opacity var(--transition-base), max-height var(--transition-base);
    }

    .splash-project-pager__card:hover .splash-project-pager__thumb,
    .splash-project-pager__card:focus-within .splash-project-pager__thumb {
      transform: none;
    }
  }
}
</style>
