<template>
  <div class="splash-text-split" :class="rootClasses">
    <div class="splash-text-split__columns">
      <div
        class="splash-text-split__col splash-text-split__col--left prose"
        :style="leftColStyle"
        data-target="left-body"
        v-html="resolvedLeftBody"
      />
      <div
        class="splash-text-split__col splash-text-split__col--right prose"
        :style="rightColStyle"
        data-target="right-body"
        v-html="resolvedRightBody"
      />
    </div>
    <hr
      v-if="dividerEnabled !== false"
      class="splash-text-split__divider"
      :style="dividerStyle"
      aria-hidden="true"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLocalized } from '~/shared/composables/useLocalized'

type TextAlign = 'left' | 'center' | 'right' | 'justify'
/**
 * columnRatio — controls the grid-template-columns split.
 * '50-50' (default) keeps both columns equal (existing behavior).
 * '66-33' gives the left column 2/3 width and right 1/3.
 * '75-25' gives left 3/4 and right 1/4.
 * Backward-compatible: omitted = '50-50'.
 */
type ColumnRatio = '50-50' | '66-33' | '75-25'
/**
 * stickyColumn — opt-in "pinned editorial column". When set to 'left' or
 * 'right', that column becomes position:sticky so a short summary/heading
 * column stays pinned in view while the longer narrative column scrolls past
 * it (the magazine two-track reading pattern). 'none' (default) is the
 * existing static behaviour and emits no extra class. Automatically neutralised
 * on the single-column mobile collapse.
 */
type StickyColumn = 'none' | 'left' | 'right'
/** stickyTop — how far below the viewport top a pinned column rests. */
type StickyTop = 'sm' | 'md' | 'lg'

const props = withDefaults(defineProps<{
  leftBody?: string | Record<string, string>
  rightBody?: string | Record<string, string>
  leftAlign?: TextAlign
  rightAlign?: TextAlign
  columnGap?: 'sm' | 'md' | 'lg' | 'xl'
  columnRatio?: ColumnRatio
  dividerEnabled?: boolean
  /**
   * Hex color for the divider line. Defaults to the theme's accentColor
   * (`#1B8AB7` teal) when left unset. NOT a freeform per-block color override
   * for text or background — only the hairline divider below the columns.
   */
  dividerColor?: string
  stickyColumn?: StickyColumn
  stickyTop?: StickyTop
}>(), {
  leftAlign: 'left',
  rightAlign: 'right',
  columnGap: 'lg',
  columnRatio: '50-50',
  dividerEnabled: true,
  dividerColor: '#1B8AB7',
  stickyColumn: 'none',
  stickyTop: 'md',
})

const { getLocalizedValue } = useLocalized()

const resolvedLeftBody = computed(() => getLocalizedValue(props.leftBody))
const resolvedRightBody = computed(() => getLocalizedValue(props.rightBody))

const GAP_MAP: Record<string, string> = {
  sm: '2rem',
  md: '4rem',
  lg: '6rem',
  xl: '8rem',
}

const RATIO_MAP: Record<ColumnRatio, string> = {
  '50-50': '1fr 1fr',
  '66-33': '2fr 1fr',
  '75-25': '3fr 1fr',
}

const leftColStyle = computed(() => ({
  textAlign: props.leftAlign,
}))

const rightColStyle = computed(() => ({
  textAlign: props.rightAlign,
}))

const dividerStyle = computed(() => ({
  borderColor: props.dividerColor || '#1B8AB7',
}))

const columnGapValue = computed(() => GAP_MAP[props.columnGap ?? 'lg'] ?? '6rem')
const columnTemplateValue = computed(() => RATIO_MAP[props.columnRatio ?? '50-50'] ?? '1fr 1fr')

// Object binding so Vue emits NO class attribute delta when sticky is off:
// every key is false at rest, so a default ('none') instance renders the
// literal existing `class="splash-text-split"` string — byte-identical parity.
const rootClasses = computed(() => ({
  'splash-text-split--sticky-left': props.stickyColumn === 'left',
  'splash-text-split--sticky-right': props.stickyColumn === 'right',
  ['splash-text-split--top-' + props.stickyTop]: props.stickyColumn !== 'none',
}))
</script>

<style lang="scss" scoped>
.splash-text-split {
  width: 100%;

  &__columns {
    display: grid;
    grid-template-columns: v-bind(columnTemplateValue);
    gap: v-bind(columnGapValue);
    align-items: start;
  }

  &__col {
    font-family: var(--rt-slot-body-family, var(--rt-role-body-family, inherit));
    font-size: var(--rt-slot-body-size, var(--rt-role-body-size, var(--font-size-base, 1rem)));
    font-weight: var(--rt-slot-body-weight, var(--rt-role-body-weight, inherit));
    line-height: var(--rt-slot-body-line-height, var(--rt-role-body-line-height, 1.65));
    color: inherit;

    :deep(p) {
      margin-block-end: 0.75em;
      &:last-child { margin-block-end: 0; }
    }

    :deep(strong) {
      font-weight: 600;
    }

    // Color comes from the .prose contract; underline is the deliberate delta
    // (CSS-10).
    :deep(a) {
      text-decoration: underline;
    }
  }

  // Opt-in "pinned editorial column" — the chosen column sticks in view while
  // the other scrolls past it. Gated entirely behind author-set modifier
  // classes, so a default (stickyColumn: 'none') instance is untouched.
  &--sticky-left &__col--left,
  &--sticky-right &__col--right {
    position: sticky;
    top: var(--tsplit-sticky-top, var(--spacing-xl, 3rem));
    align-self: start;
  }

  // Offset modifiers set the local var only when a sticky modifier is present.
  &--top-sm { --tsplit-sticky-top: var(--spacing-lg, 2rem); }
  &--top-md { --tsplit-sticky-top: var(--spacing-xl, 3rem); }
  &--top-lg { --tsplit-sticky-top: calc(var(--spacing-xl, 3rem) * 1.8); }

  &__divider {
    display: block;
    width: 100%;
    margin-block-start: var(--spacing-xl, 3rem);
    margin-block-end: 0;
    border: 0;
    border-block-start: 1px solid currentColor;
    color: #1B8AB7; /* fallback; overridden by inline style */
  }

  // Collapse to single column on narrow viewports
  @container (max-width: 640px) {
    &__columns {
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    &__col--right {
      text-align: left;
    }

    // Never pin in the stacked single-column view — a sticky column would
    // overlap the content stacked beneath it. No-op unless a sticky modifier
    // opted in above.
    &__col {
      position: static;
    }
  }
}
</style>
