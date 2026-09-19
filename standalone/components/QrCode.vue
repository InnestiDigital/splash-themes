<template>
  <figure
    class="qr-code"
    :class="[`qr-code--align-${align}`, `qr-code--vertical-${verticalAlign}`]"
    data-target="root"
  >
    <div class="qr-code__content" :style="contentStyle">
      <svg
        v-if="geometry"
        class="qr-code__graphic"
        :viewBox="`0 0 ${geometry.viewBoxSize} ${geometry.viewBoxSize}`"
        :aria-label="accessibleName"
        role="img"
        shape-rendering="crispEdges"
        data-target="code"
      >
        <rect
          :width="geometry.viewBoxSize"
          :height="geometry.viewBoxSize"
          :fill="backgroundColor"
        />
        <path :d="geometry.path" :fill="foregroundColor" />
      </svg>

      <div v-else-if="isPreview" class="qr-code__placeholder" aria-hidden="true">
        Add QR code content
      </div>

      <figcaption
        v-if="localizedCaption"
        class="qr-code__caption"
        :style="captionStyle"
        data-target="caption"
      >{{ localizedCaption }}</figcaption>
    </div>
  </figure>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useClientConfig } from '~/shared/composables/useClientConfig'
import { useLocalized } from '~/shared/composables/useLocalized'
import {
  resolveCanvasPaletteRole,
  resolveCanvasTypographyStyle,
} from '~/themes/standalone/lib/canvasPrimitiveStyles'
import {
  createQrCodeGeometry,
  type QrErrorCorrection,
} from '~/themes/standalone/lib/createQrCode'

type LocalizedText = string | Record<string, string>

const props = withDefaults(defineProps<{
  value?: LocalizedText
  altText?: LocalizedText
  caption?: LocalizedText
  errorCorrection?: QrErrorCorrection
  quietZone?: number
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  align?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'center' | 'bottom'
  captionAlign?: 'left' | 'center' | 'right'
  foregroundRole?: string
  backgroundRole?: string
  captionRole?: string
  isPreview?: boolean
}>(), {
  value: 'https://example.com',
  errorCorrection: 'M',
  quietZone: 4,
  size: 'md',
  align: 'center',
  verticalAlign: 'center',
  captionAlign: 'center',
  foregroundRole: 'brandOnSurface',
  backgroundRole: 'brandSurface',
  captionRole: 'brandSecondary',
  isPreview: false,
})

const { config } = useClientConfig()
const { getLocalizedPlain } = useLocalized()
const brandTokens = computed(() => config.value.brand?.tokens)
const content = computed(() => getLocalizedPlain(props.value).trim())
const localizedCaption = computed(() => getLocalizedPlain(props.caption).trim())
const accessibleName = computed(() => (
  getLocalizedPlain(props.altText).trim()
  || localizedCaption.value
  || 'QR code'
))

const geometry = computed(() => {
  if (!content.value) return null
  try {
    return createQrCodeGeometry(content.value, props.errorCorrection, props.quietZone)
  }
  catch {
    return null
  }
})

const sizeMap: Record<string, string> = {
  sm: '8rem',
  md: '12rem',
  lg: '16rem',
  xl: '24rem',
  full: '100%',
}

const contentStyle = computed<Record<string, string>>(() => ({
  inlineSize: sizeMap[props.size] ?? sizeMap.md,
}))

const foregroundColor = computed(() => resolveCanvasPaletteRole(
  props.foregroundRole,
  'brandOnSurface',
  brandTokens.value,
))
const backgroundColor = computed(() => resolveCanvasPaletteRole(
  props.backgroundRole,
  'brandSurface',
  brandTokens.value,
))

const captionStyle = computed<Record<string, string>>(() => ({
  ...resolveCanvasTypographyStyle('brandBody', 'brandBody', brandTokens.value),
  fontSize: 'var(--rt-role-caption-size, inherit)',
  color: resolveCanvasPaletteRole(props.captionRole, 'brandSecondary', brandTokens.value),
  textAlign: props.captionAlign,
}))
</script>

<style scoped lang="scss">
.qr-code {
  box-sizing: border-box;
  display: flex;
  inline-size: 100%;
  block-size: 100%;
  margin-block: 0;

  &--align-left { justify-content: flex-start; }
  &--align-center { justify-content: center; }
  &--align-right { justify-content: flex-end; }
  &--vertical-top { align-items: flex-start; }
  &--vertical-center { align-items: center; }
  &--vertical-bottom { align-items: flex-end; }
}

.qr-code__content {
  max-inline-size: 100%;
}

.qr-code__graphic,
.qr-code__placeholder {
  display: block;
  inline-size: 100%;
  aspect-ratio: 1;
}

.qr-code__placeholder {
  display: grid;
  place-items: center;
  padding: 1rem;
  color: var(--section-text-muted, currentColor);
  background: var(--section-surface, transparent);
  text-align: center;
}

.qr-code__caption {
  margin-block-start: var(--spacing-sm, 0.5rem);
}
</style>
