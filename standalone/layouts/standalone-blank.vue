<script setup lang="ts">
// Theme CSS loads with the theme layout (see standalone-default.vue). Vite
// dedupes the modules, so mounting either layout loads the same two sheets.
import '~/themes/standalone/assets/scss/standalone.scss'
import '~/themes/standalone/assets/scss/main.scss'
import { computed, inject, type Ref } from 'vue'
import { provideLayoutMeta } from '~/shared/composables/useLayoutMeta'
import LayoutShell from '~/shared/features/layout/LayoutShell.vue'
import { useResolvedLayout } from '~/shared/composables/useResolvedLayout'
import { useClientConfig } from '~/shared/composables/useClientConfig'
import { provideAuthState } from '~/shared/composables/useAuthState'
import { useAuthToken } from '~/shared/composables/useAuthToken'

provideLayoutMeta({ hasHeader: false, hasFooter: false })

const { config } = useClientConfig()

// Same auth-state declaration as standalone-default — without it, blocks on a
// blank-layout page would always resolve to 'guest'. See useAuthState.
const { isAuthenticated } = useAuthToken(
  (config.value as any)?.themeSettings?.authStorageKey ?? 'authorization',
)
provideAuthState(isAuthenticated)

const currentPageMeta = inject<Ref<Record<string, any>> | null>('currentPageMeta', null)
const currentPageLayoutId = inject<Ref<string> | null>('currentPageLayoutId', null)

const resolvedLayout = useResolvedLayout(
  computed(() => ({ layout: (config.value as any)?.layout ?? { layouts: [] } })),
  computed(() => ({
    layout: currentPageLayoutId?.value ?? 'blank',
    meta: currentPageMeta?.value ?? {},
  })),
)
</script>

<template>
  <div data-theme="standalone" data-site-root>
    <LayoutShell :resolved-layout="resolvedLayout">
      <main>
        <!-- Bindings are required — consumers may destructure hasHeader/hasFooter. -->
        <slot :hasHeader="false" :hasFooter="false" />
      </main>
    </LayoutShell>
  </div>
</template>
