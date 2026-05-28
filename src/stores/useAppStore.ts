import { create } from 'zustand'

export type Screen =
  | 'dashboard'
  | 'cycleDetail'
  | 'addCycle'
  | 'members'
  | 'addContribution'
  | 'addPayout'
  | 'settings'

interface AppState {
  screen: Screen
  selectedCycleId: string | null
  setScreen: (screen: Screen) => void
  openCycleDetail: (cycleId: string) => void
  openAddPayout: (cycleId: string) => void
  goDashboard: () => void
}

export const useAppStore = create<AppState>((set) => ({
  screen: 'dashboard',
  selectedCycleId: null,
  setScreen: (screen) => set({ screen }),
  openCycleDetail: (cycleId) => set({ screen: 'cycleDetail', selectedCycleId: cycleId }),
  openAddPayout: (cycleId) => set({ screen: 'addPayout', selectedCycleId: cycleId }),
  goDashboard: () => set({ screen: 'dashboard', selectedCycleId: null }),
}))
