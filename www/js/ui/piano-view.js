/**
 * @fileoverview Vista desacoplada del teclado de piano sincronizado.
 */
'use strict';

window.FM = window.FM || {};

(function initPianoView(FM) {
  const { midiNoteWithOctave, getRoleColorClasses } = FM.theory;
  const { state, formatDotLabel } = FM.store;

  const BLACK_PCS = new Set([1, 3, 6, 8, 10]);

  function renderPiano(model) {
    const pianoSec = document.getElementById('pianoSection');
    if (state.instrument === 'guitar') {
      pianoSec.classList.add('hidden');
      return;
    }
    pianoSec.classList.remove('hidden');

    let startMidi = 36;
    let endMidi = 88;

    if (!state.pianoFullRange) {
      let centerRef = 60;
      if (model.pianoMidis.length > 0) {
        const minM = model.pianoMidis[0].midi;
        const maxM = model.pianoMidis[model.pianoMidis.length - 1].midi;
        centerRef = Math.round((minM + maxM) / 2);
      }
      let cStart = Math.floor((centerRef - 16) / 12) * 12;
      cStart = Math.max(36, Math.min(60, cStart));
      startMidi = cStart;
      endMidi = Math.min(89, cStart + 36);
    }

    document.getElementById('pianoRangeLabel').textContent =
      `${midiNoteWithOctave(startMidi, model.rootPc, state.accidentalPref)} – ${midiNoteWithOctave(endMidi, model.rootPc, state.accidentalPref)} ${state.pianoFullRange ? '(Rango completo 22 trastes)' : '(3 octavas enfocadas)'}`;

    const activeByMidi = new Map();
    const bassMidi = model.pianoMidis.length > 0 ? model.pianoMidis[0].midi : null;

    if (state.mode === 'scales') {
      const sd = model.scaleData;
      const exactMidiSet = new Set(model.pianoMidis.map((x) => x.midi));
      for (let m = startMidi; m <= endMidi; m++) {
        const pc = m % 12;
        const semi = (pc - model.rootPc + 12) % 12;
        const inBox = state.scaleBox === 'all' || exactMidiSet.has(m);
        if (sd.scalePcs.has(pc)) {
          activeByMidi.set(m, { midi: m, pc, semi, finger: '', isBlue: false, dimmed: !inBox });
        } else if (state.scaleBlueNote && pc === sd.bluePc) {
          activeByMidi.set(m, { midi: m, pc, semi, finger: '♭', isBlue: true, dimmed: !inBox });
        }
      }
    } else {
      model.pianoMidis.forEach((item) => {
        activeByMidi.set(item.midi, {
          midi: item.midi,
          pc: item.midi % 12,
          semi: item.semi,
          finger: item.finger || '',
          isBlue: false,
          isBass: item.midi === bassMidi,
          dimmed: false
        });
      });
    }

    const whiteKeys = [];
    for (let m = startMidi; m <= endMidi; m++) {
      if (!BLACK_PCS.has(m % 12)) whiteKeys.push(m);
    }

    const whiteW = state.pianoFullRange ? 34 : 42;
    const whiteH = 168;
    const blackW = Math.round(whiteW * 0.64);
    const blackH = 104;
    const totalWidth = whiteKeys.length * whiteW;

    let html = `<div style="width:${totalWidth}px; height:${whiteH + 8}px" class="relative select-none">`;

    whiteKeys.forEach((m, wIdx) => {
      const left = wIdx * whiteW;
      const active = activeByMidi.get(m);
      const isC = (m % 12 === 0);
      let badge = '';

      if (active) {
        const colors = getRoleColorClasses(active.semi, active.isBlue);
        const text = formatDotLabel(active, model.rootPc, model.chordDef);
        const opacityCls = active.dimmed ? 'opacity-40' : 'opacity-100';
        badge = `
          <div class="flex flex-col items-center gap-0.5 mb-2 ${opacityCls}">
            ${active.isBass && state.mode !== 'scales' ? '<span class="text-[9px] font-extrabold uppercase tracking-tighter text-slate-900 bg-amber-300/90 px-1 rounded">Bajo</span>' : ''}
            <span class="w-7 h-7 rounded-full ${colors.bg} border font-extrabold text-[11px] flex items-center justify-center shadow mono">${text}</span>
          </div>`;
      } else if (isC) {
        badge = `<span class="mb-2 text-[10px] font-bold text-slate-400 mono">${midiNoteWithOctave(m, model.rootPc, state.accidentalPref)}</span>`;
      }

      const wActiveCls = active && !active.dimmed ? 'active-key' : '';
      html += `
        <button type="button"
          data-piano-key="1"
          data-piano-midi="${m}"
          style="left:${left}px; width:${whiteW - 2}px; height:${whiteH}px"
          title="${midiNoteWithOctave(m, model.rootPc, state.accidentalPref)}"
          class="piano-white-key ${wActiveCls} absolute top-0 flex flex-col justify-end items-center pb-1 focus:outline-none z-10">
          ${badge}
        </button>`;

      const nextM = m + 1;
      if (nextM <= endMidi && BLACK_PCS.has(nextM % 12)) {
        const bActive = activeByMidi.get(nextM);
        const bLeft = left + whiteW - Math.round(blackW / 2) - 1;
        let bBadge = '';
        if (bActive) {
          const colors = getRoleColorClasses(bActive.semi, bActive.isBlue);
          const text = formatDotLabel(bActive, model.rootPc, model.chordDef);
          const opacityCls = bActive.dimmed ? 'opacity-40' : 'opacity-100';
          bBadge = `<span class="w-6 h-6 rounded-full ${colors.bg} border font-extrabold text-[10px] flex items-center justify-center shadow mb-2 mono ${opacityCls}">${text}</span>`;
        }
        const bActiveCls = bActive && !bActive.dimmed ? 'active-key' : '';
        html += `
          <button type="button"
            data-piano-key="1"
            data-piano-midi="${nextM}"
            style="left:${bLeft}px; width:${blackW}px; height:${blackH}px"
            title="${midiNoteWithOctave(nextM, model.rootPc, state.accidentalPref)}"
            class="piano-black-key ${bActiveCls} absolute top-0 flex flex-col justify-end items-center pb-1 focus:outline-none z-20">
            ${bBadge}
          </button>`;
      }
    });

    html += '</div>';
    document.getElementById('pianoKeyboardContainer').innerHTML = html;
  }

  FM.pianoView = { renderPiano };
})(window.FM);
