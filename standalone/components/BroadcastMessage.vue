<template>
  <div
    v-if="!dismissed"
    class="broadcast-message"
    :class="`broadcast-message--${variant}`"
    :style="{ ...notificationStyles, ...typographyStyle }"
    role="alert"
    aria-live="assertive"
    @animationend="onAnimationEnd"
  >
    <div class="broadcast-message__wrapper" :style="contentStyle">
      <div class="broadcast-message__content">
        <div data-target="icon" class="broadcast-message__icon-wrapper">
          <!-- Info Icon -->
          <svg
            v-if="variant === 'info'"
            class="broadcast-message__icon"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <text x="12" y="16" text-anchor="middle" font-size="8" font-weight="bold" fill="white">i</text>
          </svg>

          <!-- Success Icon -->
          <svg
            v-else-if="variant === 'success'"
            class="broadcast-message__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>

          <!-- Warning Icon -->
          <svg
            v-else-if="variant === 'warning'"
            class="broadcast-message__icon"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2L2 20h20L12 2z" />
          </svg>

          <!-- Error Icon -->
          <svg
            v-else-if="variant === 'error'"
            class="broadcast-message__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>

          <!-- Promotion Icon -->
          <svg
            v-else-if="variant === 'promotion'"
            class="broadcast-message__icon"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>

        <div class="broadcast-message__text-wrapper">
          <p data-target="message" class="broadcast-message__text" v-html="asHtml(localizedMessage)" />

          <!-- CTA Link -->
          <component
            v-if="resolvedCtaUrl && localizedCtaText"
            :is="isExternalCta ? 'a' : 'NuxtLink'"
            v-bind="isExternalCta
              ? { href: resolvedCtaUrl, target: ctaTarget, rel: ctaTarget === '_blank' ? 'noopener noreferrer' : undefined }
              : { to: resolvedCtaUrl }"
            data-target="cta"
            class="broadcast-message__cta"
          >
            {{ localizedCtaText }}
            <svg
              class="broadcast-message__cta-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </component>
        </div>
      </div>

      <!-- Countdown Timer -->
      <div
        v-if="showCountdown && countdownSeconds > 0"
        class="broadcast-message__countdown"
        aria-live="polite"
        :aria-label="`${countdownSeconds} seconds remaining`"
      >
        <span class="broadcast-message__countdown-text" aria-hidden="true">
          {{ countdownSeconds }}
        </span>
      </div>
    </div>

    <!-- Dismiss Button -->
    <button
      v-if="dismissible"
      class="broadcast-message__close"
      :aria-label="$t('broadcast.close', 'Close notification')"
      @click="handleDismiss"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { useTypographySlotStyle } from '~/shared/composables/useTypographySlotStyle'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'

const { getLocalizedValue } = useLocalized()
type Variant = 'info' | 'success' | 'warning' | 'error' | 'promotion'

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  blocks?: Array<Record<string, unknown>>
  message?: string | Record<string, string>
  variant?: Variant
  dismissible?: boolean
  sticky?: boolean
  ctaText?: string | Record<string, string>
  ctaUrl?: string
  ctaTarget?: '_blank' | '_self'
  countdownEnd?: string
  internalPadding?: string
  textAlign?: string
  surfaceStyle?: string
  borderRadius?: string
  messagePresetKey?: string | null
}>(), {
  variant: 'info',
  dismissible: true,
  sticky: false,
  ctaTarget: '_self',
  internalPadding: 'md',
  textAlign: 'left',
  surfaceStyle: 'none',
  borderRadius: 'none',
})

const typographyStyle = useTypographySlotStyle({
  message: computed(() => props.messagePresetKey),
})

const dismissed = ref(false)
const countdownSeconds = ref(0)
const showCountdown = ref(false)
let countdownInterval: ReturnType<typeof setInterval> | null = null
const STORAGE_KEY = `broadcast-dismissed-${props.blockId || Math.random().toString(36).slice(2, 9)}`

const localizedMessage = computed(() => getLocalizedValue(props.message))
const localizedCtaText = computed(() => getLocalizedValue(props.ctaText))
const resolvedCtaUrl = computed(() => props.ctaUrl)
const isExternalCta = computed(() => props.ctaUrl?.startsWith('http'))

const notificationStyles = computed(() => {
  const variantConfig: Record<Variant, { bg: string; text: string; border: string }> = {
    info: {
      bg: 'var(--broadcast-info-bg, #e3f2fd)',
      text: 'var(--broadcast-info-text, #1565c0)',
      border: 'var(--broadcast-info-border, #90caf9)',
    },
    success: {
      bg: 'var(--broadcast-success-bg, #e8f5e9)',
      text: 'var(--broadcast-success-text, #2e7d32)',
      border: 'var(--broadcast-success-border, #81c784)',
    },
    warning: {
      bg: 'var(--broadcast-warning-bg, #fff3e0)',
      text: 'var(--broadcast-warning-text, #e65100)',
      border: 'var(--broadcast-warning-border, #ffb74d)',
    },
    error: {
      bg: 'var(--broadcast-error-bg, #ffebee)',
      text: 'var(--broadcast-error-text, #c62828)',
      border: 'var(--broadcast-error-border, #ef5350)',
    },
    promotion: {
      bg: 'var(--broadcast-promotion-bg, var(--color-primary, #108A00))',
      text: 'var(--broadcast-promotion-text, #ffffff)',
      border: 'var(--broadcast-promotion-border, var(--color-primary-dark, #0d6b00))',
    },
  }

  const config = variantConfig[props.variant]
  const styles: Record<string, string> = {
    '--broadcast-bg': config.bg,
    '--broadcast-text': config.text,
    '--broadcast-border': config.border,
  }

  if (props.surfaceStyle === 'subtle') {
    styles['--broadcast-bg'] = 'var(--section-surface)'
  } else if (props.surfaceStyle === 'filled') {
    styles['--broadcast-bg'] = 'var(--section-accent)'
  }

  if (props.borderRadius) {
    styles.borderRadius = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? ''
  }

  return styles
})

function startCountdown() {
  if (!props.countdownEnd) return

  try {
    const endTime = new Date(props.countdownEnd).getTime()
    const now = new Date().getTime()
    countdownSeconds.value = Math.ceil((endTime - now) / 1000)

    if (countdownSeconds.value > 0) {
      showCountdown.value = true
      countdownInterval = setInterval(() => {
        countdownSeconds.value--
        if (countdownSeconds.value <= 0) {
          clearCountdown()
        }
      }, 1000)
    }
  } catch (e) {
    console.warn('[BroadcastMessage] Invalid countdown date format')
  }
}

function clearCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  showCountdown.value = false
}

function handleDismiss() {
  dismissed.value = true
  if (props.dismissible) {
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true')
    } catch (e) {
      console.warn('[BroadcastMessage] Storage unavailable', e)
    }
  }
}

function checkDismissed() {
  try {
    const wasDismissed = sessionStorage.getItem(STORAGE_KEY) === 'true'
    if (wasDismissed && props.dismissible) {
      dismissed.value = true
    }
  } catch (e) {
    console.warn('[BroadcastMessage] Storage unavailable', e)
  }
}

function onAnimationEnd() {
  // Reserved for future animation hooks
}

onMounted(() => {
  checkDismissed()
  startCountdown()
})

onBeforeUnmount(() => {
  clearCountdown()
})

watch(() => props.countdownEnd, () => {
  clearCountdown()
  startCountdown()
})

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  if (props.textAlign) {
    style.textAlign = props.textAlign
  }
  return style
})

</script>

<style lang="scss" scoped>
.broadcast-message {
  --broadcast-bg: #e3f2fd;
  --broadcast-text: #1565c0;
  --broadcast-border: #90caf9;

  width: 100%;
  background-color: var(--broadcast-bg);
  color: var(--broadcast-text);
  border: 0.1rem solid var(--broadcast-border);
  border-inline-start: 0.4rem solid var(--broadcast-border);
  padding: var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  animation: slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  margin-block-end: var(--spacing-md);

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-100%);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  &--info {
    --broadcast-bg: #e3f2fd;
    --broadcast-text: #1565c0;
    --broadcast-border: #90caf9;
  }

  &--success {
    --broadcast-bg: #e8f5e9;
    --broadcast-text: #2e7d32;
    --broadcast-border: #81c784;
  }

  &--warning {
    --broadcast-bg: #fff3e0;
    --broadcast-text: #e65100;
    --broadcast-border: #ffb74d;
  }

  &--error {
    --broadcast-bg: #ffebee;
    --broadcast-text: #c62828;
    --broadcast-border: #ef5350;
  }

  &--promotion {
    --broadcast-bg: var(--color-primary, #108A00);
    --broadcast-text: #ffffff;
    --broadcast-border: var(--color-primary-dark, #0d6b00);
  }

  &__wrapper {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    flex: 1;
  }

  &__content {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    flex: 1;
  }

  &__icon-wrapper {
    flex-shrink: 0;
  }

  &__icon {
    width: 2.4rem;
    height: 2.4rem;
    color: inherit;
  }

  &__text-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    flex: 1;
  }

  &__text {
    margin: 0;
    font-family: var(--rt-slot-message-family, var(--rt-role-body-family, inherit));
    font-size: var(--rt-slot-message-size, var(--rt-role-body-size, var(--font-size-base)));
    font-weight: var(--rt-slot-message-weight, var(--rt-role-body-weight, inherit));
    line-height: var(--rt-slot-message-line-height, var(--rt-role-body-line-height, var(--line-height-relaxed)));
    letter-spacing: var(--rt-slot-message-letter-spacing, var(--rt-role-body-letter-spacing, normal));
    text-transform: var(--rt-slot-message-text-transform, var(--rt-role-body-text-transform, none));
    font-variation-settings: var(--rt-slot-message-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-message-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-message-font-stretch, normal);
    font-style: var(--rt-slot-message-font-style, normal);
    color: var(--rt-slot-message-color, var(--rt-role-body-color, inherit));
    overflow-wrap: break-word;
    word-break: break-word;
  }

  &__cta {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-family: var(--rt-slot-cta-family, var(--rt-role-label-family, inherit));
    font-size: var(--rt-slot-cta-size, var(--rt-role-label-size, inherit));
    font-weight: var(--rt-slot-cta-weight, var(--rt-role-label-weight, var(--font-weight-semibold)));
    line-height: var(--rt-slot-cta-line-height, var(--rt-role-label-line-height, inherit));
    letter-spacing: var(--rt-slot-cta-letter-spacing, var(--rt-role-label-letter-spacing, normal));
    text-transform: var(--rt-slot-cta-text-transform, var(--rt-role-label-text-transform, none));
    font-variation-settings: var(--rt-slot-cta-font-variation-settings, normal);
    font-optical-sizing: var(--rt-slot-cta-font-optical-sizing, auto);
    font-stretch: var(--rt-slot-cta-font-stretch, normal);
    font-style: var(--rt-slot-cta-font-style, normal);
    text-decoration: none;
    color: var(--rt-slot-cta-color, var(--rt-role-label-color, inherit));
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--border-radius);
    transition: all var(--transition-base);
    width: fit-content;

    &:hover {
      text-decoration: underline;
      opacity: 0.9;
    }

    &:focus-visible {
      outline: 0.2rem solid currentColor;
      outline-offset: 0.2rem;
    }
  }

  &__cta-icon {
    width: 1.6rem;
    height: 1.6rem;
  }

  &__countdown {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 4rem;
    height: 4rem;
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: var(--border-radius-full);
  }

  &__countdown-text {
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-sm);
    color: inherit;
  }

  &__close {
    flex-shrink: 0;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: var(--spacing-xs);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--border-radius);
    transition: all var(--transition-base);
    opacity: 0.7;

    svg {
      width: 2rem;
      height: 2rem;
    }

    &:hover {
      opacity: 1;
      background-color: rgba(0, 0, 0, 0.05);
    }

    &:focus-visible {
      outline: 0.2rem solid currentColor;
      outline-offset: 0.2rem;
      opacity: 1;
    }
  }

  @media (max-width: $bp-md) {
    padding: var(--spacing-md);
    gap: var(--spacing-sm);
    flex-direction: column;
    align-items: flex-start;

    &__wrapper {
      width: 100%;
      gap: var(--spacing-sm);
    }

    &__content {
      gap: var(--spacing-sm);
    }

    &__countdown {
      align-self: flex-start;
      width: 3.2rem;
      height: 3.2rem;
    }

    &__close {
      align-self: flex-end;
    }
  }
}
</style>
