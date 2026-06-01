import { create } from 'zustand'

export type Screen =
  | 'dashboard'
  | 'cycleDetail'
  | 'addCycle'
  | 'members'
  | 'addMember'
  | 'editMember'
  | 'settings'

interface AppState {
  screen: Screen
  selectedCycleId: string | null
  selectedMemberId: string | null
  setScreen: (screen: Screen) => void
  openCycleDetail: (cycleId: string) => void
  openAddMember: () => void
  openEditMember: (memberId: string) => void
  goMembers: () => void
  goBack: () => void
  goDashboard: () => void
}

export const useAppStore = create<AppState>((set) => ({
  screen: 'dashboard',
  selectedCycleId: null,
  selectedMemberId: null,
  setScreen: (screen) => set({ screen }),
  openCycleDetail: (cycleId) => set({ screen: 'cycleDetail', selectedCycleId: cycleId }),
  openAddMember: () => set({ screen: 'addMember', selectedMemberId: null }),
  openEditMember: (memberId) => set({ screen: 'editMember', selectedMemberId: memberId }),
  goMembers: () => set({ screen: 'members', selectedMemberId: null }),
  goBack: () => set((state) => {
    if (state.screen === 'addMember' || state.screen === 'editMember') {
      return { screen: 'members' }
    }
    return { screen: 'dashboard', selectedCycleId: null, selectedMemberId: null }
  }),
  goDashboard: () => set({ screen: 'dashboard', selectedCycleId: null, selectedMemberId: null }),
}))
