/**
 * MI VISUAL LIMA - V2.20.0
 * Dashboard detalle + Validación Técnica amigable persistente + VTR/GAR directo WIN + gestión directa.
 *
 * Cargador incremental:
 * - Conserva intacto app-core-v2131.js.
 * - Mantiene timeout extendido para acciones pesadas.
 * - Activa observador permanente para Validación Técnica.
 * - Fija contador VTR/GAR con pendientes WIN reales.
 * - Gestiona responsabilidad VTR/GAR sin depender del modal antiguo.
 */
(() => {
  'use strict';

  const nativeFetch = window.fetch.bind(window);
  const LONG_ACTIONS = new Set([
    'mapImport',
    'mapRebuildSla',
    'mapData',
    'vtrGarManagementList',
    'vtrGarSync',
    'vtrGarRepair',
    'vtrGarDecision',
    'performanceIndicatorDetail'
  ]);

  window.fetch = function(input, init = {}) {
    const url = typeof input === 'string' ? input : String(input?.url || input || '');
    let actionName = '';

    if (/script\.google\.com\/macros\/s\//i.test(url)) {
      try {
        if (init?.body instanceof URLSearchParams) {
          actionName = String(init.body.get('action') || '');
        } else if (typeof init?.body === 'string') {
          actionName = String(new URLSearchParams(init.body).get('action') || '');
        }
      } catch (_) {}
    }

    if (!LONG_ACTIONS.has(actionName)) {
      return nativeFetch(input, init);
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 420000);

    return nativeFetch(input, { ...init, signal: controller.signal })
      .finally(() => window.clearTimeout(timer));
  };

  function cargarAccionesV220() {
    if (document.querySelector('script[data-mvl-validation-vtrgar-actions-v220]')) return;
    const s = document.createElement('script');
    s.src = './validation-vtrgar-actions-v220.js?v=2200';
    s.async = false;
    s.dataset.mvlValidationVtrgarActionsV220 = '1';
    s.onload = () => console.info('[MI VISUAL LIMA] V2.20.0: contador y gestión directa VTR/GAR activos.');
    s.onerror = () => console.warn('[MI VISUAL LIMA] V2.20.0: no se pudo cargar la gestión directa VTR/GAR.');
    document.head.appendChild(s);
  }

  function cargarLifecycleV219() {
    if (document.querySelector('script[data-mvl-validation-lifecycle-v219]')) return;
    const life = document.createElement('script');
    life.src = './validation-lifecycle-v219.js?v=2190';
    life.async = false;
    life.dataset.mvlValidationLifecycleV219 = '1';
    life.onload = () => console.info('[MI VISUAL LIMA] V2.19.0: ciclo persistente de Validación Técnica activo.');
    life.onerror = () => console.warn('[MI VISUAL LIMA] V2.19.0: no se pudo cargar el ciclo persistente de Validación Técnica.');
    document.head.appendChild(life);
  }

  function cargarVtrGarEstableV218() {
    if (document.querySelector('script[data-mvl-validation-vtrgar-stable-v218]')) return;
    const stable = document.createElement('script');
    stable.src = './validation-vtrgar-stable-v218.js?v=2180';
    stable.async = false;
    stable.dataset.mvlValidationVtrgarStableV218 = '1';
    stable.onload = () => console.info('[MI VISUAL LIMA] V2.18.0: VTR/GAR estable directo WIN activo.');
    stable.onerror = () => console.warn('[MI VISUAL LIMA] V2.18.0: no se pudo cargar el blindaje VTR/GAR.');
    document.head.appendChild(stable);
  }

  function cargarVtrGarDirectoV217() {
    if (document.querySelector('script[data-mvl-validation-vtrgar-direct-v217]')) {
      cargarVtrGarEstableV218();
      return;
    }
    const ext = document.createElement('script');
    ext.src = './validation-vtrgar-direct-v217.js?v=2171';
    ext.async = false;
    ext.dataset.mvlValidationVtrgarDirectV217 = '1';
    ext.onload = () => {
      console.info('[MI VISUAL LIMA] V2.17.0: VTR/GAR directo desde WIN activo.');
      cargarVtrGarEstableV218();
    };
    ext.onerror = () => {
      console.warn('[MI VISUAL LIMA] V2.17.0: no se pudo cargar VTR/GAR directo; se intenta V2.18.');
      cargarVtrGarEstableV218();
    };
    document.head.appendChild(ext);
  }

  function cargarValidacionAmigableV216() {
    if (document.querySelector('script[data-mvl-validation-friendly-v216]')) {
      cargarVtrGarDirectoV217();
      return;
    }
    const val = document.createElement('script');
    val.src = './validation-friendly-v216.js?v=2161';
    val.async = false;
    val.dataset.mvlValidationFriendlyV216 = '1';
    val.onload = () => {
      console.info('[MI VISUAL LIMA] V2.16.0: Validación Técnica amigable activa.');
      cargarVtrGarDirectoV217();
    };
    val.onerror = () => console.warn('[MI VISUAL LIMA] V2.16.0: no se pudo cargar la mejora visual de Validación Técnica; la APP continúa con la vista anterior.');
    document.head.appendChild(val);
  }

  function cargarDashboardDetallesV215() {
    if (document.querySelector('script[data-mvl-dashboard-detail-v215]')) {
      cargarValidacionAmigableV216();
      return;
    }

    const detail = document.createElement('script');
    detail.src = './dashboard-indicator-detail-v215.js?v=2150';
    detail.async = false;
    detail.dataset.mvlDashboardDetailV215 = '1';
    detail.onload = () => {
      console.info('[MI VISUAL LIMA] V2.15.0: detalle uniforme del Dashboard activo.');
      cargarValidacionAmigableV216();
    };
    detail.onerror = () => {
      console.warn('[MI VISUAL LIMA] V2.15.0: no se pudo cargar detalle Dashboard; la APP continúa.');
      cargarValidacionAmigableV216();
    };
    document.head.appendChild(detail);
  }

  function cargarVtrGarV2141() {
    if (document.querySelector('script[data-mvl-vtrgar-v2141]')) {
      cargarDashboardDetallesV215();
      return;
    }

    const vg = document.createElement('script');
    vg.src = './vtr-gar-lima-v2141.js?v=2143';
    vg.async = false;
    vg.dataset.mvlVtrgarV2141 = '1';
    vg.onload = () => {
      console.info('[MI VISUAL LIMA] V2.20.0: capa VTR/GAR preparada.');
      cargarDashboardDetallesV215();
    };
    vg.onerror = () => {
      console.warn('[MI VISUAL LIMA] V2.20.0: no se pudo cargar la capa VTR/GAR; la APP continúa.');
      cargarDashboardDetallesV215();
    };
    document.head.appendChild(vg);
  }

  // Observación y acciones desde el inicio; funcionan aunque el usuario entre al módulo mucho después.
  cargarLifecycleV219();
  cargarAccionesV220();

  const script = document.createElement('script');
  script.src = './app-core-v2131.js?v=2136';
  script.async = false;
  script.onload = () => {
    console.info('[MI VISUAL LIMA] V2.20.0: núcleo estable cargado.');
    cargarVtrGarV2141();
  };
  script.onerror = () => {
    console.error('[MI VISUAL LIMA] No se pudo cargar app-core-v2131.js');
    const el = document.getElementById('loginMessage');
    if (el) el.textContent = 'No se pudo cargar la aplicación. Actualiza la página.';
  };
  document.head.appendChild(script);
})();