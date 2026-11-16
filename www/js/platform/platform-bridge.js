/**
 * @fileoverview Adaptador multiplataforma: Atajos de teclado Mac/Windows, puente IPC Electron,
 * respuesta háptica táctil móvil, auto-rotación responsiva e instalación PWA.
 */
'use strict';

window.FM = window.FM || {};

(function initPlatformBridge(FM) {
  const { state } = FM.store;

  function triggerHaptic() {
    try {
      if (navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(8);
      }
    } catch (_err) {
      // Ignorado en plataformas de escritorio sin soporte de vibración
    }
  }

  function bindPlatformIntegrations(dispatchCommand, onResizeRender) {
    // 1. Atajos de teclado nativos en escritorio (macOS y Windows)
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (e.code === 'Space') { e.preventDefault(); dispatchCommand('strum'); }
      else if (key === 'a') dispatchCommand('arpeggio');
      else if (e.key === 'ArrowLeft') { e.preventDefault(); dispatchCommand('prev'); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); dispatchCommand('next'); }
      else if (key === '1') dispatchCommand('mode-chords');
      else if (key === '2') dispatchCommand('mode-scales');
      else if (key === '3') dispatchCommand('mode-detector');
      else if (key === 'g') dispatchCommand('inst-guitar');
      else if (key === 'p') dispatchCommand('inst-piano');
      else if (key === 'b') dispatchCommand('inst-both');
      else if (key === 'n') dispatchCommand('label-note');
      else if (key === 'i') dispatchCommand('label-interval');
      else if (key === 'd') dispatchCommand('label-finger');
      else if (key === 'v') dispatchCommand('toggle-vertical');
      else if (key === 'm') dispatchCommand('toggle-mute');
    });

    // 2. Recepción de comandos desde la barra de menús nativa de Electron (macOS / Windows)
    if (window.desktopBridge && typeof window.desktopBridge.onMenuCommand === 'function') {
      window.desktopBridge.onMenuCommand((cmd) => dispatchCommand(cmd));
    }

    // 3. Giro automático móvil (Vertical en retrato, Horizontal 22 trastes en paisaje)
    window.addEventListener('resize', () => {
      if (state.userLockedNeckOrientation) return;
      const isPhonePortrait = window.innerWidth < 560 && window.innerHeight > window.innerWidth;
      if (isPhonePortrait !== state.neckVertical && window.innerWidth < 860) {
        state.neckVertical = isPhonePortrait;
        onResizeRender();
      }
    });

    // 4. Botón inteligente de instalación PWA cuando se abre en navegador compatible
    let deferredInstallPrompt = null;
    const installBtn = document.getElementById('btnInstallAppPrompt');
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (installBtn && !window.desktopBridge) {
        installBtn.classList.remove('hidden');
      }
    });

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        installBtn.classList.add('hidden');
      });
    }
  }

  FM.platform = {
    triggerHaptic,
    bindPlatformIntegrations
  };
})(window.FM);
