<script setup lang="ts">
// Theme CSS loads with the theme layout, not via the global nuxt `css` array
// (CSS-02..05): tokens, reset and utilities exist only on documents that mount
// a standalone layout (public site + editor-preview iframe), never in /admin.
// Order matters: standalone.scss defines the tokens main.scss consumes.
import '~/themes/standalone/assets/scss/standalone.scss'
import '~/themes/standalone/assets/scss/main.scss'
import { provide, inject, computed, ref, onMounted, onUnmounted, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { provideLayoutMeta } from '~/shared/composables/useLayoutMeta'
import Header from '~/themes/standalone/components/Header.vue'
import Footer from '~/themes/standalone/components/Footer.vue'
import IntroReveal from '~/themes/standalone/components/IntroReveal.vue'
import Lightbox from '~/themes/standalone/components/Lightbox.vue'
import CursorLayer from '~/themes/standalone/components/CursorLayer.vue'
import SectionNav from '~/themes/standalone/components/SectionNav.vue'
import LayoutShell from '~/shared/features/layout/LayoutShell.vue'
import { useResolvedLayout } from '~/shared/composables/useResolvedLayout'
import { useClientConfig } from '~/shared/composables/useClientConfig'
import { provideAuthState } from '~/shared/composables/useAuthState'
import { useAuthToken } from '~/shared/composables/useAuthToken'
import type { ChildSiteConfig } from '~/shared/types/previewMessages'

provideLayoutMeta({ hasHeader: true, hasFooter: true })

const { t } = useI18n()

// The fragment jump alone moves the browser's sequential-focus starting point but does not
// move real focus in every engine, so drive it explicitly. The native jump still does the
// scrolling — we only take focus.
const mainRef = ref<HTMLElement | null>(null)
function focusMain() {
  mainRef.value?.focus({ preventScroll: true })
}

// Resolve the layout config (frame/header/footer/background/chrome/scroll/policy)
// for the current page. The page id + meta are provided by pages/[...slug].vue.
const { config } = useClientConfig()

// Declare visitor auth state for the whole page tree. Consumers: block-level
// `visibleTo` (DynamicPage) and the `_auth`/`_guest` setting overrides
// (useBlockSettings). Personalization only — page gating is `requireAuth`,
// enforced server-side.
const { isAuthenticated } = useAuthToken(
  (config.value as any)?.themeSettings?.authStorageKey ?? 'authorization',
)
provideAuthState(isAuthenticated)

const currentPageMeta = inject<Ref<Record<string, any>> | null>('currentPageMeta', null)
const currentPageLayoutId = inject<Ref<string> | null>('currentPageLayoutId', null)

const resolvedLayout = useResolvedLayout(
  computed(() => ({ layout: (config.value as any)?.layout ?? { layouts: [] } })),
  computed(() => ({
    layout: currentPageLayoutId?.value ?? 'default',
    meta: currentPageMeta?.value ?? {},
  })),
)

provide('layout:onBlockEvent', (payload: any) => {
  console.warn(`[default layout] Unhandled block event: ${payload.eventName}`, payload)
})

// Inject child site context to show both parent and child headers
const childSiteContext = inject<Ref<ChildSiteConfig | null>>('childSiteContext', ref(null))

// Measure parent header height so child header sticks below it
const parentHeaderRef = ref<InstanceType<typeof Header> | null>(null)
const parentHeaderHeight = ref(0)
let resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  const el = parentHeaderRef.value?.$el as HTMLElement | undefined
  if (el && el.nodeType === 1) {
    parentHeaderHeight.value = el.offsetHeight
    resizeObserver = new ResizeObserver(([entry]) => {
      parentHeaderHeight.value = entry.contentRect.height
    })
    resizeObserver.observe(el)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <!--
    data-site-root is the scope selector used by buildTypographyStyles() —
    keep it on the outermost layout element so the generated
    `[data-site-root] { --rt-preset-*: ... }` rules cover every child
    (blocks, TipTap content, nested child sites). Never remove this
    attribute without updating useTypographyPresets' scope selector.
  -->
  <div data-theme="standalone" data-site-root :style="{ '--header-height': parentHeaderHeight + 'px' }">
    <!--
      Bypass block (WCAG 2.4.1). Must stay the FIRST focusable node in the layout —
      everything above it in the tree (IntroReveal / Lightbox / CursorLayer / SectionNav)
      is inert until opened, so this is the document's first tab stop.
    -->
    <a class="skip-link" href="#main-content" @click="focusMain">{{ t('header.skipToContent') }}</a>
    <!-- Brand entrance reveal — opt-in via themeSettings.introReveal, once per session -->
    <IntroReveal />
    <!-- Fullscreen image viewer — inert until an opt-in [data-lightbox] trigger is clicked -->
    <Lightbox />
    <!-- Context-aware magnetic cursor — opt-in via themeSettings.cursor; reads [data-cursor*] attrs -->
    <CursorLayer />
    <!-- Scrollspy section rail — opt-in via themeSettings.sectionNav; auto-discovers #main-content sections -->
    <SectionNav />
    <LayoutShell :resolved-layout="resolvedLayout">

      <template #header>
        <!-- Parent header (always visible) -->
        <Header ref="parentHeaderRef" :force-parent-nav="true" />
        <!-- Child site header (shown when inside a child site, stacked below parent) -->
        <Header v-if="childSiteContext" :sticky-top="parentHeaderHeight" />
      </template>

      <!-- tabindex=-1 so the skip link's fragment target can actually take focus -->
      <main id="main-content" ref="mainRef" tabindex="-1">
        <slot :hasHeader="true" :hasFooter="true" />
      </main>

      <template #footer>
        <!-- Child site footer (shown when inside a child site) -->
        <Footer v-if="childSiteContext" />
        <!-- Parent footer (always visible) -->
        <Footer :force-parent-nav="true" />
      </template>
    </LayoutShell>
  </div>
</template>

<style scoped>
/*
  fixed, not absolute: the link is reachable with Shift+Tab from anywhere on the page, and
  an absolutely-positioned one would slide off with the document when that happens deep in
  a long page.
*/
.skip-link {
  position: fixed;
  top: -8rem;
  left: 0;
  padding: 0.8rem 1.6rem;
  background: var(--color-primary, #006400);
  color: var(--color-white, #fff);
  font-size: var(--font-size-base, 1.5rem);
  text-decoration: none;
  z-index: 9999;
  border-radius: 0 0 0.4rem 0;
  /*
    Deliberately NOT transitioned. A slid-in skip link is measurably off-screen for the
    first ~200ms of its own focus, and this is one of the hardcoded `transition` literals
    the theme's prefers-reduced-motion block cannot reach (it zeroes `animation-*` and the
    three `--transition-*` vars only) — so under `reduce` it would animate anyway.
  */
}

.skip-link:focus-visible {
  top: 0;
  outline: 0.2rem solid var(--color-focus);
  outline-offset: 0.2rem;
}

/*
  The tabindex=-1 on <main> exists only so the skip target can receive focus; ringing the
  whole page after the user deliberately jumped there is noise, and the scroll already
  confirms the jump. Every real control keeps its own indicator.
*/
#main-content:focus,
#main-content:focus-visible {
  outline: none;
}
</style>
