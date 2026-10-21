import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  GraduationCap, LayoutDashboard, CalendarCheck2, CalendarDays, FileText, Wallet,
  FolderKanban, MessagesSquare, Sparkles, BookOpen, MessageCircle, LogOut, Sun, Moon,
  Menu, X, CalendarRange,
} from 'lucide-react'
import { cn, initials } from '../../lib/utils'
import { useAuth } from '../../lib/auth'
import { Dropdown, MenuLabel, MenuItem, MenuSeparator } from '../ui/dropdown'
import { Dialog } from '../ui/dialog'
import { Input, Label } from '../ui/input'
import Button from '../ui/button'
import { useToast } from '../ui/toast'
import { api } from '../../lib/api'

const NAV = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck2 },
  { to: '/timetable', label: 'Timetable', icon: CalendarDays },
  { to: '/results', label: 'Results', icon: FileText },
  { to: '/fees', label: 'Fees & Scholarships', icon: Wallet },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/counseling', label: 'Counseling', icon: MessagesSquare },
  { to: '/chat', label: 'Group chat', icon: MessageCircle },
  { to: '/assistant', label: 'AI assistant', icon: Sparkles },
  { to: '/library', label: 'Library', icon: BookOpen },
]

function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') } catch { return 'light' }
  })
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme])
  return [theme, setTheme]
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth()
  const [theme, setTheme] = useTheme()
  const [drawer, setDrawer] = useState(false)
  const [counsOpen, setCounsOpen] = useState(false)
  const location = useLocation()
  const toast = useToast()

  useEffect(() => { setDrawer(false) }, [location.pathname])

  const NavList = ({ onBrowse }) => (
    <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onBrowse}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100'
            )
          }
        >
          <Icon className="h-4.5 w-4.5 h-4 w-4 shrink-0" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  )

  const Brand = () => (
    <div className="flex h-16 items-center gap-2.5 border-b border-zinc-200 px-6 dark:border-zinc-800">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 shadow-card">
        <GraduationCap className="h-4.5 w-4.5 h-4 w-4 text-white" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">EduWeb</p>
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Student portal</p>
      </div>
    </div>
  )

  const SideFooter = ({ onBook }) => (
    <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
      <button
        onClick={onBook}
        className="mb-3 flex w-full items-start gap-3 rounded-xl border border-brand-200/60 bg-brand-50/60 p-3 text-left transition-colors hover:bg-brand-100/60 dark:border-brand-500/20 dark:bg-brand-500/10 dark:hover:bg-brand-500/20"
      >
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-600 shadow-card">
          <CalendarRange className="h-4 w-4 text-white" aria-hidden />
        </span>
        <span>
          <span className="block text-xs font-semibold text-brand-800 dark:text-brand-200">Need to talk?</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-brand-700/70 dark:text-brand-300/70">
            Book a counseling session in two clicks.
          </span>
        </span>
      </button>
      <p className="text-[10px] text-zinc-400">EduWeb v1.0 · Campus ERP</p>
    </div>
  )

  const UserMenu = ({ onBook }) => (
    <Dropdown
      align="right"
      trigger={
        <span className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white shadow-card">
            {initials(user?.name)}
          </span>
          <span className="hidden sm:block text-left">
            <span className="block max-w-[140px] truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">{user?.name || 'Student'}</span>
            <span className="block text-[10px] capitalize text-zinc-400">{user?.role || 'student'}</span>
          </span>
        </span>
      }
    >
      <MenuLabel>Signed in</MenuLabel>
      <MenuItem
        icon={MessagesSquare}
        onClick={() => {
          onBook()
        }}
      >
        Book counseling
      </MenuItem>
      <MenuItem
        icon={Sun}
        onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      >
        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={LogOut} onClick={() => { logout(); window.location.hash = '#/login' }} className="text-rose-600 dark:text-rose-400">
        Sign out
      </MenuItem>
    </Dropdown>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:flex">
        <Brand />
        <NavList />
        <SideFooter onBook={() => setCounsOpen(true)} />
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="absolute inset-0 bg-zinc-950/40 animate-fade-in-fast" onClick={() => setDrawer(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-overlay animate-fade-in dark:bg-zinc-900">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <button onClick={() => setDrawer(false)} aria-label="Close menu" className="rounded-md p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <NavList onBrowse={() => setDrawer(false)} />
            <SideFooter onBook={() => setCounsOpen(true)} />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white/80 px-4 dark:border-zinc-800 dark:bg-zinc-900/80 sm:px-6 backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDrawer(true)}
              aria-label="Open navigation menu"
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
            <p className="hidden text-xs font-medium text-zinc-500 dark:text-zinc-400 md:block">
              <span className="hidden lg:inline">Student portal</span>
              <span className="lg:hidden">EduWeb</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              aria-label="Toggle color theme"
              className="grid h-9 w-9 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
            </button>
            <UserMenu onBook={() => setCounsOpen(true)} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>

      <BookingDialog open={counsOpen} onClose={() => setCounsOpen(false)} onBooked={() => { setCounsOpen(false); toast('Counseling request sent', 'success'); window.location.hash = '#/counseling' }} />
    </div>
  )
}

function BookingDialog({ open, onClose, onBooked }) {
  const [date, setDate] = useState(todayStr())
  const [time, setTime] = useState('10:00')
  const [talk, setTalk] = useState('Academic stress')
  const [counselors, setCounselors] = useState([])
  const [counselor, setCounselor] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) return
    api('/api/counseling/appointments')
      .then((res) => {
        const rows = res.counselors || []
        setCounselors(rows)
        setCounselor(rows[0]?.name || 'Dr. Rajesh Sharma')
      })
      .catch(() => {})
  }, [open])

  const submit = async () => {
    if (!date || !time || busy) return
    setBusy(true)
    setErr('')
    try {
      await api('/api/counseling/book', { method: 'POST', body: { counselor_name: counselor, appointment_date: `${date} ${time}`, notes: talk } })
      onBooked?.()
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Book a counseling session"
      description="Confidential, one-on-one session with the campus counselor."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy} disabled={!date || !time}>Send request</Button>
        </>
      }
    >
      <div className="space-y-4 pb-4">
        <div>
          <Label htmlFor="bk-counselor">Counselor</Label>
          {counselors.length > 0 ? (
            <select
              id="bk-counselor"
              value={counselor}
              onChange={(e) => setCounselor(e.target.value)}
              className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {counselors.map((c) => (
                <option key={c.name || c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          ) : (
            <Input id="bk-counselor" value={counselor} onChange={(e) => setCounselor(e.target.value)} disabled />
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="bk-date" required>Date</Label>
            <Input id="bk-date" type="date" min={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="bk-time" required>Time</Label>
            <Input id="bk-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="bk-topic">What would you like to talk about?</Label>
          <select
            id="bk-topic"
            value={talk}
            onChange={(e) => setTalk(e.target.value)}
            className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {['Academic stress', 'Career guidance', 'Personal wellbeing', 'Study skills', 'Other'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-400" role="alert">{err}</p>}
      </div>
    </Dialog>
  )
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}