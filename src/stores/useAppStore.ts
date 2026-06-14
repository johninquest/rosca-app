import { create } from 'zustand'

export type Screen =
  | 'dashboard'
  | 'cycleDetail'
  | 'addCycle'
  | 'settings'

interface AppState {
  screen: Screen
  selectedCycleId: string | null
  setScreen: (screen: Screen) => void
  openCycleDetail: (cycleId: string) => void
  goBack: () => void
  goDashboard: () => void
}

export const useAppStore = create<AppState>((set) => ({
  screen: 'dashboard',
  selectedCycleId: null,
  setScreen: (screen) => set({ screen }),
  openCycleDetail: (cycleId) => set({ screen: 'cycleDetail', selectedCycleId: cycleId }),
  goBack: () => set({ screen: 'dashboard', selectedCycleId: null }),
  goDashboard: () => set({ screen: 'dashboard', selectedCycleId: null }),
}))
