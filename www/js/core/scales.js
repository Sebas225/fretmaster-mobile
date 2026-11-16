/**
 * @fileoverview Motor matemático de Escalas Pentatónicas Mayores y Menores (Mástil Completo y 5 Cajas CAGED).
 */
'use strict';

window.FM = window.FM || {};

(function initScales(FM) {
  const { OPEN_MIDI, TOTAL_FRETS } = FM.constants;

  function computePentatonicData(scaleConfig) {
    const { scaleRoot: root, scaleType, scaleBox, scaleBlueNote, scaleOctaveMode } = scaleConfig;
    const isMinor = scaleType === 'minor';
    const coreSemis = isMinor ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9];
    const blueSemi = isMinor ? 6 : 3;
    const scalePcs = new Set(coreSemis.map((s) => (root + s) % 12));
    const bluePc = (root + blueSemi) % 12;

    const ascendingPentMidi = [];
    for (let m = 24; m <= 103; m++) {
      if (scalePcs.has(m % 12)) ascendingPentMidi.push(m);
    }

    const boxPositions = [];
    if (scaleBox !== 'all') {
      const boxIdx = parseInt(scaleBox, 10);
      const startPcOnStr6 = (root + coreSemis[boxIdx]) % 12;

      for (let f6 = 0; f6 <= TOTAL_FRETS; f6++) {
        const mStart = OPEN_MIDI[0] + f6;
        if (mStart % 12 !== startPcOnStr6) continue;
        const seqStartIdx = ascendingPentMidi.indexOf(mStart);
        if (seqStartIdx < 0 || seqStartIdx + 11 >= ascendingPentMidi.length) continue;

        const stringNotes = [];
        let fitsNeck = true;
        let minF = Infinity;
        let maxF = 0;

        for (let s = 0; s < 6; s++) {
          const mA = ascendingPentMidi[seqStartIdx + s * 2];
          const mB = ascendingPentMidi[seqStartIdx + s * 2 + 1];
          const fA = mA - OPEN_MIDI[s];
          const fB = mB - OPEN_MIDI[s];
          if (fA < 0 || fB > TOTAL_FRETS) {
            fitsNeck = false;
            break;
          }
          minF = Math.min(minF, fA);
          maxF = Math.max(maxF, fB);
          stringNotes.push({ s, frets: [fA, fB], midis: [mA, mB] });
        }

        if (fitsNeck) boxPositions.push({ minF, maxF, stringNotes });
      }
    }

    let activeBoxes = boxPositions;
    if (boxPositions.length > 1) {
      if (scaleOctaveMode === 'low') activeBoxes = [boxPositions[0]];
      else if (scaleOctaveMode === 'high') activeBoxes = [boxPositions[boxPositions.length - 1]];
    }

    const dotMap = new Map();
    const orderedPlayMidis = [];

    if (scaleBox === 'all') {
      for (let s = 0; s < 6; s++) {
        for (let f = 0; f <= TOTAL_FRETS; f++) {
          const m = OPEN_MIDI[s] + f;
          const pc = m % 12;
          const semi = (pc - root + 12) % 12;
          if (scalePcs.has(pc)) {
            dotMap.set(`${s}-${f}`, {
              s, fret: f, midi: m, pc, semi,
              finger: f === 0 ? '0' : String(((f - 1) % 4) + 1),
              isBlue: false, dimmed: false
            });
          } else if (scaleBlueNote && pc === bluePc) {
            dotMap.set(`${s}-${f}`, {
              s, fret: f, midi: m, pc, semi,
              finger: 'B', isBlue: true, dimmed: false
            });
          }
        }
      }
      const rootBaseMidi = 40 + ((root - (40 % 12) + 12) % 12);
      for (let m = rootBaseMidi; m <= rootBaseMidi + 24; m++) {
        if (scalePcs.has(m % 12) || (scaleBlueNote && m % 12 === bluePc)) {
          orderedPlayMidis.push({ midi: m, s: null, fret: null });
        }
      }
    } else {
      for (const box of activeBoxes) {
        const frettedInBox = [];
        box.stringNotes.forEach((sn) => sn.frets.forEach((f) => { if (f > 0) frettedInBox.push(f); }));
        const anchorFret = frettedInBox.length ? Math.min(...frettedInBox) : 1;

        for (const sn of box.stringNotes) {
          sn.frets.forEach((f, idx) => {
            const m = sn.midis[idx];
            const pc = m % 12;
            const semi = (pc - root + 12) % 12;
            const finger = f === 0 ? '0' : String(Math.max(1, Math.min(4, f - anchorFret + 1)));
            dotMap.set(`${sn.s}-${f}`, {
              s: sn.s, fret: f, midi: m, pc, semi,
              finger, isBlue: false, dimmed: false
            });
            orderedPlayMidis.push({ midi: m, s: sn.s, fret: f });
          });

          if (scaleBlueNote) {
            for (let f = Math.max(0, box.minF - 1); f <= Math.min(TOTAL_FRETS, box.maxF + 1); f++) {
              const m = OPEN_MIDI[sn.s] + f;
              if (m % 12 === bluePc && !dotMap.has(`${sn.s}-${f}`)) {
                dotMap.set(`${sn.s}-${f}`, {
                  s: sn.s, fret: f, midi: m, pc: bluePc,
                  semi: blueSemi, finger: '♭', isBlue: true, dimmed: false
                });
              }
            }
          }
        }
      }
    }

    orderedPlayMidis.sort((a, b) => a.midi - b.midi);
    const uniquePlay = [];
    for (const item of orderedPlayMidis) {
      if (uniquePlay.length === 0 || uniquePlay[uniquePlay.length - 1].midi !== item.midi) {
        uniquePlay.push(item);
      }
    }

    return { dotMap, scalePcs, bluePc, blueSemi, activeBoxes, playSequence: uniquePlay };
  }

  FM.scales = { computePentatonicData };
})(window.FM);
