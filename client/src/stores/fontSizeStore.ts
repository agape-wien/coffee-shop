// Shop-wide font size store — two-tier pattern matching themeStore/menuDisplayStore:
// localStorage is read at module load (fast, no flash), DB is authoritative and
// overrides via FontSizeSync in App.tsx on first render.
// Values are integers in px, applied as CSS custom properties on documentElement.
import { create } from 'zustand'

const DEFAULTS = { fsPrimary: 36, fsSecondary: 29, fsSmall: 24 }

interface FontSizeState {
  fsPrimary: number
  fsSecondary: number
  fsSmall: number
  setFontSizes: (primary: number, secondary: number, small: number) => void
}

function applyFontSizes(primary: number, secondary: number, small: number) {
  const root = document.documentElement
  root.style.setProperty('--fs-primary', `${primary}px`)
  root.style.setProperty('--fs-secondary', `${secondary}px`)
  root.style.setProperty('--fs-small', `${small}px`)
  localStorage.setItem('coffee-fs-primary', String(primary))
  localStorage.setItem('coffee-fs-secondary', String(secondary))
  localStorage.setItem('coffee-fs-small', String(small))
}

const storedPrimary = localStorage.getItem('coffee-fs-primary')
const storedSecondary = localStorage.getItem('coffee-fs-secondary')
const storedSmall = localStorage.getItem('coffee-fs-small')

const initialPrimary = storedPrimary !== null ? Number(storedPrimary) : DEFAULTS.fsPrimary
const initialSecondary = storedSecondary !== null ? Number(storedSecondary) : DEFAULTS.fsSecondary
const initialSmall = storedSmall !== null ? Number(storedSmall) : DEFAULTS.fsSmall

// Apply stored values immediately so CSS variables match before first render.
// If nothing is stored, this is a no-op (the CSS file already has the defaults).
if (storedPrimary || storedSecondary || storedSmall) {
  applyFontSizes(initialPrimary, initialSecondary, initialSmall)
}

export const useFontSizeStore = create<FontSizeState>((set) => ({
  fsPrimary: initialPrimary,
  fsSecondary: initialSecondary,
  fsSmall: initialSmall,
  setFontSizes: (primary, secondary, small) => {
    applyFontSizes(primary, secondary, small)
    set({ fsPrimary: primary, fsSecondary: secondary, fsSmall: small })
  },
}))
