<template>
  <section
    class="splash-materials-board"
    :class="{ 'splash-materials-board--reveal-meta': metaReveal }"
    :style="rootStyle"
    data-target="root"
  >
    <div
      class="splash-materials-board__container"
      :class="containerSurfaceClass"
      :style="containerStyle"
    >
      <h2
        v-if="localizedTitle && showTitle"
        data-target="heading"
        class="splash-materials-board__title"
        v-html="asHtml(localizedTitle)"
      ></h2>

      <!-- Opt-in category filter chips. Rendered only when showFilters is on AND
           there are ≥2 distinct categories, so the default render is untouched. -->
      <div
        v-if="filtersEnabled"
        class="splash-materials-board__filters"
        role="group"
        :aria-label="$t('materialsBoard.filtersLabel', 'Filter materials by category')"
      >
        <button
          type="button"
          class="splash-materials-board__chip"
          :class="{ 'is-active': activeCategory === '' }"
          :aria-pressed="activeCategory === ''"
          @click="activeCategory = ''"
        >
          {{ $t('materialsBoard.all', 'All') }}
        </button>
        <button
          v-for="cat in categories"
          :key="cat"
          type="button"
          class="splash-materials-board__chip"
          :class="{ 'is-active': activeCategory === cat }"
          :aria-pressed="activeCategory === cat"
          @click="activeCategory = cat"
        >
          {{ cat }}
        </button>
      </div>

      <div
        data-target="board"
        class="splash-materials-board__board"
        :class="`splash-materials-board__board--${layout}`"
      >
        <component
          :is="sample.item.link ? 'a' : 'div'"
          v-for="sample in visibleSamples"
          :key="sample.index"
          class="splash-materials-board__sample"
          data-target="sample"
          :data-item-index="sample.index"
          :href="sample.item.link || undefined"
          :target="sample.item.link ? '_blank' : undefined"
          :rel="sample.item.link ? 'noopener noreferrer' : undefined"
          :role="sample.item.link ? undefined : 'img'"
          :aria-label="sample.item.link ? undefined : (sampleLabel(sample.item) || undefined)"
        >
          <figure class="splash-materials-board__figure">
            <img
              v-if="sample.item.image"
              :src="sample.item.image"
              :alt="sampleLabel(sample.item)"
              class="splash-materials-board__img"
              loading="lazy"
              decoding="async"
            />
            <span v-else class="splash-materials-board__placeholder">{{ sampleLabel(sample.item) }}</span>

            <figcaption class="splash-materials-board__caption">
              <span class="splash-materials-board__name">{{ sampleLabel(sample.item) }}</span>
              <span v-if="metaLine(sample.item)" class="splash-materials-board__meta">{{ metaLine(sample.item) }}</span>
            </figcaption>
          </figure>
        </component>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'

const { getLocalizedValue } = useLocalized()

type Localized = string | Record<string, string>

interface MaterialItem {
  image?: string
  name?: Localized
  spec?: Localized
  supplier?: Localized
  category?: Localized
  link?: string
}

// The CMS repeater can deliver each row either flat ({ image, name, ... }) or
// wrapped ({ type, settings: { image, name, ... } }); both are normalized.
interface RawMaterial extends MaterialItem {
  type?: string
  settings?: MaterialItem
}

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  blocks?: Array<Record<string, unknown>>
  showTitle?: boolean
  title?: Localized
  materials?: RawMaterial[]
  layout?: 'band' | 'grid' | 'stack'
  ratio?: 'square' | 'portrait' | 'wide'
  sampleSize?: 'sm' | 'md' | 'lg'
  metaReveal?: boolean
  showFilters?: boolean
  surfaceStyle?: string
  borderRadius?: string
  internalPadding?: string
}>(), {
  showTitle: true,
  materials: () => [],
  layout: 'band',
  ratio: 'square',
  sampleSize: 'md',
  metaReveal: false,
  showFilters: false,
  surfaceStyle: 'none',
  borderRadius: 'none',
  internalPadding: 'none',
})

const localizedTitle = computed(() => getLocalizedValue(props.title))

function sampleLabel(item: MaterialItem): string {
  return getLocalizedValue(item.name) || ''
}

// Meta line = spec, optionally joined with the supplier via a mid-dot separator.
function metaLine(item: MaterialItem): string {
  const spec = getLocalizedValue(item.spec)
  const supplier = getLocalizedValue(item.supplier)
  return [spec, supplier].filter(Boolean).join(' · ')
}

// Localized category label for an item ('' when unset).
function categoryLabel(item: MaterialItem): string {
  return getLocalizedValue(item.category) || ''
}

interface BoardSample {
  item: MaterialItem
  index: number
}

// Normalize the repeater rows into flat MaterialItem objects, then index them.
const samples = computed<BoardSample[]>(() =>
  (props.materials ?? []).map((raw, index) => {
    const src = raw.settings ?? raw
    return {
      item: { image: src.image, name: src.name, spec: src.spec, supplier: src.supplier, category: src.category, link: src.link },
      index,
    }
  })
)

// Active filter chip ('' = All / no filter).
const activeCategory = ref('')

// Unique category labels, insertion-order-preserving, non-empty only.
const categories = computed<string[]>(() => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const sample of samples.value) {
    const label = categoryLabel(sample.item)
    if (label && !seen.has(label)) {
      seen.add(label)
      out.push(label)
    }
  }
  return out
})

// If the active category disappears (author edits/removes a label in the
// editor while a chip is selected), fall back to "All" so the board can never
// filter down to an empty, blank state.
watch(categories, (list) => {
  if (activeCategory.value && !list.includes(activeCategory.value)) {
    activeCategory.value = ''
  }
})

// Filters only engage when opted-in AND there are ≥2 distinct categories to
// choose between — otherwise a chip bar would be meaningless.
const filtersEnabled = computed(() => props.showFilters && categories.value.length >= 2)

// The rendered set: full list unless a real filter is active. When filters are
// disabled this returns samples.value verbatim (same reference) so the DOM stays
// byte-identical to the unfiltered render.
const visibleSamples = computed<BoardSample[]>(() => {
  if (!filtersEnabled.value || !activeCategory.value) return samples.value
  return samples.value.filter((sample) => categoryLabel(sample.item) === activeCategory.value)
})

// Band tile width by sample size (flex-basis of each snap tile).
const SAMPLE_WIDTH_MAP: Record<'sm' | 'md' | 'lg', string> = {
  sm: '16rem',
  md: '20rem',
  lg: '26rem',
}

// Grid minmax lower bound by sample size (auto-fit collapses intrinsically).
const SAMPLE_MIN_MAP: Record<'sm' | 'md' | 'lg', string> = {
  sm: '12rem',
  md: '16rem',
  lg: '20rem',
}

const RATIO_MAP: Record<'square' | 'portrait' | 'wide', string> = {
  square: '1 / 1',
  portrait: '3 / 4',
  wide: '4 / 3',
}

const rootStyle = computed<Record<string, string>>(() => ({
  '--mb-sample-w': SAMPLE_WIDTH_MAP[props.sampleSize] ?? SAMPLE_WIDTH_MAP.md,
  '--mb-sample-min': SAMPLE_MIN_MAP[props.sampleSize] ?? SAMPLE_MIN_MAP.md,
  '--mb-ratio': RATIO_MAP[props.ratio] ?? RATIO_MAP.square,
}))

const containerSurfaceClass = computed(() =>
  props.surfaceStyle && props.surfaceStyle !== 'none'
    ? `splash-materials-board__container--surface-${props.surfaceStyle}`
    : ''
)

const containerStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  if (props.borderRadius && props.borderRadius !== 'none') {
    style.borderRadius = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0'
  }
  return style
})
</script>

<style lang="scss" scoped>
.splash-materials-board {
  padding: var(--spacing-2xl) var(--spacing-md);

  @media (max-width: $bp-md) {
    padding: var(--spacing-xl) var(--spacing-md);
  }

  &__container {
    max-width: 120rem;
    margin: 0 auto;

    &--surface-subtle {
      background: var(--section-surface, rgba(255, 255, 255, 0.04));
    }

    &--surface-filled {
      background: var(--section-accent, rgba(255, 255, 255, 0.1));
    }
  }

  &__title {
    font-family: var(--rt-role-heading2-family, inherit);
    font-size: var(--rt-role-heading2-size, var(--font-size-2xl));
    font-weight: var(--rt-role-heading2-weight, var(--font-weight-bold));
    line-height: var(--rt-role-heading2-line-height, inherit);
    letter-spacing: var(--rt-role-heading2-letter-spacing, normal);
    text-transform: var(--rt-role-heading2-text-transform, none);
    color: var(--rt-role-heading2-color, inherit);
    text-align: center;
    margin: 0 0 var(--spacing-2xl);

    @media (max-width: $bp-md) {
      margin-block-end: var(--spacing-xl);
    }
  }

  /* ── Category filter chips (opt-in): a centered, wrapping pill bar above the
        board. flex-wrap alone handles narrow viewports — no count juggling. ── */
  &__filters {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
    justify-content: center;
    margin-block-end: var(--spacing-xl);
  }

  &__chip {
    padding: var(--spacing-2xs, 0.25rem) var(--spacing-md);
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.18));
    border-radius: var(--border-radius-pill, 999px);
    font-size: var(--font-size-sm);
    background: transparent;
    color: inherit;
    cursor: pointer;
    transition: background var(--transition-base), color var(--transition-base),
      border-color var(--transition-base);

    &:hover:not(.is-active) {
      border-color: var(--color-primary);
      background: var(--section-surface, rgba(0, 0, 0, 0.04));
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    &.is-active {
      background: var(--color-primary);
      color: var(--color-on-primary, #fff);
      border-color: var(--color-primary);
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  }

  /* ── Palette band: a swipeable, scroll-snapped horizontal row. Each tile is a
        fixed --mb-sample-w wide flex item; fully swipeable on mobile with NO
        @media (intrinsic overflow scroll). Scrollbar is hidden for an editorial
        look. ── */
  &__board--band {
    display: flex;
    flex-wrap: nowrap;
    gap: var(--spacing-lg);
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar {
      display: none;
    }

    .splash-materials-board__sample {
      flex: 0 0 var(--mb-sample-w, 20rem);
      scroll-snap-align: start;
    }
  }

  /* ── Auto-fit grid: collapses intrinsically, no @media count juggling. ── */
  &__board--grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(var(--mb-sample-min, 16rem), 1fr));
    gap: var(--spacing-xl);

    @media (max-width: $bp-sm) {
      gap: var(--spacing-lg);
    }
  }

  /* ── Editorial stack: full-width rows with figure + caption side-by-side.
        The single acceptable @media collapses each row to vertical below $bp-md
        (image on top, text below). Ratio var is NOT applied here — the swatch
        uses its own row height. ── */
  &__board--stack {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);

    .splash-materials-board__figure {
      flex-direction: row;
      align-items: stretch;
      gap: var(--spacing-lg);
    }

    .splash-materials-board__img,
    .splash-materials-board__placeholder {
      flex: 0 0 42%;
      aspect-ratio: auto;
      min-height: clamp(9rem, 22vw, 16rem);
      align-self: stretch;
    }

    .splash-materials-board__caption {
      flex: 1 1 auto;
      justify-content: center;
      padding-block: var(--spacing-sm);
    }

    @media (max-width: $bp-md) {
      .splash-materials-board__figure {
        flex-direction: column;
      }

      .splash-materials-board__img,
      .splash-materials-board__placeholder {
        flex-basis: auto;
        width: 100%;
        min-height: clamp(10rem, 40vw, 18rem);
      }
    }
  }

  &__sample {
    display: block;
    text-decoration: none;
    color: inherit;
    transition: transform var(--transition-base), box-shadow var(--transition-base);

    &:hover,
    &:focus-within {
      transform: translateY(-4px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 4px;
    }
  }

  &__figure {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    margin: 0;
  }

  &__img {
    display: block;
    width: 100%;
    aspect-ratio: var(--mb-ratio, 1 / 1);
    object-fit: cover;
    border-radius: var(--border-radius-sm, 4px);
  }

  &__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    aspect-ratio: var(--mb-ratio, 1 / 1);
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px dashed var(--border-color, rgba(0, 0, 0, 0.18));
    border-radius: var(--border-radius-sm, 4px);
    font-size: var(--font-size-sm, 0.85rem);
    color: var(--section-text-secondary, var(--color-text-lighter, #666));
    text-align: center;
  }

  &__caption {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2xs, 0.25rem);
  }

  /* Material name — an editorial label, ALWAYS visible. */
  &__name {
    font-family: var(--rt-role-label-family, inherit);
    font-size: var(--font-size-base, 1rem);
    font-weight: var(--font-weight-medium, 500);
    letter-spacing: 0.01em;
    color: var(--section-text, inherit);
  }

  /* Spec · supplier meta line. Visible by default; only hidden-until-hover when
     metaReveal is enabled (see below), and always shown on touch. */
  &__meta {
    font-size: var(--font-size-sm, 0.85rem);
    color: var(--section-text-secondary, var(--color-text-lighter, #666));
  }

  /* ── metaReveal (opt-in): hide the meta line until hover / focus on pointer
        devices only. On touch (@media hover:none) it is always visible. ── */
  &--reveal-meta {
    @media (hover: hover) {
      .splash-materials-board__meta {
        opacity: 0;
        transform: translateY(-0.25rem);
        transition: opacity var(--transition-base), transform var(--transition-base);
      }

      .splash-materials-board__sample:hover,
      .splash-materials-board__sample:focus-within {
        .splash-materials-board__meta {
          opacity: 1;
          transform: translateY(0);
        }
      }
    }
  }

  /* ── Reduced motion: freeze the lift, and if metaReveal is on force the meta
        line permanently visible (no reveal animation). ── */
  @media (prefers-reduced-motion: reduce) {
    .splash-materials-board__sample {
      transition: none;

      &:hover,
      &:focus-within {
        transform: none;
      }
    }

    &.splash-materials-board--reveal-meta .splash-materials-board__meta {
      opacity: 1;
      transform: none;
      transition: none;
    }
  }
}
</style>
