/**
 * @fileoverview Vista desacoplada del diapasón de guitarra (22 trastes, Horizontal y Vertical).
 */
'use strict';

window.FM = window.FM || {};

(function initFretboardView(FM) {
  const { OPEN_MIDI, STRING_NAMES, TOTAL_FRETS, INLAY_FRETS } = FM.constants;
  const { pcName, midiNoteWithOctave, getRoleColorClasses } = FM.theory;
  const { state, formatDotLabel } = FM.store;
  const { computePentatonicData } = FM.scales;

  function renderHorizontalNeck(model) {
    const container = document.getElementById('fretboardHorizontalInner');
    const fretWidths = [52];
    for (let f = 1; f <= TOTAL_FRETS; f++) {
      fretWidths.push(Math.max(35, Math.round(64 - f * 1.25)));
    }

    let html = '<div class="space-y-1">';
    html += '<div class="flex items-center pl-11 text-[11px] font-bold text-slate-400 mono">';
    for (let f = 0; f <= TOTAL_FRETS; f++) {
      const highlightNum = INLAY_FRETS.has(f) ? 'text-amber-400' : 'text-slate-500';
      html += `<div style="width:${fretWidths[f]}px" class="text-center shrink-0 ${highlightNum}">${f === 0 ? 'Aire' : f}</div>`;
    }
    html += '</div>';

    html += '<div class="flex items-stretch">';
    html += '<div class="w-11 shrink-0 flex flex-col justify-between py-2 pr-1.5 select-none">';
    for (let s = 5; s >= 0; s--) {
      const isMuted = model.mutedStrings.has(s);
      html += `
        <div class="h-9 flex items-center justify-end gap-1">
          <span class="text-[11px] font-bold mono ${isMuted ? 'text-rose-400' : 'text-slate-300'}">${STRING_NAMES[s]}</span>
          <span class="w-3.5 text-center text-xs font-extrabold ${isMuted ? 'text-rose-500' : 'text-transparent'}">✕</span>
        </div>`;
    }
    html += '</div>';

    html += '<div class="fretboard-wood rounded-xl border border-amber-950/80 relative flex flex-col py-2 overflow-hidden">';
    html += '<div class="absolute inset-y-0 left-0 flex pointer-events-none z-0">';
    for (let f = 0; f <= TOTAL_FRETS; f++) {
      let inlayMarkup = '';
      if (f === 12) {
        inlayMarkup = `
          <div class="flex flex-col justify-around h-full py-7 items-center">
            <span class="w-3.5 h-3.5 rounded-full bg-amber-100/25 border border-amber-100/30"></span>
            <span class="w-3.5 h-3.5 rounded-full bg-amber-100/25 border border-amber-100/30"></span>
          </div>`;
      } else if (INLAY_FRETS.has(f)) {
        inlayMarkup = `
          <div class="flex items-center justify-center h-full">
            <span class="w-3.5 h-3.5 rounded-full bg-amber-100/25 border border-amber-100/30"></span>
          </div>`;
      }
      const borderRight = f === 0
        ? 'border-r-[6px] border-amber-400/90 bg-slate-950/55'
        : 'border-r-[2px] border-slate-400/50';
      html += `<div style="width:${fretWidths[f]}px" class="h-full shrink-0 ${borderRight}">${inlayMarkup}</div>`;
    }
    html += '</div>';

    for (let s = 5; s >= 0; s--) {
      const gaugePx = (1.3 + (5 - s) * 0.48).toFixed(1);
      const stringColor = s <= 2 ? 'bg-gradient-to-r from-amber-200/80 via-slate-300 to-amber-200/80' : 'bg-slate-200/85';

      html += '<div class="relative h-9 flex items-center z-10">';
      html += `<div style="height:${gaugePx}px" class="absolute inset-x-0 ${stringColor} shadow-sm pointer-events-none"></div>`;

      for (let f = 0; f <= TOTAL_FRETS; f++) {
        const dot = model.dotMap.get(`${s}-${f}`);
        const midi = OPEN_MIDI[s] + f;
        const hoverNote = pcName(midi % 12, model.rootPc, state.accidentalPref);

        let cellInner = '';
        if (dot) {
          const colors = getRoleColorClasses(dot.semi, dot.isBlue);
          const label = formatDotLabel(dot, model.rootPc, model.chordDef);
          cellInner = `
            <span data-dot-id="s${s}-f${f}" class="w-7 h-7 rounded-full ${colors.bg} border font-extrabold text-[11px] flex items-center justify-center shadow-md transition-transform hover:scale-110 mono z-20">
              ${label}
            </span>`;
        } else {
          cellInner = `
            <span class="w-6 h-6 rounded-full bg-slate-900/85 text-slate-200 border border-slate-500/60 text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-95 transition-opacity mono">
              ${hoverNote}
            </span>`;
        }

        let barreBg = '';
        if (model.barre && model.barre.fret === f && s >= model.barre.fromStr && s <= model.barre.toStr) {
          barreBg = '<span class="absolute inset-y-0 w-3 bg-amber-400/25 rounded-full pointer-events-none"></span>';
        }

        html += `
          <button type="button"
            data-fret-cell="1"
            data-str="${s}"
            data-fret="${f}"
            data-midi="${midi}"
            style="width:${fretWidths[f]}px"
            title="Cuerda ${6 - s} · Traste ${f} (${midiNoteWithOctave(midi, model.rootPc, state.accidentalPref)})"
            class="fret-cell group relative h-full shrink-0 flex items-center justify-center focus:outline-none">
            ${barreBg}
            ${cellInner}
          </button>`;
      }
      html += '</div>';
    }

    html += '</div></div></div>';
    container.innerHTML = html;
  }

  function renderVerticalNeck(model) {
    const container = document.getElementById('fretboardVerticalInner');
    let html = '<div class="bg-slate-950/90 rounded-xl p-3 border border-slate-800">';

    html += '<div class="flex items-center pl-9 pb-2 border-b border-slate-800">';
    for (let s = 0; s < 6; s++) {
      const isMuted = model.mutedStrings.has(s);
      html += `
        <div class="flex-1 text-center">
          <div class="text-xs font-bold mono ${isMuted ? 'text-rose-400' : 'text-slate-200'}">${STRING_NAMES[s]}</div>
          <div class="text-[11px] font-extrabold ${isMuted ? 'text-rose-500' : 'text-transparent'}">✕</div>
        </div>`;
    }
    html += '</div>';

    for (let f = 0; f <= TOTAL_FRETS; f++) {
      const rowBorder = f === 0
        ? 'border-b-[5px] border-amber-400/90 bg-slate-900/80'
        : 'border-b border-slate-500/45 fretboard-wood';
      const numColor = INLAY_FRETS.has(f) ? 'text-amber-400 font-extrabold' : 'text-slate-400 font-semibold';

      html += `<div id="vfret-${f}" class="flex items-center h-11 relative ${rowBorder}">`;
      html += `<div class="w-9 shrink-0 text-center text-xs mono ${numColor} bg-slate-950 h-full flex items-center justify-center border-r border-slate-800">${f === 0 ? '0' : f}</div>`;

      if (INLAY_FRETS.has(f)) {
        html += '<div class="absolute inset-0 left-9 flex items-center justify-center pointer-events-none opacity-25"><span class="w-3 h-3 rounded-full bg-amber-100"></span></div>';
      }

      for (let s = 0; s < 6; s++) {
        const dot = model.dotMap.get(`${s}-${f}`);
        const midi = OPEN_MIDI[s] + f;
        const gaugePx = (1.3 + (5 - s) * 0.45).toFixed(1);

        let dotMarkup = '';
        if (dot) {
          const colors = getRoleColorClasses(dot.semi, dot.isBlue);
          const label = formatDotLabel(dot, model.rootPc, model.chordDef);
          dotMarkup = `
            <span data-dot-id="s${s}-f${f}" class="w-7 h-7 rounded-full ${colors.bg} border font-extrabold text-[11px] flex items-center justify-center shadow-md mono z-20">
              ${label}
            </span>`;
        }

        html += `
          <button type="button"
            data-fret-cell="1"
            data-str="${s}"
            data-fret="${f}"
            data-midi="${midi}"
            class="fret-cell relative flex-1 h-full flex items-center justify-center focus:outline-none">
            <span style="width:${gaugePx}px" class="absolute inset-y-0 bg-slate-300/75 pointer-events-none"></span>
            ${dotMarkup}
          </button>`;
      }
      html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
  }

  function renderFretboard(model) {
    const guitarSec = document.getElementById('guitarSection');
    if (state.instrument === 'piano') {
      guitarSec.classList.add('hidden');
      return;
    }
    guitarSec.classList.remove('hidden');

    const hWrap = document.getElementById('fretboardHorizontalWrap');
    const vWrap = document.getElementById('fretboardVerticalWrap');

    if (state.neckVertical) {
      hWrap.classList.add('hidden');
      vWrap.classList.remove('hidden');
      renderVerticalNeck(model);
    } else {
      vWrap.classList.add('hidden');
      hWrap.classList.remove('hidden');
      renderHorizontalNeck(model);
    }
  }

  function centerActiveFretboardPosition() {
    let targetFret = 0;
    if (state.mode === 'chords') {
      const v = state.currentVoicings[state.selectedVoicingIdx];
      if (v) targetFret = v.minFret;
    } else if (state.mode === 'scales' && state.scaleBox !== 'all') {
      const sd = computePentatonicData(state);
      if (sd.activeBoxes.length > 0) targetFret = sd.activeBoxes[0].minF;
    }

    if (state.neckVertical) {
      const wrap = document.getElementById('fretboardVerticalWrap');
      const row = document.getElementById(`vfret-${Math.max(0, targetFret - 1)}`);
      if (wrap && row) {
        wrap.scrollTo({ top: Math.max(0, row.offsetTop - 60), behavior: 'smooth' });
      }
    } else {
      const wrap = document.getElementById('fretboardHorizontalWrap');
      if (wrap) {
        const approxX = targetFret <= 2 ? 0 : Math.max(0, (targetFret - 2) * 48);
        wrap.scrollTo({ left: approxX, behavior: 'smooth' });
      }
    }
  }

  FM.fretboardView = {
    renderFretboard,
    centerActiveFretboardPosition
  };
})(window.FM);
