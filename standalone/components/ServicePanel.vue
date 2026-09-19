<template>
  <!-- Outer shell: full-bleed, provides the section's inner horizontal padding -->
  <div class="service-panel-shell">
    <!-- Card: dark navy panel, rounded, inset via the shell's padding -->
    <div
      class="service-panel"
      :class="[
        `service-panel--media-${mediaSide}`,
        isInteractive ? { 'is-interactive': true, 'is-reduced': isReducedMotion, 'has-base-image': !!sideImage } : null,
      ]"
    >
      <!-- Eyebrow -->
      <p v-if="eyebrow" class="service-panel__eyebrow">{{ eyebrow }}</p>

      <!-- Big heading -->
      <h2 class="service-panel__heading">{{ heading }}</h2>

      <!-- Two-column body -->
      <div class="service-panel__body">
        <!-- Left: portrait image + CTA pill -->
        <div class="service-panel__image-col">
          <div class="service-panel__image-wrap">
            <!-- Interactive: cross-fading image stack driven by the active row. -->
            <template v-if="isInteractive && hasServiceImages">
              <!-- Base/fallback layer: shown only when the active service has no
                   image of its own, so the wrap is never empty. -->
              <img
                v-if="sideImage"
                :src="sideImage"
                :alt="sideImageAlt || ''"
                class="service-panel__image service-panel__image--base"
                :class="{ 'is-shown': !activeServiceImage }"
                loading="lazy"
              />
              <div
                v-else-if="!activeServiceImage"
                class="service-panel__image-placeholder"
                aria-hidden="true"
              />
              <!-- Per-service layers: opacity 1 only for the active index. -->
              <img
                v-for="layer in imageLayers"
                :key="layer.idx"
                :src="layer.src"
                alt=""
                aria-hidden="true"
                class="service-panel__image service-panel__image--layer"
                :class="{ 'is-shown': layer.idx === active }"
                loading="lazy"
              />
            </template>
            <!-- Static (legacy) path: single side image or placeholder. -->
            <template v-else>
              <img
                v-if="sideImage"
                :src="sideImage"
                :alt="sideImageAlt || ''"
                class="service-panel__image"
                loading="lazy"
              />
              <div v-else class="service-panel__image-placeholder" aria-hidden="true" />
            </template>
          </div>
          <a
            v-if="sideCtaLabel"
            :href="sideCtaUrl || '#'"
            class="service-panel__cta-pill"
            @click="onLinkClick"
          >{{ sideCtaLabel }}</a>
        </div>

        <!-- Right: service rows -->
        <div class="service-panel__rows">
          <div
            v-for="(service, idx) in services"
            :key="idx"
            class="service-panel__row"
            :class="{ 'is-active': isInteractive && idx === active }"
            @mouseenter="onRowActivate(idx)"
            @focusin="onRowActivate(idx)"
          >
            <!-- Interactive: the info block is a real focusable control so Tab
                 walks the services and focus drives the same active state. On
                 touch (no hover) tapping the button selects the row and drives
                 the cross-fade; it never navigates. Tag links stay OUTSIDE it
                 (an <a> may not nest inside a <button>). -->
            <button
              v-if="isInteractive"
              type="button"
              class="service-panel__row-trigger"
              @click.prevent="onRowActivate(idx)"
            >
              <h3 class="service-panel__row-title" v-html="asHtml(getLocalizedValue(service.title))"></h3>
              <p v-if="service.description" class="service-panel__row-desc prose" v-html="asHtml(getLocalizedValue(service.description))"></p>
            </button>
            <div v-else class="service-panel__row-info">
              <h3 class="service-panel__row-title" v-html="asHtml(getLocalizedValue(service.title))"></h3>
              <p v-if="service.description" class="service-panel__row-desc prose" v-html="asHtml(getLocalizedValue(service.description))"></p>
            </div>
            <div v-if="service.tags?.length" class="service-panel__row-tags">
              <component
                :is="tag.href ? 'a' : 'span'"
                v-for="(tag, tIdx) in service.tags"
                :key="tIdx"
                :href="tag.href || undefined"
                :class="['service-panel__tag', tIdx === service.tags.length - 1 ? 'service-panel__tag--solid' : 'service-panel__tag--outline']"
                @click="onLinkClick"
              >{{ tag.label }}</component>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'
import { useReducedMotion } from '~/shared/composables/useReducedMotion'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'

const { getLocalizedValue } = useLocalized()

type Interactive = 'off' | 'preview'

type MediaSide = 'left' | 'right' | 'above' | 'below'

interface ServiceTag {
  label: string
  href?: string
}

interface Service {
  title?: string | Record<string, string>
  description?: string | Record<string, string>
  image?: string | { url: string }
  tags?: ServiceTag[]
}

const props = withDefaults(defineProps<{
  eyebrow?: string
  heading?: string
  sideImage?: string
  sideImageAlt?: string
  sideCtaLabel?: string
  sideCtaUrl?: string
  interactive?: Interactive
  services?: Service[]
  mediaSide?: MediaSide
}>(), {
  services: () => [],
  heading: 'Servizi',
  interactive: 'off',
  mediaSide: 'left',
})

const { isReducedMotion } = useReducedMotion()
const renderMode = useRenderMode()
const isEditor = computed(() => renderMode.value === 'editor-preview')

const isInteractive = computed(() => props.interactive === 'preview')

// Active service index, driven by hover (mouseenter) or focus (focusin).
const active = ref(0)
function onRowActivate(idx: number) {
  if (isInteractive.value) active.value = idx
}

function resolveServiceImage(image: Service['image']): string {
  if (!image) return ''
  return typeof image === 'string' ? image : image.url || ''
}

// Only services that actually declare an image become cross-fade layers.
const imageLayers = computed(() =>
  (props.services ?? []).flatMap((s, idx) => {
    const src = resolveServiceImage(s.image)
    return src ? [{ idx, src, alt: getLocalizedValue(s.title ?? '') }] : []
  }),
)
const hasServiceImages = computed(() => imageLayers.value.length > 0)
const activeServiceImage = computed(() =>
  resolveServiceImage(props.services?.[active.value]?.image),
)

function onLinkClick(e: MouseEvent) {
  // In the editor preview, tag/CTA links must not navigate away from the
  // authoring surface — mirrors StackedCards' onCtaClick precedent.
  if (isEditor.value) e.preventDefault()
}
</script>

<style lang="scss" scoped>
// ── Outer shell: near-full-wide inset (≈20px each side at 1440) ──────────────
.service-panel-shell {
  width: 100%;
  padding: 0 2rem;
  box-sizing: border-box;
}

// ── Brand-blue band ─────────────────────────────────────────────────────────
.service-panel {
  background: #1B8AB7;
  border-radius: 1.5rem;
  padding: 3.2rem 4rem 4rem;
  color: #ffffff;
  overflow: hidden;

  &__eyebrow {
    font-family: var(--font-family, 'Inter', sans-serif);
    font-size: 1.2rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    // Was rgba(255,255,255,0.65) — 2.53:1 on the #1B8AB7 accent band, at 12px
    // and letter-spaced uppercase, the least legible type on the page. Full
    // white takes it to 3.85:1, which is this background's CEILING for light
    // type (pure white on #1B8AB7 is 3.85:1; only black-end type can reach AA
    // here, at 5.46:1). So this is a strict improvement, NOT AA-normal (4.5:1)
    // — closing that last gap means darkening the accent band itself, a brand
    // decision. The muting the old alpha gave is preserved by the weight and
    // size hierarchy against the display-scale heading below it.
    color: #FFFFFF;
    margin: 0 0 0.8rem;
  }

  &__heading {
    // "Cosa facciamo" is THE band heading — display-scale (~120px) white type in
    // the themed heading face, matching every other section title's face/weight.
    font-family: var(--font-family-heading, 'Inter', sans-serif);
    font-size: clamp(6rem, 8.3vw, 12rem);
    font-weight: 400;
    line-height: 0.92;
    letter-spacing: -0.03em;
    color: #ffffff;
    margin: 0 0 2.8rem;
  }

  &__body {
    display: grid;
    grid-template-columns: 28% 1fr;
    gap: 4rem;
    align-items: start;
  }

  // Which side the portrait column sits on. It is first in the DOM, so "left"
  // is the source order; the stacked sides drop to a single column.
  &--media-right &__body {
    grid-template-columns: 1fr 28%;
  }
  &--media-right &__image-col { order: 2; }

  &--media-above &__body,
  &--media-below &__body {
    grid-template-columns: 1fr;
  }
  &--media-below &__image-col { order: 2; }

  // ── Left column ────────────────────────────────────────────────────────

  &__image-col {
    display: flex;
    flex-direction: column;
    gap: 1.6rem;
  }

  &__image-wrap {
    aspect-ratio: 4/3;
    border-radius: 0.8rem;
    overflow: hidden;
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &__image-placeholder {
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.08);
  }

  &__cta-pill {
    display: inline-block;
    align-self: flex-start;
    background: #ffffff;
    color: #1B8AB7;
    font-family: var(--font-family, 'Inter', sans-serif);
    font-size: 1.3rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    padding: 0.7rem 2rem;
    border-radius: 999px;
    text-decoration: none;
    white-space: nowrap;
    transition: opacity 0.15s ease;

    &:hover { opacity: 0.85; }
  }

  // ── Right column: rows ──────────────────────────────────────────────

  &__rows {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    padding: 1.5rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    min-width: 0;

    &:first-child { padding-top: 0; }
    &:last-child { border-bottom: none; padding-bottom: 0; }
  }

  &__row-info {
    flex: 1 1 auto;
    min-width: 0;
  }

  &__row-title {
    // Themed heading face (Sul Sans) at weight 400 — matches every other
    // section title in the reference (previously hardcoded off-family Gothic A1).
    font-family: var(--font-family-heading, 'Inter', sans-serif);
    font-size: clamp(1.8rem, 2.2vw, 3rem);
    font-weight: 400;
    letter-spacing: -0.01em;
    line-height: 1.1;
    color: #ffffff;
    margin: 0 0 0.4rem;
  }

  &__row-desc {
    font-family: var(--font-family, 'Inter', sans-serif);
    font-size: 1.2rem;
    font-weight: 400;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
    max-width: 36ch;
  }

  &__row-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    justify-content: flex-end;
    flex: 0 0 auto;
    max-width: 45%;
  }

  &__tag {
    display: inline-block;
    border-radius: 999px;
    // Legibility floor: was 1.05rem (10.5px), under the 1.1rem meta floor.
    // Pills are nowrap inside a flex-wrap row, so the row rewraps between
    // pills rather than breaking a label; padding nudged to stay proportional.
    font-size: var(--font-size-sm, 1.2rem);
    font-weight: 500;
    letter-spacing: 0.03em;
    white-space: nowrap;
    padding: 0.3rem 0.9rem;
    text-decoration: none;
    transition: opacity 0.15s ease;

    // Hover affordance only for pills that carry a link
    a#{&}:hover { opacity: 0.85; }

    &--outline {
      border: 1px solid rgba(255, 255, 255, 0.45);
      background: transparent;
      color: rgba(255, 255, 255, 0.85);
    }

    &--solid {
      background: #ffffff;
      color: #1B8AB7;
      border: none;
    }
  }

  // ── Interactive (live-preview) mode ─────────────────────────────────────
  // Opt-in only: none of these rules apply unless `.is-interactive` is set, so
  // the static default renders byte-identically to the legacy markup.
  &.is-interactive {
    .service-panel__image-wrap { position: relative; }

    // Stacked cross-fade layers, absolutely filling the wrap.
    .service-panel__image--base,
    .service-panel__image--layer {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      opacity: 0;
      transition: opacity 0.45s ease;

      &.is-shown { opacity: 1; }
    }

    // Active-row emphasis: inactive rows recede, the active one is full-strength.
    .service-panel__row {
      opacity: 0.5;
      transition: opacity 0.45s ease;

      &.is-active { opacity: 1; }
    }

    // The info block becomes a real button but must look exactly like the
    // static text block; strip all native button chrome.
    .service-panel__row-trigger {
      flex: 1 1 auto;
      min-width: 0;
      display: block;
      width: 100%;
      margin: 0;
      padding: 0;
      border: none;
      background: none;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;

      &:focus-visible {
        outline: 2px solid rgba(255, 255, 255, 0.9);
        outline-offset: 4px;
        border-radius: 4px;
      }
    }
  }

  // Reduced motion: keep full functionality, drop the fades (instant swap/dim).
  &.is-interactive.is-reduced {
    .service-panel__image--base,
    .service-panel__image--layer,
    .service-panel__row {
      transition: none;
    }
  }

  // ── Mobile stacking: below the breakpoint-mode container width, drop the
  //    two-column body to a single column and let each row stack its info
  //    above its tags so titles/descriptions get full width. Container query
  //    (context = [data-layout-content]/.layout-scale-content, per campaign
  //    convention) — in scale mode above 768 the container is the 1440 canvas,
  //    so desktop is untouched.
  @container (max-width: 768px) {
    padding: 2.4rem 1.6rem 2.8rem;

    &__body {
      grid-template-columns: 1fr;
      gap: 2.4rem;
    }

    &__row {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    &__row-tags {
      max-width: 100%;
      justify-content: flex-start;
    }

    &__row-desc {
      max-width: none;
      font-size: 1.4rem;
    }

    &__cta-pill {
      display: inline-flex;
      align-items: center;
      min-height: 4.4rem;
    }

    // Touch enablement: tapping a row selects it (see the button's @click) and
    // drives the SAME cross-fade stack as desktop hover. So we deliberately do
    // NOT hide the per-service layers here — the desktop `.is-shown { opacity:1 }`
    // rule keeps driving the active layer, and the base layer still shows only
    // when the active service has no image. We only adjust the ROW affordance:
    // no dimming on a scrollable touch list (reads as broken); instead mark the
    // active row with a left accent bar + full-opacity title.
    &.is-interactive &__row {
      opacity: 1;
      position: relative;
      padding-inline-start: 1.2rem;
      transition: padding 0.2s ease;

      // Left accent bar: hidden until the row is the active one.
      &::before {
        content: '';
        position: absolute;
        inset-block: 0.6rem;
        inset-inline-start: 0;
        width: 3px;
        border-radius: 999px;
        background: #ffffff;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      &.is-active::before { opacity: 1; }
    }
  }

  // Reduced motion (mobile touch affordance): drop the accent-bar/padding fades.
  &.is-interactive.is-reduced {
    @container (max-width: 768px) {
      .service-panel__row,
      .service-panel__row::before {
        transition: none;
      }
    }
  }
}
</style>
