/**
 * @fileoverview Funciones puras de teoría musical, enarmonía, frecuencias y digitación ergonómica.
 */
'use strict';

window.FM = window.FM || {};

(function initTheory(FM) {
  const { NOTES_SHARP, NOTES_FLAT, FLAT_KEYS, INTERVAL_NAMES, CHORD_QUALITIES } = FM.constants;

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function useFlatsForRoot(rootPc, accidentalPref) {
    if (accidentalPref === 'sharp') return false;
    if (accidentalPref === 'flat') return true;
    return FLAT_KEYS.has(rootPc);
  }

  function pcName(pc, rootContext = 0, accidentalPref = 'auto') {
    const idx = ((pc % 12) + 12) % 12;
    return useFlatsForRoot(rootContext, accidentalPref) ? NOTES_FLAT[idx] : NOTES_SHARP[idx];
  }

  function midiNoteWithOctave(midi, rootContext = 0, accidentalPref = 'auto') {
    const pc = ((midi % 12) + 12) % 12;
    const oct = Math.floor(midi / 12) - 1;
    return `${pcName(pc, rootContext, accidentalPref)}${oct}`;
  }

  function getChordQuality(id) {
    return CHORD_QUALITIES.find((q) => q.id === id) || CHORD_QUALITIES[0];
  }

  function getIntervalLabel(semitoneFromRoot, chordDef) {
    const semi = ((semitoneFromRoot % 12) + 12) % 12;
    if (chordDef && chordDef.intervalOverride && chordDef.intervalOverride[semi]) {
      return chordDef.intervalOverride[semi];
    }
    return INTERVAL_NAMES[semi] || '1';
  }

  function getRoleColorClasses(semitoneFromRoot, isBlueNote = false) {
    if (isBlueNote) {
      return {
        bg: 'bg-cyan-400 text-slate-950 border-cyan-200 shadow-cyan-400/40',
        hex: '#22d3ee'
      };
    }
    const s = ((semitoneFromRoot % 12) + 12) % 12;
    if (s === 0) {
      return {
        bg: 'bg-amber-500 text-slate-950 border-amber-200 shadow-amber-500/50 ring-2 ring-amber-300/60',
        hex: '#f59e0b'
      };
    }
    if (s === 3 || s === 4) {
      return {
        bg: 'bg-emerald-500 text-slate-950 border-emerald-200 shadow-emerald-500/40',
        hex: '#10b981'
      };
    }
    if (s === 6 || s === 7 || s === 8) {
      return {
        bg: 'bg-blue-500 text-white border-blue-200 shadow-blue-500/40',
        hex: '#3b82f6'
      };
    }
    return {
      bg: 'bg-purple-500 text-white border-purple-200 shadow-purple-500/40',
      hex: '#a855f7'
    };
  }

  /**
   * Calcula los dedos sugeridos (1..4, 0 al aire) y detecta cejillas automáticamente.
   * @param {Array<number|null>} frets Arreglo de 6 cuerdas (s=0..5).
   */
  function computeGuitarFingers(frets) {
    const fingers = [null, null, null, null, null, null];
    const fretted = [];
    for (let s = 0; s < 6; s++) {
      if (frets[s] === 0) {
        fingers[s] = '0';
      } else if (typeof frets[s] === 'number' && frets[s] > 0) {
        fretted.push({ s, f: frets[s] });
      }
    }
    if (fretted.length === 0) return { fingers, barre: null };

    const minFret = Math.min(...fretted.map((x) => x.f));
    const atMin = fretted.filter((x) => x.f === minFret);
    let barre = null;

    if (atMin.length >= 2) {
      const lowStr = Math.min(...atMin.map((x) => x.s));
      const highStr = Math.max(...atMin.map((x) => x.s));
      let validBarre = true;
      for (let s = lowStr; s <= highStr; s++) {
        if (frets[s] !== null && frets[s] < minFret) {
          validBarre = false;
          break;
        }
      }
      if (validBarre && (fretted.length > 4 || atMin.length >= 3 || (highStr - lowStr >= 2 && fretted.length >= 4))) {
        barre = { fret: minFret, fromStr: lowStr, toStr: highStr };
        atMin.forEach((item) => { fingers[item.s] = '1'; });
      }
    }

    const remaining = fretted
      .filter((item) => fingers[item.s] === null)
      .sort((a, b) => (a.f - b.f) || (a.s - b.s));

    if (barre) {
      let nextFinger = 2;
      for (let i = 0; i < remaining.length; i++) {
        const item = remaining[i];
        const offset = item.f - minFret;
        let fNum = Math.max(nextFinger, Math.min(4, 1 + offset));
        if (remaining.length - i > 4 - fNum + 1) fNum = nextFinger;
        fingers[item.s] = String(Math.min(4, fNum));
        nextFinger = Math.min(4, fNum + 1);
      }
    } else if (remaining.length <= 4) {
      for (let i = 0; i < remaining.length; i++) {
        const item = remaining[i];
        const rel = item.f - minFret;
        let candidate = Math.min(4, Math.max(i + 1, rel + 1));
        const maxAllowed = 4 - (remaining.length - 1 - i);
        candidate = Math.min(candidate, maxAllowed);
        fingers[item.s] = String(Math.max(1, candidate));
      }
    } else {
      remaining.forEach((item, idx) => {
        fingers[item.s] = String(Math.min(4, idx + 1));
      });
    }

    return { fingers, barre };
  }

  FM.theory = {
    midiToFreq,
    useFlatsForRoot,
    pcName,
    midiNoteWithOctave,
    getChordQuality,
    getIntervalLabel,
    getRoleColorClasses,
    computeGuitarFingers
  };
})(window.FM);
