<template>
  <section class="pull-quote" :class="sizeClass" :style="{ ...rootStyles, ...measureStyle, ...typographyStyle }" data-target="root">
    <div class="pull-quote__inner" :style="contentStyle">
      <div
        v-if="accentStyle !== 'none'"
        class="pull-quote__accent"
        data-target="accent"
        :class="accentClass"
        :style="accentStyles"
      />
      <span
        v-if="quoteMark !== 'none'"
        class="pull-quote__mark pull-quote__mark--open"
        aria-hidden="true"
        data-target="mark"
      >{{ openGlyph }}</span>
      <blockquote class="pull-quote__body prose" data-target="body" :style="bodyStyles" v-html="asHtml(localizedBody)"></blockquote>
      <div
        v-if="hasByline"
        class="pull-quote__byline"
        :class="`pull-quote__byline--${attributionLayout}`"
        data-target="attribution"
      >
        <img
          v-if="portrait"
          :src="portrait"
          :alt="getLocalizedPlain(attribution)"
          class="pull-quote__portrait"
          loading="lazy"
          decoding="async"
        />
        <span v-if="attribution || role" class="pull-quote__byline-text">
          <cite v-if="attribution" class="pull-quote__attribution">
            <a
              v-if="citeUrl"
              :href="citeUrl"
              class="pull-quote__cite-link"
              target="_blank"
              rel="noopener"
              v-html="asHtml(localizedAttribution)"
            ></a>
            <span v-else v-html="asHtml(localizedAttribution)"></span>
          </cite>
          <span v-if="role" class="pull-quote__role" v-html="asHtml(localizedRole)"></span>
        </span>
      </div>
      <span
        v-if="quoteMark === 'pair'"
        class="pull-quote__mark pull-quote__mark--close"
        aria-hidden="true"
      >{{ closeGlyph }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BackgroundRole, TextRole } from '~/shared/types/placement'
import { SPACING_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { useBlockSurface } from '~/shared/composables/useBlockSurface'
import { useTypographySlotStyle } from '~/shared/composables/useTypographySlotStyle'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'

const { getLocalizedValue, getLocalizedPlain } = useLocalized()
type AccentStyle = 'line' | 'bar' | 'none'
type TextAlign = 'left' | 'center' | 'right'
type Size = 'compact' | 'standard' | 'display'
type SurfaceStyle = 'none' | 'subtle' | 'filled'
type QuoteMark = 'none' | 'open' | 'pair' | 'guillemet'
type AttributionLayout = 'stacked' | 'byline'

const props = defineProps<{
  body?: string | Record<string, string>
  attribution?: string | Record<string, string>
  portrait?: string
  role?: string | Record<string, string>
  citeUrl?: string
  attributionLayout?: 'stacked' | 'byline'
  accentStyle?: AccentStyle
  accentColor?: string
  quoteMark?: QuoteMark
  textAlign?: TextAlign
  size?: Size
  fontSize?: number
  letterSpacing?: string
  background?: BackgroundRole
  textTone?: TextRole
  internalPadding?: string
  surfaceStyle?: SurfaceStyle
  measureWidth?: 'content' | 'narrow' | 'standard' | 'wide' | 'full'
}>()

const measureStyle = computed<Record<string, string>>(() =>
  props.measureWidth ? { '--block-measure': `var(--measure-width-${props.measureWidth})` } : {},
)

const typographyStyle = useTypographySlotStyle({})

const localizedBody = computed(() => getLocalizedValue(props.body))
const localizedAttribution = computed(() => getLocalizedValue(props.attribution))
const localizedRole = computed(() => getLocalizedValue(props.role))
const attributionLayout = computed((): AttributionLayout => props.attributionLayout || 'stacked')
const hasByline = computed(() => !!(props.attribution || props.portrait || props.role))

const accentStyle = computed((): AccentStyle => props.accentStyle || 'line')
const size = computed((): Size => props.size || 'standard')
const quoteMark = computed((): QuoteMark => props.quoteMark || 'none')

const accentClass = computed(() => `pull-quote__accent--${accentStyle.value}`)
const sizeClass = computed(() => `pull-quote--size-${size.value}`)

const OPEN_GLYPH_MAP: Record<QuoteMark, string> = {
  none: '',
  open: '“',
  pair: '“',
  guillemet: '«',
}
const CLOSE_GLYPH_MAP: Record<QuoteMark, string> = {
  none: '',
  open: '',
  pair: '”',
  guillemet: '»',
}

const openGlyph = computed(() => OPEN_GLYPH_MAP[quoteMark.value])
const closeGlyph = computed(() => CLOSE_GLYPH_MAP[quoteMark.value])

const { surfaceStyle } = useBlockSurface(props, { fallbackBackground: 'transparent' })

const rootStyles = computed(() => {
  const styles: Record<string, string> = {}
  // Only emit inline text-align when the block has an explicit value.
  // Null/undefined/empty lets the preset / role typography cascade win.
  if (props.textAlign) styles.textAlign = props.textAlign
  Object.assign(styles, surfaceStyle.value)
  return styles
})

const bodyStyles = computed(() => {
  const styles: Record<string, string> = {}
  // Only apply inline fontSize if explicitly set (overrides size preset)
  if (props.fontSize !== undefined) {
    styles.fontSize = `${props.fontSize}px`
  }
  // The resolved text role when the block carries one; otherwise the legacy
  // default the `inherit` branch painted.
  styles.color = surfaceStyle.value.color ?? 'var(--section-text, var(--color-text))'
  if (props.letterSpacing) {
    styles.letterSpacing = props.letterSpacing
  }
  return styles
})

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  const surface = props.surfaceStyle || 'none'
  if (surface === 'subtle') {
    style.backgroundColor = 'var(--section-bg-subtle, var(--color-surface-subtle, rgba(0,0,0,0.04)))'
  } else if (surface === 'filled') {
    style.backgroundColor = 'var(--section-bg-filled, var(--color-surface, #f5f5f5))'
  }
  return style
})

const accentStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (props.accentColor) {
    styles.backgroundColor = props.accentColor
  }
  return styles
})
</script>

<style lang="scss" scoped>
.pull-quote {
  position: relative;

  &__inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: var(--block-measure, none);
    margin-inline: var(--block-measure-align, auto);
  }

  // Size presets with appropriate padding and font sizes
  &--size-compact {
    padding: var(--spacing-lg) var(--spacing-md);

    .pull-quote__body {
      font-size: var(--rt-slot-quote-size, var(--rt-role-pullquote-size, 2.4rem)); // 24px

      @media (max-width: $bp-md) {
        font-size: var(--rt-slot-quote-size, var(--rt-role-pullquote-size, clamp(1.6rem, 4vw, 2.4rem)));
      }
    }

    .pull-quote__mark {
      // Hoisted into an intermediate custom property before the calc() — a
      // triple-nested var(var(clamp(a,b,c))) directly inside calc(... * N)
      // trips the build-time PostCSS parser (spurious "Expecting end of
      // input" on the clamp's closing paren) even though it's valid CSS.
      --pq-mark-size: var(--rt-slot-quote-size, var(--rt-role-pullquote-size, 2.4rem));
      font-size: calc(var(--pq-mark-size) * 1.6);

      @media (max-width: $bp-md) {
        --pq-mark-size: var(--rt-slot-quote-size, var(--rt-role-pullquote-size, clamp(1.6rem, 4vw, 2.4rem)));
        font-size: calc(var(--pq-mark-size) * 1.6);
      }
    }
  }

  &--size-standard {
    padding: var(--spacing-3xl) var(--spacing-xl);

    .pull-quote__body {
      font-size: var(--rt-slot-quote-size, var(--rt-role-pullquote-size, 4.8rem)); // 48px

      @media (max-width: $bp-md) {
        font-size: var(--rt-slot-quote-size, var(--rt-role-pullquote-size, clamp(2.4rem, 5vw, 4.8rem)));
      }
    }

    .pull-quote__mark {
      --pq-mark-size: var(--rt-slot-quote-size, var(--rt-role-pullquote-size, 4.8rem));
      font-size: calc(var(--pq-mark-size) * 1.6);

      @media (max-width: $bp-md) {
        --pq-mark-size: var(--rt-slot-quote-size, var(--rt-role-pullquote-size, clamp(2.4rem, 5vw, 4.8rem)));
        font-size: calc(var(--pq-mark-size) * 1.6);
      }
    }
  }

  &--size-display {
    padding: var(--spacing-4xl) var(--spacing-2xl);

    .pull-quote__body {
      font-size: var(--rt-slot-quote-size, var(--rt-role-pullquote-size, 7.2rem)); // 72px

      @media (max-width: $bp-md) {
        font-size: var(--rt-slot-quote-size, var(--rt-role-pullquote-size, clamp(3.2rem, 6vw, 6.4rem)));
      }
    }

    .pull-quote__mark {
      --pq-mark-size: var(--rt-slot-quote-size, var(--rt-role-pullquote-size, 7.2rem));
      font-size: calc(var(--pq-mark-size) * 1.6);

      @media (max-width: $bp-md) {
        --pq-mark-size: var(--rt-slot-quote-size, var(--rt-role-pullquote-size, clamp(3.2rem, 6vw, 6.4rem)));
        font-size: calc(var(--pq-mark-size) * 1.6);
      }
    }
  }

  &__accent {
    flex-shrink: 0;
    margin-bottom: var(--spacing-lg);
    background-color: var(--color-primary);

    &--line {
      width: 6rem;
      height: 0.3rem;
    }

    &--bar {
      width: 0.4rem;
      height: 4rem;
    }
  }

  &__mark {
    --pq-mark-color: color-mix(in srgb, var(--color-primary) 20%, transparent);

    display: block;
    flex-shrink: 0;
    line-height: 0.8;
    font-family: var(--font-family-heading);
    font-style: normal;
    color: var(--pq-mark-color);
    user-select: none;

    &--open {
      margin-bottom: var(--spacing-xs, 0.4rem);
    }

    &--close {
      margin-top: var(--spacing-xs, 0.4rem);
    }
  }

  &__body {
    margin: 0;
    padding: 0;
    font-family: var(--rt-slot-quote-family, var(--rt-role-pullquote-family, var(--font-family-heading)));
    font-weight: var(--rt-slot-quote-weight, var(--rt-role-pullquote-weight, var(--font-weight-medium, 500)));
    line-height: var(--rt-slot-quote-line-height, var(--rt-role-pullquote-line-height, 1.15));
    letter-spacing: var(--rt-slot-quote-letter-spacing, var(--rt-role-pullquote-letter-spacing, normal));
    text-transform: var(--rt-slot-quote-text-transform, var(--rt-role-pullquote-text-transform, none));
    font-variation-settings: var(--rt-slot-quote-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-quote-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-quote-font-stretch, normal);
    font-style: var(--rt-slot-quote-font-style, normal);
    color: var(--rt-slot-quote-color, var(--rt-role-pullquote-color, inherit));
    max-width: 80rem;
  }

  &__attribution {
    margin: 0;
    font-family: var(--rt-slot-attribution-family, var(--rt-role-caption-family, var(--font-family)));
    font-size: var(--rt-slot-attribution-size, var(--rt-role-caption-size, var(--font-size-base)));
    font-variation-settings: var(--rt-slot-attribution-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-attribution-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-attribution-font-stretch, normal);
    font-style: var(--rt-slot-attribution-font-style, normal);
    font-weight: var(--rt-slot-attribution-weight, var(--rt-role-caption-weight, var(--font-weight-normal, 400)));
    line-height: var(--rt-slot-attribution-line-height, var(--rt-role-caption-line-height, inherit));
    color: var(--rt-slot-attribution-color, var(--rt-role-caption-color, var(--section-text, var(--color-text-light))));
    letter-spacing: var(--rt-slot-attribution-letter-spacing, var(--rt-role-caption-letter-spacing, 0.05em));
    text-transform: var(--rt-slot-attribution-text-transform, var(--rt-role-caption-text-transform, uppercase));
  }

  &__byline {
    display: flex;
    margin-top: var(--spacing-lg);
    gap: var(--spacing-sm);

    &--stacked { flex-direction: column; align-items: center; text-align: center; }
    &--byline  { flex-direction: row;    align-items: center; text-align: left; }
  }

  &__byline-text {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }

  &__portrait {
    flex-shrink: 0;
    object-fit: cover;
    border-radius: 50%;
    background-color: var(--color-background-light, #e9e9e9);

    .pull-quote__byline--stacked & { width: 6.4rem; height: 6.4rem; }
    .pull-quote__byline--byline &  { width: 5.2rem; height: 5.2rem; }
  }

  &__cite-link {
    color: inherit;
    text-decoration: none;
    border-bottom: 0.1rem solid color-mix(in srgb, currentColor 35%, transparent);
    transition: border-color var(--transition-base);

    &:hover { border-bottom-color: currentColor; }
    &:focus-visible { outline: 0.2rem solid var(--color-primary); outline-offset: 0.2rem; }

    @media (pointer: coarse) { display: inline-flex; align-items: center; min-height: 4.4rem; }
  }

  &__role {
    font-family: var(--rt-slot-attribution-family, var(--rt-role-caption-family, var(--font-family)));
    font-size: var(--rt-slot-attribution-size, var(--rt-role-caption-size, var(--font-size-sm, 1.4rem)));
    font-weight: var(--font-weight-normal, 400);
    line-height: 1.3;
    letter-spacing: 0.02em;
    text-transform: none;
    color: var(--section-text, var(--color-text-light));
    opacity: 0.75;
  }
}
</style>
