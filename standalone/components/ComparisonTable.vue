<template>
  <section
    class="comparison-table"
    :class="[`comparison-table--${density}`, { 'comparison-table--dividers': rowDividers }]"
    :data-collapse="collapse"
    data-target="root"
  >
    <div class="comparison-table__inner" :style="contentStyle">
      <!-- ── Desktop: one semantic table ─────────────────────────────────── -->
      <table v-if="collapse !== 'mobile'" class="comparison-table__table">
        <caption class="comparison-table__sr-only">{{ captionText }}</caption>
        <thead>
          <tr>
            <th scope="col" class="comparison-table__corner">
              <span class="comparison-table__sr-only">{{ featureHeading }}</span>
            </th>
            <th
              v-for="col in activeColumns"
              :key="col.index"
              scope="col"
              class="comparison-table__colhead"
              :class="{ 'is-featured': col.accent }"
            >
              <span class="comparison-table__colhead-label">{{ col.label }}</span>
              <span v-if="col.badge" class="comparison-table__badge">{{ col.badge }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, r) in rowsModel" :key="r" class="comparison-table__row">
            <th scope="row" class="comparison-table__rowhead">{{ row.label }}</th>
            <td
              v-for="(cell, c) in row.cells"
              :key="c"
              class="comparison-table__cell"
              :class="{ 'is-featured': activeColumns[c]?.accent }"
            >
              <template v-if="cell.kind === 'yes'">
                <span class="comparison-table__mark comparison-table__mark--yes" aria-hidden="true">&#10003;</span>
                <span class="comparison-table__sr-only">{{ INCLUDED_LABEL }}</span>
              </template>
              <template v-else-if="cell.kind === 'no'">
                <span class="comparison-table__mark comparison-table__mark--no" aria-hidden="true">&#10007;</span>
                <span class="comparison-table__sr-only">{{ NOT_INCLUDED_LABEL }}</span>
              </template>
              <template v-else-if="cell.kind === 'empty'">
                <span class="comparison-table__mark comparison-table__mark--empty" aria-hidden="true">&#8212;</span>
                <span class="comparison-table__sr-only">{{ NOT_INCLUDED_LABEL }}</span>
              </template>
              <span v-else class="comparison-table__value">{{ cell.text }}</span>
            </td>
          </tr>
        </tbody>
        <!-- Per-column CTA row. Gated on hasCta so parity holds when unused. -->
        <tfoot v-if="hasCta">
          <tr class="comparison-table__cta-row">
            <td class="comparison-table__cta-corner">
              <span class="comparison-table__sr-only">{{ CTA_ROW_LABEL }}</span>
            </td>
            <td
              v-for="col in activeColumns"
              :key="col.index"
              class="comparison-table__cta-cell"
              :class="{ 'is-featured': col.accent }"
            >
              <a
                v-if="col.ctaUrl"
                class="comparison-table__cta"
                :class="col.accent ? 'comparison-table__cta--solid' : 'comparison-table__cta--ghost'"
                :href="col.ctaUrl"
                :target="isExternalUrl(col.ctaUrl) ? '_blank' : null"
                :rel="isExternalUrl(col.ctaUrl) ? 'noopener noreferrer' : null"
                :aria-label="`${col.ctaLabel} — ${col.label}`"
              >{{ col.ctaLabel }}</a>
            </td>
          </tr>
        </tfoot>
      </table>

      <!-- ── Mobile: one mini-table per column (featured first) ───────────── -->
      <div
        v-else
        ref="trackRef"
        class="comparison-table__cards"
        :class="{ 'comparison-table__cards--deck': deckMode }"
      >
        <table
          v-for="col in mobileColumns"
          :key="col.index"
          class="comparison-table__card"
          :class="{ 'is-featured': col.accent }"
        >
          <caption class="comparison-table__card-caption">
            <span class="comparison-table__card-title">{{ col.label }}</span>
            <span v-if="col.badge" class="comparison-table__badge">{{ col.badge }}</span>
          </caption>
          <tbody>
            <tr v-for="(row, r) in rowsModel" :key="r" class="comparison-table__row">
              <th scope="row" class="comparison-table__rowhead">{{ row.label }}</th>
              <td class="comparison-table__cell">
                <template v-if="row.cells[col.index]?.kind === 'yes'">
                  <span class="comparison-table__mark comparison-table__mark--yes" aria-hidden="true">&#10003;</span>
                  <span class="comparison-table__sr-only">{{ INCLUDED_LABEL }}</span>
                </template>
                <template v-else-if="row.cells[col.index]?.kind === 'no'">
                  <span class="comparison-table__mark comparison-table__mark--no" aria-hidden="true">&#10007;</span>
                  <span class="comparison-table__sr-only">{{ NOT_INCLUDED_LABEL }}</span>
                </template>
                <template v-else-if="row.cells[col.index]?.kind === 'empty'">
                  <span class="comparison-table__mark comparison-table__mark--empty" aria-hidden="true">&#8212;</span>
                  <span class="comparison-table__sr-only">{{ NOT_INCLUDED_LABEL }}</span>
                </template>
                <span v-else class="comparison-table__value">{{ row.cells[col.index]?.text }}</span>
              </td>
            </tr>
          </tbody>
          <!-- Full-width CTA at the bottom of the card. Gated on hasCta + this
               column having a url so unused = byte-identical to before. -->
          <tfoot v-if="hasCta && col.ctaUrl">
            <tr class="comparison-table__cta-row">
              <td colspan="2" class="comparison-table__cta-cell comparison-table__cta-cell--mobile">
                <a
                  class="comparison-table__cta comparison-table__cta--mobile"
                  :class="col.accent ? 'comparison-table__cta--solid' : 'comparison-table__cta--ghost'"
                  :href="col.ctaUrl"
                  :target="isExternalUrl(col.ctaUrl) ? '_blank' : null"
                  :rel="isExternalUrl(col.ctaUrl) ? 'noopener noreferrer' : null"
                  :aria-label="`${col.ctaLabel} — ${col.label}`"
                >{{ col.ctaLabel }}</a>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- ── Deck pagination dots (mobile deck mode, >1 column) ───────────── -->
      <div
        v-if="deckMode && collapse === 'mobile' && mobileColumns.length > 1"
        class="comparison-table__dots"
      >
        <button
          v-for="(col, i) in mobileColumns"
          :key="col.index"
          type="button"
          class="comparison-table__dot"
          :class="{ 'is-active': activeCard === i }"
          :aria-label="`Show ${col.label}`"
          :aria-current="activeCard === i ? 'true' : undefined"
          @click="scrollToCard(i)"
        ></button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useViewport } from '~/shared/composables/useViewport'
import { isMobileViewport } from '~/shared/features/cms/composition/responsive'

type Density = 'comfortable' | 'compact'
type Localizable = string | Record<string, string>

interface ColumnInput {
  label?: Localizable
  featured?: boolean
  badge?: Localizable
  ctaLabel?: Localizable
  ctaUrl?: string
}

interface RowInput {
  label?: Localizable
  c1?: Localizable
  c2?: Localizable
  c3?: Localizable
  c4?: Localizable
}

const props = defineProps<{
  columns?: ColumnInput[]
  rows?: RowInput[]
  featuredAccent?: boolean
  rowDividers?: boolean
  density?: Density
  borderRadius?: string
  internalPadding?: string
  contentAlignH?: string
  mobileLayout?: 'stack' | 'deck'
}>()

const { getLocalizedValue } = useLocalized()

// Static a11y strings — plain text announced to screen readers for icon cells.
const INCLUDED_LABEL = 'included'
const NOT_INCLUDED_LABEL = 'not included'
const captionText = 'Feature comparison'
const featureHeading = 'Feature'

// Fallback CTA text when a column supplies a ctaUrl but no ctaLabel. Requiring
// BOTH would silently drop a configured link, so we render on ctaUrl alone and
// borrow a neutral default label rather than leaving an unlabeled button.
const DEFAULT_CTA_LABEL = 'Scopri di più'

// sr-only heading for the CTA footer row's empty corner cell.
const CTA_ROW_LABEL = 'Actions'

// A url is external when it starts with http(s):// — those open in a new tab
// with rel="noopener noreferrer"; everything else is an in-app anchor. Mirrors
// DocumentList.vue's isExternal idiom.
function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

// ── Responsive collapse (TS-driven, not @media) — mirrors Tabs.vue ─────────────
const { innerWidth } = useViewport()
const collapse = computed(() => (isMobileViewport(innerWidth.value) ? 'mobile' : 'desktop'))

const density = computed<Density>(() => (props.density === 'compact' ? 'compact' : 'comfortable'))
const rowDividers = computed(() => props.rowDividers !== false)
const featuredAccentEnabled = computed(() => props.featuredAccent !== false)

// A single text cell doubles as a boolean OR free text. Classify once, render by kind.
type CellKind = 'empty' | 'yes' | 'no' | 'text'
interface ResolvedCell {
  kind: CellKind
  text: string
}

const YES_TOKENS = new Set(['yes', 'sì', 'si', 'true', '✓', '✔'])
const NO_TOKENS = new Set(['no', 'false', '✗', '✕', 'x', '-'])

function resolveCell(raw: Localizable | undefined): ResolvedCell {
  const text = getLocalizedValue(raw).trim()
  if (!text) return { kind: 'empty', text: '' }
  const key = text.toLowerCase()
  if (YES_TOKENS.has(key)) return { kind: 'yes', text }
  if (NO_TOKENS.has(key)) return { kind: 'no', text }
  return { kind: 'text', text }
}

interface ResolvedColumn {
  index: number
  sourceIndex: number
  label: string
  badge: string
  featured: boolean
  accent: boolean
  ctaLabel: string
  ctaUrl: string
}

// Active columns = those with a non-empty resolved label. `index` is the packed
// render position (== cells array index); `sourceIndex` is the ORIGINAL position in
// props.columns, so each column always reads its own source field (c1..cN) even when
// an earlier column is left unlabeled (a middle gap must not shift cell attribution).
const activeColumns = computed<ResolvedColumn[]>(() => {
  const cols = props.columns ?? []
  const resolved: ResolvedColumn[] = []
  for (let sourceIndex = 0; sourceIndex < cols.length; sourceIndex++) {
    const col = cols[sourceIndex]
    const label = getLocalizedValue(col.label).trim()
    if (!label) continue
    const featured = col.featured === true
    // A column's CTA is renderable only when ctaUrl is non-empty. If a url is
    // set but the label is blank, fall back to DEFAULT_CTA_LABEL rather than
    // dropping the link. ctaLabel stays empty when there is no url (never read).
    const ctaUrl = (col.ctaUrl ?? '').trim()
    const ctaLabel = ctaUrl
      ? getLocalizedValue(col.ctaLabel).trim() || DEFAULT_CTA_LABEL
      : ''
    resolved.push({
      index: resolved.length,
      sourceIndex,
      label,
      badge: getLocalizedValue(col.badge).trim(),
      featured,
      accent: featured && featuredAccentEnabled.value,
      ctaLabel,
      ctaUrl,
    })
  }
  return resolved
})

// Any active column carrying a CTA link. ALL new CTA rendering (desktop tfoot,
// mobile card footer) is gated on this so the default render — no column with a
// ctaUrl — is byte-identical to before: no tfoot, no footer row, no wrapper.
const hasCta = computed(() => activeColumns.value.some((c) => c.ctaUrl))

// Featured column first on mobile so the recommended tier leads the card stack.
const mobileColumns = computed<ResolvedColumn[]>(() => {
  const cols = activeColumns.value
  return [...cols.filter((c) => c.featured), ...cols.filter((c) => !c.featured)]
})

const CELL_FIELDS = ['c1', 'c2', 'c3', 'c4'] as const

interface ResolvedRow {
  label: string
  cells: ResolvedCell[]
}

const rowsModel = computed<ResolvedRow[]>(() => {
  const rows = props.rows ?? []
  const columns = activeColumns.value
  // Cells are packed to render position (aligned with activeColumns[c].index) but each
  // reads its column's ORIGINAL source field, so a middle gap never misattributes data.
  return rows.map((row) => {
    const cells = columns.map((col) => resolveCell(row[CELL_FIELDS[col.sourceIndex]]))
    return { label: getLocalizedValue(row.label), cells }
  })
})

// Placement props — reuse the shared token maps like BeforeAfterReveal. Horizontal
// alignment maps to align-items because the inner is a vertical (column) flex stack.
const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.borderRadius && props.borderRadius !== 'none') {
    style.borderRadius = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? ''
    style.overflow = 'hidden'
  }
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  if (props.contentAlignH && props.contentAlignH !== 'left') {
    const alignMap: Record<string, string> = { center: 'center', right: 'flex-end' }
    style.alignItems = alignMap[props.contentAlignH] ?? 'flex-start'
  }
  return style
})

// ── Mobile swipe deck (opt-in) ─────────────────────────────────────────────────
// Opt-in horizontal scroll-snap track with pagination dots. Fully gated on
// deckMode so the default "stack" render is byte-identical to before.
const deckMode = computed(() => props.mobileLayout === 'deck')
const trackRef = ref<HTMLElement | null>(null)
const activeCard = ref(0)
let scrollRaf: number | null = null

// One card's advance = its rendered width + the flex column-gap between cards.
function cardStride(track: HTMLElement): number {
  const first = track.firstElementChild
  if (!(first instanceof HTMLElement)) return 0
  const gapRaw = getComputedStyle(track).columnGap
  const gap = Number.parseFloat(gapRaw)
  return first.offsetWidth + (Number.isFinite(gap) ? gap : 0)
}

function onTrackScroll(): void {
  if (scrollRaf !== null) return
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = null
    const track = trackRef.value
    if (!track) return
    const stride = cardStride(track)
    if (stride <= 0) return
    const last = mobileColumns.value.length - 1
    const index = Math.round(track.scrollLeft / stride)
    activeCard.value = Math.min(Math.max(index, 0), Math.max(last, 0))
  })
}

function scrollToCard(index: number): void {
  const track = trackRef.value
  if (!track) return
  const stride = cardStride(track)
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  track.scrollTo({ left: index * stride, behavior: reduce ? 'auto' : 'smooth' })
}

// Attach the scroll listener reactively: the cards element is created/destroyed by
// the `collapse` v-if/v-else (viewport transitions) and only exists in deck mode, so
// a one-shot onMounted would miss re-creation and bind in stack mode too. Watching
// [trackRef, deckMode] (re)binds when the element appears in deck mode and the
// onCleanup detaches when it disappears, on mode-off, and on unmount.
watch(
  [trackRef, deckMode],
  ([track], _prev, onCleanup) => {
    if (!track || !deckMode.value) return
    activeCard.value = 0
    track.addEventListener('scroll', onTrackScroll, { passive: true })
    onCleanup(() => track.removeEventListener('scroll', onTrackScroll))
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (scrollRaf !== null) {
    cancelAnimationFrame(scrollRaf)
    scrollRaf = null
  }
})
</script>

<style lang="scss" scoped>
.comparison-table {
  padding: var(--spacing-3xl) var(--spacing-xl);

  &__inner {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    max-width: var(--container-max-width, 1200px);
    margin-inline: auto;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    color: var(--section-text, var(--color-text));
  }

  // Value columns share the remaining width evenly; the attribute column sizes
  // to its content up to a sensible cap so labels stay readable.
  &__corner,
  &__rowhead {
    width: 34%;
  }

  // ── Column headers ─────────────────────────────────────────────────────────
  &__corner {
    text-align: left;
    background: transparent;
  }

  &__colhead {
    text-align: left;
    vertical-align: bottom;
    padding: var(--spacing-sm, 0.8rem) var(--spacing-md, 1.2rem);
    border-bottom: 2px solid var(--color-border, var(--border-color, rgba(0, 0, 0, 0.12)));
    font-family: var(--rt-role-heading-family, var(--font-family-heading, inherit));
    font-size: var(--rt-role-heading-size, var(--font-size-md, 1.8rem));
    font-weight: var(--rt-role-heading-weight, 600);
    line-height: 1.2;
    color: var(--section-text, var(--color-text));

    &.is-featured {
      border-bottom-color: var(--color-accent, currentColor);
    }
  }

  &__colhead-label {
    display: block;
  }

  &__badge {
    display: inline-block;
    margin-top: 0.4rem;
    padding: 0.15em 0.6em;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-accent, currentColor) 14%, transparent);
    color: var(--color-accent, currentColor);
    font-family: var(--rt-role-caption-family, var(--font-family-body, inherit));
    font-size: var(--rt-role-caption-size, var(--font-size-xs, 1.2rem));
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    line-height: 1.4;
    white-space: nowrap;
  }

  // ── Row header (attribute name) ──────────────────────────────────────────────
  &__rowhead {
    text-align: left;
    vertical-align: middle;
    padding: var(--spacing-sm, 0.8rem) var(--spacing-md, 1.2rem);
    font-family: var(--rt-role-label-family, var(--font-family-body, inherit));
    font-size: var(--rt-role-body-size, var(--font-size-base, 1.6rem));
    font-weight: 600;
    line-height: 1.4;
    color: var(--section-text, var(--color-text));
  }

  // ── Data cells ───────────────────────────────────────────────────────────────
  &__cell {
    padding: var(--spacing-sm, 0.8rem) var(--spacing-md, 1.2rem);
    vertical-align: middle;
    font-family: var(--rt-role-body-family, var(--font-family-body, inherit));
    font-size: var(--rt-role-body-size, var(--font-size-base, 1.6rem));
    line-height: var(--rt-role-body-line-height, 1.5);
    color: var(--section-text, var(--color-text));

    &.is-featured {
      background: color-mix(in srgb, var(--color-accent, currentColor) 6%, transparent);
    }
  }

  // Featured column gets subtle side borders that read as a vertical highlight.
  &__colhead.is-featured,
  &__cell.is-featured {
    border-inline: 1px solid color-mix(in srgb, var(--color-accent, currentColor) 30%, transparent);
  }

  // ── Row dividers ─────────────────────────────────────────────────────────────
  &--dividers &__row:not(:last-child) &__rowhead,
  &--dividers &__row:not(:last-child) &__cell {
    border-bottom: 1px solid var(--color-border, var(--border-color, rgba(0, 0, 0, 0.12)));
  }

  // ── Density ──────────────────────────────────────────────────────────────────
  &--compact &__colhead,
  &--compact &__rowhead,
  &--compact &__cell {
    padding: var(--spacing-xs, 0.4rem) var(--spacing-sm, 0.8rem);
  }

  // ── Yes / no / empty marks ────────────────────────────────────────────────────
  &__mark {
    font-size: 1.15em;
    line-height: 1;

    &--yes {
      color: var(--color-accent, currentColor);
    }

    &--no,
    &--empty {
      color: var(--section-text, var(--color-text));
      opacity: 0.4;
    }
  }

  &__value {
    display: inline-block;
  }

  // ── Mobile: per-column card stack ─────────────────────────────────────────────
  &__cards {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg, 1.6rem);
    width: 100%;
  }

  &__card {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid var(--color-border, var(--border-color, rgba(0, 0, 0, 0.12)));
    border-radius: var(--border-radius, 0.4rem);
    overflow: hidden;
    color: var(--section-text, var(--color-text));

    &.is-featured {
      border-color: var(--color-accent, currentColor);
    }
  }

  // ── Mobile deck (opt-in): horizontal scroll-snap track ─────────────────────────
  &__cards--deck {
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  // One card per swipe with a peek of the next. flex-basis governs sizing but width
  // is set too, to override the base &__card { width: 100% } on the flex item.
  &__cards--deck &__card {
    flex: 0 0 82%;
    width: 82%;
    scroll-snap-align: start;
  }

  // ── Deck pagination dots ───────────────────────────────────────────────────────
  &__dots {
    display: flex;
    justify-content: center;
    gap: 0.6rem;
    margin-top: var(--spacing-md, 1.2rem);
  }

  // Visual dot is 0.8rem (the ::before); the button is a 44px tap target
  // (root font is 62.5% → 1rem = 10px, so 4.4rem = 44px).
  &__dot {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 4.4rem;
    height: 4.4rem;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;

    &::before {
      content: '';
      width: 0.8rem;
      height: 0.8rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--section-text, var(--color-text)) 25%, transparent);
      transition: background 0.2s, transform 0.2s;
    }

    &.is-active::before {
      background: var(--color-accent, currentColor);
      transform: scale(1.2);
    }
  }

  &__card-caption {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.6rem;
    padding: var(--spacing-sm, 0.8rem) var(--spacing-md, 1.2rem);
    text-align: left;
    background: color-mix(in srgb, var(--color-accent, currentColor) 6%, transparent);
    border-bottom: 1px solid var(--color-border, var(--border-color, rgba(0, 0, 0, 0.12)));
  }

  &__card.is-featured &__card-caption {
    background: color-mix(in srgb, var(--color-accent, currentColor) 12%, transparent);
  }

  &__card-title {
    font-family: var(--rt-role-heading-family, var(--font-family-heading, inherit));
    font-size: var(--rt-role-heading-size, var(--font-size-md, 1.8rem));
    font-weight: 600;
    line-height: 1.2;
  }

  &__card &__row {
    display: flex;
    justify-content: space-between;
    gap: var(--spacing-md, 1.2rem);
  }

  &__card &__rowhead {
    flex: 1 1 auto;
    width: auto;
  }

  &__card &__cell {
    flex: 0 0 auto;
    text-align: right;
    background: none;
    border-inline: 0;
  }

  &__card &__row:not(:last-child) &__rowhead,
  &__card &__row:not(:last-child) &__cell {
    border-bottom: 1px solid var(--color-border, var(--border-color, rgba(0, 0, 0, 0.12)));
  }

  // ── Per-column CTA ─────────────────────────────────────────────────────────────
  // Desktop tfoot cells align to the value columns; the corner matches the rowhead.
  &__cta-corner {
    width: 34%;
    background: transparent;
  }

  &__cta-cell {
    padding: var(--spacing-md, 1.2rem);
    text-align: left;
    vertical-align: top;

    &.is-featured {
      background: color-mix(in srgb, var(--color-accent, currentColor) 6%, transparent);
      border-inline: 1px solid color-mix(in srgb, var(--color-accent, currentColor) 30%, transparent);
    }
  }

  &--compact &__cta-cell {
    padding: var(--spacing-sm, 0.8rem);
  }

  // The button itself. 44px min tap target (root 62.5% → 4.4rem = 44px).
  &__cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 4.4rem;
    padding: 0.6rem 1.6rem;
    border-radius: var(--border-radius, 0.4rem);
    border: 1px solid transparent;
    font-family: var(--rt-role-label-family, var(--rt-role-caption-family, var(--font-family-body, inherit)));
    font-size: var(--rt-role-label-size, var(--rt-role-caption-size, var(--font-size-sm, 1.4rem)));
    font-weight: 600;
    line-height: 1.2;
    text-align: center;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;

    &:focus-visible {
      outline: 2px solid var(--color-accent, currentColor);
      outline-offset: 2px;
    }

    // Featured column: solid accent fill with surface-colored text.
    &--solid {
      background: var(--color-accent, currentColor);
      color: var(--color-background, #fff);
      border-color: var(--color-accent, currentColor);

      &:hover {
        transform: translateY(-1px);
      }
    }

    // Other columns: transparent ghost with an accent-mix border + accent text.
    &--ghost {
      background: transparent;
      color: var(--color-accent, currentColor);
      border-color: color-mix(in srgb, var(--color-accent, currentColor) 40%, transparent);

      &:hover {
        background: color-mix(in srgb, var(--color-accent, currentColor) 8%, transparent);
        border-color: var(--color-accent, currentColor);
      }
    }
  }

  // Mobile CTA reads best full-width at the bottom of the card.
  &__cta-cell--mobile {
    padding: var(--spacing-md, 1.2rem);
    background: none;
    border-inline: 0;
  }

  &__cta--mobile {
    display: flex;
    width: 100%;
  }

  &__card.is-featured &__cta-cell--mobile {
    background: color-mix(in srgb, var(--color-accent, currentColor) 6%, transparent);
  }

  // Visually-hidden utility for the sr-only cell + caption announcements.
  &__sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .comparison-table__cards--deck {
    scroll-behavior: auto;
  }

  .comparison-table__cta {
    transition: none;
  }

  .comparison-table__cta--solid:hover {
    transform: none;
  }
}
</style>
