<!--
  Plain typographic article template.

  No images, no chrome: an oversized title, a hairline meta row, and the body
  set in one or two text columns. For statements, manifestos, colophons and
  legal-adjacent prose where any image would be decoration. The deliberate
  absence of media is also what makes its picker preview unmistakable next to
  the image-led templates.

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

const title = computed(() => localized(props.data.title) || props.page.title)
const standfirst = computed(() => localized(props.data.standfirst))
const body = computed(() => localized(props.data.body))

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

// Template-specific: body column count (CSS multicol on wide screens only)
// and an optional drop cap on the first paragraph.
const bodyColumns = computed<string>(() => props.settings.bodyColumns)
const dropCap = computed<boolean>(() => props.settings.dropCap === true)

const containerMode = computed<string>(() => props.settings.containerMode)
const containerInsetX = computed<string>(() => props.settings.containerInsetX)
const sectionSpaceY = computed<string>(() => props.settings.sectionSpaceY)
</script>

<template>
  <article
    class="art-plain"
    :data-container-mode="containerMode"
    :data-inset-x="containerInsetX"
    :data-space-y="sectionSpaceY"
    :data-columns="bodyColumns"
    :data-drop-cap="dropCap ? 'true' : undefined"
  >
    <nav v-if="showBackLink" class="art-plain__back" :aria-label="backLabel">
      <NuxtLink class="art-plain__back-link" :to="backHref">
        <span aria-hidden="true">&larr;</span> {{ backLabel }}
      </NuxtLink>
    </nav>

    <header class="art-plain__header">
      <h1 class="art-plain__title">{{ title }}</h1>
      <p v-if="standfirst" class="art-plain__standfirst" v-html="standfirst"></p>
      <p v-if="showMeta" class="art-plain__meta">
        <time v-if="showDate" :datetime="page.publishedAt || undefined">{{ publishedLabel }}</time>
        <span v-if="showDate && showAuthor" class="art-plain__meta-sep" aria-hidden="true">·</span>
        <span v-if="showAuthor">{{ authorLabel }}</span>
      </p>
    </header>

    <div v-if="body" class="art-plain__body prose" v-html="body"></div>

    <nav v-if="showRelated" class="art-plain__related" :aria-label="relatedTitle">
      <h2 class="art-plain__related-title">{{ relatedTitle }}</h2>
      <ul class="art-plain__related-list">
        <li v-for="r in relatedArticles" :key="r.id">
          <NuxtLink :to="relatedHref(r)" class="art-plain__related-link">
            {{ localized(r.title) }}
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </article>
</template>

<style scoped lang="scss">
.art-plain {
  display: block;
  max-width: var(--frame-max-width, 120rem);
  margin-inline: auto;
  padding: var(--frame-space-y, 4.8rem) var(--frame-inset-x, 2.4rem);

  &__back {
    margin-bottom: 3.2rem;
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

  &__header {
    padding-bottom: 3.2rem;
    border-bottom: 1px solid var(--color-border, rgba(0, 0, 0, 0.12));
  }

  &__title {
    margin: 0;
    font-family: var(--rt-role-heading1-family, var(--font-family-heading, inherit));
    /* Oversized on purpose: the title carries the whole opening. */
    font-size: clamp(4rem, 8vw, 9.6rem);
    line-height: 1;
    letter-spacing: -0.02em;
    color: var(--color-text);
  }

  &__standfirst {
    margin: 2.4rem 0 0;
    max-width: 88rem;
    font-size: clamp(1.8rem, 2.4vw, 2.4rem);
    line-height: 1.4;
    color: var(--color-text-light);
  }

  &__meta {
    margin: 2.4rem 0 0;
    font-size: 1.3rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-text-light);
  }

  &__meta-sep {
    margin: 0 0.8rem;
  }

  &__body {
    margin-top: 4rem;

    @media (min-width: $bp-lg) {
      .art-plain[data-columns='2'] & {
        column-count: 2;
        column-gap: 4.8rem;
      }
    }
  }

  /* Drop cap on the first paragraph only; :deep because the body is v-html. */
  &[data-drop-cap='true'] &__body :deep(> p:first-child)::first-letter {
    float: left;
    font-family: var(--rt-role-heading1-family, var(--font-family-heading, inherit));
    font-size: 5.2em;
    line-height: 0.82;
    padding-right: 0.12em;
    color: var(--color-accent, var(--color-text));
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
  .art-plain__back-link,
  .art-plain__related-link { transition: none; }
}
</style>
