<template>
  <div
    class="canvas-badge"
    :class="[`canvas-badge--align-${align}`, `canvas-badge--vertical-${verticalAlign}`]"
    data-target="root"
  >
    <span
      class="canvas-badge__label"
      :class="[`canvas-badge__label--${variant}`, `canvas-badge__label--${shape}`]"
      :style="badgeStyle"
      :data-typography-role="typographyRole"
      data-target="badge"
    ><span data-target="text">{{ label }}</span></span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useClientConfig } from '~/shared/composables/useClientConfig'
import { useLocalized } from '~/shared/composables/useLocalized'
import {
  resolveCanvasPaletteRole,
  resolveCanvasTypographyStyle,
} from '~/themes/standalone/lib/canvasPrimitiveStyles'

type LocalizedText = string | Record<string, string>

const props = withDefaults(defineProps<{
  text?: LocalizedText
  variant?: 'filled' | 'outline' | 'soft'
  typographyRole?: string
  backgroundRole?: string
  foregroundRole?: string
  size?: 'sm' | 'md' | 'lg'
  shape?: 'square' | 'rounded' | 'pill'
  width?: 'hug' | 'full'
  align?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'center' | 'bottom'
  uppercase?: boolean
}>(), {
  text: 'New',
  variant: 'filled',
  typographyRole: 'brandBody',
  backgroundRole: 'brandPrimary',
  foregroundRole: 'brandSurface',
  size: 'md',
  shape: 'pill',
  width: 'hug',
  align: 'center',
  verticalAlign: 'center',
  uppercase: false,
})

const { config } = useClientConfig()
const { getLocalizedPlain } = useLocalized()
const brandTokens = computed(() => config.value.brand?.tokens)
const label = computed(() => getLocalizedPlain(props.text, 'New'))

const sizeMap: Record<string, { fontSize: string; padding: string }> = {
  sm: { fontSize: '0.75rem', padding: '0.25rem 0.6rem' },
  md: { fontSize: '0.875rem', padding: '0.4rem 0.8rem' },
  lg: { fontSize: '1rem', padding: '0.6rem 1rem' },
}

const radiusMap: Record<string, string> = {
  square: '0',
  rounded: '0.5rem',
  pill: '9999px',
}

const badgeStyle = computed<Record<string, string>>(() => {
  const background = resolveCanvasPaletteRole(
    props.backgroundRole,
    'brandPrimary',
    brandTokens.value,
  )
  const foreground = resolveCanvasPaletteRole(
    props.foregroundRole,
    'brandSurface',
    brandTokens.value,
  )
  const size = sizeMap[props.size] ?? sizeMap.md
  const isOutline = props.variant === 'outline'
  const isSoft = props.variant === 'soft'
  const typography = resolveCanvasTypographyStyle(
    props.typographyRole,
    'brandBody',
    brandTokens.value,
  )
  const backgroundColor = isOutline
    ? 'transparent'
    : isSoft
      ? `color-mix(in srgb, ${background} 16%, transparent)`
      : background

  return {
    ...typography,
    backgroundColor,
    borderColor: isSoft ? 'transparent' : background,
    borderStyle: 'solid',
    borderWidth: '1px',
    borderRadius: radiusMap[props.shape] ?? radiusMap.pill,
    color: isSoft ? background : foreground,
    fontSize: size.fontSize,
    inlineSize: props.width === 'full' ? '100%' : 'auto',
    padding: size.padding,
    textTransform: props.uppercase
      ? 'uppercase'
      : typography.textTransform,
  }
})
</script>

<style scoped lang="scss">
.canvas-badge {
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

.canvas-badge__label {
  box-sizing: border-box;
  display: inline-flex;
  justify-content: center;
  max-inline-size: 100%;
  overflow-wrap: anywhere;
  text-align: center;
}
</style>
