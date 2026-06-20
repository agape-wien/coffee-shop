// Shop-wide font size store — two-tier pattern matching themeStore/menuDisplayStore:
// localStorage is read at module load (fast, no flash), DB is authoritative and
// overrides via MenuDisplaySync in App.tsx on first render.
//
// Each size has a numeric value and a unit mode: "px" (absolute pixels) or "vmax"
// (percentage of the larger viewport dimension — CSS vmax unit).
// The CSS value applied is e.g. "36px" or "5vmax".
import { create } from 'zustand'
import { ADMIN_CONFIG_DEFAULTS } from '@coffee/shared'

export type FontMode = 'px' | 'vmax'

const DEFAULTS = {
  fsPrimary: ADMIN_CONFIG_DEFAULTS.fsPrimary,
  fsPrimaryMode: ADMIN_CONFIG_DEFAULTS.fsPrimaryMode as FontMode,
  fsSecondary: ADMIN_CONFIG_DEFAULTS.fsSecondary,
  fsSecondaryMode: ADMIN_CONFIG_DEFAULTS.fsSecondaryMode as FontMode,
  fsSmall: ADMIN_CONFIG_DEFAULTS.fsSmall,
  fsSmallMode: ADMIN_CONFIG_DEFAULTS.fsSmallMode as FontMode,
}

interface FontSizeState {
  fsPrimary: number
  fsPrimaryMode: FontMode
  fsSecondary: number
  fsSecondaryMode: FontMode
  fsSmall: number
  fsSmallMode: FontMode
  setFontSizes: (
    primary: number, primaryMode: FontMode,
    secondary: number, secondaryMode: FontMode,
    small: number, smallMode: FontMode,
  ) => void
}

function applyFontSizes(
  primary: number, primaryMode: FontMode,
  secondary: number, secondaryMode: FontMode,
  small: number, smallMode: FontMode,
) {
  const root = document.documentElement
  root.style.setProperty('--fs-primary', `${primary}${primaryMode}`)
  root.style.setProperty('--fs-secondary', `${secondary}${secondaryMode}`)
  root.style.setProperty('--fs-small', `${small}${smallMode}`)
  localStorage.setItem('coffee-fs-primary', String(primary))
  localStorage.setItem('coffee-fs-primary-mode', primaryMode)
  localStorage.setItem('coffee-fs-secondary', String(secondary))
  localStorage.setItem('coffee-fs-secondary-mode', secondaryMode)
  localStorage.setItem('coffee-fs-small', String(small))
  localStorage.setItem('coffee-fs-small-mode', smallMode)
}

const storedPrimary = localStorage.getItem('coffee-fs-primary')
const storedPrimaryMode = localStorage.getItem('coffee-fs-primary-mode') as FontMode | null
const storedSecondary = localStorage.getItem('coffee-fs-secondary')
const storedSecondaryMode = localStorage.getItem('coffee-fs-secondary-mode') as FontMode | null
const storedSmall = localStorage.getItem('coffee-fs-small')
const storedSmallMode = localStorage.getItem('coffee-fs-small-mode') as FontMode | null

const initialPrimary = storedPrimary !== null ? Number(storedPrimary) : DEFAULTS.fsPrimary
const initialPrimaryMode: FontMode = storedPrimaryMode ?? DEFAULTS.fsPrimaryMode
const initialSecondary = storedSecondary !== null ? Number(storedSecondary) : DEFAULTS.fsSecondary
const initialSecondaryMode: FontMode = storedSecondaryMode ?? DEFAULTS.fsSecondaryMode
const initialSmall = storedSmall !== null ? Number(storedSmall) : DEFAULTS.fsSmall
const initialSmallMode: FontMode = storedSmallMode ?? DEFAULTS.fsSmallMode

// Apply stored values immediately so CSS variables match before first render.
if (storedPrimary || storedSecondary || storedSmall) {
  applyFontSizes(initialPrimary, initialPrimaryMode, initialSecondary, initialSecondaryMode, initialSmall, initialSmallMode)
}

export const useFontSizeStore = create<FontSizeState>((set) => ({
  fsPrimary: initialPrimary,
  fsPrimaryMode: initialPrimaryMode,
  fsSecondary: initialSecondary,
  fsSecondaryMode: initialSecondaryMode,
  fsSmall: initialSmall,
  fsSmallMode: initialSmallMode,
  setFontSizes: (primary, primaryMode, secondary, secondaryMode, small, smallMode) => {
    applyFontSizes(primary, primaryMode, secondary, secondaryMode, small, smallMode)
    set({ fsPrimary: primary, fsPrimaryMode: primaryMode, fsSecondary: secondary, fsSecondaryMode: secondaryMode, fsSmall: small, fsSmallMode: smallMode })
  },
}))
