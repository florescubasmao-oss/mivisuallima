/**
 * MI VISUAL LIMA - V2.14.3 TIMEOUT ESTABLE MAPA / VTR-GAR
 * Cargador mínimo: conserva intacto el app.js anterior en app-core-v2131.js
 * y amplía únicamente la espera de acciones pesadas sobre Apps Script.
 *
 * V2.14.3 incremental:
 * - Mantiene mapImport/mapRebuildSla con espera extendida.
 * - Añade mapData y lecturas/sincronización VTR/GAR para evitar el aborto
 *   de 60 s del núcleo cuando MAPA_ORDENES tiene muchas filas.
 * - No modifica app-core-v2131.js ni la lógica de negocio.
 */
(() => {
  'use strict';

  const nativeFetch = window.fetch.bind(window);
  const LONG_ACTIONS = new Set([
    'mapImport',
    'mapRebuildSla',
    'mapData',
    'vtrGarManagementList',
    'vtrGarSync'
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
    // El núcleo anterior corta la conexión aproximadamente a los 60 s.
    // Para ellas usamos hasta 7 minutos e ignoramos ese signal corto.
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 420000);

    return nativeFetch(input, { ...init, signal: controller.signal })
      .finally(() => window.clearTimeout(timer));
  };

  function cargarVtrGarV2141() {
    if (document.querySelector('script[data-mvl-vtrgar-v2141]')) return;
    const vg = document.createElement('script');
    vg.src = './vtr-gar-lima-v2141.js?v=2142';
    vg.async = false;
    vg.dataset.mvlVtrgarV2141 = '1';
    vg.onload = () => console.info('[MI VISUAL LIMA] V2.14.3: capa VTR/GAR preparada.');
    vg.onerror = () => console.warn('[MI VISUAL LIMA] V2.14.3: no se pudo cargar la capa VTR/GAR; la APP continúa sin cambios.');
    document.head.appendChild(vg);
  }

  const script = document.createElement('script');
  script.src = './app-core-v2131.js?v=2136';
  script.async = false;
  script.onload = () => {
    console.info('[MI VISUAL LIMA] V2.14.3: timeout estable Mapa/VTR-GAR activo.');
    cargarVtrGarV2141();
  };
  script.onerror = () => {
    console.error('[MI VISUAL LIMA] No se pudo cargar app-core-v2131.js');
    const el = document.getElementById('loginMessage');
    if (el) el.textContent = 'No se pudo cargar la aplicación. Actualiza la página.';
  };
  document.head.appendChild(script);
})();