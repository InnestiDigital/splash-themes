<template>
  <!-- Configurable four-column footer grid. -->
  <footer
    v-if="isLayoutFooterEnabled && layout === 'grid'"
    id="site-footer"
    class="splash-footer splash-footer--grid"
    role="contentinfo"
    :style="layoutFooterStyle"
    :data-footer-reveal="isFooterReveal || undefined"
  >
    <div class="splash-footer__grid">
      <!-- Col 1: Logo + Diamond Icon + Email -->
      <div class="splash-footer__grid-col">
        <div class="splash-footer__logo-wrapper">
          <img
            v-if="logoImage.url"
            :src="logoImage.url"
            :alt="logoImage.alt"
            class="splash-footer__logo"
          />
<!-- Text-only fallback: any graphic brand mark comes from the `logo`
               media setting (or a BrandMark block), never from markup baked
               into the shared theme. -->
          <span v-else-if="logoText" class="splash-footer__logo-text" v-html="asHtml(logoText)"></span>
        </div>
        <a v-if="supportEmail" :href="`mailto:${supportEmail}`" class="splash-footer__grid-link splash-footer__grid-link--email">
          {{ supportEmail }}
        </a>
      </div>

      <!-- Col 2: Company info -->
      <div class="splash-footer__grid-col">
        <p v-if="companyName" class="splash-footer__company-name">{{ companyName }}</p>
        <p v-if="companyVat" class="splash-footer__company-detail">{{ companyVat }}</p>
        <div v-if="companyAddress" class="splash-footer__company-detail" v-html="asHtml(companyAddress)"></div>
        <a v-if="supportPhone" :href="`tel:${supportPhone.replace(/\s/g, '')}`" class="splash-footer__grid-link splash-footer__grid-link--phone">
          {{ supportPhone }}
        </a>
      </div>

      <!-- Col 3: Nav links -->
      <nav v-if="footerLinkItems.length > 0" class="splash-footer__grid-col" :aria-label="t('footer.links')">
        <ul class="splash-footer__grid-nav">
          <li v-for="(link, idx) in footerLinkItems" :key="idx">
            <a
              :href="link.url"
              class="splash-footer__grid-nav-link"
              :target="link.openInNewTab ? '_blank' : '_self'"
              :rel="link.openInNewTab ? 'noopener noreferrer' : ''"
            >
              {{ link.label }}
            </a>
          </li>
        </ul>
      </nav>

      <!-- Col 4: Social links -->
      <div v-if="showSocialLinks && socialLinkItems.length > 0" class="splash-footer__grid-col">
        <a
          v-for="(social, idx) in socialLinkItems"
          :key="idx"
          :href="social.url"
          class="splash-footer__grid-social-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ socialDisplayName(social.platform) }}
        </a>
      </div>
    </div>

    <!-- Bottom strip: 4-part copyright bar -->
    <div class="splash-footer__grid-copyright">
      <template v-if="copyrightStyle === 'structured'">
        <span class="splash-footer__grid-copyright-part">{{ copyrightParts.year }}</span>
        <span class="splash-footer__grid-copyright-part">{{ copyrightParts.rights }}</span>
        <span class="splash-footer__grid-copyright-part">{{ copyrightParts.madeBy }}</span>
        <a
          v-if="copyrightParts.privacyLabel && copyrightParts.privacyUrl"
          :href="prefixUrl(copyrightParts.privacyUrl)"
          class="splash-footer__grid-copyright-part splash-footer__grid-copyright-link"
        >{{ copyrightParts.privacyLabel }}</a>
        <span v-else-if="copyrightParts.privacyLabel" class="splash-footer__grid-copyright-part">{{ copyrightParts.privacyLabel }}</span>
      </template>
      <template v-else-if="copyrightText">
        <p v-html="asHtml(copyrightText)" class="splash-footer__grid-copyright-fallback"></p>
      </template>
      <!-- Back-to-top: plain fragment link — `#top` with no matching id is the
           HTML-defined "scroll to the top of the document" target, so no JS and
           no scroll handler. Label comes from theme i18n, never hardcoded. -->
      <!-- data-interactive: the editor preview treats bare anchors as
           select-not-navigate chrome; this one must keep scrolling in-preview. -->
      <a v-if="showBackToTop" href="#top" data-interactive="true" class="splash-footer__grid-copyright-part splash-footer__grid-copyright-link splash-footer__back-to-top">
        {{ t('footer.backToTop') }}
      </a>
    </div>
  </footer>

  <!-- Horizontal bar layout (original) -->
  <footer v-else-if="isLayoutFooterEnabled" id="footer" class="splash-footer" role="contentinfo" :style="layoutFooterStyle" :data-footer-reveal="isFooterReveal || undefined">
    <div class="splash-footer__inner">
      <!-- Logo -->
      <div class="splash-footer__logo-wrapper">
        <img
          v-if="logoImage.url"
          :src="logoImage.url"
          :alt="logoImage.alt"
          class="splash-footer__logo"
        />
        <span v-else-if="logoText" class="splash-footer__logo-text" v-html="asHtml(logoText)"></span>
      </div>

      <!-- Main content area: links + contact + social -->
      <div class="splash-footer__content">
        <!-- Link rows: each CMS column renders as one row of inline links -->
        <nav
          v-if="footerColumns.length > 0"
          class="splash-footer__links"
          :aria-label="t('footer.links')"
        >
          <ul
            v-for="(col, colIdx) in footerColumns"
            :key="colIdx"
            class="splash-footer__link-row"
          >
            <li v-for="(link, linkIdx) in col.links" :key="linkIdx">
              <a
                :href="link.url"
                class="splash-footer__link"
                :target="link.openInNewTab ? '_blank' : '_self'"
                :rel="link.openInNewTab ? 'noopener noreferrer' : ''"
              >
                {{ link.label }}
              </a>
            </li>
          </ul>
        </nav>

        <!-- Contact info -->
        <div v-if="supportEmail || supportPhone" class="splash-footer__contact">
          <a v-if="supportEmail" :href="`mailto:${supportEmail}`" class="splash-footer__contact-link">
            {{ supportEmail }}
          </a>
          <span v-if="supportEmail && supportPhone" class="splash-footer__contact-divider" aria-hidden="true">|</span>
          <a v-if="supportPhone" :href="`tel:${supportPhone.replace(/\s/g, '')}`" class="splash-footer__contact-link">
            {{ supportPhone }}
          </a>
        </div>

        <!-- Social links -->
        <div v-if="showSocialLinks && socialLinkItems.length > 0" class="splash-footer__social">
          <a
            v-for="(social, idx) in socialLinkItems"
            :key="idx"
            :href="social.url"
            class="splash-footer__social-link"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="social.platform"
          >
            <svg class="splash-footer__social-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path :d="socialIconPath(social.platform)" />
            </svg>
          </a>
        </div>

        <!-- Copyright -->
        <p v-if="copyrightText" class="splash-footer__copyright" v-html="asHtml(copyrightText)"></p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed, inject, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useClientConfig } from '~/shared/composables/useClientConfig'
import type { ChildSiteConfig } from '~/shared/types/previewMessages'
import { RESOLVED_LAYOUT_KEY } from '~/shared/features/layout/layoutInjectionKey'
import type { ResolvedLayoutConfig } from '~/shared/types/layout'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useViewport } from '~/shared/composables/useViewport'
import { BREAKPOINTS } from '~/shared/features/cms/composition/responsive'

const { getLocalizedValue } = useLocalized()
const props = withDefaults(defineProps<{
  forceParentNav?: boolean
}>(), {
  forceParentNav: false,
})

type FooterLink = { label: string; url: string; openInNewTab?: boolean }
type FooterColumn = { links: FooterLink[] }
type SocialLink = { platform: string; url: string }

const { navigation } = useClientConfig()
const childSiteContext = inject<Ref<ChildSiteConfig | null>>('childSiteContext', ref(null))
const { t } = useI18n()
const { innerWidth } = useViewport()

// --- Layout Chrome System integration -----------------------------------
// LayoutShell provides the resolved layout via inject. When present, the
// footer reads its `footer` block to apply layout-driven defaults
// (enabled flag, sticky-bottom positioning, palette overrides).
const resolvedLayout = inject<Ref<ResolvedLayoutConfig> | null>(RESOLVED_LAYOUT_KEY, null)
const layoutFooter = computed(() => resolvedLayout?.value?.footer)
const isLayoutFooterEnabled = computed(() => layoutFooter.value?.enabled !== false)

// Cover-reveal contract: when the layout pins the footer to the viewport
// bottom, the footer root opts into the parallax reveal. It pins UNDER the
// opaque page content (z-index 0 vs the content's z-index 1) and is
// progressively uncovered as the content's bottom edge scrolls past — a
// CSS-only reveal, no animation engine. LayoutShell keys its own :slotted
// rules + the content-opacity fallback on the same `data-footer-reveal` /
// `data-footer-reveal-active` attributes.
//
// DESKTOP-ONLY: the reveal is a desktop parallax. On mobile the footer is
// TALLER than the viewport, so `sticky; bottom:0` pins its bottom to the
// viewport bottom and pushes its top NEGATIVE, covering page chrome. Below the mobile
// breakpoint we drop the reveal entirely: the footer renders normal, in-flow,
// at the document bottom (z-index:1 via LayoutShell's :not([data-footer-reveal])
// rule). Consistent with this file's "mobile follows good practice, not ref
// parity" doctrine.
const isFooterReveal = computed(
  () => layoutFooter.value?.position === 'sticky-bottom' && innerWidth.value > BREAKPOINTS.md,
)

const layoutFooterStyle = computed(() => {
  const style: Record<string, string> = {}
  const lf = layoutFooter.value
  if (!lf) return style
  // Gate the pinned/behind positioning on isFooterReveal (viewport-aware), NOT
  // raw lf.position: on mobile the reveal is disabled and the footer must stay
  // a normal in-flow block. Inline style beats the scoped stylesheet, so if we
  // keyed this on lf.position the footer would still pin+sink on mobile even
  // though data-footer-reveal is absent.
  if (isFooterReveal.value) {
    style.position = 'sticky'
    style.bottom = '0'
    // Sit behind the opaque page content so it reads as revealed-from-behind.
    style.zIndex = '0'
  }
  const p = lf.palette
  if (p) {
    // Feed the existing --footer-* var cascade rather than inline color props.
    // Interior elements (grid variant headings, nav links, contact info) read
    // `var(--footer-bg-color, ...)` / `var(--footer-text-color, ...)` — setting
    // them at the footer root propagates through every nested rule. Direct
    // inline backgroundColor would only paint the outermost <footer> and leave
    // hardcoded interior colors untouched (which is what made the panel feel
    // like it didn't work).
    if (p.bgColor) style['--footer-bg-color'] = p.bgColor
    if (p.textColor) style['--footer-text-color'] = p.textColor
    if (p.linkColor) style['--footer-link-color'] = p.linkColor
  }
  return style
})

const urlPrefix = computed(() => {
  if (props.forceParentNav) return ''
  return childSiteContext.value?.mountPath ? `/${childSiteContext.value.mountPath}` : ''
})

function prefixUrl(url: string): string {
  if (!urlPrefix.value) return url
  if (!url || url === '#' || url.startsWith('http') || url.startsWith('//')) return url
  const normalized = url.startsWith('/') ? url : '/' + url
  return urlPrefix.value + normalized
}

const footerNav = computed(() => {
  if (!props.forceParentNav) {
    const child = childSiteContext.value
    if (child?.navigation) return (child.navigation as any)?.footer ?? {}
  }
  return (navigation.value as any)?.footer ?? {}
})

// Layout mode
const layout = computed(() => footerNav.value.layout ?? 'horizontal-bar')

// Logo
const logoImage = computed(() => ({
  url: footerNav.value.logo || '',
  alt: getLocalizedValue(footerNav.value.logoAlt) || t('footer.logoAlt'),
}))

const logoText = computed(() => {
  if (logoImage.value.url) return ''
  return getLocalizedValue(footerNav.value.logoText) || t('footer.logoText')
})

// Copyright — single-text fallback
const copyrightText = computed(() => {
  if (footerNav.value.copyright) return getLocalizedValue(footerNav.value.copyright)
  const year = new Date().getFullYear()
  return `© ${year} ${t('footer.copyright')}`
})

// Copyright — structured 4-part bottom strip (grid layout only)
const copyrightParts = computed(() => ({
  year: getLocalizedValue(footerNav.value.copyrightYear),
  rights: getLocalizedValue(footerNav.value.copyrightRights),
  madeBy: getLocalizedValue(footerNav.value.copyrightMadeBy),
  privacyLabel: getLocalizedValue(footerNav.value.copyrightPrivacyLabel),
  privacyUrl: footerNav.value.copyrightPrivacyUrl || '',
}))

// Copyright — the strip shape is an explicit author choice, not a guess from
// which keys happen to be filled in. `copyrightStyle` is newer than the parts
// themselves, though: a footer authored before the setting existed stores no
// value at all, and reading the schema default ('simple') for it would make an
// already-published structured strip disappear on deploy. So an absent value
// falls back to whatever the stored parts imply — the pre-setting behaviour —
// and only an explicit choice overrides it.
const copyrightStyle = computed<'simple' | 'structured'>(() => {
  const stored = footerNav.value.copyrightStyle
  if (stored === 'structured' || stored === 'simple') return stored
  const parts = copyrightParts.value
  return parts.year || parts.rights || parts.madeBy || parts.privacyLabel
    ? 'structured'
    : 'simple'
})

// Back-to-top link in the grid copyright strip — off unless the footer config
// opts in.
const showBackToTop = computed(() => footerNav.value.showBackToTop ?? false)

// Contact
const supportEmail = computed(() => footerNav.value.supportEmail || '')
const supportPhone = computed(() => footerNav.value.supportPhone || '')

// Company info (grid layout)
const companyName = computed(() => footerNav.value.companyName || '')
const companyVat = computed(() => footerNav.value.companyVat || '')
const companyAddress = computed(() => getLocalizedValue(footerNav.value.companyAddress))

// Social
const showSocialLinks = computed(() => footerNav.value.showSocialLinks ?? false)
const socialLinkItems = computed((): SocialLink[] => {
  const raw: any[] = footerNav.value.socialLinks || []
  return raw.filter((s: any) => s.url).map((s: any) => ({ platform: s.platform || 'link', url: s.url }))
})

function socialDisplayName(platform: string): string {
  const names: Record<string, string> = {
    facebook: 'Facebook', instagram: 'Instagram', twitter: 'X', linkedin: 'LinkedIn', youtube: 'YouTube', tiktok: 'TikTok',
  }
  return names[platform] || platform
}

// Footer links — flat list for grid layout, or columns for horizontal-bar
const footerLinkItems = computed((): FooterLink[] => {
  const raw: any[] = footerNav.value.footerLinks || []
  return raw.map((item: any) => {
    const s = item.settings || item
    return {
      label: getLocalizedValue(s.label),
      url: prefixUrl(s.url || '/'),
      openInNewTab: s.openInNewTab ?? false,
    }
  })
})

const footerColumns = computed((): FooterColumn[] => {
  const cols: any[] = footerNav.value.columns || []
  return cols.map((col: any) => ({
    links: (col.links || []).map((link: any) => ({
      label: getLocalizedValue(link.label),
      url: prefixUrl(link.url || '/'),
      openInNewTab: link.openInNewTab ?? false,
    })),
  }))
})

// SVG paths for horizontal-bar social icons
const SOCIAL_ICON_PATHS: Record<string, string> = {
  facebook: 'M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z',
  twitter: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
  linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  youtube: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  tiktok: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
}

function socialIconPath(platform: string): string {
  return SOCIAL_ICON_PATHS[platform] || 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z'
}
</script>

<style lang="scss" scoped>
// --- Shared element face (both layout variants) ---
// The logo wrapper's flex box, the logo image's intrinsic sizing, and the
// logo-text font-family are identical across the grid and horizontal-bar
// trees. They live here once; only genuine per-variant deltas (logo height,
// logo-text size/weight/color defaults, the legacy dimmed opacity, the grid
// row gap) remain inside the variant blocks below. Element rules only — the
// root-level chrome (background, border, display) stays per-variant so the
// bare `.splash-footer` selector never paints the grid card.
.splash-footer {
  .splash-footer__logo-wrapper {
    display: flex;
    align-items: center;
  }

  .splash-footer__logo {
    width: auto;
    object-fit: contain;
    display: block;
  }

  .splash-footer__logo-text {
    font-family: var(--rt-slot-logoText-family, var(--rt-role-heading4-family, var(--font-family-heading)));
  }
}

// --- Grid layout (editorial-style 4-column footer) ---
.splash-footer--grid {
  // Reference uses a slate-blue rounded card with all four corners rounded
  // and generous side margins. The fallback chain is --footer-bg-color (set by
  // the layout's footer palette) → --color-dark-bg (the tenant's `darkBgColor`
  // theme setting) → a dark neutral.
  //
  // NOT --color-editorial-blue-dark: that token is a fixed #1B8AB7, so every
  // tenant whose layout defines no footer palette inherited the design
  // reference's teal no matter what palette they configured. --color-dark-bg is
  // the palette-driven token for exactly this ("dark surface") role, and it
  // pairs with --footer-text-color's white default at AA on any dark value.
  //
  // Both insets scale with the viewport instead of staying at the reference's
  // desktop 4rem: on a 390px phone fixed 4rem card margins ate ~20% of the
  // width. --footer-inset-x is shared by the grid AND the copyright strip so
  // the two rows stay aligned at every width (they used to drift apart when
  // only the grid's padding shrank at the breakpoint).
  //
  // Card margin capped at 2rem (~20px) to match the reference's near-full-bleed
  // band (x:20-1418, ~1398px wide) rather than the earlier 4rem inset that read
  // as a smaller floating card.
  --footer-card-margin: clamp(1.2rem, 2.5vw, 2rem);
  --footer-inset-x: clamp(2rem, 4vw, 4rem);
  background-color: var(--footer-bg-color, var(--color-dark-bg, #1a1a1a));
  color: var(--footer-text-color, #FFFFFF);
  border-top: none;
  border-radius: 1.6rem;
  margin: 0 var(--footer-card-margin) var(--footer-card-margin);

  .splash-footer__grid {
    max-width: var(--container-max-width);
    margin: 0 auto;
    // Taller vertical rhythm to match the reference band (~448px vs the old
    // ~345px); the near-full-bleed card carries more top/bottom breathing room.
    padding: 7.5rem var(--footer-inset-x) 4rem;
    display: grid;
    grid-template-columns: 1.5fr 1.5fr 1fr 1fr;
    gap: 3rem;

    @media (max-width: $bp-md) {
      grid-template-columns: 1fr 1fr;
      padding: 3rem var(--footer-inset-x) 2rem;
    }

    @media (max-width: $bp-sm) {
      // Keep a 2x2 pairing below sm instead of a single-column stack: the
      // 12-link one-column stack produced a ~991px-tall footer at 390px
      // (taller than the viewport). Pairing the four columns 2x2 roughly
      // halves footer height while each link keeps its ≥4.4rem mobile tap box.
      grid-template-columns: 1fr 1fr;
      gap: 2.4rem 1.6rem;
    }
  }

  .splash-footer__grid-col {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }

  .splash-footer__logo-wrapper {
    // display:flex + align-items:center hoisted to the shared .splash-footer block.
    flex-direction: row;
    gap: 0.8rem;
  }

  .splash-footer__logo-text {
    // font-family hoisted to the shared .splash-footer block.
    font-size: var(--rt-slot-logoText-size, var(--rt-role-heading4-size, 2.4rem));
    font-weight: var(--rt-slot-logoText-weight, var(--rt-role-heading4-weight, 400));
    color: var(--footer-text-color, #FFFFFF);
    line-height: 1;
  }

  .splash-footer__logo {
    // width/object-fit/display hoisted to the shared .splash-footer block.
    height: 3.2rem;
  }

  // Contact links (email in col 1, phone in col 2). The reference gives them
  // NO underline and different treatments: email is large navy, phone is white
  // to match the company name it sits beside. Weight stays 400 (Sul Sans has
  // Regular only). Sizes are explicit rem (1rem = 10px), not the role-token var
  // chain, which resolves down to ~12px and fights the ref sizing.
  // Hover is an UNDERLINE, not an opacity fade. `opacity: 0.8` composited the
  // link toward the accent card behind it and dropped the navy from 4.56:1 to
  // 3.55:1 — WCAG applies to every state, so the old affordance broke contrast
  // exactly when the pointer was on the link. Underline costs no contrast and
  // matches the copyright link's existing hover.
  .splash-footer__grid-link {
    text-decoration: none;
    font-weight: 400;
    transition: text-decoration-color 200ms;

    &:hover { text-decoration: underline; text-underline-offset: 0.2em; }
  }

  // Email — 25px navy.
  //
  // #0C1920 is the design reference's slate navy (#1E3D4F) at 40% lightness —
  // each channel scaled by the same factor, so hue and saturation are the
  // reference's, only deeper. The reference value itself measured 2.92:1 on the
  // #1B8AB7 accent card: a WCAG AA failure at EVERY size here (20px nav/social
  // links need 4.5:1; even the 25px email link needs 3:1 as large text and
  // missed it). #0C1920 measures 4.57:1. Same precedent as the copyright line
  // below, which already left the reference's grey for the same reason.
  //
  // Ceiling worth knowing before anyone tries to fix the WHITE type on this
  // card the same way: against #1B8AB7, pure white tops out at 3.85:1 and pure
  // black at 5.46:1. Light type CANNOT reach AA on this background — only
  // darkening the card itself can, and that is a brand decision, not a CSS one.
  // Every remaining sub-4.5 element on this card (company name/detail, phone,
  // logo text, legal row) is light type and sits under that ceiling.
  .splash-footer__grid-link--email {
    font-size: 2.5rem;
    color: var(--footer-link-color, var(--footer-text-color, #FFFFFF));
  }

  // Phone — 20px white, matching the company name in its column.
  .splash-footer__grid-link--phone {
    font-size: 2.0rem;
    color: var(--footer-text-color, #FFFFFF);
  }

  // Company name — regular weight to keep the legal line visually quiet.
  .splash-footer__company-name {
    margin: 0;
    font-weight: 400;
    font-size: 2.0rem;
    color: var(--footer-text-color, #FFFFFF);
  }

  .splash-footer__company-detail {
    margin: 0;
    font-size: 1.4rem;
    color: var(--footer-text-color, rgba(255, 255, 255, 0.85));
    opacity: 0.85;
  }

  .splash-footer__grid-nav {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  // Nav links — 20px navy, regular weight, no underline when idle (underlined
  // on hover; see the .splash-footer__grid-link note on why the old opacity
  // fade had to go). Explicit rem, not the role-token size var (which collapses
  // to ~12px against the ref's 20px).
  .splash-footer__grid-nav-link {
    font-family: var(--rt-slot-navLink-family, var(--rt-role-label-family, inherit));
    font-size: 2.0rem;
    font-weight: 400;
    color: var(--footer-link-color, var(--footer-text-color, #FFFFFF));
    text-decoration: none;
    transition: text-decoration-color 200ms;

    &:hover { text-decoration: underline; text-underline-offset: 0.2em; }
  }

  // Social links (Facebook / Instagram / LinkedIn) — same treatment as nav
  // links: 20px navy, regular weight, no idle underline.
  .splash-footer__grid-social-link {
    display: block;
    color: var(--footer-link-color, var(--footer-text-color, #FFFFFF));
    text-decoration: none;
    font-size: 2.0rem;
    font-weight: 400;
    transition: text-decoration-color 200ms;

    &:hover { text-decoration: underline; text-underline-offset: 0.2em; }
  }

  // No divider hairline — the reference legal row sits directly on the card
  // with no rule above it.
  .splash-footer__grid-copyright {
    max-width: var(--container-max-width);
    margin: 0 auto;
    padding: 2rem var(--footer-inset-x) 4rem;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.8rem;
  }

  // Legal row ('©2026 … All rights reserved.') — legibility floor applied.
  // Was 1.0rem (10px) in hardcoded grey #A6A6A6 on the #1B8AB7 accent footer
  // background: measured contrast 1.59:1, a severe WCAG failure at 10px.
  // Now 1.2rem (the prose floor) in the footer's OWN text colour muted by
  // opacity (same pattern as the fallback line below, so a custom
  // --footer-text-color / --footer-bg-color pair stays coherent instead of
  // being overridden by a hardcoded grey): measured ~3.15:1 on the default
  // accent background. Still short of AA (4.5:1) — closing that gap requires
  // DARKENING the accent footer background, which is a brand decision and
  // deliberately out of scope here. The link variant's :hover opacity:1 now
  // actually does something (it was a no-op against a full-opacity colour).
  .splash-footer__grid-copyright-part {
    margin: 0;
    font-family: 'Inter', sans-serif;
    font-size: var(--font-size-sm, 1.2rem);
    color: var(--footer-text-color, #FFFFFF);
    opacity: 0.82;
    white-space: nowrap;
  }

  .splash-footer__grid-copyright-link {
    text-decoration: none;
    transition: opacity 200ms;

    &:hover { opacity: 1; text-decoration: underline; text-underline-offset: 0.3em; }
  }

  .splash-footer__grid-copyright-fallback {
    margin: 0;
    font-size: 1.2rem;
    color: var(--footer-text-color, #FFFFFF);
    opacity: 0.6;
    width: 100%;
    text-align: center;
  }

  // --- Mobile: meet intrinsic tap-target + readability standards (≥44px
  // touch boxes, ≥14px type). The desktop footer stays ref-faithful (small
  // chrome to match the readymag reference); these rules apply ONLY ≤$bp-md,
  // where the parity asymmetry says the rebuild must follow good mobile
  // practice (tappable, readable), NOT diff against the ref's absent mobile. ---
  @media (max-width: $bp-md) {
    .splash-footer__grid-link,
    .splash-footer__grid-nav-link,
    .splash-footer__grid-social-link,
    .splash-footer__grid-copyright-link {
      min-width: 4.4rem;
      min-height: 4.4rem;
      display: inline-flex;
      align-items: center;
    }

    .splash-footer__grid-link,
    .splash-footer__grid-nav-link,
    .splash-footer__grid-social-link,
    .splash-footer__company-name,
    .splash-footer__company-detail {
      font-size: 1.5rem;
    }

    .splash-footer__grid-copyright-part,
    .splash-footer__grid-copyright-fallback {
      font-size: 1.3rem;
    }
  }
}

// --- Horizontal bar layout (original) ---
.splash-footer:not(.splash-footer--grid) {
  background-color: var(--footer-bg-color, var(--color-background));
  color: var(--footer-text-color, var(--color-text-light));
  border-top: 1px solid var(--border-color, #E8E8E8);
  min-height: 8rem;
  display: flex;
  align-items: center;

  .splash-footer__inner {
    width: 100%;
    max-width: var(--container-max-width);
    margin: 0 auto;
    padding: 3.2rem 2.4rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2.4rem;

    @media (max-width: $bp-md) {
      flex-direction: column;
      align-items: center;
      gap: 1.6rem;
    }
  }

  // display:flex + align-items:center hoisted to the shared .splash-footer block.
  .splash-footer__logo-wrapper { flex-shrink: 0; }

  .splash-footer__logo {
    // width/object-fit/display hoisted to the shared .splash-footer block.
    height: 2.4rem;
    opacity: 0.6;
  }

  .splash-footer__logo-text {
    // font-family hoisted to the shared .splash-footer block.
    font-size: var(--rt-slot-logoText-size, var(--rt-role-heading4-size, 1.6rem));
    font-weight: var(--rt-slot-logoText-weight, var(--rt-role-heading4-weight, 500));
    color: var(--rt-slot-logoText-color, var(--rt-role-heading4-color, var(--color-text-light)));
  }

  .splash-footer__content {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 2.4rem;
    flex: 1;
    justify-content: flex-end;
    flex-wrap: wrap;

    @media (max-width: $bp-md) {
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
  }

  .splash-footer__links {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 2.4rem;
  }

  .splash-footer__link-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem 2.0rem;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .splash-footer__link {
    font-family: var(--rt-slot-navLink-family, var(--rt-role-label-family, inherit));
    font-size: var(--rt-slot-navLink-size, var(--rt-role-label-size, 1.1rem));
    font-weight: var(--rt-slot-navLink-weight, var(--rt-role-label-weight, inherit));
    color: var(--rt-slot-navLink-color, var(--rt-role-label-color, var(--footer-text-color, var(--color-text-light))));
    text-decoration: none;
    white-space: nowrap;
    transition: color 200ms;

    &:hover { color: var(--color-text, #222222); }
  }

  .splash-footer__contact {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    font-size: 1.1rem;
  }

  .splash-footer__contact-link {
    color: var(--footer-text-color, var(--color-text-light));
    text-decoration: none;
    transition: color 200ms;
    &:hover { color: var(--color-text, #222222); }
  }

  .splash-footer__contact-divider { color: var(--border-color, #E8E8E8); }

  .splash-footer__social {
    display: flex;
    align-items: center;
    gap: 1.2rem;
  }

  .splash-footer__social-link {
    color: var(--footer-text-color, var(--color-text-light));
    transition: color 200ms;
    &:hover { color: var(--color-text, #222222); }
  }

  .splash-footer__social-icon {
    width: 1.8rem;
    height: 1.8rem;
    display: block;
  }

  .splash-footer__copyright {
    margin: 0;
    font-size: 1.1rem;
    color: var(--rt-slot-copyright-color, var(--rt-role-caption-color, var(--footer-text-color, var(--color-text-light))));
    opacity: 0.8;
  }
}
</style>
