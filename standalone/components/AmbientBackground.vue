<template>
  <section
    ref="sectionEl"
    data-target="root"
    class="ambient-background"
    :class="[`ambient-background--${heightValue}`]"
    :style="rootStyles"
    aria-hidden="true"
  >
    <img
      v-if="mediaType === 'image' && media"
      data-target="media"
      :class="['ambient-background__media', 'ambient-background__media--image', { 'ambient-background__media--parallax': (parallaxIntensity ?? 0) > 0 }]"
      :style="{ transform: mediaTransform }"
      :src="media"
      alt=""
    />

    <video
      v-else-if="mediaType === 'video' && media"
      data-target="media"
      :class="['ambient-background__media', 'ambient-background__media--video', { 'ambient-background__media--parallax': (parallaxIntensity ?? 0) > 0 }]"
      :style="{ transform: mediaTransform }"
      :src="media"
      autoplay
      muted
      loop
      playsinline
    />

    <div
      v-else-if="mediaType === 'gradient'"
      data-target="media"
      :class="['ambient-background__media', 'ambient-background__media--gradient', { 'ambient-background__media--parallax': (parallaxIntensity ?? 0) > 0 }]"
      :style="[gradientStyles, { transform: mediaTransform }]"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useCmsPreview } from '~/shared/composables/useCmsPreview'

const { inPreviewMode } = useCmsPreview()

type MediaType = 'image' | 'video' | 'gradient'
type GradientType = 'linear' | 'radial'
type Height = 'viewport' | 'large' | 'medium' | 'small'
type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light'

const props = defineProps<{
  mediaType?: MediaType
  media?: string
  gradientType?: GradientType
  gradientFrom?: string
  gradientTo?: string
  gradientAngle?: number
  opacity?: number
  blendMode?: BlendMode
  parallaxIntensity?: number
  height?: Height
}>()

const sectionEl = ref<HTMLElement | null>(null)
const mediaTransform = ref('')
let scrollListener: (() => void) | null = null

function handleScroll() {
  if (!sectionEl.value) return
  const rect = sectionEl.value.getBoundingClientRect()
  const shift = rect.top * ((props.parallaxIntensity ?? 0) / 100) * 0.3
  mediaTransform.value = `translateY(${shift}px)`
}

function teardownParallax() {
  if (scrollListener) {
    window.removeEventListener('scroll', scrollListener)
    scrollListener = null
    mediaTransform.value = ''
  }
}

function setupParallax() {
  teardownParallax()
  const intensity = props.parallaxIntensity ?? 0
  if (intensity === 0) return
  if (inPreviewMode.value) return
  if (typeof window === 'undefined') return
  const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  if (mq?.matches) return
  scrollListener = handleScroll
  window.addEventListener('scroll', scrollListener, { passive: true })
  handleScroll()
}

onMounted(setupParallax)
onUnmounted(teardownParallax)
watch(() => props.parallaxIntensity, setupParallax)

const mediaType = computed((): MediaType => props.mediaType || 'image')
const heightValue = computed((): Height => props.height || 'viewport')

const rootStyles = computed(() => {
  const styles: Record<string, string> = {
    'pointer-events': 'none',
  }

  const opacityVal = props.opacity ?? 100
  styles.opacity = String(opacityVal / 100)

  if (props.blendMode && props.blendMode !== 'normal') {
    styles['mix-blend-mode'] = props.blendMode
  }

  return styles
})

const gradientStyles = computed(() => {
  const type = props.gradientType || 'linear'
  const from = props.gradientFrom || '#000000'
  const to = props.gradientTo || '#333333'
  const angle = props.gradientAngle ?? 180

  const gradient =
    type === 'radial'
      ? `radial-gradient(circle, ${from}, ${to})`
      : `linear-gradient(${angle}deg, ${from}, ${to})`

  return { background: gradient }
})

</script>

<style lang="scss" scoped>
.ambient-background {
  position: relative;
  width: 100%;
  overflow: hidden;

  // Height variants
  &--viewport {
    min-height: 100vh;
  }

  &--large {
    min-height: 60rem;
  }

  &--medium {
    min-height: 40rem;
  }

  &--small {
    min-height: 20rem;
  }

  // Media layer
  &__media {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;

    &--gradient {
      position: absolute;
      inset: 0;
    }

    &--parallax {
      height: 130%;
      top: -15%;
    }
  }
}
</style>
