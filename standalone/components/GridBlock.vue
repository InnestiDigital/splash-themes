<template>
  <section class="grid-block" :class="rootClasses" :style="{ ...sectionStyles, ...typographyStyle }">
    <!-- Header (feature style only) -->
    <div
      v-if="cardStyle === 'feature' && (showTitle && (title || subtitle))"
      class="grid-block__header"
    >
      <h2
        v-if="showTitle && title"
        data-target="heading"
        class="grid-block__title"
        v-html="asHtml(localizedTitle)"
      ></h2>
      <p
        v-if="showTitle && subtitle"
        class="grid-block__subtitle"
        v-html="asHtml(localizedSubtitle)"
      ></p>
    </div>

    <div class="grid-block__container" :style="{ ...contentStyle, ...gridStyles, ...gridAlignStyle, ...containerStyle }" data-grid>
      <!-- Card style: rich info-card array -->
      <template v-if="cardStyle === 'card'">
        <div
          v-for="(card, index) in cards"
          :key="`card-${index}`"
          data-target="item"
          :data-item-index="index"
          class="grid-block__item"
          :class="card.span && card.span !== '1x1' ? `grid-block__item--span-${card.span}` : ''"
        >
          <div class="grid-block__card info-card" :class="infoCardClasses">
            <div v-if="captionPosition === 'above' && !captionOverlay" class="info-card__content info-card__content--above">
              <h3
                v-if="card.title"
                class="info-card__title"
                :class="card.titleColor === 'accent' ? 'info-card__title--accent' : ''"
                v-html="asHtml(getLocalizedValue(card.title))"
              ></h3>
              <p v-if="card.description" class="info-card__description prose" v-html="asHtml(getLocalizedValue(card.description))"></p>
            </div>

            <div v-if="card.image" class="info-card__image-wrapper" :class="imageWrapperClass">
              <img
                :src="card.image"
                :alt="getLocalizedPlain(card.title)"
                class="info-card__image"
                loading="lazy"
                decoding="async"
              />
              <!-- Lightbox trigger (opt-in). A sibling overlay button rather than a
                   wrapper around the image: the image frame already hosts links (CTA
                   pill badge, social link), and wrapping would nest interactives.
                   It sits below those (z-index 1 vs 3) so an existing card link always
                   wins its own hit area; the trigger only claims the bare photo. -->
              <button
                v-if="cardHasLightbox(card)"
                type="button"
                class="info-card__lightbox-trigger"
                :aria-label="lightboxTriggerLabel(card)"
                data-cursor-label="View"
                data-lightbox
                :data-lightbox-src="card.image"
                :data-lightbox-alt="getLocalizedPlain(card.title)"
                :data-lightbox-caption="getLocalizedPlain(card.title)"
                :data-lightbox-group="lightboxGroup"
              >
                <span class="info-card__zoom-hint" aria-hidden="true">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                </span>
              </button>
              <div v-if="cardHoverEffect === 'overlay-reveal'" class="info-card__overlay-reveal" aria-hidden="true">
                <span class="info-card__overlay-reveal-title" v-html="asHtml(getLocalizedValue(card.title))"></span>
              </div>
              <span
                v-if="card.statusLabel"
                class="info-card__status-label"
                aria-label="Status"
              >{{ getLocalizedValue(card.statusLabel) }}</span>
              <NuxtLink
                v-if="(captionPosition === 'above' || captionOverlay) && card.ctaText && card.ctaUrl"
                :to="card.ctaUrl"
                class="info-card__pill-badge"
              >
                {{ getLocalizedValue(card.ctaText) }}
              </NuxtLink>

              <!-- Caption overlay lives INSIDE the image frame so it always sits
                   ON the photo (gradient scrim + white type), never as a pill below it. -->
              <div v-if="captionOverlay" class="info-card__caption-overlay">
                <h3 v-if="card.title" class="info-card__caption-title" v-html="asHtml(getLocalizedValue(card.title))"></h3>
                <p v-if="card.description" class="info-card__caption-description prose" v-html="asHtml(getLocalizedValue(card.description))"></p>
                <a
                  v-if="card.socialUrl"
                  :href="card.socialUrl"
                  class="info-card__social-link"
                  target="_blank"
                  rel="noopener"
                  aria-label="LinkedIn"
                  @click.stop
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.44-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
                  </svg>
                </a>
              </div>
            </div>

            <div v-if="captionPosition === 'below'" class="info-card__content" :class="{ 'info-card__content--hidden': captionOverlay && card.image }">
              <h3 v-if="card.title && !(captionOverlay && card.image)" class="info-card__title" v-html="asHtml(getLocalizedValue(card.title))"></h3>
              <p v-if="card.description && !(captionOverlay && card.image)" class="info-card__description prose" v-html="asHtml(getLocalizedValue(card.description))"></p>
              <a
                v-if="card.socialUrl && !(captionOverlay && card.image)"
                :href="card.socialUrl"
                class="info-card__social-link"
                target="_blank"
                rel="noopener"
                aria-label="LinkedIn"
                @click.stop
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                  <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.44-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
                </svg>
              </a>
              <NuxtLink
                v-if="card.ctaText && card.ctaUrl"
                :to="card.ctaUrl"
                class="info-card__link"
              >
                {{ getLocalizedValue(card.ctaText) }}
                <svg class="info-card__link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </NuxtLink>
            </div>

            <span
              v-if="card.statusBadge"
              class="grid-block__badge"
              :class="`grid-block__badge--${card.statusBadge}`"
            >{{ card.statusBadge }}</span>
          </div>
        </div>
      </template>

      <!-- Feature style: icon + title + description + link -->
      <template v-else>
        <div
          v-for="(feature, index) in featureItems"
          :key="`feat-${index}`"
          data-target="item"
          :data-item-index="index"
          class="grid-block__feature"
        >
          <div
            v-if="feature.icon"
            class="grid-block__icon-wrap"
            aria-hidden="true"
          >
            <span class="material-icons-outlined">{{ feature.icon }}</span>
          </div>
          <h3 class="grid-block__feature-title" v-html="asHtml(getLocalizedValue(feature.title))"></h3>
          <p class="grid-block__feature-desc prose" v-html="asHtml(getLocalizedValue(feature.description))"></p>
          <NuxtLink
            v-if="feature.linkUrl && feature.linkText"
            :to="feature.linkUrl"
            class="grid-block__feature-link"
          >
            {{ getLocalizedValue(feature.linkText) }}
            <span class="material-icons-outlined grid-block__feature-link-arrow" aria-hidden="true">arrow_forward</span>
          </NuxtLink>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { resolveColumnOverride, resolveGapOverride } from '~/shared/features/cms/placement/responsiveColumns'
import { useTypographySlotStyle } from '~/shared/composables/useTypographySlotStyle'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'

const { getLocalizedValue, getLocalizedPlain } = useLocalized()
type CardHoverEffect = 'none' | 'lift' | 'scale' | 'overlay-reveal'
type CardStyle = 'card' | 'feature'

const RATIO_MAP: Record<string, string> = { '1-1': '1 / 1', '4-3': '4 / 3', '3-2': '3 / 2', '16-9': '16 / 9', '3-4': '3 / 4' }

interface CardData {
  type?: 'info-card'
  title?: string | Record<string, string>
  description?: string | Record<string, string>
  image?: string
  ctaText?: string | Record<string, string>
  ctaUrl?: string
  socialUrl?: string
  statusBadge?: string
  statusLabel?: string | Record<string, string>
  titleColor?: 'accent' | 'default'
  span?: '1x1' | '2x1' | '1x2' | '2x2'
}

interface FeatureItem {
  icon?: string
  title: string | Record<string, string>
  description?: string | Record<string, string>
  linkUrl?: string
  linkText?: string | Record<string, string>
}

interface RawCard {
  type: string
  settings?: Record<string, unknown>
  [key: string]: unknown
}

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  // Variant gate
  cardStyle?: CardStyle
  // Header (feature style)
  title?: string | Record<string, string>
  showTitle?: boolean
  subtitle?: string | Record<string, string>
  // Card-style props
  layoutMode?: 'grid' | 'gallery' | 'masonry' | 'list' | 'featured' | 'rows'
  cards?: Array<RawCard | CardData>
  cardHoverEffect?: CardHoverEffect
  captionOverlay?: boolean
  captionReveal?: 'always' | 'hover'
  captionPosition?: 'above' | 'below'
  captionAlign?: 'bottom-left' | 'bottom-right'
  imageHeight?: 'sm' | 'md' | 'lg' | 'xl' | 'portrait' | 'auto'
  imageRatio?: string
  enableLightbox?: boolean
  cardLinkPresetKey?: string | null
  // Feature-style props
  features?: FeatureItem[]
  accentColor?: string
  contentAlignH?: string
  itemLinkPresetKey?: string | null
  // Shared layout/style
  columns?: number
  columnsTablet?: string
  columnsMobile?: string
  gapTablet?: string
  gapMobile?: string
  gap?: number
  internalPadding?: string
  surfaceStyle?: string
  borderRadius?: string
  itemAlignX?: 'start' | 'center' | 'end' | 'stretch'
  itemAlignY?: 'start' | 'center' | 'end' | 'stretch'
  containerMode?: 'inherit' | 'wide' | 'full-bleed' | 'custom'
  containerMaxWidth?: string
  containerAlign?: 'start' | 'center' | 'end'
}>(), {
  cardStyle: 'card',
  showTitle: true,
  layoutMode: 'grid',
  columns: 3,
  gap: 24,
  cards: () => [],
  cardHoverEffect: 'none',
  captionOverlay: false,
  captionReveal: 'always',
  captionPosition: 'below',
  imageHeight: 'md',
  enableLightbox: false,
  containerMode: 'inherit',
  containerAlign: 'center',
  captionAlign: 'bottom-left',
  features: () => [],
})

const typographyStyle = useTypographySlotStyle({
  cardLink: computed(() => props.cardLinkPresetKey),
  itemLink: computed(() => props.itemLinkPresetKey),
})

const localizedTitle = computed(() => getLocalizedValue(props.title))
const localizedSubtitle = computed(() => getLocalizedValue(props.subtitle))

const cards = computed<CardData[]>(() =>
  (props.cards || []).map((raw) => {
    if (raw && typeof raw === 'object' && 'settings' in raw && raw.settings && typeof raw.settings === 'object') {
      return { type: (raw as RawCard).type as 'info-card', ...(raw.settings as Record<string, unknown>) } as CardData
    }
    return raw as CardData
  })
)

const featureItems = computed(() => props.features || [])

const cardHoverEffect = computed((): CardHoverEffect => props.cardHoverEffect || 'none')
const captionOverlay = computed(() => props.captionOverlay ?? false)

// ── Lightbox (opt-in) ────────────────────────────────────────────────────────
// Card images adopt the theme-level Lightbox via data-* attrs (event delegation —
// see Lightbox.vue); nothing is imported here. Every image-bearing card in this
// grid shares one per-instance group id, so ←/→ walks the whole grid in DOM =
// grid order while two grids on a page never merge. Cards WITHOUT an image emit
// no trigger and are simply absent from the group, so no parallel index
// bookkeeping is needed. Caveat inherited from Lightbox.resolveItem(): it locates
// the clicked slide by matching src, so if two cards reuse the SAME image the
// viewer opens the first of them. Harmless (same picture either way) and only
// fixable in Lightbox.vue; noted so the next reader doesn't chase it here.
// Card style only (the feature variant has no images), and never in the editor
// preview, where a click must keep selecting the block.
const renderMode = useRenderMode()
const lightboxGroup = `gb-${useId()}`
const lightboxActive = computed(
  () => (props.enableLightbox ?? false) && props.cardStyle === 'card' && renderMode.value !== 'editor-preview',
)

function cardHasLightbox(card: CardData): boolean {
  return lightboxActive.value && !!card.image
}

// Untitled cards must not read as "View image full screen: image"; drop the
// colon clause entirely rather than naming a title that isn't there.
function lightboxTriggerLabel(card: CardData): string {
  const title = getLocalizedPlain(card.title)
  return title ? `View image full screen: ${title}` : 'View image full screen'
}

const rootClasses = computed(() => {
  const c: Record<string, boolean> = {
    [`grid-block--style-${props.cardStyle}`]: true,
  }
  if (props.cardStyle === 'card') {
    c[`grid-block--layout-${props.layoutMode}`] = true
    if (cardHoverEffect.value !== 'none') c[`grid-block--hover-${cardHoverEffect.value}`] = true
    if (captionOverlay.value) {
      c['grid-block--caption-overlay'] = true
      c[`grid-block--caption-${props.captionAlign ?? 'bottom-left'}`] = true
      if (props.captionReveal === 'hover') c['grid-block--caption-reveal-hover'] = true
    }
    c[`grid-block--container-${props.containerMode}`] = true
    c[`grid-block--align-${props.containerAlign}`] = true
    if (lightboxActive.value) c['grid-block--lightbox'] = true
  }
  return c
})

const containerStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.cardStyle === 'card' && props.containerMode === 'custom' && props.containerMaxWidth) {
    style.maxWidth = props.containerMaxWidth
  }
  return style
})

const infoCardClasses = computed(() => ({
  'info-card--hover-lift': cardHoverEffect.value === 'lift',
  'info-card--hover-scale': cardHoverEffect.value === 'scale',
  'info-card--hover-overlay-reveal': cardHoverEffect.value === 'overlay-reveal',
  'info-card--caption-overlay': captionOverlay.value,
}))

const ratioActive = computed(() => props.cardStyle === 'card' && !!props.imageRatio && props.imageRatio !== 'off' && props.layoutMode !== 'masonry' && props.layoutMode !== 'featured' && !!RATIO_MAP[props.imageRatio!])

const imageWrapperClass = computed(() => {
  if (props.layoutMode === 'masonry') return ''
  if (ratioActive.value) return 'info-card__image-wrapper--ratio'
  return `info-card__image-wrapper--${props.imageHeight}`
})

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  if (props.surfaceStyle === 'subtle') {
    style.background = 'var(--section-surface)'
  } else if (props.surfaceStyle === 'filled') {
    style.background = 'var(--section-accent)'
  }
  return style
})

const sectionStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (props.cardStyle === 'feature' && props.accentColor) {
    styles['--feature-accent'] = props.accentColor
  }
  return styles
})

const gridStyles = computed(() => {
  const styles: Record<string, string | number> = {}
  // Per-breakpoint overrides: only emit a custom prop for a real numeric value.
  // 'auto'/undefined → null → prop stays unset and the CSS falls back to
  // exactly the current expression (byte-identical parity).
  const colsTablet = resolveColumnOverride(props.columnsTablet)
  const colsMobile = resolveColumnOverride(props.columnsMobile)
  const gapTablet = resolveGapOverride(props.gapTablet)
  const gapMobile = resolveGapOverride(props.gapMobile)
  if (props.cardStyle === 'card') {
    styles['--card-grid-columns'] = props.columns || 3
    // Use ?? not || so an explicit gap of 0 renders edge-to-edge (0 || 24 === 24).
    styles['--card-grid-gap'] = `${(props.gap ?? 24) / 10}rem`
    if (props.borderRadius && props.borderRadius !== 'none') {
      styles['--card-border-radius'] = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0'
    }
    if (colsTablet !== null) styles['--card-cols-tablet'] = String(colsTablet)
    if (colsMobile !== null) styles['--card-cols-mobile'] = String(colsMobile)
    if (gapTablet !== null) styles['--card-grid-gap-tablet'] = `${gapTablet / 10}rem`
    if (gapMobile !== null) styles['--card-grid-gap-mobile'] = `${gapMobile / 10}rem`
    if (ratioActive.value) styles['--card-image-ratio'] = RATIO_MAP[props.imageRatio!]
  } else {
    styles['--feature-cols'] = String(props.columns || 3)
    if (props.borderRadius && props.borderRadius !== 'none') {
      styles['--feature-item-radius'] = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0'
    }
    if (props.contentAlignH && props.contentAlignH !== 'left') {
      styles.textAlign = props.contentAlignH
    }
    if (colsTablet !== null) styles['--feature-cols-tablet'] = String(colsTablet)
    if (colsMobile !== null) styles['--feature-cols-mobile'] = String(colsMobile)
  }
  return styles
})

const gridAlignStyle = computed<Record<string, string>>(() => {
  const s: Record<string, string> = {}
  if (props.itemAlignX) s.justifyItems = props.itemAlignX
  if (props.itemAlignY) s.alignItems = props.itemAlignY
  return s
})
</script>

<style lang="scss" scoped>
.grid-block {
  padding: 0;

  // ── Feature-style header ───────────────────────────────────────────────
  &--style-feature {
    padding: var(--spacing-2xl) var(--spacing-md);

    @media (max-width: $bp-md) {
      padding: var(--spacing-xl) var(--spacing-md);
    }

    .grid-block__container {
      max-width: 120rem;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(var(--feature-cols, 3), 1fr);
      gap: var(--spacing-xl);

      @container (max-width: #{$bp-lg}) {
        grid-template-columns: repeat(var(--feature-cols-tablet, min(var(--feature-cols, 3), 2)), 1fr);
      }

      @container (max-width: #{$bp-md}) {
        grid-template-columns: repeat(var(--feature-cols-mobile, 1), 1fr);
      }
    }
  }

  &__header {
    text-align: center;
    margin-block-end: var(--spacing-2xl);
  }

  &__title {
    font-family: var(--rt-slot-sectionHeading-family, var(--rt-role-heading2-family, inherit));
    font-size: var(--rt-slot-sectionHeading-size, var(--rt-role-heading2-size, var(--font-size-3xl)));
    font-weight: var(--rt-slot-sectionHeading-weight, var(--rt-role-heading2-weight, var(--font-weight-bold)));
    line-height: var(--rt-slot-sectionHeading-line-height, var(--rt-role-heading2-line-height, inherit));
    letter-spacing: var(--rt-slot-sectionHeading-letter-spacing, var(--rt-role-heading2-letter-spacing, normal));
    text-transform: var(--rt-slot-sectionHeading-text-transform, var(--rt-role-heading2-text-transform, none));
    font-variation-settings: var(--rt-slot-sectionHeading-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-sectionHeading-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-sectionHeading-font-stretch, normal);
    font-style: var(--rt-slot-sectionHeading-font-style, normal);
    color: var(--rt-slot-sectionHeading-color, var(--rt-role-heading2-color, inherit));
    margin: 0 0 var(--spacing-sm);

    @media (max-width: $bp-md) {
      font-size: var(--rt-slot-sectionHeading-size, var(--rt-role-heading2-size, var(--font-size-2xl)));
    }
  }

  &__subtitle {
    font-family: var(--rt-slot-sectionSubtitle-family, var(--rt-role-lead-family, inherit));
    font-size: var(--rt-slot-sectionSubtitle-size, var(--rt-role-lead-size, var(--font-size-lg)));
    font-weight: var(--rt-slot-sectionSubtitle-weight, var(--rt-role-lead-weight, inherit));
    line-height: var(--rt-slot-sectionSubtitle-line-height, var(--rt-role-lead-line-height, inherit));
    letter-spacing: var(--rt-slot-sectionSubtitle-letter-spacing, var(--rt-role-lead-letter-spacing, normal));
    text-transform: var(--rt-slot-sectionSubtitle-text-transform, var(--rt-role-lead-text-transform, none));
    font-variation-settings: var(--rt-slot-sectionSubtitle-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-sectionSubtitle-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-sectionSubtitle-font-stretch, normal);
    font-style: var(--rt-slot-sectionSubtitle-font-style, normal);
    color: var(--rt-slot-sectionSubtitle-color, var(--rt-role-lead-color, var(--color-text-light)));
    margin: 0 auto;
    max-width: 60rem;
  }

  &__feature {
    text-align: center;
    padding: var(--spacing-lg) var(--spacing-md);
    border-radius: var(--feature-item-radius, 0);
  }

  &__icon-wrap {
    width: 6.4rem;
    height: 6.4rem;
    border-radius: var(--border-radius-lg);
    background: color-mix(in srgb, var(--feature-accent, var(--section-accent, var(--color-primary, #108A00))) 12%, transparent);
    color: var(--feature-accent, var(--section-accent, var(--color-primary, #108A00)));
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--spacing-md);

    .material-icons-outlined {
      font-size: var(--font-size-2xl);
    }
  }

  &__feature-title {
    font-family: var(--rt-slot-itemTitle-family, var(--rt-role-heading3-family, inherit));
    font-size: var(--rt-slot-itemTitle-size, var(--rt-role-heading3-size, var(--font-size-lg)));
    font-weight: var(--rt-slot-itemTitle-weight, var(--rt-role-heading3-weight, var(--font-weight-semibold)));
    line-height: var(--rt-slot-itemTitle-line-height, var(--rt-role-heading3-line-height, inherit));
    letter-spacing: var(--rt-slot-itemTitle-letter-spacing, var(--rt-role-heading3-letter-spacing, normal));
    text-transform: var(--rt-slot-itemTitle-text-transform, var(--rt-role-heading3-text-transform, none));
    font-variation-settings: var(--rt-slot-itemTitle-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-itemTitle-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-itemTitle-font-stretch, normal);
    font-style: var(--rt-slot-itemTitle-font-style, normal);
    color: var(--rt-slot-itemTitle-color, var(--rt-role-heading3-color, var(--color-text)));
    margin: 0 0 var(--spacing-xs);
  }

  &__feature-desc {
    font-family: var(--rt-slot-itemDescription-family, var(--rt-role-body-family, inherit));
    font-size: var(--rt-slot-itemDescription-size, var(--rt-role-body-size, var(--font-size-base)));
    font-weight: var(--rt-slot-itemDescription-weight, var(--rt-role-body-weight, inherit));
    line-height: var(--rt-slot-itemDescription-line-height, var(--rt-role-body-line-height, var(--line-height-relaxed)));
    letter-spacing: var(--rt-slot-itemDescription-letter-spacing, var(--rt-role-body-letter-spacing, normal));
    text-transform: var(--rt-slot-itemDescription-text-transform, var(--rt-role-body-text-transform, none));
    font-variation-settings: var(--rt-slot-itemDescription-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-itemDescription-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-itemDescription-font-stretch, normal);
    font-style: var(--rt-slot-itemDescription-font-style, normal);
    color: var(--rt-slot-itemDescription-color, var(--rt-role-body-color, var(--color-text-light)));
    margin: 0 0 var(--spacing-md);
  }

  &__feature-link {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-family: var(--rt-slot-itemLink-family, var(--rt-role-label-family, inherit));
    font-weight: var(--rt-slot-itemLink-weight, var(--rt-role-label-weight, var(--font-weight-medium)));
    font-size: var(--rt-slot-itemLink-size, var(--rt-role-label-size, var(--font-size-base)));
    line-height: var(--rt-slot-itemLink-line-height, var(--rt-role-label-line-height, inherit));
    letter-spacing: var(--rt-slot-itemLink-letter-spacing, var(--rt-role-label-letter-spacing, normal));
    text-transform: var(--rt-slot-itemLink-text-transform, var(--rt-role-label-text-transform, none));
    font-variation-settings: var(--rt-slot-itemLink-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-itemLink-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-itemLink-font-stretch, normal);
    font-style: var(--rt-slot-itemLink-font-style, normal);
    color: var(--rt-slot-itemLink-color, var(--rt-role-label-color, var(--feature-accent, var(--section-accent, var(--color-primary, #108A00)))));
    text-decoration: none;
    transition: gap var(--transition-base);

    &:hover {
      gap: var(--spacing-sm);
    }

    &:focus-visible {
      outline: 0.2rem solid var(--feature-accent, var(--section-accent, var(--color-primary, #108A00)));
      outline-offset: 0.2rem;
      border-radius: var(--border-radius);
    }
  }

  &__feature-link-arrow {
    font-size: var(--font-size-base);
  }

  // ── Card-style container & layouts ─────────────────────────────────────
  &--style-card &__container {
    max-width: var(--container-max-width);
  }

  &--container-wide &__container { max-width: max(var(--container-max-width, 1200px), 1400px); }
  &--container-full-bleed &__container { max-width: none; }
  &--container-custom &__container { /* maxWidth set inline */ }

  &--align-start &__container { margin-right: auto; margin-left: 0; }
  &--align-center &__container { margin-left: auto; margin-right: auto; }
  &--align-end &__container { margin-left: auto; margin-right: 0; }

  &--layout-grid &__container {
    display: grid;
    grid-template-columns: repeat(var(--card-grid-columns), 1fr);
    gap: var(--card-grid-gap);

    @container (max-width: 1200px) {
      grid-template-columns: repeat(var(--card-cols-tablet, min(var(--card-grid-columns), 2)), 1fr);
      gap: var(--card-grid-gap-tablet, var(--card-grid-gap));
    }

    @container (max-width: 768px) {
      grid-template-columns: repeat(var(--card-cols-mobile, 1), 1fr);
      gap: var(--card-grid-gap-mobile, var(--card-grid-gap));
    }
  }

  &--layout-list &__container {
    display: flex;
    flex-direction: column;
    gap: var(--card-grid-gap);
  }

  &--layout-gallery &__container {
    display: grid;
    grid-template-columns: repeat(var(--card-grid-columns), 1fr);
    gap: var(--card-grid-gap);

    @container (max-width: 1200px) {
      grid-template-columns: repeat(var(--card-cols-tablet, var(--card-grid-columns)), 1fr);
      gap: var(--card-grid-gap-tablet, var(--card-grid-gap));
    }

    @container (max-width: 768px) {
      grid-template-columns: repeat(var(--card-cols-mobile, 1), 1fr);
      gap: var(--card-grid-gap-mobile, var(--card-grid-gap));
    }
  }

  &--layout-gallery .info-card__content {
    padding: 1.2rem 0 0;
  }

  &--layout-gallery .info-card__title {
    font-size: 1.4rem;
    font-weight: 400;
    letter-spacing: 0;
    margin: 0;
  }

  &--layout-gallery .info-card__description {
    font-size: 1.2rem;
    margin: 0.4rem 0 0;
  }

  &--layout-gallery .info-card:hover {
    transform: none;
  }

  // Photo-wall overlay label: near-white ~18px name, lighter than the base 22px.
  // Scoped to gallery layout so other caption-overlay usages keep their sizing.
  &--layout-gallery .info-card__caption-title {
    font-size: 1.8rem;
    font-weight: 500;
    margin: 0;
  }

  &--layout-gallery .info-card__caption-description {
    font-size: 1.3rem;
    margin: 0.2rem 0 0;
  }

  &--layout-masonry &__container {
    display: grid;
    grid-template-columns: repeat(var(--card-grid-columns), 1fr);
    grid-auto-rows: 18rem;
    gap: var(--card-grid-gap);

    @container (max-width: 768px) {
      grid-template-columns: 1fr 1fr;
      grid-auto-rows: 16rem;
    }

    @container (max-width: 480px) {
      grid-template-columns: 1fr;
      grid-auto-rows: 20rem;
    }
  }

  .grid-block__item--span-2x1 {
    grid-column: span 2;
    @container (max-width: 480px) { grid-column: span 1; }
  }

  .grid-block__item--span-1x2 {
    grid-row: span 2;
  }

  .grid-block__item--span-2x2 {
    grid-column: span 2;
    grid-row: span 2;
    @container (max-width: 480px) { grid-column: span 1; }
  }

  &--layout-masonry .grid-block__item {
    position: relative;
    overflow: hidden;
    border-radius: var(--card-border-radius, 0);
  }

  &--layout-masonry .info-card {
    position: absolute;
    inset: 0;
  }

  &--layout-masonry .info-card__image-wrapper {
    position: absolute;
    inset: 0;
    height: auto;
  }

  &--layout-masonry .info-card__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &--layout-masonry .info-card__content {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 1.6rem;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
    color: #FFFFFF;
    z-index: 2;
  }

  &--layout-masonry .info-card__title {
    color: #FFFFFF;
    font-size: 1.4rem;
    margin: 0;
  }

  &--layout-masonry .info-card__description {
    color: rgba(255, 255, 255, 0.85);
    font-size: 1.2rem;
    margin: 0.4rem 0 0;
  }

  // ── Featured / asymmetric composition ──────────────────────────────────
  // Two smaller images stacked in the left column, one large image spanning
  // both rows on the right in an editorial layout. Images fill
  // their cells; captions ride ON the photo via the caption-overlay mechanism.
  &--layout-featured &__container {
    display: grid;
    grid-template-columns: 1fr 1.35fr;
    grid-template-rows: repeat(2, 30rem);
    gap: var(--card-grid-gap);

    @container (max-width: 768px) {
      grid-template-columns: 1fr;
      grid-template-rows: repeat(3, 26rem);
    }
  }

  &--layout-featured .grid-block__item {
    position: relative;
    overflow: hidden;
    border-radius: var(--card-border-radius, 0);
    min-height: 0;
  }

  // The 3rd card is the large right-hand feature spanning both rows.
  &--layout-featured .grid-block__item:nth-child(3) {
    grid-column: 2;
    grid-row: 1 / span 2;

    @container (max-width: 768px) {
      grid-column: 1;
      grid-row: auto;
    }
  }

  &--layout-featured .info-card,
  &--layout-featured .info-card__image-wrapper {
    position: absolute;
    inset: 0;
    height: auto;
  }

  &--layout-featured .info-card__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &--layout-featured .info-card:hover {
    transform: none;
  }

  // Left column captions sit bottom-left; the large feature caption bottom-right.
  &--layout-featured .info-card__caption-overlay {
    text-align: left;
    align-items: flex-start;
  }

  &--layout-featured .grid-block__item:nth-child(3) .info-card__caption-overlay {
    text-align: right;
    align-items: flex-end;
    padding-inline: 2.4rem;
  }

  // ── Feature Rows / alternating editorial zig-zag ───────────────────────
  // Full-width horizontal media rows: image one side, text the other, with
  // odd rows image-left / content-right and even rows swapped (image-right)
  // via grid `order`. Text stays LTR — only the image column moves. Collapses
  // to a uniform image-above-content stack under the 768px container query
  // (matching how grid/gallery/masonry collapse), with no zig-zag on mobile.
  &--layout-rows &__container {
    display: flex;
    flex-direction: column;
    gap: var(--card-grid-gap);
  }

  &--layout-rows .info-card {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: clamp(2rem, 4vw, 4.8rem);
    // Stretch so the image column fills the row height flush with the text
    // column (image-wrapper keeps object-fit:cover), even when copy runs tall.
    align-items: stretch;
  }

  &--layout-rows .info-card__image-wrapper {
    order: 0;
    height: 100%;
    min-height: 32rem;
  }

  // Even rows: push the image into the right column while content stays left.
  &--layout-rows .grid-block__item:nth-child(even) .info-card__image-wrapper {
    order: 2;
  }

  @container (max-width: 768px) {
    &--layout-rows .info-card {
      grid-template-columns: 1fr;
    }

    // Reset to a uniform image-above-content stack — no alternation on mobile.
    &--layout-rows .info-card__image-wrapper {
      order: 0 !important;
      min-height: 24rem;
    }
  }

  &__item {
    display: flex;
    flex-direction: column;
  }

  &__card {
    display: flex;
    flex-direction: column;
    height: 100%;
    transition: all var(--transition-base);
  }

  &__badge {
    position: absolute;
    top: var(--spacing-sm);
    right: var(--spacing-sm);
    display: inline-block;
    padding: 0.2rem 0.8rem;
    border-radius: 999px;
    font-size: var(--font-size-xs, 1.2rem);
    font-weight: var(--font-weight-semibold);
    background-color: var(--color-background-light, #e0e0e0);
    color: var(--color-text, #1C1C1C);
    z-index: 2;

    &--active {
      background-color: var(--color-info, #0071e3);
      color: #ffffff;
    }

    &--completed {
      background-color: var(--color-success, #34c759);
      color: #ffffff;
    }
  }
}

// Caption bottom-right variant: bold white text hugging the bottom-right of the
// photo, over a full-width bottom gradient scrim (NOT a grey badge/pill below it).
.grid-block--caption-bottom-right .info-card__caption-overlay {
  align-items: flex-end;
  text-align: right;
  padding: 3.2rem 1.6rem 1.6rem;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0) 100%);
}

.grid-block--caption-bottom-right .info-card__caption-title {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.3;
  max-width: 85%;
}

.grid-block--caption-bottom-right .info-card__caption-description {
  display: none;
}

// Hover-reveal captions (photo walls): captions hidden until hover on fine
// pointers; always visible on touch/coarse pointers where hover is unreliable.
.grid-block--caption-reveal-hover {
  @media (hover: hover) and (pointer: fine) {
    .info-card__caption-overlay {
      opacity: 0;
      transition: opacity var(--transition-base);
    }

    .info-card:hover .info-card__caption-overlay,
    .info-card:focus-within .info-card__caption-overlay {
      opacity: 1;
    }
  }
}

.info-card {
  position: relative;
  background-color: transparent;
  border: none;
  border-radius: var(--card-border-radius, 0);
  overflow: hidden;
  transition: all var(--transition-base);

  &:hover {
    box-shadow: none;
    transform: translateY(-0.2rem);
  }

  &--hover-lift {
    transition: transform 0.3s ease, box-shadow 0.3s ease;

    &:hover {
      transform: translateY(-0.4rem);
      box-shadow: 0 0.8rem 2.4rem rgba(0, 0, 0, 0.12);
    }

    @media (prefers-reduced-motion: reduce) {
      &:hover {
        transform: none;
        box-shadow: 0 0.4rem 1.2rem rgba(0, 0, 0, 0.08);
      }
    }
  }

  &--hover-scale {
    transition: transform 0.2s ease, box-shadow var(--transition-base);

    &:hover {
      transform: scale(1.03);
      box-shadow: var(--shadow-md);
    }
  }

  &--hover-overlay-reveal {
    &:hover {
      transform: none;
    }
  }

  &__overlay-reveal {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.7);
    color: #ffffff;
    padding: var(--spacing-md) var(--spacing-lg);
    transform: translateY(100%);
    transition: transform 0.25s ease;
    z-index: 2;

    .info-card--hover-overlay-reveal:hover & {
      transform: translateY(0);
    }

    // Lightbox mode only: this band is purely decorative (aria-hidden) but paints
    // above the trigger, so it would swallow clicks on the hovered bottom strip.
    .grid-block--lightbox & {
      pointer-events: none;
    }
  }

  &__overlay-reveal-title {
    display: block;
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-base);
  }

  &--caption-overlay {
    .info-card__image-wrapper {
      position: relative;
    }
  }

  &__caption-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 3.2rem var(--spacing-lg) var(--spacing-md);
    background: linear-gradient(to top, rgba(0, 0, 0, 0.65) 0%, transparent 100%);
    color: #ffffff;
    z-index: 2;

    // Lightbox mode only: the caption band sits above the trigger (z-index 2 vs 1)
    // and would otherwise eat clicks on the lower third of the photo. Let them fall
    // through to the trigger underneath; its own real links opt back in.
    .grid-block--lightbox & {
      pointer-events: none;
    }

    // Real interactives inside the caption opt back in. Widened beyond `a` so a
    // future button here does not silently lose its clicks in lightbox mode.
    .grid-block--lightbox & a,
    .grid-block--lightbox & button,
    .grid-block--lightbox & [role='button'] {
      pointer-events: auto;
    }
  }

  &__caption-title {
    font-size: var(--font-size-lg);
    font-weight: 700;
    margin: 0 0 var(--spacing-xs);
  }

  &__caption-description {
    font-size: var(--font-size-sm);
    margin: 0;
    opacity: 0.85;
  }

  &__content--hidden {
    display: none;
  }

  &__social-link {
    display: inline-flex;
    margin-top: 0.4rem;
    color: inherit;
    opacity: 0.85;
    transition: opacity var(--transition-base);

    &:hover {
      opacity: 1;
    }
  }

  &__image-wrapper {
    position: relative;
    width: 100%;
    height: 20rem;
    overflow: hidden;
    background-color: var(--color-background-light);
    border-radius: var(--card-border-radius, 0);

    &--sm { height: 16rem; }
    &--md { height: 20rem; }
    &--lg { height: 32rem; }
    &--xl { height: 48rem; }
    &--portrait { height: 60rem; }
    &--auto { height: auto; }

    &--ratio {
      height: auto;
      aspect-ratio: var(--card-image-ratio, 3 / 2);
    }

    @container (max-width: 768px) {
      &--portrait { height: 40rem; }
      &--xl { height: 36rem; }
    }
  }

  &__content--above {
    padding: 0 0 0.8rem;
  }

  // ── Lightbox trigger (opt-in) ──────────────────────────────────────────────
  // Only ever rendered when the block's Lightbox setting is on, so these rules
  // cannot affect the default output. Covers the photo, sits under the CTA pill /
  // status label / caption links (z-index 1 vs 2-3) so they keep their hit area.
  &__lightbox-trigger {
    position: absolute;
    inset: 0;
    z-index: 1;
    width: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    cursor: zoom-in;
    -webkit-appearance: none;
    appearance: none;

    &:focus-visible {
      outline: 0.3rem solid var(--color-accent, #1B8AB7);
      outline-offset: -0.3rem;
    }
  }

  &__zoom-hint {
    position: absolute;
    top: 1.2rem;
    right: 1.2rem;
    display: grid;
    place-items: center;
    width: 3.2rem;
    height: 3.2rem;
    border-radius: 50%;
    background: rgba(10, 12, 14, 0.55);
    backdrop-filter: blur(2px);
    color: #ffffff;
    opacity: 0;
    transform: scale(0.85);
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: none;

    svg {
      width: 1.6rem;
      height: 1.6rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  }

  &__lightbox-trigger:hover &__zoom-hint,
  &__lightbox-trigger:focus-visible &__zoom-hint {
    opacity: 1;
    transform: scale(1);
  }

  // Touch pointers never fire :hover, so the hint — the only cue that the photo
  // opens — would stay invisible forever there. Reveal it at rest instead. This is
  // a pointer-capability query, not a viewport/collapse decision (those live in TS).
  @media (hover: none) {
    &__zoom-hint {
      opacity: 1;
      transform: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &__zoom-hint {
      transition: none;
    }
  }

  &__pill-badge {
    position: absolute;
    bottom: 1.6rem;
    left: 1.6rem;
    display: inline-block;
    padding: 0.6rem 2rem;
    border-radius: 999px;
    background-color: var(--color-primary, #1B8AB7);
    color: #FFFFFF;
    font-size: 1.3rem;
    font-weight: 500;
    text-decoration: none;
    z-index: 3;
    transition: background-color 200ms;

    &:hover {
      background-color: var(--color-primary-light, #2a9cc8);
    }
  }

  &__status-label {
    position: absolute;
    bottom: 1.6rem;
    left: 1.6rem;
    display: inline-block;
    padding: 0.5rem 1.4rem;
    border-radius: 999px;
    background-color: var(--color-accent, #1B8AB7);
    color: #FFFFFF;
    font-size: 1.2rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    z-index: 3;
    pointer-events: none;
  }

  &__title--accent {
    color: var(--color-accent, #1B8AB7) !important;
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform var(--transition-base);

    .info-card:hover & {
      transform: scale(1.05);
    }
  }

  &__content {
    padding: var(--spacing-lg) 0;
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  &__title {
    font-family: var(--rt-slot-cardTitle-family, var(--rt-role-heading3-family, var(--font-family-heading, 'dm-serif-display', Georgia, serif)));
    font-size: var(--rt-slot-cardTitle-size, var(--rt-role-heading3-size, 2.0rem));
    font-weight: var(--rt-slot-cardTitle-weight, var(--rt-role-heading3-weight, 600));
    line-height: var(--rt-slot-cardTitle-line-height, var(--rt-role-heading3-line-height, 1.2));
    letter-spacing: var(--rt-slot-cardTitle-letter-spacing, var(--rt-role-heading3-letter-spacing, -0.02em));
    text-transform: var(--rt-slot-cardTitle-text-transform, var(--rt-role-heading3-text-transform, none));
    font-variation-settings: var(--rt-slot-cardTitle-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-cardTitle-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-cardTitle-font-stretch, normal);
    font-style: var(--rt-slot-cardTitle-font-style, normal);
    color: var(--rt-slot-cardTitle-color, var(--rt-role-heading3-color, var(--section-text, var(--color-text))));
    margin: 0 0 var(--spacing-sm);
  }

  &__description {
    font-family: var(--rt-slot-cardDescription-family, var(--rt-role-body-family, inherit));
    font-size: var(--rt-slot-cardDescription-size, var(--rt-role-body-size, 1.5rem));
    font-weight: var(--rt-slot-cardDescription-weight, var(--rt-role-body-weight, inherit));
    line-height: var(--rt-slot-cardDescription-line-height, var(--rt-role-body-line-height, 1.6));
    letter-spacing: var(--rt-slot-cardDescription-letter-spacing, var(--rt-role-body-letter-spacing, normal));
    text-transform: var(--rt-slot-cardDescription-text-transform, var(--rt-role-body-text-transform, none));
    font-variation-settings: var(--rt-slot-cardDescription-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-cardDescription-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-cardDescription-font-stretch, normal);
    font-style: var(--rt-slot-cardDescription-font-style, normal);
    color: var(--rt-slot-cardDescription-color, var(--rt-role-body-color, var(--section-text, var(--color-text-light))));
    opacity: 0.7;
    margin: 0 0 var(--spacing-md);
    flex: 1;
  }

  &__link {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-family: var(--rt-slot-cardLink-family, var(--rt-role-label-family, inherit));
    font-weight: var(--rt-slot-cardLink-weight, var(--rt-role-label-weight, var(--font-weight-semibold)));
    font-size: var(--rt-slot-cardLink-size, var(--rt-role-label-size, var(--font-size-base)));
    line-height: var(--rt-slot-cardLink-line-height, var(--rt-role-label-line-height, inherit));
    letter-spacing: var(--rt-slot-cardLink-letter-spacing, var(--rt-role-label-letter-spacing, normal));
    text-transform: var(--rt-slot-cardLink-text-transform, var(--rt-role-label-text-transform, none));
    font-variation-settings: var(--rt-slot-cardLink-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-cardLink-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-cardLink-font-stretch, normal);
    font-style: var(--rt-slot-cardLink-font-style, normal);
    color: var(--rt-slot-cardLink-color, var(--rt-role-label-color, var(--color-primary)));
    text-decoration: none;
    transition: all var(--transition-base);
    width: fit-content;

    &:hover {
      color: var(--color-primary-light);
      gap: var(--spacing-sm);
    }

    &:focus-visible {
      outline: 0.2rem solid var(--color-primary);
      outline-offset: 0.2rem;
      border-radius: var(--border-radius);
    }
  }

  &__link-icon {
    width: 1.6rem;
    height: 1.6rem;
    flex-shrink: 0;
    transition: transform var(--transition-base);

    .info-card__link:hover & {
      transform: translateX(0.4rem);
    }
  }

  // Touch-target sizing: enlarge interactive anchors to the 44px minimum
  // on coarse pointers (touch) without altering fine-pointer (mouse) layout.
  @media (pointer: coarse) {
    &__pill-badge {
      display: inline-flex;
      align-items: center;
      min-height: 4.4rem;
    }

    &__link {
      min-height: 4.4rem;
    }

    &__social-link {
      min-width: 4.4rem;
      min-height: 4.4rem;
      align-items: center;
    }
  }
}
</style>
