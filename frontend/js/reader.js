const API_BASE = 'http://localhost:5000';

let BOOK = null;
let CHAPTERS = [];
let currentChapter = null;
let fontScale = 1;
let savedTimer = null;

function authHeaders() {
    return { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
}

function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function qs(name) {
    return new URLSearchParams(window.location.search).get(name);
}

async function loadBook() {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = 'login.html'; return; }

    const bookId = qs('book');
    if (!bookId) { window.location.href = 'student.html'; return; }

    try {
        const res = await fetch(`${API_BASE}/library/books/${bookId}`, { headers: authHeaders() });
        if (res.status === 401) { localStorage.clear(); window.location.href = 'login.html'; return; }
        BOOK = await res.json();
        CHAPTERS = BOOK.chapters || [];

        document.getElementById('bookTitle').textContent = BOOK.title;
        document.getElementById('bookMeta').textContent =
            [BOOK.author, BOOK.category, BOOK.subject_code, BOOK.level, BOOK.pages + ' pages'].filter(Boolean).join(' · ');
        document.title = BOOK.title + ' - Reader';

        renderChapterList();

        if (!CHAPTERS.length) {
            document.getElementById('chapterContent').innerHTML =
                '<p class="text-gray-400">This book has no readable chapters yet.</p>';
            return;
        }

        let startId = Number(qs('chapter')) || BOOK.last_chapter_id || CHAPTERS[0].id;
        if (!CHAPTERS.some(c => c.id === startId)) startId = CHAPTERS[0].id;
        await openChapter(startId);

        if (BOOK.progress_percent > 0) setProgress(BOOK.progress_percent);
    } catch (err) {
        console.error(err);
        document.getElementById('chapterContent').innerHTML =
            '<p class="text-red-500">Could not load this book. Please try again.</p>';
    }
}

function renderChapterList() {
    const list = document.getElementById('chapterList');
    list.innerHTML = CHAPTERS.map((c, i) => `
        <a href="#" onclick="openChapter(${c.id}); return false;" data-ch="${c.id}"
           class="block px-3 py-2 rounded-lg text-sm text-gray-600 border border-transparent hover:bg-gray-50 chap-btn">
            <span class="font-black text-gray-400 text-[10px]">CH ${String(c.chapter_no).padStart(2, '0')}</span>
            <span class="block leading-snug mt-0.5">${esc(c.title)}</span>
        </a>
    `).join('');
}

async function openChapter(chapterId) {
    try {
        const res = await fetch(`${API_BASE}/library/chapters/${chapterId}`, { headers: authHeaders() });
        if (!res.ok) throw new Error('chapter not found');
        const ch = await res.json();
        currentChapter = ch;

        document.getElementById('chapterContent').innerHTML = `
            <p class="text-[10px] font-black uppercase text-indigo-600 tracking-wider mb-1">Chapter ${ch.chapter_no}</p>
            <h2 class="!border-0 !mb-6 !mt-0 !text-2xl">${esc(ch.title)}</h2>
            ${ch.content}
            <div class="mt-10 pt-5 border-t border-gray-200 flex items-center justify-between">
                <p class="text-xs text-gray-400">${esc(ch.book_title)} · ${esc(ch.book_author)}</p>
                <span id="endOfChapter" class="text-[10px] font-bold text-gray-400">End of chapter</span>
            </div>
        `;
        document.getElementById('chapterContent').scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // highlight active chapter
        document.querySelectorAll('#chapterList a').forEach(a =>
            a.classList.toggle('active', Number(a.dataset.ch) === chapterId));

        updateNavButtons();
        saveProgress(ch.id, 5);
        history.replaceState(null, '', `?book=${BOOK.id}&chapter=${ch.id}`);
        observeScroll();
    } catch (err) {
        console.error(err);
        document.getElementById('chapterContent').innerHTML =
            '<p class="text-red-500">This chapter could not be loaded.</p>';
    }
}

function updateNavButtons() {
    if (!currentChapter) return;
    const idx = CHAPTERS.findIndex(c => c.id === currentChapter.id);
    document.getElementById('prevBtn').disabled = idx <= 0;
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.disabled = idx >= CHAPTERS.length - 1;
}

function goChapter(direction) {
    if (!currentChapter) return;
    const idx = CHAPTERS.findIndex(c => c.id === currentChapter.id);
    const target = CHAPTERS[idx + direction];
    if (target) openChapter(target.id);
}

function goBack() {
    if (history.length > 1) history.back();
    else window.location.href = 'student.html';
}

// ---- progress ----
function setProgress(pct) {
    const p = Math.max(0, Math.min(100, Math.round(pct)));
    document.getElementById('progressBar').style.width = p + '%';
    document.getElementById('progressPct').textContent = p + '%';
}

function bookPercent() {
    if (!CHAPTERS.length || !currentChapter) return 0;
    const idx = CHAPTERS.findIndex(c => c.id === currentChapter.id);
    if (idx < 0) return 0;
    return Math.round(((idx + 1) / CHAPTERS.length) * 100);
}

function saveProgress(chapterId, pct) {
    clearTimeout(savedTimer);
    const finalPct = pct != null ? pct : bookPercent();
    setProgress(finalPct);
    savedTimer = setTimeout(async () => {
        try {
            await fetch(`${API_BASE}/library/progress`, {
                method: 'POST',
                headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
                body: JSON.stringify({ book_id: BOOK.id, chapter_id: chapterId, percent: finalPct })
            });
        } catch (_) {}
    }, 700);
}

// Scroll observer: update progress as the reader moves through the chapter
let scrollObserver = null;
function observeScroll() {
    if (scrollObserver) scrollObserver.disconnect();
    const endMark = document.getElementById('endOfChapter');
    if (!endMark) return;
    scrollObserver = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) saveProgress(currentChapter.id, bookPercent()); });
    }, { threshold: 0.6 });
    scrollObserver.observe(endMark);
}

// ---- reading preferences ----
function adjustFont(delta) {
    fontScale = Math.max(0.85, Math.min(1.6, fontScale + delta * 0.1));
    document.querySelector('.reader-body').style.fontSize = (17 * fontScale) + 'px';
    localStorage.setItem('readerFontScale', fontScale);
}

function toggleTheme() {
    const el = document.getElementById('chapterContent');
    const dark = el.classList.toggle('bg-gray-900');
    el.classList.toggle('text-gray-100', dark);
    el.classList.toggle('text-gray-300', dark);
    el.classList.toggle('reader-body', !dark);
    el.classList.toggle('dark-reader', dark);
    if (dark) {
        el.querySelectorAll('h2').forEach(h => { h.style.color = '#f9fafb'; h.style.borderColor = '#374151'; });
        el.querySelectorAll('th').forEach(t => { t.style.background = '#1f2937'; t.style.color = '#f3f4f6'; });
        el.querySelectorAll('td').forEach(t => { t.style.borderColor = '#374151'; });
        el.querySelectorAll('tr:nth-child(even) td').forEach(t => t.style.background = '#111827');
        el.querySelectorAll('code').forEach(c => { c.style.background = '#1f2937'; c.style.color = '#fca5a5'; });
        el.querySelectorAll('p').forEach(p => p.style.color = '#d1d5db');
    } else {
        el.querySelectorAll('h2').forEach(h => { h.style.color = ''; h.style.borderColor = ''; });
        el.querySelectorAll('th').forEach(t => { t.style.background = ''; t.style.color = ''; });
        el.querySelectorAll('td').forEach(t => { t.style.borderColor = ''; });
        el.querySelectorAll('tr:nth-child(even) td').forEach(t => t.style.background = '');
        el.querySelectorAll('code').forEach(c => { c.style.background = ''; c.style.color = ''; });
        el.querySelectorAll('p').forEach(p => p.style.color = '');
    }
    document.getElementById('themeBtn').innerHTML = dark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('readerFontScale');
    if (saved) {
        fontScale = Number(saved);
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelector('.reader-body').style.fontSize = (17 * fontScale) + 'px';
        });
    }
    window.addEventListener('beforeunload', () => {
        if (currentChapter) saveProgress(currentChapter.id, bookPercent());
    });
    loadBook();
});