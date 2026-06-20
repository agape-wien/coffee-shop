// Shop-wide menu display flags — two-tier pattern matching themeStore/language:
// localStorage is read at module load (fast, no flash), DB is authoritative and
// overrides via MenuDisplaySync in App.tsx on first render.
import { create } from 'zustand'
import { ADMIN_CONFIG_DEFAULTS } from '@coffee/shared'

interface MenuDisplayState {
  showDescription: boolean
  showComposition: boolean
  showImage: boolean
  setShowDescription: (v: boolean) => void
  setShowComposition: (v: boolean) => void
  setShowImage: (v: boolean) => void
}

const storedDesc = localStorage.getItem('coffee-show-description')
const storedComp = localStorage.getItem('coffee-show-composition')
const storedImg = localStorage.getItem('coffee-show-image')

export const useMenuDisplayStore = create<MenuDisplayState>((set) => ({
  showDescription: storedDesc !== null ? storedDesc === 'true' : ADMIN_CONFIG_DEFAULTS.showDescription,
  showComposition: storedComp !== null ? storedComp === 'true' : ADMIN_CONFIG_DEFAULTS.showComposition,
  showImage: storedImg !== null ? storedImg === 'true' : ADMIN_CONFIG_DEFAULTS.showImage,
  setShowDescription: (v) => {
    localStorage.setItem('coffee-show-description', String(v))
    set({ showDescription: v })
  },
  setShowComposition: (v) => {
    localStorage.setItem('coffee-show-composition', String(v))
    set({ showComposition: v })
  },
  setShowImage: (v) => {
    localStorage.setItem('coffee-show-image', String(v))
    set({ showImage: v })
  },
}))
