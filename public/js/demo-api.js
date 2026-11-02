/* Demo backend: used ONLY when the real /api server is unreachable. Data persists in localStorage. */
(function(){
  const realFetch=window.fetch.bind(window), K='demo_db_v1';
  const J=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'Content-Type':'application/json'}});
  const load=()=>{try{return JSON.parse(localStorage.getItem(K))||seed()}catch{return seed()}};
  const save=d=>localStorage.setItem(K,JSON.stringify(d));
  function seed(){const d={user:{name:'Pkosr Student',email:'student@smartcampus.edu',role:'student',roll_no:'2023CS0042',dept:'Computer Science & Engineering',semester:5,year:3,xp:1240,level:4},attended:41,total:50,
   subjects:[['Data Structures',82],['Operating Systems',68],['DBMS',74],['Computer Networks',71],['AI & ML',88]],
   timetable:{Monday:[['Data Structures','LH-201'],['AI & ML','Lab-3']],Tuesday:[['DBMS','LH-105'],['Operating Systems','LH-204']],Wednesday:[['Computer Networks','LH-110']],Thursday:[['AI & ML','LH-201'],['DBMS','Lab-1']],Friday:[['Operating Systems','LH-204'],['Data Structures','LH-201']]},
   notices:[{title:'Mid-semester exams from 18 Nov',category:'Exam',priority:'High',summary:'Mid-sem exams start 18 Nov. Hall tickets are available from 10 Nov.',body:'Mid-semester examinations begin 18 November. Download hall tickets from the portal.',created_at:'2026-11-01'},{title:'Placement drive: TechCorp',category:'Placement',priority:'Medium',summary:'TechCorp is hiring SDE interns. Register before 8 Nov.',body:'Eligibility: CGPA 7.0+, no active backlogs.',created_at:'2026-10-30'},{title:'Library hours extended',category:'General',priority:'Low',summary:'Library stays open until 10 PM during exams.',body:'Valid from 5 Nov to 5 Dec.',created_at:'2026-10-28'}]};save(d);return d}
  const pct=(a,b)=>Math.round(a/b*100);
  function dash(d){const att=pct(d.attended,d.total),avg=Math.round(d.subjects.reduce((s,x)=>s+x[1],0)/d.subjects.length),can=Math.max(0,Math.floor(d.attended/.75-d.total)),must=Math.max(0,Math.ceil((.75*d.total-d.attended)/.25));
   const days=Object.keys(d.timetable),today=new Date().toLocaleDateString('en-US',{weekday:'long'});
   return{user:{...d.user,progress:d.user.xp%500/5},stats:{attendance:att,avgMarks:avg,assignmentsDone:7,assignmentsTotal:9,pending:2},
    risk:{level:att<75?'High':avg<65?'Medium':'Low',probability:att<75?62:avg<65?35:12,drivers:att<75?['Low attendance']:[]},
    forecast:{projected:Math.min(100,att+1),mustAttend:must,canMiss:can},
    rule:d.subjects.map(s=>({name:s[0],pct:s[1],ok:s[1]>=75,mustAttend:s[1]>=75?0:Math.ceil((75-s[1])/5)})),
    notifications:d.notices.slice(0,3).map(n=>({type:n.priority==='High'?'warn':'info',message:n.title,created_at:n.created_at})),
    recommendations:[{icon:'fa-book',text:'Revise Operating Systems: internal marks are your lowest.'},{icon:'fa-calendar-check',text:`You can miss up to ${can} classes and stay above 75%.`},{icon:'fa-briefcase',text:'Register for the TechCorp placement drive before 8 Nov.'}],
    routine:{today:(d.timetable[today]||[]).map(x=>({subject:x[0],room:x[1]})),week:days.map(k=>({day:k,slots:d.timetable[k].map(x=>({subject:x[0],room:x[1]}))}))},
    trend:{labels:['Aug','Sep','Oct','Nov'],data:[88,81,76,att]},performance:{labels:d.subjects.map(s=>s[0].split(' ')[0]),names:d.subjects.map(s=>s[0]),data:d.subjects.map(s=>s[1])}}}
  function ai(q,d){q=q.toLowerCase();const D=dash(d);
   if(/attend|75|miss|bunk/.test(q))return`Your attendance is **${D.stats.attendance}%**. ${D.forecast.mustAttend?`Attend the next **${D.forecast.mustAttend}** classes to reach 75%.`:`You can safely miss **${D.forecast.canMiss}** more classes.`}`;
   if(/mark|score|cgpa|grade|perform/.test(q))return`Average internal marks: **${D.stats.avgMarks}%**. Strongest: ${d.subjects.slice().sort((a,b)=>b[1]-a[1])[0][0]}. Needs work: ${d.subjects.slice().sort((a,b)=>a[1]-b[1])[0][0]}.`;
   if(/today|class|timetable|schedule/.test(q))return D.routine.today.length?'Today: '+D.routine.today.map(x=>`**${x.subject}** (${x.room})`).join(', '):'No classes today. A good time to revise.';
   if(/notice|exam|event|news/.test(q))return'Latest: '+d.notices.map(n=>`**${n.title}**`).join('; ');
   if(/risk|backlog|fail/.test(q))return`Backlog risk is **${D.risk.level}** (${D.risk.probability}%).`;
   if(/hi|hello|hey/.test(q))return`Hi ${d.user.name.split(' ')[0]}! Ask me about attendance, marks, today's classes, notices or backlog risk.`;
   return'I can help with attendance, marks, timetable, notices and backlog risk. Try "Can I miss class tomorrow?"'}
  function route(m,p,body){const d=load();
   if(p==='/auth/login'||p==='/auth/register'){if(p==='/auth/register'){d.user={...d.user,name:body.name,email:body.email,roll_no:body.roll_no,dept:body.dept,semester:body.semester};save(d)}return J({token:'demo.'+Date.now(),user:d.user})}
   if(p==='/auth/me')return J(d.user.role&&{...d.user,progress:d.user.xp%500/5});
   if(p==='/dashboard')return J(dash(d));
   if(p==='/notices')return J(d.notices);
   if(p==='/time')return J({now:new Date().toISOString()});
   if(p==='/attendance/mark'){d.attended++;d.total++;save(d);return J({message:'Attendance marked ✔'})}
   if(p==='/ai/chat')return J({reply:ai(body.message||'',d),engine:'offline'});
   if(p==='/ai/doubt-stream'){
     const q = String(body?.text || '');
     let ans = '';
     if (/tcp|handshake|syn/i.test(q)) {
       ans = '## Direct Answer\nThe **TCP Three-Way Handshake** (SYN, SYN-ACK, ACK) is the 3-step sequence used by TCP to establish a synchronized, reliable, bidirectional connection before data transfer.\n\n## Step-by-Step\n1. **SYN:** Client sends initial sequence number `seq = X`.\n2. **SYN-ACK:** Server acknowledges with `ack = X + 1` and provides its own `seq = Y`.\n3. **ACK:** Client confirms with `ack = Y + 1`. Connection status becomes `ESTABLISHED`.\n\n## Important Exam Points\n- Synchronizes sequence numbers for guaranteed orderly delivery.\n- Prevents obsolete delayed segments from establishing duplicate connections.\n\nRelated topics: TCP vs UDP | OSI Model | Flow Control';
     } else if (/normaliz|dbms|1nf|2nf|3nf|bcnf/i.test(q)) {
       ans = '## Direct Answer\n**Database Normalization** is the process of structuring relational tables to eliminate redundancy and prevent insertion, update, and deletion anomalies.\n\n## Normal Forms\n1. **1NF:** Atomic values per attribute, no repeating groups.\n2. **2NF:** In 1NF and no partial dependencies.\n3. **3NF:** In 2NF and no transitive dependencies.\n4. **BCNF:** For every dependency `X -> Y`, `X` must be a candidate/super key.\n\n## Important Exam Points\n- Lossless join decomposition and dependency preservation.\n- Balances query performance against data integrity.\n\nRelated topics: Functional Dependency | BCNF | ACID Properties';
     } else if (/deadlock/i.test(q)) {
       ans = '## Direct Answer\nA **Deadlock** occurs when multiple processes are permanently blocked because each holds a resource while waiting for another resource held by another process.\n\n## Four Coffman Conditions\n1. Mutual Exclusion\n2. Hold and Wait\n3. No Preemption\n4. Circular Wait\n\nRelated topics: Banker\'s Algorithm | Semaphore | CPU Scheduling';
     } else {
       ans = '## Direct Answer\nHere is an explanation of **' + q + '**.\n\n## Core Principles\n- Fundamental concepts and theoretical foundations.\n- Examination points and concise summary.\n\nRelated topics: Revision | Exam Points | Core Concepts';
     }
     const enc = new TextEncoder();
     const chunks = ans.match(/[\s\S]{1,40}(?:\s|$)/g) || [ans];
     const sseStream = new ReadableStream({
       start(controller) {
         for (const chunk of chunks) {
           controller.enqueue(enc.encode('data: ' + JSON.stringify({ chunk }) + '\n\n'));
         }
         controller.enqueue(enc.encode('data: ' + JSON.stringify({ done: true, explanation: ans, topics: ['Revision', 'Exam Points', 'Key Terms'] }) + '\n\n'));
         controller.enqueue(enc.encode('data: [DONE]\n\n'));
         controller.close();
       }
     });
     return new Response(sseStream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
   }
   return m==='GET'?J([]):J({message:'Saved (demo mode)'})}
  window.fetch=async function(url,opts={}){
    const u=typeof url==='string'?url:url.url;if(!u.startsWith('/api/'))return realFetch(url,opts);
    try{
      const r=await realFetch(url,opts);
      const ct=(r.headers.get('content-type')||'').toLowerCase();
      // Valid backend response (not an SPA fallback HTML page)
      if(r.status<500&&r.status!==404&&!ct.includes('text/html'))return r;
    }catch{}
    window.__demoMode=true;let b={};try{b=JSON.parse(opts.body||'{}')}catch{}
    return route((opts.method||'GET').toUpperCase(),u.slice(4).split('?')[0],b)};
})();
