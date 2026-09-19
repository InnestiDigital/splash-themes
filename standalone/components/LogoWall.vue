<template>
  <section
    class="splash-logo-wall"
    :class="{ 'splash-logo-wall--monochrome': monochrome }"
    :style="rootStyle"
    data-target="root"
  >
    <div
      class="splash-logo-wall__container"
      :class="containerSurfaceClass"
      :style="containerStyle"
    >
      <h2
        v-if="localizedTitle && showTitle"
        data-target="heading"
        class="splash-logo-wall__title"
        v-html="asHtml(localizedTitle)"
      ></h2>

      <div
        v-if="!grouped"
        data-target="logos"
        class="splash-logo-wall__wall"
        :class="[
          `splash-logo-wall__wall--${layout}`,
          {
            'splash-logo-wall__wall--marquee-static': marqueeStaticInEditor,
            'splash-logo-wall__wall--marquee-pausable': layout === 'marquee' && pauseOnHover,
          },
        ]"
      >
        <!-- Inner track. For grid it holds the auto-fit grid; for marquee it is the
             animated (translateX) rail, clipped by the static __wall viewport above
             so the max-content-wide rail never overflows the page. -->
        <div class="splash-logo-wall__track" :style="wallStyle">
          <component
            :is="cell.item.link ? 'a' : 'div'"
            v-for="(cell, i) in cells"
            :key="`${cell.index}-${cell.clone ? 'c' : 'o'}-${i}`"
            class="splash-logo-wall__cell"
            :data-target="cell.clone ? undefined : 'logo'"
            :data-item-index="cell.clone ? undefined : cell.index"
            :aria-hidden="cell.clone ? 'true' : undefined"
            :tabindex="cell.clone && cell.item.link ? -1 : undefined"
            :href="cell.item.link || undefined"
            :target="cell.item.link ? '_blank' : undefined"
            :rel="cell.item.link ? 'noopener noreferrer' : undefined"
            :role="cell.item.link ? undefined : 'img'"
            :aria-label="cellLabel(cell.item) || undefined"
          >
            <img
              v-if="cell.item.image"
              :src="cell.item.image"
              :alt="cellLabel(cell.item)"
              class="splash-logo-wall__img"
              loading="lazy"
              decoding="async"
            />
            <span v-else class="splash-logo-wall__placeholder">{{ cellLabel(cell.item) }}</span>
          </component>
        </div>
      </div>

      <!-- Grouped (tiered) mode: one labeled tier per group, each reusing the same
           wall / track / cell machinery over its own logos. -->
      <div v-else class="splash-logo-wall__tiers">
        <div
          v-for="(tier, ti) in tiers"
          :key="ti"
          class="splash-logo-wall__tier"
        >
          <h3
            v-if="tier.label"
            class="splash-logo-wall__tier-label"
            v-html="asHtml(tier.label)"
          ></h3>

          <div
            data-target="logos"
            class="splash-logo-wall__wall"
            :class="[
              `splash-logo-wall__wall--${layout}`,
              {
                'splash-logo-wall__wall--marquee-static': marqueeStaticInEditor,
                'splash-logo-wall__wall--marquee-pausable': layout === 'marquee' && pauseOnHover,
              },
            ]"
          >
            <div class="splash-logo-wall__track" :style="wallStyle">
              <component
                :is="cell.item.link ? 'a' : 'div'"
                v-for="(cell, i) in tier.cells"
                :key="`${cell.index}-${cell.clone ? 'c' : 'o'}-${i}`"
                class="splash-logo-wall__cell"
                :data-target="cell.clone ? undefined : 'logo'"
                :data-item-index="cell.clone ? undefined : cell.index"
                :aria-hidden="cell.clone ? 'true' : undefined"
                :tabindex="cell.clone && cell.item.link ? -1 : undefined"
                :href="cell.item.link || undefined"
                :target="cell.item.link ? '_blank' : undefined"
                :rel="cell.item.link ? 'noopener noreferrer' : undefined"
                :role="cell.item.link ? undefined : 'img'"
                :aria-label="cellLabel(cell.item) || undefined"
              >
                <img
                  v-if="cell.item.image"
                  :src="cell.item.image"
                  :alt="cellLabel(cell.item)"
                  class="splash-logo-wall__img"
                  loading="lazy"
                  decoding="async"
                />
                <span v-else class="splash-logo-wall__placeholder">{{ cellLabel(cell.item) }}</span>
              </component>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'

const { getLocalizedValue } = useLocalized()
const renderMode = useRenderMode()
const isEditor = computed(() => renderMode.value === 'editor-preview')

type Localized = string | Record<string, string>

interface LogoItem {
  image?: string
  name?: Localized
  link?: string
}

// The CMS repeater can deliver each row either flat ({ image, name, link })
// or wrapped ({ type, settings: { image, name, link } }); both are normalized.
interface RawLogo extends LogoItem {
  type?: string
  settings?: LogoItem
}

// A tier row may likewise arrive flat or wrapped ({ type, settings }); its own
// logos reuse the same RawLogo normalization as the flat wall.
interface RawGroup {
  type?: string
  settings?: { label?: Localized; logos?: RawLogo[] }
  label?: Localized
  logos?: RawLogo[]
}

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  blocks?: Array<Record<string, unknown>>
  showTitle?: boolean
  title?: Localized
  logos?: RawLogo[]
  grouped?: boolean
  groups?: RawGroup[]
  layout?: 'grid' | 'marquee'
  logoSize?: 'sm' | 'md' | 'lg'
  monochrome?: boolean
  marqueeSpeed?: 'slow' | 'normal' | 'fast'
  pauseOnHover?: boolean
  surfaceStyle?: string
  borderRadius?: string
  internalPadding?: string
}>(), {
  showTitle: true,
  logos: () => [],
  grouped: false,
  groups: () => [],
  layout: 'grid',
  logoSize: 'md',
  monochrome: true,
  marqueeSpeed: 'normal',
  pauseOnHover: true,
  surfaceStyle: 'none',
  borderRadius: 'none',
  internalPadding: 'none',
})

const localizedTitle = computed(() => getLocalizedValue(props.title))

function cellLabel(item: LogoItem): string {
  return getLocalizedValue(item.name) || ''
}

// Normalize the repeater rows into flat LogoItem objects.
const logos = computed<LogoItem[]>(() =>
  (props.logos ?? []).map((raw) => {
    const src = raw.settings ?? raw
    return { image: src.image, name: src.name, link: src.link }
  })
)

interface WallCell {
  item: LogoItem
  index: number
  clone: boolean
}

// Build the render list for one wall/tier. Grid renders every logo once;
// marquee appends one exact clone set so translateX(-50%) is seamless.
// `indexBase` offsets data-item-index so real cells stay globally unique
// across tiers (grouped mode); the flat wall uses the default base of 0.
function buildCells(items: LogoItem[], layout: 'grid' | 'marquee', indexBase = 0): WallCell[] {
  const originals: WallCell[] = items.map((item, i) => ({ item, index: indexBase + i, clone: false }))
  if (layout !== 'marquee' || items.length === 0) return originals
  const clones: WallCell[] = originals.map(cell => ({ ...cell, clone: true }))
  return [...originals, ...clones]
}

// Flat wall (grouped = false): a single cell list over the flat logos repeater.
const cells = computed<WallCell[]>(() => buildCells(logos.value, props.layout))

// Tiered walls (grouped = true): normalize each group row + its own logos with
// the same {type,settings} unwrap as the flat wall, then build a per-tier cell
// list. A running index base keeps data-item-index unique across every tier.
const tiers = computed(() => {
  let indexBase = 0
  return (props.groups ?? []).map((raw) => {
    const src = raw.settings ?? raw
    const items: LogoItem[] = (src.logos ?? []).map((rawLogo) => {
      const logoSrc = rawLogo.settings ?? rawLogo
      return { image: logoSrc.image, name: logoSrc.name, link: logoSrc.link }
    })
    const cellList = buildCells(items, props.layout, indexBase)
    indexBase += items.length
    return { label: getLocalizedValue(src.label), cells: cellList }
  })
})

const LOGO_HEIGHT_MAP: Record<'sm' | 'md' | 'lg', string> = {
  sm: '2.8rem',
  md: '4rem',
  lg: '5.6rem',
}

const CELL_MIN_MAP: Record<'sm' | 'md' | 'lg', string> = {
  sm: '9rem',
  md: '12rem',
  lg: '15rem',
}

const MARQUEE_SPEED_DURATION: Record<'slow' | 'normal' | 'fast', string> = {
  slow: '60s',
  normal: '40s',
  fast: '26s',
}

const rootStyle = computed<Record<string, string>>(() => ({
  '--lw-logo-height': LOGO_HEIGHT_MAP[props.logoSize] ?? LOGO_HEIGHT_MAP.md,
  '--lw-cell-min': CELL_MIN_MAP[props.logoSize] ?? CELL_MIN_MAP.md,
  '--lw-marquee-duration': MARQUEE_SPEED_DURATION[props.marqueeSpeed] ?? MARQUEE_SPEED_DURATION.normal,
}))

const wallStyle = computed<Record<string, string>>(() => {
  // The grid columns key off --lw-cell-min so the wall collapses intrinsically
  // (auto-fit + minmax) with no @media column-count juggling.
  if (props.layout === 'grid') {
    return { gridTemplateColumns: `repeat(auto-fit, minmax(var(--lw-cell-min, 12rem), 1fr))` }
  }
  return {}
})

const containerSurfaceClass = computed(() =>
  props.surfaceStyle && props.surfaceStyle !== 'none'
    ? `splash-logo-wall__container--surface-${props.surfaceStyle}`
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

const marqueeStaticInEditor = computed<boolean>(() =>
  props.layout === 'marquee' && isEditor.value
)
</script>

<style lang="scss" scoped>
.splash-logo-wall {
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

  /* ── Grouped (tiered) mode: stack of labeled tiers, each holding its own wall.
        Reuses every __wall/__track/__cell rule below unchanged. ── */
  &__tier {
    & + & {
      margin-block-start: var(--spacing-2xl);

      @media (max-width: $bp-md) {
        margin-block-start: var(--spacing-xl);
      }
    }
  }

  &__tier-label {
    font-family: var(--rt-role-heading3-family, inherit);
    font-size: var(--rt-role-heading3-size, var(--font-size-xl));
    font-weight: var(--rt-role-heading3-weight, var(--font-weight-bold));
    line-height: var(--rt-role-heading3-line-height, inherit);
    letter-spacing: var(--rt-role-heading3-letter-spacing, normal);
    text-transform: var(--rt-role-heading3-text-transform, none);
    color: var(--rt-role-heading3-color, inherit);
    text-align: start;
    margin: 0 0 var(--spacing-lg);

    @media (max-width: $bp-md) {
      margin-block-end: var(--spacing-md);
    }
  }

  /* ── Auto-fit grid: collapses intrinsically, no @media count juggling.
        The grid lives on the inner track; the __wall is a plain wrapper. ── */
  &__wall--grid {
    .splash-logo-wall__track {
      display: grid;
      gap: var(--spacing-xl);
      align-items: center;
      justify-items: center;

      @media (max-width: $bp-sm) {
        gap: var(--spacing-lg);
      }
    }
  }

  /* ── Continuous marquee ──
        __wall is the STATIC clip viewport (overflow:hidden here actually clips,
        because it is not the transformed element); __track is the animated rail. */
  &__wall--marquee {
    overflow: hidden;

    .splash-logo-wall__track {
      display: flex;
      flex-wrap: nowrap;
      width: max-content;
      align-items: center;
      animation: splash-logo-wall-marquee var(--lw-marquee-duration, 40s) linear infinite;
      will-change: transform;
    }

    .splash-logo-wall__cell {
      flex: 0 0 auto;
      // Per-cell right margin is the gap (NOT flex `gap`) so the duplicated set
      // width is an exact multiple and translateX(-50%) is perfectly seamless.
      margin-inline-end: var(--spacing-2xl);
    }

    // pausable: freeze on hover / focus
    &.splash-logo-wall__wall--marquee-pausable:hover .splash-logo-wall__track,
    &.splash-logo-wall__wall--marquee-pausable:focus-within .splash-logo-wall__track {
      animation-play-state: paused;
    }

    // static (editor): no animation, drop clones, allow manual horizontal scroll
    &.splash-logo-wall__wall--marquee-static {
      overflow-x: auto;

      .splash-logo-wall__track {
        animation: none;
      }

      .splash-logo-wall__cell[aria-hidden='true'] {
        display: none;
      }
    }
  }

  @keyframes splash-logo-wall-marquee {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }

  // reduced motion: freeze + drop clones + manual scroll
  @media (prefers-reduced-motion: reduce) {
    .splash-logo-wall__wall--marquee {
      overflow-x: auto;

      .splash-logo-wall__track {
        animation: none;
      }

      .splash-logo-wall__cell[aria-hidden='true'] {
        display: none;
      }
    }
  }

  &__cell {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(var(--lw-logo-height, 4rem) + var(--spacing-md));
    text-decoration: none;
    color: inherit;
  }

  &__img {
    max-height: var(--lw-logo-height, 4rem);
    width: auto;
    max-width: 100%;
    object-fit: contain;
    display: block;
  }

  &__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: var(--lw-logo-height, 4rem);
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px dashed var(--border-color, rgba(0, 0, 0, 0.18));
    border-radius: var(--border-radius-sm, 4px);
    font-size: var(--font-size-sm, 0.85rem);
    color: var(--section-text-secondary, var(--color-text-lighter, #666));
    text-align: center;
  }

  /* ── Monochrome-until-hover treatment (colour/opacity only, kept under
        reduced motion since it is not motion) ── */
  &--monochrome {
    .splash-logo-wall__cell {
      .splash-logo-wall__img,
      .splash-logo-wall__placeholder {
        filter: grayscale(1);
        opacity: 0.55;
        transition: filter var(--transition-base), opacity var(--transition-base);
      }

      &:hover,
      &:focus-visible,
      &:focus-within {
        .splash-logo-wall__img,
        .splash-logo-wall__placeholder {
          filter: grayscale(0);
          opacity: 1;
        }
      }
    }
  }

  &__cell:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 4px;
  }
}
</style>
