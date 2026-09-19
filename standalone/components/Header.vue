<template>
  <HeaderShell
    v-if="isEnabled"
    class="header-wrapper"
    :class="{ 'header-wrapper--morph': morphStyle }"
    :style="headerStyle"
    :shell-config="shellConfig"
    :logo-zone-config="logoZoneConfig"
    :nav-zone-config="navZoneConfig"
    :actions-zone-config="actionsZoneConfig"
    :logo-url="logo.url"
    :logo-alt="logo.alt"
    :compact-logo-url="compactLogoUrl"
    :logo-text="logoText"
    :home-url="urlPrefix || '/'"
    :menu-items="menuItems"
    :show-hub-return="headerSettings.showHubReturn === true"
    :hub-return-url="headerSettings.hubReturnUrl || '/'"
    :hub-return-text="localized(headerSettings.hubReturnText) || 'Back to main site'"
    :show-accent-bar="headerSettings.showAccentBar === true"
    :show-language-toggle="headerSettings.showLanguageToggle === true"
    :current-locale="locale"
    :language-label="locale === 'en-US' ? 'English' : locale"
    :sticky-top="stickyTop"
    :navigation-mode="navigationMode"
    :menu-label="localized(headerSettings.menuLabel)"
    :tagline="localized(headerSettings.tagline)"
    :drawer-config="drawerConfig"
    :drawer-footer-links="drawerFooterLinks"
    :drawer-legal="drawerLegal"
    :hide-wordmark="hideWordmark"
    :morph-style="morphStyle"
    :submenu-label-template="submenuLabelTemplate"
    @toggle-language="toggleLanguage"
  />
</template>

<script setup lang="ts">
import { computed, inject, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useClientConfig } from '~/shared/composables/useClientConfig'
import { useHeaderMorphProgress } from '~/shared/composables/useHeaderMorphProgress'
import { useLocalized } from '~/shared/composables/useLocalized'
import HeaderShell from './HeaderShell.vue'
import type { ChildSiteConfig } from '~/shared/types/previewMessages'
import type { HeaderShellConfig, ZoneConfig, HeaderNavigationMode, DrawerConfig, NavMenuItem } from '~/shared/types/headerZone'
import { DEFAULT_SHELL_CONFIG, DEFAULT_ZONE_CONFIG, DEFAULT_DRAWER_CONFIG, ZONE_TRANSFORM_ORIGINS, NAV_MAX_DEPTH } from '~/shared/types/headerZone'
import { RESOLVED_LAYOUT_KEY } from '~/shared/features/layout/layoutInjectionKey'
import type { ResolvedLayoutConfig } from '~/shared/types/layout'

const props = withDefaults(defineProps<{
  forceParentNav?: boolean
  stickyTop?: number
}>(), {
  forceParentNav: false,
  stickyTop: 0,
})

const { t, locale, availableLocales, setLocale } = useI18n()

// Localization for the whole header lives here; the shell and its zones take
// finished strings as props so they stay mountable without an i18n instance.
//
// `{label}` is vue-i18n's own interpolation syntax, so asking for the message
// raw consumed the placeholder and substituted an empty string — every submenu
// toggle shipped with the accessible name "Toggle submenu for". Passing the
// literal back in as the `label` parameter makes vue-i18n write the placeholder
// into its own output, so the zones still receive a template to fill per item
// and the locale files keep the natural `{label}` form.
const SUBMENU_LABEL_PLACEHOLDER = '{label}'
const submenuLabelTemplate = computed(() =>
  t('header.toggleSubmenu', { label: SUBMENU_LABEL_PLACEHOLDER }),
)
const { navigation } = useClientConfig()
const { getLocalizedValue } = useLocalized()
const childSiteContext = inject<Ref<ChildSiteConfig | null>>('childSiteContext', ref(null))
const resolvedLayout = inject<Ref<ResolvedLayoutConfig> | null>(RESOLVED_LAYOUT_KEY, null)

const layoutHeader = computed(() => resolvedLayout?.value?.header)
const isEnabled = computed(() => layoutHeader.value?.enabled !== false)
const hideWordmark = computed(() => layoutHeader.value?.hideWordmark === true)
const morphStyle = computed(() => layoutHeader.value?.morphStyle)

// The reference editorial-slide choreography completes within the first
// ~400px of scroll; glass-pill runs over the hero/first-section height.
const EDITORIAL_SLIDE_DISTANCE = 400
const { progress: morphProgress } = useHeaderMorphProgress(
  layoutHeader?.value?.morphStyle === 'editorial-slide' ? { distancePx: EDITORIAL_SLIDE_DISTANCE } : {},
)

const headerSettings = computed<Record<string, any>>(() => {
  if (!props.forceParentNav && childSiteContext.value?.navigation) {
    return (childSiteContext.value.navigation as any).header ?? {}
  }
  return (navigation.value as any)?.header ?? {}
})

function localized(value: unknown): string {
  return getLocalizedValue(value as any) || (typeof value === 'string' ? value : '')
}

const urlPrefix = computed(() => {
  if (props.forceParentNav) return ''
  const mountPath = childSiteContext.value?.mountPath
  return mountPath ? `/${mountPath}` : ''
})

function normalizeUrl(url: string): string {
  if (!url) return '#'
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url) || url.startsWith('#')) return url
  const normalized = url.startsWith('/') ? url : `/${url}`
  return urlPrefix.value ? `${urlPrefix.value}${normalized}` : normalized
}

/**
 * Parse a nav list into NavMenuItem[]. Handles both shapes the editor produces:
 * top-level entries are `blocks` (`{ type, settings }`), submenu entries are
 * `repeater` rows (flat objects) — `item.settings ?? item` covers both.
 *
 * Recursion stops at NAV_MAX_DEPTH because that is what the header chrome
 * paints. A heading (no url) keeps an empty string rather than '#' so the
 * renderers can tell "navigates nowhere" from "navigates to the current page".
 */
function parseLinkBlocks(blocks: unknown, keyPrefix: string, depth = 1): NavMenuItem[] {
  return ((blocks as any[]) ?? []).map((item: any, index: number): NavMenuItem => {
    const settings = item.settings ?? item
    const id = String(item.id ?? settings.id ?? `${keyPrefix}-${index}`)
    const children = depth < NAV_MAX_DEPTH
      ? parseLinkBlocks(settings.children, `${id}-child`, depth + 1)
      : []
    return {
      id,
      label: localized(settings.label),
      // A parent with children may legitimately have no destination.
      url: settings.url ? normalizeUrl(settings.url) : (children.length ? '' : '#'),
      openInNewTab: settings.openInNewTab === true,
      children,
    }
  }).filter(item => item.label)
}

const menuItems = computed(() => parseLinkBlocks(headerSettings.value.menuItems, 'nav'))
const drawerFooterLinks = computed(() => parseLinkBlocks(headerSettings.value.drawerFooterLinks, 'drawer-footer'))

// Editorial drawer legal line, derived — no setting to keep in sync.
const drawerLegal = computed(() =>
  drawerFooterLinks.value.length ? `© ${new Date().getFullYear()} ${localized(headerSettings.value.logoText)}`.trim() : '',
)

const logo = computed(() => {
  const value = headerSettings.value.logo
  return {
    url: typeof value === 'string' ? value : value?.url ?? '',
    alt: localized(headerSettings.value.logoAlt) || localized(headerSettings.value.logoText) || 'Home',
  }
})

const compactLogoUrl = computed(() => {
  const value = headerSettings.value.compactLogo
  return typeof value === 'string' ? value : value?.url ?? ''
})
const logoText = computed(() => logo.value.url ? '' : localized(headerSettings.value.logoText))

const shellConfig = computed<HeaderShellConfig>(() => {
  const value = headerSettings.value
  return {
    logoPosition: value.logoPosition ?? DEFAULT_SHELL_CONFIG.logoPosition,
    compactTrigger: {
      unit: value.compactTriggerUnit ?? DEFAULT_SHELL_CONFIG.compactTrigger.unit,
      value: value.compactTriggerValue ?? DEFAULT_SHELL_CONFIG.compactTrigger.value,
    },
    compactBackground: {
      mode: value.compactBgMode ?? DEFAULT_SHELL_CONFIG.compactBackground.mode,
      borderRadius: value.compactBgBorderRadius ?? DEFAULT_SHELL_CONFIG.compactBackground.borderRadius,
      targetOpacity: value.compactBgTargetOpacity ?? DEFAULT_SHELL_CONFIG.compactBackground.targetOpacity,
      insetPadding: value.compactBgInsetPadding ?? DEFAULT_SHELL_CONFIG.compactBackground.insetPadding,
    },
    expandedLayout: {
      gap: value.expandedGap ?? DEFAULT_SHELL_CONFIG.expandedLayout.gap,
      padding: value.expandedPadding ?? DEFAULT_SHELL_CONFIG.expandedLayout.padding,
      justify: value.expandedJustify ?? DEFAULT_SHELL_CONFIG.expandedLayout.justify,
      contentWidthMode: value.expandedContentWidthMode ?? DEFAULT_SHELL_CONFIG.expandedLayout.contentWidthMode,
    },
    compactLayout: {
      gap: value.compactGap ?? DEFAULT_SHELL_CONFIG.compactLayout.gap,
      padding: value.compactPadding ?? DEFAULT_SHELL_CONFIG.compactLayout.padding,
      justify: value.compactJustify ?? DEFAULT_SHELL_CONFIG.compactLayout.justify,
      contentWidthMode: value.compactContentWidthMode ?? DEFAULT_SHELL_CONFIG.compactLayout.contentWidthMode,
    },
    transitionDuration: value.transitionDuration ?? DEFAULT_SHELL_CONFIG.transitionDuration,
    transitionEasing: value.transitionEasing ?? DEFAULT_SHELL_CONFIG.transitionEasing,
    sequenceMode: value.sequenceMode ?? DEFAULT_SHELL_CONFIG.sequenceMode,
    sequenceStagger: value.sequenceStagger ?? DEFAULT_SHELL_CONFIG.sequenceStagger,
    sticky: value.sticky ?? true,
  }
})

function zoneConfig(prefix: 'logo' | 'nav' | 'actions'): ZoneConfig {
  const value = headerSettings.value
  const defaultScale = prefix === 'logo' ? 1.15 : 1
  return {
    visibleInExpanded: value[`${prefix}VisibleExpanded`] ?? true,
    visibleInCompact: value[`${prefix}VisibleCompact`] ?? true,
    expanded: {
      scale: value[`${prefix}ExpandedScale`] ?? defaultScale,
      offsetX: value[`${prefix}ExpandedOffsetX`] ?? 0,
      offsetY: value[`${prefix}ExpandedOffsetY`] ?? 0,
      opacity: value[`${prefix}ExpandedOpacity`] ?? 1,
    },
    compact: {
      scale: value[`${prefix}CompactScale`] ?? DEFAULT_ZONE_CONFIG.compact.scale,
      offsetX: value[`${prefix}CompactOffsetX`] ?? 0,
      offsetY: value[`${prefix}CompactOffsetY`] ?? 0,
      opacity: value[`${prefix}CompactOpacity`] ?? 1,
    },
    transformOrigin: ZONE_TRANSFORM_ORIGINS[prefix] ?? 'center center',
    transition: {
      duration: value[`${prefix}TransitionDuration`] ?? null,
      easing: value[`${prefix}TransitionEasing`] || null,
    },
  }
}

const logoZoneConfig = computed(() => zoneConfig('logo'))
const navZoneConfig = computed(() => zoneConfig('nav'))
const actionsZoneConfig = computed(() => zoneConfig('actions'))

const navigationMode = computed<HeaderNavigationMode>(() =>
  headerSettings.value.navigationMode === 'drawer' ? 'drawer' : 'inline',
)

const drawerConfig = computed<DrawerConfig>(() => {
  const value = headerSettings.value
  return {
    position: value.drawerPosition === 'left' ? 'left' : DEFAULT_DRAWER_CONFIG.position,
    itemSize: value.drawerItemSize ?? DEFAULT_DRAWER_CONFIG.itemSize,
    height: value.drawerHeight || DEFAULT_DRAWER_CONFIG.height,
    width: value.drawerWidth || DEFAULT_DRAWER_CONFIG.width,
    showBackdrop: value.drawerShowBackdrop ?? DEFAULT_DRAWER_CONFIG.showBackdrop,
    lockBodyScroll: value.drawerLockBodyScroll ?? DEFAULT_DRAWER_CONFIG.lockBodyScroll,
  }
})

const headerStyle = computed(() => {
  const palette = layoutHeader.value?.palette
  const style: Record<string, string> = {
    '--accent-bar-height': `${headerSettings.value.accentBarHeight ?? 4}px`,
  }
  if (palette?.bgColor) style['--header-bg-color'] = palette.bgColor
  if (palette?.textColor) style['--header-text-color'] = palette.textColor
  if (palette?.navLinkColor) style['--nav-link-color'] = palette.navLinkColor
  if (palette?.navLinkHoverColor) style['--nav-link-hover-color'] = palette.navLinkHoverColor
  if (palette?.accentBarColor) style['--accent-bar-color'] = palette.accentBarColor
  if (morphStyle.value) {
    // The SCSS blocks keyed on --morph-t own every visual of the choreography.
    // --morph-bg carries the scroll-faded background for the mobile branch
    // (desktop chrome stays transparent like the reference).
    const bgColor = palette?.bgColor ?? '#ffffff'
    const alpha = palette?.scrollFade === false ? 100 : Math.round(morphProgress.value * 100)
    style['--morph-t'] = String(morphProgress.value)
    style['--morph-bg'] = `color-mix(in srgb, ${bgColor} ${alpha}%, transparent)`
  }
  return style
})

function toggleLanguage() {
  const locales = availableLocales?.length ? availableLocales : ['en-US', 'fr-CA']
  const currentIndex = locales.indexOf(locale.value)
  setLocale(locales[(currentIndex + 1) % locales.length]!)
}
</script>

<style scoped>
.header-wrapper {
  background: var(--header-bg-color, var(--color-background, #fff));
  color: var(--header-text-color, var(--color-text, #202428));
}

/* Morph chrome: the wrapper paints no constant bar — background rides
   --morph-t inside the shell's choreography CSS. Stays sticky. */
.header-wrapper--morph {
  background: transparent;
}
</style>
