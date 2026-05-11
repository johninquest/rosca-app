import { createContext, useContext, useEffect, useState } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading, null = signed out

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Fire-and-forget — never await Firestore inside onAuthStateChanged
        // when using persistentLocalCache, as it can hang before IndexedDB is ready
        setDoc(
          doc(db, 'users', firebaseUser.uid),
          {
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ).catch(() => {})
      }
      setUser(firebaseUser ?? null) // always called now
    })
    return unsubscribe
  }, [])

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }

  async function signOutUser() {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, signInWithGoogle, signOutUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
