import { create } from 'zustand'

type Page = 'plasmids' | 'organisms' | 'features' | 'gmos' | 'seeds' | 'settings' | 'dev'

interface UIState {
  activePage: Page
  setActivePage: (page: Page) => void
  newPlasmidOpen: boolean
  setNewPlasmidOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  activePage: 'plasmids',
  setActivePage: (page) => set({ activePage: page }),
  newPlasmidOpen: false,
  setNewPlasmidOpen: (open) => set({ newPlasmidOpen: open })
}))
