<template>
  <section
    class="process-steps"
    :class="[
      `process-steps--${layout}`,
      `process-steps--align-${align}`,
      `process-steps--number-${numberStyle}`,
      { 'process-steps--connector': connector === 'rule' },
      { 'process-steps--no-motion': isReducedMotion },
      { 'process-steps--has-media': hasMedia },
    ]"
    :style="rootStyle"
    data-target="root"
  >
    <h2 v-if="title && localizedTitle" data-target="heading" class="process-steps__title" v-html="asHtml(localizedTitle)"></h2>

    <ol ref="el" class="process-steps__list" data-target="items">
      <span v-if="isSpine" class="process-steps__spine-track" aria-hidden="true"></span>
      <span
        v-if="isSpine"
        class="process-steps__spine-fill"
        aria-hidden="true"
        :style="spineFull ? { height: '100%' } : { height: `${fillPx}px` }"
      ></span>
      <li
        v-for="(s, i) in items"
        :key="i"
        :ref="setStepRef"
        class="process-steps__step"
        data-target="item"
        :data-item-index="i"
        :class="{ 'is-in': shown, 'is-reached': isSpine && (spineFull || reached[i]) }"
        :style="{ transitionDelay: `${i * 90}ms` }"
      >
        <span v-if="isSpine" class="process-steps__node" aria-hidden="true"></span>
        <span v-if="numberFormat !== 'none'" class="process-steps__num" aria-hidden="true">{{ ordinal(i) }}</span>
        <div class="process-steps__body">
          <figure v-if="imageOf(s)" class="process-steps__media">
            <img class="process-steps__img" :src="imageOf(s)" :alt="imageAltOf(s)" loading="lazy" decoding="async" />
          </figure>
          <span v-if="labelOf(s)" class="process-steps__label" v-html="asHtml(labelOf(s))"></span>
          <h3 v-if="titleOf(s)" class="process-steps__step-title" v-html="asHtml(titleOf(s))"></h3>
          <p v-if="descOf(s)" class="process-steps__desc prose" v-html="asHtml(descOf(s))"></p>
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'

type Layout = 'band' | 'stack' | 'spine'
type NumberFormat = 'padded' | 'plain' | 'none'
type NumberStyle = 'ghost' | 'solid'
type AccentRole = 'accent' | 'primary' | 'heading'
type Connector = 'rule' | 'none'
type Align = 'left' | 'center'
type Measure = 'content' | 'narrow' | 'standard' | 'wide' | 'full'
type MediaRatio = 'landscape' | 'square' | 'portrait'

interface StepInput {
  title?: string | Record<string, string>
  label?: string | Record<string, string>
  description?: string | Record<string, string>
  image?: string
  imageAlt?: string | Record<string, string>
}

const props = withDefaults(defineProps<{
  title?: string | Record<string, string>
  steps?: StepInput[]
  layout?: Layout
  numberFormat?: NumberFormat
  numberStyle?: NumberStyle
  accentRole?: AccentRole
  connector?: Connector
  reveal?: 'on' | 'off'
  align?: Align
  measureWidth?: Measure
  mediaRatio?: MediaRatio
}>(), {
  steps: () => [],
  layout: 'band',
  numberFormat: 'padded',
  numberStyle: 'ghost',
  accentRole: 'accent',
  connector: 'rule',
  reveal: 'on',
  align: 'left',
  measureWidth: 'wide',
  mediaRatio: 'landscape',
})

const { getLocalizedValue } = useLocalized()
const { isReducedMotion } = useReducedMotion()

const layout = computed<Layout>(() => props.layout ?? 'band')
const isSpine = computed<boolean>(() => layout.value === 'spine')
const numberStyle = computed<NumberStyle>(() => props.numberStyle ?? 'ghost')
const numberFormat = computed<NumberFormat>(() => props.numberFormat ?? 'padded')
const connector = computed<Connector>(() => props.connector ?? 'rule')
const align = computed<Align>(() => props.align ?? 'left')

const localizedTitle = computed(() => getLocalizedValue(props.title))
const items = computed<StepInput[]>(() => props.steps ?? [])

function titleOf(s: StepInput): string { return getLocalizedValue(s.title) }
function labelOf(s: StepInput): string { return s.label ? getLocalizedValue(s.label) : '' }
function descOf(s: StepInput): string { return s.description ? getLocalizedValue(s.description) : '' }
function imageOf(s: StepInput): string { return s.image ?? '' }
function imageAltOf(s: StepInput): string { return s.imageAlt ? getLocalizedValue(s.imageAlt) : '' }

const hasMedia = computed<boolean>(() => items.value.some((s) => !!imageOf(s)))

function ordinal(i: number): string {
  const n = i + 1
  return numberFormat.value === 'padded' ? String(n).padStart(2, '0') : String(n)
}

const ACCENT_VAR: Record<AccentRole, string> = {
  accent: 'var(--color-accent, var(--color-primary))',
  primary: 'var(--color-primary)',
  heading: 'var(--rt-role-heading2-color, inherit)',
}

const RATIO_MAP: Record<MediaRatio, string> = {
  landscape: '4 / 3',
  square: '1 / 1',
  portrait: '3 / 4',
}

const rootStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {
    '--ps-accent': ACCENT_VAR[props.accentRole ?? 'accent'],
    '--ps-media-ratio': RATIO_MAP[props.mediaRatio ?? 'landscape'],
  }
  if (props.measureWidth) style['--block-measure'] = `var(--measure-width-${props.measureWidth})`
  return style
})

// ── Stagger reveal on scroll (reduced-motion → shown immediately) ────────────
const el = ref<HTMLElement | null>(null)
const shown = ref(false)
let observer: IntersectionObserver | null = null

// ── Spine only: per-step activation + downward scroll-fill ────────────────────
// `reached[i]` flips true once step i's node crosses ~65% down the viewport;
// `fillPx` is the accent line's height (px, relative to the <ol>), reaching the
// node centre of the furthest reached step. `spineFull` short-circuits both to a
// fully-drawn, un-animated line for reduced-motion / reveal-off.
const NODE_HALF = 9
const stepEls = ref<HTMLElement[]>([])
const reached = ref<boolean[]>([])
const fillPx = ref(0)
const spineNoMotion = () => props.reveal === 'off' || isReducedMotion.value
const spineFull = ref(spineNoMotion())
let stepObserver: IntersectionObserver | null = null

function setStepRef(elm: Element | ComponentPublicInstance | null): void {
  if (elm instanceof HTMLElement && !stepEls.value.includes(elm)) {
    stepEls.value.push(elm)
  }
}

function resetSpineState(): void {
  const full = spineNoMotion()
  reached.value = items.value.map(() => full)
  fillPx.value = 0
  spineFull.value = full
}

function markSpineFull(): void {
  reached.value = items.value.map(() => true)
  spineFull.value = true
}

function teardownStepObserver(): void {
  stepObserver?.disconnect()
  stepObserver = null
}

function setupSpineObserver(): void {
  teardownStepObserver()
  if (!isSpine.value) return
  if (spineNoMotion()) {
    markSpineFull()
    return
  }
  // Prune step elements detached by an editor re-render before re-arming.
  stepEls.value = stepEls.value.filter((elm) => elm.isConnected)
  if (typeof IntersectionObserver === 'undefined' || !stepEls.value.length) {
    markSpineFull()
    return
  }
  stepObserver = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const target = e.target
        if (!(target instanceof HTMLElement)) continue
        const idx = Number(target.dataset.itemIndex)
        if (!Number.isInteger(idx) || idx < 0 || idx >= reached.value.length) continue
        reached.value[idx] = true
        const node = target.querySelector('.process-steps__node')
        const nodeCentre = node instanceof HTMLElement
          ? node.offsetTop + node.offsetHeight / 2
          : NODE_HALF
        const px = target.offsetTop + nodeCentre
        if (px > fillPx.value) fillPx.value = px
      }
    },
    { threshold: 0, rootMargin: '0px 0px -35% 0px' },
  )
  for (const stepEl of stepEls.value) stepObserver.observe(stepEl)
}

onMounted(() => {
  resetSpineState()
  const noMotion = props.reveal === 'off' || isReducedMotion.value
  if (noMotion || typeof IntersectionObserver === 'undefined' || !el.value) {
    shown.value = true
    if (!noMotion) markSpineFull()
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          shown.value = true
          observer?.disconnect()
          observer = null
        }
      }
    },
    { threshold: 0.2, rootMargin: '0px 0px -10% 0px' },
  )
  observer.observe(el.value)
  setupSpineObserver()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  teardownStepObserver()
})

// Editor preview: keep visible if motion is off / reduced when settings flip,
// and re-arm the spine's per-step tracking when steps / layout / reveal change.
watch([items, () => props.reveal, () => props.layout], () => {
  if (props.reveal === 'off' || isReducedMotion.value) {
    shown.value = true
    resetSpineState()
    return
  }
  resetSpineState()
  nextTick(() => setupSpineObserver())
})
</script>

<style lang="scss" scoped>
.process-steps {
  max-width: var(--block-measure, none);
  margin-inline: var(--block-measure-align, 0);

  &__title {
    font-family: var(--rt-role-heading2-family, inherit);
    font-size: var(--rt-role-heading2-size, var(--font-size-3xl));
    font-weight: var(--rt-role-heading2-weight, var(--font-weight-bold));
    line-height: var(--rt-role-heading2-line-height, 1.1);
    letter-spacing: var(--rt-role-heading2-letter-spacing, normal);
    color: var(--rt-role-heading2-color, inherit);
    margin: 0 0 var(--spacing-2xl, 3.2rem);
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  // ── Band: intrinsic auto-fit columns, numeral stacked above content.
  //    Folds to fewer columns (down to 1 on mobile) with no @media query.
  &--band &__list {
    display: grid;
    gap: 3.2rem 2.4rem;
    grid-template-columns: repeat(auto-fit, minmax(24rem, 1fr));
  }

  // ── Stack: single column, big numeral beside the content.
  &--stack &__list {
    display: flex;
    flex-direction: column;
    gap: 2.8rem;
  }
  &--stack &__step {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: clamp(1.6rem, 3vw, 3.2rem);
    align-items: start;
  }

  &__step {
    // Stagger reveal on enter (independent of layout).
    opacity: 0;
    transform: translateY(1.4rem);
    transition: opacity 0.6s ease, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
    &.is-in {
      opacity: 1;
      transform: none;
    }
  }

  // Editorial hairline rule above each step — the "connector" that ties the band
  // together; reflows naturally in both band and stack layouts.
  &--connector &__step {
    border-block-start: 1px solid var(--color-border, rgba(0, 0, 0, 0.12));
    padding-block-start: var(--spacing-md, 1.6rem);
  }

  &__num {
    display: block;
    font-family: var(--rt-role-heading1-family, var(--font-family-heading, Georgia, serif));
    font-size: clamp(3.6rem, 8vw, 7.2rem);
    font-weight: var(--rt-role-heading1-weight, 600);
    line-height: 0.9;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    color: var(--ps-accent, var(--color-primary));
    margin-block-end: var(--spacing-sm, 1rem);
  }

  &--number-ghost &__num { opacity: 0.18; }
  &--number-solid &__num { opacity: 1; }

  &--stack &__num {
    margin-block-end: 0;
    // Optically pull the numeral up to sit with the first text line.
    margin-block-start: -0.12em;
  }

  &__body { min-width: 0; }

  &__label {
    display: block;
    font-family: var(--rt-role-body-family, inherit);
    font-size: var(--font-size-sm, 1.4rem);
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ps-accent, var(--color-primary));
    opacity: 0.85;
    margin-block-end: var(--spacing-2xs, 0.4rem);
  }

  &__step-title {
    font-family: var(--rt-role-heading3-family, inherit);
    font-size: var(--rt-role-heading3-size, var(--font-size-xl));
    font-weight: var(--rt-role-heading3-weight, var(--font-weight-semibold));
    line-height: var(--rt-role-heading3-line-height, 1.2);
    letter-spacing: var(--rt-role-heading3-letter-spacing, normal);
    color: var(--rt-role-heading3-color, inherit);
    margin: 0 0 var(--spacing-xs, 0.8rem);
  }

  &__desc {
    font-family: var(--rt-role-body-family, inherit);
    font-size: var(--rt-role-body-size, var(--font-size-base));
    line-height: var(--rt-role-body-line-height, var(--line-height-relaxed, 1.6));
    color: var(--rt-role-body-color, var(--color-text-light, inherit));
    margin: 0;
  }

  // Centre alignment applies to the band layout only — the stack keeps its
  // numeral-left reading order intact.
  &--align-center#{&}--band &__step { text-align: center; }

  // ── Spine: a connected vertical timeline. A faint track runs the full height
  //    of the node column; an accent fill grows downward to the furthest step
  //    whose node has scrolled into view. Reached nodes fill solid, the rest
  //    stay hollow. Node column is a fixed small width so the line stays aligned
  //    at any container width — no @media needed. Fully additive: band + stack
  //    are untouched.
  &--spine { --ps-spine-col: 4rem; }

  &--spine &__list {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: clamp(2.8rem, 5vw, 4.4rem);
  }

  &--spine &__step {
    position: relative;
    display: grid;
    grid-template-columns: var(--ps-spine-col) 1fr;
    column-gap: clamp(1.4rem, 3vw, 2.4rem);
    align-items: start;
  }

  // Connector track (faint, full height) + accent fill (grows downward),
  // both centred on the node column.
  &--spine &__spine-track,
  &--spine &__spine-fill {
    position: absolute;
    top: 0;
    left: calc(var(--ps-spine-col) / 2);
    width: 2px;
    transform: translateX(-50%);
    border-radius: 2px;
    pointer-events: none;
  }
  &--spine &__spine-track {
    bottom: 0;
    background: var(--color-border, rgba(0, 0, 0, 0.12));
  }
  &--spine &__spine-fill {
    height: 0;
    background: var(--ps-accent, var(--color-primary));
    transition: height 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  // Node marker — hollow faint ring by default, solid accent once reached.
  &--spine &__node {
    position: absolute;
    top: 0;
    left: calc(var(--ps-spine-col) / 2);
    z-index: 1;
    width: 1.8rem;
    height: 1.8rem;
    transform: translateX(-50%);
    border-radius: 50%;
    background: transparent;
    border: 2px solid var(--color-border, rgba(0, 0, 0, 0.25));
    transition: background-color 0.4s ease, border-color 0.4s ease,
      transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  &--spine &__step.is-reached &__node {
    background: var(--ps-accent, var(--color-primary));
    border-color: var(--ps-accent, var(--color-primary));
    transform: translateX(-50%) scale(1.05);
  }

  // In spine the numeral shrinks to a quiet caption below the node, brightening
  // once its step is reached. Overrides the ghost/solid opacity for this layout.
  &--spine &__num {
    font-size: var(--font-size-base, 1.6rem);
    font-weight: var(--font-weight-semibold, 600);
    line-height: 1;
    letter-spacing: 0;
    text-align: center;
    opacity: 0.4;
    margin: 0;
    padding-block-start: 2.6rem;
    transition: opacity 0.4s ease, color 0.4s ease;
  }
  &--spine &__step.is-reached &__num { opacity: 1; }

  &--no-motion &__step {
    transition: none;
    opacity: 1;
    transform: none;
  }
  &--no-motion &__spine-fill,
  &--no-motion &__node {
    transition: none;
  }

  &__media {
    margin: 0 0 var(--spacing-md, 1.6rem);
    aspect-ratio: var(--ps-media-ratio, 4 / 3);
    overflow: hidden;
    border-radius: var(--radius-sm, 0.4rem);
    background: var(--color-surface-2, rgba(0, 0, 0, 0.04));
  }
  &__img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

// Accessibility: never animate the reveal for reduced-motion users.
@media (prefers-reduced-motion: reduce) {
  .process-steps__step {
    transition: none;
    opacity: 1;
    transform: none;
  }
  .process-steps__spine-fill,
  .process-steps__node {
    transition: none;
  }
}
</style>
