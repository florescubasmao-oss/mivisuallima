/* =========================================================
   MI VISUAL LIMA - V2.15.0
   DETALLE UNIFICADO DE INDICADORES DEL DASHBOARD

   Flujo:
   Dashboard -> detalle por cuadrilla -> detalle por día/orden.

   Indicadores:
   - Producción
   - Efectividad
   - % Recableado
   - Tiempo de gestión / SLA
   - Observaciones
   - VTR / GAR

   Seguridad:
   - Capa incremental. No reemplaza app-core-v2131.js.
   - Reutiliza performanceDashboard y performanceIndicatorDetail.
   - Si esta capa falla, el Dashboard original continúa operativo.
========================================================= */
(() => {
  'use strict';

  if (window.__MVL_DASHBOARD_DETAIL_V215__) return;
  window.__MVL_DASHBOARD_DETAIL_V215__ = true;

  const VERSION = 'V2.15.0_DASHBOARD_DETAIL';
  const TOKEN_KEY = 'mvl_session_token';
  const STATE = {
    apiWrapped: false,
    lastDashboard: null,
    overview: null,
    currentIndicator: '',
    currentRows: [],
    busy: false
  };

  const INDICATORS = {
    PRODUCCION: { label:'Producción', direction:'DESC' },
    EFECTIVIDAD: { label:'Efectividad', direction:'DESC' },
    RECABLEADO: { label:'% Recableado', direction:'ASC' },
    SLA: { label:'Tiempo de gestión / SLA', direction:'DESC' },
    OBSERVACIONES: { label:'Observaciones', direction:'ASC' },
    VTR_GAR: { label:'VTR / GAR', direction:'ASC' }
  };

  const esc = (value) => String(value == null ? '' : value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  const norm = (value) => String(value == null ? '' : value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim()
    .toUpperCase();

  const num = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const nullableNum = (value) => {
    if (value === '' || value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const pct = (value, digits = 1) => {
    const n = nullableNum(value);
    return n == null ? '—' : `${(n * 100).toFixed(digits)}%`;
  };

  const money = (value) => `S/ ${num(value).toFixed(2)}`;
  const token = () => localStorage.getItem(TOKEN_KEY) || '';

  function currentPeriod() {
    return document.getElementById('dashboardPeriod')?.value || '';
  }

  function currentFilters() {
    return {
      visualType: document.getElementById('dashboardVisualTypeV19')?.value || '',
      platform: document.getElementById('dashboardPlatformV19')?.value || '',
      composition: document.getElementById('dashboardCompositionV19')?.value || '',
      state: document.getElementById('dashboardStateV19')?.value || '',
      supervisor: document.getElementById('dashboardSupervisor')?.value || '',
      crew: document.getElementById('dashboardCrew')?.value || ''
    };
  }

  function filterLabel() {
    const parts = [];
    const ids = [
      ['dashboardVisualTypeV19','Visual'],
      ['dashboardPlatformV19','WIN'],
      ['dashboardSupervisor','Supervisor'],
      ['dashboardCompositionV19','Composición'],
      ['dashboardStateV19','Estado'],
      ['dashboardCrew','Cuadrilla']
    ];
    ids.forEach(([id,label]) => {
      const el = document.getElementById(id);
      if (!el?.value) return;
      const text = el.selectedOptions?.[0]?.textContent?.trim() || el.value;
      if (text) parts.push(`${label}: ${text}`);
    });
    return parts.length ? parts.join(' · ') : 'Todo el alcance autorizado';
  }

  function normalizedVisual(value) {
    const n = norm(value);
    if (n === 'PLAME' || n === 'PLANILLA') return 'PLANILLA';
    if (n === 'PRODUCCION' || n.includes('COMISIONISTA')) return 'PRODUCCION';
    if (n.includes('DISPONIBILIDAD')) return 'DISPONIBILIDAD';
    return n;
  }

  function normalizedState(value) {
    const n = norm(value);
    if (['ACTIVO','ACTIVA','ACTIVE'].includes(n)) return 'ACTIVO';
    if (n.includes('SUSPEND')) return 'SUSPENDIDA';
    if (['BAJA','INACTIVO','INACTIVA'].includes(n)) return 'BAJA';
    return n;
  }

  function rowMatches(row, filters) {
    if (filters.visualType && normalizedVisual(row.visualType) !== normalizedVisual(filters.visualType)) return false;
    if (filters.platform && norm(row.platform) !== norm(filters.platform)) return false;
    if (filters.composition && norm(row.composition) !== norm(filters.composition)) return false;
    if (filters.state && normalizedState(row.state) !== normalizedState(filters.state)) return false;

    if (filters.supervisor) {
      if (filters.supervisor === '__GG__') {
        const sid = String(row.supervisorId || '');
        if (sid !== '__GG__' && norm(row.supervisor) !== 'GG') return false;
      } else if (String(row.supervisorId || '') !== String(filters.supervisor)) {
        return false;
      }
    }

    if (filters.crew && String(row.crewId || '') !== String(filters.crew)) return false;
    return true;
  }

  function indicatorFromCard(article) {
    const label = norm(article?.querySelector('span')?.textContent || article?.textContent || '');
    if (!label) return '';
    if (label.includes('VTR') && label.includes('GAR')) return 'VTR_GAR';
    if (label.includes('TIEMPO') && label.includes('SLA')) return 'SLA';
    if (label.includes('OBSERVACION')) return 'OBSERVACIONES';
    if (label.includes('RECABLEADO')) return 'RECABLEADO';
    if (label.includes('EFECTIVIDAD')) return 'EFECTIVIDAD';
    if (label.includes('PRODUCCION')) return 'PRODUCCION';
    return '';
  }

  function findIndicatorCard(indicator) {
    const root = document.getElementById('dashboardTotalSummaryV19');
    if (!root) return null;
    return [...root.querySelectorAll('article')].find(a => indicatorFromCard(a) === indicator) || null;
  }

  function installStyles() {
    if (document.getElementById('mvlDashboardDetailV215Styles')) return;
    const style = document.createElement('style');
    style.id = 'mvlDashboardDetailV215Styles';
    style.textContent = `
      .mvl-d215-action-row{display:flex;justify-content:flex-end;align-items:center;margin-top:7px;position:relative;z-index:2}
      .mvl-d215-detail-btn{appearance:none;border:1px solid rgba(255,255,255,.55);background:rgba(255,255,255,.18);color:inherit;border-radius:999px;padding:5px 9px;font:inherit;font-size:.68rem;font-weight:900;cursor:pointer;line-height:1.2;white-space:nowrap}
      .dashboard-v19-total-card:not([style*="color"]) .mvl-d215-detail-btn{border-color:#cbd9e8;background:#f7fbff;color:#0758b7}
      .mvl-d215-detail-btn:hover{filter:brightness(.97);transform:translateY(-1px)}

      .mvl-d215-overlay{position:fixed;inset:0;z-index:32000;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;padding:12px}
      .mvl-d215-modal{width:min(1120px,100%);max-height:94vh;overflow:auto;background:#f5f8fc;color:#0f172a;border-radius:18px;box-shadow:0 28px 80px rgba(15,23,42,.28);border:1px solid #d9e3ef}
      .mvl-d215-head{position:sticky;top:0;z-index:3;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:15px 16px;background:rgba(255,255,255,.97);border-bottom:1px solid #dbe5f0;backdrop-filter:blur(8px)}
      .mvl-d215-head h3{margin:0;color:#12385f;font-size:1.06rem}.mvl-d215-head p{margin:4px 0 0;color:#64748b;font-size:.73rem;line-height:1.35}
      .mvl-d215-head-actions{display:flex;align-items:center;gap:7px;flex:0 0 auto}
      .mvl-d215-back,.mvl-d215-close{border:0;border-radius:10px;padding:8px 10px;font-weight:900;cursor:pointer;font-size:.76rem}
      .mvl-d215-back{background:#eaf3ff;color:#0758b7}.mvl-d215-close{background:#475569;color:#fff}
      .mvl-d215-body{padding:14px 16px 18px}
      .mvl-d215-loading,.mvl-d215-empty{padding:24px 12px;text-align:center;color:#64748b;font-size:.82rem}
      .mvl-d215-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}
      .mvl-d215-kpi{background:#fff;border:1px solid #dbe5f0;border-radius:12px;padding:10px;min-width:0}.mvl-d215-kpi span{display:block;color:#64748b;font-size:.65rem;font-weight:800}.mvl-d215-kpi b{display:block;margin-top:4px;color:#12385f;font-size:.96rem;word-break:break-word}
      .mvl-d215-list{display:grid;gap:8px}
      .mvl-d215-crew{width:100%;display:grid;grid-template-columns:minmax(220px,1.5fr) repeat(4,minmax(90px,.65fr)) auto;gap:8px;align-items:center;text-align:left;border:1px solid #dbe5f0;background:#fff;border-radius:13px;padding:10px;cursor:pointer;color:#0f172a}
      .mvl-d215-crew:hover{border-color:#9fc5ee;box-shadow:0 5px 14px rgba(30,64,100,.08)}
      .mvl-d215-crew-name strong{display:block;color:#153a61;font-size:.80rem}.mvl-d215-crew-name small{display:block;margin-top:3px;color:#64748b;font-size:.66rem;line-height:1.3}
      .mvl-d215-cell span{display:block;color:#8290a3;font-size:.59rem;font-weight:800;text-transform:uppercase}.mvl-d215-cell b{display:block;margin-top:2px;font-size:.74rem;color:#1e3f63}
      .mvl-d215-arrow{font-size:1.35rem;color:#7391b1;font-weight:900}
      .mvl-d215-day{background:#fff;border:1px solid #dbe5f0;border-radius:13px;overflow:hidden}
      .mvl-d215-day-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;background:#edf4fb;border-bottom:1px solid #dbe5f0}
      .mvl-d215-day-head strong{color:#153a61;font-size:.80rem}.mvl-d215-day-head small{display:block;margin-top:2px;color:#64748b;font-size:.66rem}.mvl-d215-day-metric{text-align:right;flex:0 0 auto}.mvl-d215-day-metric b{display:block;color:#153a61;font-size:.82rem}.mvl-d215-day-metric span{font-size:.63rem;color:#64748b}
      .mvl-d215-items{display:grid}.mvl-d215-item{display:grid;grid-template-columns:minmax(150px,1.2fr) minmax(120px,.8fr) minmax(140px,1fr) minmax(90px,.6fr);gap:8px;padding:9px 12px;border-top:1px solid #edf1f5}.mvl-d215-item:first-child{border-top:0}
      .mvl-d215-item strong{font-size:.73rem;color:#173e66}.mvl-d215-item small{display:block;margin-top:2px;color:#66778b;font-size:.63rem;line-height:1.35;word-break:break-word}.mvl-d215-item .metric{text-align:right;font-size:.72rem;font-weight:900;color:#173e66}.mvl-d215-tag{display:inline-flex;width:max-content;max-width:100%;padding:3px 6px;border-radius:999px;background:#edf3f9;color:#46627f;font-size:.59rem;font-weight:900}
      .mvl-d215-note{margin-top:4px;color:#64748b;font-size:.63rem;line-height:1.35}

      @media(max-width:820px){
        .mvl-d215-summary{grid-template-columns:repeat(2,minmax(0,1fr))}
        .mvl-d215-crew{grid-template-columns:minmax(0,1fr) repeat(2,minmax(76px,.55fr)) auto}.mvl-d215-crew .mvl-d215-cell:nth-of-type(n+4){display:none}
        .mvl-d215-item{grid-template-columns:minmax(0,1fr) minmax(100px,.7fr)}.mvl-d215-item > div:nth-child(3){grid-column:1/-1}.mvl-d215-item .metric{text-align:left}
      }
      @media(max-width:520px){
        .mvl-d215-overlay{padding:0}.mvl-d215-modal{height:100vh;max-height:100vh;border-radius:0}.mvl-d215-head{padding:12px}.mvl-d215-body{padding:10px 12px 16px}
        .mvl-d215-head-actions{gap:5px}.mvl-d215-back,.mvl-d215-close{padding:7px 8px;font-size:.69rem}
        .mvl-d215-crew{grid-template-columns:minmax(0,1fr) minmax(78px,.55fr) auto}.mvl-d215-crew .mvl-d215-cell:nth-of-type(n+3){display:none}
        .mvl-d215-day-head{align-items:flex-start}.mvl-d215-item{grid-template-columns:1fr}.mvl-d215-item > div:nth-child(3){grid-column:auto}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureButtons() {
    installStyles();
    const root = document.getElementById('dashboardTotalSummaryV19');
    if (!root) return;

    root.querySelectorAll('article').forEach(article => {
      const indicator = indicatorFromCard(article);
      if (!INDICATORS[indicator]) return;
      if (article.querySelector(`.mvl-d215-detail-btn[data-indicator="${indicator}"]`)) return;

      const row = document.createElement('div');
      row.className = 'mvl-d215-action-row';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mvl-d215-detail-btn';
      btn.dataset.indicator = indicator;
      btn.textContent = 'Ver detalle ›';
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openIndicator(indicator).catch(err => showError(err));
      });
      row.appendChild(btn);
      article.appendChild(row);
    });

    updateVtrGarCard(STATE.lastDashboard);
  }

  function updateVtrGarCard(data) {
    if (!data?.ok) return;
    const s = data.vtrGarSummary || data.summary?.vtrGarSummary;
    if (!s) return;

    const card = findIndicatorCard('VTR_GAR');
    if (!card) return;
    card.classList.remove('under-construction');

    const strong = card.querySelector('strong');
    const small = card.querySelector('small');
    if (strong) strong.textContent = pct(s.percent);
    if (small) {
      const count = num(s.count);
      const vtr = num(s.vtr);
      const gar = num(s.gar);
      const pending = num(s.pending);
      small.textContent = `${count} incidencias · ${vtr} VTR · ${gar} GAR${pending ? ` · ${pending} pendiente${pending === 1 ? '' : 's'}` : ''}`;
    }
  }

  function wrapApi() {
    if (STATE.apiWrapped) return;
    const currentApi = (typeof window.api === 'function') ? window.api : (typeof api === 'function' ? api : null);
    if (!currentApi) return;

    STATE.apiWrapped = true;
    const wrapped = async function(action, params = {}) {
      const result = await currentApi(action, params);
      try {
        if (action === 'performanceDashboard' && result?.ok) {
          STATE.lastDashboard = result;
          window.setTimeout(() => {
            ensureButtons();
            updateVtrGarCard(result);
          }, 0);
        }
      } catch (err) {
        console.warn('[MI VISUAL LIMA V2.15] No se pudo actualizar detalle Dashboard.', err);
      }
      return result;
    };

    try { window.api = wrapped; } catch (_) {}
    try { api = wrapped; } catch (_) {}
  }

  async function apiCall(action, payload = {}) {
    const fn = (typeof window.api === 'function') ? window.api : (typeof api === 'function' ? api : null);
    if (!fn) throw new Error('API no disponible. Actualiza la página e inténtalo nuevamente.');
    return await fn(action, { token: token(), ...payload });
  }

  function getOrCreateModal() {
    let overlay = document.getElementById('mvlDashboardDetailV215');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'mvlDashboardDetailV215';
    overlay.className = 'mvl-d215-overlay';
    overlay.innerHTML = `
      <section class="mvl-d215-modal" role="dialog" aria-modal="true">
        <header class="mvl-d215-head">
          <div>
            <h3 id="mvlD215Title">Detalle</h3>
            <p id="mvlD215Subtitle"></p>
          </div>
          <div class="mvl-d215-head-actions">
            <button type="button" id="mvlD215Back" class="mvl-d215-back" hidden>← Cuadrillas</button>
            <button type="button" id="mvlD215Close" class="mvl-d215-close">Cerrar</button>
          </div>
        </header>
        <div id="mvlD215Body" class="mvl-d215-body"></div>
      </section>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#mvlD215Close')?.addEventListener('click', closeModal);
    overlay.querySelector('#mvlD215Back')?.addEventListener('click', () => renderOverview());
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeModal();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.getElementById('mvlDashboardDetailV215')) closeModal();
    });
    return overlay;
  }

  function closeModal() {
    document.getElementById('mvlDashboardDetailV215')?.remove();
    STATE.overview = null;
    STATE.currentRows = [];
  }

  function setModalHeader(title, subtitle, showBack = false) {
    const modal = getOrCreateModal();
    const titleEl = modal.querySelector('#mvlD215Title');
    const subEl = modal.querySelector('#mvlD215Subtitle');
    const back = modal.querySelector('#mvlD215Back');
    if (titleEl) titleEl.textContent = title || 'Detalle';
    if (subEl) subEl.textContent = subtitle || '';
    if (back) back.hidden = !showBack;
  }

  function bodyHtml(content) {
    const body = getOrCreateModal().querySelector('#mvlD215Body');
    if (body) body.innerHTML = content;
  }

  function showLoading(message = 'Cargando detalle…') {
    bodyHtml(`<div class="mvl-d215-loading">${esc(message)}</div>`);
  }

  function showError(err) {
    const message = String(err?.message || err || 'No se pudo cargar el detalle.');
    if (document.getElementById('mvlDashboardDetailV215')) {
      bodyHtml(`<div class="mvl-d215-empty">${esc(message)}</div>`);
    } else {
      console.error('[MI VISUAL LIMA V2.15]', err);
      alert(message);
    }
  }

  function sortRows(rows, indicator) {
    const direction = INDICATORS[indicator]?.direction || 'DESC';
    const getValue = (r) => {
      if (indicator === 'PRODUCCION') return nullableNum(r.productionRatio) ?? nullableNum(r.points);
      if (indicator === 'EFECTIVIDAD') return nullableNum(r.effectiveness);
      if (indicator === 'RECABLEADO') return nullableNum(r.recablePercent);
      if (indicator === 'SLA') return nullableNum(r.slaPercent);
      if (indicator === 'OBSERVACIONES') return nullableNum(r.observationsAverage) ?? nullableNum(r.observationsCount);
      if (indicator === 'VTR_GAR') return nullableNum(r.vtrGarPercent);
      return null;
    };

    return [...rows].sort((a,b) => {
      const av = getValue(a), bv = getValue(b);
      if (av == null && bv != null) return 1;
      if (av != null && bv == null) return -1;
      if (av != null && bv != null && av !== bv) return direction === 'ASC' ? av - bv : bv - av;
      return String(a.crewDisplay || '').localeCompare(String(b.crewDisplay || ''),'es',{numeric:true});
    });
  }

  function rowOverviewCells(row, indicator) {
    if (indicator === 'PRODUCCION') {
      const target = nullableNum(row.productionTargetToDate ?? row.productionTargetPoints);
      const ratio = nullableNum(row.productionRatio);
      const scored = row.scoredOrders ?? row.ordersScored ?? row.scored ?? '';
      return [
        ['Puntos', `${num(row.points).toFixed(2)} pts`],
        ['Finalizadas', String(num(row.finalized))],
        ['Meta corte', target == null ? '—' : `${target.toFixed(2)} pts`],
        ['Cumplimiento', pct(ratio,0)],
        scored !== '' ? ['Puntuadas', String(num(scored))] : null
      ].filter(Boolean);
    }
    if (indicator === 'EFECTIVIDAD') {
      return [
        ['Finalizadas', String(num(row.finalized))],
        ['Total evaluado', String(num(row.totalGeneral ?? row.total))],
        ['Efectividad', pct(row.effectiveness)],
        ['No finalizadas', String(Math.max(0,num(row.totalGeneral ?? row.total)-num(row.finalized)))]
      ];
    }
    if (indicator === 'RECABLEADO') {
      return [
        ['LOS ROJO', String(num(row.losRojo))],
        ['Recableados', String(num(row.recables))],
        ['% Recableado', pct(row.recablePercent)],
        ['No recableados', String(Math.max(0,num(row.losRojo)-num(row.recables)))]
      ];
    }
    if (indicator === 'SLA') {
      return [
        ['Dentro SLA', String(num(row.slaCumplen))],
        ['Evaluables', String(num(row.slaEvaluables))],
        ['Fuera SLA', String(num(row.slaFuera))],
        ['Cumplimiento', pct(row.slaPercent)]
      ];
    }
    if (indicator === 'OBSERVACIONES') {
      return [
        ['Observaciones', String(num(row.observationsCount))],
        ['Activas', String(num(row.observationsActive))],
        ['Impacto', money(row.observationsImpact)],
        ['Promedio', num(row.observationsAverage).toFixed(1)]
      ];
    }
    return [
      ['VTR', String(num(row.vtrCount))],
      ['GAR', String(num(row.garCount))],
      ['Total', String(num(row.vtrGarCount))],
      ['% VTR/GAR', pct(row.vtrGarPercent)],
      ['Pendientes', String(num(row.vtrGarPending))]
    ];
  }

  function summaryMetrics(rows, indicator) {
    if (indicator === 'PRODUCCION') {
      const points = rows.reduce((a,r)=>a+num(r.points),0);
      const finalized = rows.reduce((a,r)=>a+num(r.finalized),0);
      const target = rows.reduce((a,r)=>a+num(r.productionTargetToDate ?? r.productionTargetPoints),0);
      return [
        ['Cuadrillas', rows.length],['Puntos', `${points.toFixed(2)} pts`],['Finalizadas', finalized],['Cumplimiento', target>0?pct(points/target,0):'—']
      ];
    }
    if (indicator === 'EFECTIVIDAD') {
      const fin = rows.reduce((a,r)=>a+num(r.finalized),0);
      const total = rows.reduce((a,r)=>a+num(r.totalGeneral ?? r.total),0);
      return [['Cuadrillas',rows.length],['Finalizadas',fin],['Total evaluado',total],['Efectividad',total>0?pct(fin/total):'—']];
    }
    if (indicator === 'RECABLEADO') {
      const los = rows.reduce((a,r)=>a+num(r.losRojo),0);
      const rec = rows.reduce((a,r)=>a+num(r.recables),0);
      return [['Cuadrillas',rows.length],['LOS ROJO',los],['Recableados',rec],['% Recableado',los>0?pct(rec/los):'—']];
    }
    if (indicator === 'SLA') {
      const evals = rows.reduce((a,r)=>a+num(r.slaEvaluables),0);
      const ok = rows.reduce((a,r)=>a+num(r.slaCumplen),0);
      const out = rows.reduce((a,r)=>a+num(r.slaFuera),0);
      return [['Cuadrillas',rows.length],['Dentro SLA',ok],['Fuera SLA',out],['Cumplimiento',evals>0?pct(ok/evals):'—']];
    }
    if (indicator === 'OBSERVACIONES') {
      const obs = rows.reduce((a,r)=>a+num(r.observationsCount),0);
      const active = rows.reduce((a,r)=>a+num(r.observationsActive),0);
      const impact = rows.reduce((a,r)=>a+num(r.observationsImpact),0);
      return [['Cuadrillas',rows.length],['Observaciones',obs],['Activas',active],['Impacto',money(impact)]];
    }
    const vtr = rows.reduce((a,r)=>a+num(r.vtrCount),0);
    const gar = rows.reduce((a,r)=>a+num(r.garCount),0);
    const total = rows.reduce((a,r)=>a+num(r.vtrGarCount),0);
    const finalized = rows.reduce((a,r)=>a+num(r.finalized),0);
    return [['Cuadrillas',rows.length],['VTR',vtr],['GAR',gar],['% VTR/GAR',finalized>0?pct(total/finalized):'—']];
  }

  function renderOverview() {
    const indicator = STATE.currentIndicator;
    const meta = INDICATORS[indicator];
    const rows = STATE.currentRows || [];
    setModalHeader(`${meta?.label || indicator} · Detalle por cuadrilla`, `${currentPeriod()} · ${filterLabel()}`, false);

    if (!rows.length) {
      bodyHtml('<div class="mvl-d215-empty">No hay cuadrillas con datos para los filtros seleccionados.</div>');
      return;
    }

    const metrics = summaryMetrics(rows, indicator);
    const summary = `<div class="mvl-d215-summary">${metrics.map(([label,value]) => `
      <div class="mvl-d215-kpi"><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('')}</div>`;

    const list = `<div class="mvl-d215-list">${rows.map(row => {
      const cells = rowOverviewCells(row, indicator).slice(0,4);
      const sup = String(row.supervisor || '').trim() || (String(row.supervisorId||'') === '__GG__' ? 'GG' : '');
      const metaLine = [row.visualType,row.platform,sup,row.composition].filter(Boolean).join(' · ');
      return `
        <button type="button" class="mvl-d215-crew" data-crew-id="${esc(row.crewId)}">
          <div class="mvl-d215-crew-name"><strong>${esc(row.crewDisplay || row.crewCode || row.crewId)}</strong><small>${esc(metaLine)}</small></div>
          ${cells.map(([label,value]) => `<div class="mvl-d215-cell"><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('')}
          <div class="mvl-d215-arrow">›</div>
        </button>`;
    }).join('')}</div>`;

    bodyHtml(summary + list);
    getOrCreateModal().querySelectorAll('.mvl-d215-crew').forEach(btn => {
      btn.addEventListener('click', () => openCrewDetail(btn.dataset.crewId).catch(err => showError(err)));
    });
  }

  async function dashboardDataFor(indicator) {
    const period = currentPeriod();
    const last = STATE.lastDashboard;
    if (last?.ok && String(last.period || '') === String(period || '') && Array.isArray(last.rows)) {
      return last;
    }
    return await apiCall('performanceDashboard', {
      period,
      indicator,
      site:'LIMA',
      supervisorId:'',
      crewId:''
    });
  }

  async function openIndicator(indicator) {
    if (!INDICATORS[indicator] || STATE.busy) return;
    STATE.busy = true;
    STATE.currentIndicator = indicator;
    getOrCreateModal();
    setModalHeader(`${INDICATORS[indicator].label} · Detalle`, `${currentPeriod()} · ${filterLabel()}`, false);
    showLoading('Cargando detalle por cuadrilla…');

    try {
      const data = await dashboardDataFor(indicator);
      if (!data?.ok) throw new Error(data?.error || 'No se pudo cargar el Dashboard.');
      STATE.lastDashboard = data;
      updateVtrGarCard(data);
      const filters = currentFilters();
      const rows = (data.rows || []).filter(r => rowMatches(r, filters));
      STATE.currentRows = sortRows(rows, indicator);
      STATE.overview = data;
      renderOverview();
    } finally {
      STATE.busy = false;
    }
  }

  function itemTitle(item) {
    return item.clientName || (item.clientCode ? `Cliente ${item.clientCode}` : '') || (item.orderId ? `Orden ${item.orderId}` : '') || item.metric || 'Caso';
  }

  function renderDays(detail) {
    const days = Array.isArray(detail?.days) ? detail.days : [];
    if (!days.length) {
      return '<div class="mvl-d215-empty">No hay registros de detalle para esta cuadrilla en el periodo seleccionado.</div>';
    }

    return `<div class="mvl-d215-list">${days.map(day => `
      <section class="mvl-d215-day">
        <div class="mvl-d215-day-head">
          <div><strong>${esc(day.dateLabel || day.date)}</strong><small>${esc(day.secondary || `${num(day.count)} registro(s)`)}</small></div>
          <div class="mvl-d215-day-metric"><b>${esc(day.primary || '')}</b><span>${num(day.count)} registro${num(day.count) === 1 ? '' : 's'}</span></div>
        </div>
        <div class="mvl-d215-items">
          ${(day.items || []).map(item => {
            const type = [item.typeAtencion,item.typePartida].filter(Boolean).join(' · ');
            const order = item.orderId ? `Orden ${item.orderId}` : '';
            const client = item.clientCode ? `Cliente ${item.clientCode}` : '';
            const detailText = [item.description,item.descargo,item.address].filter(Boolean).join(' · ');
            return `
              <div class="mvl-d215-item">
                <div><strong>${esc(itemTitle(item))}</strong><small>${esc([order,client].filter(Boolean).join(' · '))}</small></div>
                <div>${item.status ? `<span class="mvl-d215-tag">${esc(String(item.status).replaceAll('_',' '))}</span>` : ''}<small>${esc(type)}</small></div>
                <div><small>${esc(detailText)}</small></div>
                <div class="metric">${esc(item.metric || (item.points != null ? `${num(item.points).toFixed(2)} pts` : ''))}</div>
              </div>`;
          }).join('')}
        </div>
      </section>`).join('')}</div>`;
  }

  async function openCrewDetail(crewId) {
    if (!crewId || STATE.busy) return;
    STATE.busy = true;
    const indicator = STATE.currentIndicator;
    const row = (STATE.currentRows || []).find(r => String(r.crewId || '') === String(crewId)) || {};
    setModalHeader(`${INDICATORS[indicator]?.label || indicator} · ${row.crewDisplay || crewId}`, `${currentPeriod()} · detalle por día y orden/caso`, true);
    showLoading('Cargando órdenes y casos…');

    try {
      const detail = await apiCall('performanceIndicatorDetail', {
        period: currentPeriod(),
        crewId,
        indicator
      });
      if (!detail?.ok) throw new Error(detail?.error || 'No se pudo cargar el detalle de la cuadrilla.');
      bodyHtml(renderDays(detail));
    } finally {
      STATE.busy = false;
    }
  }

  function observeDashboard() {
    const panel = document.getElementById('performanceDashboardPanel');
    if (!panel || panel.dataset.v215DetailObserved === '1') return;
    panel.dataset.v215DetailObserved = '1';

    let pending = false;
    const run = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        ensureButtons();
      });
    };

    new MutationObserver(run).observe(panel, { childList:true, subtree:true, characterData:true });
    run();
  }

  function init() {
    installStyles();
    wrapApi();
    observeDashboard();
    ensureButtons();
    console.info(`[MI VISUAL LIMA] ${VERSION}: detalle unificado de indicadores activo.`);
  }

  document.addEventListener('mvl:core-ready', () => window.setTimeout(init, 0), { once:true });

  const timer = window.setInterval(() => {
    init();
    if (STATE.apiWrapped && document.getElementById('performanceDashboardPanel')) {
      window.clearInterval(timer);
    }
  }, 150);
  window.setTimeout(() => window.clearInterval(timer), 20000);
})();
