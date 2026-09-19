<template>
  <div
    ref="rootRef"
    class="header-nav-zone"
    data-target="nav"
    :style="{
      transform: resolvedStyle.transform,
      transformOrigin: 'left center',
      opacity: resolvedStyle.opacity,
      pointerEvents: resolvedStyle.pointerEvents,
      visibility: resolvedStyle.visibility,
      willChange: 'transform, opacity',
    }"
    @keydown.esc="closeAll"
  >
    <a
      v-if="showHubReturn && hubReturnUrl"
      :href="hubReturnUrl"
      class="header-nav-zone__hub-return"
    >
      {{ hubReturnText }}
    </a>
    <ul class="header-nav-zone__menu">
      <li
        v-for="item in menuItems"
        :key="item.id"
        class="header-nav-zone__menu-item"
        @pointerenter="onPointerEnter(item, 0)"
        @pointerleave="onPointerLeave(0)"
      >
        <NuxtLink
          v-if="item.url"
          :to="item.url"
          class="header-nav-zone__menu-link"
          :target="item.openInNewTab ? '_blank' : '_self'"
          :rel="item.openInNewTab ? 'noopener noreferrer' : ''"
        >
          {{ item.label }}
        </NuxtLink>
        <span v-else class="header-nav-zone__menu-link header-nav-zone__menu-link--heading">
          {{ item.label }}
        </span>

        <!--
          Separate toggle so the parent stays a real link. Merging the two into
          one control would make a parent either navigable or expandable, never
          both — and every top-level entry on a section site is both.
        -->
        <button
          v-if="item.children?.length"
          type="button"
          class="header-nav-zone__toggle"
          aria-haspopup="true"
          :aria-expanded="openTop === item.id"
          :aria-controls="openTop === item.id ? submenuId(item.id) : undefined"
          :aria-label="submenuLabel(item.label)"
          @click="toggle(item, 0)"
        >
          <span class="header-nav-zone__chevron" aria-hidden="true" />
        </button>

        <ul v-if="item.children?.length && openTop === item.id" :id="submenuId(item.id)" class="header-nav-zone__submenu">
          <li
            v-for="child in item.children"
            :key="child.id"
            class="header-nav-zone__submenu-item"
            @pointerenter="onPointerEnter(child, 1)"
            @pointerleave="onPointerLeave(1)"
          >
            <NuxtLink
              v-if="child.url"
              :to="child.url"
              class="header-nav-zone__submenu-link"
              :target="child.openInNewTab ? '_blank' : '_self'"
              :rel="child.openInNewTab ? 'noopener noreferrer' : ''"
            >
              {{ child.label }}
            </NuxtLink>
            <span v-else class="header-nav-zone__submenu-link header-nav-zone__submenu-link--heading">
              {{ child.label }}
            </span>

            <button
              v-if="child.children?.length"
              type="button"
              class="header-nav-zone__toggle header-nav-zone__toggle--nested"
              aria-haspopup="true"
              :aria-expanded="openSecond === child.id"
              :aria-controls="openSecond === child.id ? submenuId(child.id) : undefined"
              :aria-label="submenuLabel(child.label)"
              @click="toggle(child, 1)"
            >
              <span class="header-nav-zone__chevron header-nav-zone__chevron--right" aria-hidden="true" />
            </button>

            <ul
              v-if="child.children?.length && openSecond === child.id"
              :id="submenuId(child.id)"
              class="header-nav-zone__flyout"
            >
              <li v-for="leaf in child.children" :key="leaf.id">
                <NuxtLink
                  :to="leaf.url || '#'"
                  class="header-nav-zone__submenu-link"
                  :target="leaf.openInNewTab ? '_blank' : '_self'"
                  :rel="leaf.openInNewTab ? 'noopener noreferrer' : ''"
                >
                  {{ leaf.label }}
                </NuxtLink>
              </li>
            </ul>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import type { ResolvedZoneStyle, NavMenuItem } from '~/shared/types/headerZone'

// Every string this zone renders arrives as a prop — Header.vue owns
// localization for the whole header. Keeping useI18n out of the zones is what
// lets them mount in tests without an i18n instance.
const props = withDefaults(defineProps<{
  menuItems: NavMenuItem[]
  showHubReturn: boolean
  hubReturnUrl: string
  hubReturnText: string
  resolvedStyle: ResolvedZoneStyle
  /** Accessible name for a submenu toggle. `{label}` is replaced by the parent item's label. */
  submenuLabelTemplate?: string
}>(), {
  submenuLabelTemplate: 'Toggle submenu for {label}',
})

const rootRef = ref<HTMLElement | null>(null)
// Two ids rather than a Set: the chrome paints exactly one open path, so a set
// would allow states the renderer cannot express (two sibling dropdowns open).
const openTop = ref<string | null>(null)
const openSecond = ref<string | null>(null)

// Open-provenance per level: only a POINTER-opened dropdown auto-closes on
// pointerleave. A `manual` open (toggle click / keyboard activation) must
// survive a mouse drifting across the bar — closing it out from under a
// keyboard user is the a11y gap this guards against. Outside-pointerdown,
// Escape, and focus-out still close everything regardless of provenance.
type OpenSource = 'pointer' | 'manual'
const openTopSource = ref<OpenSource | null>(null)
const openSecondSource = ref<OpenSource | null>(null)

function submenuId(itemId: string): string {
  return `header-nav-submenu-${itemId}`
}

function submenuLabel(label: string): string {
  return props.submenuLabelTemplate.replace('{label}', label)
}

function closeAll(): void {
  openTop.value = null
  openSecond.value = null
  openTopSource.value = null
  openSecondSource.value = null
}

function toggle(item: NavMenuItem, level: 0 | 1): void {
  if (level === 0) {
    const next = openTop.value === item.id ? null : item.id
    openTop.value = next
    openTopSource.value = next === null ? null : 'manual'
    openSecond.value = null
    openSecondSource.value = null
    return
  }
  const next = openSecond.value === item.id ? null : item.id
  openSecond.value = next
  openSecondSource.value = next === null ? null : 'manual'
}

// Hover only opens on devices that actually hover. On touch the pointerenter
// that accompanies a tap would open the dropdown and the click would close it
// again in the same gesture.
function canHover(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches
}

function onPointerEnter(item: NavMenuItem, level: 0 | 1): void {
  if (!canHover() || !item.children?.length) return
  if (level === 0) {
    // Re-entering an already-open item keeps its provenance: a manual open
    // must not be downgraded to pointer by the hover that follows it.
    if (openTop.value === item.id) return
    openTop.value = item.id
    openTopSource.value = 'pointer'
    openSecond.value = null
    openSecondSource.value = null
  } else {
    if (openSecond.value === item.id) return
    openSecond.value = item.id
    openSecondSource.value = 'pointer'
  }
}

function onPointerLeave(level: 0 | 1): void {
  if (!canHover()) return
  if (level === 0) {
    if (openTopSource.value === 'pointer') closeAll()
  } else if (openSecondSource.value === 'pointer') {
    openSecond.value = null
    openSecondSource.value = null
  }
}

function onDocumentPointerDown(event: PointerEvent): void {
  if (!rootRef.value || rootRef.value.contains(event.target as Node)) return
  closeAll()
}

// Focus leaving the nav entirely closes it — without this, tabbing past the
// last submenu link leaves an orphaned dropdown open over the page.
function onFocusIn(event: FocusEvent): void {
  if (!rootRef.value || rootRef.value.contains(event.target as Node)) return
  closeAll()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('focusin', onFocusIn)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('focusin', onFocusIn)
})

// A route change re-renders the page underneath but not this component, so the
// dropdown that was used to navigate would stay open on the new page.
watch(() => props.menuItems, closeAll)
</script>

<style lang="scss" scoped>
.header-nav-zone {
  display: flex;
  align-items: center;
  gap: 0;

  &__hub-return {
    display: inline-flex;
    align-items: center;
    font-size: 1.3rem;
    font-weight: var(--font-weight-medium);
    color: var(--nav-link-color, var(--color-text));
    text-decoration: none;
    padding-right: 1.2rem;
    margin-right: 1.2rem;
    border-right: 0.1rem solid var(--border-color);

    &:hover { color: var(--nav-link-hover-color, var(--color-primary)); }
  }

  &__menu {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    align-items: center;
    // A long top-level menu wraps to a second row instead of pushing the
    // header past the viewport edge (labels stay one line each — see the
    // nowrap on the link). Horizontal overflow is never the answer.
    flex-wrap: wrap;
    gap: 0;
  }

  &__menu-item {
    display: flex;
    align-items: center;
    margin-bottom: 0;
    /* Anchor for the absolutely-positioned dropdown. */
    position: relative;
  }

  &__menu-link {
    display: inline-flex;
    align-items: center;
    padding: 0 1.2rem;
    // One line per label: mid-width viewports were breaking labels onto two
    // lines before the menu itself wrapped, which misaligned the row.
    white-space: nowrap;
    font-size: 1.3rem;
    font-weight: var(--font-weight-medium);
    color: var(--nav-link-color, var(--color-text));
    text-decoration: none;
    transition: color var(--transition-fast);

    &:hover {
      color: var(--nav-link-hover-color, var(--color-primary));
    }

    &--heading {
      cursor: default;
    }
  }

  /* A parent link already carries the horizontal padding, so the toggle only
     needs to reclaim the right half of it. */
  &__toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.4rem;
    margin-left: -0.8rem;
    background: none;
    border: 0;
    cursor: pointer;
    color: inherit;

    &:focus-visible {
      outline: 0.2rem solid var(--color-focus);
      outline-offset: 0.2rem;
    }

    &--nested {
      margin-left: auto;
    }
  }

  &__chevron {
    width: 0.6rem;
    height: 0.6rem;
    border-right: 0.15rem solid currentColor;
    border-bottom: 0.15rem solid currentColor;
    transform: rotate(45deg);
    transform-origin: center;

    &--right {
      transform: rotate(-45deg);
    }
  }

  &__submenu,
  &__flyout {
    list-style: none;
    margin: 0;
    padding: 0.6rem 0;
    position: absolute;
    z-index: 40;
    min-width: 22rem;
    background: var(--header-bg-color, var(--color-background, #fff));
    border: 0.1rem solid var(--border-color, rgba(0, 0, 0, 0.1));
    border-radius: 0.4rem;
    box-shadow: 0 0.8rem 2.4rem rgba(0, 0, 0, 0.12);
  }

  &__submenu {
    top: 100%;
    left: 0;
  }

  &__flyout {
    top: -0.6rem;
    left: 100%;
  }

  &__submenu-item {
    display: flex;
    align-items: center;
    position: relative;
  }

  &__submenu-link {
    display: block;
    flex: 1 1 auto;
    padding: 0.6rem 1.6rem;
    font-size: 1.3rem;
    color: var(--nav-link-color, var(--color-text));
    text-decoration: none;
    transition: color var(--transition-fast), background-color var(--transition-fast);

    &:hover {
      color: var(--nav-link-hover-color, var(--color-primary));
      background: var(--color-surface-muted, rgba(0, 0, 0, 0.04));
    }

    &--heading {
      cursor: default;
      font-weight: var(--font-weight-semibold, 600);
    }
  }
}
</style>
