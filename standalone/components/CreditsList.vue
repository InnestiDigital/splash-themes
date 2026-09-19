<template>
  <section
    class="credits-list"
    :class="[
      `credits-list--${layout}`,
      `credits-list--align-${alignment}`,
      layout === 'inline' ? `credits-list--label-${labelWidth}` : null,
      layout === 'grid' ? `credits-list--cols-${gridColumns}` : null,
      labelStyle !== 'default' ? `credits-list--label-${labelStyle}` : null,
      showDividers ? 'credits-list--with-dividers' : null,
      sticky ? 'credits-list--sticky' : null,
    ]"
    :style="{ ...rootStyles, ...stickyStyles }"
    data-target="root"
  >
    <div class="credits-list__container" :style="contentStyle">
      <h3
        v-if="localizedSectionHeading"
        class="credits-list__heading"
        data-target="sectionHeading"
        v-html="asHtml(localizedSectionHeading)"
      ></h3>

      <ul class="credits-list__items" :style="gridAlignStyle" data-grid>
        <li
          v-for="(item, index) in items"
          :key="index"
          class="credits-list__item"
          data-target="item"
          :data-item-index="index"
        >
          <span class="credits-list__label" data-target="label" v-html="asHtml(getLocalizedValue(item.label))"></span>

          <div class="credits-list__value-wrap">
            <component
              :is="item.url ? 'a' : 'span'"
              :href="item.url || null"
              class="credits-list__value"
              data-target="value"
              :target="item.url && isExternal(item.url) ? '_blank' : null"
              :rel="item.url && isExternal(item.url) ? 'noopener noreferrer' : null"
              v-html="asHtml(getLocalizedValue(item.value))"
            ></component>
            <span
              v-if="getLocalizedValue(item.note)"
              class="credits-list__note"
              data-target="note"
              v-html="asHtml(getLocalizedValue(item.note))"
            ></span>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TextRole } from '~/shared/types/placement'
import { SPACING_TOKEN_MAP, resolveTextRole } from '~/shared/features/cms/placement/placementTokenMaps'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'

const { getLocalizedValue } = useLocalized()
type Layout = 'stacked' | 'inline' | 'sidebar' | 'grid' | 'ledger'
type LabelWidth = 'narrow' | 'medium' | 'wide'
type LabelStyle = 'default' | 'uppercase' | 'muted'
type Alignment = 'left' | 'center' | 'right'
type SurfaceStyle = 'none' | 'subtle' | 'filled'

interface CreditItem {
  label: string | Record<string, string>
  value: string | Record<string, string>
  note?: string | Record<string, string>
  url?: string
}

const props = defineProps<{
  sectionHeading?: string | Record<string, string>
  items?: CreditItem[]
  layout?: Layout
  labelWidth?: LabelWidth
  gridColumns?: string
  alignment?: Alignment
  showDividers?: boolean
  sticky?: boolean
  stickyOffset?: number
  labelStyle?: LabelStyle
  textTone?: TextRole
  internalPadding?: string
  surfaceStyle?: SurfaceStyle
  itemAlignX?: 'start' | 'center' | 'end' | 'stretch'
  itemAlignY?: 'start' | 'center' | 'end' | 'stretch'
}>()

const gridAlignStyle = computed<Record<string, string>>(() => {
  const s: Record<string, string> = {}
  if (props.itemAlignX) s.justifyItems = props.itemAlignX
  if (props.itemAlignY) s.alignItems = props.itemAlignY
  return s
})

function isExternal(url: string): boolean {
  return /^https?:\/\//.test(url)
}

const localizedSectionHeading = computed(() => getLocalizedValue(props.sectionHeading))
const items = computed(() => props.items ?? [])
const layout = computed<Layout>(() => props.layout || 'stacked')
const labelWidth = computed<LabelWidth>(() => props.labelWidth || 'narrow')
const gridColumns = computed(() => props.gridColumns || '2')
const alignment = computed<Alignment>(() => props.alignment || 'left')
const showDividers = computed(() => props.showDividers ?? false)
const sticky = computed(() => props.sticky ?? false)
const labelStyle = computed<LabelStyle>(() => props.labelStyle || 'default')

// Sticky positioning: when enabled, the block becomes position:sticky so
// it stays pinned at the top of its parent column while the rest of the
// section scrolls past. Only produces the Brandscape-style layout when
// placed inside a multi-column section (e.g. editorial-split with a
// sidebar column) alongside taller content in the adjacent column.
// Block-level sticky can't produce overlapping/absolute free layouts —
// that's WYSIWYG-editor territory.
const stickyStyles = computed<Record<string, string>>(() => {
  if (!sticky.value) return {}
  const offset = props.stickyOffset ?? 24
  return {
    position: 'sticky',
    top: `${offset}px`,
    alignSelf: 'flex-start',
  }
})

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  return style
})

const rootStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (props.surfaceStyle === 'subtle') {
    styles.background = 'var(--section-surface, rgba(255,255,255,0.04))'
  } else if (props.surfaceStyle === 'filled') {
    styles.background = 'var(--section-accent, rgba(255,255,255,0.1))'
  }
  // Text-only adopter of the color-roles fragment: the schema omits
  // `background`, so no surface is painted here — only the text tone.
  styles.color = props.textTone
    ? resolveTextRole(props.textTone)
    : 'var(--section-text, var(--color-text))'
  return styles
})
</script>

<style lang="scss" scoped>
.credits-list {
  &__container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  &__heading {
    font-family: var(--rt-slot-sectionHeading-family, var(--rt-role-heading3-family, inherit));
    font-size: var(--rt-slot-sectionHeading-size, var(--rt-role-heading3-size, var(--font-size-xl)));
    font-weight: var(--rt-slot-sectionHeading-weight, var(--rt-role-heading3-weight, 700));
    line-height: var(--rt-slot-sectionHeading-line-height, var(--rt-role-heading3-line-height, 1.2));
    letter-spacing: var(--rt-slot-sectionHeading-letter-spacing, var(--rt-role-heading3-letter-spacing, normal));
    text-transform: var(--rt-slot-sectionHeading-text-transform, var(--rt-role-heading3-text-transform, none));
    font-variation-settings: var(--rt-slot-sectionHeading-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-sectionHeading-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-sectionHeading-font-stretch, normal);
    font-style: var(--rt-slot-sectionHeading-font-style, normal);
    color: var(--rt-slot-sectionHeading-color, var(--rt-role-heading3-color, inherit));
    margin: 0 0 var(--spacing-sm);
  }

  &__items {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  &__item {
    display: flex;
    min-width: 0;
  }

  &__label {
    font-family: var(--rt-slot-label-family, var(--rt-role-label-family, inherit));
    font-size: var(--rt-slot-label-size, var(--rt-role-label-size, var(--font-size-sm)));
    font-weight: var(--rt-slot-label-weight, var(--rt-role-label-weight, 600));
    line-height: var(--rt-slot-label-line-height, var(--rt-role-label-line-height, 1.4));
    letter-spacing: var(--rt-slot-label-letter-spacing, var(--rt-role-label-letter-spacing, normal));
    text-transform: var(--rt-slot-label-text-transform, var(--rt-role-label-text-transform, none));
    font-variation-settings: var(--rt-slot-label-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-label-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-label-font-stretch, normal);
    font-style: var(--rt-slot-label-font-style, normal);
    color: var(--rt-slot-label-color, var(--rt-role-label-color, inherit));
    flex-shrink: 0;
  }

  &__value-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }

  &__value {
    font-family: var(--rt-slot-value-family, var(--rt-role-body-family, inherit));
    font-size: var(--rt-slot-value-size, var(--rt-role-body-size, var(--font-size-base)));
    font-weight: var(--rt-slot-value-weight, var(--rt-role-body-weight, inherit));
    line-height: var(--rt-slot-value-line-height, var(--rt-role-body-line-height, 1.5));
    letter-spacing: var(--rt-slot-value-letter-spacing, var(--rt-role-body-letter-spacing, normal));
    font-variation-settings: var(--rt-slot-value-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-value-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-value-font-stretch, normal);
    font-style: var(--rt-slot-value-font-style, normal);
    color: var(--rt-slot-value-color, var(--rt-role-body-color, inherit));
    word-wrap: break-word;
  }

  a.credits-list__value {
    text-decoration: underline;
    text-underline-offset: 0.15em;
  }

  &__note {
    font-family: var(--rt-slot-note-family, var(--rt-role-caption-family, inherit));
    font-size: var(--rt-slot-note-size, var(--rt-role-caption-size, var(--font-size-xs)));
    font-weight: var(--rt-slot-note-weight, var(--rt-role-caption-weight, inherit));
    line-height: var(--rt-slot-note-line-height, var(--rt-role-caption-line-height, 1.4));
    letter-spacing: var(--rt-slot-note-letter-spacing, var(--rt-role-caption-letter-spacing, normal));
    font-variation-settings: var(--rt-slot-note-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-note-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-note-font-stretch, normal);
    font-style: var(--rt-slot-note-font-style, normal);
    color: var(--rt-slot-note-color, var(--rt-role-caption-color, inherit));
    opacity: 0.7;
  }

  // ── Layout: stacked (label above value) ──────────────────────────────
  &--stacked &__item {
    flex-direction: column;
    gap: 0.2rem;
  }

  // ── Layout: inline (label left / value right) ────────────────────────
  &--inline &__item {
    flex-direction: row;
    gap: var(--spacing-md);
    align-items: baseline;
  }

  &--inline.credits-list--label-narrow &__label  { flex: 0 0 20%; }
  &--inline.credits-list--label-medium &__label  { flex: 0 0 33%; }
  &--inline.credits-list--label-wide &__label    { flex: 0 0 50%; }
  &--inline &__value-wrap { flex: 1 1 auto; }

  // ── Layout: sidebar (compact inline with smaller label) ──────────────
  &--sidebar &__item {
    flex-direction: row;
    gap: var(--spacing-sm);
    align-items: baseline;
  }

  &--sidebar &__label {
    flex: 0 0 30%;
    font-size: var(--rt-slot-label-size, var(--rt-role-label-size, var(--font-size-xs)));
    opacity: 0.7;
  }

  &--sidebar &__value-wrap { flex: 1 1 auto; }

  // ── Layout: grid (responsive N-column) ───────────────────────────────
  &--grid &__items {
    display: grid;
    gap: var(--spacing-md);
  }

  &--grid.credits-list--cols-2 &__items { grid-template-columns: repeat(2, 1fr); }
  &--grid.credits-list--cols-3 &__items { grid-template-columns: repeat(3, 1fr); }
  &--grid.credits-list--cols-4 &__items { grid-template-columns: repeat(4, 1fr); }

  &--grid &__item {
    flex-direction: column;
    gap: 0.2rem;
  }

  // ── Layout: ledger (year-anchored, large left anchor column) ─────────
  &--ledger &__items {
    display: flex;
    flex-direction: column;
  }

  &--ledger &__item {
    display: grid;
    grid-template-columns: minmax(6rem, 10rem) 1fr;
    column-gap: var(--spacing-xl, 3.2rem);
    align-items: baseline;
    padding-block: var(--spacing-md);
    border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
  }

  &--ledger &__item:last-child {
    border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
  }

  &--ledger &__label {
    font-family: var(--rt-role-heading3-family, var(--font-family-heading, inherit));
    font-size: var(--rt-role-heading3-size, var(--font-size-lg, 2rem));
    font-weight: 600;
    line-height: 1.05;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.01em;
    color: var(--section-text, var(--color-text));
  }

  &--ledger &__value-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  &--ledger &__note {
    opacity: 0.6;
    font-size: var(--rt-role-caption-size, var(--font-size-sm));
  }

  @media (max-width: $bp-md) {
    &--grid.credits-list--cols-2 &__items,
    &--grid.credits-list--cols-3 &__items,
    &--grid.credits-list--cols-4 &__items {
      grid-template-columns: 1fr;
    }
    &--inline &__item {
      flex-direction: column;
      gap: 0.2rem;
    }
    &--inline &__label {
      flex: 1 1 auto;
    }
    &--ledger &__item {
      grid-template-columns: 1fr;
      row-gap: 0.3rem;
      column-gap: 0;
    }
  }

  // ── Alignment ────────────────────────────────────────────────────────
  &--align-center {
    text-align: center;
  }
  &--align-center &__item {
    align-items: center;
    text-align: center;
  }
  &--align-center.credits-list--inline &__item,
  &--align-center.credits-list--sidebar &__item {
    justify-content: center;
  }

  &--align-right {
    text-align: right;
  }
  &--align-right &__item {
    align-items: flex-end;
    text-align: right;
  }
  &--align-right.credits-list--inline &__item,
  &--align-right.credits-list--sidebar &__item {
    justify-content: flex-end;
  }

  // ── Dividers ─────────────────────────────────────────────────────────
  &--with-dividers &__item {
    padding-bottom: var(--spacing-sm);
    border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
  }
  &--with-dividers &__item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  // ── Label style modifiers ────────────────────────────────────────────
  &--label-uppercase &__label {
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  &--label-muted &__label {
    opacity: 0.6;
    font-weight: 400;
  }
}
</style>
