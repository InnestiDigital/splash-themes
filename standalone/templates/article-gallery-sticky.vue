<!--
  IMPORTANT: This template is a thin presentational layer.
  It does NOT:
    - render TipTap docs (server already transformed richtext fields to sanitized HTML strings)
    - build /api/media/<id> URLs (server already collected referenced media records into props.media)
    - sanitize HTML further (server already sanitized via mode-specific Phase 2 sanitizer)
  It DOES:
    - read render-ready data + settings + media + page meta + related siblings
    - assemble the four-section editorial layout:
        A. Header strip (80/20 — title/subtitle on left, year + description on right)
        B. Gallery + sticky info card (80/20 — vertical gallery on left, 5 named info slots on right)
        C. Auto-scroll related-content carousel (CSS keyframes, pause-on-hover)
        D. Theme footer (rendered globally — no template work here)
-->
<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ResolvedSeo } from '~/shared/types/seo'
import type { MediaRecord, ArticleRelatedSummary } from '~/shared/types/articles'
import { formatContentDate } from '~/themes/standalone/lib/formatContentDate'
import { humanizeSlug } from '~/themes/standalone/lib/humanizeSlug'
import { useClientConfig } from '~/shared/composables/useClientConfig'
import { useEntranceReveal } from '~/shared/composables/useEntranceReveal'

interface Props {
  data: Record<string, any>           // render-ready: richtext fields are HTML strings (or locale maps of HTML strings)
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
    parentSlug?: string | null         // parent blog slug (passed by renderer; related hrefs use per-item parentSlug)
    pageType: string
    locale: string
  }
  related?: ArticleRelatedSummary[]
}

const props = defineProps<Props>()
const { locale, t } = useI18n()

function pickLocalizedString(map: any, fallback = ''): string {
  if (!map) return fallback
  if (typeof map === 'string') return map
  return map[locale.value] ?? map['en-US'] ?? Object.values(map)[0] ?? fallback
}

// Richtext fields arrive either as a sanitized HTML string (non-translatable)
// or a locale-keyed map of sanitized HTML strings (translatable). The server
// already sanitized; v-html is safe per the template contract.
function asHtml(htmlOrMap: any, fallback = ''): string {
  if (!htmlOrMap) return fallback
  if (typeof htmlOrMap === 'string') return htmlOrMap
  return htmlOrMap[locale.value] ?? htmlOrMap['en-US'] ?? Object.values(htmlOrMap)[0] ?? fallback
}

function mediaUrl(id: string | null | undefined): string {
  if (!id) return ''
  return props.media[id]?.url ?? ''
}
function mediaAlt(id: string | null | undefined): string {
  if (!id) return ''
  return pickLocalizedString(props.media[id]?.alt) || ''
}

const titleStr = computed(() => pickLocalizedString(props.data.title) || props.page.title)

const gallery = computed<Array<{ id: string; mediaId: string; caption?: any; alt?: any }>>(
  () => Array.isArray(props.data.gallery) ? props.data.gallery : [],
)

// Every settingsSchema field arrives resolved to its schema default
// (server/services/schema/templateSettingsResolution.ts), so this is a rename
// of the payload, not a second set of defaults.
const settings = computed(() => ({
  // Which side the shell column (the info card) sits on — the same left|right
  // vocabulary the editorial-split section type uses.
  shellSide: props.settings.shellSide,
  stickyInfoCard: props.settings.stickyInfoCard === true,
  imageRatio: props.settings.imageRatio,
  // 'full' = gallery photos run to the screen edge (design-reference default);
  // 'inset' = photos stay within the page gutter, aligned with the title.
  galleryImageBleed: props.settings.galleryImageBleed,
  showAuthor: props.settings.showAuthor === true,
  showPublishedDate: props.settings.showPublishedDate === true,
  showRelated: props.settings.showRelated === true,
  relatedTitle: props.settings.relatedTitle,
  enableLightbox: props.settings.enableLightbox === true,
  showBackLink: props.settings.showBackLink === true,
  showArticleFooterNav: props.settings.showArticleFooterNav === true,
  // Page frame — the same three controls a static section carries, emitted as
  // data attributes and mapped to --frame-* by
  // shared/features/layout/frameTokens.scss. 'inherit' hands the decision to
  // the page layout.
  containerMode: props.settings.containerMode,
  containerInsetX: props.settings.containerInsetX,
  sectionSpaceY: props.settings.sectionSpaceY,
}))

function localizedAlt(item: any): string {
  return pickLocalizedString(item.alt) || mediaAlt(item.mediaId) || titleStr.value
}
function localizedCaption(item: any): string {
  return pickLocalizedString(item.caption) || ''
}

// NaN-guarded via the shared theme util: `toLocaleDateString` does not throw on
// an invalid Date (it returns the literal "Invalid Date"), so a bare try/catch
// would leak that string — the util rejects NaN timestamps explicitly.
// Render in the site's authoring zone (themeSettings contentTimeZone) so the
// date-only semantics survive viewer-zone differences; null = legacy local zone.
const { themeSettings } = useClientConfig()
const contentTimeZone = computed<string | null>(() => {
  const tz = themeSettings.value.contentTimeZone
  return typeof tz === 'string' && tz.length > 0 ? tz : null
})
const formattedDate = computed(() => formatContentDate(props.page.publishedAt, locale.value, contentTimeZone.value))

// ── Back-to-index breadcrumb ───────────────────────────────────────────────
// Article detail pages nest under a parent blog / project index; until now the
// only route back was the global drawer. A small editorial breadcrumb restores
// in-context wayfinding. Opt-out via showBackLink (default on). Renders only
// when the renderer supplied a parent slug.
const showBackLink = computed(() => settings.value.showBackLink)
const backHref = computed(() => (props.page.parentSlug ? `/${props.page.parentSlug}` : ''))
const backLabel = computed(() => (props.page.parentSlug ? humanizeSlug(props.page.parentSlug) : ''))
const BACK_ARIA_BY_LOCALE: Record<string, string> = {
  it: 'Torna a',
  'en-US': 'Back to',
}
const backAriaLabel = computed(() => {
  const lang = locale.value?.startsWith('it') ? 'it' : 'en-US'
  return `${BACK_ARIA_BY_LOCALE[lang] ?? BACK_ARIA_BY_LOCALE['en-US']} ${backLabel.value}`.trim()
})

// ── End-of-article wayfinding footer ───────────────────────────────────────
// Bookends the top breadcrumb: a slim centered nav at the very bottom offering
// a back-to-index link (only when parentSlug exists — reuses backHref/backLabel)
// and a back-to-top button. Opt-out via showArticleFooterNav (default on).
const showFooterNav = computed(() => settings.value.showArticleFooterNav)
const BACK_TO_TOP_BY_LOCALE: Record<string, string> = {
  it: 'Torna su',
  'en-US': 'Back to top',
}
const backToTopLabel = computed(() => {
  const lang = locale.value?.startsWith('it') ? 'it' : 'en-US'
  return BACK_TO_TOP_BY_LOCALE[lang] ?? BACK_TO_TOP_BY_LOCALE['en-US']
})
function scrollToTop(): void {
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
}

// ── Info card labels ─────────────────────────────────────────────────────────
// Slot content is editor-localized; the field label is not, so we localize it
// here per UI locale. Future surface improvement: read labels from contentSchema
// and pass them through props.template.contentSchema. Deferred.
const INFO_LABELS_BY_LOCALE: Record<string, Record<string, string>> = {
  it: {
    infoText: 'Info',
    client: 'Cliente',
    services: 'Servizi',
    contributors: 'Collaboratori',
    address: 'Indirizzo',
  },
  'en-US': {
    infoText: 'Info',
    client: 'Client',
    services: 'Services',
    contributors: 'Contributors',
    address: 'Address',
  },
}

function infoLabel(slot: string): string {
  const lang = locale.value?.startsWith('it') ? 'it' : 'en-US'
  return INFO_LABELS_BY_LOCALE[lang][slot] ?? INFO_LABELS_BY_LOCALE['en-US'][slot] ?? slot
}

// ── Related-content carousel ─────────────────────────────────────────────────
// CSS keyframes auto-scroll uses `transform: translateX(-50%)`, which only
// loops cleanly when the track contains the item list TWICE. We double the
// array here and prefix per-iteration `_key` values for Vue's v-for keying so
// duplicates don't collide.
const relatedArticles = computed<ArticleRelatedSummary[]>(
  () => Array.isArray(props.related) ? props.related : [],
)

const relatedTrackItems = computed(() => {
  const list = relatedArticles.value
  if (list.length === 0) return []
  // Marquee loop needs `track-width / 2 >= viewport-width` so translateX(-50%)
  // never reveals empty space. Each card with gap occupies ~18rem (180px) so
  // a single pass needs ~8 cards to fill a 1440px viewport. We repeat the
  // unique list enough times that one pass exceeds 8 cards, then duplicate
  // the whole pack for the seamless 50% loop.
  const minCardsPerPass = 8
  const repeatPerPass = Math.max(1, Math.ceil(minCardsPerPass / list.length))
  const onePass: Array<ArticleRelatedSummary & { _key: string }> = []
  for (let r = 0; r < repeatPerPass; r++) {
    for (let i = 0; i < list.length; i++) {
      onePass.push({ ...list[i], _key: `p${r}-${list[i].id}-${i}` })
    }
  }
  return [
    ...onePass.map((x, i) => ({ ...x, _key: `a-${i}` })),
    ...onePass.map((x, i) => ({ ...x, _key: `b-${i}` })),
  ]
})

const relatedTitleStr = computed(() => pickLocalizedString(settings.value.relatedTitle))

// Build href to a sibling article. Falls back to '#' if either slug is
// missing — defensive only; the server-side enrichment populates both.
function relatedHref(r: ArticleRelatedSummary): string {
  if (r.parentSlug && r.slug) return `/${r.parentSlug}/${r.slug}`
  return '#'
}

// Template pages bypass DynamicPage's auto-entrance (no block pipeline) —
// reveal the article's top-level groups with the same theme motion rhythm.
const apgRoot = ref<HTMLElement | null>(null)
useEntranceReveal(apgRoot, {
  selector: '.apg-header, .apg-hero, .apg-info-card, .apg-gallery-section, .apg-related',
})

// ── Gallery lightbox ─────────────────────────────────────────────────────────
// Photo-heavy project galleries deserve full-screen zoom. Opt-out via the
// template setting enableLightbox (default on). Hero + every gallery photo form
// one navigable set (hero first when present).
const lightboxEnabled = computed(() => settings.value.enableLightbox)

interface ZoomImage { src: string; alt: string; caption: string }
const zoomImages = computed<ZoomImage[]>(() => {
  const list: ZoomImage[] = []
  const heroId = props.data.featuredImage
  if (heroId && mediaUrl(heroId)) {
    list.push({ src: mediaUrl(heroId), alt: mediaAlt(heroId) || titleStr.value, caption: '' })
  }
  for (const item of gallery.value) {
    if (mediaUrl(item.mediaId)) {
      list.push({ src: mediaUrl(item.mediaId), alt: localizedAlt(item), caption: localizedCaption(item) })
    }
  }
  return list
})
const heroZoomIndex = computed(() =>
  props.data.featuredImage && mediaUrl(props.data.featuredImage) ? 0 : -1,
)
// Map a gallery loop index to its slot in zoomImages. zoomImages skips gallery
// items with an unresolvable media id, so we can't just offset by the raw index
// — count only the resolvable items that precede this one (plus the hero slot).
function galleryZoomIndex(i: number): number {
  let idx = heroZoomIndex.value >= 0 ? 1 : 0
  for (let k = 0; k < i; k++) {
    if (mediaUrl(gallery.value[k].mediaId)) idx++
  }
  return idx
}

const lightboxOpen = ref(false)
const lightboxIndex = ref(0)
const lastFocused = ref<HTMLElement | null>(null)
const lightboxDialog = ref<HTMLElement | null>(null)
const currentZoom = computed<ZoomImage | null>(() => zoomImages.value[lightboxIndex.value] ?? null)

function openLightbox(index: number): void {
  if (!lightboxEnabled.value) return
  if (index < 0 || index >= zoomImages.value.length) return
  lastFocused.value =
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
  lightboxIndex.value = index
  lightboxOpen.value = true
  if (typeof document !== 'undefined') document.body.style.overflow = 'hidden'
  void nextTick(() => { lightboxDialog.value?.focus() })
}
function closeLightbox(): void {
  lightboxOpen.value = false
  if (typeof document !== 'undefined') document.body.style.overflow = ''
  const target = lastFocused.value
  if (target) void nextTick(() => target.focus())
}
function stepLightbox(delta: number): void {
  const n = zoomImages.value.length
  if (n === 0) return
  lightboxIndex.value = (lightboxIndex.value + delta + n) % n
}
function onLightboxKey(e: KeyboardEvent): void {
  if (!lightboxOpen.value) return
  if (e.key === 'Escape') { e.preventDefault(); closeLightbox() }
  else if (e.key === 'ArrowRight') { e.preventDefault(); stepLightbox(1) }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); stepLightbox(-1) }
  else if (e.key === 'Tab') {
    // Minimal focus trap across the dialog's controls.
    const nodes = lightboxDialog.value?.querySelectorAll<HTMLElement>('[data-lb-focus]')
    if (!nodes || nodes.length === 0) { e.preventDefault(); lightboxDialog.value?.focus(); return }
    const arr = Array.from(nodes)
    const first = arr[0]
    const last = arr[arr.length - 1]
    const active = typeof document !== 'undefined' ? document.activeElement : null
    if (e.shiftKey && (active === first || active === lightboxDialog.value)) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
  }
}
function onThumbKey(e: KeyboardEvent, index: number): void {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(index) }
}

// Reading progress is layout chrome (`reading-progress` in theme.json), not a
// template control — the shell renders and positions it for every layout.

onMounted(() => {
  window.addEventListener('keydown', onLightboxKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onLightboxKey)
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})
</script>

<template>
  <article
    ref="apgRoot"
    class="apg"
    :data-shell-side="settings.shellSide"
    :data-sticky="settings.stickyInfoCard ? 'true' : 'false'"
    :data-image-ratio="settings.imageRatio"
    :data-gallery-bleed="settings.galleryImageBleed"
    :data-container-mode="settings.containerMode"
    :data-inset-x="settings.containerInsetX"
    :data-space-y="settings.sectionSpaceY"
  >
    <!-- ── Section A: Header strip (80/20) ───────────────────────────────── -->
    <header class="apg-header">
      <!-- Site branding stays in the global header and is not duplicated here. -->
      <nav
        v-if="showBackLink && backHref"
        class="apg-backlink"
        :aria-label="backAriaLabel"
      >
        <!-- NuxtLink: SPA navigation keeps the running app's site context (a
             full reload re-resolves the site from the hostname). -->
        <NuxtLink :to="backHref" class="apg-backlink__link">
          <span class="apg-backlink__arrow" aria-hidden="true">&#8592;</span>
          <span class="apg-backlink__label">{{ backLabel }}</span>
        </NuxtLink>
      </nav>
      <div class="apg-header__split">
        <div class="apg-header__main">
          <h1 v-if="data.title" class="apg-header__title">{{ pickLocalizedString(data.title) }}</h1>
          <p v-if="data.subtitle" class="apg-header__subtitle">{{ pickLocalizedString(data.subtitle) }}</p>
        </div>
        <aside class="apg-header__side">
          <p v-if="data.year" class="apg-header__year">{{ pickLocalizedString(data.year) }}</p>
          <div v-if="data.headerDescription" v-html="asHtml(data.headerDescription)" class="apg-header__desc prose" />
        </aside>
      </div>
      <div v-if="settings.showAuthor || settings.showPublishedDate" class="apg-header__meta">
        <span v-if="settings.showAuthor && page.author.displayName" class="apg-header__author">
          {{ page.author.displayName }}
        </span>
        <span
          v-if="settings.showAuthor && page.author.displayName && settings.showPublishedDate && formattedDate"
          class="apg-header__meta-sep"
        >·</span>
        <span v-if="settings.showPublishedDate && page.publishedAt && formattedDate" class="apg-header__date">
          <time :datetime="page.publishedAt">{{ formattedDate }}</time>
        </span>
      </div>
    </header>

    <!-- ── Section B: Gallery + sticky info card (80/20) ─────────────────── -->
    <section class="apg-gallery-section">
      <div class="apg-gallery-section__split">
        <div class="apg-gallery-section__main">
          <img
            v-if="data.featuredImage && mediaUrl(data.featuredImage)"
            :src="mediaUrl(data.featuredImage)"
            :alt="mediaAlt(data.featuredImage) || titleStr"
            class="apg-hero"
            :class="{ 'apg-zoomable': lightboxEnabled }"
            :role="lightboxEnabled ? 'button' : null"
            :tabindex="lightboxEnabled ? 0 : null"
            :aria-label="lightboxEnabled ? t('gallery.zoom', 'View full size') : null"
            @click="lightboxEnabled ? openLightbox(heroZoomIndex) : undefined"
            @keydown="lightboxEnabled ? onThumbKey($event, heroZoomIndex) : undefined"
          />
          <figure
            v-for="(item, gi) in gallery"
            :key="item.id"
            class="apg-gallery__item"
          >
            <img
              v-if="mediaUrl(item.mediaId)"
              :src="mediaUrl(item.mediaId)"
              :alt="localizedAlt(item)"
              loading="lazy"
              :class="{ 'apg-zoomable': lightboxEnabled }"
              :role="lightboxEnabled ? 'button' : null"
              :tabindex="lightboxEnabled ? 0 : null"
              :aria-label="lightboxEnabled ? t('gallery.zoom', 'View full size') : null"
              @click="lightboxEnabled ? openLightbox(galleryZoomIndex(gi)) : undefined"
              @keydown="lightboxEnabled ? onThumbKey($event, galleryZoomIndex(gi)) : undefined"
            />
            <figcaption v-if="localizedCaption(item)">{{ localizedCaption(item) }}</figcaption>
          </figure>
        </div>
        <aside class="apg-info-card" :data-sticky="settings.stickyInfoCard ? 'true' : 'false'">
          <section v-if="data.infoText" class="apg-info-card__section">
            <h3 class="apg-info-card__heading">{{ infoLabel('infoText') }}</h3>
            <div class="apg-info-card__body prose" v-html="asHtml(data.infoText)" />
          </section>
          <section v-if="data.client" class="apg-info-card__section">
            <h3 class="apg-info-card__heading">{{ infoLabel('client') }}</h3>
            <div class="apg-info-card__body prose" v-html="asHtml(data.client)" />
          </section>
          <section v-if="data.services" class="apg-info-card__section">
            <h3 class="apg-info-card__heading">{{ infoLabel('services') }}</h3>
            <div class="apg-info-card__body prose" v-html="asHtml(data.services)" />
          </section>
          <section v-if="data.contributors" class="apg-info-card__section apg-info-card__section--unlabeled">
            <div class="apg-info-card__body prose" v-html="asHtml(data.contributors)" />
          </section>
          <section v-if="data.address" class="apg-info-card__section apg-info-card__section--unlabeled">
            <div class="apg-info-card__body prose" v-html="asHtml(data.address)" />
          </section>
        </aside>
      </div>
    </section>

    <!-- ── Section C: related-content carousel ───────────────────────────── -->
    <section
      v-if="settings.showRelated && relatedArticles.length > 0"
      class="apg-related"
    >
      <h2 class="apg-related__heading">{{ relatedTitleStr }}</h2>
      <div class="apg-related__viewport">
        <div class="apg-related__track">
          <NuxtLink
            v-for="r in relatedTrackItems"
            :key="r._key"
            :to="relatedHref(r)"
            class="apg-related__card"
          >
            <!-- Ref places the project name as a small label ABOVE the thumb -->
            <h3 class="apg-related__card-title">{{ pickLocalizedString(r.title) }}</h3>
            <p v-if="r.subtitle" class="apg-related__card-subtitle">{{ pickLocalizedString(r.subtitle) }}</p>
            <img
              v-if="r.featuredImageUrl"
              :src="r.featuredImageUrl"
              :alt="pickLocalizedString(r.title)"
              class="apg-related__card-img"
              loading="lazy"
            />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ── End-of-article wayfinding footer ──────────────────────────────── -->
    <nav v-if="showFooterNav" class="apg-footnav" :aria-label="backToTopLabel">
      <NuxtLink
        v-if="backHref"
        :to="backHref"
        class="apg-footnav__link apg-footnav__link--back"
        :aria-label="backAriaLabel"
      >
        <span class="apg-footnav__arrow" aria-hidden="true">&#8592;</span>
        <span>{{ backLabel }}</span>
      </NuxtLink>
      <button
        type="button"
        class="apg-footnav__link apg-footnav__link--top"
        :aria-label="backToTopLabel"
        @click="scrollToTop"
      >
        <span>{{ backToTopLabel }}</span>
        <span class="apg-footnav__arrow" aria-hidden="true">&#8593;</span>
      </button>
    </nav>

    <!-- ── Gallery lightbox overlay (teleported; scoped styles still apply) ─── -->
    <Teleport to="body">
      <div
        v-if="lightboxEnabled && lightboxOpen"
        ref="lightboxDialog"
        class="apg-lightbox"
        role="dialog"
        aria-modal="true"
        :aria-label="currentZoom?.alt || t('gallery.viewer', 'Image viewer')"
        tabindex="-1"
        @click.self="closeLightbox"
      >
        <button
          type="button"
          class="apg-lightbox__close"
          data-lb-focus
          :aria-label="t('gallery.close', 'Close')"
          @click="closeLightbox"
        >&times;</button>
        <button
          v-if="zoomImages.length > 1"
          type="button"
          class="apg-lightbox__nav apg-lightbox__nav--prev"
          data-lb-focus
          :aria-label="t('gallery.previous', 'Previous image')"
          @click="stepLightbox(-1)"
        >&#8249;</button>
        <figure class="apg-lightbox__figure">
          <img
            v-if="currentZoom"
            :src="currentZoom.src"
            :alt="currentZoom.alt"
            class="apg-lightbox__img"
          />
          <figcaption v-if="currentZoom?.caption" class="apg-lightbox__caption">
            {{ currentZoom.caption }}
          </figcaption>
        </figure>
        <button
          v-if="zoomImages.length > 1"
          type="button"
          class="apg-lightbox__nav apg-lightbox__nav--next"
          data-lb-focus
          :aria-label="t('gallery.next', 'Next image')"
          @click="stepLightbox(1)"
        >&#8250;</button>
        <p v-if="zoomImages.length > 1" class="apg-lightbox__counter" aria-hidden="true">
          {{ lightboxIndex + 1 }} / {{ zoomImages.length }}
        </p>
      </div>
    </Teleport>
  </article>
</template>

<!-- lang="scss" is required: the injected $bp-* breakpoint vars only resolve in
     SCSS blocks — as plain CSS the `@media (min-width: $bp-lg)` query is invalid
     and the desktop grid-split + sticky-info-card rules silently never apply. -->
<style scoped lang="scss">
/* Local visual fallbacks. The accent chain reads the tenant palette first
   (--color-secondary / --color-primary) and only then the theme's fixed
   editorial-blue tokens, which are the design reference's teal: a tenant with
   its own palette would otherwise get that teal on every templated article.
   The inline `var(..., fallback)` keeps this template usable in isolation. */
.apg {
  display: block;
  /* Theme uses 62.5% root → 1rem = 10px. We use rem throughout so font sizes
     stay proportional to the root. */
  --apg-blue: var(--color-secondary, var(--color-editorial-blue, #5985B0));
  --apg-blue-dark: var(--color-primary, var(--color-editorial-blue-dark, #7894B2));
  --apg-text: var(--color-text, #222);
  --apg-muted: var(--color-text-muted, #6a6a6a);
  --apg-rule: rgba(0, 0, 0, 0.12);
  /* Page frame — width and horizontal gutter come from the settings on the root
     (see shared/features/layout/frameTokens.scss), which also caps the inset on
     narrow containers so a phone doesn't lose ~80px to fixed side insets. Both
     gutters share the value so single-column mode stays symmetric; the
     two-column grid + chrome-rule geometry are tuned for the shipped md tier. */
  max-width: var(--frame-max-width, none);
  margin-inline: auto;
  --apg-gutter-x: var(--frame-inset-x);
  --apg-gutter-right: var(--frame-inset-x);
}

/* Wrapper flows full-width. Inner sections decide their own constraints:
   - Header section stays inside the gutter so text doesn't touch viewport
     edges.
   - Gallery section bleeds full-width on the left so images run edge-to-edge,
     stops on the right at the info-card column boundary (just left of the
     chrome rule). The 78/22 grid keeps the info card column anchored. */

/* ── Section A: Header strip ──────────────────────────────────────────────── */
/* Back-to-index breadcrumb — small editorial wayfinding link above the title. */
.apg-backlink {
  margin-bottom: 2.4rem;
}
.apg-backlink__link {
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
  min-height: 4.4rem;
  font-family: var(--font-family, 'Inter', sans-serif);
  font-size: 1.3rem;
  letter-spacing: 0.02em;
  color: var(--apg-muted);
  text-decoration: none;
  transition: color 0.2s ease;
}
.apg-backlink__arrow {
  display: inline-block;
  transition: transform 0.2s ease;
}
.apg-backlink__link:hover {
  color: var(--apg-blue);
}
.apg-backlink__link:hover .apg-backlink__arrow {
  transform: translateX(-0.3rem);
}
.apg-backlink__link:focus-visible {
  outline: 2px solid var(--apg-blue);
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  .apg-backlink__arrow { transition: none; }
  .apg-backlink__link:hover .apg-backlink__arrow { transform: none; }
}
.apg-header {
  /* Mobile-first: symmetric gutters so the single-column header sits centered
     between equal left/right insets. The two-column grid (>= $bp-lg) zeroes the
     right padding — there the header__side column supplies the right gutter and
     the grid's right edge aligns with the chrome rule (anchored at 20vw from
     the right). */
  padding: var(--frame-space-y) var(--apg-gutter-right) 4rem var(--apg-gutter-x);
}
.apg-header__split {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  align-items: start;
}
.apg-header__title {
  /* REF: geometric sans (Sul Sans), 72px, regular weight — zero serifs. Themed
     heading face; local fallback stays sans, never Playfair. */
  font-family: var(--font-family-heading, 'Sul Sans', 'Inter', sans-serif);
  font-size: clamp(4rem, 5.5vw, 7.2rem);
  line-height: 1.02;
  letter-spacing: -0.005em;
  margin: 0 0 1.2rem;
  font-weight: 400;
  color: var(--apg-blue);
}
.apg-header__subtitle {
  /* Sans subtitle — dark, regular, sized per reference (~30px). */
  font-family: var(--font-family, 'Inter', sans-serif);
  font-size: clamp(2rem, 2.4vw, 3.2rem);
  line-height: 1.15;
  letter-spacing: -0.005em;
  color: var(--apg-text);
  margin: 0;
  font-weight: 400;
}
.apg-header__side {
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  text-align: right;
  padding-top: 1rem; /* visual baseline alignment with the serif title baseline */
  /* Match the gallery info card: clear the chrome rule on the left, supply a
     gutter on the right so right-aligned text doesn't kiss the viewport edge. */
  padding-left: 1.6rem;
  padding-right: var(--apg-gutter-right);
}
.apg-header__year {
  /* REF: "(2016)" is a small 14px black year stamp — not muted, not enlarged. */
  font-family: var(--font-family, 'Inter', sans-serif);
  font-size: 1.4rem;
  line-height: 1.2;
  color: var(--apg-text);
  margin: 0;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}
.apg-header__desc {
  font-family: var(--font-family, 'Inter', sans-serif);
  font-size: 1.2rem;
  line-height: 1.55;
  color: var(--apg-muted);
}
.apg-header__desc :deep(p) { margin: 0 0 0.6em; }
.apg-header__desc :deep(p:last-child) { margin-bottom: 0; }
.apg-header__meta {
  margin-top: 2.4rem;
  color: var(--apg-muted);
  font-size: 1.2rem;
}
.apg-header__meta-sep { margin: 0 0.5em; }

/* ── Section B: Gallery + sticky info card ───────────────────────────────── */
.apg-gallery-section {
  /* Mobile-first: symmetric gutters for the single-column stack. The two-column
     grid (>= $bp-lg) zeroes the right padding so the info-card column nests
     inside the chrome rule via its own margin-right. Setting-driven: the
     'full' bleed variant (default) overrides these to 0 — see below. */
  padding: 0 var(--apg-gutter-right) 6rem var(--apg-gutter-x);
}

/* Gallery image bleed (settingsSchema.galleryImageBleed).
   - 'full' (default, design reference): photos run to the screen edge. Zero the
     section's horizontal padding at every width; higher specificity than both
     the base inset and the two-column right:0 rule, so it wins regardless of
     breakpoint. Title / header / body keep their gutter — only the gallery
     column bleeds.
   - 'inset': no override — the symmetric base padding above applies, so photos
     stay within the page gutter, aligned with the title. */
.apg[data-gallery-bleed="full"] .apg-gallery-section {
  padding-left: 0;
  padding-right: 0;
}
.apg-gallery-section__main {
  /* Make sure the gallery column itself fills its grid cell — image elements
     are 100% wide already, but if any child constraint shrinks the column we
     fall back to natural width. */
  min-width: 0;
}
.apg-gallery-section__split {
  display: grid;
  grid-template-columns: 1fr;
  gap: 3.2rem;
}
.apg-gallery-section__main {
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
}
.apg-hero,
.apg-gallery__item img {
  width: 100%;
  height: auto;
  display: block;
  /* REF: squared corners on the vertical gallery (radius 0). */
  border-radius: 0;
}
/* REF default = natural mixed ratios (no forced crop). The fixed-ratio crops
   below only apply when an author explicitly picks a ratio; "natural" (the
   article default) falls through to the intrinsic aspect. */
.apg[data-image-ratio="4-3"] .apg-hero,
.apg[data-image-ratio="4-3"] .apg-gallery__item img { aspect-ratio: 4 / 3; object-fit: cover; }
.apg[data-image-ratio="3-2"] .apg-hero,
.apg[data-image-ratio="3-2"] .apg-gallery__item img { aspect-ratio: 3 / 2; object-fit: cover; }
.apg[data-image-ratio="16-9"] .apg-hero,
.apg[data-image-ratio="16-9"] .apg-gallery__item img { aspect-ratio: 16 / 9; object-fit: cover; }
.apg-gallery__item figcaption {
  font-size: 1.2rem;
  color: var(--apg-muted);
  margin-top: 0.6rem;
}

/* Info card — subtle white card on cream page bg. Visually distinct block
   inside the chrome rule. Thin horizontal hairlines divide the 5 named slots.
   Inner padding keeps text off the column edges; right margin keeps the card
   off the viewport's right edge so it nests inside the chrome rule. */
.apg-info-card {
  /* REF: soft grey fill (#f8f8f8), 15px radius, ~419px wide, straddling the
     chrome hairline (see the $bp-lg grid: fixed 41.9rem column + 1.5rem right
     margin so the card's right edge nests 15px off the viewport edge while its
     left edge crosses the x1103 rule). */
  background: var(--apg-info-card-bg, #f8f8f8);
  border-radius: 1.5rem;
  padding: 2rem 2.4rem;
  margin-right: 1.5rem;
  display: flex;
  flex-direction: column;
}
.apg-info-card__section {
  padding: 1.4rem 0;
}
.apg-info-card__section + .apg-info-card__section {
  border-top: 1px solid var(--apg-rule);
}
.apg-info-card__heading {
  font-family: var(--font-family, 'Inter', sans-serif);
  font-size: 1.3rem;
  text-transform: none;
  letter-spacing: 0;
  color: var(--apg-text);
  margin: 0 0 0.6rem;
  font-weight: 700;
}
.apg-info-card__body {
  font-family: var(--font-family, 'Inter', sans-serif);
  font-size: 1.3rem;
  line-height: 1.5;
  color: var(--apg-text);
}
.apg-info-card__body :deep(p) { margin: 0 0 0.6em; }
.apg-info-card__body :deep(p:last-child) { margin-bottom: 0; }
.apg-info-card__body :deep(br) { line-height: 1.7; }

/* Contributors/address blocks (no label heading) — text reads as a roster.
   Reference visually pairs each name with its role: name regular, role
   lighter and slightly muted on the next line. Without semantic markup we
   approximate by treating every other line lighter via the line-after-br
   pattern. Consumers can still author plain rich text. */
.apg-info-card__section--unlabeled .apg-info-card__body {
  font-size: 1.3rem;
  line-height: 1.6;
  color: var(--apg-text);
}

/* Sticky behavior — only kicks in on >= 960px and when stickyInfoCard=true. */
@media (min-width: $bp-lg) {
  /* Two-column mode supplies the right gutter via the side / info-card columns,
     so the section containers drop their own right padding and the grid's right
     edge meets the chrome rule. (Single-column mode keeps the symmetric base.) */
  .apg-header,
  .apg-gallery-section {
    padding-right: 0;
  }
  /* Full-bleed + sidebar on the left: the gallery is now the RIGHT cell, so
     restore the info card's left gutter (the gallery bleeds off the right edge
     instead). */
  .apg[data-gallery-bleed="full"][data-shell-side="left"] .apg-gallery-section {
    padding-left: var(--apg-gutter-x);
  }
  /* Header keeps the fr-based 75/25 split (year + description on the right). */
  .apg-header__split {
    grid-template-columns: 7.5fr 2.5fr;
    gap: 4rem;
  }
  /* Gallery split: the info card is a FIXED 41.9rem (419px) column so it can
     straddle the chrome hairline (x1103 @1440) — gallery flexes to fill the
     rest (~960px), leaving the ref's ~104px gap between gallery and rule. */
  .apg-gallery-section__split {
    grid-template-columns: minmax(0, 1fr) 43.4rem;
    gap: 1rem;
  }
  .apg[data-shell-side="left"] .apg-gallery-section__split {
    grid-template-columns: 43.4rem minmax(0, 1fr);
  }
  .apg[data-shell-side="left"] .apg-info-card { order: -1; }

  .apg-info-card[data-sticky="true"] {
    position: sticky;
    top: 8rem;
    align-self: start;
  }
}

/* ── Section C: related-content carousel ─────────────────────────────────── */
.apg-related {
  /* Match the layout gutter on both sides. Cards animate inside the
     overflow-hidden viewport which inherits the section content-box, so the
     right gutter is preserved while the marquee continues seamlessly. */
  padding: 6rem var(--apg-gutter-x) var(--frame-space-y);
  background: transparent;
}
.apg-related__heading {
  /* REF: same geometric sans as the H1 at 64px — no serif face here either. */
  font-family: var(--font-family-heading, 'Sul Sans', 'Inter', sans-serif);
  font-size: clamp(3.2rem, 5vw, 6.4rem);
  /* Heading sits flush left now that .apg-related itself has the gutter. */
  margin: 0 0 4rem;
  font-weight: 400;
  color: var(--apg-blue);
  letter-spacing: -0.005em;
  line-height: 1.02;
}
.apg-related__viewport {
  overflow: hidden;
  position: relative;
}
.apg-related__track {
  display: flex;
  gap: 2rem;
  width: max-content;
  padding: 0;
  animation: apg-marquee 60s linear infinite;
  will-change: transform;
}
.apg-related__viewport:hover .apg-related__track,
.apg-related__viewport:focus-within .apg-related__track {
  animation-play-state: paused;
}
.apg-related__card {
  /* Reference (Image 10): flush borderless thumbs, ~16rem (160px) wide with a
     5/6 portrait crop and squared corners. The project name sits as a small
     label ABOVE the image (not below), matching the ref rail. */
  flex: 0 0 16rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  text-decoration: none;
  color: inherit;
}
.apg-related__card-img {
  width: 100%;
  aspect-ratio: 5 / 6;
  object-fit: cover;
  display: block;
  /* Flush borderless — no rounded corners, no card chrome (ref parity). */
  border-radius: 0;
}
.apg-related__card-title {
  font-family: var(--font-family, 'Inter', sans-serif);
  font-size: 1.3rem;
  /* Label sits above the thumb; small gap below it, none above. */
  margin: 0 0 0.4rem;
  font-weight: 600;
  color: var(--apg-text);
  letter-spacing: 0;
}
.apg-related__card-subtitle {
  font-family: var(--font-family, 'Inter', sans-serif);
  font-size: 1.1rem;
  color: var(--apg-muted);
  margin: 0 0 0.4rem;
  font-weight: 400;
  letter-spacing: 0;
}

@keyframes apg-marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

/* a11y: respect prefers-reduced-motion — disable autoscroll. */
@media (prefers-reduced-motion: reduce) {
  .apg-related__track {
    animation: none;
    /* When motion is suppressed, allow horizontal scrolling instead of looping. */
    overflow-x: auto;
    flex-wrap: nowrap;
  }
  .apg-related__viewport {
    overflow-x: auto;
  }
}

/* Touch devices: the 60s marquee can only be paused via :hover/:focus-within,
   which never fire on touch — so the rail scrolls forever and cards stay
   clipped mid-word. Mirror the reduced-motion fallback: stop the animation and
   let the reader swipe the rail horizontally, with gentle scroll snapping. */
@media (hover: none) {
  .apg-related__track {
    animation: none;
    flex-wrap: nowrap;
  }
  .apg-related__viewport {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x proximity;
  }
  .apg-related__card {
    scroll-snap-align: start;
  }
}

/* ── Gallery lightbox ─────────────────────────────────────────────────────── */
/* Zoomable thumbs: cursor affordance + keyboard focus ring. No resting layout
   change — images keep their existing box. */
.apg-zoomable { cursor: zoom-in; }
.apg-zoomable:focus-visible {
  outline: 2px solid var(--apg-blue);
  outline-offset: 3px;
}
/* Overlay is teleported to <body>; Vue keeps the scope id on these nodes so
   scoped rules still reach them. Fixed, above the site chrome. */
.apg-lightbox {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1.6rem, 4vw, 4rem);
  background: rgba(10, 12, 14, 0.92);
  animation: apg-lb-fade 0.2s ease;
}
@keyframes apg-lb-fade { from { opacity: 0; } to { opacity: 1; } }
.apg-lightbox__figure {
  margin: 0;
  max-width: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.2rem;
}
.apg-lightbox__img {
  max-width: 100%;
  max-height: 85vh;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
  box-shadow: 0 2rem 6rem rgba(0, 0, 0, 0.5);
}
.apg-lightbox__caption {
  color: rgba(255, 255, 255, 0.82);
  font-family: var(--font-family, 'Inter', sans-serif);
  font-size: 1.3rem;
  line-height: 1.4;
  text-align: center;
  max-width: 60ch;
}
.apg-lightbox__close {
  position: absolute;
  top: clamp(1rem, 2vw, 2rem);
  right: clamp(1rem, 2vw, 2rem);
  width: 4.4rem;
  height: 4.4rem;
  border: 0;
  background: transparent;
  color: #fff;
  font-size: 3.2rem;
  line-height: 1;
  cursor: pointer;
  border-radius: 50%;
}
.apg-lightbox__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 4.8rem;
  height: 4.8rem;
  border: 0;
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  font-size: 3.6rem;
  line-height: 1;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.apg-lightbox__nav--prev { left: clamp(1rem, 2vw, 2.4rem); }
.apg-lightbox__nav--next { right: clamp(1rem, 2vw, 2.4rem); }
.apg-lightbox__close:hover,
.apg-lightbox__nav:hover { background: rgba(255, 255, 255, 0.14); }
.apg-lightbox__close:focus-visible,
.apg-lightbox__nav:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
.apg-lightbox__counter {
  position: absolute;
  bottom: clamp(1rem, 2vw, 2rem);
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.7);
  font-family: var(--font-family, 'Inter', sans-serif);
  font-size: 1.3rem;
  font-variant-numeric: tabular-nums;
  margin: 0;
}
@media (prefers-reduced-motion: reduce) {
  .apg-lightbox { animation: none; }
}
@media (max-width: $bp-md) {
  .apg-lightbox__img { max-height: 78vh; }
  .apg-lightbox__nav { width: 4.4rem; height: 4.4rem; font-size: 2.8rem; }
}

/* ── End-of-article wayfinding footer ─────────────────────────────────────── */
/* Slim centered row bookending the top breadcrumb. A subtle top hairline (same
   --apg-rule token as the info-card dividers) separates it from the related
   section; generous margin gives it breathing room. Links rest muted and
   transition to --apg-blue on hover/focus — mirroring .apg-backlink. */
.apg-footnav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 2.4rem 4rem;
  margin-top: 4rem;
  padding: 3.2rem var(--apg-gutter-x) 6rem;
  border-top: 1px solid var(--apg-rule);
}
.apg-footnav__link {
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
  min-height: 4.4rem;
  font-family: var(--font-family, 'Inter', sans-serif);
  font-size: 1.3rem;
  letter-spacing: 0.02em;
  color: var(--apg-muted);
  text-decoration: none;
  transition: color 0.2s ease;
}
/* Button reads as a link — full reset. */
.apg-footnav__link--top {
  background: none;
  border: none;
  cursor: pointer;
  font: inherit;
  color: var(--apg-muted);
  padding: 0;
}
.apg-footnav__arrow {
  display: inline-block;
  transition: transform 0.2s ease;
}
.apg-footnav__link:hover,
.apg-footnav__link:focus-visible {
  color: var(--apg-blue);
}
.apg-footnav__link--back:hover .apg-footnav__arrow,
.apg-footnav__link--back:focus-visible .apg-footnav__arrow {
  transform: translateX(-0.3rem);
}
.apg-footnav__link--top:hover .apg-footnav__arrow,
.apg-footnav__link--top:focus-visible .apg-footnav__arrow {
  transform: translateY(-0.3rem);
}
.apg-footnav__link:focus-visible {
  outline: 2px solid var(--apg-blue);
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  .apg-footnav__arrow { transition: none; }
  .apg-footnav__link:hover .apg-footnav__arrow,
  .apg-footnav__link:focus-visible .apg-footnav__arrow { transform: none; }
}
</style>

<style>
/* Article-detail pages only: the reference paints the vertical hairline as a
   dark neutral stroke here, while listing pages keep the brand blue. The line
   chrome renders as a SIBLING of this template inside [data-layout-content]
   (flow mode), so scoped/:deep CSS cannot reach it — this unscoped rule keys
   on the template's root class via :has to stay page-scoped. Per-page chrome
   config overrides can't express this either: article pages inherit the
   parent blog-index's meta (they're outside the site-config shell tree). */
[data-layout-content]:has(.apg) [data-chrome-element="line"] {
  background-color: #282828 !important;
}
</style>
