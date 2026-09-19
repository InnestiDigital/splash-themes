<!--
  Text-first structured article template.

  Articles are structured-only (see server/services/templateRenderService.ts) —
  a template without `component` + a non-empty `contentSchema` throws 422 and the
  page renders blank. `article-gallery-sticky` is the theme's other article
  template, but it is a project showcase: a sticky sidebar for client, services,
  contributors and address. This one is for prose — history pages, press
  releases, notices — where the body IS the content and images are optional.

  Content arrives render-ready: `resolveContentForRender` has already turned the
  richtext TipTap docs into sanitized HTML keyed by locale, so the template only
  picks a locale and prints.
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

// The page's CONTENT locale, not the vue-i18n UI locale: the public site has no
// language switcher and renders in its configured language regardless.
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

const eyebrow = computed(() => localized(props.data.headerEyebrow))
// Falls back to the page title so an article whose contentData was never filled
// in still renders a heading rather than an empty <h1>.
const title = computed(() => localized(props.data.title) || props.page.title)
const subtitle = computed(() => localized(props.data.subtitle))
const body = computed(() => localized(props.data.body))

const featured = computed(() => mediaFor(props.data.featuredImage))
const gallery = computed(() =>
  ((props.data.gallery ?? []) as any[])
    .map(entry => mediaFor(typeof entry === 'string' ? entry : entry?.image))
    .filter((record): record is MediaRecord => record !== null),
)

// Render publication dates in the site's authoring zone (themeSettings
// contentTimeZone, IANA name) so viewers in other zones do not see the day
// shift; null (unset) keeps the legacy local-zone render. Same idiom as
// ArticleList.vue.
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
// Byline parts are two decisions, not one: the article-baseline fragment gives
// both article templates the same showAuthor / showPublishedDate pair, and the
// server resolves each to its schema default before the settings reach us.
const showDate = computed(() => props.settings.showPublishedDate === true && Boolean(publishedLabel.value))
const showAuthor = computed(() => props.settings.showAuthor === true && Boolean(authorLabel.value))
const showMeta = computed(() => showDate.value || showAuthor.value)

// ── Back-to-index breadcrumb ─────────────────────────────────────────────────
// Same wayfinding contract article-gallery-sticky ships: a quiet link back to
// the parent blog / project index, rendered only when the renderer supplied a
// parent slug. Opt-out via showBackLink.
const showBackLink = computed(() => props.settings.showBackLink === true && Boolean(props.page.parentSlug))
const backHref = computed(() => (props.page.parentSlug ? `/${props.page.parentSlug}` : ''))
const backLabel = computed(() => humanizeSlug(props.page.parentSlug ?? ''))
const BACK_ARIA_BY_LOCALE: Record<string, string> = {
  it: 'Torna a',
  'en-US': 'Back to',
}
const backAriaLabel = computed(() => {
  const lang = contentLocale.value?.startsWith('it') ? 'it' : 'en-US'
  return `${BACK_ARIA_BY_LOCALE[lang] ?? BACK_ARIA_BY_LOCALE['en-US']} ${backLabel.value}`.trim()
})

// ── Related articles ─────────────────────────────────────────────────────────
// The page endpoint already ships sibling articles as `related` on every
// article response (same enrichment article-gallery-sticky consumes for its
// carousel). This prose template renders them as a plain onward-links list —
// no marquee: press releases and history pages want a quiet reading tail, not
// a showcase rail. Opt-out via showRelated (default on), heading overridable
// via the relatedTitle setting.
const relatedArticles = computed<ArticleRelatedSummary[]>(
  () => Array.isArray(props.related) ? props.related : [],
)
const showRelated = computed(() =>
  props.settings.showRelated === true && relatedArticles.value.length > 0,
)
// Heading default localized per CONTENT locale (this template never touches
// vue-i18n — see contentLocale above). Same by-locale-map idiom as
// article-gallery-sticky's wayfinding labels.
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
// Sibling href — same shape article-gallery-sticky uses: '#' only as a
// defensive fallback, the server-side enrichment populates both slugs.
function relatedHref(r: ArticleRelatedSummary): string {
  if (r.parentSlug && r.slug) return `/${r.parentSlug}/${r.slug}`
  return '#'
}
function relatedDate(r: ArticleRelatedSummary): string {
  return formatContentDate(r.publishedAt ?? null, contentLocale.value, contentTimeZone.value)
}

// ── Page frame ───────────────────────────────────────────────────────────────
// The same three controls a static section carries (frame-tokens fragment),
// emitted as data attributes; shared/features/layout/frameTokens.scss maps them
// to the --frame-* vars the rules below consume. 'inherit' hands the decision
// to the page layout.
const containerMode = computed<string>(() => props.settings.containerMode)
const containerInsetX = computed<string>(() => props.settings.containerInsetX)
const sectionSpaceY = computed<string>(() => props.settings.sectionSpaceY)
</script>

<template>
  <article
    class="art-ed"
    :data-container-mode="containerMode"
    :data-inset-x="containerInsetX"
    :data-space-y="sectionSpaceY"
  >
    <nav v-if="showBackLink" class="art-ed__back" :aria-label="backAriaLabel">
      <!-- NuxtLink: SPA navigation keeps the running app's site context (a
           full reload re-resolves the site from the hostname). -->
      <NuxtLink class="art-ed__back-link" :to="backHref">
        <span class="art-ed__back-arrow" aria-hidden="true">&larr;</span>{{ backLabel }}
      </NuxtLink>
    </nav>

    <header class="art-ed__header">
      <p v-if="eyebrow" class="art-ed__eyebrow">{{ eyebrow }}</p>
      <h1 class="art-ed__title">{{ title }}</h1>
      <p v-if="subtitle" class="art-ed__subtitle" v-html="subtitle"></p>

      <p v-if="showMeta" class="art-ed__meta">
        <!-- <time> only when the date parsed: formatContentDate returns '' for
             an unparseable value, and an empty datetime attribute is invalid. -->
        <time v-if="showDate" :datetime="page.publishedAt || undefined">{{ publishedLabel }}</time>
        <span v-if="showDate && showAuthor" class="art-ed__meta-sep" aria-hidden="true">·</span>
        <span v-if="showAuthor">{{ authorLabel }}</span>
      </p>
    </header>

    <figure v-if="featured" class="art-ed__figure">
      <img
        class="art-ed__figure-img"
        :src="featured.url"
        :alt="localized(featured.alt) || title"
        loading="eager"
      />
      <figcaption v-if="localized(featured.caption)" class="art-ed__caption">
        {{ localized(featured.caption) }}
      </figcaption>
    </figure>

    <div v-if="body" class="art-ed__body prose" v-html="body"></div>

    <ul v-if="gallery.length" class="art-ed__gallery">
      <li v-for="(image, index) in gallery" :key="index" class="art-ed__gallery-item">
        <img
          class="art-ed__gallery-img"
          :src="image.url"
          :alt="localized(image.alt) || ''"
          loading="lazy"
        />
        <span v-if="localized(image.caption)" class="art-ed__caption">
          {{ localized(image.caption) }}
        </span>
      </li>
    </ul>

    <nav v-if="showRelated" class="art-ed__related" :aria-label="relatedTitle">
      <h2 class="art-ed__related-title">{{ relatedTitle }}</h2>
      <ul class="art-ed__related-list">
        <li v-for="r in relatedArticles" :key="r.id" class="art-ed__related-item">
          <NuxtLink :to="relatedHref(r)" class="art-ed__related-link">
            <!-- Thumbnail only when the summary carries one — no empty frame
                 (mirrors ArticleList's v-if guard on featuredImageUrl). -->
            <img
              v-if="r.featuredImageUrl"
              class="art-ed__related-img"
              :src="r.featuredImageUrl"
              :alt="localized(r.title)"
              loading="lazy"
            />
            <span class="art-ed__related-text">
              <span class="art-ed__related-name">{{ localized(r.title) }}</span>
              <time
                v-if="relatedDate(r)"
                class="art-ed__related-date"
                :datetime="r.publishedAt || undefined"
              >{{ relatedDate(r) }}</time>
            </span>
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </article>
</template>

<style scoped lang="scss">
.art-ed {
  /* One measure for header, body and captions so the text column reads as a
     single block; the featured image is allowed to break wider below. */
  --art-measure: 72rem;
  display: block;
  /* Page frame — width, inset and vertical rhythm come from the settings on the
     root (see shared/features/layout/frameTokens.scss). The text measure above
     still caps the prose column whatever frame the author picks. */
  max-width: var(--frame-max-width, none);
  margin-inline: auto;
  padding: var(--frame-space-y) var(--frame-inset-x);

  &__header,
  &__body,
  &__caption {
    max-width: var(--art-measure);
    margin-inline: auto;
  }

  &__back {
    max-width: var(--art-measure);
    margin: 0 auto 2.4rem;
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
  }

  &__back-link:hover,
  &__back-link:focus-visible {
    color: var(--color-accent, var(--color-primary));
  }

  &__back-link:focus-visible {
    outline: 2px solid var(--color-accent, var(--color-primary));
    outline-offset: 3px;
  }

  &__eyebrow {
    margin: 0 0 1.2rem;
    font-size: 1.3rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-accent, var(--color-text-light));
  }

  &__title {
    margin: 0;
    font-family: var(--rt-role-heading1-family, var(--font-family-heading, inherit));
    font-size: clamp(3.2rem, 5vw, 5.6rem);
    line-height: 1.1;
    color: var(--color-text);
  }

  &__subtitle {
    margin: 1.6rem 0 0;
    font-size: clamp(1.8rem, 2.2vw, 2.2rem);
    line-height: 1.45;
    color: var(--color-text-light);
  }

  &__meta {
    margin: 2.4rem 0 0;
    font-size: 1.3rem;
    color: var(--color-text-light);
  }

  &__meta-sep {
    margin: 0 0.8rem;
  }

  &__figure {
    /* Wider than the text measure, still inside the container. */
    max-width: 108rem;
    margin: 4rem auto 0;
  }

  &__figure-img,
  &__gallery-img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 0.6rem;
  }

  &__caption {
    display: block;
    margin: 0.8rem auto 0;
    font-size: 1.3rem;
    color: var(--color-text-light);
  }

  &__body {
    margin-top: 4rem;
  }

  &__gallery {
    list-style: none;
    max-width: 108rem;
    margin: 4.8rem auto 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(28rem, 1fr));
    gap: 2.4rem;
  }

  /* Related articles — quiet reading tail inside the text measure, separated
     by the same hairline weight the theme uses for in-card dividers. */
  &__related {
    max-width: var(--art-measure);
    margin: 6.4rem auto 0;
    padding-top: 3.2rem;
    border-top: 1px solid var(--color-border, rgba(0, 0, 0, 0.12));
  }

  &__related-title {
    margin: 0 0 2.4rem;
    font-family: var(--rt-role-heading2-family, var(--font-family-heading, inherit));
    font-size: clamp(2rem, 2.6vw, 2.6rem);
    line-height: 1.15;
    color: var(--color-text);
  }

  &__related-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    /* min(…, 100%) keeps the track floor from overflowing sub-280px phones. */
    grid-template-columns: repeat(auto-fill, minmax(min(24rem, 100%), 1fr));
    gap: 1.6rem 2.4rem;
  }

  &__related-link {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    min-height: 4.4rem;
    text-decoration: none;
    color: var(--color-text);
  }

  &__related-link:hover .art-ed__related-name,
  &__related-link:focus-visible .art-ed__related-name {
    color: var(--color-accent, var(--color-primary));
    text-decoration: underline;
  }

  &__related-link:focus-visible {
    outline: 2px solid var(--color-accent, var(--color-primary));
    outline-offset: 3px;
  }

  &__related-img {
    flex: 0 0 6.4rem;
    width: 6.4rem;
    height: 6.4rem;
    object-fit: cover;
    border-radius: 0.4rem;
  }

  &__related-text {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-width: 0;
  }

  &__related-name {
    font-size: 1.5rem;
    line-height: 1.35;
    transition: color 0.2s ease;
  }

  &__related-date {
    font-size: 1.3rem;
    color: var(--color-text-light);
  }
}

@media (prefers-reduced-motion: reduce) {
  .art-ed__related-name,
  .art-ed__back-link { transition: none; }
}
</style>
