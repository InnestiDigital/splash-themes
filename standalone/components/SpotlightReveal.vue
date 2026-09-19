<template>
  <figure
    ref="rootEl"
    class="spotlight-reveal"
    :class="[
      `spotlight-reveal--radius-${borderRadius}`,
      `spotlight-reveal--pad-${internalPadding}`,
      {
        'spotlight-reveal--spotlight': mode === 'spotlight',
        'spotlight-reveal--tap': mode === 'tap',
        'is-revealed': tapRevealed,
        'is-reduced': isReducedMotion,
      },
    ]"
    :style="frameStyle"
    data-target="root"
    @pointerenter="onEnter"
    @pointermove="onMove"
    @pointerleave="onLeave"
    @click="onTap"
  >
    <!-- Reveal layer sits beneath, always painted. -->
    <img
      v-if="revealSrc"
      class="spotlight-reveal__img spotlight-reveal__img--reveal"
      :src="revealSrc"
      :alt="revealAlt"
      data-target="reveal"
      loading="lazy"
      draggable="false"
    />

    <!-- Cover layer on top; a radial mask hole (spotlight) is punched through it. -->
    <img
      v-if="coverSrc"
      ref="coverEl"
      class="spotlight-reveal__img spotlight-reveal__img--cover"
      :src="coverSrc"
      :alt="coverAlt"
      data-target="cover"
      loading="lazy"
      draggable="false"
    />

    <figcaption v-if="hintText" class="spotlight-reveal__hint" :class="{ 'is-hidden': interacted }">
      {{ hintText }}
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'

type SpotlightSize = 'small' | 'medium' | 'large'
type EdgeSoftness = 'crisp' | 'soft' | 'feathered'
type MediaInput = string | { url?: string } | undefined

const props = defineProps<{
  coverImage?: MediaInput
  revealImage?: MediaInput
  hint?: string | Record<string, string>
  spotlightSize?: SpotlightSize
  edgeSoftness?: EdgeSoftness
  aspectRatio?: '16:9' | '3:2' | '4:3' | '1:1' | 'auto'
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

const coverSrc = computed(() => resolveMedia(props.coverImage))
const revealSrc = computed(() => resolveMedia(props.revealImage))
const coverAlt = ''
const revealAlt = ''
const hintText = computed(() => (props.hint ? getLocalizedValue(props.hint) : ''))
const borderRadius = computed(() => props.borderRadius || 'sm')
const internalPadding = computed(() => props.internalPadding || 'none')

// Base spotlight radius (px) + the fraction of that radius that stays fully
// transparent before feathering to opaque. Larger `solid` → crisper edge.
const RADIUS: Record<SpotlightSize, number> = { small: 90, medium: 140, large: 200 }
const SOLID: Record<EdgeSoftness, string> = { crisp: '88%', soft: '62%', feathered: '34%' }

const frameStyle = computed<Record<string, string>>(() => {
  const ratioMap: Record<string, string> = {
    '16:9': '16 / 9',
    '3:2': '3 / 2',
    '4:3': '4 / 3',
    '1:1': '1 / 1',
  }
  const style: Record<string, string> = {
    '--sr-solid': SOLID[props.edgeSoftness || 'soft'],
  }
  const ar = props.aspectRatio || '4:3'
  if (ar !== 'auto') style['--sr-aspect'] = ratioMap[ar]
  return style
})

// ── Interaction model ────────────────────────────────────────────────────────
// spotlight = fine-pointer follow (mask hole trails the cursor)
// tap       = coarse/touch: a click crossfades the whole cover away
// static    = editor preview: no interaction, cover shown so a click selects the
//             block (mirrors the FilterableGallery / ProjectIndex precedent)
type Mode = 'spotlight' | 'tap' | 'static'
const mode = ref<Mode>('static')
const rootEl = ref<HTMLElement | null>(null)
const coverEl = ref<HTMLImageElement | null>(null)
const interacted = ref(false)
const tapRevealed = ref(false)

const baseRadius = computed(() => RADIUS[props.spotlightSize || 'medium'])

// Current + target mask state; lerped in an off-Vue rAF loop.
const cur = { x: 0, y: 0, r: 0 }
const tgt = { x: 0, y: 0, r: 0 }
let rafId: number | null = null
let seeded = false

function pointerXY(e: PointerEvent): { x: number; y: number } {
  const rect = rootEl.value?.getBoundingClientRect()
  if (!rect) return { x: 0, y: 0 }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function onEnter(e: PointerEvent) {
  if (mode.value !== 'spotlight') return
  interacted.value = true
  const { x, y } = pointerXY(e)
  tgt.x = x
  tgt.y = y
  tgt.r = baseRadius.value
  if (!seeded) {
    // Seed position from the entering pointer so the hole opens under the
    // cursor, never grows in from a stale corner.
    cur.x = x
    cur.y = y
    seeded = true
  }
}

function onMove(e: PointerEvent) {
  if (mode.value !== 'spotlight') return
  const { x, y } = pointerXY(e)
  tgt.x = x
  tgt.y = y
  tgt.r = baseRadius.value
  if (!seeded) {
    cur.x = x
    cur.y = y
    seeded = true
  }
}

function onLeave() {
  if (mode.value !== 'spotlight') return
  tgt.r = 0
  seeded = false
}

function onTap() {
  if (mode.value !== 'tap') return
  interacted.value = true
  tapRevealed.value = !tapRevealed.value
}

function frame() {
  const el = coverEl.value
  if (el) {
    // Reduced motion → snap (ease 1); otherwise a soft trail.
    const ease = isReducedMotion.value ? 1 : 0.2
    cur.x += (tgt.x - cur.x) * ease
    cur.y += (tgt.y - cur.y) * ease
    cur.r += (tgt.r - cur.r) * ease
    el.style.setProperty('--sr-mx', `${cur.x}px`)
    el.style.setProperty('--sr-my', `${cur.y}px`)
    el.style.setProperty('--sr-r', `${cur.r}px`)
  }
  rafId = requestAnimationFrame(frame)
}

function resolveMode() {
  if (isEditor.value) {
    mode.value = 'static'
    return
  }
  const fine =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  mode.value = fine ? 'spotlight' : 'tap'
}

onMounted(() => {
  resolveMode()
  if (mode.value === 'spotlight') rafId = requestAnimationFrame(frame)
})

// Render mode can resolve after mount (editor iframe) — tear the spotlight down.
watch(isEditor, () => {
  const wasSpotlight = mode.value === 'spotlight'
  resolveMode()
  if (wasSpotlight && mode.value !== 'spotlight' && rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  } else if (!wasSpotlight && mode.value === 'spotlight' && rafId === null) {
    rafId = requestAnimationFrame(frame)
  }
})

onBeforeUnmount(() => {
  if (rafId !== null) cancelAnimationFrame(rafId)
})
</script>

<style lang="scss" scoped>
.spotlight-reveal {
  position: relative;
  margin: 0;
  width: 100%;
  overflow: hidden;
  aspect-ratio: var(--sr-aspect, auto);
  background: color-mix(in srgb, currentColor 8%, transparent);

  &--radius-sm { border-radius: 4px; }
  &--radius-md { border-radius: 10px; }
  &--radius-lg { border-radius: 18px; }

  &--pad-xs { padding: 0.4rem; }
  &--pad-sm { padding: 0.8rem; }
  &--pad-md { padding: 1.6rem; }
  &--pad-lg { padding: 2.4rem; }
  &--pad-xl { padding: 3.2rem; }

  &__img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    user-select: none;

    &--reveal {
      // Base layer.
    }

    &--cover {
      position: absolute;
      inset: 0;
      // The spotlight: a transparent hole (reveal shows through) surrounded by
      // opaque cover. r = 0 → the transparent stops collapse → cover fully opaque.
      --sr-mx: 50%;
      --sr-my: 50%;
      --sr-r: 0px;
      -webkit-mask-image: radial-gradient(
        circle var(--sr-r) at var(--sr-mx) var(--sr-my),
        transparent 0%,
        transparent var(--sr-solid, 62%),
        #000 100%
      );
      mask-image: radial-gradient(
        circle var(--sr-r) at var(--sr-mx) var(--sr-my),
        transparent 0%,
        transparent var(--sr-solid, 62%),
        #000 100%
      );
    }
  }

  // Fine-pointer follow mode: the frame owns the cursor.
  &--spotlight {
    cursor: crosshair;
  }

  // Touch / coarse: whole cover crossfades away on tap.
  &--tap {
    cursor: pointer;

    .spotlight-reveal__img--cover {
      transition: opacity 0.5s ease;
    }
    &.is-revealed .spotlight-reveal__img--cover {
      opacity: 0;
    }
  }

  &__hint {
    position: absolute;
    left: 50%;
    bottom: 1.2rem;
    transform: translateX(-50%);
    padding: 0.5rem 1.1rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-accent, #1b8ab7) 90%, black 10%);
    color: #fff;
    font-family: var(--rt-role-body-family, var(--font-family-body, inherit));
    font-size: var(--font-size-sm, 1.3rem);
    letter-spacing: 0.03em;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 0.4rem 1.4rem rgba(0, 0, 0, 0.25);
    opacity: 0.92;
    transition: opacity 0.4s ease, transform 0.4s ease;

    &.is-hidden {
      opacity: 0;
      transform: translateX(-50%) translateY(0.6rem);
    }
  }

  // Reduced motion: no crossfade / hint easing; the reveal itself stays fully
  // functional (spotlight snaps to the pointer via the rAF ease=1 path).
  &.is-reduced {
    .spotlight-reveal__img--cover,
    .spotlight-reveal__hint {
      transition: none;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .spotlight-reveal__img--cover,
  .spotlight-reveal__hint {
    transition: none;
  }
}
</style>
