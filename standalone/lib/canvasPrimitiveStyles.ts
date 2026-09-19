import type { BrandFontToken, BrandRenderTokens } from '~/shared/types/brandFormat'

export type CanvasPaletteRole =
  | 'brandPrimary'
  | 'brandSecondary'
  | 'brandSurface'
  | 'brandOnSurface'
  | 'background'
  | 'surface'
  | 'text'
  | 'muted'
  | 'faint'
  | 'accent'
  | 'transparent'

export type CanvasTypographyRole =
  | 'brandHeadline'
  | 'brandBody'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'sectionTitle'
  | 'lead'
  | 'body'
  | 'caption'
  | 'eyebrow'
  | 'pullquote'

const THEME_PALETTE_ROLE_CSS = {
  background: 'var(--section-bg, transparent)',
  surface: 'var(--section-surface, transparent)',
  text: 'var(--section-text, currentColor)',
  muted: 'var(--section-text-muted, currentColor)',
  faint: 'var(--section-text-faint, currentColor)',
  accent: 'var(--section-accent, currentColor)',
  transparent: 'transparent',
} as const

const TYPOGRAPHY_ROLES = new Set<CanvasTypographyRole>([
  'brandHeadline',
  'brandBody',
  'heading1',
  'heading2',
  'heading3',
  'sectionTitle',
  'lead',
  'body',
  'caption',
  'eyebrow',
  'pullquote',
])

export function resolveCanvasPaletteRole(
  role: string | undefined,
  fallback: CanvasPaletteRole = 'transparent',
  tokens?: BrandRenderTokens | null,
): string {
  const safeRole = isCanvasPaletteRole(role) ? role : fallback

  switch (safeRole) {
    case 'brandPrimary':
      return tokens?.primary || 'var(--section-accent, currentColor)'
    case 'brandSecondary':
      return tokens?.secondary || 'var(--section-text-muted, currentColor)'
    case 'brandSurface':
      return tokens?.surface || 'var(--section-surface, var(--section-bg, transparent))'
    case 'brandOnSurface':
      return tokens?.onSurface || 'var(--section-text, currentColor)'
    default:
      return THEME_PALETTE_ROLE_CSS[safeRole]
  }
}

export function resolveCanvasTypographyStyle(
  role: string | undefined,
  fallback: CanvasTypographyRole = 'body',
  tokens?: BrandRenderTokens | null,
): Record<string, string> {
  const safeRole = TYPOGRAPHY_ROLES.has(role as CanvasTypographyRole)
    ? role as CanvasTypographyRole
    : fallback

  if (safeRole === 'brandHeadline' || safeRole === 'brandBody') {
    const token = safeRole === 'brandHeadline' ? tokens?.headline : tokens?.body
    const themeRole = safeRole === 'brandHeadline' ? 'heading1' : 'body'
    return resolveBrandTypographyStyle(token, themeRole)
  }

  return resolveThemeTypographyStyle(safeRole)
}

function isCanvasPaletteRole(role: string | undefined): role is CanvasPaletteRole {
  return role === 'brandPrimary'
    || role === 'brandSecondary'
    || role === 'brandSurface'
    || role === 'brandOnSurface'
    || Boolean(role && role in THEME_PALETTE_ROLE_CSS)
}

function resolveThemeTypographyStyle(role: Exclude<CanvasTypographyRole, 'brandHeadline' | 'brandBody'>): Record<string, string> {
  return {
    fontFamily: `var(--rt-role-${role}-family, inherit)`,
    fontSize: `var(--rt-role-${role}-size, inherit)`,
    fontWeight: `var(--rt-role-${role}-weight, inherit)`,
    lineHeight: `var(--rt-role-${role}-line-height, normal)`,
    letterSpacing: `var(--rt-role-${role}-letter-spacing, normal)`,
    textTransform: `var(--rt-role-${role}-text-transform, none)`,
    fontVariationSettings: `var(--rt-role-${role}-font-variation-settings, normal)`,
  }
}

function resolveBrandTypographyStyle(
  token: BrandFontToken | undefined,
  themeRole: 'heading1' | 'body',
): Record<string, string> {
  return {
    fontFamily: token?.fontFamily || `var(--rt-role-${themeRole}-family, inherit)`,
    fontSize: `var(--rt-role-${themeRole}-size, inherit)`,
    fontWeight: token?.fontWeight || `var(--rt-role-${themeRole}-weight, inherit)`,
    lineHeight: token?.lineHeight || `var(--rt-role-${themeRole}-line-height, normal)`,
    letterSpacing: token?.letterSpacing || `var(--rt-role-${themeRole}-letter-spacing, normal)`,
    textTransform: token?.textTransform || `var(--rt-role-${themeRole}-text-transform, none)`,
    fontVariationSettings: `var(--rt-role-${themeRole}-font-variation-settings, normal)`,
  }
}

export function resolveCanvasMediaSource(
  value: string | { url?: string; src?: string } | null | undefined,
): string {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''
  return value.url || value.src || ''
}
