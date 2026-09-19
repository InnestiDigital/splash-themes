<template>
  <section
    class="stat-counter"
    :class="[`stat-counter--${density}`, `stat-counter--align-${align}`]"
    :style="measureStyle"
    data-target="root"
  >
    <!-- Stacked share bar: all stats collapse into ONE segmented bar + legend. -->
    <div
      v-if="isStacked"
      ref="el"
      class="stat-counter__stack-wrap"
      data-target="items"
    >
      <div
        class="stat-counter__stack"
        role="img"
        :aria-label="stackSummary"
      >
        <span
          v-for="(s, i) in items"
          :key="i"
          class="stat-counter__seg"
          :class="{ 'is-in': fillActive }"
          data-target="item"
          aria-hidden="true"
          :style="{
            flexBasis: `${fillActive ? shares[i] * 100 : 0}%`,
            '--seg-i': i,
            transitionDelay: `${i * 70}ms`,
            '--fill-dur': fillDur,
          }"
        />
      </div>
      <ul class="stat-counter__legend">
        <li v-for="(s, i) in items" :key="i" class="stat-counter__legend-item">
          <span
            class="stat-counter__legend-swatch"
            aria-hidden="true"
            :style="{ '--seg-i': i }"
          />
          <span class="stat-counter__legend-text">
            <span v-if="label(s)" class="stat-counter__legend-label">{{ label(s) }}</span>
            <span class="stat-counter__legend-value">{{ s.prefix }}{{ formatValue(s) }}{{ s.suffix }}<span v-if="s.suffix.trim() !== '%'" class="stat-counter__legend-share">{{ sharePct(i) }}</span></span>
          </span>
        </li>
      </ul>
    </div>

    <ul v-else ref="el" class="stat-counter__grid" data-target="items">
      <li
        v-for="(s, i) in items"
        :key="i"
        class="stat-counter__item"
        data-target="item"
        :style="{ transitionDelay: `${i * 70}ms` }"
        :class="{ 'is-in': playing || done }"
      >
        <!-- Optional radial ring — decorative; the value span carries the real figure. -->
        <svg
          v-if="visual === 'ring'"
          class="stat-counter__ring"
          viewBox="0 0 100 100"
          aria-hidden="true"
          focusable="false"
        >
          <circle class="stat-counter__ring-track" cx="50" cy="50" :r="RING_R" fill="none" />
          <circle
            class="stat-counter__ring-fill"
            cx="50"
            cy="50"
            :r="RING_R"
            fill="none"
            :style="{ strokeDasharray: RING_CIRC, strokeDashoffset: ringOffset(i), '--fill-dur': fillDur }"
          />
        </svg>

        <!-- Accessible final value; animated cells below are aria-hidden. -->
        <span class="stat-counter__value" role="text" :aria-label="srValue(s)">
          <span v-if="s.prefix" class="stat-counter__affix" aria-hidden="true">{{ s.prefix }}</span>

          <!-- Plain tween / reduced-motion: a single text node we update each frame. -->
          <span v-if="mode === 'tween' || isReducedMotion" class="stat-counter__num" aria-hidden="true">{{ rendered[i] }}</span>

          <!-- Odometer: each character is its own rolling column. -->
          <span v-else class="stat-counter__num stat-counter__num--odometer" aria-hidden="true">
            <span
              v-for="(cell, ci) in odometer[i]"
              :key="ci"
              class="stat-counter__cell"
              :class="{ 'stat-counter__cell--digit': cell.digit }"
            >
              <template v-if="cell.digit">
                <span
                  class="stat-counter__reel"
                  :style="{
                    transform: `translateY(${playing || done ? -(10 + cell.target) : 0}em)`,
                    transitionDuration: `${reelDuration}ms`,
                    transitionDelay: `${ci * 40}ms`,
                  }"
                >
                  <span v-for="d in REEL" :key="d" class="stat-counter__digit">{{ d % 10 }}</span>
                </span>
              </template>
              <template v-else>{{ cell.char }}</template>
            </span>
          </span>

          <span v-if="s.suffix" class="stat-counter__affix" aria-hidden="true">{{ s.suffix }}</span>
        </span>

        <!-- Optional horizontal bar — decorative; fills to Value / max. -->
        <div v-if="visual === 'bar'" class="stat-counter__bar" aria-hidden="true">
          <span
            class="stat-counter__bar-fill"
            :style="{ transform: `scaleX(${ fillActive ? fractions[i] : 0 })`, '--fill-dur': fillDur }"
          />
        </div>

        <span v-if="label(s)" class="stat-counter__label">{{ label(s) }}</span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'

type Mode = 'tween' | 'odometer'
type Speed = 'slow' | 'normal' | 'fast'
type Group = 'none' | 'comma' | 'dot' | 'space'
type Density = 'compact' | 'comfortable' | 'wide'
type Align = 'left' | 'center'

interface StatInput {
  value?: number | string
  max?: number | string
  prefix?: string
  suffix?: string
  label?: string | Record<string, string>
  decimals?: number | string
}

const props = defineProps<{
  stats?: StatInput[]
  countMode?: Mode
  speed?: Speed
  groupStyle?: Group
  trigger?: 'in-view' | 'immediate'
  once?: boolean
  density?: Density
  align?: Align
  measureWidth?: 'content' | 'narrow' | 'standard' | 'wide' | 'full'
  visual?: 'none' | 'ring' | 'bar' | 'stacked'
}>()

const { getLocalizedValue } = useLocalized()
const { isReducedMotion } = useReducedMotion()

const mode = computed<Mode>(() => props.countMode || 'tween')
const density = computed<Density>(() => props.density || 'comfortable')
const align = computed<Align>(() => props.align || 'left')
const once = computed(() => props.once ?? true)

// Speed → tween + reel durations (ms).
const SPEEDS: Record<Speed, { tween: number; reel: number }> = {
  slow: { tween: 2600, reel: 1900 },
  normal: { tween: 1800, reel: 1300 },
  fast: { tween: 1100, reel: 850 },
}
const duration = computed(() => SPEEDS[props.speed || 'normal'].tween)
const reelDuration = computed(() => SPEEDS[props.speed || 'normal'].reel)

// Two full 0–9 cycles so the reel does a visible >1× rotation before landing.
const REEL = Array.from({ length: 20 }, (_, i) => i)

// Ring geometry (computed once — SVG viewBox is 100×100).
const RING_R = 42
const RING_CIRC = 2 * Math.PI * RING_R

interface Stat {
  value: number
  max: number
  prefix: string
  suffix: string
  label: string | Record<string, string> | undefined
  decimals: number
}

const items = computed<Stat[]>(() =>
  (props.stats ?? []).map((s) => ({
    value: Number(s.value ?? 0) || 0,
    max: Math.max(1, Number(s.max ?? 100) || 100),
    prefix: s.prefix?.toString() ?? '',
    suffix: s.suffix?.toString() ?? '',
    label: s.label,
    decimals: Math.max(0, Math.min(4, Number(s.decimals ?? 0) || 0)),
  })),
)

const visual = computed<'none' | 'ring' | 'bar' | 'stacked'>(() => props.visual || 'none')
const fractions = computed(() => items.value.map((s) => Math.min(1, Math.max(0, s.value / s.max))))

// ── Stacked share bar ─────────────────────────────────────────────────────────
const isStacked = computed(() => visual.value === 'stacked')
const total = computed(() => items.value.reduce((sum, s) => sum + Math.max(0, s.value), 0))
const shares = computed(() =>
  items.value.map((s) => (total.value > 0 ? Math.max(0, s.value) / total.value : 0)),
)

function label(s: Stat): string {
  return s.label ? getLocalizedValue(s.label) : ''
}

function formatValue(s: Stat): string {
  return format(s.value, s.decimals)
}
function sharePct(i: number): string {
  return `${Math.round(shares.value[i] * 100)}%`
}
const stackSummary = computed(() =>
  items.value
    .map((s, i) => `${label(s) || formatValue(s)} ${sharePct(i)}`)
    .join(', '),
)

// ── Number formatting (grouped thousands + locale decimal separator) ─────────
function separators(g: Group): { group: string; decimal: string } {
  switch (g) {
    case 'comma': return { group: ',', decimal: '.' } // 1,250.5
    case 'dot': return { group: '.', decimal: ',' }   // 1.250,5 (it-IT)
    case 'space': return { group: ' ', decimal: ',' } // 1 250,5
    default: return { group: '', decimal: '.' }
  }
}

function format(value: number, decimals: number): string {
  const { group, decimal } = separators(props.groupStyle || 'none')
  const fixed = Math.abs(value).toFixed(decimals)
  const [int, frac] = fixed.split('.')
  const grouped = group ? int.replace(/\B(?=(\d{3})+(?!\d))/g, group) : int
  const sign = value < 0 ? '-' : ''
  return frac ? `${sign}${grouped}${decimal}${frac}` : `${sign}${grouped}`
}

function srValue(s: Stat): string {
  return `${s.prefix}${format(s.value, s.decimals)}${s.suffix}`.trim()
}

// ── Odometer cell model: per-character columns, digits get a rolling reel ─────
interface Cell { char: string; digit: boolean; target: number }
const odometer = computed<Cell[][]>(() =>
  items.value.map((s) =>
    [...format(s.value, s.decimals)].map((char) => {
      const code = char.charCodeAt(0)
      const isDigit = code >= 48 && code <= 57
      return { char, digit: isDigit, target: isDigit ? code - 48 : 0 }
    }),
  ),
)

// ── Tween state (text mode) ──────────────────────────────────────────────────
const el = ref<HTMLElement | null>(null)
const playing = ref(false)
const done = ref(false)
const rendered = ref<string[]>([])

// Ring/bar fill: active whenever the count is running or finished (syncs with
// both count modes and both triggers).
const fillActive = computed(() => playing.value || done.value)
// Empty = full circumference offset; filled = offset by the uncovered fraction.
function ringOffset(i: number): number {
  return fillActive.value ? RING_CIRC * (1 - fractions.value[i]) : RING_CIRC
}
// Reduced motion → 0ms so the fill JUMPS (handled in JS, not via @media).
const fillDur = computed(() => (isReducedMotion.value ? 0 : duration.value) + 'ms')

let raf = 0
let observer: IntersectionObserver | null = null
let startTs = 0

function finalStrings(): string[] {
  return items.value.map((s) => format(s.value, s.decimals))
}
function zeroStrings(): string[] {
  return items.value.map((s) => format(0, s.decimals))
}

// ease-out cubic
function ease(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function frame(now: number) {
  if (!startTs) startTs = now
  const t = Math.min(1, (now - startTs) / duration.value)
  const k = ease(t)
  rendered.value = items.value.map((s) => format(s.value * k, s.decimals))
  if (t >= 1) {
    rendered.value = finalStrings()
    playing.value = false
    done.value = true
    raf = 0
    return
  }
  raf = requestAnimationFrame(frame)
}

function play() {
  if (playing.value || (done.value && once.value)) return
  done.value = false
  playing.value = true
  if (mode.value === 'tween' && !isReducedMotion.value) {
    rendered.value = zeroStrings()
    startTs = 0
    raf = requestAnimationFrame(frame)
  }
  // odometer mode is CSS-transition driven by the `is-in` class flip.
  if (mode.value === 'odometer') {
    window.setTimeout(() => {
      done.value = true
      playing.value = false
    }, reelDuration.value + items.value.length * 70 + 300)
  }
}

function stop() {
  if (!playing.value && !done.value) return
  cancelAnimationFrame(raf)
  raf = 0
  startTs = 0
  playing.value = false
  done.value = false
  if (mode.value === 'tween') rendered.value = zeroStrings()
}

onMounted(() => {
  rendered.value = finalStrings()
  if (isReducedMotion.value) {
    done.value = true
    return
  }
  rendered.value = mode.value === 'tween' ? zeroStrings() : finalStrings()

  if (props.trigger === 'immediate') {
    play()
    return
  }
  if (typeof IntersectionObserver === 'undefined' || !el.value) {
    play()
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) play()
        else if (!once.value) stop()
      }
    },
    { threshold: 0.3, rootMargin: '0px 0px -10% 0px' },
  )
  observer.observe(el.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  cancelAnimationFrame(raf)
})

// Re-key when content changes in the editor preview.
watch([items, mode], () => {
  cancelAnimationFrame(raf)
  raf = 0
  startTs = 0
  done.value = false
  playing.value = false
  rendered.value = isReducedMotion.value || mode.value === 'odometer' ? finalStrings() : zeroStrings()
})

const measureStyle = computed<Record<string, string>>(() =>
  props.measureWidth ? { '--block-measure': `var(--measure-width-${props.measureWidth})` } : {},
)
</script>

<style lang="scss" scoped>
.stat-counter {
  max-width: var(--block-measure, none);
  margin-inline: var(--block-measure-align, 0);

  &__grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 2.4rem 2rem;
    // Intrinsic responsive collapse — auto-fit folds to fewer columns (down to 1
    // on mobile) with no @media query; density sets the minimum track width.
    grid-template-columns: repeat(auto-fit, minmax(var(--stat-min, 22rem), 1fr));
  }

  &--compact &__grid { --stat-min: 15rem; }
  &--comfortable &__grid { --stat-min: 22rem; }
  &--wide &__grid { --stat-min: 30rem; }

  &--align-center &__item { text-align: center; align-items: center; }

  &__item {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    // Reveal-on-enter (independent of the count animation).
    opacity: 0;
    transform: translateY(1.2rem);
    transition: opacity 0.6s ease, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
    &.is-in {
      opacity: 1;
      transform: none;
    }
  }

  &__value {
    display: inline-flex;
    align-items: baseline;
    font-family: var(--rt-role-heading1-family, var(--font-family-heading, Georgia, serif));
    // Deliberately NOT the display role (≈136px) — that overflows a stat column.
    // A contained, responsive size that keeps 5–6 digit figures inside their track.
    font-size: clamp(2.8rem, 4.5vw, 4.4rem);
    font-weight: var(--rt-role-heading1-weight, 600);
    line-height: 1;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    color: var(--rt-role-heading1-color, inherit);
  }

  &__affix {
    font-size: 0.55em;
    font-weight: 500;
    opacity: 0.75;
    &:first-child { margin-right: 0.08em; }
    &:last-child { margin-left: 0.08em; }
  }

  // ── Odometer ───────────────────────────────────────────────────────────────
  &__num--odometer {
    display: inline-flex;
    align-items: baseline;
  }

  &__cell {
    display: inline-block;
    &--digit {
      // The window: exactly one digit (1em) tall, clipping the reel.
      height: 1em;
      overflow: hidden;
      vertical-align: bottom;
    }
  }

  &__reel {
    display: flex;
    flex-direction: column;
    transition-property: transform;
    transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform;
  }

  &__digit {
    height: 1em;
    line-height: 1;
  }

  &__label {
    font-family: var(--rt-role-body-family, var(--font-family-body, inherit));
    font-size: var(--font-size-sm, 1.4rem);
    line-height: 1.35;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    opacity: 0.7;
  }

  // ── Radial ring ──────────────────────────────────────────────────────────────
  &__ring {
    width: clamp(5.5rem, 8vw, 7.5rem);
    height: clamp(5.5rem, 8vw, 7.5rem);
    display: block;
    margin-bottom: 1.1rem;
  }
  &--align-center &__ring { margin-inline: auto; }

  &__ring-track {
    stroke: var(--border-color, rgba(0, 0, 0, 0.12));
    stroke-width: 7;
  }

  &__ring-fill {
    stroke: var(--color-accent, var(--rt-role-heading1-color, currentColor));
    stroke-width: 7;
    stroke-linecap: round;
    transform: rotate(-90deg);
    transform-origin: 50% 50%;
    transition: stroke-dashoffset var(--fill-dur, 1800ms) cubic-bezier(0.33, 1, 0.68, 1);
  }

  // ── Horizontal bar ───────────────────────────────────────────────────────────
  &__bar {
    width: 100%;
    max-width: 22rem;
    height: 6px;
    margin-top: 1rem;
    border-radius: 3px;
    background: var(--border-color, rgba(0, 0, 0, 0.12));
    overflow: hidden;
  }
  &--align-center &__bar { margin-inline: auto; }

  &__bar-fill {
    display: block;
    width: 100%;
    height: 100%;
    transform-origin: left center;
    background: var(--color-accent, var(--rt-role-heading1-color, currentColor));
    border-radius: 3px;
    transition: transform var(--fill-dur, 1800ms) cubic-bezier(0.33, 1, 0.68, 1);
  }

  // ── Stacked share bar ──────────────────────────────────────────────────────────
  &__stack-wrap {
    width: 100%;
  }

  &__stack {
    display: flex;
    width: 100%;
    height: clamp(1.4rem, 3vw, 2.2rem);
    border-radius: 4px;
    overflow: hidden;
    background: var(--border-color, rgba(0, 0, 0, 0.1));
  }

  &__seg {
    flex-grow: 0;
    flex-shrink: 0;
    min-width: 0;
    background: var(--color-accent, var(--rt-role-heading1-color, currentColor));
    // Monochrome accent step — later segments fade, floored so the last stays legible.
    opacity: clamp(0.34, calc(1 - var(--seg-i, 0) * 0.16), 1);
    transition: flex-basis var(--fill-dur, 1800ms) cubic-bezier(0.33, 1, 0.68, 1);

    // 1px separator between adjacent segments for legibility.
    & + & {
      box-shadow: -1px 0 0 var(--color-surface, #fff);
    }
  }

  &__legend {
    list-style: none;
    margin: 1.4rem 0 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 2rem;
  }
  &--align-center &__legend { justify-content: center; }

  &__legend-item {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
  }

  &__legend-swatch {
    width: 0.9rem;
    height: 0.9rem;
    border-radius: 2px;
    flex: none;
    align-self: center;
    background: var(--color-accent, currentColor);
    opacity: clamp(0.34, calc(1 - var(--seg-i, 0) * 0.16), 1);
  }

  &__legend-label {
    font-family: var(--rt-role-body-family, var(--font-family-body, inherit));
    font-size: var(--font-size-sm, 1.4rem);
    text-transform: uppercase;
    letter-spacing: 0.02em;
    opacity: 0.7;
    margin-right: 0.5em;
  }

  &__legend-value {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  &__legend-share {
    opacity: 0.6;
    margin-left: 0.3em;
    font-weight: 400;
  }
}
</style>
