// =============================================================================
// @platform/design-tokens
// Source of truth for all visual design tokens.
// Derived from 09_DESIGN_SYSTEM.md
// =============================================================================

// ---------------------------------------------------------------------------
// Colors — Semantic Roles
// Modern, premium, energetic palette (HSL-based for easy theming)
// ---------------------------------------------------------------------------
export const colors = {
  // Brand — vibrant electric violet
  brand: 'hsl(258, 90%, 60%)',
  brandStrong: 'hsl(258, 90%, 48%)',
  brandSubtle: 'hsl(258, 90%, 95%)',

  // Backgrounds
  background: 'hsl(220, 20%, 8%)',
  surface: 'hsl(220, 16%, 12%)',
  surfaceElevated: 'hsl(220, 14%, 16%)',
  surfaceHover: 'hsl(220, 14%, 20%)',

  // Text
  textPrimary: 'hsl(220, 20%, 96%)',
  textSecondary: 'hsl(220, 10%, 65%)',
  textMuted: 'hsl(220, 8%, 45%)',
  textInverse: 'hsl(220, 20%, 8%)',

  // Borders
  border: 'hsl(220, 14%, 22%)',
  borderStrong: 'hsl(220, 14%, 32%)',

  // Semantic states
  success: 'hsl(152, 70%, 48%)',
  successSubtle: 'hsl(152, 70%, 12%)',
  warning: 'hsl(38, 90%, 52%)',
  warningSubtle: 'hsl(38, 90%, 12%)',
  danger: 'hsl(0, 75%, 58%)',
  dangerSubtle: 'hsl(0, 75%, 12%)',
  info: 'hsl(210, 85%, 58%)',
  infoSubtle: 'hsl(210, 85%, 12%)',
} as const;

// ---------------------------------------------------------------------------
// Typography Scale — based on 09_DESIGN_SYSTEM.md
// ---------------------------------------------------------------------------
export const typography = {
  fontFamily: {
    sans: "'Inter', 'Outfit', system-ui, -apple-system, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  fontSize: {
    display: '56px',
    h1: '40px',
    h2: '32px',
    h3: '24px',
    bodyLarge: '18px',
    body: '16px',
    bodySmall: '14px',
    caption: '12px',
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
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
// Spacing — 4px base grid
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
  small: '8px',
  medium: '12px',
  large: '16px',
  xl: '24px',
  pill: '9999px',
  full: '50%',
} as const;

// ---------------------------------------------------------------------------
// Breakpoints
// ---------------------------------------------------------------------------
export const breakpoints = {
  mobile: '0px',
  tablet: '640px',
  desktop: '1024px',
  wide: '1440px',
} as const;

// ---------------------------------------------------------------------------
// Shadows
// ---------------------------------------------------------------------------
export const shadows = {
  sm: '0 1px 3px rgba(0,0,0,0.4)',
  md: '0 4px 16px rgba(0,0,0,0.4)',
  lg: '0 8px 32px rgba(0,0,0,0.5)',
  brand: '0 4px 24px hsl(258 90% 60% / 0.3)',
  glow: '0 0 40px hsl(258 90% 60% / 0.2)',
} as const;

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------
export const transitions = {
  fast: '120ms ease-out',
  normal: '200ms ease-out',
  slow: '320ms ease-out',
  spring: '320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

// ---------------------------------------------------------------------------
// Z-Index Scale
// ---------------------------------------------------------------------------
export const zIndex = {
  base: 0,
  elevated: 10,
  sticky: 100,
  overlay: 200,
  modal: 300,
  toast: 400,
  tooltip: 500,
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
