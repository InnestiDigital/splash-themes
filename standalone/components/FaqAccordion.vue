<template>
  <div class="faq-accordion" :class="[surfaceClass, { 'faq-accordion--no-motion': isReducedMotion }]" :style="{ ...radiusStyle, ...contentStyle }">
    <div v-if="showControls" class="faq-accordion__controls">
      <input
        v-model="query"
        type="search"
        class="faq-accordion__search"
        :aria-label="localizedSearchLabel"
        :placeholder="localizedSearchLabel"
      />
      <span v-if="isFiltering" class="faq-accordion__count" aria-live="polite">
        {{ displayItems.length }} / {{ localizedItems.length }}
      </span>
      <button
        v-if="allowMultipleOpen"
        type="button"
        class="faq-accordion__expand-all"
        :aria-pressed="allVisibleOpen"
        @click="toggleAll"
      >{{ allVisibleOpen ? localizedCollapseAll : localizedExpandAll }}</button>
    </div>

    <div
      v-for="item in displayItems"
      :key="item.originalIndex"
      :id="deepLink ? anchorId(item.originalIndex) : undefined"
      data-target="item"
      :data-item-index="item.originalIndex"
      class="faq-accordion__item"
    >
      <button
        class="faq-accordion__trigger"
        :aria-expanded="openIndices.includes(item.originalIndex)"
        :aria-controls="`faq-panel-${uid}-${item.originalIndex}`"
        :aria-label="item.plainQuestion"
        @click="toggleItem(item.originalIndex)"
      >
        <span class="faq-accordion__question" v-html="item.question"></span>
        <span
          v-if="toggleIcon === 'chevron'"
          class="faq-accordion__toggle-icon"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
        <span
          v-else
          class="faq-accordion__toggle-icon faq-accordion__toggle-icon--plus-minus"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12" />
            <line class="faq-accordion__toggle-bar" x1="12" y1="5" x2="12" y2="19" />
          </svg>
        </span>
      </button>

      <div
        :id="`faq-panel-${uid}-${item.originalIndex}`"
        class="faq-accordion__content"
        :class="{ 'is-open': openIndices.includes(item.originalIndex) }"
        :inert="!openIndices.includes(item.originalIndex) || undefined">
        <div class="faq-accordion__answer-wrap">
          <div class="faq-accordion__answer prose" v-html="item.answer"></div>
          <button
            v-if="deepLink"
            type="button"
            class="faq-accordion__copy-link"
            :aria-label="localizedCopyLink"
            @click="copyLink(item.originalIndex)"
          >{{ copiedIndex === item.originalIndex ? localizedCopied : localizedCopyLink }}</button>
        </div>
      </div>
    </div>

    <div v-if="showEmptyState" class="faq-accordion__empty">{{ localizedNoResults }}</div>

    <div v-if="deepLink" class="faq-accordion__sr-live" aria-live="polite">
      {{ copiedIndex !== null ? localizedCopied : '' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, getCurrentInstance, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { ANIMATION_TARGETS_CHANGED } from '~/shared/features/cms/animation/constants'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'

const { getLocalizedValue } = useLocalized()
const { isReducedMotion } = useReducedMotion()
interface FaqItem {
  question: string | Record<string, string>
  answer: string | Record<string, string>
}

// Raw format from CMS blockTransformer: {type, settings: {question, answer}}
interface RawFaqItem {
  type?: string
  settings?: Partial<FaqItem>
  [key: string]: unknown
}

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  blocks?: Array<Record<string, unknown>>
  allowMultipleOpen?: boolean
  initiallyOpen?: string
  items?: Array<FaqItem | RawFaqItem>
  surfaceStyle?: string
  borderRadius?: string
  internalPadding?: string
  textAlign?: string
  toggleIcon?: 'chevron' | 'plus-minus'
  showControls?: boolean
  searchLabel?: string | Record<string, string>
  noResultsText?: string | Record<string, string>
  expandAllText?: string | Record<string, string>
  collapseAllText?: string | Record<string, string>
  deepLink?: boolean
  copyLinkText?: string | Record<string, string>
  copiedText?: string | Record<string, string>
}>(), {
  allowMultipleOpen: false,
  initiallyOpen: 'none',
  toggleIcon: 'chevron',
  showControls: false,
  deepLink: false,
})

const uid = getCurrentInstance()?.uid ?? Math.floor(Math.random() * 100000)
const openIndices = ref<number[]>([])

// Author-controlled initial state (additive; 'none' = today's all-collapsed default).
const initialItemCount = props.items?.length ?? 0
if (initialItemCount > 0) {
  if (props.initiallyOpen === 'first') {
    openIndices.value = [0]
  } else if (props.initiallyOpen === 'all') {
    // Single-open accordions can't hold many — 'all' clamps to the first item.
    openIndices.value = props.allowMultipleOpen
      ? Array.from({ length: initialItemCount }, (_, i) => i)
      : [0]
  }
}

const localizedItems = computed(() =>
  (props.items || []).map((raw) => {
    const item: Partial<FaqItem> =
      raw && typeof raw === 'object' && 'settings' in raw && raw.settings
        ? raw.settings
        : raw as Partial<FaqItem>
    const question = asHtml(getLocalizedValue(item.question, ''))
    const answer = asHtml(getLocalizedValue(item.answer, ''))
    const plainQuestion = question.replace(/<[^>]*>/g, '')
    const plainAnswer = answer.replace(/<[^>]*>/g, '')
    return {
      question,
      answer,
      plainQuestion,
      haystack: `${plainQuestion} ${plainAnswer}`.toLowerCase(),
    }
  })
)

// Search query — only consulted when showControls is on.
const query = ref('')

const localizedSearchLabel = computed(() => getLocalizedValue(props.searchLabel, 'Search FAQs'))
const localizedNoResults = computed(() => getLocalizedValue(props.noResultsText, 'No matching questions.'))
const localizedExpandAll = computed(() => getLocalizedValue(props.expandAllText, 'Expand all'))
const localizedCollapseAll = computed(() => getLocalizedValue(props.collapseAllText, 'Collapse all'))
const localizedCopyLink = computed(() => getLocalizedValue(props.copyLinkText, 'Copy link'))
const localizedCopied = computed(() => getLocalizedValue(props.copiedText, 'Copied!'))

// True only while an active filter is narrowing the list.
const isFiltering = computed(() => props.showControls && query.value.trim().length > 0)

// PARITY: with controls off or an empty query, this is every item in original
// order with originalIndex === its position, so the rendered DOM is unchanged.
const displayItems = computed(() => {
  const items = localizedItems.value.map((item, originalIndex) => ({ ...item, originalIndex }))
  if (!isFiltering.value) return items
  const needle = query.value.trim().toLowerCase()
  return items.filter(item => item.haystack.includes(needle))
})

const showEmptyState = computed(() => isFiltering.value && displayItems.value.length === 0)

// Expand/collapse-all reflects whether every currently-visible item is open.
const allVisibleOpen = computed(() =>
  displayItems.value.length > 0 &&
  displayItems.value.every(item => openIndices.value.includes(item.originalIndex))
)

function toggleAll() {
  if (allVisibleOpen.value) {
    openIndices.value = []
  } else {
    openIndices.value = displayItems.value.map(item => item.originalIndex)
  }
  nextTick(dispatchTargetsChanged)
}

const instance = getCurrentInstance()

function dispatchTargetsChanged() {
  const el = instance?.proxy?.$el as HTMLElement | undefined
  if (!el || !props.blockId) return
  el.dispatchEvent(new CustomEvent(ANIMATION_TARGETS_CHANGED, {
    bubbles: true,
    detail: { blockId: props.blockId },
  }))
}

function toggleItem(index: number) {
  const isOpen = openIndices.value.includes(index)
  if (props.allowMultipleOpen) {
    openIndices.value = isOpen
      ? openIndices.value.filter(i => i !== index)
      : [...openIndices.value, index]
  } else {
    openIndices.value = isOpen ? [] : [index]
  }
  // Signal animation engine after DOM updates from expand/collapse
  nextTick(dispatchTargetsChanged)
}

// --- Deep-linkable answers (opt-in via deepLink; fully inert when off) ---

// Slug per originalIndex, deterministic across reloads and deduped so every
// item gets a unique, stable anchor. Derived from the plain question text.
const slugForIndex = computed(() => {
  const used = new Set<string>()
  return localizedItems.value.map((item, index) => {
    let base = item.plainQuestion
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    if (!base) base = `q-${index}`
    // Guarantee global uniqueness — a numeric suffix could otherwise collide
    // with a different item's natural slug (e.g. "A","A" -> "a-2" vs "A-2").
    let candidate = base
    let n = 2
    while (used.has(candidate)) {
      candidate = `${base}-${n}`
      n++
    }
    used.add(candidate)
    return candidate
  })
})

// Stable anchor id (blockId-prefixed for cross-block uniqueness). Never uses uid.
function anchorId(originalIndex: number): string {
  const slug = slugForIndex.value[originalIndex] ?? `q-${originalIndex}`
  return props.blockId ? `faq-${props.blockId}-${slug}` : `faq-${slug}`
}

// Copy-link feedback: the item whose button was last used, cleared after a beat.
const copiedIndex = ref<number | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

async function copyLink(originalIndex: number) {
  if (typeof window === 'undefined') return
  const anchor = anchorId(originalIndex)
  const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${anchor}`
  let copied = false
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url)
      copied = true
    } catch {
      // Clipboard denied/unavailable — fall through to the hash fallback below.
      copied = false
    }
  }
  if (copied) {
    // Reflect the shareable anchor in the address bar without adding history noise.
    if (!props.isPreview) window.history.replaceState(window.history.state, '', url)
  } else if (!props.isPreview) {
    // Fallback: set the hash so the anchor is still shareable/navigable.
    // Never touch the URL inside the editor preview (must not hijack admin URL).
    window.location.hash = anchor
  }
  copiedIndex.value = originalIndex
  if (copiedTimer !== null) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copiedIndex.value = null
    copiedTimer = null
  }, 1600)
}

// Open + scroll to the item whose anchor matches the current URL hash.
function syncFromHash() {
  if (typeof window === 'undefined') return
  const anchor = window.location.hash.replace(/^#/, '')
  if (!anchor) return
  const idx = localizedItems.value.findIndex((_, i) => anchorId(i) === anchor)
  if (idx === -1) return
  // If an active search filter would hide the target, clear it so it can show.
  if (isFiltering.value && !displayItems.value.some(item => item.originalIndex === idx)) {
    query.value = ''
  }
  if (props.allowMultipleOpen) {
    if (!openIndices.value.includes(idx)) openIndices.value = [...openIndices.value, idx]
  } else {
    openIndices.value = [idx]
  }
  nextTick(() => {
    const el = document.getElementById(anchorId(idx))
    if (el) {
      el.scrollIntoView({ behavior: isReducedMotion.value ? 'auto' : 'smooth', block: 'start' })
      const trigger = el.querySelector('.faq-accordion__trigger')
      if (trigger instanceof HTMLElement) trigger.focus()
    }
    dispatchTargetsChanged()
  })
}

onMounted(() => {
  // Never touch window/hash in the editor preview or when the feature is off.
  if (props.isPreview || !props.deepLink || typeof window === 'undefined') return
  syncFromHash()
  window.addEventListener('hashchange', syncFromHash)
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('hashchange', syncFromHash)
  if (copiedTimer !== null) {
    clearTimeout(copiedTimer)
    copiedTimer = null
  }
})

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  if (props.textAlign && props.textAlign !== 'left') {
    style.textAlign = props.textAlign
  }
  return style
})

const surfaceClass = computed(() =>
  props.surfaceStyle && props.surfaceStyle !== 'none'
    ? `faq-accordion--surface-${props.surfaceStyle}`
    : ''
)

const radiusStyle = computed(() =>
  props.borderRadius && props.borderRadius !== 'none'
    ? { borderRadius: BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0' }
    : {}
)

</script>

<style lang="scss" scoped>
.faq-accordion {
  border: 0.1rem solid var(--border-color);
  border-radius: var(--border-radius-lg);
  overflow: hidden;

  &--surface-subtle {
    background: var(--section-surface, rgba(255,255,255,0.04));
  }

  &--surface-filled {
    background: var(--section-accent, rgba(255,255,255,0.1));
  }
}

.faq-accordion__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-bottom: 0.1rem solid var(--border-color);
}

.faq-accordion__search {
  flex: 1 1 auto;
  min-width: 0;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 0.1rem solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background: var(--color-background);
  color: var(--color-text);
  font: inherit;

  &:focus-visible {
    outline: 0.2rem solid var(--color-primary);
    outline-offset: 0.1rem;
  }
}

.faq-accordion__count {
  flex: 0 0 auto;
  white-space: nowrap;
  font-size: var(--font-size-sm, 0.875rem);
  color: var(--color-text-muted);
}

.faq-accordion__expand-all {
  flex: 0 0 auto;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 0.1rem solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background: var(--color-background);
  color: var(--color-text);
  font: inherit;
  cursor: pointer;
  transition: background var(--transition-base);

  &:hover {
    background: var(--color-background-lighter);
  }

  &[aria-pressed="true"] {
    background: var(--color-background-light);
  }

  &:focus-visible {
    outline: 0.2rem solid var(--color-primary);
    outline-offset: 0.1rem;
  }
}

.faq-accordion__empty {
  padding: var(--spacing-md);
  color: var(--color-text-muted);
}

.faq-accordion__item {
  border-bottom: 0.1rem solid var(--border-color);
  // Keep a scrolled-to anchor clear of any sticky header when deep-linked.
  scroll-margin-top: var(--spacing-2xl);

  &:last-child {
    border-bottom: none;
  }
}

.faq-accordion__trigger {
  width: 100%;
  padding: var(--spacing-md);
  background: var(--color-background);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  transition: all var(--transition-base);
  font-family: var(--rt-slot-question-family, var(--rt-role-heading3-family, inherit));
  font-size: var(--rt-slot-question-size, var(--rt-role-heading3-size, var(--font-size-base)));
  font-weight: var(--rt-slot-question-weight, var(--rt-role-heading3-weight, var(--font-weight-semibold)));
  line-height: var(--rt-slot-question-line-height, var(--rt-role-heading3-line-height, inherit));
  letter-spacing: var(--rt-slot-question-letter-spacing, var(--rt-role-heading3-letter-spacing, normal));
  text-transform: var(--rt-slot-question-text-transform, var(--rt-role-heading3-text-transform, none));
  font-variation-settings: var(--rt-slot-question-font-variation-settings, normal);
  font-optical-sizing: var(--rt-slot-question-font-optical-sizing, auto);
  font-stretch: var(--rt-slot-question-font-stretch, normal);
  font-style: var(--rt-slot-question-font-style, normal);
  color: var(--rt-slot-question-color, var(--rt-role-heading3-color, var(--color-text)));
  text-align: left;

  &:hover {
    background: var(--color-background-lighter);
  }

  &[aria-expanded="true"] {
    background: var(--color-background-light);
  }

  &:focus-visible {
    outline: 0.2rem solid var(--color-primary);
    outline-offset: -0.2rem;
  }
}

.faq-accordion__question {
  text-align: left;
  flex: 1;
}

.faq-accordion__toggle-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2.4rem;
  height: 2.4rem;
  transition: transform var(--transition-base);
  color: var(--color-primary);

  svg {
    width: 2rem;
    height: 2rem;
  }

  .faq-accordion__trigger[aria-expanded="true"] &:not(.faq-accordion__toggle-icon--plus-minus) {
    transform: rotate(180deg);
  }
}

// Plus/Minus toggle: the vertical bar collapses to a minus when the item is open.
.faq-accordion__toggle-icon--plus-minus {
  .faq-accordion__toggle-bar {
    transform-origin: center;
    transition: transform var(--transition-base);
  }

  .faq-accordion__trigger[aria-expanded="true"] & .faq-accordion__toggle-bar {
    transform: scaleY(0);
  }
}

.faq-accordion__content {
  display: grid;
  grid-template-rows: 0fr;
  background: var(--color-background-lighter);
  transition: grid-template-rows var(--transition-base, 0.3s ease);

  &.is-open {
    grid-template-rows: 1fr;
  }
}

.faq-accordion--no-motion {
  .faq-accordion__content,
  .faq-accordion__toggle-icon,
  .faq-accordion__toggle-bar {
    transition: none;
  }
}

// Clips the padded answer while the grid row collapses to 0fr.
.faq-accordion__answer-wrap {
  overflow: hidden;
  min-height: 0;
}

.faq-accordion__answer {
  padding: var(--spacing-md);
  font-family: var(--rt-slot-answer-family, var(--rt-role-body-family, inherit));
  font-size: var(--rt-slot-answer-size, var(--rt-role-body-size, var(--font-size-base)));
  font-weight: var(--rt-slot-answer-weight, var(--rt-role-body-weight, inherit));
  line-height: var(--rt-slot-answer-line-height, var(--rt-role-body-line-height, var(--line-height-relaxed)));
  letter-spacing: var(--rt-slot-answer-letter-spacing, var(--rt-role-body-letter-spacing, normal));
  text-transform: var(--rt-slot-answer-text-transform, var(--rt-role-body-text-transform, none));
  font-variation-settings: var(--rt-slot-answer-font-variation-settings, normal);
  font-optical-sizing: var(--rt-slot-answer-font-optical-sizing, auto);
  font-stretch: var(--rt-slot-answer-font-stretch, normal);
  font-style: var(--rt-slot-answer-font-style, normal);
  color: var(--rt-slot-answer-color, var(--rt-role-body-color, var(--color-text-light)));

  @media (max-width: $bp-md) {
    padding: var(--spacing-sm) var(--spacing-md);
  }
}

// Unobtrusive, right-aligned text affordance inside an open answer panel.
.faq-accordion__copy-link {
  display: block;
  width: fit-content;
  margin: 0 var(--spacing-md) var(--spacing-md) auto;
  padding: var(--spacing-xs, 0.25rem) var(--spacing-sm);
  background: transparent;
  border: 0.1rem solid var(--border-color);
  border-radius: var(--border-radius-sm);
  color: var(--color-text-muted);
  font: inherit;
  font-size: var(--font-size-sm, 0.875rem);
  cursor: pointer;
  transition: color var(--transition-base), border-color var(--transition-base);

  &:hover {
    color: var(--color-text);
    border-color: var(--color-text-muted);
  }

  &:focus-visible {
    outline: 0.2rem solid var(--color-primary);
    outline-offset: 0.1rem;
  }
}

// Visually-hidden polite live region announcing a successful copy.
.faq-accordion__sr-live {
  position: absolute;
  width: 0.1rem;
  height: 0.1rem;
  padding: 0;
  margin: -0.1rem;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
