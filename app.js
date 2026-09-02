/**
 * MI VISUAL LIMA - V2.17.0
 * Dashboard detalle + Validación Técnica amigable + VTR/GAR directo WIN + Mapa estable.
 *
 * Cargador incremental:
 * - Conserva intacto app-core-v2131.js.
 * - Mantiene timeout extendido para acciones pesadas.
 * - Carga VTR/GAR.
 * - Carga detalle uniforme del Dashboard.
 * - Carga Validación Técnica amigable.
 * - Conecta su pestaña VTR/GAR directamente a la gestión derivada de MAPA_ORDENES.
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

  function cargarVtrGarDirectoV217() {
    if (document.querySelector('script[data-mvl-validation-vtrgar-direct-v217]')) return;
    const ext = document.createElement('script');
    ext.src = './validation-vtrgar-direct-v217.js?v=2170';
    ext.async = false;
    ext.dataset.mvlValidationVtrgarDirectV217 = '1';
    ext.onload = () => console.info('[MI VISUAL LIMA] V2.17.0: VTR/GAR directo desde WIN activo.');
    ext.onerror = () => console.warn('[MI VISUAL LIMA] V2.17.0: no se pudo cargar VTR/GAR directo; Validación Técnica continúa con V2.16.');
    document.head.appendChild(ext);
  }

  function cargarValidacionAmigableV216() {
    if (document.querySelector('script[data-mvl-validation-friendly-v216]')) {
      cargarVtrGarDirectoV217();
      return;
    }
    const val = document.createElement('script');
    val.src = './validation-friendly-v216.js?v=2160';
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
    vg.src = './vtr-gar-lima-v2141.js?v=2142';
    vg.async = false;
    vg.dataset.mvlVtrgarV2141 = '1';
    vg.onload = () => {
      console.info('[MI VISUAL LIMA] V2.17.0: capa VTR/GAR preparada.');
      cargarDashboardDetallesV215();
    };
    vg.onerror = () => {
      console.warn('[MI VISUAL LIMA] V2.17.0: no se pudo cargar la capa VTR/GAR; la APP continúa.');
      cargarDashboardDetallesV215();
    };
    document.head.appendChild(vg);
  }

  const script = document.createElement('script');
  script.src = './app-core-v2131.js?v=2136';
  script.async = false;
  script.onload = () => {
    console.info('[MI VISUAL LIMA] V2.17.0: núcleo estable cargado.');
    cargarVtrGarV2141();
  };
  script.onerror = () => {
    console.error('[MI VISUAL LIMA] No se pudo cargar app-core-v2131.js');
    const el = document.getElementById('loginMessage');
    if (el) el.textContent = 'No se pudo cargar la aplicación. Actualiza la página.';
  };
  document.head.appendChild(script);
})();
