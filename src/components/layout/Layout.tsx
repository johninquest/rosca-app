import type { ReactNode } from 'react'
import { useLocation } from 'wouter'
import Navbar from '../Navbar'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation()
  const showBack = location !== '/'

  return (
    <div className="min-h-dvh bg-bg">
      <Navbar showBack={showBack} />
      <main className="max-w-2xl mx-auto p-4">{children}</main>
    </div>
  )
}
