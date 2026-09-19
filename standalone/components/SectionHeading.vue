<template>
  <section
    class="section-heading"
    :class="[
      `section-heading--${layout}`,
      layout === 'stacked' ? `section-heading--align-${textAlign}` : null,
      layout !== 'stacked' ? `section-heading--ratio-${splitRatio}` : null,
      layout !== 'stacked' ? `section-heading--meta-${metaAlign}` : null,
      showDivider ? 'section-heading--with-divider' : null,
    ]"
    :style="{ ...rootStyles, ...measureStyle, ...headingSizeStyle, ...headingColorStyle, ...indexColorStyle }"
    data-target="root"
  >
    <div class="section-heading__container" :style="contentStyle">
      <!-- Title column: eyebrow + heading + subtitle -->
      <div class="section-heading__title-column" data-target="titleColumn">
        <span
          v-if="localizedIndex"
          class="section-heading__index"
          :class="`section-heading__index--${indexStyle}`"
          data-target="index"
          aria-hidden="true"
          v-html="asHtml(localizedIndex)"
        ></span>

        <hr
          v-if="accentRule === 'above'"
          class="section-heading__rule section-heading__rule--above"
          data-target="rule"
          aria-hidden="true"
          :style="ruleStyle"
        />

        <span
          v-if="localizedEyebrow && layout === 'stacked'"
          class="block-eyebrow section-heading__eyebrow"
          data-target="eyebrow"
          v-html="asHtml(localizedEyebrow)"
        ></span>

        <component
          :is="headingTag"
          class="section-heading__title"
          data-target="heading"
          v-html="asHtml(localizedHeading)"
        ></component>

        <hr
          v-if="accentRule === 'below'"
          class="section-heading__rule section-heading__rule--below"
          data-target="rule"
          aria-hidden="true"
          :style="ruleStyle"
        />

        <p
          v-if="localizedSubtitle && layout === 'stacked'"
          class="section-heading__subtitle"
          data-target="subtitle"
          v-html="asHtml(localizedSubtitle)"
        ></p>

        <p
          v-if="localizedDescription && layout === 'stacked'"
          class="section-heading__description"
          data-target="description"
          v-html="asHtml(localizedDescription)"
        ></p>
      </div>

      <!-- Meta column: date + eyebrow + description (split layouts only) -->
      <div
        v-if="layout !== 'stacked' && hasMeta"
        class="section-heading__meta-column"
        data-target="metaColumn"
      >
        <span
          v-if="localizedEyebrow"
          class="block-eyebrow section-heading__eyebrow"
          data-target="eyebrow"
          v-html="asHtml(localizedEyebrow)"
        ></span>
        <span
          v-if="localizedDateLabel"
          class="section-heading__date"
          data-target="dateLabel"
          v-html="asHtml(localizedDateLabel)"
        ></span>
        <p
          v-if="localizedSubtitle"
          class="section-heading__subtitle"
          data-target="subtitle"
          v-html="asHtml(localizedSubtitle)"
        ></p>
        <p
          v-if="localizedDescription"
          class="section-heading__description"
          data-target="description"
          v-html="asHtml(localizedDescription)"
        ></p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TextRole } from '~/shared/types/placement'
import { SPACING_TOKEN_MAP, resolveTextRole } from '~/shared/features/cms/placement/placementTokenMaps'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'

const { getLocalizedValue } = useLocalized()
type Layout = 'stacked' | 'split-title-left' | 'split-title-right'
type SplitRatio = '50-50' | '60-40' | '66-33' | '75-25'
type MetaAlign = 'top' | 'baseline' | 'center' | 'bottom'
type SurfaceStyle = 'none' | 'subtle' | 'filled'
/**
 * headingSize — controls the display font-size preset for the heading.
 * 'default' (or omitted) uses the existing sectionTitle token (~3rem).
 * 'display-xl' binds to the theme `displayXl` typography token via its
 * `--type-display-xl-*` CSS variables (emitted from theme.json by
 * useDesignTokens in admin/preview) so editing the token updates the heading.
 * A literal fallback mirrors the shipped token value (clamp(6.4rem, 9.5vw,
 * 13.7rem), ~137px) for the public theme, which does not inject the
 * `--type-*` layer. The family fallback resolves to the themed heading face
 * (`--font-family-heading`) so large page and editorial index titles share the
 * same theme-controlled face.
 */
type HeadingSize = 'default' | 'display-sm' | 'display-lg' | 'display-xl'
/**
 * headingColor — semantic color role for the heading text.
 * 'default' (or omitted) inherits from the section cascade.
 * 'accent' maps to --color-accent (theme accentColor: #1B8AB7 teal).
 * 'primary' maps to --color-primary (theme primaryColor: #1E3D4F navy).
 */
type HeadingColor = 'default' | 'accent' | 'primary'
/**
 * headingLevel — the semantic HTML tag the heading renders as (h1–h6),
 * decoupled from `headingSize` (visual scale). Defaults to 'h2' so every
 * existing instance is unchanged. Authors set the topmost heading on a page
 * to 'h1' to give the document a single, correct top-level heading (WCAG
 * 1.3.1 / 2.4.6 + SEO) while keeping subsection headings at h2/h3.
 */
type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
const HEADING_LEVELS: readonly HeadingLevel[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
/**
 * accentRule — optional thin decorative line framing the heading. 'none'
 * (default) emits no element, so every existing instance renders byte-identical.
 * 'above' places a kicker rule as the first child of the title column; 'below'
 * places it directly under the heading. Purely decorative (aria-hidden).
 */
type AccentRule = 'none' | 'above' | 'below'
type AccentRuleColor = 'accent' | 'primary' | 'border'
type AccentRuleWidth = 'short' | 'full'
/**
 * indexStyle — presentation of the optional editorial index numeral.
 * 'inline' (default) = small tabular kicker above the eyebrow/title.
 * 'jumbo' = large faint editorial numeral above the title. Both render as a
 * normal-flow block leading the title column (never an absolute overlay), so
 * they can't overlap or overflow the stacked/split/ratio permutations.
 */
type IndexStyle = 'inline' | 'jumbo'
/**
 * indexColor — semantic color role for the index numeral. Palette tokens only
 * (muted = --color-muted, accent = --color-accent, primary = --color-primary);
 * no freeform hex (Color Override Freeze).
 */
type IndexColor = 'muted' | 'accent' | 'primary'

const props = defineProps<{
  eyebrow?: string | Record<string, string>
  heading?: string | Record<string, string>
  subtitle?: string | Record<string, string>
  description?: string | Record<string, string>
  dateLabel?: string | Record<string, string>
  layout?: Layout
  splitRatio?: SplitRatio
  metaAlign?: MetaAlign
  textAlign?: string
  showDivider?: boolean
  textTone?: TextRole
  internalPadding?: string
  surfaceStyle?: SurfaceStyle
  measureWidth?: 'content' | 'narrow' | 'standard' | 'wide' | 'full'
  headingSize?: HeadingSize
  headingColor?: HeadingColor
  headingLevel?: HeadingLevel
  accentRule?: AccentRule
  accentRuleColor?: AccentRuleColor
  accentRuleWidth?: AccentRuleWidth
  indexLabel?: string | Record<string, string>
  indexStyle?: IndexStyle
  indexColor?: IndexColor
}>()

// Whitelist-guarded so the block never renders an arbitrary tag from content.
const headingTag = computed<HeadingLevel>(() =>
  props.headingLevel && HEADING_LEVELS.includes(props.headingLevel) ? props.headingLevel : 'h2',
)

const localizedEyebrow = computed(() => getLocalizedValue(props.eyebrow))
const localizedHeading = computed(() => getLocalizedValue(props.heading))
const localizedSubtitle = computed(() => getLocalizedValue(props.subtitle))
const localizedDescription = computed(() => getLocalizedValue(props.description))
const localizedDateLabel = computed(() => getLocalizedValue(props.dateLabel))
const localizedIndex = computed(() => getLocalizedValue(props.indexLabel))

const layout = computed<Layout>(() => props.layout || 'stacked')
const splitRatio = computed<SplitRatio>(() => props.splitRatio || '60-40')
const metaAlign = computed<MetaAlign>(() => props.metaAlign || 'baseline')
const showDivider = computed(() => props.showDivider ?? false)
const textAlign = computed(() => {
  if (props.textAlign === 'center' || props.textAlign === 'right') return props.textAlign
  return 'left'
})

const hasMeta = computed(() =>
  !!(localizedEyebrow.value || localizedDateLabel.value || localizedSubtitle.value || localizedDescription.value),
)

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  return style
})

const measureStyle = computed<Record<string, string>>(() =>
  props.measureWidth ? { '--block-measure': `var(--measure-width-${props.measureWidth})` } : {},
)

const rootStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (props.surfaceStyle === 'subtle') {
    styles.background = 'var(--section-surface, rgba(255,255,255,0.04))'
  } else if (props.surfaceStyle === 'filled') {
    styles.background = 'var(--section-accent, rgba(255,255,255,0.1))'
  }
  // Text-only adopter of the color-roles fragment: the schema omits
  // `background`, so no surface is painted here — only the text tone.
  styles.color = props.textTone
    ? resolveTextRole(props.textTone)
    : 'var(--section-text, var(--color-text))'
  return styles
})

/**
 * Heading size override — maps headingSize prop to CSS custom properties that
 * are picked up by the `.section-heading__title` rule's slot/role cascade.
 * When headingSize === 'display-xl', the heading slots bind to the theme
 * `displayXl` token's `--type-display-xl-*` variables so admin/preview edits to
 * the token flow through. The literal fallbacks mirror the shipped token value
 * and keep the public theme (which omits the `--type-*` layer) pixel-identical.
 */
const headingSizeStyle = computed<Record<string, string>>(() => {
  if (props.headingSize === 'display-sm') {
    // Statement tagline tier (~40px @13") between sectionTitle (~30px) and
    // display-lg (~55px). The reference renders intro statements like
    // /persone "Competenze diverse, una sola idea." at 40px.
    return {
      '--rt-slot-heading-size': 'clamp(2.6rem, 2.8vw, 4rem)',
      '--rt-slot-heading-family': 'var(--font-family-heading, "Inter", sans-serif)',
      '--rt-slot-heading-letter-spacing': '-0.01em',
      '--rt-slot-heading-line-height': '1.1',
      '--rt-slot-heading-weight': '400',
    }
  }
  if (props.headingSize === 'display-lg') {
    // Large editorial heading, a notch below the page mega-title. Used for the
    // the Servizi per-service rows ("Restauro" / "Riqualificazione" …),
    // which the reference renders as large blue headings dominant over the body
    // but secondary to the page title. Literal preset (no theme token tier).
    return {
      '--rt-slot-heading-size': 'clamp(3.2rem, 5vw, 5.5rem)',
      '--rt-slot-heading-family': 'var(--font-family-heading, "Inter", sans-serif)',
      '--rt-slot-heading-letter-spacing': '-0.015em',
      '--rt-slot-heading-line-height': '1',
      '--rt-slot-heading-weight': '400',
    }
  }
  if (props.headingSize === 'display-xl') {
    return {
      '--rt-slot-heading-size': 'var(--type-display-xl-size, clamp(6.4rem, 9.5vw, 13.7rem))',
      '--rt-slot-heading-family': 'var(--type-display-xl-font-family, var(--font-family-heading, "Inter", sans-serif))',
      '--rt-slot-heading-letter-spacing': 'var(--type-display-xl-letter-spacing, -0.03em)',
      '--rt-slot-heading-line-height': 'var(--type-display-xl-line-height, 0.95)',
      '--rt-slot-heading-weight': 'var(--type-display-xl-weight, 400)',
    }
  }
  return {}
})

/**
 * Heading color override — maps headingColor semantic role to a CSS color var.
 * Uses theme palette tokens only (accent = --color-accent, primary = --color-primary).
 * Falls back to existing cascade when 'default' or absent.
 */
const headingColorStyle = computed<Record<string, string>>(() => {
  if (props.headingColor === 'accent') {
    return { '--rt-slot-heading-color': 'var(--color-accent, #1B8AB7)' }
  }
  if (props.headingColor === 'primary') {
    return { '--rt-slot-heading-color': 'var(--color-primary, #1E3D4F)' }
  }
  return {}
})

const accentRule = computed<AccentRule>(() => props.accentRule ?? 'none')

/**
 * Accent rule presentation — maps the semantic color role + width to CSS vars
 * consumed by the `.section-heading__rule` selector. Palette tokens only (no
 * freeform hex). Inert unless a rule is active (accentRule !== 'none').
 */
const ruleStyle = computed<Record<string, string>>(() => {
  const color =
    props.accentRuleColor === 'primary'
      ? 'var(--color-primary, #1E3D4F)'
      : props.accentRuleColor === 'border'
        ? 'var(--border-color, rgba(0,0,0,0.15))'
        : 'var(--color-accent, #1B8AB7)'
  const width = props.accentRuleWidth === 'full' ? '100%' : '3rem'
  return {
    '--sh-rule-color': color,
    '--sh-rule-width': width,
  }
})

const indexStyle = computed<IndexStyle>(() => (props.indexStyle === 'jumbo' ? 'jumbo' : 'inline'))

/**
 * Index numeral color override — maps the semantic role to a CSS color var
 * consumed by the `.section-heading__index` selector. Palette tokens only (no
 * freeform hex). Fully inert (emits nothing) unless an index numeral is
 * actually rendered, so the root style attr stays byte-identical when no index
 * is set. Defaults to the muted role token.
 */
const indexColorStyle = computed<Record<string, string>>(() => {
  if (!localizedIndex.value) return {}
  if (props.indexColor === 'accent') {
    return { '--sh-index-color': 'var(--color-accent, #1B8AB7)' }
  }
  if (props.indexColor === 'primary') {
    return { '--sh-index-color': 'var(--color-primary, #1E3D4F)' }
  }
  return { '--sh-index-color': 'var(--color-muted, #5f6368)' }
})
</script>

<style lang="scss" scoped>
@mixin section-heading-stack-split {
  .section-heading__container {
    flex-direction: column;
    align-items: stretch;
  }
  .section-heading__title-column,
  .section-heading__meta-column {
    flex: 1 1 auto;
  }
  // Reset the right-hugging meta treatment once stacked — full-width, left-aligned.
  &.section-heading--split-title-left .section-heading__meta-column {
    align-items: stretch;
    text-align: left;

    > * {
      max-width: none;
    }
  }
  &.section-heading--with-divider .section-heading__meta-column {
    border-left: none;
    padding-left: 0;
    border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
    padding-top: var(--spacing-md);
  }
}

.section-heading {
  padding: 0;

  &__container {
    max-width: var(--block-measure, 100%);
    margin-inline: var(--block-measure-align, auto);
    display: flex;
    gap: var(--spacing-xl);
  }

  // ── Stacked layout ────────────────────────────────────────────────────
  &--stacked &__container {
    flex-direction: column;
  }

  &--stacked &__title-column {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  &--align-center &__container,
  &--align-center &__title-column {
    text-align: center;
    align-items: center;
  }

  &--align-right &__container,
  &--align-right &__title-column {
    text-align: right;
    align-items: flex-end;
  }

  // ── Split layouts ─────────────────────────────────────────────────────
  &--split-title-left &__container {
    flex-direction: row;
    align-items: flex-start;
  }

  &--split-title-right &__container {
    flex-direction: row-reverse;
    align-items: flex-start;
  }

  // Ratios — title column / meta column
  &--ratio-50-50 &__title-column { flex: 1 1 50%; }
  &--ratio-50-50 &__meta-column  { flex: 1 1 50%; }

  &--ratio-60-40 &__title-column { flex: 1 1 60%; }
  &--ratio-60-40 &__meta-column  { flex: 1 1 40%; }

  &--ratio-66-33 &__title-column { flex: 1 1 66.66%; }
  &--ratio-66-33 &__meta-column  { flex: 1 1 33.33%; }

  &--ratio-75-25 &__title-column { flex: 1 1 75%; }
  &--ratio-75-25 &__meta-column  { flex: 1 1 25%; }

  // Meta column vertical alignment (relative to title column baseline)
  &--meta-top &__container     { align-items: flex-start; }
  &--meta-baseline &__container { align-items: baseline; }
  &--meta-center &__container  { align-items: center; }
  &--meta-bottom &__container  { align-items: flex-end; }

  // Column divider (split layouts only)
  &--with-divider &__meta-column {
    border-left: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
    padding-left: var(--spacing-xl);
  }

  &--split-title-right#{&}--with-divider &__title-column {
    border-left: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
    padding-left: var(--spacing-xl);
  }

  &--split-title-right#{&}--with-divider &__meta-column {
    border-left: none;
    padding-left: 0;
  }

  // Meta column internal stack
  &__meta-column {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    min-width: 0;
  }

  // In title-left split the meta column hugs the outer (right) edge as a tight
  // editorial block — mirrors the index-page mastheads and keeps the copy clear
  // of the layout's decorative gutter rule (which sits inside a full-width 25%
  // column). Reset on mobile-stacked below.
  &--split-title-left &__meta-column {
    align-items: flex-end;
    text-align: right;

    > * {
      max-width: 18rem;
    }
  }

  // Responsive: collapse split layouts to stacked on narrow viewports
  @media (max-width: $bp-md) {
    &--split-title-left &__container,
    &--split-title-right &__container {
      flex-direction: column;
      align-items: stretch;
    }
    &--split-title-left &__title-column,
    &--split-title-right &__title-column,
    &--split-title-left &__meta-column,
    &--split-title-right &__meta-column {
      flex: 1 1 auto;
    }
    // Reset the right-hugging meta treatment once stacked — full-width, left-aligned.
    &--split-title-left &__meta-column {
      align-items: stretch;
      text-align: left;

      > * {
        max-width: none;
      }
    }
    &--with-divider &__meta-column {
      border-left: none;
      padding-left: 0;
      border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
      padding-top: var(--spacing-md);
    }
  }

  // Narrow meta ratios (66-33 / 75-25) crush the caption on tablet portrait
  // (769-1024px) where the meta column is only 25-33% (~195px). Keep them
  // stacked full-width up to $bp-lg; balanced ratios (50-50 / 60-40) stay
  // side-by-side here and only collapse at $bp-md above.
  @media (min-width: #{$bp-md + 1px}) and (max-width: $bp-lg) {
    &--ratio-66-33,
    &--ratio-75-25 {
      @include section-heading-stack-split;
    }
  }

  // ── Typography — consumes slot/role cascade ──────────────────────────
  &__title {
    // Default tier emits no --rt-slot-heading-family, so the ultimate fallback
    // must be the themed heading face (Sul Sans) — not `inherit` — to keep row
    // headings (e.g. /servizi "Restauro") on the single reference face.
    font-family: var(--rt-slot-heading-family, var(--rt-role-sectionTitle-family, var(--font-family-heading, inherit)));
    font-size: var(--rt-slot-heading-size, var(--rt-role-sectionTitle-size, 48px));
    font-weight: var(--rt-slot-heading-weight, var(--rt-role-sectionTitle-weight, 700));
    line-height: var(--rt-slot-heading-line-height, var(--rt-role-sectionTitle-line-height, 1.15));
    letter-spacing: var(--rt-slot-heading-letter-spacing, var(--rt-role-sectionTitle-letter-spacing, -0.3px));
    text-transform: var(--rt-slot-heading-text-transform, var(--rt-role-sectionTitle-text-transform, none));
    font-variation-settings: var(--rt-slot-heading-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-heading-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-heading-font-stretch, normal);
    font-style: var(--rt-slot-heading-font-style, normal);
    color: var(--rt-slot-heading-color, var(--rt-role-sectionTitle-color, inherit));
    margin: 0;
  }

  // Fluid cap on narrow containers: the sectionTitle token (~64px) has no vw
  // reduction and clips long words ("Certificazioni" overflows its 343px box
  // by 28px at a 390px viewport). Below a 640px container, cap the title at the
  // smaller of the token and 15cqw — 15cqw ≈ 58.5px at a 390px container (fits
  // "Certificazioni"), and reaches the token value (~96px) by 640px so wider
  // widths resolve to min() = token and stay pixel-identical. Only affects the
  // default/role tier; display-xl/lg/sm presets already clamp with vw.
  @container (max-width: 640px) {
    &__title {
      font-size: min(
        var(--rt-slot-heading-size, var(--rt-role-sectionTitle-size, 48px)),
        15cqw
      );
    }
  }

  &__subtitle {
    font-family: var(--rt-slot-subtitle-family, var(--rt-role-lead-family, inherit));
    font-size: var(--rt-slot-subtitle-size, var(--rt-role-lead-size, var(--font-size-lg)));
    font-weight: var(--rt-slot-subtitle-weight, var(--rt-role-lead-weight, inherit));
    line-height: var(--rt-slot-subtitle-line-height, var(--rt-role-lead-line-height, var(--line-height-relaxed)));
    letter-spacing: var(--rt-slot-subtitle-letter-spacing, var(--rt-role-lead-letter-spacing, normal));
    font-variation-settings: var(--rt-slot-subtitle-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-subtitle-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-subtitle-font-stretch, normal);
    font-style: var(--rt-slot-subtitle-font-style, normal);
    color: var(--rt-slot-subtitle-color, var(--rt-role-lead-color, inherit));
    margin: 0;
    opacity: 0.85;
  }

  &__description {
    font-family: var(--rt-slot-description-family, var(--rt-role-body-family, inherit));
    font-size: var(--rt-slot-description-size, var(--rt-role-body-size, var(--font-size-base)));
    font-weight: var(--rt-slot-description-weight, var(--rt-role-body-weight, inherit));
    line-height: var(--rt-slot-description-line-height, var(--rt-role-body-line-height, var(--line-height-relaxed)));
    letter-spacing: var(--rt-slot-description-letter-spacing, var(--rt-role-body-letter-spacing, normal));
    font-variation-settings: var(--rt-slot-description-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-description-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-description-font-stretch, normal);
    font-style: var(--rt-slot-description-font-style, normal);
    color: var(--rt-slot-description-color, var(--rt-role-body-color, inherit));
    margin: 0;
    opacity: 0.8;
  }

  &__date {
    font-family: var(--rt-slot-dateLabel-family, var(--rt-role-caption-family, inherit));
    font-size: var(--rt-slot-dateLabel-size, var(--rt-role-caption-size, var(--font-size-sm)));
    font-weight: var(--rt-slot-dateLabel-weight, var(--rt-role-caption-weight, inherit));
    line-height: var(--rt-slot-dateLabel-line-height, var(--rt-role-caption-line-height, 1.4));
    letter-spacing: var(--rt-slot-dateLabel-letter-spacing, var(--rt-role-caption-letter-spacing, normal));
    text-transform: var(--rt-slot-dateLabel-text-transform, var(--rt-role-caption-text-transform, none));
    font-variation-settings: var(--rt-slot-dateLabel-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-dateLabel-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-dateLabel-font-stretch, normal);
    font-style: var(--rt-slot-dateLabel-font-style, normal);
    color: var(--rt-slot-dateLabel-color, var(--rt-role-caption-color, inherit));
    opacity: 0.7;
  }

  // Eyebrow uses the global .block-eyebrow class which already has the
  // slot cascade wired in (see assets/scss/standalone.scss).

  // ── Accent rule (optional decorative line) ───────────────────────────
  // Only rendered when accentRule is 'above'/'below'; keyed entirely to CSS
  // vars set by ruleStyle so no existing selector is affected.
  &__rule {
    display: block;
    height: 2px;
    border: 0;
    border-radius: 999px;
    background: var(--sh-rule-color, var(--color-accent, #1B8AB7));
    width: var(--sh-rule-width, 3rem);
    margin: 0;
  }

  &__rule--above {
    margin-block: 0 var(--spacing-sm);
  }

  &__rule--below {
    margin-block: var(--spacing-sm) 0;
  }

  // ── Editorial index numeral (optional decorative kicker) ─────────────
  // Only rendered when localizedIndex is non-empty; every rule below is keyed
  // to the `.section-heading__index` element so default output is byte-identical.
  // In-flow block leading the title column in both stacked and split layouts.
  &__index {
    display: block;
    font-variant-numeric: tabular-nums;
    color: var(--sh-index-color, var(--color-muted, #5f6368));
    line-height: 1;
    margin: 0;
    // Harden against a long index string in a narrow split-title column wider
    // than the 640px container guard below: never spill past the column box.
    max-width: 100%;
    overflow-wrap: anywhere;
  }

  // Small editorial kicker (digits — no uppercase needed).
  &__index--inline {
    font-size: var(--font-size-sm, 1.4rem);
    letter-spacing: 0.14em;
    font-weight: 600;
    opacity: 0.75;
    margin-bottom: var(--spacing-xs);
  }

  // Large faint editorial numeral on the themed heading face.
  &__index--jumbo {
    font-family: var(--rt-role-sectionTitle-family, var(--font-family-heading, inherit));
    font-size: clamp(3.6rem, 7vw, 6.4rem);
    font-weight: 400;
    letter-spacing: -0.02em;
    opacity: 0.32;
    margin-bottom: var(--spacing-xs);
  }

  // Cap jumbo on narrow containers so the numeral can't overflow its column —
  // mirror the __title @container idiom (min of the clamp value and 16cqw).
  @container (max-width: 640px) {
    &__index--jumbo {
      font-size: min(clamp(3.6rem, 7vw, 6.4rem), 16cqw);
    }
  }
}
</style>
