import { create } from 'zustand'
import { pb, restoreAuth } from '../services/pocketbase'
import { useCycleStore } from './useCycleStore'

interface AuthUser {
  id: string
  name: string
  email: string
}

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: AuthUser | null
  init: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,

  init: async () => {
    const isValid = await restoreAuth()

    if (isValid && pb.authStore.record) {
      set({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: pb.authStore.record.id,
          name: pb.authStore.record.name,
          email: pb.authStore.record.email,
        },
      })
      return
    }

    set({ isLoading: false })
  },

  login: async (email, password) => {
    const auth = await pb.collection('users').authWithPassword(email, password)
    set({
      isAuthenticated: true,
      user: {
        id: auth.record.id,
        name: auth.record.name,
        email: auth.record.email,
      },
    })
  },

  loginWithGoogle: async () => {
    const auth = await pb.collection('users').authWithOAuth2({ provider: 'google' })
    set({
      isAuthenticated: true,
      user: {
        id: auth.record.id,
        name: auth.record.name,
        email: auth.record.email,
      },
    })
  },

  register: async (email, password) => {
    await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
    })
    await useAuthStore.getState().login(email, password)
  },

  logout: async () => {
    pb.authStore.clear()
    useCycleStore.setState({
      cycles: [],
      cycleMembers: [],
      contributions: [],
      payouts: [],
      auditLogs: [],
    })
    set({ isAuthenticated: false, user: null })
  },
}))
