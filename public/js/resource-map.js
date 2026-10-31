
/* Resource Optimization Map — live demo telemetry; replace API data with campus IoT feeds for production. */
(() => {
  let chart = null, timer = null, lastData = null;
  const el = (id) => document.getElementById(id);
  const pct = (a,b) => b ? Math.round(a/b*100) : 0;
  const tone = (p) => p >= 85 ? 'border-rose-300 bg-rose-50' : p >= 65 ? 'border-amber-300 bg-amber-50' : 'border-emerald-200 bg-emerald-50';
  window.showResourceZone = (id) => {
    const z = lastData?.zones.find(x => x.id === id); if (!z) return;
    el('resourceZoneDetails').innerHTML = `<div class="flex items-start justify-between gap-2"><div><p class="font-extrabold text-gray-800 text-lg">${esc(z.name)}</p><p class="text-xs text-gray-500">${esc(z.building)} · ${esc(z.type)}</p></div><span class="text-xs font-bold px-2 py-1 rounded-full ${tone(pct(z.occupancy,z.capacity))}">${pct(z.occupancy,z.capacity)}% full</span></div>
      <div class="grid grid-cols-2 gap-3 my-4"><div class="rounded-xl bg-gray-50 p-3"><p class="text-xs text-gray-500">Occupancy</p><p class="text-xl font-black">${z.occupancy}/${z.capacity}</p></div><div class="rounded-xl bg-gray-50 p-3"><p class="text-xs text-gray-500">Power draw</p><p class="text-xl font-black">${z.power} kW</p></div></div>
      <p class="font-bold text-xs uppercase text-gray-500 mb-2">Equipment utilization</p>${z.equipment.map(e=>`<div class="mb-3"><div class="flex justify-between text-xs mb-1"><span>${esc(e.name)}</span><b>${e.used}/${e.total}</b></div><div class="h-2 bg-gray-100 rounded-full overflow-hidden"><div class="h-full bg-indigo-500 rounded-full" style="width:${pct(e.used,e.total)}%"></div></div></div>`).join('')}`;
  };
  window.loadResourceMap = async () => {
    try {
      const d = await api('/resources/telemetry'); lastData = d;
      el('resourceEquipmentKpi').textContent = `${d.summary.equipmentUsed}/${d.summary.equipmentTotal}`;
      el('resourceClassKpi').textContent = `${d.summary.occupancy}%`;
      el('resourcePowerKpi').textContent = `${d.summary.power} kW`;
      el('resourceOpportunityKpi').textContent = d.summary.opportunities;
      el('resourceLiveStatus').textContent = 'Live demo feed';
      el('resourceUpdatedAt').textContent = new Date(d.updatedAt).toLocaleTimeString();
      el('resourceZoneGrid').innerHTML = d.zones.map(z => {
        const p=pct(z.occupancy,z.capacity);
        return `<button onclick="showResourceZone('${z.id}')" class="text-left border rounded-xl p-3 hover:shadow-md hover:-translate-y-0.5 transition ${tone(p)}"><div class="flex justify-between gap-2"><span class="text-[10px] font-bold uppercase text-gray-500">${esc(z.type)}</span><i class="fas ${z.type==='Laboratory'?'fa-flask':z.type==='Classroom'?'fa-chalkboard':'fa-book'} text-gray-500"></i></div><p class="font-bold text-sm text-gray-800 mt-2">${esc(z.name)}</p><p class="text-xs text-gray-500 mt-1">${z.occupancy}/${z.capacity} people · ${z.power} kW</p><div class="h-1.5 bg-white/80 rounded-full mt-3 overflow-hidden"><div class="h-full ${p>=85?'bg-rose-500':p>=65?'bg-amber-500':'bg-emerald-500'}" style="width:${p}%"></div></div><p class="text-[10px] font-bold mt-1 text-gray-600">${p}% utilized</p></button>`;
      }).join('');
      window.showResourceZone(d.zones[0].id);
      el('resourceRecommendations').innerHTML = d.recommendations.map(r=>`<div class="border rounded-xl p-3"><div class="flex justify-between gap-2"><b class="text-sm">${esc(r.title)}</b><span class="text-[9px] uppercase font-bold px-2 py-1 rounded-full ${r.level==='Attention'?'bg-rose-100 text-rose-700':'bg-emerald-50 text-emerald-700'}">${esc(r.level)}</span></div><p class="text-xs text-gray-500 mt-1">${esc(r.detail)}</p></div>`).join('');
      if (typeof Chart !== 'undefined') {
        if (chart) chart.destroy();
        chart = new Chart(el('resourcePowerChart'), {type:'bar',data:{labels:d.power.map(x=>x.building),datasets:[{label:'Power (kW)',data:d.power.map(x=>x.kw),borderRadius:7,backgroundColor:'#6366f1'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,title:{display:true,text:'kW'}}}}});
      }
    } catch(e) { el('resourceLiveStatus').textContent='Feed unavailable'; toast(e.message,'err'); }
    if (!timer) timer=setInterval(()=>{ if (!el('resource-map')?.classList.contains('hidden')) window.loadResourceMap(); },30000);
  };
  window.loaders = window.loaders || {};
  window.loaders['resource-map'] = window.loadResourceMap;
})();
