/* =========================================================
   MI VISUAL LIMA - V2.19.0
   VALIDACION TECNICA · CICLO DE VIDA ROBUSTO

   Problema corregido:
   - V2.16/V2.18 dejaban de esperar la creación de Validación Técnica
     después de ~36-40 s desde abrir la APP.
   - Si el usuario entraba al módulo más tarde, volvía a verse la UI antigua.

   Solución:
   - Observa permanentemente el DOM.
   - Cuando aparece validationViewV205, asegura la UI amigable V2.16.
   - Cuando aparece el shell amigable, asegura VTR/GAR estable V2.18.
   - Si el núcleo reconstruye la vista, vuelve a aplicar las capas.
   - No toca backend ni datos.
========================================================= */
(() => {
  'use strict';
  if (window.__MVL_VALIDATION_LIFECYCLE_V219__) return;
  window.__MVL_VALIDATION_LIFECYCLE_V219__ = true;

  const state = {
    friendlyLoading:false,
    stableLoading:false,
    lastView:null,
    timer:0
  };

  function injectFriendly() {
    const view = document.getElementById('validationViewV205');
    if (!view) return;
    if (document.getElementById('mvlV216ValidationShell')) return;
    if (state.friendlyLoading) return;

    state.friendlyLoading = true;
    window.__MVL_VALIDATION_FRIENDLY_V216__ = false;

    const s = document.createElement('script');
    s.src = './validation-friendly-v216.js?v=2190-' + Date.now();
    s.async = false;
    s.dataset.mvlV219FriendlyReload = '1';
    s.onload = () => {
      state.friendlyLoading = false;
      window.setTimeout(ensure, 60);
    };
    s.onerror = () => {
      state.friendlyLoading = false;
      console.warn('[MI VISUAL LIMA V2.19] No se pudo reactivar Validación Técnica amigable.');
    };
    document.head.appendChild(s);
  }

  function injectStable(shell) {
    if (!shell) return;
    if (shell.dataset.mvlV219Stable === '1') return;
    if (state.stableLoading) return;

    shell.dataset.mvlV219Stable = '1';
    state.stableLoading = true;
    window.__MVL_VTRGAR_STABLE_V218__ = false;

    const s = document.createElement('script');
    s.src = './validation-vtrgar-stable-v218.js?v=2190-' + Date.now();
    s.async = false;
    s.dataset.mvlV219StableReload = '1';
    s.onload = () => {
      state.stableLoading = false;
    };
    s.onerror = () => {
      state.stableLoading = false;
      shell.dataset.mvlV219Stable = '0';
      console.warn('[MI VISUAL LIMA V2.19] No se pudo reactivar VTR/GAR estable.');
    };
    document.head.appendChild(s);
  }

  function ensure() {
    const view = document.getElementById('validationViewV205');
    if (!view) return;

    if (state.lastView !== view) {
      state.lastView = view;
    }

    const shell = document.getElementById('mvlV216ValidationShell');
    if (!shell) {
      injectFriendly();
      return;
    }

    injectStable(shell);
  }

  function schedule(delay=40) {
    window.clearTimeout(state.timer);
    state.timer = window.setTimeout(ensure, delay);
  }

  const observer = new MutationObserver(() => schedule(40));

  function start() {
    const root = document.body || document.documentElement;
    if (!root) {
      window.setTimeout(start, 50);
      return;
    }
    observer.observe(root, { childList:true, subtree:true });
    document.addEventListener('click', () => schedule(80), true);
    document.addEventListener('mvl:core-ready', () => schedule(0));
    window.setInterval(ensure, 1500);
    ensure();
    console.info('[MI VISUAL LIMA] V2.19.0: ciclo de vida de Validación Técnica activo.');
  }

  start();
})();
