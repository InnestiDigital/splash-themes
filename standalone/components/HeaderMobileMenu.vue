<template>
  <ul class="header-mobile-menu" :class="`header-mobile-menu--depth-${depth}`">
    <li v-for="(item, index) in items" :key="item.id" class="header-mobile-menu__item">
      <div class="header-mobile-menu__row">
        <NuxtLink
          v-if="item.url"
          :to="item.url"
          class="header-mobile-menu__link"
          :style="staggerStyle(index)"
          :target="item.openInNewTab ? '_blank' : '_self'"
          :rel="item.openInNewTab ? 'noopener noreferrer' : ''"
          :aria-current="isActiveRoute(item.url) ? 'page' : undefined"
          @click="$emit('navigate')"
        >
          {{ item.label }}
        </NuxtLink>
        <span
          v-else
          class="header-mobile-menu__link header-mobile-menu__link--heading"
          :style="staggerStyle(index)"
        >
          {{ item.label }}
        </span>

        <button
          v-if="item.children?.length"
          type="button"
          class="header-mobile-menu__toggle"
          :aria-expanded="openId === item.id"
          :aria-label="submenuLabel(item.label)"
          @click="toggle(item.id)"
        >
          <span
            class="header-mobile-menu__chevron"
            :class="{ 'header-mobile-menu__chevron--open': openId === item.id }"
            aria-hidden="true"
          />
        </button>
      </div>

      <!--
        Recursive: one template for every level. Depth is passed down so the
        renderer can stop at NAV_MAX_DEPTH even if the stored tree is deeper,
        and so only the top level carries the drawer stagger index.
      -->
      <HeaderMobileMenu
        v-if="item.children?.length && openId === item.id && depth < NAV_MAX_DEPTH"
        :items="item.children ?? []"
        :is-drawer-mode="isDrawerMode"
        :depth="depth + 1"
        :submenu-label-template="submenuLabelTemplate"
        @navigate="$emit('navigate')"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import type { NavMenuItem } from '~/shared/types/headerZone'
import { NAV_MAX_DEPTH } from '~/shared/types/headerZone'

// Strings arrive as props, same contract as the header zones — Header.vue owns
// localization for the whole header.
const props = withDefaults(defineProps<{
  items: NavMenuItem[]
  isDrawerMode?: boolean
  depth?: number
  /** Accessible name for a submenu toggle. `{label}` is replaced by the parent item's label. */
  submenuLabelTemplate?: string
}>(), {
  isDrawerMode: false,
  depth: 1,
  submenuLabelTemplate: 'Toggle submenu for {label}',
})

defineEmits<{ navigate: [] }>()

const route = useRoute()

// One open branch per level. Each recursion instance owns its own ref, so
// sibling levels expand independently without a shared path structure.
const openId = ref<string | null>(null)

function toggle(id: string): void {
  openId.value = openId.value === id ? null : id
}

function submenuLabel(label: string): string {
  return props.submenuLabelTemplate.replace('{label}', label)
}

// Prefix match so a nested article still marks its section link as current.
// Same semantics HeaderShell used before the menu moved into this component.
function isActiveRoute(url: string): boolean {
  if (!url.startsWith('/')) return false
  return route.path === url || (url !== '/' && route.path.startsWith(`${url}/`))
}

// The drawer's slide-in choreography reads --item-index off each row. Only the
// top level animates; nested rows appear with their parent.
function staggerStyle(index: number): Record<string, number> | undefined {
  return props.isDrawerMode && props.depth === 1 ? { '--item-index': index } : undefined
}
</script>

<style lang="scss" scoped>
.header-mobile-menu {
  list-style: none;
  margin: 0;
  padding: 0;

  &--depth-2 { padding-left: 1.6rem; }
  &--depth-3 { padding-left: 3.2rem; }

  &__row {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }

  &__link {
    flex: 1 1 auto;
    text-decoration: none;
    color: inherit;

    &--heading {
      cursor: default;
      font-weight: var(--font-weight-semibold, 600);
    }
  }

  &__toggle {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    /* 4.4rem keeps the tap target at the 44px WCAG 2.5.5 minimum. */
    width: 4.4rem;
    height: 4.4rem;
    background: none;
    border: 0;
    cursor: pointer;
    color: inherit;

    &:focus-visible {
      outline: 0.2rem solid var(--color-focus);
      outline-offset: 0.2rem;
    }
  }

  &__chevron {
    width: 0.8rem;
    height: 0.8rem;
    border-right: 0.15rem solid currentColor;
    border-bottom: 0.15rem solid currentColor;
    transform: rotate(45deg);
    transition: transform var(--transition-fast);

    &--open {
      transform: rotate(-135deg);
    }
  }
}
</style>
