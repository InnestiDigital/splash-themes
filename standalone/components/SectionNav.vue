<template>
  <!--
    Scrollspy section rail — a persistent wayfinding dot-nav for long one-page
    layouts (the fullpage.js / readymag / Framer studio signature).

    Mounted ONCE per layout and inert until opted in via theme settings
    (`sectionNav.enabled`). It auto-discovers the page's top-level colour-scheme
    sections (`#main-content section.section-renderer[id]`) — no per-block
    wiring — and renders a fixed vertical rail of dots, one per section, with a
    thin track that fills to the section you're currently reading. The active
    dot is tracked on scroll; clicking (or keyboard-activating) a dot smooth-
    scrolls to its section. Labels reveal on hover / focus.

    Distinct from the `progress` reading-chrome (a continuous "how far in am I"
    bar): this is discrete "where am I / jump there" wayfinding across named
    destinations, mirroring the site's own nav vocabulary.

    ── Opt-out / graceful degradation ──
      • absent `sectionNav` key → disabled → renders nothing (existing sites
        byte-identical).
      • editor preview → hidden (dots would be editing noise + hijack scroll).
      • below `minViewport` (default 768) → hidden (the drawer nav covers mobile).
      • fewer than 2 discoverable sections → renders nothing (nothing to navigate).
      • reduced motion → rail still works (it's functional wayfinding, not decor);
        only the smooth-scroll + scale transitions are dropped.

    A section may override its rail label with `data-nav-label="…"`; otherwise the
    label is humanised from the section `id` (matches the site's nav vocabulary:
    overview / team / work / …). Sections whose id is in SKIP_IDS (footer)
    are excluded.
  -->
  <Teleport to="body">
    <nav
      v-if="running && sections.length >= 2"
      data-cursor-scope
      class="section-nav"
      :class="[`section-nav--${position}`, { 'is-reduced': isReducedMotion }]"
      :aria-label="ariaLabel"
    >
      <span class="section-nav__track" aria-hidden="true">
        <span class="section-nav__track-fill" :style="{ transform: `scaleY(${fillRatio})` }" />
      </span>
      <ul class="section-nav__list">
        <li v-for="(s, i) in sections" :key="s.id" class="section-nav__item">
          <a
            class="section-nav__link"
            :class="{ 'is-active': i === activeIndex }"
            :href="`#${s.id}`"
            :aria-current="i === activeIndex ? 'location' : undefined"
            @click.prevent="go(i)"
          >
            <span class="section-nav__dot" aria-hidden="true" />
            <span class="section-nav__label">{{ s.label }}</span>
          </a>
        </li>
      </ul>
    </nav>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useClientConfig } from '~/shared/composables/useClientConfig'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'
import { useViewport } from '~/shared/composables/useViewport'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'

interface SectionNavConfig {
  enabled?: boolean
  position?: 'left' | 'right'
  minViewport?: number
  ariaLabel?: string
}

interface RailSection {
  id: string
  label: string
  el: HTMLElement
}

// Sections that are page chrome, not navigable content destinations.
const SKIP_IDS = new Set(['footer'])
// The scan line sits this fraction down the viewport; the last section whose
// top has crossed it is "active" (classic scrollspy, robust to varied heights).
const ACTIVE_LINE = 0.4

const { themeSettings, isConfigLoaded } = useClientConfig()
const { isReducedMotion } = useReducedMotion()
const { innerWidth } = useViewport()
const renderMode = useRenderMode()

const cfg = computed<SectionNavConfig>(() => {
  const raw = (themeSettings.value as Record<string, unknown>)?.sectionNav
  return raw && typeof raw === 'object' ? (raw as SectionNavConfig) : {}
})

const position = computed<'left' | 'right'>(() => (cfg.value.position === 'left' ? 'left' : 'right'))
const minViewport = computed(() => (typeof cfg.value.minViewport === 'number' ? cfg.value.minViewport : 768))
const ariaLabel = computed(() => cfg.value.ariaLabel || 'Section navigation')

// Gate: opt-in + config known + not the editor preview + wide enough.
const enabled = computed(
  () =>
    isConfigLoaded.value &&
    cfg.value.enabled === true &&
    renderMode.value !== 'editor-preview' &&
    innerWidth.value >= minViewport.value,
)

const sections = ref<RailSection[]>([])
const activeIndex = ref(0)
const running = ref(false)

const fillRatio = computed(() => {
  const n = sections.value.length
  return n > 1 ? activeIndex.value / (n - 1) : 0
})

function humanize(id: string): string {
  return id
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function mainEl(): HTMLElement | null {
  return typeof document !== 'undefined' ? document.querySelector<HTMLElement>('#main-content') : null
}

function scan() {
  const root = mainEl()
  if (!root) {
    sections.value = []
    return
  }
  const next: RailSection[] = []
  const seen = new Set<string>()
  root.querySelectorAll<HTMLElement>('section.section-renderer[id]').forEach((el) => {
    const id = el.id
    if (!id || SKIP_IDS.has(id) || seen.has(id)) return
    // Skip hidden / zero-height sections (e.g. not-yet-loaded async blocks).
    if (el.offsetParent === null && el.getClientRects().length === 0) return
    seen.add(id)
    next.push({ id, label: el.dataset.navLabel?.trim() || humanize(id), el })
  })
  // Only replace when the id list actually changed — avoids clobbering the
  // reactive array (and dot DOM) on every unrelated mutation.
  if (next.length !== sections.value.length || next.some((s, i) => s.id !== sections.value[i]?.id)) {
    sections.value = next
    if (activeIndex.value > next.length - 1) activeIndex.value = Math.max(0, next.length - 1)
  }
  computeActive()
}

function computeActive() {
  if (typeof window === 'undefined') return
  const line = window.innerHeight * ACTIVE_LINE
  let idx = 0
  for (let i = 0; i < sections.value.length; i++) {
    // Document order → tops increase; the first section still below the line
    // ends the search.
    if (sections.value[i].el.getBoundingClientRect().top - line <= 0) idx = i
    else break
  }
  if (idx !== activeIndex.value) activeIndex.value = idx
}

function go(i: number) {
  const el = sections.value[i]?.el
  if (!el) return
  activeIndex.value = i // optimistic — feel snappy before the scroll settles
  el.scrollIntoView({ behavior: isReducedMotion.value ? 'auto' : 'smooth', block: 'start' })
}

// ── lifecycle: scroll + resize (rAF-throttled) and a mutation observer that
//    rescans when the page's block tree changes (async block loads / SPA route
//    change) — all torn down when the gate closes. ──
let ticking = false
let scanTimer = 0
let observer: MutationObserver | null = null

function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    computeActive()
    ticking = false
  })
}

function scheduleScan() {
  if (scanTimer) window.clearTimeout(scanTimer)
  scanTimer = window.setTimeout(scan, 200)
}

function start() {
  if (running.value) return
  running.value = true
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  // Observe `document.body`, not `#main-content`: the gate can flip open during
  // setup (config already cached) before the layout's `#main-content` — let
  // alone its async-rendered blocks — exists in the DOM. Body is always present,
  // so we still catch the sections appearing. scan() filters to `#main-content`.
  if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(scheduleScan)
    observer.observe(document.body, { childList: true, subtree: true })
  }
  scan()
  scheduleScan() // belt-and-braces: catch the first block paint if the observer missed it
}

function stop() {
  if (!running.value) return
  running.value = false
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  observer?.disconnect()
  observer = null
  if (scanTimer) window.clearTimeout(scanTimer)
  scanTimer = 0
  sections.value = []
  activeIndex.value = 0
}

watch(
  enabled,
  (on) => {
    if (on) start()
    else stop()
  },
  { immediate: true },
)

onBeforeUnmount(stop)
</script>

<style scoped>
.section-nav {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  z-index: 9000;
  pointer-events: none; /* only the links are interactive */
}
.section-nav--right {
  right: 1.6rem;
}
.section-nav--left {
  left: 1.6rem;
}

/* Track line behind the dots + a fill that grows to the active dot. */
.section-nav__track {
  position: absolute;
  top: 0.45rem;
  bottom: 0.45rem;
  left: 50%;
  width: 0.15rem;
  transform: translateX(-50%);
  background: color-mix(in srgb, var(--color-text, #222) 16%, transparent);
  border-radius: 0.15rem;
  overflow: hidden;
}
.section-nav__track-fill {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: top center;
  background: var(--color-accent, #1b8ab7);
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.section-nav__list {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
}
.section-nav__item {
  display: flex;
}

.section-nav__link {
  pointer-events: auto;
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.3rem;
  text-decoration: none;
  cursor: pointer;
}
.section-nav--left .section-nav__link {
  flex-direction: row;
}
.section-nav--right .section-nav__link {
  flex-direction: row-reverse;
}

.section-nav__dot {
  flex: none;
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 50%;
  background: transparent;
  border: 0.15rem solid color-mix(in srgb, var(--color-text, #222) 42%, transparent);
  transition: transform 0.25s ease, background-color 0.25s ease, border-color 0.25s ease;
}
.section-nav__link:hover .section-nav__dot,
.section-nav__link:focus-visible .section-nav__dot {
  border-color: var(--color-accent, #1b8ab7);
  transform: scale(1.25);
}
.section-nav__link.is-active .section-nav__dot {
  background: var(--color-accent, #1b8ab7);
  border-color: var(--color-accent, #1b8ab7);
  transform: scale(1.35);
}

/* Label pill — hidden until hover / keyboard focus. */
.section-nav__label {
  white-space: nowrap;
  padding: 0.35rem 0.8rem;
  border-radius: 0.6rem;
  background: var(--color-text, #222);
  color: var(--color-bg, #fff);
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  font-family: var(--rt-role-caption-family, Inter, sans-serif);
  opacity: 0;
  transform: translateX(0.4rem);
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.section-nav--right .section-nav__label {
  transform: translateX(0.4rem);
}
.section-nav--left .section-nav__label {
  transform: translateX(-0.4rem);
}
.section-nav__link:hover .section-nav__label,
.section-nav__link:focus-visible .section-nav__label {
  opacity: 1;
  transform: translateX(0);
}

.section-nav__link:focus-visible {
  outline: 0.2rem solid var(--color-focus, var(--color-accent, #1b8ab7));
  outline-offset: 0.2rem;
  border-radius: 0.4rem;
}

/* Reduced motion — functional rail, no easing. */
.section-nav.is-reduced .section-nav__track-fill,
.section-nav.is-reduced .section-nav__dot,
.section-nav.is-reduced .section-nav__label {
  transition: none;
}
</style>

<!-- Global: offset in-page anchor scrolling by the sticky header height so a
     jumped-to section lands below the header rather than under it. Harmless +
     benefits every #anchor navigation, not just the rail. -->
<style>
[data-theme="standalone"] #main-content section.section-renderer[id] {
  scroll-margin-top: calc(var(--header-height, 0px) + 1.5rem);
}
</style>
