<template>
  <section
    class="horizontal-scroll"
    :class="sectionClasses"
    :style="{ ...rootStyles, ...contentStyle }"
    data-target="root"
  >
    <a
      :href="`#${instanceId}`"
      class="horizontal-scroll__skip-link"
      @click.prevent="skipToEnd"
    >
      Skip horizontal scroll section
    </a>

    <div
      ref="trackRef"
      class="horizontal-scroll__track"
      :class="trackClasses"
      :style="trackStyles"
      data-target="track"
      tabindex="0"
      @keydown="handleKeydown"
      @scroll="handleScroll"
    >
      <div
        v-for="(item, index) in items"
        :key="item.id || index"
        class="horizontal-scroll__item"
        :class="itemClasses"
        data-target="items"
        :data-target-index="index"
        :data-motion-suppressed="prefersReducedMotion ? 'true' : undefined"
      >
        <AnimatedBlock
          v-if="resolveChildComponent(item.type)"
          :block-id="String(item.id ?? `${item.type}-${index}`)"
          :block-type="item.type"
          :targets-schema="getChildTargetsSchema(item.type)"
          :motion-hints="getChildMotionHints(item.type)"
        >
          <component
            :is="resolveChildComponent(item.type)"
            v-bind="{ ...(item.settings || {}), blockId: item.id, blockType: item.type }"
          />
        </AnimatedBlock>
        <div v-else class="horizontal-scroll__item-placeholder">
          Unknown block type: {{ item.type }}
        </div>
      </div>
    </div>

    <div
      v-if="showProgress"
      class="horizontal-scroll__progress"
    >
      <div
        class="horizontal-scroll__progress-bar"
        :style="{ width: progressPercent + '%' }"
      />
    </div>

    <span :id="instanceId" ref="endRef" tabindex="-1" />
  </section>
</template>

<script setup lang="ts">
import type { BackgroundRole } from '~/shared/types/placement'
import { computed, ref, provide, watch, onMounted, onUnmounted, useId } from 'vue'
import { NESTED_MOTION_HINTS_KEY } from '~/shared/features/cms/animation/constants'
import { useBlockSurface } from '~/shared/composables/useBlockSurface'
import { useClientConfig } from '~/shared/composables/useClientConfig'
import { getBlockRegistry } from '~/shared/features/cms/blockRegistry'
import { SPACING_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { getRuntimeBlockSchemas } from '~/shared/features/cms/blockSchemasRuntime'
import AnimatedBlock from '~/shared/features/cms/animation/AnimatedBlock.vue'

type Height = 'viewport' | 'large' | 'medium'
type Gap = 'none' | 'small' | 'medium' | 'large'

type NestedBlock = {
  id?: string
  type: string
  settings?: Record<string, any>
}

const props = withDefaults(defineProps<{
  items?: NestedBlock[]
  height?: Height
  showProgress?: boolean
  snapToItem?: boolean
  scrollSpeed?: number
  gap?: Gap
  pointerDrag?: boolean
  background?: BackgroundRole
  internalPadding?: string
  contentAlignH?: string
}>(), {
  items: () => [],
  height: 'viewport',
  showProgress: true,
  snapToItem: true,
  scrollSpeed: 1,
  gap: 'medium',
  pointerDrag: false,
})

const { themeName } = useClientConfig()
const childRegistry = computed(() => getBlockRegistry(themeName.value))
function resolveChildComponent(type: string) {
  return childRegistry.value[type]?.component || null
}

// Returns the targets schema for a child block type (from settings.json).
// Used by AnimatedBlock to resolve DOM targets within each child.
function getChildTargetsSchema(type: string): Record<string, { selector?: string; multiple?: boolean }> {
  try {
    const schemas = getRuntimeBlockSchemas(themeName.value)
    return schemas[type]?.targets ?? {}
  } catch {
    return {}
  }
}

// Returns the motionHints for a child block type (from settings.json).
// Parent provide(NESTED_MOTION_HINTS_KEY) will be merged on top of these by AnimatedBlock.
function getChildMotionHints(type: string): Record<string, any> | undefined {
  try {
    const schemas = getRuntimeBlockSchemas(themeName.value)
    return schemas[type]?.motionHints ?? undefined
  } catch {
    return undefined
  }
}

const trackRef = ref<HTMLElement | null>(null)
const endRef = ref<HTMLElement | null>(null)

// Provide nested motion hints to all AnimatedBlock descendants.
// - intersectionRoot: the horizontal track element, used as IO root so off-screen items
//   are observed relative to the visible track viewport rather than the document viewport.
// - disabledTriggerTypes: ['scroll'] — vertical-axis scroll scenes are meaningless
//   inside a horizontal overflow container; engine skips them and emits a warning.
// Note: 'intersection' is intentionally NOT in disabledTriggerTypes — it is fixed
// at runtime by passing intersectionRoot to the IO constructor.
provide(
  NESTED_MOTION_HINTS_KEY,
  computed(() => ({
    intersectionRoot: trackRef.value ?? undefined,
    disabledTriggerTypes: ['scroll'] as string[],
  })),
)
const instanceId = `horizontal-scroll-end-${useId()}`
const progressPercent = ref(0)
const prefersReducedMotion = ref(false)

// Desktop grab & wheel navigation (opt-in via props.pointerDrag).
// Only becomes active on a real mouse (fine pointer) and never under reduced motion.
const finePointer = ref(false)
const isDragging = ref(false)

function detectReducedMotion() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
}

function detectFinePointer() {
  finePointer.value =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: fine)').matches
}

// Single source of truth: whether the pointer-drag / wheel behavior is currently live.
// When false, no class is added and no listeners are attached (byte-identical to before).
const pointerDragActive = computed(
  () => props.pointerDrag === true && finePointer.value && !prefersReducedMotion.value,
)

const items = computed(() => props.items ?? [])

const gapMap: Record<Gap, string> = {
  none: '0',
  small: '0.5rem',
  medium: '1rem',
  large: '2rem',
}

const heightMap: Record<Height, string> = {
  viewport: '100vh',
  large: '75vh',
  medium: '50vh',
}

const sectionClasses = computed(() => {
  const classes: string[] = []
  classes.push(`horizontal-scroll--height-${props.height}`)
  classes.push(`horizontal-scroll--gap-${props.gap}`)
  if (prefersReducedMotion.value) {
    classes.push('horizontal-scroll--reduced-motion')
  }
  return classes
})

const { surfaceStyle } = useBlockSurface(props, { fallbackBackground: 'transparent' })

const rootStyles = computed(() => {
  const styles: Record<string, string> = { ...surfaceStyle.value }
  return styles
})

const trackClasses = computed(() => {
  const classes: string[] = []
  if (props.snapToItem && !prefersReducedMotion.value) {
    classes.push('horizontal-scroll__track--snap')
  }
  if (pointerDragActive.value) {
    classes.push('horizontal-scroll__track--pointer-drag')
    if (isDragging.value) {
      classes.push('horizontal-scroll__track--grabbing')
    }
  }
  return classes
})

const trackStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (!prefersReducedMotion.value) {
    styles.height = heightMap[props.height as Height] || '100vh'
    styles.gap = gapMap[props.gap as Gap] || '1rem'
  }
  return styles
})

const itemClasses = computed(() => {
  const classes: string[] = []
  if (props.snapToItem && !prefersReducedMotion.value) {
    classes.push('horizontal-scroll__item--snap')
  }
  return classes
})

function handleScroll() {
  const track = trackRef.value
  if (!track) return
  const scrollLeft = track.scrollLeft
  const maxScroll = track.scrollWidth - track.clientWidth
  progressPercent.value = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0
}

function handleKeydown(event: KeyboardEvent) {
  const track = trackRef.value
  if (!track) return

  const scrollAmount = track.clientWidth * props.scrollSpeed
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    track.scrollBy({ left: scrollAmount, behavior: 'smooth' })
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    track.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
  }
}

function skipToEnd() {
  if (endRef.value) {
    endRef.value.scrollIntoView({ behavior: 'smooth' })
    endRef.value.focus()
  }
}

// --- Desktop grab & wheel navigation -------------------------------------
// Distance (px) beyond which a pointer gesture counts as a drag rather than a
// click, so dragging over a child link/button does not navigate.
const DRAG_CLICK_THRESHOLD = 5

let pointerDragListenersAttached = false
let dragStartX = 0
let dragStartScrollLeft = 0
let dragDistance = 0
let activePointerId: number | null = null
let clickSwallower: ((event: MouseEvent) => void) | null = null

function removeClickSwallower() {
  const track = trackRef.value
  if (clickSwallower && track) {
    track.removeEventListener('click', clickSwallower, { capture: true })
  }
  clickSwallower = null
}

// After a real drag, swallow exactly the next click (capture phase) so it never
// reaches a child link/button. A pure click (no drag) never arms this.
function armClickSwallower(track: HTMLElement) {
  removeClickSwallower()
  clickSwallower = (event: MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
    removeClickSwallower()
  }
  track.addEventListener('click', clickSwallower, { capture: true })
}

function resetDragState() {
  if (activePointerId !== null) {
    const track = trackRef.value
    if (track) {
      try {
        track.releasePointerCapture(activePointerId)
      } catch {
        // Pointer capture may already be released/invalid; nothing to undo.
      }
    }
  }
  removeClickSwallower()
  isDragging.value = false
  activePointerId = null
  dragDistance = 0
}

function onPointerDown(event: PointerEvent) {
  const track = trackRef.value
  if (!track) return
  // Primary button / primary pointer only.
  if (!event.isPrimary || event.button !== 0) return
  activePointerId = event.pointerId
  dragStartX = event.clientX
  dragStartScrollLeft = track.scrollLeft
  dragDistance = 0
  isDragging.value = true
  try {
    track.setPointerCapture(event.pointerId)
  } catch {
    // setPointerCapture can throw if the pointer id is no longer valid; the
    // gesture still works without capture, so proceed.
  }
}

function onPointerMove(event: PointerEvent) {
  if (!isDragging.value || event.pointerId !== activePointerId) return
  const track = trackRef.value
  if (!track) return
  const dx = event.clientX - dragStartX
  dragDistance = Math.max(dragDistance, Math.abs(dx))
  track.scrollLeft = dragStartScrollLeft - dx
}

function onPointerEnd(event: PointerEvent) {
  if (event.pointerId !== activePointerId) return
  const track = trackRef.value
  if (track) {
    try {
      track.releasePointerCapture(event.pointerId)
    } catch {
      // Already released/invalid; ignore.
    }
    if (dragDistance > DRAG_CLICK_THRESHOLD) {
      armClickSwallower(track)
    }
  }
  isDragging.value = false
  activePointerId = null
  dragDistance = 0
}

function onWheel(event: WheelEvent) {
  const track = trackRef.value
  if (!track) return
  // Native horizontal intent (trackpad swipe / shift+wheel): leave it untouched.
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return

  const maxScroll = track.scrollWidth - track.clientWidth
  if (maxScroll <= 0) return

  const delta = event.deltaY * props.scrollSpeed
  const atStart = track.scrollLeft <= 0
  const atEnd = track.scrollLeft >= maxScroll - 1
  // At an edge in the wheel's direction, let the page scroll normally — never trap it.
  if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return

  event.preventDefault()
  track.scrollLeft += delta
}

function enablePointerDrag() {
  const track = trackRef.value
  if (!track || pointerDragListenersAttached) return
  track.addEventListener('pointerdown', onPointerDown)
  track.addEventListener('pointermove', onPointerMove)
  track.addEventListener('pointerup', onPointerEnd)
  track.addEventListener('pointercancel', onPointerEnd)
  track.addEventListener('wheel', onWheel, { passive: false })
  pointerDragListenersAttached = true
}

function disablePointerDrag() {
  if (!pointerDragListenersAttached) {
    // Even if never attached, clear any transient drag state defensively.
    resetDragState()
    return
  }
  const track = trackRef.value
  if (track) {
    track.removeEventListener('pointerdown', onPointerDown)
    track.removeEventListener('pointermove', onPointerMove)
    track.removeEventListener('pointerup', onPointerEnd)
    track.removeEventListener('pointercancel', onPointerEnd)
    track.removeEventListener('wheel', onWheel)
  }
  resetDragState()
  pointerDragListenersAttached = false
}

function syncPointerDrag() {
  if (pointerDragActive.value) {
    enablePointerDrag()
  } else {
    disablePointerDrag()
  }
}
// -------------------------------------------------------------------------

let motionQuery: MediaQueryList | null = null
function onMotionChange(e: MediaQueryListEvent) {
  prefersReducedMotion.value = e.matches
  // Re-evaluate eligibility: reduced motion turns the behavior into a no-op.
  syncPointerDrag()
}

onMounted(() => {
  detectReducedMotion()
  detectFinePointer()
  if (typeof window !== 'undefined' && window.matchMedia) {
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    motionQuery.addEventListener('change', onMotionChange)
  }
  syncPointerDrag()
})

// Handle live prop toggles (e.g. in the editor preview) after initial mount.
watch(pointerDragActive, syncPointerDrag)

onUnmounted(() => {
  if (motionQuery) {
    motionQuery.removeEventListener('change', onMotionChange)
    motionQuery = null
  }
  disablePointerDrag()
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

</script>

<style lang="scss" scoped>
.horizontal-scroll {
  position: relative;
  overflow: hidden;

  &__skip-link {
    position: absolute;
    top: -100%;
    left: 0;
    z-index: 10;
    padding: 0.5rem 1rem;
    background: var(--color-primary, #108A00);
    color: #fff;
    text-decoration: none;
    font-size: var(--font-size-sm);

    &:focus {
      top: 0;
    }
  }

  &__track {
    display: flex;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    outline: none;

    &--snap {
      scroll-snap-type: x mandatory;
    }

    // Desktop grab affordance — only applied when pointerDrag is active.
    &--pointer-drag {
      cursor: grab;
    }

    // While dragging: show the grabbing cursor, suppress text selection, and
    // temporarily disable scroll-snap so the drag tracks the pointer smoothly.
    // Declared after --snap so it overrides scroll-snap-type at equal specificity.
    &--grabbing {
      cursor: grabbing;
      user-select: none;
      scroll-snap-type: none;
      scroll-behavior: auto;
    }

    // Hide scrollbar by default (progress bar replaces it)
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &__item {
    flex: 0 0 auto;
    min-width: 0;

    &--snap {
      scroll-snap-align: start;
    }
  }

  &__item-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-width: 300px;
    min-height: 200px;
    background: var(--color-background, #f5f5f5);
    border: 1px dashed var(--border-color, #e0e0e0);
    color: var(--color-text-light, #616161);
    font-size: var(--font-size-base);
  }

  &__progress {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: rgba(0, 0, 0, 0.1);
    z-index: 2;
  }

  &__progress-bar {
    height: 100%;
    background: var(--color-primary, #108A00);
    transition: width 0.15s ease-out;
  }

  // Gap variants
  &--gap-none &__track {
    gap: 0;
  }

  &--gap-small &__track {
    gap: 0.5rem;
  }

  &--gap-medium &__track {
    gap: 1rem;
  }

  &--gap-large &__track {
    gap: 2rem;
  }

  // Reduced motion: vertical stack layout
  &--reduced-motion {
    overflow: visible;

    .horizontal-scroll__track {
      display: flex;
      flex-direction: column;
      overflow-x: visible;
      height: auto !important;
      gap: 1rem;
      scroll-snap-type: none;
    }

    .horizontal-scroll__item {
      flex: 0 0 auto;
      width: 100%;
      scroll-snap-align: none;
    }

    .horizontal-scroll__progress {
      display: none;
    }

    // Sticky/pinned neutralization now flows through the data-motion-suppressed
    // state contract: __item wrappers carry data-motion-suppressed="true" in this
    // branch, and NarrativeScene's own scoped styles honor that ancestor attr to
    // drop its sticky/pinned layout. No cross-component :deep piercing needed.
  }
}
</style>
