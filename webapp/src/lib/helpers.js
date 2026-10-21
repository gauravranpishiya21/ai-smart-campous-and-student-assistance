import { get } from '../lib/api'

export function asList(data) {
  if (!data) return []
  if (Array.isArray(data)) return data
  for (const k of ['items', 'data', 'rows', 'messages', 'appointments', 'books', 'leaves', 'results', 'receipts', 'past_papers', 'records', 'notes', 'groups', 'bookmarks'])
    if (Array.isArray(data[k])) return data[k]
  return []
}

export const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

export async function feesStudent() { return get('/api/fees/student/me') }
