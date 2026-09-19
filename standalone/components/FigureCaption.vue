<template>
  <figure
    class="figure-caption"
    :class="[align ? `figure-caption--align-${align}` : null]"
    :style="{ ...measureStyle, ...typographyStyle }"
    data-target="root"
  >
    <button
      v-if="image && zoomActive"
      type="button"
      class="figure-caption__zoom"
      data-lightbox
      data-lightbox-zoom
      :data-lightbox-src="image"
      :data-lightbox-alt="localizedAlt"
      :data-lightbox-caption="plainCaption"
      :aria-label="zoomLabel"
    >
      <img
        :src="image"
        :alt="localizedAlt"
        class="figure-caption__image"
        data-target="media"
      />
      <span class="figure-caption__zoom-hint" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </span>
    </button>
    <img
      v-else-if="image"
      :src="image"
      :alt="localizedAlt"
      class="figure-caption__image"
      data-target="media"
    />
    <figcaption v-if="localizedCaption || localizedCredit" class="figure-caption__meta">
      <span
        v-if="localizedCaption"
        class="figure-caption__caption"
        data-target="caption"
        v-html="asHtml(localizedCaption)"
      />
      <span
        v-if="localizedCredit"
        class="figure-caption__credit"
        data-target="credit"
        v-html="asHtml(localizedCredit)"
      />
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTypographySlotStyle } from '~/shared/composables/useTypographySlotStyle'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'

const { getLocalizedValue } = useLocalized()
const renderMode = useRenderMode()
type TextAlign = 'left' | 'center' | 'right'
type MeasureWidth = 'content' | 'narrow' | 'standard' | 'wide' | 'full'

const props = defineProps<{
  image?: string
  altText?: string | Record<string, string>
  caption?: string | Record<string, string>
  credit?: string | Record<string, string>
  textAlign?: TextAlign
  measureWidth?: MeasureWidth
  zoomable?: boolean
}>()

const localizedAlt = computed(() => getLocalizedValue(props.altText))
const localizedCaption = computed(() => getLocalizedValue(props.caption))
const localizedCredit = computed(() => getLocalizedValue(props.credit))

// Opt-in click-to-inspect: only when an image is present, the toggle is on, and
// we're not inside the editor preview (matching GridBlock — preview intercepts
// clicks for selection, so the delegated Lightbox must stay dormant there).
const zoomActive = computed(
  () => !!props.image && props.zoomable === true && renderMode.value !== 'editor-preview',
)

// Plain-text caption for the lightbox caption + accessible name (strip inline HTML).
const plainCaption = computed(() => localizedCaption.value.replace(/<[^>]*>/g, '').trim())

// Accessible name for the zoom trigger. A plain literal (not $t): this theme ships
// no translation catalog, so $t('key', fallback) resolves to the raw key — the
// literal is the only form that reads correctly. Caption gives extra context.
const zoomLabel = computed(() =>
  plainCaption.value ? `Enlarge image: ${plainCaption.value}` : 'Enlarge image',
)

// Null when the block hasn't set an explicit alignment. The template guards
// on this so the `--align-*` class is only added when there's a real value;
// otherwise the preset / role typography cascade controls text-align.
const align = computed<TextAlign | null>(() => props.textAlign || null)

const typographyStyle = useTypographySlotStyle({})

const measureStyle = computed<Record<string, string>>(() =>
  props.measureWidth ? { '--block-measure': `var(--measure-width-${props.measureWidth})` } : {},
)
</script>

<style lang="scss" scoped>
.figure-caption {
  margin-block: 0;
  margin-inline: var(--block-measure-align, auto);
  max-width: var(--block-measure, 100%);

  &__image {
    display: block;
    width: 100%;
    height: auto;
  }

  &__zoom {
    display: block;
    width: 100%;
    padding: 0;
    margin: 0;
    border: 0;
    background: none;
    font: inherit;
    color: inherit;
    cursor: zoom-in;
    position: relative;

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  }

  &__zoom-hint {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.55);
    color: var(--color-white, #fff);
    opacity: 0;
    transform: scale(0.9);
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: none;

    svg {
      width: 1.25rem;
      height: 1.25rem;
    }
  }

  &__zoom:hover &__zoom-hint,
  &__zoom:focus-visible &__zoom-hint {
    opacity: 1;
    transform: scale(1);
  }

  &__meta {
    margin-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  &__caption {
    font-family: var(--rt-slot-caption-family, var(--rt-role-caption-family, inherit));
    font-size: var(--rt-slot-caption-size, var(--rt-role-caption-size, var(--font-size-sm)));
    font-weight: var(--rt-slot-caption-weight, var(--rt-role-caption-weight, inherit));
    line-height: var(--rt-slot-caption-line-height, var(--rt-role-caption-line-height, 1.4));
    letter-spacing: var(--rt-slot-caption-letter-spacing, var(--rt-role-caption-letter-spacing, normal));
    text-transform: var(--rt-slot-caption-text-transform, var(--rt-role-caption-text-transform, none));
    font-variation-settings: var(--rt-slot-caption-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-caption-font-optical-sizing, auto);
    color: var(--rt-slot-caption-color, var(--rt-role-caption-color, inherit));
  }

  &__credit {
    font-family: var(--rt-slot-credit-family, var(--rt-role-caption-family, inherit));
    font-size: var(--rt-slot-credit-size, var(--rt-role-caption-size, var(--font-size-xs)));
    font-weight: var(--rt-slot-credit-weight, var(--rt-role-caption-weight, inherit));
    line-height: var(--rt-slot-credit-line-height, var(--rt-role-caption-line-height, 1.4));
    letter-spacing: var(--rt-slot-credit-letter-spacing, var(--rt-role-caption-letter-spacing, normal));
    text-transform: var(--rt-slot-credit-text-transform, var(--rt-role-caption-text-transform, none));
    font-variation-settings: var(--rt-slot-credit-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-credit-font-optical-sizing, auto);
    color: var(--rt-slot-credit-color, var(--rt-role-caption-color, var(--section-text-muted, inherit)));
  }

  &--align-left   { text-align: left; }
  &--align-center { text-align: center; }
  &--align-right  { text-align: right; }
}

@media (prefers-reduced-motion: reduce) {
  .figure-caption__zoom-hint {
    transition: none;
  }
}
</style>
