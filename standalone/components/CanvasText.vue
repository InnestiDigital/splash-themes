<template>
  <section
    class="canvas-text"
    :class="`canvas-text--align-${blockAlign}`"
    :style="rootStyle"
    data-target="root"
  >
    <div
      class="canvas-text__content prose"
      :style="contentStyle"
      :data-typography-role="typographyRole"
      data-target="text"
      v-html="renderedContent"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useClientConfig } from '~/shared/composables/useClientConfig'
import { useLocalized } from '~/shared/composables/useLocalized'
import {
  BORDER_RADIUS_TOKEN_MAP,
  SPACING_TOKEN_MAP,
} from '~/shared/features/cms/placement/placementTokenMaps'
import { asHtml } from '~/shared/utils/asHtml'
import {
  resolveCanvasPaletteRole,
  resolveCanvasTypographyStyle,
} from '~/themes/standalone/lib/canvasPrimitiveStyles'

type LocalizedText = string | Record<string, string>

const props = withDefaults(defineProps<{
  content?: LocalizedText
  typographyRole?: string
  foregroundRole?: string
  backgroundRole?: string
  textAlign?: 'left' | 'center' | 'right'
  blockAlign?: 'left' | 'center' | 'right'
  measureWidth?: 'content' | 'narrow' | 'standard' | 'wide' | 'full'
  minHeight?: 'auto' | 'compact' | 'medium' | 'tall' | 'fill'
  verticalAlign?: 'top' | 'center' | 'bottom'
  internalPadding?: string
  borderRadius?: string
}>(), {
  content: '<p>Add your text</p>',
  typographyRole: 'brandHeadline',
  foregroundRole: 'brandOnSurface',
  backgroundRole: 'transparent',
  textAlign: 'left',
  blockAlign: 'left',
  measureWidth: 'full',
  minHeight: 'auto',
  verticalAlign: 'top',
  internalPadding: 'none',
  borderRadius: 'none',
})

const { getLocalizedValue } = useLocalized()
const { config } = useClientConfig()
const brandTokens = computed(() => config.value.brand?.tokens)

const renderedContent = computed(() => asHtml(getLocalizedValue(props.content)))

const rootStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {
    color: resolveCanvasPaletteRole(props.foregroundRole, 'brandOnSurface', brandTokens.value),
    backgroundColor: resolveCanvasPaletteRole(props.backgroundRole, 'transparent', brandTokens.value),
    padding: SPACING_TOKEN_MAP[props.internalPadding] ?? '0',
    borderRadius: BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0',
    '--block-measure': props.measureWidth === 'full'
      ? '100%'
      : `var(--measure-width-${props.measureWidth})`,
  }

  const minHeights: Record<string, string> = {
    compact: '12rem',
    medium: '24rem',
    tall: '40rem',
    fill: '100%',
  }
  if (props.minHeight !== 'auto') {
    style.minHeight = minHeights[props.minHeight] ?? minHeights.medium
  }

  const verticalMap: Record<string, string> = {
    top: 'flex-start',
    center: 'center',
    bottom: 'flex-end',
  }
  style.justifyContent = verticalMap[props.verticalAlign] ?? 'flex-start'
  return style
})

const contentStyle = computed<Record<string, string>>(() => ({
  ...resolveCanvasTypographyStyle(props.typographyRole, 'brandHeadline', brandTokens.value),
  textAlign: props.textAlign,
}))
</script>

<style scoped lang="scss">
.canvas-text {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  inline-size: 100%;
  block-size: 100%;

  &--align-left .canvas-text__content { margin-inline-end: auto; }
  &--align-center .canvas-text__content { margin-inline: auto; }
  &--align-right .canvas-text__content { margin-inline-start: auto; }
}

.canvas-text__content {
  color: inherit;
  inline-size: 100%;
  max-inline-size: var(--block-measure, 100%);

  :deep(> :first-child) { margin-block-start: 0; }
  :deep(> :last-child) { margin-block-end: 0; }
}
</style>
