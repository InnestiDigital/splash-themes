<template>
  <section class="splash-timeline" :style="sectionStyles">
    <div class="splash-timeline__container" :style="contentStyle">
      <h2 v-if="title" data-target="heading" class="splash-timeline__title" v-html="asHtml(localizedTitle)"></h2>

      <!-- Vertical -->
      <ol
        v-if="variant === 'vertical'"
        ref="railEl"
        class="splash-timeline__vertical"
        :class="{
          'splash-timeline__vertical--reveal': revealActive,
          'splash-timeline__vertical--alternating': verticalLayout === 'alternating',
          'splash-timeline__vertical--reduced': disclosureActive && isReducedMotion,
        }"
        :style="accentColor ? { '--timeline-accent': accentColor } : undefined"
      >
        <!-- Scroll-linked progress rail: a dim track spanning first→last marker with
             an accent fill whose scaleY tracks scroll position. Vertical + motion only. -->
        <span
          v-if="revealActive"
          class="splash-timeline__rail"
          :style="railStyle"
          aria-hidden="true"
        >
          <span class="splash-timeline__rail-fill" :style="fillStyle" />
        </span>
        <li
          v-for="(step, index) in stepItems"
          :key="index"
          data-target="item"
          :data-item-index="index"
          class="splash-timeline__step"
        >
          <div
            class="splash-timeline__marker"
            :class="{ 'splash-timeline__marker--pending': revealActive && !activeSteps[index] }"
            :style="accentColor ? { '--timeline-accent': accentColor } : undefined"
            aria-hidden="true"
          >
            <span v-if="step.icon" class="material-icons-outlined">{{ step.icon }}</span>
            <span v-else>{{ index + 1 }}</span>
          </div>
          <div
            class="splash-timeline__line"
            :style="accentColor ? { '--timeline-accent': accentColor } : undefined"
            aria-hidden="true"
          />
          <div class="splash-timeline__content" :style="cardStyle">
            <!-- Default / disclosure-off: current markup, byte-identical. -->
            <template v-if="!disclosureActive">
              <figure v-if="step.image" class="splash-timeline__figure">
                <img :src="step.image" :alt="step.imageAlt ? getLocalizedValue(step.imageAlt) : ''" loading="lazy" decoding="async">
              </figure>
              <p v-if="step.date" class="splash-timeline__step-date">{{ getLocalizedValue(step.date) }}</p>
              <h3 class="splash-timeline__step-title" v-html="asHtml(getLocalizedValue(step.title))"></h3>
              <p v-if="step.description" class="splash-timeline__step-desc prose" v-html="asHtml(getLocalizedValue(step.description))"></p>
            </template>
            <!-- Progressive disclosure (opt-in, public render only): date + title stay
                 visible; image + description collapse behind a per-step control. Steps
                 with nothing to disclose render exactly as the default branch. -->
            <template v-else>
              <p v-if="step.date" class="splash-timeline__step-date">{{ getLocalizedValue(step.date) }}</p>
              <div v-if="isDisclosable(step)" class="splash-timeline__step-head">
                <h3 class="splash-timeline__step-title" v-html="asHtml(getLocalizedValue(step.title))"></h3>
                <button
                  type="button"
                  class="splash-timeline__disclose"
                  :aria-expanded="isExpanded(index) ? 'true' : 'false'"
                  :aria-controls="regionId(index)"
                  aria-label="Toggle step details"
                  @click="toggle(index)"
                >
                  <span class="splash-timeline__chevron" aria-hidden="true" />
                </button>
              </div>
              <h3 v-else class="splash-timeline__step-title" v-html="asHtml(getLocalizedValue(step.title))"></h3>
              <div
                v-if="isDisclosable(step)"
                :id="regionId(index)"
                class="splash-timeline__collapse"
                :class="{ 'is-open': isExpanded(index) }"
              >
                <div class="splash-timeline__collapse-inner">
                  <figure v-if="step.image" class="splash-timeline__figure">
                    <img :src="step.image" :alt="step.imageAlt ? getLocalizedValue(step.imageAlt) : ''" loading="lazy" decoding="async">
                  </figure>
                  <p v-if="step.description" class="splash-timeline__step-desc prose" v-html="asHtml(getLocalizedValue(step.description))"></p>
                </div>
              </div>
            </template>
          </div>
        </li>
      </ol>

      <!-- Horizontal -->
      <ol
        v-else
        ref="hTrackEl"
        class="splash-timeline__horizontal"
        :class="{ 'splash-timeline__horizontal--scroll': filmstripActive }"
      >
        <li
          v-for="(step, index) in stepItems"
          :key="index"
          data-target="item"
          :data-item-index="index"
          class="splash-timeline__h-step"
          :style="cardStyle"
        >
          <div
            class="splash-timeline__h-marker"
            :style="accentColor ? { '--timeline-accent': accentColor } : undefined"
            aria-hidden="true"
          >
            <span v-if="step.icon" class="material-icons-outlined">{{ step.icon }}</span>
            <span v-else>{{ index + 1 }}</span>
          </div>
          <div
            v-if="index < stepItems.length - 1"
            class="splash-timeline__h-connector"
            :style="accentColor ? { '--timeline-accent': accentColor } : undefined"
            aria-hidden="true"
          />
          <figure v-if="step.image" class="splash-timeline__figure">
            <img :src="step.image" :alt="step.imageAlt ? getLocalizedValue(step.imageAlt) : ''" loading="lazy" decoding="async">
          </figure>
          <p v-if="step.date" class="splash-timeline__h-date">{{ getLocalizedValue(step.date) }}</p>
          <h3 class="splash-timeline__h-title" v-html="asHtml(getLocalizedValue(step.title))"></h3>
          <p v-if="step.description" class="splash-timeline__h-desc prose" v-html="asHtml(getLocalizedValue(step.description))"></p>
        </li>
      </ol>

      <!-- Filmstrip scroll controls. The group carries role="group" + an aria-label
           (not aria-hidden) so the buttons expose a coherent name to AT; they remain
           a redundant convenience since native swipe/scroll + DOM order already give
           keyboard/AT users the full step sequence. Desktop only (hidden on mobile). -->
      <div
        v-if="filmstripActive && stepItems.length > 1"
        class="splash-timeline__h-nav"
        role="group"
        aria-label="Timeline scroll controls"
      >
        <button
          type="button"
          class="splash-timeline__h-arrow splash-timeline__h-arrow--prev"
          :disabled="hAtStart"
          aria-label="Scroll to earlier steps"
          @click="scrollFilmstrip(-1)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          type="button"
          class="splash-timeline__h-arrow splash-timeline__h-arrow--next"
          :disabled="hAtEnd"
          aria-label="Scroll to later steps"
          @click="scrollFilmstrip(1)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import type { BackgroundRole } from '~/shared/types/placement'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { asHtml } from '~/shared/utils/asHtml'
import { useBlockSurface } from '~/shared/composables/useBlockSurface'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'

const { getLocalizedValue } = useLocalized()
const { isReducedMotion } = useReducedMotion()
const renderMode = useRenderMode()
const isEditor = computed(() => renderMode.value === 'editor-preview')
interface StepItem {
  title: string | Record<string, string>
  description?: string | Record<string, string>
  icon?: string
  date?: string | Record<string, string>
  image?: string
  imageAlt?: string | Record<string, string>
}

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  blocks?: Array<Record<string, unknown>>
  title?: string | Record<string, string>
  steps?: StepItem[]
  variant?: 'vertical' | 'horizontal'
  accentColor?: string
  progressReveal?: 'on' | 'off'
  stepDisclosure?: 'on' | 'off'
  horizontalScroll?: 'on' | 'off'
  verticalLayout?: 'standard' | 'alternating'
  background?: BackgroundRole
  internalPadding?: string
  textAlign?: string
  surfaceStyle?: 'none' | 'subtle' | 'filled'
  borderRadius?: string
}>(), {
  variant: 'vertical',
  progressReveal: 'on',
  stepDisclosure: 'off',
  horizontalScroll: 'off',
  steps: () => [],
})

const localizedTitle = computed(() => getLocalizedValue(props.title))
const stepItems = computed(() => props.steps || [])

// ── Scroll-linked progress rail (vertical variant, motion only) ──────────────
// The accent line fills top→bottom as the reader scrolls through the timeline,
// and each marker "activates" once its centre passes an anchor line near the
// lower-middle of the viewport. Under reduced-motion / no-JS the rail is never
// rendered and every marker keeps its filled resting state (== prior look).
const railEl = ref<HTMLElement | null>(null)
const activeSteps = ref<boolean[]>([])
const railTop = ref(0)
const railHeight = ref(0)
const fillRatio = ref(0)

const revealActive = computed(
  () => props.variant === 'vertical' && props.progressReveal !== 'off' && !isReducedMotion.value,
)

// ── Progressive disclosure (vertical, opt-in) ────────────────────────────────
// Collapses each step's image + description behind a per-step expand control so a
// long chronology reads as a scannable list of dated headlines. Vertical + public
// render only; the editor always shows full content so authors can edit every step.
const disclosureActive = computed(
  () => props.variant === 'vertical' && props.stepDisclosure === 'on' && !isEditor.value,
)
const expandedSteps = ref<Set<number>>(new Set())

function isDisclosable(step: StepItem): boolean {
  return !!(step.description || step.image)
}
function isExpanded(index: number): boolean {
  return expandedSteps.value.has(index)
}
function regionId(index: number): string {
  return props.blockId ? `${props.blockId}-step-${index}` : `timeline-step-${index}`
}
function toggle(index: number) {
  const next = new Set(expandedSteps.value)
  if (next.has(index)) next.delete(index)
  else next.add(index)
  expandedSteps.value = next
  // Expanding/collapsing shifts marker positions — re-measure the scroll rail.
  if (revealActive.value) nextTick(measure)
}

const railStyle = computed(() => ({ top: `${railTop.value}px`, height: `${railHeight.value}px` }))
const fillStyle = computed(() => ({ transform: `scaleY(${fillRatio.value})` }))

let raf = 0
function measure() {
  const rail = railEl.value
  if (!rail) return
  const markers = rail.querySelectorAll<HTMLElement>('.splash-timeline__marker')
  if (!markers.length) return
  const olRect = rail.getBoundingClientRect()
  const anchor = window.innerHeight * 0.62
  const centers: number[] = []
  markers.forEach((m) => {
    const r = m.getBoundingClientRect()
    centers.push(r.top + r.height / 2)
  })
  activeSteps.value = centers.map((c) => c <= anchor)
  const first = centers[0]
  const last = centers[centers.length - 1]
  railTop.value = first - olRect.top
  railHeight.value = Math.max(0, last - first)
  const span = last - first
  fillRatio.value = span <= 0 ? 1 : Math.max(0, Math.min(1, (anchor - first) / span))
}
function onScroll() {
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    measure()
  })
}

function attach() {
  if (typeof window === 'undefined') return
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  nextTick(measure)
}
function detach() {
  if (typeof window === 'undefined') return
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}

onMounted(() => {
  if (revealActive.value) attach()
})
onBeforeUnmount(detach)

// React to editor edits (variant/steps/setting flips) and reduced-motion changes.
watch(revealActive, (on) => {
  detach()
  if (on) attach()
  else activeSteps.value = []
})
watch([stepItems, () => props.variant], () => {
  if (revealActive.value) nextTick(measure)
})

// ── Horizontal filmstrip (opt-in, horizontal variant) ────────────────────────
// Lays the steps out as one continuous scroll-snapping row instead of a wrapping
// grid. Active in both public + editor render (it's just a scroll container).
// When off the modifier class, the nav bar and the scroll listener are all absent,
// so the horizontal render stays byte-identical to before.
const filmstripActive = computed(
  () => props.variant === 'horizontal' && props.horizontalScroll === 'on',
)

const hTrackEl = ref<HTMLElement | null>(null)
const hAtStart = ref(true)
const hAtEnd = ref(false)

function updateHEdges() {
  const track = hTrackEl.value
  if (!track) return
  hAtStart.value = track.scrollLeft <= 1
  hAtEnd.value = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1
}

function scrollFilmstrip(dir: 1 | -1) {
  const track = hTrackEl.value
  if (!track) return
  const firstCard = track.firstElementChild
  let step = track.clientWidth * 0.8
  if (firstCard instanceof HTMLElement) {
    const styles = window.getComputedStyle(track)
    const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0
    step = firstCard.offsetWidth + gap
  }
  track.scrollBy({ left: dir * step, behavior: isReducedMotion.value ? 'auto' : 'smooth' })
}

let rafH = 0
function onScrollH() {
  if (rafH) return
  rafH = requestAnimationFrame(() => {
    rafH = 0
    updateHEdges()
  })
}

function attachH() {
  if (typeof window === 'undefined') return
  const track = hTrackEl.value
  if (!track) return
  track.addEventListener('scroll', onScrollH, { passive: true })
  window.addEventListener('resize', onScrollH, { passive: true })
  nextTick(updateHEdges)
}
function detachH() {
  if (typeof window === 'undefined') return
  hTrackEl.value?.removeEventListener('scroll', onScrollH)
  window.removeEventListener('resize', onScrollH)
  if (rafH) cancelAnimationFrame(rafH)
  rafH = 0
}

onMounted(() => {
  if (filmstripActive.value) attachH()
})
onBeforeUnmount(detachH)

watch(filmstripActive, (on) => {
  detachH()
  if (on) {
    hAtStart.value = true
    hAtEnd.value = false
    nextTick(attachH)
  }
})
watch(stepItems, () => {
  if (filmstripActive.value) nextTick(updateHEdges)
})

const { surfaceStyle } = useBlockSurface(props, { fallbackBackground: 'transparent' })

const sectionStyles = computed(() => {
  const styles: Record<string, string> = {}
  Object.assign(styles, surfaceStyle.value)
  return styles
})

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  if (props.textAlign && props.textAlign !== 'left') {
    style.textAlign = props.textAlign
  }
  return style
})

const cardStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.surfaceStyle === 'subtle') {
    style.background = 'var(--section-surface)'
  } else if (props.surfaceStyle === 'filled') {
    style.background = 'var(--section-accent)'
  }
  if (props.borderRadius && props.borderRadius !== 'none') {
    style.borderRadius = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0'
  }
  if ((props.surfaceStyle && props.surfaceStyle !== 'none') || (props.borderRadius && props.borderRadius !== 'none')) {
    style.padding = style.padding || 'var(--spacing-md, 1rem)'
  }
  return style
})

</script>

<style lang="scss" scoped>
.splash-timeline {
  padding: var(--spacing-2xl) var(--spacing-md);

  @media (max-width: $bp-md) {
    padding: var(--spacing-xl) var(--spacing-md);
  }

  &__container {
    max-width: 120rem;
    margin: 0 auto;
  }

  &__title {
    font-family: var(--rt-slot-heading-family, var(--rt-role-heading2-family, inherit));
    font-size: var(--rt-slot-heading-size, var(--rt-role-heading2-size, var(--font-size-3xl)));
    font-weight: var(--rt-slot-heading-weight, var(--rt-role-heading2-weight, var(--font-weight-bold)));
    line-height: var(--rt-slot-heading-line-height, var(--rt-role-heading2-line-height, inherit));
    letter-spacing: var(--rt-slot-heading-letter-spacing, var(--rt-role-heading2-letter-spacing, normal));
    text-transform: var(--rt-slot-heading-text-transform, var(--rt-role-heading2-text-transform, none));
    color: var(--rt-slot-heading-color, var(--rt-role-heading2-color, inherit));
    margin: 0 0 var(--spacing-2xl);

    @media (max-width: $bp-md) {
      font-size: var(--rt-slot-heading-size, var(--rt-role-heading2-size, var(--font-size-2xl)));
    }
  }

  // Vertical layout
  &__vertical {
    position: relative;
    max-width: 70rem;
    margin: 0 auto;
    list-style: none;
    padding: 0;

    // In reveal mode the continuous rail replaces the per-step dim segments.
    &--reveal .splash-timeline__line { display: none; }
  }

  // Alternating (zig-zag) arrangement — steps sit on either side of a centered
  // rail on wide screens. Below $bp-lg it falls back to the standard single-column
  // left rail, so tablet + mobile are unchanged. Default 'standard' never adds this
  // class, so the render stays byte-identical.
  &__vertical--alternating {
    @media (min-width: $bp-lg) {
      max-width: 96rem;

      // Centre the scroll-progress rail (JS sets its top/height; horizontal is CSS).
      .splash-timeline__rail {
        inset-inline-start: 50%;
        transform: translateX(-50%);
      }

      .splash-timeline__step {
        display: grid;
        grid-template-columns: 1fr 4.8rem 1fr;
        column-gap: var(--spacing-xl);
        align-items: start;
      }

      .splash-timeline__marker {
        grid-column: 2;
        grid-row: 1;
        margin-inline: auto;
      }

      .splash-timeline__content {
        grid-column: 3;
        grid-row: 1;
        padding-block-start: 0;
      }

      // Per-step dim connector (only shown when the rail is off / reduced-motion): centre it.
      .splash-timeline__line {
        inset-inline-start: 50%;
        transform: translateX(-50%);
      }

      // Even steps mirror to the left side, text hugging the rail.
      .splash-timeline__step:nth-child(even) {
        .splash-timeline__content {
          grid-column: 1;
          text-align: end;
        }
      }
    }
  }

  // Scroll-linked progress rail: dim full-height track (::before) + accent fill.
  &__rail {
    position: absolute;
    inset-inline-start: 2.25rem;
    width: 0.3rem;
    z-index: 0;
    border-radius: var(--border-radius-full);
    pointer-events: none;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background-color: var(--motion-accent, var(--timeline-accent, var(--color-primary)));
      opacity: 0.18;
      border-radius: inherit;
    }
  }

  &__rail-fill {
    position: absolute;
    inset: 0;
    background-color: var(--motion-accent, var(--timeline-accent, var(--color-primary)));
    transform-origin: top center;
    transform: scaleY(0);
    transition: transform 0.12s linear;
    will-change: transform;
    border-radius: inherit;
  }

  &__step {
    display: flex;
    gap: var(--spacing-lg);
    position: relative;
    padding-block-end: var(--spacing-xl);

    &:last-child {
      padding-block-end: 0;

      .splash-timeline__line {
        display: none;
      }
    }
  }

  &__marker {
    width: 4.8rem;
    height: 4.8rem;
    border-radius: var(--border-radius-full);
    background-color: var(--motion-accent, var(--timeline-accent, var(--color-primary)));
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-background);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-base);
    flex-shrink: 0;
    z-index: 1;
    // Smooth activation as scroll progress reaches each marker.
    transition: background-color 0.35s ease, color 0.35s ease, box-shadow 0.35s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);

    .material-icons-outlined {
      font-size: var(--font-size-lg);
    }

    // Not-yet-reached: hollow outline in the accent colour, dimmed + slightly smaller.
    &--pending {
      background-color: transparent;
      color: var(--motion-accent, var(--timeline-accent, var(--color-primary)));
      box-shadow: inset 0 0 0 0.2rem var(--motion-accent, var(--timeline-accent, var(--color-primary)));
      opacity: 0.55;
      transform: scale(0.9);
    }
  }

  &__line {
    position: absolute;
    inset-inline-start: 2.3rem;
    top: 4.8rem;
    bottom: 0;
    width: 0.3rem;
    background-color: var(--motion-accent, var(--timeline-accent, var(--color-primary)));
    opacity: 0.2;
  }

  &__content {
    padding-block-start: var(--spacing-xs);
    flex: 1;
  }

  &__figure {
    margin: 0 0 var(--spacing-sm);
    border-radius: var(--border-radius-md, 0.5rem);
    overflow: hidden;
    background: var(--section-surface, rgba(0, 0, 0, 0.04));

    img {
      display: block;
      width: 100%;
      height: auto;
      aspect-ratio: 16 / 10;
      object-fit: cover;
    }
  }

  &__step-date {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--motion-accent, var(--timeline-accent, var(--color-primary)));
    margin: 0 0 var(--spacing-2xs, 0.25rem);
  }

  &__step-title {
    font-family: var(--rt-slot-steptitle-family, var(--rt-role-heading3-family, inherit));
    font-size: var(--rt-slot-steptitle-size, var(--rt-role-heading3-size, var(--font-size-lg)));
    font-weight: var(--rt-slot-steptitle-weight, var(--rt-role-heading3-weight, var(--font-weight-semibold)));
    line-height: var(--rt-slot-steptitle-line-height, var(--rt-role-heading3-line-height, inherit));
    letter-spacing: var(--rt-slot-steptitle-letter-spacing, var(--rt-role-heading3-letter-spacing, normal));
    text-transform: var(--rt-slot-steptitle-text-transform, var(--rt-role-heading3-text-transform, none));
    color: var(--rt-slot-steptitle-color, var(--rt-role-heading3-color, inherit));
    margin: 0 0 var(--spacing-xs);
  }

  &__step-desc {
    font-family: var(--rt-slot-stepdescription-family, var(--rt-role-body-family, inherit));
    font-size: var(--rt-slot-stepdescription-size, var(--rt-role-body-size, var(--font-size-base)));
    font-weight: var(--rt-slot-stepdescription-weight, var(--rt-role-body-weight, inherit));
    line-height: var(--rt-slot-stepdescription-line-height, var(--rt-role-body-line-height, var(--line-height-relaxed)));
    letter-spacing: var(--rt-slot-stepdescription-letter-spacing, var(--rt-role-body-letter-spacing, normal));
    text-transform: var(--rt-slot-stepdescription-text-transform, var(--rt-role-body-text-transform, none));
    color: var(--rt-slot-stepdescription-color, var(--rt-role-body-color, var(--color-text-light)));
    margin: 0;
  }

  // ── Progressive disclosure (opt-in, vertical) ────────────────────────────────
  // These elements exist only when stepDisclosure is on (public render). An off /
  // editor instance never renders them, so the resting DOM + CSS are unchanged.
  &__step-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--spacing-sm);
  }

  &__disclose {
    appearance: none;
    border: 0;
    background: transparent;
    margin: 0;
    padding: 0.6rem;
    cursor: pointer;
    flex-shrink: 0;
    line-height: 0;
    color: var(--motion-accent, var(--timeline-accent, var(--color-primary)));
    border-radius: var(--border-radius-full);

    &:focus-visible {
      outline: 0.2rem solid var(--motion-accent, var(--timeline-accent, var(--color-primary)));
      outline-offset: 0.2rem;
    }
  }

  &__chevron {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border-right: 0.2rem solid currentColor;
    border-bottom: 0.2rem solid currentColor;
    transform: rotate(45deg);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  &__disclose[aria-expanded='true'] &__chevron {
    transform: rotate(-135deg);
  }

  // Grid 0fr→1fr height reveal — accessible, no JS measuring.
  &__collapse {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.32s cubic-bezier(0.16, 1, 0.3, 1);

    &.is-open {
      grid-template-rows: 1fr;
    }
  }

  &__collapse-inner {
    overflow: hidden;
    min-height: 0;
    padding-block-start: var(--spacing-sm);
  }

  // Reduced-motion: content still toggles, but instantly (no height/chevron easing).
  &__vertical--reduced {
    .splash-timeline__chevron,
    .splash-timeline__collapse {
      transition: none;
    }
  }

  // Horizontal layout
  &__horizontal {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
    gap: var(--spacing-lg);
    position: relative;
    list-style: none;
    padding: 0;
    margin: 0;

    @media (max-width: $bp-md) {
      grid-template-columns: 1fr;
    }
  }

  // ── Horizontal filmstrip (opt-in) ────────────────────────────────────────────
  // Continuous scroll-snapping row. Only present when horizontalScroll is on, so
  // the default grid render above is untouched.
  &__horizontal--scroll {
    display: flex;
    flex-wrap: nowrap;
    grid-template-columns: none;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    gap: var(--spacing-lg);
    scroll-padding-inline: var(--spacing-md);
    scrollbar-width: thin;

    .splash-timeline__h-step {
      flex: 0 0 clamp(24rem, 30vw, 32rem);
      scroll-snap-align: start;
      padding-inline: 0;
    }

    // Re-anchor the connector for fixed-width flex cards: reach from this marker's
    // right edge across the gap to the next marker so the line reads continuously.
    .splash-timeline__h-connector {
      inset-inline-start: calc(50% + 2.8rem);
      inset-inline-end: calc(-50% - var(--spacing-lg) + 2.8rem);

      @media (max-width: $bp-md) {
        display: none;
      }
    }
  }

  // Filmstrip scroll controls — desktop only; native swipe is the mobile UX.
  &__h-nav {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-lg);
    margin-block-start: var(--spacing-md);

    @media (max-width: $bp-md) {
      display: none;
    }
  }

  &__h-arrow {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 4.4rem;
    height: 4.4rem;
    padding: 0;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-full);
    background: var(--color-background-lighter);
    color: var(--section-text, var(--color-text));
    cursor: pointer;
    transition: box-shadow var(--transition-base), opacity var(--transition-base);

    svg {
      width: 2rem;
      height: 2rem;
    }

    &:hover {
      box-shadow: var(--shadow-md);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    &:disabled {
      opacity: 0.35;
      cursor: default;
      box-shadow: none;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  }

  &__h-step {
    text-align: center;
    position: relative;
    padding: 0 var(--spacing-md);

    .splash-timeline__figure {
      max-width: 24rem;
      margin-inline: auto;
    }
  }

  &__h-date {
    // same visual as step-date but centered for the horizontal card
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--motion-accent, var(--timeline-accent, var(--color-primary)));
    margin: 0 0 var(--spacing-2xs, 0.25rem);
  }

  &__h-marker {
    width: 5.6rem;
    height: 5.6rem;
    border-radius: var(--border-radius-full);
    background-color: var(--motion-accent, var(--timeline-accent, var(--color-primary)));
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-background);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-lg);
    margin: 0 auto var(--spacing-md);

    .material-icons-outlined {
      font-size: var(--font-size-xl);
    }
  }

  &__h-connector {
    position: absolute;
    top: 2.8rem;
    inset-inline-start: calc(50% + 2.8rem);
    inset-inline-end: calc(-50% + 2.8rem);
    height: 0.3rem;
    background-color: var(--motion-accent, var(--timeline-accent, var(--color-primary)));
    opacity: 0.2;

    @media (max-width: $bp-md) {
      display: none;
    }
  }

  &__h-title {
    font-family: var(--rt-slot-steptitle-family, var(--rt-role-heading3-family, inherit));
    font-size: var(--rt-slot-steptitle-size, var(--rt-role-heading3-size, var(--font-size-lg)));
    font-weight: var(--rt-slot-steptitle-weight, var(--rt-role-heading3-weight, var(--font-weight-semibold)));
    line-height: var(--rt-slot-steptitle-line-height, var(--rt-role-heading3-line-height, inherit));
    letter-spacing: var(--rt-slot-steptitle-letter-spacing, var(--rt-role-heading3-letter-spacing, normal));
    text-transform: var(--rt-slot-steptitle-text-transform, var(--rt-role-heading3-text-transform, none));
    color: var(--rt-slot-steptitle-color, var(--rt-role-heading3-color, inherit));
    margin: 0 0 var(--spacing-xs);
  }

  &__h-desc {
    font-family: var(--rt-slot-stepdescription-family, var(--rt-role-body-family, inherit));
    font-size: var(--rt-slot-stepdescription-size, var(--rt-role-body-size, var(--font-size-base)));
    font-weight: var(--rt-slot-stepdescription-weight, var(--rt-role-body-weight, inherit));
    line-height: var(--rt-slot-stepdescription-line-height, var(--rt-role-body-line-height, var(--line-height-relaxed)));
    letter-spacing: var(--rt-slot-stepdescription-letter-spacing, var(--rt-role-body-letter-spacing, normal));
    text-transform: var(--rt-slot-stepdescription-text-transform, var(--rt-role-body-text-transform, none));
    color: var(--rt-slot-stepdescription-color, var(--rt-role-body-color, var(--color-text-light)));
    margin: 0;
  }
}
</style>
