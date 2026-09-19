<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { BackgroundRole, TextRole } from '~/shared/types/placement'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP, resolveTextRole } from '~/shared/features/cms/placement/placementTokenMaps'
import { useBlockSurface } from '~/shared/composables/useBlockSurface'
import { asHtml } from '~/shared/utils/asHtml'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'
import { isMobileViewport } from '~/shared/features/cms/composition/responsive'

const props = defineProps<{
  title?: string
  style?: 'list' | 'inline' | 'numbered'
  highlightCurrent?: boolean
  showProgressRail?: boolean
  floatingDock?: boolean
  dockSide?: 'left' | 'right'
  background?: BackgroundRole
  textTone?: TextRole
  surfaceStyle?: string
  borderRadius?: string
  internalPadding?: string
  textAlign?: string
}>()

const renderMode = useRenderMode()
const isEditor = computed(() => renderMode.value === 'editor-preview')

interface TocEntry {
  id: string
  label: string
  el: Element
}

const entries = ref<TocEntry[]>([])
const activeId = ref<string | null>(null)
let observer: IntersectionObserver | null = null

// Floating dock rail (opt-in follow-along reading companion).
// Own width tracking (not the shared useViewport composable, which always
// registers a resize listener) — the listener is attached ONLY when the dock is
// enabled, so the default-off instances stay byte-identical / listener-free.
const dockWidth = ref(1280)
const isDesktop = computed(() => !isMobileViewport(dockWidth.value))
const rootEl = ref<HTMLElement | null>(null)
const inlineVisible = ref(true)
let inlineObserver: IntersectionObserver | null = null

function onDockResize() {
  dockWidth.value = window.innerWidth
}
function attachDock() {
  onDockResize()
  window.addEventListener('resize', onDockResize, { passive: true })
}
function detachDock() {
  window.removeEventListener('resize', onDockResize)
}

const dockSideResolved = computed<'left' | 'right'>(() =>
  props.dockSide === 'left' ? 'left' : 'right',
)

const dockActive = computed(
  () =>
    props.floatingDock === true &&
    !isEditor.value &&
    isDesktop.value &&
    entries.value.length > 0,
)

// Show the fixed dock only once the inline TOC has scrolled out of view,
// so the reader never sees two TOCs at once.
const dockVisible = computed(() => dockActive.value && !inlineVisible.value)

function setupInlineObserver() {
  if (!props.floatingDock || isEditor.value || !rootEl.value) return
  inlineObserver = new IntersectionObserver(
    (entriez) => {
      for (const entry of entriez) {
        inlineVisible.value = entry.isIntersecting
      }
    },
    { threshold: 0 },
  )
  inlineObserver.observe(rootEl.value)
}

function scanSections() {
  const sections = document.querySelectorAll('section[id]')
  entries.value = Array.from(sections)
    .filter(el => el.id && el.id.trim() !== '')
    .map(el => ({
      id: el.id,
      label:
        el.getAttribute('data-section-name') ||
        el.querySelector('h1, h2, h3, h4')?.textContent?.trim() ||
        el.id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      el,
    }))
}

function setupObserver() {
  // The dock needs activeId too, so run the section observer when either the
  // visual highlight or the floating dock is enabled. The highlight's own
  // visual state stays gated on highlightCurrent in the template.
  if (!props.highlightCurrent && !props.floatingDock) return
  observer = new IntersectionObserver(
    (entriez) => {
      for (const entry of entriez) {
        if (entry.isIntersecting) {
          activeId.value = (entry.target as HTMLElement).id
        }
      }
    },
    { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
  )
  entries.value.forEach(e => observer!.observe(e.el))
}

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const displayStyle = computed(() => props.style || 'list')

const progress = ref(0)
let rafId = 0

const railActive = computed(
  () =>
    props.showProgressRail === true &&
    !isEditor.value &&
    (displayStyle.value === 'list' || displayStyle.value === 'numbered'),
)

function computeProgress() {
  if (entries.value.length === 0) {
    progress.value = 0
    return
  }
  const first = entries.value[0].el
  const last = entries.value[entries.value.length - 1].el
  const start = first.getBoundingClientRect().top + window.scrollY
  const lastRect = last.getBoundingClientRect()
  const end = lastRect.top + window.scrollY + lastRect.height
  const refY = window.scrollY + window.innerHeight * 0.3
  const span = end - start
  progress.value = span <= 0 ? 0 : Math.min(1, Math.max(0, (refY - start) / span))
}

function onScroll() {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    computeProgress()
  })
}

function attachRail() {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  computeProgress()
}

function detachRail() {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  progress.value = 0
}

watch(railActive, (active) => {
  if (active) {
    attachRail()
  } else {
    detachRail()
  }
})

onMounted(() => {
  scanSections()
  setupObserver()
  if (props.floatingDock) attachDock()
  setupInlineObserver()
  if (railActive.value) attachRail()
})

onUnmounted(() => {
  observer?.disconnect()
  inlineObserver?.disconnect()
  detachDock()
  detachRail()
})

const resolvedTextColor = computed(() =>
  props.textTone ? resolveTextRole(props.textTone) : 'var(--section-text, var(--color-text))',
)

const { surfaceStyle: blockSurfaceStyle } = useBlockSurface(props, { fallbackBackground: 'transparent' })

const rootStyle = computed(() => {
  // Explicit-only background: the `transparent` role emits no backgroundColor,
  // so the enclosing section keeps showing through, as before.
  const s: Record<string, string> = { color: resolvedTextColor.value }
  Object.assign(s, blockSurfaceStyle.value)
  return s
})

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.surfaceStyle === 'filled') {
    style.backgroundColor = 'var(--section-accent)'
  } else if (props.surfaceStyle === 'subtle') {
    style.backgroundColor = 'var(--section-surface)'
  }
  if (props.borderRadius) {
    style.borderRadius = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? ''
  }
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  if (props.textAlign) {
    style.textAlign = props.textAlign
  }
  return style
})

</script>

<template>
  <nav
    ref="rootEl"
    class="table-of-contents"
    :class="[`table-of-contents--${displayStyle}`, { 'table-of-contents--rail': railActive }]"
    :style="{ ...rootStyle, ...contentStyle, ...(railActive ? { '--toc-progress': String(progress) } : {}) }"
    aria-label="Table of contents"
  >
    <div v-if="title" class="table-of-contents__title" data-target="title" v-html="asHtml(title)" />

    <div v-if="entries.length === 0" class="table-of-contents__empty">
      No anchored sections found on this page.
    </div>

    <!-- Vertical list -->
    <ul v-else-if="displayStyle === 'list' || displayStyle === 'numbered'" class="table-of-contents__list">
      <span v-if="railActive" class="table-of-contents__rail" aria-hidden="true"><span class="table-of-contents__rail-fill" /></span>
      <li
        v-for="(entry, idx) in entries"
        :key="entry.id"
        class="table-of-contents__item"
        data-target="item"
        :data-item-index="idx"
        :class="{ 'table-of-contents__item--active': highlightCurrent && activeId === entry.id }"
      >
        <a :href="`#${entry.id}`" data-interactive="true" class="table-of-contents__link" @click.prevent="scrollTo(entry.id)">
          <span v-if="displayStyle === 'numbered'" class="table-of-contents__number">{{ idx + 1 }}.</span>
          {{ entry.label }}
        </a>
      </li>
    </ul>

    <!-- Inline -->
    <div v-else class="table-of-contents__inline">
      <a
        v-for="entry in entries"
        :key="entry.id"
        :href="`#${entry.id}`"
        class="table-of-contents__inline-link"
        :class="{ 'table-of-contents__inline-link--active': highlightCurrent && activeId === entry.id }"
        @click.prevent="scrollTo(entry.id)"
      >
        {{ entry.label }}
      </a>
    </div>

    <!-- Floating dot-rail reading companion (opt-in, desktop, non-editor) -->
    <Teleport v-if="dockActive" to="body">
      <Transition name="toc-dock">
        <nav
          v-if="dockVisible"
          class="table-of-contents-dock"
          :class="`table-of-contents-dock--${dockSideResolved}`"
          aria-label="Section navigation"
        >
          <ul class="table-of-contents-dock__list">
            <li
              v-for="entry in entries"
              :key="entry.id"
              class="table-of-contents-dock__item"
            >
              <a
                :href="`#${entry.id}`"
                class="table-of-contents-dock__dot"
                :class="{ 'table-of-contents-dock__dot--active': activeId === entry.id }"
                :aria-label="entry.label"
                @click.prevent="scrollTo(entry.id)"
              >
                <span class="table-of-contents-dock__label" aria-hidden="true">{{ entry.label }}</span>
              </a>
            </li>
          </ul>
        </nav>
      </Transition>
    </Teleport>
  </nav>
</template>

<style scoped>
.table-of-contents {
  font-family: var(--font-body, 'Open Sans', sans-serif);
}

.table-of-contents__title {
  font-family: var(--rt-slot-title-family, var(--rt-role-overline-family, inherit));
  font-size: var(--rt-slot-title-size, var(--rt-role-overline-size, 0.75rem));
  font-weight: var(--rt-slot-title-weight, var(--rt-role-overline-weight, 600));
  line-height: var(--rt-slot-title-line-height, var(--rt-role-overline-line-height, inherit));
  letter-spacing: var(--rt-slot-title-letter-spacing, var(--rt-role-overline-letter-spacing, 0.05em));
  text-transform: var(--rt-slot-title-text-transform, var(--rt-role-overline-text-transform, uppercase));
  color: var(--rt-slot-title-color, var(--rt-role-overline-color, inherit));
  opacity: 0.6;
  margin-bottom: 0.75rem;
}

.table-of-contents__empty {
  font-size: 0.85rem;
  opacity: 0.5;
  font-style: italic;
}

/* ── List style ── */
.table-of-contents__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.table-of-contents__item {
  position: relative;
}

.table-of-contents__link {
  display: block;
  padding: 0.35rem 0.75rem;
  font-family: var(--rt-slot-link-family, var(--rt-role-label-family, inherit));
  font-size: var(--rt-slot-link-size, var(--rt-role-label-size, 0.875rem));
  font-weight: var(--rt-slot-link-weight, var(--rt-role-label-weight, inherit));
  line-height: var(--rt-slot-link-line-height, var(--rt-role-label-line-height, 1.4));
  letter-spacing: var(--rt-slot-link-letter-spacing, var(--rt-role-label-letter-spacing, normal));
  text-transform: var(--rt-slot-link-text-transform, var(--rt-role-label-text-transform, none));
  color: var(--rt-slot-link-color, var(--rt-role-label-color, inherit));
  text-decoration: none;
  border-left: 2px solid transparent;
  transition: border-color 0.2s ease, opacity 0.2s ease;
  opacity: 0.7;
}

.table-of-contents__link:hover {
  opacity: 1;
}

.table-of-contents__item--active .table-of-contents__link {
  border-left-color: var(--section-accent, var(--color-primary, #108A00));
  opacity: 1;
  font-weight: 600;
}

.table-of-contents__number {
  margin-right: 0.35rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.5;
}

/* ── Progress rail (opt-in) ── */
.table-of-contents--rail .table-of-contents__list {
  position: relative;
  padding-left: 1rem;
}

.table-of-contents__rail {
  position: absolute;
  left: 0;
  top: 0.35rem;
  bottom: 0.35rem;
  width: 2px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--section-accent, var(--color-primary, #108A00)) 18%, transparent);
  overflow: hidden;
}

.table-of-contents__rail-fill {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  transform-origin: top;
  height: calc(var(--toc-progress, 0) * 100%);
  background: var(--section-accent, var(--color-primary, #108A00));
  transition: height 0.12s linear;
}

@media (prefers-reduced-motion: reduce) {
  .table-of-contents__rail-fill {
    transition: none;
  }
}

/* ── Inline style ── */
.table-of-contents__inline {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}

.table-of-contents__inline-link {
  font-family: var(--rt-slot-link-family, var(--rt-role-label-family, inherit));
  font-size: var(--rt-slot-link-size, var(--rt-role-label-size, 0.85rem));
  font-weight: var(--rt-slot-link-weight, var(--rt-role-label-weight, inherit));
  line-height: var(--rt-slot-link-line-height, var(--rt-role-label-line-height, inherit));
  letter-spacing: var(--rt-slot-link-letter-spacing, var(--rt-role-label-letter-spacing, normal));
  text-transform: var(--rt-slot-link-text-transform, var(--rt-role-label-text-transform, none));
  color: var(--rt-slot-link-color, var(--rt-role-label-color, inherit));
  text-decoration: none;
  opacity: 0.6;
  padding-bottom: 0.15rem;
  border-bottom: 1.5px solid transparent;
  transition: opacity 0.2s ease, border-color 0.2s ease;
}

.table-of-contents__inline-link:hover {
  opacity: 1;
}

.table-of-contents__inline-link--active {
  opacity: 1;
  font-weight: 600;
  border-bottom-color: var(--section-accent, var(--color-primary, #108A00));
}

/* ── Responsive ── */
@media (max-width: $bp-md) {
  .table-of-contents--list .table-of-contents__list,
  .table-of-contents--numbered .table-of-contents__list {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.25rem 0.75rem;
  }

  .table-of-contents--list .table-of-contents__link,
  .table-of-contents--numbered .table-of-contents__link {
    border-left: none;
    border-bottom: 2px solid transparent;
    padding: 0.25rem 0;
  }

  .table-of-contents--list .table-of-contents__item--active .table-of-contents__link,
  .table-of-contents--numbered .table-of-contents__item--active .table-of-contents__link {
    border-left-color: transparent;
    border-bottom-color: var(--section-accent, var(--color-primary, #108A00));
  }

  /* Rail is a desktop sidebar affordance — hide on mobile, keep horizontal layout */
  .table-of-contents--rail .table-of-contents__list {
    padding-left: 0;
  }

  .table-of-contents__rail {
    display: none;
  }
}

/* ── Floating dock rail (opt-in follow-along companion) ── */
.table-of-contents-dock {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  z-index: 40;
  font-family: var(--font-body, 'Open Sans', sans-serif);
  pointer-events: none;
}

.table-of-contents-dock--right {
  right: max(0.75rem, env(safe-area-inset-right, 0px));
}

.table-of-contents-dock--left {
  left: max(0.75rem, env(safe-area-inset-left, 0px));
}

.table-of-contents-dock__list {
  list-style: none;
  margin: 0;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  align-items: center;
}

.table-of-contents-dock__item {
  display: flex;
  line-height: 0;
}

.table-of-contents-dock__dot {
  position: relative;
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--section-accent, var(--color-primary, #108A00)) 32%, transparent);
  pointer-events: auto;
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.table-of-contents-dock__dot:hover,
.table-of-contents-dock__dot:focus-visible {
  transform: scale(1.35);
  background: var(--section-accent, var(--color-primary, #108A00));
}

.table-of-contents-dock__dot--active {
  transform: scale(1.55);
  background: var(--section-accent, var(--color-primary, #108A00));
}

.table-of-contents-dock__dot:focus-visible {
  outline: 2px solid var(--section-accent, var(--color-primary, #108A00));
  outline-offset: 3px;
}

/* Label pill slides out from the rail edge on hover/focus */
.table-of-contents-dock__label {
  position: absolute;
  top: 50%;
  white-space: nowrap;
  padding: 0.25rem 0.55rem;
  border-radius: 5px;
  background: var(--section-bg, var(--color-surface, #fff));
  color: var(--section-text, var(--color-text, #111));
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.2;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.14);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.table-of-contents-dock--right .table-of-contents-dock__label {
  right: calc(100% + 12px);
  transform: translateY(-50%) translateX(8px);
}

.table-of-contents-dock--left .table-of-contents-dock__label {
  left: calc(100% + 12px);
  transform: translateY(-50%) translateX(-8px);
}

.table-of-contents-dock--right .table-of-contents-dock__dot:hover .table-of-contents-dock__label,
.table-of-contents-dock--right .table-of-contents-dock__dot:focus-within .table-of-contents-dock__label,
.table-of-contents-dock--left .table-of-contents-dock__dot:hover .table-of-contents-dock__label,
.table-of-contents-dock--left .table-of-contents-dock__dot:focus-within .table-of-contents-dock__label {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

/* Fade + scale on show/hide */
.toc-dock-enter-active,
.toc-dock-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.toc-dock-enter-from,
.toc-dock-leave-to {
  opacity: 0;
  transform: translateY(-50%) scale(0.9);
}

@media (prefers-reduced-motion: reduce) {
  .table-of-contents-dock__dot,
  .table-of-contents-dock__label {
    transition: none;
  }

  .toc-dock-enter-active,
  .toc-dock-leave-active {
    transition: none;
  }

  .toc-dock-enter-from,
  .toc-dock-leave-to {
    transform: translateY(-50%);
  }
}
</style>
