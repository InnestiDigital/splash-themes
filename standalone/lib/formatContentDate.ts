// Single source of truth for rendering an article's publication date in the
// standalone theme. Used by both the blog-index card list (ArticleList) and the
// article gallery template, which previously each carried their own copy.
//
// IMPORTANT: `Date.prototype.toLocaleDateString` does NOT throw on an invalid
// Date — it returns the literal string "Invalid Date". A `try/catch` around it
// therefore never fires and would leak "Invalid Date" into the rendered card.
// We must reject NaN timestamps explicitly. `new Date(iso)` itself can throw for
// some exotic inputs, so the construction stays guarded too.
//
// Timezone: publication dates carry date-only semantics but are stored as
// instants (authored-local time converted to UTC), so formatting in the
// VIEWER's zone can shift the rendered day — e.g. `2023-02-28T23:41:57Z`
// (authored 1 March, CET) renders as 28 February for a UTC viewer. Callers
// pass the site's content timezone (an IANA name from the site/theme
// settings) so the date renders as authored for every viewer. When omitted,
// formatting falls back to the runtime's local zone (legacy behaviour). An
// invalid timezone name makes `toLocaleDateString` throw a RangeError, which
// the existing guard converts to '' rather than crashing the card.
export function formatContentDate(
  iso: string | null | undefined,
  locale: string,
  timeZone?: string | null,
): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString(locale, timeZone ? { timeZone } : undefined)
  } catch {
    return ''
  }
}
