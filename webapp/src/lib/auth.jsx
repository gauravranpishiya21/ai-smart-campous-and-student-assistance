import { createContext, useContext, useState, useEffect } from 'react'
import { api, post, me } from './api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const init = async () => {
      const u = await me()
      if (u) {
        try {
          const saved = JSON.parse(localStorage.getItem('user') || '{}')
          u.name = saved.name || 'Member'
        } catch {
          u.name = 'Member'
        }
      }
      setUser(u)
      setReady(true)
    }
    init()
  }, [])

  const login = async (mobile, password) => {
    const data = await post('/login', { mobile: mobile.trim(), password })
    if (!data.token) throw new Error(data.message || 'Login failed')
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user || {}))
    const u = await me()
    setUser(u)
    return data
  }

  const register = async ({ name, mobile, password }) => {
    const data = await post('/register', { name: name.trim(), role: 'student', mobile: mobile.trim(), password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user || { name }))
    const u = await me()
    setUser(u)
    return data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const value = {
    user,
    ready,
    authenticated: !!user,
    isStudent: user?.role === 'student',
    studentId: user?.student_id || null,
    login,
    register,
    logout,
    api,
  }

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)