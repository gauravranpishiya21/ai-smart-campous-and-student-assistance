/* Strategic frontend enhancements: analytics + multi-agent war room.
   Demo telemetry is simulated locally; connect authenticated APIs/socket events for production data. */
(function(){
 const $=id=>document.getElementById(id);
 const palette={indigo:'#818cf8',cyan:'#22d3ee',green:'#34d399',amber:'#fbbf24',rose:'#fb7185',violet:'#a78bfa'};
 let charts={},warTimer=null,warCount=0;
 const chartBase={responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#cbd5e1',usePointStyle:true,boxWidth:8}},tooltip:{backgroundColor:'#0f172a',borderColor:'rgba(255,255,255,.15)',borderWidth:1}},scales:{x:{ticks:{color:'#94a3b8'},grid:{color:'rgba(148,163,184,.10)'}},y:{ticks:{color:'#94a3b8'},grid:{color:'rgba(148,163,184,.10)'}}}};
 function chart(id,type,data,opts={}){const el=$(id);if(!el||!window.Chart)return;if(charts[id])charts[id].destroy();charts[id]=new Chart(el,{type,data,options:{...chartBase,...opts}})}
 async function renderAnalytics(){
  let attendanceLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  let attendanceData = [85, 88, 90, 86, 92, 89, 91];
  let predictedData = [86, 89, 91, 88, 93, 90, 92];
  let perfLabels = ['CSE','ECE','ME','CE','MBA','MED'];
  let perfData = [82, 76, 79, 74, 86, 88];
  let resourceLabels = ['Labs','Classrooms','Library','Campus Hub'];
  let resourceData = [72, 84, 61, 68];
  let riskLabels = ['High Risk', 'Medium Risk', 'Low Risk', 'Safe Cohort'];
  let riskData = [12, 19, 25, 44];

  // If student or admin is authenticated, fetch live metrics from backend APIs
  if (window.api && (localStorage.getItem('token') || localStorage.getItem('admin_token'))) {
    try {
      const [dashRes, resTelemetry, radarRes] = await Promise.allSettled([
        window.api('/dashboard', { noAuthRedirect: true }),
        window.api('/resources/telemetry', { noAuthRedirect: true }),
        window.api('/analytics/early-warning-radar', { noAuthRedirect: true })
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value?.trend) {
        const t = dashRes.value.trend;
        if (t.labels && t.labels.length) {
          attendanceLabels = t.labels;
          attendanceData = t.data || [];
          predictedData = t.forecast ? t.data.map((d) => Math.min(100, Math.round(d * 1.02))) : [];
        }
        if (dashRes.value.performance && dashRes.value.performance.labels?.length) {
          perfLabels = dashRes.value.performance.labels;
          perfData = dashRes.value.performance.data;
        }
      }

      if (resTelemetry.status === 'fulfilled' && resTelemetry.value?.zones) {
        const zones = resTelemetry.value.zones;
        const labs = zones.filter((z) => z.type === 'Laboratory');
        const classrooms = zones.filter((z) => z.type === 'Classroom');
        const library = zones.filter((z) => z.type === 'Shared Space');
        const labOcc = labs.length ? Math.round((labs.reduce((a, b) => a + (b.occupancy / b.capacity), 0) / labs.length) * 100) : 70;
        const crOcc = classrooms.length ? Math.round((classrooms.reduce((a, b) => a + (b.occupancy / b.capacity), 0) / classrooms.length) * 100) : 65;
        const libOcc = library.length ? Math.round((library.reduce((a, b) => a + (b.occupancy / b.capacity), 0) / library.length) * 100) : 55;
        resourceLabels = ['Labs', 'Classrooms', 'Library', 'Campus Hub'];
        resourceData = [labOcc, crOcc, libOcc, Math.round((labOcc + crOcc + libOcc) / 3)];
      }

      if (radarRes.status === 'fulfilled' && radarRes.value) {
        const r = radarRes.value;
        const high = r.highRiskCount || 0;
        const med = r.mediumRiskCount || 0;
        const low = r.lowRiskCount || 0;
        const cohortSize = r.cohortSize || (high + med + low);
        riskLabels = ['High Risk', 'Medium Risk', 'Low Risk', 'Safe Cohort'];
        riskData = [high, med, low, Math.max(0, cohortSize - high - med)];
      }
    } catch (err) {
      console.warn('Live analytics load fallback:', err);
    }
  }

  chart('strategicAttendanceChart','line',{labels:attendanceLabels,datasets:[{label:'Attendance %',data:attendanceData,borderColor:palette.indigo,backgroundColor:'rgba(129,140,248,.14)',fill:true,tension:.38},{label:'Predicted %',data:predictedData,borderColor:palette.cyan,borderDash:[6,5],tension:.38} ]});
  chart('strategicPerformanceChart','bar',{labels:perfLabels,datasets:[{label:'Average score',data:perfData,backgroundColor:[palette.indigo,palette.cyan,palette.green,palette.amber,palette.violet,palette.rose],borderRadius:7}]},{scales:{...chartBase.scales,y:{...chartBase.scales.y,min:0,max:100}}});
  chart('strategicResourcesChart','doughnut',{labels:resourceLabels,datasets:[{data:resourceData,backgroundColor:[palette.indigo,palette.cyan,palette.green,palette.amber],borderWidth:0,hoverOffset:6}]},{cutout:'68%',plugins:{legend:{position:'bottom',labels:{color:'#cbd5e1',usePointStyle:true,padding:18}}}});
  chart('strategicRiskChart','line',{labels:riskLabels,datasets:[{label:'Cohort Distribution',data:riskData,borderColor:palette.rose,backgroundColor:'rgba(251,113,133,.12)',fill:true,tension:.35}]});
 }
 const agentData=[
  {name:'Security Agent',role:'Threat detection & access control',icon:'fa-shield-halved',color:'rose',status:'Monitoring',detail:'Door-access anomaly scan completed. No critical threats detected.'},
  {name:'Analytics Agent',role:'Prediction & performance intelligence',icon:'fa-chart-line',color:'indigo',status:'Analyzing',detail:'Attendance trend indicates a 3.2% improvement this week.'},
  {name:'Scheduling Agent',role:'Rooms, faculty & timetable coordination',icon:'fa-calendar-check',color:'cyan',status:'Optimizing',detail:'Room B-204 conflict resolved; 42 seats reassigned.'}
 ];
 const eventPool=[
  ['Security Agent','Analytics Agent','Shared verified access anomaly summary','fa-shield-halved','rose'],
  ['Analytics Agent','Scheduling Agent','Predicted lab demand increased for 14:00 slot','fa-chart-line','indigo'],
  ['Scheduling Agent','Security Agent','Updated room occupancy sent for safety validation','fa-calendar-check','cyan'],
  ['Security Agent','Scheduling Agent','Restricted-zone status synchronized with room plan','fa-shield-halved','rose'],
  ['Analytics Agent','Security Agent','Unusual attendance cluster flagged for review','fa-chart-line','amber'],
  ['Scheduling Agent','Analytics Agent','Optimized timetable published to prediction model','fa-calendar-check','cyan']
 ];
 function addEvent(e){const feed=$('warRoomFeed');if(!feed)return;const time=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});const row=document.createElement('div');row.className='war-event';row.innerHTML=`<span class="war-event-dot ${e[4]}"></span><div class="min-w-0 flex-1"><div class="text-xs font-bold">${e[0]} <i class="fas fa-arrow-right mx-1 text-slate-500"></i> ${e[1]}</div><p class="text-xs text-slate-400 mt-1"></p></div><time class="text-[10px] text-slate-500 whitespace-nowrap">${time}</time>`;row.querySelector('p').textContent=e[2];feed.prepend(row);while(feed.children.length>12)feed.lastElementChild.remove();warCount++;const count=$('warEventCount');if(count)count.textContent=warCount+' events';}
 function renderWarRoom(){const agents=$('warAgents');if(!agents)return;agents.innerHTML=agentData.map((a,i)=>`<article class="war-agent"><div class="flex items-center gap-3"><div class="war-agent-icon ${a.color}"><i class="fas ${a.icon}"></i></div><div class="min-w-0 flex-1"><h3 class="font-bold text-sm">${a.name}</h3><p class="text-[11px] text-slate-400">${a.role}</p></div><span class="war-status ${a.color}"><i class="fas fa-circle text-[6px] mr-1"></i>${a.status}</span></div><p class="text-xs text-slate-300 mt-3">${a.detail}</p><div class="war-progress"><span style="width:${[86,72,93][i]}%"></span></div></article>`).join('');
  const initial=[['Security Agent','Analytics Agent','Security posture baseline shared','fa-shield-halved','rose'],['Analytics Agent','Scheduling Agent','Demand forecast shared with timetable optimizer','fa-chart-line','indigo'],['Scheduling Agent','Security Agent','Occupancy plan submitted for safety validation','fa-calendar-check','cyan']];initial.forEach(addEvent);if(warTimer)clearInterval(warTimer);warTimer=setInterval(()=>addEvent(eventPool[Math.floor(Math.random()*eventPool.length)]),5200);
 }
 window.refreshStrategicAnalytics=renderAnalytics;
 window.warRoomRunCycle=function(){addEvent(['Admin Console','All Agents','Manual coordination cycle requested by administrator','fa-user-shield','green']);agentData.forEach(a=>a.status='Synced');renderWarAgentsOnly();};
 function renderWarAgentsOnly(){const agents=$('warAgents');if(!agents)return;agents.querySelectorAll('.war-status').forEach(x=>{x.innerHTML='<i class="fas fa-circle text-[6px] mr-1"></i>Synced';});}
 document.addEventListener('DOMContentLoaded',()=>{renderAnalytics();renderWarRoom();const range=$('strategicRange');if(range)range.addEventListener('change',()=>{const mult=range.value==='30'?1:range.value==='90'?1.08:.94;const c=charts.strategicAttendanceChart;if(c){c.data.datasets[0].data=c.data.datasets[0].data.map(v=>Math.min(100,Math.round(v*mult)));c.update();}});});
 document.addEventListener('click',e=>{const target=e.target.closest('[data-strategic-refresh]');if(target){renderAnalytics();target.innerHTML='<i class="fas fa-check mr-2"></i>Updated';setTimeout(()=>target.innerHTML='<i class="fas fa-rotate mr-2"></i>Refresh data',1300);}});
})();
