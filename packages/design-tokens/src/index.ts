// =============================================================================
// @platform/design-tokens
// Source of truth for all visual design tokens.
// Derived from 09_DESIGN_SYSTEM.md and PHASE_14.9A_MASTER_UI_UX_DESIGN_DIRECTION.md
// =============================================================================

// ---------------------------------------------------------------------------
// Colors — Semantic Roles & Obsidian Surfaces
// ---------------------------------------------------------------------------
export const colors = {
  // Primary Brand — Electric Violet
  brand: '#7C3AED',
  brandStrong: '#6D28D9',
  brandSubtle: 'rgba(124, 58, 237, 0.15)',
  brandGlow: 'rgba(124, 58, 237, 0.35)',

  // Secondary Accents
  accentPink: '#EC4899',
  accentPinkSubtle: 'rgba(236, 72, 153, 0.15)',
  accentCyan: '#06B6D4',
  accentCyanSubtle: 'rgba(6, 182, 212, 0.15)',

  // Deep Obsidian Dark Surfaces
  bgBase: '#090C15',
  bgSurface: '#111625',
  bgSurfaceElevated: '#182035',
  bgSurfaceHover: '#222C46',
  bgGlass: 'rgba(17, 22, 37, 0.75)',
  bgGlassStrong: 'rgba(24, 32, 53, 0.88)',

  // Legacy Aliases
  background: '#090C15',
  surface: '#111625',
  surfaceElevated: '#182035',
  surfaceHover: '#222C46',

  // Text Hierarchy
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#090C15',

  // Borders & Specular Hairlines
  border: 'rgba(255, 255, 255, 0.08)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.16)',
  borderFocus: '#7C3AED',

  // Semantic States
  success: '#10B981',
  successSubtle: 'rgba(16, 185, 129, 0.12)',
  warning: '#F59E0B',
  warningSubtle: 'rgba(245, 158, 11, 0.12)',
  danger: '#EF4444',
  dangerSubtle: 'rgba(239, 68, 68, 0.12)',
  info: '#3B82F6',
  infoSubtle: 'rgba(59, 130, 246, 0.12)',
} as const;

// ---------------------------------------------------------------------------
// Typography Scale
// ---------------------------------------------------------------------------
export const typography = {
  fontFamily: {
    display: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    sans: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  fontSize: {
    display: '56px',
    h1: '40px',
    h2: '32px',
    h3: '24px',
    h4: '20px',
    bodyLarge: '18px',
    body: '16px',
    bodySmall: '14px',
    caption: '12px',
    micro: '10px',
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  lineHeight: {
    tight: '1.2',
    snug: '1.4',
    normal: '1.5',
    relaxed: '1.6',
  },
  letterSpacing: {
    tighter: '-0.04em',
    tight: '-0.02em',
    normal: '0em',
    wide: '0.04em',
    wider: '0.08em',
  },
} as const;

// ---------------------------------------------------------------------------
// Spacing Scale — 4px Grid
// ---------------------------------------------------------------------------
export const spacing = {
  '0': '0px',
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '8': '32px',
  '10': '40px',
  '12': '48px',
  '16': '64px',
  '20': '80px',
  '24': '96px',
} as const;

// ---------------------------------------------------------------------------
// Border Radius
// ---------------------------------------------------------------------------
export const radius = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  pill: '9999px',
  full: '50%',
} as const;

// ---------------------------------------------------------------------------
// Breakpoints
// ---------------------------------------------------------------------------
export const breakpoints = {
  mobile: '0px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1440px',
  wide: '1920px',
} as const;

// ---------------------------------------------------------------------------
// Shadows & Elevation
// ---------------------------------------------------------------------------
export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.5)',
  md: '0 4px 16px rgba(0, 0, 0, 0.5)',
  lg: '0 12px 36px rgba(0, 0, 0, 0.65)',
  brand: '0 4px 24px rgba(124, 58, 237, 0.35)',
  glow: '0 0 32px rgba(124, 58, 237, 0.25)',
} as const;

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------
export const transitions = {
  fast: '120ms cubic-bezier(0.16, 1, 0.3, 1)',
  normal: '200ms cubic-bezier(0.16, 1, 0.3, 1)',
  slow: '280ms cubic-bezier(0.16, 1, 0.3, 1)',
  spring: '320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

// ---------------------------------------------------------------------------
// Z-Index Scale
// ---------------------------------------------------------------------------
export const zIndex = {
  base: 0,
  elevated: 10,
  sticky: 100,
  drawer: 200,
  overlay: 300,
  modal: 400,
  toast: 500,
  tooltip: 600,
} as const;

// ---------------------------------------------------------------------------
// Combined Token Export
// ---------------------------------------------------------------------------
export const tokens = {
  colors,
  typography,
  spacing,
  radius,
  breakpoints,
  shadows,
  transitions,
  zIndex,
} as const;

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radius;
