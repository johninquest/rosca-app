import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Wraps routes that require authentication.
 * Shows nothing while auth state is loading (user === undefined).
 * Redirects to "/" if signed out.
 */
export default function ProtectedRoute({ children }) {
  const { user } = useAuth()

  if (user === undefined) {
    // Auth state still resolving — render nothing to avoid flash
    return null
  }

  if (user === null) {
    return <Navigate to="/" replace />
  }

  return children
}
