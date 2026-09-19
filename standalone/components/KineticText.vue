<template>
  <section class="kinetic-text" :style="{ ...rootStyles, ...measureStyle }">
    <component
      :is="tag"
      ref="el"
      class="kinetic-text__line"
      :class="[`kinetic-text__line--${renderEffect}`, { 'is-in': playing || done }, ...fillClasses]"
      :style="fillStyle"
      data-target="text"
      :data-motion-suppressed="isReducedMotion ? 'true' : undefined"
    >
      <!-- Reduced motion / fill knockout / no-split fallback: plain final text -->
      <template v-if="isReducedMotion || renderEffect === 'line-fade'">{{ plainText }}</template>

      <!-- Word-mask: each word slides up behind a clip line -->
      <template v-else-if="renderEffect === 'word-mask'">
        <span
          v-for="(w, wi) in words"
          :key="wi"
          class="kinetic-text__word"
          aria-hidden="true"
        >
          <span class="kinetic-text__word-inner" :style="{ transitionDelay: `${wi * stagger.word}ms` }">{{ w }}</span>
        </span>
      </template>

      <!-- Char effects: scramble (decode) + char-rise -->
      <template v-else>
        <span
          v-for="(w, wi) in charWords"
          :key="wi"
          class="kinetic-text__word"
          aria-hidden="true"
        >
          <span
            v-for="c in w"
            :key="c.gi"
            class="kinetic-text__char"
            :style="{ transitionDelay: `${c.gi * stagger.char}ms` }"
          >{{ renderEffect === 'scramble' ? display[c.gi] : c.ch }}</span>
        </span>
      </template>

      <!-- Accessible text for screen readers / no-JS -->
      <span class="kinetic-text__sr">{{ plainText }}</span>
    </component>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'

type Effect = 'scramble' | 'char-rise' | 'word-mask' | 'line-fade'
type Speed = 'slow' | 'normal' | 'fast'
type Tag = 'h1' | 'h2' | 'h3' | 'p'
type Align = 'left' | 'center' | 'right'

const props = defineProps<{
  text?: string | Record<string, string>
  tag?: Tag
  effect?: Effect
  speed?: Speed
  trigger?: 'in-view' | 'immediate'
  once?: boolean
  glyphs?: string
  textAlign?: Align
  measureWidth?: 'content' | 'narrow' | 'standard' | 'wide' | 'full'
  fill?: 'none' | 'gradient' | 'image'
  fillGradient?: 'accent' | 'mono' | 'warm' | 'spectrum'
  fillAnimate?: boolean
  fillImage?: string
}>()

const { getLocalizedValue } = useLocalized()
const { isReducedMotion } = useReducedMotion()

const tag = computed<Tag>(() => props.tag || 'h2')
const effect = computed<Effect>(() => props.effect || 'scramble')
const once = computed(() => props.once ?? true)
const textAlign = computed<Align | null>(() => props.textAlign || null)

// Strip any inline HTML — kinetic effects operate on plain text glyphs.
const plainText = computed(() =>
  getLocalizedValue(props.text).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
)

// Whitespace-preserving word split (drops empty tokens from leading/trailing space).
const words = computed(() => plainText.value.split(' ').filter(Boolean))

// Per-char model with a GLOBAL index so the stagger flows continuously across words.
interface Cell { ch: string; gi: number }
const charWords = computed<Cell[][]>(() => {
  let gi = 0
  return words.value.map((w) => [...w].map((ch) => ({ ch, gi: gi++ })))
})
const flatChars = computed<Cell[]>(() => charWords.value.flat())

// Speed → stagger (ms) + scramble duration (ms).
const SPEEDS: Record<Speed, { char: number; word: number; scramble: number }> = {
  slow: { char: 55, word: 110, scramble: 900 },
  normal: { char: 32, word: 70, scramble: 600 },
  fast: { char: 18, word: 45, scramble: 380 },
}
const stagger = computed(() => SPEEDS[props.speed || 'normal'])

const GLYPHS = computed(
  () => props.glyphs || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%&@$',
)

// ── Animation state ────────────────────────────────────────────────────────
const el = ref<HTMLElement | null>(null)
const playing = ref(false)
const done = ref(false)
const display = ref<string[]>([])

let raf = 0
let observer: IntersectionObserver | null = null
let startTs = 0

function randGlyph(seed: number): string {
  // Deterministic-ish cheap PRNG (no Math.random dependency for SSR parity).
  const g = GLYPHS.value
  const x = Math.abs(Math.sin(seed) * 10000)
  return g.charAt(Math.floor((x - Math.floor(x)) * g.length))
}

function runScramble(now: number) {
  if (!startTs) startTs = now
  const elapsed = now - startTs
  const next: string[] = []
  let settled = true
  for (const c of flatChars.value) {
    const lockAt = c.gi * stagger.value.char + stagger.value.scramble
    if (elapsed >= lockAt) {
      next[c.gi] = c.ch
    } else if (elapsed >= c.gi * stagger.value.char) {
      settled = false
      next[c.gi] = randGlyph(c.gi * 7.13 + Math.floor(elapsed / 45))
    } else {
      settled = false
      next[c.gi] = randGlyph(c.gi * 3.7)
    }
  }
  display.value = next
  if (settled) {
    finish()
    return
  }
  raf = requestAnimationFrame(runScramble)
}

function finish() {
  cancelAnimationFrame(raf)
  raf = 0
  display.value = flatChars.value.map((c) => c.ch)
  playing.value = false
  done.value = true
}

function reset() {
  cancelAnimationFrame(raf)
  raf = 0
  startTs = 0
  done.value = false
  playing.value = false
  if (renderEffect.value === 'scramble') {
    display.value = flatChars.value.map((c) => randGlyph(c.gi * 3.7))
  }
}

function play() {
  if (playing.value || (done.value && once.value)) return
  reset()
  playing.value = true
  if (renderEffect.value === 'scramble') {
    startTs = 0
    raf = requestAnimationFrame(runScramble)
  } else {
    // CSS-driven effects: `is-in` flips the transitions; mark done after the
    // longest staggered transition would have completed.
    const last = renderEffect.value === 'word-mask'
      ? (words.value.length - 1) * stagger.value.word
      : (flatChars.value.length - 1) * stagger.value.char
    window.setTimeout(() => {
      done.value = true
      playing.value = false
    }, last + 700)
  }
}

function stop() {
  if (!playing.value && !done.value) return
  reset()
}

onMounted(() => {
  if (isReducedMotion.value) {
    done.value = true
    return
  }
  if (renderEffect.value === 'scramble') reset()

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
    { threshold: 0.35, rootMargin: '0px 0px -10% 0px' },
  )
  observer.observe(el.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  cancelAnimationFrame(raf)
})

// Re-key when content/effect/fill changes in the editor preview.
watch([plainText, effect, () => props.fill, () => props.fillImage], () => {
  done.value = false
  playing.value = false
  if (!isReducedMotion.value && renderEffect.value === 'scramble') reset()
})

const rootStyles = computed<Record<string, string>>(() => {
  const s: Record<string, string> = {}
  if (textAlign.value) s.textAlign = textAlign.value
  return s
})

const measureStyle = computed<Record<string, string>>(() =>
  props.measureWidth ? { '--block-measure': `var(--measure-width-${props.measureWidth})` } : {},
)

const FILL_GRADIENTS: Record<string, string> = {
  accent: 'linear-gradient(120deg, var(--color-accent, #FF8614), var(--color-accent-rose, #EA587D))',
  mono: 'linear-gradient(120deg, var(--color-text, #1a1a1a), #8a8a8a)',
  warm: 'linear-gradient(120deg, #a8531a, #e0982f)',
  spectrum: 'linear-gradient(115deg, #4f46e5, #db2777, #ea580c)',
}
const fill = computed<'none' | 'gradient' | 'image'>(() => props.fill || 'none')
const fillActive = computed(() => fill.value === 'gradient' || (fill.value === 'image' && !!props.fillImage))
const fillStyle = computed<Record<string, string>>(() => {
  if (fill.value === 'gradient') return { backgroundImage: FILL_GRADIENTS[props.fillGradient || 'accent'] ?? FILL_GRADIENTS.accent }
  if (fill.value === 'image' && props.fillImage) return { backgroundImage: `url("${props.fillImage}")` }
  return {}
})
const fillClasses = computed<string[]>(() => {
  if (!fillActive.value) return []
  return [
    'kinetic-text__line--fill',
    `kinetic-text__line--fill-${fill.value}`,
    (fill.value === 'gradient' && props.fillAnimate !== false) ? 'kinetic-text__line--fill-animate' : '',
  ].filter(Boolean)
})

// A continuous knockout fill (gradient/image) cannot ALSO scramble or rise
// individual glyphs: each per-glyph span carries a transform, which establishes
// a new containing block and severs the ancestor `background-clip: text`, leaving
// the title invisible. So whenever a fill is active we render + reveal through the
// whole-line path (a single smooth line reveal) instead of the per-glyph effects.
const renderEffect = computed<Effect>(() => (fillActive.value ? 'line-fade' : effect.value))
</script>

<style lang="scss" scoped>
.kinetic-text {
  &__line {
    margin: 0;
    max-width: var(--block-measure, none);
    margin-inline: var(--block-measure-align, 0);
    // Typography cascade: slot (field id) → role(heading1) → hard fallback.
    font-family: var(--rt-slot-text-family, var(--rt-role-heading1-family, var(--font-family-heading, Georgia, serif)));
    font-size: var(--rt-slot-text-size, var(--rt-role-heading1-size, var(--font-size-3xl, 4.8rem)));
    font-weight: var(--rt-slot-text-weight, var(--rt-role-heading1-weight, 600));
    line-height: var(--rt-slot-text-line-height, var(--rt-role-heading1-line-height, 1.1));
    letter-spacing: var(--rt-slot-text-letter-spacing, var(--rt-role-heading1-letter-spacing, -0.02em));
    text-transform: var(--rt-slot-text-text-transform, var(--rt-role-heading1-text-transform, none));
    color: var(--rt-slot-text-color, var(--rt-role-heading1-color, inherit));
  }

  // Visually-hidden mirror — keeps the real string in the a11y tree + selectable
  // even while the animated glyph cells are aria-hidden.
  &__sr {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  &__word {
    display: inline-block;
    white-space: nowrap;
    // Restore the inter-word space the split() removed.
    &:not(:last-child) {
      margin-right: 0.28em;
    }
  }

  &__char {
    display: inline-block;
    will-change: transform, opacity;
  }

  // ── char-rise ──────────────────────────────────────────────────────────
  &__line--char-rise &__char {
    opacity: 0;
    transform: translateY(0.7em) rotate(2deg);
    transition: opacity 0.55s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }
  &__line--char-rise.is-in &__char {
    opacity: 1;
    transform: none;
  }

  // ── word-mask ──────────────────────────────────────────────────────────
  &__line--word-mask &__word {
    overflow: hidden;
    vertical-align: bottom;
  }
  &__word-inner {
    display: inline-block;
    transform: translateY(110%);
    transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  }
  &__line--word-mask.is-in &__word-inner {
    transform: none;
  }

  // ── scramble ───────────────────────────────────────────────────────────
  &__line--scramble &__char {
    font-variant-numeric: tabular-nums;
  }

  // ── line-fade (also the no-split fallback) ───────────────────────────────
  &__line--line-fade {
    opacity: 0;
    transform: translateY(0.4em);
    transition: opacity 0.7s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    &.is-in {
      opacity: 1;
      transform: none;
    }
  }

  // text fill (knockout: gradient / image via background-clip:text)
  &__line--fill {
    color: transparent;
    -webkit-text-fill-color: transparent;
    -webkit-background-clip: text;
    background-clip: text;
    background-repeat: no-repeat;
  }
  &__line--fill-image { background-size: cover; background-position: center; }
  &__line--fill-gradient { background-size: 220% 220%; background-position: 0% 50%; }
  // A transform on the clipped line severs background-clip:text mid-motion, so a
  // filled headline reveals with opacity ALONE (never a translate) — the fill
  // stays intact through the whole entrance. Two classes → wins over line-fade.
  &__line--fill.kinetic-text__line--line-fade { transform: none; }
  &__line--fill-animate { animation: kinetic-fill-pan 7s ease-in-out infinite; }
  @keyframes kinetic-fill-pan {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @media (prefers-reduced-motion: reduce) { &__line--fill-animate { animation: none; } }
}
</style>
