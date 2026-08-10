/**
 * MI VISUAL LIMA - Frontend V1.13 (actualización incremental)
 *
 * Mantiene intacta la V1.12 publicada y agrega:
 * - Inicio más limpio y módulos más visibles.
 * - Botón PONER INDICADORES solo para Gerencia y Administrador.
 * - Metas y semáforos editables para Producción y Efectividad.
 * - Semáforos visibles en resumen y ranking.
 */

(() => {
  const MVL_V112 =
    'https://cdn.jsdelivr.net/gh/florescubasmao-oss/mivisuallima@37ba9a389cb22a15cb739bec015167815f80bc56/app.js';

  const STATE = {
    config: null,
    dashboards: new Map(),
    apiWrapped: false,
    initialized: false
  };

  const norm113 = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

  const esc113 = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function sessionSafe113() {
    try {
      return typeof sessionData !== 'undefined' ? sessionData : null;
    } catch (_) {
      return null;
    }
  }

  function tokenSafe113() {
    try {
      return typeof token === 'function' ? token() : '';
    } catch (_) {
      return '';
    }
  }

  function profile113() {
    return norm113(sessionSafe113()?.user?.profile || '');
  }

  function canEditIndicators113() {
    const p = profile113();
    return p === 'GERENCIA' || p === 'ADMINISTRADOR';
  }

  function installStyles113() {
    if (document.getElementById('mvlV113Styles')) return;

    const style = document.createElement('style');
    style.id = 'mvlV113Styles';
    style.textContent = `
      /* INICIO SIMPLIFICADO */
      #homeView .summary,
      #homeView #ggNotice {
        display: none !important;
      }

      #homeView .section-title {
        margin-top: 22px !important;
        margin-bottom: 12px !important;
      }

      #homeView .section-title .section-subtitle {
        display: none !important;
      }

      #homeView #moduleList.module-grid {
        gap: 14px !important;
      }

      #homeView .module-card {
        min-height: 104px !important;
        padding: 18px !important;
        border-radius: 18px !important;
        border: 1px solid #d7e4f4 !important;
        box-shadow: 0 8px 22px rgba(16,55,98,.07) !important;
        background: #ffffff !important;
        transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease !important;
      }

      #homeView .module-card.module-active {
        border-color: #b9d7fb !important;
        box-shadow: 0 10px 28px rgba(7,88,183,.11) !important;
      }

      #homeView .module-card.module-active:hover {
        transform: translateY(-1px);
        border-color: #75afea !important;
      }

      #homeView .module-card:disabled {
        opacity: .72 !important;
        background: #f8fafc !important;
        box-shadow: none !important;
      }

      #homeView .module-icon {
        width: 58px !important;
        height: 58px !important;
        min-width: 58px !important;
        border-radius: 16px !important;
        font-size: 1.35rem !important;
      }

      #homeView .module-copy strong {
        font-size: 1.02rem !important;
        line-height: 1.2 !important;
      }

      #homeView .module-copy small {
        margin-top: 5px !important;
        font-size: .78rem !important;
      }

      #homeView .module-arrow {
        font-size: 1.45rem !important;
      }

      /* PONER INDICADORES */
      .mvl-v113-config-button {
        border: 1px solid #b8d6fb;
        background: #eef6ff;
        color: #0758b7;
        border-radius: 11px;
        padding: 9px 12px;
        font-weight: 800;
        font-size: .76rem;
        cursor: pointer;
        white-space: nowrap;
      }

      .mvl-v113-config-button:hover {
        background: #e3f0ff;
      }

      .mvl-v113-summary-actions {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        flex-wrap: wrap;
      }

      .mvl-v113-status {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-top: 8px;
        border-radius: 999px;
        padding: 5px 8px;
        font-size: .68rem;
        font-weight: 900;
        line-height: 1;
        border: 1px solid transparent;
        width: fit-content;
      }

      .mvl-v113-status::before {
        content: '';
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: currentColor;
      }

      .mvl-v113-status.cumple {
        color: #147a3b;
        background: #edf9f1;
        border-color: #bfe8cc;
      }

      .mvl-v113-status.atencion {
        color: #a45a00;
        background: #fff7e8;
        border-color: #f1d5a2;
      }

      .mvl-v113-status.critico {
        color: #b42318;
        background: #fff1f0;
        border-color: #f4c7c3;
      }

      .mvl-v113-status.sin-dato {
        color: #667085;
        background: #f5f7fa;
        border-color: #e2e8f0;
      }

      .mvl-v113-rank-extra {
        display: block;
        margin-top: 5px;
        color: #687386;
        font-size: .70rem;
        font-weight: 600;
      }

      #dashboardRankingList .dashboard-rank-value {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
      }

      #dashboardRankingList .dashboard-rank-value .mvl-v113-status {
        margin-left: auto;
      }

      /* MODAL */
      .mvl-v113-modal {
        position: fixed;
        inset: 0;
        z-index: 10050;
        background: rgba(15,36,66,.46);
        display: grid;
        place-items: center;
        padding: 18px;
      }

      .mvl-v113-modal.hidden {
        display: none !important;
      }

      .mvl-v113-modal-card {
        width: min(680px, 100%);
        max-height: min(86vh, 760px);
        overflow: auto;
        background: #ffffff;
        border-radius: 20px;
        border: 1px solid #d9e4f1;
        box-shadow: 0 24px 70px rgba(12,36,70,.25);
        padding: 20px;
      }

      .mvl-v113-modal-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
        margin-bottom: 16px;
      }

      .mvl-v113-modal-head h3 {
        margin: 0 0 4px;
        font-size: 1.18rem;
      }

      .mvl-v113-modal-head p {
        margin: 0;
        color: #687386;
        font-size: .80rem;
      }

      .mvl-v113-close {
        border: 0;
        background: #eef3f8;
        color: #18385e;
        width: 34px;
        height: 34px;
        border-radius: 10px;
        font-size: 1.2rem;
        cursor: pointer;
      }

      .mvl-v113-config-section {
        border: 1px solid #dce6f2;
        border-radius: 16px;
        padding: 15px;
        margin-top: 12px;
      }

      .mvl-v113-config-section h4 {
        margin: 0 0 10px;
        color: #0b3f79;
      }

      .mvl-v113-config-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0,1fr));
        gap: 11px;
      }

      .mvl-v113-field {
        display: flex;
        flex-direction: column;
        gap: 5px;
        font-size: .75rem;
        color: #48576a;
        font-weight: 700;
      }

      .mvl-v113-field input {
        width: 100%;
        min-height: 42px;
        border: 1px solid #cfdbe9;
        border-radius: 10px;
        padding: 9px 10px;
        font: inherit;
        color: #10213d;
        background: #fff;
      }

      .mvl-v113-construction-list {
        display: grid;
        gap: 7px;
      }

      .mvl-v113-construction-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        border-radius: 10px;
        background: #f7f9fc;
        padding: 9px 10px;
        color: #526174;
        font-size: .76rem;
      }

      .mvl-v113-construction-item strong {
        color: #7a8595;
        font-size: .69rem;
      }

      .mvl-v113-modal-message {
        min-height: 18px;
        margin-top: 10px;
        font-size: .76rem;
        font-weight: 700;
      }

      .mvl-v113-modal-message.error { color: #b42318; }
      .mvl-v113-modal-message.ok { color: #147a3b; }

      .mvl-v113-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 9px;
        margin-top: 14px;
      }

      .mvl-v113-secondary,
      .mvl-v113-primary {
        min-height: 42px;
        border-radius: 11px;
        padding: 9px 14px;
        font-weight: 800;
        cursor: pointer;
      }

      .mvl-v113-secondary {
        background: #fff;
        color: #30445f;
        border: 1px solid #ced9e7;
      }

      .mvl-v113-primary {
        background: #0758b7;
        color: #fff;
        border: 1px solid #0758b7;
      }

      .mvl-v113-primary:disabled {
        opacity: .55;
        cursor: wait;
      }

      @media (max-width: 680px) {
        #homeView #moduleList.module-grid {
          grid-template-columns: 1fr !important;
        }

        .dashboard-v19-summary-head {
          align-items: flex-start !important;
          flex-direction: column !important;
        }

        .mvl-v113-summary-actions {
          width: 100%;
          justify-content: space-between;
        }

        .mvl-v113-config-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function improveModuleCards113() {
    const list = document.getElementById('moduleList');
    if (!list) return;

    list.querySelectorAll('.module-card').forEach(card => {
      const small = card.querySelector('.module-copy small');
      if (card.disabled && small && norm113(small.textContent) === 'PROXIMA ETAPA') {
        small.textContent = 'En construcción';
      }
    });
  }

  function watchModuleCards113() {
    const list = document.getElementById('moduleList');
    if (!list || list.dataset.v113Observed === '1') return;

    list.dataset.v113Observed = '1';
    improveModuleCards113();

    new MutationObserver(() => improveModuleCards113())
      .observe(list, { childList: true, subtree: true });
  }

  function statusInfo113(status) {
    const s = norm113(status);
    if (s === 'CUMPLE') return { cls: 'cumple', label: 'Cumple' };
    if (s === 'ATENCION') return { cls: 'atencion', label: 'Atención' };
    if (s === 'CRITICO') return { cls: 'critico', label: 'Crítico' };
    return { cls: 'sin-dato', label: 'Sin dato' };
  }

  function setStatusBadge113(container, status, detail = '') {
    if (!container) return;

    const info = statusInfo113(status);
    let badge = container.querySelector(':scope > .mvl-v113-status');

    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'mvl-v113-status';
      container.appendChild(badge);
    }

    const nextClass = `mvl-v113-status ${info.cls}`;
    if (badge.className !== nextClass) badge.className = nextClass;

    const text = detail ? `${info.label} · ${detail}` : info.label;
    if (badge.textContent !== text) badge.textContent = text;
  }

  function selectedIndicator113() {
    return document.getElementById('dashboardIndicator')?.value || 'PRODUCCION';
  }

  function bestDashboard113() {
    return STATE.dashboards.get('ALL') ||
      STATE.dashboards.get(selectedIndicator113()) ||
      [...STATE.dashboards.values()].at(-1) ||
      null;
  }

  function enhanceSummary113() {
    const data = bestDashboard113();
    if (!data?.ok) return;

    const summary = data.summary || {};
    const productionValue = document.getElementById('dashboardTotalPointsV19');
    const effectivenessValue = document.getElementById('dashboardTotalEffectivenessV19');

    if (productionValue?.closest('article')) {
      const ratio = Number(summary.productionRatio);
      const ratioText = Number.isFinite(ratio)
        ? `${(ratio * 100).toFixed(0)}% de meta`
        : '';
      setStatusBadge113(
        productionValue.closest('article'),
        summary.productionStatus,
        ratioText
      );
    }

    if (effectivenessValue?.closest('article')) {
      setStatusBadge113(
        effectivenessValue.closest('article'),
        summary.effectivenessStatus
      );
    }
  }

  function enhanceRanking113() {
    const data = bestDashboard113();
    if (!data?.ok) return;

    const indicator = selectedIndicator113();
    if (indicator !== 'PRODUCCION' && indicator !== 'EFECTIVIDAD') return;

    const byCrew = new Map(
      (data.rows || []).map(row => [String(row.crewId || ''), row])
    );

    document.querySelectorAll('#dashboardRankingList [data-dashboard-crew]').forEach(button => {
      const row = byCrew.get(String(button.dataset.dashboardCrew || ''));
      if (!row) return;

      const copy = button.querySelector('.dashboard-rank-copy');
      const value = button.querySelector('.dashboard-rank-value');
      if (!copy || !value) return;

      let extra = copy.querySelector('.mvl-v113-rank-extra');
      if (!extra) {
        extra = document.createElement('span');
        extra.className = 'mvl-v113-rank-extra';
        const meta = copy.querySelector('.dashboard-v19-rank-meta');
        if (meta) copy.insertBefore(extra, meta);
        else copy.appendChild(extra);
      }

      if (indicator === 'PRODUCCION') {
        const avg = Number(row.productionDailyAverage);
        const target = Number(row.productionDailyTarget);
        const days = Number(row.productionDays || 0);

        const text = Number.isFinite(avg) && days > 0
          ? `${avg.toFixed(2)} pts/día · Meta ${target.toFixed(target % 1 ? 1 : 0)} pts/día · ${days} día${days === 1 ? '' : 's'} con datos`
          : 'Sin promedio diario disponible';

        if (extra.textContent !== text) extra.textContent = text;
        setStatusBadge113(value, row.productionStatus);
      } else {
        const eff = Number(row.effectiveness);
        const text = Number.isFinite(eff)
          ? `Efectividad ${(eff * 100).toFixed(1)}%`
          : 'Sin efectividad disponible';

        if (extra.textContent !== text) extra.textContent = text;
        setStatusBadge113(value, row.effectivenessStatus);
      }
    });
  }

  function refreshSemaphores113() {
    window.setTimeout(() => {
      enhanceSummary113();
      enhanceRanking113();
    }, 0);
  }

  function createModal113() {
    if (document.getElementById('indicatorConfigModalV113')) return;

    const modal = document.createElement('div');
    modal.id = 'indicatorConfigModalV113';
    modal.className = 'mvl-v113-modal hidden';
    modal.innerHTML = `
      <div class="mvl-v113-modal-card" role="dialog" aria-modal="true" aria-labelledby="indicatorConfigTitleV113">
        <div class="mvl-v113-modal-head">
          <div>
            <h3 id="indicatorConfigTitleV113">PONER INDICADORES</h3>
            <p>Metas y límites del Dashboard de Desempeño.</p>
          </div>
          <button type="button" class="mvl-v113-close" id="closeIndicatorConfigV113" aria-label="Cerrar">×</button>
        </div>

        <section class="mvl-v113-config-section">
          <h4>Producción</h4>
          <div class="mvl-v113-config-grid">
            <label class="mvl-v113-field">
              Meta DOBLE · puntos por día
              <input id="cfgProdDoubleV113" type="number" min="0.1" step="0.1">
            </label>
            <label class="mvl-v113-field">
              Meta INDIVIDUAL · puntos por día
              <input id="cfgProdSoloV113" type="number" min="0.1" step="0.1">
            </label>
            <label class="mvl-v113-field">
              Atención desde · % de la meta
              <input id="cfgProdAttentionV113" type="number" min="0" max="100" step="1">
            </label>
            <label class="mvl-v113-field">
              Cumple desde · % de la meta
              <input id="cfgProdGreenV113" type="number" min="1" max="200" step="1">
            </label>
          </div>
        </section>

        <section class="mvl-v113-config-section">
          <h4>Efectividad</h4>
          <div class="mvl-v113-config-grid">
            <label class="mvl-v113-field">
              Crítico si es menor de · %
              <input id="cfgEffCriticalV113" type="number" min="0" max="100" step="1">
            </label>
            <label class="mvl-v113-field">
              Cumple si es mayor de · %
              <input id="cfgEffGreenV113" type="number" min="0" max="100" step="1">
            </label>
          </div>
        </section>

        <section class="mvl-v113-config-section">
          <h4>Siguientes indicadores</h4>
          <div class="mvl-v113-construction-list">
            <div class="mvl-v113-construction-item"><span>% Recableado</span><strong>PENDIENTE DE META</strong></div>
            <div class="mvl-v113-construction-item"><span>VTR / GAR</span><strong>EN CONSTRUCCIÓN</strong></div>
            <div class="mvl-v113-construction-item"><span>Tiempo de gestión / SLA</span><strong>EN CONSTRUCCIÓN</strong></div>
            <div class="mvl-v113-construction-item"><span>Observaciones</span><strong>EN CONSTRUCCIÓN</strong></div>
          </div>
        </section>

        <div id="indicatorConfigMessageV113" class="mvl-v113-modal-message"></div>

        <div class="mvl-v113-modal-actions">
          <button type="button" class="mvl-v113-secondary" id="cancelIndicatorConfigV113">Cancelar</button>
          <button type="button" class="mvl-v113-primary" id="saveIndicatorConfigV113">Guardar indicadores</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.classList.add('hidden');

    document.getElementById('closeIndicatorConfigV113')?.addEventListener('click', close);
    document.getElementById('cancelIndicatorConfigV113')?.addEventListener('click', close);

    modal.addEventListener('click', event => {
      if (event.target === modal) close();
    });

    document.getElementById('saveIndicatorConfigV113')?.addEventListener('click', saveConfig113);
  }

  function fillConfig113(config) {
    const c = config || {};
    const p = c.production || {};
    const e = c.effectiveness || {};

    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value ?? '';
    };

    set('cfgProdDoubleV113', Number(p.doubleDailyTarget ?? 5));
    set('cfgProdSoloV113', Number(p.soloDailyTarget ?? 1));
    set('cfgProdAttentionV113', Number(p.attentionRatio ?? .7) * 100);
    set('cfgProdGreenV113', Number(p.greenRatio ?? 1) * 100);
    set('cfgEffCriticalV113', Number(e.criticalBelow ?? .5) * 100);
    set('cfgEffGreenV113', Number(e.greenAbove ?? .7) * 100);
  }

  function modalMessage113(text = '', type = '') {
    const el = document.getElementById('indicatorConfigMessageV113');
    if (!el) return;
    el.textContent = text;
    el.className = `mvl-v113-modal-message ${type}`.trim();
  }

  async function getConfig113(force = false) {
    if (STATE.config && !force) return STATE.config;

    if (typeof api !== 'function') {
      throw new Error('La conexión con el sistema todavía no está disponible.');
    }

    const res = await api('performanceIndicatorConfigGet', {
      token: tokenSafe113()
    });

    if (!res?.ok) throw new Error(res?.error || 'No se pudieron cargar los indicadores.');

    STATE.config = res.config || null;
    return STATE.config;
  }

  async function openConfig113() {
    if (!canEditIndicators113()) return;

    createModal113();
    const modal = document.getElementById('indicatorConfigModalV113');
    modal?.classList.remove('hidden');
    modalMessage113('Cargando configuración…');

    try {
      const config = await getConfig113(true);
      fillConfig113(config);
      modalMessage113('');
    } catch (err) {
      modalMessage113(err.message || 'No se pudo cargar la configuración.', 'error');
    }
  }

  async function saveConfig113() {
    if (!canEditIndicators113()) return;

    const val = id => Number(document.getElementById(id)?.value);
    const payload = {
      production: {
        doubleDailyTarget: val('cfgProdDoubleV113'),
        soloDailyTarget: val('cfgProdSoloV113'),
        attentionRatio: val('cfgProdAttentionV113') / 100,
        greenRatio: val('cfgProdGreenV113') / 100
      },
      effectiveness: {
        criticalBelow: val('cfgEffCriticalV113') / 100,
        greenAbove: val('cfgEffGreenV113') / 100
      }
    };

    const button = document.getElementById('saveIndicatorConfigV113');
    if (button) button.disabled = true;
    modalMessage113('Guardando indicadores…');

    try {
      const res = await api('performanceIndicatorConfigSave', {
        token: tokenSafe113(),
        config: JSON.stringify(payload)
      });

      if (!res?.ok) throw new Error(res?.error || 'No se pudieron guardar los indicadores.');

      STATE.config = res.config || STATE.config;
      STATE.dashboards.clear();
      modalMessage113('Indicadores actualizados correctamente.', 'ok');

      window.setTimeout(() => {
        document.getElementById('indicatorConfigModalV113')?.classList.add('hidden');
      }, 550);

      const apply = document.getElementById('refreshDashboardButton');
      if (apply && !document.getElementById('performanceDashboardPanel')?.classList.contains('hidden')) {
        apply.click();
      }
    } catch (err) {
      modalMessage113(err.message || 'No se pudieron guardar los indicadores.', 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  function ensureIndicatorButton113() {
    const summary = document.getElementById('dashboardTotalSummaryV19');
    const head = summary?.querySelector('.dashboard-v19-summary-head');
    if (!head) return;

    const existing = document.getElementById('putIndicatorsButtonV113');

    if (!canEditIndicators113()) {
      existing?.remove();
      return;
    }

    if (existing) return;

    const loading = document.getElementById('dashboardSummaryLoadingV112');
    let actions = head.querySelector('.mvl-v113-summary-actions');

    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'mvl-v113-summary-actions';
      head.appendChild(actions);

      if (loading) actions.appendChild(loading);
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'putIndicatorsButtonV113';
    button.className = 'mvl-v113-config-button';
    button.textContent = 'PONER INDICADORES';
    button.addEventListener('click', openConfig113);

    actions.insertBefore(button, loading || null);
  }

  function wrapApi113() {
    if (STATE.apiWrapped || typeof api !== 'function') return;

    STATE.apiWrapped = true;
    const originalApi = api;

    api = async function(action, params = {}) {
      const result = await originalApi(action, params);

      try {
        if (action === 'performanceDashboard' && result?.ok) {
          const indicator = String(params?.indicator || result?.indicator?.key || 'ALL').toUpperCase();
          STATE.dashboards.set(indicator, result);

          if (result.indicatorConfig) STATE.config = result.indicatorConfig;
          window.setTimeout(refreshSemaphores113, 0);
        }

        if (
          (action === 'performanceIndicatorConfigGet' ||
           action === 'performanceIndicatorConfigSave') &&
          result?.ok &&
          result.config
        ) {
          STATE.config = result.config;
        }
      } catch (err) {
        console.warn('[MI VISUAL LIMA V1.13] No se pudo procesar la mejora de indicadores.', err);
      }

      return result;
    };
  }

  function watchDashboard113() {
    const panel = document.getElementById('performanceDashboardPanel');
    if (!panel || panel.dataset.v113Observed === '1') return;

    panel.dataset.v113Observed = '1';

    const run = () => {
      ensureIndicatorButton113();
      refreshSemaphores113();
    };

    run();

    new MutationObserver(run).observe(panel, {
      childList: true,
      subtree: true
    });
  }

  function init113() {
    if (STATE.initialized) return;
    STATE.initialized = true;

    installStyles113();
    watchModuleCards113();
    wrapApi113();
    watchDashboard113();

    const bodyObserver = new MutationObserver(() => {
      watchModuleCards113();
      watchDashboard113();
      ensureIndicatorButton113();
    });

    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.info('[MI VISUAL LIMA] Frontend V1.13: inicio simplificado + metas y semáforos editables.');
  }

  function waitForCore113(attempt = 0) {
    if (typeof api === 'function' && document.getElementById('homeView')) {
      init113();
      return;
    }

    if (attempt > 240) {
      console.error('[MI VISUAL LIMA V1.13] El núcleo V1.12 no terminó de cargar.');
      return;
    }

    window.setTimeout(() => waitForCore113(attempt + 1), 50);
  }

  const core = document.createElement('script');
  core.src = MVL_V112;
  core.async = false;
  core.onload = () => waitForCore113(0);
  core.onerror = () => {
    const loaderText = document.getElementById('loaderText');
    if (loaderText) {
      loaderText.textContent = 'No se pudo cargar la versión anterior. Verifica la conexión.';
    }
    console.error('[MI VISUAL LIMA V1.13] No se pudo cargar Frontend V1.12.');
  };

  document.head.appendChild(core);
})();
