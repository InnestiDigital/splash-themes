<template>
  <section
    class="expanding-panels"
    :class="[`expanding-panels--${height}`, `expanding-panels--${expandRatio}`, { 'is-reduced': isReducedMotion }]"
    :style="measureStyle"
    :data-collapse="collapse"
    data-target="root"
    @pointerenter="onPauseEnter"
    @pointerleave="onPauseLeave"
    @focusin="onPauseEnter"
    @focusout="onPauseLeave"
  >
    <ul ref="trackEl" class="expanding-panels__track" data-target="panels">
      <li
        v-for="(p, i) in panels"
        :key="i"
        class="expanding-panels__panel"
        :class="{ 'is-active': activeIndex === i, 'has-cta': !!p.link }"
        data-target="panel"
        :data-panel="i"
      >
        <button
          type="button"
          class="expanding-panels__button"
          :aria-expanded="activeIndex === i ? 'true' : 'false'"
          @click="onActivate(i)"
          @focus="onFocus(i)"
          @pointerenter="onHover(i)"
        >
          <img
            v-if="p.image"
            :src="p.image"
            :alt="title(p)"
            class="expanding-panels__img"
            loading="lazy"
            decoding="async"
          />
          <span class="expanding-panels__scrim" aria-hidden="true" />

          <!-- Collapsed-state spine: a slim, rotated title always legible on the closed panel. -->
          <span v-if="title(p)" class="expanding-panels__spine">{{ title(p) }}</span>

          <!-- Expanded-state caption: revealed when the panel is active / hovered / focused. -->
          <span class="expanding-panels__reveal">
            <span v-if="title(p)" class="expanding-panels__title">{{ title(p) }}</span>
            <span v-if="subtitle(p)" class="expanding-panels__subtitle">{{ subtitle(p) }}</span>
          </span>
        </button>

        <!-- Optional CTA anchor — kept outside the toggle button so tapping the panel
             opens it and the explicit link is a distinct, accessible navigation target. -->
        <a
          v-if="p.link"
          :href="p.link"
          class="expanding-panels__cta"
          :tabindex="activeIndex === i ? 0 : -1"
          @click="onCtaClick"
        >
          {{ linkLabel(p) }}
          <span aria-hidden="true">→</span>
        </a>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect, onMounted, onBeforeUnmount } from 'vue'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'
import { useViewport } from '~/shared/composables/useViewport'
import { isMobileViewport } from '~/shared/features/cms/composition/responsive'

type Height = 'viewport' | 'large' | 'medium' | 'small'
type ExpandRatio = 'subtle' | 'balanced' | 'bold'

interface PanelInput {
  image?: string | { url: string }
  title?: string | Record<string, string>
  subtitle?: string | Record<string, string>
  link?: string
  linkLabel?: string | Record<string, string>
}

interface Panel {
  image: string
  title: string | Record<string, string> | undefined
  subtitle: string | Record<string, string> | undefined
  link: string
  linkLabel: string | Record<string, string> | undefined
}

const props = defineProps<{
  panels?: PanelInput[]
  height?: Height
  measureWidth?: 'content' | 'narrow' | 'standard' | 'wide' | 'full'
  initialActive?: number
  expandRatio?: ExpandRatio
  autoCycle?: 'off' | 'on'
  cycleInterval?: number
}>()

const { getLocalizedValue } = useLocalized()
const { isReducedMotion } = useReducedMotion()
const renderMode = useRenderMode()
const isEditor = computed(() => renderMode.value === 'editor-preview')

const { innerWidth } = useViewport()
const collapse = computed(() => (isMobileViewport(innerWidth.value) ? 'mobile' : 'desktop'))

const height = computed<Height>(() => props.height || 'large')
const expandRatio = computed<ExpandRatio>(() => props.expandRatio || 'bold')

function resolveImage(image: PanelInput['image']): string {
  if (!image) return ''
  if (typeof image === 'string') return image
  return image.url || ''
}

const panels = computed<Panel[]>(() =>
  (props.panels ?? []).map((p) => ({
    image: resolveImage(p.image),
    title: p.title,
    subtitle: p.subtitle,
    link: (p.link ?? '').trim(),
    linkLabel: p.linkLabel,
  })),
)

function title(p: Panel): string {
  return p.title ? getLocalizedValue(p.title) : ''
}
function subtitle(p: Panel): string {
  return p.subtitle ? getLocalizedValue(p.subtitle) : ''
}
function linkLabel(p: Panel): string {
  return p.linkLabel ? getLocalizedValue(p.linkLabel) : 'View'
}

// ── Active panel ─────────────────────────────────────────────────────────────
// `initialActive` is authored 1-based (0 = none). Clamp to a valid 0-based index
// or -1 for "none open until interacted with".
const activeIndex = ref<number>(clampInitial(props.initialActive))

function clampInitial(value: number | undefined): number {
  const n = typeof value === 'number' ? Math.floor(value) : 1
  if (n <= 0) return -1
  return Math.min(n, (props.panels?.length ?? 0)) - 1
}

function onActivate(i: number) {
  // In the editor preview, keep the panel toggle inert so a click selects the
  // block instead of mutating view-only state — mirrors FilterableGallery /
  // CursorLayer precedent.
  if (isEditor.value) return
  activeIndex.value = activeIndex.value === i ? -1 : i
}

// Keyboard / hover parity: focusing a panel opens it (matches the CSS hover
// reveal so sighted keyboard users see the same spread). Inert in the editor.
function onFocus(i: number) {
  if (isEditor.value) return
  activeIndex.value = i
}

function onCtaClick(e: MouseEvent) {
  // The CTA is a real navigation link everywhere except the editor, where it
  // must not steal the click from block selection.
  if (isEditor.value) e.preventDefault()
}

const measureStyle = computed<Record<string, string>>(() =>
  props.measureWidth ? { '--block-measure': `var(--measure-width-${props.measureWidth})` } : {},
)

// ── Auto-cycle showcase ──────────────────────────────────────────────────────
// Opt-in self-running reel: the active panel advances on a timer so the band
// plays itself. Desktop only, off under reduced motion / editor / a hidden tab,
// and paused whenever the pointer or keyboard focus is inside the track (so the
// visitor stays in control -- WCAG 2.2.2). Off by default => existing instances
// render and behave byte-identically.
const isDocVisible = ref(true)
const isPaused = ref(false)

function onPauseEnter() {
  isPaused.value = true
}
function onPauseLeave() {
  isPaused.value = false
}

// When cycling, treat hover like focus so the pinned panel tracks the pointer --
// otherwise the timer's last active panel and the CSS :hover panel would both
// grow. Inert unless auto-cycle is on AND on desktop (keeps the default hover
// accordion pure, and never fights the mobile tap-to-open path: on touch a
// pointerenter would set active then the click would toggle it straight back off).
function onHover(i: number) {
  if (isEditor.value || props.autoCycle !== 'on' || collapse.value !== 'desktop') return
  activeIndex.value = i
}

const shouldAutoCycle = computed(
  () =>
    props.autoCycle === 'on' &&
    !isEditor.value &&
    !isReducedMotion.value &&
    collapse.value === 'desktop' &&
    isDocVisible.value &&
    !isPaused.value &&
    panels.value.length > 1,
)

watchEffect((onCleanup) => {
  if (!shouldAutoCycle.value) return
  const ms = Math.max(2000, (props.cycleInterval ?? 4) * 1000)
  const timer = setInterval(() => {
    const n = panels.value.length
    if (n < 2) return
    activeIndex.value = (Math.max(activeIndex.value, -1) + 1) % n
  }, ms)
  onCleanup(() => clearInterval(timer))
})

function onDocVisibility() {
  isDocVisible.value = typeof document === 'undefined' || !document.hidden
}
onMounted(() => {
  if (typeof document !== 'undefined') {
    isDocVisible.value = !document.hidden
    document.addEventListener('visibilitychange', onDocVisibility)
  }
})
onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onDocVisibility)
  }
})
</script>

<style lang="scss" scoped>
.expanding-panels {
  max-width: var(--block-measure, none);
  margin-inline: var(--block-measure-align, auto);

  // Expand-strength knob: how much flex-grow the active panel claims.
  --ep-grow: 5;
  &--subtle { --ep-grow: 2.4; }
  &--balanced { --ep-grow: 3.5; }
  &--bold { --ep-grow: 5; }

  // Desktop row height.
  --ep-height: 70vh;
  &--viewport { --ep-height: 100vh; }
  &--large { --ep-height: 70vh; }
  &--medium { --ep-height: 55vh; }
  &--small { --ep-height: 40vh; }

  &__track {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    gap: 0.6rem;
    height: var(--ep-height);
  }

  &__panel {
    position: relative;
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
    transition: flex-grow 0.65s cubic-bezier(0.22, 1, 0.36, 1);

    // Grow on hover, keyboard focus, or the pinned active state.
    &:hover,
    &:focus-within,
    &.is-active {
      flex-grow: var(--ep-grow);
    }
  }

  &__button {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    color: #fff;

    &:focus-visible {
      outline: 2px solid var(--color-accent, #fff);
      outline-offset: -4px;
    }
  }

  &__img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
  }
  &__panel:hover &__img,
  &__panel.is-active &__img {
    transform: scale(1.05);
  }

  &__scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.05) 55%);
  }

  // Collapsed spine: vertical title on the slim panel, fades out as it expands.
  &__spine {
    position: absolute;
    bottom: 1.8rem;
    left: 50%;
    writing-mode: vertical-rl;
    transform: translateX(-50%) rotate(180deg);
    transform-origin: center;
    font-family: var(--rt-role-heading2-family, var(--font-family-heading, Georgia, serif));
    font-size: var(--font-size-md, 1.8rem);
    letter-spacing: 0.02em;
    white-space: nowrap;
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.5);
    opacity: 1;
    transition: opacity 0.35s ease;
  }
  &__panel:hover &__spine,
  &__panel:focus-within &__spine,
  &__panel.is-active &__spine {
    opacity: 0;
  }

  // Expanded caption: horizontal spread, revealed when the panel opens.
  &__reveal {
    position: absolute;
    left: 2.2rem;
    right: 2.2rem;
    bottom: 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    text-align: left;
    opacity: 0;
    transform: translateY(0.8rem);
    transition: opacity 0.4s ease 0.1s, transform 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.1s;
  }
  &__panel:hover &__reveal,
  &__panel:focus-within &__reveal,
  &__panel.is-active &__reveal {
    opacity: 1;
    transform: translateY(0);
  }

  &__title {
    font-family: var(--rt-role-heading2-family, var(--font-family-heading, Georgia, serif));
    font-size: var(--font-size-xl, 2.8rem);
    font-weight: var(--rt-role-heading2-weight, 500);
    line-height: 1.1;
    letter-spacing: -0.01em;
    text-shadow: 0 1px 10px rgba(0, 0, 0, 0.5);
  }

  &__subtitle {
    font-family: var(--rt-role-body-family, var(--font-family-body, inherit));
    font-size: var(--font-size-sm, 1.4rem);
    letter-spacing: 0.04em;
    opacity: 0.85;
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.5);
  }

  &__cta {
    position: absolute;
    left: 2.2rem;
    bottom: -3rem;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    color: #fff;
    font-family: var(--rt-role-body-family, var(--font-family-body, inherit));
    font-size: var(--font-size-sm, 1.4rem);
    letter-spacing: 0.04em;
    text-decoration: none;
    opacity: 0;
    transform: translateY(0.6rem);
    pointer-events: none;
    transition: opacity 0.35s ease, transform 0.4s ease;

    &::after {
      content: '';
      position: absolute;
      left: 0;
      right: 1.4em;
      bottom: -2px;
      height: 1px;
      background: currentColor;
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    }
    &:hover::after { transform: scaleX(1); }
    &:focus-visible {
      outline: 2px solid #fff;
      outline-offset: 3px;
    }
  }
  &__panel:hover &__cta,
  &__panel:focus-within &__cta,
  &__panel.is-active &__cta {
    bottom: 2rem;
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }
  // Nudge the caption up when a CTA shares the corner so they don't overlap.
  // (The CTA is a sibling of the button, not of the reveal, so a `:has(~)`
  // relation can't reach it — key off an explicit `has-cta` panel class.)
  &__panel.has-cta:hover &__reveal,
  &__panel.has-cta:focus-within &__reveal,
  &__panel.has-cta.is-active &__reveal {
    bottom: 5.2rem;
  }

  // ── Reduced motion ─────────────────────────────────────────────────────────
  &.is-reduced &__panel,
  &.is-reduced &__img,
  &.is-reduced &__spine,
  &.is-reduced &__reveal,
  &.is-reduced &__cta {
    transition: none;
  }

  // ── Mobile: fold to a vertical stack of tap-to-open panels ──────────────────
  // No @media — collapse decision comes from useViewport() → [data-collapse].
  &[data-collapse='mobile'] &__track {
    flex-direction: column;
    height: auto;
    gap: 0.4rem;
  }
  &[data-collapse='mobile'] &__panel {
    flex: 0 0 auto;
    height: 9rem;
    transition: height 0.5s cubic-bezier(0.22, 1, 0.36, 1);

    &.is-active { height: 60vh; }
    // Hover/focus growth is desktop-only; on mobile only the tapped panel opens.
    &:hover,
    &:focus-within { flex-grow: 0; }
  }
  &[data-collapse='mobile'] &__spine {
    writing-mode: horizontal-tb;
    transform: translateX(-50%);
    left: 50%;
    bottom: 50%;
  }
  &[data-collapse='mobile'] &__panel:hover &__spine,
  &[data-collapse='mobile'] &__panel:focus-within &__spine {
    opacity: 1; // only the active panel hides its spine on mobile
  }
  &[data-collapse='mobile'] &__panel.is-active &__spine { opacity: 0; }
  &[data-collapse='mobile'] &__panel:hover &__reveal,
  &[data-collapse='mobile'] &__panel:focus-within &__reveal { opacity: 0; transform: translateY(0.8rem); }
  &[data-collapse='mobile'] &__panel.is-active &__reveal { opacity: 1; transform: translateY(0); }
  &[data-collapse='mobile'] &__panel:hover &__cta,
  &[data-collapse='mobile'] &__panel:focus-within &__cta { opacity: 0; pointer-events: none; }
  &[data-collapse='mobile'] &__panel.is-active &__cta { opacity: 1; pointer-events: auto; bottom: 2rem; }
  &.is-reduced &__panel { transition: none; }
}
</style>
