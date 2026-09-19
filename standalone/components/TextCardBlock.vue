<template>
  <section
    class="text-card-block"
    :class="rootClasses"
    :style="{ ...rootStyles, ...typographyStyle }"
  >
    <div class="text-card-block__container" :class="containerHeightClass" :style="contentStyle">
      <!-- Image Section -->
      <div
        v-if="showsMedia"
        data-target="media"
        class="text-card-block__image-wrapper"
        :class="[imageAspectClass, imageHoverClass]"
      >
        <div v-if="overlayEnabled" class="text-card-block__overlay" />
        <img
          :src="image"
          alt=""
          class="text-card-block__image"
          aria-hidden="true"
        />
        <span
          v-if="statusLabel"
          class="text-card-block__status-label"
          aria-label="Status"
        >{{ statusLabel }}</span>
      </div>

      <!-- Content Section -->
      <div class="text-card-block__content">
        <h2
          v-if="title"
          data-target="heading"
          class="text-card-block__title"
          v-html="asHtml(title)"
        ></h2>

        <div
          v-if="description"
          data-target="body"
          class="text-card-block__description prose"
          v-html="asHtml(description)"
        ></div>

        <component
          :is="isExternalCta ? 'a' : 'NuxtLink'"
          v-if="ctaUrl && ctaText"
          v-bind="isExternalCta
            ? { href: ctaUrl, target: '_blank', rel: 'noopener noreferrer' }
            : { to: ctaUrl }"
          data-target="cta"
          :class="getButtonClass()"
        >
          {{ ctaText }}
        </component>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BackgroundRole, TextRole } from '~/shared/types/placement'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { useBlockSurface } from '~/shared/composables/useBlockSurface'
import { useTypographySlotStyle } from '~/shared/composables/useTypographySlotStyle'
import { asHtml } from '~/shared/utils/asHtml'

type MediaSide = 'left' | 'right'
type CtaStyle = 'primary' | 'secondary' | 'outline'
type Height = 'auto' | 'small' | 'medium' | 'large'
type ImageAspect = 'square' | 'landscape' | 'portrait' | 'auto'

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  title?: string
  description?: string
  image?: string
  mediaSide?: MediaSide
  showMedia?: boolean
  imageAspect?: ImageAspect
  imageHover?: 'none' | 'zoom'
  ctaText?: string
  ctaUrl?: string
  ctaStyle?: CtaStyle
  ctaPresetKey?: string | null
  background?: BackgroundRole
  textTone?: TextRole
  height?: Height
  overlayEnabled?: boolean
  internalPadding?: string
  textAlign?: string
  surfaceStyle?: string
  borderRadius?: string
  /**
   * statusLabel — optional pill badge overlaid on the image (carry-over
   * from MarketingTile/InfoCard variants). Bottom-left teal pill, no link.
   */
  statusLabel?: string
}>(), {
  mediaSide: 'right',
  showMedia: true,
  imageAspect: 'square',
  imageHover: 'none',
  ctaStyle: 'primary',
  height: 'auto',
  overlayEnabled: false,
})

const typographyStyle = useTypographySlotStyle({
  cta: computed(() => props.ctaPresetKey),
})

const showsMedia = computed(() => props.showMedia !== false && !!props.image)

const rootClasses = computed(() => ({
  [`text-card-block--${props.mediaSide}`]: true,
  'text-card-block--no-image': !showsMedia.value,
}))

const containerHeightClass = computed(() => `text-card-block__container--${props.height}`)
const imageAspectClass = computed(() => `text-card-block__image-wrapper--${props.imageAspect}`)
const imageHoverClass = computed(() =>
  props.imageHover && props.imageHover !== 'none'
    ? `text-card-block__image-wrapper--hover-${props.imageHover}`
    : '',
)

const { surfaceStyle: blockSurfaceStyle } = useBlockSurface(props, { fallbackBackground: 'section' })

const rootStyles = computed(() => {
  const styles: Record<string, string> = {}
  // This card paints through CSS vars its SCSS consumes, not through the
  // properties directly, so the resolved surface is remapped onto them.
  const surface = blockSurfaceStyle.value
  if (surface.backgroundColor) styles['--text-card-bg'] = surface.backgroundColor
  if (surface.color) styles['--text-card-text'] = surface.color
  if (props.surfaceStyle === 'subtle') {
    styles['--text-card-bg'] = 'var(--section-surface, rgba(255,255,255,0.04))'
  } else if (props.surfaceStyle === 'filled') {
    styles['--text-card-bg'] = 'var(--section-accent, rgba(255,255,255,0.1))'
  }
  if (props.borderRadius && props.borderRadius !== 'none') {
    styles['--text-card-border-radius'] = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0'
  }
  return styles
})

const isExternalCta = computed(() => props.ctaUrl?.startsWith('http'))

function getButtonClass(): string {
  return `text-card-block__cta text-card-block__cta--${props.ctaStyle}`
}

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  if (props.textAlign && props.textAlign !== 'left') {
    style.textAlign = props.textAlign
  }
  return style
})
</script>

<style lang="scss" scoped>
.text-card-block {
  --text-card-bg: var(--color-background, #FFFFFF);
  --text-card-text: var(--section-text, var(--color-text, #1d1d1f));
  --text-card-border-radius: 0;

  width: 100%;
  background-color: var(--text-card-bg);
  color: var(--text-card-text);
  padding: var(--spacing-lg) 0;
  border-radius: var(--text-card-border-radius);

  &__container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 var(--spacing-md);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-lg);
    align-items: center;

    &--auto {
      min-height: auto;
    }

    &--small {
      min-height: 300px;
    }

    &--medium {
      min-height: 400px;
    }

    &--large {
      min-height: 600px;
    }
  }

  &--left {
    .text-card-block__container {
      grid-template-columns: 1fr 1fr;
    }

    .text-card-block__image-wrapper {
      order: -1;
    }
  }

  &--right {
    .text-card-block__container {
      grid-template-columns: 1fr 1fr;
    }

    .text-card-block__image-wrapper {
      order: 1;
    }
  }

  &--no-image {
    .text-card-block__container {
      grid-template-columns: 1fr;
    }
  }

  &__image-wrapper {
    position: relative;
    overflow: hidden;
    border-radius: var(--border-radius);

    &--square { aspect-ratio: 1; }
    &--landscape { aspect-ratio: 16 / 9; }
    &--portrait { aspect-ratio: 3 / 4; }
    &--auto { aspect-ratio: auto; }
  }

  &__image-wrapper--hover-zoom {
    .text-card-block__image {
      transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      will-change: transform;
    }

    &:hover .text-card-block__image {
      transform: scale(1.06);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &__image-wrapper--hover-zoom:hover .text-card-block__image {
      transform: none;
    }
  }

  &__overlay {
    position: absolute;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.2);
    z-index: 1;
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  // Status label pill — bottom-left, teal accent, non-link.
  &__status-label {
    position: absolute;
    bottom: 1.6rem;
    left: 1.6rem;
    display: inline-block;
    padding: 0.5rem 1.4rem;
    border-radius: 999px;
    background-color: var(--color-accent, #1B8AB7);
    color: #FFFFFF;
    font-size: 1.2rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    z-index: 3;
    pointer-events: none;
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
  }

  &__title {
    margin: 0;
    font-family: var(--rt-slot-title-family, var(--rt-role-heading2-family, inherit));
    font-size: var(--rt-slot-title-size, var(--rt-role-heading2-size, var(--font-size-3xl)));
    font-weight: var(--rt-slot-title-weight, var(--rt-role-heading2-weight, var(--font-weight-bold)));
    line-height: var(--rt-slot-title-line-height, var(--rt-role-heading2-line-height, var(--line-height-tight)));
    letter-spacing: var(--rt-slot-title-letter-spacing, var(--rt-role-heading2-letter-spacing, normal));
    text-transform: var(--rt-slot-title-text-transform, var(--rt-role-heading2-text-transform, none));
    color: var(--rt-slot-title-color, var(--rt-role-heading2-color, inherit));
  }

  &__description {
    margin: 0;
    font-family: var(--rt-slot-description-family, var(--rt-role-body-family, inherit));
    font-size: var(--rt-slot-description-size, var(--rt-role-body-size, var(--font-size-base)));
    font-weight: var(--rt-slot-description-weight, var(--rt-role-body-weight, inherit));
    line-height: var(--rt-slot-description-line-height, var(--rt-role-body-line-height, var(--line-height-relaxed)));
    letter-spacing: var(--rt-slot-description-letter-spacing, var(--rt-role-body-letter-spacing, normal));
    text-transform: var(--rt-slot-description-text-transform, var(--rt-role-body-text-transform, none));
    color: var(--rt-slot-description-color, var(--rt-role-body-color, inherit));
    opacity: 0.9;
  }

  &__cta {
    align-self: flex-start;
    padding: var(--spacing-sm) var(--spacing-lg);
    font-family: var(--rt-slot-cta-family, var(--rt-role-label-family, inherit));
    font-size: var(--rt-slot-cta-size, var(--rt-role-label-size, var(--font-size-base)));
    font-weight: var(--rt-slot-cta-weight, var(--rt-role-label-weight, var(--font-weight-semibold)));
    line-height: var(--rt-slot-cta-line-height, var(--rt-role-label-line-height, inherit));
    letter-spacing: var(--rt-slot-cta-letter-spacing, var(--rt-role-label-letter-spacing, normal));
    text-transform: var(--rt-slot-cta-text-transform, var(--rt-role-label-text-transform, none));
    color: var(--rt-slot-cta-color, var(--rt-role-label-color, inherit));
    text-decoration: none;
    border-radius: var(--border-radius);
    border: none;
    cursor: pointer;
    transition: all var(--transition-base);
    display: inline-block;

    &--primary {
      background-color: var(--color-primary, #0066cc);
      color: var(--color-white, #FFFFFF);

      &:hover {
        background-color: var(--color-primary-dark, #0052a3);
      }

      &:focus-visible {
        outline: 0.2rem solid var(--color-primary);
        outline-offset: 0.2rem;
      }
    }

    &--secondary {
      background-color: var(--color-gray-100, #f5f5f7);
      color: inherit;

      &:hover {
        background-color: var(--color-border-light, #e5e5e7);
      }

      &:focus-visible {
        outline: 0.2rem solid currentColor;
        outline-offset: 0.2rem;
      }
    }

    &--outline {
      background-color: transparent;
      border: 0.2rem solid currentColor;
      color: inherit;

      &:hover {
        background-color: currentColor;
        color: var(--text-card-bg);
      }

      &:focus-visible {
        outline: 0.2rem solid currentColor;
        outline-offset: 0.2rem;
      }
    }
  }

  @media (max-width: $bp-lg) {
    &__container {
      grid-template-columns: 1fr;
      gap: var(--spacing-md);

      &--small,
      &--medium,
      &--large {
        min-height: auto;
      }
    }

    &--left,
    &--right {
      .text-card-block__image-wrapper {
        order: 0;
      }
    }

    &__image-wrapper {
      &--square { aspect-ratio: 16 / 9; }
    }

    &__content {
      padding: var(--spacing-md);
    }
  }

  @media (max-width: $bp-md) {
    padding: var(--spacing-md) 0;

    &__container {
      padding: 0 var(--spacing-md);
    }

    &__title {
      font-size: var(--font-size-xl);
    }

    &__description {
      font-size: var(--font-size-sm);
    }

    &__content {
      gap: var(--spacing-sm);
      padding: var(--spacing-md) 0;
    }
  }
}
</style>
