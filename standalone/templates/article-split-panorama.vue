<!--
  Split-panorama article template.

  Half-and-half: the panorama image occupies one side and stays pinned
  (position: sticky) while the prose scrolls past on the other. For pieces
  anchored to a single strong image — a place, a building, a portrait — where
  article-gallery-sticky's many-image showcase is too much. Collapses to a
  stacked image-then-text flow on small screens. Without a panorama image the
  text pane simply takes the full width.

  Content arrives render-ready (see article-editorial.vue for the contract).
-->
<script setup lang="ts">
import { computed } from 'vue'
import type { ResolvedSeo } from '~/shared/types/seo'
import type { MediaRecord, ArticleRelatedSummary } from '~/shared/types/articles'
import { formatContentDate } from '~/themes/standalone/lib/formatContentDate'
import { humanizeSlug } from '~/themes/standalone/lib/humanizeSlug'
import { useClientConfig } from '~/shared/composables/useClientConfig'

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
    parentSlug?: string | null
    pageType: string
    locale: string
  }
  related?: ArticleRelatedSummary[]
}

const props = defineProps<Props>()

const contentLocale = computed(() => props.page.locale)

function localized(value: any, fallback = ''): string {
  if (!value) return fallback
  if (typeof value === 'string') return value
  return value[contentLocale.value] ?? value['en-US'] ?? Object.values(value)[0] ?? fallback
}

function mediaFor(id: string | null | undefined): MediaRecord | null {
  if (!id) return null
  return props.media[id] ?? null
}

const kicker = computed(() => localized(props.data.kicker))
const title = computed(() => localized(props.data.title) || props.page.title)
const body = computed(() => localized(props.data.body))
// Field id is `featuredImage` (not `panoramaImage`) so syncCanonicalFields
// mirrors it onto the article's canonical featuredImageId — feed tiles and
// related-article thumbnails read that column, not contentData.
const panorama = computed(() => mediaFor(props.data.featuredImage))

const { themeSettings } = useClientConfig()
const contentTimeZone = computed<string | null>(() => {
  const tz = themeSettings.value.contentTimeZone
  return typeof tz === 'string' && tz.length > 0 ? tz : null
})

const publishedLabel = computed(() =>
  formatContentDate(props.page.publishedAt, contentLocale.value, contentTimeZone.value),
)
const authorLabel = computed(() =>
  props.page.author?.displayName || props.page.author?.name || '',
)
const showDate = computed(() => props.settings.showPublishedDate === true && Boolean(publishedLabel.value))
const showAuthor = computed(() => props.settings.showAuthor === true && Boolean(authorLabel.value))
const showMeta = computed(() => showDate.value || showAuthor.value)

const showBackLink = computed(() => props.settings.showBackLink === true && Boolean(props.page.parentSlug))
const backHref = computed(() => (props.page.parentSlug ? `/${props.page.parentSlug}` : ''))
const backLabel = computed(() => humanizeSlug(props.page.parentSlug ?? ''))

const relatedArticles = computed<ArticleRelatedSummary[]>(
  () => Array.isArray(props.related) ? props.related : [],
)
const showRelated = computed(() =>
  props.settings.showRelated === true && relatedArticles.value.length > 0,
)
const RELATED_TITLE_BY_LOCALE: Record<string, string> = {
  it: 'Articoli correlati',
  'en-US': 'Related articles',
}
const relatedTitle = computed(() => {
  const fromSettings = localized(props.settings.relatedTitle)
  if (fromSettings) return fromSettings
  const lang = contentLocale.value?.startsWith('it') ? 'it' : 'en-US'
  return RELATED_TITLE_BY_LOCALE[lang] ?? RELATED_TITLE_BY_LOCALE['en-US']
})
function relatedHref(r: ArticleRelatedSummary): string {
  if (r.parentSlug && r.slug) return `/${r.parentSlug}/${r.slug}`
  return '#'
}

// Template-specific: which side the pinned image sits on (desktop only).
const mediaSide = computed<string>(() => props.settings.mediaSide)

const containerMode = computed<string>(() => props.settings.containerMode)
const containerInsetX = computed<string>(() => props.settings.containerInsetX)
const sectionSpaceY = computed<string>(() => props.settings.sectionSpaceY)
</script>

<template>
  <article
    class="art-split"
    :data-container-mode="containerMode"
    :data-inset-x="containerInsetX"
    :data-space-y="sectionSpaceY"
    :data-media-side="mediaSide"
  >
    <figure v-if="panorama" class="art-split__media">
      <img
        class="art-split__media-img"
        :src="panorama.url"
        :alt="localized(panorama.alt) || title"
        loading="eager"
      />
    </figure>

    <div class="art-split__pane">
      <nav v-if="showBackLink" class="art-split__back" :aria-label="backLabel">
        <NuxtLink class="art-split__back-link" :to="backHref">
          <span aria-hidden="true">&larr;</span> {{ backLabel }}
        </NuxtLink>
      </nav>

      <header class="art-split__header">
        <p v-if="kicker" class="art-split__kicker">{{ kicker }}</p>
        <h1 class="art-split__title">{{ title }}</h1>
        <p v-if="showMeta" class="art-split__meta">
          <time v-if="showDate" :datetime="page.publishedAt || undefined">{{ publishedLabel }}</time>
          <span v-if="showDate && showAuthor" class="art-split__meta-sep" aria-hidden="true">·</span>
          <span v-if="showAuthor">{{ authorLabel }}</span>
        </p>
      </header>

      <div v-if="body" class="art-split__body prose" v-html="body"></div>

      <nav v-if="showRelated" class="art-split__related" :aria-label="relatedTitle">
        <h2 class="art-split__related-title">{{ relatedTitle }}</h2>
        <ul class="art-split__related-list">
          <li v-for="r in relatedArticles" :key="r.id">
            <NuxtLink :to="relatedHref(r)" class="art-split__related-link">
              {{ localized(r.title) }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </div>
  </article>
</template>

<style scoped lang="scss">
.art-split {
  display: grid;
  grid-template-columns: 1fr;
  max-width: var(--frame-max-width, none);
  margin-inline: auto;

  @media (min-width: $bp-lg) {
    grid-template-columns: 1fr 1fr;

    &[data-media-side='right'] &__media {
      order: 2;
    }
  }

  &__media {
    margin: 0;

    @media (min-width: $bp-lg) {
      position: sticky;
      top: 0;
      height: 100svh;
    }
  }

  &__media-img {
    display: block;
    width: 100%;
    height: 100%;
    max-height: 60svh;
    object-fit: cover;

    @media (min-width: $bp-lg) {
      max-height: none;
    }
  }

  &__pane {
    padding: var(--frame-space-y, 4.8rem) var(--frame-inset-x, 2.4rem);
    max-width: 68rem;
    justify-self: center;
    width: 100%;
  }

  &__back {
    margin-bottom: 2.4rem;
  }

  &__back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.8rem;
    min-height: 4.4rem;
    font-size: 1.3rem;
    letter-spacing: 0.04em;
    text-decoration: none;
    color: var(--color-text-light);
    transition: color 0.2s ease;

    &:hover,
    &:focus-visible {
      color: var(--color-accent, var(--color-primary));
    }

    &:focus-visible {
      outline: 2px solid var(--color-accent, var(--color-primary));
      outline-offset: 3px;
    }
  }

  &__kicker {
    margin: 0 0 1.2rem;
    font-size: 1.3rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-accent, var(--color-text-light));
  }

  &__title {
    margin: 0;
    font-family: var(--rt-role-heading1-family, var(--font-family-heading, inherit));
    font-size: clamp(3rem, 4vw, 4.8rem);
    line-height: 1.1;
    color: var(--color-text);
  }

  &__meta {
    margin: 2rem 0 0;
    font-size: 1.3rem;
    color: var(--color-text-light);
  }

  &__meta-sep {
    margin: 0 0.8rem;
  }

  &__body {
    margin-top: 3.2rem;
  }

  &__related {
    margin-top: 6.4rem;
    padding-top: 3.2rem;
    border-top: 1px solid var(--color-border, rgba(0, 0, 0, 0.12));
  }

  &__related-title {
    margin: 0 0 1.6rem;
    font-family: var(--rt-role-heading2-family, var(--font-family-heading, inherit));
    font-size: clamp(2rem, 2.6vw, 2.6rem);
    color: var(--color-text);
  }

  &__related-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }

  &__related-link {
    font-size: 1.5rem;
    text-decoration: none;
    color: var(--color-text);
    transition: color 0.2s ease;

    &:hover,
    &:focus-visible {
      color: var(--color-accent, var(--color-primary));
      text-decoration: underline;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .art-split__back-link,
  .art-split__related-link { transition: none; }
}
</style>
