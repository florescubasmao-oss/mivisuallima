/**
 * MI VISUAL LIMA - V2.13.6 MAPA/SLA CARGA ESTABLE
 * Cargador mínimo: conserva intacto el app.js anterior en app-core-v2131.js
 * y amplía únicamente la espera de mapImport/mapRebuildSla.
 *
 * V2.14.1 incremental:
 * - Después del núcleo carga la capa VTR/GAR Lima.
 * - La capa VTR/GAR se auto-desactiva si el backend V2.14 aún no está desplegado.
 * - No modifica app-core-v2131.js.
 */
(() => {
  'use strict';

  const nativeFetch = window.fetch.bind(window);

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

    if (actionName !== 'mapImport' && actionName !== 'mapRebuildSla') {
      return nativeFetch(input, init);
    }

    // Mapa/SLA procesa Excel + MAPA_ORDENES + CTO + reconstrucción SLA.
    // El app anterior cortaba la conexión a los 60 s. Para estas dos acciones
    // usamos hasta 7 minutos e ignoramos el signal corto creado por esa capa.
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 420000);

    return nativeFetch(input, { ...init, signal: controller.signal })
      .finally(() => window.clearTimeout(timer));
  };

  function cargarVtrGarV2141() {
    if (document.querySelector('script[data-mvl-vtrgar-v2141]')) return;
    const vg = document.createElement('script');
    vg.src = './vtr-gar-lima-v2141.js?v=2141';
    vg.async = false;
    vg.dataset.mvlVtrgarV2141 = '1';
    vg.onload = () => console.info('[MI VISUAL LIMA] V2.14.1: capa VTR/GAR preparada.');
    vg.onerror = () => console.warn('[MI VISUAL LIMA] V2.14.1: no se pudo cargar la capa VTR/GAR; la APP continúa sin cambios.');
    document.head.appendChild(vg);
  }

  const script = document.createElement('script');
  script.src = './app-core-v2131.js?v=2136';
  script.async = false;
  script.onload = () => {
    console.info('[MI VISUAL LIMA] V2.13.6: timeout estable Mapa/SLA activo.');
    cargarVtrGarV2141();
  };
  script.onerror = () => {
    console.error('[MI VISUAL LIMA] No se pudo cargar app-core-v2131.js');
    const el = document.getElementById('loginMessage');
    if (el) el.textContent = 'No se pudo cargar la aplicación. Actualiza la página.';
  };
  document.head.appendChild(script);
})();