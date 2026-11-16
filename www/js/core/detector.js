/**
 * @fileoverview Detector armónico inverso en tiempo real para cualquier combinación aleatoria de notas.
 */
'use strict';

window.FM = window.FM || {};

(function initDetector(FM) {
  const { INTERVAL_NAMES, INTERVAL_SPANISH, DETECTOR_FORMULAS } = FM.constants;
  const { pcName, midiNoteWithOctave, midiToFreq } = FM.theory;

  function detectHarmonyFromMidis(midiArray, accidentalPref = 'auto') {
    const sortedMidis = [...new Set(midiArray)].sort((a, b) => a - b);
    if (sortedMidis.length === 0) {
      return {
        symbol: '—',
        fullName: 'Coloca notas en el mástil o piano',
        subtitle: 'Modo Detector Activo · Esperando notas',
        rootPc: 0,
        notesStr: 'Ninguna',
        formulaStr: '—',
        alternatives: []
      };
    }

    const bassMidi = sortedMidis[0];
    const bassPc = bassMidi % 12;
    const uniquePcs = [];
    for (const m of sortedMidis) {
      const pc = m % 12;
      if (!uniquePcs.includes(pc)) uniquePcs.push(pc);
    }

    if (uniquePcs.length === 1) {
      const nName = pcName(bassPc, bassPc, accidentalPref);
      const isOctave = sortedMidis.length > 1;
      return {
        symbol: isOctave ? `${nName} (8va)` : midiNoteWithOctave(bassMidi, bassPc, accidentalPref),
        fullName: isOctave ? `Octavas de ${nName}` : `Nota única: ${nName} (${midiToFreq(bassMidi).toFixed(1)} Hz)`,
        subtitle: `${sortedMidis.length} nota(s) seleccionada(s)`,
        rootPc: bassPc,
        notesStr: sortedMidis.map((m) => midiNoteWithOctave(m, bassPc, accidentalPref)).join(' · '),
        formulaStr: '1',
        alternatives: []
      };
    }

    if (uniquePcs.length === 2) {
      const topPc = uniquePcs[1];
      const semi = (topPc - bassPc + 12) % 12;
      const bName = pcName(bassPc, bassPc, accidentalPref);
      const tName = pcName(topPc, bassPc, accidentalPref);

      if (semi === 7) {
        return {
          symbol: `${bName}5`,
          fullName: `${bName} Power Chord (Quinta Justa)`,
          subtitle: 'Acorde de Quinta (sin 3ª)',
          rootPc: bassPc,
          notesStr: `${bName} · ${tName}`,
          formulaStr: '1 · 5',
          alternatives: [`Intervalo: 5ª justa (${bName}–${tName})`]
        };
      }
      if (semi === 5) {
        return {
          symbol: `${tName}5/${bName}`,
          fullName: `${tName}5 invertido (Cuarta Justa)`,
          subtitle: `Bajo en ${bName} · Díada de 4ª`,
          rootPc: topPc,
          notesStr: `${bName} · ${tName}`,
          formulaStr: '5 · 1',
          alternatives: [`${bName}sus4(no5)`]
        };
      }
      const implied = [];
      if (semi === 4) implied.push(`${bName} Mayor (sin 5ª)`);
      if (semi === 3) implied.push(`${bName}m (sin 5ª)`);
      if (semi === 8) implied.push(`${tName} Mayor / ${bName} (1ª inv sin 5ª)`);
      if (semi === 9) implied.push(`${tName}m / ${bName} (1ª inv sin 5ª)`);

      return {
        symbol: `${bName} + ${tName}`,
        fullName: `Díada: ${INTERVAL_SPANISH[semi] || 'Intervalo'}`,
        subtitle: '2 notas distintas (agrega una 3ª nota para tríada completa)',
        rootPc: bassPc,
        notesStr: `${bName} · ${tName}`,
        formulaStr: `1 · ${INTERVAL_NAMES[semi]}`,
        alternatives: implied
      };
    }

    const candidates = [];
    for (let r = 0; r < 12; r++) {
      const relSet = uniquePcs.map((pc) => (pc - r + 12) % 12).sort((a, b) => a - b);
      const relKey = relSet.join(',');

      for (const form of DETECTOR_FORMULAS) {
        if (relKey === form.intervals.join(',')) {
          const isRootBass = (r === bassPc);
          const rName = pcName(r, r, accidentalPref);
          const bName = pcName(bassPc, r, accidentalPref);
          const slash = isRootBass ? '' : `/${bName}`;
          const totalScore = form.score + (isRootBass ? 26 : 0);

          let invDesc = 'Estado Fundamental';
          if (!isRootBass) {
            const bassRel = (bassPc - r + 12) % 12;
            const pos = form.intervals.indexOf(bassRel);
            invDesc = pos > 0 ? `${pos}ª Inversión (Bajo en ${bName})` : `Bajo en ${bName}`;
          }

          candidates.push({
            score: totalScore,
            rootPc: r,
            symbol: `${rName}${form.symbol}${slash}`,
            fullName: `${rName} ${form.name}${isRootBass ? '' : ` con bajo en ${bName}`}`,
            subtitle: invDesc,
            formulaStr: relSet.map((s) => INTERVAL_NAMES[s]).join(' · ')
          });
        }
      }
    }

    if (candidates.length === 0) {
      let bestRoot = bassPc;
      let bestMatchCount = -1;
      for (const r of uniquePcs) {
        const rels = new Set(uniquePcs.map((pc) => (pc - r + 12) % 12));
        let triadHits = 0;
        if (rels.has(4) || rels.has(3)) triadHits += 2;
        if (rels.has(7) || rels.has(6) || rels.has(8)) triadHits += 1;
        if (rels.has(10) || rels.has(11)) triadHits += 1;
        if (r === bassPc) triadHits += 0.5;
        if (triadHits > bestMatchCount) {
          bestMatchCount = triadHits;
          bestRoot = r;
        }
      }

      const rels = uniquePcs.map((pc) => (pc - bestRoot + 12) % 12).sort((a, b) => a - b);
      const rSet = new Set(rels);
      const rName = pcName(bestRoot, bestRoot, accidentalPref);
      const bName = pcName(bassPc, bestRoot, accidentalPref);

      let coreQuality = '';
      let coreName = 'Poliacorde / Cluster';
      const used = new Set([0]);

      if (rSet.has(4)) {
        used.add(4);
        if (rSet.has(8) && !rSet.has(7)) { coreQuality = 'aug'; coreName = 'Aumentado'; used.add(8); }
        else { coreQuality = ''; coreName = 'Mayor'; if (rSet.has(7)) used.add(7); }
      } else if (rSet.has(3)) {
        used.add(3);
        if (rSet.has(6) && !rSet.has(7)) { coreQuality = 'dim'; coreName = 'Disminuido'; used.add(6); }
        else { coreQuality = 'm'; coreName = 'Menor'; if (rSet.has(7)) used.add(7); }
      } else if (rSet.has(5)) {
        coreQuality = 'sus4'; coreName = 'Suspendido 4ª'; used.add(5); if (rSet.has(7)) used.add(7);
      } else if (rSet.has(2)) {
        coreQuality = 'sus2'; coreName = 'Suspendido 2ª'; used.add(2); if (rSet.has(7)) used.add(7);
      } else if (rSet.has(7)) {
        coreQuality = '5'; coreName = 'Quinta'; used.add(7);
      }

      if (rSet.has(11)) {
        coreQuality = coreQuality === 'm' ? 'm(maj7)' : (coreQuality + 'maj7');
        coreName += ' Maj7';
        used.add(11);
      } else if (rSet.has(10)) {
        coreQuality = coreQuality === 'dim' ? 'm7b5' : (coreQuality + '7');
        coreName += ' 7';
        used.add(10);
      } else if (rSet.has(9) && coreQuality !== 'dim') {
        coreQuality += '6';
        coreName += ' 6';
        used.add(9);
      }

      const tensions = [];
      const tensionMap = { 1: 'b9', 2: '9', 3: '#9', 5: '11', 6: '#11', 8: 'b13', 9: '13', 10: 'b7', 11: 'maj7' };
      for (const s of rels) {
        if (!used.has(s) && tensionMap[s]) tensions.push(tensionMap[s]);
      }

      const tensionSuffix = tensions.length > 0 ? `(${tensions.join(',')})` : '';
      const slash = bestRoot === bassPc ? '' : `/${bName}`;

      candidates.push({
        score: 70,
        rootPc: bestRoot,
        symbol: `${rName}${coreQuality}${tensionSuffix}${slash}`,
        fullName: `${rName} ${coreName} ${tensions.length ? 'con ' + tensions.join(', ') : ''}${slash ? ` (Bajo en ${bName})` : ''}`.trim(),
        subtitle: bestRoot === bassPc ? 'Voicing Extendido / Libre' : `Inversión / Slash sobre ${bName}`,
        formulaStr: rels.map((s) => INTERVAL_NAMES[s]).join(' · ')
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    const winner = candidates[0];
    const altList = [];
    for (let i = 1; i < candidates.length && altList.length < 4; i++) {
      if (candidates[i].symbol !== winner.symbol && !altList.includes(candidates[i].symbol)) {
        altList.push(candidates[i].symbol);
      }
    }

    return {
      symbol: winner.symbol,
      fullName: winner.fullName,
      subtitle: winner.subtitle,
      rootPc: winner.rootPc,
      notesStr: uniquePcs.map((pc) => pcName(pc, winner.rootPc, accidentalPref)).join(' · '),
      formulaStr: winner.formulaStr,
      alternatives: altList,
      allCandidates: candidates.slice(0, 5)
    };
  }

  FM.detector = { detectHarmonyFromMidis };
})(window.FM);
