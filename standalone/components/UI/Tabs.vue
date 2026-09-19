<template>
  <div class="ui-tabs">
    <div
      class="ui-tabs__nav"
      role="tablist"
      @keydown="onNavKeydown"
    >
      <button
        v-for="(tab, index) in tabs"
        :key="index"
        :ref="el => { if (el) tabRefs[index] = el as HTMLButtonElement }"
        :id="`tab-button-${instanceId}-${index}`"
        :aria-selected="activeTab === index"
        :aria-controls="`tab-panel-${instanceId}-${index}`"
        :tabindex="activeTab === index ? 0 : -1"
        :class="[
          'ui-tabs__button',
          { 'ui-tabs__button--active': activeTab === index }
        ]"
        role="tab"
        @click="selectTab(index)"
      >
        <Icon v-if="tab.icon" :name="tab.icon" class="ui-tabs__icon" aria-hidden="true" />
        {{ tab.label }}
      </button>
    </div>

    <div class="ui-tabs__content">
      <div
        v-for="(tab, index) in tabs"
        :key="index"
        :id="`tab-panel-${instanceId}-${index}`"
        :aria-labelledby="`tab-button-${instanceId}-${index}`"
        :hidden="activeTab !== index"
        class="ui-tabs__panel"
        role="tabpanel"
        tabindex="0"
      >
        <slot :name="`tab-${index}`">
          {{ tab.content }}
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, getCurrentInstance } from 'vue'
import Icon from './Icon.vue'

interface Tab {
  label: string
  content?: string
  icon?: string
}

interface Props {
  tabs: Tab[]
  defaultActive?: number
}

const props = withDefaults(defineProps<Props>(), {
  defaultActive: 0
})

const instanceId = getCurrentInstance()?.uid ?? Math.random().toString(36).slice(2)
const activeTab = ref(props.defaultActive)
const tabRefs = ref<HTMLButtonElement[]>([])

function selectTab(index: number) {
  activeTab.value = index
}

function onNavKeydown(e: KeyboardEvent) {
  const count = props.tabs.length
  if (count === 0) return

  let next: number | null = null

  if (e.key === 'ArrowRight') {
    next = (activeTab.value + 1) % count
  } else if (e.key === 'ArrowLeft') {
    next = (activeTab.value - 1 + count) % count
  } else if (e.key === 'Home') {
    next = 0
  } else if (e.key === 'End') {
    next = count - 1
  }

  if (next !== null) {
    e.preventDefault()
    selectTab(next)
    tabRefs.value[next]?.focus()
  }
}

defineExpose({
  activeTab
})
</script>

<style scoped lang="scss">
.ui-tabs {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.ui-tabs__nav {
  display: flex;
  border-block-end: 0.2rem solid var(--ui-color-border);
  gap: 0;
  overflow-x: auto;
  overflow-y: hidden;

  &::-webkit-scrollbar {
    height: 0.4rem;
  }

  &::-webkit-scrollbar-track {
    background: var(--ui-color-bg-subtle);
  }

  &::-webkit-scrollbar-thumb {
    background: var(--ui-color-text-faint);
    border-radius: 0.2rem;

    &:hover {
      background: var(--ui-color-text-muted);
    }
  }
}

.ui-tabs__button {
  padding: var(--ui-spacing-md) var(--ui-spacing-xl);
  background: none;
  border: none;
  border-block-end: 0.2rem solid transparent;
  margin-block-end: -0.2rem;
  cursor: pointer;
  font-size: var(--ui-font-size-base);
  font-weight: var(--ui-font-weight-medium);
  color: var(--ui-color-text-muted);
  transition: var(--ui-transition-base);
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: var(--ui-spacing-xs);
  font-family: inherit;

  &:hover {
    color: var(--ui-color-text);
  }

  &--active {
    color: var(--ui-color-primary);
    border-block-end-color: var(--ui-color-primary);
  }

  &:focus-visible {
    outline: 0.2rem solid var(--ui-color-primary);
    outline-offset: -0.2rem;
  }
}

.ui-tabs__icon {
  width: 2rem;
  height: 2rem;
}

.ui-tabs__content {
  padding: var(--ui-spacing-xl) 0;
}

.ui-tabs__panel {
  animation: fadeIn 0.3s ease-in;

  &[hidden] {
    display: none;
  }

  &:focus-visible {
    outline: 0.2rem solid var(--ui-color-primary);
    outline-offset: 0.2rem;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: $bp-sm) {
  .ui-tabs__button {
    padding: var(--ui-spacing-sm) var(--ui-spacing-md);
    font-size: var(--ui-font-size-sm);
  }

  .ui-tabs__content {
    padding: var(--ui-spacing-md) 0;
  }
}
</style>
