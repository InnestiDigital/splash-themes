<template>
  <div
    class="brand-mark"
    :class="[`brand-mark--align-${align}`, `brand-mark--vertical-${verticalAlign}`]"
    :style="rootStyle"
    data-target="root"
  >
    <img
      v-if="selectedAsset"
      class="brand-mark__image"
      :src="selectedAsset"
      :alt="accessibleName"
      :style="imageStyle"
      data-target="mark"
    />
    <span
      v-else
      class="brand-mark__fallback"
      :style="fallbackStyle"
      data-target="mark"
    >{{ brandName }}</span>

    <span
      v-if="showTagline && tagline"
      class="brand-mark__tagline"
      :style="taglineStyle"
      data-target="tagline"
    >{{ tagline }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useClientConfig } from '~/shared/composables/useClientConfig'
import {
  BORDER_RADIUS_TOKEN_MAP,
  SPACING_TOKEN_MAP,
} from '~/shared/features/cms/placement/placementTokenMaps'
import {
  resolveCanvasPaletteRole,
  resolveCanvasTypographyStyle,
} from '~/themes/standalone/lib/canvasPrimitiveStyles'
import type { BrandCanvasBrandLayer } from '~/shared/types/brandCanvasTheme'

type LocalizedText = string | Record<string, string>
type MarkVariant = 'primary' | 'inverse' | 'mark'

const props = withDefaults(defineProps<{
  markVariant?: MarkVariant
  altText?: LocalizedText
  showTagline?: boolean
  size?: 'sm' | 'md' | 'lg' | 'full'
  fit?: 'contain' | 'cover'
  align?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'center' | 'bottom'
  foregroundRole?: string
  backgroundRole?: string
  internalPadding?: string
  borderRadius?: string
}>(), {
  markVariant: 'primary',
  showTagline: false,
  size: 'md',
  fit: 'contain',
  align: 'center',
  verticalAlign: 'center',
  foregroundRole: 'brandOnSurface',
  backgroundRole: 'transparent',
  internalPadding: 'none',
  borderRadius: 'none',
})

const { config } = useClientConfig()
const { getLocalizedPlain } = useLocalized()

const brand = computed(() => config.value.brand)
const brandTokens = computed(() => brand.value?.tokens)

const selectedAsset = computed(() => {
  type MarkAssetField = keyof Pick<
    BrandCanvasBrandLayer,
    'logoPrimary' | 'logoInverse' | 'logoMark'
  >
  const fieldByVariant: Record<MarkVariant, MarkAssetField> = {
    primary: 'logoPrimary',
    inverse: 'logoInverse',
    mark: 'logoMark',
  }
  const value = brand.value?.[fieldByVariant[props.markVariant]]
  return typeof value === 'string' ? value.trim() : ''
})

const brandName = computed(() => {
  const value = brand.value?.brandName.trim()
  return value || 'Brand'
})

const tagline = computed(() => brand.value?.tagline.trim() || '')
const accessibleName = computed(() => getLocalizedPlain(props.altText, brandName.value))

const sizeMap: Record<string, string> = {
  sm: '8rem',
  md: '16rem',
  lg: '28rem',
  full: '100%',
}

const rootStyle = computed<Record<string, string>>(() => ({
  color: resolveCanvasPaletteRole(props.foregroundRole, 'brandOnSurface', brandTokens.value),
  backgroundColor: resolveCanvasPaletteRole(props.backgroundRole, 'transparent', brandTokens.value),
  borderRadius: BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0',
  padding: SPACING_TOKEN_MAP[props.internalPadding] ?? '0',
}))

const imageStyle = computed<Record<string, string>>(() => ({
  inlineSize: sizeMap[props.size] ?? sizeMap.md,
  objectFit: props.fit,
}))

const fallbackStyle = computed<Record<string, string>>(() => ({
  ...resolveCanvasTypographyStyle('brandHeadline', 'brandHeadline', brandTokens.value),
  fontSize: 'var(--rt-role-heading2-size, inherit)',
  maxInlineSize: sizeMap[props.size] ?? sizeMap.md,
}))

const taglineStyle = computed<Record<string, string>>(() => ({
  ...resolveCanvasTypographyStyle('brandBody', 'brandBody', brandTokens.value),
  fontSize: 'var(--rt-role-caption-size, inherit)',
  color: resolveCanvasPaletteRole('brandSecondary', 'brandSecondary', brandTokens.value),
}))
</script>

<style scoped lang="scss">
.brand-mark {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 0.8rem);
  inline-size: 100%;
  block-size: 100%;

  &--align-left { align-items: flex-start; text-align: left; }
  &--align-center { align-items: center; text-align: center; }
  &--align-right { align-items: flex-end; text-align: right; }
  &--vertical-top { justify-content: flex-start; }
  &--vertical-center { justify-content: center; }
  &--vertical-bottom { justify-content: flex-end; }
}

.brand-mark__image {
  display: block;
  block-size: auto;
  max-inline-size: 100%;
}

.brand-mark__fallback {
  color: inherit;
  overflow-wrap: anywhere;
}
</style>
