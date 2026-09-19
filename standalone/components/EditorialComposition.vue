<template>
  <section
    class="editorial-composition"
    :class="rootClasses"
    :style="rootStyles"
    data-target="root"
    ref="containerRef"
  >
    <!-- Composed mode (desktop/tablet) -->
    <div v-if="layoutMode !== 'mobile'" class="editorial-composition__canvas">
      <!-- Groups (with floaters nested inside their anchor group) -->
      <div
        v-for="group in activeGroups"
        :key="group.id"
        class="editorial-composition__group"
        :class="`editorial-composition__group--${group.id}`"
        :style="groupStyles[group.id]"
      >
        <!-- Group items (in flow) -->
        <div class="editorial-composition__group-content">
          <div
            v-for="item in groupItems(group)"
            :key="item.id"
            class="editorial-composition__item"
            :class="`editorial-composition__item--${item.role}`"
            :data-target="item.role"
            :data-target-id="item.id"
          >
            <img
              v-if="item.media"
              :src="item.media.src"
              :alt="localizeMedia(item.media)"
              class="editorial-composition__media"
              :style="mediaStyle(item)"
            />
            <div
              v-if="item.textContent"
              class="editorial-composition__text"
              :class="`editorial-composition__text--${item.role}`"
              v-html="safeLocalize(item.textContent)"
            />
          </div>
        </div>

        <!-- Floaters anchored to this group (CSS-positioned inside) -->
        <div
          v-for="item in floatersForGroup(group.id)"
          :key="item.id"
          class="editorial-composition__floater"
          :class="floaterClasses(item)"
          :data-target="item.role"
          :data-target-id="item.id"
        >
          <div
            v-if="item.textContent"
            class="editorial-composition__text"
            :class="`editorial-composition__text--${item.role}`"
            v-html="safeLocalize(item.textContent)"
          />
          <img
            v-if="item.media"
            :src="item.media.src"
            :alt="localizeMedia(item.media)"
            class="editorial-composition__media"
            :style="mediaStyle(item)"
          />
        </div>
      </div>
    </div>

    <!-- Stacked mode (mobile) -->
    <div v-else class="editorial-composition__stack">
      <div
        v-for="item in stackedItems"
        :key="item.id"
        class="editorial-composition__stack-item"
        :class="`editorial-composition__stack-item--${item.role}`"
        :data-target="item.role"
        :data-target-id="item.id"
      >
        <img
          v-if="item.media"
          :src="item.media.src"
          :alt="localizeMedia(item.media)"
          class="editorial-composition__media"
          :style="mediaStyle(item)"
        />
        <div
          v-if="item.textContent"
          class="editorial-composition__text"
          :class="`editorial-composition__text--${item.role}`"
          v-html="safeLocalize(item.textContent)"
        />
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="visibleItems.length === 0" class="editorial-composition__empty">
      No items configured
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BackgroundRole } from '~/shared/types/placement'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBlockSurface } from '~/shared/composables/useBlockSurface'
import { sanitizeHtmlString } from '~/shared/tiptap/sanitizeHtmlString'
import { renderTipTapToHtml } from '~/shared/tiptap/renderTipTapToHtml'
import { isTipTapDocument } from '~/shared/tiptap/types'
import { compositionSolver } from '~/shared/features/cms/composition/solver'
import { getTemplate } from '~/shared/features/cms/composition/templates'
import { getLayoutMode, applyTabletOverrides, getStackItems } from '~/shared/features/cms/composition/responsive'
import type {
  CompositionItem, CompositionKnobs, CompositionMediaRef,
  ResolvedLayout, LayoutGroup,
} from '~/shared/features/cms/composition/types'
import { DEFAULT_KNOBS } from '~/shared/features/cms/composition/types'

const props = withDefaults(defineProps<{
  templateId?: string
  items?: CompositionItem[]
  knobs?: CompositionKnobs
  // SPL-120: editor-facing slider/select fields. Take precedence over the
  // legacy `knobs` object when provided. Coerced into a knobs-shaped object
  // for the solver via `effectiveKnobs` below.
  dominance?: number | string
  overlap?: number | string
  alignment?: string
  height?: 'auto' | 'viewport' | 'large' | 'medium'
  background?: BackgroundRole
}>(), {
  templateId: 'asymmetric-hero',
  items: () => [],
  knobs: () => ({ ...DEFAULT_KNOBS }),
  height: 'large',
})

// SPL-120: merge editor-facing knob fields into the object the solver
// consumes. Top-level fields win over the legacy hidden `knobs` object so
// new content reflects slider positions while old content stays at the
// hidden defaults.
const effectiveKnobs = computed<CompositionKnobs>(() => ({
  ...props.knobs,
  ...(props.dominance !== undefined ? { dominance: props.dominance as any } : {}),
  ...(props.overlap !== undefined ? { overlap: props.overlap as any } : {}),
  ...(props.alignment !== undefined ? { alignment: props.alignment as any } : {}),
}))

const { locale } = useI18n()
const containerRef = ref<HTMLElement | null>(null)
const containerWidth = ref(1200)

// ── Template ──

const template = computed(() => getTemplate(props.templateId))

// ── Localization ──

function localize(value: Record<string, string> | undefined): string {
  if (!value) return ''
  const picked = value[locale.value] ?? value['en-US'] ?? Object.values(value)[0]
  if (typeof picked === 'string') return picked
  return ''
}

/**
 * Localize and sanitize/render a textContent locale map before binding to
 * v-html. EditorialComposition items store textContent as a locale-keyed
 * map whose values can be EITHER pre-rendered HTML strings (legacy / seed
 * content) OR TipTap JSON docs (saved through RoleCard's TRichTextEditor).
 *
 * The composition's `items` field is declared `type: "hidden"` in the block
 * schema, so transformRichtextFields does NOT pre-render the JSON during
 * publish/preview. We do the rendering here at runtime instead, keeping
 * the storage shape symmetric with other richtext fields while preserving
 * the legacy string path for back-compat.
 *
 * Block mode renders <p>...</p> per paragraph — matches the wrapper-CSS
 * cascade keyed on .editorial-composition__text--<role>.
 */
function safeLocalize(value: Record<string, any> | undefined): string {
  if (!value) return ''
  const picked = value[locale.value] ?? value['en-US'] ?? Object.values(value)[0]
  if (typeof picked === 'string') return sanitizeHtmlString(picked)
  if (isTipTapDocument(picked)) return renderTipTapToHtml(picked, EMPTY_PRESET_KEYS)
  return ''
}

const EMPTY_PRESET_KEYS = new Set<string>()

function localizeMedia(media: CompositionMediaRef): string {
  if (!media.alt) return ''
  return localize(media.alt)
}

function mediaStyle(item: CompositionItem): Record<string, string> {
  const styles: Record<string, string> = {}
  if (item.media?.focalPoint) {
    styles.objectPosition = `${item.media.focalPoint.x * 100}% ${item.media.focalPoint.y * 100}%`
  }
  if (item.media?.aspectHint) {
    styles.aspectRatio = String(item.media.aspectHint)
  } else if (template.value?.defaultMediaAspect?.[item.role]) {
    styles.aspectRatio = String(template.value.defaultMediaAspect[item.role])
  }
  return styles
}

// ── Visible Items ──

const visibleItems = computed(() => props.items.filter(i => i.visible))

// ── Layout Mode ──

const layoutMode = computed(() => {
  if (!template.value) return 'desktop'
  return getLayoutMode(containerWidth.value, template.value.responsive)
})

// ── Active Groups (with visible items) ──

const activeGroups = computed(() => {
  if (!template.value) return []
  const visibleRoles = new Set(visibleItems.value.map(i => i.role))
  return template.value.groups.filter(g => g.roles.some(r => visibleRoles.has(r)))
})

// ── Items per group ──

function groupItems(group: LayoutGroup): CompositionItem[] {
  return group.roles
    .flatMap(role => visibleItems.value.filter(i => i.role === role))
}

// ── Floating items (grouped by anchor) ──

function floatersForGroup(groupId: string): CompositionItem[] {
  if (!template.value) return []
  return Object.entries(template.value.floaters)
    .filter(([, placement]) => placement.anchor === groupId)
    .flatMap(([role]) => visibleItems.value.filter(i => i.role === role))
}

function floaterClasses(item: CompositionItem): string[] {
  if (!template.value) return []
  const placement = template.value.floaters[item.role]
  if (!placement) return []
  return [
    `editorial-composition__floater--${placement.region}`,
    `editorial-composition__floater--${item.role}`,
  ]
}

// ── Solved Layout ──

const resolvedLayout = computed<ResolvedLayout>(() => {
  if (!template.value) return {}
  let tpl = template.value
  if (layoutMode.value === 'tablet') {
    tpl = {
      ...tpl,
      groups: applyTabletOverrides(tpl.groups, tpl.responsive),
    }
  }
  return compositionSolver(tpl, props.items, effectiveKnobs.value, containerWidth.value)
})

const groupStyles = computed(() => {
  const styles: Record<string, Record<string, string>> = {}
  for (const group of activeGroups.value) {
    const rect = resolvedLayout.value[`group:${group.id}`]
    if (rect) {
      styles[group.id] = {
        position: 'absolute',
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        zIndex: String(rect.zIndex),
      }
    }
  }
  return styles
})

// Floaters are now CSS-positioned inside their anchor group — no solver styles needed

// ── Stacked Items (mobile) ──

const stackedItems = computed(() => {
  if (!template.value) return visibleItems.value
  return getStackItems(props.items, template.value.responsive)
})

// ── Styles ──

const rootClasses = computed(() => [
  `editorial-composition--height-${props.height}`,
])

const { surfaceStyle } = useBlockSurface(props, { fallbackBackground: 'section' })

const rootStyles = computed(() => {
  const styles: Record<string, string> = { ...surfaceStyle.value }
  return styles
})

// ── ResizeObserver ──

let observer: ResizeObserver | null = null

onMounted(() => {
  if (!containerRef.value) return
  observer = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (entry) containerWidth.value = entry.contentRect.width
  })
  observer.observe(containerRef.value)
  containerWidth.value = containerRef.value.clientWidth
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<style lang="scss" scoped>
.editorial-composition {
  position: relative;
  overflow: hidden;

  &--height-auto { min-height: 200px; }
  &--height-viewport { min-height: 100vh; }
  &--height-large { min-height: 75vh; }
  &--height-medium { min-height: 50vh; }

  &__canvas {
    position: relative;
    width: 100%;
    min-height: inherit;
  }

  &__group {
    position: relative; // for floater positioning

    &-content {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 10vh 8% 10vh 8%;
      min-height: inherit;
      justify-content: center;
    }

    // Media groups: no padding, fill the section height
    &--media,
    &--media-accent {
      height: 100%;
    }

    &--media &-content,
    &--media-accent &-content {
      padding: 0;
      justify-content: stretch;
      height: 100%;
    }

    // Media cluster: stacked images with overlap
    &--media-cluster {
      height: 100%;
    }

    &--media-cluster &-content {
      padding: 0;
      height: 100%;
      display: grid;
      grid-template-rows: 1fr;
      position: relative;

      .editorial-composition__item--primary-media {
        grid-row: 1;
        grid-column: 1;
        z-index: 2;
        width: 85%;
      }

      .editorial-composition__item--secondary-media {
        grid-row: 1;
        grid-column: 1;
        z-index: 1;
        width: 65%;
        justify-self: end;
        align-self: end;
        transform: translate(5%, 15%);
      }
    }
  }

  &__item {
    width: 100%;

    &--primary-media,
    &--secondary-media {
      flex: 1;
      min-height: 0;
    }
  }

  &__floater {
    position: absolute;
    z-index: 10;
    max-width: 55%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(14px);
    border-left: 3px solid var(--color-primary, #ff8614);
    padding: 1.25rem 1.75rem;
    color: rgba(255, 255, 255, 0.92);

    // Region-based positioning
    &--bottom-left {
      bottom: 10%;
      left: -15%;
    }

    &--bottom-right {
      bottom: 10%;
      right: -5%;
    }

    &--bottom {
      bottom: 0;
      left: 0;
      max-width: 100%;
      width: 100%;
      border-left: none;
      border-top: 3px solid var(--color-primary, #ff8614);
    }

    &--top-left {
      top: 10%;
      left: -15%;
    }

    &--top-right {
      top: 10%;
      right: -5%;
    }

    // Role-specific tweaks
    &--ornament {
      background: none;
      border: none;
      padding: 0;
      max-width: 60px;
      backdrop-filter: none;
    }

    &--meta {
      background: none;
      backdrop-filter: none;
      border: none;
      padding: 0.75rem 0 0;
      color: inherit;
      position: relative;
      max-width: 100%;
      opacity: 0.7;
      font-size: 0.8125rem;
    }

    &--caption {
      .editorial-composition__text--caption {
        opacity: 1;
        color: inherit;
      }
    }
  }

  &__media {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    min-height: 200px;
  }

  &__text {
    &--headline {
      font-family: var(--rt-slot-headline-family, var(--rt-role-display-family, inherit));
      font-size: var(--rt-slot-headline-size, var(--rt-role-display-size, clamp(2.5rem, 5.5vw, 5.5rem)));
      font-weight: var(--rt-slot-headline-weight, var(--rt-role-display-weight, 800));
      line-height: var(--rt-slot-headline-line-height, var(--rt-role-display-line-height, 1.0));
      letter-spacing: var(--rt-slot-headline-letter-spacing, var(--rt-role-display-letter-spacing, -0.035em));
      color: var(--rt-slot-headline-color, var(--rt-role-display-color, inherit));
    }

    &--eyebrow {
      font-family: var(--rt-slot-eyebrow-family, var(--rt-role-eyebrow-family, inherit));
      font-size: var(--rt-slot-eyebrow-size, var(--rt-role-eyebrow-size, 0.6875rem));
      font-weight: var(--rt-slot-eyebrow-weight, var(--rt-role-eyebrow-weight, 700));
      line-height: var(--rt-slot-eyebrow-line-height, var(--rt-role-eyebrow-line-height, 1.4));
      letter-spacing: var(--rt-slot-eyebrow-letter-spacing, var(--rt-role-eyebrow-letter-spacing, 0.2em));
      text-transform: var(--rt-slot-eyebrow-text-transform, var(--rt-role-eyebrow-text-transform, uppercase));
      color: var(--rt-slot-eyebrow-color, var(--rt-role-eyebrow-color, inherit));
      opacity: 0.55;
      display: inline-block;
      border-bottom: 2px solid var(--color-primary, currentColor);
      padding-bottom: 0.35em;
      margin-bottom: 0.75em;
    }

    &--body {
      font-family: var(--rt-slot-body-family, var(--rt-role-body-family, inherit));
      font-size: var(--rt-slot-body-size, var(--rt-role-body-size, var(--font-size-base)));
      font-weight: var(--rt-slot-body-weight, var(--rt-role-body-weight, inherit));
      line-height: var(--rt-slot-body-line-height, var(--rt-role-body-line-height, var(--line-height-base)));
      color: var(--rt-slot-body-color, var(--rt-role-body-color, inherit));
    }

    &--caption {
      font-family: var(--rt-slot-caption-family, var(--rt-role-caption-family, inherit));
      font-size: var(--rt-slot-caption-size, var(--rt-role-caption-size, 0.8125rem));
      font-weight: var(--rt-slot-caption-weight, var(--rt-role-caption-weight, inherit));
      line-height: var(--rt-slot-caption-line-height, var(--rt-role-caption-line-height, 1.5));
      color: var(--rt-slot-caption-color, var(--rt-role-caption-color, inherit));
      opacity: 0.85;
    }

    &--meta {
      font-family: var(--rt-slot-meta-family, var(--rt-role-caption-family, inherit));
      font-size: var(--rt-slot-meta-size, var(--rt-role-caption-size, 0.8125rem));
      font-weight: var(--rt-slot-meta-weight, var(--rt-role-caption-weight, inherit));
      line-height: var(--rt-slot-meta-line-height, var(--rt-role-caption-line-height, 1.5));
      color: var(--rt-slot-meta-color, var(--rt-role-caption-color, inherit));
      opacity: 0.75;
    }
  }

  &__stack {
    display: flex;
    flex-direction: column;
    padding: 2rem 1.5rem;
  }

  &__stack-item {
    width: 100%;

    &--eyebrow { margin-bottom: 0.5rem; }
    &--headline { margin-bottom: 1.5rem; }
    &--primary-media,
    &--secondary-media { margin-bottom: 1rem; }
    &--caption { margin-bottom: 1.5rem; }
    &--body { margin-bottom: 1.5rem; }
    &--meta { margin-bottom: 0.5rem; }
  }

  &__empty {
    position: relative;
    z-index: 2;
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--color-text-light);
    font-style: italic;
  }
}
</style>
