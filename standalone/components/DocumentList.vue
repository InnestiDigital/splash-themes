<template>
  <!-- No `v-if="hasDocuments"` on the root: a configured-but-empty block must
       say so (empty message below), not emit zero DOM and leave the page title
       floating over blank space. -->
  <section
    class="document-list"
    :class="[
      `document-list--${layout}`,
      layout === 'cards' ? `document-list--cols-${columns}` : null,
      showDividers ? 'document-list--with-dividers' : null,
      showIcon ? 'document-list--with-icon' : null,
    ]"
    data-target="root"
  >
    <div class="document-list__container">
      <h3
        v-if="localizedSectionHeading"
        class="document-list__heading"
        data-target="sectionHeading"
        v-html="asHtml(localizedSectionHeading)"
      ></h3>

      <p v-if="!hasDocuments" class="document-list__empty" data-empty>
        {{ emptyText }}
      </p>

      <ul v-else class="document-list__items" data-grid>
        <li
          v-for="(doc, index) in documents"
          :key="index"
          class="document-list__item"
          data-target="item"
          :data-item-index="index"
        >
          <a
            class="document-list__link"
            :href="doc.url"
            :target="isExternal(doc.url) ? '_blank' : null"
            :rel="isExternal(doc.url) ? 'noopener noreferrer' : null"
            :download="isDownloadable(doc.url) ? '' : null"
            :aria-label="ariaLabel(doc)"
          >
            <span
              v-if="showIcon"
              class="document-list__icon"
              aria-hidden="true"
              v-html="iconFor(doc)"
            ></span>

            <span class="document-list__content">
              <span
                class="document-list__title"
                data-target="title"
                v-html="asHtml(getLocalizedValue(doc.title))"
              ></span>
              <span
                v-if="getLocalizedValue(doc.description)"
                class="document-list__description"
                v-html="asHtml(getLocalizedValue(doc.description))"
              ></span>
            </span>

            <span
              v-if="showMeta"
              class="document-list__meta"
              data-target="meta"
            >
              <span class="document-list__badge">{{ typeLabel(doc) }}</span>
              <span v-if="doc.fileSize" class="document-list__size">{{ doc.fileSize }}</span>
            </span>

            <span class="document-list__arrow" aria-hidden="true">&rarr;</span>
          </a>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'

const { t } = useI18n()
const { getLocalizedValue } = useLocalized()

type Layout = 'list' | 'cards'
type DocType = 'pdf' | 'doc' | 'xls' | 'zip' | 'image' | 'dwg' | 'link' | 'file'

interface DocItem {
  title: string | Record<string, string>
  description?: string | Record<string, string>
  fileType?: string
  fileSize?: string
  url: string
}

const props = defineProps<{
  sectionHeading?: string | Record<string, string>
  documents?: DocItem[]
  layout?: Layout
  columns?: string
  showIcon?: boolean
  showMeta?: boolean
  showDividers?: boolean
  emptyMessage?: string | Record<string, string>
}>()

const localizedSectionHeading = computed(() => getLocalizedValue(props.sectionHeading))
const documents = computed<DocItem[]>(() => (props.documents ?? []).filter((d) => !!d && !!d.url))
const hasDocuments = computed(() => documents.value.length > 0)
// Authored empty-state copy wins; the i18n string is the fallback so an empty
// list never renders as silent blank space.
const emptyText = computed(() =>
  getLocalizedValue(props.emptyMessage) || t('documentList.empty', 'No documents available yet.'),
)
const layout = computed<Layout>(() => props.layout || 'list')
const columns = computed(() => props.columns || '2')
const showIcon = computed(() => props.showIcon ?? true)
const showMeta = computed(() => props.showMeta ?? true)
const showDividers = computed(() => props.showDividers ?? true)

const TYPE_LABELS: Record<DocType, string> = {
  pdf: 'PDF',
  doc: 'DOC',
  xls: 'XLS',
  zip: 'ZIP',
  image: 'IMG',
  dwg: 'DWG',
  link: 'LINK',
  file: 'FILE',
}

function isExternal(url: string): boolean {
  return /^https?:\/\//.test(url)
}

// Only add the `download` attribute for same-origin URLs that look like a real
// file (have an extension). A bare internal route (e.g. /about) must navigate,
// not force the browser to download the SPA HTML.
function isDownloadable(url: string): boolean {
  if (!url || isExternal(url)) return false
  return /\.[a-z0-9]+($|[?#])/i.test(url)
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function resolveType(doc: DocItem): DocType {
  const ft = doc.fileType
  if (ft && ft !== 'auto') {
    if (ft === 'pdf' || ft === 'doc' || ft === 'xls' || ft === 'zip' || ft === 'image' || ft === 'dwg' || ft === 'link') {
      return ft
    }
  }
  const url = doc.url || ''
  const match = url.split(/[?#]/)[0].match(/\.([a-z0-9]+)$/i)
  const ext = match ? match[1].toLowerCase() : ''
  switch (ext) {
    case 'pdf':
      return 'pdf'
    case 'doc':
    case 'docx':
      return 'doc'
    case 'xls':
    case 'xlsx':
    case 'csv':
      return 'xls'
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return 'zip'
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp':
    case 'gif':
    case 'svg':
      return 'image'
    case 'dwg':
    case 'dxf':
      return 'dwg'
    default:
      return isExternal(url) ? 'link' : 'file'
  }
}

function typeLabel(doc: DocItem): string {
  return TYPE_LABELS[resolveType(doc)]
}

function ariaLabel(doc: DocItem): string {
  const title = stripHtml(getLocalizedValue(doc.title) || '')
  const parts = [TYPE_LABELS[resolveType(doc)]]
  if (doc.fileSize) parts.push(doc.fileSize)
  const meta = parts.join(', ')
  return title ? `${title} — ${meta}` : meta
}

// Static, hand-authored inline SVGs (not user input) rendered via v-html.
const ICONS: Record<DocType, string> = {
  pdf: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8.5 13.5h1a1 1 0 0 1 0 2h-1zM8.5 13.5v4"/><path d="M15.5 13.5h-1.2v4M14.3 15.5h1"/></svg>',
  doc: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8.5 12.5h7M8.5 15.5h7M8.5 18.5h4"/></svg>',
  xls: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8.5 12.5l6 6M14.5 12.5l-6 6"/></svg>',
  zip: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M11 4v2M12 6v2M11 8v2M12 10v2M11 12v3a1 1 0 0 0 2 0v-1"/></svg>',
  image: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M4 16l4-4 3 3 4-4 5 5"/></svg>',
  dwg: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><path d="M4 9h16M9 4v16"/><circle cx="14.5" cy="14.5" r="2"/></svg>',
  link: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/></svg>',
  file: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
}

function iconFor(doc: DocItem): string {
  return ICONS[resolveType(doc)]
}
</script>

<style lang="scss" scoped>
.document-list {
  color: var(--section-text, var(--color-text));

  &__container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  &__heading {
    font-family: var(--rt-slot-sectionHeading-family, var(--rt-role-heading3-family, inherit));
    font-size: var(--rt-slot-sectionHeading-size, var(--rt-role-heading3-size, var(--font-size-xl)));
    font-weight: var(--rt-slot-sectionHeading-weight, var(--rt-role-heading3-weight, 700));
    line-height: var(--rt-slot-sectionHeading-line-height, var(--rt-role-heading3-line-height, 1.2));
    letter-spacing: var(--rt-slot-sectionHeading-letter-spacing, var(--rt-role-heading3-letter-spacing, normal));
    text-transform: var(--rt-slot-sectionHeading-text-transform, var(--rt-role-heading3-text-transform, none));
    font-variation-settings: var(--rt-slot-sectionHeading-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-sectionHeading-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-sectionHeading-font-stretch, normal);
    font-style: var(--rt-slot-sectionHeading-font-style, normal);
    color: var(--rt-slot-sectionHeading-color, var(--rt-role-heading3-color, inherit));
    margin: 0;
  }

  &__empty {
    margin: 0;
    opacity: 0.7;
  }

  &__items {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
  }

  &__item {
    min-width: 0;
  }

  // ── Anchor: the whole row / card is one link ─────────────────────────
  &__link {
    display: grid;
    align-items: center;
    gap: var(--spacing-md);
    min-height: 44px;
    color: inherit;
    text-decoration: none;
    transition: background-color 0.2s ease;
    outline: none;
  }

  &__link:focus-visible {
    outline: 2px solid var(--color-primary, var(--color-accent, currentColor));
    outline-offset: 2px;
    border-radius: 2px;
  }

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    opacity: 0.75;

    :deep(svg) {
      display: block;
      width: 24px;
      height: 24px;
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }

  &__title {
    font-family: var(--rt-slot-title-family, var(--rt-role-body-family, inherit));
    font-size: var(--rt-slot-title-size, var(--rt-role-body-size, var(--font-size-base)));
    font-weight: var(--rt-slot-title-weight, var(--rt-role-body-weight, 600));
    line-height: var(--rt-slot-title-line-height, var(--rt-role-body-line-height, 1.4));
    letter-spacing: var(--rt-slot-title-letter-spacing, var(--rt-role-body-letter-spacing, normal));
    color: var(--rt-slot-title-color, var(--rt-role-body-color, inherit));
    word-wrap: break-word;
  }

  &__description {
    font-family: var(--rt-slot-description-family, var(--rt-role-caption-family, inherit));
    font-size: var(--rt-slot-description-size, var(--rt-role-caption-size, var(--font-size-xs)));
    font-weight: var(--rt-slot-description-weight, var(--rt-role-caption-weight, inherit));
    line-height: var(--rt-slot-description-line-height, var(--rt-role-caption-line-height, 1.4));
    letter-spacing: var(--rt-slot-description-letter-spacing, var(--rt-role-caption-letter-spacing, normal));
    color: var(--rt-slot-description-color, var(--rt-role-caption-color, inherit));
    opacity: 0.7;
    word-wrap: break-word;
  }

  &__meta {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-shrink: 0;
  }

  &__badge {
    font-size: var(--font-size-xs, 0.72rem);
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.25em 0.5em;
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.2));
    border-radius: 2px;
    opacity: 0.85;
  }

  &__size {
    font-size: var(--font-size-xs, 0.72rem);
    font-variant-numeric: tabular-nums;
    opacity: 0.6;
    white-space: nowrap;
  }

  &__arrow {
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  // ── Layout: list (editorial rows) ────────────────────────────────────
  &--list &__link {
    grid-template-columns: auto 1fr auto auto;
    padding-block: var(--spacing-sm);
    padding-inline: var(--spacing-sm);
  }

  &--list:not(.document-list--with-icon) &__link {
    grid-template-columns: 1fr auto auto;
  }

  &--list &__link:hover {
    background-color: var(--section-surface, rgba(0, 0, 0, 0.03));
  }

  &--list &__link:hover &__title {
    text-decoration: underline;
    text-underline-offset: 0.15em;
    text-decoration-color: var(--color-primary, var(--color-accent, currentColor));
  }

  &--list &__link:hover &__arrow {
    opacity: 0.7;
  }

  &--list.document-list--with-dividers &__item {
    border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
  }

  &--list.document-list--with-dividers &__item:last-child {
    border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
  }

  // ── Layout: cards (grid) ─────────────────────────────────────────────
  &--cards &__items {
    display: grid;
    gap: var(--spacing-md);
  }

  &--cards.document-list--cols-2 &__items { grid-template-columns: repeat(2, 1fr); }
  &--cards.document-list--cols-3 &__items { grid-template-columns: repeat(3, 1fr); }

  &--cards &__link {
    grid-template-columns: 1fr;
    align-content: start;
    align-items: start;
    gap: var(--spacing-sm);
    height: 100%;
    padding: var(--spacing-md);
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
    border-radius: 4px;
    transition: border-color 0.2s ease, transform 0.2s ease;
  }

  &--cards &__meta {
    margin-top: auto;
  }

  &--cards &__arrow {
    display: none;
  }

  &--cards &__link:hover {
    border-color: var(--color-primary, var(--color-accent, currentColor));
    transform: translateY(-2px);
  }

  &--cards &__link:hover &__title {
    text-decoration: underline;
    text-underline-offset: 0.15em;
  }

  // ── Responsive collapse ──────────────────────────────────────────────
  // @container, not @media px (repo contract): keys on the LayoutShell
  // content box so the narrow admin preview pane collapses like a phone.
  @container (max-width: 768px) {
    &--cards.document-list--cols-2 &__items,
    &--cards.document-list--cols-3 &__items {
      grid-template-columns: 1fr;
    }

    // List rows: icon + content on row 1, meta wraps below.
    &--list &__link {
      grid-template-columns: auto 1fr;
      grid-template-areas:
        "icon content"
        "meta meta";
      row-gap: var(--spacing-sm);
      column-gap: var(--spacing-sm);
    }

    &--list:not(.document-list--with-icon) &__link {
      grid-template-columns: 1fr;
      grid-template-areas:
        "content"
        "meta";
    }

    &--list &__icon { grid-area: icon; }
    &--list &__content { grid-area: content; }
    &--list &__meta { grid-area: meta; }
    &--list &__arrow { display: none; }
  }

  // ── Reduced motion ───────────────────────────────────────────────────
  @media (prefers-reduced-motion: reduce) {
    &__link,
    &__arrow {
      transition: none;
    }

    &--cards &__link:hover {
      transform: none;
    }
  }
}
</style>
