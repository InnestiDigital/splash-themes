<template>
  <section
    class="layered-composition"
    :class="sectionClasses"
    :style="{ ...rootStyles, ...contentStyle }"
    data-target="root"
  >
    <div
      v-if="backgroundMedia"
      class="layered-composition__background"
      data-target="background"
    >
      <img :src="backgroundMedia" alt="" />
    </div>
    <div
      v-else
      class="layered-composition__background"
      data-target="background"
    />

    <div
      v-if="overlayOpacity > 0"
      class="layered-composition__overlay"
      :style="overlayStyles"
      data-target="overlay"
    />

    <div class="layered-composition__canvas">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="layered-composition__item"
        :style="itemStyle(item)"
        :data-target-index="index"
        data-target="items"
      >
        <img
          v-if="item.media"
          :src="item.media"
          :alt="getLocalized(item.content) ? '' : ''"
          class="layered-composition__item-media"
        />
        <div
          v-if="getLocalized(item.content)"
          class="layered-composition__item-content prose"
          v-html="asHtml(getLocalized(item.content))"
        ></div>
      </div>
    </div>

    <div v-if="items.length === 0" class="layered-composition__empty">
      No items configured
    </div>
  </section>
</template>

<script setup lang="ts">
import type { BackgroundRole } from '~/shared/types/placement'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SPACING_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { asHtml } from '~/shared/utils/asHtml'
import { useBlockSurface } from '~/shared/composables/useBlockSurface'

interface CompositionItem {
  content?: string | Record<string, string>
  media?: string
  positionX?: number
  positionY?: number
  width?: number
  height?: number
  zIndex?: number
}

const props = withDefaults(defineProps<{
  items?: CompositionItem[]
  background?: BackgroundRole
  backgroundMedia?: string
  height?: 'auto' | 'viewport' | 'large' | 'medium'
  overlayOpacity?: number
  internalPadding?: string
  contentAlignH?: string
}>(), {
  items: () => [],
  height: 'large',
  overlayOpacity: 0,
})

const { locale } = useI18n()

function getLocalized(value: string | Record<string, string> | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[locale.value] || value['en-US'] || Object.values(value)[0] || ''
}

const items = computed(() => props.items)

const sectionClasses = computed(() => {
  const classes: string[] = []
  classes.push(`layered-composition--height-${props.height}`)
  return classes
})

const { surfaceStyle } = useBlockSurface(props, { fallbackBackground: 'section' })

const rootStyles = computed(() => {
  const styles: Record<string, string> = { ...surfaceStyle.value }
  return styles
})

const overlayStyles = computed(() => ({
  backgroundColor: `rgba(0, 0, 0, ${props.overlayOpacity / 100})`,
}))

function itemStyle(item: CompositionItem): Record<string, string> {
  const styles: Record<string, string> = {}
  styles.position = 'absolute'
  styles.left = `${item.positionX ?? 0}%`
  styles.top = `${item.positionY ?? 0}%`
  styles.width = `${item.width ?? 30}%`
  styles.height = `${item.height ?? 30}%`
  styles.zIndex = String(item.zIndex ?? 1)
  return styles
}

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  if (props.contentAlignH && props.contentAlignH !== 'left') {
    const __alignMap: Record<string, string> = { center: 'center', right: 'flex-end' }
    const mapped = __alignMap[props.contentAlignH] ?? 'flex-start'
    style.justifyContent = mapped
    style.justifyItems = mapped
  }
  return style
})

</script>

<style lang="scss" scoped>
.layered-composition {
  position: relative;
  overflow: hidden;

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
    height: 100%;
    min-height: inherit;
    z-index: 2;
  }

  &__item {
    overflow: hidden;
  }

  &__item-media {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &__item-content {
    font-family: var(--rt-slot-body-family, var(--rt-role-body-family, inherit));
    font-size: var(--rt-slot-body-size, var(--rt-role-body-size, var(--font-size-base)));
    font-weight: var(--rt-slot-body-weight, var(--rt-role-body-weight, inherit));
    line-height: var(--rt-slot-body-line-height, var(--rt-role-body-line-height, var(--line-height-base)));
    letter-spacing: var(--rt-slot-body-letter-spacing, var(--rt-role-body-letter-spacing, normal));
    text-transform: var(--rt-slot-body-text-transform, var(--rt-role-body-text-transform, none));
    color: var(--rt-slot-body-color, var(--rt-role-body-color, inherit));

    // Color comes from the .prose contract; underline is the deliberate delta
    // (CSS-10).
    :deep(a) {
      text-decoration: underline;
    }
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
