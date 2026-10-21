const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000'

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const token = () => localStorage.getItem('token') || ''

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const t = token()
  if (t) headers.Authorization = `Bearer ${t}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (!res.ok) {
    const msg = data?.message || `Request failed (${res.status})`
    if (res.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (!window.location.hash.includes('/login')) window.location.hash = '#/login'
    }
    throw new ApiError(res.status, msg)
  }
  return data
}

export const get = (path) => api(path)
export const post = (path, body) => api(path, { method: 'POST', body })

export async function me() {
  // decode JWT payload without verification (server verifies on every call)
  const t = token()
  if (!t) return null
  try {
    const payload = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return { id: payload.id, role: payload.role, student_id: payload.student_id, dept_id: payload.dept_id, semester_id: payload.semester_id, exp: payload.exp }
  } catch {
    return null
  }
}
