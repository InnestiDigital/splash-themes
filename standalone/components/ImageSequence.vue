<template>
  <section class="image-sequence" :class="layoutClass" :style="rootStyles" data-target="root">
    <div v-if="hasItems" class="image-sequence__container" :class="containerClass" :style="{ ...containerStyles, ...contentStyle }">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="image-sequence__item"
        :class="itemClasses"
        data-target="items"
        :data-item-index="index"
      >
        <div class="image-sequence__media-wrapper" :class="aspectRatioClass">
          <img
            :src="resolveImage(item.image)"
            :alt="getLocalizedValue(item.alt) || ''"
            class="image-sequence__image"
            data-target="media"
            :data-item-index="index"
          />
          <div
            v-if="showCaption && captionPosition === 'overlay' && getLocalizedValue(item.caption)"
            class="image-sequence__caption image-sequence__caption--overlay"
            data-target="caption"
            :data-item-index="index"
            v-html="asHtml(getLocalizedValue(item.caption))"
          ></div>
        </div>
        <div
          v-if="showCaption && captionPosition === 'below' && getLocalizedValue(item.caption)"
          class="image-sequence__caption image-sequence__caption--below"
          data-target="caption"
          :data-item-index="index"
          v-html="asHtml(getLocalizedValue(item.caption))"
        ></div>
      </div>
    </div>
    <div v-else class="image-sequence__empty">
      No images added
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BackgroundRole } from '~/shared/types/placement'
import { computed } from 'vue'
import { SPACING_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { asHtml } from '~/shared/utils/asHtml'
import { useBlockSurface } from '~/shared/composables/useBlockSurface'
import { useLocalized } from '~/shared/composables/useLocalized'

const { getLocalizedValue } = useLocalized()
type Layout = 'masonry' | 'grid' | 'filmstrip'
type AspectRatio = 'auto' | '1:1' | '4:3' | '16:9' | '3:2'
type CaptionPosition = 'below' | 'overlay' | 'hidden'

interface ImageItem {
  image?: string | { url: string }
  caption?: string | Record<string, string>
  alt?: string | Record<string, string>
}

const props = defineProps<{
  items?: ImageItem[]
  layout?: Layout
  columns?: number
  gap?: string
  aspectRatio?: AspectRatio
  captionPosition?: CaptionPosition
  background?: BackgroundRole
  internalPadding?: string
  contentAlignH?: string
}>()

function resolveImage(image: string | { url: string } | undefined): string {
  if (!image) return ''
  if (typeof image === 'string') return image
  return image.url || ''
}

const items = computed(() => props.items ?? [])
const hasItems = computed(() => items.value.length > 0)
const layout = computed((): Layout => props.layout || 'grid')
const columns = computed(() => Math.min(Math.max(props.columns ?? 3, 2), 5))
const gap = computed(() => props.gap || '1rem')
const aspectRatio = computed((): AspectRatio => props.aspectRatio || 'auto')
const captionPosition = computed((): CaptionPosition => props.captionPosition || 'below')
const showCaption = computed(() => captionPosition.value !== 'hidden')

const layoutClass = computed(() => `image-sequence--${layout.value}`)

const containerClass = computed(() => ({
  'image-sequence__container--grid': layout.value === 'grid',
  'image-sequence__container--masonry': layout.value === 'masonry',
  'image-sequence__container--filmstrip': layout.value === 'filmstrip',
}))

const containerStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (layout.value === 'grid') {
    styles.display = 'grid'
    styles.gridTemplateColumns = `repeat(${columns.value}, 1fr)`
    styles.gap = gap.value
  } else if (layout.value === 'masonry') {
    styles.columnCount = String(columns.value)
    styles.columnGap = gap.value
  } else if (layout.value === 'filmstrip') {
    styles.display = 'flex'
    styles.gap = gap.value
    styles.overflowX = 'auto'
  }
  return styles
})

const itemClasses = computed(() => ({
  'image-sequence__item--filmstrip': layout.value === 'filmstrip',
}))

const aspectRatioClass = computed(() => {
  if (aspectRatio.value === 'auto') return ''
  return `image-sequence__media-wrapper--${aspectRatio.value.replace(':', '-')}`
})

const { surfaceStyle } = useBlockSurface(props, { fallbackBackground: 'transparent' })

const rootStyles = computed(() => {
  const styles: Record<string, string> = { ...surfaceStyle.value }
  return styles
})

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  if (props.contentAlignH && props.contentAlignH !== 'left') {
    const __alignMap: Record<string, string> = { center: 'center', right: 'flex-end' }
    const mapped = __alignMap[props.contentAlignH] ?? 'flex-start'
    style.justifyContent = mapped
    style.justifyItems = mapped
  }
  return style
})

</script>

<style lang="scss" scoped>
.image-sequence {
  padding: var(--spacing-3xl) var(--spacing-xl);

  &__container {
    max-width: var(--container-max-width, 1200px);
    margin: 0 auto;

    &--masonry {
      .image-sequence__item {
        break-inside: avoid;
        margin-bottom: 1rem;
      }
    }

    &--filmstrip {
      -webkit-overflow-scrolling: touch;
      scroll-snap-type: x mandatory;
      padding-bottom: var(--spacing-lg);
    }
  }

  &__item {
    &--filmstrip {
      flex: 0 0 auto;
      width: 300px;
      scroll-snap-align: start;
    }
  }

  &__media-wrapper {
    position: relative;
    overflow: hidden;

    &--1-1 {
      aspect-ratio: 1 / 1;
    }

    &--4-3 {
      aspect-ratio: 4 / 3;
    }

    &--16-9 {
      aspect-ratio: 16 / 9;
    }

    &--3-2 {
      aspect-ratio: 3 / 2;
    }
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &__caption {
    font-family: var(--rt-slot-caption-family, var(--rt-role-caption-family, inherit));
    font-size: var(--rt-slot-caption-size, var(--rt-role-caption-size, var(--font-size-sm)));
    font-weight: var(--rt-slot-caption-weight, var(--rt-role-caption-weight, inherit));
    line-height: var(--rt-slot-caption-line-height, var(--rt-role-caption-line-height, var(--line-height-base)));
    letter-spacing: var(--rt-slot-caption-letter-spacing, var(--rt-role-caption-letter-spacing, normal));
    text-transform: var(--rt-slot-caption-text-transform, var(--rt-role-caption-text-transform, none));
    font-variation-settings: var(--rt-slot-caption-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-caption-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-caption-font-stretch, normal);
    font-style: var(--rt-slot-caption-font-style, normal);

    &--below {
      padding: var(--spacing-sm, 0.5rem) 0;
      color: var(--rt-slot-caption-color, var(--rt-role-caption-color, var(--color-text-light, #616161)));
    }

    &--overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 0.75rem);
      background: rgba(0, 0, 0, 0.6);
      color: var(--rt-slot-caption-color, var(--rt-role-caption-color, #fff));
    }
  }

  &__empty {
    text-align: center;
    padding: var(--spacing-3xl) var(--spacing-xl);
    color: var(--color-text-light, #616161);
    font-size: var(--font-size-base);
  }

  // Responsive: collapse columns on mobile
  @media (max-width: $bp-md) {
    &__container--grid {
      grid-template-columns: repeat(2, 1fr) !important;
    }

    &__container--masonry {
      column-count: 2 !important;
    }
  }

  @media (max-width: $bp-sm) {
    &__container--grid {
      grid-template-columns: 1fr !important;
    }

    &__container--masonry {
      column-count: 1 !important;
    }
  }
}
</style>
