/* =========================================================
   MI VISUAL LIMA - V2.17.0
   VALIDACION TECNICA · VTR/GAR DIRECTO DESDE WIN

   Complementa validation-friendly-v216.js.
   - La pestaña VTR/GAR ya no depende de VALIDACION_TECNICA.
   - Lee vtrGarManagementList => MAPA_ORDENES / VTR_GAR_GESTION.
   - Deduplica visualmente por PERIODO + TICKET como defensa.
   - Mantiene la gestion completa existente para la decision de Jefatura.
   - No modifica Produccion, Efectividad, Recableado ni SLA.
========================================================= */
(() => {
  'use strict';
  if (window.__MVL_VALIDATION_VTRGAR_DIRECT_V217__) return;
  window.__MVL_VALIDATION_VTRGAR_DIRECT_V217__ = true;

  const TOKEN_KEY = 'mvl_session_token';
  const VERSION = 'V2.17.0_VTRGAR_DIRECT_WIN';
  const ST = {
    active:false,
    loading:false,
    data:null,
    timer:0,
    installed:false
  };

  const $ = (id) => document.getElementById(id);
  const token = () => localStorage.getItem(TOKEN_KEY) || '';
  const norm = (v) => String(v == null ? '' : v)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ').trim().toUpperCase();
  const esc = (v) => String(v == null ? '' : v)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  async function apiCall(action, payload={}) {
    const fn = typeof window.api === 'function'
      ? window.api
      : (typeof api === 'function' ? api : null);
    if (!fn) throw new Error('API no disponible.');
    return await fn(action,{token:token(),...payload});
  }

  function installCss() {
    if ($('mvlV217VtrGarCss')) return;
    const st = document.createElement('style');
    st.id = 'mvlV217VtrGarCss';
    st.textContent = `
      #validationViewV205 .mvl-v217-vg-summary{
        display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin:8px 0 10px
      }
      #validationViewV205 .mvl-v217-vg-kpi{
        border:1px solid #d5e3ef;border-radius:11px;background:#f8fbfe;padding:9px;text-align:center
      }
      #validationViewV205 .mvl-v217-vg-kpi b{display:block;color:#123d67;font-size:.95rem}
      #validationViewV205 .mvl-v217-vg-kpi span{display:block;margin-top:2px;color:#73869a;font-size:.62rem;font-weight:800}
      #validationViewV205 .mvl-v217-vg-bar{
        display:flex;justify-content:space-between;gap:8px;align-items:center;margin:5px 0 9px
      }
      #validationViewV205 .mvl-v217-vg-note{color:#60758a;font-size:.70rem;line-height:1.35}
      #validationViewV205 .mvl-v217-vg-refresh{
        border:0;border-radius:10px;background:#0f766e;color:#fff;padding:8px 11px;font:inherit;
        font-size:.72rem;font-weight:850;cursor:pointer;white-space:nowrap
      }
      #validationViewV205 .mvl-v217-vg-list{display:grid;gap:9px}
      #validationViewV205 .mvl-v217-vg-card{
        border:1px solid #d5e1ec;border-left:4px solid #6f98bd;border-radius:13px;background:#fff;
        padding:12px;box-shadow:0 4px 13px rgba(20,65,105,.04)
      }
      #validationViewV205 .mvl-v217-vg-card.pending{border-left-color:#e58b26}
      #validationViewV205 .mvl-v217-vg-card.counts{border-left-color:#2f9d62}
      #validationViewV205 .mvl-v217-vg-card.excluded{border-left-color:#8b9aaa}
      #validationViewV205 .mvl-v217-vg-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      #validationViewV205 .mvl-v217-vg-ticket{font-size:.90rem;font-weight:900;color:#143e66}
      #validationViewV205 .mvl-v217-vg-sub{margin-top:3px;color:#718397;font-size:.68rem}
      #validationViewV205 .mvl-v217-vg-chip{
        display:inline-flex;align-items:center;border-radius:999px;background:#edf3f8;color:#49657f;
        padding:4px 7px;font-size:.62rem;font-weight:900;white-space:nowrap
      }
      #validationViewV205 .mvl-v217-vg-chip.ok{background:#e7f7ed;color:#247947}
      #validationViewV205 .mvl-v217-vg-chip.warn{background:#fff1dc;color:#a45c08}
      #validationViewV205 .mvl-v217-vg-grid{
        display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 12px;margin-top:9px
      }
      #validationViewV205 .mvl-v217-vg-field{font-size:.70rem;color:#5d7185;line-height:1.35}
      #validationViewV205 .mvl-v217-vg-field b{color:#294d70}
      #validationViewV205 .mvl-v217-vg-ant{
        margin-top:9px;padding:8px 9px;border-radius:10px;background:#f5f9fc;color:#587087;font-size:.68rem;line-height:1.38
      }
      #validationViewV205 .mvl-v217-vg-actions{display:flex;justify-content:flex-end;margin-top:9px}
      #validationViewV205 .mvl-v217-vg-open{
        border:1px solid #a9c9e7;border-radius:9px;background:#f2f8fd;color:#145a96;padding:7px 10px;
        font:inherit;font-size:.68rem;font-weight:850;cursor:pointer
      }
      #validationViewV205 .mvl-v217-empty{
        border:1px dashed #c5d7e8;border-radius:13px;background:#f8fbfe;padding:20px 13px;text-align:center;
        color:#64798d;font-size:.76rem
      }
      #validationViewV205.mvl-v217-vg-active #mvlV216WinBox{display:none!important}
      #validationViewV205.mvl-v217-vg-active #mvlV216FilterBtn{display:none!important}
      @media(max-width:720px){
        #validationViewV205 .mvl-v217-vg-summary{grid-template-columns:repeat(2,minmax(0,1fr))}
        #validationViewV205 .mvl-v217-vg-grid{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(st);
  }

  function canonicalTicket(value,type) {
    const raw = norm(value).replace(/\s+/g,'');
    const m = raw.match(/(VTR|GAR)-?(\d+)/);
    if (m) return `${m[1]}-${m[2]}`;
    const t = norm(type);
    const digits = raw.replace(/\D/g,'');
    if (!digits) return '';
    if (t.includes('GAR')) return `GAR-${digits}`;
    if (t.includes('VTR') || t.includes('REITER')) return `VTR-${digits}`;
    return '';
  }

  function uniqueRows(rows,period) {
    const map = new Map();
    (rows||[]).forEach(r => {
      const ticket = canonicalTicket(r?.ticket,r?.type);
      if (!ticket) return;
      const key = `${r?.period||period||''}|${ticket}`;
      const prev = map.get(key);
      if (!prev) { map.set(key,r); return; }
      const rank = x => {
        const s = norm(x?.responsibilityState||'PENDIENTE');
        if (s === 'CONFIRMADO' || s === 'REASIGNADO') return 4;
        if (s === 'NO_ES_GAR_VTR' || s === 'ANULADO') return 3;
        return 1;
      };
      if (rank(r) > rank(prev)) map.set(key,r);
    });
    return [...map.values()].sort((a,b) => {
      const pa = norm(a?.responsibilityState||'PENDIENTE') === 'PENDIENTE' ? 0 : 1;
      const pb = norm(b?.responsibilityState||'PENDIENTE') === 'PENDIENTE' ? 0 : 1;
      if (pa !== pb) return pa-pb;
      return String(b?.date||'').localeCompare(String(a?.date||''));
    });
  }

  function summary(rows) {
    const s={total:0,finalized:0,pending:0,counting:0,gar:0,vtr:0};
    rows.forEach(r => {
      s.total++;
      if (norm(r.winState)==='FINALIZADA') s.finalized++;
      if (norm(r.responsibilityState||'PENDIENTE')==='PENDIENTE') s.pending++;
      if (r.counts) s.counting++;
      if (norm(r.type)==='GAR') s.gar++;
      if (norm(r.type)==='VTR') s.vtr++;
    });
    return s;
  }

  function setBadge(value) {
    const el=$('mvlV216CountVTRGAR');
    if (el) el.textContent=String(Number(value)||0);
  }

  function responsibilityLabel(r) {
    const s=norm(r?.responsibilityState||'PENDIENTE');
    if (s==='CONFIRMADO') return `CONFIRMADO · ${r?.responsibleCrew||r?.executingCrew||''}`;
    if (s==='REASIGNADO') return `REASIGNADO · ${r?.responsibleCrew||''}`;
    if (s==='NO_ES_GAR_VTR') return 'NO ES GAR/VTR';
    if (s==='ANULADO') return 'ANULADO';
    return 'PENDIENTE JEFATURA';
  }

  function cardClass(r) {
    const s=norm(r?.responsibilityState||'PENDIENTE');
    if (r?.counts) return 'counts';
    if (s==='NO_ES_GAR_VTR' || s==='ANULADO') return 'excluded';
    return 'pending';
  }

  function antecedentText(r) {
    const a=r?.antecedent;
    if (!a) return 'Antecedente: se muestra en la gestión completa VTR/GAR.';
    if (a.safe) {
      return `Antecedente WIN: ${esc(a.responsibleCrew||'Cuadrilla identificada')} · Orden ${esc(a.orderId||'—')} · ${esc(a.days==null?'—':a.days)} día(s) antes. Solo sugerencia para Jefatura.`;
    }
    return `Antecedente: revisión manual · ${esc(a.reason||'Sin coincidencia suficientemente segura.')}`;
  }

  function render(data) {
    const list=$('valListV205');
    if (!list || !ST.active) return;
    const period=$('valPeriodV205')?.value||'';
    const rows=uniqueRows(data?.rows||[],period);
    const s=summary(rows);
    ST.data={...data,rows,summary:s};
    setBadge(s.pending);

    list.innerHTML=`
      <div class="mvl-v217-vg-summary">
        <div class="mvl-v217-vg-kpi"><b>${s.total}</b><span>CASOS UNICOS</span></div>
        <div class="mvl-v217-vg-kpi"><b>${s.vtr}</b><span>VTR</span></div>
        <div class="mvl-v217-vg-kpi"><b>${s.gar}</b><span>GAR</span></div>
        <div class="mvl-v217-vg-kpi"><b>${s.finalized}</b><span>FINALIZADOS WIN</span></div>
        <div class="mvl-v217-vg-kpi"><b>${s.pending}</b><span>PENDIENTES JEFATURA</span></div>
      </div>
      <div class="mvl-v217-vg-bar">
        <div class="mvl-v217-vg-note">Fuente: MAPA_ORDENES. Un ticket se visualiza una sola vez aunque tenga varias órdenes.</div>
        <button type="button" class="mvl-v217-vg-refresh" id="mvlV217RefreshWin">Actualizar WIN</button>
      </div>
      <div class="mvl-v217-vg-list" id="mvlV217VgList"></div>`;

    $('mvlV217RefreshWin')?.addEventListener('click',()=>loadDirect(true));
    renderCards();
  }

  function renderCards() {
    const box=$('mvlV217VgList');
    if (!box || !ST.active || !ST.data) return;
    const q=norm($('mvlV216Search')?.value||'');
    const rows=(ST.data.rows||[]).filter(r=>{
      if (!q) return true;
      return norm([
        r.ticket,r.type,r.dni,r.clientCode,(r.orders||[]).join(' '),
        r.executingCrew,r.responsibleCrew,r.winState,r.responsibilityState,r.observation
      ].join(' ')).includes(q);
    });

    if (!rows.length) {
      box.innerHTML=`<div class="mvl-v217-empty">${q?'No hay VTR/GAR que coincidan con la búsqueda.':'No hay VTR/GAR para este periodo.'}</div>`;
      return;
    }

    box.innerHTML=rows.map(r=>{
      const resp=responsibilityLabel(r);
      const pending=norm(r.responsibilityState||'PENDIENTE')==='PENDIENTE';
      return `<article class="mvl-v217-vg-card ${cardClass(r)}" data-v217-ticket="${esc(r.ticket)}">
        <div class="mvl-v217-vg-head">
          <div>
            <div class="mvl-v217-vg-ticket">${esc(r.ticket||'VTR/GAR')} · ${esc(r.type||'')}</div>
            <div class="mvl-v217-vg-sub">${esc(r.date||'Sin fecha')} · DNI ${esc(r.dni||'—')}</div>
          </div>
          <span class="mvl-v217-vg-chip ${norm(r.winState)==='FINALIZADA'?'ok':''}">${esc(r.winState||'POR REVISAR')}</span>
        </div>
        <div class="mvl-v217-vg-grid">
          <div class="mvl-v217-vg-field"><b>Ejecutora:</b> ${esc(r.executingCrew||'Sin identificar')}</div>
          <div class="mvl-v217-vg-field"><b>Orden(es):</b> ${esc((r.orders||[]).join(' · ')||'—')}</div>
          <div class="mvl-v217-vg-field"><b>Responsabilidad:</b> <span class="mvl-v217-vg-chip ${pending?'warn':'ok'}">${esc(resp)}</span></div>
          <div class="mvl-v217-vg-field"><b>Registro técnico:</b> ${esc(r.registration||'NO REGISTRADA')} ${r.bonus?`· ${esc(r.bonus)}`:''}</div>
        </div>
        <div class="mvl-v217-vg-ant">${antecedentText(r)}</div>
        ${r.observation?`<div class="mvl-v217-vg-ant"><b>Observación:</b> ${esc(r.observation)}</div>`:''}
        <div class="mvl-v217-vg-actions">
          <button type="button" class="mvl-v217-vg-open" data-v217-open="${esc(r.ticket)}">${pending?'Gestionar':'Ver gestión'}</button>
        </div>
      </article>`;
    }).join('');

    box.querySelectorAll('[data-v217-open]').forEach(btn=>{
      btn.addEventListener('click',()=>openFullManagement(btn.dataset.v217Open));
    });
  }

  function openFullManagement(ticket) {
    const original=$('mvlVtrGar2141Btn');
    if (!original) {
      alert('La gestión completa VTR/GAR no está disponible. Actualiza la página e inténtalo nuevamente.');
      return;
    }
    original.click();
    // Si el modal tiene buscador, intenta posicionar el ticket sin depender de su estructura interna.
    window.setTimeout(()=>{
      const overlay=document.querySelector('.mvl-vg-overlay');
      if (!overlay) return;
      const inputs=[...overlay.querySelectorAll('input')];
      const search=inputs.find(i=>norm(i.placeholder).includes('BUSCAR')) || inputs[inputs.length-1];
      if (search && ticket) {
        search.value=ticket;
        search.dispatchEvent(new Event('input',{bubbles:true}));
      }
    },250);
  }

  function sessionExpiredMessage(error) {
    const list=$('valListV205');
    if (!list) return;
    list.innerHTML=`<div class="mvl-v217-empty"><b>Tu sesión venció.</b><br>${esc(error||'Vuelve a ingresar para continuar.')}</div>`;
  }

  async function loadDirect(sync) {
    if (!ST.active || ST.loading) return;
    const period=$('valPeriodV205')?.value||'';
    const list=$('valListV205');
    if (!period || !list) return;

    ST.loading=true;
    list.innerHTML='<div class="mvl-v217-empty">Cargando VTR/GAR desde WIN…</div>';
    try {
      let res=await apiCall('vtrGarManagementList',{period,sync:sync?'1':'0'});
      if (!res?.ok) {
        if (res?.expired || norm(res?.error).includes('SESION')) {
          sessionExpiredMessage(res?.error);
          return;
        }
        throw new Error(res?.error||'No se pudo consultar VTR/GAR.');
      }

      let rows=uniqueRows(res.rows||[],period);
      // Si aún no existe gestión derivada pero sí hay base WIN, hacemos una sola sincronización.
      if (!sync && rows.length===0) {
        res=await apiCall('vtrGarManagementList',{period,sync:'1'});
        if (!res?.ok) throw new Error(res?.error||'No se pudo sincronizar VTR/GAR.');
      }
      render(res);
    } catch(err) {
      list.innerHTML=`<div class="mvl-v217-empty">No se pudo cargar VTR/GAR desde WIN.<br>${esc(err?.message||err)}</div>`;
      console.warn('[MI VISUAL LIMA V2.17] VTR/GAR directo:',err);
    } finally {
      ST.loading=false;
    }
  }

  function activateVtrGar() {
    ST.active=true;
    $('validationViewV205')?.classList.add('mvl-v217-vg-active');
    window.clearTimeout(ST.timer);
    ST.timer=window.setTimeout(()=>loadDirect(false),120);
  }

  function deactivateVtrGar() {
    ST.active=false;
    ST.data=null;
    $('validationViewV205')?.classList.remove('mvl-v217-vg-active');
  }

  async function refreshBadge() {
    const period=$('valPeriodV205')?.value||'';
    if (!period || !token()) return;
    try {
      const res=await apiCall('vtrGarManagementList',{period,sync:'0'});
      if (!res?.ok) return;
      const rows=uniqueRows(res.rows||[],period);
      setBadge(summary(rows).pending);
    } catch(_) {}
  }

  function install() {
    const view=$('validationViewV205');
    const shell=$('mvlV216ValidationShell');
    const tab= view?.querySelector('[data-v216-tab="VTRGAR"]');
    const period=$('valPeriodV205');
    if (!view || !shell || !tab || !period || ST.installed) return false;

    installCss();

    view.querySelectorAll('[data-v216-tab]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        if (btn.dataset.v216Tab==='VTRGAR') activateVtrGar();
        else deactivateVtrGar();
      });
    });

    period.addEventListener('change',()=>{
      if (ST.active) window.setTimeout(()=>loadDirect(false),150);
      else window.setTimeout(refreshBadge,350);
    });

    $('mvlV216Search')?.addEventListener('input',()=>{
      if (ST.active) renderCards();
    });

    ST.installed=true;
    window.setTimeout(refreshBadge,500);
    console.info(`[MI VISUAL LIMA] ${VERSION}: pestaña VTR/GAR conectada directamente a WIN.`);
    return true;
  }

  function wait(attempt=0) {
    if (install()) return;
    if (attempt>400) return;
    window.setTimeout(()=>wait(attempt+1),100);
  }

  window.setTimeout(()=>wait(0),0);
})();
