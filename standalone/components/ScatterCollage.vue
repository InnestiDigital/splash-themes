<template>
  <section
    ref="rootRef"
    class="scatter-collage"
    :class="sectionClasses"
    :style="rootStyles"
    data-target="root"
  >
    <div
      v-if="backgroundMedia"
      class="scatter-collage__background"
      data-target="background"
    >
      <img :src="backgroundMedia" alt="" />
    </div>
    <div
      v-else
      class="scatter-collage__background"
      data-target="background"
    />

    <div
      v-if="overlayOpacity > 0"
      class="scatter-collage__overlay"
      :style="overlayStyles"
      data-target="overlay"
    />

    <div
      ref="canvasRef"
      class="scatter-collage__canvas"
      :style="canvasStyles"
      @pointerdown="onCanvasPointerDown"
    >
      <div
        v-for="(item, index) in runtimeItems"
        :key="item.id"
        class="scatter-collage__item"
        :class="{ 'is-selected': interactionEnabled && item.id === selectedItemId }"
        :style="itemStyle(item)"
        :data-item-id="item.id"
        @pointerdown="(e: PointerEvent) => onItemPointerDown(e, item.id)"
        @click="onItemClick"
      >
        <!--
          Animation frame: separate element so animations (ambient loops,
          entrance presets) that drive `transform` via WAAPI don't clobber
          the outer element's positioning transform. All animation targets
          hook via this frame's [data-target="items"].
        -->
        <div
          class="scatter-collage__item-frame"
          :data-target-index="index"
          data-target="items"
          :data-motion-suppressed="item.motionSuppressionReason === 'active-gesture' ? 'true' : 'false'"
        >
          <img
            v-if="item.media"
            :src="item.media"
            alt=""
            class="scatter-collage__item-media"
            :style="itemMediaStyle(item)"
            draggable="false"
          />
          <div
            v-if="getLocalized(item.caption)"
            class="scatter-collage__item-caption prose"
            v-html="asHtml(getLocalized(item.caption))"
          ></div>
        </div>

        <!-- Handles live outside the animation frame so they don't animate. -->
        <template v-if="showHandles(item)">
          <span
            v-for="kind in resizeHandles"
            :key="kind"
            :class="['scatter-collage__handle', `scatter-collage__handle--${kind}`]"
            role="button"
            :aria-label="`Resize item ${kind.replace('resize-', '').toUpperCase()}`"
            @pointerdown.stop="(e: PointerEvent) => onHandlePointerDown(e, item.id, kind)"
          />
          <span
            class="scatter-collage__handle scatter-collage__handle--rotate"
            role="button"
            aria-label="Rotate item"
            @pointerdown.stop="(e: PointerEvent) => onHandlePointerDown(e, item.id, 'rotate')"
          />
        </template>
      </div>
    </div>

    <div v-if="runtimeItems.length === 0" class="scatter-collage__empty">
      No items configured
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, inject, nextTick, ref, unref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { asHtml } from '~/shared/utils/asHtml'
import {
  normalizePositionedItems,
  computeLayoutFingerprint,
  useInteractivePositioning,
  deriveRuntimeItems,
  LAYOUT_INTERACTION_BLOCK_ID,
  LAYOUT_INTERACTION_CONFIG_VERSION,
  type PositionedItemAuthored,
  type HandleKind,
} from '~/shared/features/layout-interaction'
import { useKeyboardPositioning } from '~/shared/features/layout-interaction/controllers/use-keyboard-positioning'
import { createEditorPreviewAdapter } from '~/shared/features/layout-interaction/persistence/editor-preview-adapter'
import { createSessionStorageAdapter } from '~/shared/features/layout-interaction/persistence/session-storage-adapter'
import { useRenderMode } from '~/shared/features/cms-preview/use-render-mode'
import { useCmsPreview } from '~/shared/composables/useCmsPreview'
import { ANIMATION_TARGETS_CHANGED } from '~/shared/features/cms/animation/constants'

// Authored item shape: substrate geometry fields + ScatterCollage-specific
// media/caption/focal. `scale` is a legacy field retained for content
// migration compatibility — it is no longer rendered in the transform.
interface ScatterItem extends Partial<PositionedItemAuthored> {
  id?: string
  media?: string
  caption?: string | Record<string, string>
  focalX?: number
  focalY?: number
  scale?: number
}

type AspectRatio = '16:9' | '4:5' | '1:1' | '21:9'
type MobileMode = 'stack' | 'scale' | 'hybrid'
type SectionHeight = 'auto' | 'viewport' | 'large' | 'medium'

const props = withDefaults(defineProps<{
  blockId?: string
  items?: ScatterItem[]
  aspectRatio?: AspectRatio
  mobileMode?: MobileMode
  maxCanvasWidth?: number
  height?: SectionHeight
  backgroundMedia?: string
  overlayOpacity?: number
}>(), {
  blockId: undefined,
  items: () => [],
  aspectRatio: '4:5',
  mobileMode: 'scale',
  maxCanvasWidth: 1200,
  height: 'large',
  backgroundMedia: undefined,
  overlayOpacity: 0,
})

const resizeHandles: HandleKind[] = ['resize-nw', 'resize-ne', 'resize-sw', 'resize-se']

// Injection is optional — legacy flat render paths may not provide it. Fall
// back to the prop, then to a stable default.
const injectedBlockId = inject(LAYOUT_INTERACTION_BLOCK_ID, null)
const injectedConfigVersion = inject(LAYOUT_INTERACTION_CONFIG_VERSION, null)

const blockId = computed(() => {
  const v = unref(injectedBlockId) as string | undefined
  return v || props.blockId || 'scatter-unknown'
})
const configVersion = computed<string | number>(() => {
  const v = unref(injectedConfigVersion) as string | number | undefined
  return v ?? 'cv-unknown'
})

const { locale } = useI18n()

function getLocalized(value: string | Record<string, string> | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[locale.value] || value['en-US'] || Object.values(value)[0] || ''
}

const mode = useRenderMode()
// Interaction makes sense whenever items have real positions — every mode
// except `stack`, which collapses the canvas into a vertical list and
// discards coordinates. `scale` and `hybrid` both preserve positions, so
// drag (session-persisted in public, full interaction in editor) applies.
const interactionEnabled = computed(() => props.mobileMode !== 'stack')

// Normalize items defensively — the migration guarantees ids, but guard
// against out-of-band content imports or tests that skip the migration.
const authored = computed(() => normalizePositionedItems(props.items as ScatterItem[]))
const layoutFingerprint = computed(() => computeLayoutFingerprint(authored.value))

const rootRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLElement | null>(null)

// Render mode is stable after the editor↔preview handshake, so the adapter
// is picked once at setup. Do NOT reactively swap adapters — hydration state
// would be lost mid-session.
type AnyAdapter = ReturnType<typeof createSessionStorageAdapter<ScatterItem & PositionedItemAuthored>>
let adapter: AnyAdapter
if (mode.value === 'editor-preview') {
  const cms = useCmsPreview()
  adapter = createEditorPreviewAdapter<ScatterItem & PositionedItemAuthored>(
    (patch, context) => cms.notifyScatterItemPatch(context.blockId, patch),
  )
} else {
  adapter = createSessionStorageAdapter<ScatterItem & PositionedItemAuthored>({ namespace: 'scatter' })
}

// Capabilities snapshot: NOTE — the engine captures capabilities once at
// construction time. `mobileMode` is an authoring-time setting and is not
// expected to change during a session; if that assumption ever changes, the
// engine would need a reactive capabilities path.
const capabilities = {
  drag: interactionEnabled.value,
  resize: mode.value === 'editor-preview' && interactionEnabled.value,
  rotate: mode.value === 'editor-preview' && interactionEnabled.value,
  selection: mode.value === 'editor-preview' && interactionEnabled.value,
}

const substrate = useInteractivePositioning<ScatterItem & PositionedItemAuthored>({
  items: authored,
  adapter,
  capabilities,
  context: {
    blockId: blockId.value,
    configVersion: configVersion.value,
    authoredItems: authored.value,
    layoutFingerprint: layoutFingerprint.value,
  },
  canvasEl: canvasRef,
})

if (mode.value === 'editor-preview' && interactionEnabled.value) {
  useKeyboardPositioning<ScatterItem & PositionedItemAuthored>({
    selectedItemId: substrate.selectedItemId,
    items: substrate.positionedItems,
    applyPatch: substrate.applyPatch,
    blockRootEl: rootRef,
  })
}

// Override-item-id tracking: in public-render mode, items whose hydrated
// position differs from the authored position carry a session override.
// We expose this via `motionSuppressionReason: 'session-override'` so the
// motion engine skips them until the override clears. Editor-preview
// adapter is pass-through, so this set stays empty there.
// TODO: Migrate this to a first-class override list emitted by the adapter
// so we don't rely on positional diff (fragile under future feature drift).
const overrideItemIds = computed(() => {
  const ids = new Set<string>()
  if (mode.value === 'editor-preview') return ids
  const authoredById = new Map(authored.value.map(a => [a.id, a]))
  for (const item of substrate.positionedItems.value) {
    const a = authoredById.get(item.id)
    if (!a) continue
    if (a.positionX !== item.positionX || a.positionY !== item.positionY) {
      ids.add(item.id)
    }
  }
  return ids
})

const runtimeItems = computed(() =>
  deriveRuntimeItems<ScatterItem & PositionedItemAuthored>({
    items: substrate.positionedItems.value,
    activeGestureItemId: substrate.activeGestureItemId.value,
    overrideItemIds: overrideItemIds.value,
  }),
)

// Notify AnimatedBlock when the rendered item set or per-item motion-suppression
// state changes so it re-queries DOM targets for the engine. Without this
// dispatch, AnimatedBlock's onMounted fires once before items are mounted (or
// before postMessage delivers the config in preview) and the loop adapter ends
// up subscribed to an empty array.
const instance = getCurrentInstance()
function dispatchTargetsChanged() {
  const el = instance?.proxy?.$el as HTMLElement | undefined
  if (!el || !props.blockId) return
  el.dispatchEvent(new CustomEvent(ANIMATION_TARGETS_CHANGED, {
    bubbles: true,
    detail: { blockId: props.blockId },
  }))
}
watch(
  () => runtimeItems.value.map(i => `${i.id}:${i.motionSuppressionReason}`).join('|'),
  () => nextTick(dispatchTargetsChanged),
)

const aspectClassSuffix = computed(() => props.aspectRatio.replace(':', '-'))

const sectionClasses = computed(() => [
  `scatter-collage--height-${props.height}`,
  `scatter-collage--aspect-${aspectClassSuffix.value}`,
  `scatter-collage--mobile-${props.mobileMode}`,
])

const rootStyles = computed(() => {
  const styles: Record<string, string> = {}
  styles['--scatter-max-width'] = `${props.maxCanvasWidth}px`
  const [w, h] = props.aspectRatio.split(':').map(Number)
  if (w && h) styles['--scatter-aspect'] = `${w} / ${h}`
  return styles
})

const canvasStyles = computed(() => ({
  maxWidth: `${props.maxCanvasWidth}px`,
  aspectRatio: props.aspectRatio.replace(':', ' / '),
}))

const overlayStyles = computed(() => ({
  backgroundColor: `rgba(0, 0, 0, ${props.overlayOpacity / 100})`,
}))

type RuntimeItem = ScatterItem & PositionedItemAuthored & { motionSuppressionReason: string }

function itemStyle(item: RuntimeItem) {
  const s = item.scale ?? 1
  // Outer element: positioning, rotation, and scale composed into the
  // `transform` property. Drag only touches this element's transform — no
  // layout reflow per pointermove (GPU-composited). Animations attach to
  // the inner frame, not here, so they can't clobber the base transform.
  //
  // Math: CSS translate() is element-relative, so canvas_position% is
  // converted via (position / size * 100) − 50 (the −50 centers the item).
  const elementX = (item.positionX / item.width) * 100 - 50
  const elementY = (item.positionY / item.height) * 100 - 50
  return {
    position: 'absolute' as const,
    left: '0',
    top: '0',
    width: `${item.width}%`,
    height: `${item.height}%`,
    transform: `translate(${elementX}%, ${elementY}%) scale(${s}) rotate(${item.rotation}deg)`,
    transformOrigin: `${item.focalX ?? 50}% ${item.focalY ?? 50}%`,
    zIndex: String(item.zIndex),
    touchAction: 'none' as const,
  }
}

function itemMediaStyle(item: RuntimeItem) {
  const fx = item.focalX ?? 50
  const fy = item.focalY ?? 50
  return { objectPosition: `${fx}% ${fy}%` }
}

function showHandles(item: RuntimeItem): boolean {
  return mode.value === 'editor-preview'
    && interactionEnabled.value
    && item.id === substrate.selectedItemId.value
}

const selectedItemId = substrate.selectedItemId
const onHandlePointerDown = substrate.onPointerDownHandle
const onCanvasPointerDown = substrate.onPointerDownCanvas

// In the editor preview, the parent section listens for clicks to open its
// edit panel. When interaction is enabled on this block, item pointerdown/
// click should stay scoped to the block and drive the substrate gestures
// instead of bubbling to the section handler. Guard against interactive
// descendants (links, buttons, drag handles) so they keep working.
const INTERACTIVE_SELECTOR = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  '[contenteditable]',
  '[draggable="true"]',
  '[role="button"]',
  '[data-interactive]',
  '[data-no-drag]',
].join(', ')

function isOnInteractiveDescendant(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest(INTERACTIVE_SELECTOR) !== null
}

function onItemPointerDown(e: PointerEvent, itemId: string) {
  if (interactionEnabled.value && !isOnInteractiveDescendant(e.target)) {
    e.stopPropagation()
  }
  substrate.onPointerDownItem(e, itemId)
}

function onItemClick(e: MouseEvent) {
  if (!interactionEnabled.value) return
  if (isOnInteractiveDescendant(e.target)) return
  e.stopPropagation()
}
</script>

<style lang="scss" scoped>
.scatter-collage {
  position: relative;
  overflow: hidden;
  --scatter-min-canvas-width: 480px;

  &--height-auto {
    min-height: 200px;
  }

  &--height-viewport {
    min-height: 100vh;
  }

  &--height-large {
    min-height: 75vh;
  }

  &--height-medium {
    min-height: 50vh;
  }

  &__background {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__overlay {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
  }

  &__canvas {
    position: relative;
    width: 100%;
    margin: 0 auto;
    z-index: 2;
    touch-action: auto; /* allow scrolling from empty canvas space */
  }

  &__item {
    overflow: visible; /* frame inside is the visual clipper; handles must not clip */
    will-change: transform, opacity;
    touch-action: none; /* direct touch on item = gesture, not scroll */
    user-select: none; /* prevent text selection from interfering with drag */
    -webkit-user-drag: none; /* prevent native HTML drag on item subtree */
  }

  &__item-frame {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: hidden; /* clip media to the frame */
    will-change: transform, opacity;
    /* No base transform — leave `transform` property free for animations
     * (ambient loops, entrance presets) to drive via WAAPI. */
  }

  &__item.is-selected {
    outline: 1px solid var(--color-accent, #3b82f6);
    outline-offset: 2px;
  }

  &__item-media {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    pointer-events: none; /* image must not swallow pointer events; parent item handles them */
    -webkit-user-drag: none;
    user-select: none;
  }

  &__item-caption {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: var(--spacing-sm, 8px);
    font-size: var(--font-size-sm, 13px);
    line-height: var(--line-height-base, 1.5);
    background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
    color: var(--color-dark-text, #ffffff);

    :deep(p) {
      margin: 0;
    }
  }

  &__empty {
    position: relative;
    z-index: 2;
    text-align: center;
    padding: var(--spacing-xl, 32px);
    color: var(--color-text-light, #616161);
    font-style: italic;
  }

  /* Interaction handles — minimal visual; polish deferred. */
  &__handle {
    position: absolute;
    width: 12px;
    height: 12px;
    background: var(--color-accent, #3b82f6);
    border: 2px solid #fff;
    border-radius: 50%;
    cursor: pointer;
    touch-action: none;
    z-index: 10;
    pointer-events: auto;
  }
  &__handle--resize-nw {
    top: -6px;
    left: -6px;
    cursor: nwse-resize;
  }
  &__handle--resize-ne {
    top: -6px;
    right: -6px;
    cursor: nesw-resize;
  }
  &__handle--resize-sw {
    bottom: -6px;
    left: -6px;
    cursor: nesw-resize;
  }
  &__handle--resize-se {
    bottom: -6px;
    right: -6px;
    cursor: nwse-resize;
  }
  &__handle--rotate {
    top: -24px;
    left: 50%;
    transform: translateX(-50%);
    cursor: grab;

    &::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      width: 1px;
      height: 12px;
      background: var(--color-accent, #3b82f6);
      transform: translateX(-50%);
    }
  }

  /* Mobile reflow strategies — the authored mobileMode reads the container it
     is laid out in, at the same threshold resolveCollapse() uses. */
  @container (max-width: #{$bp-md}) {
    &--mobile-stack .scatter-collage__canvas {
      aspect-ratio: auto;
      max-width: 100%;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md, 16px);
    }
    &--mobile-stack .scatter-collage__item {
      position: relative !important;
      left: auto !important;
      top: auto !important;
      width: 100% !important;
      height: auto !important;
      transform: none !important;
      aspect-ratio: 4 / 5;
    }

    &--mobile-scale .scatter-collage__canvas {
      max-width: 100%;
    }

    &--mobile-hybrid .scatter-collage__canvas {
      max-width: 100%;
    }
  }

  /* Hybrid: stack only when the container is below the min-canvas-width threshold. */
  @container (max-width: #{$bp-sm}) {
    &--mobile-hybrid .scatter-collage__canvas {
      aspect-ratio: auto;
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md, 16px);
    }
    &--mobile-hybrid .scatter-collage__item {
      position: relative !important;
      left: auto !important;
      top: auto !important;
      width: 100% !important;
      height: auto !important;
      transform: none !important;
      aspect-ratio: 4 / 5;
    }
  }
}
</style>
