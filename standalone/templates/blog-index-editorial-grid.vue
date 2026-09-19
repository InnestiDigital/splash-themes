<!--
  Editorial blog-index grid template (Blog-2 task 2.E.4).

  Internally renders <ArticleList> with settings sourced from props.settings
  (the admin-edited templateSettings). Per spec § 5.4 / Hard rule:
  this is NOT exposed as a page-builder block to clients. The display knobs
  (pageSize, sort, columns, showHero, sortDirection) live on the template's
  settingsSchema and are admin-only via the Theme Editor's Template Settings
  panel (chunk 2.F). Client editors only see the contentSchema fields the
  agency exposed (title, intro, heroImage).
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ResolvedSeo } from '~/shared/types/seo'
import type { MediaRecord } from '~/shared/types/articles'
import ArticleList from '~/themes/standalone/components/ArticleList.vue'
import ChildPageList from '~/themes/standalone/components/ChildPageList.vue'
import { useEntranceReveal } from '~/shared/composables/useEntranceReveal'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'

/** The two card views the feed renders in — the fragment's `feedDisplay` vocabulary. */
type CardView = 'card' | 'list'

interface Props {
  data: Record<string, any>           // render-ready blog content (title/intro/heroImage)
  settings: Record<string, any>       // ArticleList knobs from template.settingsSchema
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

// Localize content with the page's content locale (the site's `defaultLocale`),
// NOT the vue-i18n UI/router locale — the public site has no locale
// switcher and renders in its configured language regardless of the UI locale.
const contentLocale = computed(() => props.page.locale)

function pickLocalizedString(map: any, fallback = ''): string {
  if (!map) return fallback
  if (typeof map === 'string') return map
  return map[contentLocale.value] ?? map['en-US'] ?? Object.values(map)[0] ?? fallback
}

function asHtml(htmlOrMap: any, fallback = ''): string {
  if (!htmlOrMap) return fallback
  if (typeof htmlOrMap === 'string') return htmlOrMap
  return htmlOrMap[contentLocale.value] ?? htmlOrMap['en-US'] ?? Object.values(htmlOrMap)[0] ?? fallback
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

// The authored intro serialises to a single HTML string per locale in the
// shape `(year range)<br>description` (two ProseMirror paragraphs flattened to
// a <br>-joined string — no <p> wrappers survive). REF styles the two lines
// very differently (14px black year range, ~39px gap, 10px gray description),
// which CSS can't target inside one flat string, so we split at the template
// level: everything before the first <br> is the year range, the remainder is
// the description. No <br> → treat the whole value as the description.
const introParts = computed(() => {
  const html = asHtml(props.data.intro)
  const segments = html.split(/<br\s*\/?>/i)
  if (segments.length < 2) return { year: '', body: html.trim() }
  return { year: segments[0].trim(), body: segments.slice(1).join('<br>').trim() }
})

// settings carries the feed knobs admin can tune via templateSettings. The
// server resolves every settingsSchema field to its schema default before the
// payload reaches us (server/services/schema/templateSettingsResolution.ts), so
// there are no per-field fallbacks here to drift from the schema.
const settings = computed(() => ({
  pageSize: Number(props.settings.pageSize),
  sort: props.settings.sort as 'newest' | 'oldest',
  columns: Number(props.settings.columns),
  showHero: props.settings.showHero === true,
  sortDirection: props.settings.sortDirection as 'asc' | 'desc',
  cardImageRatio: props.settings.cardImageRatio as
    | 'natural'
    | 'portrait-3-4'
    | 'landscape-3-2'
    | 'square',
  cardSubtitle: props.settings.cardSubtitle as 'excerpt' | 'date' | 'none',
  showViewToggle: props.settings.showViewToggle === true,
  feedDisplay: props.settings.feedDisplay as CardView,
  leadFeature: props.settings.leadFeature === true,
  leadImageRatio: props.settings.leadImageRatio as 'wide-16-9' | 'cinematic-21-9',
  groupByYear: props.settings.groupByYear === true,
  // Child-page index. A hub page in a migrated site is usually BOTH a section
  // landing page (its child pages are the section) and an article feed — the
  // articles were reachable, the child pages were not listed anywhere on the
  // page they belong to. Ships OFF so existing blog-index pages render
  // unchanged; a hub opts in via Template Settings.
  showChildPages: props.settings.showChildPages === true,
  childPagesHeading: props.settings.childPagesHeading as string,
  childPagesDisplay: props.settings.childPagesDisplay as 'list' | 'card' | 'grid',
  childPagesDepth: Number(props.settings.childPagesDepth),
  childPagesSort: props.settings.childPagesSort as 'position' | 'title',
  // Page frame — the same three controls a static section carries, straight
  // through to data attributes (shared/features/layout/frameTokens.scss maps
  // them to --frame-*). 'inherit' hands the decision to the page layout.
  containerMode: props.settings.containerMode as string,
  containerInsetX: props.settings.containerInsetX as string,
  sectionSpaceY: props.settings.sectionSpaceY as string,
}))

// This template also renders inside the admin editor's preview iframe, where
// window.location is the ADMIN url — reading/writing URL + history there is
// meaningless and could interfere with the editor. In editor mode we fall back
// to localStorage/default only and never touch URL or history (same guard
// ProjectIndex.vue uses).
const renderMode = useRenderMode()
const isEditor = computed(() => renderMode.value === 'editor-preview')

// Visitor-facing cards⇄list view. Precedence for the INITIAL view (public only):
//   1. explicit URL param (?view=list) — a shared/bookmarked link wins
//   2. localStorage (readStoredView) — the reader's personal default
//   3. settings.feedDisplay — the admin default
// Persisted per browser so a reader's choice survives navigation between the
// editorial blog indexes (Lavori / Diario), and mirrored onto ?view= so the
// chosen view is shareable and restored by the browser back/forward buttons.
// The key + URL reads are guarded behind a window check (SPA renders
// client-side, but the guard keeps this safe under any SSR/prerender pass).
const VIEW_STORAGE_KEY = 'archiplan-bigrid-view'

// Reader-side view values follow the ArticleList vocabulary the feed fragment
// owns ('card' | 'list'). Links and browser storage written before that
// unification spell the card view 'grid', so both readers accept it.
function parseView(raw: unknown): CardView | null {
  if (raw === 'card' || raw === 'list') return raw
  return raw === 'grid' ? 'card' : null
}

function readStoredView(): CardView | null {
  if (typeof window === 'undefined') return null
  return parseView(window.localStorage.getItem(VIEW_STORAGE_KEY))
}

// The ?view= query, only when it names a known view. Read from the
// vue-router route so we stay in sync with the router's own history bookkeeping
// (scroll restoration + back/forward direction) instead of bypassing it with a
// raw history.pushState (which would wipe history.state for the whole SPA).
const router = useRouter()
const route = useRoute()

function readRouteView(): CardView | null {
  return parseView(route.query.view)
}

// Init from storage/default only — the URL precedence is reconciled reactively
// below (once useRenderMode has resolved), avoiding a render-mode dependency in
// the ref initializer at setup.
const view = ref<CardView>(readStoredView() ?? settings.value.feedDisplay)

function setView(next: CardView): void {
  // No-op when already active: avoids duplicate history entries on repeat clicks.
  if (next === view.value) return
  view.value = next
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(VIEW_STORAGE_KEY, next)
  }
  // Mirror onto ?view= so the view is shareable + back/forward navigable (public
  // only). Routed through vue-router — never raw history.pushState. The default
  // view is the clean canonical URL (no ?view=); a query key set to undefined is
  // dropped by the router.
  if (!isEditor.value) {
    router.push({
      query: { ...route.query, view: next === settings.value.feedDisplay ? undefined : next },
    })
  }
}

// Reconcile the view with the route's ?view= param. Fires immediately (so a
// shared ?view=list link lands on first paint) and on every back/forward
// navigation. Public only — the admin preview iframe never reads/writes the URL.
// A URL-driven change sets the ref only; it must NOT overwrite the reader's
// localStorage default (a shared link is a per-visit override, not a new
// personal preference — only an explicit toggle via setView persists).
watch(
  () => route.query.view,
  () => {
    if (isEditor.value) return
    view.value = readRouteView() ?? readStoredView() ?? settings.value.feedDisplay
  },
  { immediate: true },
)

// Toggle labels are localized off the page content locale (no vue-i18n edit):
// same contentLocale pattern the rest of this template uses, keyed by the
// 2-letter language subtag with an English fallback.
const viewToggleLabels: Record<CardView, Record<string, string>> = {
  card: { it: 'Griglia', en: 'Grid' },
  list: { it: 'Elenco', en: 'List' },
}
const viewToggleGroupLabels: Record<string, string> = {
  it: 'Vista articoli',
  en: 'Article view',
}
const viewLang = computed(() => contentLocale.value.slice(0, 2))
function viewLabel(which: CardView): string {
  const map = viewToggleLabels[which]
  return map[viewLang.value] ?? map.en
}
const viewGroupLabel = computed(
  () => viewToggleGroupLabels[viewLang.value] ?? viewToggleGroupLabels.en,
)

// ArticleList expects `source: 'current' | 'specific'` + `feedDisplay: 'card' | 'list'`.
// The template hard-wires source=current (the blog renders its own articles)
// and hands the reader's current view through as feedDisplay. The columns count
// is applied to the grid container via CSS custom property; ArticleList itself
// doesn't need to know.
const articleListSort = computed<'newest' | 'oldest'>(() => settings.value.sort)

// Per-page card knobs handed to ArticleList through its CSS-var contract. The
// template is shared by every editorial blog index, so page-specific look is
// keyed off imageRatio: portrait uses tall tiles with a title/caption inset;
// landscape uses wide tiles with
// softer 10px thumbnail corners.
const bigridListVars = computed(() => {
  const landscape = settings.value.cardImageRatio === 'landscape-3-2'
  return {
    '--bigrid-cols': String(settings.value.columns),
    '--article-card-text-inset': landscape ? '0' : '0.8rem',
    '--article-card-media-radius': landscape ? '10px' : '0.4rem',
  }
})

// Template pages bypass DynamicPage's auto-entrance (no block pipeline), so
// they had no viewport-entry reveals at all. useEntranceReveal replicates the
// engine's fade + delay + stagger from the same theme motion config; the
// MutationObserver inside it catches the async-loaded ArticleList cards.
const bigridRoot = ref<HTMLElement | null>(null)
useEntranceReveal(bigridRoot, {
  selector: '.bigrid-hero__title, .bigrid-hero__intro, .bigrid-hero__image, .article-list__lead, .article-list__item',
})
</script>

<template>
  <article
    ref="bigridRoot"
    class="bigrid"
    :data-columns="settings.columns"
    :data-hero="settings.showHero ? 'on' : 'off'"
    :data-container-mode="settings.containerMode"
    :data-inset-x="settings.containerInsetX"
    :data-space-y="settings.sectionSpaceY"
  >
    <!-- Hero ------------------------------------------------------------------ -->
    <header v-if="settings.showHero" class="bigrid-hero">
      <h1 class="bigrid-hero__title">{{ titleStr }}</h1>
      <div v-if="data.intro" class="bigrid-hero__intro">
        <p
          v-if="introParts.year"
          class="bigrid-hero__intro-year"
          v-html="introParts.year"
        />
        <div
          v-if="introParts.body"
          class="bigrid-hero__intro-desc prose"
          v-html="introParts.body"
        />
      </div>
      <img
        v-if="data.heroImage && mediaUrl(data.heroImage)"
        :src="mediaUrl(data.heroImage)"
        :alt="mediaAlt(data.heroImage) || titleStr"
        class="bigrid-hero__image"
      />
    </header>

    <!--
      With the hero off, the h1 above is gone too — and the page had NO h1 at
      all, only the article cards' h3s. A blog index is a page about something
      and needs to say what: this is the same title, typeset as a plain heading
      instead of a display banner.
    -->
    <header v-else class="bigrid-plain-header">
      <h1 class="bigrid-plain-header__title">{{ titleStr }}</h1>
      <div
        v-if="introParts.body"
        class="bigrid-plain-header__intro prose"
        v-html="introParts.body"
      />
    </header>

    <!--
      Child-page index. A section hub is both a landing page for the pages
      beneath it and a feed of its own articles; without this the child pages
      are reachable only from the nav, never from the section they belong to.
      Rendered above the feed because the sub-sections ARE the section, and the
      articles are what happens to be new in it.
    -->
    <section v-if="settings.showChildPages" class="bigrid-children">
      <ChildPageList
        source="children-of-current"
        :section-heading="settings.childPagesHeading"
        :display="settings.childPagesDisplay"
        :depth="settings.childPagesDepth"
        :sort="settings.childPagesSort"
        :show-thumbnail="false"
        empty-behaviour="hide"
      />
    </section>

    <!-- Grid ⇄ list view toggle (visitor-facing, admin-gated) ------------------ -->
    <div
      v-if="settings.showViewToggle"
      class="bigrid-view-toggle"
      role="group"
      :aria-label="viewGroupLabel"
    >
      <button
        type="button"
        class="bigrid-view-toggle__btn"
        :class="{ 'is-active': view === 'card' }"
        :aria-pressed="view === 'card'"
        @click="setView('card')"
      >{{ viewLabel('card') }}</button>
      <button
        type="button"
        class="bigrid-view-toggle__btn"
        :class="{ 'is-active': view === 'list' }"
        :aria-pressed="view === 'list'"
        @click="setView('list')"
      >{{ viewLabel('list') }}</button>
    </div>

    <!-- Article grid (template-owned, NOT a page-builder block) ---------------- -->
    <section class="bigrid-list" :style="bigridListVars">
      <ArticleList
        source="current"
        :sort="articleListSort"
        :page-size="settings.pageSize"
        :feed-display="view"
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

<!-- lang="scss" is required: the injected $bp-* breakpoint vars only resolve in
     SCSS blocks — as plain CSS the `@media (max-width: $bp-lg)` queries are
     invalid and the mobile single-column stacking rules silently never apply. -->
<style scoped lang="scss">
.bigrid {
  /* Width, inset and vertical rhythm come from the page-frame settings on the
     root (see shared/features/layout/frameTokens.scss). The template ships
     full-bleed with the thin designer gutter it was drawn with; an author can
     now pull it back to the page layout's frame or to any tier. */
  max-width: var(--frame-max-width, none);
  margin-inline: auto;
  padding-inline: var(--frame-inset-x);
  padding-bottom: var(--frame-space-y);
}

/* Reference pushes the giant page title to roughly mid-fold (~y370 of a 900px
   viewport) with airy whitespace above it; photos only peek in at the bottom of
   the fold. The top pad drives that editorial rhythm.

   It is scoped to the hero because that is the only thing it positions. With
   the hero off the page opens on a plain heading instead of a display banner,
   and the same ~245px band read as a blank screen above a small title rather
   than as composition. */
.bigrid[data-hero="on"] {
  padding-top: clamp(4rem, 17vw, 24rem);
}

.bigrid[data-hero="off"] {
  padding-top: var(--frame-space-y);
}

/* Editorial hero: title on the left, intro/year-range on the right.
   Below 900px we collapse to a stack. */
/* Plain header — the no-hero branch. Sized as a page title, not a display
   banner, so an institutional index reads as a document rather than a feature. */
.bigrid-plain-header {
  margin-bottom: var(--section-space-y-md, 4rem);

  &__title {
    margin: 0;
    font-family: var(--rt-role-heading1-family, var(--font-family-heading, inherit));
    font-size: clamp(3.2rem, 4vw, 4.8rem);
    line-height: 1.1;
    color: var(--color-text);
  }

  &__intro {
    margin-top: 1.6rem;
    max-width: 68rem;
    color: var(--color-text-light);
  }
}

.bigrid-hero {
  display: grid;
  /* Narrow the intro column so its left edge lands to the RIGHT of the vertical
     chrome hairline (default-blue-line, offsetX 20vw ≈ x1152 @1440). At 1440 the
     240px right column starts near x1187, clearing the rule — the intro no
     longer straddles the divider (ref: intro sits fully in the right column). */
  grid-template-columns: minmax(0, 1fr) minmax(200px, 240px);
  gap: clamp(1.5rem, 3vw, 3rem);
  align-items: start;
  margin-bottom: clamp(2rem, 5vw, 4rem);
}

.bigrid-hero__title {
  /* Root font-size is 10px, so 8rem capped the title at 80px — far short of the
     reference's ~135px display title. Raise the cap to ~140px and let it scale
     with the viewport down to a sane floor. */
  font-size: clamp(4.5rem, 9.5vw, 14rem);
  font-weight: 400;
  letter-spacing: -0.03em;
  color: var(--color-accent, #1B8AB7);
  margin: 0;
  line-height: 0.95;
}

.bigrid-hero__intro {
  margin: 0;
  align-self: end;
  padding-top: clamp(2rem, 4vw, 4rem);
  /* Ref hangs the year-range + description ragged-left against the right edge. */
  text-align: right;
}

/* REF hero meta: the year range is a distinct 14px black line, set well above
   the small gray description (~39px gap) — not merged into one gray block. */
.bigrid-hero__intro-year {
  font-size: 1.4rem;
  font-weight: 400;
  line-height: 1.2;
  color: #000;
  margin: 0 0 3.9rem;
}
.bigrid-hero__intro-desc {
  /* Legibility floor: hero intro is prose — was 1rem (10px), below the theme's
     1.2rem prose floor. Fluid to 1.4rem on wide viewports. */
  font-size: clamp(1.2rem, 0.9vw, 1.4rem);
  color: #6c6c6c;
  line-height: 1.5;
  margin: 0;
}
.bigrid-hero__intro-desc :deep(p) {
  margin: 0 0 0.6rem;
}

.bigrid-hero__image {
  grid-column: 1 / -1;
  width: 100%;
  height: auto;
  display: block;
  border-radius: 0.4rem;
  margin-top: clamp(1rem, 2vw, 2rem);
}

@media (max-width: $bp-lg) {
  .bigrid-hero {
    grid-template-columns: 1fr;
  }
  .bigrid-hero__intro {
    padding-top: 0;
    /* Stacked single column below $bp-lg — drop the right-hang. */
    text-align: left;
  }
  .bigrid-hero__intro-year {
    /* Tighten the airy desktop gap once stacked. */
    margin-bottom: 1.5rem;
  }
}

/* The editorial card look now ships with ArticleList as its `editorial-grid`
   variant (see ArticleList.vue). The template no longer reaches into the
   component internals via :deep — it only sets container-level knobs as CSS
   custom properties the component's own rules consume. Inside the full-bleed
   blog-index the .bigrid container owns the thin gutter, so we neutralize the
   inner max-width/padding and hand the component a fixed-column grid derived
   from admin's `columns` setting (--bigrid-cols, set inline on .bigrid-list). */
.bigrid-list {
  --article-list-max-width: none;
  --article-list-pad-inline: 0;
  --article-list-grid-cols: repeat(var(--bigrid-cols, 3), minmax(0, 1fr));
  --article-list-grid-gap: clamp(1.5rem, 3vw, 2.5rem) clamp(1rem, 2vw, 2rem);
}

/* Visitor grid⇄list switch. Editorial + understated: a thin right-aligned pair
   of text buttons sitting just under the hero, above the article grid. Active
   state uses the theme accent; inactive is muted. No hex color controls — only
   existing role tokens. */
.bigrid-view-toggle {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: clamp(1.5rem, 3vw, 2.5rem);
}
.bigrid-view-toggle__btn {
  min-height: 4.4rem;
  padding-inline: 1.2rem;
  background: transparent;
  border: 1px solid transparent;
  color: var(--color-muted, #6c6c6c);
  font: inherit;
  font-size: 1.3rem;
  letter-spacing: 0.02em;
  line-height: 1;
  cursor: pointer;
  border-radius: 0.4rem;
  transition: color 0.25s ease, border-color 0.25s ease;
}
.bigrid-view-toggle__btn:hover {
  color: var(--color-accent, #1B8AB7);
}
.bigrid-view-toggle__btn.is-active {
  color: var(--color-accent, #1B8AB7);
  border-color: var(--color-accent, #1B8AB7);
}
.bigrid-view-toggle__btn:focus-visible {
  outline: 2px solid var(--color-accent, #1B8AB7);
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  .bigrid-view-toggle__btn {
    transition: none;
  }
}

/* Sub-section index, above the feed. Separated by a rule rather than by space
   alone: without it the child links read as the first row of the article grid,
   which is the one thing they are not. The block hides itself when the hub has
   no sub-pages, so this never leaves a rule over nothing. */
.bigrid-children {
  margin-block: clamp(1.5rem, 3vw, 3rem);
  padding-bottom: clamp(1.5rem, 3vw, 3rem);
  border-bottom: 1px solid var(--color-border, rgb(0 0 0 / 12%));
}

/* ChildPageList hides itself on a hub whose children are all articles, which
   left this wrapper as pure margin plus a rule over nothing. `:empty` still
   matches when the only child is Vue's placeholder comment, so the wrapper
   collapses with its content instead of outliving it. */
.bigrid-children:empty {
  display: none;
}
</style>
