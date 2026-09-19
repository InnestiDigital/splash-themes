<template>
  <section class="profile-grid" :class="rootClasses" :style="{ ...rootStyles }" data-target="root">
    <div class="profile-grid__container" :class="layoutClass" :style="{ ...contentStyle, ...gridAlignStyle }" data-grid>
      <div
        v-for="(item, index) in profileItems"
        :key="index"
        class="profile-grid__card"
        :class="cardClasses"
        data-target="items"
        :data-item-index="index"
        @click="onCardClick(index)"
      >
        <div
          v-if="item.avatar"
          class="profile-grid__avatar"
          :class="avatarClass"
          :style="{ backgroundImage: `url(${item.avatar})` }"
          role="img"
          :aria-label="item.avatarAlt || stripHtml(asHtml(getLocalizedValue(item.name)))"
          data-target="avatar"
          :data-item-index="index"
        />
        <div
          v-else
          class="profile-grid__avatar profile-grid__avatar--placeholder"
          :class="avatarClass"
          aria-hidden="true"
          data-target="avatar"
          :data-item-index="index"
        >
          {{ getInitials(stripHtml(asHtml(getLocalizedValue(item.name)))) }}
        </div>

        <h3 class="profile-grid__name" data-target="name" :data-item-index="index" v-html="asHtml(getLocalizedValue(item.name))"></h3>

        <p v-if="item.role" class="profile-grid__role" data-target="role" :data-item-index="index" v-html="asHtml(getLocalizedValue(item.role))"></p>

        <div
          v-if="item.bio"
          class="profile-grid__bio prose"
          :class="bioClasses(index)"
          v-html="asHtml(getLocalizedValue(item.bio))"
        ></div>

        <div v-if="item.links && item.links.length" class="profile-grid__links">
          <a
            v-for="(link, linkIndex) in item.links"
            :key="linkIndex"
            :href="link.url"
            class="profile-grid__link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span v-if="link.icon" class="material-icons-outlined profile-grid__link-icon" aria-hidden="true">{{ link.icon }}</span>
            <span v-if="getLocalizedValue(link.label)" class="profile-grid__link-label">{{ getLocalizedValue(link.label) }}</span>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BackgroundRole } from '~/shared/types/placement'
import { computed, ref } from 'vue'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { resolveColumnOverride } from '~/shared/features/cms/placement/responsiveColumns'
import { asHtml } from '~/shared/utils/asHtml'
import { useBlockSurface } from '~/shared/composables/useBlockSurface'
import { useLocalized } from '~/shared/composables/useLocalized'

const { getLocalizedValue } = useLocalized()
interface ProfileLink {
  label?: string | Record<string, string>
  url?: string
  icon?: string
}

interface ProfileItem {
  name: string | Record<string, string>
  role?: string | Record<string, string>
  avatar?: string
  avatarAlt?: string
  bio?: string | Record<string, string>
  links?: ProfileLink[]
}

type LayoutMode = 'grid' | 'masonry'
type BioMode = 'hover' | 'click' | 'always'
type CardStyle = 'minimal' | 'bordered' | 'elevated'
type AvatarShape = 'circle' | 'square' | 'rounded'
type SurfaceStyle = 'none' | 'subtle' | 'filled'

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  blocks?: Array<Record<string, unknown>>
  items?: ProfileItem[]
  columns?: string
  columnsTablet?: string
  columnsMobile?: string
  layout?: LayoutMode
  showBio?: BioMode
  surfaceStyle?: SurfaceStyle
  cardStyle?: CardStyle
  avatarShape?: AvatarShape
  background?: BackgroundRole
  internalPadding?: string
  borderRadius?: string
  itemAlignX?: 'start' | 'center' | 'end' | 'stretch'
  itemAlignY?: 'start' | 'center' | 'end' | 'stretch'
}>(), {
  items: () => [],
  columns: '3',
  columnsTablet: 'auto',
  columnsMobile: 'auto',
  layout: 'grid',
  showBio: 'hover',
  surfaceStyle: 'none',
  cardStyle: 'minimal',
  avatarShape: 'circle',
})

const expandedIndex = ref<number | null>(null)

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

function getInitials(name: string): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function onCardClick(index: number) {
  if (props.showBio !== 'click') return
  expandedIndex.value = expandedIndex.value === index ? null : index
}

const profileItems = computed(() => props.items || [])

const rootClasses = computed(() => [
  `profile-grid--${props.layout}`,
  props.surfaceStyle !== 'none' ? `profile-grid--surface-${props.surfaceStyle}` : '',
])

const { surfaceStyle } = useBlockSurface(props, { fallbackBackground: 'section' })

const rootStyles = computed(() => {
  const styles: Record<string, string> = {}
  const colsTablet = resolveColumnOverride(props.columnsTablet)
  const colsMobile = resolveColumnOverride(props.columnsMobile)
  if (props.layout === 'grid') {
    styles['--profile-grid-cols'] = props.columns || '3'
    if (colsTablet !== null) styles['--profile-grid-cols-tablet'] = String(colsTablet)
    if (colsMobile !== null) styles['--profile-grid-cols-mobile'] = String(colsMobile)
  }
  if (props.layout === 'masonry') {
    styles['--profile-grid-masonry-cols'] = props.columns || '3'
    if (colsTablet !== null) styles['--profile-grid-masonry-cols-tablet'] = String(colsTablet)
    if (colsMobile !== null) styles['--profile-grid-masonry-cols-mobile'] = String(colsMobile)
  }
  if (props.borderRadius && props.borderRadius !== 'none') {
    styles['--profile-card-radius'] = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0'
  }
  Object.assign(styles, surfaceStyle.value)
  return styles
})

const layoutClass = computed(() =>
  props.layout === 'masonry' ? 'profile-grid__container--masonry' : 'profile-grid__container--grid',
)

const cardClasses = computed(() => [
  `profile-grid__card--${props.cardStyle}`,
])

const avatarClass = computed(() => `profile-grid__avatar--${props.avatarShape}`)

function bioClasses(index: number) {
  return [
    `profile-grid__bio--${props.showBio}`,
    props.showBio === 'click' && expandedIndex.value === index ? 'profile-grid__bio--expanded' : '',
  ]
}

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
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
.profile-grid {
  padding: var(--spacing-2xl) var(--spacing-md);

  @media (max-width: $bp-md) {
    padding: var(--spacing-xl) var(--spacing-md);
  }

  &--surface-subtle {
    background-color: var(--color-background-light, rgba(0,0,0,0.04));
  }

  &--surface-filled {
    background-color: var(--section-bg, var(--color-background));
  }

  &__container {
    max-width: 120rem;
    margin: 0 auto;

    &--grid {
      display: grid;
      grid-template-columns: repeat(var(--profile-grid-cols, 3), 1fr);
      gap: var(--spacing-xl);

      @container (max-width: #{$bp-lg}) {
        grid-template-columns: repeat(var(--profile-grid-cols-tablet, 2), 1fr);
      }

      @container (max-width: #{$bp-md}) {
        grid-template-columns: repeat(var(--profile-grid-cols-mobile, 1), 1fr);
      }
    }

    &--masonry {
      column-count: var(--profile-grid-masonry-cols, 3);
      column-gap: var(--spacing-xl);

      @container (max-width: #{$bp-lg}) {
        column-count: var(--profile-grid-masonry-cols-tablet, 2);
      }

      @container (max-width: #{$bp-md}) {
        column-count: var(--profile-grid-masonry-cols-mobile, 1);
      }

      .profile-grid__card {
        break-inside: avoid;
        margin-block-end: var(--spacing-xl);
      }
    }
  }

  &__card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: var(--spacing-xl);
    transition: all var(--transition-base);

    &--minimal {
      background: transparent;
    }

    &--bordered {
      border: 0.1rem solid var(--border-color);
      border-radius: var(--profile-card-radius, var(--border-radius-lg));
    }

    &--elevated {
      background: var(--color-background);
      border-radius: var(--profile-card-radius, var(--border-radius-lg));
      box-shadow: var(--shadow-sm);

      &:hover {
        box-shadow: var(--shadow-md);
        transform: translateY(-0.2rem);
      }
    }
  }

  &__avatar {
    width: 12rem;
    height: 12rem;
    background-size: cover;
    background-position: center;
    flex-shrink: 0;
    margin-block-end: var(--spacing-md);

    &--circle {
      border-radius: var(--border-radius-full);
    }

    &--square {
      border-radius: 0;
    }

    &--rounded {
      border-radius: var(--border-radius-lg);
    }

    &--placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--color-primary);
      color: var(--color-background);
      font-weight: var(--font-weight-bold);
      font-size: var(--font-size-2xl);
    }
  }

  &__name {
    font-family: var(--rt-role-heading3-family, inherit);
    font-size: var(--rt-role-heading3-size, var(--font-size-lg));
    font-weight: var(--rt-role-heading3-weight, var(--font-weight-semibold));
    line-height: var(--rt-role-heading3-line-height, var(--line-height-tight));
    letter-spacing: var(--rt-role-heading3-letter-spacing, normal);
    text-transform: var(--rt-role-heading3-text-transform, none);
    color: var(--rt-role-heading3-color, var(--color-text));
    margin: 0 0 var(--spacing-xs);
  }

  &__role {
    font-family: var(--rt-role-caption-family, inherit);
    font-size: var(--rt-role-caption-size, var(--font-size-sm));
    font-weight: var(--rt-role-caption-weight, inherit);
    line-height: var(--rt-role-caption-line-height, inherit);
    letter-spacing: var(--rt-role-caption-letter-spacing, normal);
    text-transform: var(--rt-role-caption-text-transform, none);
    color: var(--rt-role-caption-color, var(--color-text-light));
    margin: 0 0 var(--spacing-sm);
  }

  &__bio {
    font-family: var(--rt-role-body-family, inherit);
    font-size: var(--rt-role-body-size, var(--font-size-base));
    font-weight: var(--rt-role-body-weight, inherit);
    line-height: var(--rt-role-body-line-height, var(--line-height-relaxed));
    letter-spacing: var(--rt-role-body-letter-spacing, normal);
    text-transform: var(--rt-role-body-text-transform, none);
    color: var(--rt-role-body-color, var(--color-text-light));
    margin: 0 0 var(--spacing-md);

    // Hover-reveal bio: hidden until hover ONLY on fine pointers that can hover.
    // Touch/coarse pointers can't hover, so the bio stays visible there — otherwise it is
    // permanently unreachable. Keyboard users reveal it by focusing a card link (:focus-within).
    // Mirrors GridBlock's caption-reveal-hover guard.
    &--hover {
      @media (hover: hover) and (pointer: fine) {
        opacity: 0;
        max-height: 0;
        overflow: hidden;
        transition: opacity var(--transition-base), max-height var(--transition-base);

        .profile-grid__card:hover &,
        .profile-grid__card:focus-within & {
          opacity: 1;
          max-height: 20rem;
        }
      }
    }

    &--click {
      opacity: 0;
      max-height: 0;
      overflow: hidden;
      transition: opacity var(--transition-base), max-height var(--transition-base);
    }

    &--expanded {
      opacity: 1;
      max-height: 20rem;
    }

    &--always {
      opacity: 1;
    }
  }

  &__links {
    display: flex;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
    justify-content: center;
    margin-block-start: auto;
  }

  &__link {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--color-primary);
    text-decoration: none;
    font-size: var(--font-size-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--border-radius);
    transition: background-color var(--transition-base);

    &:hover {
      background-color: color-mix(in srgb, var(--color-primary) 8%, transparent);
    }

    &:focus-visible {
      outline: 0.2rem solid var(--color-primary);
      outline-offset: 0.2rem;
    }
  }

  &__link-icon {
    font-size: var(--font-size-base);
  }

  &__link-label {
    font-weight: var(--font-weight-medium);
  }
}
</style>
