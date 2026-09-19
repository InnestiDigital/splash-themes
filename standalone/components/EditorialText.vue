<template>
  <section class="editorial-text" :style="{ ...rootStyles, ...measureStyle }">
    <div class="editorial-text__container" :style="{ ...containerStyles, ...contentStyle }">
      <span
        v-if="localizedEyebrow"
        class="block-eyebrow"
        data-target="eyebrow"
        v-html="asHtml(localizedEyebrow)"
      />
      <div v-if="heading" class="editorial-text__heading" data-target="heading">
        <h2 v-html="asHtml(localizedHeading)" />
      </div>
      <div class="editorial-text__body" data-target="body" :class="bodyClass">
        <span
          v-if="dropcapEnabled && firstLetter"
          class="editorial-text__dropcap"
          data-target="dropcap"
          :class="dropcapClass"
        >
          {{ firstLetter }}
        </span>
        <div class="prose" v-html="bodyContent" />
      </div>
      <blockquote
        v-if="pullquoteText"
        class="editorial-text__pullquote"
        data-target="pullquote"
        :class="pullquotePositionClass"
        v-html="asHtml(localizedPullquote)"
      />
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
type TextAlign = 'left' | 'center' | 'justify'
type DropcapStyle = 'classic' | 'modern' | 'accent'
type LeadStyle = 'subtle' | 'prominent'
type PullquotePosition = 'left' | 'right' | 'center'
type SurfaceStyle = 'none' | 'subtle' | 'filled'
type BorderRadius = 'none' | 'sm' | 'md' | 'lg' | 'pill'

const props = defineProps<{
  eyebrow?: string | Record<string, string>
  heading?: string | Record<string, string>
  body?: string | Record<string, string>
  columns?: number
  dropcapEnabled?: boolean
  dropcapStyle?: DropcapStyle
  leadParagraph?: boolean
  leadStyle?: LeadStyle
  pullquoteText?: string | Record<string, string>
  pullquotePosition?: PullquotePosition
  textAlign?: TextAlign
  background?: BackgroundRole
  textTone?: TextRole
  measureWidth?: 'content' | 'narrow' | 'standard' | 'wide' | 'full'
  internalPadding?: string
  surfaceStyle?: SurfaceStyle
  borderRadius?: BorderRadius
}>()

const localizedEyebrow = computed(() => getLocalizedValue(props.eyebrow))
const localizedHeading = computed(() => getLocalizedValue(props.heading))
const localizedBody = computed(() => getLocalizedValue(props.body))
const localizedPullquote = computed(() => getLocalizedValue(props.pullquoteText))

const heading = computed(() => localizedHeading.value)
const pullquoteText = computed(() => localizedPullquote.value)
const dropcapEnabled = computed(() => props.dropcapEnabled ?? false)
const leadEnabled = computed(() => props.leadParagraph ?? false)

const columns = computed(() => Math.min(Math.max(props.columns ?? 1, 1), 3))
// Null when block has no explicit alignment; the `if (textAlign.value)` guard
// in the styles builder then skips emitting inline text-align, letting the
// preset/role typography cascade win.
const textAlign = computed<TextAlign | null>(() => props.textAlign || null)

const firstLetter = computed(() => {
  const text = localizedBody.value.replace(/<[^>]*>/g, '').trim()
  return text.charAt(0)
})

const bodyContent = computed(() => {
  if (!dropcapEnabled.value) return localizedBody.value
  // Strip first character from body when dropcap is enabled
  const raw = localizedBody.value
  // Remove the first visible character while preserving ALL leading tags.
  // The inner group is non-capturing so match[1] is the whole leading-tag run
  // (a capturing `(<…>)*` would retain only the LAST tag and corrupt the markup
  // when the body opens with multiple/nested tags, e.g. `<p><em>Text`).
  const match = raw.match(/^((?:<[^>]*>)*)([^<])/)
  if (match) {
    const prefixTags = match[1] || ''
    return prefixTags + raw.slice(prefixTags.length + 1)
  }
  return raw
})

const columnClass = computed(() => columns.value > 1 ? `editorial-text__body--columns-${columns.value}` : '')

const bodyClass = computed(() => [
  columnClass.value,
  ...(leadEnabled.value
    ? ['editorial-text__body--lead', `editorial-text__body--lead-${props.leadStyle || 'subtle'}`]
    : []),
])

const dropcapClass = computed(() => `editorial-text__dropcap--${props.dropcapStyle || 'classic'}`)

const pullquotePositionClass = computed(() => `editorial-text__pullquote--${props.pullquotePosition || 'center'}`)

const { surfaceStyle: blockSurfaceStyle } = useBlockSurface(props, { fallbackBackground: 'transparent' })

const rootStyles = computed(() => {
  const styles: Record<string, string> = {}
  Object.assign(styles, blockSurfaceStyle.value)
  return styles
})

const containerStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (textAlign.value) styles.textAlign = textAlign.value
  return styles
})

const measureStyle = computed<Record<string, string>>(() =>
  props.measureWidth ? { '--block-measure': `var(--measure-width-${props.measureWidth})` } : {},
)

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
  if (props.borderRadius && props.borderRadius !== 'none') {
    style.borderRadius = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0'
  }
  return style
})

</script>

<style lang="scss" scoped>
.editorial-text {
  padding: 0;

  &__container {
    max-width: var(--block-measure, var(--container-max-width, 720px));
    margin-inline: var(--block-measure-align, auto);
  }

  &__heading {
    margin-bottom: var(--spacing-xl);

    h2 {
      font-family: var(--rt-slot-heading-family, var(--rt-role-heading1-family, var(--font-family-heading, Georgia, serif)));
      font-size: var(--rt-slot-heading-size, var(--rt-role-heading1-size, var(--font-size-3xl, 4.8rem)));
      font-weight: var(--rt-slot-heading-weight, var(--rt-role-heading1-weight, 600));
      line-height: var(--rt-slot-heading-line-height, var(--rt-role-heading1-line-height, 1.1));
      letter-spacing: var(--rt-slot-heading-letter-spacing, var(--rt-role-heading1-letter-spacing, -0.03em));
      text-transform: var(--rt-slot-heading-text-transform, var(--rt-role-heading1-text-transform, none));
      // Phase C — variable-font axes. The slot var resolves to the preset's
      // axis output when bound; falls back to `normal` for static-font presets.
      font-variation-settings: var(--rt-slot-heading-font-variation-settings, normal);
      font-optical-sizing: var(--rt-slot-heading-font-optical-sizing, auto);
      font-stretch: var(--rt-slot-heading-font-stretch, normal);
      font-style: var(--rt-slot-heading-font-style, normal);
      margin: 0;
      color: var(--motion-heading-tint, var(--rt-slot-heading-color, var(--rt-role-heading1-color, inherit)));
    }
  }

  &__body {
    font-family: var(--rt-slot-body-family, var(--rt-role-body-family, inherit));
    font-size: var(--rt-slot-body-size, var(--rt-role-body-size, var(--font-size-base, 18px)));
    font-weight: var(--rt-slot-body-weight, var(--rt-role-body-weight, inherit));
    line-height: var(--rt-slot-body-line-height, var(--rt-role-body-line-height, 1.7));
    letter-spacing: var(--rt-slot-body-letter-spacing, var(--rt-role-body-letter-spacing, normal));
    text-transform: var(--rt-slot-body-text-transform, var(--rt-role-body-text-transform, none));
    font-variation-settings: var(--rt-slot-body-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-body-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-body-font-stretch, normal);
    font-style: var(--rt-slot-body-font-style, normal);
    color: var(--rt-slot-body-color, var(--rt-role-body-color, inherit));
    clip-path: inset(0 calc(100% - var(--motion-body-reveal, 100%)) 0 0);

    &--columns-2 {
      column-count: 2;
      column-gap: 2rem;
    }

    &--columns-3 {
      column-count: 3;
      column-gap: 2rem;
    }

    @container (max-width: 768px) {
      &--columns-2,
      &--columns-3 {
        column-count: 1;
      }
    }

    // Lead paragraph (standfirst): opt-in editorial lede on the first prose
    // paragraph only. Off by default → resting DOM/styles unchanged. Em-based
    // sizing keeps it proportional to the body role typography; the dropcap
    // (a float:left sibling before .prose) still wraps inside the enlarged
    // first paragraph without change.
    &--lead {
      :deep(.prose > p:first-of-type) {
        line-height: 1.5;
      }
    }

    &--lead-subtle {
      :deep(.prose > p:first-of-type) {
        font-size: 1.2em;
      }
    }

    &--lead-prominent {
      :deep(.prose > p:first-of-type) {
        font-size: 1.35em;
        font-weight: var(--rt-slot-body-weight, var(--rt-role-body-weight, 500));
      }
    }

    // In multi-column mode the lede spans all columns and pushes the flowing
    // body copy below it. Harmless under the single-column @container collapse.
    &--lead.editorial-text__body--columns-2,
    &--lead.editorial-text__body--columns-3 {
      :deep(.prose > p:first-of-type) {
        column-span: all;
        margin-bottom: var(--spacing-lg);
      }
    }

    // Color comes from the .prose contract; the always-on underline is the
    // editorial-specific delta (CSS-10 — no longer needs to out-specify a
    // global `a`).
    :deep(a) {
      text-decoration: underline;
    }

    :deep(mark),
    :deep(.highlight) {
      color: var(--section-accent, var(--color-primary));
      background: none;
    }
  }

  &__dropcap {
    float: left;
    font-size: 3.5em;
    line-height: 0.8;
    padding-right: 0.1em;
    font-weight: var(--font-weight-medium);

    &--classic {
      font-family: var(--font-family-heading);
      color: inherit;
    }

    &--modern {
      font-family: var(--font-family);
      font-weight: 700;
      color: inherit;
    }

    &--accent {
      font-family: var(--font-family-heading);
      color: var(--color-primary);
    }
  }

  &__pullquote {
    font-family: var(--rt-slot-pullquote-family, var(--rt-role-pullquote-family, inherit));
    font-size: var(--rt-slot-pullquote-size, var(--rt-role-pullquote-size, var(--font-size-xl)));
    font-weight: var(--rt-slot-pullquote-weight, var(--rt-role-pullquote-weight, var(--font-weight-medium)));
    line-height: var(--rt-slot-pullquote-line-height, var(--rt-role-pullquote-line-height, 1.4));
    letter-spacing: var(--rt-slot-pullquote-letter-spacing, var(--rt-role-pullquote-letter-spacing, normal));
    text-transform: var(--rt-slot-pullquote-text-transform, var(--rt-role-pullquote-text-transform, none));
    font-style: italic;
    margin: var(--spacing-xl) 0;
    padding: var(--spacing-lg) var(--spacing-xl);
    border-left: 4px solid var(--color-primary);
    color: var(--rt-slot-pullquote-color, var(--rt-role-pullquote-color, inherit));

    &--left {
      text-align: left;
      float: left;
      width: 45%;
      margin-right: var(--spacing-xl);

      @container (max-width: 768px) {
        float: none;
        width: 100%;
        margin-right: 0;
      }
    }

    &--right {
      text-align: right;
      float: right;
      width: 45%;
      margin-left: var(--spacing-xl);
      border-left: none;
      border-right: 4px solid var(--color-primary);

      @container (max-width: 768px) {
        float: none;
        width: 100%;
        margin-left: 0;
        border-right: none;
        border-left: 4px solid var(--color-primary);
      }
    }

    &--center {
      text-align: center;
      border-left: none;
      border-top: 2px solid var(--color-primary);
      border-bottom: 2px solid var(--color-primary);
    }
  }

  .block-eyebrow {
    font-family: var(--rt-slot-eyebrow-family, var(--rt-role-eyebrow-family, inherit));
    font-size: var(--rt-slot-eyebrow-size, var(--rt-role-eyebrow-size, 0.75rem));
    font-weight: var(--rt-slot-eyebrow-weight, var(--rt-role-eyebrow-weight, 600));
    line-height: var(--rt-slot-eyebrow-line-height, var(--rt-role-eyebrow-line-height, 1.2));
    letter-spacing: var(--rt-slot-eyebrow-letter-spacing, var(--rt-role-eyebrow-letter-spacing, 0.08em));
    text-transform: var(--rt-slot-eyebrow-text-transform, var(--rt-role-eyebrow-text-transform, uppercase));
    color: var(--rt-slot-eyebrow-color, var(--rt-role-eyebrow-color, inherit));
  }
}
</style>
