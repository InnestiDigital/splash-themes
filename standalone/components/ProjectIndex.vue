<template>
  <section
    class="project-index"
    :class="[
      `project-index--${scale}`,
      { 'project-index--can-hover': canHover, 'project-index--filterable': filterEnabled },
    ]"
    :style="measureStyle"
    data-target="root"
    @pointermove="onPointerMove"
    @pointerleave="onListLeave"
  >
    <!-- Opt-in category filter. Chips are derived from the projects' Category
         field, in first-appearance order; the whole thing is guarded by
         `filterEnabled` so a disabled instance renders byte-identically to before. -->
    <div
      v-if="filterEnabled && chips.length > 1"
      class="project-index__filters"
      role="group"
      :aria-label="'Filter projects'"
    >
      <button
        v-for="chip in chips"
        :key="chip.key"
        type="button"
        class="project-index__chip"
        :class="{ 'is-active': chip.key === activeCategory }"
        :aria-pressed="chip.key === activeCategory ? 'true' : 'false'"
        @click="onFilter(chip.key)"
      >
        {{ chip.label }}
        <span class="project-index__chip-count" aria-hidden="true">{{ chip.count }}</span>
      </button>
    </div>

    <!-- Opt-in sort control. Reorders the list in the DOM (never via CSS `order`,
         which would desync ordinals / row borders / peek indices). Guarded by
         `sortEnabled` so a disabled instance renders no control at all. -->
    <div
      v-if="sortEnabled && items.length > 1"
      class="project-index__sort"
      role="group"
      :aria-label="'Sort projects'"
    >
      <button
        v-for="opt in SORT_OPTIONS"
        :key="opt.key"
        type="button"
        class="project-index__chip project-index__sort-btn"
        :class="{ 'is-active': opt.key === activeSort }"
        :aria-pressed="opt.key === activeSort ? 'true' : 'false'"
        @click="onSort(opt.key)"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- Polite live region announcing the current result count (screen readers). -->
    <p v-if="filterEnabled || sortEnabled" class="project-index__sr" aria-live="polite">{{ liveMessage }}</p>

    <ol class="project-index__list" :key="filterEnabled ? activeCategory : undefined">
      <!-- Iterate ORIGINAL indices in display order. `orderedIndices` is the
           identity map unless a non-'original' sort is active, so `:key`,
           `:data-row` and DOM order match a pre-sort instance exactly. -->
      <li
        v-for="oi in orderedIndices"
        :key="oi"
        class="project-index__row"
        :class="{ 'is-hidden': !matches(items[oi]) }"
        data-target="row"
        :data-row="oi"
      >
        <component
          :is="items[oi].link ? 'a' : 'div'"
          :href="items[oi].link || undefined"
          class="project-index__link"
          @pointerenter="onRowEnter(oi, $event)"
          @focusin="onRowFocus(oi)"
          @focusout="onRowBlur"
        >
          <span v-if="showNumber" class="project-index__num" aria-hidden="true">{{ displayOrdinal(oi) }}</span>

          <!-- Mobile / no-hover fallback: inline thumbnail so the image is never lost. -->
          <span v-if="!canHover && items[oi].image" class="project-index__thumb" aria-hidden="true">
            <img :src="items[oi].image" :alt="''" loading="lazy" />
          </span>

          <span class="project-index__title">{{ items[oi].title }}</span>
          <span v-if="showCategory && items[oi].category" class="project-index__category">{{ items[oi].category }}</span>
          <span v-if="items[oi].meta" class="project-index__meta">{{ items[oi].meta }}</span>
        </component>
      </li>
    </ol>

    <!-- Cursor-trailing hover preview. Decorative (aria-hidden) — the row link carries the meaning.
         Rendered only on fine-pointer devices; positioned imperatively via an rAF lerp loop.
         Teleported to <body> so its position:fixed is viewport-relative even when an ancestor
         (e.g. AnimatedBlock during a reveal) is transformed — mirrors the Lightbox precedent. -->
    <Teleport to="body">
      <div
        v-if="canHover"
        ref="peekEl"
        class="project-index__peek"
        :class="[`project-index__peek--${previewRatio.replace(':', '-')}`, { 'is-active': activeIndex !== null }]"
        aria-hidden="true"
      >
        <img v-if="peekSrc" :src="peekSrc" :alt="''" class="project-index__peek-img" />
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'

type Scale = 'compact' | 'comfortable' | 'display'
type PreviewSize = 'small' | 'medium' | 'large'
type PreviewRatio = '1:1' | '4:3' | '3:2' | '3:4'
type SortKey = 'original' | 'az' | 'za'

interface ProjectInput {
  image?: string | { url: string }
  title?: string | Record<string, string>
  meta?: string | Record<string, string>
  category?: string
  link?: string
}

interface Item {
  image: string
  title: string
  meta: string
  category: string
  link: string
}

const props = defineProps<{
  projects?: ProjectInput[]
  showNumber?: boolean
  showCategory?: boolean
  scale?: Scale
  measureWidth?: 'content' | 'narrow' | 'standard' | 'wide' | 'full'
  previewSize?: PreviewSize
  previewRatio?: PreviewRatio
  enableFilter?: boolean
  shareableFilter?: boolean
  filterAllLabel?: string | Record<string, string>
  enableSort?: boolean
  defaultOrder?: SortKey
  // Stable per-instance id supplied by DynamicPage (block.id). Used only to
  // namespace the URL query key — mirrors FaqAccordion's blockId usage.
  blockId?: string
}>()

const { getLocalizedValue } = useLocalized()
const { isReducedMotion } = useReducedMotion()
const renderMode = useRenderMode()
const isEditor = computed(() => renderMode.value === 'editor-preview')

const scale = computed<Scale>(() => props.scale || 'comfortable')
const showNumber = computed(() => props.showNumber ?? true)
const showCategory = computed(() => props.showCategory ?? true)
const previewRatio = computed<PreviewRatio>(() => props.previewRatio || '4:3')

const PREVIEW_WIDTHS: Record<PreviewSize, string> = {
  small: '14rem',
  medium: '20rem',
  large: '28rem',
}

// Locale-aware, natural title compare (numeric so "Project 2" < "Project 10").
// Created once and shared by every sort — the compare is pure.
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

function resolveImage(image: ProjectInput['image']): string {
  if (!image) return ''
  if (typeof image === 'string') return image
  return image.url || ''
}

const items = computed<Item[]>(() =>
  (props.projects ?? []).map((p) => ({
    image: resolveImage(p.image),
    title: p.title ? getLocalizedValue(p.title) : '',
    meta: p.meta ? getLocalizedValue(p.meta) : '',
    category: (p.category ?? '').trim(),
    link: (p.link ?? '').trim(),
  })),
)

function ordinal(i: number): string {
  return String(i + 1).padStart(2, '0')
}

// ── Category filter (opt-in) ─────────────────────────────────────────────────
// When `enableFilter` is off (the default) none of this affects render:
// `activeCategory` stays ALL, so `matches()` is true for every row, `.is-hidden`
// is never applied, and `displayOrdinal()` falls back to the original ordinal —
// the DOM is byte-identical to a pre-filter instance. Mirrors FilterableGallery.
const ALL = '__all__'
const filterEnabled = computed(() => props.enableFilter ?? false)
const activeCategory = ref<string>(ALL)

const filterAllLabel = computed(() =>
  props.filterAllLabel ? getLocalizedValue(props.filterAllLabel) : 'All',
)

// Distinct categories in first-appearance order (stable chip order).
const categories = computed<string[]>(() => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of items.value) {
    if (item.category && !seen.has(item.category)) {
      seen.add(item.category)
      out.push(item.category)
    }
  }
  return out
})

interface Chip {
  key: string
  label: string
  count: number
}
const chips = computed<Chip[]>(() => {
  const total = items.value.length
  const list: Chip[] = [{ key: ALL, label: filterAllLabel.value, count: total }]
  for (const c of categories.value) {
    list.push({ key: c, label: c, count: items.value.filter((it) => it.category === c).length })
  }
  return list
})

function matches(item: Item): boolean {
  return activeCategory.value === ALL || item.category === activeCategory.value
}

// ── Sort control (opt-in) ────────────────────────────────────────────────────
// When `enableSort` is off (the default) `activeSort` stays 'original', so
// `orderedIndices` is the identity map — the list renders in source order with
// the same keys, data-row indices and ordinals as a pre-sort instance (DOM is
// byte-identical). Mirrors the filter's disabled-is-inert contract.
const sortEnabled = computed(() => props.enableSort ?? false)
const activeSort = ref<SortKey>('original')

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'original', label: 'Original' },
  { key: 'az', label: 'A–Z' },
  { key: 'za', label: 'Z–A' },
]

// Render order expressed as ORIGINAL item indices. Identity when sort is off or
// on the 'original' key (guarantees the untouched-default DOM). Otherwise a
// STABLE title sort: the original index is the tiebreaker so equal titles ALWAYS
// keep source order — 'za' negates the title comparator (not a reverse() of the
// A–Z result, which would flip equal-title ties) while keeping the a - b tiebreak.
const orderedIndices = computed<number[]>(() => {
  const idx = items.value.map((_, i) => i)
  if (!sortEnabled.value || activeSort.value === 'original') return idx
  const dir = activeSort.value === 'za' ? -1 : 1
  idx.sort((a, b) => {
    const cmp = dir * collator.compare(items.value[a].title, items.value[b].title)
    return cmp !== 0 ? cmp : a - b
  })
  return idx
})

function onSort(key: SortKey) {
  if (key === activeSort.value) return
  // In the editor preview, keep the buttons inert so a click selects the block
  // instead of mutating view-only state — mirrors `onFilter`.
  if (isEditor.value) return
  activeSort.value = key
}

// Sequential 1-based position of each visible row (item index → visible ordinal),
// assigned in DISPLAY order (iterating `orderedIndices`) so a sorted list still
// numbers 01, 02, … top-to-bottom. When the order is identity this yields the
// exact same map as a pure source-order walk, so ordinals are unchanged by
// default. Recomputes reactively on filter/sort change.
const visibleOrdinals = computed<Map<number, number>>(() => {
  const map = new Map<number, number>()
  let n = 0
  for (const oi of orderedIndices.value) {
    if (matches(items.value[oi])) {
      n += 1
      map.set(oi, n)
    }
  }
  return map
})

function displayOrdinal(i: number): string {
  // Neither filter nor sort active → the original zero-padded ordinal (byte-identical default).
  if (!filterEnabled.value && !sortEnabled.value) return ordinal(i)
  const n = visibleOrdinals.value.get(i)
  return n ? String(n).padStart(2, '0') : ordinal(i)
}

const visibleCount = computed(() => items.value.filter(matches).length)
const liveMessage = computed(() => {
  const label = activeCategory.value === ALL ? filterAllLabel.value : activeCategory.value
  const base = `Showing ${visibleCount.value} of ${items.value.length} projects — ${label}`
  // Append the active sort so screen readers hear order changes too.
  if (!sortEnabled.value || activeSort.value === 'original') return base
  return `${base} · Sorted ${activeSort.value === 'az' ? 'A to Z' : 'Z to A'}`
})

function onFilter(key: string) {
  if (key === activeCategory.value) return
  // In the editor preview, keep chips inert so a click selects the block instead
  // of mutating view-only state — mirrors the peek's canHover gate.
  if (isEditor.value) return
  activeCategory.value = key
  // Reflect the new selection into the URL so the state is shareable and the
  // browser back button reverts it. No-op unless `syncEnabled` (see below).
  writeUrl(key)
}

// ── Shareable filter (opt-in URL sync) ───────────────────────────────────────
// DOUBLE-gated: only when the filter is on AND `shareableFilter` is on AND we're
// not in the editor preview AND we have a stable blockId to namespace the query
// key. When `syncEnabled` is false, ZERO window/history/location access happens
// anywhere below — a non-shareable (or default) instance touches the URL never,
// keeping render + behavior byte-identical to today. The `!isEditor` term is the
// preview guard: the editor iframe's URL is never read, written, or listened to.
const shareableEnabled = computed(() => props.shareableFilter ?? false)
const syncEnabled = computed(
  () => filterEnabled.value && shareableEnabled.value && !isEditor.value && !!props.blockId,
)

// Namespaced query key, stable across reloads (blockId is persistent; useId() is
// NOT reload-stable so it is deliberately avoided). Only read when a blockId
// exists — `syncEnabled` already guarantees that at every call site.
const queryKey = computed(() => `pi-${(props.blockId ?? '').slice(0, 8)}`)

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Bijection category <-> slug. Slugs are globally deduped with a Set-based
// uniqueness loop (mirrors FaqAccordion) so two categories never collapse onto
// the same URL token. ALL is intentionally excluded — it maps to param-absent.
const slugForCategory = computed<Map<string, string>>(() => {
  const used = new Set<string>()
  const map = new Map<string, string>()
  categories.value.forEach((category, index) => {
    let base = slugify(category)
    if (!base) base = `c-${index}`
    let candidate = base
    let n = 2
    while (used.has(candidate)) {
      candidate = `${base}-${n}`
      n++
    }
    used.add(candidate)
    map.set(category, candidate)
  })
  return map
})

const categoryForSlug = computed<Map<string, string>>(() => {
  const map = new Map<string, string>()
  for (const [category, slug] of slugForCategory.value) map.set(slug, category)
  return map
})

// Resolve the current URL param to a category key. ALL (param absent) or an
// unknown/stale slug both resolve to ALL — never throws.
function categoryFromUrl(): string {
  const params = new URLSearchParams(window.location.search)
  const slug = params.get(queryKey.value)
  if (!slug) return ALL
  return categoryForSlug.value.get(slug) ?? ALL
}

// Push the given category into the URL (pushState so BACK reverts the filter).
// Preserves every other query param; ALL deletes the key. Never touches
// pathname or hash. Guarded by `syncEnabled`.
function writeUrl(key: string) {
  if (!syncEnabled.value) return
  const url = new URL(window.location.href)
  if (key === ALL) {
    url.searchParams.delete(queryKey.value)
  } else {
    const slug = slugForCategory.value.get(key)
    if (!slug) {
      // Category has no slug (shouldn't happen for a real chip key) — treat as
      // ALL rather than writing a bogus token.
      url.searchParams.delete(queryKey.value)
    } else {
      url.searchParams.set(queryKey.value, slug)
    }
  }
  window.history.pushState(null, '', url)
}

// Re-read the param and update the visible filter. Used on mount and on
// popstate so back/forward navigation live-updates the chips.
function syncFromUrl() {
  if (!syncEnabled.value) return
  activeCategory.value = categoryFromUrl()
}

function onPopState() {
  syncFromUrl()
}

const measureStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {
    '--peek-width': PREVIEW_WIDTHS[props.previewSize || 'medium'],
  }
  if (props.measureWidth) style['--block-measure'] = `var(--measure-width-${props.measureWidth})`
  return style
})

// ── Hover-peek state ─────────────────────────────────────────────────────────
// `canHover` gates the entire peek: fine-pointer device AND not the editor
// preview (where a click must select the block, mirroring the Lightbox /
// CursorLayer / FilterableGallery precedent). Resolved on mount because SSR is
// disabled and matchMedia is client-only.
const canHover = ref(false)
const peekEl = ref<HTMLElement | null>(null)
const activeIndex = ref<number | null>(null)
const peekSrc = ref('')

const target = { x: 0, y: 0 }
const pos = { x: 0, y: 0 }
let rafId: number | null = null
let seeded = false // has the pointer position been initialised this hover?

function onRowEnter(i: number, e: PointerEvent) {
  if (!canHover.value) return
  activate(i)
  // Seed the position immediately from the entering pointer, so the preview
  // appears at the cursor even if no pointermove follows (fast entries).
  if (activeIndex.value !== null) positionFromPointer(e.clientX, e.clientY)
}

// Keyboard parity: focusing a row reveals its preview, anchored to the row's
// right edge (no cursor to follow). Uses the same fade + lerp path.
function onRowFocus(i: number) {
  if (!canHover.value) return
  // Anchor by the original-index `data-row` (not DOM position) so the peek lands
  // on the right row even after a sort reorders the list. Identical to the
  // positional lookup when the order is identity.
  const rowEl = peekEl.value
    ?.closest('.project-index')
    ?.querySelector(`.project-index__row[data-row="${i}"]`)
  if (rowEl instanceof HTMLElement) {
    const r = rowEl.getBoundingClientRect()
    target.x = r.right - (peekEl.value?.offsetWidth ?? 0) - 16
    target.y = r.top + r.height / 2 - (peekEl.value?.offsetHeight ?? 0) / 2
    if (!seeded) {
      pos.x = target.x
      pos.y = target.y
      seeded = true
    }
  }
  activate(i)
}

function onRowBlur() {
  // Defer so focus moving between rows doesn't flicker the preview off.
  requestAnimationFrame(() => {
    const active = document.activeElement
    if (!active?.closest?.('.project-index__link')) deactivate()
  })
}

function activate(i: number) {
  const item = items.value[i]
  if (!item || !item.image) {
    deactivate()
    return
  }
  peekSrc.value = item.image
  activeIndex.value = i
}

function deactivate() {
  activeIndex.value = null
  seeded = false
}

function onPointerMove(e: PointerEvent) {
  if (!canHover.value || activeIndex.value === null) return
  positionFromPointer(e.clientX, e.clientY)
}

function positionFromPointer(cx: number, cy: number) {
  const el = peekEl.value
  const w = el?.offsetWidth ?? 240
  const h = el?.offsetHeight ?? 180
  const OFF = 28
  let tx = cx + OFF
  let ty = cy + OFF
  // Flip / clamp so the preview stays fully on-screen.
  if (tx + w > window.innerWidth - 12) tx = cx - w - OFF
  if (ty + h > window.innerHeight - 12) ty = window.innerHeight - h - 12
  if (ty < 12) ty = 12
  target.x = tx
  target.y = ty
  if (!seeded) {
    // First move of a hover: jump straight to the pointer so the preview doesn't
    // fly in from a stale corner.
    pos.x = tx
    pos.y = ty
    seeded = true
  }
}

function onListLeave() {
  deactivate()
}

function frame() {
  const el = peekEl.value
  if (el) {
    // Reduced motion → pin instantly (no trailing lerp); the reveal stays functional.
    const ease = isReducedMotion.value ? 1 : 0.18
    pos.x += (target.x - pos.x) * ease
    pos.y += (target.y - pos.y) * ease
    el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`
  }
  rafId = requestAnimationFrame(frame)
}

onMounted(() => {
  const fine =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  canHover.value = fine && !isEditor.value
  if (canHover.value) rafId = requestAnimationFrame(frame)

  // Seed the starting order from `defaultOrder`, but only when sort is enabled —
  // otherwise `activeSort` stays 'original' and `orderedIndices` is the identity.
  if (sortEnabled.value) activeSort.value = props.defaultOrder ?? 'original'

  // Shareable filter: hydrate the active category from the URL and start
  // listening for back/forward. Both are no-ops unless `syncEnabled`, so a
  // non-shareable instance never reads the URL nor registers a listener.
  if (syncEnabled.value) {
    syncFromUrl()
    window.addEventListener('popstate', onPopState)
  }
})

// If the render mode resolves after mount (e.g. editor preview iframe), stop peeking.
watch(isEditor, (editor) => {
  if (editor) {
    canHover.value = false
    deactivate()
  }
})

onBeforeUnmount(() => {
  if (rafId !== null) cancelAnimationFrame(rafId)
  // Remove the popstate listener unconditionally — removeEventListener is safe
  // even if it was never added (syncEnabled was false), so no leak either way.
  if (typeof window !== 'undefined') window.removeEventListener('popstate', onPopState)
})
</script>

<style lang="scss" scoped>
.project-index {
  position: relative;
  max-width: var(--block-measure, none);
  margin-inline: var(--block-measure-align, 0);

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  // ── Filter bar (opt-in) ────────────────────────────────────────────────────
  // Copied from FilterableGallery so the two blocks read as one system.
  &__filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-bottom: 2.4rem;
  }

  // Sort bar — same layout as the filter bar; reuses `&__chip` for the buttons so
  // the two controls read as one system. Stacks cleanly below the filters when
  // both are shown.
  &__sort {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-bottom: 2.4rem;
  }

  &__chip {
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    // Meets the 44px minimum tap target (WCAG 2.5.5) on touch.
    min-height: 44px;
    padding: 0.5rem 1.3rem;
    border: 1px solid color-mix(in srgb, currentColor 24%, transparent);
    border-radius: 100px;
    background: transparent;
    color: inherit;
    font-family: var(--rt-role-body-family, var(--font-family-body, inherit));
    font-size: var(--font-size-sm, 1.4rem);
    letter-spacing: 0.02em;
    line-height: 1.2;
    cursor: pointer;
    transition: background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease;

    &:hover {
      border-color: color-mix(in srgb, currentColor 50%, transparent);
    }
    &.is-active {
      background: var(--color-accent, currentColor);
      border-color: var(--color-accent, currentColor);
      color: var(--color-on-accent, #fff);
    }
    &:focus-visible {
      outline: 2px solid var(--color-accent, currentColor);
      outline-offset: 2px;
    }
  }

  &__chip-count {
    font-size: 0.78em;
    opacity: 0.6;
    font-variant-numeric: tabular-nums;
  }

  // Visually-hidden live region (announced by screen readers only).
  &__sr {
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

  // A light fade on the surviving rows when the active category changes. The
  // <ol> is re-keyed on `activeCategory`, so it remounts and replays this
  // keyframe. Scoped to `--filterable` so a disabled instance never animates.
  &--filterable &__list {
    animation: project-index-filter-fade 0.32s ease both;
  }

  &__row {
    border-top: 1px solid color-mix(in srgb, currentColor 16%, transparent);

    &:last-child {
      border-bottom: 1px solid color-mix(in srgb, currentColor 16%, transparent);
    }

    &.is-hidden {
      display: none;
    }
  }

  &__link {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: baseline;
    column-gap: 1.6rem;
    row-gap: 0.2rem;
    padding: var(--row-pad-y, 1.6rem) 0.4rem;
    text-decoration: none;
    color: inherit;
    transition: padding-left 0.35s cubic-bezier(0.22, 1, 0.36, 1),
      color 0.3s ease;
  }
  a.project-index__link {
    cursor: pointer;
  }
  // Hover / focus: nudge the row inward and warm the title toward the accent.
  .project-index--can-hover a.project-index__link:hover,
  a.project-index__link:focus-visible {
    padding-left: 1.4rem;
    color: var(--color-accent, currentColor);
  }
  a.project-index__link:focus-visible {
    outline: 2px solid var(--color-accent, currentColor);
    outline-offset: 3px;
  }

  &__num {
    grid-column: 1;
    font-family: var(--rt-role-body-family, var(--font-family-body, inherit));
    font-size: 0.72em;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.06em;
    opacity: 0.5;
    align-self: center;
  }

  &__thumb {
    grid-column: 1;
    display: block;
    width: 5.6rem;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    border-radius: 2px;
    background: color-mix(in srgb, currentColor 8%, transparent);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  &__title {
    grid-column: 2;
    font-family: var(--rt-role-heading2-family, var(--font-family-heading, Georgia, serif));
    font-weight: var(--rt-role-heading2-weight, 500);
    line-height: 1.08;
    letter-spacing: -0.015em;
  }

  &__category {
    grid-column: 3;
    grid-row: 1;
    justify-self: end;
    align-self: center;
    font-family: var(--rt-role-body-family, var(--font-family-body, inherit));
    font-size: var(--font-size-sm, 1.4rem);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    opacity: 0.55;
    white-space: nowrap;
  }

  &__meta {
    grid-column: 2;
    font-family: var(--rt-role-body-family, var(--font-family-body, inherit));
    font-size: var(--font-size-sm, 1.4rem);
    letter-spacing: 0.02em;
    opacity: 0.6;
  }

  // Row scale — title size scales; padding follows.
  &--compact &__title { font-size: clamp(1.8rem, 2.4vw, 2.4rem); }
  &--compact &__link { --row-pad-y: 1.1rem; }
  &--comfortable &__title { font-size: clamp(2.4rem, 4vw, 3.6rem); }
  &--comfortable &__link { --row-pad-y: 1.8rem; }
  &--display &__title { font-size: clamp(3.2rem, 7vw, 6.4rem); }
  &--display &__link { --row-pad-y: 2.6rem; }

  // ── Cursor-trailing hover preview ────────────────────────────────────────
  &__peek {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 60;
    width: var(--peek-width, 20rem);
    pointer-events: none;
    overflow: hidden;
    border-radius: 4px;
    box-shadow: 0 1.2rem 3.2rem rgba(0, 0, 0, 0.28);
    background: color-mix(in srgb, currentColor 8%, transparent);
    opacity: 0;
    transform: translate3d(-9999px, -9999px, 0);
    scale: 0.92;
    transition: opacity 0.32s ease, scale 0.32s cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform, opacity;

    &--1-1 { aspect-ratio: 1 / 1; }
    &--4-3 { aspect-ratio: 4 / 3; }
    &--3-2 { aspect-ratio: 3 / 2; }
    &--3-4 { aspect-ratio: 3 / 4; }

    &.is-active {
      opacity: 1;
      scale: 1;
    }
  }

  &__peek-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  // Reduced motion: no scale/opacity easing on the reveal (the rAF loop already
  // pins position without a trail). Snap in.
  @media (prefers-reduced-motion: reduce) {
    &__peek { transition: none; }
    &__link { transition: none; }
    // Swap the filtered list instantly — no fade.
    &--filterable &__list { animation: none; }
    &__chip { transition: none; }
  }
}

@keyframes project-index-filter-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
