import type { ReactNode } from 'react'
import Navbar from '../Navbar'
import { useAppStore } from '../../stores/useAppStore'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const screen = useAppStore((state) => state.screen)
  const showBack = screen !== 'dashboard'

  return (
    <div className="min-h-dvh bg-bg">
      <Navbar showBack={showBack} />
      <main className="max-w-2xl mx-auto p-4">{children}</main>
    </div>
  )
}
