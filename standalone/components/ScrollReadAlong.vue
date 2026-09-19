<template>
  <section
    class="read-along"
    :class="[`read-along--dim-${dimLevel}`, `read-along--fade-${fade}`, { 'is-static': allLit }]"
    :style="{ ...rootStyles, ...measureStyle }"
  >
    <p v-if="eyebrowText" class="read-along__eyebrow" data-target="eyebrow">{{ eyebrowText }}</p>

    <div
      ref="el"
      class="read-along__body"
      data-target="text"
      :data-motion-suppressed="allLit ? 'true' : undefined"
    >
      <p v-for="(para, pi) in paragraphs" :key="pi" class="read-along__para">
        <span
          v-for="cell in para"
          :key="cell.i"
          class="read-along__word"
          :style="cell.style"
          :class="{ 'is-lit': allLit || cell.i < litCount, 'read-along__word--bold': cell.bold }"
          >{{ cell.w }}</span
        >
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'
import { STYLE_VALIDATORS } from '~/shared/tiptap/inlineStyleAllowlist'

type DimLevel = 'subtle' | 'medium' | 'strong'
type Focus = 'early' | 'center' | 'lower'
type Fade = 'crisp' | 'smooth' | 'soft'
type Align = 'left' | 'center' | 'right'

const props = defineProps<{
  eyebrow?: string | Record<string, string>
  text?: string | Record<string, string>
  dimLevel?: DimLevel
  focus?: Focus
  fade?: Fade
  textAlign?: Align
  measureWidth?: 'content' | 'narrow' | 'standard' | 'wide' | 'full'
}>()

const { getLocalizedValue } = useLocalized()
const { isReducedMotion } = useReducedMotion()
const renderMode = useRenderMode()
const isEditor = computed(() => renderMode.value === 'editor-preview')

const dimLevel = computed<DimLevel>(() => props.dimLevel || 'medium')
const fade = computed<Fade>(() => props.fade || 'smooth')
const textAlign = computed<Align | null>(() => props.textAlign || null)

const eyebrowText = computed(() =>
  getLocalizedValue(props.eyebrow).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
)

// Flatten the rich text to paragraphs of words, each word carrying a GLOBAL
// index so the reveal flows continuously across paragraph breaks, plus any
// inline marks (colour / weight / size from an ancestor span[style]; bold from
// a <strong>/<b> ancestor) so authored emphasis survives the tokenizer.
interface Cell {
  w: string
  i: number
  style?: Record<string, string>
  bold?: boolean
}

interface MarkCtx {
  style: Record<string, string>
  bold: boolean
}

// Mirror the sanitizer allowlist (color / font-weight / font-size). The seed
// HTML is already sanitized, but we re-validate so a malformed declaration can
// never reach the DOM via :style.
function parseInlineStyle(css: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const decl of css.split(';')) {
    const idx = decl.indexOf(':')
    if (idx === -1) continue
    const prop = decl.slice(0, idx).trim().toLowerCase()
    const raw = decl.slice(idx + 1).trim()
    const validator = STYLE_VALIDATORS[prop]
    if (!validator || !raw) continue
    const validated = validator(raw)
    if (validated === null) continue
    out[prop] = validated
  }
  return out
}

function deriveCtx(el: Element, ctx: MarkCtx): MarkCtx {
  const tag = el.tagName
  let bold = ctx.bold
  if (tag === 'STRONG' || tag === 'B') bold = true
  let style = ctx.style
  if (tag === 'SPAN') {
    const attr = el.getAttribute('style')
    if (attr) {
      const parsed = parseInlineStyle(attr)
      // Nearest ancestor span wins on conflict (overlays inherited style).
      if (Object.keys(parsed).length) style = { ...ctx.style, ...parsed }
    }
  }
  return { style, bold }
}

const BLOCK_TAGS = new Set(['P', 'LI'])

// DOM path — preserves inline marks. Walks block chunks (p / li), with <br> as
// an in-block line split to mirror the seed's single-<p>-with-<br> layout.
function tokenizeRich(html: string): Cell[][] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const paras: Cell[][] = []
  let current: Cell[] = []
  let gi = 0
  const flush = () => {
    if (current.length) {
      paras.push(current)
      current = []
    }
  }
  const walk = (node: Node, ctx: MarkCtx) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3 /* text */) {
        for (const w of (child.textContent || '').split(/\s+/)) {
          if (!w) continue
          const cell: Cell = { w, i: gi++ }
          if (Object.keys(ctx.style).length) cell.style = ctx.style
          if (ctx.bold) cell.bold = true
          current.push(cell)
        }
      } else if (child.nodeType === 1 /* element */) {
        const el = child as Element
        const tag = el.tagName
        if (tag === 'BR') {
          flush()
        } else if (BLOCK_TAGS.has(tag)) {
          flush()
          walk(el, ctx)
          flush()
        } else {
          walk(el, deriveCtx(el, ctx))
        }
      }
    }
  }
  walk(doc.body, { style: {}, bold: false })
  flush()
  return paras
}

// Plain-text fallback (no DOMParser). Strips all tags but keeps the original
// paragraph splits, so the word list + global indices match the rich path
// exactly and the reveal math is unchanged. Inline marks are simply dropped.
function tokenizePlain(html: string): Cell[][] {
  const chunks = html
    .split(/<\/p>|<\/li>|<br\s*\/?>|\n{2,}/i)
    .map((s) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  let gi = 0
  return chunks.map((chunk) => chunk.split(' ').filter(Boolean).map((w) => ({ w, i: gi++ })))
}

const paragraphs = computed<Cell[][]>(() => {
  const html = getLocalizedValue(props.text) || ''
  if (typeof DOMParser === 'undefined') return tokenizePlain(html)
  return tokenizeRich(html)
})
const wordCount = computed(() => paragraphs.value.reduce((n, p) => n + p.length, 0))

// Where the "reading line" sits in the viewport (fraction from the top). A line
// lower on screen (higher fraction) lights words earlier as the block enters.
const FOCUS_FRAC: Record<Focus, number> = { early: 0.75, center: 0.55, lower: 0.4 }
const focalFrac = computed(() => FOCUS_FRAC[props.focus || 'center'])

// Fraction of the viewport height over which the passage fully reveals. Capping
// the reveal at ~0.6vh (rather than the passage's own height) is what makes a
// tall display passage resolve within the first viewport of scrolling past it.
const REVEAL_VH_FRAC = 0.6

// ── Reveal state ────────────────────────────────────────────────────────────
const el = ref<HTMLElement | null>(null)
const litCount = ref(0)
const runtimeReady = ref(true)
// Fully-lit static mode: reduced motion, editor preview, or no scroll runtime.
const allLit = computed(() => isReducedMotion.value || isEditor.value || !runtimeReady.value)

let observer: IntersectionObserver | null = null
let active = false
let ticking = false

function compute() {
  ticking = false
  const node = el.value
  if (!node) return
  const rect = node.getBoundingClientRect()
  const vh = window.innerHeight || document.documentElement.clientHeight || 1
  const focalY = vh * focalFrac.value
  const span = rect.height || 1
  // Compressed reveal window: start a touch early (LEAD, so words begin lighting
  // while the passage top is still just below the reading line) and complete
  // within roughly one viewport of scroll past it — the reveal window is capped
  // at a fraction of the viewport rather than the passage's full height, so a
  // tall display passage resolves quickly instead of trailing the whole scroll.
  const LEAD = vh * 0.15
  const revealWindow = Math.min(span, vh * REVEAL_VH_FRAC)
  const progress = Math.min(1, Math.max(0, (focalY - rect.top + LEAD) / revealWindow))
  litCount.value = Math.round(progress * wordCount.value)
}

function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(compute)
}

function activate() {
  if (active) return
  active = true
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  compute()
}

function deactivate() {
  if (!active) return
  active = false
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
}

onMounted(() => {
  // Static path: nothing to wire — every word renders fully lit.
  if (isReducedMotion.value || isEditor.value) return
  if (typeof IntersectionObserver === 'undefined' || !el.value) {
    runtimeReady.value = false
    return
  }
  // Only listen to scroll while the passage is near the viewport.
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) activate()
        else deactivate()
      }
    },
    { rootMargin: '20% 0px 20% 0px' },
  )
  observer.observe(el.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  deactivate()
})

// Re-measure when the content changes in the editor preview.
watch([paragraphs, focalFrac], () => {
  if (active) onScroll()
})

const DIM_OPACITY: Record<DimLevel, string> = { subtle: '0.4', medium: '0.25', strong: '0.12' }
const FADE_MS: Record<Fade, string> = { crisp: '150ms', smooth: '350ms', soft: '600ms' }

const rootStyles = computed<Record<string, string>>(() => {
  const s: Record<string, string> = {
    '--sra-dim': DIM_OPACITY[dimLevel.value],
    '--sra-fade': FADE_MS[fade.value],
  }
  if (textAlign.value) s.textAlign = textAlign.value
  return s
})

const measureStyle = computed<Record<string, string>>(() =>
  props.measureWidth ? { '--block-measure': `var(--measure-width-${props.measureWidth})` } : {},
)
</script>

<style lang="scss" scoped>
.read-along {
  max-width: var(--block-measure, none);
  margin-inline: var(--block-measure-align, 0);

  &__eyebrow {
    margin: 0 0 1.2rem;
    font-family: var(--rt-slot-eyebrow-family, var(--rt-role-eyebrow-family, var(--font-family-heading, inherit)));
    font-size: var(--rt-slot-eyebrow-size, var(--rt-role-eyebrow-size, 0.78rem));
    font-weight: var(--rt-slot-eyebrow-weight, var(--rt-role-eyebrow-weight, 600));
    letter-spacing: var(--rt-slot-eyebrow-letter-spacing, var(--rt-role-eyebrow-letter-spacing, 0.18em));
    text-transform: var(--rt-slot-eyebrow-text-transform, var(--rt-role-eyebrow-text-transform, uppercase));
    color: var(--rt-slot-eyebrow-color, var(--rt-role-eyebrow-color, inherit));
    opacity: 0.75;
  }

  &__body {
    // Typography cascade: slot → design-intent fallback. Colour comes from the
    // theme. The read-along is a display-scale manifesto statement (the design
    // reference renders it at 39px in the Sul Sans display face). Size and
    // line-height deliberately do NOT defer to the body role: --rt-role-body-*
    // is ALWAYS emitted (16px/1.5 by design for real body copy), so routing
    // through it pins the manifesto to paragraph scale — a var() fallback only
    // engages when the var is entirely unset, never merely "too small". An
    // author can still override per-block via the slot layer (--rt-slot-text-*).
    font-family: var(--rt-slot-text-family, var(--rt-role-body-family, var(--font-family-heading, sans-serif)));
    font-size: var(--rt-slot-text-size, clamp(2.4rem, 2.7vw, 3.9rem));
    font-weight: var(--rt-slot-text-weight, var(--rt-role-body-weight, 400));
    line-height: var(--rt-slot-text-line-height, 1.1);
    letter-spacing: var(--rt-slot-text-letter-spacing, var(--rt-role-body-letter-spacing, normal));
    color: var(--rt-slot-text-color, var(--rt-role-body-color, inherit));
  }

  &__para {
    margin: 0 0 1em;
    &:last-child {
      margin-bottom: 0;
    }
  }

  &__word {
    // Real text — always in the a11y tree and selectable; only its opacity animates.
    display: inline-block;
    opacity: var(--sra-dim, 0.25);
    transition: opacity var(--sra-fade, 350ms) ease;
    // Restore the inter-word space the split() removed.
    &:not(:last-child) {
      margin-right: 0.26em;
    }
    &.is-lit {
      opacity: 1;
    }
  }

  // Authored bold mark (<strong>/<b>) survives the tokenizer.
  &__word--bold {
    font-weight: 600;
  }

  // Static mode (reduced motion / editor / no-JS): no transition, full contrast.
  &.is-static &__word {
    opacity: 1;
    transition: none;
  }
}
</style>
