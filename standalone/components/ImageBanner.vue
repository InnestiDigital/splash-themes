<template>
  <section class="image-banner" :class="[`image-banner--${width}`, `image-banner--display-${displayMode}`, `image-banner--hover-${hoverEffect}`, `image-banner--caption-${captionPosition}`, parallaxActive ? `image-banner--parallax image-banner--parallax-${props.parallax}` : '']" :style="contentStyle">
    <figure ref="figureEl" class="image-banner__figure">
      <div ref="wrapperEl" data-target="media" class="image-banner__wrapper" :style="wrapperStyles">
        <component
          :is="wrapperTag"
          v-bind="wrapperAttrs"
          class="image-banner__link"
          :class="{ 'image-banner__link--zoom': lightboxActive }"
        >
          <img
            v-if="image"
            :src="image"
            :alt="localizedAlt"
            class="image-banner__image"
            :style="imageStyle"
            loading="lazy"
            data-target="media"
          />
          <span v-if="lightboxActive && image" class="image-banner__zoom-hint" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false"><path d="M15 3h6v6M21 3l-7 7M9 21H3v-6M3 21l7-7" /></svg>
          </span>
          <div v-if="!image" class="image-banner__placeholder" aria-hidden="true">
            <span class="material-icons-outlined">image</span>
            <span>{{ $t('imageBanner.noImage', 'No image selected') }}</span>
          </div>
        </component>
      </div>
      <figcaption
        v-if="hasOverlayTitle"
        data-target="caption"
        class="image-banner__caption image-banner__caption--rich"
        :class="`image-banner__caption--${captionAlign}`"
      >
        <p class="image-banner__overlay-title">{{ localizedOverlayTitle }}</p>
        <div v-if="hasCaption" class="image-banner__overlay-caption" v-html="asHtml(localizedCaption)" />
      </figcaption>
      <figcaption
        v-else-if="hasCaption"
        data-target="caption"
        class="image-banner__caption"
        :class="`image-banner__caption--${captionAlign}`"
        v-html="asHtml(localizedCaption)"
      />
    </figure>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { focalPointToObjectPosition, isFocalPointToken } from '~/shared/features/cms/media/artDirection'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'
import { asHtml } from '~/shared/utils/asHtml'

const { getLocalizedValue } = useLocalized()
const mode = useRenderMode()
const { isReducedMotion } = useReducedMotion()
const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  blocks?: Array<Record<string, unknown>>
  image?: string
  altText?: string | Record<string, string>
  caption?: string | Record<string, string>
  overlayTitle?: string | Record<string, string>
  captionAlign?: 'left' | 'center' | 'right'
  captionPosition?: 'below' | 'overlay'
  linkUrl?: string
  enableLightbox?: boolean
  lightboxGroup?: string
  width?: 'full' | 'contained'
  displayMode?: 'featured' | 'inline'
  aspectRatio?: string
  parallax?: 'off' | 'subtle' | 'strong'
  focalPoint?: string
  focalPointMobile?: string
  borderRadius?: string
  internalPadding?: string
  hoverEffect?: 'none' | 'zoom'
}>(), {
  enableLightbox: false,
  hoverEffect: 'zoom',
  width: 'full',
  displayMode: 'featured',
  aspectRatio: 'auto',
  parallax: 'off',
  focalPoint: 'center',
  focalPointMobile: 'inherit',
  borderRadius: 'none',
  internalPadding: 'none',
  captionAlign: 'left',
  captionPosition: 'below',
})

const localizedAlt = computed(() => getLocalizedValue(props.altText) || 'Banner image')
const localizedCaption = computed(() => getLocalizedValue(props.caption))
const hasCaption = computed(() => typeof localizedCaption.value === 'string' && localizedCaption.value.trim().length > 0)
// Opt-in editorial title rendered over the image (overlay caption mode only).
// Gated so an empty title or a below-mode banner emits the current markup exactly.
const localizedOverlayTitle = computed(() => getLocalizedValue(props.overlayTitle))
const hasOverlayTitle = computed(() =>
  props.captionPosition === 'overlay'
  && typeof localizedOverlayTitle.value === 'string'
  && localizedOverlayTitle.value.trim().length > 0,
)
const isExternal = computed(() => props.linkUrl?.startsWith('http'))

const resolvedLinkComponent = computed(() => isExternal.value ? 'a' : 'NuxtLink')

// Lightbox only applies to a public, image-bearing banner with no competing
// link — a link and a fullscreen trigger on the same element would conflict,
// and clicks in the editor preview must keep selecting the block.
const lightboxActive = computed(() =>
  props.enableLightbox && !!props.image && !props.linkUrl && mode.value !== 'editor-preview',
)

const wrapperTag = computed(() => {
  if (props.linkUrl) return resolvedLinkComponent.value
  return lightboxActive.value ? 'button' : 'div'
})

const wrapperAttrs = computed<Record<string, unknown>>(() => {
  if (props.linkUrl) {
    return isExternal.value
      ? { href: props.linkUrl, target: '_blank', rel: 'noopener noreferrer' }
      : { to: props.linkUrl }
  }
  if (lightboxActive.value) {
    return {
      type: 'button',
      'aria-label': `View image full screen: ${localizedAlt.value}`,
      // Custom-cursor affordance: hovering a lightbox image shows a "View" cursor
      // (CursorLayer reads these attrs; no-ops when the cursor is disabled).
      'data-cursor-label': 'View',
      'data-lightbox': '',
      'data-lightbox-src': props.image,
      'data-lightbox-alt': localizedAlt.value,
      'data-lightbox-caption': localizedAlt.value,
      'data-lightbox-group': props.lightboxGroup?.trim() || undefined,
    }
  }
  return {}
})

const aspectRatioMap: Record<string, string> = {
  '16:9': '56.25%',
  '4:3': '75%',
  '21:9': '42.86%',
  '3:1': '33.33%',
}

const wrapperStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (props.aspectRatio && props.aspectRatio !== 'auto' && aspectRatioMap[props.aspectRatio]) {
    styles.paddingBottom = aspectRatioMap[props.aspectRatio]
    styles.position = 'relative'
    styles.overflow = 'hidden'
  }
  if (props.borderRadius && props.borderRadius !== 'none') {
    styles.borderRadius = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0'
  }
  return styles
})

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  return style
})

// ── Responsive focal-point art direction ─────────────────────────────────────
// The banner image is object-fit:cover, so a fixed aspect ratio (or the featured
// full-bleed box) always crops it 50% 50% (dead centre) and can cut a subject
// off — worst on tall mobile crops. These two controls let an author pick WHICH
// part stays in view, plus an optional DISTINCT focal point on small screens.
// Emitted purely as CSS vars, and ONLY when a value deviates from its default:
// focalPoint 'center' (= 50% 50%, the native crop) and focalPointMobile
// 'inherit' both yield an EMPTY style object, so Vue renders no `style` attribute
// and an untouched instance is byte-identical. The scoped rule falls back to
// `50% 50%` when `--ib-focal` is absent (a visual no-op equal to the current
// centre crop), and the mobile rule falls back to the desktop var — so the
// default output is unchanged in markup AND in pixels. Mirrors the parallax
// block's "no class / no var / no work when default" guarantee above.
//
// `focalPoint` is the shared `media-art-direction` vocabulary; `focalPointMobile`
// stays local because it adds `inherit`, a value only a block with a distinct
// mobile crop has any use for. Both resolve through the same map.
const imageStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.focalPoint && props.focalPoint !== 'center' && isFocalPointToken(props.focalPoint)) {
    style['--ib-focal'] = focalPointToObjectPosition(props.focalPoint)
  }
  if (props.focalPointMobile && props.focalPointMobile !== 'inherit' && isFocalPointToken(props.focalPointMobile)) {
    style['--ib-focal-mobile'] = focalPointToObjectPosition(props.focalPointMobile)
  }
  return style
})

// ── Opt-in scroll parallax (desktop + motion + fixed-ratio only) ─────────────
// The banner image drifts vertically against scroll as the block passes through
// the viewport, for editorial depth. Mirrors the StackedCards scroll idiom:
// rAF-throttled scroll listener, IntersectionObserver to skip off-screen work,
// matchMedia desktop gate, render-mode + reduced-motion exemptions. Gated behind
// `parallaxActive` so an off / mobile / editor / reduced-motion / auto-ratio
// instance emits no class, no CSS var and attaches no listeners — byte-identical.
const figureEl = ref<HTMLElement | null>(null)
const wrapperEl = ref<HTMLElement | null>(null)
const isDesktop = ref(false)

const parallaxEligible = computed(
  () => props.parallax !== 'off' && props.aspectRatio !== 'auto' && !!aspectRatioMap[props.aspectRatio ?? ''],
)
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
  const fig = figureEl.value
  const wrap = wrapperEl.value
  if (!fig || !wrap) return
  const rect = fig.getBoundingClientRect()
  // Viewport progress uses the figure rect (full block travel through the
  // viewport); travel MAGNITUDE is bounded by the WRAPPER height — the CSS
  // headroom (top:-12% / height:124%) is defined against the wrapper, so a
  // tall below-caption never lets a 10%-of-figure translate exceed it.
  const wrapH = wrap.getBoundingClientRect().height || rect.height
  const vh = window.innerHeight || 1
  const center = rect.top + rect.height / 2
  const denom = (vh + rect.height) / 2 || 1
  const progress = clamp((center - vh / 2) / denom, -1, 1)
  const factor = props.parallax === 'strong' ? 0.10 : 0.06
  const px = -progress * wrapH * factor
  wrap.style.setProperty('--ib-parallax', px.toFixed(1) + 'px')
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
  const fig = figureEl.value
  if (!fig) return
  io = new IntersectionObserver((entries) => {
    inView = entries[0]?.isIntersecting ?? false
    if (inView) onScroll()
  })
  io.observe(fig)
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  nextTick(measure)
}
function reset() {
  wrapperEl.value?.style.removeProperty('--ib-parallax')
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
  // Off / auto-ratio instances register ZERO listeners and do ZERO work —
  // byte-identical to a banner that never had this feature. The matchMedia
  // gate only exists for an eligible instance that may cross the desktop bp.
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
.image-banner {
  // ## Width authority
  // Outer scaffold width defers to --block-width-authority (fallback = old 120rem)
  // and inner (inline display) measure to --block-measure (fallback = old 60rem) so a
  // section / PlacementWrapper layoutConstraints can override the page-scaffold width
  // via the var contract WITHOUT piercing scoped styles. Default behavior is identical.
  &--full {
    width: 100%;
  }

  &--contained {
    max-width: var(--block-width-authority, 120rem);
    margin: 0 auto;
    padding: 0 var(--spacing-md);
  }

  &--display-featured {
    // Default full-width behavior (no additional styles needed)
  }

  &--display-inline {
    max-width: var(--block-measure, 60rem);
    margin-inline: var(--block-measure-align, auto);
  }

  &__figure {
    margin: 0;
  }

  &__caption {
    margin-top: var(--spacing-sm);
    font-family: var(--rt-role-caption-family, inherit);
    font-size: var(--rt-role-caption-size, var(--font-size-sm));
    line-height: var(--rt-role-caption-line-height, var(--line-height-normal, 1.5));
    color: var(--rt-role-caption-color, var(--color-text-light));

    &--left { text-align: left; }
    &--center { text-align: center; }
    &--right { text-align: right; }

    a {
      color: inherit;
      text-decoration: underline;
    }
  }

  &__wrapper {
    overflow: hidden;
  }

  &__link {
    display: block;
    text-decoration: none;
  }

  // Lightbox trigger — reset native <button> chrome so the banner looks
  // identical to the non-interactive variant, then add a zoom affordance.
  &__link--zoom {
    position: relative;
    width: 100%;
    margin: 0;
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    text-align: inherit;
    cursor: zoom-in;
    -webkit-appearance: none;
    appearance: none;

    &:focus-visible {
      outline: 0.3rem solid var(--color-accent, #ff8614);
      outline-offset: 0.3rem;
    }
  }

  &__zoom-hint {
    position: absolute;
    top: 1.2rem;
    right: 1.2rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    background: rgba(10, 12, 14, 0.55);
    color: #fff;
    opacity: 0;
    transform: scale(0.85);
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: none;
    backdrop-filter: blur(2px);

    svg {
      width: 1.8rem;
      height: 1.8rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  }

  &__link--zoom:hover &__zoom-hint,
  &__link--zoom:focus-visible &__zoom-hint {
    opacity: 1;
    transform: scale(1);
  }

  @media (prefers-reduced-motion: reduce) {
    &__zoom-hint {
      transition: none;
    }
  }

  &--hover-zoom {
    .image-banner__image {
      transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
      will-change: transform;
    }

    .image-banner__wrapper:hover .image-banner__image {
      transform: scale(1.045);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &--hover-zoom {
      .image-banner__image { transition: none; }
      .image-banner__wrapper:hover .image-banner__image { transform: none; }
    }
  }

  &__image {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    // Focal-point crop. `--ib-focal` is only ever set by imageStyle when the
    // author picks a non-centre focal point; absent it resolves to `50% 50%`,
    // identical to the default centre crop — a pure no-op for existing banners.
    object-position: var(--ib-focal, 50% 50%);

    .image-banner__wrapper[style*="padding-bottom"] & {
      position: absolute;
      inset: 0;
    }
  }

  // Distinct small-screen focal point (opt-in). `--ib-focal-mobile` is only set
  // when the author chooses one; otherwise it falls back to the desktop var,
  // then to `50% 50%` — so a default instance keeps the current centre crop.
  @container (max-width: #{$bp-md}) {
    &__image {
      object-position: var(--ib-focal-mobile, var(--ib-focal, 50% 50%));
    }
  }

  // When an aspect ratio is set the wrapper uses the padding-bottom trick and
  // its children are absolutely positioned — the trigger must fill the wrapper
  // (otherwise the <button> collapses to 0 height and can't be clicked).
  &__wrapper[style*="padding-bottom"] &__link--zoom {
    position: absolute;
    inset: 0;
  }

  &__placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    min-height: 20rem;
    background-color: var(--color-background-light);
    color: var(--color-text-lighter);

    .material-icons-outlined {
      font-size: var(--font-size-4xl);
    }
  }

  // ## Overlay caption mode (opt-in, captionPosition === 'overlay')
  // Magazine-style caption laid over the image bottom on a gradient scrim.
  // Entirely gated behind this modifier — the default below-mode path above is
  // untouched when the class is absent, preserving byte-identical existing output.
  &--caption-overlay {
    .image-banner__figure {
      position: relative;
    }

    .image-banner__caption {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      margin-top: 0;
      padding: var(--spacing-lg) var(--spacing-md) var(--spacing-md);
      padding-block-start: calc(var(--spacing-xl) + var(--spacing-lg)); // room for the scrim fade
      color: #fff;
      background: linear-gradient(
        to top,
        rgba(10, 12, 14, 0.78) 0%,
        rgba(10, 12, 14, 0.45) 45%,
        rgba(10, 12, 14, 0) 100%
      );
      font-size: clamp(var(--font-size-sm), 2.4vw, var(--font-size-md, 1.125rem));
      line-height: var(--line-height-normal, 1.4);
      // Decorative text over the image — let clicks fall through to the
      // link / lightbox trigger underneath. Inner links re-enable below.
      pointer-events: none;

      a {
        pointer-events: auto;
        color: #fff;
      }
    }

    // Editorial title-card variant: a prominent title line over the same scrim,
    // above the caption. Only present when hasOverlayTitle gates the --rich
    // figcaption, so the plain overlay caption above is untouched.
    .image-banner__caption--rich {
      // Extra scrim headroom for the taller title + caption stack.
      padding-block-start: calc(var(--spacing-xl) + var(--spacing-xl));
    }

    .image-banner__overlay-title {
      display: block;
      margin: 0 0 var(--spacing-xs, 0.4rem);
      font-family: var(--rt-role-heading2-family, var(--font-family-heading, inherit));
      font-weight: 600;
      font-size: clamp(var(--font-size-lg, 2.2rem), 4.5vw, var(--font-size-2xl, 3.6rem));
      line-height: var(--line-height-tight, 1.15);
      letter-spacing: -0.01em;
      color: #fff;
      text-wrap: balance;
    }

    .image-banner__overlay-caption {
      display: block; // caption keeps the overlay font-size from the parent figcaption rule
    }
  }

  // ## Opt-in scroll parallax (parallaxActive === true)
  // Gated entirely behind the modifier so the default path is untouched.
  &--parallax {
    .image-banner__image {
      will-change: transform;
      transform: translate3d(0, var(--ib-parallax, 0px), 0);
    }
  }

  // The image needs headroom to travel without exposing wrapper edges. In aspect-ratio
  // mode the base rule sets position:absolute; inset:0 — override to an oversized, centered image.
  &--parallax .image-banner__wrapper[style*="padding-bottom"] .image-banner__image {
    inset: auto 0 auto 0;
    top: -12%;
    height: 124%;
  }

  @media (prefers-reduced-motion: reduce) {
    &--parallax .image-banner__image { transform: none; }
  }
}
</style>
