<template>
  <!-- No `v-if="hasTracks"` on the root: a configured-but-empty block must
       degrade to its empty message, not emit zero DOM and leave the page title
       floating over blank space. -->
  <section class="audio-playlist" data-target="root">
    <div class="audio-playlist__container">
      <h3
        v-if="localizedSectionHeading"
        class="audio-playlist__heading"
        data-target="sectionHeading"
        v-html="asHtml(localizedSectionHeading)"
      ></h3>

      <p v-if="!hasTracks" class="audio-playlist__empty" data-empty>
        {{ emptyText }}
      </p>

      <!--
        One native <audio controls> for the whole list rather than one per row.
        The browser's own player is keyboard-accessible and screen-reader
        labelled for free; a custom transport would have to re-earn all of it.
        Player + list only render when there is at least one track — an empty
        native player is a dead control.
      -->
      <audio
        v-if="hasTracks"
        ref="audioRef"
        class="audio-playlist__player"
        controls
        preload="none"
        :src="currentTrack?.url"
        :aria-label="playerLabel"
        @ended="onEnded"
      ></audio>

      <ol v-if="hasTracks" class="audio-playlist__items">
        <li
          v-for="(track, index) in tracks"
          :key="index"
          class="audio-playlist__item"
          :class="{ 'audio-playlist__item--current': index === currentIndex }"
          data-target="item"
          :data-item-index="index"
        >
          <button
            type="button"
            class="audio-playlist__select"
            :aria-current="index === currentIndex ? 'true' : undefined"
            @click="select(index)"
          >
            <span class="audio-playlist__index" aria-hidden="true">{{ index + 1 }}</span>
            <span class="audio-playlist__content">
              <span class="audio-playlist__title" v-html="asHtml(getLocalizedValue(track.title))"></span>
              <span
                v-if="getLocalizedValue(track.subtitle)"
                class="audio-playlist__subtitle"
                v-html="asHtml(getLocalizedValue(track.subtitle))"
              ></span>
            </span>
            <span v-if="track.duration" class="audio-playlist__duration">{{ track.duration }}</span>
          </button>

          <a
            v-if="props.showDownload"
            class="audio-playlist__download"
            :href="track.url"
            download
            :aria-label="downloadLabel(track)"
          >
            &darr;
          </a>
        </li>
      </ol>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'

interface Track {
  title: string | Record<string, string>
  subtitle?: string | Record<string, string>
  url: string
  duration?: string
}

// withDefaults, not `props.x ?? fallback`: Vue casts an ABSENT Boolean-typed
// prop to `false`, never `undefined`, so a `?? true` or `=== false` test cannot
// tell "author left it unset" from "author turned it off" — and settings stored
// before this field existed omit it entirely. The defaults here must match the
// `default` values in AudioPlaylist.settings.json.
const props = withDefaults(defineProps<{
  sectionHeading?: string | Record<string, string>
  tracks?: Track[]
  autoAdvance?: boolean
  showDownload?: boolean
  emptyMessage?: string | Record<string, string>
}>(), {
  autoAdvance: true,
  showDownload: false,
})

const { t } = useI18n()
const { getLocalizedValue } = useLocalized()

const audioRef = ref<HTMLAudioElement | null>(null)
const currentIndex = ref(0)

const localizedSectionHeading = computed(() => getLocalizedValue(props.sectionHeading))
const tracks = computed<Track[]>(() => (props.tracks ?? []).filter(track => !!track && !!track.url))
const hasTracks = computed(() => tracks.value.length > 0)
// Authored empty-state copy wins; the i18n string is the fallback so an empty
// playlist never renders as silent blank space.
const emptyText = computed(() =>
  getLocalizedValue(props.emptyMessage) || t('audioPlaylist.empty', 'No tracks available yet.'),
)
const currentTrack = computed<Track | null>(() => tracks.value[currentIndex.value] ?? null)

const playerLabel = computed(() =>
  currentTrack.value
    ? `${t('audioPlaylist.player', 'Audio player')} — ${plainText(currentTrack.value.title)}`
    : t('audioPlaylist.player', 'Audio player'),
)

// Titles are richtext-single, so they can carry inline markup. Strip it for
// attribute contexts (aria-label, download label) where markup would be read
// out verbatim.
function plainText(value: unknown): string {
  return getLocalizedValue(value as any).replace(/<[^>]*>/g, '').trim()
}

function downloadLabel(track: Track): string {
  return `${t('audioPlaylist.download', 'Download')} ${plainText(track.title)}`.trim()
}

// Changing `src` resets the element, so play() must wait for the new source to
// be attached — hence the nextTick. play() rejects when a browser blocks
// autoplay without a gesture; a click IS a gesture, so the only realistic
// rejection is a missing/unsupported file, which is worth surfacing.
async function playCurrent(): Promise<void> {
  await nextTick()
  try {
    await audioRef.value?.play()
  } catch (err) {
    console.error('[AudioPlaylist] playback failed', err)
  }
}

function select(index: number): void {
  if (index === currentIndex.value) {
    void playCurrent()
    return
  }
  currentIndex.value = index
  void playCurrent()
}

function onEnded(): void {
  if (!props.autoAdvance) return
  // Stop at the end rather than looping — a looping playlist that the visitor
  // cannot see the end of is the sort of thing people leave playing by accident.
  if (currentIndex.value >= tracks.value.length - 1) return
  currentIndex.value += 1
  void playCurrent()
}
</script>

<style lang="scss" scoped>
.audio-playlist {
  &__container {
    display: flex;
    flex-direction: column;
    gap: 1.6rem;
  }

  &__heading {
    margin: 0;
  }

  &__empty {
    margin: 0;
    color: var(--color-text-light);
  }

  &__player {
    width: 100%;
  }

  &__items {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  &__item {
    display: flex;
    align-items: stretch;
    gap: 0.8rem;
    border-bottom: 0.1rem solid var(--border-color, rgba(0, 0, 0, 0.1));

    &:last-child {
      border-bottom: none;
    }

    &--current {
      background: var(--color-background-light, rgba(0, 0, 0, 0.03));
    }
  }

  &__select {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    gap: 1.2rem;
    /* 4.4rem keeps the row at the 44px WCAG 2.5.5 touch-target minimum. */
    min-height: 4.4rem;
    padding: 0.8rem 0.4rem;
    background: none;
    border: 0;
    text-align: left;
    cursor: pointer;
    color: var(--color-text);
    font: inherit;

    &:hover {
      color: var(--color-primary);
    }

    &:focus-visible {
      outline: 0.2rem solid var(--color-focus, var(--color-primary));
      outline-offset: -0.2rem;
    }
  }

  &__index {
    flex: 0 0 auto;
    min-width: 2.4rem;
    color: var(--color-text-light);
    font-variant-numeric: tabular-nums;
  }

  &__content {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
  }

  &__subtitle {
    color: var(--color-text-light);
    font-size: 0.9em;
  }

  &__duration {
    flex: 0 0 auto;
    color: var(--color-text-light);
    font-variant-numeric: tabular-nums;
  }

  &__download {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 4.4rem;
    color: var(--color-text-light);
    text-decoration: none;

    &:hover {
      color: var(--color-primary);
    }
  }
}
</style>
