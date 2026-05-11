import { createContext, useContext, useEffect, useState } from 'react'
import pb from '../lib/pocketbase'

const AuthContext = createContext(null)

function normalizeUser(model) {
  if (!model) return null
  return {
    uid: model.id,
    displayName: model.name || model.email,
    email: model.email,
    photoURL: model.avatar ? pb.files.getURL(model, model.avatar) : null,
  }
}

export function AuthProvider({ children }) {
  // Resolve synchronously from stored auth — no loading flash on page reload
  const [user, setUser] = useState(() =>
    pb.authStore.isValid ? normalizeUser(pb.authStore.record) : null
  )

  useEffect(() => {
    const unsub = pb.authStore.onChange(() => {
      setUser(pb.authStore.record ? normalizeUser(pb.authStore.record) : null)
    })
    return unsub
  }, [])

  async function signInWithGoogle() {
    await pb.collection('users').authWithOAuth2({ provider: 'google' })
  }

  async function signInWithEmail(email, password) {
    await pb.collection('users').authWithPassword(email, password)
  }

  async function signUpWithEmail(email, password, name) {
    await pb.collection('users').create({ email, password, passwordConfirm: password, name })
    await pb.collection('users').authWithPassword(email, password)
  }

  async function signOutUser() {
    pb.authStore.clear()
  }

  return (
    <AuthContext.Provider value={{ user, signInWithGoogle, signInWithEmail, signUpWithEmail, signOutUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
