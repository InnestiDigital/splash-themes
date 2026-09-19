<template>
  <section
    class="narrative-scene"
    :class="sectionClasses"
    :style="[rootStyles, motionStyle]"
    data-target="root"
    :data-motion-suppressed="prefersReducedMotion ? 'true' : undefined"
  >
    <div class="narrative-scene__background" data-target="background" />

    <!-- Pinned mode layout: sticky media + scrolling overlay -->
    <template v-if="isPinnedActive">
      <div class="narrative-scene__pinned-wrapper">
        <div
          class="narrative-scene__pinned-media"
          :class="{ 'narrative-scene__pinned-media--no-sticky': prefersReducedMotion }"
        >
          <template v-for="(step, index) in steps" :key="'media-' + index">
            <div
              v-if="step.media"
              class="narrative-scene__pinned-media-layer"
              :class="{ 'narrative-scene__pinned-media-layer--active': activeStepIndex === index }"
              :style="prefersReducedMotion ? {} : { opacity: activeStepIndex === index ? 1 : 0 }"
            >
              <img :src="step.media" :alt="plainText(step.heading)" />
            </div>
          </template>
        </div>
        <div class="narrative-scene__steps-overlay">
          <div
            v-for="(step, index) in steps"
            :key="index"
            ref="stepRefs"
            class="narrative-scene__step narrative-scene__step--pinned"
            :class="stepClasses(step, index)"
            :style="prefersReducedMotion ? {} : pinnedStepStyle(index)"
            :data-step-index="index"
            data-target="step"
          >
            <div v-if="isIndicatorVisible" class="narrative-scene__indicator">
              <span class="narrative-scene__indicator-dot">{{ index + 1 }}</span>
              <span v-if="index < steps.length - 1" class="narrative-scene__indicator-line" />
            </div>
            <div class="narrative-scene__step-content">
              <div class="narrative-scene__text">
                <h2 v-if="getLocalized(step.heading)" class="narrative-scene__heading" v-html="asHtml(getLocalized(step.heading))"></h2>
                <div v-if="getLocalized(step.body)" class="narrative-scene__body prose" v-html="asHtml(getLocalized(step.body))"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Standard layout (non-pinned) -->
    <div v-else class="narrative-scene__container" :style="contentStyle">
      <template v-if="steps && steps.length > 0">
        <div
          v-for="(step, index) in steps"
          :key="index"
          ref="stepRefs"
          class="narrative-scene__step"
          :class="stepClasses(step, index)"
          :style="scrollMode ? stepStyle(index) : undefined"
          :data-step-index="index"
          data-target="step"
        >
          <div v-if="isIndicatorVisible" class="narrative-scene__indicator">
            <span class="narrative-scene__indicator-dot">{{ index + 1 }}</span>
            <span v-if="index < steps.length - 1" class="narrative-scene__indicator-line" />
          </div>
          <div class="narrative-scene__step-content">
            <div class="narrative-scene__text">
              <h2 v-if="getLocalized(step.heading)" class="narrative-scene__heading" v-html="asHtml(getLocalized(step.heading))"></h2>
              <div v-if="getLocalized(step.body)" class="narrative-scene__body prose" v-html="asHtml(getLocalized(step.body))"></div>
            </div>
            <div v-if="step.media" class="narrative-scene__media">
              <img :src="step.media" :alt="plainText(step.heading)" />
            </div>
          </div>
        </div>
      </template>
      <div v-else class="narrative-scene__empty">
        No steps configured
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BackgroundRole } from '~/shared/types/placement'
import { computed, ref, inject, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBlockSurface } from '~/shared/composables/useBlockSurface'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'
import { useThemeConfig } from '~/shared/composables/useThemeConfig'
import { BLOCK_ENGINE_CONTEXT_KEY } from '~/shared/features/cms/animation/constants'
import { SPACING_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { asHtml } from '~/shared/utils/asHtml'

interface NarrativeStep {
  heading?: string | Record<string, string>
  body?: string | Record<string, string>
  media?: string
  mediaPosition?: 'left' | 'right'
}

const props = withDefaults(defineProps<{
  steps?: NarrativeStep[]
  background?: BackgroundRole
  stepSpacing?: 'compact' | 'normal' | 'spacious'
  showStepIndicator?: boolean
  scrollMode?: boolean
  scrollSpeed?: 'slow' | 'normal' | 'fast'
  pinnedMode?: boolean
  reducedMotion?: boolean | null
  revealOnce?: boolean
  internalPadding?: string
  textAlign?: string
}>(), {
  steps: () => [],
  stepSpacing: 'normal',
  showStepIndicator: true,
  scrollMode: false,
  scrollSpeed: 'normal',
  pinnedMode: false,
  reducedMotion: null,
  revealOnce: true,
  internalPadding: 'none',
  textAlign: 'left',
})

const { locale } = useI18n()

function getLocalized(value: string | Record<string, string> | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[locale.value] || value['en-US'] || Object.values(value)[0] || ''
}

/** Strip HTML tags for plain-text contexts (alt attrs, ARIA labels). */
function plainText(value: string | Record<string, string> | undefined): string {
  return getLocalized(value).replace(/<[^>]*>/g, '')
}

const steps = computed(() => props.steps)
const isIndicatorVisible = computed(() => props.showStepIndicator)

// Pinned mode: requires scrollMode to be active
const isPinnedActive = computed(() => props.pinnedMode && props.scrollMode)

// Reduced motion detection: prop override takes precedence, otherwise reactive OS setting
const { isReducedMotion } = useReducedMotion()
const prefersReducedMotion = computed(() =>
  props.reducedMotion !== null ? props.reducedMotion : isReducedMotion.value
)

// Motion config from theme: drives CSS custom properties for scroll reveal transitions
const { theme } = useThemeConfig()
const motionStyle = computed(() => {
  const m = theme.value?.motion
  if (!m) return {}
  const dur = m.defaultDuration ?? 600
  const scale = m.motionScale ?? 1
  return {
    '--narrative-transition-duration': `${Math.round(dur * scale)}ms`,
    '--narrative-transition-easing': m.defaultEasing ?? 'ease-out',
  }
})

// Engine ownership: when the animation engine has an active scene targeting 'steps',
// defer all hardcoded scroll reveals to the engine instead.
const engineContext = inject(BLOCK_ENGINE_CONTEXT_KEY, null)
const engineOwnsSteps = computed(() =>
  engineContext?.hasActiveScenesFor('steps') ?? false
)

// Active step index for pinned media crossfade
const activeStepIndex = computed(() => {
  if (!isPinnedActive.value) return 0
  // Use the highest visible step index for media crossfade
  const visible = Array.from(visibleSteps.value)
  return visible.length > 0 ? Math.max(...visible) : 0
})

// Scroll mode: track which steps are visible via IntersectionObserver
const stepRefs = ref<HTMLElement[]>([])
const visibleSteps = ref<Set<number>>(new Set(props.scrollMode ? [0] : []))
let observer: IntersectionObserver | null = null

function setupObserver() {
  cleanupObserver()
  if (!props.scrollMode || typeof IntersectionObserver === 'undefined') return

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const index = Number((entry.target as HTMLElement).dataset.stepIndex)
        if (Number.isNaN(index)) continue
        if (entry.isIntersecting) {
          visibleSteps.value.add(index)
        } else if (isPinnedActive.value || !props.revealOnce) {
          visibleSteps.value.delete(index)
        }
      }
      // Trigger reactivity
      visibleSteps.value = new Set(visibleSteps.value)
    },
    { threshold: 0.3 },
  )

  for (const el of stepRefs.value) {
    if (el) observer.observe(el)
  }
}

function cleanupObserver() {
  if (observer) {
    observer.disconnect()
    observer = null
  }
}

onMounted(async () => {
  if (props.scrollMode) {
    // First step always visible initially
    visibleSteps.value.add(0)
    // Defer one RAF so the engine's adapter setup (also RAF-scheduled) can complete first
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    if (!engineOwnsSteps.value) {
      setupObserver()
    }
  }
})

onUnmounted(() => {
  cleanupObserver()
})

watch(() => props.scrollMode, async (val) => {
  if (val) {
    visibleSteps.value = new Set([0])
    // Defer one RAF so the engine's adapter setup (also RAF-scheduled) can complete first
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    if (!engineOwnsSteps.value) {
      setupObserver()
    }
  } else {
    cleanupObserver()
    visibleSteps.value.clear()
  }
})

const scrollSpeedMultiplier = computed(() => {
  switch (props.scrollSpeed) {
    case 'slow': return 1.5
    case 'fast': return 0.6
    default: return 1
  }
})

const sectionClasses = computed(() => {
  const classes: string[] = []
  const spacing = props.stepSpacing || 'normal'
  classes.push(`narrative-scene--spacing-${spacing}`)
  if (props.scrollMode) {
    classes.push('narrative-scene--scroll')
    classes.push(`narrative-scene--scroll-${props.scrollSpeed || 'normal'}`)
  }
  if (isPinnedActive.value) {
    classes.push('narrative-scene--pinned')
  }
  return classes
})

const { surfaceStyle } = useBlockSurface(props, { fallbackBackground: 'section' })

const rootStyles = computed(() => {
  const styles: Record<string, string> = { ...surfaceStyle.value }
  if (props.scrollMode && steps.value.length > 0) {
    // Each step gets scrollSpeed-adjusted viewport height
    const stepHeight = 100 * scrollSpeedMultiplier.value
    styles.minHeight = `${steps.value.length * stepHeight}vh`
  }
  return styles
})

function isStepVisible(index: number): boolean {
  if (!props.scrollMode) return true
  return visibleSteps.value.has(index)
}

function stepStyle(index: number): Record<string, string> {
  if (!props.scrollMode || engineOwnsSteps.value) return {}
  const visible = isStepVisible(index)
  return {
    opacity: visible ? '1' : '0',
    transform: visible ? 'translateY(0)' : 'translateY(30px)',
  }
}

function pinnedStepStyle(index: number): Record<string, string> {
  if (engineOwnsSteps.value) return {}
  const visible = isStepVisible(index)
  return {
    opacity: visible ? '1' : '0',
    transform: visible ? 'translateY(0)' : 'translateY(30px)',
  }
}

function stepClasses(step: NarrativeStep, index: number) {
  const classes: string[] = []
  const position = step.mediaPosition || 'right'
  classes.push(`narrative-scene__step--media-${position}`)
  if (props.scrollMode) {
    classes.push('narrative-scene__step--scroll')
    if (isStepVisible(index)) {
      classes.push('narrative-scene__step--visible')
    }
    if (!engineOwnsSteps.value) {
      classes.push('narrative-scene__step--self-animated')
    }
  }
  return classes
}

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  if (props.textAlign) {
    style.textAlign = props.textAlign
  }
  return style
})

</script>

<style lang="scss" scoped>
.narrative-scene {
  position: relative;
  padding: var(--spacing-3xl) var(--spacing-xl);

  &__background {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }

  &__container {
    position: relative;
    z-index: 1;
    max-width: 1200px;
    margin: 0 auto;
  }

  &__step {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-lg);

    &-content {
      display: flex;
      align-items: center;
      gap: var(--spacing-xl);
      flex: 1;
    }

    &--media-left &-content {
      flex-direction: row-reverse;
    }

    &--media-right &-content {
      flex-direction: row;
    }

    @media (max-width: $bp-md) {
      &-content {
        flex-direction: column !important;
      }
    }
  }

  &__text {
    flex: 1;
    min-width: 0;
  }

  &__heading {
    font-family: var(--rt-slot-heading-family, var(--rt-role-heading2-family, var(--font-family-heading)));
    font-size: var(--rt-slot-heading-size, var(--rt-role-heading2-size, var(--font-size-2xl)));
    font-weight: var(--rt-slot-heading-weight, var(--rt-role-heading2-weight, var(--font-weight-medium)));
    line-height: var(--rt-slot-heading-line-height, var(--rt-role-heading2-line-height, 1.2));
    letter-spacing: var(--rt-slot-heading-letter-spacing, var(--rt-role-heading2-letter-spacing, normal));
    text-transform: var(--rt-slot-heading-text-transform, var(--rt-role-heading2-text-transform, none));
    color: var(--rt-slot-heading-color, var(--rt-role-heading2-color, inherit));
    margin: 0 0 var(--spacing-md);
  }

  &__body {
    font-family: var(--rt-slot-body-family, var(--rt-role-body-family, inherit));
    font-size: var(--rt-slot-body-size, var(--rt-role-body-size, var(--font-size-base)));
    font-weight: var(--rt-slot-body-weight, var(--rt-role-body-weight, inherit));
    line-height: var(--rt-slot-body-line-height, var(--rt-role-body-line-height, var(--line-height-base)));
    letter-spacing: var(--rt-slot-body-letter-spacing, var(--rt-role-body-letter-spacing, normal));
    text-transform: var(--rt-slot-body-text-transform, var(--rt-role-body-text-transform, none));
    color: var(--rt-slot-body-color, var(--rt-role-body-color, inherit));

    // Color comes from the .prose contract; underline is the deliberate delta
    // (CSS-10).
    :deep(a) {
      text-decoration: underline;
    }
  }

  &__media {
    flex: 1;
    min-width: 0;

    img {
      width: 100%;
      height: auto;
      display: block;
      border-radius: var(--border-radius);
    }
  }

  &__indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    width: 32px;
  }

  &__indicator-dot {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--color-primary);
    color: #fff;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    flex-shrink: 0;
  }

  &__indicator-line {
    width: 2px;
    flex: 1;
    min-height: 24px;
    background: var(--color-primary);
    opacity: 0.3;
  }

  &__empty {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--color-text-light);
    font-style: italic;
  }

  // Spacing variants
  &--spacing-compact &__step {
    margin-bottom: var(--spacing-lg);
  }

  &--spacing-normal &__step {
    margin-bottom: var(--spacing-3xl);
  }

  &--spacing-spacious &__step {
    margin-bottom: calc(var(--spacing-3xl) * 2);
  }

  // Remove margin from last step
  &__step:last-child {
    margin-bottom: 0;
  }

  // Pinned mode
  &__pinned-wrapper {
    position: relative;
    z-index: 1;
    max-width: 1200px;
    margin: 0 auto;
  }

  &__pinned-media {
    position: sticky;
    top: 0;
    height: 100vh;
    width: 100%;
    overflow: hidden;
    z-index: 0;

    &--no-sticky {
      position: relative;
      height: auto;
    }
  }

  &__pinned-media-layer {
    position: absolute;
    inset: 0;
    transition: opacity var(--narrative-transition-duration, 0.6s) var(--narrative-transition-easing, ease-out);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    &--active {
      z-index: 1;
    }
  }

  &__pinned-media--no-sticky &__pinned-media-layer {
    position: relative;
    opacity: 1 !important;
  }

  &__steps-overlay {
    position: relative;
    z-index: 1;
  }

  &__step--pinned {
    min-height: 100vh;
    display: flex;
    align-items: center;
  }

  // Scroll mode
  &--scroll &__container {
    display: flex;
    flex-direction: column;
  }

  &__step--scroll {
    min-height: 60vh;
    display: flex;
    align-items: center;
  }

  &__step--self-animated {
    transition:
      opacity var(--narrative-transition-duration, 0.6s) var(--narrative-transition-easing, ease-out),
      transform var(--narrative-transition-duration, 0.6s) var(--narrative-transition-easing, ease-out);
  }

  // Scroll speed variants — control step min-height
  &--scroll-slow &__step--scroll {
    min-height: 80vh;
  }

  &--scroll-normal &__step--scroll {
    min-height: 60vh;
  }

  &--scroll-fast &__step--scroll {
    min-height: 40vh;
  }
}

// Motion-suppression state contract (CLAUDE.md): when an ancestor carries
// data-motion-suppressed="true" — a reduced-motion HorizontalScroll item wrapper,
// this scene's own root (self-suppression), or any future container — collapse the
// sticky/pinned layout to normal flow. Scoped compilation appends the data-v attr
// to the LAST compound (pinned-media / sticky-wrapper are this component's own
// elements), yielding specificity 0,3,0 vs the base rules' 0,2,0 — no !important.
[data-motion-suppressed='true'] .narrative-scene__pinned-media,
[data-motion-suppressed='true'] .narrative-scene__sticky-wrapper {
  position: relative;
  height: auto;
}
</style>
