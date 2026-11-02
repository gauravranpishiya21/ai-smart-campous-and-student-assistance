/* Showcase gallery: login hero carousel + in-app gallery with lightbox. */
(function () {
  'use strict';
  const SLIDES = [
    { id: 'dashboard', img: 'assets/showcase/dashboard.svg', title: 'Student Command Dashboard', tag: 'Overview',
      desc: 'Attendance, CGPA, fees, XP and today’s timetable in one live, personalised view.',
      cta: 'Open dashboard', go: () => window.showSection('dashboard') },
    { id: 'ai', img: 'assets/showcase/ai-assistant.svg', title: 'AI Study Planner & Doubt Solver', tag: 'Claude-powered',
      desc: 'Describe your exams and weak subjects — get a day-by-day plan and instant, simple explanations.',
      cta: 'Open AI planner', go: () => window.showSection('planner') },
    { id: 'attendance', img: 'assets/showcase/attendance.svg', title: 'Smart Attendance', tag: 'Face · QR · RFID',
      desc: 'Face recognition, rolling QR codes and RFID taps with parent alerts and analytics.',
      cta: 'Try face attendance', go: () => (window.openFaceAttendanceModal ? window.openFaceAttendanceModal() : window.showSection('attendance-hub')) },
    { id: 'map', img: 'assets/showcase/campus-map.svg', title: 'Campus Navigation & Resources', tag: 'Live map',
      desc: 'Find rooms, labs, buses and free slots in real time, and book resources without clashes.',
      cta: 'Open campus map', go: () => window.showSection('virtual-campus-map') },
    { id: 'analytics', img: 'assets/showcase/analytics.svg', title: 'Early-Warning Analytics', tag: '94.2% accuracy',
      desc: 'A risk radar that spots struggling students before exam results do.',
      cta: 'Open risk radar', go: () => (window.openEarlyWarningRadarModal ? window.openEarlyWarningRadarModal() : window.showSection('dashboard')) },
    { id: 'safety', img: 'assets/showcase/safety.svg', title: 'Campus Safety & Security', tag: 'One-tap SOS',
      desc: 'Emergency SOS, CCTV zone telemetry and digital visitor passes for the gate.',
      cta: 'Open safety centre', go: () => window.showSection('security') }
  ];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- login hero carousel ---------- */
  function mountHero(root) {
    if (!root) return () => {};
    let i = 0, timer = null, paused = false;
    root.innerHTML = `
      <div class="sc-stage" tabindex="0" aria-roledescription="carousel" aria-label="Product showcase">
        ${SLIDES.map((s, k) => `<figure class="sc-slide${k ? '' : ' on'}" data-k="${k}" aria-hidden="${k ? 'true' : 'false'}"><img src="${s.img}" alt="${esc(s.title)} preview" ${k ? 'loading="lazy"' : ''} draggable="false"></figure>`).join('')}
        <button type="button" class="sc-nav prev" aria-label="Previous slide"><i class="fas fa-chevron-left"></i></button>
        <button type="button" class="sc-nav next" aria-label="Next slide"><i class="fas fa-chevron-right"></i></button>
      </div>
      <div class="sc-cap" aria-live="polite"><span class="sc-tag"></span><h3 class="sc-title"></h3><p class="sc-desc"></p></div>
      <div class="sc-dots" role="tablist" aria-label="Choose slide">${SLIDES.map((s, k) => `<button type="button" role="tab" class="sc-dot" data-k="${k}" aria-label="${esc(s.title)}"><span></span></button>`).join('')}</div>`;
    const slides = [...root.querySelectorAll('.sc-slide')], dots = [...root.querySelectorAll('.sc-dot')];
    const tag = root.querySelector('.sc-tag'), title = root.querySelector('.sc-title'), desc = root.querySelector('.sc-desc');
    function go(n) {
      i = (n + SLIDES.length) % SLIDES.length;
      slides.forEach((el, k) => { el.classList.toggle('on', k === i); el.setAttribute('aria-hidden', k === i ? 'false' : 'true'); });
      dots.forEach((d, k) => { d.classList.toggle('on', k === i); d.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
      const s = SLIDES[i]; tag.textContent = s.tag; title.textContent = s.title; desc.textContent = s.desc;
      restart();
    }
    function restart() { clearInterval(timer); if (!reduce() && !paused) timer = setInterval(() => go(i + 1), 5200); }
    root.querySelector('.prev').onclick = () => go(i - 1);
    root.querySelector('.next').onclick = () => go(i + 1);
    dots.forEach((d) => (d.onclick = () => go(+d.dataset.k)));
    root.addEventListener('mouseenter', () => { paused = true; clearInterval(timer); });
    root.addEventListener('mouseleave', () => { paused = false; restart(); });
    root.querySelector('.sc-stage').addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1); });
    let x0 = null; // swipe
    root.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); x0 = null; });
    go(0);
    return () => clearInterval(timer);
  }

  /* ---------- lightbox ---------- */
  let lb = null, lbIdx = 0, lastFocus = null;
  function lightbox(n) {
    lastFocus = document.activeElement; lbIdx = n;
    if (!lb) {
      lb = document.createElement('div'); lb.id = 'scLightbox'; lb.className = 'sc-lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Showcase preview');
      lb.innerHTML = `<div class="sc-lb-bg"></div><div class="sc-lb-box">
        <button type="button" class="sc-lb-x" aria-label="Close preview"><i class="fas fa-xmark"></i></button>
        <button type="button" class="sc-nav prev" aria-label="Previous"><i class="fas fa-chevron-left"></i></button>
        <img alt="" draggable="false">
        <button type="button" class="sc-nav next" aria-label="Next"><i class="fas fa-chevron-right"></i></button>
        <div class="sc-lb-foot"><div><span class="sc-tag"></span><h3 class="sc-title"></h3><p class="sc-desc"></p></div><div class="sc-lb-act"><span class="sc-count"></span><button type="button" class="sc-cta"></button></div></div></div>`;
      document.body.appendChild(lb);
      lb.querySelector('.sc-lb-bg').onclick = lb.querySelector('.sc-lb-x').onclick = closeLb;
      lb.querySelector('.prev').onclick = () => showLb(lbIdx - 1);
      lb.querySelector('.next').onclick = () => showLb(lbIdx + 1);
      lb.querySelector('.sc-cta').onclick = () => { const s = SLIDES[lbIdx]; closeLb(); try { s.go(); } catch (e) { console.error(e); } };
      document.addEventListener('keydown', (e) => {
        if (!lb.classList.contains('open')) return;
        if (e.key === 'Escape') closeLb(); else if (e.key === 'ArrowRight') showLb(lbIdx + 1); else if (e.key === 'ArrowLeft') showLb(lbIdx - 1);
        else if (e.key === 'Tab') { const f = [...lb.querySelectorAll('button')]; const a = document.activeElement; if (e.shiftKey && a === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && a === f[f.length - 1]) { e.preventDefault(); f[0].focus(); } }
      });
    }
    showLb(n); lb.classList.add('open'); document.documentElement.classList.add('sc-lock'); lb.querySelector('.sc-lb-x').focus();
  }
  function showLb(n) {
    lbIdx = (n + SLIDES.length) % SLIDES.length; const s = SLIDES[lbIdx];
    const im = lb.querySelector('img'); im.src = s.img; im.alt = s.title + ' preview';
    lb.querySelector('.sc-tag').textContent = s.tag; lb.querySelector('.sc-title').textContent = s.title; lb.querySelector('.sc-desc').textContent = s.desc;
    lb.querySelector('.sc-cta').innerHTML = esc(s.cta) + ' <i class="fas fa-arrow-right"></i>';
    lb.querySelector('.sc-count').textContent = (lbIdx + 1) + ' / ' + SLIDES.length;
  }
  function closeLb() { if (!lb) return; lb.classList.remove('open'); document.documentElement.classList.remove('sc-lock'); try { lastFocus && lastFocus.focus(); } catch { /* ignore */ } }

  /* ---------- in-app gallery section ---------- */
  function renderGallery() {
    const root = document.getElementById('showcaseGallery'); if (!root) return;
    const q = (document.getElementById('showcaseSearch') || {}).value || '';
    const list = SLIDES.map((s, k) => ({ s, k })).filter(({ s }) => (s.title + ' ' + s.desc + ' ' + s.tag).toLowerCase().includes(q.trim().toLowerCase()));
    root.innerHTML = list.length ? list.map(({ s, k }) => `
      <article class="sc-card" style="--d:${k * 60}ms">
        <button type="button" class="sc-thumb" data-k="${k}" aria-label="Preview ${esc(s.title)}"><img src="${s.img}" alt="${esc(s.title)} preview" loading="lazy"><span class="sc-zoom"><i class="fas fa-expand"></i> Preview</span></button>
        <div class="sc-body"><span class="sc-tag">${esc(s.tag)}</span><h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p>
        <button type="button" class="sc-link" data-go="${k}">${esc(s.cta)} <i class="fas fa-arrow-right"></i></button></div>
      </article>`).join('') : '<p class="sc-empty">No showcase items match your search.</p>';
    root.querySelectorAll('.sc-thumb').forEach((b) => (b.onclick = () => lightbox(+b.dataset.k)));
    root.querySelectorAll('.sc-link').forEach((b) => (b.onclick = () => SLIDES[+b.dataset.go].go()));
  }
  window.loaders = window.loaders || {};
  window.loaders.showcase = renderGallery;
  document.addEventListener('input', (e) => { if (e.target && e.target.id === 'showcaseSearch') renderGallery(); });

  window.Showcase = { slides: SLIDES, mountHero, lightbox, renderGallery };
})();
