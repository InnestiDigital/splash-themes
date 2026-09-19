<template>
  <section
    class="item-grid-block"
    :class="rootClass"
    :style="{ ...rootStyles, ...contentStyle, ...typographyStyle }"
  >
    <div
      class="item-grid-block__grid"
      :style="{ ...gridStyles, ...gridAlignStyle }"
      data-grid
    >
      <div
        v-for="(item, index) in items"
        :key="index"
        class="item-grid-block__item"
        data-target="item"
        :data-item-index="index"
      >
        <span
          v-if="hasIcon(item)"
          class="item-grid-block__icon"
          aria-hidden="true"
        >{{ item.icon }}</span>

        <span
          v-if="hasLabel(item)"
          class="item-grid-block__label"
          data-target="label"
          v-html="asHtml(getLocalizedValue(item.label))"
        ></span>

        <h3
          v-if="hasTitle(item)"
          class="item-grid-block__title"
          v-html="asHtml(getLocalizedValue(item.title))"
        ></h3>

        <span
          v-if="hasValue(item)"
          class="item-grid-block__value"
          data-target="value"
        >{{ getLocalizedValue(item.value) }}{{ item.unit || '' }}</span>

        <div
          v-if="hasDescription(item)"
          class="item-grid-block__description prose"
          v-html="asHtml(getLocalizedValue(item.description))"
        ></div>

        <div v-if="item.tags?.length" class="item-grid-block__tags">
          <component
            v-for="(tag, tIdx) in item.tags"
            :key="tIdx"
            :is="tag.href ? 'a' : 'span'"
            :href="tag.href || undefined"
            :class="['item-grid-block__tag', `item-grid-block__tag--${tagVariant}`, `item-grid-block__tag--${tagSize}`]"
          >{{ tag.label }}</component>
        </div>

        <a
          v-if="item.linkUrl"
          :href="item.linkUrl"
          class="item-grid-block__link"
        >{{ item.linkText || item.linkUrl }}</a>

        <div
          v-if="layout === 'row' && dividerEnabled && index < items.length - 1"
          class="item-grid-block__divider"
          data-target="divider"
          :class="dividerClass"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BackgroundRole, TextRole } from '~/shared/types/placement'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { resolveColumnOverride } from '~/shared/features/cms/placement/responsiveColumns'
import { useBlockSurface } from '~/shared/composables/useBlockSurface'
import { useTypographySlotStyle } from '~/shared/composables/useTypographySlotStyle'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'

const { getLocalizedValue } = useLocalized()
type Layout = 'list' | 'row'
type ListMode = 'stacked' | 'grid'
type DividerStyle = 'line' | 'dot' | 'slash'
type LabelStyle = 'uppercase' | 'small-caps' | 'normal'

interface ItemTag {
  label: string
  href?: string
}

interface GridItem {
  title?: string | Record<string, string>
  description?: string | Record<string, string>
  label?: string | Record<string, string>
  value?: string | Record<string, string>
  unit?: string
  icon?: string
  linkUrl?: string
  linkText?: string
  tags?: ItemTag[]
}

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  blocks?: Array<Record<string, unknown>>
  items?: GridItem[]
  layout?: Layout
  listMode?: ListMode
  columns?: number
  gridColumnMode?: 'auto' | 'fixed'
  columnsTablet?: string
  columnsMobile?: string
  dividerEnabled?: boolean
  dividerStyle?: DividerStyle
  labelStyle?: LabelStyle
  tagVariant?: 'outline' | 'filled' | 'subtle'
  tagSize?: 'sm' | 'md'
  background?: BackgroundRole
  textTone?: TextRole
  internalPadding?: string
  surfaceStyle?: 'none' | 'subtle' | 'filled'
  borderRadius?: string
  itemAlignX?: 'start' | 'center' | 'end' | 'stretch'
  itemAlignY?: 'start' | 'center' | 'end' | 'stretch'
  titlePresetKey?: string | null
  descriptionPresetKey?: string | null
  labelPresetKey?: string | null
  valuePresetKey?: string | null
}>(), {
  items: () => [],
  layout: 'list',
  listMode: 'stacked',
  columns: 3,
  gridColumnMode: 'auto',
  dividerEnabled: true,
  dividerStyle: 'line',
  labelStyle: 'normal',
  tagVariant: 'outline',
  tagSize: 'sm',
  internalPadding: 'md',
  surfaceStyle: 'none',
  borderRadius: 'none',
})

const typographyStyle = useTypographySlotStyle({
  title: computed(() => props.titlePresetKey),
  description: computed(() => props.descriptionPresetKey),
  label: computed(() => props.labelPresetKey),
  value: computed(() => props.valuePresetKey),
})

const items = computed(() => props.items || [])

function isPresent(v: unknown): boolean {
  if (v === undefined || v === null) return false
  if (typeof v === 'string') return v.length > 0
  if (typeof v === 'object') return Object.keys(v as Record<string, unknown>).length > 0
  return true
}
function hasTitle(item: GridItem) { return isPresent(item.title) }
function hasDescription(item: GridItem) { return isPresent(item.description) }
function hasLabel(item: GridItem) { return isPresent(item.label) }
function hasValue(item: GridItem) { return isPresent(item.value) }
function hasIcon(item: GridItem) { return typeof item.icon === 'string' && item.icon.length > 0 }

const rootClass = computed(() => [
  `item-grid-block--${props.layout}`,
  props.layout === 'list' ? `item-grid-block--list-${props.listMode}` : null,
  `item-grid-block--label-${props.labelStyle}`,
  props.layout === 'list' && props.listMode === 'grid' && props.gridColumnMode === 'fixed' ? 'item-grid-block--cols-fixed' : null,
])

const dividerClass = computed(() => `item-grid-block__divider--${props.dividerStyle}`)

const { surfaceStyle: blockSurfaceStyle } = useBlockSurface(props, { fallbackBackground: 'section' })

const rootStyles = computed(() => {
  const styles: Record<string, string> = {}
  Object.assign(styles, blockSurfaceStyle.value)
  return styles
})

const gridStyles = computed(() => {
  const styles: Record<string, string> = {}
  if (props.layout === 'list' && props.listMode === 'grid') {
    if (props.gridColumnMode === 'fixed') {
      const cols = Math.min(Math.max(Number(props.columns) || 3, 1), 6)
      styles['--item-grid-cols'] = String(cols)
      const colsTablet = resolveColumnOverride(props.columnsTablet)
      const colsMobile = resolveColumnOverride(props.columnsMobile)
      if (colsTablet !== null) styles['--item-grid-cols-tablet'] = String(colsTablet)
      if (colsMobile !== null) styles['--item-grid-cols-mobile'] = String(colsMobile)
      // grid-template-columns handled by the .item-grid-block--cols-fixed CSS rule so container queries apply
    } else {
      styles.gridTemplateColumns = `repeat(auto-fill, minmax(300px, 1fr))`
    }
  } else if (props.layout === 'row') {
    // For row layout, columns prop only applies when caller wants a true grid.
    // Otherwise we stay flex-based for the auto-shrinking row behavior.
    if (props.columns && props.columns > 0) {
      styles['--item-grid-block-columns'] = String(Math.min(Math.max(props.columns, 2), 6))
    }
  }
  return styles
})

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  if (props.surfaceStyle === 'subtle') {
    style.background = 'var(--section-surface, rgba(255,255,255,0.04))'
  } else if (props.surfaceStyle === 'filled') {
    style.background = 'var(--section-accent, rgba(255,255,255,0.1))'
  }
  if (props.borderRadius && props.borderRadius !== 'none') {
    style.borderRadius = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0'
  }
  return style
})

const gridAlignStyle = computed<Record<string, string>>(() => {
  const s: Record<string, string> = {}
  if (props.itemAlignX) s.justifyItems = props.itemAlignX
  if (props.itemAlignY) s.alignItems = props.itemAlignY
  return s
})
</script>

<style lang="scss" scoped>
.item-grid-block {
  // Row layout (was facts-row)
  &--row {
    padding: var(--spacing-xl) var(--spacing-md);

    .item-grid-block__grid {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-xl);
      max-width: 120rem;
      margin: 0 auto;
    }

    .item-grid-block__item {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      position: relative;
      padding: var(--spacing-sm) var(--spacing-md);
    }

    .item-grid-block__label {
      order: -1;
    }
  }

  // List — stacked
  &--list.item-grid-block--list-stacked {
    .item-grid-block__grid {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
  }

  // List — grid
  &--list.item-grid-block--list-grid {
    .item-grid-block__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 2rem;
    }
  }

  &--list.item-grid-block--list-grid.item-grid-block--cols-fixed {
    .item-grid-block__grid {
      grid-template-columns: repeat(var(--item-grid-cols, 3), 1fr);

      @container (max-width: #{$bp-lg}) {
        grid-template-columns: repeat(var(--item-grid-cols-tablet, min(var(--item-grid-cols, 3), 2)), 1fr);
      }
      @container (max-width: #{$bp-md}) {
        grid-template-columns: repeat(var(--item-grid-cols-mobile, 1), 1fr);
      }
    }
  }

  &--list .item-grid-block__item {
    padding: 2.4rem 0;
    border-bottom: 1px solid var(--section-border, rgba(255,255,255,0.12));
  }

  &__icon {
    display: inline-block;
    font-size: 2rem;
    margin-bottom: 0.6rem;
  }

  &__title {
    font-family: var(--rt-slot-title-family, var(--rt-role-heading3-family, var(--font-family-heading, 'dm-serif-display', Georgia, serif)));
    font-size: var(--rt-slot-title-size, var(--rt-role-heading3-size, 2.4rem));
    font-weight: var(--rt-slot-title-weight, var(--rt-role-heading3-weight, 600));
    line-height: var(--rt-slot-title-line-height, var(--rt-role-heading3-line-height, inherit));
    letter-spacing: var(--rt-slot-title-letter-spacing, var(--rt-role-heading3-letter-spacing, -0.02em));
    text-transform: var(--rt-slot-title-text-transform, var(--rt-role-heading3-text-transform, none));
    font-variation-settings: var(--rt-slot-title-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-title-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-title-font-stretch, normal);
    font-style: var(--rt-slot-title-font-style, normal);
    color: var(--rt-slot-title-color, var(--rt-role-heading3-color, var(--section-text, inherit)));
    margin: 0 0 0.8rem;
  }

  &__description {
    font-family: var(--rt-slot-description-family, var(--rt-role-body-family, inherit));
    font-size: var(--rt-slot-description-size, var(--rt-role-body-size, 1.6rem));
    font-weight: var(--rt-slot-description-weight, var(--rt-role-body-weight, inherit));
    line-height: var(--rt-slot-description-line-height, var(--rt-role-body-line-height, 1.7));
    letter-spacing: var(--rt-slot-description-letter-spacing, var(--rt-role-body-letter-spacing, normal));
    text-transform: var(--rt-slot-description-text-transform, var(--rt-role-body-text-transform, none));
    color: var(--rt-slot-description-color, var(--rt-role-body-color, inherit));
    opacity: 0.7;
    margin: 0 0 1.2rem;
    max-width: 60ch;
  }

  &__label {
    font-family: var(--rt-slot-label-family, var(--rt-role-label-family, inherit));
    font-size: var(--rt-slot-label-size, var(--rt-role-label-size, var(--font-size-sm)));
    font-weight: var(--rt-slot-label-weight, var(--rt-role-label-weight, var(--font-weight-medium)));
    line-height: var(--rt-slot-label-line-height, var(--rt-role-label-line-height, normal));
    letter-spacing: var(--rt-slot-label-letter-spacing, var(--rt-role-label-letter-spacing, normal));
    text-transform: var(--rt-slot-label-text-transform, var(--rt-role-label-text-transform, none));
    font-variation-settings: var(--rt-slot-label-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-label-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-label-font-stretch, normal);
    font-style: var(--rt-slot-label-font-style, normal);
    color: var(--rt-slot-label-color, var(--rt-role-label-color, inherit));
    opacity: 0.7;
    margin-block-end: var(--spacing-xs);
  }

  &--label-uppercase &__label {
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  &--label-small-caps &__label {
    font-variant: small-caps;
  }

  &__value {
    font-family: var(--rt-slot-value-family, var(--rt-role-heading3-family, inherit));
    font-size: var(--rt-slot-value-size, var(--rt-role-heading3-size, var(--font-size-xl)));
    font-weight: var(--rt-slot-value-weight, var(--rt-role-heading3-weight, var(--font-weight-bold)));
    line-height: var(--rt-slot-value-line-height, var(--rt-role-heading3-line-height, 1.2));
    letter-spacing: var(--rt-slot-value-letter-spacing, var(--rt-role-heading3-letter-spacing, normal));
    text-transform: var(--rt-slot-value-text-transform, var(--rt-role-heading3-text-transform, none));
    font-variation-settings: var(--rt-slot-value-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-value-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-value-font-stretch, normal);
    font-style: var(--rt-slot-value-font-style, normal);
    color: var(--rt-slot-value-color, var(--rt-role-heading3-color, inherit));
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  &__tag {
    display: inline-block;
    border-radius: 999px;
    text-decoration: none;
    font-size: var(--type-tag-size, 12px);
    letter-spacing: var(--type-tag-letter-spacing, 0.5px);
    font-weight: 600;
    white-space: nowrap;
    color: var(--section-text, inherit);
    transition: opacity 0.15s ease;

    &:hover { opacity: 0.7; }

    &--sm { padding: 0.25rem 0.75rem; }
    &--md { padding: 0.375rem 1rem; }

    &--outline {
      border: 1px solid var(--section-border, #e0e0e0);
      background: transparent;
    }
    &--filled {
      background: var(--section-accent, var(--color-primary));
      color: #fff;
      border: none;
    }
    &--subtle {
      background: rgba(0, 0, 0, 0.05);
      border: none;
    }
  }

  &__link {
    display: inline-block;
    margin-top: 0.5rem;
    font-size: var(--font-size-sm, 14px);
    color: var(--color-primary, inherit);
    text-decoration: underline;
    text-underline-offset: 0.2em;

    &:hover { opacity: 0.7; }
  }

  // Dividers (row layout only)
  &__divider {
    position: absolute;
    right: calc(var(--spacing-xl) * -0.5 - 0.1rem);
    top: 50%;
    transform: translateY(-50%);

    &--line {
      width: 0.1rem;
      height: 3.2rem;
      background-color: currentColor;
      opacity: 0.2;
    }

    &--dot::after {
      content: '\00B7';
      font-size: var(--font-size-2xl);
      opacity: 0.4;
    }

    &--slash::after {
      content: '/';
      font-size: var(--font-size-lg);
      opacity: 0.3;
    }
  }

  @media (max-width: $bp-md) {
    &--row .item-grid-block__grid {
      flex-wrap: wrap;
    }
    &__divider {
      display: none;
    }
  }
}
</style>
