<template>
  <section
    class="chapter-divider"
    :class="[heightClass, alignmentClass]"
    :style="rootStyles"
    data-target="root"
  >
    <div
      v-if="backgroundImage"
      class="chapter-divider__background"
      data-target="background"
      :style="backgroundStyles"
    />
    <div
      v-if="backgroundImage"
      class="chapter-divider__overlay"
      :style="overlayStyles"
    />
    <div class="chapter-divider__content" :style="contentStyle">
      <div
        v-if="accentStyle !== 'none'"
        class="chapter-divider__accent"
        data-target="accent"
      >
        <hr v-if="accentStyle === 'line'" class="chapter-divider__line" />
        <span v-else-if="accentStyle === 'dot'" class="chapter-divider__dot" />
        <span v-else-if="accentStyle === 'number' && (chapterNumber || chapterNumber === 0)" class="chapter-divider__number">
          {{ chapterNumber }}
        </span>
      </div>
      <span
        v-if="localizedEyebrow"
        class="block-eyebrow"
        data-target="eyebrow"
        v-html="asHtml(localizedEyebrow)"
      ></span>
      <h2
        v-if="localizedHeading"
        class="chapter-divider__heading"
        data-target="heading"
        v-html="asHtml(localizedHeading)"
      ></h2>
      <p
        v-if="localizedSubtitle"
        class="chapter-divider__subtitle"
        data-target="subheading"
        v-html="asHtml(localizedSubtitle)"
      ></p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BackgroundRole, TextRole } from '~/shared/types/placement'
import { SPACING_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { asHtml } from '~/shared/utils/asHtml'
import { useBlockSurface } from '~/shared/composables/useBlockSurface'
import { useLocalized } from '~/shared/composables/useLocalized'

const { getLocalizedValue } = useLocalized()
type AccentStyle = 'line' | 'dot' | 'number' | 'none'
type TextAlign = 'left' | 'center' | 'right'
type Height = 'full-viewport' | 'auto'

const props = defineProps<{
  eyebrow?: string | Record<string, string>
  heading?: string | Record<string, string>
  subtitle?: string | Record<string, string>
  accentStyle?: AccentStyle
  background?: BackgroundRole
  backgroundImage?: string
  textTone?: TextRole
  textAlign?: TextAlign
  height?: Height
  overlayOpacity?: number
  chapterNumber?: number
  internalPadding?: string
}>()

const localizedEyebrow = computed(() => getLocalizedValue(props.eyebrow))
const localizedHeading = computed(() => getLocalizedValue(props.heading))
const localizedSubtitle = computed(() => getLocalizedValue(props.subtitle))

const accentStyle = computed((): AccentStyle => props.accentStyle || 'line')
const height = computed((): Height => props.height || 'auto')
// Null when block has no explicit alignment — preset/role typography wins.
const textAlign = computed<TextAlign | null>(() => props.textAlign || null)

const heightClass = computed(() =>
  height.value === 'full-viewport' ? 'chapter-divider--full-viewport' : 'chapter-divider--auto'
)

const alignmentClass = computed(() => textAlign.value ? `chapter-divider--align-${textAlign.value}` : null)

const { surfaceStyle } = useBlockSurface(props, { fallbackBackground: 'transparent' })

const rootStyles = computed(() => {
  const styles: Record<string, string> = {}
  Object.assign(styles, surfaceStyle.value)
  return styles
})

const backgroundStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (props.backgroundImage) {
    styles.backgroundImage = `url(${props.backgroundImage})`
  }
  return styles
})

const overlayStyles = computed(() => {
  const opacity = props.overlayOpacity ?? 0.5
  return { opacity: String(opacity) }
})

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  return style
})

</script>

<style lang="scss" scoped>
.chapter-divider {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  &--full-viewport {
    min-height: 100vh;
  }

  &--auto {
    padding: 8rem 2rem;
  }

  &--align-left {
    text-align: left;
  }

  &--align-center {
    text-align: center;
  }

  &--align-right {
    text-align: right;
  }

  &__background {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    z-index: 0;
  }

  &__overlay {
    position: absolute;
    inset: 0;
    background-color: #000;
    z-index: 1;
  }

  &__content {
    position: relative;
    z-index: 2;
    padding: 2rem;
    max-width: 900px;
    width: 100%;
  }

  &__accent {
    margin-bottom: 2rem;
  }

  &__line {
    border: none;
    width: 80px;
    height: 3px;
    background-color: var(--motion-accent, currentColor);
    opacity: 0.75;
    margin: 0 auto;

    .chapter-divider--align-left & {
      margin-left: 0;
    }

    .chapter-divider--align-right & {
      margin-right: 0;
      margin-left: auto;
    }
  }

  &__dot {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: var(--motion-accent, currentColor);
    opacity: 0.75;
  }

  &__number {
    font-family: var(--font-family-heading);
    font-size: 6rem;
    font-weight: var(--font-weight-medium);
    line-height: 1;
    color: var(--motion-accent, var(--section-text-faint, inherit));
  }

  &__heading {
    font-family: var(--rt-slot-heading-family, var(--rt-role-heading2-family, var(--font-family-heading)));
    font-size: var(--rt-slot-heading-size, var(--rt-role-heading2-size, clamp(2.5rem, 5vw, 4.5rem)));
    font-weight: var(--rt-slot-heading-weight, var(--rt-role-heading2-weight, var(--font-weight-medium)));
    line-height: var(--rt-slot-heading-line-height, var(--rt-role-heading2-line-height, 1.1));
    letter-spacing: var(--rt-slot-heading-letter-spacing, var(--rt-role-heading2-letter-spacing, normal));
    text-transform: var(--rt-slot-heading-text-transform, var(--rt-role-heading2-text-transform, none));
    font-variation-settings: var(--rt-slot-heading-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-heading-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-heading-font-stretch, normal);
    font-style: var(--rt-slot-heading-font-style, normal);
    color: var(--rt-slot-heading-color, var(--rt-role-heading2-color, inherit));
    margin: 0 0 1rem;
    clip-path: inset(0 calc(100% - var(--motion-reveal, 100%)) 0 0);
  }

  &__subtitle {
    font-family: var(--rt-slot-subheading-family, var(--rt-role-heading3-family, inherit));
    font-size: var(--rt-slot-subheading-size, var(--rt-role-heading3-size, var(--font-size-xl)));
    font-weight: var(--rt-slot-subheading-weight, var(--rt-role-heading3-weight, 300));
    line-height: var(--rt-slot-subheading-line-height, var(--rt-role-heading3-line-height, 1.4));
    letter-spacing: var(--rt-slot-subheading-letter-spacing, var(--rt-role-heading3-letter-spacing, normal));
    font-variation-settings: var(--rt-slot-subheading-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-subheading-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-subheading-font-stretch, normal);
    font-style: var(--rt-slot-subheading-font-style, normal);
    color: var(--rt-slot-subheading-color, var(--rt-role-heading3-color, var(--section-text-muted, inherit)));
    margin: 0;
  }
}
</style>
