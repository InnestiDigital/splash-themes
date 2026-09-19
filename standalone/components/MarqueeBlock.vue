<template>
  <div
    class="marquee-block"
    :class="[`marquee-block--size-${size}`]"
    :data-edge-fade="edgeFade"
    :aria-label="ariaLabel"
    role="region"
    :style="{ ...contentStyle, ...typographyStyle }"
  >
    <div class="marquee-block__rows">
      <div
        v-for="(row, rowIndex) in visibleRows"
        :key="rowIndex"
        class="marquee-block__row"
        :class="[
          { 'marquee-block__row--paused': pausedRows[rowIndex] },
          rowCount > 1 ? 'marquee-block__row--bordered' : '',
        ]"
        :data-target="rowIndex === 0 ? 'track' : undefined"
        :style="rowStyle(row)"
        :aria-hidden="rowIndex > 0 ? 'true' : undefined"
        @mouseenter="onRowEnter(rowIndex)"
        @mouseleave="onRowLeave(rowIndex)"
        @focusin="onRowFocusIn(rowIndex)"
        @focusout="onRowFocusOut(rowIndex)"
      >
        <div
          class="marquee-block__track"
          :ref="(el) => setTrackRef(el as any, rowIndex)"
          :style="{ animationPlayState: pausedRows[rowIndex] || isReducedMotion ? 'paused' : 'running' }"
        >
          <!-- Render items twice for seamless loop -->
          <template v-for="copy in 2" :key="copy">
            <template v-for="(item, itemIndex) in row.items || []" :key="`${copy}-${itemIndex}`">
              <span
                v-if="separatorChar(row) && (itemIndex > 0 || copy === 2)"
                class="marquee-block__separator"
                aria-hidden="true"
              >{{ separatorChar(row) }}</span>
              <a
                v-if="item.href"
                :href="item.href"
                class="marquee-block__item marquee-block__item--link"
              >
                <img
                  v-if="item.itemType === 'image' && item.image"
                  :src="item.image"
                  :alt="getLocalizedValue(item.text)"
                  class="marquee-block__image"
                />
                <span v-else class="marquee-block__text">{{ getLocalizedValue(item.text) }}</span>
              </a>
              <span v-else class="marquee-block__item">
                <img
                  v-if="item.itemType === 'image' && item.image"
                  :src="item.image"
                  :alt="getLocalizedValue(item.text)"
                  class="marquee-block__image"
                />
                <span v-else class="marquee-block__text">{{ getLocalizedValue(item.text) }}</span>
              </span>
            </template>
          </template>
        </div>
      </div>
    </div>

    <div v-if="localizedSubtitle" class="marquee-block__subtitle-wrap">
      <p class="marquee-block__subtitle" v-html="localizedSubtitle"></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { SPACING_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { useTypographySlotStyle } from '~/shared/composables/useTypographySlotStyle'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'
import { useLocalized } from '~/shared/composables/useLocalized'

const { getLocalizedValue } = useLocalized()

interface MarqueeItem {
  itemType?: 'text' | 'image'
  text?: string | Record<string, string>
  image?: string
  href?: string
}

interface MarqueeRow {
  items?: MarqueeItem[]
  direction?: 'left' | 'right'
  speed?: 'slow' | 'medium' | 'fast'
  separator?: 'none' | 'pipe' | 'dot' | 'dash' | string
}

const props = withDefaults(defineProps<{
  rows?: 1 | 2 | 3
  rowConfigs?: MarqueeRow[]
  size?: 'sm' | 'md' | 'lg'
  gap?: number
  pauseOnHover?: boolean
  scrollReactive?: boolean
  edgeFade?: 'none' | 'soft' | 'wide'
  ariaLabel?: string
  subtitle?: string | Record<string, string>
  internalPadding?: string
  surfaceStyle?: string
  itemPresetKey?: string | null
}>(), {
  rows: 1,
  rowConfigs: () => [],
  size: 'md',
  gap: 48,
  pauseOnHover: true,
  scrollReactive: false,
  edgeFade: 'soft',
  ariaLabel: 'Scrolling content',
})

const typographyStyle = useTypographySlotStyle({
  item: computed(() => props.itemPresetKey),
})

const { isReducedMotion } = useReducedMotion()
const renderMode = useRenderMode()
const isEditor = computed(() => renderMode.value === 'editor-preview')
const pausedRows = ref<Record<number, boolean>>({})

const rowCount = computed<number>(() => {
  const n = Number(props.rows)
  if (n === 2) return 2
  if (n === 3) return 3
  return 1
})

const visibleRows = computed<MarqueeRow[]>(() => {
  const list = Array.isArray(props.rowConfigs) ? props.rowConfigs : []
  return list.slice(0, rowCount.value)
})

const SPEED_DURATION: Record<string, number> = { slow: 60, medium: 35, fast: 18 }
const SEPARATOR_PRESETS: Record<string, string> = {
  none: '',
  pipe: '|',
  dot: '•',
  dash: '—',
}

function separatorChar(row: MarqueeRow): string {
  const sep = row.separator
  if (sep === undefined || sep === null) return '|'
  if (sep in SEPARATOR_PRESETS) return SEPARATOR_PRESETS[sep]
  // raw string (e.g. " | ") — return trimmed for inline rendering
  return String(sep).trim()
}

function rowStyle(row: MarqueeRow): Record<string, string> {
  const dur = SPEED_DURATION[row.speed || 'medium'] ?? 35
  // Play-state is the track's single source of truth (inline `animationPlayState`),
  // so reduced motion pauses there rather than via a duplicate CSS var here.
  return {
    gap: `${props.gap}px`,
    '--marquee-block-duration': `${dur}s`,
    '--marquee-block-direction': row.direction === 'right' ? 'reverse' : 'normal',
  }
}

const localizedSubtitle = computed(() => getLocalizedValue(props.subtitle))

function onRowEnter(idx: number) {
  if (props.pauseOnHover) pausedRows.value[idx] = true
}
function onRowLeave(idx: number) {
  if (props.pauseOnHover) pausedRows.value[idx] = false
}
function onRowFocusIn(idx: number) {
  pausedRows.value[idx] = true
}
function onRowFocusOut(idx: number) {
  pausedRows.value[idx] = false
}

const SURFACE_STYLE_MAP: Record<string, string> = {
  section: 'var(--section-bg)',
  surface: 'var(--section-surface)',
  accent: 'var(--section-accent)',
  transparent: 'transparent',
}

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  if (props.surfaceStyle && props.surfaceStyle !== 'none') {
    style.backgroundColor = SURFACE_STYLE_MAP[props.surfaceStyle] ?? props.surfaceStyle
  }
  return style
})

// ── Scroll-velocity-reactive speed (opt-in) ─────────────────────────────────
// Modulates the existing CSS keyframe animation via the Web Animations API
// `playbackRate` (base = 1 = the configured speed). Scrolling down accelerates
// the marquee in its travel direction; scrolling up eases it toward reverse; a
// still page settles back to base. Fully additive: when `scrollReactive` is off
// (default) — or under reduced-motion, or in the editor preview — NOTHING is
// attached (no listeners, no rAF), so the default path is byte-identical.
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

// Live track elements collected via the template function ref (one per row).
// Index-assigned then trimmed to the current row count so removed rows leave no
// stale nodes behind.
const trackEls: (HTMLElement | null)[] = []
function setTrackRef(el: HTMLElement | null, index: number) {
  if (el) trackEls[index] = el
  trackEls.length = visibleRows.value.length
}

const SENS = 0.02
const DECAY = 0.9
const EASE = 0.15
const V_CLAMP = 200
const RATE_MIN = -3
const RATE_MAX = 5

let velocity = 0
let lastScrollY = 0
let currentRate = 1
let rafId: number | null = null
let scrollBound = false

function scrollReactiveActive(): boolean {
  return (
    typeof window !== 'undefined' &&
    props.scrollReactive === true &&
    !isReducedMotion.value &&
    !isEditor.value
  )
}

function onScroll() {
  const y = window.scrollY
  const delta = y - lastScrollY
  lastScrollY = y
  velocity = clamp(velocity + delta, -V_CLAMP, V_CLAMP)
}

function tick() {
  velocity *= DECAY
  if (Math.abs(velocity) < 0.01) velocity = 0
  const target = clamp(1 + velocity * SENS, RATE_MIN, RATE_MAX)
  currentRate += (target - currentRate) * EASE
  for (const el of trackEls) {
    if (!el) continue
    for (const anim of el.getAnimations()) anim.playbackRate = currentRate
  }
  rafId = requestAnimationFrame(tick)
}

function startEngine() {
  if (scrollBound) return
  lastScrollY = window.scrollY
  window.addEventListener('scroll', onScroll, { passive: true })
  scrollBound = true
  rafId = requestAnimationFrame(tick)
}

function stopEngine() {
  if (scrollBound) {
    window.removeEventListener('scroll', onScroll)
    scrollBound = false
  }
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

onMounted(() => {
  if (scrollReactiveActive()) startEngine()
})

// Re-evaluate the gate if render mode or the reduced-motion preference changes
// at runtime (editor iframe resolving post-mount, or the OS reduced-motion toggle
// flipping): start when it should run, tear down otherwise. Both calls are
// idempotent, so authoring/reduced-motion stay fully inert. Mirrors ProjectIndex.
watch([isEditor, isReducedMotion], () => {
  if (scrollReactiveActive()) startEngine()
  else stopEngine()
})

onBeforeUnmount(stopEngine)
</script>

<style lang="scss" scoped>
.marquee-block {
  overflow: hidden;
  position: relative;

  --marquee-fade: clamp(1.6rem, 5%, 4.8rem);
  &[data-edge-fade='wide'] { --marquee-fade: clamp(3rem, 12%, 9rem); }
  &[data-edge-fade='none'] { --marquee-fade: 0px; }

  &--size-sm { font-size: 14px; }
  &--size-md { font-size: 18px; }

  // Editorial accent marquee — the "Clienti" list (the only marquee
  // in the theme). The ref renders client names as large REGULAR-weight names
  // in the brand accent blue (same teal as the "Clienti" heading above),
  // pipe-separated. ~43px at desktop so the names read large yet stay secondary
  // to the giant display-xl heading. Accent colour is theme palette (semantic),
  // not a per-block freeform override.
  &--size-lg {
    // Flat px: the only consumer (home "Clienti") lives in the scale-canvas
    // layout (designWidth 1440) which scales the whole page uniformly, so a px
    // size renders 1:1 at design width and scales down with the canvas on
    // smaller viewports. rem/vw resolve unpredictably inside the scaled
    // context. 40px matches the ref client names (secondary to the giant
    // display-xl "Clienti" heading above).
    font-size: 40px;
    color: var(--color-accent, #1B8AB7);

    .marquee-block__text {
      // Override the typography-role size var (set to a small label size) so the
      // names actually scale to the large editorial treatment, matching the ref.
      font-size: 40px;
      font-weight: 400;
      letter-spacing: -0.01em;
      color: var(--color-accent, #1B8AB7);
    }

    .marquee-block__separator {
      opacity: 0.55;
    }
  }

  &__rows {
    display: flex;
    flex-direction: column;
  }

  &__row {
    overflow: hidden;
    white-space: nowrap;
    padding: 0.55rem 0;

    // Soft edge fade so client names dissolve at the container edges instead of
    // hard-clipping mid-word. Standard marquee treatment — applied at all
    // viewports (reads better at desktop too). Mask only, no colour change, so
    // the colour-freeze constraint is untouched.
    -webkit-mask-image: linear-gradient(
      to right,
      transparent 0,
      #000 var(--marquee-fade),
      #000 calc(100% - var(--marquee-fade)),
      transparent 100%
    );
    mask-image: linear-gradient(
      to right,
      transparent 0,
      #000 var(--marquee-fade),
      #000 calc(100% - var(--marquee-fade)),
      transparent 100%
    );

    &--bordered {
      border-top: 1px solid rgba(0, 0, 0, 0.06);

      &:last-of-type {
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      }
    }
  }

  &__track {
    display: inline-flex;
    align-items: center;
    will-change: transform;
    animation: marquee-block-scroll var(--marquee-block-duration, 35s) linear infinite;
    animation-direction: var(--marquee-block-direction, normal);
    /* play-state driven by inline style (hover + reduced motion); see template */
  }

  &__item {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;

    &--link {
      text-decoration: none;
      color: inherit;
      &:hover { opacity: 0.7; }
    }
  }

  &__text {
    white-space: nowrap;
    font-family: var(--rt-slot-item-family, var(--rt-role-label-family, inherit));
    font-size: var(--rt-slot-item-size, var(--rt-role-label-size, inherit));
    font-weight: var(--rt-slot-item-weight, var(--rt-role-label-weight, inherit));
    line-height: var(--rt-slot-item-line-height, var(--rt-role-label-line-height, inherit));
    letter-spacing: var(--rt-slot-item-letter-spacing, var(--rt-role-label-letter-spacing, normal));
    text-transform: var(--rt-slot-item-text-transform, var(--rt-role-label-text-transform, none));
    color: var(--rt-slot-item-color, var(--rt-role-label-color, inherit));
  }

  &__image {
    height: 1.5em;
    width: auto;
    object-fit: contain;
  }

  &__separator {
    opacity: 0.5;
    flex-shrink: 0;
    padding: 0 0.6em;
  }

  &__subtitle-wrap {
    padding: 2.5rem 1rem 0.5rem;
    text-align: center;
    max-width: 640px;
    margin-inline: auto;
  }

  &__subtitle {
    font-family: var(--font-family-sans, 'Inter', sans-serif);
    font-size: clamp(16px, 1.5vw, 22px);
    font-weight: 400;
    line-height: 1.55;
    color: var(--color-text, #282828);
    margin: 0;
    opacity: 0.85;
  }
}

@keyframes marquee-block-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

@media (prefers-reduced-motion: reduce) {
  .marquee-block__track {
    animation: none !important;
  }
}
</style>
