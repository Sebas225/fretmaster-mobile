/**
 * @fileoverview Gestión centralizada del estado de la aplicación y derivación del modelo visual activo.
 */
'use strict';

window.FM = window.FM || {};

(function initStore(FM) {
  const { OPEN_MIDI } = FM.constants;
  const { getChordQuality, computeGuitarFingers, pcName, getIntervalLabel } = FM.theory;
  const { generateAllVoicings, filterVoicings } = FM.voicings;
  const { computePentatonicData } = FM.scales;
  const { detectHarmonyFromMidis } = FM.detector;

  const state = {
    instrument: 'guitar',
    labelMode: 'note',
    accidentalPref: 'auto',
    mode: 'chords',
    neckVertical: false,
    userLockedNeckOrientation: false,
    pianoFullRange: false,

    muted: false,
    volume: 0.75,

    chordRoot: 0,
    qualityGroup: 'all',
    chordQualityId: 'maj',
    voicingType: 'all',
    stringSet: 'all',
    inversionFilter: 'all',
    selectedVoicingIdx: 0,
    currentVoicings: [],

    scaleRoot: 9,
    scaleType: 'minor',
    scaleBox: 'all',
    scaleBlueNote: false,
    scaleOctaveMode: 'both',

    singleNotePerString: true,
    freeNotes: new Map()
  };

  function recomputeChordVoicings(resetIndex = true) {
    const q = getChordQuality(state.chordQualityId);
    const all = generateAllVoicings(state.chordRoot, q);
    state.currentVoicings = filterVoicings(all, {
      voicingType: state.voicingType,
      stringSet: state.stringSet,
      inversionFilter: state.inversionFilter
    });
    if (resetIndex || state.selectedVoicingIdx >= state.currentVoicings.length) {
      state.selectedVoicingIdx = 0;
    }
  }

  function getActiveModel() {
    if (state.mode === 'chords') {
      const chordDef = getChordQuality(state.chordQualityId);
      const activeVoicing = state.currentVoicings[state.selectedVoicingIdx] || null;
      const dotMap = new Map();
      const mutedStrings = new Set();
      const pianoMidis = [];

      if (activeVoicing) {
        for (let s = 0; s < 6; s++) {
          const f = activeVoicing.frets[s];
          if (f === null) {
            mutedStrings.add(s);
          } else {
            const m = OPEN_MIDI[s] + f;
            const pc = m % 12;
            const semi = (pc - state.chordRoot + 12) % 12;
            dotMap.set(`${s}-${f}`, {
              s, fret: f, midi: m, pc, semi,
              finger: activeVoicing.fingers[s] || '',
              isBlue: false, dimmed: false
            });
            pianoMidis.push({ midi: m, s, fret: f, semi, finger: activeVoicing.fingers[s] || '' });
          }
        }
      } else {
        const baseOct = 48 + state.chordRoot;
        chordDef.intervals.forEach((semi, idx) => {
          pianoMidis.push({ midi: baseOct + semi, s: null, fret: null, semi: semi % 12, finger: String(idx + 1) });
        });
      }

      pianoMidis.sort((a, b) => a.midi - b.midi);
      return {
        dotMap,
        barre: activeVoicing ? activeVoicing.barre : null,
        mutedStrings,
        pianoMidis,
        rootPc: state.chordRoot,
        chordDef,
        activeVoicing
      };
    }

    if (state.mode === 'scales') {
      const scaleData = computePentatonicData(state);
      const pianoMidis = [];
      scaleData.dotMap.forEach((d) => {
        pianoMidis.push({ midi: d.midi, s: d.s, fret: d.fret, semi: d.semi, finger: d.finger, isBlue: d.isBlue });
      });
      return {
        dotMap: scaleData.dotMap,
        barre: null,
        mutedStrings: new Set(),
        pianoMidis,
        rootPc: state.scaleRoot,
        chordDef: null,
        scaleData
      };
    }

    const rawMidis = Array.from(state.freeNotes.values()).map((n) => n.midi);
    const detected = detectHarmonyFromMidis(rawMidis, state.accidentalPref);
    const dotMap = new Map();
    const pianoMidis = [];

    const fretsForFingering = [null, null, null, null, null, null];
    state.freeNotes.forEach((item) => {
      if (item.source === 'guitar' && state.singleNotePerString) {
        fretsForFingering[item.s] = item.fret;
      }
    });
    const autoFingers = computeGuitarFingers(fretsForFingering).fingers;

    state.freeNotes.forEach((item) => {
      const pc = item.midi % 12;
      const semi = (pc - detected.rootPc + 12) % 12;
      if (item.source === 'guitar') {
        dotMap.set(`${item.s}-${item.fret}`, {
          s: item.s, fret: item.fret, midi: item.midi, pc, semi,
          finger: autoFingers[item.s] || (item.fret === 0 ? '0' : '•'),
          isBlue: false, dimmed: false
        });
      }
      pianoMidis.push({
        midi: item.midi,
        s: item.source === 'guitar' ? item.s : null,
        fret: item.source === 'guitar' ? item.fret : null,
        semi,
        finger: item.source === 'guitar' ? (autoFingers[item.s] || '') : ''
      });
    });

    pianoMidis.sort((a, b) => a.midi - b.midi);
    return {
      dotMap,
      barre: null,
      mutedStrings: new Set(),
      pianoMidis,
      rootPc: detected.rootPc,
      chordDef: null,
      detected
    };
  }

  function formatDotLabel(dot, rootPc, chordDef) {
    if (state.labelMode === 'note') return pcName(dot.pc, rootPc, state.accidentalPref);
    if (state.labelMode === 'interval') {
      if (dot.isBlue) return state.scaleType === 'minor' ? 'b5' : 'b3';
      return getIntervalLabel(dot.semi, chordDef);
    }
    return dot.finger || '•';
  }

  FM.store = {
    state,
    recomputeChordVoicings,
    getActiveModel,
    formatDotLabel
  };
})(window.FM);
