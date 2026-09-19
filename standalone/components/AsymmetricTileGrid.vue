<template>
  <section
    ref="rootEl"
    class="asymmetric-tile-grid"
    :class="{ 'asymmetric-tile-grid--parallax': parallaxActive }"
    data-target="root"
    :style="rootStyle"
  >
    <div class="asymmetric-tile-grid__layout">

      <!-- Left column: 2 stacked tiles -->
      <div class="asymmetric-tile-grid__left">

        <!-- Top-left tile -->
        <div v-if="leftTiles[0]" class="asymmetric-tile-grid__tile asymmetric-tile-grid__tile--top-left" data-target="tile-left-top">
          <img
            v-if="leftTiles[0].image"
            :ref="setImg0"
            :src="leftTiles[0].image"
            :alt="leftTiles[0].alt || ''"
            class="asymmetric-tile-grid__image"
          />
          <div v-if="leftTiles[0].caption" class="asymmetric-tile-grid__caption asymmetric-tile-grid__caption--bottom-left">
            <span class="asymmetric-tile-grid__caption-text">{{ leftTiles[0].caption }}</span>
          </div>
        </div>

        <!-- Bottom-left tile -->
        <div v-if="leftTiles[1]" class="asymmetric-tile-grid__tile asymmetric-tile-grid__tile--bottom-left" data-target="tile-left-bottom">
          <img
            v-if="leftTiles[1].image"
            :ref="setImg1"
            :src="leftTiles[1].image"
            :alt="leftTiles[1].alt || ''"
            class="asymmetric-tile-grid__image"
          />
          <div v-if="leftTiles[1].caption" class="asymmetric-tile-grid__caption asymmetric-tile-grid__caption--bottom-left">
            <span class="asymmetric-tile-grid__caption-text">{{ leftTiles[1].caption }}</span>
          </div>
        </div>

      </div>

      <!-- Right column: 1 tall tile -->
      <div v-if="rightTile" class="asymmetric-tile-grid__right" data-target="tile-right">
        <div class="asymmetric-tile-grid__tile asymmetric-tile-grid__tile--right">

          <!-- Plus icon top-right -->
          <span v-if="rightTile.showPlusIcon !== false" class="asymmetric-tile-grid__plus" aria-hidden="true">+</span>

          <img
            v-if="rightTile.image"
            :ref="setImg2"
            :src="rightTile.image"
            :alt="rightTile.alt || ''"
            class="asymmetric-tile-grid__image"
          />

          <!-- Caption overlay bottom-right -->
          <div v-if="rightTile.caption" class="asymmetric-tile-grid__caption asymmetric-tile-grid__caption--bottom-right">
            <span class="asymmetric-tile-grid__caption-text">{{ rightTile.caption }}</span>
          </div>

          <!-- White pill CTA bottom-center -->
          <NuxtLink
            v-if="rightTile.ctaLabel && rightTile.ctaUrl"
            :to="rightTile.ctaUrl"
            class="asymmetric-tile-grid__pill"
          >
            {{ rightTile.ctaLabel }}
          </NuxtLink>
          <span v-else-if="rightTile.ctaLabel" class="asymmetric-tile-grid__pill">
            {{ rightTile.ctaLabel }}
          </span>

        </div>
      </div>

    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'

interface TileItem {
  image?: string
  alt?: string
  caption?: string
}

interface RightTileItem extends TileItem {
  ctaLabel?: string
  ctaUrl?: string
  showPlusIcon?: boolean
}

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  leftTiles?: TileItem[]
  rightTile?: RightTileItem
  gap?: number
  parallax?: 'off' | 'subtle' | 'strong'
}>(), {
  leftTiles: () => [],
  gap: 16,
  parallax: 'off',
})

// Gap slider (px) drives the grid gutters via a CSS var; px→rem on a 10px
// root, so the 16px default resolves to 1.6rem (the prior hardcoded value).
const rootStyle = computed<Record<string, string>>(() => ({
  '--atg-gap': `${(props.gap ?? 16) / 10}rem`,
}))

// ── Opt-in scroll parallax (desktop + motion only) ───────────────────────────
// Each tile image drifts vertically against scroll as the section passes through
// the viewport, at DIFFERENT rates so the three tiles read as layered
// architectural depth (right tall tile "closest"/fastest, left-bottom slowest).
// Mirrors the ImageBanner scroll idiom: rAF-throttled scroll/resize gated by an
// IntersectionObserver, matchMedia desktop gate, render-mode + reduced-motion
// exemptions. Gated behind `parallaxActive` so an off / mobile / editor /
// reduced-motion instance emits no modifier class, no CSS var and attaches no
// listeners — byte-identical to the component before this feature.
const mode = useRenderMode()
const { isReducedMotion } = useReducedMotion()

const rootEl = ref<HTMLElement | null>(null)
const isDesktop = ref(false)

// Per-tile drift multipliers, order-stable: [left-top, left-bottom, right].
// Right tall tile fastest ("closest"), left-bottom slowest — layered depth.
const depthMul = [1.0, 0.55, 1.3] as const
// Fixed-slot img element refs; a slot stays null while its tile is absent, so
// depthMul indexing never shifts (pruning is inherent, not positional).
const imgEls: (HTMLElement | null)[] = [null, null, null]
function setImgAt(index: number, el: unknown): void {
  imgEls[index] = el instanceof HTMLElement ? el : null
}
const setImg0 = (el: unknown): void => setImgAt(0, el)
const setImg1 = (el: unknown): void => setImgAt(1, el)
const setImg2 = (el: unknown): void => setImgAt(2, el)

const parallaxEligible = computed(() => props.parallax !== 'off')
const parallaxActive = computed(
  () => parallaxEligible.value && isDesktop.value && mode.value !== 'editor-preview' && !isReducedMotion.value,
)

let raf = 0
let io: IntersectionObserver | null = null
let inView = false
let mql: MediaQueryList | null = null

function clamp(n: number, min: number, max: number): number {
  return n < min ? min : n > max ? max : n
}
function onDesktopChange(e: MediaQueryListEvent): void {
  isDesktop.value = e.matches
}
function measure(): void {
  const root = rootEl.value
  if (!root) return
  const rect = root.getBoundingClientRect()
  const vh = window.innerHeight || 1
  const center = rect.top + rect.height / 2
  const denom = (vh + rect.height) / 2 || 1
  const progress = clamp((center - vh / 2) / denom, -1, 1)
  const base = props.parallax === 'strong' ? 0.10 : 0.06
  for (let i = 0; i < imgEls.length; i++) {
    const img = imgEls[i]
    if (!img) continue
    // Drift MAGNITUDE is bounded by the TILE (container) height, matching the
    // 16% CSS top-slack that is also defined against the tile — so the max
    // travel (base·depthMul·tileH) can never exceed the over-scale headroom.
    const tile = img.parentElement
    const tileH = (tile ?? img).getBoundingClientRect().height
    const factor = base * depthMul[i]
    const px = -progress * tileH * factor
    img.style.setProperty('--atg-py', px.toFixed(1) + 'px')
  }
}
function onScroll(): void {
  if (!inView || raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    measure()
  })
}
function attach(): void {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return
  const root = rootEl.value
  if (!root) return
  io = new IntersectionObserver((entries) => {
    inView = entries[0]?.isIntersecting ?? false
    if (inView) onScroll()
  })
  io.observe(root)
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  nextTick(measure)
}
function reset(): void {
  for (const img of imgEls) img?.style.removeProperty('--atg-py')
}
function detach(): void {
  if (typeof window === 'undefined') return
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  io?.disconnect()
  io = null
  inView = false
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}

onMounted(() => {
  if (typeof window === 'undefined') return
  // Off instances register ZERO listeners and do ZERO work — byte-identical to
  // a grid that never had this feature. The matchMedia gate exists only for an
  // eligible instance that may cross the desktop breakpoint at runtime.
  if (!parallaxEligible.value) return
  mql = window.matchMedia('(min-width: 768px)')
  isDesktop.value = mql.matches
  mql.addEventListener('change', onDesktopChange)
  if (parallaxActive.value) attach()
})
onBeforeUnmount(() => {
  detach()
  mql?.removeEventListener('change', onDesktopChange)
  mql = null
})

watch(parallaxActive, (on) => {
  detach()
  if (on) nextTick(attach)
  else reset()
})
</script>

<style lang="scss" scoped>
.asymmetric-tile-grid {
  padding: 0;

  &__layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--atg-gap, 1.6rem);
    align-items: stretch;

    @container (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  &__left {
    display: grid;
    grid-template-rows: 1fr 1fr;
    gap: var(--atg-gap, 1.6rem);
  }

  &__right {
    display: flex;
    flex-direction: column;
  }

  &__tile {
    position: relative;
    overflow: hidden;
    background: #1a1a1a;

    // Left tiles — square-ish
    &--top-left,
    &--bottom-left {
      aspect-ratio: 4 / 3;
    }

    // Right tile — full height of the 2-stack
    &--right {
      flex: 1;
      min-height: 0;
    }
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  // Caption overlay — shared base
  &__caption {
    position: absolute;
    padding: 1rem 1.2rem;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.65) 0%, transparent 100%);
    color: #ffffff;
    pointer-events: none;

    &--bottom-left {
      bottom: 0;
      left: 0;
      right: 0;
      text-align: left;
    }

    &--bottom-right {
      bottom: 3.2rem; // above the pill CTA
      left: 0;
      right: 0;
      text-align: left;
      padding-left: 1.4rem;
      padding-right: 1.4rem;
    }
  }

  &__caption-text {
    font-family: var(--rt-role-caption-family, Inter, sans-serif);
    font-size: clamp(1.1rem, 1.4vw, 1.3rem);
    line-height: 1.4;
    font-weight: 400;
    display: block;
    max-width: 28ch;
  }

  // White pill CTA — bottom-center of right tile
  &__pill {
    position: absolute;
    bottom: 1.4rem;
    left: 50%;
    transform: translateX(-50%);
    background: #ffffff;
    color: #1a1a1a;
    font-family: Inter, sans-serif;
    font-size: 1.2rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    padding: 0.5rem 2rem;
    border-radius: 999px;
    white-space: nowrap;
    text-decoration: none;
    cursor: pointer;
    border: none;
    display: inline-block;
    z-index: 4;
  }

  // Plus icon — top-right of right tile
  &__plus {
    position: absolute;
    top: 1.2rem;
    right: 1.4rem;
    color: #ffffff;
    font-size: 2.2rem;
    font-weight: 300;
    line-height: 1;
    z-index: 4;
    pointer-events: none;
    opacity: 0.9;
  }

  // ## Opt-in scroll parallax (parallaxActive === true)
  // Gated entirely behind this modifier so the default (off) path above is
  // untouched — an off instance renders byte-identical. Each image is over-scaled
  // and shifted up so its drift never reveals a gap under the tile's overflow:
  // 132% height + top:-16% = 16% slack above and below. Max |translate| at
  // progress=1 is base·depthMul·tileH = 0.10·1.3 = 0.13 of tileH (13%) < 16% ⇒
  // no gap. Any constant change MUST keep max travel strictly < the 16% top slack.
  &--parallax {
    .asymmetric-tile-grid__image {
      position: relative;
      width: 100%;
      height: 132%;
      top: -16%;
      object-fit: cover;
      will-change: transform;
      transform: translate3d(0, var(--atg-py, 0px), 0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &--parallax .asymmetric-tile-grid__image {
      transform: none;
    }
  }
}
</style>
