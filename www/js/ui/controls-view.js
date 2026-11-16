/**
 * @fileoverview Renderizador de paneles de control, carrusel de voicings y banner armónico en vivo.
 */
'use strict';

window.FM = window.FM || {};

(function initControlsView(FM) {
  const { CHORD_QUALITIES } = FM.constants;
  const { pcName } = FM.theory;
  const { inversionLabel } = FM.voicings;
  const { state, recomputeChordVoicings } = FM.store;

  function renderRootButtons() {
    const chordGrid = document.getElementById('chordRootGrid');
    const scaleGrid = document.getElementById('scaleRootGrid');

    let cHtml = '';
    let sHtml = '';
    for (let pc = 0; pc < 12; pc++) {
      const label = pcName(pc, pc, state.accidentalPref);
      const cCls = state.chordRoot === pc
        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
        : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700 border border-slate-700';
      const sCls = state.scaleRoot === pc
        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
        : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700 border border-slate-700';

      cHtml += `<button type="button" data-croot="${pc}" class="croot-btn pill-btn py-2 rounded-xl text-xs sm:text-sm font-extrabold mono ${cCls}">${label}</button>`;
      sHtml += `<button type="button" data-sroot="${pc}" class="sroot-btn pill-btn py-2 rounded-xl text-xs sm:text-sm font-extrabold mono ${sCls}">${label}</button>`;
    }
    chordGrid.innerHTML = cHtml;
    scaleGrid.innerHTML = sHtml;
  }

  function renderQualityButtons() {
    const container = document.getElementById('chordQualityGrid');
    const filtered = CHORD_QUALITIES.filter((q) => state.qualityGroup === 'all' || q.group === state.qualityGroup);

    container.innerHTML = filtered.map((q) => {
      const cls = state.chordQualityId === q.id
        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
        : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700 border border-slate-700';
      return `<button type="button" data-qid="${q.id}" class="quality-btn pill-btn px-3 py-1.5 rounded-xl text-xs font-bold ${cls}">${q.label}</button>`;
    }).join('');
  }

  function renderVoicingCardsStrip(onResetFilters) {
    const strip = document.getElementById('voicingCardsStrip');
    const counter = document.getElementById('voicingPositionCounter');
    const summary = document.getElementById('chordCountSummary');
    const list = state.currentVoicings;

    summary.textContent = `${list.length} posición(es) disponible(s)`;

    if (list.length === 0) {
      counter.textContent = '0 / 0';
      strip.innerHTML = `
        <div class="w-full py-2.5 px-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 flex items-center justify-between gap-3">
          <span>No hay una pisada ergonómica en guitarra para esa combinación exacta de filtros. Prueba cambiando el Juego de Cuerdas a "Todas".</span>
          <button type="button" id="btnResetChordFilters" class="pill-btn px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold shrink-0">Ver Todas</button>
        </div>`;
      const resetBtn = document.getElementById('btnResetChordFilters');
      if (resetBtn && typeof onResetFilters === 'function') {
        resetBtn.addEventListener('click', onResetFilters);
      }
      return;
    }

    counter.textContent = `${state.selectedVoicingIdx + 1} / ${list.length}`;

    strip.innerHTML = list.map((v, idx) => {
      const activeCls = idx === state.selectedVoicingIdx ? 'voicing-card-active' : '';
      const fretTab = v.frets.map((f) => (f === null ? 'x' : f)).join('-');
      const invShort = v.invIdx === 0 ? 'Fund.' : `${v.invIdx}ª Inv`;
      const rangeText = v.maxFret === 0 ? 'Al aire' : `Trastes ${v.minFret}–${v.maxFret}`;
      return `
        <button type="button" data-vcard="${idx}" class="vcard-btn pill-btn shrink-0 text-left px-3 py-2 rounded-xl bg-slate-950/85 border border-slate-800 hover:border-slate-600 min-w-[155px] ${activeCls}">
          <div class="flex items-center justify-between gap-2 text-[11px] font-bold text-amber-300">
            <span>#${idx + 1} · ${rangeText}</span>
            <span class="text-emerald-400">${invShort}</span>
          </div>
          <div class="text-xs font-bold text-white truncate mt-0.5">${v.customTag}</div>
          <div class="text-[11px] text-slate-400 mono mt-0.5">${fretTab}</div>
        </button>`;
    }).join('');
  }

  function updateLiveBanner(model) {
    const statusTag = document.getElementById('liveStatusTag');
    const subBadge = document.getElementById('liveSubBadge');
    const mainTitle = document.getElementById('liveMainTitle');
    const fullName = document.getElementById('liveFullName');
    const notesList = document.getElementById('liveNotesList');
    const formulaList = document.getElementById('liveFormulaList');
    const altWrap = document.getElementById('liveAltWrap');
    const altNames = document.getElementById('liveAltNames');
    const playPrimaryLabel = document.getElementById('playPrimaryLabel');
    const playSecondaryLabel = document.getElementById('playSecondaryLabel');

    if (state.mode === 'chords') {
      const q = model.chordDef;
      const rName = pcName(state.chordRoot, state.chordRoot, state.accidentalPref);
      const v = model.activeVoicing;

      statusTag.textContent = 'Acorde Seleccionado';
      playPrimaryLabel.textContent = state.instrument === 'piano' ? 'Tocar Acorde' : 'Rasguear';
      playSecondaryLabel.textContent = 'Arpegiar';

      if (v) {
        const bName = pcName(v.bassPc, state.chordRoot, state.accidentalPref);
        const slash = v.invIdx === 0 ? '' : `/${bName}`;
        mainTitle.textContent = `${rName}${q.symbol}${slash}`;
        fullName.textContent = `${rName} ${q.fullName}`;
        subBadge.textContent = `${inversionLabel(v.invIdx, v.bassPc, state.chordRoot, state.accidentalPref)} · ${v.customTag}`;
        const orderedNoteNames = v.midis.map((m) => pcName(m.pc, state.chordRoot, state.accidentalPref));
        notesList.textContent = [...new Set(orderedNoteNames)].join(' · ');
      } else {
        mainTitle.textContent = `${rName}${q.symbol}`;
        fullName.textContent = `${rName} ${q.fullName}`;
        subBadge.textContent = 'Vista en Teclado';
        notesList.textContent = q.intervals.map((i) => pcName((state.chordRoot + i) % 12, state.chordRoot, state.accidentalPref)).join(' · ');
      }
      formulaList.textContent = q.formula.join(' · ');
      altWrap.classList.add('hidden');
    } else if (state.mode === 'scales') {
      const rName = pcName(state.scaleRoot, state.scaleRoot, state.accidentalPref);
      const isMinor = state.scaleType === 'minor';
      const relPc = isMinor ? (state.scaleRoot + 3) % 12 : (state.scaleRoot + 9) % 12;
      const relName = pcName(relPc, relPc, state.accidentalPref);

      statusTag.textContent = 'Escala Pentatónica';
      playPrimaryLabel.textContent = 'Tocar Escala ↑';
      playSecondaryLabel.textContent = 'Tocar Descendente ↓';

      mainTitle.textContent = `${rName} ${isMinor ? 'm Pent.' : 'May. Pent.'}`;
      fullName.textContent = `Pentatónica ${isMinor ? 'Menor' : 'Mayor'} de ${rName}${state.scaleBlueNote ? ' + Blue Note' : ''}`;
      subBadge.textContent = state.scaleBox === 'all'
        ? 'Mástil Completo (Trastes 0–22)'
        : `Posición / Caja ${parseInt(state.scaleBox, 10) + 1} (Sistema CAGED)`;

      const semis = isMinor ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9];
      const names = semis.map((s) => pcName((state.scaleRoot + s) % 12, state.scaleRoot, state.accidentalPref));
      if (state.scaleBlueNote) {
        names.push(`${pcName((state.scaleRoot + (isMinor ? 6 : 3)) % 12, state.scaleRoot, state.accidentalPref)}(blue)`);
      }

      notesList.textContent = names.join(' · ');
      formulaList.textContent = (isMinor ? ['1', 'b3', '4', '5', 'b7'] : ['1', '2', '3', '5', '6'])
        .concat(state.scaleBlueNote ? [isMinor ? 'b5' : 'b3'] : [])
        .join(' · ');

      document.getElementById('scaleRelativeInfo').textContent =
        isMinor ? `Relativa Mayor: ${relName} Mayor Pentatónica` : `Relativa Menor: ${relName}m Pentatónica`;
      altWrap.classList.add('hidden');
    } else {
      const det = model.detected;
      statusTag.textContent = 'Detector en Vivo';
      playPrimaryLabel.textContent = state.instrument === 'piano' ? 'Tocar Acorde' : 'Rasguear';
      playSecondaryLabel.textContent = 'Arpegiar';

      mainTitle.textContent = det.symbol;
      fullName.textContent = det.fullName;
      subBadge.textContent = det.subtitle;
      notesList.textContent = det.notesStr;
      formulaList.textContent = det.formulaStr;

      if (det.alternatives && det.alternatives.length > 0) {
        altWrap.classList.remove('hidden');
        altNames.textContent = det.alternatives.join(', ');
      } else {
        altWrap.classList.add('hidden');
      }

      const candContainer = document.getElementById('detectorCandidatesList');
      if (det.allCandidates && det.allCandidates.length > 0) {
        candContainer.innerHTML = det.allCandidates.map((c, idx) => {
          const badgeCls = idx === 0
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            : 'bg-slate-800 text-slate-300 border border-slate-700';
          return `<span class="px-2.5 py-1 rounded-lg mono font-bold ${badgeCls}">${c.symbol} <span class="font-sans font-normal text-slate-400">(${c.subtitle})</span></span>`;
        }).join('');
      } else {
        candContainer.innerHTML = '<span class="text-slate-500">Selecciona 2 o más notas para ver todas las lecturas posibles.</span>';
      }
    }
  }

  function syncButtonStates() {
    document.querySelectorAll('.inst-btn').forEach((btn) => {
      const activeCls = btn.dataset.instrument === state.instrument
        ? 'bg-amber-500 text-slate-950 shadow'
        : 'text-slate-300 hover:text-white';
      btn.className = `inst-btn pill-btn flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold ${activeCls}`;
    });

    document.querySelectorAll('.labelmode-btn').forEach((btn) => {
      const activeCls = btn.dataset.labelmode === state.labelMode
        ? 'bg-sky-500 text-slate-950 shadow'
        : 'text-slate-300 hover:text-white';
      btn.className = `labelmode-btn pill-btn flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg text-xs font-semibold ${activeCls}`;
    });

    document.querySelectorAll('.mode-btn').forEach((btn) => {
      const activeCls = btn.dataset.mode === state.mode
        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow'
        : 'text-slate-300 hover:text-white';
      btn.className = `mode-btn pill-btn py-2.5 px-2 rounded-lg text-xs sm:text-sm font-bold text-center ${activeCls}`;
    });

    document.getElementById('panelChords').classList.toggle('hidden', state.mode !== 'chords');
    document.getElementById('panelScales').classList.toggle('hidden', state.mode !== 'scales');
    document.getElementById('panelDetector').classList.toggle('hidden', state.mode !== 'detector');

    const helperSpan = document.querySelector('#modeHelperText span');
    const transferBtn = document.getElementById('btnTransferToDetector');
    if (state.mode === 'chords') {
      helperSpan.textContent = 'Haz clic en cualquier nota iluminada para escucharla, o pulsa otro traste para editar el acorde en vivo.';
      transferBtn.classList.remove('hidden');
    } else if (state.mode === 'scales') {
      helperSpan.textContent = 'Haz clic en cualquier nota de la escala para escucharla o alterna entre las 5 cajas.';
      transferBtn.classList.add('hidden');
    } else {
      helperSpan.textContent = 'Modo libre activo: pulsa cualquier traste o tecla para poner o quitar notas.';
      transferBtn.classList.add('hidden');
    }

    document.querySelectorAll('.qgroup-btn').forEach((btn) => {
      const activeCls = btn.dataset.qgroup === state.qualityGroup ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white';
      btn.className = `qgroup-btn pill-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold ${activeCls}`;
    });

    document.querySelectorAll('.vtype-btn').forEach((btn) => {
      const activeCls = btn.dataset.vtype === state.voicingType
        ? 'bg-amber-500 text-slate-950 shadow'
        : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700';
      btn.className = `vtype-btn pill-btn px-2.5 py-1.5 rounded-lg text-xs font-semibold ${activeCls}`;
    });

    document.querySelectorAll('.strset-btn').forEach((btn) => {
      const monoCls = (btn.dataset.strset !== 'all' && btn.dataset.strset !== 'box') ? 'mono' : '';
      const activeCls = btn.dataset.strset === state.stringSet
        ? 'bg-sky-500 text-slate-950 shadow'
        : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700';
      btn.className = `strset-btn pill-btn px-2.5 py-1.5 rounded-lg text-xs font-semibold ${monoCls} ${activeCls}`;
    });

    document.querySelectorAll('.inv-btn').forEach((btn) => {
      const activeCls = btn.dataset.inv === state.inversionFilter
        ? 'bg-emerald-500 text-slate-950 shadow'
        : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700';
      btn.className = `inv-btn pill-btn px-2.5 py-1.5 rounded-lg text-xs font-semibold ${activeCls}`;
    });

    document.querySelectorAll('.scaletype-btn').forEach((btn) => {
      const activeCls = btn.dataset.scaletype === state.scaleType
        ? 'bg-amber-500 text-slate-950 shadow'
        : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700';
      btn.className = `scaletype-btn pill-btn flex-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold ${activeCls}`;
    });

    document.querySelectorAll('.scalebox-btn').forEach((btn) => {
      const activeCls = btn.dataset.box === state.scaleBox
        ? 'bg-sky-500 text-slate-950 shadow'
        : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700';
      btn.className = `scalebox-btn pill-btn px-2.5 py-2 rounded-xl text-xs font-bold ${activeCls}`;
    });

    const blueBtn = document.getElementById('btnToggleBlueNote');
    blueBtn.textContent = state.scaleType === 'minor' ? '+ Blue Note (♭5)' : '+ Blue Note (♭3)';
    const blueCls = state.scaleBlueNote
      ? 'bg-cyan-400 text-slate-950 shadow'
      : 'bg-slate-800 text-cyan-300 border border-slate-700';
    blueBtn.className = `pill-btn px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${blueCls}`;

    const octLabels = { both: 'Registro: Ambas Octavas', low: 'Registro: Octava Baja', high: 'Registro: Octava Alta (12+)' };
    document.getElementById('btnScaleOctave').textContent = octLabels[state.scaleOctaveMode];

    document.getElementById('btnNeckOrientation').textContent =
      state.neckVertical ? '↔ Vista Horizontal' : '↕ Vista Vertical (Móvil)';

    document.getElementById('btnPianoRangeToggle').textContent =
      state.pianoFullRange ? '↔ Enfocar 3 Octavas' : '↔ Ver Rango Completo (E2–D6)';

    const accLabels = { auto: '♯ / ♭: Auto', sharp: 'Solo ♯', flat: 'Solo ♭' };
    document.getElementById('btnAccidental').textContent = accLabels[state.accidentalPref];

    document.getElementById('btnGuitarPolyMode').textContent =
      state.singleNotePerString ? 'Guitarra: 1 nota por cuerda' : 'Guitarra: Múltiples por cuerda';

    const icon = state.muted ? '🔇' : '🔊';
    document.getElementById('muteIconDesktop').textContent = icon;
    document.getElementById('muteIconMobile').textContent = icon;
    document.getElementById('muteTextMobile').textContent = state.muted ? 'Silenciado' : 'Audio';
  }

  FM.controlsView = {
    renderRootButtons,
    renderQualityButtons,
    renderVoicingCardsStrip,
    updateLiveBanner,
    syncButtonStates
  };
})(window.FM);
