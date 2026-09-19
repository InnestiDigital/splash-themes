<template>
  <div class="splash-faq-item">
    <button
      class="splash-faq-item__trigger"
      :aria-expanded="isOpen"
      :aria-controls="`faq-content-${uid}`"
      :aria-label="plainQuestion"
      @click="toggleOpen"
    >
      <span data-target="question" class="splash-faq-item__question" v-html="localizedQuestion"></span>
      <span class="splash-faq-item__toggle-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
    </button>

    <div :id="`faq-content-${uid}`" v-show="isOpen" class="splash-faq-item__content">
      <div data-target="answer" class="splash-faq-item__answer prose" v-html="localizedAnswer"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, getCurrentInstance } from 'vue'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'

const { getLocalizedValue } = useLocalized()
const props = withDefaults(defineProps<{
  blockId?: string
  blockType?: string
  isPreview?: boolean
  isSelected?: boolean
  blocks?: Array<Record<string, unknown>>
  question?: string | Record<string, string>
  answer?: string | Record<string, string>
}>(), {})

const uid = getCurrentInstance()?.uid ?? Math.floor(Math.random() * 100000)
const isOpen = ref(false)

const localizedQuestion = computed(() =>
  asHtml(getLocalizedValue(props.question, ''))
)

const localizedAnswer = computed(() =>
  asHtml(getLocalizedValue(props.answer, ''))
)

const plainQuestion = computed(() =>
  localizedQuestion.value.replace(/<[^>]*>/g, '')
)

function toggleOpen() {
  isOpen.value = !isOpen.value
}
</script>

<style lang="scss" scoped>
.splash-faq-item {
  border-bottom: 0.1rem solid var(--border-color);

  &:last-child {
    border-bottom: none;
  }
}

.splash-faq-item__trigger {
  width: 100%;
  padding: var(--spacing-md);
  background: var(--color-background);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  transition: all var(--transition-base);
  font-family: var(--rt-slot-question-family, var(--rt-role-heading3-family, inherit));
  font-size: var(--rt-slot-question-size, var(--rt-role-heading3-size, var(--font-size-base)));
  font-weight: var(--rt-slot-question-weight, var(--rt-role-heading3-weight, var(--font-weight-semibold)));
  line-height: var(--rt-slot-question-line-height, var(--rt-role-heading3-line-height, inherit));
  letter-spacing: var(--rt-slot-question-letter-spacing, var(--rt-role-heading3-letter-spacing, normal));
  text-transform: var(--rt-slot-question-text-transform, var(--rt-role-heading3-text-transform, none));
  color: var(--rt-slot-question-color, var(--rt-role-heading3-color, var(--color-text)));
  text-align: left;

  &:hover {
    background: var(--color-background-lighter);
  }

  &[aria-expanded="true"] {
    background: var(--color-background-light);
  }

  &:focus-visible {
    outline: 0.2rem solid var(--color-primary);
    outline-offset: -0.2rem;
  }
}

.splash-faq-item__question {
  text-align: left;
  flex: 1;
}

.splash-faq-item__toggle-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2.4rem;
  height: 2.4rem;
  transition: transform var(--transition-base);
  color: var(--color-primary);
  flex-shrink: 0;

  svg {
    width: 2rem;
    height: 2rem;
  }

  .splash-faq-item__trigger[aria-expanded="true"] & {
    transform: rotate(180deg);
  }
}

.splash-faq-item__content {
  background: var(--color-background-lighter);
  overflow: hidden;
}

.splash-faq-item__answer {
  padding: var(--spacing-md);
  font-family: var(--rt-slot-answer-family, var(--rt-role-body-family, inherit));
  font-size: var(--rt-slot-answer-size, var(--rt-role-body-size, var(--font-size-base)));
  font-weight: var(--rt-slot-answer-weight, var(--rt-role-body-weight, inherit));
  line-height: var(--rt-slot-answer-line-height, var(--rt-role-body-line-height, var(--line-height-relaxed)));
  letter-spacing: var(--rt-slot-answer-letter-spacing, var(--rt-role-body-letter-spacing, normal));
  text-transform: var(--rt-slot-answer-text-transform, var(--rt-role-body-text-transform, none));
  color: var(--rt-slot-answer-color, var(--rt-role-body-color, var(--color-text-light)));

  @media (max-width: $bp-md) {
    padding: var(--spacing-sm) var(--spacing-md);
  }
}
</style>
