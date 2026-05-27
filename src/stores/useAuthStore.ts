import { create } from 'zustand'
import { db } from '../db/dexie'
import { pb, restoreAuth } from '../services/pocketbase'
import { fullRestore } from '../services/sync-engine'

interface AuthUser {
  id: string
  email: string
}

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: AuthUser | null
  init: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,

  init: async () => {
    const isValid = await restoreAuth()

    if (isValid && pb.authStore.model) {
      set({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: pb.authStore.model.id,
          email: pb.authStore.model.email,
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
        email: auth.record.email,
      },
    })

    await fullRestore()
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
    await Promise.all([
      db.members.clear(),
      db.cycles.clear(),
      db.contributions.clear(),
      db.payouts.clear(),
    ])

    set({ isAuthenticated: false, user: null })
  },
}))
