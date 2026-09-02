/* =========================================================
   MI VISUAL LIMA - V2.18.0
   VALIDACION TECNICA · VTR/GAR ESTABLE DIRECTO DESDE WIN

   - La pestaña VTR/GAR toma prioridad antes de la vista V2.16.
   - Evita que technicalValidationList repinte encima de VTR/GAR.
   - Fuente: vtrGarManagementList => MAPA_ORDENES/VTR_GAR_GESTION.
   - Un ticket se muestra una sola vez.
   - Si no hay gestion derivada, ejecuta una sincronizacion controlada.
   - La gestion final de Jefatura reutiliza el modal V2.14 existente.
========================================================= */
(() => {
  'use strict';
  if (window.__MVL_VTRGAR_STABLE_V218__) return;
  window.__MVL_VTRGAR_STABLE_V218__ = true;

  const TOKEN_KEY = 'mvl_session_token';
  const ST = { active:false, loading:false, data:null, observer:null, installed:false };
  const $ = id => document.getElementById(id);
  const token = () => localStorage.getItem(TOKEN_KEY) || '';
  const norm = v => String(v == null ? '' : v)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ').trim().toUpperCase();
  const esc = v => String(v == null ? '' : v)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  async function apiCall(action,payload={}) {
    const fn = typeof window.api === 'function' ? window.api : (typeof api === 'function' ? api : null);
    if (!fn) throw new Error('API no disponible.');
    return await fn(action,{token:token(),...payload});
  }

  function css() {
    if ($('mvlV218Css')) return;
    const st=document.createElement('style');
    st.id='mvlV218Css';
    st.textContent=`
      #validationViewV205.mvl-v218-active #mvlV216WinBox,
      #validationViewV205.mvl-v218-active #mvlV216FilterBtn{display:none!important}
      #validationViewV205 .mvl-v218-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin:8px 0 10px}
      #validationViewV205 .mvl-v218-kpi{border:1px solid #d5e3ef;border-radius:11px;background:#f8fbfe;padding:9px;text-align:center}
      #validationViewV205 .mvl-v218-kpi b{display:block;color:#123d67;font-size:.95rem}
      #validationViewV205 .mvl-v218-kpi span{display:block;margin-top:2px;color:#73869a;font-size:.62rem;font-weight:800}
      #validationViewV205 .mvl-v218-bar{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:5px 0 9px}
      #validationViewV205 .mvl-v218-note{color:#60758a;font-size:.70rem;line-height:1.35}
      #validationViewV205 .mvl-v218-refresh{border:0;border-radius:10px;background:#0f766e;color:#fff;padding:8px 11px;font:inherit;font-size:.72rem;font-weight:850;cursor:pointer;white-space:nowrap}
      #validationViewV205 .mvl-v218-list{display:grid;gap:9px}
      #validationViewV205 .mvl-v218-card{border:1px solid #d5e1ec;border-left:4px solid #e58b26;border-radius:13px;background:#fff;padding:12px;box-shadow:0 4px 13px rgba(20,65,105,.04)}
      #validationViewV205 .mvl-v218-card.counts{border-left-color:#2f9d62}
      #validationViewV205 .mvl-v218-card.excluded{border-left-color:#8b9aaa}
      #validationViewV205 .mvl-v218-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      #validationViewV205 .mvl-v218-ticket{font-size:.90rem;font-weight:900;color:#143e66}
      #validationViewV205 .mvl-v218-sub{margin-top:3px;color:#718397;font-size:.68rem}
      #validationViewV205 .mvl-v218-chip{display:inline-flex;align-items:center;border-radius:999px;background:#edf3f8;color:#49657f;padding:4px 7px;font-size:.62rem;font-weight:900;white-space:nowrap}
      #validationViewV205 .mvl-v218-chip.ok{background:#e7f7ed;color:#247947}
      #validationViewV205 .mvl-v218-chip.warn{background:#fff1dc;color:#a45c08}
      #validationViewV205 .mvl-v218-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 12px;margin-top:9px}
      #validationViewV205 .mvl-v218-field{font-size:.70rem;color:#5d7185;line-height:1.35}
      #validationViewV205 .mvl-v218-field b{color:#294d70}
      #validationViewV205 .mvl-v218-actions{display:flex;justify-content:flex-end;margin-top:9px}
      #validationViewV205 .mvl-v218-open{border:1px solid #a9c9e7;border-radius:9px;background:#f2f8fd;color:#145a96;padding:7px 10px;font:inherit;font-size:.68rem;font-weight:850;cursor:pointer}
      #validationViewV205 .mvl-v218-empty{border:1px dashed #c5d7e8;border-radius:13px;background:#f8fbfe;padding:20px 13px;text-align:center;color:#64798d;font-size:.76rem;line-height:1.5}
      @media(max-width:720px){
        #validationViewV205 .mvl-v218-summary{grid-template-columns:repeat(2,minmax(0,1fr))}
        #validationViewV205 .mvl-v218-grid{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(st);
  }

  function ticketCanon(value,type) {
    const raw=norm(value).replace(/\s+/g,'');
    const m=raw.match(/(VTR|GAR)-?(\d+)/);
    if (m) return `${m[1]}-${m[2]}`;
    const digits=raw.replace(/\D/g,'');
    const t=norm(type);
    if (!digits) return '';
    if (t.includes('GAR')) return `GAR-${digits}`;
    if (t.includes('VTR') || t.includes('REITER')) return `VTR-${digits}`;
    return '';
  }

  function rowsUnique(rows,period) {
    const map=new Map();
    (rows||[]).forEach(r=>{
      const ticket=ticketCanon(r?.ticket,r?.type);
      if (!ticket) return;
      const key=`${r?.period||period||''}|${ticket}`;
      const prev=map.get(key);
      if (!prev) { map.set(key,r); return; }
      const rank=x=>{
        const s=norm(x?.responsibilityState||'PENDIENTE');
        if (s==='CONFIRMADO' || s==='REASIGNADO') return 4;
        if (s==='NO_ES_GAR_VTR' || s==='ANULADO') return 3;
        return 1;
      };
      if (rank(r)>rank(prev)) map.set(key,r);
    });
    return [...map.values()].sort((a,b)=>{
      const ap=norm(a?.responsibilityState||'PENDIENTE')==='PENDIENTE'?0:1;
      const bp=norm(b?.responsibilityState||'PENDIENTE')==='PENDIENTE'?0:1;
      if (ap!==bp) return ap-bp;
      return String(b?.date||'').localeCompare(String(a?.date||''));
    });
  }

  function metrics(rows) {
    const s={total:0,vtr:0,gar:0,finalized:0,pending:0,counting:0};
    rows.forEach(r=>{
      s.total++;
      if (norm(r?.type)==='VTR') s.vtr++;
      if (norm(r?.type)==='GAR') s.gar++;
      if (norm(r?.winState)==='FINALIZADA') s.finalized++;
      if (norm(r?.responsibilityState||'PENDIENTE')==='PENDIENTE') s.pending++;
      if (r?.counts) s.counting++;
    });
    return s;
  }

  function setBadge(n) {
    const el=$('mvlV216CountVTRGAR');
    if (el) el.textContent=String(Number(n)||0);
  }

  function markTab() {
    const view=$('validationViewV205');
    view?.querySelectorAll('[data-v216-tab]').forEach(btn=>{
      btn.classList.toggle('active',btn.dataset.v216Tab==='VTRGAR');
    });
  }

  function statusLabel(r) {
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
    return '';
  }

  function renderCards() {
    const box=$('mvlV218List');
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
      box.innerHTML=`<div class="mvl-v218-empty">${q?'No hay casos que coincidan con la búsqueda.':'No hay VTR/GAR para este periodo.'}</div>`;
      return;
    }
    box.innerHTML=rows.map(r=>{
      const pending=norm(r?.responsibilityState||'PENDIENTE')==='PENDIENTE';
      return `<article class="mvl-v218-card ${cardClass(r)}">
        <div class="mvl-v218-head">
          <div>
            <div class="mvl-v218-ticket">${esc(r.ticket||'VTR/GAR')} · ${esc(r.type||'')}</div>
            <div class="mvl-v218-sub">${esc(r.date||'Sin fecha')} · DNI ${esc(r.dni||'—')}</div>
          </div>
          <span class="mvl-v218-chip ${norm(r.winState)==='FINALIZADA'?'ok':''}">${esc(r.winState||'POR REVISAR')}</span>
        </div>
        <div class="mvl-v218-grid">
          <div class="mvl-v218-field"><b>Ejecutora:</b> ${esc(r.executingCrew||'Sin identificar')}</div>
          <div class="mvl-v218-field"><b>Orden(es):</b> ${esc((r.orders||[]).join(' · ')||'—')}</div>
          <div class="mvl-v218-field"><b>Responsabilidad:</b> <span class="mvl-v218-chip ${pending?'warn':'ok'}">${esc(statusLabel(r))}</span></div>
          <div class="mvl-v218-field"><b>Registro técnico:</b> ${esc(r.registration||'NO REGISTRADA')} ${r.bonus?`· ${esc(r.bonus)}`:''}</div>
        </div>
        <div class="mvl-v218-actions"><button type="button" class="mvl-v218-open" data-v218-ticket="${esc(r.ticket||'')}">${pending?'Gestionar':'Ver gestión'}</button></div>
      </article>`;
    }).join('');
    box.querySelectorAll('[data-v218-ticket]').forEach(btn=>{
      btn.addEventListener('click',()=>openManagement(btn.dataset.v218Ticket));
    });
  }

  function render(data) {
    const list=$('valListV205');
    if (!list || !ST.active) return;
    const period=$('valPeriodV205')?.value||'';
    const rows=rowsUnique(data?.rows||[],period);
    const s=metrics(rows);
    ST.data={...data,rows,summary:s};
    setBadge(s.pending);
    list.innerHTML=`
      <div class="mvl-v218-summary" data-mvl-v218="1">
        <div class="mvl-v218-kpi"><b>${s.total}</b><span>CASOS ÚNICOS</span></div>
        <div class="mvl-v218-kpi"><b>${s.vtr}</b><span>VTR</span></div>
        <div class="mvl-v218-kpi"><b>${s.gar}</b><span>GAR</span></div>
        <div class="mvl-v218-kpi"><b>${s.finalized}</b><span>FINALIZADOS WIN</span></div>
        <div class="mvl-v218-kpi"><b>${s.pending}</b><span>PENDIENTES JEFATURA</span></div>
      </div>
      <div class="mvl-v218-bar">
        <div class="mvl-v218-note">Fuente oficial: MAPA_ORDENES. Un ticket se muestra una sola vez aunque tenga varias órdenes.</div>
        <button type="button" id="mvlV218Refresh" class="mvl-v218-refresh">Actualizar WIN</button>
      </div>
      <div class="mvl-v218-list" id="mvlV218List"></div>`;
    $('mvlV218Refresh')?.addEventListener('click',()=>load(true));
    renderCards();
  }

  function renderError(message) {
    const list=$('valListV205');
    if (!list || !ST.active) return;
    list.innerHTML=`<div class="mvl-v218-empty" data-mvl-v218="1"><b>No se pudo cargar VTR/GAR desde WIN.</b><br>${esc(message||'Error no identificado.')}</div>`;
  }

  async function load(sync) {
    if (!ST.active || ST.loading) return;
    const period=$('valPeriodV205')?.value||'';
    const list=$('valListV205');
    if (!period || !list) return;
    ST.loading=true;
    list.innerHTML='<div class="mvl-v218-empty" data-mvl-v218="1">Cargando VTR/GAR desde WIN…</div>';
    try {
      let res=await apiCall('vtrGarManagementList',{period,sync:sync?'1':'0'});
      if (!res?.ok) throw new Error(res?.error||res?.detail||'Respuesta no válida del backend.');
      let rows=rowsUnique(res.rows||[],period);
      if (!sync && rows.length===0) {
        res=await apiCall('vtrGarManagementList',{period,sync:'1'});
        if (!res?.ok) throw new Error(res?.error||res?.detail||'No se pudo sincronizar VTR/GAR.');
      }
      render(res);
    } catch(err) {
      renderError(err?.message||String(err));
      console.warn('[MI VISUAL LIMA V2.18] VTR/GAR:',err);
    } finally {
      ST.loading=false;
    }
  }

  function openManagement(ticket) {
    const original=$('mvlVtrGar2141Btn');
    if (!original) {
      alert('La gestión completa VTR/GAR no está disponible en esta sesión.');
      return;
    }
    original.click();
    window.setTimeout(()=>{
      const overlay=document.querySelector('.mvl-vg-overlay');
      if (!overlay || !ticket) return;
      const search=[...overlay.querySelectorAll('input')].find(i=>norm(i.placeholder).includes('BUSCAR'));
      if (search) {
        search.value=ticket;
        search.dispatchEvent(new Event('input',{bubbles:true}));
      }
    },300);
  }

  function activate() {
    ST.active=true;
    const view=$('validationViewV205');
    view?.classList.add('mvl-v218-active');
    markTab();
    load(false);
  }

  function deactivate() {
    ST.active=false;
    ST.data=null;
    $('validationViewV205')?.classList.remove('mvl-v218-active');
  }

  function observeList() {
    const list=$('valListV205');
    if (!list || ST.observer) return;
    ST.observer=new MutationObserver(()=>{
      if (!ST.active || ST.loading || !ST.data) return;
      if (!list.querySelector('[data-mvl-v218="1"]')) {
        window.setTimeout(()=>{
          if (ST.active && ST.data && !list.querySelector('[data-mvl-v218="1"]')) render(ST.data);
        },0);
      }
    });
    ST.observer.observe(list,{childList:true,subtree:false});
  }

  async function badge() {
    const period=$('valPeriodV205')?.value||'';
    if (!period || !token()) return;
    try {
      const res=await apiCall('vtrGarManagementList',{period,sync:'0'});
      if (res?.ok) setBadge(metrics(rowsUnique(res.rows||[],period)).pending);
    } catch(_) {}
  }

  function install() {
    const view=$('validationViewV205');
    const tab=view?.querySelector('[data-v216-tab="VTRGAR"]');
    const period=$('valPeriodV205');
    const search=$('mvlV216Search');
    if (!view || !tab || !period || !search || ST.installed) return false;
    css();

    // Captura: VTR/GAR no permite que V2.16 dispare technicalValidationList.
    tab.addEventListener('click',ev=>{
      ev.preventDefault();
      ev.stopImmediatePropagation();
      activate();
    },true);

    // Los demás tabs vuelven a la lógica V2.16 normal.
    view.querySelectorAll('[data-v216-tab]').forEach(btn=>{
      if (btn.dataset.v216Tab==='VTRGAR') return;
      btn.addEventListener('click',()=>deactivate(),true);
    });

    period.addEventListener('change',ev=>{
      if (!ST.active) return;
      ev.stopImmediatePropagation();
      load(false);
    },true);

    search.addEventListener('input',ev=>{
      if (!ST.active) return;
      ev.stopImmediatePropagation();
      renderCards();
    },true);

    observeList();
    ST.installed=true;
    window.setTimeout(badge,700);
    console.info('[MI VISUAL LIMA] V2.18.0: VTR/GAR estable directo WIN activo.');
    return true;
  }

  function wait(n=0) {
    if (install()) return;
    if (n>400) return;
    window.setTimeout(()=>wait(n+1),100);
  }

  window.setTimeout(()=>wait(0),0);
})();
