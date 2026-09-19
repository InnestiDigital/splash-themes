<template>
  <section
    class="scroll-color-reveal"
    :style="{ ...measureStyle, ...alignStyle }"
    data-target="root"
  >
    <ul ref="listEl" class="scroll-color-reveal__list" data-target="list">
      <li
        v-for="(item, i) in resolvedItems"
        :key="i"
        class="scroll-color-reveal__item"
        data-target="item"
        :data-motion-suppressed="allLit ? 'true' : undefined"
        :style="{ '--scr-progress': String(allLit ? 1 : (progresses[i] ?? 0)) }"
      >
        <a
          v-if="item.targetAnchor"
          class="scroll-color-reveal__link"
          :href="`#${item.targetAnchor}`"
          >{{ item.label }}</a
        >
        <span v-else class="scroll-color-reveal__link">{{ item.label }}</span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'

interface RevealItem {
  label?: string | Record<string, string>
  targetAnchor?: string
}

const props = defineProps<{
  items?: RevealItem[]
  measureWidth?: 'content' | 'narrow' | 'standard' | 'wide' | 'full'
  textAlign?: 'left' | 'center' | 'right'
}>()

const { getLocalizedValue } = useLocalized()
const { isReducedMotion } = useReducedMotion()
const renderMode = useRenderMode()
const isEditor = computed(() => renderMode.value === 'editor-preview')

const resolvedItems = computed(() =>
  (props.items || []).map((it) => ({
    label: getLocalizedValue(it.label),
    // Anchors resolve to a section element id (SectionRenderer emits :id="anchor").
    targetAnchor: (it.targetAnchor || '').replace(/^#/, '').trim(),
  })),
)

// Per-item scroll progress 0→1 (muted → lit). Driven by rAF-throttled scroll.
const progresses = ref<number[]>([])
const runtimeReady = ref(true)
// Static path: reduced motion, editor preview, or no scroll runtime → all lit
// so every name renders at full navy contrast (legible without scrolling).
const allLit = computed(() => isReducedMotion.value || isEditor.value || !runtimeReady.value)

const listEl = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
let active = false
let ticking = false
let targets: (HTMLElement | null)[] = []

function resolveTargets() {
  targets = resolvedItems.value.map((it) =>
    it.targetAnchor ? document.getElementById(it.targetAnchor) : null,
  )
}

function compute() {
  ticking = false
  const vh = window.innerHeight || document.documentElement.clientHeight || 1
  // A row starts lighting when its top passes 80% of the viewport height and is
  // fully lit once its top reaches 35% — so each name colours as its own row
  // scrolls up into view. This is scroll-scrubbed, independent of the entrance
  // choreography engine.
  const start = vh * 0.8
  const end = vh * 0.35
  const denom = start - end || 1
  progresses.value = resolvedItems.value.map((it, i) => {
    let node = targets[i]
    if (!node && it.targetAnchor) {
      node = document.getElementById(it.targetAnchor)
      targets[i] = node
    }
    // No resolvable target → treat as lit so the label stays legible.
    if (!node) return 1
    const top = node.getBoundingClientRect().top
    return Math.min(1, Math.max(0, (start - top) / denom))
  })
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
  // Static path: nothing to wire — every name renders fully lit.
  if (isReducedMotion.value || isEditor.value) return
  if (typeof IntersectionObserver === 'undefined' || !listEl.value) {
    runtimeReady.value = false
    return
  }
  resolveTargets()
  // Keep the scroll listener live across a generous band (the target rows sit
  // below this block) so names keep updating while any row is near the viewport.
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) activate()
        else deactivate()
      }
    },
    { rootMargin: '100% 0px 100% 0px' },
  )
  observer.observe(listEl.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  deactivate()
})

// Re-resolve + re-measure when items change (editor preview edits).
watch(resolvedItems, () => {
  resolveTargets()
  if (active) onScroll()
})

const measureStyle = computed<Record<string, string>>(() =>
  props.measureWidth ? { '--block-measure': `var(--measure-width-${props.measureWidth})` } : {},
)
const alignStyle = computed<Record<string, string>>(() =>
  props.textAlign ? { textAlign: props.textAlign } : {},
)
</script>

<style lang="scss" scoped>
.scroll-color-reveal {
  // Endpoint colours come from theme tokens (color freeze: no author hex controls).
  // Muted resting tint → primary navy as each row enters view.
  --scr-lit: var(--color-primary, #1e3d4f);
  --scr-muted: #c3ccd1;

  max-width: var(--block-measure, 100%);
  margin-inline: var(--block-measure-align, auto);

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.08em;
  }

  &__item {
    --scr-progress: 0;
  }

  &__link {
    // flex + min-height guarantees a >=44px touch target on mobile where the
    // fluid type floor (32px) alone leaves a 34px box; single-line labels make
    // flex visually identical to block at desktop, where the 85px type already
    // exceeds 44px.
    display: flex;
    align-items: center;
    min-height: 4.4rem;
    // 85px tier, Sul Sans — mirrors SectionHeading's display-lg size tier so the
    // category names sit just below the page mega-title, matching the reference.
    font-family: var(--font-family-heading, 'Sul Sans', sans-serif);
    font-size: clamp(3.2rem, 5vw, 5.5rem);
    font-weight: 400;
    line-height: 1.05;
    letter-spacing: -0.015em;
    text-decoration: none;
    // Fallback for engines without color-mix(): resting muted tint.
    color: var(--scr-muted);
    // Scroll-scrubbed interpolation muted → navy via the per-item progress var.
    color: color-mix(in srgb, var(--scr-lit) calc(var(--scr-progress, 0) * 100%), var(--scr-muted));
    transition: color 120ms linear;
  }

  // Static mode (reduced motion / editor / no-JS): no easing, progress pinned to 1.
  &__item[data-motion-suppressed='true'] &__link {
    transition: none;
  }

  @media (prefers-reduced-motion: reduce) {
    &__link {
      transition: none;
    }
  }
}
</style>
