<template>
  <section
    class="before-after-reveal"
    :class="rootClasses"
    :style="rootStyles"
    data-target="root"
  >
    <div
      ref="containerRef"
      class="before-after-reveal__container"
      :class="containerClasses"
      :style="contentStyle"
      @pointerdown="onSurfaceDown"
      @pointermove="onSurfaceMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="onPointerLeave"
    >
      <!-- Before layer (full, underneath) -->
      <div class="before-after-reveal__layer before-after-reveal__layer--before" data-target="before">
        <img
          v-if="resolvedBeforeImage"
          :src="resolvedBeforeImage"
          :alt="beforeAlt"
          class="before-after-reveal__image"
          draggable="false"
        />
        <div
          v-if="localizedBeforeLabel"
          class="before-after-reveal__label before-after-reveal__label--before"
          data-target="beforeLabel"
          v-html="asHtml(localizedBeforeLabel)"
        ></div>
      </div>

      <!-- After layer (clipped) -->
      <div
        class="before-after-reveal__layer before-after-reveal__layer--after"
        :style="afterClipStyle"
        data-target="after"
      >
        <img
          v-if="resolvedAfterImage"
          :src="resolvedAfterImage"
          :alt="afterAlt"
          class="before-after-reveal__image"
          draggable="false"
        />
        <div
          v-if="localizedAfterLabel"
          class="before-after-reveal__label before-after-reveal__label--after"
          data-target="afterLabel"
          v-html="asHtml(localizedAfterLabel)"
        ></div>
      </div>

      <!-- Divider line -->
      <div class="before-after-reveal__divider" :style="dividerStyle">
        <div
          class="before-after-reveal__handle"
          :class="handleClass"
          tabindex="0"
          role="slider"
          :aria-valuenow="Math.round(position)"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-orientation="isHorizontal ? 'horizontal' : 'vertical'"
          :aria-valuetext="positionValueText"
          :aria-label="isHorizontal ? 'Horizontal reveal position' : 'Vertical reveal position'"
          data-target="handle"
          @keydown="onKeyDown"
        >
          <template v-if="handleStyle === 'arrows'">
            <span class="before-after-reveal__arrow" aria-hidden="true">&#9664;</span>
            <span class="before-after-reveal__arrow" aria-hidden="true">&#9654;</span>
          </template>
        </div>
      </div>
    </div>

    <!-- Phase stepper: only in multi-stage mode; one pill per adjacent transition. -->
    <div
      v-if="phased"
      class="before-after-reveal__stepper"
      role="group"
      aria-label="Reveal phases"
    >
      <button
        v-for="(pair, i) in stepPairs"
        :key="i"
        type="button"
        class="before-after-reveal__step"
        :class="{ 'is-active': clampedPair === i }"
        :aria-current="clampedPair === i ? 'true' : undefined"
        @click="selectPair(i)"
      >{{ pair.from }} &#8594; {{ pair.to }}</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'

const { getLocalizedValue } = useLocalized()
type Axis = 'horizontal' | 'vertical'
type HandleStyle = 'line' | 'circle' | 'arrows'
type AspectRatio = '16:9' | '4:3' | '1:1' | 'auto'
type Interaction = 'drag' | 'hover' | 'scroll'
type Stage = { image?: string | { url: string }; label?: string | Record<string, string> }

const props = defineProps<{
  beforeImage?: string | { url: string }
  afterImage?: string | { url: string }
  axis?: Axis
  initialPosition?: number
  handleStyle?: HandleStyle
  interaction?: Interaction
  revealHint?: boolean
  beforeLabel?: string | Record<string, string>
  afterLabel?: string | Record<string, string>
  stages?: Stage[]
  aspectRatio?: AspectRatio
  borderRadius?: string
  internalPadding?: string
  contentAlignH?: string
}>()

// Multi-phase mode (opt-in): 2+ stages turn the two-image reveal into a stepper
// where each adjacent pair (i → i+1) is one before/after transition. With fewer
// than two stages nothing changes — the block renders exactly as the two-image
// default, so existing instances are byte-identical.
const activePair = ref(0)
const phased = computed(() => (props.stages?.length ?? 0) >= 2)

// Which transition (before=stages[clampedPair], after=stages[clampedPair+1]) is
// showing. Clamped so a shrinking stages list can never index out of range.
const clampedPair = computed(() => {
  const n = props.stages?.length ?? 0
  if (n < 2) return 0
  return Math.min(Math.max(activePair.value, 0), n - 2)
})

const localizedBeforeLabel = computed(() =>
  phased.value ? getLocalizedValue(props.stages?.[clampedPair.value]?.label) : getLocalizedValue(props.beforeLabel)
)
const localizedAfterLabel = computed(() =>
  phased.value ? getLocalizedValue(props.stages?.[clampedPair.value + 1]?.label) : getLocalizedValue(props.afterLabel)
)

// Plain-text alt from the (rich) label markup — a11y fallback for the paired images.
function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}
const beforeAlt = computed(() => {
  const l = localizedBeforeLabel.value
  return (l && stripTags(l)) || 'Before'
})
const afterAlt = computed(() => {
  const l = localizedAfterLabel.value
  return (l && stripTags(l)) || 'After'
})

// Live, plain-text announcement for the slider — reveal % + the 'after' side name.
const positionValueText = computed(() => {
  const l = localizedAfterLabel.value
  const afterName = (l && stripTags(l)) || 'After'
  return `${Math.round(position.value)}% — ${afterName}`
})

function resolveImage(image: string | { url: string } | undefined): string {
  if (!image) return ''
  if (typeof image === 'string') return image
  return image.url || ''
}

const resolvedBeforeImage = computed(() =>
  phased.value ? resolveImage(props.stages?.[clampedPair.value]?.image) : resolveImage(props.beforeImage)
)
const resolvedAfterImage = computed(() =>
  phased.value ? resolveImage(props.stages?.[clampedPair.value + 1]?.image) : resolveImage(props.afterImage)
)

// Plain-text label for a stage's stepper pill; falls back to a 1-based ordinal.
function stageLabelText(i: number): string {
  const raw = getLocalizedValue(props.stages?.[i]?.label)
  const text = raw ? stripTags(raw) : ''
  return text || `Stage ${i + 1}`
}

// One pill per adjacent transition (N stages → N-1 pills).
const stepPairs = computed<Array<{ from: string; to: string }>>(() => {
  const list = props.stages ?? []
  const pairs: Array<{ from: string; to: string }> = []
  for (let i = 0; i < list.length - 1; i++) {
    pairs.push({ from: stageLabelText(i), to: stageLabelText(i + 1) })
  }
  return pairs
})

function selectPair(i: number) {
  activePair.value = i
}

const isHorizontal = computed(() => (props.axis || 'horizontal') === 'horizontal')
const handleStyle = computed((): HandleStyle => props.handleStyle || 'line')
const aspectRatio = computed((): AspectRatio => props.aspectRatio || '16:9')
const interaction = computed((): Interaction => props.interaction || 'drag')

const clampPercent = (val: number): number => Math.min(100, Math.max(0, val))

const position = ref(clampPercent(props.initialPosition ?? 50))
const containerRef = ref<HTMLElement | null>(null)
const hinting = ref(false)

watch(() => props.initialPosition, (val) => { position.value = clampPercent(val ?? 50) })

// Each phase transition starts from the resting split. Scroll mode re-scrubs on
// the next scroll frame (unless a keyboard user has taken manual control), so
// this reset never clobbers the scroll-override contract.
watch([activePair, phased], () => { position.value = clampPercent(props.initialPosition ?? 50) })

const rootClasses = computed(() => ({
  'before-after-reveal--horizontal': isHorizontal.value,
  'before-after-reveal--vertical': !isHorizontal.value,
}))

const rootStyles = computed(() => ({}))

const containerClasses = computed(() => [
  aspectRatioClass.value,
  `before-after-reveal__container--${interaction.value}`,
  { 'before-after-reveal__container--hinting': hinting.value },
])

const aspectRatioClass = computed(() => {
  if (aspectRatio.value === 'auto') return ''
  return `before-after-reveal__container--${aspectRatio.value.replace(':', '-')}`
})

const handleClass = computed(() => `before-after-reveal__handle--${handleStyle.value}`)

const afterClipStyle = computed(() => {
  const p = position.value
  if (isHorizontal.value) {
    return { clipPath: `inset(0 0 0 ${p}%)` }
  }
  return { clipPath: `inset(${p}% 0 0 0)` }
})

const dividerStyle = computed(() => {
  if (isHorizontal.value) {
    return { left: `${position.value}%`, top: '0', bottom: '0' }
  }
  return { top: `${position.value}%`, left: '0', right: '0' }
})

const dragging = ref(false)

// Map a pointer event to a reveal percentage along the active axis.
function positionFromEvent(e: PointerEvent): number {
  if (!containerRef.value) return position.value
  const rect = containerRef.value.getBoundingClientRect()
  const pct = isHorizontal.value
    ? ((e.clientX - rect.left) / rect.width) * 100
    : ((e.clientY - rect.top) / rect.height) * 100
  return clampPercent(pct)
}

// Press anywhere on the surface (not just the 2px handle) starts a drag —
// the whole image is the control. setPointerCapture keeps tracking outside bounds.
function onSurfaceDown(e: PointerEvent) {
  if (interaction.value === 'scroll') return
  hinting.value = false
  dragging.value = true
  position.value = positionFromEvent(e)
  try { containerRef.value?.setPointerCapture(e.pointerId) } catch { /* capture optional */ }
}

function onSurfaceMove(e: PointerEvent) {
  if (dragging.value) {
    position.value = positionFromEvent(e)
    return
  }
  // Hover mode: a mouse hovering the surface drives the reveal without pressing.
  // Touch has no hover, so it's naturally excluded (falls back to drag).
  if (interaction.value === 'hover' && e.pointerType === 'mouse') {
    position.value = positionFromEvent(e)
  }
}

function onPointerUp(e: PointerEvent) {
  if (!dragging.value) return
  dragging.value = false
  try { containerRef.value?.releasePointerCapture(e.pointerId) } catch { /* noop */ }
}

function onPointerLeave() {
  // In hover mode, glide back to the resting position when the cursor leaves.
  if (interaction.value === 'hover' && !dragging.value) {
    position.value = clampPercent(props.initialPosition ?? 50)
  }
}

// Scroll-scrubbed reveal: map the block's travel through the viewport to the
// reveal position. Opt-in via interaction:'scroll'. Honors prefers-reduced-motion
// and the data-motion-suppressed contract (freezes at initialPosition), stays
// touch-safe (drives off scroll, never captures the pointer), and yields to a
// keyboard user who takes manual control of the split.
let scrollRaf = 0
let scrollBound = false
const scrollOverridden = ref(false)

function motionAllowed(): boolean {
  const el = containerRef.value
  const root = el?.closest('[data-target="root"]') as HTMLElement | null
  if (root?.dataset.motionSuppressed === 'true') return false
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  return true
}

// 0 when the block's top edge first enters from the bottom of the viewport,
// 1 when its bottom edge has scrolled past the top — a full-travel progress.
function scrollProgress(): number {
  const el = containerRef.value
  if (!el || typeof window === 'undefined') return 0
  const rect = el.getBoundingClientRect()
  const vh = window.innerHeight || document.documentElement.clientHeight
  const total = vh + rect.height
  if (total <= 0) return 0
  return clampPercent(((vh - rect.top) / total) * 100) / 100
}

function applyScrollPosition() {
  scrollRaf = 0
  // Defensive: a rAF queued just before teardown must not overwrite the split.
  if (interaction.value !== 'scroll' || scrollOverridden.value || dragging.value) return
  // Scroll down → progressively reveal the 'after' side (position 100 → 0).
  position.value = clampPercent(100 - scrollProgress() * 100)
}

function onScroll() {
  if (scrollRaf) return
  scrollRaf = requestAnimationFrame(applyScrollPosition)
}

// Bind/unbind the scroll-scrub listeners. Idempotent so the interaction-prop
// watcher can call them freely as the author toggles modes in the live preview.
function setupScroll() {
  if (scrollBound) return
  if (!motionAllowed()) {
    // Reduced motion / suppressed: present a static split, no scrubbing.
    position.value = clampPercent(props.initialPosition ?? 50)
    return
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  scrollBound = true
  applyScrollPosition()
}

function teardownScroll() {
  if (scrollBound) {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
    scrollBound = false
  }
  if (scrollRaf) { cancelAnimationFrame(scrollRaf); scrollRaf = 0 }
}

// The admin preview patches settings on a live-mounted block (postMessage, no
// remount), so react to interaction changes instead of binding once on mount.
watch(() => interaction.value, (mode) => {
  if (mode === 'scroll') {
    scrollOverridden.value = false
    setupScroll()
  } else {
    teardownScroll()
  }
})

// One-time "this is draggable" nudge when the block scrolls into view.
// Honors prefers-reduced-motion and the data-motion-suppressed state contract.
let hintTimers: ReturnType<typeof setTimeout>[] = []
let hintObserver: IntersectionObserver | null = null
function runRevealHint() {
  const el = containerRef.value
  if (!el) return
  const root = el.closest('[data-target="root"]') as HTMLElement | null
  if (root?.dataset.motionSuppressed === 'true') return
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const base = clampPercent(props.initialPosition ?? 50)
  const near = clampPercent(base + 16)
  const far = clampPercent(base - 16)
  hinting.value = true
  const steps: Array<[number, number]> = [[0, near], [450, far], [900, base]]
  steps.forEach(([delay, pos]) => {
    hintTimers.push(setTimeout(() => { if (!dragging.value) position.value = pos }, delay))
  })
  hintTimers.push(setTimeout(() => { hinting.value = false }, 1400))
}

onMounted(() => {
  if (interaction.value === 'scroll') {
    setupScroll()
    return
  }
  if (props.revealHint === false) return
  const el = containerRef.value
  if (!el || typeof IntersectionObserver === 'undefined') return
  const io = new IntersectionObserver((entries, obs) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        runRevealHint()
        obs.disconnect()
        break
      }
    }
  }, { threshold: 0.4 })
  io.observe(el)
  hintObserver = io
})

function onKeyDown(e: KeyboardEvent) {
  const fine = 2
  const coarse = 10
  // Shift promotes the axis arrows to a coarse step.
  const step = e.shiftKey ? coarse : fine
  let next: number | null = null

  // Absolute + coarse conveniences shared by both axes.
  switch (e.key) {
    case 'Home':
      next = 0
      break
    case 'End':
      next = 100
      break
    case 'PageUp':
      next = position.value + coarse
      break
    case 'PageDown':
      next = position.value - coarse
      break
  }

  // Axis-aware fine/coarse arrows (vertical: Up decreases, Down increases).
  if (next === null) {
    if (isHorizontal.value) {
      if (e.key === 'ArrowLeft') next = position.value - step
      else if (e.key === 'ArrowRight') next = position.value + step
    } else {
      if (e.key === 'ArrowUp') next = position.value - step
      else if (e.key === 'ArrowDown') next = position.value + step
    }
  }

  if (next === null) return
  position.value = clampPercent(next)
  e.preventDefault()
  if (interaction.value === 'scroll') scrollOverridden.value = true
}

onBeforeUnmount(() => {
  dragging.value = false
  hintTimers.forEach(clearTimeout)
  hintTimers = []
  hintObserver?.disconnect()
  hintObserver = null
  teardownScroll()
})

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.borderRadius) {
    style.borderRadius = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? ''
    style.overflow = 'hidden'
  }
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

</script>

<style lang="scss" scoped>
.before-after-reveal {
  padding: var(--spacing-3xl) var(--spacing-xl);

  &__container {
    position: relative;
    max-width: var(--container-max-width, 1200px);
    margin: 0 auto;
    overflow: hidden;
    user-select: none;

    &--16-9 {
      aspect-ratio: 16 / 9;
    }

    &--4-3 {
      aspect-ratio: 4 / 3;
    }

    &--1-1 {
      aspect-ratio: 1 / 1;
    }

    // The whole surface is the control now (press/hover anywhere), so the
    // cursor advertises the reveal axis across the entire image, not just the handle.
    .before-after-reveal--horizontal & {
      cursor: ew-resize;
    }

    .before-after-reveal--vertical & {
      cursor: ns-resize;
    }

    // Scroll mode drives off page scroll, not pointer drag — no drag cursor.
    &--scroll {
      .before-after-reveal--horizontal &,
      .before-after-reveal--vertical & {
        cursor: default;
      }
    }

    // Scroll-in "reveal" nudge: let the split glide while hinting, but keep
    // live drag/hover instant (no transition) so tracking never lags the pointer.
    &--hinting {
      .before-after-reveal__layer--after,
      .before-after-reveal__divider {
        transition: clip-path 0.45s ease, left 0.45s ease, top 0.45s ease;
      }
    }
  }

  &__layer {
    position: absolute;
    inset: 0;

    &--before {
      z-index: 1;
    }

    &--after {
      z-index: 2;
    }
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &__label {
    position: absolute;
    padding: 0.25rem 0.75rem;
    background: rgba(0, 0, 0, 0.55);
    border-radius: 4px;
    pointer-events: none;

    &--before {
      bottom: 1rem;
      left: 1rem;
      font-family: var(--rt-slot-beforeLabel-family, var(--rt-role-caption-family, inherit));
      font-size: var(--rt-slot-beforeLabel-size, var(--rt-role-caption-size, var(--font-size-sm, 13px)));
      font-weight: var(--rt-slot-beforeLabel-weight, var(--rt-role-caption-weight, 600));
      line-height: var(--rt-slot-beforeLabel-line-height, var(--rt-role-caption-line-height, normal));
      letter-spacing: var(--rt-slot-beforeLabel-letter-spacing, var(--rt-role-caption-letter-spacing, normal));
      text-transform: var(--rt-slot-beforeLabel-text-transform, var(--rt-role-caption-text-transform, none));
      color: var(--rt-slot-beforeLabel-color, var(--rt-role-caption-color, #fff));
    }

    &--after {
      bottom: 1rem;
      right: 1rem;
      font-family: var(--rt-slot-afterLabel-family, var(--rt-role-caption-family, inherit));
      font-size: var(--rt-slot-afterLabel-size, var(--rt-role-caption-size, var(--font-size-sm, 13px)));
      font-weight: var(--rt-slot-afterLabel-weight, var(--rt-role-caption-weight, 600));
      line-height: var(--rt-slot-afterLabel-line-height, var(--rt-role-caption-line-height, normal));
      letter-spacing: var(--rt-slot-afterLabel-letter-spacing, var(--rt-role-caption-letter-spacing, normal));
      text-transform: var(--rt-slot-afterLabel-text-transform, var(--rt-role-caption-text-transform, none));
      color: var(--rt-slot-afterLabel-color, var(--rt-role-caption-color, #fff));
    }
  }

  &__divider {
    position: absolute;
    z-index: 3;

    .before-after-reveal--horizontal & {
      width: 2px;
      background: #fff;
      cursor: ew-resize;
    }

    .before-after-reveal--vertical & {
      height: 2px;
      background: #fff;
      cursor: ns-resize;
    }
  }

  &__handle {
    position: absolute;
    z-index: 4;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
    cursor: inherit;

    &:focus-visible {
      outline: 2px solid var(--color-primary, #108A00);
      outline-offset: 2px;
    }

    &--line {
      .before-after-reveal--horizontal & {
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 4px;
        height: 40px;
        border-radius: 2px;
      }

      .before-after-reveal--vertical & {
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 40px;
        height: 4px;
        border-radius: 2px;
      }
    }

    &--circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;

      .before-after-reveal--horizontal & {
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }

      .before-after-reveal--vertical & {
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
      }
    }

    &--arrows {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      gap: 2px;

      .before-after-reveal--horizontal & {
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        flex-direction: row;
      }

      .before-after-reveal--vertical & {
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        flex-direction: column;
      }
    }
  }

  &__arrow {
    font-size: 10px;
    line-height: 1;
    color: #333;

    .before-after-reveal--vertical & {
      transform: rotate(90deg);
    }
  }

  &__stepper {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--spacing-xs, 0.5rem);
    column-gap: var(--spacing-sm, 0.75rem);
    max-width: var(--container-max-width, 1200px);
    margin: var(--spacing-md, 1rem) auto 0;
  }

  &__step {
    min-height: 44px;
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.2));
    border-radius: 999px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-family: var(--rt-role-caption-family, inherit);
    font-size: var(--rt-role-caption-size, var(--font-size-sm, 13px));
    font-weight: var(--rt-role-caption-weight, 600);
    letter-spacing: var(--rt-role-caption-letter-spacing, normal);
    text-transform: var(--rt-role-caption-text-transform, none);
    line-height: 1.2;
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;

    &:focus-visible {
      outline: 2px solid var(--color-primary, #108A00);
      outline-offset: 2px;
    }

    &.is-active {
      background: var(--color-primary, #108A00);
      border-color: var(--color-primary, #108A00);
      color: var(--color-on-primary, #fff);
    }
  }
}
</style>
