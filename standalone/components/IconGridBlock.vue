<template>
  <section class="icon-grid-block" :style="{ ...sectionStyles, ...typographyStyle }">
    <div class="icon-grid-block__container" :style="contentStyle">
      <div v-if="(title && showTitle) || (subtitle && showTitle)" class="icon-grid-block__header">
        <div v-if="title && showTitle" data-target="heading" class="icon-grid-block__title" v-html="asHtml(localizedTitle)"></div>
        <div v-if="subtitle && showTitle && itemKind === 'stat'" class="icon-grid-block__subtitle" v-html="asHtml(localizedSubtitle)"></div>
      </div>

      <!-- Stat variant -->
      <div
        v-if="itemKind === 'stat'"
        class="icon-grid-block__grid"
        :class="`icon-grid-block__grid--cols-${statItems.length}`"
      >
        <div
          v-for="(stat, index) in statItems"
          :key="index"
          data-target="item"
          :data-item-index="index"
          class="icon-grid-block__item icon-grid-block__item--stat"
        >
          <span
            v-if="stat.icon"
            class="material-icons-outlined icon-grid-block__icon"
            aria-hidden="true"
          >
            {{ stat.icon }}
          </span>
          <div class="icon-grid-block__value">
            <span v-if="stat.prefix" class="icon-grid-block__affix">{{ stat.prefix }}</span>
            <span v-html="asHtml(stat.value)"></span>
            <span v-if="stat.suffix" class="icon-grid-block__affix">{{ stat.suffix }}</span>
          </div>
          <div class="icon-grid-block__label" v-html="asHtml(getLocalizedValue(stat.label))"></div>
        </div>
      </div>

      <!-- Logo variant — grid -->
      <div
        v-else-if="logoVariant === 'grid'"
        class="icon-grid-block__logos icon-grid-block__logos--grid"
      >
        <component
          :is="logo.linkUrl ? (isExternalUrl(logo.linkUrl) ? 'a' : 'NuxtLink') : 'div'"
          v-for="(logo, index) in logoItems"
          :key="index"
          v-bind="logo.linkUrl
            ? (isExternalUrl(logo.linkUrl)
              ? { href: logo.linkUrl, target: '_blank', rel: 'noopener noreferrer' }
              : { to: logo.linkUrl })
            : {}"
          data-target="item"
          :data-item-index="index"
          class="icon-grid-block__item icon-grid-block__item--logo"
          :class="{ 'icon-grid-block__item--grayscale': grayscale }"
        >
          <img
            v-if="logo.image"
            :src="logo.image"
            :alt="logo.alt || 'Partner logo'"
            class="icon-grid-block__logo"
          />
          <span v-else class="icon-grid-block__placeholder">{{ logo.alt || 'Logo' }}</span>
        </component>
      </div>

      <!-- Logo variant — scrolling marquee -->
      <div
        v-else
        class="icon-grid-block__logos icon-grid-block__logos--marquee"
        aria-label="Partner logos"
        @mouseenter="onMarqueeEnter"
        @mouseleave="onMarqueeLeave"
      >
        <div
          class="icon-grid-block__track"
          :class="{ 'icon-grid-block__track--grayscale': grayscale }"
          :style="{ animationPlayState: marqueePaused || isReducedMotion ? 'paused' : 'running' }"
        >
          <template v-for="repeat in 2" :key="repeat">
            <div
              v-for="(logo, index) in logoItems"
              :key="`${repeat}-${index}`"
              class="icon-grid-block__marquee-item"
              :aria-hidden="repeat === 2 ? 'true' : undefined"
            >
              <img
                v-if="logo.image"
                :src="logo.image"
                :alt="logo.alt || 'Partner logo'"
                class="icon-grid-block__logo"
              />
              <span v-else class="icon-grid-block__placeholder">{{ logo.alt || 'Logo' }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BackgroundRole, TextRole } from '~/shared/types/placement'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { useBlockSurface } from '~/shared/composables/useBlockSurface'
import { useTypographySlotStyle } from '~/shared/composables/useTypographySlotStyle'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'

const { getLocalizedValue } = useLocalized()
interface StatItem {
  value: string
  label: string | Record<string, string>
  icon?: string
  prefix?: string
  suffix?: string
}

interface LogoItem {
  image?: string
  alt?: string
  linkUrl?: string
}

type SurfaceStyle = 'none' | 'subtle' | 'filled'
type ItemKind = 'stat' | 'logo'
type LogoVariant = 'grid' | 'scroll'

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  blocks?: Array<Record<string, unknown>>
  // Variant gate
  itemKind?: ItemKind
  // Shared
  title?: string | Record<string, string>
  showTitle?: boolean
  subtitle?: string | Record<string, string>
  // Stat variant
  stats?: StatItem[]
  accentColor?: string
  // Logo variant
  logos?: LogoItem[]
  logoVariant?: LogoVariant
  grayscale?: boolean
  pauseOnHover?: boolean
  // Appearance
  surfaceStyle?: SurfaceStyle
  textTone?: TextRole
  internalPadding?: string
  borderRadius?: string
  contentAlignH?: string
  background?: BackgroundRole
  // Typography slot keys
  titlePresetKey?: string | null
}>(), {
  itemKind: 'stat',
  stats: () => [],
  logos: () => [],
  logoVariant: 'grid',
  grayscale: true,
  pauseOnHover: true,
  showTitle: true,
  surfaceStyle: 'none',
  internalPadding: 'md',
  borderRadius: 'none',
  contentAlignH: 'left',
})

const { surfaceStyle: blockSurfaceStyle } = useBlockSurface(props, { fallbackBackground: 'section' })

const typographyStyle = useTypographySlotStyle({
  title: computed(() => props.titlePresetKey),
})

const { isReducedMotion } = useReducedMotion()
const marqueePaused = ref(false)

function onMarqueeEnter() {
  if (props.pauseOnHover) marqueePaused.value = true
}
function onMarqueeLeave() {
  if (props.pauseOnHover) marqueePaused.value = false
}

function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}

const localizedTitle = computed(() => getLocalizedValue(props.title))
const localizedSubtitle = computed(() => getLocalizedValue(props.subtitle))
const statItems = computed(() => props.stats || [])
const logoItems = computed(() => props.logos || [])

const sectionStyles = computed(() => {
  // The color role paints first; the `surfaceStyle` appearance prop still wins
  // over it, exactly as it did when the legacy bgMode chain ran ahead of it.
  const styles: Record<string, string> = { ...blockSurfaceStyle.value }
  if (props.surfaceStyle === 'subtle') {
    styles.backgroundColor = 'var(--color-background-light, rgba(0,0,0,0.04))'
  } else if (props.surfaceStyle === 'filled') {
    styles.backgroundColor = 'var(--section-bg, var(--color-background))'
  }
  if (props.textTone === undefined) {
    styles.color = 'var(--section-text, var(--color-text))'
  }
  if (props.accentColor) styles['--icon-grid-accent-color'] = props.accentColor
  if (props.borderRadius && props.borderRadius !== 'none') {
    styles['--icon-grid-item-radius'] = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0'
  }
  return styles
})

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
  return style
})

</script>

<style lang="scss" scoped>
.icon-grid-block {
  padding: var(--spacing-2xl) var(--spacing-md);

  @media (max-width: $bp-md) {
    padding: var(--spacing-xl) var(--spacing-md);
  }

  &__container {
    max-width: var(--container-max-width, 120rem);
    margin: 0 auto;
  }

  &__header {
    text-align: center;
    margin-block-end: var(--spacing-2xl);
  }

  &__title {
    font-family: var(--rt-slot-heading-family, var(--rt-slot-title-family, var(--rt-role-heading2-family, inherit)));
    font-size: var(--rt-slot-heading-size, var(--rt-slot-title-size, var(--rt-role-heading2-size, var(--font-size-3xl))));
    font-weight: var(--rt-slot-heading-weight, var(--rt-slot-title-weight, var(--rt-role-heading2-weight, var(--font-weight-bold))));
    line-height: var(--rt-slot-heading-line-height, var(--rt-slot-title-line-height, var(--rt-role-heading2-line-height, var(--line-height-tight))));
    letter-spacing: var(--rt-slot-heading-letter-spacing, var(--rt-slot-title-letter-spacing, var(--rt-role-heading2-letter-spacing, normal)));
    text-transform: var(--rt-slot-heading-text-transform, var(--rt-slot-title-text-transform, var(--rt-role-heading2-text-transform, none)));
    color: var(--rt-slot-heading-color, var(--rt-slot-title-color, var(--rt-role-heading2-color, inherit)));
    margin: 0 0 var(--spacing-sm);

    @media (max-width: $bp-md) {
      font-size: var(--rt-slot-heading-size, var(--rt-slot-title-size, var(--rt-role-heading2-size, var(--font-size-2xl))));
    }
  }

  &__subtitle {
    font-family: var(--rt-slot-subtitle-family, var(--rt-role-lead-family, inherit));
    font-size: var(--rt-slot-subtitle-size, var(--rt-role-lead-size, var(--font-size-lg)));
    font-weight: var(--rt-slot-subtitle-weight, var(--rt-role-lead-weight, inherit));
    line-height: var(--rt-slot-subtitle-line-height, var(--rt-role-lead-line-height, inherit));
    letter-spacing: var(--rt-slot-subtitle-letter-spacing, var(--rt-role-lead-letter-spacing, normal));
    text-transform: var(--rt-slot-subtitle-text-transform, var(--rt-role-lead-text-transform, none));
    color: var(--rt-slot-subtitle-color, var(--rt-role-lead-color, inherit));
    opacity: 0.75;
    margin: 0 auto;
    max-width: 60rem;
  }

  // Stat grid
  &__grid {
    display: grid;
    gap: var(--spacing-xl);

    &--cols-2 { grid-template-columns: repeat(2, 1fr); }
    &--cols-3 { grid-template-columns: repeat(3, 1fr); }
    &--cols-4 { grid-template-columns: repeat(4, 1fr); }
    &--cols-5 { grid-template-columns: repeat(5, 1fr); }
    &--cols-6 { grid-template-columns: repeat(3, 1fr); }

    @media (max-width: $bp-md) {
      grid-template-columns: repeat(2, 1fr);
    }

    @media (max-width: $bp-sm) {
      grid-template-columns: 1fr;
    }
  }

  &__item {
    border-radius: var(--icon-grid-item-radius, 0);

    &--stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: var(--spacing-xl) var(--spacing-md);
    }

    &--logo {
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      transition: all var(--transition-base);
    }

    &--grayscale {
      filter: grayscale(100%);
      opacity: 0.6;

      &:hover {
        filter: grayscale(0%);
        opacity: 1;
      }
    }
  }

  &__icon {
    font-size: var(--font-size-3xl);
    margin-block-end: var(--spacing-sm);
    color: var(--icon-grid-accent-color, var(--section-accent, var(--color-primary, #108A00)));
  }

  &__value {
    font-family: var(--rt-slot-value-family, var(--rt-role-heading2-family, var(--font-family-heading, 'dm-serif-display', Georgia, serif)));
    font-size: var(--rt-slot-value-size, var(--rt-role-heading2-size, var(--font-size-4xl)));
    font-weight: var(--rt-slot-value-weight, var(--rt-role-heading2-weight, var(--font-weight-semibold)));
    line-height: var(--rt-slot-value-line-height, var(--rt-role-heading2-line-height, 1));
    letter-spacing: var(--rt-slot-value-letter-spacing, var(--rt-role-heading2-letter-spacing, -0.03em));
    text-transform: var(--rt-slot-value-text-transform, var(--rt-role-heading2-text-transform, none));
    color: var(--rt-slot-value-color, var(--rt-role-heading2-color, var(--icon-grid-accent-color, var(--section-accent, var(--color-primary, #108A00)))));
    margin-block-end: var(--spacing-sm);

    @media (max-width: $bp-md) {
      font-size: var(--rt-slot-value-size, var(--rt-role-heading2-size, var(--font-size-3xl)));
    }
  }

  &__affix {
    font-family: inherit;
    font-size: 0.7em;
    font-weight: inherit;
    opacity: 0.85;
  }

  &__label {
    font-family: var(--rt-slot-label-family, var(--rt-role-label-family, inherit));
    font-size: var(--rt-slot-label-size, var(--rt-role-label-size, 1.3rem));
    font-weight: var(--rt-slot-label-weight, var(--rt-role-label-weight, var(--font-weight-medium)));
    line-height: var(--rt-slot-label-line-height, var(--rt-role-label-line-height, inherit));
    letter-spacing: var(--rt-slot-label-letter-spacing, var(--rt-role-label-letter-spacing, 0.08em));
    text-transform: var(--rt-slot-label-text-transform, var(--rt-role-label-text-transform, uppercase));
    color: var(--rt-slot-label-color, var(--rt-role-label-color, inherit));
    opacity: 0.6;
  }

  // Logo grid
  &__logos--grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: var(--spacing-xl);
  }

  &__logo {
    max-height: 4.8rem;
    max-width: 14rem;
    object-fit: contain;
  }

  &__placeholder {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xs) var(--spacing-md);
    background: var(--color-background-light);
    border-radius: var(--icon-grid-item-radius, var(--border-radius));
    font-size: var(--font-size-sm);
    color: var(--color-text-lighter);
    font-weight: var(--font-weight-medium);
  }

  // Logo marquee
  &__logos--marquee {
    overflow: hidden;
    position: relative;

    &::before,
    &::after {
      content: '';
      position: absolute;
      inset-block: 0;
      width: 8rem;
      z-index: 1;
    }

    &::before {
      inset-inline-start: 0;
      background: linear-gradient(to right, var(--color-background, #fff), transparent);
    }

    &::after {
      inset-inline-end: 0;
      background: linear-gradient(to left, var(--color-background, #fff), transparent);
    }
  }

  &__track {
    display: flex;
    align-items: center;
    gap: var(--spacing-2xl);
    animation: icon-grid-marquee 30s linear infinite;

    &--grayscale {
      filter: grayscale(100%);
      opacity: 0.6;
    }
  }

  &__marquee-item {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }
}

@keyframes icon-grid-marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

@media (prefers-reduced-motion: reduce) {
  .icon-grid-block__track {
    animation: none !important;
  }
}
</style>
