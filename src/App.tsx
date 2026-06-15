import { useEffect } from 'react'
import { Switch, Route, Redirect } from 'wouter'
import Layout from './components/layout/Layout'
import Spinner from './components/Spinner'
import Auth from './screens/Auth'
import AddCycle from './screens/AddCycle'
import CycleDetail from './screens/CycleDetail'
import Dashboard from './screens/Dashboard'
import Settings from './screens/Settings'
import { useAuthStore } from './stores/useAuthStore'
import { useCycleStore } from './stores/useCycleStore'
import { startRealtimeSync, stopRealtimeSync } from './services/sync-engine'

export default function App() {
  const { isAuthenticated, isLoading, init } = useAuthStore()
  const { loadAll } = useCycleStore()

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    if (!isAuthenticated) {
      stopRealtimeSync()
      useCycleStore.setState({ cycles: [], cycleMembers: [], contributions: [], payouts: [], auditLogs: [] })
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

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/cycles/new" component={AddCycle} />
        <Route path="/cycles/:cycleId" component={CycleDetail} />
        <Route path="/settings" component={Settings} />
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    </Layout>
  )
}
