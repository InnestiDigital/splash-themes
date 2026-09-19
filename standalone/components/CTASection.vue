<template>
  <section class="cta-section" :class="layoutClass" :style="{ ...rootStyles, ...radiusStyle, ...measureStyle }">
    <div v-if="backgroundImage" class="cta-section__background" data-target="background" :style="bgStyles" />
    <div class="cta-section__content" :class="surfaceClass" :style="contentStyle">
      <h2 v-if="heading" class="cta-section__heading" data-target="heading" v-html="asHtml(localizedHeading)"></h2>
      <div v-if="body" class="cta-section__body prose" data-target="body" v-html="localizedBody" />
      <div class="cta-section__actions" data-target="cta" :style="actionsStyle">
        <a v-if="ctaText" :href="ctaUrl" class="cta-section__primary" :class="[ctaStyleClass, showCtaIcon ? 'cta-section__primary--with-icon' : '']">{{ localizedCtaText }}<span v-if="showCtaIcon" class="cta-section__cta-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg></span></a>
        <a v-if="secondaryCtaText" :href="secondaryCtaUrl" class="cta-section__secondary">{{ localizedSecondaryCtaText }}</a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BackgroundRole, TextRole } from '~/shared/types/placement'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { asHtml } from '~/shared/utils/asHtml'
import { useBlockSurface } from '~/shared/composables/useBlockSurface'
import { useLocalized } from '~/shared/composables/useLocalized'

const { getLocalizedValue } = useLocalized()
type Layout = 'centered' | 'split' | 'stacked'
type CtaStyle = 'solid' | 'outline' | 'text'

const props = defineProps<{
  heading?: string | Record<string, string>
  body?: string | Record<string, string>
  ctaText?: string | Record<string, string>
  ctaUrl?: string
  ctaStyle?: CtaStyle
  secondaryCtaText?: string | Record<string, string>
  secondaryCtaUrl?: string
  layout?: Layout
  background?: BackgroundRole
  textTone?: TextRole
  backgroundImage?: string
  internalPadding?: string
  contentAlignH?: string
  contentAlignV?: string
  surfaceStyle?: string
  borderRadius?: string
  measureWidth?: 'content' | 'narrow' | 'standard' | 'wide' | 'full'
  /**
   * ctaColorScheme — semantic color role for the primary CTA button.
   * 'primary' (default): uses --color-primary (theme primaryColor).
   * 'accent': uses --color-accent (theme accentColor, e.g. #1B8AB7 teal).
   * NOT a freeform hex — maps to existing theme palette CSS vars only.
   */
  ctaColorScheme?: 'primary' | 'accent'
  /**
   * compact — removes the default large vertical padding from the section root
   * so the CTA block sits inline within a stacked section.
   * Default false preserves existing spacing behavior.
   */
  compact?: boolean
  /**
   * ctaIcon — optional trailing icon on the PRIMARY button.
   * 'none' (default): no icon, DOM byte-identical to today.
   * 'arrow': a currentColor arrow glyph that nudges right on hover.
   */
  ctaIcon?: 'none' | 'arrow'
}>()

const measureStyle = computed<Record<string, string>>(() =>
  props.measureWidth ? { '--block-measure': `var(--measure-width-${props.measureWidth})` } : {},
)

const localizedHeading = computed(() => getLocalizedValue(props.heading))
const localizedBody = computed(() => getLocalizedValue(props.body))
const localizedCtaText = computed(() => getLocalizedValue(props.ctaText))
const localizedSecondaryCtaText = computed(() => getLocalizedValue(props.secondaryCtaText))

const layout = computed((): Layout => props.layout || 'centered')
const ctaStyle = computed((): CtaStyle => props.ctaStyle || 'solid')

const layoutClass = computed(() => `cta-section--${layout.value}`)
const ctaStyleClass = computed(() => `cta-section__primary--${ctaStyle.value}`)
const showCtaIcon = computed(() => props.ctaIcon === 'arrow')

const { surfaceStyle } = useBlockSurface(props, { fallbackBackground: 'section' })

const rootStyles = computed(() => {
  const styles: Record<string, string> = { ...surfaceStyle.value }
  // A backgroundImage paints the block itself, so the surface fill would sit on
  // top of it — keep the text tone, drop the background.
  if (props.backgroundImage) delete styles.backgroundColor
  // Semantic color override for CTA button — maps to existing theme palette tokens only.
  if (props.ctaColorScheme === 'accent') {
    styles['--cta-btn-color'] = 'var(--color-accent, #1B8AB7)'
  } else {
    styles['--cta-btn-color'] = 'var(--color-primary)'
  }
  // Compact mode — strips root vertical padding so block fits inline in a section stack
  if (props.compact) {
    styles.paddingBlockStart = '0'
    styles.paddingBlockEnd = '0'
    styles['--cta-btn-padding-x'] = '2.4rem'
  }
  return styles
})

const ALIGN_V_MAP: Record<string, string> = {
  top: 'flex-start',
  center: 'center',
  bottom: 'flex-end',
}

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  if (props.contentAlignH && props.contentAlignH !== 'left') {
    const __alignMap: Record<string, string> = { center: 'center', right: 'flex-end' }
    const mapped = __alignMap[props.contentAlignH] ?? 'flex-start'
    style.justifyContent = mapped
    style.justifyItems = mapped
  }
  if (layout.value === 'split' && props.contentAlignV) {
    style.alignItems = ALIGN_V_MAP[props.contentAlignV] ?? 'center'
  }
  return style
})

// Align the actions row horizontally to match contentAlignH. The centered
// layout already centers via CSS; this makes right/center alignment take effect
// in the stacked layout (where the content wrapper is block-flow, so a
// justify on the wrapper alone would not move the actions row).
const actionsStyle = computed<Record<string, string>>(() => {
  if (props.contentAlignH === 'right') return { justifyContent: 'flex-end' }
  if (props.contentAlignH === 'center') return { justifyContent: 'center' }
  return {}
})

const surfaceClass = computed(() =>
  props.surfaceStyle && props.surfaceStyle !== 'none'
    ? `cta-section--surface-${props.surfaceStyle}`
    : ''
)

const radiusStyle = computed(() => {
  if (!props.borderRadius || props.borderRadius === 'none') return {}
  const resolved = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0'
  // Inject as CSS var so the __primary button rule can consume it without
  // requiring a new per-button prop. Falls back to global --border-radius
  // when borderRadius is not set on this block.
  return { '--cta-btn-radius': resolved }
})

const bgStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (props.backgroundImage) {
    styles.backgroundImage = `url(${props.backgroundImage})`
  }
  return styles
})
</script>

<style lang="scss" scoped>
.cta-section {
  position: relative;
  padding: var(--spacing-3xl) var(--spacing-xl);
  overflow: hidden;

  // Mobile step-down for the ROOT padding: 96/40px desktop padding eats a
  // third of a 360px phone. @container (not @media) per the repo responsive
  // contract — keys on the LayoutShell content box, so the admin preview pane
  // reflows too.
  @container (max-width: 768px) {
    padding: min(var(--spacing-3xl), 4rem) min(var(--spacing-xl), 1.6rem);
  }

  // Layout variants
  &--centered {
    text-align: center;

    .cta-section__content {
      max-width: var(--block-measure, 72rem);
      margin-inline: var(--block-measure-align, auto);
    }

    .cta-section__actions {
      justify-content: center;
    }
  }

  &--split {
    .cta-section__content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: auto auto;
      gap: var(--spacing-lg);
      align-items: center; // fallback; overridden by contentAlignV inline style
      max-width: var(--block-measure, var(--container-max-width, 120rem));
      margin-inline: var(--block-measure-align, auto);

      // Layout collapse keys on the container, not the window (repo contract).
      @container (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }

    .cta-section__heading {
      grid-column: 1;
    }

    .cta-section__body {
      grid-column: 1;
    }

    .cta-section__actions {
      grid-column: 2;
      grid-row: 1 / -1;
      justify-content: flex-end;
      align-items: center;

      @container (max-width: 768px) {
        grid-column: 1;
        grid-row: auto;
        justify-content: flex-start;
      }
    }
  }

  &--stacked {
    .cta-section__content {
      max-width: var(--block-measure, var(--container-max-width, 120rem));
      margin-inline: var(--block-measure-align, auto);
    }

    .cta-section__actions {
      margin-top: var(--spacing-lg);
    }
  }

  // Background
  &__background {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    z-index: 0;
  }

  // Content
  &__content {
    position: relative;
    z-index: 1;

    // Surface variants applied to the inner content wrapper, not the root section
    &.cta-section--surface-subtle {
      background: var(--section-surface, rgba(255,255,255,0.04));
    }

    &.cta-section--surface-filled {
      background: var(--section-accent, rgba(255,255,255,0.1));
    }
  }

  &__heading {
    font-family: var(--rt-slot-heading-family, var(--rt-role-heading2-family, var(--font-family-heading, var(--font-family))));
    font-weight: var(--rt-slot-heading-weight, var(--rt-role-heading2-weight, var(--font-weight-medium, 500)));
    font-size: var(--rt-slot-heading-size, var(--rt-role-heading2-size, var(--font-size-2xl)));
    line-height: var(--rt-slot-heading-line-height, var(--rt-role-heading2-line-height, 1.2));
    letter-spacing: var(--rt-slot-heading-letter-spacing, var(--rt-role-heading2-letter-spacing, normal));
    text-transform: var(--rt-slot-heading-text-transform, var(--rt-role-heading2-text-transform, none));
    font-variation-settings: var(--rt-slot-heading-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-heading-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-heading-font-stretch, normal);
    font-style: var(--rt-slot-heading-font-style, normal);
    color: var(--rt-slot-heading-color, var(--rt-role-heading2-color, inherit));
    margin: 0 0 var(--spacing-md);

    @media (max-width: $bp-md) {
      font-size: var(--font-size-xl);
    }
  }

  &__body {
    font-family: var(--rt-slot-body-family, var(--rt-role-body-family, inherit));
    font-size: var(--rt-slot-body-size, var(--rt-role-body-size, var(--font-size-base)));
    font-weight: var(--rt-slot-body-weight, var(--rt-role-body-weight, inherit));
    line-height: var(--rt-slot-body-line-height, var(--rt-role-body-line-height, 1.6));
    letter-spacing: var(--rt-slot-body-letter-spacing, var(--rt-role-body-letter-spacing, normal));
    font-variation-settings: var(--rt-slot-body-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-body-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-body-font-stretch, normal);
    font-style: var(--rt-slot-body-font-style, normal);
    color: var(--rt-slot-body-color, var(--rt-role-body-color, inherit));
    margin: 0 0 var(--spacing-lg);
  }

  // Actions
  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-md);
  }

  &__primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-sm) var(--cta-btn-padding-x, 4.8rem);
    font-weight: var(--font-weight-medium, 500);
    font-size: 1.6rem;
    text-decoration: none;
    border-radius: var(--cta-btn-radius, var(--border-radius));
    border: 0.2rem solid transparent;
    cursor: pointer;
    transition: var(--transition-base);
    min-height: 4rem;

    &--solid {
      background-color: var(--cta-btn-color, var(--color-primary));
      color: var(--color-background);
      border-color: var(--cta-btn-color, var(--color-primary));

      &:hover {
        filter: brightness(0.88);
      }
    }

    &--outline {
      background-color: transparent;
      color: inherit;
      border-color: currentColor;

      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
    }

    &--text {
      background-color: transparent;
      color: inherit;
      border-color: transparent;
      padding-left: 0;
      padding-right: 0;
      text-decoration: underline;
      text-underline-offset: 0.3rem;

      &:hover {
        opacity: 0.8;
      }
    }

    @container (max-width: 768px) {
      padding: var(--spacing-xs) var(--spacing-lg);
      font-size: var(--font-size-sm);
      min-height: 4.4rem;
    }

    &--with-icon {
      gap: 0.8rem;
    }

    &:hover .cta-section__cta-icon {
      transform: translateX(0.4rem);
    }
  }

  &__cta-icon {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    transition: transform var(--transition-base);

    svg {
      width: 1.6rem;
      height: 1.6rem;
      display: block;
    }
  }

  &__secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-sm) 4.8rem;
    font-weight: var(--font-weight-medium, 500);
    font-size: var(--font-size-base);
    text-decoration: none;
    border-radius: var(--border-radius);
    border: 0.2rem solid currentColor;
    background-color: transparent;
    color: inherit;
    cursor: pointer;
    transition: var(--transition-base);
    min-height: 4rem;

    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    @container (max-width: 768px) {
      padding: var(--spacing-xs) var(--spacing-lg);
      font-size: var(--font-size-sm);
      min-height: 4.4rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .cta-section__cta-icon { transition: none; }
    .cta-section__primary:hover .cta-section__cta-icon { transform: none; }
  }
}
</style>
