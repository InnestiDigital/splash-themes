<template>
  <section class="static-carousel" :style="carouselStyles">
    <div class="static-carousel__container" :style="contentStyle">
      <!-- Header -->
      <div v-if="title || subtitle" class="static-carousel__header">
        <h2 v-if="title" data-target="heading" class="static-carousel__title" v-html="asHtml(getLocalizedValue(title))"></h2>
        <p v-if="subtitle" class="static-carousel__subtitle" v-html="asHtml(getLocalizedValue(subtitle))"></p>
      </div>

      <!-- Carousel Content -->
      <div
        class="static-carousel__wrapper"
        :tabindex="isKeyboardNav ? 0 : undefined"
        :role="isKeyboardNav ? 'group' : undefined"
        :aria-roledescription="isKeyboardNav ? 'carousel' : undefined"
        :aria-label="isKeyboardNav ? carouselLabel : undefined"
        @mouseenter="pauseAutoScroll"
        @mouseleave="resumeAutoScroll"
        @keydown="onWrapperKeydown"
      >
        <div
          ref="carouselTrack"
          class="static-carousel__track"
          :class="{
            'static-carousel__track--dragging': isDragging,
            'static-carousel__track--interactive': isDraggable,
          }"
          :style="{ transform: `translateX(calc(-${currentSlideIndex * 100}% + ${dragOffset}px))` }"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerCancel"
        >
          <div
            v-for="(item, index) in items"
            :key="index"
            data-target="item"
            :data-item-index="index"
            class="static-carousel__slide"
          >
            <article class="static-carousel__card">
              <img
                v-if="item.icon"
                :src="item.icon"
                alt=""
                class="static-carousel__icon"
                aria-hidden="true"
              />
              <h3 class="static-carousel__card-heading" v-html="asHtml(getLocalizedValue(item.heading))"></h3>
              <div class="static-carousel__card-description prose" v-html="asHtml(getLocalizedValue(item.description))"></div>
            </article>
          </div>
        </div>

        <!-- Navigation Arrows -->
        <button
          class="static-carousel__nav-button static-carousel__nav-button--prev"
          aria-label="Previous slide"
          @click="previousSlide"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          class="static-carousel__nav-button static-carousel__nav-button--next"
          aria-label="Next slide"
          @click="nextSlide"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <!-- Navigation Dots -->
      <div v-if="showDots" class="static-carousel__dots" role="tablist" aria-label="Slide navigation">
        <button
          v-for="(_, index) in items"
          :key="index"
          class="static-carousel__dot"
          :class="{ 'static-carousel__dot--active': index === currentSlideIndex }"
          :aria-label="`Go to slide ${index + 1}`"
          :aria-selected="index === currentSlideIndex"
          role="tab"
          @click="goToSlide(index)"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch, getCurrentInstance, nextTick } from 'vue'
import { ANIMATION_TARGETS_CHANGED } from '~/shared/features/cms/animation/constants'
import type { BackgroundRole } from '~/shared/types/placement'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP, resolveBackgroundRole } from '~/shared/features/cms/placement/placementTokenMaps'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'

const { getLocalizedValue } = useLocalized()
const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  blocks?: Array<Record<string, any>>
  title?: string | Record<string, string>
  subtitle?: string | Record<string, string>
  autoScroll?: boolean
  scrollInterval?: number
  showDots?: boolean
  background?: BackgroundRole
  surfaceStyle?: string
  borderRadius?: string
  internalPadding?: string
  contentAlignH?: string
}>(), {
  autoScroll: true,
  scrollInterval: 5,
  showDots: true,
  surfaceStyle: 'none',
  borderRadius: 'none',
  internalPadding: 'md',
  contentAlignH: 'left',
})

const currentSlideIndex = ref(0)
const isAutoScrollPaused = ref(false)
const autoScrollTimer = ref<ReturnType<typeof setInterval> | null>(null)
const carouselTrack = ref<HTMLElement | null>(null)

// Interaction layer (swipe + keyboard + reduced-motion)
const dragOffset = ref(0)
const isDragging = ref(false)
const isReducedMotion = ref(false)

// Non-reactive pointer gesture bookkeeping.
const pointerState = {
  active: false,
  startX: 0,
  startY: 0,
  pointerId: null as number | null,
  axisLocked: '' as '' | 'x' | 'y',
}

// Pointer drag is a public, multi-item concern only; the editor preview stays inert.
const isDraggable = computed(() => !props.isPreview && items.value.length > 1)
// Keyboard nav + carousel aria only make sense with more than one slide.
const isKeyboardNav = computed(() => items.value.length > 1)

const carouselLabel = computed(() => {
  const raw = props.title ? getLocalizedValue(props.title) : ''
  const text = typeof raw === 'string' ? raw.replace(/<[^>]*>/g, '').trim() : ''
  return text || 'Carousel'
})

const instance = getCurrentInstance()

function dispatchTargetsChanged() {
  const el = instance?.proxy?.$el as HTMLElement | undefined
  if (!el || !props.blockId) return
  el.dispatchEvent(new CustomEvent(ANIMATION_TARGETS_CHANGED, {
    bubbles: true,
    detail: { blockId: props.blockId },
  }))
}

const items = computed(() =>
  (props.blocks || []).map((raw: Record<string, any>) => {
    const settings = (raw && typeof raw === 'object' && 'settings' in raw && raw.settings)
      ? (raw.settings as Record<string, any>)
      : raw
    return settings || {}
  })
)

const carouselStyles = computed(() => {
  const styles: Record<string, string> = {}
  // The carousel paints through a custom property, not `backgroundColor`, so it
  // needs the resolved CSS string rather than `useBlockSurface`'s style object.
  // Every role writes the variable — including `transparent`, which resolves to
  // the keyword, exactly as the legacy transparent arm did.
  styles['--carousel-bg'] = resolveBackgroundRole(props.background ?? 'section')
  return styles
})

function goToSlide(index: number) {
  if (items.value.length === 0) return
  currentSlideIndex.value = Math.min(Math.max(index, 0), items.value.length - 1)
  nextTick(dispatchTargetsChanged)
}

function nextSlide() {
  if (items.value.length === 0) return
  currentSlideIndex.value = (currentSlideIndex.value + 1) % items.value.length
  nextTick(dispatchTargetsChanged)
}

function previousSlide() {
  if (items.value.length === 0) return
  currentSlideIndex.value = (currentSlideIndex.value - 1 + items.value.length) % items.value.length
  nextTick(dispatchTargetsChanged)
}

// --- Pointer / touch swipe -------------------------------------------------

function releaseCapture(el: EventTarget | null) {
  if (
    el instanceof HTMLElement &&
    pointerState.pointerId !== null &&
    el.hasPointerCapture(pointerState.pointerId)
  ) {
    el.releasePointerCapture(pointerState.pointerId)
  }
}

function resetPointer(el: EventTarget | null) {
  dragOffset.value = 0
  isDragging.value = false
  pointerState.active = false
  pointerState.axisLocked = ''
  releaseCapture(el)
  pointerState.pointerId = null
  resumeAutoScroll()
}

function onPointerDown(e: PointerEvent) {
  if (!isDraggable.value) return
  // Let nav arrows / dots keep their own click semantics.
  if (e.target instanceof Element && e.target.closest('button')) return
  pointerState.active = true
  pointerState.startX = e.clientX
  pointerState.startY = e.clientY
  pointerState.pointerId = e.pointerId
  pointerState.axisLocked = ''
  if (e.currentTarget instanceof HTMLElement) {
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  pauseAutoScroll()
}

function onPointerMove(e: PointerEvent) {
  if (!pointerState.active) return
  const dx = e.clientX - pointerState.startX
  const dy = e.clientY - pointerState.startY
  if (pointerState.axisLocked === '') {
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) {
      pointerState.axisLocked = 'x'
      isDragging.value = true
    } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) {
      // Vertical intent: abandon so the page scrolls normally.
      resetPointer(e.currentTarget)
      return
    } else {
      return
    }
  }
  if (pointerState.axisLocked === 'x') {
    e.preventDefault()
    const atFirst = currentSlideIndex.value === 0
    const atLast = currentSlideIndex.value === items.value.length - 1
    // Rubber-band resistance at the ends.
    dragOffset.value = (atFirst && dx > 0) || (atLast && dx < 0) ? dx * 0.35 : dx
  }
}

function finalizePointer(e: PointerEvent, commit: boolean) {
  if (!pointerState.active) {
    resetPointer(e.currentTarget)
    return
  }
  if (commit && isDragging.value) {
    const dx = e.clientX - pointerState.startX
    const width = carouselTrack.value?.clientWidth ?? 0
    const threshold = Math.max(60, width * 0.15)
    if (dx <= -threshold) {
      nextSlide()
    } else if (dx >= threshold) {
      previousSlide()
    }
    // else: below threshold → snap back (reset only).
  }
  resetPointer(e.currentTarget)
}

function onPointerUp(e: PointerEvent) {
  finalizePointer(e, true)
}

function onPointerCancel(e: PointerEvent) {
  finalizePointer(e, false)
}

// --- Keyboard navigation ---------------------------------------------------

function onWrapperKeydown(e: KeyboardEvent) {
  if (items.value.length <= 1) return
  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault()
      previousSlide()
      break
    case 'ArrowRight':
      e.preventDefault()
      nextSlide()
      break
    case 'Home':
      e.preventDefault()
      goToSlide(0)
      break
    case 'End':
      e.preventDefault()
      goToSlide(items.value.length - 1)
      break
  }
}

// Clamp the active index when the slide set shrinks (e.g. blocks removed in
// the editor) so the track never scrolls to a non-existent, blank slide.
watch(() => items.value.length, (len) => {
  if (currentSlideIndex.value > len - 1) {
    currentSlideIndex.value = Math.max(len - 1, 0)
  }
})

function startAutoScroll() {
  // Reduced-motion users keep arrows/dots/swipe/keyboard — only the automatic advance is suppressed.
  if (isReducedMotion.value) return
  if (props.autoScroll && props.scrollInterval) {
    autoScrollTimer.value = setInterval(() => {
      if (!isAutoScrollPaused.value) {
        nextSlide()
      }
    }, props.scrollInterval * 1000)
  }
}

function stopAutoScroll() {
  if (autoScrollTimer.value) {
    clearInterval(autoScrollTimer.value)
    autoScrollTimer.value = null
  }
}

function pauseAutoScroll() {
  isAutoScrollPaused.value = true
}

function resumeAutoScroll() {
  isAutoScrollPaused.value = false
}

let reducedMotionMq: MediaQueryList | null = null

function onReducedMotionChange(e: MediaQueryListEvent) {
  isReducedMotion.value = e.matches
  if (e.matches) {
    stopAutoScroll()
  } else if (props.autoScroll) {
    startAutoScroll()
  }
}

onMounted(() => {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    reducedMotionMq = window.matchMedia('(prefers-reduced-motion: reduce)')
    isReducedMotion.value = reducedMotionMq.matches
    reducedMotionMq.addEventListener('change', onReducedMotionChange)
  }
  startAutoScroll()
})

onBeforeUnmount(() => {
  stopAutoScroll()
  if (reducedMotionMq) {
    reducedMotionMq.removeEventListener('change', onReducedMotionChange)
    reducedMotionMq = null
  }
})

watch(() => props.autoScroll, (newVal) => {
  if (newVal) {
    startAutoScroll()
  } else {
    stopAutoScroll()
  }
})

watch(() => props.scrollInterval, () => {
  stopAutoScroll()
  startAutoScroll()
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
  if (props.surfaceStyle === 'subtle') {
    style.background = 'var(--section-surface)'
  } else if (props.surfaceStyle === 'filled') {
    style.background = 'var(--section-accent)'
  }
  if (props.borderRadius && props.borderRadius !== 'none') {
    style['--card-border-radius'] = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0'
  }
  return style
})

</script>

<style lang="scss" scoped>
.static-carousel {
  --carousel-bg: var(--color-gray-100, #f5f5f7);
  --carousel-text: var(--section-text, var(--color-text, #1d1d1f));

  width: 100%;
  background-color: var(--carousel-bg);
  color: var(--carousel-text);
  padding: var(--spacing-lg) 0;

  &__container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 var(--spacing-md);
  }

  &__header {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);
    text-align: center;
  }

  &__title {
    margin: 0;
    font-family: var(--rt-role-heading2-family, inherit);
    font-size: var(--rt-role-heading2-size, var(--font-size-2xl));
    font-weight: var(--rt-role-heading2-weight, var(--font-weight-bold));
    line-height: var(--rt-role-heading2-line-height, inherit);
    letter-spacing: var(--rt-role-heading2-letter-spacing, normal);
    text-transform: var(--rt-role-heading2-text-transform, none);
    font-variation-settings: normal;
    font-optical-sizing: auto;
    font-stretch: normal;
    font-style: normal;
    color: var(--rt-role-heading2-color, inherit);
  }

  &__subtitle {
    margin: 0;
    font-family: var(--rt-role-lead-family, inherit);
    font-size: var(--rt-role-lead-size, var(--font-size-base));
    font-weight: var(--rt-role-lead-weight, inherit);
    line-height: var(--rt-role-lead-line-height, inherit);
    letter-spacing: var(--rt-role-lead-letter-spacing, normal);
    text-transform: var(--rt-role-lead-text-transform, none);
    font-variation-settings: normal;
    font-optical-sizing: auto;
    font-stretch: normal;
    font-style: normal;
    color: var(--rt-role-lead-color, inherit);
    opacity: 0.75;
  }

  &__wrapper {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    overflow: hidden;
    margin-bottom: var(--spacing-lg);

    &:focus-visible {
      outline: 0.2rem solid var(--color-accent, currentColor);
      outline-offset: 0.2rem;
    }
  }

  &__track {
    flex: 1;
    display: flex;
    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    width: 100%;

    &--interactive {
      cursor: grab;
      // Vertical page scroll stays with the browser; horizontal gestures are
      // ours. Scoped to the interactive (multi-item, non-preview) state so a
      // single-item / preview track keeps its default touch-action (pinch-zoom,
      // etc.) — preserves byte-identical parity at rest.
      touch-action: pan-y;
    }

    &--dragging {
      transition: none;
      cursor: grabbing;
      user-select: none;
    }
  }

  &__slide {
    flex-shrink: 0;
    width: 100%;
  }

  &__card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-lg) var(--spacing-md);
    text-align: center;
    border-radius: var(--card-border-radius, 0);
  }

  &__icon {
    width: 8rem;
    height: 8rem;
    object-fit: contain;
  }

  &__card-heading {
    margin: 0;
    font-family: var(--rt-role-heading3-family, inherit);
    font-size: var(--rt-role-heading3-size, var(--font-size-lg));
    font-weight: var(--rt-role-heading3-weight, var(--font-weight-bold));
    line-height: var(--rt-role-heading3-line-height, inherit);
    letter-spacing: var(--rt-role-heading3-letter-spacing, normal);
    text-transform: var(--rt-role-heading3-text-transform, none);
    font-variation-settings: normal;
    font-optical-sizing: auto;
    font-stretch: normal;
    font-style: normal;
    color: var(--rt-role-heading3-color, inherit);
  }

  &__card-description {
    margin: 0;
    font-family: var(--rt-role-body-family, inherit);
    font-size: var(--rt-role-body-size, var(--font-size-sm));
    font-weight: var(--rt-role-body-weight, inherit);
    line-height: var(--rt-role-body-line-height, var(--line-height-relaxed));
    letter-spacing: var(--rt-role-body-letter-spacing, normal);
    text-transform: var(--rt-role-body-text-transform, none);
    font-variation-settings: normal;
    font-optical-sizing: auto;
    font-stretch: normal;
    font-style: normal;
    color: var(--rt-role-body-color, inherit);
    opacity: 0.8;
  }

  &__nav-button {
    flex-shrink: 0;
    background-color: rgba(0, 0, 0, 0.1);
    border: none;
    border-radius: 50%;
    width: 4rem;
    height: 4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: inherit;
    transition: background-color var(--transition-base);

    svg {
      width: 2rem;
      height: 2rem;
    }

    &:hover {
      background-color: rgba(0, 0, 0, 0.2);
    }

    &:focus-visible {
      outline: 0.2rem solid currentColor;
      outline-offset: 0.2rem;
    }

    &--prev {
      order: -1;
    }

    &--next {
      order: 1;
    }
  }

  &__dots {
    display: flex;
    justify-content: center;
    gap: var(--spacing-sm);
  }

  &__dot {
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.2);
    border: none;
    cursor: pointer;
    transition: background-color var(--transition-base);

    &:hover {
      background-color: rgba(0, 0, 0, 0.4);
    }

    &--active {
      background-color: currentColor;
    }

    &:focus-visible {
      outline: 0.2rem solid currentColor;
      outline-offset: 0.2rem;
    }
  }

  @media (max-width: $bp-md) {
    padding: var(--spacing-md) 0;

    &__container {
      padding: 0 var(--spacing-md);
    }

    &__header {
      margin-bottom: var(--spacing-md);
    }

    &__title {
      font-size: var(--rt-role-heading2-size, var(--font-size-xl));
    }

    &__wrapper {
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-md);
    }

    &__nav-button {
      width: 3.2rem;
      height: 3.2rem;

      svg {
        width: 1.6rem;
        height: 1.6rem;
      }
    }

    &__card {
      padding: var(--spacing-md);
    }

    &__icon {
      width: 6rem;
      height: 6rem;
    }

    &__card-heading {
      font-size: var(--rt-role-heading3-size, var(--font-size-base));
    }

    &__card-description {
      font-size: var(--rt-role-body-size, var(--font-size-xs));
    }
  }
}
</style>
