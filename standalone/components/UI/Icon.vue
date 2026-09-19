<template>
  <svg
    :class="['ui-icon', `ui-icon--${name}`]"
    :width="sizePixels"
    :height="sizePixels"
    :viewBox="`0 0 ${viewBoxSize} ${viewBoxSize}`"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    v-bind="$attrs"
  >
    <!-- Cart Icon -->
    <g v-if="name === 'cart'" :key="name">
      <path d="M7 4V3c0-.552.448-1 1-1h1c.552 0 1 .448 1 1v1h8V3c0-.552.448-1 1-1h1c.552 0 1 .448 1 1v1h2c1.657 0 3 1.343 3 3v12c0 1.657-1.343 3-3 3H3c-1.657 0-3-1.343-3-3V7c0-1.657 1.343-3 3-3h2zm0 2H3c-.552 0-1 .448-1 1v12c0 .552.448 1 1 1h18c.552 0 1-.448 1-1V7c0-.552-.448-1-1-1h-2v1c0 .552-.448 1-1 1h-1c-.552 0-1-.448-1-1V6H9v1c0 .552-.448 1-1 1H7c-.552 0-1-.448-1-1V6z" />
    </g>

    <!-- Heart Icon -->
    <g v-if="name === 'heart'" :key="name">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </g>

    <!-- Search Icon -->
    <g v-if="name === 'search'" :key="name">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />
    </g>

    <!-- User Icon -->
    <g v-if="name === 'user'" :key="name">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
    </g>

    <!-- Chevron Icon (Down) -->
    <g v-if="name === 'chevron'" :key="name">
      <polyline points="6 9 12 15 18 9" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
    </g>

    <!-- Close Icon -->
    <g v-if="name === 'close'" :key="name">
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </g>

    <!-- Check Icon -->
    <g v-if="name === 'check'" :key="name">
      <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
    </g>

    <!-- Home Icon -->
    <g v-if="name === 'home'" :key="name">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round" />
      <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round" />
    </g>

    <!-- Star Icon -->
    <g v-if="name === 'star'" :key="name">
      <polygon points="12 2 15.09 10.26 24 10.26 17.55 16.13 19.64 24 12 19.13 4.36 24 6.45 16.13 0 10.26 8.91 10.26" />
    </g>

    <!-- Lock Icon -->
    <g v-if="name === 'lock'" :key="name">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />
    </g>

    <!-- Unlock Icon -->
    <g v-if="name === 'unlock'" :key="name">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none" />
      <path d="M7 11V7a5 5 0 0 1 9.2 1" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />
    </g>

    <!-- Menu Icon -->
    <g v-if="name === 'menu'" :key="name">
      <line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </g>

    <!-- Alert Icon -->
    <g v-if="name === 'alert'" :key="name">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </g>

    <!-- Info Icon -->
    <g v-if="name === 'info'" :key="name">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" />
      <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </g>

    <!-- Success Icon (Check Circle) -->
    <g v-if="name === 'success'" :key="name">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" />
      <polyline points="16 12 11 17 8 14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
    </g>

    <!-- Error Icon (X Circle) -->
    <g v-if="name === 'error'" :key="name">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" />
      <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </g>

    <!-- Arrow Down -->
    <g v-if="name === 'arrow-down'" :key="name">
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <polyline points="19 12 12 19 5 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
    </g>

    <!-- Arrow Up -->
    <g v-if="name === 'arrow-up'" :key="name">
      <line x1="12" y1="19" x2="12" y2="5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <polyline points="5 12 12 5 19 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
    </g>

    <!-- Arrow Left -->
    <g v-if="name === 'arrow-left'" :key="name">
      <line x1="19" y1="12" x2="5" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <polyline points="12 19 5 12 12 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
    </g>

    <!-- Arrow Right -->
    <g v-if="name === 'arrow-right'" :key="name">
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <polyline points="12 5 19 12 12 19" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type IconName =
  | 'cart'
  | 'heart'
  | 'search'
  | 'user'
  | 'chevron'
  | 'close'
  | 'check'
  | 'home'
  | 'star'
  | 'lock'
  | 'unlock'
  | 'menu'
  | 'alert'
  | 'info'
  | 'success'
  | 'error'
  | 'arrow-down'
  | 'arrow-up'
  | 'arrow-left'
  | 'arrow-right'

type IconSize = 'sm' | 'md' | 'lg'

interface Props {
  name: IconName
  size?: IconSize
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const viewBoxSize = 24

const sizePixels = computed(() => {
  const sizeMap: Record<IconSize, number> = {
    sm: 16,
    md: 24,
    lg: 32
  }
  return sizeMap[props.size]
})
</script>

<style scoped lang="scss">
.ui-icon {
  display: inline-flex;
  flex-shrink: 0;
  vertical-align: -0.125em;
}
</style>
