<template>
  <section
    class="stacked-cards"
    :class="[
      `stacked-cards--${cardHeight}`,
      `stacked-cards--peek-${peek}`,
      `stacked-cards--r-${borderRadius}`,
      `stacked-cards--shadow-${shadowDepth}`,
      `stacked-cards--media-${mediaLayout}`,
      `stacked-cards--side-${mediaSide}`,
      { 'is-reduced': isReducedMotion, 'is-editor': isEditor, 'is-depth': depthActive },
    ]"
    :style="measureStyle"
    :data-collapse="collapse"
    data-target="root"
  >
    <ol ref="stackEl" class="stacked-cards__stack" data-target="cards">
      <li
        v-for="(c, i) in cards"
        :key="i"
        class="stacked-cards__slot"
        :style="{ '--i': i }"
        data-target="card"
        :data-card="i"
      >
        <article class="stacked-cards__card" :class="{ 'has-image': showImage(c) }">
          <img
            v-if="showImage(c) && mediaLayout === 'background'"
            :src="c.image"
            :alt="title(c)"
            class="stacked-cards__bg"
            loading="lazy"
            decoding="async"
          />
          <span
            v-if="showImage(c) && mediaLayout === 'background'"
            class="stacked-cards__scrim"
            aria-hidden="true"
          />

          <!-- Header band: stays visible as the peeking strip when a later card
               stacks over this one, so the deck reads like labelled tabs. -->
          <header class="stacked-cards__head">
            <p v-if="eyebrow(c)" class="stacked-cards__eyebrow">{{ eyebrow(c) }}</p>
            <span class="stacked-cards__count" aria-hidden="true">{{ pad(i + 1) }} / {{ pad(cards.length) }}</span>
          </header>

          <div class="stacked-cards__content">
            <div class="stacked-cards__body">
              <h3 v-if="title(c)" class="stacked-cards__title">{{ title(c) }}</h3>
              <p v-if="body(c)" class="stacked-cards__text">{{ body(c) }}</p>
              <a
                v-if="c.link"
                :href="c.link"
                class="stacked-cards__cta"
                @click="onCtaClick"
              >
                {{ linkLabel(c) }}
                <span aria-hidden="true">→</span>
              </a>
            </div>

            <div
              v-if="showImage(c) && mediaLayout === 'side'"
              class="stacked-cards__media"
            >
              <img
                :src="c.image"
                :alt="title(c)"
                class="stacked-cards__img"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </article>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'
import { useViewport } from '~/shared/composables/useViewport'
import { isMobileViewport } from '~/shared/features/cms/composition/responsive'

type CardHeight = 'compact' | 'standard' | 'tall'
type Peek = 'tight' | 'standard' | 'roomy'
type MediaLayout = 'side' | 'background' | 'none'
type MediaSide = 'left' | 'right' | 'above' | 'below'
type Radius = 'none' | 'sm' | 'md' | 'lg'
type ShadowDepth = 'none' | 'subtle' | 'bold'
type Measure = 'content' | 'narrow' | 'standard' | 'wide' | 'full'

type LocalizedText = string | Record<string, string> | undefined

interface CardInput {
  eyebrow?: LocalizedText
  title?: LocalizedText
  body?: LocalizedText
  image?: string | { url: string }
  link?: string
  linkLabel?: LocalizedText
}

interface Card {
  eyebrow: LocalizedText
  title: LocalizedText
  body: LocalizedText
  image: string
  link: string
  linkLabel: LocalizedText
}

const props = defineProps<{
  cards?: CardInput[]
  cardHeight?: CardHeight
  peek?: Peek
  mediaLayout?: MediaLayout
  mediaSide?: MediaSide
  measureWidth?: Measure
  borderRadius?: Radius
  shadowDepth?: ShadowDepth
  depth?: 'off' | 'on'
}>()

const { getLocalizedValue } = useLocalized()
const { isReducedMotion } = useReducedMotion()
const renderMode = useRenderMode()
const isEditor = computed(() => renderMode.value === 'editor-preview')

const { innerWidth } = useViewport()
const collapse = computed(() => (isMobileViewport(innerWidth.value) ? 'mobile' : 'desktop'))

const cardHeight = computed<CardHeight>(() => props.cardHeight || 'standard')
const peek = computed<Peek>(() => props.peek || 'standard')
const mediaLayout = computed<MediaLayout>(() => props.mediaLayout || 'side')
const mediaSide = computed<MediaSide>(() => props.mediaSide || 'right')
const borderRadius = computed<Radius>(() => props.borderRadius || 'md')
const shadowDepth = computed<ShadowDepth>(() => props.shadowDepth || 'subtle')

function resolveImage(image: CardInput['image']): string {
  if (!image) return ''
  if (typeof image === 'string') return image
  return image.url || ''
}

const cards = computed<Card[]>(() =>
  (props.cards ?? []).map((c) => ({
    eyebrow: c.eyebrow,
    title: c.title,
    body: c.body,
    image: resolveImage(c.image),
    link: (c.link ?? '').trim(),
    linkLabel: c.linkLabel,
  })),
)

function loc(v: LocalizedText): string {
  return v ? getLocalizedValue(v) : ''
}
function eyebrow(c: Card): string {
  return loc(c.eyebrow)
}
function title(c: Card): string {
  return loc(c.title)
}
function body(c: Card): string {
  return loc(c.body)
}
function linkLabel(c: Card): string {
  return loc(c.linkLabel) || 'Read more'
}
function showImage(c: Card): boolean {
  return mediaLayout.value !== 'none' && !!c.image
}
function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function onCtaClick(e: MouseEvent) {
  // In the editor preview the CTA must not steal the click from block
  // selection — mirrors ExpandingPanels / FilterableGallery precedent.
  if (isEditor.value) e.preventDefault()
}

const measureStyle = computed<Record<string, string>>(() =>
  props.measureWidth ? { '--block-measure': `var(--measure-width-${props.measureWidth})` } : {},
)

// ── Optional scroll-driven depth recede (desktop + motion only) ──────────────
// As each card stacks over the one below, the buried card's `--sc-depth` (0..1)
// tracks how far the next card has slid up over it; CSS turns that into a scale
// + dim so the deck reads with physical depth. Gated behind `depthActive` so an
// off / mobile / editor / reduced-motion instance renders byte-identical.
const stackEl = ref<HTMLElement | null>(null)
const depthActive = computed(
  () => (props.depth ?? 'off') === 'on' && collapse.value === 'desktop' && !isEditor.value && !isReducedMotion.value,
)

let raf = 0
function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n
}
function measureDepth() {
  const stack = stackEl.value
  if (!stack) return
  const els = stack.querySelectorAll<HTMLElement>('.stacked-cards__card')
  const n = els.length
  for (let i = 0; i < n; i++) {
    const el = els[i]
    if (i === n - 1) {
      el.style.setProperty('--sc-depth', '0')
      continue
    }
    const rect = el.getBoundingClientRect()
    const next = els[i + 1].getBoundingClientRect()
    const h = rect.height || 1
    // coverage 0..1 = how much the next card has slid up over this one.
    const coverage = clamp01((rect.bottom - next.top) / h)
    el.style.setProperty('--sc-depth', coverage.toFixed(3))
  }
}
function onScroll() {
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    measureDepth()
  })
}
function attach() {
  if (typeof window === 'undefined') return
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  nextTick(measureDepth)
}
function resetDepth() {
  const stack = stackEl.value
  if (!stack) return
  stack.querySelectorAll<HTMLElement>('.stacked-cards__card').forEach((el) => el.style.removeProperty('--sc-depth'))
}
function detach() {
  if (typeof window === 'undefined') return
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}

onMounted(() => {
  if (depthActive.value) attach()
})
onBeforeUnmount(detach)

watch(depthActive, (on) => {
  detach()
  if (on) attach()
  else resetDepth()
})
watch(() => cards.value.length, () => {
  if (depthActive.value) nextTick(measureDepth)
})
</script>

<style lang="scss" scoped>
.stacked-cards {
  max-width: var(--block-measure, none);
  margin-inline: var(--block-measure-align, auto);

  // Header clearance so the first pinned card doesn't hide under a sticky nav.
  --sc-top: 6vh;

  // Header-band height = the strip that keeps peeking as the next card stacks
  // over this one. Tying the pin offset to this makes each covered card show
  // exactly its labelled header, like a fanned deck of tabs.
  --sc-peek: 3.6rem;
  &--peek-tight { --sc-peek: 3rem; }
  &--peek-standard { --sc-peek: 3.6rem; }
  &--peek-roomy { --sc-peek: 4.8rem; }

  // Pinned card height on desktop.
  --sc-card-h: 74vh;
  &--compact { --sc-card-h: 60vh; }
  &--standard { --sc-card-h: 74vh; }
  &--tall { --sc-card-h: 86vh; }

  // Corner radius.
  --sc-radius: 12px;
  &--r-none { --sc-radius: 0; }
  &--r-sm { --sc-radius: 6px; }
  &--r-md { --sc-radius: 12px; }
  &--r-lg { --sc-radius: 22px; }

  // Layered drop shadow.
  --sc-shadow: 0 18px 40px -20px rgba(0, 0, 0, 0.4);
  &--shadow-none { --sc-shadow: none; }
  &--shadow-subtle { --sc-shadow: 0 18px 40px -20px rgba(0, 0, 0, 0.4); }
  &--shadow-bold { --sc-shadow: 0 30px 60px -24px rgba(0, 0, 0, 0.55); }

  &__stack {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  &__slot {
    position: sticky;
    // Each card pins a little lower than the previous one, so the earlier
    // card's header strip keeps peeking above the one stacking over it.
    top: calc(var(--sc-top) + var(--i) * var(--sc-peek));
    // Natural height gives the scroll distance between successive pins.
    height: var(--sc-card-h);
  }

  &__card {
    --sc-depth: 0;
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    border-radius: var(--sc-radius);
    box-shadow: var(--sc-shadow);
    background: var(--color-surface, #f4f2ee);
    color: var(--color-text, #1a1a1a);
    isolation: isolate;
  }

  // ── Optional depth recede (JS sets --sc-depth 0..1 per card) ─────────────────
  // Gated entirely behind .is-depth, so an off instance is byte-identical.
  &.is-depth &__card {
    transform: scale(calc(1 - var(--sc-depth) * 0.055));
    transform-origin: center top;
    transition: transform 0.18s linear;
    will-change: transform;
  }
  &.is-depth &__card::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    background: #000;
    opacity: calc(var(--sc-depth) * 0.42);
    transition: opacity 0.18s linear;
    border-radius: inherit;
  }

  // ── Full-bleed background media ──────────────────────────────────────────────
  &__bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
  }
  &__scrim {
    position: absolute;
    inset: 0;
    z-index: 1;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.3) 45%, rgba(0, 0, 0, 0.12) 100%);
  }

  // ── Header band (the peeking strip) ──────────────────────────────────────────
  &__head {
    position: relative;
    z-index: 2;
    flex: 0 0 auto;
    min-height: var(--sc-peek);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.6rem clamp(1.4rem, 3vw, 2.6rem);
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }

  &__eyebrow {
    margin: 0;
    font-family: var(--rt-role-caption-family, var(--font-family-body, inherit));
    font-size: var(--font-size-sm, 1.3rem);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.82;
  }
  &__count {
    font-family: var(--rt-role-caption-family, var(--font-family-body, inherit));
    font-size: var(--font-size-xs, 1.1rem);
    letter-spacing: 0.1em;
    opacity: 0.45;
    font-variant-numeric: tabular-nums;
  }

  &--media-background &__card { color: #fff; }
  &--media-background &__head { border-bottom-color: rgba(255, 255, 255, 0.28); }

  // ── Content row (body + optional side media) ─────────────────────────────────
  &__content {
    position: relative;
    z-index: 2;
    flex: 1 1 auto;
    display: flex;
    min-height: 0;
  }
  &--media-background &__content { align-items: flex-end; }

  &__body {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.9rem;
    padding: clamp(2rem, 4vw, 4rem);
    flex: 1 1 52%;
    min-width: 0;
  }
  &--media-background &__body { flex-basis: 100%; }

  &__title {
    margin: 0;
    font-family: var(--rt-role-heading2-family, var(--font-family-heading, Georgia, serif));
    font-size: clamp(2rem, 3.4vw, 3.4rem);
    font-weight: var(--rt-role-heading2-weight, 500);
    line-height: 1.08;
    letter-spacing: -0.01em;
  }

  &__text {
    margin: 0;
    font-family: var(--rt-role-body-family, var(--font-family-body, inherit));
    font-size: var(--font-size-md, 1.6rem);
    line-height: 1.5;
    max-width: 46ch;
    opacity: 0.9;
  }

  &__cta {
    align-self: flex-start;
    margin-top: 0.6rem;
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    color: inherit;
    font-family: var(--rt-role-body-family, var(--font-family-body, inherit));
    font-size: var(--font-size-sm, 1.4rem);
    letter-spacing: 0.02em;
    text-decoration: none;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      left: 0;
      right: 1.4em;
      bottom: -3px;
      height: 1px;
      background: currentColor;
      transform: scaleX(0.32);
      transform-origin: left;
      transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    }
    &:hover::after,
    &:focus-visible::after { transform: scaleX(1); }
    &:focus-visible {
      outline: 2px solid var(--color-accent, currentColor);
      outline-offset: 4px;
    }
  }

  // ── Side media ─────────────────────────────────────────────────────────────
  &__media {
    flex: 1 1 48%;
    min-width: 0;
    position: relative;
  }

  // Which side the card image sits on. The copy is first in the DOM, so
  // "right" is the source order; the stacked sides turn the row into a column.
  &--media-side#{&}--side-left &__content { flex-direction: row-reverse; }
  &--media-side#{&}--side-above &__content { flex-direction: column-reverse; }
  &--media-side#{&}--side-below &__content { flex-direction: column; }
  &--media-side#{&}--side-above &__media,
  &--media-side#{&}--side-below &__media {
    flex-basis: auto;
    min-height: 40%;
  }
  &__img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  // ── Mobile: fold to a plain vertical list, no pinning ─────────────────────────
  // No @media — the collapse decision comes from useViewport() → [data-collapse].
  &[data-collapse='mobile'] &__slot {
    position: static;
    height: auto;
    margin-bottom: 1.2rem;
  }
  &[data-collapse='mobile'] &__card {
    min-height: 58vh;
  }
  &[data-collapse='mobile'] &__content {
    flex-direction: column;
  }
  &[data-collapse='mobile'] &__media {
    flex-basis: auto;
    min-height: 46vw;
    order: -1;
  }
  &[data-collapse='mobile'] &__body {
    flex: 0 0 auto;
  }

  // ── Editor preview: neutralise sticky so every card is visible while
  // authoring (the preview iframe is short and would otherwise show only the
  // last pinned card). Mirrors the render-mode guards used elsewhere. ──────────
  &.is-editor &__slot {
    position: static;
    height: auto;
    margin-bottom: 1.2rem;
  }
  &.is-editor &__card {
    min-height: 60vh;
  }
}
</style>
