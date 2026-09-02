/**
 * MI VISUAL LIMA - V2.15.0 DASHBOARD DETALLE + MAPA / VTR-GAR ESTABLE
 * Cargador mínimo: conserva intacto app-core-v2131.js.
 *
 * V2.15.0 incremental:
 * - Mantiene timeout extendido para Mapa y VTR/GAR.
 * - Añade timeout extendido para performanceIndicatorDetail.
 * - Carga detalle unificado del Dashboard:
 *   Dashboard -> cuadrilla -> día/orden/caso.
 * - No modifica app-core-v2131.js ni la lógica de negocio existente.
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

    // Estas acciones pueden leer/procesar miles de filas en Google Sheets.
    // Para ellas usamos hasta 7 minutos e ignoramos el signal corto del núcleo.
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 420000);

    return nativeFetch(input, { ...init, signal: controller.signal })
      .finally(() => window.clearTimeout(timer));
  };

  function cargarDashboardDetallesV215() {
    if (document.querySelector('script[data-mvl-dashboard-detail-v215]')) return;
    const detail = document.createElement('script');
    detail.src = './dashboard-indicator-detail-v215.js?v=2150';
    detail.async = false;
    detail.dataset.mvlDashboardDetailV215 = '1';
    detail.onload = () => console.info('[MI VISUAL LIMA] V2.15.0: detalle uniforme del Dashboard activo.');
    detail.onerror = () => console.warn('[MI VISUAL LIMA] V2.15.0: no se pudo cargar detalle Dashboard; la APP continúa sin cambios.');
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
      console.info('[MI VISUAL LIMA] V2.15.0: capa VTR/GAR preparada.');
      cargarDashboardDetallesV215();
    };
    vg.onerror = () => {
      console.warn('[MI VISUAL LIMA] V2.15.0: no se pudo cargar la capa VTR/GAR; la APP continúa.');
      cargarDashboardDetallesV215();
    };
    document.head.appendChild(vg);
  }

  const script = document.createElement('script');
  script.src = './app-core-v2131.js?v=2136';
  script.async = false;
  script.onload = () => {
    console.info('[MI VISUAL LIMA] V2.15.0: núcleo estable cargado.');
    cargarVtrGarV2141();
  };
  script.onerror = () => {
    console.error('[MI VISUAL LIMA] No se pudo cargar app-core-v2131.js');
    const el = document.getElementById('loginMessage');
    if (el) el.textContent = 'No se pudo cargar la aplicación. Actualiza la página.';
  };
  document.head.appendChild(script);
})();