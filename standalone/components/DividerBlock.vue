<template>
  <div
    class="divider-block"
    :class="[
      `divider-block--align-${align}`,
      `divider-block--width-${width}`,
    ]"
    :style="{ ...dividerStyles, ...contentStyle }"
  >
    <hr
      v-if="lineStyle !== 'space' && lineStyle !== 'ornament'"
      class="divider-block__line"
      :class="[
        `divider-block__line--${lineStyle}`,
        `divider-block__line--${thickness}`,
        `divider-block__line--width-${width}`,
      ]"
      :style="lineStyles"
      aria-hidden="true"
    />
    <div
      v-else-if="lineStyle === 'ornament'"
      class="divider-block__ornament"
      :class="[
        `divider-block__ornament--${thickness}`,
        `divider-block__ornament--width-${width}`,
      ]"
      :style="ornamentStyle"
      aria-hidden="true"
    >
      <span class="divider-block__rule"></span>
      <span class="divider-block__glyph">{{ glyph }}</span>
      <span class="divider-block__rule"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SPACING_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  blocks?: Array<Record<string, unknown>>
  /**
   * Line style. The schema field id is `lineStyle` — NOT `style` — because
   * Vue's HTML `style` attribute fallthrough would clobber a string prop
   * with whatever inline-style object the parent merged in (we used to see
   * `divider-block__line--[object Object]` because the wrapper style object
   * landed in the same prop slot).
   */
  lineStyle?: 'line' | 'dashed' | 'dotted' | 'space' | 'gradient' | 'ornament'
  glyph?: string
  color?: string
  spacing?: number
  thickness?: 'thin' | 'medium' | 'thick'
  width?: 'full' | 'large' | 'medium' | 'small' | 'tiny'
  align?: 'left' | 'center' | 'right'
  internalPadding?: string
}>(), {
  lineStyle: 'line',
  glyph: '✦',
  color: '#e5e5e5',
  spacing: 32,
  thickness: 'thin',
  width: 'full',
  align: 'center',
  internalPadding: 'md',
})

const dividerStyles = computed(() => ({
  paddingBlockStart: `${(props.spacing || 0) / 10}rem`,
  paddingBlockEnd: `${(props.spacing || 0) / 10}rem`,
}))

const lineStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (props.color) {
    // backgroundColor paints solid lines; color drives currentColor for the
    // border-based dashed/dotted variants. Set both unconditionally so a
    // single `color` prop drives all line styles consistently.
    styles.backgroundColor = props.color
    styles.color = props.color
  }
  return styles
})

const ornamentStyle = computed<Record<string, string>>(() =>
  props.color ? { color: props.color } : {},
)

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.paddingInline = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  return style
})

</script>

<style lang="scss" scoped>
.divider-block {
  // width: 100% prevents shrink-to-fit collapse when the parent is a flex
  // container (any section) — without it the inner <hr width:100%> resolves
  // against a zero-width track and disappears.
  width: 100%;
  max-width: 120rem;
  margin: 0 auto;
  padding-inline: var(--spacing-md);

  // Width=full opts out of the centered max-width container so the line
  // truly spans edge-to-edge (no horizontal inset, no max-width clamp).
  // Other widths (large/medium/small/tiny) keep the centered container so
  // they sit inside the standard reading column.
  &--width-full {
    max-width: none;
    padding-inline: 0;
  }

  // Alignment — controls how a shorter-than-full line is positioned
  &--align-left { display: flex; justify-content: flex-start; }
  &--align-center { display: flex; justify-content: center; }
  &--align-right { display: flex; justify-content: flex-end; }

  &__line {
    border: 0;
    margin: 0;
    width: 100%;

    // Solid lines are painted as background-color on an explicit-height
    // <hr>. Borders inside a transform-scaled ancestor (scale-canvas mode)
    // get rasterized at sub-pixel widths and look faded; background-color
    // pixel-snaps cleanly and matches the chrome line element's rendering.
    // Color is supplied via inline style from the `color` prop; the inline
    // style sets `background-color` (see :style binding in script setup).
    background-color: var(--section-border, var(--border-color));

    // Dashed / dotted styles still need real borders to render the pattern.
    // The wrapper sets background-color: transparent for these variants and
    // re-enables border-block-start with the matching dash/dot style.
    &--dashed,
    &--dotted {
      background-color: transparent;
      border-block-start: 0.1rem solid currentColor;
    }
    &--dashed { border-block-start-style: dashed; }
    &--dotted { border-block-start-style: dotted; }

    // Thickness variants — height for solid (background paint), border-width
    // for dashed/dotted.
    &--thin { height: 0.1rem; &--dashed, &--dotted { border-block-start-width: 0.1rem; } }
    &--medium { height: 0.2rem; &--dashed, &--dotted { border-block-start-width: 0.2rem; } }
    &--thick { height: 0.4rem; &--dashed, &--dotted { border-block-start-width: 0.4rem; } }

    // Width variants
    &--width-full { width: 100%; }
    &--width-large { width: 75%; }
    &--width-medium { width: 50%; }
    &--width-small { width: 25%; }
    &--width-tiny { width: 8rem; }

    // Gradient (fade) — masks the solid background line so it fades out at
    // both ends. Keeps thickness/width/align/color from the shared bindings.
    &--gradient {
      -webkit-mask-image: linear-gradient(to right, transparent, #000 18%, #000 82%, transparent);
      mask-image: linear-gradient(to right, transparent, #000 18%, #000 82%, transparent);
    }
  }

  // Ornament — two flanking rules with a centered glyph. The inline
  // ornamentStyle sets `color` from the `color` prop and overrides the
  // token fallback below via currentColor.
  &__ornament {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    width: 100%;
    color: var(--section-border, var(--border-color));

    &--width-full { width: 100%; }
    &--width-large { width: 75%; }
    &--width-medium { width: 50%; }
    &--width-small { width: 25%; }
    &--width-tiny { width: 12rem; }
  }

  &__rule {
    flex: 1 1 0;
    height: 0.1rem;
    background-color: currentColor;
  }
  &__ornament--medium &__rule { height: 0.2rem; }
  &__ornament--thick &__rule { height: 0.4rem; }

  &__glyph {
    flex: 0 0 auto;
    line-height: 1;
    color: currentColor;
    opacity: 0.85;
    font-size: 1.6rem;
    font-family: var(--rt-role-heading1-family, var(--font-family-heading, Georgia, serif));
  }
  &__ornament--medium &__glyph { font-size: 2rem; }
  &__ornament--thick &__glyph { font-size: 2.6rem; }
}
</style>
