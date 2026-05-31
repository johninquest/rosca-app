import { useEffect } from 'react'
import Layout from './components/layout/Layout'
import Spinner from './components/Spinner'
import Auth from './screens/Auth'
import AddContribution from './screens/AddContribution'
import AddCycle from './screens/AddCycle'
import AddPayout from './screens/AddPayout'
import CycleDetail from './screens/CycleDetail'
import Dashboard from './screens/Dashboard'
import Members from './screens/Members'
import Settings from './screens/Settings'
import { useAppStore } from './stores/useAppStore'
import { useAuthStore } from './stores/useAuthStore'
import { useCycleStore } from './stores/useCycleStore'
import { startRealtimeSync, stopRealtimeSync } from './services/sync-engine'

const screens = {
  dashboard: Dashboard,
  cycleDetail: CycleDetail,
  addCycle: AddCycle,
  addContribution: AddContribution,
  addPayout: AddPayout,
  members: Members,
  settings: Settings,
} as const

export default function App() {
  const { isAuthenticated, isLoading, init } = useAuthStore()
  const { screen } = useAppStore()
  const { loadAll } = useCycleStore()

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    if (!isAuthenticated) {
      stopRealtimeSync()
      useCycleStore.setState({ cycles: [], members: [], contributions: [], payouts: [] })
      return
    }

    void loadAll()
    startRealtimeSync()
    return () => stopRealtimeSync()
  }, [isAuthenticated, loadAll])

  if (isLoading) {
    return <Spinner />
  }

  if (!isAuthenticated) {
    return <Auth />
  }

  const Screen = screens[screen] || Dashboard

  return (
    <Layout>
      <Screen />
    </Layout>
  )
}
