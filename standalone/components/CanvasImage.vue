<template>
  <figure
    class="canvas-image"
    :class="`canvas-image--align-${blockAlign}`"
    :style="rootStyle"
    data-target="root"
  >
    <div
      class="canvas-image__frame"
      :class="{ 'canvas-image__frame--fill': aspectRatio === 'auto' }"
      :style="frameStyle"
      data-target="frame"
    >
      <img
        v-if="imageSource"
        class="canvas-image__media"
        :src="imageSource"
        :alt="localizedAlt"
        :style="imageStyle"
        data-target="image"
      />
      <div v-else-if="isPreview" class="canvas-image__placeholder" aria-hidden="true">
        <span>Add an image</span>
      </div>
    </div>

    <figcaption
      v-if="renderedCaption"
      class="canvas-image__caption"
      :style="captionStyle"
      data-target="caption"
      v-html="renderedCaption"
    />
  </figure>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useClientConfig } from '~/shared/composables/useClientConfig'
import { useLocalized } from '~/shared/composables/useLocalized'
import {
  BORDER_RADIUS_TOKEN_MAP,
  SHADOW_TOKEN_MAP,
  SPACING_TOKEN_MAP,
} from '~/shared/features/cms/placement/placementTokenMaps'
import { asHtml } from '~/shared/utils/asHtml'
import {
  mediaArtDirectionStyle,
  resolveAspectRatio,
  type FocalPointToken,
} from '~/shared/features/cms/media/artDirection'
import {
  resolveCanvasMediaSource,
  resolveCanvasPaletteRole,
  resolveCanvasTypographyStyle,
} from '~/themes/standalone/lib/canvasPrimitiveStyles'

type LocalizedText = string | Record<string, string>
type MediaValue = string | { url?: string; src?: string }

const props = withDefaults(defineProps<{
  image?: MediaValue
  altText?: LocalizedText
  caption?: LocalizedText
  objectFit?: 'cover' | 'contain'
  aspectRatio?: 'auto' | 'square' | 'portrait' | 'classic' | 'landscape' | 'wide'
  focalPoint?: FocalPointToken
  measureWidth?: 'content' | 'narrow' | 'standard' | 'wide' | 'full'
  blockAlign?: 'left' | 'center' | 'right'
  frameRole?: string
  captionRole?: string
  captionAlign?: 'left' | 'center' | 'right'
  internalPadding?: string
  borderRadius?: string
  shadow?: string
  isPreview?: boolean
}>(), {
  objectFit: 'cover',
  aspectRatio: 'auto',
  focalPoint: 'center',
  measureWidth: 'full',
  blockAlign: 'center',
  frameRole: 'transparent',
  captionRole: 'brandSecondary',
  captionAlign: 'left',
  internalPadding: 'none',
  borderRadius: 'none',
  shadow: 'none',
  isPreview: false,
})

const { getLocalizedValue, getLocalizedPlain } = useLocalized()
const { config } = useClientConfig()
const brandTokens = computed(() => config.value.brand?.tokens)

const imageSource = computed(() => resolveCanvasMediaSource(props.image))
const localizedAlt = computed(() => getLocalizedPlain(props.altText))
const renderedCaption = computed(() => asHtml(getLocalizedValue(props.caption)))

const rootStyle = computed<Record<string, string>>(() => ({
  '--block-measure': props.measureWidth === 'full'
    ? '100%'
    : `var(--measure-width-${props.measureWidth})`,
  backgroundColor: resolveCanvasPaletteRole(props.frameRole, 'transparent', brandTokens.value),
  borderRadius: BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0',
  boxShadow: SHADOW_TOKEN_MAP[props.shadow] ?? 'none',
  padding: SPACING_TOKEN_MAP[props.internalPadding] ?? '0',
}))

const frameStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {
    borderRadius: BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0',
  }
  const ratio = resolveAspectRatio(props.aspectRatio)
  if (ratio) style.aspectRatio = ratio
  return style
})

const imageStyle = computed<Record<string, string>>(() =>
  mediaArtDirectionStyle({ objectFit: props.objectFit, focalPoint: props.focalPoint }),
)

const captionStyle = computed<Record<string, string>>(() => ({
  ...resolveCanvasTypographyStyle('brandBody', 'brandBody', brandTokens.value),
  fontSize: 'var(--rt-role-caption-size, inherit)',
  color: resolveCanvasPaletteRole(props.captionRole, 'brandSecondary', brandTokens.value),
  textAlign: props.captionAlign,
}))
</script>

<style scoped lang="scss">
.canvas-image {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  inline-size: 100%;
  block-size: 100%;
  margin-block: 0;

  &--align-left { align-items: flex-start; }
  &--align-center { align-items: center; }
  &--align-right { align-items: flex-end; }
}

.canvas-image__frame {
  box-sizing: border-box;
  inline-size: 100%;
  max-inline-size: var(--block-measure, 100%);
  overflow: hidden;

  &--fill {
    flex: 1 1 auto;
    min-block-size: 0;
  }
}

.canvas-image__media,
.canvas-image__placeholder {
  display: block;
  inline-size: 100%;
  block-size: 100%;
}

.canvas-image__media { object-fit: cover; }

.canvas-image__placeholder {
  display: grid;
  min-block-size: 12rem;
  place-items: center;
  color: var(--section-text-muted, currentColor);
  background: var(--section-surface, transparent);
  font: inherit;
}

.canvas-image__caption {
  inline-size: 100%;
  max-inline-size: var(--block-measure, 100%);
  margin-block-start: var(--spacing-sm, 0.8rem);

  :deep(> :first-child) { margin-block-start: 0; }
  :deep(> :last-child) { margin-block-end: 0; }
}
</style>
