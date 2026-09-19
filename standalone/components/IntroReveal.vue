<template>
  <!--
    Brand entrance reveal — a once-per-session curtain that covers the viewport
    on first entry, runs a 0→100 counter, then sweeps away to reveal the page.
    Opt-in via theme settings (`introReveal.enabled`); renders nothing otherwise.
    Decorative + aria-hidden; auto-dismisses on a hard timeout so it can never
    trap the visitor even if the timeline misfires.
  -->
  <Transition name="intro-reveal__teardown">
    <div
      v-if="active"
      class="intro-reveal"
      :class="[`intro-reveal--${mode}`, { 'is-revealing': phase === 'revealing' }]"
      aria-hidden="true"
      data-intro-reveal
    >
      <!-- curtain panels (1 for wipe/fade, 2 for curtain) -->
      <span class="intro-reveal__panel intro-reveal__panel--a" />
      <span v-if="mode === 'curtain'" class="intro-reveal__panel intro-reveal__panel--b" />

      <div class="intro-reveal__inner">
        <span v-if="label" class="intro-reveal__label">{{ label }}</span>
        <span class="intro-reveal__rule"><span class="intro-reveal__rule-fill" :style="{ transform: `scaleX(${counter / 100})` }" /></span>
        <span v-if="showCounter" class="intro-reveal__counter">{{ counter }}</span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useClientConfig } from '~/shared/composables/useClientConfig'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'

type IntroMode = 'curtain' | 'wipe' | 'fade'

interface IntroRevealConfig {
  enabled?: boolean
  mode?: IntroMode
  durationMs?: number
  showCounter?: boolean
  label?: string
}

const SESSION_KEY = 'splash:introReveal:played'
const REVEAL_MS = 340 // sweep-away duration (kept in sync with CSS transition)
// Parity cap: the curtain must clear within ~600ms total (cover + sweep) so it
// never behaves like a blocking preloader. Even a large configured durationMs is
// clamped to this budget when the reveal actually plays.
const HARD_CAP_MS = 600
const VALID_MODES: readonly IntroMode[] = ['curtain', 'wipe', 'fade']

const { themeSettings, isConfigLoaded } = useClientConfig()
const { isReducedMotion } = useReducedMotion()

const cfg = computed<IntroRevealConfig>(() => {
  const raw = (themeSettings.value as Record<string, unknown>)?.introReveal
  return raw && typeof raw === 'object' ? (raw as IntroRevealConfig) : {}
})

const mode = computed<IntroMode>(() => {
  const m = cfg.value.mode
  return m && VALID_MODES.includes(m) ? m : 'curtain'
})
const durationMs = computed(() => {
  const d = Number(cfg.value.durationMs)
  return Number.isFinite(d) && d >= 600 && d <= 6000 ? d : 1600
})
const showCounter = computed(() => cfg.value.showCounter !== false)
const label = computed(() => {
  const l = cfg.value.label ?? (themeSettings.value as Record<string, unknown>)?.siteName
  return typeof l === 'string' ? l.trim() : ''
})

const active = ref(false)
const phase = ref<'covering' | 'revealing'>('covering')
const counter = ref(0)

let raf = 0
let revealTimer: ReturnType<typeof setTimeout> | null = null
let killTimer: ReturnType<typeof setTimeout> | null = null
let started = false

function playedThisSession(): boolean {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function markPlayed() {
  try {
    sessionStorage?.setItem(SESSION_KEY, '1')
  } catch {
    // private mode / blocked storage — non-fatal, reveal just replays next nav
  }
}

function teardown() {
  active.value = false
  if (raf) cancelAnimationFrame(raf)
  if (revealTimer) clearTimeout(revealTimer)
  if (killTimer) clearTimeout(killTimer)
  raf = revealTimer = killTimer = 0 as never
}

function start() {
  if (started) return
  started = true
  markPlayed()
  active.value = true
  phase.value = 'covering'
  counter.value = 0

  // Clamp the whole play (cover + sweep) to the parity budget so the curtain
  // reads as a quick brand flash, not a preloader that gates content.
  const totalBudget = Math.min(durationMs.value, HARD_CAP_MS)
  const countFor = Math.max(160, totalBudget - REVEAL_MS)
  let t0 = 0
  const tick = (now: number) => {
    if (!t0) t0 = now
    const p = Math.min(1, (now - t0) / countFor)
    // ease-out so the count decelerates into 100
    counter.value = Math.round((1 - Math.pow(1 - p, 2.2)) * 100)
    if (p < 1) {
      raf = requestAnimationFrame(tick)
    } else {
      counter.value = 100
      phase.value = 'revealing'
      revealTimer = setTimeout(teardown, REVEAL_MS)
    }
  }
  raf = requestAnimationFrame(tick)

  // Hard safety net: whatever happens, the curtain is gone by now.
  killTimer = setTimeout(teardown, totalBudget + REVEAL_MS + 300)
}

// Decide once config is known. Disabled / reduced-motion / already-played → never mounts.
watch(
  [isConfigLoaded, () => cfg.value.enabled, isReducedMotion],
  ([loaded, enabled, reduced]) => {
    if (!loaded || started) return
    if (enabled && !reduced && !playedThisSession()) start()
  },
  { immediate: true },
)

onBeforeUnmount(teardown)
</script>

<style scoped>
.intro-reveal {
  position: fixed;
  inset: 0;
  z-index: 10000;
  overflow: hidden;
  /* Decorative curtain — it has no skip control and nothing clickable, so it
     must NOT eat input: with `auto` it silently blocked every click/drag for
     its full ~2s play (and broke all pointer-driven E2E in fresh sessions,
     where it plays on every page load). */
  pointer-events: none;
}

/* Panels carry the brand fill; their motion is the reveal. */
.intro-reveal__panel {
  position: absolute;
  inset: 0;
  background: var(--color-primary, #1e3d4f);
  will-change: transform, opacity;
}

/* Centred wordmark + counter, fades before the panels move. */
.intro-reveal__inner {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.6rem;
  color: var(--color-white, #fff);
  transition: opacity 0.34s ease, transform 0.34s ease;
}

.intro-reveal__label {
  font-size: clamp(2rem, 5vw, 4.4rem);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.intro-reveal__rule {
  display: block;
  width: clamp(8rem, 22vw, 18rem);
  height: 0.2rem;
  background: rgba(255, 255, 255, 0.18);
  overflow: hidden;
}
.intro-reveal__rule-fill {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--color-accent, #ff8614);
  transform-origin: left center;
}

.intro-reveal__counter {
  font-size: clamp(1.2rem, 2vw, 1.6rem);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.12em;
  opacity: 0.72;
}

/* ── Reveal: fade the wordmark, then sweep the panels ── */
.intro-reveal.is-revealing .intro-reveal__inner {
  opacity: 0;
  transform: translateY(-0.8rem);
}

/* curtain — two halves part left/right */
.intro-reveal--curtain .intro-reveal__panel--a {
  right: 50%;
  transition: transform 0.34s cubic-bezier(0.76, 0, 0.24, 1);
}
.intro-reveal--curtain .intro-reveal__panel--b {
  left: 50%;
  transition: transform 0.34s cubic-bezier(0.76, 0, 0.24, 1);
}
.intro-reveal--curtain.is-revealing .intro-reveal__panel--a {
  transform: translateX(-100%);
}
.intro-reveal--curtain.is-revealing .intro-reveal__panel--b {
  transform: translateX(100%);
}

/* wipe — single panel slides up */
.intro-reveal--wipe .intro-reveal__panel--a {
  transition: transform 0.34s cubic-bezier(0.76, 0, 0.24, 1);
}
.intro-reveal--wipe.is-revealing .intro-reveal__panel--a {
  transform: translateY(-100%);
}

/* fade — panel dissolves */
.intro-reveal--fade .intro-reveal__panel--a {
  transition: opacity 0.34s ease;
}
.intro-reveal--fade.is-revealing .intro-reveal__panel--a {
  opacity: 0;
}

/* Final unmount guard — instant once panels finished, but soften any residue. */
.intro-reveal__teardown-leave-active {
  transition: opacity 0.2s ease;
}
.intro-reveal__teardown-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .intro-reveal {
    display: none !important;
  }
}
</style>
