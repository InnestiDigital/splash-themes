<!--
  Mosaic blog-index template.

  Image-forward: a compact one-line header (small title, optional intro beside
  it), then a dense card mosaic — square tiles, no captions, no hero band, no
  view toggle. For portfolios and photo-led sections where the pictures ARE
  the index. Text-led archives should use blog-index-chronicle-list; balanced
  magazine indexes use blog-index-editorial-grid.

  Feed knobs come from the feed-settings fragment (square tiles + hidden
  subtitles by default here); the internal <ArticleList> does the fetching.
-->
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ResolvedSeo } from '~/shared/types/seo'
import type { MediaRecord } from '~/shared/types/articles'
import ArticleList from '~/themes/standalone/components/ArticleList.vue'
import { useEntranceReveal } from '~/shared/composables/useEntranceReveal'

interface Props {
  data: Record<string, any>
  settings: Record<string, any>
  media: Record<string, MediaRecord>
  page: {
    id: string
    slug: string
    title: string
    publishedAt: string | null
    author: { userId: string | null; name: string | null; displayName: string | null }
    seo: ResolvedSeo
    parentId: string | null
    pageType: string
    locale: string
  }
}

const props = defineProps<Props>()

const contentLocale = computed(() => props.page.locale)

function localized(value: any, fallback = ''): string {
  if (!value) return fallback
  if (typeof value === 'string') return value
  return value[contentLocale.value] ?? value['en-US'] ?? Object.values(value)[0] ?? fallback
}

const titleStr = computed(() => localized(props.data.title) || props.page.title)
const introHtml = computed(() => localized(props.data.intro))

// Every settingsSchema/fragment field arrives resolved to its default
// (server/services/schema/templateSettingsResolution.ts) — no fallbacks here.
const settings = computed(() => ({
  sort: props.settings.sort as 'newest' | 'oldest',
  columns: Number(props.settings.columns),
  pageSize: Number(props.settings.pageSize),
  feedDisplay: props.settings.feedDisplay as 'card' | 'list',
  cardSubtitle: props.settings.cardSubtitle as 'excerpt' | 'date' | 'none',
  cardImageRatio: props.settings.cardImageRatio as 'natural' | 'portrait-3-4' | 'landscape-3-2' | 'square',
  leadFeature: props.settings.leadFeature === true,
  leadImageRatio: props.settings.leadImageRatio as 'wide-16-9' | 'cinematic-21-9',
  groupByYear: props.settings.groupByYear === true,
  containerMode: props.settings.containerMode as string,
  containerInsetX: props.settings.containerInsetX as string,
  sectionSpaceY: props.settings.sectionSpaceY as string,
}))

// Same CSS-var contract the editorial grid uses to hand the column count and
// tile chrome to ArticleList without restyling its internals via :deep.
// ArticleList's own $bp-lg/$bp-sm rules still step the grid down to 2 → 1
// columns on small screens, whatever count is picked here.
const mosaicVars = computed(() => ({
  '--mosaic-cols': String(settings.value.columns),
  '--article-card-text-inset': '0.6rem',
  '--article-card-media-radius': '0.3rem',
}))

const rootRef = ref<HTMLElement | null>(null)
useEntranceReveal(rootRef, {
  selector: '.bimosaic__title, .bimosaic__intro, .article-list__item',
})
</script>

<template>
  <article
    ref="rootRef"
    class="bimosaic"
    :data-columns="settings.columns"
    :data-container-mode="settings.containerMode"
    :data-inset-x="settings.containerInsetX"
    :data-space-y="settings.sectionSpaceY"
  >
    <header class="bimosaic__header">
      <h1 class="bimosaic__title">{{ titleStr }}</h1>
      <div v-if="introHtml" class="bimosaic__intro prose" v-html="introHtml"></div>
    </header>

    <section class="bimosaic__feed" :style="mosaicVars">
      <ArticleList
        source="current"
        :sort="settings.sort"
        :page-size="settings.pageSize"
        :feed-display="settings.feedDisplay"
        variant="editorial-grid"
        :card-image-ratio="settings.cardImageRatio"
        :card-subtitle="settings.cardSubtitle"
        :lead-feature="settings.leadFeature"
        :lead-image-ratio="settings.leadImageRatio"
        :group-by-year="settings.groupByYear"
      />
    </section>
  </article>
</template>

<style scoped lang="scss">
.bimosaic {
  max-width: var(--frame-max-width, none);
  margin-inline: auto;
  padding: var(--frame-space-y, 3.2rem) var(--frame-inset-x, 2.4rem);

  &__header {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.8rem 2.4rem;
    margin-bottom: 2.4rem;
  }

  &__title {
    margin: 0;
    font-family: var(--rt-role-heading1-family, var(--font-family-heading, inherit));
    font-size: clamp(2rem, 2.6vw, 2.8rem);
    line-height: 1.1;
    color: var(--color-text);
  }

  &__intro {
    margin: 0;
    font-size: 1.4rem;
    line-height: 1.5;
    color: var(--color-text-light);
  }

  /* Container-level knobs ArticleList's own rules consume — the .bimosaic
     wrapper owns the gutter, so neutralize the inner max-width/padding and
     hand over a fixed-column grid (same contract blog-index-editorial-grid
     uses on .bigrid-list). */
  &__feed {
    --article-list-max-width: none;
    --article-list-pad-inline: 0;
    --article-list-grid-cols: repeat(var(--mosaic-cols, 4), minmax(0, 1fr));
    --article-list-grid-gap: clamp(0.8rem, 1.5vw, 1.6rem);
  }
}
</style>
