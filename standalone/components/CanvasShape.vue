<template>
  <div
    class="canvas-shape"
    :class="[
      `canvas-shape--align-${align}`,
      `canvas-shape--vertical-${verticalAlign}`,
      `canvas-shape--${shape}`,
    ]"
    :style="rootStyle"
    data-target="root"
  >
    <div
      class="canvas-shape__shape"
      :class="{
        'canvas-shape__shape--ellipse': shape === 'ellipse',
        [`canvas-shape__shape--line-${lineOrientation}`]: shape === 'line',
      }"
      :style="shapeStyle"
      :role="localizedLabel ? 'img' : undefined"
      :aria-label="localizedLabel || undefined"
      :aria-hidden="localizedLabel ? undefined : 'true'"
      data-target="shape"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useClientConfig } from '~/shared/composables/useClientConfig'
import { useLocalized } from '~/shared/composables/useLocalized'
import { BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { resolveCanvasPaletteRole } from '~/themes/standalone/lib/canvasPrimitiveStyles'

type LocalizedText = string | Record<string, string>

const props = withDefaults(defineProps<{
  shape?: 'rectangle' | 'ellipse' | 'line'
  fillRole?: string
  strokeRole?: string
  strokeWidth?: number
  aspectRatio?: 'square' | 'portrait' | 'classic' | 'landscape' | 'wide'
  cornerRadius?: string
  lineOrientation?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md' | 'lg' | 'full'
  align?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'center' | 'bottom'
  opacity?: number
  accessibilityLabel?: LocalizedText
}>(), {
  shape: 'rectangle',
  fillRole: 'brandPrimary',
  strokeRole: 'brandSecondary',
  strokeWidth: 0,
  aspectRatio: 'square',
  cornerRadius: 'none',
  lineOrientation: 'horizontal',
  size: 'full',
  align: 'center',
  verticalAlign: 'center',
  opacity: 1,
})

const { getLocalizedPlain } = useLocalized()
const { config } = useClientConfig()
const brandTokens = computed(() => config.value.brand?.tokens)
const localizedLabel = computed(() => getLocalizedPlain(props.accessibilityLabel))

const sizeMap: Record<string, string> = {
  sm: '12rem',
  md: '24rem',
  lg: '48rem',
  full: '100%',
}

const aspectRatios: Record<string, string> = {
  square: '1 / 1',
  portrait: '4 / 5',
  classic: '4 / 3',
  landscape: '3 / 2',
  wide: '16 / 9',
}

const rootStyle = computed<Record<string, string>>(() => {
  const requestedOpacity = Number(props.opacity)
  return {
    opacity: String(Number.isFinite(requestedOpacity)
      ? Math.max(0.1, Math.min(1, requestedOpacity))
      : 1),
  }
})

const shapeStyle = computed<Record<string, string>>(() => {
  const size = sizeMap[props.size] ?? sizeMap.full
  const strokeWidth = Math.max(0, Math.min(12, Number(props.strokeWidth) || 0))

  if (props.shape === 'line') {
    const thickness = `${Math.max(1, strokeWidth)}px`
    return props.lineOrientation === 'vertical'
      ? {
          inlineSize: thickness,
          blockSize: size,
          backgroundColor: resolveCanvasPaletteRole(props.strokeRole, 'brandSecondary', brandTokens.value),
        }
      : {
          inlineSize: size,
          blockSize: thickness,
          backgroundColor: resolveCanvasPaletteRole(props.strokeRole, 'brandSecondary', brandTokens.value),
        }
  }

  const dimensions = props.size === 'full'
    ? { inlineSize: '100%', blockSize: '100%' }
    : {
        inlineSize: size,
        aspectRatio: aspectRatios[props.aspectRatio] ?? aspectRatios.square,
      }

  return {
    ...dimensions,
    backgroundColor: resolveCanvasPaletteRole(props.fillRole, 'brandPrimary', brandTokens.value),
    borderColor: resolveCanvasPaletteRole(props.strokeRole, 'brandSecondary', brandTokens.value),
    borderStyle: strokeWidth > 0 ? 'solid' : 'none',
    borderWidth: `${strokeWidth}px`,
    borderRadius: props.shape === 'ellipse'
      ? '50%'
      : BORDER_RADIUS_TOKEN_MAP[props.cornerRadius] ?? '0',
  }
})
</script>

<style scoped lang="scss">
.canvas-shape {
  box-sizing: border-box;
  display: flex;
  inline-size: 100%;
  block-size: 100%;

  &--align-left { justify-content: flex-start; }
  &--align-center { justify-content: center; }
  &--align-right { justify-content: flex-end; }
  &--vertical-top { align-items: flex-start; }
  &--vertical-center { align-items: center; }
  &--vertical-bottom { align-items: flex-end; }
}

.canvas-shape__shape {
  box-sizing: border-box;
  display: block;
  max-inline-size: 100%;
}
</style>
