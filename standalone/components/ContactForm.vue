<template>
  <div class="splash-contact-form" :style="{ ...contentStyle, ...typographyStyle }">
    <!-- Success Message -->
    <div
      v-if="showSuccess"
      ref="successEl"
      class="splash-contact-form__success"
      role="status"
      aria-live="polite"
      tabindex="-1"
    >
      <svg class="splash-contact-form__success-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
      </svg>
      <p class="splash-contact-form__success-message">{{ localizedSuccessMessage }}</p>
    </div>

    <!-- Form -->
    <form v-else @submit.prevent="handleSubmit" class="splash-contact-form__form" novalidate>
      <div class="splash-contact-form__form-group">
        <label :for="`name-${uid}`" class="splash-contact-form__label">
          {{ $t('contact.fullName', 'Full Name') }}
          <span class="required" aria-hidden="true">*</span>
        </label>
        <input
          :id="`name-${uid}`"
          v-model="formData.name"
          type="text"
          class="splash-contact-form__input"
          :class="{ 'splash-contact-form__input--error': errors.name }"
          :aria-invalid="!!errors.name"
          :aria-describedby="errors.name ? `name-err-${uid}` : undefined"
          autocomplete="name"
          required
          aria-required="true"
        />
        <span v-if="errors.name" :id="`name-err-${uid}`" class="splash-contact-form__field-error" role="alert">
          {{ errors.name }}
        </span>
      </div>

      <div class="splash-contact-form__form-group">
        <label :for="`email-${uid}`" class="splash-contact-form__label">
          {{ $t('contact.emailAddress', 'Email Address') }}
          <span class="required" aria-hidden="true">*</span>
        </label>
        <input
          :id="`email-${uid}`"
          v-model="formData.email"
          type="email"
          class="splash-contact-form__input"
          :class="{ 'splash-contact-form__input--error': errors.email }"
          :aria-invalid="!!errors.email"
          :aria-describedby="errors.email ? `email-err-${uid}` : undefined"
          autocomplete="email"
          required
          aria-required="true"
        />
        <span v-if="errors.email" :id="`email-err-${uid}`" class="splash-contact-form__field-error" role="alert">
          {{ errors.email }}
        </span>
      </div>

      <div v-if="showPhone" class="splash-contact-form__form-group">
        <label :for="`phone-${uid}`" class="splash-contact-form__label">
          {{ $t('contact.phoneNumber', 'Phone Number') }}
        </label>
        <input
          :id="`phone-${uid}`"
          v-model="formData.phone"
          type="tel"
          class="splash-contact-form__input"
          autocomplete="tel"
        />
      </div>

      <div v-if="showSubject" class="splash-contact-form__form-group">
        <label :for="`subject-${uid}`" class="splash-contact-form__label">
          {{ $t('contact.subject', 'Subject') }}
          <span class="required" aria-hidden="true">*</span>
        </label>
        <input
          :id="`subject-${uid}`"
          v-model="formData.subject"
          type="text"
          class="splash-contact-form__input"
          :class="{ 'splash-contact-form__input--error': errors.subject }"
          :aria-invalid="!!errors.subject"
          :aria-describedby="errors.subject ? `subject-err-${uid}` : undefined"
          required
          aria-required="true"
        />
        <span v-if="errors.subject" :id="`subject-err-${uid}`" class="splash-contact-form__field-error" role="alert">
          {{ errors.subject }}
        </span>
      </div>

      <div class="splash-contact-form__form-group">
        <label :for="`message-${uid}`" class="splash-contact-form__label">
          {{ $t('contact.message', 'Message') }}
          <span class="required" aria-hidden="true">*</span>
        </label>
        <textarea
          :id="`message-${uid}`"
          v-model="formData.message"
          class="splash-contact-form__textarea"
          :class="{ 'splash-contact-form__input--error': errors.message }"
          :aria-invalid="!!errors.message"
          :aria-describedby="errors.message ? `message-err-${uid}` : undefined"
          rows="6"
          required
          aria-required="true"
        ></textarea>
        <span v-if="errors.message" :id="`message-err-${uid}`" class="splash-contact-form__field-error" role="alert">
          {{ errors.message }}
        </span>
      </div>

      <!-- `aria-disabled` rather than `disabled`: a disabled control loses focus and leaves
           the tab order mid-interaction. Re-entry is guarded in `handleSubmit` instead. -->
      <button
        type="submit"
        class="splash-contact-form__submit-btn"
        :class="{ 'splash-contact-form__submit-btn--busy': isSubmitting }"
        data-target="cta"
        :aria-disabled="isSubmitting ? 'true' : undefined"
        :aria-busy="isSubmitting ? 'true' : undefined"
      >
        {{ isSubmitting ? $t('common.sending', 'Sending...') : localizedSubmitText }}
      </button>

      <p v-if="errorMessage" class="splash-contact-form__error" role="alert">
        {{ errorMessage }}
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, getCurrentInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import { SPACING_TOKEN_MAP, BORDER_RADIUS_TOKEN_MAP } from '~/shared/features/cms/placement/placementTokenMaps'
import { useTypographySlotStyle } from '~/shared/composables/useTypographySlotStyle'
import { useApiClient } from '~/shared/composables/useApiClient'
import { useLocalized } from '~/shared/composables/useLocalized'

const { getLocalizedValue } = useLocalized()
interface FormData {
  name: string
  email: string
  phone: string
  subject: string
  message: string
}

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  blocks?: Array<Record<string, unknown>>
  submitText?: string | Record<string, string>
  successMessage?: string | Record<string, string>
  showPhone?: boolean
  showSubject?: boolean
  surfaceStyle?: string
  borderRadius?: string
  internalPadding?: string
  submitPresetKey?: string | null
  successPresetKey?: string | null
  apiMethod?: string
}>(), {
  submitText: 'Send Message',
  successMessage: 'Message sent successfully',
  showPhone: true,
  showSubject: true,
  apiMethod: 'contact-send-message',
})

const emit = defineEmits<{
  submit: [data: FormData]
}>()

const typographyStyle = useTypographySlotStyle({
  submit: computed(() => props.submitPresetKey),
  success: computed(() => props.successPresetKey),
})

const { t } = useI18n()
const { executeMethod } = useApiClient()
const uid = getCurrentInstance()?.uid ?? Math.floor(Math.random() * 100000)

const formData = ref<FormData>({
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
})

const errors = ref<Record<string, string>>({})
const showSuccess = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successEl = ref<HTMLElement | null>(null)

// Order the error walk follows — it must match the rendered field order so the
// visitor is taken to the FIRST problem, not an arbitrary one.
const FIELD_ORDER = ['name', 'email', 'subject', 'message'] as const

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function fieldEl(field: string): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return document.getElementById(`${field}-${uid}`)
}

const localizedSubmitText = computed(() =>
  getLocalizedValue(props.submitText, t('contact.send', 'Send Message'))
)

const localizedSuccessMessage = computed(() =>
  getLocalizedValue(props.successMessage, t('contact.successMessage', 'Message sent successfully'))
)

function validateForm(): boolean {
  const newErrors: Record<string, string> = {}

  if (!formData.value.name.trim()) {
    newErrors.name = t('validation.nameRequired', 'Full name is required')
  }
  if (!formData.value.email.trim()) {
    newErrors.email = t('validation.emailRequired', 'Email address is required')
  } else if (!EMAIL_PATTERN.test(formData.value.email.trim())) {
    // `novalidate` turns the browser's own type=email check off, so the format
    // has to be checked here or a malformed address reaches the API.
    newErrors.email = t('validation.emailInvalid', 'Please enter a valid email address')
  }
  if (props.showSubject && !formData.value.subject.trim()) {
    newErrors.subject = t('validation.subjectRequired', 'Subject is required')
  }
  if (!formData.value.message.trim()) {
    newErrors.message = t('validation.messageRequired', 'Message is required')
  }

  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

async function handleSubmit() {
  // The submit control stays enabled (see the template), so re-entry is guarded here.
  if (isSubmitting.value) return

  if (!validateForm()) {
    await nextTick()
    const firstInvalid = FIELD_ORDER.find((field) => errors.value[field])
    if (firstInvalid) fieldEl(firstInvalid)?.focus()
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    await executeMethod(props.apiMethod || 'contact-send-message', { ...formData.value })
    emit('submit', { ...formData.value })
    showSuccess.value = true
    formData.value = { name: '', email: '', phone: '', subject: '', message: '' }
    errors.value = {}
    // The form is replaced by the success panel, so focus would fall to <body>.
    await nextTick()
    successEl.value?.focus()
    setTimeout(() => {
      const returningFromSuccess = !!successEl.value?.contains(document.activeElement)
      showSuccess.value = false
      if (returningFromSuccess) {
        nextTick(() => fieldEl('name')?.focus())
      }
    }, 5000)
  } catch (err) {
    // Never surface the thrown message: it is transport/config detail in the
    // build's own language (e.g. "API request not found for method: …"), not
    // copy for a visitor. Log it, show the site's localized failure message.
    console.error('[ContactForm] send failed:', err)
    errorMessage.value = t('contact.sendFailed', 'Failed to send message. Please try again.')
  } finally {
    isSubmitting.value = false
  }
}

const contentStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.surfaceStyle === 'filled') {
    style.backgroundColor = 'var(--section-accent)'
  } else if (props.surfaceStyle === 'subtle') {
    style.backgroundColor = 'var(--section-surface)'
  }
  if (props.borderRadius) {
    style.borderRadius = BORDER_RADIUS_TOKEN_MAP[props.borderRadius] ?? ''
  }
  if (props.internalPadding && props.internalPadding !== 'none') {
    style.padding = SPACING_TOKEN_MAP[props.internalPadding] ?? '0'
  }
  return style
})

</script>

<style lang="scss" scoped>
.splash-contact-form {
  background: var(--color-background);
  padding: var(--spacing-xl);
  border-radius: var(--border-radius-lg);
  max-width: 60rem;
  margin: 0 auto;

  @media (max-width: $bp-md) {
    padding: var(--spacing-lg);
  }
}

.splash-contact-form__success {
  text-align: center;
  padding: var(--spacing-xl) var(--spacing-md);
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-2rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.splash-contact-form__success-icon {
  width: 6rem;
  height: 6rem;
  color: var(--color-primary);
  margin-bottom: var(--spacing-md);
}

.splash-contact-form__success-message {
  margin: 0;
  font-family: var(--rt-slot-success-family, var(--rt-role-body-family, inherit));
  font-size: var(--rt-slot-success-size, var(--rt-role-body-size, var(--font-size-lg)));
  font-weight: var(--rt-slot-success-weight, var(--rt-role-body-weight, var(--font-weight-semibold)));
  line-height: var(--rt-slot-success-line-height, var(--rt-role-body-line-height, inherit));
  letter-spacing: var(--rt-slot-success-letter-spacing, var(--rt-role-body-letter-spacing, normal));
  text-transform: var(--rt-slot-success-text-transform, var(--rt-role-body-text-transform, none));
  color: var(--rt-slot-success-color, var(--rt-role-body-color, var(--color-primary)));
}

.splash-contact-form__form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.splash-contact-form__form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.splash-contact-form__label {
  display: block;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  font-size: var(--font-size-sm);
}

.required {
  color: var(--color-error);
  margin-inline-start: 0.2rem;
}

.splash-contact-form__input,
.splash-contact-form__textarea {
  width: 100%;
  // 44px tap-target floor — token padding alone leaves these at 36px.
  min-height: 4.4rem;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 0.1rem solid var(--border-color-input);
  border-radius: var(--border-radius);
  font-size: var(--font-size-base);
  font-family: inherit;
  background: var(--color-background);
  color: var(--color-text);
  transition: border-color var(--transition-base);

  &:focus-visible {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 0.3rem var(--color-primary-focus-ring);
  }

  &--error {
    border-color: var(--color-error);

    &:focus-visible {
      border-color: var(--color-error);
      box-shadow: 0 0 0 0.3rem var(--color-error-focus-ring);
    }
  }

  &::placeholder {
    color: var(--color-text-lighter);
  }
}

.splash-contact-form__textarea {
  resize: vertical;
  min-height: 12rem;
}

.splash-contact-form__field-error {
  color: var(--color-error);
  font-size: var(--font-size-sm);
}

.splash-contact-form__submit-btn {
  padding: var(--spacing-md) var(--spacing-xl);
  background-color: var(--color-primary);
  color: var(--rt-slot-submit-color, var(--rt-role-label-color, var(--color-background)));
  border: none;
  border-radius: var(--border-radius);
  font-family: var(--rt-slot-submit-family, var(--rt-role-label-family, inherit));
  font-size: var(--rt-slot-submit-size, var(--rt-role-label-size, var(--font-size-base)));
  font-weight: var(--rt-slot-submit-weight, var(--rt-role-label-weight, var(--font-weight-semibold)));
  line-height: var(--rt-slot-submit-line-height, var(--rt-role-label-line-height, inherit));
  letter-spacing: var(--rt-slot-submit-letter-spacing, var(--rt-role-label-letter-spacing, normal));
  text-transform: var(--rt-slot-submit-text-transform, var(--rt-role-label-text-transform, none));
  cursor: pointer;
  transition: all var(--transition-base);
  min-height: 4.8rem;

  &:hover:not(.splash-contact-form__submit-btn--busy) {
    background-color: var(--color-primary-light);
  }

  &--busy {
    opacity: 0.6;
    cursor: progress;
  }

  &:focus-visible {
    outline: 0.2rem solid var(--color-primary);
    outline-offset: 0.2rem;
  }
}

.splash-contact-form__error {
  margin: 0;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-error-subtle);
  color: var(--color-error);
  border-radius: var(--border-radius);
  font-size: var(--font-size-sm);
  text-align: center;
}
</style>
