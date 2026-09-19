<template>
  <!-- No outer v-if: a configured-but-empty block must degrade to its empty
       message, not vanish and leave the page title floating over blank space.
       (The old `v-if="hasEvents"` guard meant the empty-state below could
       never render.) -->
  <section class="event-calendar" data-target="root">
    <div class="event-calendar__container">
      <h3
        v-if="localizedSectionHeading"
        class="event-calendar__heading"
        data-target="sectionHeading"
        v-html="asHtml(localizedSectionHeading)"
      ></h3>

      <p v-if="!visibleGroups.length" class="event-calendar__empty" data-empty>
        {{ t('eventCalendar.empty', 'No upcoming events.') }}
      </p>

      <div v-for="group in visibleGroups" :key="group.key" class="event-calendar__group">
        <h4 class="event-calendar__month" data-target="month">{{ group.label }}</h4>

        <ul class="event-calendar__items">
          <li
            v-for="event in group.events"
            :key="event.key"
            class="event-calendar__item"
            :class="{ 'event-calendar__item--past': event.isPast }"
            data-target="item"
            :data-item-index="event.index"
          >
            <time class="event-calendar__date" :datetime="event.date">
              <span class="event-calendar__day">{{ event.day }}</span>
              <span class="event-calendar__weekday">{{ event.weekday }}</span>
              <span v-if="event.time" class="event-calendar__time">{{ event.time }}</span>
            </time>

            <div class="event-calendar__content">
              <component
                :is="event.url ? 'a' : 'span'"
                :href="event.url || undefined"
                class="event-calendar__title"
                v-html="asHtml(event.title)"
              />
              <span v-if="event.location" class="event-calendar__location" v-html="asHtml(event.location)"></span>
              <span
                v-if="event.description"
                class="event-calendar__description"
                v-html="asHtml(event.description)"
              ></span>
            </div>
          </li>
        </ul>
      </div>

      <button
        v-if="showPast === 'toggle' && pastCount > 0"
        type="button"
        class="event-calendar__toggle"
        :aria-expanded="pastVisible"
        @click="pastVisible = !pastVisible"
      >
        {{ pastVisible
          ? t('eventCalendar.hidePast', 'Hide past events')
          : t('eventCalendar.showPast', 'Show past events') }}
        ({{ pastCount }})
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { asHtml } from '~/shared/utils/asHtml'
import { useLocalized } from '~/shared/composables/useLocalized'

interface EventItem {
  date: string
  title: string | Record<string, string>
  location?: string | Record<string, string>
  description?: string | Record<string, string>
  url?: string
}

const props = defineProps<{
  sectionHeading?: string | Record<string, string>
  events?: EventItem[]
  showPast?: 'hide' | 'toggle' | 'show'
}>()

const { t, locale } = useI18n()
const { getLocalizedValue } = useLocalized()

const pastVisible = ref(false)

const localizedSectionHeading = computed(() => getLocalizedValue(props.sectionHeading))
const showPast = computed(() => props.showPast ?? 'toggle')

/**
 * Parse the authored date. `new Date('2026-09-14')` is parsed as UTC midnight
 * while `new Date('2026-09-14T18:30')` is parsed as local — comparing those two
 * against each other drifts by the timezone offset. Splitting the parts and
 * building a local Date puts both on the same footing.
 *
 * Returns null for anything unparseable so a typo drops one row instead of
 * rendering "Invalid Date" (toLocaleDateString does not throw, it returns that
 * literal string).
 */
function parseEventDate(value: string): { date: Date; hasTime: boolean } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(value?.trim() ?? '')
  if (!match) return null
  const [, year, month, day, hour, minute] = match
  const date = new Date(
    Number(year), Number(month) - 1, Number(day),
    Number(hour ?? 0), Number(minute ?? 0),
  )
  if (Number.isNaN(date.getTime())) return null
  return { date, hasTime: hour !== undefined }
}

interface ResolvedEvent {
  key: string
  index: number
  date: string
  sortValue: number
  monthKey: string
  monthLabel: string
  day: string
  weekday: string
  time: string
  title: string
  location: string
  description: string
  url: string
  isPast: boolean
}

const resolvedEvents = computed<ResolvedEvent[]>(() => {
  // Midnight today, so an event earlier today still counts as upcoming.
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const cutoff = todayStart.getTime()

  return (props.events ?? [])
    .map((event, index) => {
      const parsed = event?.date ? parseEventDate(event.date) : null
      if (!parsed || !event) return null
      const { date, hasTime } = parsed
      return {
        key: `${event.date}-${index}`,
        index,
        date: event.date,
        sortValue: date.getTime(),
        monthKey: `${date.getFullYear()}-${date.getMonth()}`,
        monthLabel: date.toLocaleDateString(locale.value, { month: 'long', year: 'numeric' }),
        day: String(date.getDate()),
        weekday: date.toLocaleDateString(locale.value, { weekday: 'short' }),
        time: hasTime
          ? date.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
          : '',
        title: getLocalizedValue(event.title),
        location: getLocalizedValue(event.location),
        description: getLocalizedValue(event.description),
        url: event.url ?? '',
        isPast: date.getTime() < cutoff,
      } satisfies ResolvedEvent
    })
    .filter((event): event is ResolvedEvent => event !== null)
    .sort((a, b) => a.sortValue - b.sortValue)
})

const pastCount = computed(() => resolvedEvents.value.filter(event => event.isPast).length)

const filteredEvents = computed(() => {
  if (showPast.value === 'show') return resolvedEvents.value
  if (showPast.value === 'toggle' && pastVisible.value) return resolvedEvents.value
  return resolvedEvents.value.filter(event => !event.isPast)
})

const visibleGroups = computed(() => {
  const groups: { key: string; label: string; events: ResolvedEvent[] }[] = []
  for (const event of filteredEvents.value) {
    const last = groups[groups.length - 1]
    // The list is already sorted, so a month change can only ever open a new
    // group — no map/lookup needed.
    if (last && last.key === event.monthKey) last.events.push(event)
    else groups.push({ key: event.monthKey, label: event.monthLabel, events: [event] })
  }
  return groups
})
</script>

<style lang="scss" scoped>
.event-calendar {
  &__container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  &__heading,
  &__month {
    margin: 0;
  }

  &__empty {
    margin: 0;
    color: var(--color-text-light);
  }

  &__month {
    text-transform: capitalize;
    color: var(--color-text-light);
    font-size: 0.9em;
    letter-spacing: 0.08em;
    padding-bottom: 0.8rem;
    border-bottom: 0.1rem solid var(--border-color, rgba(0, 0, 0, 0.1));
  }

  &__items {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  &__item {
    display: flex;
    gap: 1.6rem;
    padding: 1.2rem 0;
    border-bottom: 0.1rem solid var(--border-color, rgba(0, 0, 0, 0.08));

    &:last-child {
      border-bottom: none;
    }

    &--past {
      opacity: 0.6;
    }
  }

  &__date {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 5.6rem;
    text-align: center;
  }

  &__day {
    font-size: 2.4rem;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }

  &__weekday,
  &__time {
    color: var(--color-text-light);
    font-size: 0.8em;
    text-transform: uppercase;
  }

  &__content {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  &__title {
    font-weight: var(--font-weight-semibold, 600);
    color: inherit;

    &[href]:hover {
      color: var(--color-primary);
    }
  }

  &__location,
  &__description {
    color: var(--color-text-light);
    font-size: 0.9em;
  }

  &__toggle {
    align-self: flex-start;
    min-height: 4.4rem;
    padding: 0 1.6rem;
    background: none;
    border: 0.1rem solid var(--border-color, rgba(0, 0, 0, 0.15));
    border-radius: var(--button-border-radius, 0.4rem);
    cursor: pointer;
    color: var(--color-text);
    font: inherit;

    &:hover {
      color: var(--color-primary);
      border-color: currentColor;
    }

    &:focus-visible {
      outline: 0.2rem solid var(--color-focus, var(--color-primary));
      outline-offset: 0.2rem;
    }
  }
}
</style>
