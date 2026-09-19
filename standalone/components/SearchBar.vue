<template>
  <div class="splash-search-bar" :class="{ 'splash-search-bar--inline': variant === 'inline' }">
    <div class="search-input-wrapper">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        :placeholder="placeholder"
        @focus="isFocused = true"
        @blur="handleBlur"
        @input="handleInput"
        @keydown.enter="handleSearch"
        aria-label="Search products"
        :aria-expanded="showDropdown"
        role="combobox"
        aria-haspopup="listbox"
        aria-autocomplete="list"
      />
      <button class="search-btn" @click="handleSearch" aria-label="Search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
      </button>

      <!-- Clear Button -->
      <button
        v-if="searchQuery"
        class="search-clear"
        @click="clearSearch"
        aria-label="Clear search"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- Dropdown Menu (hidden in inline mode) -->
    <div
      v-if="showDropdown && variant !== 'inline'"
      class="search-dropdown"
      role="listbox"
    >
      <!-- Recent Searches -->
      <div v-if="showRecentSearches && recentSearches.length > 0 && !searchQuery" class="dropdown-section">
        <div class="dropdown-section__title" role="presentation">{{ t('search.recentSearches') }}</div>
        <button
          v-for="search in recentSearches.slice(0, 5)"
          :key="search"
          class="dropdown-item"
          role="option"
          @click="selectSearch(search)"
        >
          <svg class="dropdown-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span class="dropdown-item__text">{{ search }}</span>
        </button>
      </div>

      <!-- Search Suggestions -->
      <div v-if="showSuggestions && suggestions.length > 0" class="dropdown-section">
        <div class="dropdown-section__title" role="presentation">{{ t('search.suggestions') }}</div>
        <button
          v-for="(suggestion, idx) in suggestions.slice(0, maxSuggestions)"
          :key="idx"
          class="dropdown-item suggestion-item"
          role="option"
          @click="selectSuggestion(suggestion)"
        >
          <svg class="dropdown-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <span class="dropdown-item__text">{{ suggestion.name }}</span>
          <span v-if="suggestion.count" class="suggestion-count" aria-label="{{ suggestion.count }} results">{{ suggestion.count }}</span>
        </button>
      </div>

      <!-- No Results -->
      <div v-if="searchQuery && suggestions.length === 0 && !isLoadingSuggestions" class="dropdown-empty" role="status">
        <p>{{ t('search.noProducts') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

interface Suggestion {
  id: string
  name: string
  count?: number
}

interface Props {
  placeholder?: string
  /** Optional list of suggestions supplied by the parent (e.g. from a search service). */
  suggestions?: Suggestion[]
  maxSuggestions?: number
  showSuggestions?: boolean
  showRecentSearches?: boolean
  variant?: 'standalone' | 'inline'
  /** Reflects parent-side loading state so the empty-state message is correct. */
  isLoadingSuggestions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search products...',
  showSuggestions: true,
  suggestions: () => [],
  maxSuggestions: 5,
  showRecentSearches: true,
  variant: 'standalone',
  isLoadingSuggestions: false,
})

const emit = defineEmits<{
  search: [query: string]
  /** Emitted on every input change so the parent can fetch suggestions async. */
  query: [query: string]
  suggestionSelected: [suggestion: Suggestion]
}>()

const { t } = useI18n()
const searchQuery = ref('')
const isFocused = ref(false)
const recentSearches = ref<string[]>([])

const suggestions = computed(() => props.suggestions.slice(0, props.maxSuggestions))
const showSuggestions = computed(() => suggestions.value.length > 0)
const isLoadingSuggestions = computed(() => props.isLoadingSuggestions)

const showDropdown = computed(() => {
  return isFocused.value && (
    showSuggestions.value
    || (props.showRecentSearches && recentSearches.value.length > 0 && !searchQuery.value)
  )
})

const handleInput = (event: Event) => {
  const query = (event.target as HTMLInputElement).value.trim()
  // In inline mode, don't emit intermediate query events — only on Enter/click.
  if (props.variant === 'inline') return
  emit('query', query)
}

const handleSearch = () => {
  const query = searchQuery.value.trim()
  if (!query) return
  addRecentSearch(query)
  emit('search', query)
}

const selectSuggestion = (suggestion: Suggestion) => {
  searchQuery.value = suggestion.name
  addRecentSearch(suggestion.name)
  emit('suggestionSelected', suggestion)
  isFocused.value = false
}

const selectSearch = (query: string) => {
  searchQuery.value = query
  handleSearch()
}

const addRecentSearch = (query: string) => {
  if (!query) return
  const filtered = recentSearches.value.filter(s => s !== query)
  recentSearches.value = [query, ...filtered].slice(0, 10)
  localStorage.setItem('recentSearches', JSON.stringify(recentSearches.value))
}

const clearSearch = () => {
  searchQuery.value = ''
  // Tell parent the query is empty so it can clear its suggestions.
  emit('query', '')
}

const handleBlur = () => {
  setTimeout(() => {
    isFocused.value = false
  }, 200)
}

onMounted(() => {
  if (props.showRecentSearches) {
    try {
      const stored = localStorage.getItem('recentSearches')
      if (stored) {
        recentSearches.value = JSON.parse(stored)
      }
    } catch {
      // ignore parse errors
    }
  }
})
</script>

<style scoped lang="scss">
.splash-search-bar {
  position: relative;
  width: 100%;
  max-width: 60rem;

  &--inline {
    max-width: none;
  }
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--color-background);
  border: 0.1rem solid var(--border-color-input);
  border-radius: var(--border-radius);
  overflow: hidden;
  transition: var(--transition-base);

  &:focus-within {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 0.3rem var(--color-primary-focus-ring);
  }
}

.search-input {
  flex: 1;
  border: none;
  padding: 1rem 1.6rem;
  font-size: var(--font-size-base);
  outline: none;
  background: transparent;
  color: var(--color-text);

  &::placeholder {
    color: var(--color-text-lighter);
  }
}

.search-btn {
  flex-shrink: 0;
  width: 4rem;
  height: 100%;
  min-height: 4.4rem;
  border: none;
  background: transparent;
  color: var(--color-text-light);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-base);

  svg {
    width: 1.8rem;
    height: 1.8rem;
  }

  &:hover {
    color: var(--color-text);
  }

  &:focus-visible {
    outline: 0.2rem solid var(--color-primary);
    outline-offset: -0.2rem;
  }
}

.search-clear {
  flex-shrink: 0;
  width: 3.6rem;
  height: 3.6rem;
  border: none;
  background: transparent;
  color: var(--color-text-lighter);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-inline-end: 0.4rem;
  transition: var(--transition-base);

  svg {
    width: 1.6rem;
    height: 1.6rem;
  }

  &:hover {
    color: var(--color-text);
  }

  &:focus-visible {
    outline: 0.2rem solid var(--color-primary);
    outline-offset: -0.2rem;
  }
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-background);
  border: 0.1rem solid var(--border-color);
  border-top: none;
  border-radius: 0 0 var(--border-radius) var(--border-radius);
  box-shadow: var(--shadow-md);
  z-index: var(--z-dropdown);
  max-height: 40rem;
  overflow-y: auto;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 0.6rem;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: var(--border-radius);

    &:hover {
      background: var(--color-text-light);
    }
  }
}

.dropdown-section {
  border-bottom: 0.1rem solid var(--border-color);

  &:last-child {
    border-bottom: none;
  }

  &__title {
    padding: 1.2rem 1.6rem 0.8rem;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-lighter);
    text-transform: uppercase;
    letter-spacing: 0.05rem;
  }
}

.dropdown-item {
  width: 100%;
  padding: 1.2rem 1.6rem;
  border: none;
  background: transparent;
  text-align: left;
  font-size: var(--font-size-sm);
  color: var(--color-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 1.2rem;
  transition: var(--transition-base);

  &:hover {
    background: var(--color-background-light);
  }

  &:focus-visible {
    outline: 0.2rem solid var(--color-primary);
    outline-offset: -0.2rem;
    background: var(--color-background-light);
  }

  &__icon {
    flex-shrink: 0;
    width: 1.6rem;
    height: 1.6rem;
    color: var(--color-text-lighter);
  }

  &__text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.suggestion-item {
  .dropdown-item__icon {
    color: var(--color-text-light);
  }
}

.suggestion-count {
  flex-shrink: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-lighter);
  background: var(--color-background-light);
  padding: 0.2rem 0.8rem;
  border-radius: var(--border-radius);
}

.dropdown-empty {
  padding: 2.4rem 1.6rem;
  text-align: center;
  color: var(--color-text-lighter);
  font-size: var(--font-size-sm);

  p {
    margin: 0;
  }
}

@media (max-width: $bp-sm) {
  .splash-search-bar {
    max-width: 100%;
  }

  .search-dropdown {
    max-height: 30rem;
  }

  .dropdown-item {
    padding: 1rem 1.2rem;
    gap: 1rem;
  }

  .suggestion-count {
    padding: 0.2rem 0.6rem;
  }
}
</style>
