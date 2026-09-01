/**
 * Accessibility-preserving brand palette derivation for client themes.
 *
 * @module theme/brandPalette
 */

import { darken, getContrastRatio, lighten } from "@mui/material/styles";

import { getMostLegibleText } from "./contrast.js";

/**
 * WCAG AA contrast a brand color must reach against the canvas behind it.
 *
 * @remarks
 * Text grade (4.5:1), not the 3:1 non-text grade, because consumers use
 * `primary.main` as ink — links, active labels, icon buttons — and not only as
 * a fill. A 3:1 floor is what left client-name links in the events grid
 * legible in principle and unreadable in practice.
 */
const MINIMUM_SURFACE_CONTRAST = 4.5;
/** WCAG AA contrast required for text placed on a brand-colored fill. */
const MINIMUM_BRAND_TEXT_CONTRAST = 4.5;
/** The default dark canvas used to validate branded accent colors. */
export const DARK_THEME_SURFACE_COLOR = "#0d0d0d";
/** The default light canvas used to validate branded accent colors. */
export const LIGHT_THEME_SURFACE_COLOR = "#ffffff";

/** Ordered from least to most adjusted so colors move only as much as needed. */
const ADJUSTMENT_STEPS = [
  0, 0.08, 0.16, 0.24, 0.32, 0.4, 0.48, 0.56, 0.64, 0.72, 0.8,
] as const;

/** Complete primary, secondary, and tertiary colors for a client brand. */
export interface BrandThemeColors {
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly tertiaryColor: string;
}

/** MUI-compatible palette tokens for one resolved client brand role. */
export interface BrandPaletteColor {
  readonly contrastText: string;
  readonly dark: string;
  readonly light: string;
  readonly main: string;
}

/** The color scheme in which a client brand role is rendered. */
export type BrandColorScheme = "dark" | "light";

/**
 * Finds the nearest variant of a brand color that is readable on `surface`.
 *
 * @param color - An approved client brand color in a MUI-parseable format.
 * @param surface - The canvas the color is rendered against.
 * @returns The original color when it already qualifies, otherwise the first
 * stepped variant that satisfies both surface and label-text contrast.
 *
 * @remarks
 * Moves away from the canvas — lighter on a dark surface, darker on a light
 * one — in the smallest increments that clear the threshold, so a brand that
 * is already accessible is returned untouched and one that is not shifts as
 * little as the requirement allows.
 *
 * Both schemes run through this. Light mode previously did not, which is why a
 * brand like `#00FFBC` reached production at 1.31:1 against white.
 */
const ensureSurfaceContrast = (color: string, surface: string): string => {
  const towardsLegibility =
    getContrastRatio(surface, "#fff") > getContrastRatio(surface, "#111")
      ? lighten
      : darken;

  for (const amount of ADJUSTMENT_STEPS) {
    const candidate = amount === 0 ? color : towardsLegibility(color, amount);
    const contrastText = getMostLegibleText(candidate);

    if (
      getContrastRatio(candidate, surface) >= MINIMUM_SURFACE_CONTRAST &&
      getContrastRatio(candidate, contrastText) >= MINIMUM_BRAND_TEXT_CONTRAST
    ) {
      return candidate;
    }
  }

  // Nothing on the ramp qualified — a fully saturated mid-tone can fail the
  // label-text test at every step. Fall back to the most legible extreme
  // rather than returning a color known to be unreadable.
  return towardsLegibility(color, 1);
};

/**
 * Derives minimally adjusted dark-mode accents from approved brand colors.
 * Colors that already work on the dark canvas are preserved exactly.
 *
 * @param colors - Complete client brand colors.
 * @returns A readable dark-scheme color triple.
 */
export const createDarkThemeColors = (
  colors: BrandThemeColors
): BrandThemeColors => ({
  primaryColor: ensureSurfaceContrast(
    colors.primaryColor,
    DARK_THEME_SURFACE_COLOR
  ),
  secondaryColor: ensureSurfaceContrast(
    colors.secondaryColor,
    DARK_THEME_SURFACE_COLOR
  ),
  tertiaryColor: ensureSurfaceContrast(
    colors.tertiaryColor,
    DARK_THEME_SURFACE_COLOR
  ),
});

/**
 * Derives minimally adjusted light-mode accents from approved brand colors.
 * Colors that already work on the light canvas are preserved exactly.
 *
 * @param colors - Complete client brand colors.
 * @returns A readable light-scheme color triple.
 */
export const createLightThemeColors = (
  colors: BrandThemeColors
): BrandThemeColors => ({
  primaryColor: ensureSurfaceContrast(
    colors.primaryColor,
    LIGHT_THEME_SURFACE_COLOR
  ),
  secondaryColor: ensureSurfaceContrast(
    colors.secondaryColor,
    LIGHT_THEME_SURFACE_COLOR
  ),
  tertiaryColor: ensureSurfaceContrast(
    colors.tertiaryColor,
    LIGHT_THEME_SURFACE_COLOR
  ),
});

/**
 * Builds MUI palette tokens for a resolved brand color.
 *
 * Native `color-mix()` keeps interaction-state variants in perceptually
 * uniform OKLCH, while `main` remains concrete for reliable contrast math.
 *
 * @param color - The resolved brand fill for the active scheme.
 * @param colorScheme - The scheme in which the role is rendered.
 * @returns Main, interaction-state, and text tokens for MUI components.
 */
export const createBrandPaletteColor = (
  color: string,
  colorScheme: BrandColorScheme
): BrandPaletteColor => ({
  main: color,
  light: `color-mix(in oklch, ${color} 82%, white 18%)`,
  dark:
    colorScheme === "dark"
      ? `color-mix(in oklch, ${color} 92%, white 8%)`
      : `color-mix(in oklch, ${color} 78%, black 22%)`,
  contrastText: getMostLegibleText(color),
});
