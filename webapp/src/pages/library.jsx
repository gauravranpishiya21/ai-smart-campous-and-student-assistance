import { useState } from 'react'
import { BookOpen, Search, ArrowLeft, ChevronRight, BookmarkCheck, Download } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import Button from '../components/ui/button'
import { Input, Select as Sel } from '../components/ui/input'
import { Dialog } from '../components/ui/dialog'
import { Spinner, ErrorState, EmptyState, useAsync } from '../components/ui/states'
import { get, post } from '../lib/api'
import { useToast } from '../components/ui/toast'
import { cn, fmtDate } from '../lib/utils'
import { asList } from '../lib/helpers'

export default function Library() {
  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Digital library</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Read e-books chapter by chapter, or borrow physical copies from the desk.</p>
      </header>
      <LibraryBody />
    </div>
  )
}

function LibraryBody() {
  const toast = useToast()
  const books = useAsync(() => get('/library/books'), [])
  const borrows = useAsync(() => get('/library/borrows/me'), [])
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [reading, setReading] = useState(null) // {chapterId, chapter}
  const [chapterId, setChapterId] = useState(null)

  const rows = asList(books.data?.items)
  const categories = books.data?.categories || []
  const filtered = rows.filter(
    (b) =>
      (cat === 'all' || b.category === cat) &&
      (!q || `${b.title} ${b.author} ${b.subject_code}`.toLowerCase().includes(q.toLowerCase()))
  )

  const openChapter = async (book, lastChapterId) => {
    try {
      setReading({ loading: true })
      const ch = await get(`/library/chapters/${lastChapterId}`)
      setReading({ book, chapter: ch })
    } catch (e) {
      toast(e.message, 'error')
      setReading(null)
    }
  }

  const gotoChapter = async (id) => {
    if (!id) {
      setReading((r) => ({ book: r?.book, endPage: true }))
      return
    }
    try {
      setReading({ book: reading?.book, loading: true })
      const ch = await get(`/library/chapters/${id}`)
      setReading({ book: reading?.book, chapter: ch })
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const borrow = async (b) => {
    try {
      await post('/library/borrow', { book_id: b.id })
      toast(`Reserved "${b.title}" — collect it from the library desk.`, 'success')
      borrows.reload()
      books.reload()
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, author or course code…" aria-label="Search books" className="pl-9" />
        </div>
        <Sel value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category" className="sm:w-44">
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Sel>
      </div>

      {books.loading ? (
        <Spinner />
      ) : books.error ? (
        <ErrorState message={books.error} onRetry={books.reload} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="No books match" description="Try another search term or category." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((b) => (
            <Card key={b.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col pt-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100">{b.title}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-400">{b.author}</p>
                  </div>
                  <Badge tone="indigo">{b.category}</Badge>
                </div>
                <p className="mt-2 line-clamp-2 flex-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{b.description}</p>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="rounded-lg bg-zinc-50 py-1.5 dark:bg-zinc-800/40">
                    <dt className="text-zinc-400">Pages</dt>
                    <dd className="font-semibold text-zinc-700 dark:text-zinc-200">{b.pages}</dd>
                  </div>
                  <div className="rounded-lg bg-zinc-50 py-1.5 dark:bg-zinc-800/40">
                    <dt className="text-zinc-400">Chapters</dt>
                    <dd className="font-semibold text-zinc-700 dark:text-zinc-200">{b.chapter_count}</dd>
                  </div>
                  <div className="rounded-lg bg-zinc-50 py-1.5 dark:bg-zinc-800/40">
                    <dt className="text-zinc-400">On shelf</dt>
                    <dd className={cn('font-semibold', b.available_copies > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500')}>{b.available_copies}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex gap-2">
                  {b.readable ? (
                    <Button size="sm" variant="primary" className="flex-1" onClick={() => openChapter(b, b.last_chapter_id || null)}>
                      {b.progress_percent > 0 ? `Resume (${Math.round(b.progress_percent)}%)` : 'Start reading'}
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" className="flex-1" disabled>
                      Reader soon
                    </Button>
                  )}
                  {b.available_copies > 0 && b.borrowed_by_me === 0 ? (
                    <Button size="sm" variant="secondary" onClick={() => borrow(b)}>Borrow</Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* My borrows */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <BookmarkCheck className="h-4 w-4 text-zinc-400" aria-hidden /> My borrowed books
          </h2>
          {borrows.loading ? (
            <p className="mt-3 text-xs text-zinc-400">Loading…</p>
          ) : asList(borrows.data?.items).filter((r) => !r.returned_at).length === 0 ? (
            <p className="mt-3 text-xs text-zinc-400">Nothing on loan right now.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {asList(borrows.data?.items)
                .filter((r) => !r.returned_at)
                .map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200/60 bg-amber-50/50 px-3 py-2 dark:border-amber-500/20 dark:bg-amber-500/10">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{r.title || 'Working with Design'}</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Author {r.author} · Borrowed {fmtDate(r.borrowed_at)}</p>
                    </div>
                    <Badge tone="amber">Due {fmtDate(r.due_date)}</Badge>
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Reader */}
      <Dialog open={!!reading} onClose={() => setReading(null)} size="xl" title={reading?.book?.title} description={reading?.book?.author}>
        <div className="prose prose-sm prose-zinc max-w-none pb-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 dark:prose-invert">
          {reading?.loading ? (
            <Spinner />
          ) : reading?.endPage ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Download className="h-8 w-8 text-zinc-300" aria-hidden />
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">You've reached the end of this preview</p>
              <p className="max-w-sm text-xs text-zinc-500">Full volume is on the library shelf — borrow it to take home the complete chapters.</p>
              <Button variant="secondary" onClick={() => setReading(null)}>Back to catalog</Button>
            </div>
          ) : reading?.chapter ? (
            <>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                Chapter {reading.chapter.chapter_no} · {reading.chapter.title}
              </p>
              <div dangerouslySetInnerHTML={{ __html: reading.chapter.content }} />
            </>
          ) : null}
        </div>
        {reading?.chapter && (
          <div className="flex items-center justify-between border-t border-zinc-100 py-3 dark:border-zinc-800">
            <Button variant="ghost" size="sm" onClick={() => setReading(null)}>
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back
            </Button>
            <Button size="sm" onClick={() => gotoChapter(reading.chapter.next_chapter_id)} disabled={!reading.chapter.next_chapter_id && !reading.endPage}>
              Next chapter <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>
        )}
      </Dialog>
    </>
  )
}