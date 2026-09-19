<template>
  <section
    class="tabs"
    :class="[
      `tabs--${variant}`,
      `tabs--${align}`,
      `tabs--fit-${fit}`,
      { 'is-reduced': isReducedMotion },
    ]"
    :style="measureStyle"
    :data-collapse="collapse"
    data-target="root"
  >
    <template v-if="!asAccordion">
      <div ref="stripEl" class="tabs__strip" role="tablist" data-target="strip">
        <button
          v-for="(tab, i) in tabList"
          :id="tabId(i)"
          :key="i"
          type="button"
          role="tab"
          class="tabs__tab"
          :class="{ 'is-active': active === i }"
          :aria-selected="active === i ? 'true' : 'false'"
          :aria-controls="panelDomId(i)"
          :tabindex="active === i ? 0 : -1"
          @click="select(i)"
          @keydown="onKeydown($event, i)"
        >
          {{ label(tab) }}
        </button>
      </div>

      <div
        v-for="(tab, i) in tabList"
        :id="panelDomId(i)"
        :key="i"
        class="tabs__panel"
        :class="{ 'is-active': active === i }"
        role="tabpanel"
        :aria-labelledby="tabId(i)"
        :hidden="active !== i"
        :tabindex="active === i ? 0 : -1"
        data-target="panel"
      >
        <div
          v-if="tab.body"
          class="tabs__body prose"
          v-html="asHtml(getLocalizedValue(tab.body))"
        ></div>
        <button
          v-if="deepLink && active === i"
          type="button"
          class="tabs__copy-link"
          :aria-label="localizedCopyLink"
          @click="copyLink(i)"
        >{{ copiedIndex === i ? localizedCopied : localizedCopyLink }}</button>
      </div>
    </template>

    <template v-else>
      <div class="tabs__accordion">
        <div
          v-for="(tab, i) in tabList"
          :id="deepLink ? anchorId(i) : undefined"
          :key="i"
          class="tabs__acc-item"
          :class="{ 'is-open': active === i }"
        >
          <button
            :id="tabId(i)"
            type="button"
            class="tabs__acc-header"
            :class="{ 'is-active': active === i }"
            :aria-expanded="active === i ? 'true' : 'false'"
            :aria-controls="panelId(i)"
            @click="select(i)"
          >
            <span class="tabs__acc-label">{{ label(tab) }}</span>
            <span class="tabs__acc-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>
          <div
            :id="panelId(i)"
            class="tabs__acc-content"
            :class="{ 'is-open': active === i }"
            role="region"
            :aria-labelledby="tabId(i)"
            :inert="active !== i || undefined"
          >
            <div class="tabs__acc-wrap">
              <div
                v-if="tab.body"
                class="tabs__body prose"
                v-html="asHtml(getLocalizedValue(tab.body))"
              ></div>
              <button
                v-if="deepLink && active === i"
                type="button"
                class="tabs__copy-link"
                :aria-label="localizedCopyLink"
                @click="copyLink(i)"
              >{{ copiedIndex === i ? localizedCopied : localizedCopyLink }}</button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-if="deepLink" class="tabs__sr-live" aria-live="polite">
      {{ copiedIndex !== null ? localizedCopied : '' }}
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useId, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'
import { useViewport } from '~/shared/composables/useViewport'
import { isMobileViewport } from '~/shared/features/cms/composition/responsive'
import { asHtml } from '~/shared/utils/asHtml'

type Variant = 'underline' | 'pills' | 'boxed'
type Align = 'left' | 'center'
type Fit = 'auto' | 'stretch'

interface TabInput {
  label?: string | Record<string, string>
  body?: string | Record<string, string>
}

const props = defineProps<{
  tabs?: TabInput[]
  variant?: Variant
  align?: Align
  fit?: Fit
  mobileLayout?: 'strip' | 'accordion'
  activeTab?: number
  measureWidth?: 'content' | 'narrow' | 'standard' | 'wide' | 'full'
  blockId?: string
  isPreview?: boolean
  deepLink?: boolean
  copyLinkText?: string | Record<string, string>
  copiedText?: string | Record<string, string>
}>()

const { getLocalizedValue } = useLocalized()
const { isReducedMotion } = useReducedMotion()

const { innerWidth } = useViewport()
const collapse = computed(() => (isMobileViewport(innerWidth.value) ? 'mobile' : 'desktop'))

const variant = computed<Variant>(() => props.variant || 'underline')
const align = computed<Align>(() => props.align || 'left')
const fit = computed<Fit>(() => props.fit || 'auto')

// Opt-in mobile transform: on phones, collapse the tab strip into an accordion so
// every label stays visible instead of scrolling off-screen. Default 'strip' keeps
// today's byte-identical tablist behaviour.
const mobileLayout = computed<'strip' | 'accordion'>(() => props.mobileLayout || 'strip')
const asAccordion = computed(() => mobileLayout.value === 'accordion' && collapse.value === 'mobile')

const tabList = computed<TabInput[]>(() => props.tabs ?? [])

function label(tab: TabInput): string {
  return tab.label ? getLocalizedValue(tab.label) : ''
}

// Unique, per-instance id prefix so multiple Tabs blocks on one page keep
// distinct ARIA relationships (aria-controls / aria-labelledby must be unique).
// `useId()` is stable per component instance (a `<script setup>`-local counter
// would reset to the same value for every instance and collide).
const uid = `tabs-${useId()}`
function tabId(i: number): string {
  return `${uid}-tab-${i}`
}
function panelId(i: number): string {
  return `${uid}-panel-${i}`
}

// The strip panel carries a single id. When deep-linking is off it keeps the
// per-instance ARIA id (byte-identical to today); when on, the stable anchor id
// doubles as the panel id so `aria-controls`/`getElementById` stay in agreement.
function panelDomId(i: number): string {
  return props.deepLink ? anchorId(i) : panelId(i)
}

// ── Active tab ───────────────────────────────────────────────────────────────
// `activeTab` is authored 1-based. Clamp to a valid 0-based index (default 0
// when there are no tabs yet).
const active = ref<number>(clampActive(props.activeTab, tabList.value.length))

function clampActive(value: number | undefined, count: number): number {
  if (count <= 0) return 0
  const n = typeof value === 'number' ? Math.floor(value) : 1
  return Math.min(Math.max(n, 1), count) - 1
}

// Deviation from the ExpandingPanels editor-inert precedent: tab switching stays
// live in the editor preview so authors can inspect each tab's content. Tabs are
// small targets and the panel body still selects the block for editing.
function select(i: number) {
  if (i < 0 || i >= tabList.value.length) return
  active.value = i
}

const stripEl = ref<HTMLElement | null>(null)

function focusTab(i: number) {
  const btn = stripEl.value?.querySelector<HTMLButtonElement>(`#${tabId(i)}`)
  btn?.focus()
}

// Roving-tabindex keyboard model for the tablist.
function onKeydown(event: KeyboardEvent, i: number) {
  const count = tabList.value.length
  if (count === 0) return
  let next: number
  switch (event.key) {
    case 'ArrowRight':
      next = (i + 1) % count
      break
    case 'ArrowLeft':
      next = (i - 1 + count) % count
      break
    case 'Home':
      next = 0
      break
    case 'End':
      next = count - 1
      break
    default:
      return
  }
  event.preventDefault()
  select(next)
  focusTab(next)
}

// ── Deep-linkable tabs (opt-in via deepLink; fully inert when off) ────────────

const localizedCopyLink = computed(() => getLocalizedValue(props.copyLinkText, 'Copy link'))
const localizedCopied = computed(() => getLocalizedValue(props.copiedText, 'Copied!'))

// Slug per tab index, deterministic across reloads and deduped so every tab gets
// a unique, stable anchor. Derived from the tab's plain label text.
const slugForIndex = computed(() => {
  const used = new Set<string>()
  return tabList.value.map((tab, index) => {
    let base = label(tab)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    if (!base) base = `tab-${index}`
    // Guarantee global uniqueness — a numeric suffix could otherwise collide
    // with a different tab's natural slug.
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
function anchorId(i: number): string {
  const slug = slugForIndex.value[i] ?? `tab-${i}`
  return props.blockId ? `tab-${props.blockId}-${slug}` : `tab-${slug}`
}

// Copy-link feedback: the tab whose button was last used, cleared after a beat.
const copiedIndex = ref<number | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

async function copyLink(i: number) {
  if (typeof window === 'undefined') return
  const anchor = anchorId(i)
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
  copiedIndex.value = i
  if (copiedTimer !== null) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copiedIndex.value = null
    copiedTimer = null
  }, 1600)
}

// Select + scroll to the tab whose anchor matches the current URL hash.
function syncFromHash() {
  if (typeof window === 'undefined') return
  const anchor = window.location.hash.replace(/^#/, '')
  if (!anchor) return
  const idx = tabList.value.findIndex((_, i) => anchorId(i) === anchor)
  if (idx === -1) return
  select(idx)
  nextTick(() => {
    const el = document.getElementById(anchorId(idx))
    if (el) {
      el.scrollIntoView({ behavior: isReducedMotion.value ? 'auto' : 'smooth', block: 'start' })
      // Both rendered forms give the tab/acc-header button the tabId(idx) id.
      const btn = document.getElementById(tabId(idx))
      if (btn instanceof HTMLElement) btn.focus()
    }
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

const measureStyle = computed<Record<string, string>>(() =>
  props.measureWidth ? { '--block-measure': `var(--measure-width-${props.measureWidth})` } : {},
)
</script>

<style lang="scss" scoped>
.tabs {
  max-width: var(--block-measure, none);
  margin-inline: var(--block-measure-align, auto);

  &__strip {
    display: flex;
    flex-wrap: nowrap;
    gap: 0.4rem;
    align-items: stretch;
    justify-content: flex-start;
  }
  &--center &__strip {
    justify-content: center;
  }

  &__tab {
    appearance: none;
    border: 0;
    background: none;
    cursor: pointer;
    padding: 0.9rem 1.4rem;
    font-family: var(--rt-role-label-family, var(--font-family-body, inherit));
    font-size: var(--font-size-sm, 1.4rem);
    letter-spacing: 0.02em;
    line-height: 1.2;
    white-space: nowrap;
    color: var(--section-text, var(--color-text));
    transition: color 0.25s ease, background-color 0.25s ease, border-color 0.25s ease, opacity 0.25s ease;

    &:focus-visible {
      outline: 2px solid var(--color-accent, currentColor);
      outline-offset: 2px;
    }
  }

  // Equal-width tabs when stretched.
  &--fit-stretch &__tab {
    flex: 1 1 0;
  }

  // ── Variant: underline ──────────────────────────────────────────────────────
  &--underline &__strip {
    border-bottom: 1px solid var(--color-border-light, rgba(0, 0, 0, 0.12));
  }
  &--underline &__tab {
    margin-bottom: -1px;
    border-bottom: 2px solid transparent;
    opacity: 0.65;

    &.is-active {
      color: var(--color-accent, inherit);
      border-bottom-color: var(--color-accent, currentColor);
      opacity: 1;
    }
  }

  // ── Variant: pills ──────────────────────────────────────────────────────────
  &--pills &__strip {
    gap: 0.6rem;
  }
  &--pills &__tab {
    border-radius: 999px;
    opacity: 0.8;

    &.is-active {
      background-color: var(--color-accent, var(--color-primary));
      color: #fff;
      opacity: 1;
    }
  }

  // ── Variant: boxed ──────────────────────────────────────────────────────────
  &--boxed &__tab {
    margin-right: -1px;
    border: 1px solid var(--color-border-light, rgba(0, 0, 0, 0.12));
    border-bottom: 0;
    border-radius: var(--border-radius, 0.4rem) var(--border-radius, 0.4rem) 0 0;
    opacity: 0.7;

    &.is-active {
      background-color: var(--section-surface, rgba(0, 0, 0, 0.03));
      opacity: 1;
    }
  }
  &--boxed &__panel {
    border: 1px solid var(--color-border-light, rgba(0, 0, 0, 0.12));
    background-color: var(--section-surface, transparent);
  }

  &__panel {
    padding: var(--spacing-md, 1.6rem) 0;
    // Keep a deep-linked panel clear of any sticky header when scrolled to.
    scroll-margin-top: var(--spacing-2xl, 4.8rem);

    // Crossfade in when a panel becomes visible. The [hidden] → display:block
    // flip restarts the animation on every tab switch. Suppressed for reduced
    // motion below.
    &:not([hidden]) {
      animation: tabs-fade 0.35s ease;
    }

    &:focus-visible {
      outline: 2px solid var(--color-accent, currentColor);
      outline-offset: 2px;
    }
  }
  &--boxed &__panel {
    padding: var(--spacing-md, 1.6rem);
  }

  &__body {
    font-family: var(--rt-role-body-family, var(--font-family-body, inherit));
    font-size: var(--rt-role-body-size, var(--font-size-base, 1.6rem));
    line-height: var(--rt-role-body-line-height, var(--line-height-relaxed, 1.6));
    color: var(--section-text, var(--color-text));
  }

  // ── Reduced motion ──────────────────────────────────────────────────────────
  &.is-reduced &__tab {
    transition: none;
  }
  &.is-reduced &__panel:not([hidden]) {
    animation: none;
  }
  &.is-reduced &__acc-content,
  &.is-reduced &__acc-icon,
  &.is-reduced &__acc-header {
    transition: none;
  }

  // ── Mobile: keep tabs AS tabs but scroll the strip horizontally so a long
  // set stays reachable. No @media — collapse comes from useViewport().
  &[data-collapse='mobile'] &__strip {
    justify-content: flex-start;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  // Natural width on mobile so tabs overflow into the scroll region rather than
  // compressing (overrides fit=stretch).
  &[data-collapse='mobile'] &__tab {
    flex: 0 0 auto;
  }

  // ── Mobile: accordion (opt-in via mobileLayout='accordion') ──────────────────
  // Rendered only when asAccordion is true (mobile viewport + accordion setting),
  // so these classes never appear in the default strip DOM. Every label stacks
  // vertically and stays visible; the exclusive always-one-open model reuses
  // select() so flipping back to desktop leaves a valid active tab.
  &__accordion {
    display: block;
  }
  &__acc-item {
    border-bottom: 1px solid var(--color-border-light, rgba(0, 0, 0, 0.12));
    // Keep a deep-linked item clear of any sticky header when scrolled to.
    scroll-margin-top: var(--spacing-2xl, 4.8rem);

    &:first-child {
      border-top: 1px solid var(--color-border-light, rgba(0, 0, 0, 0.12));
    }
  }
  &__acc-header {
    appearance: none;
    border: 0;
    background: none;
    cursor: pointer;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.2rem;
    min-height: 4.4rem;
    padding: 1.2rem 0.4rem;
    text-align: left;
    font-family: var(--rt-role-label-family, var(--font-family-body, inherit));
    font-size: var(--font-size-sm, 1.4rem);
    letter-spacing: 0.02em;
    line-height: 1.2;
    color: var(--section-text, var(--color-text));
    transition: color 0.25s ease, background-color 0.25s ease, border-color 0.25s ease, opacity 0.25s ease;
    opacity: 0.7;

    &.is-active {
      color: var(--color-accent, inherit);
      opacity: 1;
    }

    &:focus-visible {
      outline: 2px solid var(--color-accent, currentColor);
      outline-offset: 2px;
    }
  }
  &__acc-label {
    flex: 1 1 auto;
  }
  &__acc-icon {
    flex: 0 0 auto;
    width: 2rem;
    height: 2rem;
    display: inline-flex;
    transition: transform 0.25s ease;

    svg {
      width: 100%;
      height: 100%;
    }
  }
  &__acc-item.is-open &__acc-icon {
    transform: rotate(180deg);
  }
  &__acc-content {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows var(--transition-base, 0.3s ease);

    &.is-open {
      grid-template-rows: 1fr;
    }
  }
  &__acc-wrap {
    overflow: hidden;
    min-height: 0;
  }
  // Bottom padding only; no top padding so the collapsed 0fr row clips cleanly.
  &__acc-content &__body {
    padding-block: 0 var(--spacing-md, 1.6rem);
  }

  // ── Deep-link affordance (rendered only when deepLink is on) ──────────────────
  // Unobtrusive, right-aligned text button inside the visible panel / open item.
  &__copy-link {
    display: block;
    width: fit-content;
    margin: var(--spacing-sm, 1.2rem) 0 0 auto;
    padding: 0.4rem 0.8rem;
    background: transparent;
    border: 1px solid var(--color-border-light, rgba(0, 0, 0, 0.12));
    border-radius: var(--border-radius-sm, var(--border-radius, 0.4rem));
    color: var(--color-text-muted, var(--section-text, var(--color-text)));
    font-family: var(--rt-role-label-family, var(--font-family-body, inherit));
    font-size: var(--font-size-sm, 1.4rem);
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: color 0.25s ease, border-color 0.25s ease;

    &:hover {
      color: var(--section-text, var(--color-text));
      border-color: var(--color-text-muted, currentColor);
    }

    &:focus-visible {
      outline: 2px solid var(--color-accent, currentColor);
      outline-offset: 2px;
    }
  }

  // Visually-hidden polite live region announcing a successful copy.
  &__sr-live {
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
}

@keyframes tabs-fade {
  from {
    opacity: 0;
    transform: translateY(0.4rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
