<script setup lang="ts">
import { inject, ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { PAGE_CONTEXT_KEY } from '~/shared/features/cms/page-context'
import { useClientConfig } from '~/shared/composables/useClientConfig'
import type { ArticleSummary, ArticleSummariesResponse } from '~/shared/types/articles'
import { formatContentDate } from '~/themes/standalone/lib/formatContentDate'
import { $fetch } from 'ofetch'
import { usePreviewSiteParam } from '~/shared/features/cms/previewSiteParam'

const props = withDefaults(
  defineProps<{
    source: 'current' | 'specific'
    blogId?: string
    sort: 'newest' | 'oldest'
    pageSize: number
    feedDisplay: 'card' | 'list'
    // Which secondary line each card shows. 'excerpt' is the default;
    // 'date' renders the localized publication date;
    // 'none' hides the subtitle entirely.
    cardSubtitle?: 'excerpt' | 'date' | 'none'
    // Card look. 'default' = the generic min-280px auto-fill grid with the small
    // bold-label card. 'editorial-grid' = the editorial blog-index look (large
    // navy title above a tiny caption above an aspect-ratio'd image); the
    // blog-index template opts into this instead of restyling internals via :deep.
    variant?: 'default' | 'editorial-grid'
    // Aspect ratio of the card media frame. Only consumed by the 'editorial-grid'
    // variant (portrait, landscape, or square).
    cardImageRatio?: 'natural' | 'portrait-3-4' | 'landscape-3-2' | 'square'
    // Lead-feature layout mode (editorial-grid only). When true AND there is at
    // least one item, the FIRST article is pulled out of the grid and rendered
    // as a large full-width magazine-style hero above the remaining cards. The
    // default is false so existing published instances (which lack the field)
    // render byte-identical to the plain grid — PARITY CONTRACT.
    leadFeature?: boolean
    // Aspect ratio of the lead hero image frame. Only consumed when leadFeature
    // is active. Wide (16:9) is the editorial default; cinematic (21:9) is a
    // taller-impact letterbox option.
    leadImageRatio?: 'wide-16-9' | 'cinematic-21-9'
    // Year-grouped editorial archive (editorial-grid only). When true AND at
    // least one article has loaded, the river (gridArticles — i.e. what is left
    // AFTER any leadFeature hero is pulled out) is split into per-publication-
    // year sections, each led by a large sticky year marker above the SAME card
    // grid/list markup. The default is false so existing published instances
    // (which lack the field) render byte-identical to the ungrouped grid — the
    // PARITY CONTRACT. Fully composable with leadFeature (the hero stays pulled
    // out and only the remaining river is grouped).
    groupByYear?: boolean
  }>(),
  {
    leadFeature: false,
    leadImageRatio: 'wide-16-9',
    groupByYear: false,
  },
)

const subtitleMode = computed(() => props.cardSubtitle ?? 'excerpt')

// The editorial-grid variant reserves a fixed single-line caption zone (the
// caption element renders even when empty) so cards with a missing / shorter
// caption don't pull their image up and stagger the row — REF has flat image
// tops. The generic 'default' variant keeps the original conditional render.
const isEditorial = computed(() => (props.variant ?? 'default') === 'editorial-grid')

const ctx = inject(PAGE_CONTEXT_KEY)
// Site scoping for the admin preview iframe; a no-op on the public site.
const previewSiteParam = usePreviewSiteParam()
const { locale, t } = useI18n()

// Localize article cards with the page's content locale (the site's
// `defaultLocale`, carried via PageContext) rather than the vue-i18n UI/router
// locale. Falls back to the UI locale when no page context is provided.
const contentLocale = computed(() => ctx?.value.locale || locale.value)

const resolvedBlogId = computed(() =>
  props.source === 'current' ? (ctx?.value.blogId ?? null) : (props.blogId ?? null),
)

const articles = ref<ArticleSummary[]>([])
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const error = ref(false)

// Fetch one page of articles. `append` distinguishes a fresh reload (replace
// the grid) from a load-more (append to the existing grid). Returns true on
// success, false on failure, so loadMore can decide whether to advance `page`.
async function fetchPage(p: number, append: boolean): Promise<boolean> {
  if (!resolvedBlogId.value) {
    articles.value = []
    total.value = 0
    return false
  }
  loading.value = true
  error.value = false
  try {
    const res = await $fetch<ArticleSummariesResponse>('/api/site-config/articles', {
      query: {
        blogId: resolvedBlogId.value,
        page: p,
        pageSize: props.pageSize,
        sort: props.sort,
        locale: contentLocale.value,
        // Empty on the public site (hostname resolves the tenant); carries the
        // site id inside the admin preview, where the host is the platform
        // domain and names no tenant. See previewSiteParam.ts.
        ...previewSiteParam(),
      },
    })
    articles.value = append ? [...articles.value, ...res.articles] : res.articles
    total.value = res.total
    return true
  } catch (err) {
    // Degrade gracefully: show visitors a friendly message and keep the raw
    // failure — which carries the internal API URL + tenant blogId — in the
    // console only. Never render it onto the public page.
    error.value = true
    console.error('[ArticleList] failed to load articles', err)
    return false
  } finally {
    loading.value = false
  }
}

// Query identity changed (blog, sort, or page size) → reset to page 1 and
// reload from scratch. Deliberately does NOT watch `page`: pagination is driven
// imperatively by loadMore so it can append rather than replace.
watch(
  [resolvedBlogId, () => props.sort, () => props.pageSize],
  () => {
    page.value = 1
    void fetchPage(1, false)
  },
  { immediate: true },
)

function loadMore(): void {
  const next = page.value + 1
  void fetchPage(next, true).then((ok) => {
    // Only advance the page cursor on success so a failed load can be retried.
    if (ok) page.value = next
  })
}

const hasMore = computed(() => articles.value.length < total.value)

// Lead-feature split. Only active in the editorial-grid variant, and only when
// at least one article has loaded. When inactive, `gridArticles` is the SAME
// reference as `articles` (no slice), so the rendered grid is byte-identical to
// the pre-lead output — this is the parity guarantee for default-off instances.
const showLead = computed(
  () => props.leadFeature && isEditorial.value && articles.value.length >= 1,
)
const leadArticle = computed<ArticleSummary | null>(() =>
  showLead.value ? (articles.value[0] ?? null) : null,
)
const gridArticles = computed<ArticleSummary[]>(() =>
  showLead.value ? articles.value.slice(1) : articles.value,
)

// Year-grouped archive split. Mirrors the `showLead` gate shape exactly: only
// active in the editorial-grid variant and only once at least one article has
// loaded. When inactive the template renders the ungrouped single-<ul> path
// LITERALLY UNCHANGED, so default-off instances stay byte-identical — the same
// parity guarantee leadFeature relies on.
const showGroups = computed(
  () => props.groupByYear && isEditorial.value && articles.value.length >= 1,
)

// A single year bucket of the river. `year` is null for the trailing "Undated"
// bucket (articles whose publishedAt is missing or unparseable); `label` is the
// rendered marker text (the numeral, or the localized "Undated" string).
interface YearGroup {
  key: string
  label: string
  year: number | null
  items: ArticleSummary[]
}

// Group the already-lead-stripped river (`gridArticles`) by publication year.
// Because this is a computed over `gridArticles`, an appended load-more page
// re-groups automatically — a newly-fetched 2025 article lands in the existing
// 2025 bucket with no extra wiring. Null / unparseable dates never drop an
// article: they collect into a single trailing "Undated" group (rendered even
// when it is the ONLY group, e.g. an all-undated blog).
const yearGroups = computed<YearGroup[]>(() => {
  // One source of truth for the bucketing: a Map keyed by the year (or null for
  // undated). Insertion order within a bucket is the API's already-sorted order,
  // which we preserve — only the group ORDER is re-derived from `sort` below.
  const buckets = new Map<number | null, ArticleSummary[]>()
  for (const a of gridArticles.value) {
    // Parse the ISO publishedAt to a full year; guard NaN (null date OR an
    // unparseable string both yield NaN → the null/Undated bucket).
    const parsed = a.publishedAt ? new Date(a.publishedAt).getFullYear() : Number.NaN
    const year = Number.isFinite(parsed) ? parsed : null
    const existing = buckets.get(year)
    if (existing) existing.push(a)
    else buckets.set(year, [a])
  }
  // Order the real-year buckets by the configured sort direction: 'newest' →
  // years descending, 'oldest' → ascending. The Undated bucket (null) is always
  // appended last regardless of direction so dated years lead the archive.
  const years = [...buckets.keys()].filter((y): y is number => y !== null)
  years.sort((a, b) => (props.sort === 'oldest' ? a - b : b - a))
  const groups: YearGroup[] = years.map((year) => ({
    key: String(year),
    label: String(year),
    year,
    items: buckets.get(year) ?? [],
  }))
  if (buckets.has(null)) {
    groups.push({
      key: 'undated',
      label: t('articles.undated', 'Undated'),
      year: null,
      items: buckets.get(null) ?? [],
    })
  }
  return groups
})

function localized(map: Record<string, string> | null | undefined, fallback = ''): string {
  if (!map) return fallback
  return map[contentLocale.value] ?? map['en-US'] ?? Object.values(map)[0] ?? fallback
}

// Site-level content timezone (IANA name, e.g. "Europe/Rome") from theme
// settings. Publication dates carry date-only semantics on a stored instant, so
// without this a viewer outside the authoring zone sees the date shift by a day
// (see formatContentDate). Null (unset / non-string) = legacy local-zone render.
const { themeSettings } = useClientConfig()
const contentTimeZone = computed<string | null>(() => {
  const tz = themeSettings.value.contentTimeZone
  return typeof tz === 'string' && tz.length > 0 ? tz : null
})

// Locale-aware, NaN-guarded date rendering shared with the article gallery
// template via the theme's formatContentDate util (single source of truth).
function formatDate(iso: string | null | undefined): string {
  return formatContentDate(iso, contentLocale.value, contentTimeZone.value)
}
</script>

<template>
  <section
    class="article-list"
    :data-display="feedDisplay"
    :data-variant="variant ?? 'default'"
    :data-image-ratio="cardImageRatio"
  >
    <p v-if="!resolvedBlogId" class="article-list__warning" data-warning>
      {{ t('articles.placeInBlog', 'Select a blog or place this block inside a blog or article page.') }}
    </p>
    <p v-else-if="loading && articles.length === 0" class="article-list__loading">Loading…</p>
    <p v-else-if="error && articles.length === 0" class="article-list__error" data-error>{{ t('articles.loadError', 'Unable to load articles right now. Please try again later.') }}</p>
    <p v-else-if="articles.length === 0" class="article-list__empty" data-empty>
      {{ t('articles.empty', 'No articles yet.') }}
    </p>
    <template v-else>
      <!-- Lead feature (editorial-grid only): the first article rendered as a
           full-width magazine hero above the grid. Inert unless leadFeature is
           on — when off this whole block is absent and the grid below is
           byte-identical to the pre-lead markup. -->
      <!-- NuxtLink (SPA navigation) rather than a raw <a>: a full reload
           re-resolves the site from the hostname, which breaks any context
           carried only by the running app (e.g. the admin preview's ?site=
           override) and re-boots the SPA for nothing. -->
      <NuxtLink
        v-if="leadArticle"
        :to="leadArticle.url"
        :rel="leadArticle.noIndex ? 'nofollow' : null"
        class="article-list__lead"
        :data-lead-ratio="leadImageRatio"
      >
        <div v-if="leadArticle.featuredImageUrl" class="article-list__lead-media">
          <img :src="leadArticle.featuredImageUrl" alt="" loading="lazy" decoding="async" />
        </div>
        <div class="article-list__lead-body">
          <h2 class="article-list__lead-title">{{ localized(leadArticle.title) }}</h2>
          <p
            v-if="subtitleMode === 'date' && leadArticle.publishedAt && formatDate(leadArticle.publishedAt)"
            class="article-list__lead-excerpt article-list__lead-date"
          >
            <time :datetime="leadArticle.publishedAt">{{ formatDate(leadArticle.publishedAt) }}</time>
          </p>
          <p
            v-else-if="subtitleMode === 'excerpt' && leadArticle.excerpt"
            class="article-list__lead-excerpt"
          >{{ localized(leadArticle.excerpt) }}</p>
        </div>
      </NuxtLink>
      <!-- Year-grouped editorial archive (editorial-grid + groupByYear only).
           The river is split into per-year <section>s, each with a large sticky
           year marker (<h2>, correct heading outline above the <h3> card titles)
           followed by that year's cards in an OWN .article-list__items <ul> — so
           every existing [data-variant][data-display] .article-list__items grid/
           list rule applies to each group verbatim. The card <li> markup below
           is kept identical to the ungrouped path (only the v-for source differs)
           so both paths share one card design; the ungrouped path is the v-else
           of this block, left LITERALLY UNCHANGED for the parity contract. -->
      <template v-if="showGroups">
        <section
          v-for="group in yearGroups"
          :key="group.key"
          class="article-list__group"
        >
          <h2 class="article-list__year">{{ group.label }}</h2>
          <ul class="article-list__items">
          <li
            v-for="a in group.items"
            :key="a.id"
            class="article-list__item"
            :data-article-card="a.id"
          >
            <NuxtLink
              :to="a.url"
              :rel="a.noIndex ? 'nofollow' : null"
              class="article-list__link"
            >
              <div v-if="a.featuredImageUrl" class="article-list__media">
                <img :src="a.featuredImageUrl" alt="" loading="lazy" decoding="async" />
              </div>
              <h3 class="article-list__title">{{ localized(a.title) }}</h3>
              <!-- Same fixed-height caption zone contract as the ungrouped card. -->
              <p
                v-if="subtitleMode === 'date' && (isEditorial || (a.publishedAt && formatDate(a.publishedAt)))"
                class="article-list__excerpt article-list__date"
              >
                <time v-if="a.publishedAt && formatDate(a.publishedAt)" :datetime="a.publishedAt">{{ formatDate(a.publishedAt) }}</time>
              </p>
              <p
                v-else-if="subtitleMode === 'excerpt' && (isEditorial || a.excerpt)"
                class="article-list__excerpt"
              >{{ a.excerpt ? localized(a.excerpt) : '' }}</p>
              <p v-if="a.authorDisplayName" class="article-list__author">{{ a.authorDisplayName }}</p>
            </NuxtLink>
          </li>
          </ul>
        </section>
      </template>
      <ul v-else class="article-list__items">
      <li
        v-for="a in gridArticles"
        :key="a.id"
        class="article-list__item"
        :data-article-card="a.id"
      >
        <NuxtLink
          :to="a.url"
          :rel="a.noIndex ? 'nofollow' : null"
          class="article-list__link"
        >
          <div v-if="a.featuredImageUrl" class="article-list__media">
            <img :src="a.featuredImageUrl" alt="" loading="lazy" decoding="async" />
          </div>
          <h3 class="article-list__title">{{ localized(a.title) }}</h3>
          <!-- In the editorial-grid variant the caption element is always
               present (even with no valid date / empty excerpt) so its fixed
               1-line height keeps every image top aligned across the row. -->
          <p
            v-if="subtitleMode === 'date' && (isEditorial || (a.publishedAt && formatDate(a.publishedAt)))"
            class="article-list__excerpt article-list__date"
          >
            <time v-if="a.publishedAt && formatDate(a.publishedAt)" :datetime="a.publishedAt">{{ formatDate(a.publishedAt) }}</time>
          </p>
          <p
            v-else-if="subtitleMode === 'excerpt' && (isEditorial || a.excerpt)"
            class="article-list__excerpt"
          >{{ a.excerpt ? localized(a.excerpt) : '' }}</p>
          <p v-if="a.authorDisplayName" class="article-list__author">{{ a.authorDisplayName }}</p>
        </NuxtLink>
      </li>
      </ul>
      <div v-if="hasMore" class="article-list__more">
        <button type="button" class="article-list__more-btn" :disabled="loading" :aria-busy="loading" @click="loadMore">
          {{ loading ? t('articles.loadingMore', 'Loading…') : t('articles.loadMore', 'Load more') }}
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped lang="scss">
.article-list {
  /* Defensive bounding so the grid doesn't bleed past the chrome rule
     even when dropped into a full-bleed section. Mirrors article render
     content width (chrome rule sits at 20vw from right). Container-level
     knobs are CSS vars so an embedding template (e.g. the blog-index grid)
     can override width/padding/grid without reaching into internals via
     :deep — it sets the vars on a wrapper instead. */
  max-width: var(--article-list-max-width, min(80vw, 1280px));
  margin-inline: auto;
  padding-inline: var(--article-list-pad-inline, clamp(1rem, 4vw, 3rem));
  box-sizing: border-box;
}
.article-list[data-display="card"] .article-list__items {
  display: grid;
  /* min(280px, 100%): the 280px track floor must never beat the container —
     at 360px viewport the usable box is ~259px, so a bare 280px floor makes
     every card overflow and the page scroll sideways. */
  grid-template-columns: var(--article-list-grid-cols, repeat(auto-fill, minmax(min(280px, 100%), 1fr)));
  gap: var(--article-list-grid-gap, var(--space-md, 1rem));
  list-style: none;
  padding: 0;
}
.article-list[data-display="list"] .article-list__items {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm, 0.5rem);
  list-style: none;
  padding: 0;
}
.article-list__warning,
.article-list__loading,
.article-list__error,
.article-list__empty {
  padding: var(--space-md, 1rem);
  text-align: center;
}
.article-list__error { color: var(--color-error, #c00); }
.article-list__warning { color: var(--color-muted, #666); }
.article-list__link {
  display: block;
  text-decoration: none;
  color: inherit;
  border-radius: 0.4rem;
  outline-offset: 4px;
  transition: transform 0.35s cubic-bezier(0.2, 0.6, 0.2, 1);
}
/* Tactile card lift + accessible keyboard focus. Focus mirrors hover so
   keyboard users get the same affordance sighted-mouse users do. */
.article-list__link:hover { transform: translateY(-4px); }
.article-list__link:focus-visible {
  outline: 2px solid var(--color-accent, #1B8AB7);
  outline-offset: 4px;
}
/* Fixed frame around the thumbnail so the hover zoom stays clipped to the
   card box (no reflow, no bleed into siblings). */
.article-list__media {
  display: block;
  overflow: hidden;
  border-radius: 0.4rem;
}
.article-list__media img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.2, 0.6, 0.2, 1);
}
.article-list__link:hover .article-list__media img,
.article-list__link:focus-visible .article-list__media img {
  transform: scale(1.05);
}
@media (prefers-reduced-motion: reduce) {
  .article-list__link,
  .article-list__media img { transition: none; }
  .article-list__link:hover { transform: none; }
  .article-list__link:hover .article-list__media img,
  .article-list__link:focus-visible .article-list__media img { transform: none; }
}

/* -------------------------------------------------------------------------
   editorial-grid variant — the editorial blog-index card look.
   Was a pile of :deep overrides in blog-index-editorial-grid.vue; now a
   first-class variant so the look ships with the component, not the template.
   Structure per card: large navy title (order 0) → tiny caption (order 1) →
   aspect-ratio'd image (order 2). imageRatio drives the frame proportions.
   ------------------------------------------------------------------------- */
.article-list[data-variant="editorial-grid"] .article-list__link {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.article-list[data-variant="editorial-grid"] .article-list__title {
  /* Ref card titles: editorial heading, tracking -0.03em, navy rgb(30,61,79)
     (root font-size is 10px → 2rem ≈ 20px). Colour is a dedicated card var,
     NOT --color-primary (the theme brand primary can be a non-navy hue) so the
     REF navy/teal contract holds regardless of the tenant palette. */
  font-size: var(--article-card-title-size, 2rem);
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: var(--article-card-title-color, #1E3D4F);
  /* REF insets the title (and caption) a few px from the flush image edge. */
  padding-left: var(--article-card-text-inset, 0);
  margin: 0;
  order: 0;
}
/* Cards are links; REF renders the title in the accent colour on hover /
   keyboard focus. Fallback is the theme accent, NOT a hardcoded hex: the old
   #1B8AB7 literal (3.91:1 on white, fails AA) always won because no template
   defines --article-card-title-hover-color. */
.article-list[data-variant="editorial-grid"] .article-list__link:hover .article-list__title,
.article-list[data-variant="editorial-grid"] .article-list__link:focus-visible .article-list__title {
  color: var(--article-card-title-hover-color, var(--color-accent));
}
.article-list[data-variant="editorial-grid"] .article-list__excerpt {
  /* Legibility floor: prose-like captions never render below 1.2rem/12px.
     Was 0.8rem (8px) for desktop ref-parity — that parity is retired. */
  font-size: var(--font-size-sm, 1.2rem);
  color: var(--color-muted, #5f6368);
  margin: 0 0 0.6rem;
  line-height: 1.4;
  padding-left: var(--article-card-text-inset, 0);
  order: 1;
  /* Fixed single-line caption zone: clamp to one line and reserve its height
     even when empty so wrapped / missing captions can't stagger image tops. */
  min-height: 1lh;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
/* Editorial date captions use the stronger article-card date color. */
.article-list[data-variant="editorial-grid"] .article-list__date {
  color: var(--article-card-date-color, #1E3D4F);
}
.article-list[data-variant="editorial-grid"] .article-list__author {
  display: none;
}
/* The media frame is the flex-ordered child (image sits below title/caption).
   The frame owns the fixed aspect-ratio + placeholder bg; the img fills it and
   is free to zoom-on-hover within the clipped frame. */
.article-list[data-variant="editorial-grid"] .article-list__media {
  order: 2;
  width: 100%;
  background: var(--color-card-bg, #f4f5f6);
  /* Corner radius remains a template-controlled card variable. */
  border-radius: var(--article-card-media-radius, 0.4rem);
}
.article-list[data-variant="editorial-grid"] .article-list__media img {
  height: 100%;
  object-fit: cover;
}

/* imageRatio drives the aspect-ratio of the article card frame. */
.article-list[data-variant="editorial-grid"][data-image-ratio="portrait-3-4"] .article-list__media {
  aspect-ratio: 3 / 4;
}
.article-list[data-variant="editorial-grid"][data-image-ratio="landscape-3-2"] .article-list__media {
  aspect-ratio: 3 / 2;
}
.article-list[data-variant="editorial-grid"][data-image-ratio="square"] .article-list__media {
  aspect-ratio: 1 / 1;
}

/* -------------------------------------------------------------------------
   editorial-grid · LIST view — a purpose-built typographic works index.
   Single column of horizontal rows: a small fixed-width thumbnail beside a
   stacked title + caption, separated by a thin hairline rule. ADD-ONLY: every
   selector here is gated on [data-display="list"], so the default card grid
   output ([data-display="card"]) is byte-for-byte untouched. The higher
   specificity (extra [data-display] attr) wins over the shared editorial-grid
   card rules above. Thumbnails keep their configured [data-image-ratio] frame
   (those rules don't gate on data-display), just shrunk to a fixed column. */
.article-list[data-variant="editorial-grid"][data-display="list"] .article-list__items {
  gap: 0;
}
.article-list[data-variant="editorial-grid"][data-display="list"] .article-list__item {
  border-bottom: 1px solid var(--border-color, #E8E8E8);
}
.article-list[data-variant="editorial-grid"][data-display="list"] .article-list__item:first-child {
  border-top: 1px solid var(--border-color, #E8E8E8);
}
.article-list[data-variant="editorial-grid"][data-display="list"] .article-list__link {
  display: grid;
  grid-template-columns: var(--article-list-list-thumb, 11rem) minmax(0, 1fr);
  grid-template-rows: auto auto;
  align-items: center;
  column-gap: clamp(1.2rem, 2.5vw, 2.4rem);
  row-gap: 0.4rem;
  padding-block: clamp(1.2rem, 2vw, 1.8rem);
}
.article-list[data-variant="editorial-grid"][data-display="list"] .article-list__media {
  order: 0;
  grid-column: 1;
  grid-row: 1 / 3;
  align-self: center;
  width: 100%;
}
.article-list[data-variant="editorial-grid"][data-display="list"] .article-list__title {
  grid-column: 2;
  grid-row: 1;
  align-self: end;
  /* Title reads larger/heavier than the caption — a works-index headline. */
  font-size: var(--article-card-list-title-size, 2.6rem);
  line-height: 1.05;
}
.article-list[data-variant="editorial-grid"][data-display="list"] .article-list__excerpt {
  grid-column: 2;
  grid-row: 2;
  align-self: start;
  /* Release the fixed single-line caption clamp used by the card grid — in a
     row the caption can breathe on its own line under the title. */
  min-height: 0;
  -webkit-line-clamp: none;
  line-clamp: none;
  display: block;
  overflow: visible;
}

/* Responsive column collapse for the editorial-grid: the container-supplied
   --article-list-grid-cols (e.g. 3 cols) steps down to 2 then 1. These win over
   the base var-driven grid via the extra attribute selectors' specificity.
   Requires lang="scss": $bp-* only resolve in an SCSS block (campaign pt.5 trap
   — as plain CSS these @media queries are invalid and silently never apply). */
@media (max-width: $bp-lg) {
  .article-list[data-variant="editorial-grid"][data-display="card"] .article-list__items {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: $bp-sm) {
  .article-list[data-variant="editorial-grid"][data-display="card"] .article-list__items {
    grid-template-columns: 1fr;
    /* Once the grid is a single column the cards read as one vertical stream, so
       the inter-card gap has to clearly beat the 0.5rem intra-card gap — at the
       shared 1rem grid gap the boundary between two cards was as tight as the
       boundary between a card's own parts. */
    row-gap: var(--article-list-grid-gap-stacked, 2.4rem);
  }
  /* Caption-above-image is an editorial contract that only reads correctly when
     each card owns its own column. Stacked into one column it inverts: every
     image sits directly above the NEXT card's title, and the lead feature right
     above the grid (media-first) primes exactly that misreading. Single column
     therefore goes media-first, matching the lead feature and the list view. */
  .article-list[data-variant="editorial-grid"][data-display="card"] .article-list__media {
    order: 0;
  }
  .article-list[data-variant="editorial-grid"][data-display="card"] .article-list__title {
    order: 1;
  }
  .article-list[data-variant="editorial-grid"][data-display="card"] .article-list__excerpt {
    order: 2;
    /* The fixed 1-line caption zone exists to keep image TOPS aligned across a
       row. With one card per row there is no row to align, so release the clamp
       and let the caption say what it has to say. */
    min-height: 0;
    -webkit-line-clamp: none;
    line-clamp: none;
    display: block;
    overflow: visible;
    margin-bottom: 0;
  }
}
/* Mobile legibility step-up above the theme floor: the base caption/date size
   is now the 12px prose floor (var(--font-size-sm)) on desktop — the old 8px
   ref-parity base (DIA-02) is retired, so desktop no longer renders SMALLER
   than mobile. Phones still get a further bump to 14px for arm's-length
   reading. The -webkit-line-clamp:1 mechanics + min-height:1lh scale with the
   font-size automatically at both sizes. */
@media (max-width: $bp-md) {
  .article-list[data-variant="editorial-grid"] .article-list__excerpt {
    font-size: 1.4rem;
    line-height: 1.45;
  }
}

/* -------------------------------------------------------------------------
   Lead feature — the first editorial-grid article promoted to a full-width
   magazine hero above the card grid. ADD-ONLY: every selector is gated on the
   .article-list__lead element, which only exists when leadFeature is on, so the
   default grid output is byte-for-byte untouched. Desktop = a two-column split
   (wide media + text); collapses to a stacked media-over-text column via a
   container query so the hero never overflows on narrow screens (≤375px safe).
   Container = the LayoutShell content box (breakpoint mode ≈ viewport width). */
.article-list__lead {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: clamp(1.5rem, 3vw, 3rem);
  align-items: center;
  text-decoration: none;
  color: inherit;
  margin-bottom: clamp(1.5rem, 3.5vw, 3rem);
  border-radius: 0.4rem;
  outline-offset: 4px;
  transition: transform 0.35s cubic-bezier(0.2, 0.6, 0.2, 1);
}
.article-list__lead:hover { transform: translateY(-4px); }
.article-list__lead:focus-visible {
  outline: 2px solid var(--color-accent, #1B8AB7);
  outline-offset: 4px;
}
/* Wide hero media frame. The frame owns the fixed aspect-ratio + placeholder bg
   (same contract as the editorial card media); the img fills + zooms within the
   clipped frame. leadImageRatio switches 16:9 → 21:9. */
.article-list__lead-media {
  overflow: hidden;
  border-radius: var(--article-card-media-radius, 0.4rem);
  background: var(--color-card-bg, #f4f5f6);
  aspect-ratio: 16 / 9;
}
.article-list__lead[data-lead-ratio="cinematic-21-9"] .article-list__lead-media {
  aspect-ratio: 21 / 9;
}
.article-list__lead-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.6s cubic-bezier(0.2, 0.6, 0.2, 1);
}
.article-list__lead:hover .article-list__lead-media img,
.article-list__lead:focus-visible .article-list__lead-media img {
  transform: scale(1.05);
}
.article-list__lead-body {
  min-width: 0;
}
/* Lead headline reads markedly larger than a card title — the fold-anchoring
   hero. Shares the editorial card title color token so the navy/teal contract
   holds regardless of the tenant palette. */
.article-list__lead-title {
  font-size: var(--article-lead-title-size, clamp(3rem, 5vw, 5.4rem));
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.05;
  color: var(--article-card-title-color, #1E3D4F);
  margin: 0 0 0.8rem;
}
.article-list__lead:hover .article-list__lead-title,
.article-list__lead:focus-visible .article-list__lead-title {
  /* Theme-accent fallback, not a hex literal — see the card hover rule above. */
  color: var(--article-card-title-hover-color, var(--color-accent));
}
/* Unlike the 1-line clamped card caption, the lead excerpt can breathe over
   multiple lines — there is room in the hero. */
.article-list__lead-excerpt {
  font-size: clamp(1.4rem, 1.5vw, 1.8rem);
  color: var(--color-muted, #5f6368);
  line-height: 1.5;
  margin: 0;
}
.article-list__lead-date {
  color: var(--article-card-date-color, #1E3D4F);
}
@media (prefers-reduced-motion: reduce) {
  .article-list__lead,
  .article-list__lead-media img { transition: none; }
  .article-list__lead:hover { transform: none; }
  .article-list__lead:hover .article-list__lead-media img,
  .article-list__lead:focus-visible .article-list__lead-media img { transform: none; }
}
/* Stack the hero (media above text) once the container is narrow so neither the
   image nor the headline overflows. @container per the repo responsive contract
   (NOT @media px) — keys on the LayoutShell content box width. */
@container (max-width: 640px) {
  .article-list__lead {
    grid-template-columns: 1fr;
    gap: clamp(0.8rem, 3vw, 1.2rem);
    align-items: start;
  }
  .article-list__lead-title {
    font-size: clamp(2.2rem, 7vw, 3.4rem);
  }
}

/* -------------------------------------------------------------------------
   Year-grouped archive — the editorial-grid river split into per-year sections,
   each led by a large sticky year numeral. ADD-ONLY: every selector is gated on
   .article-list__group / .article-list__year, elements that only exist when
   groupByYear is on, so the ungrouped grid/list output is byte-for-byte
   untouched. Each group keeps its own .article-list__items <ul>, so all the
   existing [data-variant][data-display] grid + list rules apply to it verbatim —
   no per-group CSS duplication needed. Tokens only (no new color control). */
.article-list__group {
  /* Space successive year sections apart so the next year's sticky marker has
     clear air above it rather than butting the previous group's last row. The
     first group hugs the top (or the lead hero) to match the ungrouped grid. */
  margin-top: clamp(2rem, 5vw, 4rem);
}
.article-list__group:first-of-type {
  margin-top: 0;
}
.article-list__year {
  /* Pins to the top of the viewport while its group scrolls past — a wayfinding
     anchor through a long archive. Sticky needs no reduced-motion guard (it is
     layout, not animation). Large editorial numeral reusing the card title
     color token so the navy/teal contract holds regardless of tenant palette —
     NO new color control (Color Override Freeze). Real <h2>: years sit above the
     <h3> card titles for a correct document outline. */
  position: sticky;
  /* Override var lets a template that stacks a sticky header above the list nudge
     the pinned numeral down so it doesn't tuck under it; defaults to 0 (flush)
     for the standalone theme, whose nav is a scrollY-0 drawer overlay. */
  top: var(--article-year-marker-top, 0);
  z-index: 1;
  margin: 0 0 clamp(1rem, 2.5vw, 1.8rem);
  padding-block: 0.4rem;
  font-size: var(--article-year-marker-size, clamp(3rem, 6vw, 5.4rem));
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--article-card-title-color, #1E3D4F);
  /* Opaque backdrop so cards scrolling beneath the pinned numeral don't bleed
     through it. Defaults to the theme surface token (white fallback); a template
     placing the list on a non-surface section can override the box to match. */
  background: var(--article-year-marker-bg, var(--color-bg, #fff));
}

/* -------------------------------------------------------------------------
   Load-more affordance — appends the next page in place. Only rendered while
   more articles remain (articles.length < total), so a fully-loaded list is
   byte-identical to before. The button carries busy state during a fetch. */
.article-list__more {
  display: flex;
  justify-content: center;
  margin-top: clamp(2rem, 4vw, 3rem);
}
.article-list__more-btn {
  min-height: 44px;
  min-width: 180px;
  padding-inline: 1.5rem;
  background: transparent;
  border: 1px solid var(--color-accent, #1B8AB7);
  color: var(--article-card-title-color, #1E3D4F);
  font-weight: 500;
  letter-spacing: 0.02em;
  cursor: pointer;
  border-radius: 0.4rem;
  transition: background 0.25s ease, color 0.25s ease;
}
.article-list__more-btn:hover:not(:disabled),
.article-list__more-btn:focus-visible {
  background: var(--color-accent, #1B8AB7);
  color: #fff;
}
.article-list__more-btn:focus-visible {
  outline: 2px solid var(--color-accent, #1B8AB7);
  outline-offset: 3px;
}
.article-list__more-btn:disabled {
  cursor: default;
  opacity: 0.6;
}
@media (prefers-reduced-motion: reduce) {
  .article-list__more-btn { transition: none; }
}
</style>
