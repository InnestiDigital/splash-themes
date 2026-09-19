<template>
  <section
    class="page-header"
    :class="[`page-header--align-${contentAlignClass}`, coverClasses]"
    :style="headerStyles"
  >
    <div v-if="backgroundImage" data-target="background" class="page-header__overlay" aria-hidden="true" />
    <div class="page-header__container" :style="contentStyle">
      <nav v-if="showBreadcrumb" class="page-header__breadcrumb" aria-label="Breadcrumb">
        <NuxtLink to="/" class="page-header__breadcrumb-link">
          {{ $t('common.home', 'Home') }}
        </NuxtLink>
        <template v-for="(crumb, i) in breadcrumbTrail" :key="crumb.path">
          <span class="page-header__breadcrumb-sep" aria-hidden="true">/</span>
          <span
            v-if="i === breadcrumbTrail.length - 1"
            class="page-header__breadcrumb-current"
            aria-current="page"
          >
            {{ breadcrumbTitle || crumb.label }}
          </span>
          <NuxtLink v-else :to="crumb.path" class="page-header__breadcrumb-link">
            {{ crumb.label }}
          </NuxtLink>
        </template>
      </nav>

      <span
        v-if="localizedEyebrow"
        class="page-header__eyebrow"
        data-target="eyebrow"
        v-html="asHtml(localizedEyebrow)"
      ></span>

      <h1 data-target="heading" class="page-header__title" v-html="asHtml(localizedTitle)"></h1>

      <p v-if="subtitle" data-target="body" class="page-header__subtitle" v-html="asHtml(localizedSubtitle)"></p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { BackgroundRole, TextRole } from '~/shared/types/placement'
import { SPACING_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { useBlockSurface } from '~/shared/composables/useBlockSurface'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useClientConfig } from '~/shared/composables/useClientConfig'
import { buildBreadcrumbTrail } from './BreadcrumbNav.vue'

const { getLocalizedValue } = useLocalized()
const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  blocks?: Array<Record<string, unknown>>
  eyebrow?: string | Record<string, string>
  title?: string | Record<string, string>
  subtitle?: string | Record<string, string>
  showBreadcrumb?: boolean
  backgroundImage?: string
  background?: BackgroundRole
  textTone?: TextRole
  textAlign?: 'left' | 'center'
  internalPadding?: string
  surfaceStyle?: string
  coverHeight?: string
  contentAlignY?: string
  scrimStrength?: string
}>(), {
  showBreadcrumb: true,
  textAlign: 'left',
  internalPadding: 'md',
  surfaceStyle: 'none',
  coverHeight: 'auto',
  contentAlignY: 'top',
  scrimStrength: 'default',
})

const SURFACE_STYLE_MAP: Record<string, string> = {
  section: 'var(--section-bg)',
  surface: 'var(--section-surface)',
  accent: 'var(--section-accent)',
  transparent: 'transparent',
}

const { surfaceStyle: blockSurfaceStyle } = useBlockSurface(props, { fallbackBackground: 'transparent' })

const contentAlignClass = computed(() =>
  props.textAlign === 'center' ? 'center' : 'left'
)

// Editorial-cover modifiers. Each entry is emitted ONLY when its prop differs
// from its default, so the default path (auto / top / default) adds no classes
// and the rendered DOM stays byte-identical to the flat header.
const coverClasses = computed(() => {
  const classes: string[] = []
  if (props.coverHeight !== 'auto') {
    classes.push('page-header--cover', `page-header--h-${props.coverHeight}`)
  }
  if (props.contentAlignY !== 'top') {
    classes.push(`page-header--valign-${props.contentAlignY}`)
  }
  if (props.scrimStrength !== 'default') {
    classes.push(`page-header--scrim-${props.scrimStrength}`)
  }
  return classes
})

const localizedEyebrow = computed(() => getLocalizedValue(props.eyebrow))
const localizedTitle = computed(() => getLocalizedValue(props.title))
const localizedSubtitle = computed(() => getLocalizedValue(props.subtitle))

// Title is rendered as HTML in the heading but as plain text in the
// breadcrumb. After migration the title carries inline HTML (preset spans,
// bold marks, etc); the breadcrumb wants those stripped.
const breadcrumbTitle = computed(() => localizedTitle.value.replace(/<[^>]*>/g, ''))

// Full ancestor trail from the site-config pages tree (shared resolution with
// BreadcrumbNav). Falls back to a single current-page crumb when the route has
// no tree segments (e.g. the home route) so the trail never renders bare.
const route = useRoute()
const { config } = useClientConfig()
const breadcrumbTrail = computed(() => {
  const trail = buildBreadcrumbTrail(config.value?.pages, route.path, getLocalizedValue)
  if (trail.length === 0) return [{ path: route.path, label: breadcrumbTitle.value }]
  return trail
})

const headerStyles = computed(() => {
  const styles: Record<string, string> = {}
  // surfaceStyle (appearance) provides semantic background token
  if (props.surfaceStyle && props.surfaceStyle !== 'none') {
    styles.backgroundColor = SURFACE_STYLE_MAP[props.surfaceStyle] ?? 'transparent'
  }
  // The background role (style) overrides surfaceStyle. The `transparent` role
  // must REMOVE the key surfaceStyle just set — not merely decline to set one —
  // so the surface below shows through, as the legacy `delete` arm did.
  const surface = blockSurfaceStyle.value
  if (surface.backgroundColor === undefined) {
    delete styles.backgroundColor
  }
  Object.assign(styles, surface)
  if (props.textTone === undefined) {
    styles.color = 'var(--section-text, var(--color-text))'
  }
  if (props.backgroundImage) {
    styles.backgroundImage = `url(${props.backgroundImage})`
    styles.backgroundSize = 'cover'
    styles.backgroundPosition = 'center'
  }
  return styles
})

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  return style
})

</script>

<style lang="scss" scoped>
.page-header {
  position: relative;
  padding: var(--spacing-2xl) var(--spacing-md);

  // Layout collapse keys on the container, not the window (repo contract) —
  // the narrow admin preview pane steps down exactly like a phone.
  @container (max-width: 768px) {
    padding: var(--spacing-xl) var(--spacing-md);
  }

  &__overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
  }

  // ## Width authority
  // Outer scaffold width defers to --block-width-authority (fallback = old 120rem)
  // and inner text measure to --block-measure (fallback = old 60rem) so a section /
  // PlacementWrapper layoutConstraints can override the page-scaffold width via the
  // var contract WITHOUT piercing scoped styles. Default behavior is identical.
  &__container {
    position: relative;
    max-width: var(--block-width-authority, 120rem);
    margin: 0 auto;
    z-index: 1;
  }

  &--align-center &__container {
    text-align: center;
  }

  // Editorial cover — only active when coverHeight != auto. Turns the header
  // into a flex column so the content block can be vertically anchored.
  &--cover {
    display: flex;
    flex-direction: column;
  }

  &--h-short {
    min-height: 60vh;
  }

  &--h-tall {
    min-height: 80vh;
  }

  &--h-full {
    min-height: 100vh;
    min-height: 100svh; // progressive-enhance to small-viewport units
  }

  &--valign-center {
    justify-content: center;
  }

  &--valign-bottom {
    justify-content: flex-end;
  }

  // Scrim presets scale the opacity / gradient of the EXISTING black overlay —
  // no freeform hex color control (Color Override Freeze).
  &--scrim-soft &__overlay {
    background: rgba(0, 0, 0, 0.15);
  }

  &--scrim-strong &__overlay {
    background: rgba(0, 0, 0, 0.5);
  }

  &--scrim-gradient &__overlay {
    background: linear-gradient(to top, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.05));
  }

  &__breadcrumb {
    margin-block-end: var(--spacing-md);
    font-size: var(--font-size-sm);
  }

  &__breadcrumb-link {
    // The rendered word is ~33x12px — well under the 4.4rem touch floor. Symmetric
    // padding with a matching negative margin grows the element's OWN box (which is what
    // a tap target is; an ::after overlay would look right and measure unchanged) while
    // the row renders pixel-identically: an inline-block's vertical margins do collapse
    // out of the line box, unlike an inline element's.
    display: inline-block;
    padding: 1.6rem 0.6rem;
    margin: -1.6rem -0.6rem;
    color: inherit;
    opacity: 0.7;
    text-decoration: none;

    &:hover {
      opacity: 1;
      text-decoration: underline;
    }

    &:focus-visible {
      outline: 0.2rem solid currentColor;
      outline-offset: 0.2rem;
      border-radius: var(--border-radius);
    }
  }

  &__breadcrumb-sep {
    margin: 0 var(--spacing-xs);
    opacity: 0.5;
  }

  &__breadcrumb-current {
    font-weight: var(--font-weight-medium);
  }

  &__eyebrow {
    display: block;
    font-family: var(--rt-slot-eyebrow-family, var(--rt-role-eyebrow-family, inherit));
    font-size: var(--rt-slot-eyebrow-size, var(--rt-role-eyebrow-size, var(--font-size-sm)));
    font-weight: var(--rt-slot-eyebrow-weight, var(--rt-role-eyebrow-weight, var(--font-weight-medium)));
    line-height: var(--rt-slot-eyebrow-line-height, var(--rt-role-eyebrow-line-height, 1.4));
    letter-spacing: var(--rt-slot-eyebrow-letter-spacing, var(--rt-role-eyebrow-letter-spacing, 0.08em));
    text-transform: var(--rt-slot-eyebrow-text-transform, var(--rt-role-eyebrow-text-transform, uppercase));
    color: var(--rt-slot-eyebrow-color, var(--rt-role-eyebrow-color, inherit));
    opacity: 0.8;
    margin-block-end: var(--spacing-sm);
  }

  &__title {
    font-family: var(--rt-slot-heading-family, var(--rt-role-heading1-family, var(--font-family-heading, inherit)));
    font-size: var(--rt-slot-heading-size, var(--rt-role-heading1-size, var(--font-size-3xl)));
    font-weight: var(--rt-slot-heading-weight, var(--rt-role-heading1-weight, var(--font-weight-bold)));
    line-height: var(--rt-slot-heading-line-height, var(--rt-role-heading1-line-height, var(--line-height-tight)));
    letter-spacing: var(--rt-slot-heading-letter-spacing, var(--rt-role-heading1-letter-spacing, normal));
    text-transform: var(--rt-slot-heading-text-transform, var(--rt-role-heading1-text-transform, none));
    color: var(--rt-slot-heading-color, var(--rt-role-heading1-color, inherit));
    margin: 0 0 var(--spacing-xs);

    @media (max-width: $bp-md) {
      font-size: var(--font-size-2xl);
    }
  }

  &__subtitle {
    font-family: var(--rt-slot-body-family, var(--rt-role-body-family, inherit));
    font-size: var(--rt-slot-body-size, var(--rt-role-body-size, var(--font-size-lg)));
    font-weight: var(--rt-slot-body-weight, var(--rt-role-body-weight, inherit));
    line-height: var(--rt-slot-body-line-height, var(--rt-role-body-line-height, var(--line-height-relaxed)));
    letter-spacing: var(--rt-slot-body-letter-spacing, var(--rt-role-body-letter-spacing, normal));
    color: var(--rt-slot-body-color, var(--rt-role-body-color, inherit));
    margin: 0;
    opacity: 0.8;
    max-width: var(--block-measure, 60rem);

    .page-header--align-center & {
      margin-inline: auto;
    }
  }
}
</style>
