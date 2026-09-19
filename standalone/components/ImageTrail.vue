<template>
  <section
    ref="rootEl"
    class="image-trail"
    :class="[
      `image-trail--h-${minHeight}`,
      `image-trail--align-${textAlign}`,
      `image-trail--size-${imageSize}`,
      `image-trail--shape-${imageShape}`,
      `image-trail--radius-${borderRadius}`,
      `image-trail--pad-${internalPadding}`,
      {
        'image-trail--interactive': mode === 'trail',
        'image-trail--static': mode !== 'trail',
        'is-reduced': isReducedMotion,
      },
    ]"
    data-target="root"
    @pointermove="onMove"
    @pointerleave="onLeave"
  >
    <!-- Ambient trail layer: sprites spawn at the cursor and decay. Decorative
         (aria-hidden) — the heading / CTA below carry the meaning. Only mounted
         in the fine-pointer interactive mode. -->
    <div v-if="mode === 'trail'" class="image-trail__stage" aria-hidden="true">
      <img
        v-for="s in sprites"
        :key="s.key"
        class="image-trail__sprite"
        :src="s.src"
        alt=""
        draggable="false"
        :style="{
          '--x': `${s.x}px`,
          '--y': `${s.y}px`,
          '--rot': `${s.rot}deg`,
        }"
      />
    </div>

    <!-- Fallback for coarse-pointer / reduced-motion / editor: a calm static
         collage so the works are never lost when the trail can't run. -->
    <div
      v-else-if="imageSrcs.length"
      class="image-trail__fallback"
      data-target="trail"
      aria-hidden="true"
    >
      <img
        v-for="(src, i) in fallbackImages"
        :key="i"
        class="image-trail__fallback-img"
        :src="src"
        alt=""
        loading="lazy"
        draggable="false"
      />
    </div>

    <!-- Meaningful, always-legible content, layered above the trail. -->
    <div class="image-trail__content" data-target="content">
      <p v-if="eyebrowText" class="image-trail__eyebrow">{{ eyebrowText }}</p>
      <h2 v-if="headingText" class="image-trail__heading">{{ headingText }}</h2>
      <p v-if="subheadingText" class="image-trail__subheading">{{ subheadingText }}</p>
      <a
        v-if="ctaLabelText && ctaLink"
        class="image-trail__cta"
        :href="ctaLink"
      >{{ ctaLabelText }}</a>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'

type MediaInput = string | { url?: string } | undefined
type ImageItem = { media?: MediaInput; image?: MediaInput } | string
type Density = 'sparse' | 'normal' | 'dense'

const props = defineProps<{
  eyebrow?: string | Record<string, string>
  heading?: string | Record<string, string>
  subheading?: string | Record<string, string>
  ctaLabel?: string | Record<string, string>
  ctaLink?: string
  images?: ImageItem[]
  minHeight?: 'sm' | 'md' | 'lg' | 'screen'
  textAlign?: 'left' | 'center'
  imageSize?: 'small' | 'medium' | 'large'
  imageShape?: 'portrait' | 'landscape' | 'square' | 'original'
  spawnDensity?: Density
  borderRadius?: 'none' | 'sm' | 'md' | 'lg'
  internalPadding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}>()

const { getLocalizedValue } = useLocalized()
const { isReducedMotion } = useReducedMotion()
const renderMode = useRenderMode()
const isEditor = computed(() => renderMode.value === 'editor-preview')

function resolveMedia(m: MediaInput): string {
  if (!m) return ''
  if (typeof m === 'string') return m
  return m.url || ''
}

const imageSrcs = computed<string[]>(() =>
  (props.images || [])
    .map((it) => (typeof it === 'string' ? it : resolveMedia(it.media ?? it.image)))
    .filter((s): s is string => !!s),
)

// Fallback collage shows up to 6 images so it stays calm on small screens.
const fallbackImages = computed(() => imageSrcs.value.slice(0, 6))

const eyebrowText = computed(() => (props.eyebrow ? getLocalizedValue(props.eyebrow) : ''))
const headingText = computed(() => (props.heading ? getLocalizedValue(props.heading) : ''))
const subheadingText = computed(() => (props.subheading ? getLocalizedValue(props.subheading) : ''))
const ctaLabelText = computed(() => (props.ctaLabel ? getLocalizedValue(props.ctaLabel) : ''))

const minHeight = computed(() => props.minHeight || 'md')
const textAlign = computed(() => props.textAlign || 'center')
const borderRadius = computed(() => props.borderRadius || 'none')
const internalPadding = computed(() => props.internalPadding || 'lg')
const imageSize = computed(() => props.imageSize || 'medium')
const imageShape = computed(() => props.imageShape || 'landscape')

// ── Interaction model ────────────────────────────────────────────────────────
// trail  = fine pointer + motion allowed: sprites spawn at the cursor and decay
// static = coarse pointer / reduced motion / editor: calm static collage instead
type Mode = 'trail' | 'static'
const rootEl = ref<HTMLElement | null>(null)

const finePointer =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches

const mode = computed<Mode>(() =>
  !isEditor.value && finePointer && !isReducedMotion.value && imageSrcs.value.length > 0
    ? 'trail'
    : 'static',
)

// Density → spawn spacing (px the cursor must travel between sprites), sprite
// lifetime cap, and pool ceiling. Kept modest so the effect stays light.
const DENSITY: Record<Density, { gap: number; max: number }> = {
  sparse: { gap: 150, max: 6 },
  normal: { gap: 95, max: 9 },
  dense: { gap: 60, max: 13 },
}
const density = computed(() => DENSITY[props.spawnDensity || 'normal'])
const LIFETIME = 900 // ms — must match the CSS animation duration below.

type Sprite = { key: number; src: string; x: number; y: number; rot: number }
const sprites = ref<Sprite[]>([])
const timers = new Set<ReturnType<typeof setTimeout>>()

let uid = 0
let srcCursor = 0
let lastX = 0
let lastY = 0
let seeded = false

function pointerXY(e: PointerEvent): { x: number; y: number } {
  const rect = rootEl.value?.getBoundingClientRect()
  if (!rect) return { x: 0, y: 0 }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function spawn(x: number, y: number) {
  const srcs = imageSrcs.value
  if (!srcs.length) return
  const src = srcs[srcCursor % srcs.length]
  srcCursor += 1
  // Gentle deterministic tilt that alternates side to side — no RNG, so it is
  // stable across renders and needs no SSR guard.
  const rot = (srcCursor % 2 === 0 ? 1 : -1) * (4 + (srcCursor % 4) * 2)

  const key = uid++
  sprites.value.push({ key, src, x, y, rot })
  if (sprites.value.length > density.value.max) sprites.value.shift()

  const t = setTimeout(() => {
    const i = sprites.value.findIndex((s) => s.key === key)
    if (i !== -1) sprites.value.splice(i, 1)
    timers.delete(t)
  }, LIFETIME)
  timers.add(t)
}

function onMove(e: PointerEvent) {
  if (mode.value !== 'trail') return
  const { x, y } = pointerXY(e)
  if (!seeded) {
    lastX = x
    lastY = y
    seeded = true
    spawn(x, y)
    return
  }
  const dx = x - lastX
  const dy = y - lastY
  if (dx * dx + dy * dy < density.value.gap * density.value.gap) return
  lastX = x
  lastY = y
  spawn(x, y)
}

function onLeave() {
  seeded = false
}

onBeforeUnmount(() => {
  timers.forEach((t) => clearTimeout(t))
  timers.clear()
})
</script>

<style lang="scss" scoped>
.image-trail {
  position: relative;
  width: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  isolation: isolate;
  background: color-mix(in srgb, currentColor 4%, transparent);

  &--h-sm { min-height: 40vh; }
  &--h-md { min-height: 62vh; }
  &--h-lg { min-height: 80vh; }
  &--h-screen { min-height: 100vh; }

  &--align-center { justify-content: center; text-align: center; }
  &--align-left { justify-content: flex-start; text-align: left; }

  &--radius-sm { border-radius: 4px; }
  &--radius-md { border-radius: 10px; }
  &--radius-lg { border-radius: 18px; }

  &--pad-xs { padding: 0.4rem; }
  &--pad-sm { padding: 0.8rem; }
  &--pad-md { padding: 1.6rem; }
  &--pad-lg { padding: clamp(1.6rem, 5vw, 4.5rem); }
  &--pad-xl { padding: clamp(2.4rem, 7vw, 6rem); }

  &--interactive { cursor: crosshair; }

  // ── Trail sprites ──────────────────────────────────────────────────────────
  &__stage {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
  }

  &__sprite {
    position: absolute;
    left: 0;
    top: 0;
    // --img-w / --img-ar set per size + shape below.
    width: var(--img-w, 180px);
    aspect-ratio: var(--img-ar, 4 / 3);
    height: auto;
    object-fit: cover;
    border-radius: 3px;
    box-shadow: 0 1.2rem 3rem rgba(0, 0, 0, 0.28);
    transform-origin: center;
    will-change: transform, opacity;
    animation: image-trail-pop 900ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
  }

  // Sprite sizing — width scales, shape drives aspect ratio.
  &--size-small &__sprite { --img-w: 120px; }
  &--size-medium &__sprite { --img-w: 180px; }
  &--size-large &__sprite { --img-w: 260px; }
  &--shape-portrait &__sprite { --img-ar: 3 / 4; }
  &--shape-landscape &__sprite { --img-ar: 4 / 3; }
  &--shape-square &__sprite { --img-ar: 1 / 1; }
  &--shape-original &__sprite { --img-ar: auto; }

  // ── Static fallback collage ──────────────────────────────────────────────
  &__fallback {
    position: absolute;
    inset: 0;
    z-index: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 2px;
    opacity: 0.22;
    pointer-events: none;
  }

  &__fallback-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: grayscale(0.15);
  }

  // ── Content ──────────────────────────────────────────────────────────────
  &__content {
    position: relative;
    z-index: 2;
    max-width: 62rem;
    pointer-events: none;

    a { pointer-events: auto; }
  }

  &__eyebrow {
    margin: 0 0 0.8rem;
    font-family: var(--rt-role-eyebrow-family, var(--font-family-body, inherit));
    font-size: var(--font-size-sm, 1.3rem);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.7;
  }

  &__heading {
    margin: 0;
    font-family: var(--rt-role-sectionTitle-family, var(--font-family-heading, inherit));
    font-size: clamp(2.8rem, 7vw, 6.4rem);
    line-height: 1.02;
    letter-spacing: -0.01em;
  }

  &__subheading {
    margin: 1.4rem 0 0;
    font-family: var(--rt-role-lead-family, var(--font-family-body, inherit));
    font-size: clamp(1.5rem, 2.4vw, 2rem);
    line-height: 1.4;
    opacity: 0.82;
  }

  &__cta {
    display: inline-block;
    margin-top: 2.2rem;
    padding: 0.75rem 1.6rem;
    border: 1px solid currentColor;
    border-radius: 999px;
    font-family: var(--rt-role-body-family, var(--font-family-body, inherit));
    font-size: var(--font-size-sm, 1.4rem);
    letter-spacing: 0.02em;
    text-decoration: none;
    color: inherit;
    transition: background-color 0.25s ease, color 0.25s ease;

    &:hover {
      background: currentColor;
      // Punch the label out of the filled pill using the section background.
      color: var(--color-background, #fff);
    }
  }

  &.is-reduced &__cta { transition: none; }
}

@keyframes image-trail-pop {
  0% {
    transform: translate(calc(var(--x) - 50%), calc(var(--y) - 50%)) scale(0.6) rotate(var(--rot));
    opacity: 0;
  }
  18% {
    transform: translate(calc(var(--x) - 50%), calc(var(--y) - 50%)) scale(1) rotate(var(--rot));
    opacity: 1;
  }
  100% {
    transform: translate(calc(var(--x) - 50%), calc(var(--y) - 58%)) scale(0.92) rotate(var(--rot));
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .image-trail__sprite { animation: none; opacity: 0; }
  .image-trail__cta { transition: none; }
}
</style>
