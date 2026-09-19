<template>
  <header
    class="header-shell"
    :class="{
      'header-shell--compact': stateMachine.isCompact.value,
      'header-shell--sticky': props.shellConfig.sticky,
      'header-shell--drawer': isDrawerMode,
      'header-shell--drawer-open': isDrawerMode && mobileMenuOpen,
      [`header-shell--style-${morphStyle}`]: morphStyle,
    }"
    :style="{ '--header-sticky-top': `${stickyTop}px` }"
  >
    <div
      class="header-shell__bg"
      data-target="header-bg"
      :style="bgStyle"
    >
      <div v-if="showAccentBar" class="header-shell__accent-bar" aria-hidden="true" />
    </div>

    <div
      ref="contentEl"
      class="header-shell__content"
      :class="{ 'header-shell__content--strip': isDrawerMode }"
      :style="contentStyle"
    >
      <span v-if="tagline" class="header-shell__tagline" :style="{ order: 0 }">{{ tagline }}</span>
      <div v-if="hideWordmark" :style="{ order: zoneOrder.logo }" aria-hidden="true" />
      <HeaderLogoZone
        v-if="!hideWordmark"
        :style="{ order: zoneOrder.logo }"
        :logo-url="logoUrl"
        :logo-alt="logoAlt"
        :compact-logo-url="compactLogoUrl"
        :logo-text="logoText"
        :home-url="homeUrl"
        :is-compact="stateMachine.isCompact.value"
        :resolved-style="resolvedLogoStyle"
      />
      <HeaderNavZone
        :style="{ order: zoneOrder.nav }"
        :menu-items="menuItems"
        :show-hub-return="showHubReturn"
        :hub-return-url="hubReturnUrl"
        :hub-return-text="hubReturnText"
        :resolved-style="resolvedNavStyle"
        :submenu-label-template="submenuLabelTemplate"
      />
      <HeaderActionsZone
        :style="{ order: zoneOrder.actions }"
        :show-language-toggle="showLanguageToggle"
        :current-locale="currentLocale"
        :language-label="languageLabel"
        :resolved-style="resolvedActionsStyle"
        @toggle-language="$emit('toggleLanguage')"
      />

      <!-- Drawer mode: the trigger is the strip's end cell (icon only; the
           label is the accessible name, per the design reference). -->
      <button
        v-if="isDrawerMode"
        ref="mobileMenuButton"
        class="header-shell__mobile-menu-btn"
        :style="{ order: 4 }"
        :aria-label="menuLabel || 'Menu'"
        :aria-expanded="mobileMenuOpen"
        aria-controls="header-mobile-navigation"
        @click="toggleMobileMenu"
      >
        <span class="header-shell__hamburger" aria-hidden="true">
          <span /><span /><span />
        </span>
      </button>
    </div>

    <button
      v-if="!isDrawerMode"
      ref="mobileMenuButton"
      class="header-shell__mobile-menu-btn"
      aria-label="Menu"
      :aria-expanded="mobileMenuOpen"
      aria-controls="header-mobile-navigation"
      @click="toggleMobileMenu"
    >
      <span class="header-shell__hamburger" aria-hidden="true">
        <span /><span /><span />
      </span>
    </button>

    <!-- Drawer mode teleports the panel + backdrop to <body>: the sticky
         header's z-index creates a stacking context that would otherwise trap
         the fixed panel underneath page blocks. (Teleporting into an ancestor
         like the site root crashes Vue's patch anchors.) The panel carries
         data-theme itself so the theme's scoped vars/fonts still apply. -->
    <Teleport to="body" :disabled="!isDrawerMode">
    <div
      v-if="isDrawerMode && mobileMenuOpen && drawerConfig.showBackdrop"
      class="header-shell__drawer-backdrop"
      aria-hidden="true"
      @click="closeMobileMenu"
    />

    <nav
      v-if="mobileMenuOpen"
      id="header-mobile-navigation"
      ref="mobileNav"
      class="header-shell__mobile-nav"
      :class="isDrawerMode ? ['header-shell__mobile-nav--drawer', `header-shell__mobile-nav--${drawerConfig.position}`] : undefined"
      :style="drawerPanelStyle"
      :data-theme="isDrawerMode ? 'standalone' : undefined"
      :role="isDrawerMode ? 'dialog' : undefined"
      :aria-modal="isDrawerMode ? 'true' : undefined"
      :aria-label="isDrawerMode ? menuLabel || 'Menu' : 'Mobile navigation'"
    >
      <div class="header-shell__mobile-nav-content">
        <button class="header-shell__mobile-close" type="button" aria-label="Close menu" @click="closeMobileMenu">
          &times;
        </button>
        <a
          v-if="showHubReturn && hubReturnUrl"
          :href="hubReturnUrl"
          class="header-shell__mobile-hub-return"
          @click="closeMobileMenu"
        >
          {{ hubReturnText }}
        </a>

        <HeaderMobileMenu
          class="header-shell__mobile-menu"
          :items="menuItems"
          :is-drawer-mode="isDrawerMode"
          :submenu-label-template="submenuLabelTemplate"
          @navigate="closeMobileMenu"
        />

        <div class="header-shell__mobile-actions">
          <button
            v-if="showLanguageToggle"
            class="header-shell__mobile-action-btn"
            @click="$emit('toggleLanguage')"
          >
            {{ languageLabel }}
          </button>
        </div>

        <div
          v-if="isDrawerMode && (drawerFooterLinks.length || drawerLegal)"
          class="header-shell__drawer-footer"
        >
          <ul v-if="drawerFooterLinks.length" class="header-shell__drawer-socials">
            <li v-for="link in drawerFooterLinks" :key="link.id">
              <a
                :href="link.url"
                class="header-shell__drawer-social-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ link.label }}
              </a>
            </li>
          </ul>
          <p v-if="drawerLegal" class="header-shell__drawer-legal">{{ drawerLegal }}</p>
        </div>
      </div>
    </nav>
    </Teleport>
  </header>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useHeaderStateMachine } from '~/shared/composables/useHeaderStateMachine'
import { useViewport } from '~/shared/composables/useViewport'
import {
  computeZoneOrder,
  interpolateLayout,
  computeBackgroundStyle,
  resolveZoneStyle,
} from '~/shared/composables/useHeaderLayout'
import type {
  HeaderShellConfig,
  ZoneConfig,
  ResolvedZoneStyle,
  HeaderNavigationMode,
  DrawerConfig,
  NavMenuItem,
} from '~/shared/types/headerZone'
import { SEQUENCE_ORDER, DEFAULT_DRAWER_CONFIG, INLINE_NAV_COLLAPSE_MAX_WIDTH } from '~/shared/types/headerZone'
import HeaderLogoZone from './HeaderLogoZone.vue'
import HeaderNavZone from './HeaderNavZone.vue'
import HeaderActionsZone from './HeaderActionsZone.vue'
import HeaderMobileMenu from './HeaderMobileMenu.vue'

const props = withDefaults(defineProps<{
  shellConfig: HeaderShellConfig
  logoZoneConfig: ZoneConfig
  navZoneConfig: ZoneConfig
  actionsZoneConfig: ZoneConfig
  logoUrl: string
  logoAlt: string
  compactLogoUrl: string
  logoText: string
  homeUrl: string
  menuItems: NavMenuItem[]
  showHubReturn: boolean
  hubReturnUrl: string
  hubReturnText: string
  showAccentBar: boolean
  showLanguageToggle: boolean
  currentLocale: string
  languageLabel: string
  stickyTop: number
  navigationMode?: HeaderNavigationMode
  menuLabel?: string
  tagline?: string
  drawerConfig?: DrawerConfig
  hideWordmark?: boolean
  morphStyle?: 'editorial-slide' | 'glass-pill'
  drawerFooterLinks?: NavMenuItem[]
  drawerLegal?: string
  /** Accessible name for a submenu toggle. `{label}` is replaced by the item's label. */
  submenuLabelTemplate?: string
}>(), {
  navigationMode: 'inline',
  menuLabel: '',
  tagline: '',
  drawerConfig: () => ({ ...DEFAULT_DRAWER_CONFIG }),
  hideWordmark: false,
  morphStyle: undefined,
  drawerFooterLinks: () => [],
  drawerLegal: '',
  submenuLabelTemplate: 'Toggle submenu for {label}',
})

defineEmits<{
  toggleLanguage: []
}>()

const mobileMenuOpen = ref(false)
const mobileMenuButton = ref<HTMLButtonElement | null>(null)
const mobileNav = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)
const measuredContentWidth = ref(600)
const route = useRoute()
let previousBodyOverflow = ''
let bodyScrollLocked = false

const isDrawerMode = computed(() => props.navigationMode === 'drawer')
const shouldLockBodyScroll = computed(() => !isDrawerMode.value || props.drawerConfig.lockBodyScroll)

const drawerPanelStyle = computed(() => {
  if (!isDrawerMode.value) return undefined
  return {
    '--drawer-height': props.drawerConfig.height,
    '--drawer-width': props.drawerConfig.width,
    '--drawer-item-size': `${props.drawerConfig.itemSize}px`,
  }
})

let resizeObserver: ResizeObserver | null = null
onMounted(async () => {
  await nextTick()
  const el = contentEl.value
  if (el && el.nodeType === 1) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        measuredContentWidth.value = entry.contentRect.width
      }
    })
    resizeObserver.observe(el as Element)
  }
})
onUnmounted(() => {
  resizeObserver?.disconnect()
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', onMenuKeydown)
    if (bodyScrollLocked) document.body.style.overflow = previousBodyOverflow
  }
})

function focusableMenuItems(): HTMLElement[] {
  if (!mobileNav.value) return []
  return Array.from(mobileNav.value.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'))
}

function onMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeMobileMenu()
    return
  }
  if (event.key !== 'Tab') return
  const items = focusableMenuItems()
  if (!items.length) return
  const first = items[0]!
  const last = items[items.length - 1]!
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

async function openMobileMenu() {
  mobileMenuOpen.value = true
  if (shouldLockBodyScroll.value) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    bodyScrollLocked = true
  }
  document.addEventListener('keydown', onMenuKeydown)
  await nextTick()
  focusableMenuItems()[0]?.focus()
}

/**
 * `restoreFocus` is false only for closes the user did not ask for (the
 * breakpoint watcher below). Returning focus to the trigger is correct after a
 * deliberate close; doing it when the viewport merely changed would move focus
 * out from under the reader — and in inline mode the trigger is `display: none`
 * at that width anyway, so the focus would land on `<body>`.
 */
function closeMobileMenu({ restoreFocus = true }: { restoreFocus?: boolean } = {}) {
  if (!mobileMenuOpen.value) return
  mobileMenuOpen.value = false
  if (bodyScrollLocked) {
    document.body.style.overflow = previousBodyOverflow
    bodyScrollLocked = false
  }
  document.removeEventListener('keydown', onMenuKeydown)
  if (restoreFocus) nextTick(() => mobileMenuButton.value?.focus())
}

function toggleMobileMenu() {
  if (mobileMenuOpen.value) closeMobileMenu()
  else openMobileMenu()
}

watch(() => route.path, () => closeMobileMenu())

// The inline panel is an IN-FLOW dropdown that CSS hides above $bp-lg, so the
// viewport is a state input: left open across that boundary it becomes a dead
// end — panel `display: none`, trigger `display: none`, body scroll still
// locked, and only an undiscoverable Escape recovers. A tablet rotating to
// landscape crosses it. Close on the way out of the collapsed range; the
// drawer is exempt because it renders at every width by design.
// (Threshold read from `INLINE_NAV_COLLAPSE_MAX_WIDTH`, the same JS source of
// truth the SCSS `$bp-lg` mirrors — collapse decisions live in TS, never in a
// `@media` guess.)
const { innerWidth: viewportWidth } = useViewport()
watch(
  () => viewportWidth.value <= INLINE_NAV_COLLAPSE_MAX_WIDTH,
  (isCollapsed) => {
    if (!isCollapsed && !isDrawerMode.value) closeMobileMenu({ restoreFocus: false })
  },
)

const stateMachine = useHeaderStateMachine({
  trigger: props.shellConfig.compactTrigger,
  duration: props.shellConfig.transitionDuration,
  easing: props.shellConfig.transitionEasing,
})

const zoneOrder = computed(() => computeZoneOrder(props.shellConfig.logoPosition))

const currentLayout = computed(() =>
  interpolateLayout(
    props.shellConfig.expandedLayout,
    props.shellConfig.compactLayout,
    stateMachine.transitionProgress.value,
  ),
)

const contentStyle = computed(() => {
  // Drawer mode renders the 3-cell editorial strip: [tagline | wordmark | trigger].
  if (isDrawerMode.value) {
    return {
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      columnGap: '2.4rem',
      // Morph styles own the strip geometry in CSS (full-bleed padding for
      // editorial-slide, centred capsule offset for glass-pill) — no inline
      // padding/margin, which would override the choreography rules.
      ...(props.morphStyle ? {} : { padding: `0 ${currentLayout.value.padding}px`, margin: '0 auto' }),
      width: '100%',
      position: 'relative' as const,
      zIndex: 1,
    }
  }
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: currentLayout.value.justify,
    gap: `${currentLayout.value.gap}px`,
    padding: `0 ${currentLayout.value.padding}px`,
    maxWidth: currentLayout.value.contentWidthMode === 'fit' ? 'fit-content' : '100%',
    margin: '0 auto',
    width: '100%',
    position: 'relative' as const,
    zIndex: 1,
  }
})

const bgStyle = computed(() => {
  const base = computeBackgroundStyle(
    props.shellConfig.compactBackground,
    stateMachine.transitionProgress.value,
    measuredContentWidth.value,
  )
  return {
    position: 'absolute' as const,
    inset: 0,
    zIndex: 0,
    backgroundColor: 'var(--header-bg-color)',
    transition: 'none',
    ...base,
  }
})

function effectiveProgress(zoneIndex: number): number {
  const baseProgress = stateMachine.transitionProgress.value
  if (props.shellConfig.sequenceMode === 'simultaneous') return baseProgress

  const staggerMs = props.shellConfig.sequenceStagger
  const durationMs = props.shellConfig.transitionDuration
  const totalMs = durationMs + SEQUENCE_ORDER.length * staggerMs
  const zoneStartMs = zoneIndex * staggerMs
  const globalElapsed = baseProgress * totalMs
  const zoneElapsed = Math.max(0, globalElapsed - zoneStartMs)
  return Math.min(zoneElapsed / durationMs, 1)
}

const resolvedLogoStyle = computed<ResolvedZoneStyle>(() =>
  resolveZoneStyle(
    props.logoZoneConfig,
    effectiveProgress(SEQUENCE_ORDER.indexOf('logo')),
    props.logoZoneConfig.visibleInExpanded,
    props.logoZoneConfig.visibleInCompact,
  ),
)

const resolvedNavStyle = computed<ResolvedZoneStyle>(() =>
  resolveZoneStyle(
    props.navZoneConfig,
    effectiveProgress(SEQUENCE_ORDER.indexOf('nav')),
    props.navZoneConfig.visibleInExpanded,
    props.navZoneConfig.visibleInCompact,
  ),
)

const resolvedActionsStyle = computed<ResolvedZoneStyle>(() =>
  resolveZoneStyle(
    props.actionsZoneConfig,
    effectiveProgress(SEQUENCE_ORDER.indexOf('actions')),
    props.actionsZoneConfig.visibleInExpanded,
    props.actionsZoneConfig.visibleInCompact,
  ),
)
</script>

<style lang="scss" scoped>
.header-shell {
  position: relative;
  color: var(--header-text-color);
  min-height: 6rem;

  // Double class outranks LayoutShell's `[data-layout-shell] > :slotted(header)`
  // stacking rule (0-2-1), which would otherwise reset position to relative.
  &.header-shell--sticky {
    position: sticky;
    top: var(--header-sticky-top, 0);
    z-index: var(--z-sticky);
  }

  &__accent-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: var(--accent-bar-height, 8px);
    background-color: var(--accent-bar-color, transparent);
    border-radius: inherit;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  &__bg {
    pointer-events: none;

    // On mobile, disable the animated bg transforms — use a simple flat bar.
    // Zone animations aren't visible on mobile, so the pill/shrink bg is irrelevant.
    @media (max-width: $bp-md) {
      border-radius: 0 !important;
      transform: none !important;
      opacity: 1 !important;
    }
  }

  &__content {
    min-height: 6rem;

    // $bp-lg, not $bp-md: a ~10-item top bar overflows every viewport between
    // 769px and tablet-landscape widths, so the burger takes over up to lg.
    // Mirrors INLINE_NAV_COLLAPSE_MAX_WIDTH (shared/types/headerZone.ts) —
    // update both together.
    @media (max-width: $bp-lg) {
      // In the collapsed range, hide nav and actions zones — only logo stays visible
      :deep(.header-nav-zone),
      :deep(.header-actions-zone) {
        display: none;
      }
    }
  }

  &__mobile-menu-btn {
    display: none;
    position: absolute;
    right: 1rem;
    top: 0;
    height: 6rem;
    // WCAG 2.5.5 / 2.5.8 minimum tap target — the icon glyph is 2.4rem, so the
    // hit area is enlarged without changing the visual hamburger size. Guards
    // the drawer-mode override below (which resets height to auto → ~40px).
    min-width: 4.4rem;
    min-height: 4.4rem;
    background: none;
    border: none;
    -webkit-appearance: none;
    appearance: none;
    color: var(--header-text-color);
    cursor: pointer;
    padding: 0.8rem;
    border-radius: 0.4rem;
    z-index: 4;

    // Collapse range mirrors INLINE_NAV_COLLAPSE_MAX_WIDTH — see &__content.
    @media (max-width: $bp-lg) {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }

    &:focus-visible {
      outline: 0.2rem solid var(--color-primary);
      outline-offset: 0.2rem;
    }
  }

  &__hamburger {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    width: 2.4rem;
    height: 2.4rem;
    justify-content: center;

    span {
      width: 100%;
      height: 0.2rem;
      background-color: var(--header-text-color);
      border-radius: 0.1rem;
      transition: all var(--transition-base);
    }
  }

  &__mobile-nav {
    position: relative;
    z-index: 3;
    background-color: var(--color-background, #fff);
    color: var(--color-text);
    border-top: 0.1rem solid var(--border-color);
    border-bottom: 0.1rem solid var(--border-color);
    box-shadow: 0 0.4rem 1.2rem rgba(0, 0, 0, 0.08);
    animation: slideDown 300ms ease-out;

    // Collapse range mirrors INLINE_NAV_COLLAPSE_MAX_WIDTH — see &__content.
    @media (min-width: ($bp-lg + 1)) {
      display: none;
    }
  }

  // Drawer mode: editorial strip chrome + slide-in panel on all breakpoints.
  &--drawer {
    .header-shell__mobile-menu-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      top: auto;
      right: auto;
      height: auto;
      justify-self: end;
      // Stays visible above the open panel as the close affordance.
      z-index: 1001;
    }

    .header-shell__content :deep(.header-nav-zone),
    .header-shell__content :deep(.header-actions-zone) {
      display: none;
    }
  }

  // Drawer open: the panel reads as the chrome — park the strip's tagline and
  // wordmark; the trigger stays visible as the close affordance.
  // !important: zone visibility/opacity arrive as inline styles from
  // resolveZoneStyle, which would otherwise win over this rule.
  &--drawer-open {
    .header-shell__tagline,
    .header-shell__content :deep(.header-logo-zone) {
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none;
      transition: opacity 200ms ease-out, visibility 0s linear 200ms;
    }
  }

  &__content--strip {
    .header-shell__tagline { justify-self: start; }
    :deep(.header-logo-zone) { justify-self: center; }

    // Morph styles drop the inline strip padding (contentStyle skips it when a
    // morphStyle is set — the choreography CSS owns the strip geometry) but only
    // restore a gutter at desktop widths (padding-inline in the min-width morph
    // blocks). On mobile the strip would otherwise sit flush against the viewport
    // edges — the tagline and burger touch x=0/right edge. Restore a mobile gutter.
    @media (max-width: $bp-md) {
      padding-inline: 2rem;
    }
  }

  &__tagline {
    order: 0;
    font-size: var(--header-tagline-size, 1.3rem);
    font-weight: var(--font-weight-normal, 400);
    // Strip labels use the accent navlink color, per the design reference.
    color: var(--nav-link-color, var(--header-text-color));
    line-height: 1.4;
    white-space: nowrap;
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__drawer-backdrop {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(0, 0, 0, 0.4);
    animation: drawerBackdropIn 300ms ease-out forwards;
  }

  // Editorial slide-in panel: geometry from --drawer-height/--drawer-width,
  // centered oversized links, soft bottom shadow while open.
  &__mobile-nav--drawer {
    position: fixed;
    top: 0;
    height: var(--drawer-height, 100dvh);
    width: var(--drawer-width, 100vw);
    max-width: 100vw;
    z-index: 1000;
    overflow: hidden;
    border-top: none;
    border-bottom: none;
    box-shadow: 0 2.4rem 4.8rem -1.2rem rgba(0, 0, 0, 0.3);

    @media (min-width: ($bp-md + 1)) {
      display: block;
    }

    .header-shell__mobile-nav-content {
      height: 100%;
      padding: 10rem 5rem 4rem;
      justify-content: center;
      align-items: center;
      text-align: center;
      overflow-y: auto;
    }

    .header-shell__mobile-close {
      position: absolute;
      top: 1.6rem;
      right: 2rem;
      z-index: 2;
      color: var(--nav-link-color, var(--header-text-color));

      &:hover { color: var(--nav-link-hover-color, var(--color-primary)); }
    }

    /* The menu markup lives in HeaderMobileMenu now; :deep reaches its links.
       CSS custom properties (--drawer-item-size et al.) still inherit normally. */
    :deep(.header-mobile-menu__link) {
      font-family: var(--rt-slot-menuItem-family, var(--rt-role-label-family, inherit));
      font-size: var(--drawer-item-size, 4.8rem);
      font-weight: var(--font-weight-normal);
      letter-spacing: -0.02em;
      line-height: 1.15;
      padding: 0.5rem 0;
      border-bottom: none;
      color: var(--header-text-color, var(--color-text));
      animation: drawerItemIn 400ms ease-out both;
      animation-delay: calc(var(--item-index, 0) * 60ms + 150ms);

      &:hover,
      &[aria-current='page'] {
        background: none;
        color: var(--nav-link-hover-color, var(--color-primary));
      }
    }

    .header-shell__mobile-actions {
      border-top: none;
    }

    // Drawer footer: social links + legal line, pushed toward the panel bottom.
    .header-shell__drawer-footer {
      margin-top: 3.2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.8rem;
    }

    .header-shell__drawer-socials {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      gap: 1.6rem;

      li { display: flex; }
    }

    .header-shell__drawer-social-link {
      display: inline-flex;
      align-items: center;
      min-height: 4.4rem;
      padding-inline: 0.8rem;
      font-size: 1.5rem;
      color: var(--nav-link-color, var(--color-text));
      text-decoration: none;

      &:hover { color: var(--nav-link-hover-color, var(--color-primary)); }
      &:focus-visible {
        outline: 0.2rem solid var(--color-primary);
        outline-offset: 0.2rem;
      }
    }

    .header-shell__drawer-legal {
      margin: 0;
      font-size: 1.2rem;
      color: var(--color-text-light, #a6a6a6);
    }
  }

  &__mobile-nav--right {
    right: 0;
    animation: drawerFromRight 300ms ease-out;
  }

  &__mobile-nav--left {
    left: 0;
    animation: drawerFromLeft 300ms ease-out;
  }

  @keyframes drawerFromRight {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  @keyframes drawerFromLeft {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }

  @keyframes drawerBackdropIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes drawerItemIn {
    from { opacity: 0; transform: translateX(3rem); }
    to { opacity: 1; transform: translateX(0); }
  }

  // --- editorial-slide morph choreography ------------------------------------
  // Ref-faithful full-bleed hero chrome: at rest the header is FULLY
  // transparent over the hero photo. Over the first ~400px of scroll
  // (--morph-t 0→1, set by Header.vue from useHeaderMorphProgress) the
  // background bar fades in, the tagline slides right ~23.5vw, and the center
  // wordmark fades in. Desktop-gated; below md the standard mobile header
  // gains a scroll-faded backdrop (--morph-bg).
  // Double class: outranks Header.vue's `.header-wrapper--morph` background
  // reset on the same element (component style order is not guaranteed).
  &.header-shell--style-editorial-slide {
    @media (min-width: ($bp-md + 1)) {
      background-color: color-mix(in srgb, var(--header-bg-color, #fff) calc(var(--morph-t, 0) * 100%), transparent);
      box-shadow: 0 0.3rem 0.9rem color-mix(in srgb, #000000 calc(var(--morph-t, 0) * 2%), transparent);

      // The state-machine bg layer would paint its own bar under the morph.
      .header-shell__bg { display: none; }

      // Transparent overlay chrome is click-through so the hero behind stays
      // reachable at rest; interactive bits opt back in.
      pointer-events: none;
      .header-shell__mobile-menu-btn { pointer-events: auto; }

      // Full-bleed strip (ref: tagline ~x53, trigger ~55px from right edge).
      .header-shell__content--strip {
        max-width: none;
        padding-inline: 5.3rem;
      }

      .header-shell__tagline {
        font-size: 1.5rem;
        transform: translateX(calc(var(--morph-t, 0) * 23.5vw));
        will-change: transform;
      }

      // Wordmark fades IN with scroll — 1.33 factor: fully opaque at t≈0.75,
      // matching the probed reference curve. !important: zone opacity arrives
      // as an inline style from resolveZoneStyle, which would otherwise win.
      .header-shell__content :deep(.header-logo-zone) {
        opacity: calc(var(--morph-t, 0) * 1.33) !important;
        will-change: opacity;
        pointer-events: none;
      }
    }

    // Re-enable the wordmark link only once scrolled in (compact) so it never
    // intercepts the hero band at rest.
    &.header-shell--compact .header-shell__content :deep(.header-logo-zone) {
      pointer-events: auto;
    }

    @media (max-width: $bp-md) {
      // Mobile keeps tagline + burger only; hide the wordmark content, never
      // the grid cell (display:none would re-center the burger).
      .header-shell__content :deep(.header-logo-zone) { visibility: hidden; }
      background-color: var(--morph-bg, transparent);
      .header-shell__bg { display: none; }
    }
  }

  // --- glass-pill morph choreography ------------------------------------------
  // Ref-faithful sticky header on templated/editorial pages: the 3-cell strip
  // is a centred ~685px band at all scroll positions, and a white rounded
  // capsule + drop shadow fade IN as the page scrolls, so the scrolled header
  // reads as a floating pill. Desktop-gated; mobile keeps the standard header
  // with a scroll-faded backdrop.
  &.header-shell--style-glass-pill {
    overflow: visible;

    @media (min-width: ($bp-md + 1)) {
      // The pill (strip container) is the only chrome — no full-width bar.
      background-color: transparent;
      box-shadow: none;
      .header-shell__bg { display: none; }

      pointer-events: none;
      .header-shell__mobile-menu-btn { pointer-events: auto; }

      .header-shell__content--strip {
        max-width: var(--header-pill-width, 68.5rem);
        margin-inline: auto;
        // Resting: the nav row floats low over the page (~y104). Scrolled: the
        // capsule detaches with a ~22px gap. margin-top rides --morph-t.
        margin-top: calc(9.6rem - var(--morph-t, 0) * 7.4rem);
        min-height: 0;
        padding-block: 0.7rem;
        padding-inline: var(--header-pill-padding-x, 2.4rem);
        // Fill + shadow alpha ride --morph-t: transparent over the page (t=0)
        // → solid white pill with a soft shadow once scrolled (t=1).
        background-color: color-mix(in srgb, #ffffff calc(var(--morph-t, 0) * 100%), transparent);
        border-radius: var(--header-pill-radius, 999px);
        box-shadow: 0 0.4rem 1.6rem color-mix(in srgb, #1b3d4f calc(var(--morph-t, 0) * 14%), transparent);
        transition: none;
      }

      .header-shell__tagline { font-size: 1.5rem; }

      .header-shell__content :deep(.header-logo-zone) {
        pointer-events: none;
      }
    }

    &.header-shell--compact .header-shell__content :deep(.header-logo-zone) {
      pointer-events: auto;
    }

    @media (max-width: $bp-md) {
      background-color: var(--morph-bg, transparent);
      .header-shell__bg { display: none; }
    }
  }

  &__mobile-nav-content {
    max-width: var(--container-max-width);
    margin: 0 auto;
    padding: 0 1rem;
    display: flex;
    flex-direction: column;
  }

  &__mobile-close {
    align-self: flex-end;
    min-width: 4.4rem;
    min-height: 4.4rem;
    border: 0;
    background: transparent;
    color: inherit;
    font-size: 3rem;
    line-height: 1;
    cursor: pointer;

    &:focus-visible {
      outline: 0.2rem solid var(--color-primary);
      outline-offset: 0.2rem;
    }
  }

  &__mobile-hub-return {
    display: flex;
    align-items: center;
    padding: 0.75rem;
    color: var(--color-primary);
    text-decoration: none;
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-base);
    border-bottom: 0.1rem solid var(--border-color);

    &:hover { background-color: var(--color-background-light); }
    &:focus-visible {
      outline: 0.2rem solid var(--color-primary);
      outline-offset: -0.2rem;
    }
  }

  &__mobile-menu {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  :deep(.header-mobile-menu__link) {
    display: block;
    // Padding alone left the row at ~43.6px — a sub-pixel miss of the 4.4rem touch floor
    // that moves with the inherited font size. State the floor so it cannot drift under it.
    // `min-height` (not flex centering) keeps drawer mode's `text-align: center` working:
    // text-align does not position an anonymous flex item, so display:flex would silently
    // left-align the drawer's links.
    min-height: 4.4rem;
    color: var(--nav-link-color, var(--color-text));
    text-decoration: none;
    padding: 0.75rem;
    border-bottom: 0.1rem solid var(--border-color);
    font-weight: var(--font-weight-semibold);
    transition: all var(--transition-base);

    &:hover,
    &[aria-current='page'] {
      background-color: var(--color-background-light);
      color: var(--nav-link-hover-color, var(--color-primary));
    }

    &:focus-visible {
      outline: 0.2rem solid var(--color-primary);
      outline-offset: -0.2rem;
    }

  }

  /* Was `&:last-child` on the link itself. The link is no longer its list
     item's last child (a submenu toggle can follow it), so anchor on the item. */
  :deep(.header-mobile-menu__item:last-child > .header-mobile-menu__row > .header-mobile-menu__link) {
    border-bottom: none;
  }

  &__mobile-actions {
    display: flex;
    flex-direction: column;
    border-top: 0.1rem solid var(--border-color);
    padding: 0.5rem 0;
  }

  &__mobile-action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.75rem;
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
    transition: background-color var(--transition-base);

    &:hover { background-color: var(--color-background-light); }
    &:focus-visible {
      outline: 0.2rem solid var(--color-primary);
      outline-offset: -0.2rem;
    }
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-1rem); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    &__mobile-nav,
    &__mobile-nav--right,
    &__mobile-nav--left,
    &__drawer-backdrop { animation: none; }

    &__mobile-nav--drawer :deep(.header-mobile-menu__link) {
      animation: none;
    }
  }
}
</style>
