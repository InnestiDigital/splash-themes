<template>
  <div class="splash-login-form">
    <!-- Signed-in state: no form, just confirmation + a way back out. -->
    <div v-if="isAuthenticated" class="splash-login-form__signed-in">
      <p class="splash-login-form__signed-in-message" role="status" aria-live="polite">
        {{ localizedSignedInText }}
      </p>
      <button
        type="button"
        class="splash-login-form__submit"
        @click="handleSignOut"
      >{{ localizedSignOutText }}</button>
    </div>

    <form v-else class="splash-login-form__form" novalidate @submit.prevent="handleSubmit">
      <!--
        Single error channel. Announced via role=alert, and referenced by both
        inputs' aria-describedby so it is reachable from either field.
      -->
      <p
        v-if="errorMessage"
        :id="`login-err-${uid}`"
        ref="errorEl"
        class="splash-login-form__error"
        role="alert"
        tabindex="-1"
      >{{ errorMessage }}</p>

      <div class="splash-login-form__group">
        <label :for="`login-email-${uid}`" class="splash-login-form__label">
          {{ localizedEmailLabel }}
        </label>
        <input
          :id="`login-email-${uid}`"
          v-model="email"
          type="email"
          class="splash-login-form__input"
          :class="{ 'splash-login-form__input--error': !!errorMessage }"
          :aria-invalid="!!errorMessage"
          :aria-describedby="errorMessage ? `login-err-${uid}` : undefined"
          autocomplete="email"
          required
          aria-required="true"
        />
      </div>

      <div class="splash-login-form__group">
        <label :for="`login-password-${uid}`" class="splash-login-form__label">
          {{ localizedPasswordLabel }}
        </label>
        <input
          :id="`login-password-${uid}`"
          v-model="password"
          type="password"
          class="splash-login-form__input"
          :class="{ 'splash-login-form__input--error': !!errorMessage }"
          :aria-invalid="!!errorMessage"
          :aria-describedby="errorMessage ? `login-err-${uid}` : undefined"
          autocomplete="current-password"
          required
          aria-required="true"
        />
      </div>

      <!--
        Stays enabled while submitting so focus is never yanked from it mid-flight
        (a disabled control loses focus in some engines). Re-entry is guarded in
        the handler — same approach as ContactForm.
      -->
      <button
        type="submit"
        class="splash-login-form__submit"
        :class="{ 'splash-login-form__submit--busy': isSubmitting }"
        :aria-busy="isSubmitting"
      >{{ localizedSubmitText }}</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useApiClient } from '~/shared/composables/useApiClient'
import { useAuthToken } from '~/shared/composables/useAuthToken'
import { useClientConfig } from '~/shared/composables/useClientConfig'
import { useLocalized } from '~/shared/composables/useLocalized'

const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  emailLabel?: string | Record<string, string>
  passwordLabel?: string | Record<string, string>
  submitText?: string | Record<string, string>
  errorText?: string | Record<string, string>
  signedInText?: string | Record<string, string>
  signOutText?: string | Record<string, string>
  apiMethod?: string
}>(), {
  emailLabel: 'Email',
  passwordLabel: 'Password',
  submitText: 'Sign In',
  errorText: 'Sign-in failed. Check your details and try again.',
  signedInText: "You're signed in.",
  signOutText: 'Sign Out',
  apiMethod: 'auth-login',
})

const { t } = useI18n()
const { getLocalizedValue } = useLocalized()
const { executeMethod } = useApiClient()
const { config } = useClientConfig()

const uid = getCurrentInstance()?.uid ?? Math.floor(Math.random() * 100000)

const { isAuthenticated, refresh, clearToken } = useAuthToken(
  (config.value as any)?.themeSettings?.authStorageKey ?? 'authorization',
)

const email = ref('')
const password = ref('')
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const errorEl = ref<HTMLElement | null>(null)

const localizedEmailLabel = computed(() => getLocalizedValue(props.emailLabel, t('login.email', 'Email')))
const localizedPasswordLabel = computed(() => getLocalizedValue(props.passwordLabel, t('login.password', 'Password')))
const localizedSubmitText = computed(() => getLocalizedValue(props.submitText, t('login.submit', 'Sign In')))
const localizedSignedInText = computed(() => getLocalizedValue(props.signedInText, t('login.signedIn', "You're signed in.")))
const localizedSignOutText = computed(() => getLocalizedValue(props.signOutText, t('login.signOut', 'Sign Out')))
const genericError = computed(() => getLocalizedValue(props.errorText, t('login.error', 'Sign-in failed. Check your details and try again.')))

async function fail() {
  errorMessage.value = genericError.value
  await nextTick()
  // role=alert announces it, but move focus too so a keyboard user is taken to
  // the message rather than left on a submit button that appears to have done
  // nothing.
  errorEl.value?.focus({ preventScroll: true })
}

async function handleSubmit() {
  if (isSubmitting.value) return
  errorMessage.value = null
  isSubmitting.value = true
  try {
    await executeMethod(props.apiMethod || 'auth-login', {
      email: email.value,
      password: password.value,
    })
    // useApiClient's response contract has now written the token to
    // localStorage per the site's api-config mapping. A same-document
    // setItem fires no 'storage' event, so the shared ref must re-read.
    refresh()
    if (!isAuthenticated.value) {
      // 2xx with no token at the mapped path — a misconfigured response
      // contract looks exactly like bad credentials from here.
      await fail()
      return
    }
    password.value = ''
  }
  catch {
    // Never surface the upstream error: it may echo credentials or internal
    // detail. The configured generic message is all the visitor sees.
    await fail()
  }
  finally {
    isSubmitting.value = false
  }
}

function handleSignOut() {
  clearToken()
  email.value = ''
  password.value = ''
  errorMessage.value = null
}
</script>

<style scoped>
.splash-login-form {
  width: 100%;
}
.splash-login-form__form,
.splash-login-form__signed-in {
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
}
.splash-login-form__group {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.splash-login-form__label {
  font-size: var(--font-size-sm, 1.4rem);
  color: var(--color-text, inherit);
}
.splash-login-form__input {
  padding: 1.2rem 1.4rem;
  font: inherit;
  font-size: var(--font-size-base, 1.6rem);
  color: var(--color-text, inherit);
  background: var(--color-surface, transparent);
  border: 1px solid var(--color-border, currentColor);
  border-radius: 0.4rem;
}
.splash-login-form__input:focus-visible {
  outline: 0.2rem solid var(--color-focus, currentColor);
  outline-offset: 0.2rem;
}
.splash-login-form__input--error {
  border-color: var(--color-error, #b00020);
}
.splash-login-form__error {
  margin: 0;
  padding: 1rem 1.2rem;
  font-size: var(--font-size-sm, 1.4rem);
  color: var(--color-error, #b00020);
  border: 1px solid currentColor;
  border-radius: 0.4rem;
}
.splash-login-form__error:focus-visible {
  outline: 0.2rem solid var(--color-focus, currentColor);
  outline-offset: 0.2rem;
}
.splash-login-form__signed-in-message {
  margin: 0;
  font-size: var(--font-size-base, 1.6rem);
}
.splash-login-form__submit {
  align-self: flex-start;
  padding: 1.2rem 2.4rem;
  font: inherit;
  font-size: var(--font-size-base, 1.6rem);
  color: var(--color-background, #fff);
  background: var(--color-primary, #111);
  border: none;
  border-radius: 0.4rem;
  cursor: pointer;
}
.splash-login-form__submit:focus-visible {
  outline: 0.2rem solid var(--color-focus, currentColor);
  outline-offset: 0.2rem;
}
.splash-login-form__submit--busy {
  opacity: 0.7;
  cursor: progress;
}
</style>
