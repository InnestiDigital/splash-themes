<template>
  <component
    :is="link ? 'a' : 'div'"
    :href="link || undefined"
    class="case-study-card"
    :class="cardClasses"
    :style="{ ...cardStyles, ...typographyStyle }"
    data-target="root"
  >
    <div v-if="media" class="case-study-card__media" data-target="media">
      <img :src="media" :alt="localizedMediaAlt" class="case-study-card__image" />
    </div>

    <div class="case-study-card__content" :style="contentStyle">
      <div v-if="localizedTags.length" class="case-study-card__tags">
        <span
          v-for="(tag, index) in localizedTags"
          :key="index"
          class="case-study-card__tag"
          data-target="tags"
        >
          {{ tag }}
        </span>
      </div>

      <h3 v-if="localizedHeading" class="case-study-card__heading" data-target="heading" v-html="asHtml(localizedHeading)"></h3>

      <div
        v-if="localizedBody"
        class="case-study-card__body prose"
        data-target="body"
        v-html="localizedBody"
      />

      <span v-if="link && localizedLinkText" class="case-study-card__link">
        {{ localizedLinkText }}
      </span>
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BackgroundRole, TextRole } from '~/shared/types/placement'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { useBlockSurface } from '~/shared/composables/useBlockSurface'
import { useTypographySlotStyle } from '~/shared/composables/useTypographySlotStyle'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'

const { getLocalizedValue } = useLocalized()
type MediaSide = 'left' | 'right' | 'above'
type HoverEffect = 'none' | 'lift' | 'depth'

interface TagItem {
  label?: string | Record<string, string>
}

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  blocks?: Array<Record<string, unknown>>
  heading?: string | Record<string, string>
  body?: string | Record<string, string>
  media?: string
  mediaAlt?: string | Record<string, string>
  tags?: TagItem[]
  link?: string
  linkText?: string | Record<string, string>
  background?: BackgroundRole
  textTone?: TextRole
  mediaSide?: MediaSide
  hoverEffect?: HoverEffect
  internalPadding?: string
  textAlign?: string
  surfaceStyle?: 'none' | 'subtle' | 'filled'
  borderRadius?: string
  bodyPresetKey?: string | null
  tagPresetKey?: string | null
  linkPresetKey?: string | null
}>(), {
  mediaSide: 'above',
  hoverEffect: 'lift',
  internalPadding: 'md',
  textAlign: 'left',
  surfaceStyle: 'none',
  borderRadius: 'none',
})

const typographyStyle = useTypographySlotStyle({
  body: computed(() => props.bodyPresetKey),
  tag: computed(() => props.tagPresetKey),
  link: computed(() => props.linkPresetKey),
})

const localizedHeading = computed(() => getLocalizedValue(props.heading))
const localizedBody = computed(() => getLocalizedValue(props.body))
const localizedMediaAlt = computed(() => getLocalizedValue(props.mediaAlt))
const localizedLinkText = computed(() => getLocalizedValue(props.linkText))

const localizedTags = computed(() => {
  if (!props.tags || props.tags.length === 0) return []
  return props.tags
    .map(tag => getLocalizedValue(tag.label))
    .filter(label => label.length > 0)
})

const mediaSide = computed((): MediaSide => props.mediaSide || 'above')
const hoverEffect = computed((): HoverEffect => props.hoverEffect || 'lift')

const cardClasses = computed(() => {
  const classes: string[] = []
  classes.push(`case-study-card--media-${mediaSide.value}`)
  if (hoverEffect.value !== 'none') {
    classes.push(`case-study-card--hover-${hoverEffect.value}`)
  }
  if (props.link) {
    classes.push('case-study-card--linked')
  }
  return classes
})

const { surfaceStyle: blockSurfaceStyle } = useBlockSurface(props, { fallbackBackground: 'section' })

const cardStyles = computed(() => {
  const styles: Record<string, string> = {}
  Object.assign(styles, blockSurfaceStyle.value)
  // A subtle/filled surface treatment paints its own fill in place of the
  // plain section background (unchanged from the legacy chain).
  if ((props.background ?? 'section') === 'section' && (props.surfaceStyle === 'subtle' || props.surfaceStyle === 'filled')) {
    delete styles.backgroundColor
    styles.background = props.surfaceStyle === 'subtle'
      ? 'var(--section-surface, rgba(255,255,255,0.04))'
      : 'var(--section-accent, rgba(255,255,255,0.1))'
  }
  if (props.borderRadius && props.borderRadius !== 'none') {
    styles.borderRadius = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0'
  }
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

</script>

<style lang="scss" scoped>
.case-study-card {
  display: flex;
  flex-direction: column;
  border-radius: var(--border-radius-lg, 8px);
  overflow: hidden;
  background: var(--color-background-light, #f5f5f5);
  color: var(--section-text, var(--color-text, #1C1C1C));
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  text-decoration: none;
  height: 100%;
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.1));

  &--linked {
    cursor: pointer;
  }

  // Media position variants
  &--media-above {
    flex-direction: column;
  }

  &--media-left {
    flex-direction: row;

    .case-study-card__media {
      width: 40%;
      flex-shrink: 0;
    }
  }

  &--media-right {
    flex-direction: row-reverse;

    .case-study-card__media {
      width: 40%;
      flex-shrink: 0;
    }
  }

  // Hover effects
  &--hover-lift:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.15));
  }

  &--hover-depth:hover {
    transform: scale(1.02);
    box-shadow: var(--shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.2));
  }

  &__media {
    overflow: hidden;
    position: relative;
    min-height: 200px;
  }

  &--media-above &__media {
    width: 100%;
    height: 220px;
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.3s ease;
  }

  &__content {
    padding: var(--spacing-lg, 24px);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm, 8px);
    flex-grow: 1;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs, 4px);
  }

  &__tag {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 999px;
    font-family: var(--rt-slot-tag-family, var(--rt-role-label-family, inherit));
    font-size: var(--rt-slot-tag-size, var(--rt-role-label-size, var(--font-size-sm, 13px)));
    font-weight: var(--rt-slot-tag-weight, var(--rt-role-label-weight, inherit));
    line-height: var(--rt-slot-tag-line-height, var(--rt-role-label-line-height, 1.6));
    letter-spacing: var(--rt-slot-tag-letter-spacing, var(--rt-role-label-letter-spacing, normal));
    text-transform: var(--rt-slot-tag-text-transform, var(--rt-role-label-text-transform, none));
    background: var(--color-primary, #108A00);
    color: var(--rt-slot-tag-color, var(--rt-role-label-color, var(--color-background, #FFFFFF)));
    white-space: nowrap;
  }

  &__heading {
    margin: 0;
    font-family: var(--rt-slot-heading-family, var(--rt-role-heading3-family, var(--font-family-heading)));
    font-size: var(--rt-slot-heading-size, var(--rt-role-heading3-size, var(--font-size-xl, 24px)));
    font-weight: var(--rt-slot-heading-weight, var(--rt-role-heading3-weight, var(--font-weight-bold, 700)));
    line-height: var(--rt-slot-heading-line-height, var(--rt-role-heading3-line-height, var(--line-height-tight, 1.2)));
    letter-spacing: var(--rt-slot-heading-letter-spacing, var(--rt-role-heading3-letter-spacing, normal));
    text-transform: var(--rt-slot-heading-text-transform, var(--rt-role-heading3-text-transform, none));
    color: var(--rt-slot-heading-color, var(--rt-role-heading3-color, inherit));
  }

  &__body {
    font-family: var(--rt-slot-body-family, var(--rt-role-body-family, inherit));
    font-size: var(--rt-slot-body-size, var(--rt-role-body-size, var(--font-size-base, 15px)));
    font-weight: var(--rt-slot-body-weight, var(--rt-role-body-weight, inherit));
    line-height: var(--rt-slot-body-line-height, var(--rt-role-body-line-height, var(--line-height-base, 1.5)));
    letter-spacing: var(--rt-slot-body-letter-spacing, var(--rt-role-body-letter-spacing, normal));
    text-transform: var(--rt-slot-body-text-transform, var(--rt-role-body-text-transform, none));
    color: var(--rt-slot-body-color, var(--rt-role-body-color, inherit));
    opacity: 0.9;

    :deep(p) {
      margin: 0 0 0.5em;
    }
  }

  &__link {
    display: inline-block;
    margin-top: auto;
    padding-top: var(--spacing-sm, 8px);
    font-family: var(--rt-slot-link-family, var(--rt-role-label-family, inherit));
    font-weight: var(--rt-slot-link-weight, var(--rt-role-label-weight, var(--font-weight-semibold, 600)));
    font-size: var(--rt-slot-link-size, var(--rt-role-label-size, var(--font-size-base, 15px)));
    line-height: var(--rt-slot-link-line-height, var(--rt-role-label-line-height, inherit));
    letter-spacing: var(--rt-slot-link-letter-spacing, var(--rt-role-label-letter-spacing, normal));
    text-transform: var(--rt-slot-link-text-transform, var(--rt-role-label-text-transform, none));
    color: var(--rt-slot-link-color, var(--rt-role-label-color, var(--color-primary, #108A00)));
  }
}

@media (max-width: $bp-md) {
  .case-study-card {
    &--media-left,
    &--media-right {
      flex-direction: column;

      .case-study-card__media {
        width: 100%;
        height: 200px;
      }
    }
  }
}
</style>
