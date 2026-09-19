<template>
  <!-- No zero-DOM collapse by default: a configured-but-empty block explains
       itself (empty message) unless the author explicitly picks `hide` —
       same contract as DocumentList's empty state. -->
  <section
    v-if="hasChildren || showEmptyState"
    class="child-page-list"
    :class="`child-page-list--${display}`"
    data-target="root"
  >
    <h3
      v-if="localizedHeading"
      class="child-page-list__heading"
      data-target="sectionHeading"
      v-html="asHtml(localizedHeading)"
    ></h3>

    <p v-if="!hasChildren" class="child-page-list__empty" data-empty>
      {{ emptyText }}
    </p>

    <ul v-else class="child-page-list__items" data-grid>
      <li
        v-for="entry in entries"
        :key="entry.path"
        class="child-page-list__item"
        data-target="item"
      >
        <NuxtLink :to="entry.path" class="child-page-list__link">
          <span
            v-if="showThumbs && entry.featuredImageUrl"
            class="child-page-list__thumb"
          >
            <img :src="entry.featuredImageUrl" alt="" loading="lazy" />
          </span>
          <span class="child-page-list__label">
            <span class="child-page-list__title" data-target="title">{{ entry.title }}</span>
            <span
              v-if="showCount && entry.childCount > 0"
              class="child-page-list__count"
              data-target="count"
            >{{ entry.childCount }}</span>
          </span>
        </NuxtLink>

        <ul
          v-if="display === 'list' && entry.children && entry.children.length > 0"
          class="child-page-list__sublist"
        >
          <li
            v-for="child in entry.children"
            :key="child.path"
            class="child-page-list__subitem"
          >
            <NuxtLink :to="child.path" class="child-page-list__sublink">
              {{ child.title }}
            </NuxtLink>
          </li>
        </ul>
      </li>
    </ul>
  </section>
</template>

<script lang="ts">
/**
 * Pure child-page resolution over the site config's nested `pages` tree.
 * Exported for tests and for any other chrome that needs the same walk
 * (mirrors BreadcrumbNav's `buildBreadcrumbTrail` pattern).
 */

/** Minimal tree-node shape — the fields this block reads off `config.pages`.
 *  `position`, `featuredImageUrl` and `pages` are all optional so the block
 *  degrades gracefully on configs exported before those fields existed. */
export interface ChildPageNode {
  title?: string | Record<string, string>
  pages?: Record<string, ChildPageNode>
  /** Authored sibling order — key order is NOT authored order (integer-like
   *  slugs hoist in `Object.keys`), so sorting always goes through this. */
  position?: number
  featuredImageUrl?: string | null
}

export interface ChildPageEntry {
  slug: string
  path: string
  title: string
  position?: number
  featuredImageUrl?: string | null
  /** Number of child pages the entry itself has. */
  childCount: number
  children?: ChildPageEntry[]
}

export type ChildPageSort = 'position' | 'title'

type Localize = (value: string | Record<string, string> | undefined, fallback?: string) => string

/** Walk the tree along a route path; null when any segment has no node. */
export function resolveNodeByPath(
  tree: Record<string, ChildPageNode> | undefined,
  routePath: string,
): { node: ChildPageNode, path: string } | null {
  const parts = routePath.split('/').filter(p => p !== '')
  let current: ChildPageNode | undefined
  let children = tree
  for (const segment of parts) {
    current = children?.[segment]
    if (!current) return null
    children = current.pages
  }
  if (!current) return null
  return { node: current, path: '/' + parts.join('/') }
}

/** Depth-first search for the first node with a given slug key, accumulating
 *  its full path. Used by the `children-of-page` source, whose picker stores
 *  a slug (not a path). */
export function findNodeBySlug(
  tree: Record<string, ChildPageNode> | undefined,
  slug: string,
  basePath = '',
): { node: ChildPageNode, path: string } | null {
  if (!tree) return null
  for (const [key, node] of Object.entries(tree)) {
    const path = `${basePath}/${key}`
    if (key === slug) return { node, path }
    const nested = findNodeBySlug(node.pages, slug, path)
    if (nested) return nested
  }
  return null
}

function sortEntries(entries: ChildPageEntry[], sort: ChildPageSort): ChildPageEntry[] {
  return [...entries].sort((a, b) => {
    if (sort === 'title') return a.title.localeCompare(b.title)
    const pa = a.position ?? Number.MAX_SAFE_INTEGER
    const pb = b.position ?? Number.MAX_SAFE_INTEGER
    if (pa !== pb) return pa - pb
    return a.title.localeCompare(b.title)
  })
}

/** Title-case a slug — fallback when a node has no usable title. */
function labelFromSlug(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** Flatten a node's children into sorted display entries; `depth: 2` nests
 *  one further level under each entry. */
export function collectChildEntries(
  parent: ChildPageNode,
  parentPath: string,
  options: { depth: number, sort: ChildPageSort },
  localize: Localize,
): ChildPageEntry[] {
  const children = parent.pages ?? {}
  const entries = Object.entries(children).map(([slug, node]): ChildPageEntry => {
    const path = `${parentPath}/${slug}`
    const entry: ChildPageEntry = {
      slug,
      path,
      title: localize(node.title, labelFromSlug(slug)) || labelFromSlug(slug),
      position: node.position,
      featuredImageUrl: node.featuredImageUrl ?? null,
      childCount: Object.keys(node.pages ?? {}).length,
    }
    if (options.depth >= 2 && entry.childCount > 0) {
      entry.children = collectChildEntries(node, path, { ...options, depth: 1 }, localize)
    }
    return entry
  })
  return sortEntries(entries, options.sort)
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useClientConfig } from '~/shared/composables/useClientConfig'

const { t } = useI18n()
const { getLocalizedValue } = useLocalized()

type Display = 'list' | 'card' | 'grid'
type Source = 'children-of-current' | 'children-of-page'

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  sectionHeading?: string | Record<string, string>
  source?: Source
  parentPage?: string
  depth?: string | number
  sort?: ChildPageSort
  display?: Display
  showThumbnail?: boolean
  showCount?: boolean
  emptyBehaviour?: 'message' | 'hide'
  emptyMessage?: string | Record<string, string>
}>(), {
  source: 'children-of-current',
  sort: 'position',
  display: 'list',
  showThumbnail: true,
  showCount: false,
  emptyBehaviour: 'message',
})

const route = useRoute()
const { config } = useClientConfig()

const localizedHeading = computed(() => getLocalizedValue(props.sectionHeading))
const display = computed<Display>(() => props.display || 'list')
const depth = computed(() => Number(props.depth) >= 2 ? 2 : 1)

/** The parent whose children we list, with the base path its child links hang off. */
const parent = computed(() => {
  const tree = config.value?.pages
  if (props.source === 'children-of-page' && props.parentPage) {
    // The picker stores a slug; an authored leading-slash path also resolves.
    return props.parentPage.startsWith('/')
      ? resolveNodeByPath(tree, props.parentPage)
      : findNodeBySlug(tree, props.parentPage)
  }
  return resolveNodeByPath(tree, route.path)
})

const entries = computed((): ChildPageEntry[] => {
  if (!parent.value) return []
  return collectChildEntries(
    parent.value.node,
    parent.value.path,
    { depth: depth.value, sort: props.sort || 'position' },
    getLocalizedValue,
  )
})

const hasChildren = computed(() => entries.value.length > 0)
// In the editor preview the empty state always shows, so an unresolvable
// source (or a page with no children yet) never leaves an invisible,
// unselectable block.
const showEmptyState = computed(() => props.emptyBehaviour !== 'hide' || props.isPreview === true)
const showThumbs = computed(() => props.showThumbnail && display.value !== 'list')

// Authored empty-state copy wins; the i18n string is the fallback so an empty
// list never renders as silent blank space.
const emptyText = computed(() =>
  getLocalizedValue(props.emptyMessage) || t('childPageList.empty', 'No pages in this section yet.'),
)
</script>

<style lang="scss" scoped>
.child-page-list {
  &__heading {
    margin: 0 0 var(--spacing-lg);
    font-family: var(--rt-slot-sectionHeading-family, var(--rt-role-heading3-family, var(--font-family-heading)));
    font-size: var(--rt-slot-sectionHeading-size, var(--rt-role-heading3-size, var(--font-size-xl)));
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-heading);
    color: var(--section-text, var(--color-text));
  }

  &__empty {
    margin: 0;
    color: var(--section-text-muted, var(--color-text-muted));
    font-size: var(--font-size-base);
  }

  &__items {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  &__link {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    color: var(--section-text, var(--color-text));
    text-decoration: none;

    &:hover .child-page-list__title,
    &:focus-visible .child-page-list__title {
      color: var(--color-accent);
    }
  }

  &__label {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-sm);
    min-width: 0;
  }

  &__title {
    font-size: var(--font-size-lg);
    line-height: var(--line-height-tight);
    transition: color var(--transition-fast);
  }

  &__count {
    color: var(--section-text-muted, var(--color-text-muted));
    font-size: var(--font-size-sm);
  }

  &__thumb {
    flex-shrink: 0;
    overflow: hidden;
    border-radius: var(--border-radius);
    background: var(--color-background-light);

    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  // ── List — editorial rows with hairline dividers ─────────────────────────
  &--list {
    .child-page-list__item {
      padding: var(--spacing-md) 0;
      border-bottom: 1px solid var(--section-border, var(--border-color));

      &:first-child { border-top: 1px solid var(--section-border, var(--border-color)); }
    }

    .child-page-list__sublist {
      list-style: none;
      margin: var(--spacing-sm) 0 0;
      padding: 0 0 0 var(--spacing-lg);
    }

    .child-page-list__subitem { padding: var(--spacing-xs) 0; }

    .child-page-list__sublink {
      color: var(--section-text-muted, var(--color-text-muted));
      font-size: var(--font-size-base);
      text-decoration: none;

      &:hover,
      &:focus-visible { color: var(--color-accent); }
    }
  }

  // ── Card / grid — responsive track with an intrinsic floor clamp, so the
  //    column minimum can never overflow a narrow container (no @media). ────
  &--card,
  &--grid {
    .child-page-list__items {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(24rem, 100%), 1fr));
      gap: var(--spacing-lg);
    }

    .child-page-list__link {
      flex-direction: column;
      align-items: stretch;
      gap: var(--spacing-sm);
      height: 100%;
    }

    .child-page-list__thumb { aspect-ratio: 4 / 3; }
  }

  &--card {
    .child-page-list__item {
      background: var(--section-bg-subtle, var(--color-background-light));
      border-radius: var(--border-radius-lg);
      overflow: hidden;
    }

    .child-page-list__label { padding: var(--spacing-md); }
  }
}
</style>
