/**
 * MI VISUAL LIMA - V2.13.6 MAPA/SLA CARGA ESTABLE
 * Cargador mínimo: conserva intacto el app.js anterior en app-core-v2131.js
 * y amplía únicamente la espera de mapImport/mapRebuildSla.
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

  const script = document.createElement('script');
  script.src = './app-core-v2131.js?v=2136';
  script.async = false;
  script.onload = () => console.info('[MI VISUAL LIMA] V2.13.6: timeout estable Mapa/SLA activo.');
  script.onerror = () => {
    console.error('[MI VISUAL LIMA] No se pudo cargar app-core-v2131.js');
    const el = document.getElementById('loginMessage');
    if (el) el.textContent = 'No se pudo cargar la aplicación. Actualiza la página.';
  };
  document.head.appendChild(script);
})();
