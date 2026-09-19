<template>
  <!--
    Context-aware magnetic cursor — a theme-level custom pointer.

    Mounted ONCE per layout and inert until opted in via theme settings
    (`cursor.enabled`). On a fine-pointer device it replaces the native arrow
    with a precise dot + a lagging ring that reacts to what it hovers, and can
    snap magnetically toward small targets. Like the Lightbox, it reads plain
    DOM attributes so ANY block adopts richer states without importing this
    component — pure contract, no coupling.

    ── Data contract (attributes on any element) ──
      data-cursor="grow"      ring enlarges over this element (the default for
                              links/buttons — set explicitly to opt a non-button in)
      data-cursor="text"      restore the native I-beam here (auto for inputs)
      data-cursor="hidden"    hide the custom cursor over this element
      data-cursor-label="View" ring becomes a filled accent disc with this label
      data-cursor-magnet      ring eases toward this element's centre (magnet snap)

    Native interactives (a[href], button, [role=button]) get "grow" for free;
    form fields get "text" for free. Reduced motion, coarse pointers and the
    editor preview all fall back to the native cursor (renders nothing).
  -->
  <Teleport to="body">
    <div
      v-if="active"
      class="cursor-layer"
      :class="[`cursor-layer--${stateClass}`, { 'is-visible': visible, 'is-pressed': pressed }]"
      aria-hidden="true"
      data-cursor-layer
    >
      <span ref="ringRef" class="cursor-layer__ring">
        <span v-if="label" class="cursor-layer__label">{{ label }}</span>
      </span>
      <span ref="dotRef" class="cursor-layer__dot" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useClientConfig } from '~/shared/composables/useClientConfig'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'

interface CursorConfig {
  enabled?: boolean
}

const ROOT_CLASS = 'splash-cursor-active'

const { themeSettings, isConfigLoaded } = useClientConfig()
const { isReducedMotion } = useReducedMotion()
const renderMode = useRenderMode()

const cfg = computed<CursorConfig>(() => {
  const raw = (themeSettings.value as Record<string, unknown>)?.cursor
  return raw && typeof raw === 'object' ? (raw as CursorConfig) : {}
})

// Only run on a real mouse (fine pointer + hover), never under reduced motion,
// never inside the editor preview, and only once opt-in + config is known.
function supportsFinePointer(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: fine)').matches &&
    window.matchMedia('(hover: hover)').matches
  )
}

const active = computed(
  () =>
    isConfigLoaded.value &&
    cfg.value.enabled === true &&
    !isReducedMotion.value &&
    renderMode.value !== 'editor-preview' &&
    supportsFinePointer(),
)

// ── reactive visual state ──
const ringRef = ref<HTMLElement | null>(null)
const dotRef = ref<HTMLElement | null>(null)
const visible = ref(false)
const pressed = ref(false)
const label = ref('')
const stateClass = ref<'default' | 'grow' | 'label' | 'magnet'>('default')

// ── pointer + animation bookkeeping (plain numbers, never reactive — the rAF
//    loop writes transforms directly to the DOM to stay off Vue's render path) ──
let raf = 0
let px = 0
let py = 0 // latest pointer position
let rx = 0
let ry = 0 // ring position (lags)
let magnetX: number | null = null
let magnetY: number | null = null
let started = false
let listening = false

const RING_LERP = 0.2
const MAGNET_LERP = 0.28

function rootEl(): HTMLElement | null {
  return typeof document !== 'undefined' ? document.documentElement : null
}

function classifyTarget(el: Element | null) {
  // Walk to the nearest element that expresses a cursor intent (explicit attr
  // or an implicit interactive). closest() handles nested children for free.
  const explicit = el?.closest<HTMLElement>('[data-cursor],[data-cursor-label],[data-cursor-magnet]')
  const native = el?.closest<HTMLElement>(
    'a[href],button,[role="button"],input,textarea,select,[contenteditable="true"]',
  )

  const labelTarget = el?.closest<HTMLElement>('[data-cursor-label]')
  const lbl = labelTarget?.dataset.cursorLabel?.trim() || ''

  const explicitKind = explicit?.dataset.cursor?.trim()
  const isFormField =
    native &&
    /^(input|textarea|select)$/i.test(native.tagName) === true &&
    !/^(button|submit|reset|checkbox|radio|range|color|file)$/i.test(
      (native as HTMLInputElement).type || '',
    )

  // hidden / text → defer to the native cursor over this element
  if (explicitKind === 'hidden') return { hide: true, label: '', state: 'default' as const, magnet: null }
  if (explicitKind === 'text' || isFormField || native?.tagName === 'TEXTAREA') {
    return { hide: true, label: '', state: 'default' as const, magnet: null }
  }

  const magnetTarget = el?.closest<HTMLElement>('[data-cursor-magnet]')
  let magnet: { x: number; y: number } | null = null
  if (magnetTarget) {
    const r = magnetTarget.getBoundingClientRect()
    magnet = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }

  if (lbl) return { hide: false, label: lbl, state: 'label' as const, magnet }
  if (magnet) return { hide: false, label: '', state: 'magnet' as const, magnet }
  if (explicitKind === 'grow' || native) return { hide: false, label: '', state: 'grow' as const, magnet }
  return { hide: false, label: '', state: 'default' as const, magnet }
}

function onMove(e: PointerEvent) {
  px = e.clientX
  py = e.clientY
  if (!visible.value) visible.value = true

  const info = classifyTarget(e.target as Element | null)
  visible.value = !info.hide
  label.value = info.label
  stateClass.value = info.state
  magnetX = info.magnet?.x ?? null
  magnetY = info.magnet?.y ?? null
}

function onDown() {
  pressed.value = true
}
function onUp() {
  pressed.value = false
}
function onLeave() {
  visible.value = false
}
function onEnter() {
  visible.value = true
}

function loop() {
  // Ring eases toward the magnet centre when one is engaged, otherwise toward
  // the live pointer. The dot always tracks the pointer exactly.
  const targetX = magnetX ?? px
  const targetY = magnetY ?? py
  const ease = magnetX !== null ? MAGNET_LERP : RING_LERP
  rx += (targetX - rx) * ease
  ry += (targetY - ry) * ease

  if (ringRef.value) ringRef.value.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`
  if (dotRef.value) dotRef.value.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`

  raf = requestAnimationFrame(loop)
}

function bind() {
  if (started) return
  started = true
  // Seed positions at centre so the first frame doesn't fly in from 0,0.
  px = rx = window.innerWidth / 2
  py = ry = window.innerHeight / 2
  rootEl()?.classList.add(ROOT_CLASS)
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onDown, { passive: true })
  window.addEventListener('pointerup', onUp, { passive: true })
  document.addEventListener('pointerleave', onLeave)
  document.addEventListener('pointerenter', onEnter)
  listening = true
  raf = requestAnimationFrame(loop)
}

function unbind() {
  if (!started) return
  started = false
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  if (listening) {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerdown', onDown)
    window.removeEventListener('pointerup', onUp)
    document.removeEventListener('pointerleave', onLeave)
    document.removeEventListener('pointerenter', onEnter)
    listening = false
  }
  rootEl()?.classList.remove(ROOT_CLASS)
  visible.value = false
  pressed.value = false
  label.value = ''
  stateClass.value = 'default'
  magnetX = magnetY = null
}

watch(
  active,
  (on) => {
    if (on) bind()
    else unbind()
  },
  { immediate: true },
)

onBeforeUnmount(unbind)
</script>

<!-- Cursor element visuals (scoped — survives Teleport via the scope id). -->
<style scoped>
.cursor-layer {
  position: fixed;
  inset: 0;
  z-index: 100000;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.cursor-layer.is-visible {
  opacity: 1;
}

.cursor-layer__ring,
.cursor-layer__dot {
  position: fixed;
  top: 0;
  left: 0;
  will-change: transform;
  pointer-events: none;
}

.cursor-layer__ring {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.6rem;
  height: 2.6rem;
  border: 0.15rem solid var(--color-accent, #1b8ab7);
  border-radius: 50%;
  background: transparent;
  transition: width 0.22s ease, height 0.22s ease, background-color 0.22s ease,
    border-color 0.22s ease, opacity 0.2s ease;
}

.cursor-layer__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--color-accent, #1b8ab7);
  transition: opacity 0.2s ease;
}

/* grow / magnet — ring swells, dot recedes for an open, magnetic feel */
.cursor-layer--grow .cursor-layer__ring,
.cursor-layer--magnet .cursor-layer__ring {
  width: 4.4rem;
  height: 4.4rem;
  background: color-mix(in srgb, var(--color-accent, #1b8ab7) 12%, transparent);
}
.cursor-layer--grow .cursor-layer__dot,
.cursor-layer--magnet .cursor-layer__dot {
  opacity: 0;
}

/* label — ring becomes a filled disc carrying a short call-to-action */
.cursor-layer--label .cursor-layer__ring {
  width: 6.4rem;
  height: 6.4rem;
  background: var(--color-accent, #1b8ab7);
  border-color: var(--color-accent, #1b8ab7);
}
.cursor-layer--label .cursor-layer__dot {
  opacity: 0;
}
.cursor-layer__label {
  color: var(--color-white, #fff);
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-family: var(--rt-role-caption-family, Inter, sans-serif);
}

/* press — quick tactile pinch (the rAF owns `transform`, so press is keyed on
   size/fill instead to avoid clobbering the inline translate). */
.cursor-layer.is-pressed .cursor-layer__ring {
  width: 2rem;
  height: 2rem;
  background: color-mix(in srgb, var(--color-accent, #1b8ab7) 24%, transparent);
}
.cursor-layer.is-pressed .cursor-layer__dot {
  opacity: 0.5;
}
</style>

<!-- Global hide-native rules (NOT scoped — they target the document + arbitrary
     theme children that this component does not own). -->
<style>
/* Scope the hide-native rule to the theme subtree (`[data-site-root]`, set on
   the standalone layouts) plus body-teleported overlays that opt in via
   `data-cursor-scope`, instead of blanketing the whole document. The bare
   `html` selector stays so the raw page background still hides the native
   cursor. `:where()` keeps specificity at 0 so the opt-out block below (input /
   textarea / select / [contenteditable] / [data-cursor]) continues to win.

   Teleported overlays needing `data-cursor-scope` on their root (added here
   where owned in this package; the rest listed for their owning component):
     - Lightbox.vue  → .lightbox            (added in this package)
     - SectionNav.vue → nav.section-nav     (added in this package)
     - UI/Modal.vue  → .ui-modal-backdrop   (owner-set: add data-cursor-scope)
     - UI/Toast.vue  → toast root           (owner-set: add data-cursor-scope)
     - ProjectIndex.vue → .project-index__peek (owner-set; aria-hidden peek) */
html.splash-cursor-active,
html.splash-cursor-active :where(
  [data-site-root],
  [data-site-root] *,
  [data-cursor-scope],
  [data-cursor-scope] *
) {
  cursor: none !important;
}
/* Text-entry + opt-out surfaces keep their native cursor (higher specificity). */
html.splash-cursor-active input,
html.splash-cursor-active textarea,
html.splash-cursor-active select,
html.splash-cursor-active [contenteditable='true'],
html.splash-cursor-active [data-cursor='text'],
html.splash-cursor-active [data-cursor='hidden'] {
  cursor: auto !important;
}
</style>
