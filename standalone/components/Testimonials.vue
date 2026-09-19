<template>
  <section
    class="splash-testimonials"
    :style="sectionStyles"
    @mouseenter="onPointerEnter"
    @mouseleave="onPointerLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <div class="splash-testimonials__container" :style="contentStyle">
      <h2 v-if="title && showTitle" data-target="heading" class="splash-testimonials__title" v-html="asHtml(localizedTitle)"></h2>

      <div
        ref="trackRef"
        class="splash-testimonials__grid"
        :class="[
          `splash-testimonials__grid--${variant}`,
          {
            'splash-testimonials__grid--marquee-static': marqueeStaticInEditor,
            'splash-testimonials__grid--marquee-pausable': variant === 'marquee' && pauseOnHover,
          },
        ]"
        :tabindex="isInteractiveTrack ? 0 : undefined"
        :role="isInteractiveTrack ? 'group' : undefined"
        :aria-roledescription="trackRoledescription"
        :aria-label="trackAriaLabel"
        @keydown="onTrackKeydown"
      >
        <!-- marquee: continuous auto-scrolling wall of quote cards -->
        <template v-if="variant === 'marquee'">
          <div
            v-for="(row, rowIdx) in marqueeRowData"
            :key="`mq-${rowIdx}`"
            class="splash-testimonials__marquee-row"
            :class="{ 'splash-testimonials__marquee-row--reverse': rowIdx % 2 === 1 }"
            :style="{ '--tm-marquee-duration': marqueeDurationVar }"
          >
            <div
              v-for="(cell, cellIdx) in row"
              :key="`${rowIdx}-${cellIdx}`"
              :data-target="cell.clone ? undefined : 'item'"
              :data-item-index="cell.clone ? undefined : cell.index"
              :aria-hidden="cell.clone ? 'true' : undefined"
              class="splash-testimonials__card"
              :class="cardSurfaceClass"
              :style="{ ...cardRadiusStyle, ...(cardColor ? { backgroundColor: cardColor } : {}) }"
            >
              <div v-if="showRating && cell.item.rating" class="splash-testimonials__rating" :aria-label="`${cell.item.rating} out of 5 stars`">
                <span
                  v-for="star in 5"
                  :key="star"
                  class="splash-testimonials__star"
                  :class="{ 'splash-testimonials__star--filled': star <= (cell.item.rating || 0) }"
                  aria-hidden="true"
                >★</span>
              </div>

              <blockquote class="splash-testimonials__quote prose" v-html="asHtml(getLocalizedValue(cell.item.quote))"></blockquote>

              <div class="splash-testimonials__author">
                <div
                  v-if="cell.item.avatar"
                  class="splash-testimonials__avatar"
                  :style="{ backgroundImage: `url(${cell.item.avatar})` }"
                  role="img"
                  :aria-label="asHtml(getLocalizedValue(cell.item.author))"
                ></div>
                <div v-else class="splash-testimonials__avatar splash-testimonials__avatar--placeholder" aria-hidden="true">
                  {{ getInitials(getLocalizedValue(cell.item.author)) }}
                </div>
                <div class="splash-testimonials__author-info">
                  <span class="splash-testimonials__author-name" v-html="asHtml(getLocalizedValue(cell.item.author))"></span>
                  <span v-if="cell.item.role" class="splash-testimonials__author-role" v-html="asHtml(getLocalizedValue(cell.item.role))"></span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- grid / carousel: render every item; parity path, unchanged markup -->
        <template v-else-if="variant !== 'spotlight'">
          <div
            v-for="(item, index) in items"
            :key="index"
            data-target="item"
            :data-item-index="index"
            class="splash-testimonials__card"
            :class="cardSurfaceClass"
            :style="{ ...cardRadiusStyle, ...(cardColor ? { backgroundColor: cardColor } : {}) }"
          >
            <div v-if="showRating && item.rating" class="splash-testimonials__rating" :aria-label="`${item.rating} out of 5 stars`">
              <span
                v-for="star in 5"
                :key="star"
                class="splash-testimonials__star"
                :class="{ 'splash-testimonials__star--filled': star <= (item.rating || 0) }"
                aria-hidden="true"
              >★</span>
            </div>

            <blockquote class="splash-testimonials__quote prose" v-html="asHtml(getLocalizedValue(item.quote))"></blockquote>

            <div class="splash-testimonials__author">
              <div
                v-if="item.avatar"
                class="splash-testimonials__avatar"
                :style="{ backgroundImage: `url(${item.avatar})` }"
                role="img"
                :aria-label="asHtml(getLocalizedValue(item.author))"
              ></div>
              <div v-else class="splash-testimonials__avatar splash-testimonials__avatar--placeholder" aria-hidden="true">
                {{ getInitials(getLocalizedValue(item.author)) }}
              </div>
              <div class="splash-testimonials__author-info">
                <span class="splash-testimonials__author-name" v-html="asHtml(getLocalizedValue(item.author))"></span>
                <span v-if="item.role" class="splash-testimonials__author-role" v-html="asHtml(getLocalizedValue(item.role))"></span>
              </div>
            </div>
          </div>
        </template>

        <!-- spotlight: one large editorial quote, crossfaded on activeIndex -->
        <Transition v-else name="splash-testimonials__fade" :css="!prefersReducedMotion">
          <div
            v-if="activeItem"
            :key="activeIndex"
            data-target="item"
            :data-item-index="activeIndex"
            class="splash-testimonials__card"
            :class="cardSurfaceClass"
            :style="cardRadiusStyle"
            @pointerdown="onSwipePointerDown"
            @pointerup="onSwipePointerUp"
            @pointercancel="onSwipePointerCancel"
          >
            <div v-if="showRating && activeItem.rating" class="splash-testimonials__rating" :aria-label="`${activeItem.rating} out of 5 stars`">
              <span
                v-for="star in 5"
                :key="star"
                class="splash-testimonials__star"
                :class="{ 'splash-testimonials__star--filled': star <= (activeItem.rating || 0) }"
                aria-hidden="true"
              >★</span>
            </div>

            <blockquote class="splash-testimonials__quote prose" v-html="asHtml(getLocalizedValue(activeItem.quote))"></blockquote>

            <div class="splash-testimonials__author">
              <div
                v-if="activeItem.avatar"
                class="splash-testimonials__avatar"
                :style="{ backgroundImage: `url(${activeItem.avatar})` }"
                role="img"
                :aria-label="asHtml(getLocalizedValue(activeItem.author))"
              ></div>
              <div v-else class="splash-testimonials__avatar splash-testimonials__avatar--placeholder" aria-hidden="true">
                {{ getInitials(getLocalizedValue(activeItem.author)) }}
              </div>
              <div class="splash-testimonials__author-info">
                <span class="splash-testimonials__author-name" v-html="asHtml(getLocalizedValue(activeItem.author))"></span>
                <span v-if="activeItem.role" class="splash-testimonials__author-role" v-html="asHtml(getLocalizedValue(activeItem.role))"></span>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <div
        v-if="(variant === 'carousel' || variant === 'spotlight') && showControls && itemCount > 1"
        class="splash-testimonials__nav"
      >
        <button
          type="button"
          class="splash-testimonials__arrow splash-testimonials__arrow--prev"
          :class="{ 'splash-testimonials__arrow--disabled': prevDisabled }"
          :disabled="prevDisabled"
          aria-label="Previous testimonial"
          @click="prev"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div class="splash-testimonials__dots">
          <button
            v-for="(item, index) in items"
            :key="index"
            type="button"
            class="splash-testimonials__dot"
            :class="{ 'splash-testimonials__dot--active': index === activeIndex }"
            :aria-label="`Go to testimonial ${index + 1}`"
            :aria-current="index === activeIndex ? 'true' : undefined"
            @click="goTo(index)"
          ></button>
        </div>

        <button
          type="button"
          class="splash-testimonials__arrow splash-testimonials__arrow--next"
          :class="{ 'splash-testimonials__arrow--disabled': nextDisabled }"
          :disabled="nextDisabled"
          aria-label="Next testimonial"
          @click="next"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BackgroundRole } from '~/shared/types/placement'
import { computed, ref, onMounted, onBeforeUnmount, watch, watchEffect } from 'vue'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { asHtml } from '~/shared/utils/asHtml'
import { useBlockSurface } from '~/shared/composables/useBlockSurface'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'

const { getLocalizedValue } = useLocalized()
const renderMode = useRenderMode()
const isEditor = computed(() => renderMode.value === 'editor-preview')
interface TestimonialItem {
  quote: string | Record<string, string>
  author: string | Record<string, string>
  role?: string | Record<string, string>
  avatar?: string
  rating?: number
}

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  blocks?: Array<Record<string, unknown>>
  title?: string | Record<string, string>
  showTitle?: boolean
  items?: TestimonialItem[]
  variant?: 'grid' | 'carousel' | 'spotlight' | 'marquee'
  marqueeRows?: 'single' | 'double'
  marqueeSpeed?: 'slow' | 'normal' | 'fast'
  pauseOnHover?: boolean
  showControls?: boolean
  autoplay?: boolean
  autoplayInterval?: number
  loop?: boolean
  background?: BackgroundRole
  cardColor?: string
  showRating?: boolean
  surfaceStyle?: string
  borderRadius?: string
  internalPadding?: string
  contentAlignH?: string
}>(), {
  variant: 'grid',
  marqueeRows: 'double',
  marqueeSpeed: 'normal',
  pauseOnHover: true,
  showControls: true,
  autoplay: false,
  autoplayInterval: 6000,
  loop: true,
  showRating: true,
  items: () => [],
  showTitle: true,
})

function getInitials(name: string): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const localizedTitle = computed(() => getLocalizedValue(props.title))

const { surfaceStyle } = useBlockSurface(props, { fallbackBackground: 'section' })

const sectionStyles = computed(() => {
  const styles: Record<string, string> = { ...surfaceStyle.value }
  return styles
})

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  if (props.contentAlignH && props.contentAlignH !== 'left') {
    const __alignMap: Record<string, string> = { center: 'center', right: 'flex-end' }
    const mapped = __alignMap[props.contentAlignH] ?? 'flex-start'
    style.justifyContent = mapped
    style.justifyItems = mapped
  }
  return style
})

const cardSurfaceClass = computed(() =>
  props.surfaceStyle && props.surfaceStyle !== 'none'
    ? `splash-testimonials__card--surface-${props.surfaceStyle}`
    : ''
)

const cardRadiusStyle = computed(() =>
  props.borderRadius && props.borderRadius !== 'none'
    ? { borderRadius: BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0' }
    : {}
)

/* ── Marquee wall ──────────────────────────────────────────────────
   Additive opt-in variant: a continuous auto-scrolling wall of quote
   cards. One or two rows (opposite directions). CSS-only animation via
   a duplicated card set + translateX(-50%) loop; static + readable
   fallback under prefers-reduced-motion and inside the editor. */

interface MarqueeCell {
  item: TestimonialItem
  index: number
  clone: boolean
}
type MarqueeRow = MarqueeCell[]

const MARQUEE_SPEED_DURATION: Record<'slow' | 'normal' | 'fast', string> = {
  slow: '60s',
  normal: '40s',
  fast: '26s',
}

const marqueeDurationVar = computed<string>(() =>
  MARQUEE_SPEED_DURATION[props.marqueeSpeed] ?? '40s'
)

const marqueeRowData = computed<MarqueeRow[]>(() => {
  const items = props.items ?? []
  if (items.length === 0) return []

  const rowCount = props.marqueeRows === 'single' ? 1 : 2
  const rows: MarqueeRow[] = []

  for (let r = 0; r < rowCount; r++) {
    const originals: MarqueeCell[] = []
    items.forEach((item, index) => {
      if (index % rowCount === r) {
        originals.push({ item, index, clone: false })
      }
    })
    if (originals.length === 0) continue
    // Duplicate the set exactly twice so translateX(-50%) is seamless.
    const clones: MarqueeCell[] = originals.map(cell => ({ ...cell, clone: true }))
    rows.push([...originals, ...clones])
  }

  return rows
})

const marqueeStaticInEditor = computed<boolean>(() =>
  props.variant === 'marquee' && isEditor.value
)

/* ── Carousel controls ─────────────────────────────────────────────
   All state below is inert for the 'grid' variant: the nav DOM is
   v-if-gated on variant === 'carousel', the observer/keyboard handlers
   early-return, and autoplay requires variant === 'carousel'. */

const trackRef = ref<HTMLElement | null>(null)
const activeIndex = ref(0)
const itemCount = computed(() => props.items?.length ?? 0)

// Currently spotlighted item (spotlight variant only); undefined when out of range.
const activeItem = computed(() => props.items?.[activeIndex.value])

// Carousel + spotlight are keyboard-navigable groups; grid is a plain layout.
const isInteractiveTrack = computed(() => props.variant === 'carousel' || props.variant === 'spotlight')
const trackRoledescription = computed(() =>
  props.variant === 'carousel' ? 'carousel'
    : props.variant === 'spotlight' ? 'slideshow'
    : undefined
)
const trackAriaLabel = computed(() =>
  props.variant === 'carousel' ? 'Testimonials carousel'
    : props.variant === 'spotlight' ? 'Testimonials spotlight'
    : undefined
)

// Runtime environment signals that gate motion + autoplay.
const prefersReducedMotion = ref(false)
const isDocVisible = ref(true)
const isHovered = ref(false)
const isFocusWithin = ref(false)

const scrollBehavior = computed<ScrollBehavior>(() =>
  prefersReducedMotion.value ? 'auto' : 'smooth'
)

const prevDisabled = computed(() => !props.loop && activeIndex.value <= 0)
const nextDisabled = computed(() => !props.loop && activeIndex.value >= itemCount.value - 1)

function resolveTargetIndex(index: number): number {
  const count = itemCount.value
  let target = index
  if (target < 0) target = props.loop ? count - 1 : 0
  else if (target > count - 1) target = props.loop ? 0 : count - 1
  return target
}

function goTo(index: number): void {
  const count = itemCount.value
  if (count === 0) return

  const target = resolveTargetIndex(index)

  // Spotlight advances purely by state — no DOM scroll (crossfade handles it).
  if (props.variant === 'spotlight') {
    activeIndex.value = target
    return
  }

  // Carousel: scroll the track to the target card (unchanged behavior).
  const track = trackRef.value
  if (!track) return

  const cards = track.querySelectorAll<HTMLElement>('[data-target="item"]')
  const card = cards[target]
  if (!card) return

  const delta = card.getBoundingClientRect().left - track.getBoundingClientRect().left
  track.scrollTo({ left: track.scrollLeft + delta, behavior: scrollBehavior.value })
  activeIndex.value = target
}

function next(): void {
  goTo(activeIndex.value + 1)
}

function prev(): void {
  goTo(activeIndex.value - 1)
}

function onTrackKeydown(event: KeyboardEvent): void {
  if (props.variant !== 'carousel' && props.variant !== 'spotlight') return
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    next()
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    prev()
  }
}

/* ── Spotlight swipe (spotlight variant ONLY) ──────────────────────
   The spotlight crossfades purely by state, so on touch there is no
   native scroll to advance it. Pointer Events give a unified mouse +
   touch gesture. All handlers early-return for every other variant so
   grid/carousel/marquee stay byte-identical. Single-pointer only:
   a second concurrent pointer aborts the in-flight gesture. */
const SWIPE_MIN_DISTANCE = 44
const SWIPE_H_RATIO = 1.4

const swipePointerId = ref<number | null>(null)
const swipeStartX = ref(0)
const swipeStartY = ref(0)

function resetSwipe(el?: Element | null): void {
  // Release capture so the pointer is never left hostage to the card.
  if (el && swipePointerId.value !== null) {
    try { (el as HTMLElement).releasePointerCapture?.(swipePointerId.value) } catch { /* already released */ }
  }
  swipePointerId.value = null
  swipeStartX.value = 0
  swipeStartY.value = 0
}

function onSwipePointerDown(event: PointerEvent): void {
  if (props.variant !== 'spotlight') return
  // Single-pointer only, but never stay locked out: a lingering id from a
  // prior gesture that lost its pointerup (e.g. mouse released off-card) is
  // stale — clear it and start fresh rather than blocking every future swipe.
  if (swipePointerId.value !== null) resetSwipe(event.currentTarget as Element)
  swipePointerId.value = event.pointerId
  swipeStartX.value = event.clientX
  swipeStartY.value = event.clientY
  // Capture guarantees pointerup/cancel fire on this element even off-card.
  try { (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId) } catch { /* unsupported */ }
}

function onSwipePointerUp(event: PointerEvent): void {
  if (props.variant !== 'spotlight') return
  if (swipePointerId.value !== event.pointerId) return

  const dx = event.clientX - swipeStartX.value
  const dy = event.clientY - swipeStartY.value
  resetSwipe(event.currentTarget as Element)

  // Horizontal intent only; never hijack a vertical scroll or a tap.
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return
  if (Math.abs(dx) <= Math.abs(dy) * SWIPE_H_RATIO) return

  if (dx < 0) next()
  else prev()
}

function onSwipePointerCancel(event: PointerEvent): void {
  if (props.variant !== 'spotlight') return
  if (swipePointerId.value !== event.pointerId) return
  resetSwipe(event.currentTarget as Element)
}

function onPointerEnter(): void { isHovered.value = true }
function onPointerLeave(): void { isHovered.value = false }
function onFocusIn(): void { isFocusWithin.value = true }
function onFocusOut(): void { isFocusWithin.value = false }

// ── Active-index tracking via IntersectionObserver on the cards ──
let observer: IntersectionObserver | null = null
const ratios = new Map<number, number>()

function teardownObserver(): void {
  observer?.disconnect()
  observer = null
  ratios.clear()
}

function setupObserver(): void {
  teardownObserver()
  const track = trackRef.value
  if (!track || props.variant !== 'carousel') return
  if (typeof IntersectionObserver === 'undefined') return

  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const attr = entry.target.getAttribute('data-item-index')
      if (attr === null) continue
      ratios.set(Number(attr), entry.intersectionRatio)
    }
    let bestIndex = activeIndex.value
    let bestRatio = -1
    for (const [idx, ratio] of ratios) {
      if (ratio > bestRatio) {
        bestRatio = ratio
        bestIndex = idx
      }
    }
    if (bestRatio > 0) activeIndex.value = bestIndex
  }, { root: track, threshold: [0.25, 0.5, 0.6, 0.75, 1] })

  track.querySelectorAll<HTMLElement>('[data-target="item"]').forEach((card) => {
    observer?.observe(card)
  })
}

// ── Autoplay: single interval, driven by one reactive predicate ──
const isAtEnd = computed(() => activeIndex.value >= itemCount.value - 1)
const shouldAutoplay = computed(() =>
  (props.variant === 'carousel' || props.variant === 'spotlight') &&
  props.autoplay &&
  !prefersReducedMotion.value &&
  isDocVisible.value &&
  !isHovered.value &&
  !isFocusWithin.value &&
  itemCount.value > 1 &&
  // With loop off, stop once the last card is reached.
  (props.loop || !isAtEnd.value)
)

watchEffect((onCleanup) => {
  if (!shouldAutoplay.value) return
  const interval = props.autoplayInterval ?? 6000
  const timer = setInterval(() => { next() }, interval)
  onCleanup(() => clearInterval(timer))
})

// Re-observe when the card set or variant changes; clamp a now-stale index.
watch([itemCount, () => props.variant], () => {
  if (activeIndex.value > itemCount.value - 1) {
    activeIndex.value = Math.max(0, itemCount.value - 1)
  }
  setupObserver()
}, { flush: 'post' })

// ── Environment listeners ──
let motionQuery: MediaQueryList | null = null

function onMotionChange(event: MediaQueryListEvent): void {
  prefersReducedMotion.value = event.matches
}

function onVisibilityChange(): void {
  isDocVisible.value = !document.hidden
}

onMounted(() => {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.value = motionQuery.matches
    motionQuery.addEventListener('change', onMotionChange)
  }
  if (typeof document !== 'undefined') {
    isDocVisible.value = !document.hidden
    document.addEventListener('visibilitychange', onVisibilityChange)
  }
  setupObserver()
})

onBeforeUnmount(() => {
  teardownObserver()
  motionQuery?.removeEventListener('change', onMotionChange)
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
})

</script>

<style lang="scss" scoped>
.splash-testimonials {
  padding: var(--spacing-2xl) var(--spacing-md);

  @media (max-width: $bp-md) {
    padding: var(--spacing-xl) var(--spacing-md);
  }

  &__container {
    max-width: 120rem;
    margin: 0 auto;
  }

  &__title {
    font-family: var(--rt-slot-heading-family, var(--rt-role-heading2-family, inherit));
    font-size: var(--rt-slot-heading-size, var(--rt-role-heading2-size, var(--font-size-3xl)));
    font-weight: var(--rt-slot-heading-weight, var(--rt-role-heading2-weight, var(--font-weight-bold)));
    line-height: var(--rt-slot-heading-line-height, var(--rt-role-heading2-line-height, inherit));
    letter-spacing: var(--rt-slot-heading-letter-spacing, var(--rt-role-heading2-letter-spacing, normal));
    text-transform: var(--rt-slot-heading-text-transform, var(--rt-role-heading2-text-transform, none));
    color: var(--rt-slot-heading-color, var(--rt-role-heading2-color, inherit));
    text-align: center;
    margin: 0 0 var(--spacing-2xl);

    @media (max-width: $bp-md) {
      font-size: var(--rt-slot-heading-size, var(--rt-role-heading2-size, var(--font-size-2xl)));
      margin-block-end: var(--spacing-xl);
    }
  }

  &__grid {
    &--grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--spacing-xl);

      @media (max-width: $bp-lg) {
        grid-template-columns: repeat(2, 1fr);
      }

      @media (max-width: $bp-md) {
        grid-template-columns: 1fr;
      }
    }

    &--carousel {
      display: flex;
      gap: var(--spacing-xl);
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      padding-block-end: var(--spacing-md);

      .splash-testimonials__card {
        min-width: 35rem;
        scroll-snap-align: start;

        @media (max-width: $bp-sm) {
          min-width: 28rem;
        }
      }

      &:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 4px;
      }
    }

    &--spotlight {
      position: relative;
      display: block;
      max-width: 72rem;
      margin-inline: auto;
      text-align: center;

      &:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 4px;
      }

      // Editorial single-column treatment: no card chrome, centered, scaled up.
      .splash-testimonials__card {
        background: transparent;
        align-items: center;
        text-align: center;
        gap: var(--spacing-lg);
        // Capture horizontal swipe intent for slide nav; keep vertical page scroll.
        touch-action: pan-y;

        &:hover {
          box-shadow: none;
        }
      }

      .splash-testimonials__quote {
        font-size: var(--rt-slot-quote-size, var(--rt-role-pullquote-size, var(--font-size-2xl)));
        line-height: var(--rt-slot-quote-line-height, var(--rt-role-pullquote-line-height, var(--line-height-relaxed)));
        flex: none;
      }

      .splash-testimonials__rating {
        justify-content: center;
      }

      .splash-testimonials__author {
        justify-content: center;
        margin-block-start: 0;
      }

      @media (max-width: $bp-md) {
        max-width: 100%;

        .splash-testimonials__quote {
          font-size: var(--rt-slot-quote-size, var(--rt-role-pullquote-size, var(--font-size-xl)));
        }
      }
    }

    &--marquee {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xl);
      overflow: hidden;

      // pausable: freeze rows on hover/focus
      &.splash-testimonials__grid--marquee-pausable:hover,
      &.splash-testimonials__grid--marquee-pausable:focus-within {
        .splash-testimonials__marquee-row {
          animation-play-state: paused;
        }
      }

      // static (editor): no animation, drop clones, allow manual horizontal scroll
      &.splash-testimonials__grid--marquee-static {
        overflow-x: auto;

        .splash-testimonials__marquee-row {
          animation: none;
        }

        .splash-testimonials__marquee-row .splash-testimonials__card[aria-hidden='true'] {
          display: none;
        }
      }
    }
  }

  &__marquee-row {
    display: flex;
    flex-wrap: nowrap;
    width: max-content;
    animation: splash-testimonials-marquee var(--tm-marquee-duration, 40s) linear infinite;
    will-change: transform;

    // Per-card right margin is the gap (NOT flex `gap`), so the duplicated
    // set width is an exact multiple and translateX(-50%) is perfectly seamless.
    .splash-testimonials__card {
      flex: 0 0 auto;
      min-width: 34rem;
      margin-inline-end: var(--spacing-xl);

      @media (max-width: $bp-sm) {
        min-width: 27rem;
      }
    }

    &--reverse {
      animation-direction: reverse;
    }
  }

  @keyframes splash-testimonials-marquee {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }

  // reduced motion: freeze + drop clones + manual scroll (covers real users without JS)
  @media (prefers-reduced-motion: reduce) {
    .splash-testimonials__grid--marquee {
      overflow-x: auto;
    }

    .splash-testimonials__marquee-row {
      animation: none;
    }

    .splash-testimonials__marquee-row .splash-testimonials__card[aria-hidden='true'] {
      display: none;
    }
  }

  // Spotlight crossfade: entering + leaving quote overlap on opacity.
  &__fade-enter-active,
  &__fade-leave-active {
    transition: opacity 350ms ease;
  }

  &__fade-enter-from,
  &__fade-leave-to {
    opacity: 0;
  }

  &__fade-leave-active {
    position: absolute;
    inset: 0;
    width: 100%;
  }

  &__nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-lg);
    margin-block-start: var(--spacing-lg);
  }

  &__arrow {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 4.4rem;
    height: 4.4rem;
    padding: 0;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-full);
    background: var(--color-background-lighter);
    color: var(--section-text, var(--color-text));
    cursor: pointer;
    transition: box-shadow var(--transition-base), opacity var(--transition-base);

    svg {
      width: 2rem;
      height: 2rem;
    }

    &:hover {
      box-shadow: var(--shadow-md);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    &--disabled,
    &:disabled {
      opacity: 0.35;
      cursor: default;
      box-shadow: none;
    }

    @media (max-width: $bp-sm) {
      width: 4rem;
      height: 4rem;

      svg {
        width: 1.8rem;
        height: 1.8rem;
      }
    }
  }

  &__dots {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
  }

  &__dot {
    width: 1rem;
    height: 1rem;
    padding: 0;
    border: none;
    border-radius: var(--border-radius-full);
    background: var(--border-color);
    cursor: pointer;
    transition: background var(--transition-base), transform var(--transition-base);

    &:hover {
      background: var(--section-text, var(--color-text-lighter));
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    &--active {
      background: var(--color-primary);
      transform: scale(1.35);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .splash-testimonials__arrow,
    .splash-testimonials__dot {
      transition: none;
    }

    .splash-testimonials__fade-enter-active,
    .splash-testimonials__fade-leave-active {
      transition: none;
    }
  }

  &__card {
    padding: var(--spacing-xl);
    border-radius: var(--border-radius-lg);
    background: var(--color-background-lighter);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    transition: box-shadow var(--transition-base);

    &:hover {
      box-shadow: var(--shadow-md);
    }

    &--surface-subtle {
      background: var(--section-surface, rgba(255,255,255,0.04));
    }

    &--surface-filled {
      background: var(--section-accent, rgba(255,255,255,0.1));
    }
  }

  &__rating {
    display: flex;
    gap: var(--spacing-xs);
  }

  &__star {
    font-size: var(--font-size-lg);
    color: var(--border-color);

    &--filled {
      color: var(--color-star-rating);
    }
  }

  &__quote {
    font-family: var(--rt-slot-quote-family, var(--rt-role-pullquote-family, inherit));
    font-size: var(--rt-slot-quote-size, var(--rt-role-pullquote-size, var(--font-size-base)));
    font-weight: var(--rt-slot-quote-weight, var(--rt-role-pullquote-weight, inherit));
    line-height: var(--rt-slot-quote-line-height, var(--rt-role-pullquote-line-height, var(--line-height-relaxed)));
    letter-spacing: var(--rt-slot-quote-letter-spacing, var(--rt-role-pullquote-letter-spacing, normal));
    text-transform: var(--rt-slot-quote-text-transform, var(--rt-role-pullquote-text-transform, none));
    color: var(--rt-slot-quote-color, var(--rt-role-pullquote-color, var(--section-text, var(--color-text-light))));
    margin: 0;
    font-style: italic;
    flex: 1;

    &::before {
      content: '\201C';
      font-size: var(--font-size-xl);
      color: var(--color-primary);
      font-weight: var(--font-weight-bold);
    }
  }

  &__author {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-block-start: auto;
  }

  &__avatar {
    width: 4.8rem;
    height: 4.8rem;
    border-radius: var(--border-radius-full);
    background-size: cover;
    background-position: center;
    flex-shrink: 0;

    &--placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--color-primary);
      color: var(--color-background);
      font-weight: var(--font-weight-semibold);
      font-size: var(--font-size-base);
    }
  }

  &__author-info {
    display: flex;
    flex-direction: column;
  }

  &__author-name {
    font-family: var(--rt-slot-author-family, var(--rt-role-label-family, inherit));
    font-size: var(--rt-slot-author-size, var(--rt-role-label-size, var(--font-size-base)));
    font-weight: var(--rt-slot-author-weight, var(--rt-role-label-weight, var(--font-weight-semibold)));
    line-height: var(--rt-slot-author-line-height, var(--rt-role-label-line-height, inherit));
    letter-spacing: var(--rt-slot-author-letter-spacing, var(--rt-role-label-letter-spacing, normal));
    text-transform: var(--rt-slot-author-text-transform, var(--rt-role-label-text-transform, none));
    color: var(--rt-slot-author-color, var(--rt-role-label-color, var(--section-text, var(--color-text))));
  }

  &__author-role {
    font-family: var(--rt-slot-role-family, var(--rt-role-caption-family, inherit));
    font-size: var(--rt-slot-role-size, var(--rt-role-caption-size, var(--font-size-sm)));
    font-weight: var(--rt-slot-role-weight, var(--rt-role-caption-weight, inherit));
    line-height: var(--rt-slot-role-line-height, var(--rt-role-caption-line-height, inherit));
    letter-spacing: var(--rt-slot-role-letter-spacing, var(--rt-role-caption-letter-spacing, normal));
    text-transform: var(--rt-slot-role-text-transform, var(--rt-role-caption-text-transform, none));
    color: var(--rt-slot-role-color, var(--rt-role-caption-color, var(--section-text, var(--color-text-lighter))));
  }
}
</style>
