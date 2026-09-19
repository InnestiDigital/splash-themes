<!--
  Chronicle blog-index template.

  A text-first archive: oversized title, optional intro, then the feed as a
  year-grouped LIST river — no hero image, no cards, no view toggle. For
  history sections, press-release archives and diaries where the date line
  matters more than a thumbnail. The editorial-grid template stays the
  image-led option; this is its quiet sibling.

  Feed knobs come from the feed-settings fragment (list display + year
  grouping by default here); the internal <ArticleList> does the fetching,
  exactly as in blog-index-editorial-grid.vue.
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

const rootRef = ref<HTMLElement | null>(null)
useEntranceReveal(rootRef, {
  selector: '.bichron__title, .bichron__intro, .article-list__item',
})
</script>

<template>
  <article
    ref="rootRef"
    class="bichron"
    :data-container-mode="settings.containerMode"
    :data-inset-x="settings.containerInsetX"
    :data-space-y="settings.sectionSpaceY"
  >
    <header class="bichron__header">
      <h1 class="bichron__title">{{ titleStr }}</h1>
      <div v-if="introHtml" class="bichron__intro prose" v-html="introHtml"></div>
    </header>

    <section class="bichron__feed">
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
.bichron {
  max-width: var(--frame-max-width, 100rem);
  margin-inline: auto;
  padding: var(--frame-space-y, 4.8rem) var(--frame-inset-x, 2.4rem);

  &__header {
    padding-bottom: 3.2rem;
    border-bottom: 1px solid var(--color-border, rgba(0, 0, 0, 0.12));
    margin-bottom: 3.2rem;
  }

  &__title {
    margin: 0;
    font-family: var(--rt-role-heading1-family, var(--font-family-heading, inherit));
    font-size: clamp(3.6rem, 7vw, 8rem);
    line-height: 1.02;
    letter-spacing: -0.02em;
    color: var(--color-text);
  }

  &__intro {
    margin-top: 2rem;
    max-width: 72rem;
    font-size: clamp(1.6rem, 2vw, 1.9rem);
    line-height: 1.5;
    color: var(--color-text-light);
  }

  /* The .bichron wrapper already owns width + gutter; stop ArticleList from
     re-constraining itself inside it (same contract the other blog indexes
     use on their feed containers). */
  &__feed {
    --article-list-max-width: none;
    --article-list-pad-inline: 0;
  }
}
</style>
