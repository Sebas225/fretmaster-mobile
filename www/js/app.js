/**
 * @fileoverview Controlador principal de FretMaster & Keys Studio.
 * Coordina interacciones de usuario, reproducción de audio y renderizado de vistas.
 */
'use strict';

window.FM = window.FM || {};

(function initApp(FM) {
  const { OPEN_MIDI, TOTAL_FRETS } = FM.constants;
  const { state, recomputeChordVoicings, getActiveModel } = FM.store;
  const { renderFretboard, centerActiveFretboardPosition } = FM.fretboardView;
  const { renderPiano } = FM.pianoView;
  const {
    renderRootButtons,
    renderQualityButtons,
    renderVoicingCardsStrip,
    updateLiveBanner,
    syncButtonStates
  } = FM.controlsView;
  const { triggerHaptic, bindPlatformIntegrations } = FM.platform;
  const audio = FM.audio;

  function resetChordFilters() {
    state.voicingType = 'all';
    state.stringSet = 'all';
    state.inversionFilter = 'all';
    recomputeChordVoicings(true);
    renderAll();
  }

  function renderAll() {
    syncButtonStates();
    renderRootButtons();
    renderQualityButtons();
    if (state.mode === 'chords') {
      renderVoicingCardsStrip(resetChordFilters);
    }
    const model = getActiveModel();
    updateLiveBanner(model);
    renderFretboard(model);
    renderPiano(model);
  }

  function flashNoteVisual(midi, strIndex, fret) {
    if (typeof strIndex === 'number' && typeof fret === 'number') {
      document.querySelectorAll(`[data-dot-id="s${strIndex}-f${fret}"]`).forEach((el) => {
        el.classList.remove('note-playing');
        void el.offsetWidth;
        el.classList.add('note-playing');
      });
    }
    document.querySelectorAll(`[data-piano-midi="${midi}"]`).forEach((el) => {
      el.classList.add('ring-2', 'ring-amber-400');
      audio.schedule(() => el.classList.remove('ring-2', 'ring-amber-400'), 340);
    });
  }

  function playCurrentSelection(asArpeggio = false) {
    audio.clearScheduled();
    const model = getActiveModel();
    const activeInst = state.instrument === 'piano' ? 'piano' : 'guitar';

    if (state.mode === 'scales') {
      const seq = asArpeggio ? [...model.scaleData.playSequence].reverse() : model.scaleData.playSequence;
      seq.forEach((item, idx) => {
        audio.schedule(() => {
          audio.playNote(item.midi, { instrument: activeInst, volume: state.volume, muted: state.muted, durationSec: 0.55 });
          flashNoteVisual(item.midi, item.s, item.fret);
        }, idx * 145);
      });
      return;
    }

    const notes = model.pianoMidis;
    if (!notes || notes.length === 0) return;

    const stepMs = asArpeggio ? 165 : (state.instrument === 'piano' ? 12 : 38);
    notes.forEach((n, idx) => {
      audio.schedule(() => {
        audio.playNote(n.midi, { instrument: activeInst, volume: state.volume, muted: state.muted, durationSec: 1.65 });
        flashNoteVisual(n.midi, n.s, n.fret);
      }, idx * stepMs);
    });
  }

  function transferCurrentChordToDetector() {
    const model = getActiveModel();
    state.freeNotes.clear();
    model.pianoMidis.forEach((item) => {
      if (typeof item.s === 'number' && typeof item.fret === 'number') {
        state.freeNotes.set(`g:${item.s}:${item.fret}`, {
          midi: item.midi, s: item.s, fret: item.fret, source: 'guitar'
        });
      } else {
        state.freeNotes.set(`p:${item.midi}`, {
          midi: item.midi, s: null, fret: null, source: 'piano'
        });
      }
    });
    state.mode = 'detector';
    renderAll();
  }

  function findPlayableGuitarMatchForMidi(midi) {
    for (let s = 0; s < 6; s++) {
      const f = midi - OPEN_MIDI[s];
      if (f >= 0 && f <= TOTAL_FRETS) {
        const occupied = Array.from(state.freeNotes.values()).some((n) => n.source === 'guitar' && n.s === s);
        if (!occupied) return { s, fret: f };
      }
    }
    return null;
  }

  function handleFretClick(s, fret, midi) {
    triggerHaptic();
    audio.playNote(midi, { instrument: 'guitar', volume: state.volume, muted: state.muted, durationSec: 1.35 });

    if (state.mode === 'chords') {
      const model = getActiveModel();
      if (model.dotMap.has(`${s}-${fret}`)) {
        flashNoteVisual(midi, s, fret);
        return;
      }
      transferCurrentChordToDetector();
    }

    if (state.mode === 'detector') {
      const key = `g:${s}:${fret}`;
      if (state.freeNotes.has(key)) {
        state.freeNotes.delete(key);
      } else {
        if (state.singleNotePerString) {
          for (const [k, val] of state.freeNotes.entries()) {
            if (val.source === 'guitar' && val.s === s) state.freeNotes.delete(k);
          }
        }
        state.freeNotes.set(key, { midi, s, fret, source: 'guitar' });
      }
      renderAll();
    } else {
      flashNoteVisual(midi, s, fret);
    }
  }

  function handlePianoKeyClick(midi) {
    triggerHaptic();
    audio.playNote(midi, { instrument: 'piano', volume: state.volume, muted: state.muted, durationSec: 1.35 });

    if (state.mode === 'chords') {
      const model = getActiveModel();
      if (model.pianoMidis.some((item) => item.midi === midi)) {
        flashNoteVisual(midi, null, null);
        return;
      }
      transferCurrentChordToDetector();
    }

    if (state.mode === 'detector') {
      let removed = false;
      for (const [k, val] of state.freeNotes.entries()) {
        if (val.midi === midi) {
          state.freeNotes.delete(k);
          removed = true;
        }
      }
      if (!removed) {
        const gMatch = findPlayableGuitarMatchForMidi(midi);
        if (gMatch) {
          state.freeNotes.set(`g:${gMatch.s}:${gMatch.fret}`, {
            midi, s: gMatch.s, fret: gMatch.fret, source: 'guitar'
          });
        } else {
          state.freeNotes.set(`p:${midi}`, {
            midi, s: null, fret: null, source: 'piano'
          });
        }
      }
      renderAll();
    } else {
      flashNoteVisual(midi, null, null);
    }
  }

  function generateRandomChordNotes() {
    state.freeNotes.clear();
    const baseFret = Math.floor(Math.random() * 11);
    const count = 3 + Math.floor(Math.random() * 3);
    const availableStrings = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5).slice(0, count);

    availableStrings.forEach((s) => {
      const f = Math.min(TOTAL_FRETS, baseFret + Math.floor(Math.random() * 4));
      const midi = OPEN_MIDI[s] + f;
      state.freeNotes.set(`g:${s}:${f}`, { midi, s, fret: f, source: 'guitar' });
    });

    renderAll();
    playCurrentSelection(false);
  }

  function dispatchCommand(cmd) {
    if (cmd === 'strum') playCurrentSelection(false);
    else if (cmd === 'arpeggio') playCurrentSelection(true);
    else if (cmd === 'prev') {
      if (state.mode === 'chords' && state.currentVoicings.length > 0) {
        state.selectedVoicingIdx = (state.selectedVoicingIdx - 1 + state.currentVoicings.length) % state.currentVoicings.length;
        renderAll(); centerActiveFretboardPosition(); playCurrentSelection(false);
      } else if (state.mode === 'scales') {
        const order = ['all', '0', '1', '2', '3', '4'];
        state.scaleBox = order[(order.indexOf(state.scaleBox) - 1 + order.length) % order.length];
        renderAll(); centerActiveFretboardPosition();
      }
    } else if (cmd === 'next') {
      if (state.mode === 'chords' && state.currentVoicings.length > 0) {
        state.selectedVoicingIdx = (state.selectedVoicingIdx + 1) % state.currentVoicings.length;
        renderAll(); centerActiveFretboardPosition(); playCurrentSelection(false);
      } else if (state.mode === 'scales') {
        const order = ['all', '0', '1', '2', '3', '4'];
        state.scaleBox = order[(order.indexOf(state.scaleBox) + 1) % order.length];
        renderAll(); centerActiveFretboardPosition();
      }
    } else if (cmd === 'mode-chords') { state.mode = 'chords'; renderAll(); }
    else if (cmd === 'mode-scales') { state.mode = 'scales'; renderAll(); }
    else if (cmd === 'mode-detector') {
      if (state.freeNotes.size === 0 && state.mode === 'chords') transferCurrentChordToDetector();
      else { state.mode = 'detector'; renderAll(); }
    } else if (cmd === 'inst-guitar') { state.instrument = 'guitar'; renderAll(); }
    else if (cmd === 'inst-piano') { state.instrument = 'piano'; renderAll(); }
    else if (cmd === 'inst-both') { state.instrument = 'both'; renderAll(); }
    else if (cmd === 'label-note') { state.labelMode = 'note'; renderAll(); }
    else if (cmd === 'label-interval') { state.labelMode = 'interval'; renderAll(); }
    else if (cmd === 'label-finger') { state.labelMode = 'finger'; renderAll(); }
    else if (cmd === 'toggle-mute') {
      state.muted = !state.muted;
      if (state.muted) audio.clearScheduled();
      syncButtonStates();
    } else if (cmd === 'toggle-vertical') {
      state.userLockedNeckOrientation = true;
      state.neckVertical = !state.neckVertical;
      renderAll();
      setTimeout(centerActiveFretboardPosition, 40);
    }
  }

  function bindDomEvents() {
    document.addEventListener('click', (e) => {
      const instBtn = e.target.closest('.inst-btn');
      if (instBtn) { state.instrument = instBtn.dataset.instrument; renderAll(); return; }

      const labelBtn = e.target.closest('.labelmode-btn');
      if (labelBtn) { state.labelMode = labelBtn.dataset.labelmode; renderAll(); return; }

      const modeBtn = e.target.closest('.mode-btn');
      if (modeBtn) {
        audio.clearScheduled();
        const nextMode = modeBtn.dataset.mode;
        if (nextMode === 'detector' && state.freeNotes.size === 0 && state.mode === 'chords') {
          transferCurrentChordToDetector();
          return;
        }
        state.mode = nextMode;
        renderAll();
        return;
      }

      const crootBtn = e.target.closest('.croot-btn');
      if (crootBtn) {
        state.chordRoot = parseInt(crootBtn.dataset.croot, 10);
        recomputeChordVoicings(true); renderAll(); playCurrentSelection(false);
        return;
      }

      const srootBtn = e.target.closest('.sroot-btn');
      if (srootBtn) { state.scaleRoot = parseInt(srootBtn.dataset.sroot, 10); renderAll(); return; }

      const qgroupBtn = e.target.closest('.qgroup-btn');
      if (qgroupBtn) {
        state.qualityGroup = qgroupBtn.dataset.qgroup;
        renderQualityButtons(); syncButtonStates();
        return;
      }

      const qBtn = e.target.closest('.quality-btn');
      if (qBtn) {
        state.chordQualityId = qBtn.dataset.qid;
        recomputeChordVoicings(true); renderAll(); playCurrentSelection(false);
        return;
      }

      const vtypeBtn = e.target.closest('.vtype-btn');
      if (vtypeBtn) {
        state.voicingType = vtypeBtn.dataset.vtype;
        if (state.voicingType === 'triad' && !['all', '1-2-3', '2-3-4', '3-4-5', '4-5-6'].includes(state.stringSet)) state.stringSet = 'all';
        else if (state.voicingType === 'drop2' && !['all', '1-2-3-4', '2-3-4-5', '3-4-5-6'].includes(state.stringSet)) state.stringSet = 'all';
        else if (state.voicingType === 'drop3' && !['all', '1-2-3-5', '2-3-4-6'].includes(state.stringSet)) state.stringSet = 'all';
        else if (state.voicingType === 'box' && state.stringSet !== 'all' && state.stringSet !== 'box') state.stringSet = 'all';
        recomputeChordVoicings(true); renderAll(); playCurrentSelection(false);
        return;
      }

      const strsetBtn = e.target.closest('.strset-btn');
      if (strsetBtn) {
        state.stringSet = strsetBtn.dataset.strset;
        if (['1-2-3', '2-3-4', '3-4-5', '4-5-6'].includes(state.stringSet) && !['all', 'triad'].includes(state.voicingType)) state.voicingType = 'all';
        else if (['1-2-3-4', '2-3-4-5', '3-4-5-6'].includes(state.stringSet) && !['all', 'drop2'].includes(state.voicingType)) state.voicingType = 'all';
        else if (['1-2-3-5', '2-3-4-6'].includes(state.stringSet) && !['all', 'drop3'].includes(state.voicingType)) state.voicingType = 'all';
        else if (state.stringSet === 'box' && !['all', 'box'].includes(state.voicingType)) state.voicingType = 'box';
        recomputeChordVoicings(true); renderAll(); playCurrentSelection(false);
        return;
      }

      const invBtn = e.target.closest('.inv-btn');
      if (invBtn) {
        state.inversionFilter = invBtn.dataset.inv;
        recomputeChordVoicings(true); renderAll(); playCurrentSelection(false);
        return;
      }

      const vcardBtn = e.target.closest('.vcard-btn');
      if (vcardBtn) {
        state.selectedVoicingIdx = parseInt(vcardBtn.dataset.vcard, 10);
        renderAll(); centerActiveFretboardPosition(); playCurrentSelection(false);
        return;
      }

      const stypeBtn = e.target.closest('.scaletype-btn');
      if (stypeBtn) { state.scaleType = stypeBtn.dataset.scaletype; renderAll(); return; }

      const sboxBtn = e.target.closest('.scalebox-btn');
      if (sboxBtn) {
        state.scaleBox = sboxBtn.dataset.box;
        renderAll(); centerActiveFretboardPosition();
        return;
      }

      const fretCell = e.target.closest('[data-fret-cell]');
      if (fretCell) {
        handleFretClick(
          parseInt(fretCell.dataset.str, 10),
          parseInt(fretCell.dataset.fret, 10),
          parseInt(fretCell.dataset.midi, 10)
        );
        return;
      }

      const pianoKey = e.target.closest('[data-piano-key]');
      if (pianoKey) {
        handlePianoKeyClick(parseInt(pianoKey.dataset.pianoMidi, 10));
      }
    });

    document.getElementById('btnAccidental').addEventListener('click', () => {
      const order = ['auto', 'sharp', 'flat'];
      state.accidentalPref = order[(order.indexOf(state.accidentalPref) + 1) % order.length];
      renderAll();
    });

    document.getElementById('btnMuteDesktop').addEventListener('click', () => dispatchCommand('toggle-mute'));
    document.getElementById('btnMuteMobile').addEventListener('click', () => dispatchCommand('toggle-mute'));

    document.getElementById('volumeSlider').addEventListener('input', (e) => {
      state.volume = parseInt(e.target.value, 10) / 100;
      if (state.volume > 0 && state.muted) {
        state.muted = false;
        syncButtonStates();
      }
    });

    document.getElementById('btnPlayStrum').addEventListener('click', () => playCurrentSelection(false));
    document.getElementById('btnPlayArpeggio').addEventListener('click', () => playCurrentSelection(true));
    document.getElementById('btnPrevVoicing').addEventListener('click', () => dispatchCommand('prev'));
    document.getElementById('btnNextVoicing').addEventListener('click', () => dispatchCommand('next'));

    document.getElementById('btnToggleBlueNote').addEventListener('click', () => {
      state.scaleBlueNote = !state.scaleBlueNote;
      renderAll();
    });

    document.getElementById('btnScaleOctave').addEventListener('click', () => {
      const order = ['both', 'low', 'high'];
      state.scaleOctaveMode = order[(order.indexOf(state.scaleOctaveMode) + 1) % order.length];
      renderAll(); centerActiveFretboardPosition();
    });

    document.getElementById('btnTransferToDetector').addEventListener('click', transferCurrentChordToDetector);

    document.getElementById('btnGuitarPolyMode').addEventListener('click', () => {
      state.singleNotePerString = !state.singleNotePerString;
      if (state.singleNotePerString) {
        const seenStr = new Set();
        const entries = Array.from(state.freeNotes.entries()).reverse();
        state.freeNotes.clear();
        entries.forEach(([k, val]) => {
          if (val.source === 'guitar') {
            if (!seenStr.has(val.s)) {
              seenStr.add(val.s);
              state.freeNotes.set(k, val);
            }
          } else {
            state.freeNotes.set(k, val);
          }
        });
      }
      renderAll();
    });

    document.getElementById('btnRandomNotes').addEventListener('click', generateRandomChordNotes);
    document.getElementById('btnClearDetector').addEventListener('click', () => {
      state.freeNotes.clear();
      renderAll();
    });

    document.getElementById('btnCenterPosition').addEventListener('click', centerActiveFretboardPosition);
    document.getElementById('btnNeckOrientation').addEventListener('click', () => dispatchCommand('toggle-vertical'));
    document.getElementById('btnPianoRangeToggle').addEventListener('click', () => {
      state.pianoFullRange = !state.pianoFullRange;
      renderAll();
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth < 520) {
      state.neckVertical = true;
    }
    recomputeChordVoicings(true);
    bindDomEvents();
    bindPlatformIntegrations(dispatchCommand, renderAll);
    renderAll();
  });
})(window.FM);
