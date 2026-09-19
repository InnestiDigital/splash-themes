<template>
  <!-- Standard variant: full-bleed hero with overlay/gradient/parallax -->
  <section
    v-if="variant === 'standard'"
    ref="standardRootRef"
    class="hero-block hero-block--standard"
    :class="[
      `hero-block--${heightValue}`,
      textAlign ? `hero-block--align-${textAlign}` : null,
      { 'hero-block--has-overlay': overlay },
      { 'hero-block--full-viewport': fullViewport },
      { 'hero-block--wordmark': displayWordmark },
      { 'hero-block--slideshow-zoom': slideshowActive && slideshowKenBurns },
      { 'hero-block--pointer-parallax': pointerParallaxActive },
      pointerParallaxActive ? `hero-block--pointer-parallax-${pointerParallaxValue}` : null,
    ]"
    :style="sectionStyles"
  >
    <div class="hero-block__media" data-target="media" :style="mediaStyles" aria-hidden="true">
      <!-- Cover slideshow: opt-in cross-fading slide layers. Only present when
           2+ slideshow images are set; otherwise this div has NO children and
           mediaStyles paints backgroundImage exactly as before (parity gate). -->
      <template v-if="slideshowActive">
        <div
          v-for="(src, i) in slides"
          :key="i"
          class="hero-block__slide"
          :class="{ 'is-active': i === activeSlide }"
          :style="{ backgroundImage: 'url(' + src + ')' }"
        />
      </template>
    </div>
    <div v-if="overlay" class="hero-block__overlay" data-target="overlay" aria-hidden="true" :style="overlayStyles" />
    <template v-if="overlayGradientDirectionValue !== 'none'">
      <div
        v-if="overlayGradientDirectionValue === 'top' || overlayGradientDirectionValue === 'both'"
        class="hero-block__gradient hero-block__gradient--top"
        aria-hidden="true"
        :style="gradientTopStyle"
      />
      <div
        v-if="overlayGradientDirectionValue === 'bottom' || overlayGradientDirectionValue === 'both'"
        class="hero-block__gradient hero-block__gradient--bottom"
        aria-hidden="true"
        :style="gradientBottomStyle"
      />
    </template>

    <div ref="standardContentRef" class="hero-block__content" :style="standardContentStyle">
      <h1 v-if="title" ref="standardTitleRef" class="hero-block__title" data-target="heading" :style="heroTextStyles" v-html="asHtml(localizedTitle)"></h1>

      <p v-if="subtitle" class="hero-block__subtitle" data-target="subheading" :style="heroTextStyles" v-html="asHtml(localizedSubtitle)"></p>

      <div v-if="body" class="hero-block__body prose" data-target="body" :style="heroTextStyles" v-html="asHtml(localizedBody)"></div>

      <a
        v-if="ctaText && ctaUrl"
        :href="ctaUrl"
        class="hero-block__cta"
        :class="`hero-block__cta--${ctaStyleValue}`"
        data-target="cta"
        @click.prevent="handleCtaClick"
      >
        {{ localizedCtaText }}
      </a>
    </div>

      <template v-if="scrollCueValue !== 'none'">
        <!-- Interactive: opt-in smooth-scroll to the next section. -->
        <button
          v-if="scrollCueInteractive"
          type="button"
          class="hero-block__scroll-cue hero-block__scroll-cue--interactive"
          :class="`hero-block__scroll-cue--${scrollCueValue}`"
          :style="scrollCueStyle"
          :aria-label="scrollCueAriaLabel"
          @click="handleScrollCueClick"
        >
          <span v-if="localizedScrollCueLabel" class="hero-block__scroll-cue-label" aria-hidden="true">{{ localizedScrollCueLabel }}</span>
          <svg
            v-if="scrollCueValue === 'chevron'"
            class="hero-block__scroll-cue-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M5 8l7 7 7-7" />
            <path class="hero-block__scroll-cue-chev2" d="M5 13l7 7 7-7" />
          </svg>
          <span v-else class="hero-block__scroll-cue-track" aria-hidden="true"></span>
        </button>
        <!-- Decorative (default): byte-identical to the original cue markup. -->
        <div
          v-else
          class="hero-block__scroll-cue"
          :class="`hero-block__scroll-cue--${scrollCueValue}`"
          :style="scrollCueStyle"
          aria-hidden="true"
        >
          <span v-if="localizedScrollCueLabel" class="hero-block__scroll-cue-label">{{ localizedScrollCueLabel }}</span>
          <svg
            v-if="scrollCueValue === 'chevron'"
            class="hero-block__scroll-cue-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M5 8l7 7 7-7" />
            <path class="hero-block__scroll-cue-chev2" d="M5 13l7 7 7-7" />
          </svg>
          <span v-else class="hero-block__scroll-cue-track" aria-hidden="true"></span>
        </div>
      </template>
  </section>

  <!-- Editorial variant: two-column magazine masthead (content + full-bleed media) -->
  <section
    v-else-if="variant === 'editorial'"
    class="hero-block hero-block--editorial"
    :class="[
      `hero-block--${heightValue}`,
      `hero-block--media-${mediaSideValue}`,
      `hero-block--editorial-ratio-${editorialMediaRatioValue}`,
      {
        'hero-block--full-viewport': fullViewport,
        'hero-block--editorial-no-media': !backgroundImage,
      },
    ]"
    :data-collapse="collapse"
  >
    <div class="hero-block__editorial-grid">
      <div class="hero-block__editorial-content" :style="standardContentStyle">
        <p v-if="localizedEyebrow" class="hero-block__editorial-eyebrow">{{ localizedEyebrow }}</p>

        <h1 v-if="title" class="hero-block__editorial-title" data-target="heading" v-html="asHtml(localizedTitle)"></h1>

        <p v-if="subtitle" class="hero-block__editorial-subtitle" data-target="subheading" v-html="asHtml(localizedSubtitle)"></p>

        <div v-if="body" class="hero-block__editorial-body prose" data-target="body" v-html="asHtml(localizedBody)"></div>

        <a
          v-if="ctaText && ctaUrl"
          :href="ctaUrl"
          class="hero-block__cta hero-block__editorial-cta"
          :class="`hero-block__cta--${ctaStyleValue}`"
          data-target="cta"
          @click.prevent="handleCtaClick"
        >
          {{ localizedCtaText }}
        </a>
      </div>

      <!-- Only render the media column when there is an image: without the
           v-if an image-less editorial hero paints an empty aspect-ratio'd
           surface — half the hero blank on desktop, a blank band ABOVE the
           headline on mobile (order:-1). -->
      <div v-if="backgroundImage" class="hero-block__editorial-media" data-target="media" :style="editorialMediaStyle" aria-hidden="true" />
    </div>

    <template v-if="scrollCueValue !== 'none'">
      <!-- Interactive: opt-in smooth-scroll to the next section. -->
      <button
        v-if="scrollCueInteractive"
        type="button"
        class="hero-block__scroll-cue hero-block__scroll-cue--interactive"
        :class="`hero-block__scroll-cue--${scrollCueValue}`"
        :style="scrollCueStyle"
        :aria-label="scrollCueAriaLabel"
        @click="handleScrollCueClick"
      >
        <span v-if="localizedScrollCueLabel" class="hero-block__scroll-cue-label" aria-hidden="true">{{ localizedScrollCueLabel }}</span>
        <svg
          v-if="scrollCueValue === 'chevron'"
          class="hero-block__scroll-cue-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M5 8l7 7 7-7" />
          <path class="hero-block__scroll-cue-chev2" d="M5 13l7 7 7-7" />
        </svg>
        <span v-else class="hero-block__scroll-cue-track" aria-hidden="true"></span>
      </button>
      <!-- Decorative (default). -->
      <div
        v-else
        class="hero-block__scroll-cue"
        :class="`hero-block__scroll-cue--${scrollCueValue}`"
        :style="scrollCueStyle"
        aria-hidden="true"
      >
        <span v-if="localizedScrollCueLabel" class="hero-block__scroll-cue-label">{{ localizedScrollCueLabel }}</span>
        <svg
          v-if="scrollCueValue === 'chevron'"
          class="hero-block__scroll-cue-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M5 8l7 7 7-7" />
          <path class="hero-block__scroll-cue-chev2" d="M5 13l7 7 7-7" />
        </svg>
        <span v-else class="hero-block__scroll-cue-track" aria-hidden="true"></span>
      </div>
    </template>
  </section>

  <!-- Promotion variant: compact CTA banner with optional countdown -->
  <div v-else class="hero-block hero-block--promotion" :style="promotionBannerStyles">
    <div v-if="backgroundImage" data-target="media" class="hero-block__promotion-background" aria-hidden="true">
      <img :src="backgroundImage" alt="" />
    </div>

    <div class="hero-block__promotion-overlay" aria-hidden="true"></div>

    <div class="hero-block__promotion-content" :style="promotionContentStyle">
      <h2 v-if="localizedTitle" data-target="heading" class="hero-block__promotion-title" v-html="asHtml(localizedTitle)"></h2>

      <div v-if="localizedDescription" data-target="body" class="hero-block__promotion-description prose" v-html="asHtml(localizedDescription)"></div>

      <div
        v-if="showCountdown && timeLeft"
        class="hero-block__countdown"
        aria-live="polite"
        :aria-label="$t('promotion.countdownLabel', 'Time remaining')"
      >
        <div class="hero-block__countdown-item">
          <span class="hero-block__countdown-value">{{ timeLeft.days }}</span>
          <span class="hero-block__countdown-label">{{ $t('common.days', 'Days') }}</span>
        </div>
        <div class="hero-block__countdown-item">
          <span class="hero-block__countdown-value">{{ timeLeft.hours }}</span>
          <span class="hero-block__countdown-label">{{ $t('common.hours', 'Hours') }}</span>
        </div>
        <div class="hero-block__countdown-item">
          <span class="hero-block__countdown-value">{{ timeLeft.minutes }}</span>
          <span class="hero-block__countdown-label">{{ $t('common.minutes', 'Minutes') }}</span>
        </div>
        <div class="hero-block__countdown-item">
          <span class="hero-block__countdown-value">{{ timeLeft.seconds }}</span>
          <span class="hero-block__countdown-label">{{ $t('common.seconds', 'Seconds') }}</span>
        </div>
      </div>

      <NuxtLink
        v-if="localizedCtaText && ctaUrl"
        :to="ctaUrl"
        data-target="cta"
        class="hero-block__promotion-cta"
      >
        {{ localizedCtaText }}
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { BackgroundRole, TextRole } from '~/shared/types/placement'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { asHtml } from '~/shared/utils/asHtml'
import { useBlockSurface } from '~/shared/composables/useBlockSurface'
import { hexToRgb } from '~/shared/utils/hexToRgb'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useViewport } from '~/shared/composables/useViewport'
import { isMobileViewport } from '~/shared/features/cms/composition/responsive'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'

const { getLocalizedValue } = useLocalized()
type Variant = 'standard' | 'promotion' | 'editorial'
type TextAlign = 'left' | 'center' | 'right'
type Height = 'compact' | 'small' | 'medium' | 'large' | 'viewport'
type CtaStyle = 'primary' | 'secondary' | 'outline'
type GradientDirection = 'none' | 'top' | 'bottom' | 'both'
type ScrollCue = 'none' | 'chevron' | 'line'
type ScrollCueAction = 'decorative' | 'scrollToNext'
type PointerParallax = 'off' | 'subtle' | 'strong'
type MediaSide = 'left' | 'right'
type EditorialMediaRatio = 'portrait' | 'landscape' | 'square'

const props = withDefaults(defineProps<{
  variant?: Variant
  // Shared
  title?: string | Record<string, string>
  backgroundImage?: string
  background?: BackgroundRole
  ctaText?: string | Record<string, string>
  ctaUrl?: string
  internalPadding?: string
  contentAlignH?: string
  // Standard variant
  subtitle?: string | Record<string, string>
  body?: string | Record<string, string>
  textTone?: TextRole
  textAlign?: TextAlign
  height?: Height
  overlay?: boolean
  overlayColor?: string
  overlayOpacity?: number
  fullViewport?: boolean
  scrollCue?: ScrollCue
  scrollCueLabel?: string | Record<string, string>
  scrollCueAction?: ScrollCueAction
  displayWordmark?: boolean
  ctaStyle?: CtaStyle
  parallaxIntensity?: number
  pointerParallax?: PointerParallax
  // Cover slideshow (standard variant) — 2+ images cross-fade behind the hero.
  slideshowImages?: Array<{ image?: string | { url: string } }>
  slideshowInterval?: number
  slideshowKenBurns?: boolean
  overlayGradientDirection?: GradientDirection
  overlayGradientOpacity?: number
  overlayGradientColor?: string
  contentAlignV?: string
  // Promotion variant
  description?: string | Record<string, string>
  showCountdown?: boolean
  endDate?: string
  surfaceStyle?: string
  borderRadius?: string
  // Editorial variant
  editorialEyebrow?: string | Record<string, string>
  mediaSide?: MediaSide
  editorialMediaRatio?: EditorialMediaRatio
}>(), {
  variant: 'standard',
  showCountdown: false,
  scrollCueAction: 'decorative',
})

const router = useRouter()
const { t } = useI18n()

const variant = computed<Variant>(() => props.variant || 'standard')

const localizedTitle = computed(() => getLocalizedValue(props.title))
const localizedSubtitle = computed(() => getLocalizedValue(props.subtitle))
const localizedBody = computed(() => getLocalizedValue(props.body))
const localizedDescription = computed(() => getLocalizedValue(props.description))
const localizedCtaText = computed(() => getLocalizedValue(props.ctaText))
const localizedEyebrow = computed(() => getLocalizedValue(props.editorialEyebrow))

// =====================================================================
// Standard variant — parallax + overlay + gradient
// =====================================================================

// Parallax (standard only)
const parallaxOffset = ref(0)
let rafId: number | null = null

function onScroll() {
  if (rafId !== null) return
  rafId = requestAnimationFrame(() => {
    parallaxOffset.value = window.scrollY
    rafId = null
  })
}

onMounted(() => {
  if (variant.value === 'standard' && (props.parallaxIntensity ?? 0) > 0) {
    window.addEventListener('scroll', onScroll, { passive: true })
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  if (rafId !== null) cancelAnimationFrame(rafId)
})

// =====================================================================
// Cover slideshow (standard variant) — opt-in cross-fade background
// =====================================================================
// Parity gate: with no (or a single) slideshow image, `slideshowActive` is
// false, the media div renders with zero children, mediaStyles is unchanged,
// and no timer/listener is ever registered — DOM + style are byte-identical to
// a pre-slideshow instance. The behaviour only turns on at 2+ images.
const renderMode = useRenderMode()
const isEditor = computed(() => renderMode.value === 'editor-preview')

function resolveSlide(v: string | { url: string } | undefined): string {
  if (!v) return ''
  if (typeof v === 'string') return v
  return v.url || ''
}

const slides = computed<string[]>(() =>
  (props.slideshowImages ?? []).map((s) => resolveSlide(s?.image)).filter(Boolean),
)
const slideshowActive = computed(() => variant.value === 'standard' && slides.value.length >= 2)
const slideshowKenBurns = computed(() => props.slideshowKenBurns ?? false)

const activeSlide = ref(0)
let slideTimer: ReturnType<typeof setInterval> | null = null

function startSlideshow() {
  stopSlideshow()
  if (!slideshowActive.value) return
  // No auto-cycle in the editor preview (a click selects the block); hold the
  // first slide for reduced-motion visitors.
  if (isEditor.value) return
  if (prefersReducedMotion()) return
  const ms = Math.max(3, Math.min(12, props.slideshowInterval ?? 6)) * 1000
  slideTimer = setInterval(() => {
    activeSlide.value = (activeSlide.value + 1) % slides.value.length
  }, ms)
}

function stopSlideshow() {
  if (slideTimer !== null) {
    clearInterval(slideTimer)
    slideTimer = null
  }
}

// Pause the timer while the tab is hidden; resume on return (only while active).
function onSlideshowVisibility() {
  if (!slideshowActive.value) return
  if (document.visibilityState === 'hidden') {
    stopSlideshow()
  } else {
    startSlideshow()
  }
}

onMounted(() => {
  startSlideshow()
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onSlideshowVisibility)
  }
})

onUnmounted(() => {
  stopSlideshow()
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onSlideshowVisibility)
  }
})

// Live edits in the admin preview (adding/removing images, toggling editor
// mode) re-seed the sequence cleanly: reset to the first slide and restart.
watch(
  [slideshowActive, () => slides.value.length, isEditor],
  () => {
    activeSlide.value = 0
    startSlideshow()
  },
)

// =====================================================================
// Pointer parallax (standard only) — opt-in foreground drift + tilt.
// =====================================================================
// Distinct from the background *scroll* parallax above: this nudges the
// FOREGROUND hero content (the giant wordmark) a few px toward the cursor
// with a fractional perspective tilt. Desktop hover/fine-pointer devices
// only; exempt in the editor preview and under reduced motion. Off by
// default → no modifier class, no CSS var, no listener is ever attached,
// so a non-opted instance is byte-identical to a pre-feature hero.
const standardRootRef = ref<HTMLElement | null>(null)
const pointerParallaxValue = computed<PointerParallax>(() => props.pointerParallax || 'off')

const pointerParallaxActive = computed(() => {
  if (pointerParallaxValue.value === 'off') return false
  if (variant.value !== 'standard') return false
  // A pointer-follow would fight block selection in the admin preview.
  if (isEditor.value) return false
  if (typeof window === 'undefined') return false
  if (prefersReducedMotion()) return false
  // Desktop pointer devices only — never on touch / coarse pointers.
  return window.matchMedia?.('(hover: hover) and (pointer: fine)').matches === true
})

let pointerRafId: number | null = null

function onHeroPointerMove(ev: PointerEvent) {
  const el = standardRootRef.value
  if (!el) return
  if (pointerRafId !== null) return
  const { clientX, clientY } = ev
  pointerRafId = requestAnimationFrame(() => {
    pointerRafId = null
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    // Normalise the cursor to roughly -0.5..0.5 across the hero box.
    const nx = (clientX - rect.left) / rect.width - 0.5
    const ny = (clientY - rect.top) / rect.height - 0.5
    el.style.setProperty('--hero-pointer-x', nx.toFixed(4))
    el.style.setProperty('--hero-pointer-y', ny.toFixed(4))
  })
}

function onHeroPointerLeave() {
  if (pointerRafId !== null) {
    cancelAnimationFrame(pointerRafId)
    pointerRafId = null
  }
  const el = standardRootRef.value
  if (!el) return
  // Return-to-centre; the CSS transition on the content eases it back.
  el.style.setProperty('--hero-pointer-x', '0')
  el.style.setProperty('--hero-pointer-y', '0')
}

onMounted(() => {
  // Early-return attaches ZERO listeners when inactive (default / touch /
  // reduced-motion / editor), matching the scroll-parallax gate above.
  if (!pointerParallaxActive.value) return
  const el = standardRootRef.value
  if (!el) return
  el.addEventListener('pointermove', onHeroPointerMove, { passive: true })
  el.addEventListener('pointerleave', onHeroPointerLeave, { passive: true })
})

onBeforeUnmount(() => {
  const el = standardRootRef.value
  if (el) {
    el.removeEventListener('pointermove', onHeroPointerMove)
    el.removeEventListener('pointerleave', onHeroPointerLeave)
  }
  if (pointerRafId !== null) {
    cancelAnimationFrame(pointerRafId)
    pointerRafId = null
  }
})

// Null when block has no explicit alignment — preset/role typography cascade wins.
const textAlign = computed<TextAlign | null>(() => props.textAlign || null)
const heightValue = computed((): Height => props.height || 'large')
const ctaStyleValue = computed((): CtaStyle => props.ctaStyle || 'primary')
// The hero paints three surfaces — the standard media layer, the editorial
// media column and the promotion banner. All three fell back to `section` when
// the block carried no background, so one resolver instance serves them all;
// the sites differ only in which of its keys they consume.
const { surfaceStyle: heroSurfaceStyle } = useBlockSurface(props, { fallbackBackground: 'section' })

// No textTone → let CSS inherit from the section, as the legacy "inherit" did.
const heroTextStyles = computed(() => {
  // Wordmark mode owns its own color via the SCSS modifier; emitting an
  // inline color here would win over the stylesheet and break the treatment.
  if (props.displayWordmark) return {}
  return { color: heroSurfaceStyle.value.color ?? 'inherit' }
})
const standardContentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding as keyof typeof SPACING_TOKEN_MAP] ?? '0'
  }
  return style
})

const overlay = computed(() => props.overlay ?? false)
const fullViewport = computed(() => props.fullViewport ?? false)
const displayWordmark = computed(() => props.displayWordmark ?? false)
const overlayGradientDirectionValue = computed((): GradientDirection => props.overlayGradientDirection || 'none')

// =====================================================================
// Wordmark mode — shrink-to-fit the nowrap brand mark
// =====================================================================
// The wordmark title is a single `white-space: nowrap` word of *author* length,
// so no static vw/clamp formula can guarantee it fits (long words clip mid-glyph
// on narrow viewports). The clamp stays the desired size; this measures the
// laid-out title and, only when it overflows, writes a smaller px size into
// --hero-wordmark-fit-size. The SCSS falls back to the clamp when the property
// is absent, so a non-overflowing title renders exactly as before.

const standardTitleRef = ref<HTMLElement | null>(null)
const standardContentRef = ref<HTMLElement | null>(null)

const WORDMARK_FIT_PROPERTY = '--hero-wordmark-fit-size'
// Sub-pixel rounding in text measurement can leave the shrunk word a hair wide.
const WORDMARK_FIT_SAFETY = 0.98

let wordmarkObserver: ResizeObserver | null = null
// Guards ResizeObserver re-entrancy: the fit changes the title's height, which
// resizes the observed container. Only a width change can require a re-fit.
// Recorded from the same source the RO reports (the observed container's
// fractional content width) so the comparison is like-for-like.
let lastWordmarkFitWidth: number | null = null
// Sub-pixel jitter must not count as a width change.
const WORDMARK_FIT_WIDTH_EPSILON = 0.5

const wordmarkFitActive = computed(() => variant.value === 'standard' && displayWordmark.value)

function fitWordmark() {
  const el = standardTitleRef.value
  if (!el || typeof window === 'undefined') return
  if (!wordmarkFitActive.value) return

  // Pass 1 — drop any previous override so the CSS clamp drives the measurement.
  el.style.removeProperty(WORDMARK_FIT_PROPERTY)
  const cssFontSize = Number.parseFloat(window.getComputedStyle(el).fontSize)

  // Measure the TEXT box, not the scroll box. The wordmark is centred, and for a
  // centred nowrap line that overflows both sides the scrollable-overflow rect is
  // clamped at the padding-box edge — scrollWidth would under-report the real text
  // width and we would under-shrink. A Range over the node's contents reports the
  // true laid-out text width, in the same (post-transform) coordinate space as the
  // element's own bounding rect, so an ancestor scale canvas cancels out of the ratio.
  const range = document.createRange()
  range.selectNodeContents(el)
  const needed = range.getBoundingClientRect().width
  range.detach()
  // The wordmark h1 has margin:0 and no inline padding, so border-box == content box.
  const available = el.getBoundingClientRect().width

  if (!Number.isFinite(cssFontSize) || cssFontSize <= 0) return
  if (!Number.isFinite(needed) || needed <= 0 || !Number.isFinite(available) || available <= 0) return

  // Never grow past the CSS-derived size — fitting titles keep their exact clamp size.
  if (needed <= available) return

  // Pass 2 — shrink just enough to fit. Ratio is < 1 by construction.
  const fitted = cssFontSize * (available / needed) * WORDMARK_FIT_SAFETY
  el.style.setProperty(WORDMARK_FIT_PROPERTY, `${fitted}px`)
}

function scheduleWordmarkFit() {
  nextTick(() => fitWordmark())
}

function teardownWordmarkFit() {
  wordmarkObserver?.disconnect()
  wordmarkObserver = null
  lastWordmarkFitWidth = null
}

function setupWordmarkFit() {
  if (typeof window === 'undefined') return

  fitWordmark()

  const container = standardContentRef.value
  if (container && typeof ResizeObserver !== 'undefined') {
    wordmarkObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width === undefined) return
      // Only a width change can require a re-fit; the fit itself only alters height.
      if (
        lastWordmarkFitWidth !== null &&
        Math.abs(width - lastWordmarkFitWidth) < WORDMARK_FIT_WIDTH_EPSILON
      ) {
        return
      }
      lastWordmarkFitWidth = width
      fitWordmark()
    })
    wordmarkObserver.observe(container)
  }

  // The custom display face (Sul Sans) loads late; measuring before it lands
  // yields fallback-font widths.
  if ('fonts' in document) {
    document.fonts.ready
      .then(() => fitWordmark())
      .catch((error: unknown) => {
        console.error('[HeroBlock] wordmark fit deferred on font load failure', error)
      })
  }
}

// Wordmark mode can be toggled on/off live in the admin preview, so bind the
// observer's lifetime to the mode rather than to mount alone.
watch(
  wordmarkFitActive,
  (active) => {
    if (!active) {
      teardownWordmarkFit()
      return
    }
    // setupWordmarkFit() fits immediately, then wires the observer.
    nextTick(() => setupWordmarkFit())
  },
  { immediate: true },
)

onBeforeUnmount(teardownWordmarkFit)

// Author edits stream into the preview without a remount.
watch(localizedTitle, () => {
  if (!wordmarkFitActive.value) return
  lastWordmarkFitWidth = null
  scheduleWordmarkFit()
})

const scrollCueValue = computed<ScrollCue>(() => props.scrollCue || 'none')
const localizedScrollCueLabel = computed(() => getLocalizedValue(props.scrollCueLabel))
const scrollCueStyle = computed(() => {
  // Follow the hero's text role; default to a soft white that reads on the
  // dominant image/overlay hero. Wordmark mode already forces white content.
  const color = heroSurfaceStyle.value.color ?? 'rgba(255, 255, 255, 0.85)'
  return { color }
})

const scrollCueActionValue = computed<ScrollCueAction>(() => props.scrollCueAction || 'decorative')
// Only becomes an interactive button when a cue is shown AND the author opted
// into scroll-to-next; the default 'decorative' path renders the same
// aria-hidden div as before.
const scrollCueInteractive = computed(() => scrollCueValue.value !== 'none' && scrollCueActionValue.value === 'scrollToNext')
const scrollCueAriaLabel = computed(() => localizedScrollCueLabel.value || t('hero.scrollToNext', 'Scroll to next section'))

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

function handleScrollCueClick(ev: MouseEvent) {
  const trigger = ev.currentTarget
  if (!(trigger instanceof HTMLElement)) return
  const heroRoot = trigger.closest('.hero-block')
  // The hero is wrapped by its section layout; step out to that wrapper first,
  // falling back to the hero element itself when rendered standalone.
  const target = heroRoot?.parentElement?.nextElementSibling ?? heroRoot?.nextElementSibling
  if (!target) return
  target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
}

const CONTENT_ALIGN_V_MAP: Record<string, string> = {
  top: 'flex-start',
  center: 'center',
  bottom: 'flex-end',
}

const CONTENT_ALIGN_H_MAP: Record<string, string> = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
}

const sectionStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (props.fullViewport) styles.minHeight = '100vh'
  if (props.contentAlignV && props.contentAlignV !== 'center') {
    styles.alignItems = CONTENT_ALIGN_V_MAP[props.contentAlignV] ?? 'center'
  }
  if (props.contentAlignH && props.contentAlignH !== 'center') {
    styles.justifyContent = CONTENT_ALIGN_H_MAP[props.contentAlignH] ?? 'center'
  }
  return styles
})

const mediaStyles = computed(() => {
  const styles: Record<string, string> = {}
  // When the slideshow is active the slide layers paint the image; the media
  // div must NOT also set backgroundImage or it would double-paint under them.
  if (props.backgroundImage && !slideshowActive.value) styles.backgroundImage = `url(${props.backgroundImage})`
  // Ken Burns: run the zoom for roughly the time a slide is on screen (interval
  // + the cross-fade) so it completes as the slide exits, not at a fixed 8s that
  // desyncs from short intervals.
  if (slideshowActive.value && slideshowKenBurns.value) {
    const secs = Math.max(3, Math.min(12, props.slideshowInterval ?? 6)) + 1.2
    styles['--hero-slide-zoom-dur'] = `${secs}s`
  }
  // Background only: this layer is aria-hidden and carries no text, so the
  // resolved text tone would be inert here.
  if (heroSurfaceStyle.value.backgroundColor) {
    styles.backgroundColor = heroSurfaceStyle.value.backgroundColor
  }
  // SPL-077: background-position is applied via the SCSS rule below using
  // var(--hero-media-position, center) — that custom property is set by
  // HeroSectionLayout on .hero-layout__media and inherits into this block.
  const intensity = props.parallaxIntensity ?? 0
  if (intensity > 0) {
    styles.transform = `translateY(${intensity * parallaxOffset.value * 0.3}px)`
  }
  return styles
})

const gradientTopStyle = computed(() => {
  const color = props.overlayGradientColor || '#000000'
  const opacity = props.overlayGradientOpacity ?? 0.4
  return {
    background: `linear-gradient(to bottom, rgba(${hexToRgb(color)}, ${opacity}) 0%, transparent 40%)`
  }
})

const gradientBottomStyle = computed(() => {
  const color = props.overlayGradientColor || '#000000'
  const opacity = props.overlayGradientOpacity ?? 0.4
  return {
    background: `linear-gradient(to top, rgba(${hexToRgb(color)}, ${opacity}) 0%, transparent 40%)`
  }
})

const overlayStyles = computed(() => {
  const styles: Record<string, string> = {}
  // Drive overlay color via CSS custom property so --motion-tint can override it.
  // When overlayColor is set, it becomes the fallback; when --motion-tint is
  // animated by a scene, it takes precedence in the SCSS var() cascade.
  if (props.overlayColor) {
    styles['--overlay-color'] = props.overlayColor
  }
  const opacity = props.overlayOpacity ?? 0.4
  styles.opacity = String(opacity)
  return styles
})

function handleCtaClick() {
  if (props.ctaUrl) {
    if (props.ctaUrl.startsWith('http://') || props.ctaUrl.startsWith('https://')) {
      window.open(props.ctaUrl, '_blank')
    } else {
      router.push(props.ctaUrl)
    }
  }
}

// =====================================================================
// Editorial variant — two-column magazine masthead
// =====================================================================

// Responsive collapse: 2-col on desktop/tablet → stacked (media on top) on
// mobile. Decision lives in TS (StackedCards idiom), not @media.
const { innerWidth } = useViewport()
const collapse = computed(() => (isMobileViewport(innerWidth.value) ? 'mobile' : 'desktop'))

const mediaSideValue = computed<MediaSide>(() => props.mediaSide || 'right')
const editorialMediaRatioValue = computed<EditorialMediaRatio>(() => props.editorialMediaRatio || 'portrait')

const editorialMediaStyle = computed(() => {
  const styles: Record<string, string> = {}
  if (props.backgroundImage) styles.backgroundImage = `url(${props.backgroundImage})`
  // Reuse the block's resolved background for the media column fallback colour;
  // the column is aria-hidden, so it takes no text tone.
  if (heroSurfaceStyle.value.backgroundColor) {
    styles.backgroundColor = heroSurfaceStyle.value.backgroundColor
  }
  return styles
})

// =====================================================================
// Promotion variant — surface treatment + countdown
// =====================================================================

const promotionBannerStyles = computed(() => {
  const styles: Record<string, string> = {}

  // The banner does carry text, so it takes the full surface treatment.
  Object.assign(styles, heroSurfaceStyle.value)

  // surfaceStyle is a separate control and still overrides the background when
  // set. Its two arms paint what the `surface` / `accent` background roles now
  // paint, but they are driven by a different prop, so they stay.
  if (props.surfaceStyle === 'subtle') {
    styles.backgroundColor = 'var(--section-surface)'
  } else if (props.surfaceStyle === 'filled') {
    styles.backgroundColor = 'var(--section-accent)'
  }

  if (props.borderRadius) {
    styles.borderRadius = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? ''
  }

  return styles
})

const timeLeft = ref<{ days: number; hours: number; minutes: number; seconds: number } | null>(null)
let countdownInterval: ReturnType<typeof setInterval> | null = null

function calculateTimeLeft() {
  if (!props.showCountdown || !props.endDate) return

  const endDateTime = new Date(props.endDate).getTime()
  const now = Date.now()
  const difference = endDateTime - now

  if (difference <= 0) {
    timeLeft.value = null
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
    return
  }

  timeLeft.value = {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  }
}

function syncCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  if (variant.value !== 'promotion' || !props.showCountdown || !props.endDate) {
    timeLeft.value = null
    return
  }
  calculateTimeLeft()
  countdownInterval = setInterval(calculateTimeLeft, 1000)
}

onMounted(syncCountdown)

// The editor's live preview mutates `showCountdown` / `endDate` / `variant`
// on the mounted instance (no remount) — without this watcher the interval
// set up (or skipped) in onMounted never re-evaluates, so toggling the
// countdown on/off or editing the end date after mount has no visible effect
// until the settings panel forces a full preview reload.
watch(() => [props.showCountdown, props.endDate, variant.value], syncCountdown)

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
})

const promotionContentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding as keyof typeof SPACING_TOKEN_MAP] ?? '0'
  }
  if (props.contentAlignH && props.contentAlignH !== 'left') {
    const __alignMap: Record<string, string> = { center: 'center', right: 'flex-end' }
    const mapped = __alignMap[props.contentAlignH] ?? 'flex-start'
    style.justifyContent = mapped
    style.justifyItems = mapped
  }
  return style
})

// Expose so we can read in template
const title = computed(() => props.title)
const subtitle = computed(() => props.subtitle)
const body = computed(() => props.body)
const ctaText = computed(() => props.ctaText)
const ctaUrl = computed(() => props.ctaUrl)
const backgroundImage = computed(() => props.backgroundImage)
const showCountdown = computed(() => props.showCountdown)
</script>

<style lang="scss" scoped>
// =====================================================================
// Standard variant
// =====================================================================
.hero-block--standard {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-primary, #1E3D4F);
  overflow: hidden;
  min-height: 30rem;

  // Floating panel inset — set --hero-panel-inset-x and --hero-panel-top on a
  // parent element (e.g. [data-theme="standalone"]) to pull the banner away
  // from viewport edges. Defaults to 0 (full-bleed) when not overridden.
  margin-inline: var(--hero-panel-inset-x, 0);
  margin-top: var(--hero-panel-top, 0);
}

.hero-block {
  // Height variants
  &--small {
    min-height: 20rem;

    .hero-block__title {
      font-size: calc(var(--font-size-xl) * var(--section-heading-scale, 1));

      @media (max-width: $bp-md) {
        font-size: calc(var(--font-size-lg) * var(--section-heading-scale, 1));
      }
    }

    .hero-block__subtitle {
      font-size: var(--font-size-base);

      @media (max-width: $bp-md) {
        font-size: var(--font-size-sm);
      }
    }
  }

  &--medium {
    min-height: 40rem;

    .hero-block__title {
      font-size: calc(var(--font-size-2xl) * var(--section-heading-scale, 1));

      @media (max-width: $bp-md) {
        font-size: calc(var(--font-size-xl) * var(--section-heading-scale, 1));
      }
    }

    .hero-block__subtitle {
      font-size: var(--font-size-base);

      @media (max-width: $bp-md) {
        font-size: var(--font-size-sm);
      }
    }
  }

  &--large {
    min-height: 60rem;

    .hero-block__title {
      font-size: calc(var(--font-size-3xl) * var(--section-heading-scale, 1));

      @media (max-width: $bp-md) {
        font-size: calc(var(--font-size-2xl) * var(--section-heading-scale, 1));
      }
    }

    .hero-block__subtitle {
      font-size: var(--font-size-lg);

      @media (max-width: $bp-md) {
        font-size: var(--font-size-base);
      }
    }
  }

  // The two ends of the height ladder. `viewport` is the same height the
  // `fullViewport` toggle produces — the toggle predates it and is kept so
  // heroes authored against it do not shrink; `compact` releases the 30rem
  // floor `.hero-block--standard` sets so the hero is as tall as its content.
  &--viewport {
    min-height: 100vh;
  }

  &--compact {
    min-height: 0;
  }

  // Text alignment
  &--align-left &__content {
    text-align: left;
  }

  &--align-center &__content {
    text-align: center;
  }

  &--align-right &__content {
    text-align: right;
  }

  // Full viewport mode
  &--full-viewport {
    min-height: 100vh;
  }

  // Wordmark mode — title rendered as a large full-bleed display wordmark.
  &--wordmark {
    // Bleed the hero photo up under the transparent chrome header so it fills
    // the viewport from y=0 (without this the header strip reserves ~60px and
    // the hero starts below the top edge).
    margin-top: calc(-1 * var(--header-height, 0px));

    .hero-block__content {
      max-width: none;
      width: 100%;
      padding-inline: var(--spacing-md);
      text-align: center;
    }

    .hero-block__title {
      // The reference wordmark's "geometric sans" is NOT Inter — probing the
      // readymag site (2026-07-03) shows it's the design's single custom
      // display face, Sul Sans Regular (custom_176073, byte-identical to
      // public/fonts/SulSans-Regular.woff). Use the heading chain so the
      // wordmark follows the display typography (role heading1 → Sul Sans).
      font-family: var(--rt-slot-heading-family, var(--rt-role-heading1-family, var(--font-family-heading)));
      // Reference wordmark spans ~88vw of the viewport. With Inter + the
      // scale-canvas transform, ~27vw font-size fills the wordmark edge-to-edge
      // (measured: 23vw → 75vw, 15vw → 58vw — both short of the ref mark).
      // 27vw only *fits* once the clamp saturates at the 32rem ceiling
      // (viewports ≳1185px); below that the vw term wins and the single
      // nowrap word renders wider than the viewport, clipping the final glyph
      // (visible as "Archipla…" on phones + small tablets). Dial the vw term
      // back under the desktop breakpoint so the brand mark always fits with
      // side margins — the word must never be cut.
      // WMK-01: ref hero wordmark is 300px with normal tracking (was 320px /
      // -0.02em), inset ~70px from the sides and sitting ~76px higher than
      // ours. The vertical lift is a translateY nudge (the hero content box
      // stays flex-centred); the side inset comes from the smaller mark plus a
      // little padding so the single nowrap word never clips.
      // --hero-wordmark-fit-size is set inline by the shrink-to-fit measurement
      // ONLY when the nowrap word overflows; absent it, the clamp below is the
      // rendered size, unchanged.
      font-size: var(--hero-wordmark-fit-size, clamp(5rem, 27vw, 30rem));
      font-weight: var(--font-weight-normal, 400);
      line-height: 0.95;
      letter-spacing: normal;
      color: #ffffff;
      text-shadow: 0 0.2rem 4rem rgba(0, 0, 0, 0.25);
      margin: 0;
      transform: translateY(-8rem);
      white-space: nowrap;

      @media (max-width: $bp-xl) {
        font-size: var(--hero-wordmark-fit-size, clamp(3rem, 21vw, 24rem));
        transform: translateY(-5rem);
      }

      @media (max-width: $bp-md) {
        font-size: var(--hero-wordmark-fit-size, clamp(3rem, 20vw, 14rem));
        // Smaller viewports have a shorter hero — a large lift would push the
        // mark off the top, so ease it back.
        transform: translateY(-2rem);
      }
    }
  }

  // Media background
  // SPL-077: consume --hero-media-position set by HeroSectionLayout on the
  // .hero-layout__media wrapper. Falls back to `center` for standalone use
  // (outside a hero layout).
  &__media {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: var(--hero-media-position, center);
    background-repeat: no-repeat;
    z-index: 0;
  }

  // Cover slideshow — stacked cross-fading slide layers inside .hero-block__media.
  // Only present when the slideshow is active; the media div stays the parallax
  // target so all slides drift together.
  &__slide {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: var(--hero-media-position, center);
    background-repeat: no-repeat;
    opacity: 0;
    transition: opacity 1.2s ease;

    &.is-active {
      opacity: 1;
    }
  }

  // Overlay
  &__overlay {
    position: absolute;
    inset: 0;
    background-color: var(--motion-tint, var(--overlay-color, #000000));
    opacity: 0.4;
    z-index: 1;
  }

  // Gradient overlays
  &__gradient {
    position: absolute;
    left: 0;
    right: 0;
    height: 50%;
    z-index: 1;
    pointer-events: none;

    &--top {
      top: 0;
    }

    &--bottom {
      bottom: 0;
    }
  }

  // Content
  &__content {
    position: relative;
    z-index: 2;
    padding: var(--spacing-xl);
    max-width: var(--container-max-width, 80rem);
    width: 100%;
    opacity: var(--motion-content-opacity, 1);
  }

  &__title {
    font-family: var(--rt-slot-heading-family, var(--rt-role-heading1-family, var(--font-family-heading, 'dm-serif-display', Georgia, serif)));
    font-size: var(--rt-slot-heading-size, var(--rt-role-heading1-size));
    font-weight: var(--rt-slot-heading-weight, var(--rt-role-heading1-weight, var(--font-weight-semibold)));
    line-height: var(--rt-slot-heading-line-height, var(--rt-role-heading1-line-height, 1.05));
    letter-spacing: var(--rt-slot-heading-letter-spacing, var(--rt-role-heading1-letter-spacing, -0.03em));
    text-transform: var(--rt-slot-heading-text-transform, var(--rt-role-heading1-text-transform, none));
    font-variation-settings: var(--rt-slot-heading-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-heading-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-heading-font-stretch, normal);
    font-style: var(--rt-slot-heading-font-style, normal);
    color: var(--rt-slot-heading-color, var(--rt-role-heading1-color, inherit));
    margin: 0 0 var(--spacing-lg);
  }

  &__subtitle {
    font-family: var(--rt-slot-subheading-family, var(--rt-role-heading3-family, inherit));
    font-weight: var(--rt-slot-subheading-weight, var(--rt-role-heading3-weight, var(--font-weight-normal)));
    line-height: var(--rt-slot-subheading-line-height, var(--rt-role-heading3-line-height, 1.5));
    letter-spacing: var(--rt-slot-subheading-letter-spacing, var(--rt-role-heading3-letter-spacing, normal));
    font-variation-settings: var(--rt-slot-subheading-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-subheading-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-subheading-font-stretch, normal);
    font-style: var(--rt-slot-subheading-font-style, normal);
    color: var(--rt-slot-subheading-color, var(--rt-role-heading3-color, inherit));
    font-size: var(--rt-slot-subheading-size, var(--rt-role-heading3-size, var(--font-size-lg)));
    margin: 0 0 var(--spacing-xl);
    opacity: 0.85;
  }

  &__body {
    font-family: var(--rt-slot-body-family, var(--rt-role-body-family, inherit));
    font-weight: var(--rt-slot-body-weight, var(--rt-role-body-weight, var(--font-weight-normal)));
    line-height: var(--rt-slot-body-line-height, var(--rt-role-body-line-height, 1.7));
    letter-spacing: var(--rt-slot-body-letter-spacing, var(--rt-role-body-letter-spacing, normal));
    font-variation-settings: var(--rt-slot-body-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-body-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-body-font-stretch, normal);
    font-style: var(--rt-slot-body-font-style, normal);
    color: var(--rt-slot-body-color, var(--rt-role-body-color, inherit));
    font-size: var(--rt-slot-body-size, var(--rt-role-body-size, var(--font-size-base)));
    margin: 0 0 var(--spacing-xl);
    max-width: 60ch;
  }

  &__cta {
    display: inline-block;
    padding: 1.0rem 2.4rem;
    font-weight: var(--font-weight-medium);
    font-size: 1.3rem;
    text-decoration: none;
    border-radius: var(--border-radius-button, 4.0rem);
    border: 0.1rem solid transparent;
    cursor: pointer;
    transition: var(--transition-base);
    min-height: 4.0rem;
    letter-spacing: 0;

    &--primary {
      background-color: var(--color-primary);
      color: var(--color-background);
      border-color: var(--color-primary);

      &:hover {
        filter: brightness(0.88);
      }

      &:active {
        transform: scale(0.98);
      }

      &:focus-visible {
        outline: 0.2rem solid var(--color-primary);
        outline-offset: 0.3rem;
        box-shadow: 0 0 0 0.4rem var(--color-primary-focus-ring);
      }
    }

    &--secondary {
      background-color: transparent;
      color: var(--color-secondary);
      border-color: var(--color-secondary);

      &:hover {
        background-color: var(--color-secondary);
        color: var(--color-background);
      }

      &:active {
        transform: scale(0.98);
      }

      &:focus-visible {
        outline: 0.2rem solid var(--color-secondary);
        outline-offset: 0.3rem;
      }
    }

    &--outline {
      background-color: transparent;
      color: inherit;
      border-color: currentColor;

      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }

      &:active {
        transform: scale(0.98);
      }

      &:focus-visible {
        outline: 0.2rem solid currentColor;
        outline-offset: 0.3rem;
      }
    }

    @media (max-width: $bp-md) {
      padding: var(--spacing-xs) var(--spacing-lg);
      font-size: var(--font-size-sm);
    }
  }

  // Scroll-down cue -- opt-in animated hint at the bottom of the hero.
  &__scroll-cue {
    position: absolute;
    left: 50%;
    bottom: var(--spacing-xl);
    transform: translateX(-50%);
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);
    pointer-events: none;

    @media (max-width: $bp-md) {
      bottom: var(--spacing-lg);
    }
  }

  // Interactive variant — same box model as the decorative cue, but reset to a
  // clickable button. The base rule sets pointer-events: none, so re-enable it.
  &__scroll-cue--interactive {
    appearance: none;
    -webkit-appearance: none;
    background: none;
    border: 0;
    padding: 0;
    margin: 0;
    cursor: pointer;
    color: inherit;
    font: inherit;
    pointer-events: auto;
    min-width: 4.4rem;
    min-height: 4.4rem;
    justify-content: center;

    &:focus-visible {
      outline: 0.2rem solid var(--color-focus, currentColor);
      outline-offset: 0.3rem;
    }
  }

  &__scroll-cue-label {
    font-size: var(--font-size-xs, 1.1rem);
    font-weight: var(--font-weight-medium);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.85;
  }

  &__scroll-cue-icon {
    width: 2.6rem;
    height: 2.6rem;
    animation: hero-scroll-bob 1.8s ease-in-out infinite;

    .hero-block__scroll-cue-chev2 {
      opacity: 0.5;
    }
  }

  &__scroll-cue-track {
    position: relative;
    width: 0.1rem;
    height: 4rem;
    background: currentColor;
    opacity: 0.35;
    overflow: hidden;

    &::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 40%;
      background: currentColor;
      opacity: 0.9;
      animation: hero-scroll-drip 1.8s ease-in-out infinite;
    }
  }
}

// =====================================================================
// Pointer parallax (standard) — opt-in foreground drift + perspective tilt.
// =====================================================================
// The whole effect is scoped under the modifier class emitted ONLY when the
// gesture is active (desktop hover/fine-pointer, not reduced-motion, not the
// editor preview). Instances without the class are untouched. --hero-pointer-x
// / --hero-pointer-y are written on the root by the JS pointermove handler in
// the range ~-0.5..0.5 and default to 0, so the content sits centred until the
// cursor moves and eases back on leave via the transition.
.hero-block--pointer-parallax {
  --hero-pointer-x: 0;
  --hero-pointer-y: 0;
  // Subtle by default: ±6px translate, ±0.8deg tilt at the box edges.
  --hero-pointer-shift: 12px;
  --hero-pointer-tilt: 1.6deg;

  &.hero-block--pointer-parallax-strong {
    // Modestly more: ±11px translate, ±1.5deg tilt.
    --hero-pointer-shift: 22px;
    --hero-pointer-tilt: 3deg;
  }

  .hero-block__content {
    transform:
      perspective(1200px)
      translate3d(
        calc(var(--hero-pointer-x) * var(--hero-pointer-shift)),
        calc(var(--hero-pointer-y) * var(--hero-pointer-shift)),
        0
      )
      rotateX(calc(var(--hero-pointer-y) * var(--hero-pointer-tilt) * -1))
      rotateY(calc(var(--hero-pointer-x) * var(--hero-pointer-tilt)));
    transition: transform 0.28s ease-out;
    will-change: transform;
  }
}

// =====================================================================
// Editorial variant — two-column magazine masthead
// =====================================================================
.hero-block--editorial {
  position: relative;
  display: flex;
  align-items: center;
  min-height: var(--hero-editorial-min, 78vh);
  padding-block: clamp(3rem, 6vw, 7rem);
  padding-inline: clamp(1.6rem, 5vw, 6rem);
  overflow: hidden;
  background-color: var(--section-bg, transparent);

  // Media column aspect ratio (desktop). Portrait is the default masthead feel.
  --hero-editorial-ratio: 3 / 4;
  &.hero-block--editorial-ratio-landscape { --hero-editorial-ratio: 4 / 3; }
  &.hero-block--editorial-ratio-square { --hero-editorial-ratio: 1 / 1; }

  // Height ladder — same setting, same option ids as the standard variant, but
  // resolved in viewport fractions because the masthead is a full-bleed band
  // rather than a fixed content box. `large` is the schema default AND the
  // historic editorial height, so a hero authored before this ladder existed
  // renders at exactly the height it always did.
  //
  // These must stay ABOVE the `--full-viewport` rule: same specificity, so
  // source order decides, and the legacy toggle has to keep winning.
  &.hero-block--compact { min-height: 0; }
  &.hero-block--small { min-height: 45vh; }
  &.hero-block--medium { min-height: 60vh; }
  &.hero-block--large { min-height: var(--hero-editorial-min, 78vh); }
  &.hero-block--viewport { min-height: 100vh; }

  &.hero-block--full-viewport { min-height: 100vh; }

  .hero-block__editorial-grid {
    width: 100%;
    max-width: var(--container-max-width, 80rem);
    margin-inline: auto;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: clamp(2rem, 5vw, 6rem);
    align-items: center;
  }

  // Media-side ordering: default (right) keeps source order; left swaps columns.
  &.hero-block--media-left .hero-block__editorial-content { order: 2; }
  &.hero-block--media-left .hero-block__editorial-media { order: 1; }

  .hero-block__editorial-content {
    min-width: 0;
    text-align: left;
    opacity: var(--motion-content-opacity, 1);
  }

  .hero-block__editorial-media {
    position: relative;
    width: 100%;
    aspect-ratio: var(--hero-editorial-ratio, 3 / 4);
    background-size: cover;
    background-position: var(--hero-media-position, center);
    background-repeat: no-repeat;
    border-radius: var(--border-radius, 0);
  }

  .hero-block__editorial-eyebrow {
    margin: 0 0 var(--spacing-md, 1.6rem);
    font-family: var(--rt-role-caption-family, var(--font-family-body, inherit));
    font-size: var(--font-size-sm, 1.4rem);
    font-weight: var(--font-weight-medium, 500);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-accent, var(--color-primary));
    opacity: 0.9;
  }

  .hero-block__editorial-title {
    font-family: var(--rt-slot-heading-family, var(--rt-role-heading1-family, var(--font-family-heading, 'dm-serif-display', Georgia, serif)));
    // Oversized masthead title: prefer the role/display size, fall back to a
    // fluid clamp so it always reads large even without a typography preset.
    font-size: var(--rt-slot-heading-size, var(--rt-role-heading1-size, clamp(var(--font-size-2xl, 3.2rem), 5.5vw, var(--font-size-3xl, 4.8rem))));
    font-weight: var(--rt-slot-heading-weight, var(--rt-role-heading1-weight, var(--font-weight-semibold)));
    line-height: var(--rt-slot-heading-line-height, var(--rt-role-heading1-line-height, 1.02));
    letter-spacing: var(--rt-slot-heading-letter-spacing, var(--rt-role-heading1-letter-spacing, -0.03em));
    text-transform: var(--rt-slot-heading-text-transform, var(--rt-role-heading1-text-transform, none));
    font-variation-settings: var(--rt-slot-heading-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-heading-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-heading-font-stretch, normal);
    font-style: var(--rt-slot-heading-font-style, normal);
    color: var(--rt-slot-heading-color, var(--rt-role-heading1-color, inherit));
    margin: 0 0 var(--spacing-lg, 2.4rem);
  }

  .hero-block__editorial-subtitle {
    font-family: var(--rt-slot-subheading-family, var(--rt-role-heading3-family, inherit));
    font-weight: var(--rt-slot-subheading-weight, var(--rt-role-heading3-weight, var(--font-weight-normal)));
    line-height: var(--rt-slot-subheading-line-height, var(--rt-role-heading3-line-height, 1.5));
    letter-spacing: var(--rt-slot-subheading-letter-spacing, var(--rt-role-heading3-letter-spacing, normal));
    font-variation-settings: var(--rt-slot-subheading-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-subheading-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-subheading-font-stretch, normal);
    font-style: var(--rt-slot-subheading-font-style, normal);
    color: var(--rt-slot-subheading-color, var(--rt-role-heading3-color, inherit));
    font-size: var(--rt-slot-subheading-size, var(--rt-role-heading3-size, var(--font-size-lg)));
    margin: 0 0 var(--spacing-lg, 2.4rem);
    opacity: 0.85;
  }

  .hero-block__editorial-body {
    font-family: var(--rt-slot-body-family, var(--rt-role-body-family, inherit));
    font-weight: var(--rt-slot-body-weight, var(--rt-role-body-weight, var(--font-weight-normal)));
    line-height: var(--rt-slot-body-line-height, var(--rt-role-body-line-height, 1.7));
    letter-spacing: var(--rt-slot-body-letter-spacing, var(--rt-role-body-letter-spacing, normal));
    color: var(--rt-slot-body-color, var(--rt-role-body-color, inherit));
    font-size: var(--rt-slot-body-size, var(--rt-role-body-size, var(--font-size-base)));
    margin: 0 0 var(--spacing-xl, 3.2rem);
    max-width: 52ch;
  }

  .hero-block__editorial-cta {
    margin-top: 0;
  }

  // ── No media authored: collapse the two-column masthead to a single content
  //    column (the media div is v-if'd away) and let the copy own the row.
  //    Body measure widens a step — 52ch against a full-width single column
  //    reads as a stub next to a phantom second column.
  &.hero-block--editorial-no-media .hero-block__editorial-grid {
    grid-template-columns: 1fr;
  }
  &.hero-block--editorial-no-media .hero-block__editorial-body {
    max-width: 65ch;
  }

  // ── Mobile: single column, media on top. No @media — driven by
  //    useViewport() → [data-collapse]. Mirrors the StackedCards idiom.
  &[data-collapse='mobile'] .hero-block__editorial-grid {
    grid-template-columns: 1fr;
    gap: clamp(2rem, 6vw, 3rem);
  }
  &[data-collapse='mobile'] .hero-block__editorial-media {
    order: -1;
    // Sensible fixed ratio when stacked; the desktop portrait/landscape/square
    // ratio would be too tall as a full-width band.
    aspect-ratio: 16 / 10;
  }
  &[data-collapse='mobile'] .hero-block__editorial-content {
    order: 0;
  }
}

// =====================================================================
// Promotion variant
// =====================================================================
.hero-block--promotion {
  position: relative;
  padding: var(--spacing-2xl) var(--spacing-xl);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  min-height: 30rem;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: $bp-md) {
    min-height: 20rem;
    padding: var(--spacing-xl) var(--spacing-md);
  }
}

.hero-block__promotion-background {
  position: absolute;
  inset: 0;
  z-index: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.hero-block__promotion-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1;
}

.hero-block__promotion-content {
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 60rem;
  color: var(--color-background);
}

.hero-block__promotion-title {
  margin: 0 0 var(--spacing-md);
  font-family: var(--rt-slot-heading-family, var(--rt-role-heading2-family, inherit));
  font-size: var(--rt-slot-heading-size, var(--rt-role-heading2-size, var(--font-size-2xl)));
  font-weight: var(--rt-slot-heading-weight, var(--rt-role-heading2-weight, var(--font-weight-bold)));
  line-height: var(--rt-slot-heading-line-height, var(--rt-role-heading2-line-height, var(--line-height-tight)));
  letter-spacing: var(--rt-slot-heading-letter-spacing, var(--rt-role-heading2-letter-spacing, normal));
  text-transform: var(--rt-slot-heading-text-transform, var(--rt-role-heading2-text-transform, none));
  color: var(--rt-slot-heading-color, var(--rt-role-heading2-color, inherit));

  @media (max-width: $bp-md) {
    font-size: var(--rt-slot-heading-size, var(--rt-role-heading2-size, var(--font-size-xl)));
  }
}

.hero-block__promotion-description {
  margin: 0 0 var(--spacing-lg);
  font-family: var(--rt-slot-body-family, var(--rt-role-body-family, inherit));
  font-size: var(--rt-slot-body-size, var(--rt-role-body-size, var(--font-size-base)));
  font-weight: var(--rt-slot-body-weight, var(--rt-role-body-weight, inherit));
  line-height: var(--rt-slot-body-line-height, var(--rt-role-body-line-height, var(--line-height-relaxed)));
  letter-spacing: var(--rt-slot-body-letter-spacing, var(--rt-role-body-letter-spacing, normal));
  text-transform: var(--rt-slot-body-text-transform, var(--rt-role-body-text-transform, none));
  color: var(--rt-slot-body-color, var(--rt-role-body-color, inherit));
  opacity: 0.95;

  @media (max-width: $bp-md) {
    font-size: var(--rt-slot-body-size, var(--rt-role-body-size, var(--font-size-sm)));
    margin-bottom: var(--spacing-md);
  }
}

.hero-block__countdown {
  display: flex;
  justify-content: center;
  gap: var(--spacing-md);
  margin: var(--spacing-lg) 0;
  flex-wrap: wrap;
}

.hero-block__countdown-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.2);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius);
  backdrop-filter: blur(10px);
  min-width: 7rem;
}

.hero-block__countdown-value {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  line-height: 1;
}

.hero-block__countdown-label {
  font-size: var(--font-size-sm);
  margin-block-start: var(--spacing-xs);
  opacity: 0.8;
}

.hero-block__promotion-cta {
  display: inline-block;
  padding: var(--spacing-sm) var(--spacing-xl);
  background: var(--color-background);
  color: var(--color-primary);
  border: none;
  border-radius: var(--border-radius);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--transition-base);
  margin-block-start: var(--spacing-md);
  text-decoration: none;
  min-height: 4.8rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16rem;

  &:hover {
    transform: translateY(-0.2rem);
    box-shadow: var(--shadow-md);
  }

  &:focus-visible {
    outline: 0.2rem solid var(--color-background);
    outline-offset: 0.2rem;
  }
}

// Ken Burns — slow cinematic zoom on the active slide (opt-in, standard only).
// The .hero-block--standard has overflow: hidden, so the 1.08 scale stays clipped.
.hero-block--slideshow-zoom .hero-block__slide.is-active {
  animation: hero-slide-zoom var(--hero-slide-zoom-dur, 8s) ease-out both;
}

@keyframes hero-slide-zoom {
  from { transform: scale(1); }
  to { transform: scale(1.08); }
}

@keyframes hero-scroll-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(0.5rem); }
}

@keyframes hero-scroll-drip {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(250%); }
}

@media (prefers-reduced-motion: reduce) {
  .hero-block__scroll-cue-icon { animation: none; }
  .hero-block__scroll-cue-track::after { animation: none; opacity: 0; }
  // Slideshow holds on the first slide (JS skips the timer too); no cross-fade or zoom.
  .hero-block__slide { transition: none; }
  .hero-block--slideshow-zoom .hero-block__slide.is-active { animation: none; }
  // Pointer parallax: JS never attaches the listeners under reduced motion, but
  // belt-and-suspenders — hold the content dead centre with no transition.
  .hero-block--pointer-parallax .hero-block__content { transform: none; transition: none; }
}
</style>
