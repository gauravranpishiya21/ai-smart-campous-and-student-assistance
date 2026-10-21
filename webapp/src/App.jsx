import { HashRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { ToastProvider } from './components/ui/toast'
import AppShell from './components/layout/app-shell'
import Login from './pages/login'
import Dashboard from './pages/dashboard'
import Attendance from './pages/attendance'
import Timetable from './pages/timetable'
import Results from './pages/results'
import Fees from './pages/fees'
import Projects from './pages/projects'
import Counseling from './pages/counseling'
import Assistant from './pages/assistant'
import GroupChat from './pages/group-chat'
import Library from './pages/library'
import { Spinner } from './components/ui/states'

function Protected({ children }) {
  const { authenticated, ready } = useAuth()
  if (!ready) return <div className="grid min-h-screen place-items-center bg-zinc-50 dark:bg-zinc-950"><div className="h-7 w-7 rounded-full border-2 border-zinc-200 border-t-brand-600 animate-spin-slow dark:border-zinc-800" aria-label="Loading" /></div>
  if (!authenticated) return <Navigate to="/login" replace />
  return children || <Outlet />
}

function Shell() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Protected><Shell /></Protected>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/timetable" element={<Timetable />} />
              <Route path="/results" element={<Results />} />
              <Route path="/fees" element={<Fees />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/counseling" element={<Counseling />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/chat" element={<GroupChat />} />
              <Route path="/library" element={<Library />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  )
}

function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="text-5xl font-bold tracking-tight text-zinc-200 dark:text-zinc-800">404</p>
        <p className="mt-2 text-sm text-zinc-500">This page went to library.</p>
      </div>
    </div>
  )
}