<template>
  <!--
    `--has-image` gates the two-column grid. Without it the container was
    always `1fr 1fr`, so a text-only section rendered its copy in the left half
    and left the right half blank — the image track existed whether or not an
    image did.
  -->
  <section
    class="text-section"
    :class="[
      `text-section--media-${mediaSide}`,
      props.image ? 'text-section--has-image' : null,
    ]"
    :style="{ ...sectionStyles }"
  >
    <div class="text-section__container" :style="contentStyle">
      <div class="text-section__content">
        <span
          v-if="localizedEyebrow"
          class="block-eyebrow"
          data-target="eyebrow"
          v-html="asHtml(localizedEyebrow)"
        ></span>
        <h2 v-if="props.title" data-target="heading" class="text-section__title" v-html="asHtml(localizedTitle)"></h2>

        <div
          v-if="props.body"
          data-target="body"
          class="text-section__body prose"
          v-html="asHtml(localizedBody)"
        ></div>
      </div>

      <div v-if="props.image" data-target="media" class="text-section__image-wrapper">
        <img
          :src="props.image"
          :alt="localizedTitle || 'Section image'"
          class="text-section__image"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BackgroundRole, TextRole } from '~/shared/types/placement'
import { SPACING_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { asHtml } from '~/shared/utils/asHtml'
import { useBlockSurface } from '~/shared/composables/useBlockSurface'
import { useLocalized } from '~/shared/composables/useLocalized'

const { getLocalizedValue } = useLocalized()
type MediaSide = 'left' | 'right' | 'above' | 'below'

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  blocks?: Array<Record<string, unknown>>
  eyebrow?: string | Record<string, string>
  title?: string | Record<string, string>
  body?: string | Record<string, string>
  image?: string
  mediaSide?: MediaSide
  background?: BackgroundRole
  textTone?: TextRole
  internalPadding?: string
  textAlign?: string
  surfaceStyle?: 'none' | 'subtle' | 'filled'
}>(), {
  mediaSide: 'right',
})

const mediaSide = computed((): MediaSide => props.mediaSide || 'right')

const localizedEyebrow = computed(() => getLocalizedValue(props.eyebrow))
const localizedTitle = computed(() => getLocalizedValue(props.title))
const localizedBody = computed(() => getLocalizedValue(props.body))

const { surfaceStyle: blockSurfaceStyle } = useBlockSurface(props, { fallbackBackground: 'transparent' })

const sectionStyles = computed(() => {
  const styles: Record<string, string> = {}
  Object.assign(styles, blockSurfaceStyle.value)
  // surfaceStyle overrides background when set
  if (props.surfaceStyle === 'subtle') {
    delete styles.backgroundColor
    styles.background = 'var(--section-surface, rgba(255,255,255,0.04))'
  } else if (props.surfaceStyle === 'filled') {
    delete styles.backgroundColor
    styles.background = 'var(--section-accent, rgba(255,255,255,0.1))'
  }
  return styles
})

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
.text-section {
  padding: var(--spacing-2xl) var(--spacing-md);

  // Layout collapse keys on the container, not the window (repo contract:
  // useViewport()/@container, never @media px for layout) — so the narrow
  // admin preview pane reflows exactly like a phone.
  @container (max-width: 768px) {
    padding: var(--spacing-xl) var(--spacing-md);
  }

  &__container {
    max-width: 120rem;
    margin-inline: var(--block-measure-align, auto);
    display: grid;
    // Single column by default: only a section that actually has an image needs
    // a second track. See --has-image below.
    grid-template-columns: 1fr;
    gap: var(--spacing-2xl);
    align-items: center;

    @container (max-width: 1024px) {
      gap: var(--spacing-xl);
    }

    @container (max-width: 768px) {
      gap: var(--spacing-lg);
    }
  }

  &--has-image#{&}--media-left &__container,
  &--has-image#{&}--media-right &__container {
    grid-template-columns: 1fr 1fr;

    @container (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  &--media-left &__image-wrapper {
    order: -1;
  }

  &--media-above &__container {
    grid-template-columns: 1fr;

    @container (max-width: 768px) {
      gap: var(--spacing-lg);
    }
  }

  &--media-above &__image-wrapper {
    order: -1;
  }

  &--media-below &__container {
    grid-template-columns: 1fr;

    @container (max-width: 768px) {
      gap: var(--spacing-lg);
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  &__title {
    font-family: var(--rt-slot-heading-family, var(--rt-role-heading2-family, inherit));
    font-size: var(--rt-slot-heading-size, var(--rt-role-heading2-size, var(--font-size-3xl)));
    font-weight: var(--rt-slot-heading-weight, var(--rt-role-heading2-weight, var(--font-weight-bold)));
    line-height: var(--rt-slot-heading-line-height, var(--rt-role-heading2-line-height, var(--line-height-tight)));
    letter-spacing: var(--rt-slot-heading-letter-spacing, var(--rt-role-heading2-letter-spacing, normal));
    text-transform: var(--rt-slot-heading-text-transform, var(--rt-role-heading2-text-transform, none));
    font-variation-settings: var(--rt-slot-heading-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-heading-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-heading-font-stretch, normal);
    font-style: var(--rt-slot-heading-font-style, normal);
    color: var(--rt-slot-heading-color, var(--rt-role-heading2-color, inherit));
    margin: 0;

    @media (max-width: $bp-md) {
      font-size: var(--rt-slot-heading-size, var(--rt-role-heading2-size, var(--font-size-2xl)));
    }
  }

  &__body {
    font-family: var(--rt-slot-body-family, var(--rt-role-body-family, inherit));
    font-size: var(--rt-slot-body-size, var(--rt-role-body-size, var(--font-size-base)));
    font-weight: var(--rt-slot-body-weight, var(--rt-role-body-weight, inherit));
    line-height: var(--rt-slot-body-line-height, var(--rt-role-body-line-height, var(--line-height-relaxed)));
    letter-spacing: var(--rt-slot-body-letter-spacing, var(--rt-role-body-letter-spacing, normal));
    text-transform: var(--rt-slot-body-text-transform, var(--rt-role-body-text-transform, none));
    font-variation-settings: var(--rt-slot-body-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-body-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-body-font-stretch, normal);
    font-style: var(--rt-slot-body-font-style, normal);
    color: var(--rt-slot-body-color, var(--rt-role-body-color, inherit));
    margin: 0;
    opacity: 0.85;
  }

  &__image-wrapper {
    position: relative;
    overflow: hidden;
    border-radius: var(--border-radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__image {
    width: 100%;
    height: auto;
    display: block;
    object-fit: cover;
    border-radius: var(--border-radius-lg);
  }
}
</style>
