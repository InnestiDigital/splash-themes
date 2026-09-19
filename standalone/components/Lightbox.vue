<template>
  <!--
    Image lightbox — a theme-level fullscreen image viewer.

    It is mounted ONCE per layout and stays inert until the visitor activates an
    opt-in trigger anywhere in the page. Triggers are plain DOM elements carrying
    a `data-lightbox` attribute, so ANY block can adopt the lightbox without
    importing this component — it listens for clicks via event delegation.

    ── Data contract (attributes on the trigger element) ──
      data-lightbox            (presence) marks the element as a lightbox trigger
      data-lightbox-src        full-resolution image URL (falls back to the
                               trigger's inner <img> currentSrc/src)
      data-lightbox-alt        accessible name (falls back to inner <img> alt)
      data-lightbox-caption    optional visible caption under the image
      data-lightbox-group      optional gallery id; triggers sharing a group are
                               browsable with ←/→ + on-screen arrows

    Behaviour: Esc / backdrop-click / close-button dismiss; ←/→ navigate a group;
    Tab is focus-trapped to the dialog; body scroll is locked while open; focus is
    restored to the trigger on close. Functional under reduced motion (the open
    animation is suppressed, the viewer still works). Disabled inside the editor
    preview so clicking a banner there still selects the block.
  -->
  <Teleport to="body">
    <Transition name="lightbox">
      <div
        v-if="open"
        ref="dialogRef"
        class="lightbox"
        data-cursor-scope
        role="dialog"
        aria-modal="true"
        :aria-label="dialogLabel"
        :style="backdropStyle"
        @click.self="close"
      >
        <button
          ref="closeRef"
          type="button"
          class="lightbox__btn lightbox__close"
          aria-label="Close image viewer (Esc)"
          @click="close"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        <button
          v-if="hasGroup"
          type="button"
          class="lightbox__btn lightbox__nav lightbox__nav--prev"
          aria-label="Previous image (Left arrow)"
          @click="prev"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" /></svg>
        </button>

        <figure
          class="lightbox__figure"
          :class="{ 'is-dragging': dragging }"
          :style="figureStyle"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerEnd"
          @pointercancel="onPointerEnd"
        >
          <img
            v-if="current"
            :key="current.src"
            :src="current.src"
            :alt="current.alt"
            class="lightbox__image"
            decoding="async"
            draggable="false"
          />
          <!--
            In a group the caption is the live region, not just the counter: arrowing
            through a gallery has to announce WHICH image, not only a position ("4 / 5"
            alone describes an unnamed slot). aria-atomic reads name + position as one
            phrase. When the item has no visible caption the accessible name is carried
            by a visually-hidden span so the announcement is never nameless.
          -->
          <figcaption
            v-if="current && (current.caption || hasGroup)"
            class="lightbox__caption"
            :aria-live="hasGroup ? 'polite' : undefined"
            :aria-atomic="hasGroup ? 'true' : undefined"
          >
            <span v-if="hasGroup && !current.caption && current.alt" class="lightbox__sr-name">{{ current.alt }}</span>
            <span v-if="current.caption" class="lightbox__caption-text">{{ current.caption }}</span>
            <span v-if="hasGroup" class="lightbox__counter">{{ index + 1 }} / {{ items.length }}</span>
          </figcaption>
        </figure>

        <button
          v-if="hasGroup"
          type="button"
          class="lightbox__btn lightbox__nav lightbox__nav--next"
          aria-label="Next image (Right arrow)"
          @click="next"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'

interface LightboxItem {
  src: string
  alt: string
  caption: string
}

const mode = useRenderMode()

const open = ref(false)
const items = ref<LightboxItem[]>([])
const index = ref(0)

const current = computed<LightboxItem | null>(() => items.value[index.value] ?? null)
const hasGroup = computed(() => items.value.length > 1)
const dialogLabel = computed(() => current.value?.alt || current.value?.caption || 'Image viewer')

const dialogRef = ref<HTMLElement | null>(null)
const closeRef = ref<HTMLElement | null>(null)
let lastFocused: HTMLElement | null = null
let prevBodyOverflow = ''

// ── Pointer-gesture layer (mobile swipe navigate / swipe-down dismiss) ──
// dragX/dragY are the live px offsets applied to the figure while a gesture
// is active; at rest (0, 0) they render NO inline style, keeping the DOM
// byte-identical to the pre-gesture markup.
const dragX = ref(0)
const dragY = ref(0)
const dragging = ref(false)
let dragAxis: 'x' | 'x-inert' | 'y' | null = null
let pointerStartX = 0
let pointerStartY = 0
let activePointerId: number | null = null

const figureStyle = computed(() => {
  if (dragX.value === 0 && dragY.value === 0) return undefined
  const scale = dragY.value > 0 ? 1 - Math.min(dragY.value / 900, 0.08) : 1
  return { transform: `translate3d(${dragX.value}px, ${dragY.value}px, 0) scale(${scale})` }
})

const backdropStyle = computed(() => {
  if (!dragging.value || dragY.value <= 0) return undefined
  const opacity = 1 - Math.min(dragY.value / (window.innerHeight * 0.6), 0.55)
  return { opacity }
})

function resolveItem(el: HTMLElement): LightboxItem {
  const img = el.querySelector('img')
  const src =
    el.dataset.lightboxSrc?.trim() ||
    (img as HTMLImageElement | null)?.currentSrc ||
    (img as HTMLImageElement | null)?.src ||
    ''
  const alt = el.dataset.lightboxAlt?.trim() || (img as HTMLImageElement | null)?.alt || ''
  const caption = el.dataset.lightboxCaption?.trim() || ''
  return { src, alt, caption }
}

function escapeAttr(value: string): string {
  return value.replace(/["\\]/g, '\\$&')
}

function onDocClick(e: MouseEvent) {
  // Lightbox is a public-site behaviour; in the editor a banner click selects
  // the block, so never hijack it there.
  if (mode.value === 'editor-preview') return
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

  const target = e.target as Element | null
  const trigger = target?.closest<HTMLElement>('[data-lightbox]')
  if (!trigger) return

  e.preventDefault()

  const group = trigger.dataset.lightboxGroup?.trim()
  const members = group
    ? Array.from(document.querySelectorAll<HTMLElement>(`[data-lightbox][data-lightbox-group="${escapeAttr(group)}"]`))
    : [trigger]

  const resolved = members.map(resolveItem).filter((i) => i.src)
  if (!resolved.length) return

  const startSrc = resolveItem(trigger).src
  const startIndex = resolved.findIndex((i) => i.src === startSrc)

  items.value = resolved
  index.value = startIndex >= 0 ? startIndex : 0
  openViewer()
}

function lockScroll() {
  prevBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
}

function unlockScroll() {
  document.body.style.overflow = prevBodyOverflow
}

function openViewer() {
  lastFocused = (document.activeElement as HTMLElement) ?? null
  resetDrag()
  open.value = true
  lockScroll()
  nextTick(() => closeRef.value?.focus())
}

function resetDrag() {
  dragX.value = 0
  dragY.value = 0
}

function onPointerDown(e: PointerEvent) {
  // Same public-site-only guard as onDocClick; the editor preview never
  // opens the viewer, but bail defensively so the gesture layer can't engage.
  if (mode.value === 'editor-preview') return
  if (e.button !== 0) return
  if ((e.target as HTMLElement | null)?.closest('button')) return

  pointerStartX = e.clientX
  pointerStartY = e.clientY
  activePointerId = e.pointerId
  dragAxis = null

  try {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  } catch {
    // Pointer capture is best-effort (unsupported/lost pointer); the drag
    // still works via the move/up listeners bound on the figure itself.
  }
}

function onPointerMove(e: PointerEvent) {
  if (activePointerId === null || e.pointerId !== activePointerId) return

  const dx = e.clientX - pointerStartX
  const dy = e.clientY - pointerStartY

  if (dragAxis === null) {
    if (Math.hypot(dx, dy) < 6) return
    dragAxis = Math.abs(dx) > Math.abs(dy) ? (hasGroup.value ? 'x' : 'x-inert') : 'y'
    if (dragAxis === 'x' || dragAxis === 'y') dragging.value = true
  }

  if (dragAxis === 'x') {
    e.preventDefault()
    dragX.value = dx
    dragY.value = 0
  } else if (dragAxis === 'y') {
    e.preventDefault()
    dragY.value = Math.max(0, dy)
    dragX.value = 0
  }
}

function onPointerEnd(e: PointerEvent) {
  if (e.pointerId !== activePointerId) return

  const axis = dragAxis
  const finalDragX = dragX.value
  const finalDragY = dragY.value

  try {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  } catch {
    // Capture may already be released/lost (e.g. pointercancel); ignore.
  }
  activePointerId = null
  dragging.value = false

  if (axis === 'x') {
    const threshold = Math.max(60, window.innerWidth * 0.15)
    if (finalDragX > threshold) prev()
    else if (finalDragX < -threshold) next()
    resetDrag()
  } else if (axis === 'y') {
    const threshold = Math.max(110, window.innerHeight * 0.16)
    if (finalDragY > threshold) close()
    else resetDrag()
  } else {
    resetDrag()
  }

  dragAxis = null
}

function close() {
  if (!open.value) return
  open.value = false
  unlockScroll()
  nextTick(() => lastFocused?.focus?.())
}

function next() {
  if (hasGroup.value) index.value = (index.value + 1) % items.value.length
}

function prev() {
  if (hasGroup.value) index.value = (index.value - 1 + items.value.length) % items.value.length
}

function trapFocus(e: KeyboardEvent) {
  const dlg = dialogRef.value
  if (!dlg) return
  const focusable = Array.from(dlg.querySelectorAll<HTMLElement>('button:not([disabled])')).filter(
    (el) => el.offsetParent !== null,
  )
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement
  // Focus can sit OUTSIDE the dialog while it is open: a pointerdown on the figure
  // or the backdrop blurs the control without focusing anything, parking
  // activeElement on <body>. Tabbing from there walks the page BEHIND the opaque
  // overlay (header, nav, other triggers) — invisible to a sighted keyboard user.
  // Only first/last wrapping is not enough; re-enter the dialog from anywhere out.
  if (!(active instanceof HTMLElement) || !dlg.contains(active)) {
    e.preventDefault()
    ;(e.shiftKey ? last : first).focus()
    return
  }
  if (e.shiftKey && active === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}

function onKeydown(e: KeyboardEvent) {
  if (!open.value) return
  switch (e.key) {
    case 'Escape':
      e.preventDefault()
      close()
      break
    case 'ArrowRight':
      if (hasGroup.value) {
        e.preventDefault()
        next()
      }
      break
    case 'ArrowLeft':
      if (hasGroup.value) {
        e.preventDefault()
        prev()
      }
      break
    case 'Tab':
      trapFocus(e)
      break
  }
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  window.removeEventListener('keydown', onKeydown)
  if (open.value) unlockScroll()
})
</script>

<style scoped>
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 10050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1.2rem, 4vw, 4rem);
  background: rgba(10, 12, 14, 0.92);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.lightbox__figure {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.2rem;
  max-width: 100%;
  max-height: 100%;
  touch-action: none;
  /* The figure advertises drag-to-navigate (`grab`), so nothing inside it may start a
     NATIVE drag: the browser's image-drag / text-selection-drag both fire `dragstart`
     a few px into the gesture, which cancels the pointer stream (`pointercancel`) and
     silently kills the swipe. Touch never hit this; mouse always did. */
  user-select: none;
  -webkit-user-select: none;
  cursor: grab;
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.lightbox__figure.is-dragging {
  transition: none;
  cursor: grabbing;
}

.lightbox__image {
  display: block;
  max-width: min(112rem, 92vw);
  max-height: 82vh;
  width: auto;
  height: auto;
  object-fit: contain;
  box-shadow: 0 2.4rem 6rem rgba(0, 0, 0, 0.55);
  background: #1a1a1a;
}

.lightbox__caption {
  display: flex;
  align-items: baseline;
  gap: 1.6rem;
  color: rgba(255, 255, 255, 0.86);
  font-family: var(--rt-role-caption-family, Inter, sans-serif);
  font-size: clamp(1.2rem, 1.6vw, 1.4rem);
  line-height: 1.4;
  text-align: center;
  max-width: 60ch;
}

.lightbox__caption-text {
  flex: 1 1 auto;
}

/* Carries the item's accessible name into the caption's live region when the
   author supplied no visible caption. */
.lightbox__sr-name {
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

.lightbox__counter {
  flex: 0 0 auto;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.08em;
  opacity: 0.7;
}

/* Controls — shared chrome */
.lightbox__btn {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.18s ease;
}

.lightbox__btn svg {
  width: 55%;
  height: 55%;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.lightbox__btn:hover {
  background: rgba(255, 255, 255, 0.22);
}

.lightbox__btn:focus-visible {
  outline: 0.2rem solid #fff;
  outline-offset: 0.2rem;
}

.lightbox__close {
  top: clamp(1.2rem, 3vw, 2.4rem);
  right: clamp(1.2rem, 3vw, 2.4rem);
  width: 4.4rem;
  height: 4.4rem;
}

.lightbox__nav {
  top: 50%;
  width: 5.2rem;
  height: 5.2rem;
  transform: translateY(-50%);
}

.lightbox__nav:hover {
  transform: translateY(-50%) scale(1.06);
}

.lightbox__nav--prev {
  left: clamp(1.2rem, 3vw, 3.2rem);
}

.lightbox__nav--next {
  right: clamp(1.2rem, 3vw, 3.2rem);
}

@media (max-width: $bp-sm) {
  .lightbox__nav {
    width: 4.4rem;
    height: 4.4rem;
  }
  .lightbox__image {
    max-height: 74vh;
  }
}

/* Open/close animation — gracefully no-ops under reduced motion. */
.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.26s ease;
}
.lightbox-enter-active .lightbox__figure,
.lightbox-leave-active .lightbox__figure {
  transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}
.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}
.lightbox-enter-from .lightbox__figure,
.lightbox-leave-to .lightbox__figure {
  transform: scale(0.94);
}

@media (prefers-reduced-motion: reduce) {
  .lightbox-enter-active,
  .lightbox-leave-active,
  .lightbox-enter-active .lightbox__figure,
  .lightbox-leave-active .lightbox__figure,
  .lightbox__figure {
    transition: none;
  }
  .lightbox-enter-from .lightbox__figure,
  .lightbox-leave-to .lightbox__figure {
    transform: none;
  }
  .lightbox__btn {
    transition: none;
  }
}
</style>
