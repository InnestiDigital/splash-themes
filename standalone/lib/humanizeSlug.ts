/**
 * Title-cased label for a URL slug — the fallback both article templates use
 * for their back-to-index link when the parent page's own title is not part of
 * the render payload.
 */
export function humanizeSlug(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
