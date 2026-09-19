<template>
  <div
    v-if="!isStack && !isGrid"
    class="metadata-row"
    :class="[align ? `metadata-row--align-${align}` : null]"
    data-target="root"
  >
    <template v-for="(item, i) in items" :key="i">
      <span class="metadata-row__item" data-target="item" :data-item-index="i">
        <span class="metadata-row__label" data-target="label" v-html="asHtml(item.label)"></span>
        <span class="metadata-row__value" data-target="value" v-html="asHtml(item.value)"></span>
      </span>
      <span
        v-if="separator !== 'none' && i < items.length - 1"
        class="metadata-row__sep"
        data-role="separator"
        aria-hidden="true"
      >{{ separatorChar }}</span>
    </template>
  </div>
  <dl
    v-else-if="isStack"
    class="metadata-row metadata-row--stack"
    :class="[
      align ? `metadata-row--align-${align}` : null,
      dividers ? 'metadata-row--dividers' : null,
    ]"
    data-target="root"
  >
    <div
      v-for="(item, i) in items"
      :key="i"
      class="metadata-row__pair"
      data-target="item"
      :data-item-index="i"
    >
      <dt class="metadata-row__label" data-target="label" v-html="asHtml(item.label)"></dt>
      <dd class="metadata-row__value" data-target="value" v-html="asHtml(item.value)"></dd>
    </div>
  </dl>
  <!-- Facts grid: intrinsic auto-fit cells (Anno / Superficie / Luogo / Stato)
       that wrap responsively with no @media — a project spec band. Reuses the
       shared &__label / &__value classes so role typography + 0.7 label opacity
       carry over; grid-specific rules nudge the value to a "fact" scale. -->
  <dl
    v-else
    class="metadata-row metadata-row--grid"
    :class="[
      align ? `metadata-row--align-${align}` : null,
      dividers ? 'metadata-row--dividers' : null,
      `metadata-row--min-${columnMinKey}`,
    ]"
    data-target="root"
  >
    <div
      v-for="(item, i) in items"
      :key="i"
      class="metadata-row__cell"
      data-target="item"
      :data-item-index="i"
    >
      <dt class="metadata-row__label" data-target="label" v-html="asHtml(item.label)"></dt>
      <dd class="metadata-row__value" data-target="value" v-html="asHtml(item.value)"></dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { asHtml } from '~/shared/utils/asHtml'

type Separator = 'none' | 'pipe' | 'dot'
type TextAlign = 'left' | 'center' | 'right'
type Layout = 'inline' | 'stack' | 'grid'
type ColumnMin = 'narrow' | 'medium' | 'wide'

interface MetadataItem {
  label?: unknown
  value?: unknown
}

const props = defineProps<{
  items?: MetadataItem[]
  separator?: Separator
  textAlign?: TextAlign
  layout?: Layout
  dividers?: boolean
  columnMin?: ColumnMin
}>()

const items = computed<MetadataItem[]>(() => props.items ?? [])
const separator = computed<Separator>(() => props.separator || 'pipe')
// Null when block has no explicit alignment — preset/role typography wins.
const align = computed<TextAlign | null>(() => props.textAlign || null)
const layout = computed<Layout>(() => props.layout || 'inline')
const isStack = computed(() => layout.value === 'stack')
const isGrid = computed(() => layout.value === 'grid')
// Grid column-min preset key; drives the --mr-grid-min minmax() floor.
const columnMinKey = computed<ColumnMin>(() => props.columnMin || 'medium')
// Hairline rules between spec-sheet rows; default on when unspecified.
const dividers = computed<boolean>(() => props.dividers ?? true)

const separatorChar = computed(() => {
  if (separator.value === 'dot') return '·'
  return '|'
})
</script>

<style lang="scss" scoped>
.metadata-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 0.75rem;

  &__item {
    display: inline-flex;
    gap: 0.35rem;
    align-items: baseline;
  }

  &__label {
    font-family: var(--rt-role-caption-family, inherit);
    font-size: var(--rt-role-caption-size, var(--font-size-sm));
    font-weight: var(--rt-role-caption-weight, inherit);
    line-height: var(--rt-role-caption-line-height, 1.4);
    letter-spacing: var(--rt-role-caption-letter-spacing, normal);
    text-transform: var(--rt-role-caption-text-transform, none);
    color: var(--rt-role-caption-color, inherit);
    opacity: 0.7;
  }

  &__value {
    font-family: var(--rt-role-body-family, inherit);
    font-size: var(--rt-role-body-size, var(--font-size-sm));
    font-weight: var(--rt-role-body-weight, inherit);
    line-height: var(--rt-role-body-line-height, 1.4);
    letter-spacing: var(--rt-role-body-letter-spacing, normal);
    text-transform: var(--rt-role-body-text-transform, none);
    color: var(--rt-role-body-color, inherit);
  }

  &__sep {
    opacity: 0.4;
    user-select: none;
  }

  &--align-left   { justify-content: flex-start; }
  &--align-center { justify-content: center; }
  &--align-right  { justify-content: flex-end; }
}

// Spec-sheet / "scheda tecnica" stacked layout (opt-in via layout: stack).
// Semantic definition-list: label column left, value column right, hairline
// ledger rules between rows. Reuses the shared &__label / &__value classes so
// the caption/body role typography (incl. the 0.7 label opacity) carries over.
.metadata-row--stack {
  display: block;

  .metadata-row__pair {
    display: grid;
    // Label column hugs the widest label (min 6rem so values stay aligned);
    // value column fills and can shrink/wrap (minmax(0,1fr)) — no mobile overflow.
    grid-template-columns: minmax(6rem, auto) minmax(0, 1fr);
    gap: 0.35rem 1.5rem;
    align-items: baseline;
    padding: 0.6rem 0;
    margin: 0;
  }

  // Reset default dt/dd margins.
  .metadata-row__label { margin: 0; }
  .metadata-row__value { margin: 0; }
}

// Ledger rules: a rule above every row + a closing rule under the last.
.metadata-row--stack.metadata-row--dividers {
  .metadata-row__pair {
    border-top: 1px solid var(--color-border, rgba(0, 0, 0, 0.12));
  }

  .metadata-row__pair:last-child {
    border-bottom: 1px solid var(--color-border, rgba(0, 0, 0, 0.12));
  }
}

// Facts-grid layout (opt-in via layout: grid). A project spec band —
// Anno / Superficie / Luogo / Stato — laid out as intrinsic auto-fit cells
// that wrap responsively with NO @media query (the minmax() floor decides
// the column count). Reuses the shared &__label / &__value classes so the
// caption/body role typography (incl. the 0.7 label opacity) carries over;
// grid-only overrides give the label an eyebrow feel and the value a
// slightly larger, tighter "fact" scale. All rules are nested under
// --grid so nothing bleeds onto the inline/stack branches.
.metadata-row--grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(var(--mr-grid-min, 9rem), 1fr));
  gap: 0; // rules provide separation; see dividers
  align-items: start;

  &.metadata-row--min-narrow  { --mr-grid-min: 7rem; }
  &.metadata-row--min-medium  { --mr-grid-min: 9rem; }
  &.metadata-row--min-wide    { --mr-grid-min: 13rem; }

  .metadata-row__cell {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.9rem 1.25rem 0.9rem 0;
  }

  // Label = eyebrow already via __label (caption role, 0.7 opacity).
  // Nudge to an eyebrow feel: uppercase + wider tracking.
  .metadata-row__label {
    text-transform: var(--rt-role-caption-text-transform, uppercase);
    letter-spacing: var(--rt-role-caption-letter-spacing, 0.06em);
  }

  // Value = the fact: a touch larger + tighter than the shared default.
  .metadata-row__value {
    font-size: var(--rt-role-body-size, var(--font-size-md));
    line-height: 1.25;
  }
}

// Alignment: the inline branch uses --align-* for justify-content; the grid
// reuses the SAME class names but scopes them to cell TEXT alignment.
.metadata-row--grid.metadata-row--align-center .metadata-row__cell {
  text-align: center;
  align-items: center;
}
.metadata-row--grid.metadata-row--align-right .metadata-row__cell {
  text-align: right;
  align-items: flex-end;
}

// Dividers: hairline rules that survive column wrapping — a top rule on every
// cell gives a ledger-band look regardless of how the cells reflow.
.metadata-row--grid.metadata-row--dividers .metadata-row__cell {
  border-top: 1px solid var(--color-border, rgba(0, 0, 0, 0.12));
}
</style>
