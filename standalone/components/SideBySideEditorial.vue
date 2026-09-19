<template>
  <section
    class="side-by-side"
    :class="[positionClass, { 'side-by-side--reverse-mobile': reverseOnMobile, 'side-by-side--sticky-media': stickyMediaEnabled, 'side-by-side--parallax-media': parallaxActive }]"
    :style="rootStyles"
  >
    <div ref="mediaEl" class="side-by-side__media" data-target="media" :style="mediaStyles">
      <img v-if="image" :src="image" :alt="localizedImageAlt" />
    </div>
    <div class="side-by-side__content" :style="contentStyle">
      <h2 v-if="title" class="side-by-side__heading" data-target="heading" v-html="asHtml(localizedTitle)" />
      <div v-if="body" class="side-by-side__body prose" data-target="body" v-html="asHtml(localizedBody)" />
      <div
        v-if="dividerEnabled"
        class="side-by-side__divider"
        data-target="divider"
        :style="dividerStyles"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import type { BackgroundRole, TextRole } from '~/shared/types/placement'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { asHtml } from '~/shared/utils/asHtml'
import { useBlockSurface } from '~/shared/composables/useBlockSurface'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'

const { getLocalizedValue } = useLocalized()
const mode = useRenderMode()
const { isReducedMotion } = useReducedMotion()
type MediaSide = 'left' | 'right'
type ImageRatio = '25' | '33' | '40' | '50' | '60' | '66' | '75'
/**
 * stickyMedia — opt-in "pinned editorial image". When set to 'on', the image
 * column becomes position:sticky so the visual stays pinned in view while the
 * (taller) text column scrolls past it — the editorial scrollytelling pattern.
 * 'none' (default) is the existing static side-by-side layout and emits no
 * extra class. Automatically neutralised on the single-column mobile collapse.
 */
type StickyMedia = 'none' | 'on'
/** stickyTop — how far below the viewport top the pinned image rests. */
type StickyTop = 'sm' | 'md' | 'lg'
/**
 * mediaParallax — opt-in scroll parallax. When 'subtle'/'strong', the <img>
 * inside the overflow-hidden media frame drifts vertically against scroll for
 * editorial depth. Orthogonal to stickyMedia (parallax drifts the image inside
 * the frame; sticky pins the whole column). Desktop + motion only; 'off'
 * (default) emits no class, no CSS var and attaches no listeners.
 */
type MediaParallax = 'off' | 'subtle' | 'strong'

const props = defineProps<{
  image?: string
  imageAlt?: string | Record<string, string>
  mediaSide?: MediaSide
  imageRatio?: ImageRatio
  title?: string | Record<string, string>
  body?: string | Record<string, string>
  dividerEnabled?: boolean
  dividerColor?: string
  background?: BackgroundRole
  textTone?: TextRole
  reverseOnMobile?: boolean
  internalPadding?: string
  textAlign?: string
  surfaceStyle?: string
  borderRadius?: string
  stickyMedia?: StickyMedia
  stickyTop?: StickyTop
  mediaParallax?: MediaParallax
}>()

const localizedTitle = computed(() => getLocalizedValue(props.title))
const localizedBody = computed(() => getLocalizedValue(props.body))
const localizedImageAlt = computed(() => getLocalizedValue(props.imageAlt))

const mediaSide = computed((): MediaSide => props.mediaSide || 'left')
const imageRatio = computed((): ImageRatio => props.imageRatio || '50')
const reverseOnMobile = computed(() => props.reverseOnMobile ?? false)

const stickyMediaEnabled = computed(() => props.stickyMedia === 'on')

// Same rem scale as TextSplit's stickyTop, so the two editorial blocks pin at
// consistent offsets. Only surfaced (via rootStyles) when sticky is on.
const STICKY_TOP_MAP: Record<StickyTop, string> = {
  sm: 'var(--spacing-lg, 2rem)',
  md: 'var(--spacing-xl, 3rem)',
  lg: 'calc(var(--spacing-xl, 3rem) * 1.8)',
}

const positionClass = computed(() => `side-by-side--media-${mediaSide.value}`)

const { surfaceStyle: blockSurfaceStyle } = useBlockSurface(props, { fallbackBackground: 'transparent' })

const rootStyles = computed(() => {
  const styles: Record<string, string> = {}
  Object.assign(styles, blockSurfaceStyle.value)
  if (props.surfaceStyle === 'subtle') {
    styles.backgroundColor = 'var(--section-surface, rgba(255,255,255,0.04))'
  } else if (props.surfaceStyle === 'filled') {
    styles.backgroundColor = 'var(--section-accent, rgba(255,255,255,0.1))'
  }
  if (props.borderRadius && props.borderRadius !== 'none') {
    styles.borderRadius = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0'
  }
  // Sticky-media offset var — only emitted when the author opted in, so a
  // default ('none') instance keeps a byte-identical inline style.
  if (stickyMediaEnabled.value) {
    styles['--sbs-sticky-top'] = STICKY_TOP_MAP[props.stickyTop ?? 'md']
  }
  return styles
})

const mediaStyles = computed(() => {
  const ratio = parseInt(imageRatio.value, 10)
  return { flex: `0 0 ${ratio}%` }
})

const dividerStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (props.dividerColor) styles.backgroundColor = props.dividerColor
  return styles
})

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  if (props.textAlign && props.textAlign !== 'left') {
    style.textAlign = props.textAlign
  }
  return style
})

// ── Opt-in scroll parallax (desktop + motion only) ───────────────────────────
// The media-frame image drifts vertically against scroll as the block passes
// through the viewport, for editorial depth. Mirrors ImageBanner's idiom:
// rAF-throttled scroll listener, IntersectionObserver to skip off-screen work,
// matchMedia desktop gate, render-mode + reduced-motion exemptions. Gated behind
// `parallaxActive` so an off / mobile / editor / reduced-motion instance emits
// no class, no CSS var and attaches no listeners — byte-identical. Orthogonal to
// stickyMedia: this drifts the <img> inside the overflow-hidden frame, while
// sticky pins the column.
const mediaEl = ref<HTMLElement | null>(null)
const isDesktop = ref(false)

const mediaParallax = computed((): MediaParallax => props.mediaParallax || 'off')
const parallaxEligible = computed(() => mediaParallax.value !== 'off' && !!props.image)
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
function onDesktopChange(e: MediaQueryListEvent) {
  isDesktop.value = e.matches
}
function measure() {
  const el = mediaEl.value
  if (!el) return
  // The media frame's rect drives BOTH the viewport progress (its travel through
  // the viewport) and the travel magnitude (bounded by its own height), so the CSS
  // headroom (top:-12% / height:124%) always contains the drift.
  const rect = el.getBoundingClientRect()
  const frameH = rect.height
  const vh = window.innerHeight || 1
  const center = rect.top + rect.height / 2
  const denom = (vh + rect.height) / 2 || 1
  const progress = clamp((center - vh / 2) / denom, -1, 1)
  const factor = mediaParallax.value === 'strong' ? 0.10 : 0.06
  const px = -progress * frameH * factor
  el.style.setProperty('--sbs-parallax', px.toFixed(1) + 'px')
}
function onScroll() {
  if (!inView || raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    measure()
  })
}
function attach() {
  if (typeof window === 'undefined') return
  const el = mediaEl.value
  if (!el) return
  io = new IntersectionObserver((entries) => {
    inView = entries[0]?.isIntersecting ?? false
    if (inView) onScroll()
  })
  io.observe(el)
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  nextTick(measure)
}
function reset() {
  mediaEl.value?.style.removeProperty('--sbs-parallax')
}
function detach() {
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
  // Off instances register ZERO listeners and do ZERO work — byte-identical to a
  // block that never had this feature. The matchMedia gate only exists for an
  // eligible instance that may cross the desktop breakpoint.
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
.side-by-side {
  display: flex;
  align-items: stretch;
  gap: var(--spacing-xl, 2.4rem);
  overflow: hidden;

  &--media-right {
    flex-direction: row-reverse;
  }

  &__media {
    flex: 0 0 50%;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: var(--spacing-xl, 2.4rem);
    flex: 1;
  }

  // Opt-in "pinned editorial image" — the media column sticks in view while
  // the taller text column scrolls past it. Gated entirely behind the
  // author-set modifier class, so a default (stickyMedia: 'none') instance is
  // untouched. The section is display:flex align-items:stretch, so the media is
  // reset to align-self:flex-start — a stretched item cannot become sticky.
  &--sticky-media {
    // The base rule clips with `overflow: hidden`, which turns the section into
    // a scroll container and traps position:sticky inside it (never pins to the
    // page). `overflow: clip` clips identically for corner-radius but does NOT
    // establish a scroll container, so the sticky media pins against the page.
    // Only applied when sticky is enabled → default instances keep `hidden`.
    overflow: clip;

    & > .side-by-side__media {
      position: sticky;
      top: var(--sbs-sticky-top, var(--spacing-xl, 3rem));
      align-self: flex-start;
    }
  }

  // Opt-in scroll parallax (parallaxActive === true). The media frame already
  // clips with `overflow: hidden`, so the oversized, drifting <img> stays
  // contained. Gated entirely behind the author-set modifier — a default
  // ('off') instance keeps the base img rule (height:100%; object-fit:cover)
  // and is byte-identical.
  &--parallax-media > .side-by-side__media img {
    height: 124%;
    position: relative;
    top: -12%;
    transform: translate3d(0, var(--sbs-parallax, 0px), 0);
    will-change: transform;
  }

  @media (prefers-reduced-motion: reduce) {
    &--parallax-media > .side-by-side__media img {
      transform: none;
    }
  }

  &__heading {
    font-family: var(--rt-slot-heading-family, var(--rt-role-heading2-family, var(--font-family-heading, inherit)));
    font-weight: var(--rt-slot-heading-weight, var(--rt-role-heading2-weight, var(--font-weight-medium, 500)));
    font-size: var(--rt-slot-heading-size, var(--rt-role-heading2-size, var(--font-size-2xl, 3.5rem)));
    line-height: var(--rt-slot-heading-line-height, var(--rt-role-heading2-line-height, 1.2));
    letter-spacing: var(--rt-slot-heading-letter-spacing, var(--rt-role-heading2-letter-spacing, normal));
    text-transform: var(--rt-slot-heading-text-transform, var(--rt-role-heading2-text-transform, none));
    font-variation-settings: var(--rt-slot-heading-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-heading-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-heading-font-stretch, normal);
    font-style: var(--rt-slot-heading-font-style, normal);
    color: var(--rt-slot-heading-color, var(--rt-role-heading2-color, inherit));
    margin: 0 0 var(--spacing-md, 1.6rem);
  }

  &__body {
    font-family: var(--rt-slot-body-family, var(--rt-role-body-family, inherit));
    font-size: var(--rt-slot-body-size, var(--rt-role-body-size, var(--font-size-base, 1.5rem)));
    font-weight: var(--rt-slot-body-weight, var(--rt-role-body-weight, inherit));
    line-height: var(--rt-slot-body-line-height, var(--rt-role-body-line-height, var(--line-height-base, 1.5)));
    letter-spacing: var(--rt-slot-body-letter-spacing, var(--rt-role-body-letter-spacing, normal));
    text-transform: var(--rt-slot-body-text-transform, var(--rt-role-body-text-transform, none));
    font-variation-settings: var(--rt-slot-body-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-body-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-body-font-stretch, normal);
    font-style: var(--rt-slot-body-font-style, normal);
    color: var(--rt-slot-body-color, var(--rt-role-body-color, inherit));
    margin: 0 0 var(--spacing-md, 1.6rem);
  }

  &__divider {
    width: 6rem;
    height: 0.3rem;
    background-color: var(--color-primary, #108A00);
    margin-top: var(--spacing-sm, 0.8rem);
  }

  @container (max-width: #{$bp-md}) {
    flex-direction: column;

    &--media-right {
      flex-direction: column;
    }

    &--reverse-mobile {
      flex-direction: column-reverse;

      &.side-by-side--media-right {
        flex-direction: column-reverse;
      }
    }

    &__media {
      flex: 0 0 auto;
    }

    // Never pin in the stacked single-column view — a sticky image would
    // overlap the text stacked beneath it. No-op unless a sticky modifier
    // opted in above.
    &--sticky-media &__media {
      position: static;
    }
  }
}
</style>
