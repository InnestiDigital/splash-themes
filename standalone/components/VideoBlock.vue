<template>
  <section class="video-block" :class="[`video-block--${layout}`, `video-block--display-${displayMode}`, `video-block--media-${mediaSide}`]" :style="sectionStyles">
    <div class="video-block__container" :style="contentStyle">
      <div v-if="(title || description) && layout === 'side-text'" class="video-block__text">
        <div v-if="title" data-target="heading" class="video-block__title" v-html="asHtml(title)"></div>
        <div v-if="description" class="video-block__description prose" v-html="asHtml(description)"></div>
      </div>

      <div class="video-block__player-wrap">
        <div v-if="(title || description) && layout !== 'side-text'" class="video-block__header">
          <div v-if="title" data-target="heading" class="video-block__title" v-html="asHtml(title)"></div>
          <div v-if="description" class="video-block__description prose" v-html="asHtml(description)"></div>
        </div>

        <div data-target="player" class="video-block__player" :class="`video-block__player--${aspect}`" :style="playerStyle">
          <!-- Self-hosted file path -->
          <video
            v-if="isFile && videoFile"
            class="video-block__video"
            :src="videoFile"
            :poster="posterImage || undefined"
            playsinline
            preload="metadata"
            :autoplay="autoplay"
            :muted="effectiveMuted"
            :loop="loop"
            :controls="showControls"
          ></video>
          <!-- Facade (click-to-load) — lightweight poster + play button, real iframe injected on click -->
          <button
            v-else-if="facadeActive"
            type="button"
            class="video-block__facade"
            :style="facadePoster ? { backgroundImage: `url(${facadePoster})` } : undefined"
            :aria-label="asHtml(title).replace(/<[^>]*>/g, '') || $t('videoBlock.playVideo', 'Play video')"
            @click="activateEmbed"
          >
            <span class="material-icons-outlined" aria-hidden="true">play_circle</span>
          </button>
          <!-- Embed path (YouTube / Vimeo) -->
          <iframe
            v-else-if="!isFile && embedUrl"
            :src="activated ? activeEmbedUrl : embedUrl"
            class="video-block__iframe"
            :title="asHtml(title).replace(/<[^>]*>/g, '') || $t('videoBlock.player', 'Video player')"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            loading="lazy"
          ></iframe>
          <div v-else class="video-block__placeholder" aria-hidden="true">
            <span class="material-icons-outlined">play_circle</span>
            <span>{{ isFile ? $t('videoBlock.addFile', 'Add a video file') : $t('videoBlock.addUrl', 'Add a YouTube or Vimeo URL') }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BackgroundRole } from '~/shared/types/placement'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { useBlockSurface } from '~/shared/composables/useBlockSurface'
import { asHtml } from '~/shared/utils/asHtml'

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  blocks?: Array<Record<string, unknown>>
  title?: string
  description?: string
  videoUrl?: string
  source?: 'embed' | 'file'
  embedLoad?: 'eager' | 'facade'
  videoFile?: string
  posterImage?: string
  autoplay?: boolean
  muted?: boolean
  loop?: boolean
  showControls?: boolean
  aspect?: '16-9' | '21-9' | 'band'
  layout?: 'full' | 'contained' | 'side-text'
  mediaSide?: 'left' | 'right' | 'above' | 'below'
  displayMode?: 'featured' | 'inline'
  background?: BackgroundRole
  borderRadius?: string
  internalPadding?: string
  contentAlignH?: string
}>(), {
  source: 'embed',
  embedLoad: 'eager',
  autoplay: false,
  muted: true,
  loop: false,
  showControls: true,
  aspect: '16-9',
  layout: 'contained',
  mediaSide: 'right',
  displayMode: 'featured',
  borderRadius: 'lg',
})

const isFile = computed(() => props.source === 'file')

// Browser autoplay policy: autoplaying video MUST be muted, so force it.
const effectiveMuted = computed(() => props.autoplay || props.muted)

interface ParsedEmbed {
  provider: 'youtube' | 'vimeo'
  id: string
}

// Parse the author URL once into a typed provider + id (single source of truth
// for both embedUrl and the facade poster). null = no url / unrecognized.
const parsedEmbed = computed<ParsedEmbed | null>(() => {
  if (!props.videoUrl) return null
  const url = props.videoUrl

  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/)
  if (ytMatch) return { provider: 'youtube', id: ytMatch[1] }

  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/)
  if (vimeoMatch) return { provider: 'vimeo', id: vimeoMatch[1] }

  return null
})

// Base src — output preserved byte-identical to the previous implementation.
const embedUrl = computed(() => {
  const parsed = parsedEmbed.value
  if (!parsed) return ''
  return parsed.provider === 'youtube'
    ? `https://www.youtube.com/embed/${parsed.id}?rel=0`
    : `https://player.vimeo.com/video/${parsed.id}`
})

// Autoplaying variant — used ONLY by the iframe once the facade is clicked.
const activeEmbedUrl = computed(() => {
  const parsed = parsedEmbed.value
  if (!parsed) return ''
  return parsed.provider === 'youtube'
    ? `${embedUrl.value}&autoplay=1`
    : `${embedUrl.value}?autoplay=1`
})

// Facade state: false until the user clicks the poster/play button.
const activated = ref(false)
function activateEmbed() {
  activated.value = true
}

// Facade wins only for opt-in embed instances that parsed to a known provider,
// and only until activated. Eager/file/unset instances never see the facade.
const facadeActive = computed(
  () => props.embedLoad === 'facade' && !isFile.value && parsedEmbed.value !== null && !activated.value,
)

// Poster: author image wins; else YouTube's static thumbnail; Vimeo has none
// without its API, so the facade renders on the black player box + play glyph.
const facadePoster = computed(() => {
  if (props.posterImage) return props.posterImage
  const parsed = parsedEmbed.value
  return parsed?.provider === 'youtube' ? `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg` : ''
})

const { surfaceStyle } = useBlockSurface(props, { fallbackBackground: 'transparent' })

const sectionStyles = computed(() => {
  const styles: Record<string, string> = {}
  Object.assign(styles, surfaceStyle.value)
  return styles
})

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

const playerStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.borderRadius && props.borderRadius !== 'none') {
    style.borderRadius = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? '0'
  }
  return style
})

</script>

<style lang="scss" scoped>
.video-block {
  padding: var(--spacing-2xl) var(--spacing-md);

  @media (max-width: $bp-md) {
    padding: var(--spacing-xl) var(--spacing-md);
  }

  // ## Width authority
  // Outer scaffold width defers to --block-width-authority (fallback = old 120rem)
  // and inner (inline display) measure to --block-measure (fallback = old 60rem) so a
  // section / PlacementWrapper layoutConstraints can override the page-scaffold width
  // via the var contract WITHOUT piercing scoped styles. Default behavior is identical.
  &__container {
    max-width: var(--block-width-authority, 120rem);
    margin: 0 auto;
  }

  &--full &__container {
    max-width: 100%;
    padding: 0;
  }

  &--side-text &__container {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: var(--spacing-2xl);
    align-items: center;

    @media (max-width: $bp-md) {
      grid-template-columns: 1fr;
      gap: var(--spacing-xl);
    }
  }

  // Which side the player sits on. The text column is first in the DOM, so
  // "right" is the source order and the other three reorder the two children.
  &--side-text#{&}--media-left &__container {
    grid-template-columns: 1.5fr 1fr;
  }
  &--side-text#{&}--media-left &__text { order: 2; }
  &--side-text#{&}--media-left &__player-wrap { order: 1; }

  &--side-text#{&}--media-above &__container,
  &--side-text#{&}--media-below &__container {
    grid-template-columns: 1fr;
  }
  &--side-text#{&}--media-above &__text { order: 2; }
  &--side-text#{&}--media-above &__player-wrap { order: 1; }

  &__header {
    text-align: center;
    margin-block-end: var(--spacing-xl);
  }

  &__title {
    font-family: var(--rt-role-section-title-family, inherit);
    font-size: var(--rt-role-section-title-size, var(--font-size-2xl));
    font-weight: var(--rt-role-section-title-weight, var(--font-weight-bold));
    line-height: var(--rt-role-section-title-line-height, var(--line-height-tight));
    letter-spacing: var(--rt-role-section-title-letter-spacing, normal);
    text-transform: var(--rt-role-section-title-text-transform, none);
    color: var(--rt-role-section-title-color, inherit);
    margin: 0 0 var(--spacing-sm);

    @media (max-width: $bp-md) {
      font-size: var(--rt-role-section-title-size, var(--font-size-xl));
    }
  }

  &__description {
    font-family: var(--rt-role-body-family, inherit);
    font-size: var(--rt-role-body-size, var(--font-size-base));
    font-weight: var(--rt-role-body-weight, inherit);
    line-height: var(--rt-role-body-line-height, var(--line-height-relaxed));
    letter-spacing: var(--rt-role-body-letter-spacing, normal);
    text-transform: var(--rt-role-body-text-transform, none);
    color: var(--rt-role-body-color, var(--color-text-light));
    margin: 0;
  }

  &__player {
    position: relative;
    padding-block-end: 56.25%; // default 16:9
    height: 0;
    overflow: hidden;
    background: var(--color-black);

    // Aspect ratio variants — drive the intrinsic box height.
    &--16-9 { padding-block-end: 56.25%; }
    &--21-9 { padding-block-end: 42.857%; }
    // Wide ambient band ≈ 6:1 (design ref 1398×234).
    &--band { padding-block-end: 16.738%; }

    // On phones the 6:1 band collapses to an illegible ~44-108px smear.
    // Fall back to the asset's native 3:1 (ambient-loop.mp4 is 1440×480):
    // object-fit cover stops cropping at native ratio, yielding a legible
    // ~130px band at 390px. Container = [data-layout-content] once the shell
    // drops to breakpoint mode below 768; desktop scale-canvas untouched.
    @container (max-width: 768px) {
      &--band { padding-block-end: 33.333%; }
    }
  }

  &__iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  &__video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &__facade {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 0;
    border: 0;
    cursor: pointer;
    // background-color inherited from the player's `background: var(--color-black)`.
    background-color: transparent;
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
    color: var(--color-white);

    .material-icons-outlined {
      font-size: var(--font-size-5xl);
      // Faint dark scrim behind the glyph for legibility over any poster.
      // rgba literal — not an author-facing color control (Color Override Freeze safe).
      text-shadow: 0 2px 12px rgba(0, 0, 0, 0.55);
      transition: transform 0.2s ease, opacity 0.2s ease;
      opacity: 0.92;
    }

    &:hover .material-icons-outlined,
    &:focus-visible .material-icons-outlined {
      transform: scale(1.08);
      opacity: 1;
    }

    &:focus-visible {
      outline: 2px solid var(--color-white);
      outline-offset: -4px;
    }
  }

  &__placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    background: var(--color-background-light);
    color: var(--color-text-lighter);

    .material-icons-outlined {
      font-size: var(--font-size-4xl);
    }
  }

  &--display-featured {
    // Default full-width behavior (no additional styles needed)
  }

  &--display-inline {
    max-width: var(--block-measure, 60rem);
    margin-inline: var(--block-measure-align, auto);
    padding: var(--spacing-xl) var(--spacing-md);
  }
}
</style>
