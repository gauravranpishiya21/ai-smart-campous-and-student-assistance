/* Premium UX: command palette (Ctrl/⌘+K), scroll progress, theme restore, count-up stats, demo badge. */
(function(){
  try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark');document.body.classList.add('dark')}}catch{}
  const bar=document.createElement('div');bar.id='scrollbar-pr';document.body.appendChild(bar);
  addEventListener('scroll',()=>{const h=document.documentElement;bar.style.width=(h.scrollTop/((h.scrollHeight-h.clientHeight)||1)*100)+'%'},{passive:true});
  const R=[['Dashboard','dashboard','fa-gauge'],['Attendance','attendance','fa-user-check'],['Timetable','timetable','fa-table'],['AI Assistant','ai-chat','fa-robot'],['Academic Calendar','calendar','fa-calendar'],['Planner','planner','fa-list-check'],['Library','library','fa-book'],['Fees','fees','fa-indian-rupee-sign'],['Helpdesk','helpdesk','fa-headset'],['Campus Map','map','fa-map-location-dot'],['Placement','placement','fa-briefcase'],['Notices','notices','fa-bullhorn'],['Profile','profile','fa-user'],['Toggle theme','__theme','fa-circle-half-stroke']];
  const el=document.createElement('div');el.id='cmdk';el.innerHTML='<div class="box"><input placeholder="Jump to a section…  (Esc to close)" aria-label="Command palette"><ul></ul></div>';document.body.appendChild(el);
  const inp=el.querySelector('input'),ul=el.querySelector('ul');let sel=0,list=R;
  const draw=()=>{ul.innerHTML=list.map((r,i)=>`<li class="${i===sel?'sel':''}" data-r="${r[1]}"><i class="fas ${r[2]}"></i>${r[0]}</li>`).join('')};
  const go=r=>{close();if(r==='__theme')return window.toggleDarkMode?.();location.hash='#/'+r;window.dispatchEvent(new HashChangeEvent('hashchange'))};
  const open=()=>{el.classList.add('on');inp.value='';list=R;sel=0;draw();inp.focus()},close=()=>el.classList.remove('on');
  inp.oninput=()=>{list=R.filter(r=>r[0].toLowerCase().includes(inp.value.toLowerCase()));sel=0;draw()};
  ul.onclick=e=>{const li=e.target.closest('li');li&&go(li.dataset.r)};el.onclick=e=>{if(e.target===el)close()};
  addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();el.classList.contains('on')?close():open()}
    if(!el.classList.contains('on'))return;
    if(e.key==='Escape')close();
    if(e.key==='ArrowDown'){sel=Math.min(list.length-1,sel+1);draw();e.preventDefault()}
    if(e.key==='ArrowUp'){sel=Math.max(0,sel-1);draw();e.preventDefault()}
    if(e.key==='Enter'&&list[sel])go(list[sel][1])});
  const count=n=>{const t=n.textContent.trim(),m=t.match(/^(\d+)(%?)$/);if(!m||n.dataset.cu)return;n.dataset.cu=1;const to=+m[1],s=performance.now();
    (function f(now){const p=Math.min(1,(now-s)/700);n.textContent=Math.round(to*(1-Math.pow(1-p,3)))+m[2];p<1&&requestAnimationFrame(f)})(s)};
  new MutationObserver(()=>['attendanceRate','avgMarks','pendingTasks','attendanceForecast'].forEach(i=>{const n=document.getElementById(i);n&&count(n)})).observe(document.body,{subtree:true,childList:true,characterData:true});
  setTimeout(()=>{if(window.__demoMode&&!document.getElementById('demoPill')){const b=document.createElement('div');b.id='demoPill';b.textContent='Demo mode · offline data · Ctrl+K';b.style.cssText='position:fixed;bottom:14px;left:14px;z-index:900;font:700 11px Plus Jakarta Sans,sans-serif;padding:7px 12px;border-radius:99px;background:rgba(99,102,241,.14);color:#6366f1;backdrop-filter:blur(8px)';document.body.appendChild(b)}},2500);
})();
