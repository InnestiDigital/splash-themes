<template>
  <nav class="breadcrumb-nav" aria-label="Breadcrumb" :style="{ ...contentStyle, ...typographyStyle }">
    <ol class="breadcrumb-nav__list">
      <li v-if="showHome" class="breadcrumb-nav__item">
        <NuxtLink to="/" class="breadcrumb-nav__link">
          {{ homeLabelText }}
        </NuxtLink>
        <span v-if="breadcrumbs.length > 0" class="breadcrumb-nav__separator" aria-hidden="true">
          {{ separator || '/' }}
        </span>
      </li>

      <li
        v-for="(crumb, index) in breadcrumbs"
        :key="crumb.path"
        class="breadcrumb-nav__item"
      >
        <NuxtLink
          :to="crumb.path"
          :aria-current="index === breadcrumbs.length - 1 ? 'page' : undefined"
          class="breadcrumb-nav__link"
          :class="{ 'breadcrumb-nav__link--current': index === breadcrumbs.length - 1 }"
        >
          {{ crumb.label }}
        </NuxtLink>
        <span v-if="index < breadcrumbs.length - 1" class="breadcrumb-nav__separator" aria-hidden="true">
          {{ separator || '/' }}
        </span>
      </li>
    </ol>
  </nav>
</template>

<script lang="ts">
export interface BreadcrumbTrailEntry {
  path: string
  label: string
}

/** Title-case a slug segment — the fallback when the config tree has no page
 *  for it (e.g. a dynamic article slug under a blog index). */
function labelFromSlug(segment: string): string {
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Build the full ancestor trail for a route from the site config's nested
 * `pages` tree, one entry per path segment. Real page titles win; segments
 * with no tree match (dynamic article slugs) fall back to a slug-derived
 * label. Pure — exported so other chrome (PageHeader's breadcrumb) can render
 * the same trail without duplicating the resolution.
 */
interface BreadcrumbPageNode {
  title?: string | Record<string, string>
  pages?: Record<string, BreadcrumbPageNode>
}

export function buildBreadcrumbTrail(
  pagesTree: Record<string, BreadcrumbPageNode> | undefined,
  routePath: string,
  localize: (value: string | Record<string, string> | undefined, fallback?: string) => string,
): BreadcrumbTrailEntry[] {
  const parts = routePath.split('/').filter(p => p !== '')
  const trail: BreadcrumbTrailEntry[] = []
  // Like NavMenuItem.children, `pages` is optional on legacy/leaf nodes —
  // always walk it defensively.
  let current = pagesTree
  for (const [index, segment] of parts.entries()) {
    const page = current?.[segment]
    const fallback = labelFromSlug(segment)
    trail.push({
      path: '/' + parts.slice(0, index + 1).join('/'),
      label: page ? localize(page.title, fallback) || fallback : fallback,
    })
    current = page?.pages
  }
  return trail
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { SPACING_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { useTypographySlotStyle } from '~/shared/composables/useTypographySlotStyle'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useClientConfig } from '~/shared/composables/useClientConfig'

const { getLocalizedValue } = useLocalized()

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  blocks?: Array<Record<string, unknown>>
  separator?: string
  showHome?: boolean
  homeLabel?: string | Record<string, string>
  internalPadding?: string
  segmentPresetKey?: string | null
}>(), {
  separator: '/',
  showHome: true,
})

const typographyStyle = useTypographySlotStyle({
  segment: computed(() => props.segmentPresetKey),
})

const route = useRoute()
const { config } = useClientConfig()

const homeLabelText = computed(() =>
  getLocalizedValue(props.homeLabel, 'Home')
)

const breadcrumbs = computed((): BreadcrumbTrailEntry[] => {
  if (props.isPreview) return []
  return buildBreadcrumbTrail(config.value?.pages, route.path, getLocalizedValue)
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
.breadcrumb-nav {
  padding: var(--spacing-md) 0;

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  &__link {
    font-family: var(--rt-slot-segment-family, var(--rt-role-label-family, inherit));
    font-size: var(--rt-slot-segment-size, var(--rt-role-label-size, var(--font-size-base)));
    font-weight: var(--rt-slot-segment-weight, var(--rt-role-label-weight, inherit));
    line-height: var(--rt-slot-segment-line-height, var(--rt-role-label-line-height, normal));
    letter-spacing: var(--rt-slot-segment-letter-spacing, var(--rt-role-label-letter-spacing, normal));
    text-transform: var(--rt-slot-segment-text-transform, var(--rt-role-label-text-transform, none));
    color: var(--rt-slot-segment-color, var(--rt-role-label-color, var(--color-primary)));
    text-decoration: none;
    transition: all var(--transition-base);
    padding: 0.4rem var(--spacing-xs);
    border-radius: var(--border-radius);

    &:hover {
      background-color: var(--color-primary-subtle);
      text-decoration: underline;
    }

    &:focus-visible {
      outline: 0.2rem solid var(--color-primary);
      outline-offset: 0.2rem;
    }

    &--current {
      color: var(--color-text);
      cursor: default;
      pointer-events: none;
      font-weight: var(--font-weight-semibold);

      &:hover {
        background-color: transparent;
        text-decoration: none;
      }
    }

    @media (max-width: $bp-md) {
      font-size: var(--rt-slot-segment-size, var(--rt-role-label-size, var(--font-size-sm)));
    }
  }

  &__separator {
    color: var(--color-text-lighter);
    font-size: var(--font-size-sm);
    opacity: 0.6;
  }
}
</style>
