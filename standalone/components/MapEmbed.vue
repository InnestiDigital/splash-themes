<template>
  <section class="map-embed" :class="rootClasses" data-target="root">
    <div class="map-embed__inner" :style="innerStyle">
      <div
        v-if="showLocationChips"
        class="map-embed__locations"
        role="group"
        :aria-label="LOCATIONS_LABEL"
      >
        <button
          v-for="(loc, i) in validLocations"
          :key="i"
          type="button"
          class="map-embed__chip"
          :class="{ 'map-embed__chip--active': i === clampedIndex }"
          :aria-pressed="i === clampedIndex ? 'true' : 'false'"
          :aria-label="locationLabel(loc, i)"
          @click="selectLocation(i)"
        >
          {{ locationLabel(loc, i) }}
        </button>
      </div>

      <figure class="map-embed__figure">
      <div
        class="map-embed__frame"
        :class="aspectRatioClass"
        :style="frameStyle"
        data-target="media"
      >
        <!-- Loaded / consent-not-required: the real OSM embed (only request fired) -->
        <iframe
          v-if="showIframe"
          class="map-embed__iframe"
          :src="osmUrl"
          :title="addressTitle"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
        ></iframe>

        <!-- Privacy gate: no third-party request until the visitor opts in -->
        <div v-else class="map-embed__placeholder">
          <svg
            class="map-embed__glyph"
            viewBox="0 0 24 24"
            width="40"
            height="40"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M12 2a7 7 0 0 0-7 7c0 4.9 7 13 7 13s7-8.1 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"
              fill="currentColor"
            />
          </svg>

          <p v-if="!hasCoords" class="map-embed__placeholder-note">{{ UNCONFIGURED_LABEL }}</p>

          <button
            v-if="showConsent"
            type="button"
            class="map-embed__consent-button"
            @click="loaded = true"
          >
            {{ consentButtonLabel }}
          </button>
        </div>
      </div>

      <figcaption
        v-if="localizedAddress"
        class="map-embed__caption"
        data-target="caption"
        v-html="asHtml(localizedAddress)"
      ></figcaption>
      </figure>

      <a
        v-if="directionsUrl"
        class="map-embed__directions"
        :href="directionsUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg
          class="map-embed__directions-icon"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M14 3v2h3.59l-9.3 9.29 1.42 1.42L19 6.41V10h2V3h-7Z" fill="currentColor" />
          <path d="M5 5h5V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5h-2v5H5V5Z" fill="currentColor" />
        </svg>
        {{ DIRECTIONS_LABEL }}
      </a>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'

const { getLocalizedValue } = useLocalized()

// A single authored location in the optional multi-office switcher. Mirrors the
// top-level single-location props so the active source can fall straight through.
interface MapLocation {
  label?: string | Record<string, string>
  latitude?: string
  longitude?: string
  zoom?: string
  address?: string | Record<string, string>
}

const props = defineProps<{
  locations?: MapLocation[]
  latitude?: string
  longitude?: string
  zoom?: string
  address?: string | Record<string, string>
  showMarker?: boolean
  showDirections?: boolean
  requireConsent?: boolean
  consentLabel?: string | Record<string, string>
  aspectRatio?: string
  borderRadius?: string
  internalPadding?: string
  contentAlignH?: string
}>()

// Static locale-matched labels (tenant locale is Italian) — real, working copy.
const DIRECTIONS_LABEL = 'Apri nelle mappe'
const UNCONFIGURED_LABEL = 'Posizione non impostata'
const LOCATIONS_LABEL = 'Sedi'

// Longitude half-span (in degrees) per zoom level — drives the deterministic bbox.
// Latitude uses a rough aspect correction so the map isn't vertically stretched.
const LON_HALF_SPAN: Record<number, number> = { 12: 0.08, 14: 0.02, 15: 0.01, 17: 0.0025 }

// Plain-text from (rich) markup — for the iframe's accessible name.
function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6
}

// Number() parse + range clamp. Empty/blank/NaN → NaN so the block renders a
// neutral placeholder instead of emitting a broken (0,0) iframe.
function parseCoord(raw: string | undefined, min: number, max: number): number {
  if (raw === undefined) return NaN
  const s = raw.trim()
  if (!s) return NaN
  const n = Number(s)
  if (Number.isNaN(n)) return NaN
  return Math.min(max, Math.max(min, n))
}

// A location is valid only if BOTH coordinates parse — reuse parseCoord so the
// chip switcher and the map share one definition of "renderable".
function isValidLocation(loc: MapLocation): boolean {
  return (
    !Number.isNaN(parseCoord(loc.latitude, -90, 90)) &&
    !Number.isNaN(parseCoord(loc.longitude, -180, 180))
  )
}

// Multi-office opt-in: only valid entries drive the switcher. Empty/absent →
// empty array, so the single-location fallback path is byte-identical.
const validLocations = computed<MapLocation[]>(() =>
  (props.locations ?? []).filter(isValidLocation),
)

// Chip bar shows only with 2+ authored offices; a lone location behaves exactly
// like the legacy single-location block (no chrome added).
const showLocationChips = computed(() => validLocations.value.length >= 2)

// activeIndex is guarded against out-of-range in every read via clampedIndex, so
// a shrinking locations list can never point past the end.
const activeIndex = ref(0)
const clampedIndex = computed(() => {
  const n = validLocations.value.length
  if (n === 0) return 0
  return Math.min(Math.max(activeIndex.value, 0), n - 1)
})

function selectLocation(index: number): void {
  activeIndex.value = index
}

// The single source every map computed derives from. With >= 1 valid location it
// is the active office; otherwise it falls straight through to the top-level
// props — making the no-locations render byte-identical to the original.
const activeLocation = computed<MapLocation>(() => {
  if (validLocations.value.length >= 1) {
    return validLocations.value[clampedIndex.value]
  }
  return {
    latitude: props.latitude,
    longitude: props.longitude,
    zoom: props.zoom,
    address: props.address,
  }
})

const lat = computed(() => parseCoord(activeLocation.value.latitude, -90, 90))
const lng = computed(() => parseCoord(activeLocation.value.longitude, -180, 180))
const hasCoords = computed(() => !Number.isNaN(lat.value) && !Number.isNaN(lng.value))

const zoomNum = computed(() => {
  const n = Number(activeLocation.value.zoom)
  return Number.isNaN(n) ? 15 : n
})

// Deterministic OSM embed URL — no API key, no external JS. bbox is a single
// comma-joined value, so build the query by hand and encode each numeric piece.
const osmUrl = computed(() => {
  if (!hasCoords.value) return ''
  const cLat = round6(lat.value)
  const cLng = round6(lng.value)
  const lonHalf = LON_HALF_SPAN[zoomNum.value] ?? 0.01
  const latHalf = lonHalf * 0.6
  const bbox = [
    round6(cLng - lonHalf),
    round6(cLat - latHalf),
    round6(cLng + lonHalf),
    round6(cLat + latHalf),
  ]
    .map((v) => encodeURIComponent(String(v)))
    .join(',')
  let query = `bbox=${bbox}&layer=mapnik`
  if (props.showMarker !== false) {
    query += `&marker=${encodeURIComponent(String(cLat))},${encodeURIComponent(String(cLng))}`
  }
  return `https://www.openstreetmap.org/export/embed.html?${query}`
})

const directionsUrl = computed(() => {
  if (props.showDirections === false || !hasCoords.value) return ''
  const cLat = round6(lat.value)
  const cLng = round6(lng.value)
  return `https://www.openstreetmap.org/?mlat=${cLat}&mlon=${cLng}#map=${zoomNum.value}/${cLat}/${cLng}`
})

const localizedAddress = computed(() => getLocalizedValue(activeLocation.value.address))
const addressTitle = computed(() => {
  const a = localizedAddress.value
  return (a && stripTags(a)) || 'Map'
})
const consentButtonLabel = computed(() => getLocalizedValue(props.consentLabel) || 'Carica la mappa')

// Localized chip caption with a locale-matched fallback when a label is blank.
function locationLabel(loc: MapLocation, index: number): string {
  return getLocalizedValue(loc.label) || `Sede ${index + 1}`
}

// Consent gate: the iframe (and its third-party request) mounts only after opt-in.
const loaded = ref(false)
const needsConsent = computed(() => props.requireConsent !== false)
const showIframe = computed(() => (!needsConsent.value || loaded.value) && hasCoords.value)
const showConsent = computed(() => needsConsent.value && !loaded.value && hasCoords.value)

const rootClasses = computed(() => ({
  'map-embed--unconfigured': !hasCoords.value,
}))

const aspectRatioClass = computed(
  () => `map-embed__frame--${(props.aspectRatio || '16:9').replace(':', '-')}`,
)

// borderRadius + overflow ride the FRAME so the map is clipped to the corners.
const frameStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.borderRadius && props.borderRadius !== 'none') {
    style.borderRadius = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? ''
    style.overflow = 'hidden'
  }
  return style
})

// internalPadding + horizontal alignment ride the inner column (mirrors siblings).
const innerStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  if (props.contentAlignH && props.contentAlignH !== 'left') {
    const alignMap: Record<string, string> = { center: 'center', right: 'flex-end' }
    style.alignItems = alignMap[props.contentAlignH] ?? 'flex-start'
  }
  return style
})
</script>

<style lang="scss" scoped>
.map-embed {
  padding: var(--spacing-3xl) var(--spacing-xl);

  &__inner {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    max-width: var(--container-max-width, 1200px);
    margin: 0 auto;
  }

  &__locations {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm, 0.8rem);
    width: 100%;
    margin-bottom: var(--spacing-md, 1.2rem);
  }

  &__chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 4.4rem;
    padding: 0 var(--spacing-md, 1.2rem);
    border: 1px solid var(--color-border, var(--border-color, rgba(0, 0, 0, 0.15)));
    border-radius: var(--border-radius, 0.4rem);
    background: var(--color-background, #fff);
    color: var(--section-text, var(--color-text));
    font-family: var(--rt-role-label-family, var(--font-family-body, inherit));
    font-size: var(--rt-role-caption-size, var(--font-size-sm, 1.4rem));
    line-height: 1.2;
    cursor: pointer;
    transition: box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;

    &:hover {
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary, currentColor);
      outline-offset: 2px;
    }

    &--active {
      border-color: var(--color-accent, currentColor);
      background: color-mix(in srgb, var(--color-accent, currentColor) 12%, var(--color-background, #fff));
      font-weight: 600;
    }
  }

  &__figure {
    margin: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  &__frame {
    position: relative;
    width: 100%;
    // Subtle theme tint while the tiles load (and behind the placeholder).
    background: var(--color-background-lighter, #f2f2f2);

    &--16-9 {
      aspect-ratio: 16 / 9;
    }

    &--4-3 {
      aspect-ratio: 4 / 3;
    }

    &--1-1 {
      aspect-ratio: 1 / 1;
    }

    &--21-9 {
      aspect-ratio: 21 / 9;
    }
  }

  &__iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }

  &__placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md, 1.2rem);
    padding: var(--spacing-lg, 1.6rem);
    text-align: center;
    background: color-mix(in srgb, var(--section-text, var(--color-text)) 4%, transparent);
    color: var(--section-text, var(--color-text));
  }

  &__glyph {
    opacity: 0.5;
  }

  &__placeholder-address,
  &__placeholder-note {
    margin: 0;
    max-width: 40ch;
    font-family: var(--rt-role-caption-family, var(--font-family-body, inherit));
    font-size: var(--rt-role-caption-size, var(--font-size-sm, 1.4rem));
    line-height: var(--rt-role-caption-line-height, 1.5);
    color: var(--section-text, var(--color-text));
  }

  &__placeholder-note {
    opacity: 0.7;
  }

  &__consent-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 4.4rem;
    padding: 0 var(--spacing-lg, 1.6rem);
    border: 1px solid var(--color-border, var(--border-color, rgba(0, 0, 0, 0.15)));
    border-radius: var(--border-radius, 0.4rem);
    background: var(--color-background, #fff);
    color: inherit;
    font-family: var(--rt-role-label-family, var(--font-family-body, inherit));
    font-size: var(--rt-role-body-size, var(--font-size-base, 1.6rem));
    line-height: 1.2;
    cursor: pointer;
    transition: box-shadow 0.2s ease, transform 0.2s ease;

    &:hover {
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary, currentColor);
      outline-offset: 2px;
    }
  }

  &__caption {
    margin-top: var(--spacing-sm, 0.8rem);
    font-family: var(--rt-role-caption-family, var(--font-family-body, inherit));
    font-size: var(--rt-role-caption-size, var(--font-size-sm, 1.4rem));
    font-weight: var(--rt-role-caption-weight, 400);
    line-height: var(--rt-role-caption-line-height, 1.5);
    letter-spacing: var(--rt-role-caption-letter-spacing, normal);
    text-transform: var(--rt-role-caption-text-transform, none);
    color: var(--rt-role-caption-color, var(--section-text, var(--color-text)));
  }

  &__directions {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    min-height: 4.4rem;
    margin-top: var(--spacing-sm, 0.8rem);
    color: var(--color-accent, currentColor);
    font-family: var(--rt-role-caption-family, var(--font-family-body, inherit));
    font-size: var(--rt-role-caption-size, var(--font-size-sm, 1.4rem));
    line-height: 1.4;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary, currentColor);
      outline-offset: 2px;
    }
  }

  &__directions-icon {
    flex: 0 0 auto;
  }
}
</style>
