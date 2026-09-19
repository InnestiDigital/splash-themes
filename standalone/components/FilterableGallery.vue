<template>
  <section
    class="filterable-gallery"
    :class="[
      `filterable-gallery--${density}`,
      `filterable-gallery--caption-${captionStyle}`,
      `filterable-gallery--layout-${layout}`,
    ]"
    :style="measureStyle"
    data-target="root"
  >
    <!-- Filter chips. Derived from the distinct project categories, in first-appearance order. -->
    <div
      v-if="showFilters && chips.length > 1"
      class="filterable-gallery__filters"
      role="group"
      :aria-label="'Filter projects'"
    >
      <button
        v-for="chip in chips"
        :key="chip.key"
        type="button"
        class="filterable-gallery__chip"
        :class="{ 'is-active': chip.key === activeFilter }"
        :aria-pressed="chip.key === activeFilter ? 'true' : 'false'"
        @click="onFilter(chip.key)"
      >
        {{ chip.label }}
        <span class="filterable-gallery__chip-count" aria-hidden="true">{{ chip.count }}</span>
      </button>
    </div>

    <!-- Polite live region announcing the current result count (screen readers). -->
    <p class="filterable-gallery__sr" aria-live="polite">{{ liveMessage }}</p>

    <ul ref="gridEl" class="filterable-gallery__grid" data-target="items">
      <li
        v-for="(p, i) in projects"
        :key="i"
        ref="cardEls"
        class="filterable-gallery__card"
        :class="{ 'is-hidden': !matches(p) }"
        data-target="item"
        :data-card="i"
      >
        <component
          :is="p.link ? 'a' : (tileHasLightbox(p) ? 'button' : 'div')"
          v-bind="mediaAttrs(p)"
          class="filterable-gallery__media"
          :class="aspectClass"
        >
          <img
            v-if="p.image"
            :src="p.image"
            :alt="title(p)"
            class="filterable-gallery__img"
            loading="lazy"
          />
          <span v-if="tileHasLightbox(p)" class="filterable-gallery__zoom" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </span>
          <span v-if="p.category" class="filterable-gallery__badge">{{ p.category }}</span>
          <span v-if="captionStyle === 'overlay'" class="filterable-gallery__overlay">
            <span class="filterable-gallery__title">{{ title(p) }}</span>
            <span v-if="meta(p)" class="filterable-gallery__meta">{{ meta(p) }}</span>
          </span>
        </component>

        <div v-if="captionStyle === 'below'" class="filterable-gallery__caption">
          <span class="filterable-gallery__title">{{ title(p) }}</span>
          <span v-if="meta(p)" class="filterable-gallery__meta">{{ meta(p) }}</span>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, useId } from 'vue'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'

type Density = 'compact' | 'comfortable' | 'wide'
type CaptionStyle = 'below' | 'overlay'
type Speed = 'slow' | 'normal' | 'fast'
type AspectRatio = '1:1' | '4:3' | '3:2' | '16:9' | '3:4' | 'auto'
type Layout = 'grid' | 'masonry'

interface ProjectInput {
  image?: string | { url: string }
  title?: string | Record<string, string>
  meta?: string | Record<string, string>
  category?: string
  link?: string
}

interface Project {
  image: string
  title: string | Record<string, string> | undefined
  meta: string | Record<string, string> | undefined
  category: string
  link: string
}

const props = defineProps<{
  projects?: ProjectInput[]
  showFilters?: boolean
  allLabel?: string | Record<string, string>
  aspectRatio?: AspectRatio
  layout?: Layout
  density?: Density
  measureWidth?: 'content' | 'narrow' | 'standard' | 'wide' | 'full'
  captionStyle?: CaptionStyle
  reflowSpeed?: Speed
  enableLightbox?: boolean
}>()

const { getLocalizedValue } = useLocalized()
const { isReducedMotion } = useReducedMotion()
const renderMode = useRenderMode()
const isEditor = computed(() => renderMode.value === 'editor-preview')

const ALL = '__all__'

const layout = computed<Layout>(() => props.layout || 'grid')
const density = computed<Density>(() => props.density || 'comfortable')
const captionStyle = computed<CaptionStyle>(() => props.captionStyle || 'below')
const showFilters = computed(() => props.showFilters ?? true)

function resolveImage(image: ProjectInput['image']): string {
  if (!image) return ''
  if (typeof image === 'string') return image
  return image.url || ''
}

const projects = computed<Project[]>(() =>
  (props.projects ?? []).map((p) => ({
    image: resolveImage(p.image),
    title: p.title,
    meta: p.meta,
    category: (p.category ?? '').trim(),
    link: (p.link ?? '').trim(),
  })),
)

function title(p: Project): string {
  return p.title ? getLocalizedValue(p.title) : ''
}
function meta(p: Project): string {
  return p.meta ? getLocalizedValue(p.meta) : ''
}
const allLabel = computed(() => (props.allLabel ? getLocalizedValue(props.allLabel) : 'All'))

// ── Filter state ─────────────────────────────────────────────────────────────
const activeFilter = ref<string>(ALL)

// Distinct categories in first-appearance order (stable chip order).
const categories = computed<string[]>(() => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of projects.value) {
    if (p.category && !seen.has(p.category)) {
      seen.add(p.category)
      out.push(p.category)
    }
  }
  return out
})

interface Chip { key: string; label: string; count: number }
const chips = computed<Chip[]>(() => {
  const total = projects.value.length
  const list: Chip[] = [{ key: ALL, label: allLabel.value, count: total }]
  for (const c of categories.value) {
    list.push({ key: c, label: c, count: projects.value.filter((p) => p.category === c).length })
  }
  return list
})

function matches(p: Project): boolean {
  return activeFilter.value === ALL || p.category === activeFilter.value
}

// ── Lightbox (opt-in) ────────────────────────────────────────────────────────
// Tiles without their own link adopt the theme-level Lightbox via data-* attrs
// (event delegation — see Lightbox.vue). The group id is per-instance so two
// galleries on one page never merge. Attrs are emitted ONLY on tiles that pass
// the active filter, so the Lightbox's querySelectorAll group browse is limited
// to the currently visible set (hidden tiles are display:none but still in DOM).
const lightboxGroup = `fg-${useId()}`
const lightboxActive = computed(() => (props.enableLightbox ?? false) && !isEditor.value)

function tileHasLightbox(p: Project): boolean {
  return lightboxActive.value && !!p.image && !p.link && matches(p)
}

function mediaAttrs(p: Project): Record<string, unknown> {
  if (p.link) return { href: p.link }
  if (tileHasLightbox(p)) {
    return {
      type: 'button',
      'aria-label': `View image full screen: ${title(p) || 'project'}`,
      'data-cursor-label': 'View',
      'data-lightbox': '',
      'data-lightbox-src': p.image,
      'data-lightbox-alt': title(p),
      'data-lightbox-caption': title(p),
      'data-lightbox-group': lightboxGroup,
    }
  }
  return {}
}

const visibleCount = computed(() => projects.value.filter(matches).length)
const liveMessage = computed(() => {
  const label = activeFilter.value === ALL ? allLabel.value : activeFilter.value
  return `Showing ${visibleCount.value} of ${projects.value.length} projects — ${label}`
})

// ── FLIP reflow ──────────────────────────────────────────────────────────────
// On filter change we let the surviving cards glide from their old slot to their
// new one (First-Last-Invert-Play) while entering cards fade + scale in. Leaving
// cards are removed from flow immediately (display:none) — the eye follows the
// gliding survivors, so the reflow reads as a smooth rearrange, not a jump.
const gridEl = ref<HTMLElement | null>(null)
const cardEls = ref<HTMLElement[]>([])

const DURATIONS: Record<Speed, number> = { slow: 720, normal: 480, fast: 300 }
const flipDuration = computed(() => DURATIONS[props.reflowSpeed || 'normal'])

function isVisibleEl(el: HTMLElement): boolean {
  // offsetParent is null when the element (or an ancestor) is display:none.
  return el.offsetParent !== null
}

async function onFilter(key: string) {
  if (key === activeFilter.value) return
  // In the editor preview, keep chips inert so a click selects the block instead
  // of mutating view-only state — mirrors the Lightbox / CursorLayer precedent.
  if (isEditor.value) return

  if (isReducedMotion.value || !gridEl.value) {
    activeFilter.value = key
    return
  }

  const cards = cardEls.value.filter(Boolean)

  // FIRST: record the current slot of every visible card.
  const firstRects = new Map<HTMLElement, DOMRect>()
  for (const el of cards) {
    if (isVisibleEl(el)) firstRects.set(el, el.getBoundingClientRect())
  }

  // Mutate the filter → Vue toggles `.is-hidden`, the grid re-lays-out.
  activeFilter.value = key
  await nextTick()

  const dur = flipDuration.value
  for (const el of cards) {
    if (!isVisibleEl(el)) continue
    const last = el.getBoundingClientRect()
    const first = firstRects.get(el)
    if (first) {
      // Surviving card: invert to its old position, then play to identity.
      const dx = first.left - last.left
      const dy = first.top - last.top
      if (dx || dy) {
        el.style.transition = 'none'
        el.style.transform = `translate(${dx}px, ${dy}px)`
        void el.getBoundingClientRect() // force the inverted frame to commit
        el.style.transition = `transform ${dur}ms cubic-bezier(0.22, 1, 0.36, 1)`
        el.style.transform = ''
        clearAfter(el, dur)
      }
    } else {
      // Entering card: fade + scale in from nothing.
      el.style.transition = 'none'
      el.style.opacity = '0'
      el.style.transform = 'scale(0.94)'
      void el.getBoundingClientRect()
      el.style.transition = `opacity ${dur}ms ease, transform ${dur}ms cubic-bezier(0.22, 1, 0.36, 1)`
      el.style.opacity = ''
      el.style.transform = ''
      clearAfter(el, dur)
    }
  }
}

// Strip the inline transition/transform once the animation has settled so the
// card returns to plain CSS control (hover, later reflows).
const timers = new WeakMap<HTMLElement, number>()
function clearAfter(el: HTMLElement, dur: number) {
  const prev = timers.get(el)
  if (prev) window.clearTimeout(prev)
  const id = window.setTimeout(() => {
    el.style.transition = ''
    el.style.transform = ''
    el.style.opacity = ''
    timers.delete(el)
  }, dur + 60)
  timers.set(el, id)
}

const aspectClass = computed(() => {
  const r = props.aspectRatio || '4:3'
  return r === 'auto' ? '' : `filterable-gallery__media--${r.replace(':', '-')}`
})

const measureStyle = computed<Record<string, string>>(() =>
  props.measureWidth ? { '--block-measure': `var(--measure-width-${props.measureWidth})` } : {},
)
</script>

<style lang="scss" scoped>
.filterable-gallery {
  max-width: var(--block-measure, none);
  margin-inline: var(--block-measure-align, 0);

  // ── Filter bar ───────────────────────────────────────────────────────────
  &__filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-bottom: 2.4rem;
  }

  &__chip {
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    // Meets the 44px minimum tap target (WCAG 2.5.5 / audit) on touch.
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

  // ── Grid ─────────────────────────────────────────────────────────────────
  &__grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 2.4rem 2rem;
    // Intrinsic responsive collapse — auto-fit folds to fewer columns down to 1
    // on mobile, no @media; density sets the minimum track width. min(…, 100%)
    // caps the track floor at the container width: a bare 26rem floor overflows
    // sub-356px viewports (Galaxy Fold 280px, legacy 320px).
    grid-template-columns: repeat(auto-fill, minmax(min(var(--card-min, 26rem), 100%), 1fr));
  }

  &--compact &__grid { --card-min: 20rem; }
  &--comfortable &__grid { --card-min: 26rem; }
  &--wide &__grid { --card-min: 34rem; }

  &__card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    will-change: transform, opacity;

    &.is-hidden { display: none; }
  }

  // ── Media ──────────────────────────────────────────────────────────────────
  &__media {
    position: relative;
    display: block;
    overflow: hidden;
    background: color-mix(in srgb, currentColor 6%, transparent);
    text-decoration: none;
    color: inherit;

    &--1-1 { aspect-ratio: 1 / 1; }
    &--4-3 { aspect-ratio: 4 / 3; }
    &--3-2 { aspect-ratio: 3 / 2; }
    &--16-9 { aspect-ratio: 16 / 9; }
    &--3-4 { aspect-ratio: 3 / 4; }
  }

  // When a tile is a lightbox trigger it renders as a <button>; strip native
  // button chrome so it is visually identical to the <div>/<a> media wrapper.
  button.filterable-gallery__media {
    appearance: none;
    border: 0;
    padding: 0;
    margin: 0;
    font: inherit;
    color: inherit;
    text-align: inherit;
    width: 100%;
    cursor: pointer;
  }

  &__zoom {
    position: absolute;
    top: 1rem;
    right: 1rem;
    display: grid;
    place-items: center;
    width: 3.2rem;
    height: 3.2rem;
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-surface, #000) 62%, transparent);
    backdrop-filter: blur(6px);
    color: var(--color-on-surface, #fff);
    opacity: 0;
    transform: scale(0.85);
    transition: opacity 0.3s ease, transform 0.3s ease;
    pointer-events: none;

    svg {
      width: 1.6rem;
      height: 1.6rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  }
  &__media:hover &__zoom,
  &__media:focus-visible &__zoom {
    opacity: 1;
    transform: scale(1);
  }

  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  }
  a.filterable-gallery__media:hover &__img,
  &__media:hover &__img { transform: scale(1.04); }

  &__badge {
    position: absolute;
    top: 1rem;
    left: 1rem;
    padding: 0.3rem 0.7rem;
    border-radius: 100px;
    background: color-mix(in srgb, var(--color-surface, #000) 70%, transparent);
    backdrop-filter: blur(6px);
    color: var(--color-on-surface, #fff);
    font-size: 1.1rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    line-height: 1;
  }

  // Overlay caption (hover reveal).
  &__overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 0.3rem;
    padding: 1.4rem;
    color: #fff;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.62), rgba(0, 0, 0, 0) 60%);
    opacity: 0;
    transition: opacity 0.35s ease;
  }
  &__media:hover &__overlay,
  &__media:focus-visible &__overlay { opacity: 1; }

  &__caption {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  &__title {
    font-family: var(--rt-role-heading2-family, var(--font-family-heading, Georgia, serif));
    font-size: var(--font-size-md, 1.8rem);
    font-weight: var(--rt-role-heading2-weight, 500);
    line-height: 1.2;
    letter-spacing: -0.01em;
  }

  &__meta {
    font-family: var(--rt-role-body-family, var(--font-family-body, inherit));
    font-size: var(--font-size-sm, 1.4rem);
    letter-spacing: 0.02em;
    opacity: 0.65;
  }

  // ── Masonry layout (opt-in) ─────────────────────────────────────────────────
  // Images flow into intrinsic CSS multi-columns at their NATURAL aspect ratio,
  // uncropped — the premium architecture-portfolio look. No JS layout math and no
  // @media: `columns` folds to a single column on mobile intrinsically, and the
  // density's --card-min still governs the minimum column width. Everything below
  // is scoped under the --layout-masonry ancestor, so the default grid mode stays
  // byte-identical.
  &--layout-masonry &__grid {
    display: block;
    // --card-min (set per density) becomes the ideal column width; the browser
    // packs as many columns as fit and folds to 1 as space shrinks. No 100% cap
    // needed here (unlike the grid track floor above): column-width rejects
    // percentages, and the multicol algorithm already clamps the used column
    // width to the available box, so a narrow container gets one full-width
    // column instead of overflowing.
    columns: var(--card-min, 26rem);
    column-gap: 2rem;
  }

  &--layout-masonry &__card {
    // Valid column item: never split a card across a column boundary, and add the
    // vertical rhythm as margin (column-gap only spaces columns horizontally, so
    // 2.4rem here mirrors the grid's row gap). The card keeps its base
    // `display:flex` (media + caption stay stacked with the 1rem gap) — a flex box
    // is a fine multi-column item, and crucially NOT setting `display` here lets the
    // base `&__card.is-hidden { display:none }` (0,2,0) still win over flex (0,1,0),
    // so the category filter keeps hiding non-matching tiles in masonry too.
    break-inside: avoid;
    -webkit-column-break-inside: avoid;
    width: 100%;
    margin-bottom: 2.4rem;
  }

  // Natural, uncropped media: let the box grow to the image's intrinsic height.
  // This descendant selector is two classes (0,2,0), which outranks the lone
  // aspect-ratio modifier class .filterable-gallery__media--4-3 (0,1,0), so the
  // natural ratio wins without !important even while an aspectRatio is selected.
  &--layout-masonry &__media { aspect-ratio: auto; }
  &--layout-masonry &__img { height: auto; }
}
</style>
