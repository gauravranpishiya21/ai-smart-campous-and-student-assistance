import { useState } from 'react'
import { GraduationCap, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const canSubmit = mobile.trim().length >= 8 && password.length >= 4 && (mode === 'login' || name.trim().length >= 2)

  const submit = async (e) => {
    e.preventDefault()
    if (!canSubmit || busy) return
    setBusy(true)
    setError('')
    try {
      if (mode === 'login') {
        const data = await login(mobile, password)
        const role = data.user?.role
        window.location.hash = role === 'student' ? '#/' : '#/'
      } else {
        await register({ name, mobile, password })
        window.location.hash = '#/'
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col lg:flex-row">
      {/* Left: brand panel */}
      <div className="relative hidden lg:flex lg:w-[46%] items-stretch overflow-hidden bg-zinc-950">
        <img
          src="/univ.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full text-zinc-50">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 shadow-card">
              <GraduationCap className="h-5 w-5 text-white" aria-hidden />
            </span>
            <span className="text-sm font-semibold tracking-tight">EduWeb</span>
          </div>
          <div className="max-w-sm space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
              Your campus, beautifully organised.
            </h1>
            <p className="text-sm leading-relaxed text-zinc-400">
              Attendance, fees, results, projects, group chat, an AI assistant and the digital library — one calm portal for everything academic.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {['Attendance', 'Result report', 'E-Library', 'Group chat', 'AI assistant'].map((chip) => (
                <span key={chip} className="rounded-full border border-zinc-700/60 bg-zinc-900/40 px-3 py-1 text-[11px] font-medium text-zinc-300 backdrop-blur">
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-zinc-500">Campus ERP · offline-first · your data stays on your server</p>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px] animate-fade-in">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600">
              <GraduationCap className="h-5 w-5 text-white" aria-hidden />
            </span>
            <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">EduWeb</span>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {mode === 'login' ? 'Sign in with your registered mobile number.' : 'Registration is for students — the rest come from the office.'}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/70" role="tablist">
            {['login', 'signup'].map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => { setMode(m); setError('') }}
                className={
                  'rounded-lg py-2 text-xs font-semibold transition-all ' +
                  (mode === m
                    ? 'bg-white text-zinc-900 shadow-card dark:bg-zinc-900 dark:text-zinc-50'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200')
                }
              >
                {m === 'login' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {mode === 'signup' && (
              <div>
                <label htmlFor="name" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Full name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aarav Sharma"
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm transition-colors focus:border-brand-400 placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  required
                />
              </div>
            )}
            <div>
              <label htmlFor="mobile" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Mobile number <span className="text-rose-500">*</span>
              </label>
              <input
                id="mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/[^\d+\- ]/g, ''))}
                placeholder="e.g. 9999999999"
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm transition-colors focus:border-brand-400 placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={show ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'login' ? 'Your password' : 'At least 4 characters'}
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 pr-10 text-sm transition-colors focus:border-brand-400 placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 animate-fade-in-fast" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit || busy}
              className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50 disabled:pointer-events-none"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin-slow" aria-hidden /> : null}
              {mode === 'login' ? 'Sign in' : 'Create account'}
              {!busy && <ArrowRight className="h-4 w-4" aria-hidden />}
            </button>
          </form>

          <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Demo accounts</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <DemoAccount label="Student" mobile="9999999999" password="password123" onFill={(m, p) => { setMode('login'); setName(''); setMobile(m); setPassword(p) }} />
              <DemoAccount label="Faculty" mobile="9876543210" password="password123" onFill={(m, p) => { setMode('login'); setName(''); setMobile(m); setPassword(p) }} />
              <DemoAccount label="Admin" mobile="1234567890" password="admin123" onFill={(m, p) => { setMode('login'); setName(''); setMobile(m); setPassword(p) }} />
              <DemoAccount label="Librarian" mobile="7020001004" password="staff123" onFill={(m, p) => { setMode('login'); setName(''); setMobile(m); setPassword(p) }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DemoAccount({ label, mobile, password, onFill }) {
  return (
    <button
      type="button"
      onClick={() => onFill(mobile, password)}
      className="rounded-lg border border-zinc-200 px-2.5 py-2 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:border-zinc-800 dark:hover:border-brand-800 dark:hover:bg-brand-500/10"
    >
      <p className="font-semibold text-zinc-800 dark:text-zinc-200">{label}</p>
      <p className="mt-0.5 text-[10.5px] text-zinc-400">{mobile} · click to fill</p>
    </button>
  )
}