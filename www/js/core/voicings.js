/**
 * @fileoverview Motor algorítmico de generación y validación de Voicings en 22 trastes:
 * Box Chords (CAGED), Tríadas Cerradas, Tríadas Abiertas (Spread), Drop 2 y Drop 3.
 */
'use strict';

window.FM = window.FM || {};

(function initVoicings(FM) {
  const { OPEN_MIDI, TOTAL_FRETS } = FM.constants;
  const { computeGuitarFingers, pcName } = FM.theory;

  function determineStringSetCode(frets) {
    const activeUserStrings = [];
    for (let s = 5; s >= 0; s--) {
      if (frets[s] !== null) activeUserStrings.push(6 - s);
    }
    activeUserStrings.sort((a, b) => a - b);
    if (activeUserStrings.length >= 5) return 'box';
    return activeUserStrings.join('-');
  }

  function determineInversionIndex(bassPc, rootPc, chordDef) {
    const rel = (bassPc - rootPc + 12) % 12;
    if (rel === 0) return 0;
    const sorted = [...chordDef.intervals].sort((a, b) => a - b);
    const idx = sorted.indexOf(rel);
    if (idx === 1) return 1;
    if (idx === 2) return 2;
    if (idx >= 3) return 3;
    return 1;
  }

  function inversionLabel(invIdx, bassPc, rootPc, accidentalPref) {
    const bName = pcName(bassPc, rootPc, accidentalPref);
    if (invIdx === 0) return `Fundamental (Bajo en ${bName})`;
    return `${invIdx}ª Inversión (Bajo en ${bName})`;
  }

  function isPlayableSpan(frets) {
    const pos = frets.filter((f) => typeof f === 'number' && f > 0);
    if (pos.length === 0) return true;
    const minF = Math.min(...pos);
    const maxF = Math.max(...pos);
    if (maxF > TOTAL_FRETS) return false;
    if (frets.some((f) => f === 0) && maxF > 4) return false;
    const maxAllowedSpan = minF >= 9 ? 4 : 3;
    return (maxF - minF) <= (pos.length <= 3 ? maxAllowedSpan + 1 : maxAllowedSpan);
  }

  function nextMidiWithPcAbove(minMidiExclusive, targetPc) {
    let m = minMidiExclusive + 1;
    while (((m % 12) + 12) % 12 !== targetPc) m++;
    return m;
  }

  function buildVoicingRecord(frets, rootPc, chordDef, category, customTag) {
    const midis = [];
    const pcsSet = new Set();
    let lowestMidi = Infinity;
    let minFretUsed = Infinity;
    let maxFretUsed = 0;

    for (let s = 0; s < 6; s++) {
      if (frets[s] !== null) {
        if (frets[s] < 0 || frets[s] > TOTAL_FRETS) return null;
        const m = OPEN_MIDI[s] + frets[s];
        midis.push({ s, fret: frets[s], midi: m, pc: m % 12 });
        pcsSet.add(m % 12);
        if (m < lowestMidi) lowestMidi = m;
        if (frets[s] > 0) {
          if (frets[s] < minFretUsed) minFretUsed = frets[s];
          if (frets[s] > maxFretUsed) maxFretUsed = frets[s];
        }
      }
    }
    if (midis.length < 3) return null;

    const allowedRels = new Set(chordDef.intervals.map((i) => ((i % 12) + 12) % 12));
    for (const pc of pcsSet) {
      const rel = (pc - rootPc + 12) % 12;
      if (!allowedRels.has(rel)) return null;
    }
    if (!pcsSet.has(rootPc)) return null;

    if (minFretUsed === Infinity) {
      minFretUsed = 0;
      maxFretUsed = 0;
    }

    const bassPc = lowestMidi % 12;
    const invIdx = determineInversionIndex(bassPc, rootPc, chordDef);
    const strSetCode = determineStringSetCode(frets);
    const { fingers, barre } = computeGuitarFingers(frets);
    const omittedFifth = chordDef.intervals.includes(7) && !pcsSet.has((rootPc + 7) % 12);

    return {
      key: `${category}:${frets.map((f) => (f === null ? 'x' : f)).join('-')}`,
      frets,
      midis,
      fingers,
      barre,
      category,
      customTag: customTag + (omittedFifth ? ' · sin 5ª' : ''),
      strSetCode,
      invIdx,
      bassPc,
      minFret: minFretUsed,
      maxFret: maxFretUsed
    };
  }

  function generateAllVoicings(rootPc, chordDef) {
    const results = [];
    const seenFrets = new Set();

    function pushUnique(v) {
      if (!v) return;
      const fKey = `${v.category}|${v.frets.map((f) => (f === null ? 'x' : f)).join(',')}`;
      if (seenFrets.has(fKey)) return;
      seenFrets.add(fKey);
      results.push(v);
    }

    // 1. Box Chords (CAGED)
    if (chordDef.boxTemplates) {
      for (const tpl of chordDef.boxTemplates) {
        const openPc = OPEN_MIDI[tpl.baseStr] % 12;
        let baseFret0 = (rootPc - openPc - tpl.rootOffset) % 12;
        if (baseFret0 < 0) baseFret0 += 12;

        for (const octaveShift of [0, 12]) {
          const base = baseFret0 + octaveShift;
          const frets = tpl.offsets.map((off) => (off === null ? null : base + off));
          if (frets.some((f) => f !== null && (f < 0 || f > TOTAL_FRETS))) continue;
          const posFrets = frets.filter((f) => f !== null && f > 0);
          if (posFrets.length > 0) {
            if (Math.max(...posFrets) - Math.min(...posFrets) > 4) continue;
            if (frets.some((f) => f === 0) && Math.max(...posFrets) > 4) continue;
          }
          pushUnique(buildVoicingRecord(frets, rootPc, chordDef, 'box', `Box Chord (${tpl.name})`));
        }
      }
    }

    // 2. Tríadas cerradas y abiertas
    const triadIntervals = chordDef.intervals.length === 3
      ? chordDef.intervals
      : (chordDef.triadFallback || chordDef.intervals.slice(0, 3));
    const triadPcs = triadIntervals.map((i) => (rootPc + i) % 12);

    const closedSets = [
      { s: [3, 4, 5], label: 'Cuerdas 1-2-3' },
      { s: [2, 3, 4], label: 'Cuerdas 2-3-4' },
      { s: [1, 2, 3], label: 'Cuerdas 3-4-5' },
      { s: [0, 1, 2], label: 'Cuerdas 4-5-6' }
    ];

    for (const setObj of closedSets) {
      const [sa, sb, sc] = setObj.s;
      for (let rot = 0; rot < 3; rot++) {
        const p0 = triadPcs[rot % 3];
        const p1 = triadPcs[(rot + 1) % 3];
        const p2 = triadPcs[(rot + 2) % 3];

        for (let fa = 0; fa <= TOTAL_FRETS; fa++) {
          const ma = OPEN_MIDI[sa] + fa;
          if (ma % 12 !== p0) continue;
          const mb = nextMidiWithPcAbove(ma, p1);
          const mc = nextMidiWithPcAbove(mb, p2);
          const fb = mb - OPEN_MIDI[sb];
          const fc = mc - OPEN_MIDI[sc];
          if (fb < 0 || fb > TOTAL_FRETS || fc < 0 || fc > TOTAL_FRETS) continue;

          const frets = [null, null, null, null, null, null];
          frets[sa] = fa; frets[sb] = fb; frets[sc] = fc;
          if (!isPlayableSpan(frets)) continue;
          const tag = chordDef.intervals.length === 3
            ? `Tríada Cerrada (${setObj.label})`
            : `Voicing 3 Cuerdas (${setObj.label})`;
          pushUnique(buildVoicingRecord(frets, rootPc, chordDef, 'triad', tag));
        }
      }
    }

    const spreadSets = [
      { s: [2, 3, 5], label: 'Spread 1-3-4' },
      { s: [1, 3, 4], label: 'Spread 2-3-5' },
      { s: [1, 2, 4], label: 'Spread 2-4-5' },
      { s: [0, 2, 3], label: 'Spread 3-4-6' },
      { s: [0, 1, 3], label: 'Spread 3-5-6' }
    ];

    for (const setObj of spreadSets) {
      const [sa, sb, sc] = setObj.s;
      for (let rot = 0; rot < 3; rot++) {
        const p0 = triadPcs[rot % 3];
        const p1 = triadPcs[(rot + 1) % 3];
        const p2 = triadPcs[(rot + 2) % 3];

        for (let fa = 0; fa <= TOTAL_FRETS; fa++) {
          const ma = OPEN_MIDI[sa] + fa;
          if (ma % 12 !== p0) continue;
          const mCloseMid = nextMidiWithPcAbove(ma, p1);
          const mCloseTop = nextMidiWithPcAbove(mCloseMid, p2);
          const fb = mCloseTop - OPEN_MIDI[sb];
          const fc = (mCloseMid + 12) - OPEN_MIDI[sc];
          if (fb < 0 || fb > TOTAL_FRETS || fc < 0 || fc > TOTAL_FRETS) continue;

          const frets = [null, null, null, null, null, null];
          frets[sa] = fa; frets[sb] = fb; frets[sc] = fc;
          if (!isPlayableSpan(frets)) continue;
          pushUnique(buildVoicingRecord(frets, rootPc, chordDef, 'spread', `Tríada Abierta (${setObj.label})`));
        }
      }
    }

    // 3. Drop 2 y Drop 3
    const fourIntervals = chordDef.fourVoice
      ? chordDef.fourVoice
      : (chordDef.intervals.length >= 4 ? chordDef.intervals.slice(0, 4) : null);

    const dropStacks = [];
    if (fourIntervals) {
      const sortedPcs = [...fourIntervals].sort((a, b) => a - b).map((i) => (rootPc + i) % 12);
      for (let rot = 0; rot < 4; rot++) {
        dropStacks.push([
          sortedPcs[rot % 4],
          sortedPcs[(rot + 1) % 4],
          sortedPcs[(rot + 2) % 4],
          sortedPcs[(rot + 3) % 4]
        ]);
      }
    } else if (chordDef.intervals.length === 3) {
      const tp = chordDef.intervals.map((i) => (rootPc + i) % 12);
      dropStacks.push([tp[0], tp[1], tp[2], tp[0]]);
      dropStacks.push([tp[1], tp[2], tp[0], tp[1]]);
      dropStacks.push([tp[2], tp[0], tp[1], tp[2]]);
    }

    const drop2Sets = [
      { s: [2, 3, 4, 5], label: '1-2-3-4' },
      { s: [1, 2, 3, 4], label: '2-3-4-5' },
      { s: [0, 1, 2, 3], label: '3-4-5-6' }
    ];
    const drop3Sets = [
      { s: [1, 3, 4, 5], label: '1-2-3-5' },
      { s: [0, 2, 3, 4], label: '2-3-4-6' }
    ];

    for (const stack of dropStacks) {
      for (const setObj of drop2Sets) {
        const [s0, s1, s2, s3] = setObj.s;
        for (let fLow = 0; fLow <= TOTAL_FRETS; fLow++) {
          const mBass = OPEN_MIDI[s0] + fLow;
          if (mBass % 12 !== stack[2]) continue;
          const m2 = mBass + 12;
          let m1 = m2 - 1;
          while (((m1 % 12) + 12) % 12 !== stack[1]) m1--;
          let m0 = m1 - 1;
          while (((m0 % 12) + 12) % 12 !== stack[0]) m0--;
          const m3 = nextMidiWithPcAbove(m2, stack[3]);
          if (mBass >= m0) continue;

          const f1 = m0 - OPEN_MIDI[s1];
          const f2 = m1 - OPEN_MIDI[s2];
          const f3 = m3 - OPEN_MIDI[s3];
          if (f1 < 0 || f1 > TOTAL_FRETS || f2 < 0 || f2 > TOTAL_FRETS || f3 < 0 || f3 > TOTAL_FRETS) continue;

          const frets = [null, null, null, null, null, null];
          frets[s0] = fLow; frets[s1] = f1; frets[s2] = f2; frets[s3] = f3;
          if (!isPlayableSpan(frets)) continue;
          pushUnique(buildVoicingRecord(frets, rootPc, chordDef, 'drop2', `Drop 2 (${setObj.label})`));
        }
      }

      for (const setObj of drop3Sets) {
        const [s0, s1, s2, s3] = setObj.s;
        for (let fLow = 0; fLow <= TOTAL_FRETS; fLow++) {
          const mBass = OPEN_MIDI[s0] + fLow;
          if (mBass % 12 !== stack[1]) continue;
          const m1 = mBass + 12;
          let m0 = m1 - 1;
          while (((m0 % 12) + 12) % 12 !== stack[0]) m0--;
          const m2 = nextMidiWithPcAbove(m1, stack[2]);
          const m3 = nextMidiWithPcAbove(m2, stack[3]);
          if (mBass >= m0) continue;

          const f1 = m0 - OPEN_MIDI[s1];
          const f2 = m2 - OPEN_MIDI[s2];
          const f3 = m3 - OPEN_MIDI[s3];
          if (f1 < 0 || f1 > TOTAL_FRETS || f2 < 0 || f2 > TOTAL_FRETS || f3 < 0 || f3 > TOTAL_FRETS) continue;

          const frets = [null, null, null, null, null, null];
          frets[s0] = fLow; frets[s1] = f1; frets[s2] = f2; frets[s3] = f3;
          if (!isPlayableSpan(frets)) continue;
          pushUnique(buildVoicingRecord(frets, rootPc, chordDef, 'drop3', `Drop 3 (${setObj.label})`));
        }
      }
    }

    const catOrder = { box: 0, triad: 1, drop2: 2, drop3: 3, spread: 4 };
    results.sort((a, b) => {
      if (a.minFret !== b.minFret) return a.minFret - b.minFret;
      return (catOrder[a.category] || 9) - (catOrder[b.category] || 9);
    });

    return results;
  }

  function filterVoicings(allVoicings, filters) {
    return allVoicings.filter((v) => {
      if (filters.voicingType !== 'all' && v.category !== filters.voicingType) return false;
      if (filters.stringSet !== 'all') {
        if (filters.stringSet === 'box') {
          if (v.strSetCode !== 'box') return false;
        } else if (v.strSetCode !== filters.stringSet) {
          return false;
        }
      }
      if (filters.inversionFilter !== 'all' && String(v.invIdx) !== filters.inversionFilter) return false;
      return true;
    });
  }

  FM.voicings = {
    generateAllVoicings,
    filterVoicings,
    inversionLabel
  };
})(window.FM);
