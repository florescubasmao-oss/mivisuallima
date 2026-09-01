/* =========================================================
   MI VISUAL LIMA - V2.14.1 FRONTEND
   Gestión VTR/GAR basada en MAPA_ORDENES.

   Seguridad:
   - Se instala solo si el backend responde vtrGarManagementList.
   - No reemplaza la pantalla existente de Validación Técnica.
   - No modifica Producción, Efectividad, Recableado ni SLA.
========================================================= */
(() => {
  'use strict';
  if (window.__MVL_VTR_GAR_V2141_FRONT__) return;
  window.__MVL_VTR_GAR_V2141_FRONT__ = true;

  const VERSION = 'V2.14.1_FRONT_VTR_GAR_WIN';
  const TOKEN_KEY = 'mvl_session_token';
  let supported = null;
  let installing = false;
  let lastData = null;

  const esc = (v) => String(v == null ? '' : v)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const norm = (v) => String(v == null ? '' : v)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  const token = () => localStorage.getItem(TOKEN_KEY) || '';
  const periodNow = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  };

  async function apiCall(action, payload = {}) {
    const fn = typeof window.api === 'function' ? window.api : (typeof api === 'function' ? api : null);
    if (!fn) throw new Error('API no disponible.');
    return await fn(action, { token:token(), ...payload });
  }

  function css() {
    if (document.getElementById('mvlVtrGar2141Css')) return;
    const st = document.createElement('style');
    st.id = 'mvlVtrGar2141Css';
    st.textContent = `
      .mvl-vg-btn{border:0;border-radius:10px;padding:9px 12px;background:#0f766e;color:#fff;font-weight:800;cursor:pointer}
      .mvl-vg-overlay{position:fixed;inset:0;background:rgba(15,23,42,.58);z-index:30000;display:flex;align-items:center;justify-content:center;padding:12px}
      .mvl-vg-modal{width:min(1050px,100%);max-height:94vh;overflow:auto;background:#f4f8fc;border-radius:16px;padding:14px;box-shadow:0 24px 60px rgba(15,23,42,.28);color:#0f172a}
      .mvl-vg-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:10px}
      .mvl-vg-head h3{margin:0;font-size:20px}.mvl-vg-head p{margin:3px 0 0;color:#64748b;font-size:11px}
      .mvl-vg-close{border:0;background:#475569;color:#fff;border-radius:9px;padding:8px 10px;cursor:pointer;font-weight:800}
      .mvl-vg-tools{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0}.mvl-vg-tools input,.mvl-vg-tools select{border:1px solid #cbd5e1;border-radius:9px;padding:8px;background:#fff}
      .mvl-vg-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin:8px 0}
      .mvl-vg-kpi{background:#e7eef7;border-radius:10px;padding:8px;text-align:center}.mvl-vg-kpi b{display:block;font-size:18px}.mvl-vg-kpi span{font-size:8px;font-weight:800;color:#64748b}
      .mvl-vg-list{display:grid;gap:7px}.mvl-vg-card{background:#fff;border:1px solid #cbd5e1;border-left:4px solid #6b8fb3;border-radius:11px;padding:9px}
      .mvl-vg-row{display:grid;grid-template-columns:1.1fr 1.3fr 1.3fr auto;gap:8px;align-items:center}.mvl-vg-ticket{font-weight:900;font-size:14px}.mvl-vg-sub{font-size:9px;color:#64748b;margin-top:2px}
      .mvl-vg-chip{display:inline-flex;border-radius:999px;padding:4px 7px;font-size:8px;font-weight:900;background:#e2e8f0}.mvl-vg-chip.ok{background:#dcfce7;color:#166534}.mvl-vg-chip.warn{background:#fef3c7;color:#92400e}.mvl-vg-chip.info{background:#dbeafe;color:#1d4ed8}.mvl-vg-chip.bad{background:#fee2e2;color:#991b1b}
      .mvl-vg-detail{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:8px}.mvl-vg-box{background:#edf3f8;border-radius:9px;padding:7px;font-size:9px;line-height:1.4}.mvl-vg-box b{display:block;font-size:8px;color:#64748b;text-transform:uppercase;margin-bottom:2px}
      .mvl-vg-ant{margin-top:7px;background:#eefcf4;border:1px solid #bbf7d0;border-radius:9px;padding:8px;font-size:9px;line-height:1.45}.mvl-vg-ant.manual{background:#fff7ed;border-color:#fed7aa}
      .mvl-vg-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;margin-top:8px}.mvl-vg-actions button{border:0;border-radius:8px;padding:7px 9px;color:#fff;font-size:9px;font-weight:850;cursor:pointer;background:#2563eb}.mvl-vg-actions .alt{background:#0f766e}.mvl-vg-actions .neutral{background:#475569}.mvl-vg-actions .bad{background:#b91c1c}
      .mvl-vg-empty{padding:18px;text-align:center;color:#64748b;background:#e9eff5;border-radius:10px}
      @media(max-width:700px){.mvl-vg-summary{grid-template-columns:repeat(2,1fr)}.mvl-vg-row,.mvl-vg-detail{grid-template-columns:1fr}.mvl-vg-actions button{flex:1}}
    `;
    document.head.appendChild(st);
  }

  function stateChip(state) {
    const s = norm(state || 'PENDIENTE');
    const cls = s === 'CONFIRMADO' ? 'ok' : s === 'REASIGNADO' ? 'info' : s === 'PENDIENTE' ? 'warn' : 'bad';
    return `<span class="mvl-vg-chip ${cls}">${esc(s.replaceAll('_',' '))}</span>`;
  }

  async function checkSupport() {
    if (supported !== null) return supported;
    try {
      const period = document.getElementById('valPeriodV205')?.value || periodNow();
      const res = await apiCall('vtrGarManagementList', { period, sync:'0' });
      supported = !!res?.ok;
      if (supported) lastData = res;
    } catch (_) {
      supported = false;
    }
    return supported;
  }

  function installButton() {
    const view = document.getElementById('validationViewV205');
    if (!view || view.classList.contains('hidden')) return;
    const actions = view.querySelector('.mvl205-actions');
    if (!actions || actions.querySelector('#mvlVtrGar2141Btn')) return;
    if (installing) return;
    installing = true;
    checkSupport().then(ok => {
      if (!ok || !document.body.contains(actions)) return;
      css();
      const b = document.createElement('button');
      b.id = 'mvlVtrGar2141Btn';
      b.className = 'mvl-vg-btn';
      b.textContent = 'Gestionar VTR / GAR';
      b.onclick = () => openManagement();
      actions.appendChild(b);
    }).finally(() => { installing = false; });
  }

  function summaryHtml(data) {
    const s = data?.summary || {};
    return `<div class="mvl-vg-summary">
      <div class="mvl-vg-kpi"><b>${Number(s.total||0)}</b><span>CASOS</span></div>
      <div class="mvl-vg-kpi"><b>${Number(s.finalized||0)}</b><span>FINALIZADOS WIN</span></div>
      <div class="mvl-vg-kpi"><b>${Number(s.pending||0)}</b><span>PEND. RESPONSABILIDAD</span></div>
      <div class="mvl-vg-kpi"><b>${Number(s.counting||0)}</b><span>CUENTAN INDICADOR</span></div>
      <div class="mvl-vg-kpi"><b>${Number(s.registered||0)}</b><span>CON REGISTRO TÉCNICO</span></div>
    </div>`;
  }

  function antecedentHtml(a) {
    if (!a) return `<div class="mvl-vg-ant manual"><b>Antecedente WIN:</b> sin evaluación disponible.</div>`;
    if (!a.safe) return `<div class="mvl-vg-ant manual"><b>⚠ Antecedente WIN · revisión manual</b><br>${esc(a.reason||'Sin antecedente seguro.')}<br><small>${esc(a.criterion||'')}</small></div>`;
    return `<div class="mvl-vg-ant"><b>✓ Antecedente WIN candidato</b><br>
      ${esc(a.date||'-')} · Orden ${esc(a.orderId||'-')} · ${esc(a.workType||a.workClass||'-')}<br>
      <b>Cuadrilla origen sugerida:</b> ${esc(a.responsibleCrew||'-')} · ${Number(a.days||0)} día(s)<br>
      <small>${esc(a.reason||'')} · La decisión final corresponde a Jefatura.</small></div>`;
  }

  function cardHtml(r, canDecide) {
    const ant = r.antecedent || null;
    const canReassign = !!(ant?.safe && ant.responsibleCrewId);
    return `<article class="mvl-vg-card" data-key="${esc(r.key)}" data-ticket="${esc(r.ticket)}">
      <div class="mvl-vg-row">
        <div><div class="mvl-vg-ticket">${esc(r.ticket||'SIN TICKET')}</div><div class="mvl-vg-sub">${esc(r.date||'-')} · ${esc(r.type||'-')} · DNI ${esc(r.dni||'-')}</div></div>
        <div><b>${esc(r.executingCrew||'-')}</b><div class="mvl-vg-sub">Cuadrilla ejecutora WIN</div></div>
        <div><b>${esc(r.responsibleCrew||'POR VALIDAR')}</b><div class="mvl-vg-sub">Cuadrilla responsable</div></div>
        <div>${stateChip(r.responsibilityState)}</div>
      </div>
      <div class="mvl-vg-detail">
        <div class="mvl-vg-box"><b>Estado WIN</b>${esc(r.winState||'-')}</div>
        <div class="mvl-vg-box"><b>Registro técnico</b>${esc(r.registration||'-')} · ${esc(r.bonus||'-')}</div>
        <div class="mvl-vg-box"><b>Órdenes asociadas</b>${esc((r.orders||[]).join(' · ')||'-')}</div>
      </div>
      ${antecedentHtml(ant)}
      ${r.observation ? `<div class="mvl-vg-box" style="margin-top:7px"><b>Observación Jefatura</b>${esc(r.observation)}</div>` : ''}
      ${canDecide ? `<div class="mvl-vg-actions">
        <button class="alt" data-act="CORRESPONDE">Confirmar ejecutora</button>
        ${canReassign ? `<button data-act="REASIGNAR" data-crew="${esc(ant.responsibleCrewId)}">Reasignar a antecedente</button>` : ''}
        <button class="neutral" data-act="NO_ES_GAR_VTR">No es GAR/VTR</button>
        <button class="bad" data-act="ANULAR">Anular</button>
      </div>` : ''}
    </article>`;
  }

  function renderList(modal, data) {
    const q = norm(modal.querySelector('#mvlVgSearch')?.value || '');
    const state = norm(modal.querySelector('#mvlVgState')?.value || '');
    const rows = (data?.rows || []).filter(r => {
      if (state && norm(r.responsibilityState) !== state) return false;
      if (!q) return true;
      return norm([r.ticket,r.dni,r.clientCode,r.executingCrew,r.responsibleCrew,(r.orders||[]).join(' ')].join(' ')).includes(q);
    });
    const list = modal.querySelector('#mvlVgList');
    list.innerHTML = rows.length ? rows.map(r => cardHtml(r, !!data.canDecide)).join('') : '<div class="mvl-vg-empty">No hay casos para los filtros seleccionados.</div>';
  }

  async function loadManagement(modal, forceSync = true) {
    const period = modal.querySelector('#mvlVgPeriod')?.value || periodNow();
    const list = modal.querySelector('#mvlVgList');
    list.innerHTML = '<div class="mvl-vg-empty">Cargando VTR/GAR desde WIN…</div>';
    const data = await apiCall('vtrGarManagementList', { period, sync:forceSync ? '1' : '0' });
    if (!data?.ok) throw new Error(data?.error || 'No se pudo cargar VTR/GAR.');
    lastData = data;
    modal.querySelector('#mvlVgSummary').innerHTML = summaryHtml(data);
    renderList(modal, data);
  }

  async function decide(modal, card, decision, crewId = '') {
    const key = card.dataset.key || '';
    const ticketValue = card.dataset.ticket || '';
    let observation = '';
    if (decision === 'NO_ES_GAR_VTR' || decision === 'ANULAR') {
      observation = window.prompt(decision === 'NO_ES_GAR_VTR' ? 'Indica el sustento de por qué NO ES GAR/VTR:' : 'Indica el motivo de anulación:') || '';
      if (!observation.trim()) return;
    } else {
      observation = window.prompt('Comentario / sustento de Jefatura (opcional):') || '';
    }
    const res = await apiCall('vtrGarDecision', {
      key, ticket:ticketValue, decision, responsibleCrewId:crewId, observation
    });
    if (!res?.ok) throw new Error(res?.error || 'No se pudo guardar la decisión.');
    await loadManagement(modal, false);
  }

  async function openManagement() {
    css();
    const overlay = document.createElement('div');
    overlay.className = 'mvl-vg-overlay';
    overlay.innerHTML = `<div class="mvl-vg-modal">
      <div class="mvl-vg-head"><div><h3>VTR / GAR · Gestión WIN</h3><p>Fuente: MAPA_ORDENES · El antecedente es apoyo; Jefatura toma la decisión final.</p></div><button class="mvl-vg-close">Cerrar</button></div>
      <div class="mvl-vg-tools">
        <input id="mvlVgPeriod" type="month" value="${esc(document.getElementById('valPeriodV205')?.value || periodNow())}">
        <select id="mvlVgState"><option value="">Todos</option><option value="PENDIENTE">Pendientes</option><option value="CONFIRMADO">Confirmados</option><option value="REASIGNADO">Reasignados</option><option value="NO_ES_GAR_VTR">No es GAR/VTR</option><option value="ANULADO">Anulados</option></select>
        <input id="mvlVgSearch" placeholder="Buscar ticket, DNI, orden o cuadrilla">
        <button class="mvl-vg-btn" id="mvlVgRefresh">Actualizar WIN</button>
      </div>
      <div id="mvlVgSummary"></div><div class="mvl-vg-list" id="mvlVgList"></div>
    </div>`;
    document.body.appendChild(overlay);
    const modal = overlay.querySelector('.mvl-vg-modal');
    overlay.querySelector('.mvl-vg-close').onclick = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    modal.querySelector('#mvlVgPeriod').onchange = () => loadManagement(modal, true).catch(showError);
    modal.querySelector('#mvlVgState').onchange = () => renderList(modal, lastData);
    modal.querySelector('#mvlVgSearch').oninput = () => renderList(modal, lastData);
    modal.querySelector('#mvlVgRefresh').onclick = () => loadManagement(modal, true).catch(showError);
    modal.querySelector('#mvlVgList').addEventListener('click', e => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const card = btn.closest('.mvl-vg-card');
      btn.disabled = true;
      decide(modal, card, btn.dataset.act, btn.dataset.crew || '').catch(showError).finally(() => { btn.disabled = false; });
    });
    try { await loadManagement(modal, true); }
    catch (err) { showError(err); overlay.remove(); }
  }

  function showError(err) {
    console.error('[MI VISUAL LIMA VTR/GAR]', err);
    alert(err?.message || String(err || 'Error VTR/GAR'));
  }

  const observer = new MutationObserver(() => installButton());
  observer.observe(document.documentElement, { subtree:true, childList:true, attributes:true, attributeFilter:['class'] });
  document.addEventListener('mvl:core-ready', () => setTimeout(installButton, 100));
  setInterval(installButton, 1200);
  setTimeout(installButton, 300);

  console.info('[MI VISUAL LIMA] ' + VERSION + ' preparado.');
})();
