<template>
  <section class="certifications-grid" data-target="root">
    <!-- Cert tiles (3×2) + logo stack side-by-side -->
    <div class="certifications-grid__main">
      <!-- Left: 3×2 cert grid -->
      <div :class="tilesClass" data-target="tiles">
        <component
          :is="cert.link ? 'a' : 'div'"
          v-for="(cert, i) in certs"
          :key="i"
          :class="['certifications-grid__tile', { 'is-linked': cert.link }]"
          :data-item-index="i"
          data-target="tile"
          :href="cert.link || undefined"
          :target="cert.link ? '_blank' : undefined"
          :rel="cert.link ? 'noopener noreferrer' : undefined"
        >
          <span class="certifications-grid__tile-label">{{ cert.prefix }}</span>
          <span class="certifications-grid__tile-number">{{ cert.number }}</span>
          <span v-if="cert.year" class="certifications-grid__tile-year">{{ cert.year }}</span>
          <span class="certifications-grid__tile-desc">{{ cert.description }}</span>
          <template v-if="cert.link">
            <span class="certifications-grid__tile-arrow" aria-hidden="true">↗</span>
            <span class="certifications-grid__sr-only">Open verification</span>
          </template>
        </component>
      </div>

      <!-- Right: logo stack -->
      <div class="certifications-grid__logos" data-target="logos">
        <div
          v-for="(logo, i) in logos"
          :key="i"
          class="certifications-grid__logo-item"
          data-target="logo"
        >
          <img
            v-if="logo.image"
            :src="logo.image"
            :alt="logo.name || ''"
            class="certifications-grid__logo-img"
            loading="lazy"
            decoding="async"
            @error="onLogoError"
          />
          <!-- Shown when no image path, or when image load fails via onLogoError -->
          <span
            :class="logo.image ? 'certifications-grid__logo-placeholder-fallback' : 'certifications-grid__logo-placeholder'"
            :hidden="!!logo.image || undefined"
          >{{ logo.name }}</span>
        </div>
      </div>
    </div>

    <!-- Teal hairline divider -->
    <div class="certifications-grid__divider" aria-hidden="true" />

    <!-- ESG / WHITE LIST / Modello stacked rows -->
    <div class="certifications-grid__compliance" data-target="compliance">
      <div
        v-for="(row, i) in complianceRows"
        :key="i"
        class="certifications-grid__compliance-row"
        data-target="compliance-row"
      >
        {{ row }}
      </div>
    </div>

    <!-- Teal hairline divider -->
    <div class="certifications-grid__divider" aria-hidden="true" />

    <!-- 3-col footer: Codice Etico / Codice Disciplinare / Whistleblowing -->
    <div class="certifications-grid__footer-cols" data-target="footer-cols">
      <div
        v-for="(col, i) in footerColumns"
        :key="i"
        class="certifications-grid__footer-col"
        data-target="footer-col"
      >
        <span class="certifications-grid__footer-title">{{ col.title }}</span>
        <span v-if="col.subtitle" class="certifications-grid__footer-sub">{{ col.subtitle }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface CertItem {
  prefix: string
  number: string
  description: string
  year?: string
  link?: string
}

interface LogoItem {
  image?: string
  name?: string
}

// Repeater delivers objects {text: string}; also accept plain strings for direct JSON use
type ComplianceRow = string | { text: string }

interface FooterColumn {
  title: string
  subtitle?: string
}

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  blocks?: Array<Record<string, unknown>>
  certs?: CertItem[]
  logos?: LogoItem[]
  complianceRows?: ComplianceRow[]
  footerColumns?: FooterColumn[]
  tileColumns?: '2' | '3' | '4'
}>(), {
  certs: () => [],
  logos: () => [],
  complianceRows: () => [],
  footerColumns: () => [],
  tileColumns: '3',
})

const certs = computed(() => props.certs || [])
const logos = computed(() => props.logos || [])
// Normalize: repeater delivers {text: string}, direct JSON delivers string
const complianceRows = computed(() =>
  (props.complianceRows || []).map((r) =>
    typeof r === 'string' ? r : (r as { text: string }).text
  )
)
const footerColumns = computed(() => props.footerColumns || [])

// Opt-in tile column count. At the default '3' the class list is exactly the
// single base class (the null is dropped), so the DOM stays byte-identical.
const tilesClass = computed(() => [
  'certifications-grid__tiles',
  props.tileColumns !== '3' ? `certifications-grid__tiles--cols-${props.tileColumns}` : null,
])

// When a logo image fails to load, show its placeholder sibling
function onLogoError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
  const placeholder = img.parentElement?.querySelector('.certifications-grid__logo-placeholder-fallback')
  if (placeholder) {
    (placeholder as HTMLElement).hidden = false
  }
}
</script>

<style lang="scss" scoped>
/* Accent teal as a local custom property — matches theme accentColor #1B8AB7 */
.certifications-grid {
  --cert-accent: var(--color-accent, #1B8AB7);
  --cert-text: var(--section-text, var(--color-text, #282828));
  --cert-muted: var(--section-text-secondary, #666);

  padding-block: var(--spacing-lg);

  /* ── Main 2-col row: cert tiles + logos ── */
  &__main {
    display: grid;
    grid-template-columns: 1fr 12rem;
    gap: var(--spacing-xl);
    align-items: start;
    margin-block-end: var(--spacing-lg);
  }

  /* ── Cert tiles: 3 cols × 2 rows ── */
  &__tiles {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
    min-width: 0; /* prevent grid blowout */
  }

  /* ── Opt-in column-count variants ──
     Only emitted when `tileColumns` !== '3', so the default 3-col layout keeps
     the base `&__tile` nth rules untouched. Each variant re-derives the
     first-row border suppression + first-column zero-padding for its own count,
     overriding the 3-col base rules (extra parent class = higher specificity). */
  &__tiles--cols-2 {
    grid-template-columns: repeat(2, 1fr);

    .certifications-grid__tile {
      /* Restore the border the 3-col base suppressed on position 3, then remove
         it only for the true first row (2 tiles). */
      &:nth-child(-n + 3) {
        border-top: 1px solid rgba(0, 0, 0, 0.08);
      }
      &:nth-child(-n + 2) {
        border-top: none;
      }
      /* Restore the left padding the 3-col base zeroed at 3n+1, then zero the
         real first column (2n+1). */
      &:nth-child(3n + 1) {
        padding-inline-start: var(--spacing-md);
      }
      &:nth-child(2n + 1) {
        padding-inline-start: 0;
      }
    }
  }

  &__tiles--cols-4 {
    grid-template-columns: repeat(4, 1fr);

    .certifications-grid__tile {
      /* First row = 4 tiles: the 3-col base already suppressed 1–3, add 4. */
      &:nth-child(-n + 4) {
        border-top: none;
      }
      /* Restore the left padding the 3-col base zeroed at 3n+1, then zero the
         real first column (4n+1). */
      &:nth-child(3n + 1) {
        padding-inline-start: var(--spacing-md);
      }
      &:nth-child(4n + 1) {
        padding-inline-start: 0;
      }
    }
  }

  &__tile {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: var(--spacing-md) var(--spacing-md) var(--spacing-md) var(--spacing-md);
    /* Inter-row hairline via border-top (count-agnostic: the last row needs no
       special-casing, unlike a border-bottom + last-row-removal scheme). Only the
       FIRST row is suppressed, so the divider count and breakpoint logic stay
       correct for any number of cert tiles. */
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    min-width: 0;

    /* No divider above the first row (3-col layout) */
    &:nth-child(-n + 3) {
      border-top: none;
    }

    /* First column: no left padding (aligns with section edge) */
    &:nth-child(3n + 1) {
      padding-inline-start: 0;
    }

    /* ── Opt-in: verifiable credential tile (rendered as <a class="is-linked">) ──
       Only linked tiles gain interaction. Non-linked tiles are untouched, so a
       cert without a `link` field renders exactly as before. */
    &.is-linked {
      position: relative;
      text-decoration: none;
      color: inherit;
      cursor: pointer;
      transition: color 0.2s ease, background-color 0.2s ease;

      &:hover,
      &:focus-visible {
        color: var(--cert-accent);
        background-color: color-mix(in srgb, var(--cert-accent) 5%, transparent);
      }

      &:focus-visible {
        outline: 2px solid var(--cert-accent);
        outline-offset: 2px;
      }

      /* Verify arrow: fades + nudges into place on hover / keyboard focus */
      &:hover .certifications-grid__tile-arrow,
      &:focus-visible .certifications-grid__tile-arrow {
        opacity: 1;
        transform: translate(0, 0);
      }
    }
  }

  &__tile-year {
    font-size: var(--font-size-xs, 0.68rem);
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--cert-muted);
    line-height: 1.3;
  }

  &__tile-arrow {
    position: absolute;
    top: var(--spacing-md);
    right: var(--spacing-md);
    font-size: 0.9rem;
    line-height: 1;
    color: var(--cert-accent);
    opacity: 0;
    transform: translate(-2px, 2px);
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: none;
  }

  /* Visually-hidden text giving the anchor an explicit action name */
  &__sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* Reduced-motion: snap the linked-tile feedback, no easing */
  @media (prefers-reduced-motion: reduce) {
    &__tile.is-linked,
    &__tile-arrow {
      transition: none;
    }
  }

  &__tile-label {
    // Fallback lifted to the token value: a 0.7rem (7px) fallback silently
    // dropped below the legibility floor wherever the token is absent.
    font-size: var(--font-size-xs, 1.1rem);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--cert-muted);
    line-height: 1.3;
  }

  &__tile-number {
    font-size: clamp(1.3rem, 2vw, 1.8rem);
    font-weight: 700;
    color: var(--cert-text);
    line-height: 1.15;
  }

  &__tile-desc {
    // Fallback lifted to the token value (was 0.72rem / 7.2px, sub-floor).
    font-size: var(--font-size-xs, 1.1rem);
    /* Ref renders each cert caption in brand accent-blue (not muted grey) — see
       .parity/ref/home-scroll-8.png. Uses the theme accent token, not a freeform hex. */
    color: var(--cert-accent);
    line-height: 1.45;
  }

  /* ── Logo stack (right column) ── */
  &__logos {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-lg);
    padding-block: var(--spacing-sm);
    width: 12rem;
    flex-shrink: 0;
  }

  &__logo-item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 6rem;
  }

  &__logo-img {
    width: 100%;
    max-width: 9rem;
    max-height: 6rem;
    height: auto;
    object-fit: contain;
    display: block;
  }

  &__logo-placeholder,
  &__logo-placeholder-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 8rem;
    height: 5.5rem;
    border: 1px dashed rgba(0, 0, 0, 0.18);
    border-radius: 0.4rem;
    // Legibility floor: was 0.65rem (6.5px) — unreadable. 1.1rem is the theme's
    // absolute meta/label floor; the 8x5.5rem box still fits the wrapped label.
    font-size: var(--font-size-xs, 1.1rem);
    color: var(--cert-muted);
    text-align: center;
    padding: 0.4rem;

    &[hidden] {
      display: none;
    }
  }

  /* ── Teal hairline ── */
  &__divider {
    height: 1px;
    background-color: var(--cert-accent);
    margin-block: var(--spacing-md);
  }

  /* ── Compliance stacked rows ── */
  &__compliance {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding-block: var(--spacing-sm);
  }

  &__compliance-row {
    font-size: var(--font-size-sm, 0.9rem);
    color: var(--cert-text);
    line-height: 1.5;
  }

  /* ── 3-col footer block ── */
  &__footer-cols {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-lg);
    padding-block: var(--spacing-sm);
  }

  &__footer-col {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  &__footer-title {
    font-size: var(--font-size-base, 1rem);
    font-weight: 600;
    color: var(--cert-text);
    line-height: 1.35;
  }

  &__footer-sub {
    font-size: var(--font-size-sm, 0.85rem);
    color: var(--cert-muted);
    line-height: 1.5;
  }

  /* ── Responsive ── */
  @media (max-width: $bp-lg) {
    &__main {
      grid-template-columns: 1fr;
    }

    &__logos {
      flex-direction: row;
      flex-wrap: wrap;
      min-width: unset;
    }

    &__footer-cols {
      grid-template-columns: 1fr 1fr;
    }

    /* 4 columns is too tight on tablet — collapse the cols-4 variant to 2-col
       (same re-derivation the base uses at $bp-sm). cols-2 is already fine. */
    &__tiles--cols-4 {
      grid-template-columns: repeat(2, 1fr);

      .certifications-grid__tile {
        &:nth-child(-n + 3) {
          border-top: 1px solid rgba(0, 0, 0, 0.08);
        }
        &:nth-child(-n + 2) {
          border-top: none;
        }
        &:nth-child(3n + 1) {
          padding-inline-start: var(--spacing-md);
        }
        &:nth-child(2n + 1) {
          padding-inline-start: 0;
        }
      }
    }
  }

  @media (max-width: $bp-sm) {
    &__tiles {
      grid-template-columns: repeat(2, 1fr);
    }

    /* Re-derive first-row suppression + first-column padding for the 2-col grid. */
    &__tile {
      &:nth-child(-n + 3) {
        border-top: 1px solid rgba(0, 0, 0, 0.08);
      }
      &:nth-child(-n + 2) {
        border-top: none;
      }
      &:nth-child(3n + 1) {
        padding-inline-start: var(--spacing-md);
      }
      &:nth-child(2n + 1) {
        padding-inline-start: 0;
      }
    }

    /* Narrow phones: never show 4 (or 2) cramped tiles — force every column
       variant to the same 2-col layout the base uses here. The extra parent
       class keeps these above the outside-media cols-2/cols-4 rules. */
    &__tiles--cols-2,
    &__tiles--cols-4 {
      grid-template-columns: repeat(2, 1fr);

      .certifications-grid__tile {
        &:nth-child(-n + 3) {
          border-top: 1px solid rgba(0, 0, 0, 0.08);
        }
        &:nth-child(-n + 2) {
          border-top: none;
        }
        &:nth-child(3n + 1) {
          padding-inline-start: var(--spacing-md);
        }
        &:nth-child(2n + 1) {
          padding-inline-start: 0;
        }
      }
    }

    &__footer-cols {
      grid-template-columns: 1fr;
    }
  }
}
</style>
