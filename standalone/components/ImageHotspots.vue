<template>
  <figure
    class="image-hotspots"
    :class="rootClass"
    :style="rootStyle"
    :data-collapse="isMobile ? 'mobile' : 'desktop'"
  >
    <div class="image-hotspots__frame" :style="frameStyle">
      <img
        v-if="resolvedImage"
        data-target="image"
        class="image-hotspots__img"
        :src="resolvedImage"
        :alt="plainAlt"
        :style="imgStyle"
        draggable="false"
      />
      <div v-else class="image-hotspots__placeholder" aria-hidden="true">
        <span>Add a base image</span>
      </div>

      <div
        v-for="(spot, index) in positionedHotspots"
        :key="index"
        class="image-hotspots__spot"
        :class="{ 'is-active': pinned === index }"
        :style="{ left: `${spot.x}%`, top: `${spot.y}%` }"
        @mouseenter="onEnter(index)"
        @mouseleave="onLeave(index)"
      >
        <button
          :ref="el => registerMarker(el, index)"
          data-target="marker"
          :data-item-index="index"
          class="image-hotspots__marker"
          :class="`image-hotspots__marker--${markerStyle}`"
          type="button"
          :aria-expanded="isOpen(index)"
          :aria-label="spot.plainTitle || `Hotspot ${index + 1}`"
          :aria-controls="isMobile ? (pinned === index ? dockId : undefined) : popoverId(index)"
          @click="onMarkerClick(index)"
          @focus="onFocus(index)"
          @blur="onBlur(index)"
          @keydown.escape="close(index)"
        >
          <span v-if="markerStyle === 'numbered'" class="image-hotspots__marker-label">{{ index + 1 }}</span>
          <span v-else-if="markerStyle === 'plus'" class="image-hotspots__marker-label" aria-hidden="true">+</span>
          <span v-else class="image-hotspots__marker-pulse" aria-hidden="true"></span>
        </button>

        <div
          v-if="!isMobile"
          v-show="isOpen(index)"
          :id="popoverId(index)"
          class="image-hotspots__popover"
          :class="[`is-${spot.placeH}`, `is-${spot.placeV}`]"
          role="tooltip"
        >
          <span
            v-if="spot.title"
            data-target="popover-title"
            class="image-hotspots__popover-title"
            v-html="spot.title"
          ></span>
          <div
            v-if="spot.description"
            class="image-hotspots__popover-desc prose"
            v-html="spot.description"
          ></div>
        </div>
      </div>
    </div>

    <div
      v-if="tourActive"
      class="image-hotspots__tour"
      role="group"
      aria-label="Guided tour"
      @keydown.left.prevent="tourPrev"
      @keydown.right.prevent="tourNext"
    >
      <button
        type="button"
        class="image-hotspots__tour-btn"
        aria-label="Previous point"
        @click="tourPrev"
      >&lsaquo;</button>
      <span class="image-hotspots__tour-status" aria-live="polite">
        {{ pinned === null ? `${positionedHotspots.length} points` : `${pinned + 1} / ${positionedHotspots.length}` }}
      </span>
      <button
        type="button"
        class="image-hotspots__tour-btn"
        aria-label="Next point"
        @click="tourNext"
      >&rsaquo;</button>
    </div>

    <div
      v-if="isMobile && activeMobileSpot"
      :id="dockId"
      class="image-hotspots__dock"
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        class="image-hotspots__dock-close"
        aria-label="Close"
        @click="pinned = null"
      >&times;</button>
      <span class="image-hotspots__dock-num" aria-hidden="true">{{ activeMobileSpot.number }}</span>
      <div class="image-hotspots__dock-body">
        <span
          v-if="activeMobileSpot.title"
          class="image-hotspots__dock-title"
          v-html="activeMobileSpot.title"
        ></span>
        <div
          v-if="activeMobileSpot.description"
          class="image-hotspots__dock-desc prose"
          v-html="activeMobileSpot.description"
        ></div>
      </div>
    </div>
  </figure>
</template>

<script setup lang="ts">
import { computed, ref, getCurrentInstance } from 'vue'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useViewport } from '~/shared/composables/useViewport'
import { isMobileViewport } from '~/shared/features/cms/composition/responsive'
import { resolveAspectRatio } from '~/shared/features/cms/media/artDirection'

const { getLocalizedValue } = useLocalized()

interface RawHotspot {
  title?: string | Record<string, string>
  description?: string | Record<string, string>
  x?: number
  y?: number
}

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  blocks?: Array<Record<string, unknown>>
  image?: string
  altText?: string | Record<string, string>
  hotspots?: RawHotspot[]
  markerStyle?: 'numbered' | 'dot' | 'plus'
  revealOn?: 'hover' | 'click'
  guidedTour?: boolean
  objectFit?: 'cover' | 'contain'
  aspectRatio?: string
  borderRadius?: string
  internalPadding?: string
}>(), {
  hotspots: () => [],
  markerStyle: 'numbered',
  revealOn: 'hover',
  guidedTour: false,
  objectFit: 'cover',
  aspectRatio: '4:3',
  borderRadius: 'md',
  internalPadding: 'none',
})

const uid = getCurrentInstance()?.uid ?? Math.floor(Math.random() * 100000)

// --- Open / active state ---
// `pinned` is toggled by click/tap (works on touch + click-mode); `hovered`
// tracks pointer/focus for hover-mode. A popover is open when pinned, or — in
// hover mode — while hovered/focused.
const pinned = ref<number | null>(null)
const hovered = ref<number | null>(null)

function isOpen(index: number): boolean {
  if (pinned.value === index) return true
  return props.revealOn === 'hover' && hovered.value === index
}

function onMarkerClick(index: number) {
  pinned.value = pinned.value === index ? null : index
}
function onEnter(index: number) {
  if (props.revealOn === 'hover') hovered.value = index
}
function onLeave(index: number) {
  if (props.revealOn === 'hover' && hovered.value === index) hovered.value = null
}
function onFocus(index: number) {
  if (props.revealOn === 'hover') hovered.value = index
}
function onBlur(index: number) {
  if (hovered.value === index) hovered.value = null
}
function close(index: number) {
  if (pinned.value === index) pinned.value = null
  if (hovered.value === index) hovered.value = null
  markerEls.value[index]?.blur()
}

const popoverId = (index: number) => `hotspot-popover-${uid}-${index}`
const dockId = `hotspot-dock-${uid}`

// --- Viewport: mobile swaps the clip-prone floating popovers for a single
// full-width caption docked below the image (responsive.ts-in-TS, no @media). ---
const { innerWidth } = useViewport()
const isMobile = computed(() => isMobileViewport(innerWidth.value))

// Keep marker element refs so Escape can return focus cleanly.
const markerEls = ref<Record<number, HTMLButtonElement | null>>({})
function registerMarker(el: unknown, index: number) {
  markerEls.value[index] = (el as HTMLButtonElement | null) ?? null
}

// --- Derived hotspots (localized + clamped + edge-aware placement) ---
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

const resolvedImage = computed(() => props.image || '')

const plainAlt = computed(() =>
  asHtml(getLocalizedValue(props.altText, '')).replace(/<[^>]*>/g, '')
)

const positionedHotspots = computed(() =>
  (props.hotspots || []).map((raw) => {
    const x = clamp(typeof raw.x === 'number' ? raw.x : 50, 0, 100)
    const y = clamp(typeof raw.y === 'number' ? raw.y : 50, 0, 100)
    const title = asHtml(getLocalizedValue(raw.title, ''))
    return {
      x,
      y,
      title,
      plainTitle: title.replace(/<[^>]*>/g, ''),
      description: asHtml(getLocalizedValue(raw.description, '')),
      // Open the popover toward the side with more room.
      placeH: x > 60 ? 'left' : x < 40 ? 'right' : 'center',
      placeV: y > 65 ? 'above' : 'below',
    }
  })
)

// The pinned hotspot surfaced in the mobile dock (null when nothing pinned).
// `pinned` is the single source of truth: resizing desktop→mobile with a
// popover open simply re-surfaces the same index here.
const activeMobileSpot = computed(() => {
  if (pinned.value === null) return null
  const spot = positionedHotspots.value[pinned.value]
  return spot ? { ...spot, number: pinned.value + 1 } : null
})

// --- Guided tour (opt-in): step through hotspots with wrap-around. `pinned`
// stays the single source of truth, so each step re-uses the existing
// popover/dock machinery (the target marker lights up via `.is-active` and its
// popover/dock opens). Focus intentionally STAYS on the pressed tour button so
// the group's ←/→ keydown handlers keep firing across steps; the aria-live
// status announces each move. Needs >=2 points to be meaningful — otherwise the
// control bar is suppressed entirely (tourActive false => no v-if, no listener). ---
const tourActive = computed(() => !!props.guidedTour && positionedHotspots.value.length >= 2)

function stepTo(i: number) {
  const n = positionedHotspots.value.length
  if (!n) return
  const idx = ((i % n) + n) % n
  pinned.value = idx
}
function tourNext() {
  stepTo((pinned.value ?? -1) + 1)
}
function tourPrev() {
  stepTo((pinned.value ?? 0) - 1)
}

// --- Styling ---
const resolvedRatio = computed(() => resolveAspectRatio(props.aspectRatio))

const rootClass = computed(() => (props.isSelected ? 'is-selected' : ''))

const rootStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  return style
})

const frameStyle = computed(() => {
  const style: Record<string, string> = {}
  if (resolvedRatio.value) style.aspectRatio = resolvedRatio.value
  if (props.borderRadius && props.borderRadius !== 'none') {
    style.borderRadius = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0'
  }
  return style
})

// No focal control here: hotspots are positioned against the image's own
// coordinate space, so cropping it off-centre would move every marker off its
// subject. `media-art-direction` is adopted for `objectFit` only.
const imgStyle = computed(() => {
  const isAuto = resolvedRatio.value === null
  return {
    objectFit: props.objectFit ?? 'cover',
    position: isAuto ? 'static' : 'absolute',
    height: isAuto ? 'auto' : '100%',
  } as Record<string, string>
})
</script>

<style lang="scss" scoped>
.image-hotspots {
  margin: 0;
  width: 100%;

  &__frame {
    position: relative;
    width: 100%;
    overflow: visible; // let popovers escape the image bounds
    background: var(--color-background-lighter);
  }

  &__img {
    display: block;
    width: 100%;
    top: 0;
    left: 0;
    user-select: none;
  }

  &__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 4 / 3;
    color: var(--color-text-lighter);
    font-size: var(--font-size-sm);
    border: 0.1rem dashed var(--border-color);
  }

  // --- Marker anchor ---
  &__spot {
    position: absolute;
    transform: translate(-50%, -50%);
    z-index: 2;
  }

  &__marker {
    --marker-size: 2.8rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--marker-size);
    height: var(--marker-size);
    padding: 0;
    border: 0.2rem solid var(--color-background);
    border-radius: var(--border-radius-full, 50%);
    background: var(--color-primary);
    color: var(--color-background);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 0.2rem 0.8rem rgba(0, 0, 0, 0.25);
    transition: transform var(--transition-base), box-shadow var(--transition-base);

    &:hover,
    &:focus-visible {
      transform: scale(1.12);
      box-shadow: 0 0.3rem 1.2rem rgba(0, 0, 0, 0.35);
    }

    &:focus-visible {
      outline: 0.2rem solid var(--color-primary);
      outline-offset: 0.2rem;
    }

    &--dot {
      --marker-size: 1.8rem;
    }
  }

  &__marker-label {
    pointer-events: none;
  }

  &__marker-pulse {
    position: relative;
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
    background: var(--color-background);

    &::after {
      content: '';
      position: absolute;
      inset: -0.45rem;
      border-radius: 50%;
      border: 0.15rem solid var(--color-background);
      opacity: 0.7;
      animation: image-hotspots-pulse 1.8s ease-out infinite;
    }
  }

  // --- Popover ---
  &__popover {
    position: absolute;
    z-index: 3;
    width: max-content;
    max-width: 24rem;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-background);
    color: var(--color-text);
    border: 0.1rem solid var(--border-color);
    border-radius: var(--border-radius-md);
    box-shadow: 0 0.4rem 1.6rem rgba(0, 0, 0, 0.22);
    text-align: left;
    pointer-events: none; // popover is read-only; markers own interaction

    // Horizontal anchoring relative to the marker.
    &.is-right { left: calc(50% + 2rem); }
    &.is-left { right: calc(50% + 2rem); }
    &.is-center { left: 50%; transform: translateX(-50%); }

    // Vertical anchoring relative to the marker.
    &.is-below { top: calc(50% + 2rem); }
    &.is-above { bottom: calc(50% + 2rem); }
    &.is-center.is-below { transform: translateX(-50%); }
    &.is-center.is-above { transform: translateX(-50%); }
  }

  &__popover-title {
    display: block;
    font-family: var(--rt-slot-title-family, var(--rt-role-heading3-family, inherit));
    font-size: var(--rt-slot-title-size, var(--rt-role-heading3-size, var(--font-size-base)));
    font-weight: var(--rt-slot-title-weight, var(--rt-role-heading3-weight, var(--font-weight-semibold)));
    line-height: var(--rt-slot-title-line-height, var(--rt-role-heading3-line-height, 1.3));
    color: var(--rt-slot-title-color, var(--rt-role-heading3-color, var(--color-text)));
    margin-block-end: var(--spacing-2xs, 0.4rem);
  }

  &__popover-desc {
    font-family: var(--rt-slot-desc-family, var(--rt-role-body-family, inherit));
    font-size: var(--rt-slot-desc-size, var(--rt-role-body-size, var(--font-size-sm)));
    font-weight: var(--rt-slot-desc-weight, var(--rt-role-body-weight, inherit));
    line-height: var(--rt-slot-desc-line-height, var(--rt-role-body-line-height, var(--line-height-relaxed)));
    color: var(--rt-slot-desc-color, var(--rt-role-body-color, var(--color-text-light)));

    :deep(p) { margin: 0; }
    :deep(p + p) { margin-block-start: var(--spacing-xs); }
  }

  &.is-selected &__marker {
    outline: 0.2rem dashed var(--color-primary);
    outline-offset: 0.2rem;
  }

  // Pinned/open marker reads as active (solid ring, distinct from the dashed
  // editor .is-selected outline). Harmless on desktop, the cue on mobile.
  &__spot.is-active &__marker {
    outline: 0.2rem solid var(--color-primary);
    outline-offset: 0.2rem;
  }

  // --- Docked caption (mobile) ---
  // Responsive decision keyed on the collapse attr, not @media (responsive.ts).
  &[data-collapse='mobile'] &__marker { --marker-size: 3.2rem; }
  &[data-collapse='mobile'] &__marker--dot { --marker-size: 2.6rem; } // WCAG tap target

  &__dock {
    position: relative;
    width: 100%;
    margin-block-start: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-background);
    border: 0.1rem solid var(--border-color);
    border-radius: var(--border-radius-md);
    border-block-start: 0.3rem solid var(--color-primary);
    box-shadow: 0 0.2rem 1rem rgba(0, 0, 0, 0.10);
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--spacing-sm);
    align-items: start;
    text-align: left;
    animation: image-hotspots-dock-in 200ms ease-out;
  }

  &__dock-num {
    grid-column: 1;
    font-weight: var(--font-weight-bold);
    color: var(--color-primary);
    font-size: clamp(var(--font-size-lg), 6vw, var(--font-size-xl));
    line-height: 1;
  }

  &__dock-body {
    grid-column: 2;
  }

  &__dock-title {
    display: block;
    font-family: var(--rt-slot-title-family, var(--rt-role-heading3-family, inherit));
    font-size: var(--rt-slot-title-size, var(--rt-role-heading3-size, var(--font-size-base)));
    font-weight: var(--rt-slot-title-weight, var(--rt-role-heading3-weight, var(--font-weight-semibold)));
    line-height: var(--rt-slot-title-line-height, var(--rt-role-heading3-line-height, 1.3));
    color: var(--rt-slot-title-color, var(--rt-role-heading3-color, var(--color-text)));
    margin-block-end: var(--spacing-2xs, 0.4rem);
  }

  &__dock-desc {
    font-family: var(--rt-slot-desc-family, var(--rt-role-body-family, inherit));
    font-size: var(--rt-slot-desc-size, var(--rt-role-body-size, var(--font-size-sm)));
    font-weight: var(--rt-slot-desc-weight, var(--rt-role-body-weight, inherit));
    line-height: var(--rt-slot-desc-line-height, var(--rt-role-body-line-height, var(--line-height-relaxed)));
    color: var(--rt-slot-desc-color, var(--rt-role-body-color, var(--color-text-light)));

    :deep(p) { margin: 0; }
    :deep(p + p) { margin-block-start: var(--spacing-xs); }
  }

  &__dock-close {
    position: absolute;
    top: var(--spacing-2xs);
    right: var(--spacing-2xs);
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 2.8rem;
    min-height: 2.8rem;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--color-text-lighter);
    font-size: var(--font-size-lg);
    line-height: 1;
    cursor: pointer;

    &:hover { color: var(--color-text); }
    &:focus-visible {
      outline: 0.2rem solid var(--color-primary);
      outline-offset: 0.2rem;
    }
  }

  // --- Guided tour control bar (opt-in) ---
  // Restrained, centered stepper — reads as editorial caption chrome, not a
  // loud toolbar. Sits below the frame (and above the mobile dock).
  &__tour {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    margin-block-start: var(--spacing-sm);
  }

  &__tour-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 4.4rem;
    min-height: 4.4rem;
    padding: 0;
    border: 0.1rem solid var(--border-color);
    border-radius: var(--border-radius-full, 50%);
    background: var(--color-background);
    color: var(--color-text);
    font-size: var(--font-size-lg);
    line-height: 1;
    cursor: pointer;
    transition: border-color var(--transition-base), color var(--transition-base);

    &:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
    &:focus-visible {
      outline: 0.2rem solid var(--color-primary);
      outline-offset: 0.2rem;
    }
  }

  &__tour-status {
    min-width: 6rem;
    text-align: center;
    font-size: var(--font-size-sm);
    font-variant-numeric: tabular-nums;
    color: var(--color-text-light);
    letter-spacing: 0.02em;
  }
}

@keyframes image-hotspots-pulse {
  0% { transform: scale(0.8); opacity: 0.7; }
  100% { transform: scale(2.2); opacity: 0; }
}

@keyframes image-hotspots-dock-in {
  0% { opacity: 0; transform: translateY(0.6rem); }
  100% { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .image-hotspots__marker { transition: none; }
  .image-hotspots__marker-pulse::after { animation: none; }
  .image-hotspots__dock { animation: none; }
  .image-hotspots__tour-btn { transition: none; }
}
</style>
