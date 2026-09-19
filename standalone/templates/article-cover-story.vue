<!--
  Cover-story article template.

  The lead image IS the opening: a full-viewport (or half-viewport) cover with
  the title overlaid on a gradient scrim, then a narrow prose column. For
  photo-led feature pieces where article-editorial's centered text-first
  opening undersells the image. Without a cover image it degrades to a plain
  header so a half-filled article still renders.

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

const title = computed(() => localized(props.data.title) || props.page.title)
const subtitle = computed(() => localized(props.data.subtitle))
const body = computed(() => localized(props.data.body))
const credit = computed(() => localized(props.data.coverCredit))
// Field id is `featuredImage` (not `coverImage`) so syncCanonicalFields
// mirrors it onto the article's canonical featuredImageId — feed tiles and
// related-article thumbnails read that column, not contentData.
const cover = computed(() => mediaFor(props.data.featuredImage))

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

// Template-specific: cover height — 'full' fills the viewport, 'half' leaves
// the next content peeking so the reader knows there is an article below.
const coverHeight = computed<string>(() => props.settings.coverHeight)

const containerMode = computed<string>(() => props.settings.containerMode)
const containerInsetX = computed<string>(() => props.settings.containerInsetX)
const sectionSpaceY = computed<string>(() => props.settings.sectionSpaceY)
</script>

<template>
  <article
    class="art-cover"
    :data-container-mode="containerMode"
    :data-inset-x="containerInsetX"
    :data-space-y="sectionSpaceY"
  >
    <header
      v-if="cover"
      class="art-cover__hero"
      :data-cover-height="coverHeight"
    >
      <img
        class="art-cover__hero-img"
        :src="cover.url"
        :alt="localized(cover.alt) || title"
        loading="eager"
      />
      <div class="art-cover__scrim" aria-hidden="true"></div>
      <div class="art-cover__hero-text">
        <h1 class="art-cover__title">{{ title }}</h1>
        <p v-if="subtitle" class="art-cover__subtitle" v-html="subtitle"></p>
        <p v-if="showMeta" class="art-cover__meta">
          <time v-if="showDate" :datetime="page.publishedAt || undefined">{{ publishedLabel }}</time>
          <span v-if="showDate && showAuthor" class="art-cover__meta-sep" aria-hidden="true">·</span>
          <span v-if="showAuthor">{{ authorLabel }}</span>
        </p>
      </div>
    </header>

    <!-- Degraded header when no cover image was provided. -->
    <header v-else class="art-cover__plain-header">
      <h1 class="art-cover__title art-cover__title--plain">{{ title }}</h1>
      <p v-if="subtitle" class="art-cover__subtitle art-cover__subtitle--plain" v-html="subtitle"></p>
      <p v-if="showMeta" class="art-cover__meta art-cover__meta--plain">
        <time v-if="showDate" :datetime="page.publishedAt || undefined">{{ publishedLabel }}</time>
        <span v-if="showDate && showAuthor" class="art-cover__meta-sep" aria-hidden="true">·</span>
        <span v-if="showAuthor">{{ authorLabel }}</span>
      </p>
    </header>

    <div class="art-cover__column">
      <nav v-if="showBackLink" class="art-cover__back" :aria-label="backLabel">
        <NuxtLink class="art-cover__back-link" :to="backHref">
          <span aria-hidden="true">&larr;</span> {{ backLabel }}
        </NuxtLink>
      </nav>

      <p v-if="credit" class="art-cover__credit">{{ credit }}</p>

      <div v-if="body" class="art-cover__body prose" v-html="body"></div>

      <nav v-if="showRelated" class="art-cover__related" :aria-label="relatedTitle">
        <h2 class="art-cover__related-title">{{ relatedTitle }}</h2>
        <ul class="art-cover__related-list">
          <li v-for="r in relatedArticles" :key="r.id">
            <NuxtLink :to="relatedHref(r)" class="art-cover__related-link">
              {{ localized(r.title) }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </div>
  </article>
</template>

<style scoped lang="scss">
.art-cover {
  --art-measure: 72rem;
  display: block;
  max-width: var(--frame-max-width, none);
  margin-inline: auto;

  &__hero {
    position: relative;
    height: 100svh;
    overflow: hidden;

    &[data-cover-height='half'] {
      height: 62svh;
    }
  }

  &__hero-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0.15) 45%, rgba(0, 0, 0, 0) 70%);
  }

  &__hero-text {
    position: absolute;
    inset-inline: 0;
    bottom: 0;
    padding: 4rem var(--frame-inset-x, 2.4rem);
    max-width: 96rem;
    color: #fff;
  }

  &__plain-header {
    max-width: var(--art-measure);
    margin: 0 auto;
    padding: var(--frame-space-y, 4rem) var(--frame-inset-x, 2.4rem) 0;
  }

  &__title {
    margin: 0;
    font-family: var(--rt-role-heading1-family, var(--font-family-heading, inherit));
    font-size: clamp(3.6rem, 6vw, 7.2rem);
    line-height: 1.05;

    &--plain {
      color: var(--color-text);
    }
  }

  &__subtitle {
    margin: 1.6rem 0 0;
    font-size: clamp(1.8rem, 2.2vw, 2.2rem);
    line-height: 1.4;
    opacity: 0.9;

    &--plain {
      color: var(--color-text-light);
      opacity: 1;
    }
  }

  &__meta {
    margin: 2rem 0 0;
    font-size: 1.3rem;
    opacity: 0.85;

    &--plain {
      color: var(--color-text-light);
      opacity: 1;
    }
  }

  &__meta-sep {
    margin: 0 0.8rem;
  }

  &__column {
    max-width: var(--art-measure);
    margin: 0 auto;
    padding: 4.8rem var(--frame-inset-x, 2.4rem) var(--frame-space-y, 4.8rem);
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

  &__credit {
    margin: 0 0 3.2rem;
    font-size: 1.2rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-light);
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
  .art-cover__back-link,
  .art-cover__related-link { transition: none; }
}
</style>
