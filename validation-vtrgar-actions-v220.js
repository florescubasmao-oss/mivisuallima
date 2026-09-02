/* =========================================================
   MI VISUAL LIMA - V2.20.0
   VALIDACION TECNICA · CONTADOR WIN + GESTION DIRECTA

   - Fija el contador VTR/GAR con pendientes reales de VTR_GAR_GESTION.
   - Intercepta Gestionar antes del modal antiguo.
   - Usa directamente vtrGarManagementList y vtrGarDecision.
   - No modifica backend ni MAPA_ORDENES.
========================================================= */
(() => {
  'use strict';
  if (window.__MVL_VTRGAR_ACTIONS_V220__) return;
  window.__MVL_VTRGAR_ACTIONS_V220__ = true;

  const TOKEN_KEY='mvl_session_token';
  const $=id=>document.getElementById(id);
  const norm=v=>String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();
  const esc=v=>String(v==null?'':v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const token=()=>localStorage.getItem(TOKEN_KEY)||'';
  let lastPending=null;
  let busy=false;

  async function callApi(action,payload={}) {
    const fn=typeof window.api==='function'?window.api:(typeof api==='function'?api:null);
    if(!fn) throw new Error('API no disponible.');
    return await fn(action,{token:token(),...payload});
  }

  function css(){
    if($('mvlV220Css')) return;
    const s=document.createElement('style');
    s.id='mvlV220Css';
    s.textContent=`
      .mvl-v220-overlay{position:fixed;inset:0;z-index:10050;background:rgba(15,29,43,.56);display:grid;place-items:center;padding:16px}
      .mvl-v220-modal{width:min(760px,100%);max-height:min(88vh,820px);overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.28);padding:18px;color:#193b5c}
      .mvl-v220-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid #dce7f1;padding-bottom:12px}
      .mvl-v220-head h3{margin:0;font-size:1.05rem;color:#123d67}.mvl-v220-head p{margin:4px 0 0;color:#6f8294;font-size:.76rem}
      .mvl-v220-close{border:0;border-radius:10px;background:#edf3f8;color:#31506d;padding:8px 11px;font-weight:850;cursor:pointer}
      .mvl-v220-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:13px}
      .mvl-v220-field{border:1px solid #dce7f1;border-radius:11px;background:#f8fbfe;padding:10px;font-size:.76rem;line-height:1.4}.mvl-v220-field b{display:block;color:#49637b;font-size:.66rem;margin-bottom:3px}
      .mvl-v220-note{margin-top:11px;padding:10px;border-radius:11px;background:#f4f8fb;color:#5d7388;font-size:.74rem;line-height:1.45}
      .mvl-v220-form{margin-top:14px;display:grid;gap:10px}.mvl-v220-form label{font-size:.72rem;font-weight:850;color:#4b647c}.mvl-v220-form select,.mvl-v220-form textarea{width:100%;margin-top:5px;border:1px solid #cbdced;border-radius:10px;padding:9px;font:inherit;color:#173c60;background:#fff}.mvl-v220-form textarea{min-height:82px;resize:vertical}
      .mvl-v220-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin-top:14px}.mvl-v220-actions button{border:0;border-radius:10px;padding:9px 12px;font:inherit;font-size:.74rem;font-weight:900;cursor:pointer}.mvl-v220-confirm{background:#1677c8;color:#fff}.mvl-v220-reassign{background:#0f766e;color:#fff}.mvl-v220-no{background:#e9eef3;color:#344f69}.mvl-v220-annul{background:#b42318;color:#fff}.mvl-v220-disabled{opacity:.55;pointer-events:none}
      .mvl-v220-status{margin-top:10px;min-height:18px;color:#b42318;font-size:.73rem;font-weight:750}
      @media(max-width:640px){.mvl-v220-grid{grid-template-columns:1fr}.mvl-v220-modal{padding:14px}.mvl-v220-actions{justify-content:stretch}.mvl-v220-actions button{flex:1 1 46%}}
    `;
    document.head.appendChild(s);
  }

  function canonical(value,type){
    const raw=norm(value).replace(/\s+/g,'');
    const m=raw.match(/(VTR|GAR)-?(\d+)/);
    if(m) return `${m[1]}-${m[2]}`;
    const digits=raw.replace(/\D/g,'');
    if(!digits) return '';
    const t=norm(type);
    if(t.includes('GAR')) return `GAR-${digits}`;
    if(t.includes('VTR')||t.includes('REITER')) return `VTR-${digits}`;
    return '';
  }

  function badge(){
    return $('mvlV216CountVTRGAR');
  }

  function pendingFromDom(){
    const v218=document.querySelector('.mvl-v218-summary .mvl-v218-kpi:nth-child(5) b');
    const v217=document.querySelector('.mvl-v217-vg-summary .mvl-v217-vg-kpi:nth-child(5) b');
    const el=v218||v217;
    if(!el) return null;
    const n=Number(String(el.textContent||'').replace(/[^0-9.-]/g,''));
    return Number.isFinite(n)?n:null;
  }

  function enforceBadge(){
    const fromDom=pendingFromDom();
    if(fromDom!==null) lastPending=fromDom;
    const el=badge();
    if(el && lastPending!==null && el.textContent!==String(lastPending)) el.textContent=String(lastPending);
  }

  async function refreshBadgeFromApi(){
    const period=$('valPeriodV205')?.value||'';
    if(!period||!token()) return;
    try{
      const res=await callApi('vtrGarManagementList',{period,sync:'0'});
      if(res?.ok){
        const seen=new Set(); let pending=0;
        (res.rows||[]).forEach(r=>{
          const ticket=canonical(r?.ticket,r?.type); if(!ticket) return;
          const key=`${r?.period||period}|${ticket}`; if(seen.has(key)) return; seen.add(key);
          if(norm(r?.responsibilityState||'PENDIENTE')==='PENDIENTE') pending++;
        });
        lastPending=pending; enforceBadge();
      }
    }catch(_){}
  }

  function crewOptions(crews,selected){
    const current=String(selected||'');
    return ['<option value="">Seleccione cuadrilla responsable</option>'].concat((crews||[]).map(c=>`<option value="${esc(c.id)}" ${String(c.id)===current?'selected':''}>${esc(c.display||c.id)}${c.historical?' · Histórico':''}</option>`)).join('');
  }

  function antecedentHtml(row){
    const a=row?.antecedent;
    if(!a) return '';
    if(a.safe) return `<div class="mvl-v220-note"><b>Antecedente WIN sugerido:</b> ${esc(a.responsibleCrew||'Cuadrilla identificada')} · Orden ${esc(a.orderId||'—')} · ${esc(a.days==null?'—':a.days)} día(s) antes. Es apoyo; Jefatura toma la decisión final.</div>`;
    return `<div class="mvl-v220-note"><b>Antecedente:</b> revisión manual · ${esc(a.reason||'Sin coincidencia suficientemente segura.')}</div>`;
  }

  function showModal(res,row){
    css();
    document.querySelector('.mvl-v220-overlay')?.remove();
    const overlay=document.createElement('div');
    overlay.className='mvl-v220-overlay';
    const pending=norm(row.responsibilityState||'PENDIENTE')==='PENDIENTE';
    const canDecide=!!res.canDecide;
    overlay.innerHTML=`<div class="mvl-v220-modal" role="dialog" aria-modal="true">
      <div class="mvl-v220-head"><div><h3>${esc(row.ticket)} · ${esc(row.type)}</h3><p>${esc(row.date||'Sin fecha')} · Estado WIN: ${esc(row.winState||'—')}</p></div><button class="mvl-v220-close" type="button">Cerrar</button></div>
      <div class="mvl-v220-grid">
        <div class="mvl-v220-field"><b>CUADRILLA EJECUTORA</b>${esc(row.executingCrew||'Sin identificar')}</div>
        <div class="mvl-v220-field"><b>ORDEN(ES)</b>${esc((row.orders||[]).join(' · ')||'—')}</div>
        <div class="mvl-v220-field"><b>DNI / CLIENTE</b>${esc(row.dni||'—')} ${row.clientCode?`· ${esc(row.clientCode)}`:''}</div>
        <div class="mvl-v220-field"><b>RESPONSABILIDAD ACTUAL</b>${esc(row.responsibilityState||'PENDIENTE')}${row.responsibleCrew?` · ${esc(row.responsibleCrew)}`:''}</div>
        <div class="mvl-v220-field"><b>REGISTRO TÉCNICO</b>${esc(row.registration||'NO_REGISTRADA')} · ${esc(row.registrationState||'SIN_REGISTRO')}</div>
        <div class="mvl-v220-field"><b>BONO TÉCNICO</b>${esc(row.bonus||'SIN_REGISTRO')}</div>
      </div>
      ${antecedentHtml(row)}
      ${row.observation?`<div class="mvl-v220-note"><b>Observación anterior:</b> ${esc(row.observation)}</div>`:''}
      <div class="mvl-v220-form">
        <label>Reasignar responsabilidad<select id="mvlV220Crew">${crewOptions(res.crews,row.responsibleCrewId||row.antecedent?.responsibleCrewId)}</select></label>
        <label>Observación<textarea id="mvlV220Obs" placeholder="Comentario opcional. Obligatorio para No es GAR/VTR o Anular."></textarea></label>
      </div>
      <div class="mvl-v220-status" id="mvlV220Status">${!canDecide?'Tu perfil puede visualizar el caso, pero no definir responsabilidad.':''}</div>
      ${canDecide?`<div class="mvl-v220-actions ${pending?'':'mvl-v220-disabled'}">
        <button type="button" class="mvl-v220-confirm" data-v220-decision="CORRESPONDE">Confirmar ejecutora</button>
        <button type="button" class="mvl-v220-reassign" data-v220-decision="REASIGNAR">Reasignar</button>
        <button type="button" class="mvl-v220-no" data-v220-decision="NO_ES_GAR_VTR">No es GAR/VTR</button>
        <button type="button" class="mvl-v220-annul" data-v220-decision="ANULAR">Anular</button>
      </div>`:''}
    </div>`;
    document.body.appendChild(overlay);
    const close=()=>overlay.remove();
    overlay.querySelector('.mvl-v220-close')?.addEventListener('click',close);
    overlay.addEventListener('click',e=>{if(e.target===overlay) close();});
    overlay.querySelectorAll('[data-v220-decision]').forEach(btn=>btn.addEventListener('click',()=>decide(res,row,btn.dataset.v220Decision,overlay)));
  }

  async function decide(res,row,decision,overlay){
    if(busy) return;
    const status=overlay.querySelector('#mvlV220Status');
    const observation=overlay.querySelector('#mvlV220Obs')?.value.trim()||'';
    const responsibleCrewId=overlay.querySelector('#mvlV220Crew')?.value||'';
    if(decision==='REASIGNAR'&&!responsibleCrewId){status.textContent='Seleccione la cuadrilla responsable.';return;}
    if((decision==='NO_ES_GAR_VTR'||decision==='ANULAR')&&!observation){status.textContent='Debe ingresar una observación para esta decisión.';return;}
    const labels={CORRESPONDE:'confirmar a la cuadrilla ejecutora',REASIGNAR:'reasignar la responsabilidad',NO_ES_GAR_VTR:'marcar que no es GAR/VTR',ANULAR:'anular el caso'};
    if(!window.confirm(`¿Confirmar ${labels[decision]} para ${row.ticket}?`)) return;
    busy=true; status.textContent='Guardando decisión…';
    overlay.querySelector('.mvl-v220-actions')?.classList.add('mvl-v220-disabled');
    try{
      const out=await callApi('vtrGarDecision',{key:row.key,ticket:row.ticket,type:row.type,period:row.period,decision,responsibleCrewId,observation});
      if(!out?.ok) throw new Error(out?.error||out?.detail||'No se pudo guardar la decisión.');
      status.style.color='#247947'; status.textContent='Decisión guardada correctamente.';
      await refreshBadgeFromApi();
      window.setTimeout(()=>{overlay.remove(); $('mvlV218Refresh')?.click();},450);
    }catch(err){
      status.style.color='#b42318'; status.textContent=err?.message||String(err);
      overlay.querySelector('.mvl-v220-actions')?.classList.remove('mvl-v220-disabled');
    }finally{busy=false;}
  }

  async function openDirect(ticket){
    const period=$('valPeriodV205')?.value||'';
    if(!period) return;
    try{
      const res=await callApi('vtrGarManagementList',{period,sync:'0'});
      if(!res?.ok) throw new Error(res?.error||res?.detail||'No se pudo consultar el caso.');
      const canon=canonical(ticket,'');
      const row=(res.rows||[]).find(r=>canonical(r?.ticket,r?.type)===canon);
      if(!row) throw new Error('No se encontró el caso VTR/GAR seleccionado.');
      showModal(res,row);
    }catch(err){window.alert(err?.message||String(err));}
  }

  // Captura antes de los handlers V2.18/V2.17 para no depender del modal antiguo.
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('[data-v218-ticket],[data-v217-open]');
    if(!btn) return;
    e.preventDefault(); e.stopImmediatePropagation();
    openDirect(btn.dataset.v218Ticket||btn.dataset.v217Open||'');
  },true);

  // Cuando se entra a VTR/GAR, actualiza el contador real WIN.
  document.addEventListener('click',e=>{
    const tab=e.target.closest?.('[data-v216-tab="VTRGAR"]');
    if(tab) window.setTimeout(refreshBadgeFromApi,350);
  },true);

  document.addEventListener('change',e=>{
    if(e.target?.id==='valPeriodV205') window.setTimeout(refreshBadgeFromApi,350);
  },true);

  const obs=new MutationObserver(()=>enforceBadge());
  function start(){
    const root=document.body||document.documentElement;
    if(!root){window.setTimeout(start,50);return;}
    obs.observe(root,{childList:true,subtree:true,characterData:true});
    window.setInterval(enforceBadge,700);
    window.setTimeout(refreshBadgeFromApi,1200);
    console.info('[MI VISUAL LIMA] V2.20.0: contador y gestión directa VTR/GAR activos.');
  }
  start();
})();